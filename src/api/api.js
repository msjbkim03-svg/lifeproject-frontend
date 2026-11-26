import axios from 'axios';

// 백엔드 주소 (server.port=80 이라서 포트 생략)
const client = axios.create({
  baseURL: `http://${window.location.hostname}`,
});

// 토큰 안의 만료 시각(exp)이 지났는지
const isExpired = (token) => {
  try {
    const body = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(body)).exp * 1000 < Date.now();
  } catch {
    return false;
  }
};

// 처음 화면을 열었을 때 이미 만료된 토큰이 남아 있으면 바로 정리 (/login · /join 에서 튕기지 않게)
const savedToken = localStorage.getItem('token');
if (savedToken && isExpired(savedToken)) {
  localStorage.removeItem('token');
  localStorage.removeItem('nickname');
  localStorage.removeItem('memberRole');
}

// 회원 전용 요청인지 확인 (백엔드 WebConfig 의 LoginValidator 와 같은 기준)
// → 비회원도 쓰는 주소(메인·추모관 보기·로그인·가입·중복확인·찾기 등)는 만료된 토큰만 지우고 요청을 그대로 보냄
const isMemberOnly = (url = '') => {
  if (url.startsWith('/api/quests') || url.startsWith('/api/admin')) return true;
  if (url.startsWith('/api/members/')
      && !url.startsWith('/api/members/login')
      && !url.startsWith('/api/members/check')
      && !url.startsWith('/api/members/find')) {
    return true;
  }
  if (url.startsWith('/api/memorials/')
      && (url.includes('/open') || url.includes('/candle') || url.includes('/comments'))) {
    return true;
  }
  return false;
};

// 요청을 보내기 직전에 실행됨
// → 로그인 토큰이 있으면 Authorization 헤더에 자동으로 붙여 줌
// → 토큰이 이미 만료됐으면 로그인 정보를 지우고, 회원 전용 요청이면 로그인 화면으로 ("로그인이 만료됐어요" 안내)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && isExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('nickname');
    localStorage.removeItem('memberRole');
    if (isMemberOnly(config.url) && window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
      return Promise.reject(new Error('로그인이 만료됐어요.'));
    }
    return config;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답을 받은 직후 실행됨
// → 서버가 새 토큰(New-Token)을 주면 바꿔 끼움 (게임하는 동안 로그인 자동 연장)
client.interceptors.response.use(
  (resp) => {
    const newToken = resp.headers['new-token'];
    // 로그아웃한 뒤에 늦게 도착한 응답이면 바꾸지 않음 (로그인 정보가 되살아나지 않게)
    if (newToken && localStorage.getItem('token')) {
      localStorage.setItem('token', newToken);
    }
    return resp;
  },
  // 서버가 401(로그인이 무효: 비밀번호가 바뀌었거나 탈퇴 처리됨)을 주면
  // → 남아 있는 로그인 정보를 지우고 로그인 화면으로 (로그인·찾기 요청의 401 은 그대로 둠)
  (err) => {
    const url = err.config?.url || '';
    const skip = url.includes('/api/members/login') || url.includes('/api/members/find');
    if (err.response?.status === 401 && localStorage.getItem('token') && !skip
        && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('nickname');
      localStorage.removeItem('memberRole');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  }
);

export default client;
