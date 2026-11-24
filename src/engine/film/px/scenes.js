// C22 엔딩 크레딧 장면 목록 = 처음 장면(pxScenes) 위에 다시 그린 장면(pxScenes2)을 덮어씀
//   결혼식은 pxScenes 그대로 (11/24 동현님: 결혼식은 건들 것 없음), 나머지는 결혼식 수준으로 다시 그린 pxScenes2
import { SCENES as FIRST } from './pxScenes';
import { SCENES2 } from './pxScenes2';

export const SCENES = { ...FIRST, ...SCENES2 };
