// C15 채팅 테스트 화면 (주소: /chatTest) - 진행 화면에 붙이기 전에 마을 + 채팅만 따로 확인
// 브라우저 두 개(하나는 시크릿 창)에서 서로 다른 회원으로 로그인하고 같은 나라를 고르면 서로 보여요
import { useState } from "react";
import Village from "../../engine/village/Village";
import Panel from "../../common/ui/Panel";
import useChat from "./useChat";
import ChatBox from "./ChatBox";
import "../../common/ui/ui.css";

const TEST_COUNTRIES = ["KOR", "JPN", "CHN", "IND", "VNM"];
const PLACE = "park";

function ChatTestPage() {
  const [code, setCode] = useState("KOR");
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState("M");
  const chat = useChat(code, { age, gender, place: PLACE });

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
          <Village countryCode={code} age={age} gender={gender} place={PLACE}
            caption={`${code} · 채팅 테스트 (${age}세)`}
            myMessage={chat.myMessage} others={chat.others} onMove={chat.move} />
          <div style={{ marginTop: 10 }}>
            <ChatBox chat={chat} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default ChatTestPage;
