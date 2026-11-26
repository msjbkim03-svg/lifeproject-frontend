// 관리자 화면 공통 도구
// 서버가 보낸 에러 문구 꺼내기 (400·404 는 문자열로 옴, 없으면 기본 문구)
export function errMsg(err, fallback) {
  const m = err.response?.data;
  return typeof m === 'string' && m ? m : fallback;
}

// 새 이벤트 기본값 (서버 등록 기본값과 같게) - EventForm 에서 옮겨 옴 (컴포넌트 파일은 컴포넌트만 내보내기)
export const EMPTY_EVENT = {
  eventId: '', eventType: 'LIFE', templateId: '', varValue: '', title: '', baseText: '',
  histEventId: '', histTypeCode: '', intensity: '',
  minAge: '', maxAge: '', gender: '', minWealth: '', maxWealth: '',
  requiredExpId: '', excludedExpId: '', isOnce: 'N',
  effectScale: '1', probability: '', effWealthRate: '',
  isChoice: 'N', aiNarrate: 'N', isReviewed: 'Y',
};