// 메인 '방금 시작된 인생 / 방금 끝난 인생' - 실제 플레이어 데이터 (11/25 동현님)
//   GET /api/engine/live 를 5초마다 다시 읽음 (서버가 '몇 초 전'을 계산해서 보내서 시계가 달라도 맞음)
//   새로 들어온 줄은 fresh → 목록에서 미끄러져 들어오고, 지구본에서 별이 퍼짐
//   위치는 나라 가운데 (COUNTRY_POS) 근처에 조금씩 흩어 놓음 (같은 나라가 여러 명이면 겹치지 않게)
//   (예전 예시 목록 useLiveFeed 는 11/26 지움, useLiveStats.js 에는 '지금 아시아' 숫자 계산만 남음)
import { useEffect, useRef, useState } from 'react';
import client from '../api/api';
import { COUNTRY_POS, ASIA_CENTER } from '../common/ui/countryPos';
import { COUNTRIES } from '../engine/village/villageData';

const POLL_MS = 5000;

// 몇 초 전인지 글자로 (분 · 시간 · 일까지)
export function agoLabel(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  if (s < 5) return '방금';
  if (s < 60) return s + '초 전';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  return Math.floor(s / 86400) + '일 전';
}

// 인생 번호로 늘 같은 자리 (나라 가운데에서 ±2도 안쪽)
function posOf(cc, id) {
  const c = COUNTRY_POS[cc] || ASIA_CENTER || { lat: 30, lng: 90 };
  const a = (id * 2.399) % (Math.PI * 2);
  const r = ((id * 0.618) % 1) * 2;
  return { lon: c.lng + Math.cos(a) * r, lat: c.lat + Math.sin(a) * r * 0.7 };
}

const genderWord = (g) => (g === 'M' ? '남자아이' : '여자아이');
const flagOf = (cc) => COUNTRIES[cc]?.[0] || null; // 'KOR' → 'kr' (국기 그림 주소)

// 태어난 인생이 지금 어떻게 됐나 (11/26): 살아가는 중 N세 · N세에 떠남 · 그만둠
function nowOf(r) {
  if (r.status === 'ENDED') return { kind: 'died', text: `${r.deathAge ?? '?'}세에 떠남` };
  if (r.status === 'ABANDONED') return { kind: 'quit', text: '중간에 그만둠' };
  return { kind: 'alive', text: r.currentAge != null ? `지금 ${r.currentAge}세` : '살아가는 중' };
}

function toBorn(r, base, seen) {
  const at = base - (r.agoSec || 0) * 1000;
  return {
    id: 'b' + r.lifeId,
    at,
    fresh: seen && !seen.has('b' + r.lifeId),
    ...posOf(r.countryCode, r.lifeId),
    flag: flagOf(r.countryCode),
    title: `${r.countryName || r.countryCode} ${r.birthYear}년`,
    sub: `${r.name} · ${genderWord(r.gender)}`,
    wealth: r.wealthClass, // 오른쪽 수저 (Main 이 그림으로 그림)
    now: nowOf(r),
    ago: r.agoSec,
  };
}

function toDied(r, base, seen) {
  const at = base - (r.agoSec || 0) * 1000;
  return {
    id: 'd' + r.lifeId,
    at,
    fresh: seen && !seen.has('d' + r.lifeId),
    ...posOf(r.countryCode, r.lifeId),
    flag: flagOf(r.countryCode),
    title: r.name,
    sub: `${r.countryName || r.countryCode}${r.deathCause ? ' · ' + r.deathCause : ''}`,
    deathAge: r.deathAge,
    years: `${r.birthYear}–${r.birthYear + (r.deathAge || 0)}`,
    ago: r.agoSec,
  };
}

// show: 목록에 보일 줄 수, 지구본에는 받은 것 전부 (최대 10)
export default function useRealFeed({ show = 3 } = {}) {
  const [data, setData] = useState({ born: [], died: [], ok: null });
  const [now, setNow] = useState(0); // 1초마다 바뀌는 지금 시각 (화면 그릴 때 Date.now() 를 직접 부르지 않게)
  const seen = useRef(null); // 처음 읽은 줄은 깜빡이지 않게 (null = 아직 한 번도 안 읽음)

  useEffect(() => {
    let alive = true;
    let timer;
    const load = () => {
      client.get('/api/engine/live')
        .then((res) => {
          if (!alive) return;
          const now = Date.now();
          const prev = seen.current;
          const born = (res.data?.born || []).map((r) => toBorn(r, now, prev));
          const died = (res.data?.died || []).map((r) => toDied(r, now, prev));
          seen.current = new Set([...(prev || []), ...born.map((x) => x.id), ...died.map((x) => x.id)]);
          setData({ born, died, ok: true, at: now });
        })
        .catch(() => { if (alive) setData((d) => ({ ...d, ok: false })); })
        .finally(() => { if (alive) timer = setTimeout(load, POLL_MS); });
    };
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // 1초마다 '몇 초 전' 글자 새로고침
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const since = data.at && now ? Math.max(0, (now - data.at) / 1000) : 0; // 목록을 받은 뒤 흐른 초
  const withTime = (list) => list.slice(0, show).map((it) => ({ ...it, time: agoLabel((it.ago || 0) + since) }));

  return {
    ok: data.ok,                                   // null 읽는 중 · true 성공 · false 서버 오류
    born: withTime(data.born),
    died: withTime(data.died),                     // 두 목록 다 왼쪽에 '몇 분 전' (11/26: 예전엔 사망만 오른쪽 아래)
    globeBirths: data.born,
    globeDeaths: data.died,
  };
}
