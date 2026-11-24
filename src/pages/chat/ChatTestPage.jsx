// C15 채팅 테스트 화면 - 지금은 인생 진행 화면(PlayPage)에 붙어 있어서 주소 연결은 안 함 (필요할 때만 App.jsx 에 /chatTest)
import { useState } from "react";
import Panel from "../../common/ui/Panel";
import ChatVillage from "./ChatVillage";
import "../../common/ui/ui.css";

const TEST_COUNTRIES = ["KOR", "JPN", "CHN", "IND", "VNM"];

function ChatTestPage() {
  const [code, setCode] = useState("KOR");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState("M");

  return (
    <div className="page col">
      <h2>C15 채팅 테스트</h2>
      <div className="row">
        나라
        <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>
          {TEST_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        내 나이
        <select className="input" value={age} onChange={(e) => setAge(Number(e.target.value))}>
          {[5, 15, 25, 40, 70].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        성별
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="M">남</option>
          <option value="F">여</option>
        </select>
      </div>

      <div style={{ maxWidth: 760 }}>
        <Panel title={code + " 마을"}>
          <ChatVillage countryCode={code} age={age} gender={gender} place="park"
            caption={`${code} · 채팅 테스트 (${age}세)`} />
        </Panel>
      </div>
    </div>
  );
}

export default ChatTestPage;
