// 관리자 화면 공통 도구
// 서버가 보낸 에러 문구 꺼내기 (400·404 는 문자열로 옴, 없으면 기본 문구)
export function errMsg(err, fallback) {
  const m = err.response?.data;
  return typeof m === 'string' && m ? m : fallback;
}