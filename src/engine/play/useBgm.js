// 배경음악(BGM) - 인생 진행 화면 진행 막대의 ♪ 버튼이 씀
// - 음악 파일 없이 브라우저가 그 자리에서 만들어 내는 음악 (Web Audio, 저작권 걱정 없음)
//   컨셉: '노을빛 환승' - 산뜻한 오르골 산책. 밝은 화음이 한 마디씩 바뀌고(Ⅰ → Ⅴ → Ⅳ → Ⅴ, D장조 add9),
//   그 위에 오르골 같은 5음 음계 멜로디가 위쪽으로 자주 걸어 올라가요. (예전 버전은 느리고 우울해서 밝게 바꿈) (예전에 넣었던 레코드 잡음은 지직거려서 뺐어요)
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

const BPM = 84; // 예전 68 → 조금 빠르게 (걷는 속도)
const BEAT = 60 / BPM;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// D장조 밝은 진행: Dadd9 · A · Gadd9 · A - 한 화음 1마디(4박), 단조 화음 없음
const CHORDS = [
  [50, 57, 62, 64, 66],
  [45, 52, 57, 61, 64],
  [43, 50, 55, 57, 59],
  [45, 52, 57, 61, 66],
];
const PENTA = [74, 76, 78, 81, 83, 86, 88, 90, 93]; // D 5음 음계 (오르골 높은 자리)

// 소리 만드는 엔진 (켜질 때 한 번 만들고, 꺼지면 조용히 멈춤)
function makeSynth() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  const lp = ctx.createBiquadFilter(); // 로파이 느낌: 높은 소리 깎기
  lp.type = 'lowpass';
  lp.frequency.value = 4800; // 예전 2600 → 높은 소리를 덜 깎아 더 맑게
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

  // 공간감: 짧은 피드백 딜레이
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain();
  fb.gain.value = 0.24;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(lp);

  // 패드 한 음 (부드럽게 차오르고 사라짐)
  const pad = (midi, t, dur) => {
    [-6, 6].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(midi);
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.024, t + 0.8);
      g.gain.setValueAtTime(0.024, t + Math.max(0.9, dur - 0.8));
      g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + dur + 0.7);
    });
  };
  // 오르골 한 음 (사인 + 배음, 빨리 울리고 길게 사라짐)
  const bell = (midi, t, v = 0.06) => {
    [[1, v], [3.01, v * 0.18], [5.02, v * 0.06]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(midi) * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / mul);
      o.connect(g); g.connect(lp); g.connect(delay);
      o.start(t); o.stop(t + 2.4);
    });
  };
  // 낮은 베이스 (박마다 아주 작게)
  const bass = (midi, t) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(midi - 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 0.9);
    o.connect(g); g.connect(lp);
    o.start(t); o.stop(t + BEAT);
  };

  // 박 단위로 조금 앞서 예약 (탭이 바빠도 박자가 밀리지 않게)
  let beat = 0;
  let next = ctx.currentTime + 0.2;
  let timer = null;
  let last = PENTA[2];
  const schedule = () => {
    while (next < ctx.currentTime + 0.6) {
      const bar = Math.floor(beat / 4);
      const chord = CHORDS[bar % CHORDS.length];
      if (beat % 4 === 0) chord.forEach((m) => pad(m, next, BEAT * 4));
      bass(chord[0], next); // 박마다 통통 튀는 베이스
      // 반박(뒷박)마다 화음 음 하나를 가볍게 (경쾌한 리듬)
      bell(chord[2 + (beat % 3)] + 12, next + BEAT * 0.5, 0.022);
      // 오르골 멜로디: 반박마다 확률로, 앞 음에서 가까운 음으로 - 위로 가는 쪽을 조금 더 자주
      [0, 0.5].forEach((off) => {
        const p = off === 0 ? 0.78 : 0.42;
        if (Math.random() < p) {
          const step = Math.round(Math.random() * 3 - 1.2); // -1 ~ +2, 위쪽이 더 많음
          let i = PENTA.indexOf(last) + step;
          if (i >= PENTA.length - 1) i = 2 + Math.floor(Math.random() * 3); // 너무 높아지면 가운데로 돌아옴
          i = Math.max(0, Math.min(PENTA.length - 1, i));
          last = PENTA[i];
          bell(last, next + off * BEAT, off ? 0.05 : 0.068);
        }
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
