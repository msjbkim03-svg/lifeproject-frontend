// C22 엔딩 크레딧 음악 - 원작 주마등 필름의 '따뜻한 피아노'(filmAudio warm · pno)를 흉내 낸 Web Audio 피아노
// - 음악 파일 없이 브라우저가 그 자리에서 만듦 (저작권 걱정 없음)
// - 느린 4마디 진행 Cmaj7 → Am7 → Fmaj7 → G, 왼손 낮은 음 + 오른손 펼침화음, 가끔 위에 멜로디 한 음
// - 같은 인생이면 같은 멜로디 (seed = 인생 번호)
// 사용: const a = makeFilmAudio(lifeId);  a.play()  a.pause()  a.setMuted(true)  a.fadeOut(3)  a.close()

const BPM = 66;
const BEAT = 60 / BPM;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  [48, [60, 64, 67, 71]], // Cmaj7
  [45, [57, 60, 64, 67]], // Am7
  [41, [57, 60, 64, 65]], // Fmaj7
  [43, [59, 62, 67, 71]], // G
];
const MEL = [72, 74, 76, 79, 81, 84];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3]; // 8분음표 펼침

function rand(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function makeFilmAudio(seed = 1) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const out = ctx.createGain();
  out.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  lp.connect(out);
  out.connect(comp);
  comp.connect(ctx.destination);
  // 울림: 짧은 피드백 딜레이 두 갈래
  const wet = ctx.createGain();
  wet.gain.value = 0.28;
  [0.23, 0.37].forEach((t) => {
    const d = ctx.createDelay(1);
    d.delayTime.value = t;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    wet.connect(d); d.connect(fb); fb.connect(d); d.connect(lp);
  });

  const rnd = rand(seed);
  let muted = false;
  let vol = 0.55;
  let next = 0;   // 다음 박 시각
  let beat = 0;   // 몇 번째 8분음표
  let timer = null;

  const note = (m, t, len, g) => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'triangle';
    o2.type = 'sine';
    o1.frequency.value = hz(m);
    o2.frequency.value = hz(m + 12);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(g, t + 0.012);
    e.gain.exponentialRampToValueAtTime(g * 0.35, t + 0.35);
    e.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const e2 = ctx.createGain();
    e2.gain.value = 0.18;
    o1.connect(e); o2.connect(e2); e2.connect(e);
    e.connect(lp); e.connect(wet);
    o1.start(t); o2.start(t);
    o1.stop(t + len + 0.05); o2.stop(t + len + 0.05);
  };

  const schedule = () => {
    while (next < ctx.currentTime + 1.2) {
      const bar = Math.floor(beat / 8) % CHORDS.length;
      const k = beat % 8;
      const [root, tones] = CHORDS[bar];
      const t = next;
      if (k === 0) { note(root - 12, t, BEAT * 4, 0.16); note(root, t, BEAT * 4, 0.08); }
      if (k === 4) note(root, t, BEAT * 2.5, 0.07);
      note(tones[ARP[k]], t, BEAT * 1.6, 0.05 + (k === 0 ? 0.02 : 0));
      if ((k === 0 || k === 4) && rnd() < 0.55) {
        const m = MEL[Math.floor(rnd() * MEL.length)];
        note(m, t + BEAT * 0.02, BEAT * 3, 0.06);
      }
      next += BEAT / 2;
      beat += 1;
    }
  };

  const target = () => (muted ? 0 : vol);

  return {
    play() {
      ctx.resume().catch(() => {});
      if (!timer) {
        if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
        schedule();
        timer = setInterval(schedule, 200);
      }
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(target(), now + 1.2);
    },
    pause() {
      clearInterval(timer);
      timer = null;
      ctx.suspend().catch(() => {});
    },
    setMuted(m) {
      muted = m;
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(target(), now + 0.3);
    },
    fadeOut(sec) {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + sec);
    },
    blocked() { // 브라우저가 소리를 막고 있으면 true (한 번 눌러야 풀림)
      return ctx.state !== 'running';
    },
    close() {
      clearInterval(timer);
      timer = null;
      ctx.close().catch(() => {});
    },
  };
}
