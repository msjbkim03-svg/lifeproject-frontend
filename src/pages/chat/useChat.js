// C15 마을 채팅 + C14 같은 나라 접속자 (채팅 기록은 안 보여 주고 말풍선으로만)
//   GET    /api/chat/{나라}/players  → 지금 접속한 회원 [{ memberId, nickname, age, gender, place, x, dir, walking }]
//   보내기 /app/chat/{나라}           { token, content }
//   보내기 /app/chat/{나라}/join      { token, age, gender, place, x, dir, walking }  (나이가 바뀔 때마다 다시 보냄)
//   보내기 /app/chat/{나라}/move      { place, x, dir, walking }  (Village onMove, 걷는 중엔 0.15초에 한 번)
//   듣기   /topic/chat/{나라}         새 말 / /players 접속자 / /move 누가 움직임 / /user/queue/chatError 내 안내
// 사용법: ChatVillage 안에서 씀
import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import client from "../../api/api";

const WS_URL = `ws://${window.location.hostname}/ws`;
const BUBBLE_MS = 6000;
const ERROR_MS = 3000;
const MAX_OTHERS = 8;
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

  const [guestId] = useState(()=> -1 - Math.floor(Math.random() * 1000000000));
  const token = localStorage.getItem("token");
  const myId = token ? myIdOf(token) : guestId;

  useEffect(() => {
    if (!countryCode) return;
    let alive = true;

    client.get(`/api/chat/${countryCode}/players`)
      .then((resp) => { if (alive) setPlayers(resp.data); })
      .catch(() => {});

    const stomp = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        // 듣기(구독) 때 내가 누군지 같이 보냄 → 서버가 "지금 이 나라에 사는 사람"인지 확인
        const t = localStorage.getItem("token");
        const g = localStorage.getItem("guestToken");
        const who = t ? { token: t } : g ? { guestToken: g } : {};
        stomp.subscribe(`/topic/chat/${countryCode}`, (msg) => {
          const m = { ...JSON.parse(msg.body), at: Date.now() };
          setMessages((prev) => [...prev, m].slice(-30));
        }, who);
        stomp.subscribe(`/topic/chat/${countryCode}/players`, (msg) => setPlayers(JSON.parse(msg.body)), who);
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

    return () => {
      alive = false;
      stompRef.current = null;
      setConnected(false);
      setMessages([]);
      setPlayers([]);
      stomp.deactivate();
    };
  }, [countryCode]);

  useEffect(() => {
    if (!connected || !stompRef.current) return;
    stompRef.current.publish({
      destination: `/app/chat/${countryCode}/join`,
      body: JSON.stringify({
        token, memberId: myId, guestToken: token ? null : localStorage.getItem("guestToken"),
        age: me.age, gender: me.gender, ...myPos.current,
      }),
    });
  }, [connected, token, myId ,countryCode, me.age, me.gender]);

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
    myPos.current = { place: p.place, x: Math.round(p.x * 10) / 10, dir: p.dir, walking: p.walking };
    setAtHome(p.place === "home");
    const stomp = stompRef.current;
    if (!stomp?.connected) return;
    const t = Date.now();
    if (p.walking && lastMove.current.walking && t - lastMove.current.at < MOVE_MS) return;
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
    if (others.length >= MAX_OTHERS) continue;
    others.push({
      id: p.memberId, name: p.nickname, age: p.age, gender: p.gender,
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
      body: JSON.stringify({ token, content }),
    });
  };

  return {
    others, count, error, connected, send, move, atHome,
    myMessage: myId ? bubbleOf(myId) : null,
    canTalk: !!token && !atHome,
  };
}

export default useChat;
