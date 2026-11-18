// C08 마을 이동 테스트 화면 (주소: /village-test)
// 나라(권역 풍경)·성별·올해 장소를 바꿔 보며 장소 화면 전환을 확인해요
import { useState } from 'react';
import Village from './Village';
import { COUNTRIES, PLACES } from './villageData';
import Panel from '../../common/ui/Panel';

function VillageTest() {
  const [code, setCode] = useState('IND');
  const [gender, setGender] = useState('M');
  const [place, setPlace] = useState('home');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState('');

  // 같은 나라 접속자 예시 (place = 있는 장소, x = 그 화면 안 위치 %)
  const others = [
    { id: 1, name: '라훌', age: 30, place: 'home', x: 30, message: '안녕하세요!' },
    { id: 2, name: '프리야', age: 27, place: 'hall', x: 70, message: '저도 1950년대생이에요' },
    { id: 3, name: '아밋', age: 41, place: 'work', x: 35 },
  ];

  return (
    <div className="page col">
      <h2>C08 마을 이동 테스트</h2>
      <div className="row">
        나라
        <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>
          {Object.keys(COUNTRIES).map((c) => (
            <option key={c} value={c}>{c} ({COUNTRIES[c][1]})</option>
          ))}
        </select>
        성별
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="M">남</option>
          <option value="F">여</option>
        </select>
        올해 장소
        <select className="input" value={place} onChange={(e) => setPlace(e.target.value)}>
          {PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={{ maxWidth: 760 }}>
        <Panel title={code + ' 마을과 채팅'}>
          <Village countryCode={code} age={34} gender={gender} place={place}
            caption={code + ' · 청년기 (34세, 공장 조장)'}
            myMessage={sent} others={others} />
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="채팅 입력 후 Enter" value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSent(msg); setMsg(''); } }} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default VillageTest;
