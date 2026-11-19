// 배경음악(BGM) - 인생 진행 화면 진행 막대의 ♪ 버튼이 씀
// - 음악 파일 없이 브라우저가 그 자리에서 만들어 내는 음악 (Web Audio, 저작권 걱정 없음)
//   컨셉: '보사노바 해변' (BGM 시안 10 중 9번) - 클라베 리듬에 맞춰 뜯는 나일론 기타 화음,
//   근음·5도를 오가는 베이스, 림 샷과 아주 작은 하이햇, 그 위에 건반 멜로디가 가끔 얹혀요. 느긋한 해 질 녘 바닷가.
//   (예전: 노을빛 오르골 D장조. 시안 페이지 '환승인생 BGM 시안 10'에서 비교해 들을 수 있어요)
// - public/audio/bgm-play.mp3 파일을 넣으면 그 파일을 대신 틀어요 (나중에 진짜 곡을 고르면 파일만 넣기)
// - 켜기/끄기·음량은 브라우저에 기억 (localStorage 'bgm', 'bgmVol')
// 사용: const bgm = useBgm();  bgm.on, bgm.toggle(), bgm.volume, bgm.setVolume(0~1), bgm.missing(늘 false)
import { useCallback, useEffect, useRef, useState } from 'react';

const read = (k, d) => {
  try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, String(v)); } catch { /* 저장 못 해도 소리는 바뀜 */ }
};

const BPM = 110;
const BEAT = 60 / BPM;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// 보사노바 진행: Am7 · D9 · Gmaj7 · E7 (한 화음 1마디 = 4박), 맨 앞이 근음
const CHORDS = [
  [45, 55, 60, 64, 67],
  [50, 54, 60, 64, 66],
  [43, 54, 59, 62, 66],
  [52, 56, 62, 64, 68],
];
const SCALE = [69, 71, 72, 74, 76, 79, 81]; // 멜로디 (A 자연단음계 위쪽)
const CLAVE = [0, 0.75, 1.5, 2.5, 3];      // 한 마디 안 기타 화음·림 샷 자리 (박)
const HATS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

// 소리 만드는 엔진 (켜질 때 한 번 만들고, 꺼지면 조용히 멈춤)
function makeSynth() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  const lp = ctx.createBiquadFilter(); // 기타 줄 소리가 날카롭지 않게 높은 소리를 살짝 깎음
  lp.type = 'lowpass';
  lp.frequency.value = 3400;
  lp.Q.value = 0.4;
  lp.connect(master);
  // 여러 음이 겹쳐 소리가 커질 때 찢어지는(지직) 것 막기
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);

  // 공간감: 짧은 피드백 딜레이 (멜로디만 살짝)
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.22;
  const wet = ctx.createGain();
  wet.gain.value = 0.14;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(lp);

  // 하이햇용 잡음 (1초짜리를 만들어 두고 잘라 씀)
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i += 1) nd[i] = Math.random() * 2 - 1;

  // 한 음: 빠르게 올라갔다가 지수로 사라짐
  const tone = (type, f, t, dur, peak, attack = 0.005, toDelay = false, dest = lp) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    if (toDelay) g.connect(delay);
    o.start(t); o.stop(t + dur + 0.05);
  };
  // 나일론 기타 화음: 줄을 위에서 아래로 살짝 늦게 긁음 (근음 빼고)
  const strum = (chord, t) => {
    chord.slice(1).forEach((m, j) => tone('triangle', hz(m + 12), t + j * 0.012, 0.5, 0.035, 0.003));
  };
  // 베이스: 근음과 5도를 오감
  const bass = (midi, t) => tone('sine', hz(midi - 12), t, BEAT * 0.9, 0.08, 0.02);
  // 림 샷 (짧은 딸깍)
  const rim = (t) => tone('square', 1700, t, 0.03, 0.025, 0.001, false, master);
  // 하이햇 (아주 작게)
  const hat = (t, v) => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
  };
  // 건반 멜로디 한 음 (삼각파 + 옥타브 위 사인 조금)
  const keys = (midi, t, v) => {
    tone('triangle', hz(midi), t, 1.2, v, 0.008, true);
    tone('sine', hz(midi) * 2, t, 0.6, v * 0.25, 0.008);
  };

  // 박 단위로 조금 앞서 예약 (탭이 바빠도 박자가 밀리지 않게)
  let beat = 0;
  let next = ctx.currentTime + 0.2;
  let timer = null;
  let last = SCALE[2];
  const schedule = () => {
    while (next < ctx.currentTime + 0.7) {
      const bar = Math.floor(beat / 4);
      const inBar = beat % 4;
      const chord = CHORDS[bar % CHORDS.length];
      const t = next;
      if (inBar === 0) {
        // 마디 첫 박에 그 마디 리듬을 한꺼번에 예약
        CLAVE.forEach((x) => { strum(chord, t + x * BEAT); rim(t + x * BEAT); });
        HATS.forEach((x, i) => hat(t + x * BEAT, i % 2 ? 0.008 : 0.012));
      }
      if (inBar % 2 === 0) bass(inBar === 2 ? chord[0] + 7 : chord[0], t); // 1박 근음, 3박 5도
      // 멜로디: 정박·반박마다 확률로, 앞 음에서 가까운 음으로
      [0, 0.5].forEach((off, k) => {
        if (Math.random() >= (k === 0 ? 0.35 : 0.25)) return;
        let i = SCALE.indexOf(last) + Math.round(Math.random() * 3 - 1.2);
        if (i >= SCALE.length - 1) i = 2 + Math.floor(Math.random() * 3); // 너무 높아지면 가운데로 돌아옴
        i = Math.max(0, Math.min(SCALE.length - 1, i));
        last = SCALE[i];
        keys(last, t + off * BEAT, off ? 0.03 : 0.04);
      });
      beat += 1;
      next += BEAT;
    }
  };

  return {
    ctx,
    start() {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!timer) {
        // 마디 첫 박부터 다시 (화음·리듬이 마디 단위로 예약되니까)
        beat = Math.ceil(beat / 4) * 4;
        next = Math.max(next, ctx.currentTime + 0.1);
        timer = setInterval(schedule, 120);
        schedule();
      }
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    setVolume(v, fade = 0.8) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(v * 0.9, t + fade);
    },
    close() {
      if (timer) clearInterval(timer);
      timer = null;
      ctx.close().catch(() => {});
    },
  };
}

export default function useBgm(src = '/audio/bgm-play.mp3') {
  const synthRef = useRef(null);
  const audioRef = useRef(null);
  const [on, setOn] = useState(() => read('bgm', '0') === '1');
  const [volume, setVolumeState] = useState(() => Number(read('bgmVol', '0.4')) || 0.4);
  const [hasFile, setHasFile] = useState(false);

  // 파일이 있으면 파일, 없으면 만들어 내는 음악
  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', () => setHasFile(true));
    a.addEventListener('error', () => setHasFile(false));
    a.src = src;
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
      if (synthRef.current) { synthRef.current.close(); synthRef.current = null; }
    };
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (hasFile) {
      if (synthRef.current) synthRef.current.stop();
      if (!a) return;
      a.volume = volume;
      if (on) a.play().catch(() => {}); else a.pause();
      return;
    }
    if (on) {
      if (!synthRef.current) synthRef.current = makeSynth();
      const s = synthRef.current;
      if (!s) return;
      s.start();
      s.setVolume(volume);
    } else if (synthRef.current) {
      const s = synthRef.current;
      s.setVolume(0, 0.6);
      const id = setTimeout(() => s.stop(), 700);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [on, volume, hasFile]);

  // 브라우저가 첫 클릭 전에는 소리를 막아서, 켜 둔 상태로 들어오면 첫 클릭 때 시작
  useEffect(() => {
    if (!on) return undefined;
    const wake = () => {
      const s = synthRef.current;
      if (s && s.ctx.state === 'suspended') s.ctx.resume().catch(() => {});
      if (hasFile && audioRef.current?.paused) audioRef.current.play().catch(() => {});
    };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [on, hasFile]);

  const toggle = useCallback(() => {
    setOn((v) => { write('bgm', v ? '0' : '1'); return !v; });
  }, []);
  const setVolume = useCallback((v) => {
    const n = Math.max(0, Math.min(1, Number(v) || 0));
    write('bgmVol', n);
    setVolumeState(n);
  }, []);

  return { on, toggle, volume, setVolume, missing: false };
}
