// 금칙어 안내 문구 공통 처리
export const BANNED_MSG = "사용할 수 없는 표현이 포함되어 있어요. 내용을 수정해 주세요.";

// 서버 에러 응답에서 문자열 메시지 추출 (객체 { message } · 평문 문자열 모두 대응)
export function rawErrMsg(err) {
  const data = err?.response?.data;
  if (typeof data === "string") return data.trim();
  if (data && typeof data.message === "string") return data.message.trim();
  return "";
}

// 금칙어 관련 응답 여부 판별
export function isBannedText(text) {
  if (!text) return false;
  return /금칙어|금지된\s*(단어|표현|문구)|비속어|욕설|부적절한\s*(단어|표현|내용|문구)|사용할 수 없는\s*(단어|표현|문구|말)|쓸 수 없는\s*(단어|표현|문구|말)/.test(String(text));
}

// 금칙어 응답이면 공통 안내 문구로 통일, 아니면 원래 서버 메시지(없으면 기본 문구)
export function formatErrorMsg(errOrMsg, fallback = "요청을 처리하지 못했어요.") {
  const msg = typeof errOrMsg === "string" ? errOrMsg.trim() : rawErrMsg(errOrMsg);
  if (isBannedText(msg)) return BANNED_MSG;
  return msg || fallback;
}