// C22 엔딩 크레딧 (원작 1in8b '주마등 필름') - 끝난 삶 하나를 1분 안팎 영상처럼 보여 줌 (웹 가로 16:9)
// 순서: 지구 지도('그해 지구에서는 …' 인트로, 꼭 남길 것) → 이름 · 태어난 해 → 큰 사건 장면들 → 마지막 → 장례 → 묘비 → 엔딩 크레딧 → 끝
// - 인생 결과 화면 대신 죽은 뒤 바로 틀어짐 (/result/:lifeId, 11/23 동현님)
// - 장면 그림 = 마을(C08 Village, 윤아님 파일은 import 해서 쓰기만)을 그 나이의 모습으로 다시 세운 것
// - 카메라 움직임(track · push · tilt · pull · rise), 오래된 장면일수록 바랜 필름, 그해 행복에 따라 따뜻한/차가운 빛 (원작 filmLook)
// - 음악: filmAudio.js (브라우저가 만드는 피아노)
// - 조작: 스페이스 멈춤/재생, ←·→ 5초 이동, Esc 닫기, 아래 막대 누르면 그 자리로
// 사용: <EndingFilm lifeId={lifeId} result={result} onClose={...} actions={[{ label, onClick, main }]} />
//   result 가 아직 null 이면 '필름을 감는 중…'
//   guestToken: 링크로 받은 비회원 토큰 (없으면 이 브라우저 것)
//   actions: 끝난 뒤 '다시 보기' 옆에 놓을 버튼들
//   filmData: 필름 재료를 밖에서 이미 받았으면 넘김 (추모관 B01 - 다른 사람 인생이라 /api/engine/film 대신 추모관 API 로 받음)
//   바로 재생됨. 브라우저가 소리를 막고 있으면 '화면을 누르면 소리가 나요' → 한 번 누르면 소리만 켜짐
//   result = GET /api/result/{lifeId} 응답 (ResultPage 가 이미 받은 것), 필름 재료는 여기서 GET /api/engine/film
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client from '../../api/api';
import Village from '../village/Village';
import FilmScene from './FilmScene';
import { COUNTRIES, THEMES } from '../village/villageData';
import { useTheme } from '../../common/theme';
import { ASIA, OTHER } from '../../common/ui/globeDots';
import { COUNTRY_POS, ASIA_CENTER } from '../../common/ui/countryPos';
import { buildFilm, fa, easeS, tintOf, archOf, FILM_W, FILM_H } from './filmPlan';
import { makeFilmAudio } from './filmAudio';
import './film.css';

const VW = 720;            // 마을 그림을 이 크기로 그린 뒤 통째로 키움 (사람 크기도 같이 커지게)
const VH = (VW * 13) / 32; // 마을 비율 32:13
const WIDE = 1.3;          // 마을 그림 폭 = 필름 폭의 1.3배 (카메라가 옆으로 움직여도 끝이 안 보이게)
const FOOT = 0.8;          // 발밑(마을 86% 높이)이 필름 80% 높이에 오게

const Y = (px) => `${(px / FILM_H) * 100}%`;
const SZ = (px) => `${(px / FILM_H) * 100}cqh`;
const XW = (px) => `${(px / FILM_W) * 100}%`;

const PACE = 1.5;  // 필름 전체 진행을 1.5배 느리게 (11/24 동현님: 너무 빠름). 글 · 화면 전환 · 카메라 모두 같이 느려짐
const SPEED = 1;   // 장면 안 사람 움직임 빠르기 (PACE 로 느려진 만큼 장면 그림 시간은 FilmScene 에서 PACE 배 → 움직임은 실제 속도)
const C = { i: '#f2ede4', r: '#d6d0c4', c: '#a49d92', d: '#f0dfb5' }; // 원작 글자색

// 글 한 줄 (원작 ftext): y = 글자 아랫줄 자리(px, 1280×720 기준)
//   inline: 아래 묶음(Stack) 안에서 차례로 쌓을 때 (자리 대신 위 간격 gap px)
function T({ y, size, w = 400, font = 'b', color = C.i, op = 1, max = 0, lh, align = 'center', x, shadow, inline, gap = 0, children }) {
  if (!children || op <= 0) return null;
  const style = {
    fontSize: SZ(size),
    fontWeight: w,
    color,
    opacity: op,
    lineHeight: SZ(lh || size * 1.45),
  };
  if (inline) {
    style.marginTop = SZ(gap);
    style.width = max ? XW(max) : '100%';
    return <div className={`ef-t in ef-f${font}${shadow ? ' sh' : ''}`} style={style}>{children}</div>;
  }
  style.top = Y(y - size * 0.92);
  if (align === 'center') {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
    style.width = max ? XW(max) : '92%';
    style.textAlign = 'center';
  } else {
    style.left = XW(x);
    style.width = max ? XW(max) : 'auto';
    style.textAlign = 'left';
  }
  return <div className={`ef-t ef-f${font}${shadow ? ' sh' : ''}`} style={style}>{children}</div>;
}

// 글 묶음: 아랫줄을 bottom(px) 에 맞춰 위로 쌓음 (원작 자막처럼 줄이 늘면 위로 올라감)
//   bottom 대신 middle 을 주면 화면 가운데에 세로로 가운데 맞춤
function Stack({ bottom, top, middle, children }) {
  const style = middle ? { top: 0, bottom: 0, justifyContent: 'center' } : top != null ? { top: Y(top) } : { bottom: Y(FILM_H - bottom) };
  return <div className="ef-stack" style={style}>{children}</div>;
}

// 마을 그림 (장면 그림이 없을 때만, 한 번 그리면 다시 안 그림 → 카메라만 움직임)
const VillageLayer = memo(function VillageLayer({ v }) {
  return <div className="ef-vbox"><Village {...v} /></div>;
});

// 카메라 (원작 filmCam): [가로 이동 %, 세로 이동 %, 확대]
function camOf(kind, p, dir = 1) {
  const e = easeS(Math.max(0, Math.min(1, p)));
  const L = (a, b) => a + (b - a) * e;
  switch (kind) {
    case 'track': return [L(7 * dir, 1 * dir), 0, L(1, 1.06)];
    case 'push': return [L(-2, 0), L(-1, 1), L(0.96, 1.34)];
    case 'tilt': return [L(-3, 0), L(16, 0), L(1.08, 1.02)];
    case 'pull': return [0, L(1, 0), L(1.62, 1.02)];
    case 'rise': return [L(2, 0), L(20, 0), L(1.1, 1)];
    case 'funeral': return [0, L(-1, 1), L(1.25, 1)];
    default: return [L(-3, 3), 0, L(1, 1.2)]; // drift
  }
}

function camStyle([x, y, z]) {
  return { transform: `translate(${x}%, ${y}%) scale(${z})` };
}

// 장면 한 장: 하늘·땅 채우기 + 마을 + 빛깔
//   장면 그림(FilmScene)은 겹마다 카메라 시차를 스스로 줌 + 장면 시간 tt(ms)로 사람이 움직임
function Shot({ seg, idx, cam, op, tint, arch, fills, extra, tt = 0, cls = '', shade = true }) {
  if (op <= 0) return null;
  const filter = arch > 0.02 ? `sepia(${(arch * 0.55).toFixed(3)}) saturate(${(1 - 0.34 * arch).toFixed(3)})` : undefined;
  return (
    <div className={'ef-shot ' + cls} style={{ opacity: op, filter }}>
      {seg.v.scene ? <FilmScene v={seg.v} t={tt * PACE} cam={cam} /> : (
        <div className="ef-cam" style={camStyle(cam)}>
          <div className="ef-sky" style={{ background: fills.sky }} />
          <div className="ef-ground" style={{ background: fills.ground }} />
          <VillageLayer key={idx} v={seg.v} />
        </div>
      )}
      {tint && <div className="ef-tint" style={{ background: `rgba(${tint.join(',')},0.38)` }} />}
      {shade && seg.v.scene && <div className="ef-topshade" />}
      {extra}
    </div>
  );
}

// 지구 인트로 (원작 filmMap 을 둥근 지구로): 점으로 찍은 땅이 둥근 지구 위에 → 곳곳에서 아기가 태어나는 반짝임
//   → 지구가 돌아 태어난 나라가 가운데로 오며 2.6배까지 다가감 (점은 둥근 도트, 앞면만, 가장자리는 어둡게)
const LAND = (() => {
  const pts = [];
  for (let i = 0; i < OTHER.length; i += 2) pts.push([OTHER[i], OTHER[i + 1], 0]);
  for (let i = 0; i < ASIA.length; i += 2) pts.push([ASIA[i], ASIA[i + 1], 1]);
  return pts;
})();
const RAD = Math.PI / 180;

function hash(n) {
  let s = (n * 2654435761) >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function MapCanvas({ b, K, home }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    const W = FILM_W;
    const H = FILM_H;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const out = 1 - fa(b, K - 650, K);
    const turn = easeS(fa(b, 0, K * 0.72));
    const zoom = Math.pow(2.6, easeS(fa(b, 2700, K - 300)));
    const R = H * 0.36 * zoom;
    const lon0 = (home.lng - 75 + 75 * turn) * RAD;
    const lat0 = (8 + (home.lat - 8) * turn) * RAD;
    const cx = W / 2;
    const cy = H * 0.46;
    const s0 = Math.sin(lat0);
    const c0 = Math.cos(lat0);
    const proj = (lng, lat) => {
      const l = lng * RAD - lon0;
      const p = lat * RAD;
      const cz = s0 * Math.sin(p) + c0 * Math.cos(p) * Math.cos(l);
      return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (c0 * Math.sin(p) - s0 * Math.cos(p) * Math.cos(l)), cz];
    };
    const fade = out * fa(b, 0, 900);
    g.globalAlpha = fade;
    // 바다 (둥근 지구) + 가장자리 빛
    const sea = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    sea.addColorStop(0, '#16243c');
    sea.addColorStop(1, '#070c18');
    g.fillStyle = sea;
    g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.strokeStyle = 'rgba(140, 180, 255, 0.28)';
    g.lineWidth = Math.max(2, R * 0.012);
    g.beginPath(); g.arc(cx, cy, R + g.lineWidth / 2, 0, 7); g.stroke();
    // 땅 점
    const dot = Math.max(1.2, R * 0.0105);
    for (const [lng, lat, asia] of LAND) {
      const [x, y, z] = proj(lng, lat);
      if (z <= 0.02 || x < -dot || x > W + dot || y < -dot || y > H + dot) continue;
      g.globalAlpha = fade * (0.35 + 0.65 * z);
      g.fillStyle = asia ? '#6f86a6' : '#3a4a60';
      g.beginPath(); g.arc(x, y, dot * (0.6 + 0.4 * z), 0, 7); g.fill();
    }
    // 아기가 태어나는 반짝임 (70ms 마다 4곳, 앞면만)
    for (let f = Math.floor((b - 700) / 70); f <= b / 70; f++) {
      if (f < 3) continue;
      const rnd = hash(f + 11);
      for (let q = 0; q < 4; q++) {
        const pt = LAND[Math.floor(rnd() * LAND.length)];
        const age = b - (f * 70 + rnd() * 70);
        if (!pt || age < 0 || age > 700) continue;
        const [x, y, z] = proj(pt[0], pt[1]);
        if (z <= 0.05) continue;
        const v = Math.sin((Math.PI * age) / 700) * z;
        g.globalAlpha = out * v * 0.3;
        g.fillStyle = '#ffcf7a';
        g.beginPath(); g.arc(x, y, dot * 2.6, 0, 7); g.fill();
        g.globalAlpha = out * v;
        g.beginPath(); g.arc(x, y, dot, 0, 7); g.fill();
      }
    }
    // 태어난 곳
    if (b > 1900) {
      const [x, y, z] = proj(home.lng, home.lat);
      if (z > 0) {
        const a = fa(b, 1900, 2600) * out;
        const m = ((b - 1900) % 1700) / 1700;
        g.globalAlpha = a;
        g.fillStyle = '#fff1c8';
        g.shadowColor = '#ffd27a';
        g.shadowBlur = 18;
        g.beginPath(); g.arc(x, y, dot * 1.5, 0, 7); g.fill();
        g.shadowBlur = 0;
        g.globalAlpha = a * (1 - m) * 0.8;
        g.strokeStyle = '#ffe2a6';
        g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, dot * (1.5 + m * 6) + 6, 0, 7); g.stroke();
      }
    }
    g.globalAlpha = 1;
  }, [b, K, home]);
  return <canvas ref={ref} className="ef-map" width={FILM_W} height={FILM_H} />;
}

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function EndingFilm({ lifeId, result, onClose, guestToken: guestParam = null, actions = [], filmData = null }) {
  const [data, setData] = useState(filmData);
  const [error, setError] = useState('');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('filmMusic') === 'off'; } catch { return false; }
  });
  const [box, setBox] = useState({ vs: 1, top: 0 }); // 마을 그림 크기·자리
  const [blocked, setBlocked] = useState(false);        // 브라우저가 소리를 막고 있음
  const frameRef = useRef(null);
  const tRef = useRef(0);
  const audio = useRef(null);
  const faded = useRef(false);
  const mode = useTheme();

  // 필름 재료 + 입은 옷 (C21, /api/engine/film 에 wear 가 함께 옴)
  useEffect(() => {
    if (filmData) return;
    const isLogin = !!localStorage.getItem('token');
    const guestToken = guestParam || (isLogin ? null : localStorage.getItem('guestToken'));
    client.get('/api/engine/film', { params: { lifeId, guestToken } })
      .then((f) => setData(f.data))
      .catch((err) => {
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : '엔딩 크레딧을 불러오지 못했어요.');
      });
  }, [lifeId, guestParam, filmData]);

  const film = useMemo(() => {
    if (!data || !result) return null;
    const f = buildFilm(result, data);
    if (data.wear) {
      const wear = { ...data.wear, ride: null }; // 엔딩 크레딧에는 탈것 빼고 머리·옷·모자만 (C21 탈것은 마을에서만)
      f.seg.forEach((s) => { if (s.v) s.v = { ...s.v, costume: wear }; });
    }
    return f;
  }, [data, result]);

  // 마을 그림 크기: 필름 높이에 맞춰 키움
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const vs = (el.clientWidth * WIDE) / VW;
      const h = el.clientHeight || 1;
      setBox({ vs, top: (FOOT * h - 0.86 * VH * vs) / h, bottom: (FOOT * h + 0.14 * VH * vs) / h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [film]);

  // 필름이 준비되면 바로 재생 (렌더 중에 한 번만 바꿈 - effect 안에서 setState 하지 않게)
  const [startedFor, setStartedFor] = useState(null);
  if (film && startedFor !== film) {
    setStartedFor(film);
    setPlaying(true);
  }

  // 음악
  useEffect(() => {
    if (!film) return undefined;
    audio.current = makeFilmAudio(lifeId);
    if (audio.current) audio.current.setMuted(muted);
    return () => { audio.current?.close(); audio.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film, lifeId]);

  useEffect(() => {
    if (!audio.current) return undefined;
    if (playing) {
      if (tRef.current < (film?.dur ?? 0) - 3200) faded.current = false;
      audio.current.play();
      const id = setTimeout(() => setBlocked(!!audio.current?.blocked()), 400);
      return () => clearTimeout(id);
    }
    audio.current.pause();
    return undefined;
  }, [playing, film]);

  useEffect(() => {
    audio.current?.setMuted(muted);
    try { localStorage.setItem('filmMusic', muted ? 'off' : 'on'); } catch { /* 저장 못 해도 됨 */ }
  }, [muted]);

  // 시계
  useEffect(() => {
    if (!playing || !film) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(100, now - last) / PACE;
      last = now;
      const nt = Math.min(film.dur, tRef.current + dt);
      tRef.current = nt;
      setT(nt);
      if (!faded.current && nt >= film.dur - 3200) {
        faded.current = true;
        audio.current?.fadeOut(3);
      }
      if (nt >= film.dur) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, film]);

  const seek = useCallback((ms) => {
    if (!film) return;
    const nt = Math.max(0, Math.min(film.dur - 1, ms));
    tRef.current = nt;
    setT(nt);
  }, [film]);

  const replay = () => {
    faded.current = false;
    seek(0);
    setPlaying(true);
  };

  // 브라우저가 소리를 막고 있으면: 화면 어디든 처음 누르거나 키를 누르는 순간 바로 음악을 켬
  useEffect(() => {
    if (!blocked) return undefined;
    const go = () => { audio.current?.play(); setTimeout(() => setBlocked(!!audio.current?.blocked()), 200); };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
    return () => {
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
    };
  }, [blocked]);

  // 키보드 (마을의 ←·→ 걷기보다 먼저 받아서 막음)
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat && e.key === ' ') return;
        if (e.key === ' ') setPlaying((p) => !p);
        // 화면 시계는 PACE 배라서, 화면 기준 5초 = 필름 시간 5000 / PACE
        if (e.key === 'ArrowLeft') seek(tRef.current - 5000 / PACE);
        if (e.key === 'ArrowRight') seek(tRef.current + 5000 / PACE);
      }
    };
    const block = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') e.stopPropagation();
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', block, true);
    const ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', block, true);
      document.body.style.overflow = ov;
    };
  }, [onClose, seek]);

  // 마을 권역 색 (지금 화면 테마) → 마을 그림 위아래 채우기
  const fillsOf = useCallback((code) => {
    const info = COUNTRIES[code] || ['', 'EAST'];
    const c = (THEMES[info[1]] || THEMES.EAST)[mode];
    const top = (/#[0-9a-f]{6}/i.exec(c.sky) || ['#1b1f2a'])[0];
    return { sky: top, ground: c.ground };
  }, [mode]);

  if (error) {
    return (
      <div className="ef" role="dialog" aria-modal="true" aria-label="엔딩 크레딧">
        <div className="ef-msg"><p>{error}</p><button type="button" className="ef-btn" onClick={onClose}>닫기</button></div>
      </div>
    );
  }
  if (!film) {
    return (
      <div className="ef" role="dialog" aria-modal="true" aria-label="엔딩 크레딧">
        <div className="ef-msg"><p>필름을 감는 중…</p></div>
      </div>
    );
  }

  const segs = film.seg;
  let u = segs.findIndex((s) => t < s.t1);
  if (u < 0) u = segs.length - 1;
  const m = segs[u];
  const b = t - m.t0;
  const K = m.t1 - m.t0;
  const p = b / K;
  const P = (ms) => fa(b, ms, ms + 700);       // ms 부터 0.7초 동안 나타남
  const y = 1 - fa(b, K - 700, K);              // 끝 0.7초 사라짐
  const F = (ms) => P(ms) * y;
  const next = segs.slice(u + 1).find((s) => s.t1 > s.t0); // 길이 0 구간(사고사가 아닐 때의 마지막 밤)은 건너뜀
  const x = next && (next.kind === 'moment' || next.kind === 'death') ? 1 : y; // 다음이 장면이면 그림은 겹쳐 넘어감
  const prev = segs[u - 1];
  const D = film.age;

  const shots = [];
  let over;

  // 앞 장면이 겹쳐 남아 있는 동안 (0.9초)
  const prevShot = (into) => {
    if (!prev || !(prev.kind === 'moment' || prev.kind === 'title')) return 0;
    const v = fa(b, 0, 900);
    if (v >= 1) return 1;
    const pa = prev.kind === 'title' ? 0 : prev.f.a;
    const pp = 1 + b / (prev.t1 - prev.t0);
    shots.push(
      <Shot key={u - 1} idx={u - 1} seg={prev} op={into ?? 1} tt={(prev.t1 - prev.t0 + b) * (prev.kind === 'moment' ? SPEED : 1)}
        cam={prev.kind === 'title' ? camOf('rise', 1) : camOf(prev.cam, pp, prev.dir)}
        tint={tintOf(film.hap[pa])} arch={archOf(D, pa)} fills={fillsOf(prev.v.countryCode)} />,
    );
    return v;
  };

  if (m.kind === 'map') {
    const home = COUNTRY_POS[film.birthCountry] || ASIA_CENTER;
    shots.push(<div key="map" className="ef-shot"><MapCanvas b={b} K={K} home={home} /></div>);
    over = (
      <>
        <T y={250} size={26} w={600} color={C.d} op={F(3300)} shadow>
          {film.countryName}{film.histName ? ` (${film.histName})` : ''}
        </T>
        <T y={580} size={30} op={F(400)} max={1100} lh={46} shadow>그해 지구에서는 약 1억 3천만 명의 아기가 태어났습니다.</T>
        <T y={640} size={30} op={F(2100)} max={1100} lh={46} shadow>이것은 그중 한 사람의 이야기입니다.</T>
      </>
    );
  } else if (m.kind === 'title') {
    const g = 1 - fa(b, K - 600, K);
    shots.push(
      <Shot key={u} idx={u} seg={m} tt={b} op={P(0)} cam={camOf('rise', p)}
        tint={tintOf(film.hap[0])} arch={archOf(D, 0)} fills={fillsOf(m.v.countryCode)} />,
    );
    over = (
      <>
        <T y={200} size={72} w={700} font="d" op={P(500) * g} max={1100} lh={84} shadow>{film.name}</T>
        <T y={256} size={26} w={600} font="m" op={P(1000) * g} shadow>{`${film.by} – ${film.by + D}`}</T>
        <Sub f={m.f} op={P(1500) * g} top={292} />
      </>
    );
  } else if (m.kind === 'moment') {
    const v = prevShot();
    const a = m.f.a;
    shots.push(
      <Shot key={u} idx={u} seg={m} tt={b * SPEED} op={v < 1 && prev && (prev.kind === 'moment' || prev.kind === 'title') ? v : P(0)}
        cam={camOf(m.cam, p, m.dir)} tint={tintOf(film.hap[a])} arch={archOf(D, a)} fills={fillsOf(m.v.countryCode)} />,
    );
    const s = 500;
    const w = x === 1 ? 1 - fa(b, K - 500, K) : y;
    over = (
      <>
        <T y={96} size={44} w={600} font="m" align="left" x={56} op={P(s) * w} shadow>{String(film.by + a)}</T>
        <T y={136} size={22} w={500} align="left" x={58} max={700} color="#e2dbcf" op={P(s) * w} shadow>
          {`${a}세 · ${film.placeName(m.v.countryCode)}`}
        </T>
        <Sub f={m.f} op={P(s + 400) * w} op2={P(s + 800) * w} />
      </>
    );
  } else if (m.kind === 'death') {
    const v = prevShot(y);
    const T0 = prev && prev.kind === 'moment' ? v : P(0);
    shots.push(
      <Shot key={u} idx={u} seg={m} tt={b} op={T0 * y} cam={camOf('drift', p)} tint={[80, 84, 110]} arch={0}
        fills={fillsOf(m.v.countryCode)}
        extra={(
          <>
            <div className="ef-mult" style={{ background: `rgba(92,78,140,${(0.6 * fa(b, 500, 3800)).toFixed(3)})` }} />
            <div className="ef-dark" style={{ opacity: 0.4 * fa(b, 1500, 4600) }} />
          </>
        )} />,
    );
    over = (
      <>
        <Stack top={70}>
          <T inline size={40} w={700} font="d" op={F(700)} shadow>{film.head}</T>
          <T inline gap={10} size={28} color={C.r} op={F(1100)} max={620} lh={42} shadow>{film.died}</T>
        </Stack>
      </>
    );
  } else if (m.kind === 'funeral') {
    // 합친 장례 (사고사가 아니면 마지막 밤 장면 없이): 처음 3초는 떠난 해 · 사망 원인, 이어서 배웅 (11/25 동현님)
    const mg = !!m.merged;
    const s0 = mg ? 2800 : 0; // 합친 장례: 떠난 해 · 사망 원인이 사라진 뒤 배웅 자막 (11/25: '곁을 지켰다'가 너무 빨리 지나감)
    const hd = mg ? 1 - fa(b, 2600, 3200) : 0;
    shots.push(
      <Shot key={u} idx={u} seg={m} tt={b} op={P(0) * y} cam={camOf('funeral', p)} tint={[58, 72, 104]} arch={0}
        fills={fillsOf(m.v.countryCode)} cls="funeral" shade={false}
        extra={<div className="ef-dark" style={{ opacity: 0.25 }} />} />,
    );
    over = (
      <>
        {mg && ( // 영정을 가리지 않게 아래쪽 (배웅 자막과 같은 자리, 차례로 나옴)
          <Stack bottom={670}>
            <T inline size={40} w={700} font="d" op={P(300) * hd} shadow>{film.head}</T>
            <T inline gap={10} size={28} color={C.r} op={P(700) * hd} max={620} lh={42} shadow>{film.died}</T>
          </Stack>
        )}
        <Stack bottom={670}>
          <T inline size={29} w={500} op={F(600 + s0)} max={620} lh={44} shadow>{film.funeral}</T>
          <T inline gap={14} size={24} color={C.r} op={F(1400 + s0)} max={620} lh={38} shadow>{film.attend}</T>
        </Stack>
      </>
    );
  } else if (m.kind === 'epi') {
    over = (
      <Stack middle>
        <T inline size={50} w={700} font="d" op={F(0)} max={640}>{film.name}</T>
        <T inline gap={4} size={24} color={C.c} font="m" op={F(300)}>{`${film.by} – ${film.by + D}`}</T>
        <div className="ef-rule" style={{ opacity: F(500) }} />
        {film.epi.map((l, i) => (
          <T key={i} inline gap={i ? 16 : 0} size={28} op={F(600 + i * 450)} max={600} lh={42}>{l}</T>
        ))}
        {film.quote && (
          <>
            <T inline gap={34} size={30} w={600} font="d" color={C.d} op={F(900 + film.epi.length * 450)} max={900} lh={44}>{`“${film.quote.t}”`}</T>
            <T inline gap={8} size={19} color={C.c} op={F(1200 + film.epi.length * 450)}>{film.quote.will ? '유언장에 남긴 말' : '마지막으로 남긴 말'}</T>
          </>
        )}
      </Stack>
    );
  } else if (m.kind === 'credits') {
    const rows = [[film.name, 44, 700, 'd', C.i, 70], [`${film.by} – ${film.by + D}`, 22, 400, 'm', C.c, 110]];
    if (m.cast.length) {
      rows.push(['함께한 사람들', 22, 500, 'b', C.c, 52]);
      m.cast.forEach((c) => rows.push([c, 28, 400, 'b', C.i, 44]));
      rows[rows.length - 1][5] = 100;
    }
    if (m.src.length) {
      rows.push(['이 이야기에 쓰인 자료', 22, 500, 'b', C.c, 52]);
      m.src.forEach((c) => rows.push([c, 24, 400, 'b', C.r, 40]));
      rows[rows.length - 1][5] = 100;
    }
    rows.push(['이 삶은 실제 통계로 만든 이야기입니다.', 22, 400, 'b', C.c, 40]);
    const H = rows.reduce((s, r) => s + r[5], 0);
    const g = FILM_H + 40 - (FILM_H + 40 + H - 120) * p; // 원작처럼 아래에서 위로 올라감
    over = (
      <div className="ef-roll" style={{ top: Y(g - 44), opacity: P(0) }}>
        {rows.map(([txt, size, w, font, color, gap], i) => (
          <div key={i} className={`ef-t in ef-f${font}`}
            style={{ fontSize: SZ(size), fontWeight: w, color, lineHeight: SZ(size * 1.35), minHeight: SZ(gap), width: XW(640) }}>{txt}</div>
        ))}
      </div>
    );
  } else {
    over = (
      <>
        <T y={330} size={36} w={600} font="d" op={P(0)} max={1100} lh={50}>80억 명 가운데, 단 한 번뿐인 삶이었습니다.</T>
        <T y={410} size={30} w={700} font="d" color={C.r} op={P(700)}>환승인생</T>
      </>
    );
  }

  const ended = !playing && t >= film.dur - 1;
  const look = !['map', 'epi', 'credits', 'end'].includes(m.kind);

  return (
    <div className="ef" role="dialog" aria-modal="true" aria-label={`${film.name}의 엔딩 크레딧`}>
      <div className="ef-stage">
        <div className="ef-frame" ref={frameRef}
          style={{ '--vs': box.vs, '--vtop': `${box.top * 100}%`, '--vbot': `${(box.bottom ?? 1) * 100}%` }}
          onClick={() => {
            if (blocked) { audio.current?.play(); setBlocked(!!audio.current?.blocked()); return; } // 첫 누름은 소리만 켬
            setPlaying((v) => !v);
          }}>
          {shots}
          {look && <div className="ef-look" />}
          {look && <div className="ef-grain" style={{ backgroundPosition: `${(Math.floor(t / 42) % 3) * 33}% ${(Math.floor(t / 42) % 5) * 21}%` }} />}
          <div className="ef-over">{over}</div>
          {!['end', 'credits'].includes(m.kind) && <div className="ef-mark">환승인생</div>}
          <button type="button" className="ef-skip" onClick={(e) => { e.stopPropagation(); onClose(); }}>닫기</button>
          {ended && (
            <div className="ef-endbox" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="ef-btn main" onClick={replay}>↺ 다시 보기</button>
              {actions.map((a) => (
                <button key={a.label} type="button" className={'ef-btn' + (a.main ? ' main' : '')} onClick={a.onClick}>{a.label}</button>
              ))}
            </div>
          )}
          {blocked && playing && <div className="ef-sound">🔈 화면을 누르면 소리가 나요</div>}
          {!playing && !ended && <div className="ef-paused" aria-hidden="true">❚❚ 멈춤</div>}
        </div>

        <div className="ef-bar">
          <button type="button" className="ef-ic" onClick={() => (ended ? replay() : setPlaying((v) => !v))}
            aria-label={playing ? '멈춤' : '재생'}>{playing ? '❚❚' : '▶'}</button>
          <div className="ef-track" role="slider" aria-label="필름 위치" aria-valuemin={0} aria-valuemax={Math.round(film.dur / 1000)}
            aria-valuenow={Math.round(t / 1000)} tabIndex={0}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - r.left) / r.width) * film.dur);
            }}>
            <i style={{ width: `${(t / film.dur) * 100}%` }} />
          </div>
          <span className="ef-time">{fmt(t * PACE)} / {fmt(film.dur * PACE)}</span>
          <button type="button" className={'ef-ic' + (muted ? ' off' : '')} onClick={() => setMuted((v) => !v)}
            aria-label={muted ? '음악 켜기' : '음악 끄기'}>♪</button>
        </div>
      </div>
    </div>
  );
}

// 아래 자막 (원작 filmSub)
// 자막은 화면 위쪽 (장면 사람들이 화면 아래 78~88% 에 서 있어서 아래 자막이 얼굴을 가렸음, 11/24)
//   둘째 줄(f.sub): 그 사건이 삶에서 어떤 의미였는지 (11/25 동현님: 자막이 부실함) - 조금 늦게 · 작게 · 연한 금색
function Sub({ f, op, top = 168, op2 }) {
  if (!f || !f.t) return null;
  return (
    <Stack top={top}>
      <T inline size={30} w={500} op={op} max={1000} lh={44} shadow>{f.t}</T>
      {f.sub && <T inline gap={10} size={23} w={500} color={C.d} op={op2 ?? op} max={900} lh={34} shadow>{f.sub}</T>}
    </Stack>
  );
}

export default EndingFilm;
