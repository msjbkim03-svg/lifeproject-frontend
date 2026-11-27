// C15 마을 채팅 + C14 같은 나라 접속자 (채팅 기록은 안 보여 주고 말풍선으로만)
//   GET    /api/chat/{나라}/players  → 지금 접속한 회원 [{ memberId, nickname, age, gender, place, x, dir, walking }]
//   보내기 /app/chat/{나라}           { token, content }
//   보내기 /app/chat/{나라}/join      { token, age, gender, place, x, dir, walking }  (나이가 바뀔 때마다 다시 보냄)
//   보내기 /app/chat/{나라}/move      { place, x, dir, walking }  (Village onMove, 걷는 중엔 0.15초에 한 번)
//   듣기   /topic/chat/{나라}         새 말 / /players 접속자 / /move 누가 움직임 / /user/queue/chatError 내 안내
// 사용법: ChatVillage 안에서 씀
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import client from "../../api/api";
import { formatErrorMsg } from "../../utils/bannedMsg";

const API_BASE = `http://${window.location.hostname}`;
const WS_URL = `ws://${window.location.hostname}/ws`;
const PLACE_LIMIT = 10; // 장소별 대화 정원 (선착순 10명까지 채팅 가능, 11번째부터는 화면에 보이되 채팅만 제한)
const BUBBLE_MS = 2000;
const ERROR_MS = 3000;
const MOVE_MS = 150;

const myIdOf = (token) => {
  try {
    if (typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const id = Number(JSON.parse(atob(padded)).sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

const xOf = (id) => 15 + ((id * 37) % 70);

function useChat(countryCode, me) {
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentPlace, setCurrentPlace] = useState(me.place || "home"); // 현재 보고 있는 장소 (장소별 9명 정원 계산용)
  const [now, setNow] = useState(() => Date.now());
  const atHome = currentPlace === "home"; // 집 안에서는 다른 사람이 안 보여서 말도 막음
  const stompRef = useRef(null);
  const myPos = useRef({ place: me.place, x: 50, dir: "right", walking: false });
  const lastMove = useRef({ at: 0, walking: false });

  const location = useLocation();
  const [guestId] = useState(()=> -1 - Math.floor(Math.random() * 1000000000));
  // 인게임 로그인 팝업(AuthModal)으로 로그인해 주소(location)가 돌아올 때도 토큰을 즉시 다시 읽음
  const token = localStorage.getItem("token");
  void location.key;
  const myId = token ? myIdOf(token) : guestId;
  const clientIdRef = useRef("");

  useEffect(() => {
    if (!countryCode) return;
    let alive = true;
    let gotWsPlayers = false; // 웹소켓 명단이 먼저 도착했으면 늦게 온 HTTP 응답으로 덮어쓰지 않음
    let leftSent = false;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    clientIdRef.current = clientId;

    // WebSocket 구독과 동일하게 guestToken 이 있으면 함께 전달 (경계 상황 403 방지)
    const initGuest = localStorage.getItem("guestToken");
    client.get(`/api/chat/${countryCode}/players`, { params: initGuest ? { guestToken: initGuest } : undefined })
      .then((resp) => { if (alive && !gotWsPlayers) setPlayers(resp.data); })
      .catch(() => {});

    const stomp = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        // 듣기(구독) 때 내가 누군지 같이 보냄 → 서버가 "지금 이 나라에 사는 사람"인지 확인
        const t = localStorage.getItem("token");
        const g = localStorage.getItem("guestToken");
        const who = { ...(t ? { token: t } : {}), ...(g ? { guestToken: g } : {}) };
        stomp.subscribe(`/topic/chat/${countryCode}`, (msg) => {
          const m = { ...JSON.parse(msg.body), at: Date.now() };
          setMessages((prev) => [...prev, m].slice(-30));
        }, who);
        stomp.subscribe(`/topic/chat/${countryCode}/players`, (msg) => {
          gotWsPlayers = true;
          setPlayers(JSON.parse(msg.body));
        }, who);
        stomp.subscribe(`/topic/chat/${countryCode}/move`, (msg) => {
          const p = JSON.parse(msg.body);
          setPlayers((prev) => prev.map((x) => (x.memberId === p.memberId ? { ...x, ...p } : x)));
        }, who);
        stomp.subscribe("/user/queue/chatError", (msg) => setError(formatErrorMsg(JSON.parse(msg.body).message, "메시지를 보내지 못했어요.")));
        setConnected(true);
      },
      onWebSocketClose: () => setConnected(false),
    });
    stomp.activate();
    stompRef.current = stomp;

    // 브라우저 닫기·새로고침·로그아웃(페이지 언로드) 시 내 연결(clientId)만 즉시 접속 해제
    const onUnload = () => {
      if (leftSent) return;
      leftSent = true;
      if (stomp.connected) {
        try {
          stomp.publish({ destination: `/app/chat/${countryCode}/leave`, body: "{}" });
        } catch { /* 무시 */ }
      }
      // 백엔드(80포트)로 언로드 시에도 전달되도록 keepalive fetch 사용 (CORS allowedOrigins("*")와 호환)
      try {
        fetch(`${API_BASE}/api/chat/${countryCode}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          keepalive: true,
        }).catch(() => {});
      } catch { /* 무시 */ }
      stomp.deactivate();
    };

    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      stompRef.current = null;
      setConnected(false);
      setMessages([]);
      setPlayers([]);
      // 나가기·다른 메뉴 이동(컴포넌트 언마운트) 시 STOMP 퇴장 전송 후 소켓 종료
      if (!leftSent && stomp.connected) {
        leftSent = true;
        try {
          stomp.publish({ destination: `/app/chat/${countryCode}/leave`, body: "{}" });
        } catch { /* 무시 */ }
      }
      stomp.deactivate();
    };
  }, [countryCode]);

  // 입장·나이 변경·옷 갈아입기·로그인 전환(myId 변경) 시 서버에 내 정보 전송
  // (토큰 자동 연장으로 token 문자열만 바뀔 때는 myId 가 같아서 불필요하게 다시 보내지 않음)
  const hair = me.costume?.hair || null;
  const top = me.costume?.top || null;
  const hat = me.costume?.hat || null;
  const ride = me.costume?.ride || null;
  useEffect(() => {
    if (!connected || !stompRef.current) return;
    const currentToken = localStorage.getItem("token");
    stompRef.current.publish({
      destination: `/app/chat/${countryCode}/join`,
      body: JSON.stringify({
        token: currentToken, memberId: myId, guestToken: currentToken ? null : localStorage.getItem("guestToken"),
        clientId: clientIdRef.current,
        age: me.age, gender: me.gender, costume: { hair, top, hat, ride }, ...myPos.current,
      }),
    });
  }, [connected, myId, countryCode, me.age, me.gender, hair, top, hat, ride]);

  useEffect(() => {
    const ends = messages.filter((m) => m.at + BUBBLE_MS > now).map((m) => m.at + BUBBLE_MS);
    if (ends.length === 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(...ends) - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [messages, now]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), ERROR_MS);
    return () => clearTimeout(timer);
  }, [error]);

  const move = useCallback((p) => {
    const placeChanged = myPos.current.place !== p.place;
    myPos.current = { place: p.place, x: Math.round(p.x * 10) / 10, dir: p.dir, walking: p.walking };
    setCurrentPlace(p.place || "home");
    const stomp = stompRef.current;
    if (!stomp?.connected) return;
    const t = Date.now();
    if (!placeChanged && p.walking && lastMove.current.walking && t - lastMove.current.at < MOVE_MS) return;
    lastMove.current = { at: t, walking: p.walking };
    stomp.publish({ destination: `/app/chat/${countryCode}/move`, body: JSON.stringify(myPos.current) });
  }, [countryCode]);

  const bubbleOf = (id) => {
    const live = messages.filter((m) => m.memberId === id && m.at + BUBBLE_MS > now);
    return live.length ? live[live.length - 1].content : null;
  };

  // 서버가 부여한 장소 입장 순번(placeSeq) 오름차순으로 정렬 + 회원당 1명 중복 제거
  const sortedUnique = [];
  const seen = new Set();
  for (const p of [...players].sort((a, b) => (a.placeSeq || 0) - (b.placeSeq || 0))) {
    if (seen.has(p.memberId)) continue;
    seen.add(p.memberId);
    sortedUnique.push(p);
  }

  // 장소별로 먼저 들어온 10명까지 채팅 가능 (11번째부터는 화면에는 모두 보이되 말하기만 제한)
  const byPlace = new Map();
  for (const p of sortedUnique) {
    const pl = p.place || "home";
    if (!byPlace.has(pl)) byPlace.set(pl, []);
    byPlace.get(pl).push(p);
  }

  const samePlace = atHome ? [] : (byPlace.get(currentPlace) || []);
  const myRank = samePlace.findIndex((p) => p.memberId === myId); // 0~9: 대화 가능(1~10등), >=10: 11번째~ 채팅 대기
  const placeFull = !atHome && myRank >= PLACE_LIMIT;
  const placeCount = atHome ? 0 : Math.min(samePlace.length, PLACE_LIMIT);

  // 같은 장소의 모든 접속자를 Village 에 전달 (10명을 초과해도 사람은 보이고, 채팅만 선착순 10명으로 제한)
  const others = [];
  for (const [pl, list] of byPlace.entries()) {
    if (pl === "home") continue;
    for (const p of list) {
      if (p.memberId === myId) continue;
      others.push({
        id: p.memberId, name: p.nickname, age: p.age, gender: p.gender, costume: p.costume,
        place: pl, x: p.place ? p.x : xOf(p.memberId), dir: p.dir, walking: p.walking,
        message: bubbleOf(p.memberId),
      });
    }
  }
  const count = sortedUnique.length;

  const send = (content) => {
    if (atHome || placeFull) return;
    if (!stompRef.current?.connected) {
      setError("채팅 서버에 연결하는 중이에요. 잠깐 뒤에 다시 보내 주세요.");
      return;
    }
    setError("");
    stompRef.current.publish({
      destination: `/app/chat/${countryCode}`,
      // 게임하는 동안 토큰이 자동 연장(New-Token)될 수 있어서 보내는 순간의 토큰을 새로 읽음
      body: JSON.stringify({ token: localStorage.getItem("token"), content }),
    });
  };

  return {
    others, count, placeCount, placeLimit: PLACE_LIMIT, placeFull, error, connected, send, move, atHome,
    myMessage: myId && !placeFull ? bubbleOf(myId) : null,
    canTalk: !!token && !atHome && !placeFull,
  };
}

export default useChat;
