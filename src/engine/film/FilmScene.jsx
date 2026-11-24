// C22 엔딩 크레딧 장면 그림 - 촘촘한 픽셀 아트 (256 × 144 칸)
// - 장면 그림은 px/pxScenes.js 에 있음. 사람은 마을 사람 그림(Figure · lookOf, 윤아님 파일)을 픽셀 칸으로 옮겨 찍음
// - 색은 마을 권역 색(THEMES light). 필름은 화면 테마와 상관없이 언제나 노을빛
// - 움직임은 모두 장면 시간 t(ms)로 계산 → 되감기 · 건너뛰기 · 캡처해도 같은 그림
// 사용: <FilmScene v={장면 정보 (filmPlan sceneAt)} t={장면 시작부터 ms} cam={[가로 %, 세로 %, 확대]} />
import { useEffect, useRef } from 'react';
import { Px, W, H } from './px/pxCore';
import { SCENES } from './px/pxScenes';

const ALIAS = { cowork: 'work' };
const Z0 = 1.06; // 기본으로 조금 다가가 가장자리가 비지 않게

export default function FilmScene({ v, t = 0, cam = [0, 0, 1] }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    const fn = SCENES[ALIAS[v.scene] || v.scene] || SCENES.village;
    try {
      fn(new Px(g), t, v);
    } catch (e) {
      // 그림 하나가 틀려도 영상은 계속 (마을 장면으로 대신)
      if (fn !== SCENES.village) SCENES.village(new Px(g), t, v);
      console.warn('[film] scene', v.scene, e);
    }
  }, [v, t]);
  const [cx = 0, cy = 0, z = 1] = cam || [];
  const style = { transform: `translate(${cx * 0.6}%, ${cy * 0.6}%) scale(${z * Z0})` };
  return <canvas ref={ref} className="fs2 fs-px" width={W} height={H} style={style} aria-hidden="true" />;
}
