// 마을 사람 그림 한 명 (나 · 가족 · 같은 나라 접속자 공용)
// 레이어 순서: 다리 → 팔·옷 → 얼굴 → 머리카락 → 모자  (look = costumeData.lookOf 결과)
// viewBox 24 × 40, 오른쪽을 보고 있음 (왼쪽으로 걸을 때는 CSS 로 뒤집음)
const SKIN = '#f2c9a0';
const PANTS = '#4a4458';
const EYE = '#3a2c26';

function Top({ style, color }) {
  if (style === 'dress') {
    return <path d="M8 18 H16 Q17.5 18 18 20 L20.5 34 H3.5 L6 20 Q6.5 18 8 18 Z" fill={color} />;
  }
  return (
    <g>
      <rect x="5.5" y="18" width="13" height="13" rx="4" fill={color} />
      {style === 'stripe' && <path d="M6 22.5 H18 M6 26.5 H18" stroke="#ffffff" strokeWidth="1.4" opacity="0.6" />}
      {style === 'suit' && (
        <g>
          <path d="M9.5 18 L12 23 L14.5 18 Z" fill="#ffffff" />
          <path d="M12 21 L13 25 L12 27 L11 25 Z" fill="#e8584c" />
        </g>
      )}
    </g>
  );
}

function Hair({ style, color }) {
  const cap = <path d="M5.2 10.5 Q5.4 3.4 12 3.4 Q18.6 3.4 18.8 10.5 Q16.2 7 12 7.2 Q7.8 7 5.2 10.5 Z" fill={color} />;
  if (style === 'long') {
    return (
      <g>
        <rect x="4.6" y="8" width="2.8" height="12" rx="1.4" fill={color} />
        <rect x="16.6" y="8" width="2.8" height="12" rx="1.4" fill={color} />
        {cap}
      </g>
    );
  }
  if (style === 'bun') {
    return (
      <g>
        <circle cx="12" cy="3" r="2.6" fill={color} />
        {cap}
      </g>
    );
  }
  return cap;
}

function Hat({ style, color }) {
  if (style === 'straw') {
    return (
      <g>
        <ellipse cx="12" cy="7.6" rx="10" ry="1.9" fill={color} />
        <path d="M7 7.6 Q7.4 2.6 12 2.6 Q16.6 2.6 17 7.6 Z" fill={color} />
        <rect x="7.2" y="5.6" width="9.6" height="1.6" fill="#c9544a" opacity="0.8" />
      </g>
    );
  }
  if (style === 'beanie') {
    return (
      <g>
        <path d="M5 9 Q5 1.8 12 1.8 Q19 1.8 19 9 Z" fill={color} />
        <rect x="4.6" y="7.6" width="14.8" height="2.4" rx="1.1" fill={color} />
        <rect x="4.6" y="7.6" width="14.8" height="2.4" rx="1.1" fill="#ffffff" opacity="0.25" />
        <circle cx="12" cy="1.8" r="1.7" fill="#ffffff" />
      </g>
    );
  }
  // cap: 챙이 앞(오른쪽)으로
  return (
    <g>
      <path d="M5.2 8.6 Q5.6 2.6 12 2.6 Q18.4 2.6 18.8 8.6 Z" fill={color} />
      <rect x="13" y="7.4" width="8.6" height="2" rx="1" fill={color} />
    </g>
  );
}

function Figure({ look }) {
  return (
    <svg className="v-fig" viewBox="0 0 24 40" width="22" height="37" aria-hidden="true">
      <rect x="8.2" y="29" width="3.2" height="10" rx="1.5" fill={PANTS} />
      <rect x="12.6" y="29" width="3.2" height="10" rx="1.5" fill={PANTS} />
      <rect x="3.4" y="19" width="3" height="9" rx="1.5" fill={look.top.color} />
      <rect x="17.6" y="19" width="3" height="9" rx="1.5" fill={look.top.color} />
      <Top {...look.top} />
      <circle cx="12" cy="10.6" r="6.8" fill={SKIN} />
      {look.hair && <Hair {...look.hair} />}
      <circle cx="10.2" cy="11.2" r="0.9" fill={EYE} />
      <circle cx="14.6" cy="11.2" r="0.9" fill={EYE} />
      {look.hat && <Hat {...look.hat} />}
    </svg>
  );
}

export default Figure;