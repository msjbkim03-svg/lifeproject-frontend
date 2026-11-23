// C21 코스튬 상점 확인용 (App.jsx 에 잠깐 /costumeTest 라우트 넣고, 커밋할 때 이 파일·라우트 빼기)
import { useEffect, useState } from "react";
import client from "../../api/api";
import CostumeSheet from "./CostumeSheet";
import { CostumeFigure } from "./CostumeParts";

function CostumeTestPage() {
  const [life, setLife] = useState(null);
  const [wear, setWear] = useState({});
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("불러오는 중…");

  const guestToken = localStorage.getItem("token") ? null : localStorage.getItem("guestToken");

  useEffect(() => {
    client.get("/api/engine/current", { params: { guestToken } })
      .then((resp) => {
        setLife(resp.data);
        setMsg("");
        return client.get("/api/costumes", { params: { lifeId: resp.data.lifeId, guestToken } });
      })
      .then((resp) => setWear(resp.data.wear))
      .catch((err) => setMsg(err.response?.data?.message || err.response?.data || "불러오지 못했어요."));
  }, [guestToken]);

  const onDone = (data) => {
    setWear(data.wear);
    setLife((x) => ({ ...x, assets: data.assets }));
  };

  if (!life) return <p style={{ padding: 24 }}>{msg || "진행 중인 인생이 없어요. 먼저 태어나 주세요."}</p>;

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: "0 16px" }}>
      <h2>옷 가게 확인</h2>
      <p>인생 번호 {life.lifeId} · {life.currentAge}세 · 착용 {JSON.stringify(wear)}</p>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-end", height: 140 }}>
        <CostumeFigure wear={wear} size={1} baseColor={life.gender === "F" ? "#e98aa6" : "#6f95e8"} />
        <CostumeFigure wear={wear} size={4} baseColor={life.gender === "F" ? "#e98aa6" : "#6f95e8"} />
      </div>
      <p>왼쪽 = 마을에서 보일 실제 크기, 오른쪽 = 4배</p>
      <button type="button" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>옷 가게 열기</button>
      {msg && <p>{msg}</p>}
      {open && (
        <CostumeSheet life={life} guestToken={guestToken} waitIdle={async () => {}}
          onDone={onDone} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export default CostumeTestPage;
