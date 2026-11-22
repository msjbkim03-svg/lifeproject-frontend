import { useNavigate, useOutletContext } from "react-router-dom";
import Button from "../../common/ui/Button";
import { formatPhone } from "../../utils/phone";
import styles from "./MyPage.module.css";

// 마이페이지 (M04)  주소: /mypage
// 와이어프레임 15쪽: (왼쪽 메뉴는 MyPageLayout) 가입 정보 + 숫자 칸 3개 + 진행 중인 인생 + 전생 기록·특성 강화 바로가기
function MyPage() {
  const navigate = useNavigate();
  // 내 정보는 MyPageLayout 이 서버에서 받아서 넘겨 줌 (여기서는 꺼내 쓰기만)
  const { my } = useOutletContext();

  return (
    // 오른쪽 내용만 (왼쪽 메뉴는 MyPageLayout)
    <main className={styles.main}>
        <h1 className={styles.title}>마이페이지</h1>
        <p className={styles.lead}>내 가입 정보와 지금까지 살아 본 인생을 확인해요.</p>

        {/* 가입 정보 */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>가입 정보</span>
            <Button size="sm" onClick={() => navigate("/mypage/edit")}>개인정보 수정</Button>
          </div>
          <dl className={styles.info}>
            <dt>아이디</dt><dd>{my.loginId}</dd>
            <dt>닉네임</dt><dd>{my.nickname}</dd>
            <dt>이메일</dt><dd>{my.email}</dd>
            <dt>전화번호</dt><dd>{my.phone ? formatPhone(my.phone) : "등록되지 않음"}</dd>
            <dt>가입 일자</dt><dd>{my.joinDate}</dd>
          </dl>
        </section>

        {/* 숫자 칸 3개 */}
        <div className={styles.stats}>
          <div className={styles.stat}><span>보유 포인트</span><b>{my.point}P</b></div>
          <div className={styles.stat}><span>살아 본 인생</span><b>{my.lifeCount}번</b></div>
          <div className={styles.stat}><span>퀘스트 달성</span><b>{my.questDone}개</b></div>
        </div>

        {/* 진행 중인 인생 */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>진행 중인 인생</span>
          </div>
          {my.lifeId ? (
            <div className={styles.life}>
              <div className={styles.character}>캐릭터</div>
              <div className={styles.lifeText}>
                <b>{my.lifeName}</b>
                <span>{my.currentCountryName} · {my.currentAge}살</span>
              </div>
              <Button type="primary" onClick={() => navigate("/play", { state: { lifeId: my.lifeId } })}>
                이어서 살기
              </Button>
            </div>
          ) : (
            <div className={styles.life}>
              <div className={styles.character}>캐릭터</div>
              <div className={styles.lifeText}>
                <b>진행 중인 인생이 없어요</b>
                <span>메인에서 새 인생을 시작해 보세요.</span>
              </div>
              <Button onClick={() => navigate("/")}>새 인생 시작하기</Button>
            </div>
          )}
        </section>

        {/* 전생 기록 · 특성 강화 바로가기 */}
        <div className={styles.twoCol}>
          <section className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>전생 기록</span></div>
            <p className={styles.desc}>지금까지 {my.lifeCount}번의 인생을 살았어요.</p>
            <Button block onClick={() => navigate("/mypage/lives")}>바로가기 ›</Button>
          </section>
          <section className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>특성 강화</span></div>
            <p className={styles.desc}>포인트 {my.point}P로 특성을 올릴 수 있어요.</p>
            <Button block onClick={() => navigate("/mypage/traits")}>바로가기 ›</Button>
          </section>
        </div>
      </main>
  );
}

export default MyPage;
