// 전화번호 모양 바꾸기 (회원가입 · 마이페이지 · 개인정보 수정이 같이 씀)
// 숫자만 남기고 010-1234-5678 모양으로 하이픈을 넣어 줌
//   '01012345678' → '010-1234-5678'
//   '0101234'     → '010-1234'      (입력 중간에도 자연스럽게)
export function formatPhone(value) {
  const d = (value || "").replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}
