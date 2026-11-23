// 나라 위치 (위도·경도) - 출생 지구본(BirthPage)과 엔딩 크레딧 지도(EndingFilm)가 같이 씀
// 나라별 착륙 지점 (위도·경도) - 키는 COUNTRY.COUNTRY_CODE (ISO 3글자)
// 여기 없는 나라는 아래 ASIA_CENTER(아시아 가운데)로 떨어짐
export const COUNTRY_POS = {
  // 동아시아
  KOR: { lat: 36.5, lng: 127.8 }, // 한국
  PRK: { lat: 40.0, lng: 127.0 }, // 북한
  JPN: { lat: 36.2, lng: 138.3 }, // 일본
  CHN: { lat: 34.0, lng: 104.0 }, // 중국
  TWN: { lat: 23.7, lng: 121.0 }, // 대만
  HKG: { lat: 22.3, lng: 114.2 }, // 홍콩
  MAC: { lat: 22.2, lng: 113.5 }, // 마카오
  MNG: { lat: 46.9, lng: 103.8 }, // 몽골
  // 동남아시아
  VNM: { lat: 16.0, lng: 107.5 }, // 베트남
  LAO: { lat: 19.9, lng: 102.5 }, // 라오스
  KHM: { lat: 12.6, lng: 105.0 }, // 캄보디아
  THA: { lat: 15.9, lng: 101.0 }, // 태국
  MMR: { lat: 21.9, lng: 96.0 },  // 미얀마
  MYS: { lat: 4.2, lng: 102.0 },  // 말레이시아
  SGP: { lat: 1.35, lng: 103.8 }, // 싱가포르
  IDN: { lat: -2.5, lng: 118.0 }, // 인도네시아
  PHL: { lat: 12.9, lng: 121.8 }, // 필리핀
  BRN: { lat: 4.5, lng: 114.7 },  // 브루나이
  TLS: { lat: -8.9, lng: 125.7 }, // 동티모르
  // 남아시아
  IND: { lat: 22.5, lng: 79.0 },  // 인도
  PAK: { lat: 30.4, lng: 69.3 },  // 파키스탄
  BGD: { lat: 23.7, lng: 90.4 },  // 방글라데시
  NPL: { lat: 28.4, lng: 84.1 },  // 네팔
  BTN: { lat: 27.5, lng: 90.4 },  // 부탄
  LKA: { lat: 7.9, lng: 80.8 },   // 스리랑카
  MDV: { lat: 3.2, lng: 73.2 },   // 몰디브
  AFG: { lat: 33.9, lng: 67.7 },  // 아프가니스탄
  // 중앙아시아
  KAZ: { lat: 48.0, lng: 67.0 },  // 카자흐스탄
  UZB: { lat: 41.4, lng: 64.6 },  // 우즈베키스탄
  TKM: { lat: 39.0, lng: 59.6 },  // 투르크메니스탄
  KGZ: { lat: 41.2, lng: 74.8 },  // 키르기스스탄
  TJK: { lat: 38.9, lng: 71.3 },  // 타지키스탄
  // 서아시아 (중동·코카서스)
  IRN: { lat: 32.4, lng: 53.7 },  // 이란
  IRQ: { lat: 33.2, lng: 43.7 },  // 이라크
  SYR: { lat: 34.8, lng: 39.0 },  // 시리아
  LBN: { lat: 33.9, lng: 35.9 },  // 레바논
  ISR: { lat: 31.0, lng: 34.9 },  // 이스라엘
  PSE: { lat: 31.9, lng: 35.2 },  // 팔레스타인
  JOR: { lat: 30.6, lng: 36.2 },  // 요르단
  SAU: { lat: 23.9, lng: 45.1 },  // 사우디아라비아
  YEM: { lat: 15.6, lng: 48.5 },  // 예멘
  OMN: { lat: 21.5, lng: 55.9 },  // 오만
  ARE: { lat: 23.4, lng: 53.8 },  // 아랍에미리트
  QAT: { lat: 25.4, lng: 51.2 },  // 카타르
  BHR: { lat: 26.0, lng: 50.6 },  // 바레인
  KWT: { lat: 29.3, lng: 47.5 },  // 쿠웨이트
  TUR: { lat: 39.0, lng: 35.2 },  // 튀르키예
  CYP: { lat: 35.1, lng: 33.4 },  // 키프로스
  GEO: { lat: 42.3, lng: 43.4 },  // 조지아
  ARM: { lat: 40.1, lng: 45.0 },  // 아르메니아
  AZE: { lat: 40.1, lng: 47.6 },  // 아제르바이잔
};
export const ASIA_CENTER = { lat: 28, lng: 105 };
