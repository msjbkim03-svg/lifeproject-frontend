import axios from 'axios';

// 백엔드 주소 (server.port=80 이라서 포트 생략)
const client = axios.create({
  baseURL: `http://${window.location.hostname}`,
});

// 요청을 보내기 직전에 실행됨
// → 로그인 토큰이 있으면 Authorization 헤더에 자동으로 붙여 줌
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답을 받은 직후 실행됨
// → 서버가 새 토큰(New-Token)을 주면 바꿔 끼움 (게임하는 동안 로그인 자동 연장)
client.interceptors.response.use((resp) => {
  const newToken = resp.headers['new-token'];
  if (newToken) {
    localStorage.setItem('token', newToken);
  }
  return resp;
});

export default client;
