// C21 코스튬 그림 부품 (마을 캐릭터와 같은 크기: 머리 15px 동그라미 + 몸 17px)
//   wear = { hat: "cap:#c8363d", hair: "#3a2c26", clothes: "#3a7d44" }  (없는 부위는 null)
//   마을(Village)에 붙일 때:
//     <div className="v-head" style={headStyle(wear, true)}><Hat value={wear?.hat} /></div>
//     <div className="v-body" style={{ background: wear?.clothes || 기본 옷 색 }} />
import styles from "./CostumeParts.module.css";

export const HAT_KINDS = ["cap", "beanie", "straw", "tophat", "crown", "ribbon"];

export function Hat({ value }) {
  if (!value) return null;
  const [kind, color] = value.split(":");
  if (!HAT_KINDS.includes(kind)) return null;
  return (
    <span className={styles.hat + " " + styles[kind]} style={{ "--hat": color }} aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

export function headStyle(wear, me = false) {
  const shadows = [];
  if (wear?.hair) shadows.push(`inset 0 5px 0 ${wear.hair}`);
  if (me) shadows.push("0 0 0 2px var(--primary-light)");
  return shadows.length ? { boxShadow: shadows.join(", ") } : undefined;
}

export function CostumeFigure({ wear, size = 3, baseColor = "#6f95e8" }) {
  return (
    <span className={styles.figure} style={{ "--s": size }} aria-hidden="true">
      <span className={styles.head} style={headStyle(wear)}>
        <Hat value={wear?.hat} />
      </span>
      <span className={styles.body} style={{ background: wear?.clothes || baseColor }} />
    </span>
  );
}
