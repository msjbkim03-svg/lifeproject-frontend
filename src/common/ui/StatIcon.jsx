// 능력치 아이콘 (선 그림). play 상태창과 인생 기록에서 같이 씀
//   예: <StatIcon name="health" color="var(--stat-health)" size={14} />
const PATHS = {
  health: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  happiness: <><circle cx="12" cy="12" r="8" /><path d="M9 14c1.5 1.6 4.5 1.6 6 0" /></>,
  knowledge: <><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v13c-3-1-5-1-8 1-3-2-5-2-8-1z" /><path d="M12 6v13" /></>,
  relation: <><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.5 0 4 1.6 4 4" /></>,
};

function StatIcon({ name, color = 'currentColor', size = 13, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export default StatIcon;
