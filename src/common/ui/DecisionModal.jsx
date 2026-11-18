// 결정 창 (원작 '중대 결정' 창 모양) - 선택 이벤트(C09) · 직업 제안(C06) · 이민 목적지(C10) 공통
// 예: <DecisionModal open label="중대 결정" meta="24세 · 2009년" title="인생의 갈림길" text="상황 문장"
//        fact="참고 통계 한 줄(없으면 생략)"
//        options={[{ key: 'a', title: '결혼한다', sub: '행복 +5', armed: false, disabled: false, note: '돈이 모자라요' }]}
//        onPick={(opt) => ...} busy={false} footer={<button>올해는 넘기기</button>} />
// - 숫자 키 1~9 로도 고를 수 있어요
// - 꼭 골라야 하는 창이라 바깥을 눌러도 안 닫혀요
import { useEffect } from 'react';
import './ui.css';

function DecisionModal({ open, label = '중대 결정', meta, title, text, fact, options = [], onPick, busy, hint, footer }) {
  // 숫자 키로 고르기
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length && !busy && onPick && !options[n - 1].disabled) {
        e.preventDefault();
        onPick(options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, options, busy, onPick]);

  if (!open) return null;
  return (
    <div className="dec-back">
      <div className="dec" role="dialog" aria-modal="true" aria-labelledby="decTitle">
        <div className="dec-hd">
          <span>{label}</span>
          {meta && <span>{meta}</span>}
        </div>
        <div className="dec-bd">
          {title && <h2 id="decTitle" className="dec-title">{title}</h2>}
          {text && <p className="dec-text">{text}</p>}
          {fact && <div className="dec-fact">{fact}</div>}
          <div className="dec-ch">
            {options.map((o, i) => (
              <button key={o.key} type="button" disabled={busy || o.disabled}
                className={'dec-opt' + (o.armed ? ' armed' : '') + (o.disabled ? ' off' : '')}
                onClick={() => onPick && onPick(o)}>
                <span className="dec-k">{i + 1}</span>
                <b>{o.title}</b>
                {o.tag && <span className="dec-tag">{o.tag}</span>}
                {o.sub && <small>{o.sub}</small>}
                {o.note && <small className="dec-note">{o.note}</small>}
                {o.armed && <small className="dec-confirm">{o.confirm || '큰 결정이에요. 한 번 더 누르면 결정됩니다.'}</small>}
              </button>
            ))}
          </div>
          {hint && <p className="dec-hint">{hint}</p>}
          {footer && <div className="dec-foot">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default DecisionModal;
