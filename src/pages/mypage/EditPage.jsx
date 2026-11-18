import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import Modal from '../../common/ui/Modal';
import { formatPhone } from '../../utils/phone';
import common from './MyPage.module.css'; // 마이페이지와 같은 틀 (container, card, title …)
import styles from './EditPage.module.css'; // 이 화면만 쓰는 입력칸 모양

// 개인정보 수정 (M05) + 회원 탈퇴 (M06)  주소: /mypage/edit
// 와이어프레임 16쪽
function EditPage() {
  const navigate = useNavigate();

  // 내 정보는 MyPageLayout 이 넘겨 줌 (setMy 로 바꾸면 왼쪽 메뉴 닉네임도 같이 바뀜)
  const { my, setMy } = useOutletContext();

  // 입력칸 값 (처음엔 내 정보로 채워 둠)
  const [nickname, setNickname] = useState(my.nickname);
  const [email, setEmail] = useState(my.email);
  const [phone, setPhone] = useState(formatPhone(my.phone)); // 010-1234-5678 모양 (예전 회원은 빈칸)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordCheck, setNewPasswordCheck] = useState('');

  // 안내 문구
  const [nickMsg, setNickMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  // 이메일 변경 인증 (이메일을 바꿨을 때만 씀)
  const [emailCode, setEmailCode] = useState('');
  const [emailSent, setEmailSent] = useState(false); // 새 이메일로 인증번호를 보냈는지
  const [message, setMessage] = useState(''); // 저장 결과
  const [error, setError] = useState('');     // 저장 오류

  // 탈퇴
  const [withdrawPw, setWithdrawPw] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false); // 탈퇴 확인 창

  // 2. 닉네임 중복 확인 (원래 닉네임 그대로면 확인 필요 없음)
  const checkNickname = async () => {
    if (nickname === my.nickname) return setNickMsg('지금 쓰는 닉네임이에요.');
    try {
      const res = await client.get('/api/members/checkNickname', { params: { nickname } });
      setNickMsg(res.data.available ? '사용할 수 있는 닉네임이에요.' : '이미 사용 중인 닉네임이에요.');
    } catch {
      setNickMsg('중복 확인을 하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  };

  // 3. 이메일 중복 확인
  const checkEmail = async () => {
    if (email === my.email) return setEmailMsg('지금 쓰는 이메일이에요.');
    try {
      const res = await client.get('/api/members/checkEmail', { params: { email } });
      setEmailMsg(res.data.available ? '사용할 수 있는 이메일이에요.' : '이미 사용 중인 이메일이에요.');
    } catch {
      setEmailMsg('중복 확인을 하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
  };

  // 3-1. 새 이메일로 인증번호 받기 → POST /api/members/me/emailCode
  const sendEmailCode = async () => {
    setEmailMsg('');
    try {
      const res = await client.post('/api/members/me/emailCode', { email });
      setEmailSent(true);
      setEmailMsg(res.data.message);
    } catch (err) {
      setEmailMsg(err.response?.data?.message || '인증번호를 보내지 못했어요.');
    }
  };

  // 4. 저장하기 → PUT /api/members/me
  const save = async () => {
    setMessage('');
    setError('');
    if (!currentPassword) return setError('현재 비밀번호를 입력해 주세요.');
    if (newPassword && newPassword !== newPasswordCheck) return setError('새 비밀번호 확인이 맞지 않아요.');
    if (email !== my.email && !emailCode) return setError('이메일을 바꾸려면 새 이메일로 받은 인증번호를 입력해 주세요.');
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''))) return setError('전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)');

    try {
      const res = await client.put('/api/members/me', {
        nickname, email, phone, currentPassword, newPassword, newPasswordCheck, emailCode,
      });
      // 헤더 닉네임도 바꾸기
      localStorage.setItem('nickname', res.data.nickname);
      setMy({ ...my, nickname, email, phone: phone.replace(/-/g, '') });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordCheck('');
      setEmailCode('');
      setEmailSent(false);
      setEmailMsg('');
      setMessage('저장했어요.');
    } catch (err) {
      setError(err.response?.data?.message || '저장하지 못했어요.');
    }
  };

  // 5. 회원 탈퇴 버튼 → 비밀번호 입력했는지 보고 확인 창 열기
  const openConfirm = () => {
    setWithdrawError('');
    if (!withdrawPw) return setWithdrawError('비밀번호를 입력해 주세요.');
    setConfirmOpen(true);
  };

  // 6. 확인 창에서 "탈퇴하기" → POST /api/members/me/withdraw
  const withdraw = async () => {
    try {
      await client.post('/api/members/me/withdraw', { currentPassword: withdrawPw });
      // 로그인 토큰 지우고 메인으로 (비회원 guestToken 은 그대로)
      localStorage.removeItem('token');
      localStorage.removeItem('nickname');
      localStorage.removeItem('memberRole');
      navigate('/');
    } catch (err) {
      setConfirmOpen(false);
      setWithdrawError(err.response?.data?.message || '탈퇴하지 못했어요.');
    }
  };

  return (
    // 오른쪽 내용만 (왼쪽 메뉴는 MyPageLayout) + 탈퇴 확인 창
    <>
      <main className={common.main}>
        <h1 className={common.title}>개인정보 수정</h1>
        <p className={common.lead}>저장하려면 현재 비밀번호를 꼭 입력해 주세요. 아이디는 바꿀 수 없어요.</p>

        {/* ===== 개인정보 수정 (M05) ===== */}
        <section className={common.card}>
          <div className={styles.row}>
            <label>아이디</label>
            <input className={styles.input} value={my.loginId} disabled />
          </div>

          <div className={styles.row}>
            <label>닉네임</label>
            <input className={styles.input} value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNickMsg(''); }} />
            <Button onClick={checkNickname}>중복 확인</Button>
          </div>
          {nickMsg && <p className={styles.hint}>{nickMsg}</p>}

          <div className={styles.row}>
            <label>현재 비밀번호</label>
            <input className={styles.input} type="password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label>새 비밀번호</label>
            <input className={styles.input} type="password" value={newPassword}
              placeholder="바꾸지 않으려면 비워 두세요"
              onChange={(e) => setNewPassword(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label>새 비밀번호 확인</label>
            <input className={styles.input} type="password" value={newPasswordCheck}
              onChange={(e) => setNewPasswordCheck(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label>이메일</label>
            <input className={styles.input} value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailMsg(''); setEmailSent(false); setEmailCode(''); }} />
            <Button onClick={checkEmail}>중복 확인</Button>
          </div>

          {/* 이메일을 바꿨을 때만: 새 이메일로 인증번호 받기 */}
          {email !== my.email && (
            <div className={styles.row}>
              <label>이메일 인증번호</label>
              <input className={styles.input} value={emailCode} maxLength={6}
                placeholder={emailSent ? '메일로 받은 6자리' : '먼저 인증번호를 받아 주세요'}
                disabled={!emailSent}
                onChange={(e) => setEmailCode(e.target.value.replace(/[^0-9]/g, ''))} />
              <Button onClick={sendEmailCode}>{emailSent ? '다시 받기' : '인증번호 받기'}</Button>
            </div>
          )}
          {emailMsg && <p className={styles.hint}>{emailMsg}</p>}

          <div className={styles.row}>
            <label>전화번호</label>
            <input className={styles.input} type="tel" value={phone} placeholder="010-1234-5678"
              onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.ok}>{message}</div>}

          <div className={styles.actions}>
            <Button onClick={() => navigate('/mypage')}>취소</Button>
            <Button type="primary" onClick={save}>저장하기</Button>
          </div>
        </section>

        {/* ===== 회원 탈퇴 (M06) ===== */}
        <section className={common.card}>
          <div className={common.cardHead}>
            <span className={common.cardTitle}>회원 탈퇴</span>
          </div>
          <p className={common.desc}>탈퇴하면 다시 로그인할 수 없어요. 비밀번호를 입력해 본인 확인을 해 주세요.</p>
          <div className={styles.row}>
            <input className={styles.input} type="password" value={withdrawPw} placeholder="비밀번호"
              onChange={(e) => setWithdrawPw(e.target.value)} />
            <Button type="danger" onClick={openConfirm}>회원 탈퇴</Button>
          </div>
          {withdrawError && <div className={styles.error}>{withdrawError}</div>}
        </section>
      </main>

      {/* ===== 탈퇴 확인 창 (팀 공통 Modal) ===== */}
      <Modal open={confirmOpen} title="정말 탈퇴할까요?" onClose={() => setConfirmOpen(false)}>
        <p className={common.desc}>탈퇴하면 이 계정으로 다시 로그인할 수 없어요.</p>
        <div className={styles.actions}>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button type="danger" onClick={withdraw}>탈퇴하기</Button>
        </div>
      </Modal>
    </>
  );
}

export default EditPage;
