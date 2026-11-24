// C22 엔딩 크레딧 테스트 전용 화면 (주소: /result/test) - 엔딩 크레딧 작업이 끝날 때까지만 씀
// - 장면 판: 장면 20종을 골라 시간 막대로 돌려 봄 (나라 권역 · 내 성별 · 나이 · 가족 · 누가 아픈지 · 일터 · 카메라)
// - 한눈에: 모든 장면을 같은 시각으로 한 번에
// - 실제 인생: 오늘 시뮬로 만든 인생들의 엔딩 크레딧 바로 열기 (+ 번호 · 토큰 직접 넣기)
// ResultPage 가 lifeId === 'test' 일 때 이 화면을 보여 줌 (App.jsx 라우트는 건드리지 않음)
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FilmScene from './FilmScene';
import './film.css';

const SCENES = [
  ['born', '태어남 (제목)'], ['school', '입학'], ['grad', '졸업'], ['date', '만남 · 청혼'], ['wedding', '결혼식'],
  ['newborn', '아이가 태어남'], ['hosp', '병원'], ['loss', '떠나보냄'], ['fly', '이민'], ['flee', '피란'],
  ['rain', '비 (실직 · 이혼)'], ['news', '역사 사건 뉴스'], ['home', '내 집 마련'], ['award', '상 · 장학금 · 복권'], ['party', '은퇴'],
  ['cert', '자격증'], ['prison', '수감'], ['work', '일터 (일 시작 · 승진)'], ['village', '그 밖의 해 (산책)'], ['last', '마지막 밤'], ['funeral', '장례'],
];
const REGIONS = [['CHN', '동아시아'], ['VNM', '동남아시아'], ['IND', '남아시아'], ['KAZ', '중앙아시아'], ['TUR', '서아시아']];
const FAMS = {
  child: { name: '어린 시절 (부모 · 형제)', age: 7, fam: (g) => [{ id: 'mom', gender: 'F', age: 34 }, { id: 'dad', gender: 'M', age: 37 }, { id: 'sib0', gender: g === 'F' ? 'M' : 'F', age: 10 }, { id: 'sib1', gender: 'F', age: 3 }] },
  young: { name: '젊은 날 (부모 · 연인)', age: 26, fam: () => [{ id: 'mom', gender: 'F', age: 53 }, { id: 'dad', gender: 'M', age: 56 }] },
  family: { name: '부부 + 아이들', age: 34, fam: (g) => [{ id: 'mom', gender: 'F', age: 61 }, { id: 'spouse', gender: g === 'F' ? 'M' : 'F', age: 35 }, { id: 'kid0', gender: 'M', age: 6 }, { id: 'kid1', gender: 'F', age: 3 }, { id: 'kid2', gender: 'M', age: 0 }] },
  old: { name: '노년 (배우자 · 자녀 · 손주)', age: 78, fam: (g) => [{ id: 'spouse', gender: g === 'F' ? 'M' : 'F', age: 80 }, { id: 'kid0', gender: 'F', age: 50 }, { id: 'kid1', gender: 'M', age: 46 }, { id: 'kid2', gender: 'M', age: 41 }] },
  alone: { name: '혼자 (가족 없음)', age: 45, fam: () => [] },
};
const CAMS = {
  none: () => [0, 0, 1],
  track: (p) => [7 - 6 * p, 0, 1 + 0.06 * p],
  push: (p) => [-2 + 2 * p, -1 + 2 * p, 0.96 + 0.38 * p],
  tilt: (p) => [-3 + 3 * p, 16 - 16 * p, 1.08 - 0.06 * p],
  pull: (p) => [0, 1 - p, 1.62 - 0.6 * p],
};
// 오늘 만든 테스트 인생 (비회원 토큰 포함)
const LIVES = [
  [11108, '카비타 파텔 · 인도 · 46세', '출산 · 입학 · 졸업 · 결혼 · 아기 · 상 · 떠나보냄', '7d6e55c5-610d-4e1c-bb57-7ef1efe25922'],
  [11120, '알리 레자이 · 이란 · 81세', '비 · 복권 · 일터 · 이혼', '21fd082d-b33e-4472-bf74-2e1bd753aa8c'],
  [11123, '정수전 · 중국 · 91세', '배우자 떠나보냄 · 복권', 'ed2c7e51-0010-483d-86c8-bee0af5f2f31'],
  [11119, '궈젠화 · 중국 · 81세', '형제 여섯 · 아이 셋', '384193d0-9c9a-47c6-9ee3-dd15eca2c468'],
  [11121, '천밍 · 중국 · 73세', '학교 · 결혼 · 아이', '74c753ed-5e96-4230-b903-823bb5bb736f'],
  [11118, '소헬 라나 · 방글라데시 · 50세', '내 집 · 이혼', 'bfd4a3e1-6951-458a-b9b4-7273a33da983'],
  [11122, '디브야 초한 · 인도 · 32세', '뉴스 · 일 시작', '1cec456c-0c93-4fb2-a96f-3b4938d80fd3'],
  [11117, '카란 조시 · 인도 · 0세', '첫돌 전에 떠난 아기', '0c4d0acf-3070-42ba-b504-1e0f1dc34e20'],
];
const DUR = 8000;

function FilmTest() {
  const navigate = useNavigate();
  const [scene, setScene] = useState('wedding');
  const [cc, setCc] = useState('IND');
  const [gender, setGender] = useState('F');
  const [famKey, setFamKey] = useState('family');
  const [age, setAge] = useState(34);
  const [arg, setArg] = useState('me');
  const [ind, setInd] = useState('SERVICE');
  const [urban, setUrban] = useState(true);
  const [cam, setCam] = useState('none');
  const [t, setT] = useState(2500);
  const [playing, setPlaying] = useState(true);
  const [grid, setGrid] = useState(false);
  const [lifeNo, setLifeNo] = useState('');
  const [token, setToken] = useState('');
  const tRef = useRef(t);

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      tRef.current = (tRef.current + (now - last)) % DUR;
      last = now;
      setT(tRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const pickFam = (k) => { setFamKey(k); setAge(FAMS[k].age); };
  const v = (sc) => ({
    scene: sc, arg: sc === 'grad' ? 'uni' : arg, countryCode: cc, gender, age, urban,
    family: FAMS[famKey].fam(gender), industry: ind, year: 1974 + age, text: sc === 'date' ? '청혼을 받았다' : '테스트 장면',
    extra: [{ gender: 'M', age: Math.max(20, age + 4) }, { gender: 'F', age: Math.max(20, age - 1) }],
  });
  const seek = (ms) => { tRef.current = ms; setT(ms); };

  return (
    <div className="ft">
      <header className="ft-head">
        <div>
          <h1>엔딩 크레딧 테스트</h1>
          <p>작업용 화면이에요 (/result/test). 장면을 골라 시간 막대로 움직임을 보고, 아래에서 실제 인생 엔딩 크레딧을 열어요.</p>
        </div>
        <div className="ft-row">
          <button type="button" className={'ft-chip' + (!grid ? ' on' : '')} onClick={() => setGrid(false)}>장면 하나</button>
          <button type="button" className={'ft-chip' + (grid ? ' on' : '')} onClick={() => setGrid(true)}>한눈에 (20종)</button>
        </div>
      </header>

      <div className="ft-body">
        <aside className="ft-side">
          <h2>장면</h2>
          <div className="ft-grid2">
            {SCENES.map(([k, name]) => (
              <button key={k} type="button" className={'ft-chip' + (scene === k ? ' on' : '')} onClick={() => { setScene(k); setGrid(false); seek(0); setPlaying(true); }}>{name}</button>
            ))}
          </div>
          <h2>나라 권역</h2>
          <div className="ft-row wrap">{REGIONS.map(([k, n]) => <button key={k} type="button" className={'ft-chip' + (cc === k ? ' on' : '')} onClick={() => setCc(k)}>{n}</button>)}</div>
          <h2>가족</h2>
          <div className="ft-row wrap">{Object.entries(FAMS).map(([k, f]) => <button key={k} type="button" className={'ft-chip' + (famKey === k ? ' on' : '')} onClick={() => pickFam(k)}>{f.name}</button>)}</div>
          <div className="ft-row">
            <label className="ft-lab">나<select value={gender} onChange={(e) => setGender(e.target.value)}><option value="F">여자</option><option value="M">남자</option></select></label>
            <label className="ft-lab">나이<input type="number" min={0} max={100} value={age} onChange={(e) => setAge(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} /></label>
          </div>
          <div className="ft-row">
            <label className="ft-lab">누가 (병원 · 떠나보냄)<select value={arg} onChange={(e) => setArg(e.target.value)}><option value="me">나</option><option value="kid">아이</option><option value="pt">배우자</option><option value="par">부모님</option><option value="sudden">마지막: 사고 (빈자리)</option></select></label>
          </div>
          <div className="ft-row">
            <label className="ft-lab">일터<select value={ind} onChange={(e) => setInd(e.target.value)}><option value="SERVICE">가게 · 사무실</option><option value="INDUSTRY">공장</option><option value="AGRI">농사</option></select></label>
            <label className="ft-lab">카메라<select value={cam} onChange={(e) => setCam(e.target.value)}>{Object.keys(CAMS).map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          </div>
          <label className="ft-check"><input type="checkbox" checked={urban} onChange={(e) => setUrban(e.target.checked)} /> 도시 (태어남: 병원 / 끄면 집)</label>
        </aside>

        <main className="ft-main">
          {!grid ? (
            <>
              <div className="ft-stage"><FilmScene v={v(scene)} t={t} cam={CAMS[cam](t / DUR)} /></div>
              <div className="ft-bar">
                <button type="button" className="ft-btn" onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚ 멈춤' : '▶ 재생'}</button>
                <input type="range" min={0} max={DUR} step={10} value={Math.round(t)} onChange={(e) => { setPlaying(false); seek(Number(e.target.value)); }} aria-label="장면 시간" />
                <span className="ft-time">{(t / 1000).toFixed(1)}초</span>
                {[0, 1000, 2000, 3000, 4500].map((ms) => <button key={ms} type="button" className="ft-chip" onClick={() => { setPlaying(false); seek(ms); }}>{ms / 1000}초</button>)}
              </div>
            </>
          ) : (
            <div className="ft-all">
              {SCENES.map(([k, name]) => (
                <button key={k} type="button" className="ft-cell" onClick={() => { setScene(k); setGrid(false); seek(0); setPlaying(true); }}>
                  <div className="ft-thumb"><FilmScene v={v(k)} t={t % 5000} /></div>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}

          <section className="ft-lives">
            <h2>실제 인생 엔딩 크레딧</h2>
            <div className="ft-list">
              {LIVES.map(([id, name, note, g]) => (
                <button key={id} type="button" className="ft-life" onClick={() => navigate(`/result/${id}?guest=${g}`)}>
                  <b>{name}</b><span>{note}</span><i>#{id}</i>
                </button>
              ))}
            </div>
            <form className="ft-row" onSubmit={(e) => { e.preventDefault(); if (lifeNo) navigate(`/result/${lifeNo}${token ? `?guest=${encodeURIComponent(token)}` : ''}`); }}>
              <label className="ft-lab">인생 번호<input value={lifeNo} onChange={(e) => setLifeNo(e.target.value.replace(/\D/g, ''))} placeholder="11108" /></label>
              <label className="ft-lab grow">비회원 토큰 (내 인생이면 비워 둠)<input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="7d6e55c5-…" /></label>
              <button type="submit" className="ft-btn">열기</button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default FilmTest;
