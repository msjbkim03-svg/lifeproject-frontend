// 선택 이벤트 창 (C09) - 엔진 응답의 needChoice 가 true 일 때 띄워요
// 예: <EventChoiceModal open={life.needChoice} event={life.pendingEvent} age={24} year={2009}
//        auto={autoChoice} onAutoChange={setAutoChoice}
//        onChoose={(choiceId) => POST /api/engine/choice { lifeId, choiceId, guestToken }} />
// 선택지를 누르면 바로 결정돼요 (따로 '결정' 버튼 없음). 숫자 키 1~9 로도 골라요.
// 단, 이민·조기 은퇴·이혼·집 팔기처럼 되돌리기 힘든 큰 결정은 한 번 누르면 "한 번 더 누르면 결정됩니다"가 뜨고, 다시 눌러야 결정돼요.
// 가게 차리기·주식 투자 같은 돈 쓰는 결정은 큰 결정으로 보지 않아요 (한 번에 결정).
// costs (엔진 life.choiceCosts): 집·땅·가게·투자처럼 큰돈 드는 선택지의 비용
//   - 내 돈으로 되면: "집·땅값 3,400만 원 · 내 돈 1,200만 원" (한국 체감)
//   - 모자라지만 대출이 되면: 대출액·이자를 보여 주고 한 번 더 눌러야 결정
//   - 대출로도 안 되면: 고를 수 없음 ("돈이 모자라요")
// 자동으로 선택하기 (원작 '자동으로 맡기기', 11/20 이름 바꿈 - 예전 '운에 맡기기'):
//   - '자동으로 선택하기' 단추: 고를 수 있는 선택지 가운데 하나를 무작위로 골라 잠깐 보여 준 뒤 결정
//     (대출이 드는 선택지는 다른 게 있으면 빼요)
//   - '앞으로 나오는 선택도 자동으로' 체크: 켜 두면 원작처럼 고를 칸을 먼저 표시하고 진행 막대와 함께
//     글 길이만큼(5~14초, 16배속이면 절반) 기다린 뒤 넘어가요 (auto / onAutoChange, localStorage 'autoChoice')
//     그 전에 직접 고르면 직접 고른 게 들어가고, 카드를 누르면 이번 창은 자동 결정을 멈춰요
// 꼭 골라야 하는 창이라 바깥을 눌러도 안 닫혀요. 고르는 중(busy)에는 버튼이 잠겨요.
// 엔진 선택지(C06-4, eventType 'SMALL', 선택지 번호 음수)도 같은 창으로 띄우고, 머리말만 '작은 선택'으로 바꿔요.
// 돈·신용이 모자라 고를 수 없는 선택지는 엔진이 아예 빼고 보내요 (남은 비용 정보만 costs 로 옴).
import { useEffect, useRef, useState } from 'react';
import DecisionModal from './DecisionModal';
import { autoWaitSec, autoPickOf } from './autoPick';
import './ui.css';

const FATE_MS = 700;   // '자동으로 선택하기' 단추로 고른 선택지를 보여 주는 시간

// 큰 결정: 나라·직업 상태가 바뀌는 선택지, 또는 재산이 30% 이상 줄어드는 선택지 (투자·창업 제외)
const BIG_ACTIONS = ['MIGRATE', 'EARLY_RETIRE', 'DIVORCE'];
const MONEY_EVENT = /^LE_INVEST/;            // 가게 차리기(LE_INVEST_BUSINESS), 주식(LE_INVEST_STOCK) …
const MONEY_WORDS = /주식|투자|가게|창업|장사|코인|펀드|적금|예금/;
const isBigChoice = (c, event) => {
  if (!c) return false;
  if (BIG_ACTIONS.includes(c.resultAction)) return true;
  if (MONEY_EVENT.test(event?.eventId || '') || MONEY_WORDS.test(c.choiceText || '')) return false;
  return (c.effWealthRate || 0) <= -0.3;
};

// 효과 한 줄 (선택지 아래 작은 글씨)
const effLine = (c) => {
  const out = [];
  [['effHealth', '건강'], ['effHappiness', '행복'], ['effKnowledge', '지식'], ['effRelation', '관계']].forEach(([k, n]) => {
    const v = Math.round(c[k] || 0);
    if (v) out.push(`${n} ${v > 0 ? '+' : ''}${v}`);
  });
  [['effIncomeRate', '소득'], ['effWealthRate', '재산']].forEach(([k, n]) => {
    const v = Math.round((c[k] || 0) * 100);
    if (v) out.push(`${n} ${v > 0 ? '+' : ''}${v}%`);
  });
  return out.join(' · ');
};

// 돈은 원작처럼 한국 체감 원으로 (krw = 엔진 life.krwPerUsd, 없으면 850)
const wonOf = (krw) => (v) => {
  const w = Math.abs(v || 0) * (krw || 850);
  if (w >= 1e8) return (w >= 1e9 ? Math.round(w / 1e8).toLocaleString() : String(Math.round(w / 1e7) / 10)) + '억 원';
  if (w >= 1e4) return Math.round(w / 1e4).toLocaleString() + '만 원';
  return (Math.round(w / 100) * 100).toLocaleString() + '원';
};

// 운에 맡길 때 고를 후보: 고를 수 있는 것, 대출 없는 것 우선
const fateCandidates = (choices, costs) => {
  const costOf = (c) => (costs || []).find((k) => k.choiceId === c.choiceId);
  const ok = (choices || []).filter((c) => { const k = costOf(c); return !k || k.ok; });
  const noLoan = ok.filter((c) => { const k = costOf(c); return !k || !(k.loan > 0); });
  const pool = noLoan.length ? noLoan : ok;
  // 진학 선택(엔진 ENG_SCHOOL_*)은 운에 맡겨도 대개 진학하게: 첫 선택지(간다)를 세 번 넣음 (75%)
  if (pool[0]?.eventId?.startsWith('ENG_SCHOOL_')) return [pool[0], pool[0], ...pool];
  return pool;
};

function EventChoiceModal({ open, event, onChoose, busy, age, year, showEffects = false, costs = [], krw, auto = false, onAutoChange, speed = 1 }) {
  const usd = wonOf(krw);
  const [armed, setArmed] = useState(null); // 한 번 누른 큰 결정 (한 번 더 누르면 결정)
  const [fate, setFate] = useState(null);   // 운이 고른 선택지 (잠깐 표시한 뒤 결정)
  const [stopped, setStopped] = useState(false); // 카드를 눌러 이번 창의 자동 결정을 멈춤 (창은 이벤트마다 새로 만들어짐)
  const chooseRef = useRef(onChoose);
  // 반려동물 이름 (원작 petNameAsk): 엔진 반려동물 창에만 이름 칸, 비우면 서버가 그 나라 흔한 이름으로
  const [petName, setPetName] = useState('');
  const nameRef = useRef('');
  // 반려동물을 들이는 선택지를 누르면 이름 짓기 단계 (원작처럼 고른 뒤에 이름을 물음) - 그 선택지 번호
  const [naming, setNaming] = useState(null);
  // 유언장 (ENG_WILL): 유언장 끝에 남길 말 (선택, 비우면 없음)
  const [willWords, setWillWords] = useState('');
  const willRef = useRef(''); // 자동 결정 때도 적은 말을 함께 보냄 (11/23: 적는 도중 자동으로 넘어가 남길 말이 빠졌음)
  const poolRef = useRef([]);
  useEffect(() => { chooseRef.current = onChoose; }, [onChoose]);
  useEffect(() => { poolRef.current = fateCandidates(event?.choices, costs); }, [event, costs]);
  // 이벤트가 바뀌면 고른 표시는 처음부터: 진행 화면이 key={이벤트 ID} 로 창을 새로 만들어요

  // 운에 맡기기: 하나 골라 표시 (결정은 아래 효과에서)
  const leaveToFate = () => {
    const pool = poolRef.current;
    if (!pool.length) return;
    setFate(pool[Math.floor(Math.random() * pool.length)].choiceId);
  };

  // 자동 결정 (원작): 고를 것을 먼저 정해 표시하고, 읽을 시간만큼 기다린 뒤 넘어감
  const autoOn = !!(open && event && auto && !stopped && !fate);
  const autoPick = autoOn ? autoPickOf(fateCandidates(event.choices, costs), `${event.eventId}|${age}|${event.title}`) : null;
  const autoSec = autoWaitSec([event?.title, event?.logText, ...(event?.choices || []).map((c) => c.choiceText)], speed);
  const autoId = autoPick?.choiceId;
  useEffect(() => {
    if (!autoOn || busy || autoId == null) return undefined;
    const t = setTimeout(() => {
      if (chooseRef.current) chooseRef.current(autoId, (event?.eventId === 'ENG_WILL' ? willRef.current : nameRef.current) || undefined);
    }, autoSec * 1000);
    return () => clearTimeout(t);
  }, [autoOn, busy, autoId, autoSec, event?.eventId]);

  // 운이 고른 게 보이고 나서 결정
  useEffect(() => {
    if (!fate) return undefined;
    const t = setTimeout(() => {
      // 보낸 결정이 끝나면 운이 고른 표시를 풀어 둠: 성공하면 창이 닫히고,
      // 실패해서(409 등) 창이 그대로 남으면 다시 고를 수 있게
      Promise.resolve(chooseRef.current && chooseRef.current(fate, (event?.eventId === 'ENG_WILL' ? willRef.current : nameRef.current) || undefined)).finally(() => setFate(null));
    }, FATE_MS);
    return () => clearTimeout(t);
  }, [fate, event?.eventId]);

  if (!open || !event) return null;
  const choices = event.choices || [];
  const askName = /^ENG_PET_(ADOPT|BEG)$/.test(event.eventId || '');
  const askWill = event.eventId === 'ENG_WILL';
  // 이름을 물을 선택지: 들인다 · 조른다 (지금은 아니다 · 참는다는 이름이 필요 없음)
  const needsName = (c) => askName && /들인다|조른다|키운다/.test(c.choiceText || '');

  const costOf = (c) => (costs || []).find((k) => k.choiceId === c.choiceId);

  const pick = (o) => {
    if (fate) return;
    const c = o.choice;
    const k = costOf(c);
    if (k && !k.ok) return;
    if ((isBigChoice(c, event) || (k && k.loan > 0)) && armed !== c.choiceId) {
      setArmed(c.choiceId);
      return;
    }
    if (needsName(c)) {
      setNaming(c.choiceId);
      return;
    }
    if (onChoose) onChoose(c.choiceId, askWill && !/법에 맡긴다/.test(c.choiceText || '') ? willWords : undefined);
  };

  const meta = age != null ? `${age}세${year ? ' · ' + year + '년' : ''}` : undefined;
  const locked = busy || !!fate;
  let hint = '누르면 바로 결정되고, 되돌릴 수 없어요. 숫자 키로도 고를 수 있어요.';
  if (fate) hint = '자동으로 골랐어요. 곧 결정돼요.';
  else if (auto && stopped) hint = '이번 선택은 자동 결정을 멈췄어요. 직접 골라 주세요.';

  // 이름 짓기 단계: 고른 동물에게 이름을 지어 주고 결정
  if (naming != null) {
    const picked = choices.find((c) => c.choiceId === naming);
    const what = /^(.*\S)\s*\(([^()]+)\)$/.exec(picked?.choiceText || '')?.[1] || picked?.choiceText || '';
    const nm = petName.trim();
    return (
      <DecisionModal open label="새 가족" meta={meta} title="이름을 지어 주세요"
        text={`${what}. 어떤 이름으로 부를까요? 비워 두면 그 나라에서 흔한 이름으로 지어요.`}
        options={[
          { key: 'ok', title: nm ? `'${nm}'(으)로 정하기` : '흔한 이름으로 정하기' },
          { key: 'back', title: '다시 고르기' },
        ]}
        onPick={(o) => {
          if (o.key === 'back') { setNaming(null); return; }
          if (onChoose) onChoose(naming, nm || undefined);
        }}
        busy={busy}
        hint="이름은 인생 기록과 가족 칸에 남아요."
        footer={(
          <label className="dec-name">
            <span>이름</span>
            <input type="text" maxLength={12} value={petName} autoFocus placeholder="예: 초코, 보리"
              onChange={(e) => { setPetName(e.target.value); nameRef.current = e.target.value; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy && onChoose) onChoose(naming, petName.trim() || undefined); }} />
          </label>
        )} />
    );
  }

  return (
    <DecisionModal open label={event.eventType === 'SMALL' ? '작은 선택' : '중대 결정'} meta={meta}
      title={event.title || '인생의 갈림길'} text={event.logText}
      options={choices.map((c) => {
        const k = costOf(c);
        // 선택지 끝의 괄호 설명은 아랫줄로 (원작 sub: '한 해 약 ○○ · 10~15년 함께')
        const m = /^(.*\S)\s*\(([^()]+)\)$/.exec(c.choiceText || '');
        let sub = showEffects ? effLine(c) : undefined;
        let note;
        let confirm;
        if (k) {
          sub = `${k.label} ${usd(k.cost)} · 내 돈 ${usd(k.mine)}`;
          if (!k.ok) note = `돈이 모자라요. 내 돈으로 ${usd(k.need)}은 있어야 해요.`;
          else if (k.loan > 0) {
            sub += ` · 대출 ${usd(k.loan)} (이자 약 ${usd(k.interest)})`;
            confirm = `대출 ${usd(k.loan)}을 받아요. 한 번 더 누르면 결정됩니다.`;
          }
        }
        if (m) sub = sub ? `${m[2]} · ${sub}` : m[2];
        return {
          key: c.choiceId, choice: c, title: m ? m[1] : c.choiceText, sub, note, confirm,
          tag: fate === c.choiceId ? '자동 선택' : undefined,
          disabled: !!(k && !k.ok) || (!!fate && fate !== c.choiceId),
          armed: armed === c.choiceId,
        };
      })}
      onPick={pick} busy={busy}
      hint={hint}
      auto={autoId != null ? { key: autoId, sec: autoSec, onStop: () => setStopped(true), onOff: onAutoChange ? () => onAutoChange(false) : undefined } : undefined}
      footer={(
        <div className="dec-fate">
          {askWill && (
            <label className="dec-name dec-will">
              <span>남길 말</span>
              <textarea maxLength={100} rows={2} value={willWords} placeholder="유언장 끝에 적을 말 (선택 · 100자까지)"
                onFocus={() => setStopped(true)}
                onChange={(e) => { setWillWords(e.target.value); willRef.current = e.target.value; setStopped(true); }} />
              <small className="dec-will-h" style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--ink-light)' }}>적은 뒤 위에서 나눌 방법을 고르면 유언장이 완성돼요. ('법에 맡긴다'를 고르면 남기지 않아요)</small>
            </label>
          )}
          {autoId == null && <button type="button" className="dec-fate-b" disabled={locked} onClick={leaveToFate}>자동으로 선택하기</button>}
          {onAutoChange && (
            <label className="dec-fate-auto">
              <input type="checkbox" checked={auto} onChange={(e) => onAutoChange(e.target.checked)} />
              앞으로 나오는 선택도 자동으로
            </label>
          )}
        </div>
      )} />
  );
}

export default EventChoiceModal;
