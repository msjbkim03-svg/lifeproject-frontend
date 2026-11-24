// 추모관이 팀원 엔딩 영상(C22)의 장면을 끌어다 쓰는 함수들 (방 화면 · 방 탭 · 사진첩 · 영상 탭이 같이 씀)
// plan = buildFilm(result, 재료) 결과 (MemorialRoomPage 가 한 번만 만들어서 넘겨 줌)

// 장면 그림에 그 생에 입은 옷 입히기
export function withWear(v, wear) {
  return wear ? { ...v, costume: wear } : v;
}

// 영상 장면 → 사진 목록 { age, text, v } (태어남 · 큰 사건 · 마지막 · 장례)
// plan 이 없으면(영상 재료를 못 받음) 예전 인생 기록을 그림 없이
export function filmPhotos(plan, wear, fallback = []) {
  if (!plan) return fallback.map((p) => ({ ...p, v: null }));
  return plan.seg.filter((x) => x.v).map((x) => {
    let age = plan.age;
    let text = "";
    if (x.kind === "title") { age = 0; text = x.f?.t; }
    else if (x.kind === "moment") { age = x.f.a; text = x.f.t; }
    else if (x.kind === "death") text = plan.died;
    else if (x.kind === "funeral") text = typeof plan.funeral === "string" ? plan.funeral : "마지막 길을 배웅했다.";
    return { age, text, v: withWear(x.v, wear) };
  });
}

// 방 그림 = 마지막 해의 집 (같이 살던 가족 · 집 · 반려동물 그대로, 장면만 '집')
export function roomScene(plan, wear) {
  const d = plan?.seg.find((x) => x.kind === "death");
  if (!d?.v) return null;
  return withWear({ ...d.v, scene: "home", arg: null }, wear);
}

// 포스터 = 영상 첫 장면 (태어난 방)
export function posterScene(plan, wear) {
  const t = plan?.seg.find((x) => x.kind === "title");
  return t?.v ? withWear(t.v, wear) : null;
}
