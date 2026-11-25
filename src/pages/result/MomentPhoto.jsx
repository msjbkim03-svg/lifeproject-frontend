// C18 인생의 큰 장면 사진 (11/25)
//   큰 장면을 누르면 엔딩 크레딧과 같은 픽셀 장면 그림(FilmScene)을 사진처럼 크게 보여 줌
//   ← → 로 앞뒤 장면, Esc · 바깥 누르면 닫힘
//   예: <MomentPhoto list={moments} segs={filmSegs} at={2} birthYear={1959} onMove={setAt} onClose={...} />
//   segs: buildFilm(...).seg 중 kind === 'moment' (없으면 그림 자리에 '불러오는 중')
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FilmScene from '../../engine/film/FilmScene';
import styles from './MomentPhoto.module.css';

const LOOP = 6000; // 장면 움직임을 6초마다 처음부터

function MomentPhoto({ list, segs, at, birthYear, label, onMove, onClose }) {
  const [t, setT] = useState(0);
  const m = list[at];
  // 장면 그림: 같은 순서의 필름 장면, 순서가 어긋나면 같은 나이 장면
  const seg = segs ? (segs[at]?.f?.a === m?.a ? segs[at] : segs.find((s) => s.f?.a === m?.a)) : null;

  // 장면 움직임 (사진이 살짝 살아 있게)
  useEffect(() => {
    let id = 0;
    const t0 = performance.now();
    const tick = (now) => { setT((now - t0) % LOOP); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [at]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && at > 0) onMove(at - 1);
      if (e.key === 'ArrowRight' && at < list.length - 1) onMove(at + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, list.length, onMove, onClose]);

  if (!m) return null;

  return createPortal(
    <div className={styles.back} onClick={onClose} role="dialog" aria-modal="true" aria-label={`${m.a}세 장면`}>
      <figure className={styles.photo} onClick={(e) => e.stopPropagation()}>
        <div className={styles.frame}>
          {seg ? <FilmScene v={seg.v} t={t} /> : <p className={styles.wait}>장면을 불러오는 중…</p>}
          <span className={styles.no}>{at + 1}</span>
        </div>
        <figcaption className={styles.cap}>
          <span className={styles.when}>{m.a}세<small>{birthYear + m.a}년{label ? ` · ${label}` : ''}</small></span>
          <span className={styles.text}>{m.t}</span>
        </figcaption>
        <div className={styles.nav}>
          <button type="button" disabled={at === 0} onClick={() => onMove(at - 1)} aria-label="앞 장면">‹</button>
          <span>{at + 1} / {list.length}</span>
          <button type="button" disabled={at === list.length - 1} onClick={() => onMove(at + 1)} aria-label="다음 장면">›</button>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">×</button>
      </figure>
    </div>,
    document.body,
  );
}

export default MomentPhoto;
