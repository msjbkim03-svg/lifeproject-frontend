// C08 마을 이동 테스트 화면 (주소: /village-test)
// 나라(권역 풍경)·성별·올해 장소를 바꿔 보며 장소 화면 전환을 확인해요
import { useState } from 'react';
import Village from './Village';
import { COUNTRIES, PLACES } from './villageData';
import Panel from '../../common/ui/Panel';
import { COSTUMES } from './costumeData';

function VillageTest() {
  const [code, setCode] = useState('IND');
  const [gender, setGender] = useState('M');
  const [place, setPlace] = useState('home');
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState('');
  const [tier, setTier] = useState(3);
  const [kind, setKind] = useState('parents');
  const [vehicle, setVehicle] = useState('');
  const [age, setAge] = useState(34);
  const [hair, setHair] = useState('');
  const [top, setTop] = useState('');
  const [hat, setHat] = useState('');
  const [ride, setRide] = useState('');
  const [industry, setIndustry] = useState('');
  const [urban, setUrban] = useState(true);
  const [pet, setPet] = useState('');
  const [happy, setHappy] = useState(50);
  const [crowd, setCrowd] = useState(false); // 접속자 많이 (집 8명 + 공원 10명)
  const [cutFirst, setCutFirst] = useState(false); // 지금 useChat처럼 장소 안 보고 앞 8명 자르기

  // 같은 나라 접속자 예시 (place = 있는 장소, x = 그 화면 안 위치 %)
  const base = [
    { id: 1, name: '라훌', age: 30, place: 'home', x: 30, message: '안녕하세요!' },
    { id: 2, name: '프리야', age: 27, place: 'park', x: 70, message: '저도 1950년대생이에요' },
    { id: 3, name: '아밋', age: 41, place: 'work', x: 35 },
  ];
  // 접속자 많을 때: 명단 앞쪽에 집 8명, 뒤쪽에 공원 10명
  const crowdList = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: 101 + i, name: '집' + (i + 1), age: 20 + i, place: 'home', x: 20 + i * 8 })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: 201 + i, name: '공원' + (i + 1), age: 25 + i, place: 'park', x: 8 + i * 9, message: i === 0 ? '여기 보여요?' : undefined })),
  ];
  const all = crowd ? crowdList : base;
  const others = cutFirst ? all.slice(0, 8) : all;

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
        집 단계
        <select className="input" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        집 종류
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="parents">부모님 집</option>
          <option value="own">내 집</option>
          <option value="rent">셋집</option>
          <option value="apt">셋집 (도시 아파트)</option>
          <option value="prison">교도소</option>
          <option value="barracks">군 부대</option>
        </select>
        탈것
        <select className="input" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
          <option value="">없음</option>
          <option value="BIKE">자전거</option>
          <option value="MOTO">오토바이</option>
          <option value="CAR">자동차</option>
        </select>
        내 나이
        <select className="input" value={age} onChange={(e) => setAge(Number(e.target.value))}>
          {[1, 8, 34, 70].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {[['hair', '머리', hair, setHair], ['top', '옷', top, setTop], ['hat', '모자', hat, setHat], ['ride', '탈것(코스튬)', ride, setRide]].map(([part, label, value, set]) => (
          <label key={part} className="row">
            {label}
            <select className="input" value={value} onChange={(e) => set(e.target.value)}>
              <option value="">기본</option>
              {Object.entries(COSTUMES).filter(([, it]) => it.part === part).map(([code, it]) => (
                <option key={code} value={code}>{it.name}</option>
              ))}
            </select>
          </label>
        ))}
        일터
        <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">정보 없음</option>
          <option value="AGRI">농업</option>
          <option value="INDUSTRY">공업</option>
          <option value="SERVICE">서비스</option>
        </select>
        행복
        <select className="input" value={happy} onChange={(e) => setHappy(Number(e.target.value))}>
          <option value={20}>낮음 20 (흐림·비)</option>
          <option value={50}>보통 50</option>
          <option value={85}>높음 85 (맑음)</option>
        </select>
        반려동물
        <select className="input" value={pet} onChange={(e) => setPet(e.target.value)}>
          <option value="">없음</option>
          <option value="d">강아지 (시바)</option>
          <option value="c-calico">고양이 (삼색)</option>
          <option value="c-mackerel">고양이 (고등어)</option>
          <option value="c-cheese">고양이 (치즈)</option>
        </select>
        <label className="row">
          <input type="checkbox" checked={urban} onChange={(e) => setUrban(e.target.checked)} /> 도시
        </label>
        <label className="row">
          <input type="checkbox" checked={crowd} onChange={(e) => setCrowd(e.target.checked)} /> 접속자 많이
        </label>
        <label className="row">
          <input type="checkbox" checked={cutFirst} onChange={(e) => setCutFirst(e.target.checked)} /> 앞 8명 자르기 (지금 useChat)
        </label>
      </div>

      <div style={{ maxWidth: 760 }}>
        <Panel title={code + ' 마을과 채팅'}>
          <Village countryCode={code} age={age} gender={gender} place={place}
            caption={code + ` · 테스트 (${age}세)`}
            myMessage={sent} others={others} house={{ tier, kind }} vehicle={vehicle || null}
            costume={{ hair: hair || null, top: top || null, hat: hat || null, ride: ride || null }}
            industry={industry || null} urban={urban}
            pet={pet ? { kind: pet[0], name: pet === 'd' ? '복찬' : '콩', coat: pet.split('-')[1] } : null}
            happiness={happy}
            family={[
              { id: 'mom', label: '엄마', gender: 'F', age: 58 },
              { id: 'dad', label: '아빠', gender: 'M', age: 62 },
              { id: 'kid0', label: '딸', gender: 'F', age: 5 },
              { id: 'kid1', label: '아들', gender: 'M', age: 1 },
            ]} />
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
