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

const WS_URL = `ws://${window.location.hostname}/ws`;
const BUBBLE_MS = 2000;
const ERROR_MS = 3000;
const MOVE_MS = 150;

const myIdOf = (token) => {
  try {
    const body = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(body)).sub);
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
  const [atHome, setAtHome] = useState(me.place === "home"); // 집 안에서는 다른 사람이 안 보여서 말도 막음
  const [now, setNow] = useState(() => Date.now());
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

    client.get(`/api/chat/${countryCode}/players`)
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
        stomp.subscribe("/user/queue/chatError", (msg) => setError(JSON.parse(msg.body).message));
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
      if (navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ clientId })], { type: "application/json" });
          navigator.sendBeacon(`/api/chat/${countryCode}/leave`, blob);
        } catch { /* 무시 */ }
      }
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
  useEffect(() => {
    if (!connected || !stompRef.current) return;
    const currentToken = localStorage.getItem("token");
    stompRef.current.publish({
      destination: `/app/chat/${countryCode}/join`,
      body: JSON.stringify({
        token: currentToken, memberId: myId, guestToken: currentToken ? null : localStorage.getItem("guestToken"),
        clientId: clientIdRef.current,
        age: me.age, gender: me.gender, costume: { hair, top, hat }, ...myPos.current,
      }),
    });
  }, [connected, myId, countryCode, me.age, me.gender, hair, top, hat]);

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
    setAtHome(p.place === "home");
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

  const seen = new Set();
  const others = [];
  for (const p of players) {
    if (p.memberId === myId || seen.has(p.memberId)) continue;
    seen.add(p.memberId);
    others.push({
      id: p.memberId, name: p.nickname, age: p.age, gender: p.gender, costume: p.costume,
      place: p.place || me.place, x: p.place ? p.x : xOf(p.memberId), dir: p.dir, walking: p.walking,
      message: bubbleOf(p.memberId),
    });
  }
  const count = new Set(players.map((p) => p.memberId)).size;

  const send = (content) => {
    if (atHome) return;
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
    others, count, error, connected, send, move, atHome,
    myMessage: myId ? bubbleOf(myId) : null,
    canTalk: !!token && !atHome,
  };
}

export default useChat;
