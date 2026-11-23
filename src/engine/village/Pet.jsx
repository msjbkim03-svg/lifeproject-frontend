// 반려동물 그림 (픽셀, 오른쪽을 봄) - 강아지: 시바 / 고양이: 삼색냥이
// 그림 한 줄 = 문자열 한 줄, 글자 하나 = 칸 하나
//   O 테두리 · F 털 · D 진한 털(얼룩) · W 흰 털 · K 눈 · N 코 · P 분홍 코 · . 빈칸
const SHIBA = [
  '..........O..O....',
  '.........OFOOFO...',
  '..OO.....OFFFFO...',
  '.OFFO...OFFFFFFO..',
  '.OFO....OFFKFFWWO.',
  '..OFO...OFFFFWWWNO',
  '...OFOOOOFFFFOOOO.',
  '...OFFFFFFFFFO....',
  '...OFFFFFFFFFO....',
  '...OFWWWWWWFFO....',
  '...OFOOOOOOOFO....',
  '...OFO.....OFO....',
  '...OOO.....OOO....',
];
const CALICO = [
  '.........O...O..',
  '........ODO.OFO.',
  '........ODDOFFO.',
  '.OO.....ODWWWFFO',
  'ODO.....OWKWWKWO',
  'ODO.....OWWWPWWO',
  '.ODO.....OWWWWO.',
  '..OFOOOOOWWWWO..',
  '..OFFWWDDDWWWO..',
  '..OWWWDDDWWWWO..',
  '..OWOOOOOOOOWO..',
  '..OWO......OWO..',
  '..OOO......OOO..',
];

// 털색: 이름으로 하나를 골라서 같은 아이는 늘 같은 색
const SHIBA_FUR = [{ F: '#d98b4a' }, { F: '#e8b864' }, { F: '#f2ece0' }, { F: '#7a6458' }]; // 적색 · 황색 · 백색 · 흑갈색
const CALICO_FUR = [{ F: '#e8a85a', D: '#3d3840' }, { F: '#d9925a', D: '#6b5a50' }];

const BASE = { O: '#2e2a33', K: '#2e2a33', N: '#2e2a33', W: '#fbf7ef', P: '#f29a9a' };
const CELL = 1.4; // 칸 하나 = 1.4px (사람 그림과 같은 크기감)

// 이름 → 0 ~ n-1 (글자마다 31을 곱해 섞어서, 비슷한 이름도 색이 고르게 나뉨)
function pick(name, n) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h % n;
}

function Pet({ kind, name = '' }) {
  const art = kind === 'c' ? CALICO : SHIBA;
  const furs = kind === 'c' ? CALICO_FUR : SHIBA_FUR;
  const colors = { ...BASE, ...furs[pick(name, furs.length)] };

  // 한 줄에서 같은 글자가 이어지는 칸은 사각형 하나로 묶어서 그림
  const rects = [];
  art.forEach((row, y) => { // forEach: 줄마다 (row = 그 줄 문자열, y = 몇 번째 줄)
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (colors[ch]) {
        rects.push(<rect key={y + '-' + x} x={x} y={y} width={end - x} height={1} fill={colors[ch]} />);
      }
      x = end;
    }
  });

  const w = art[0].length;
  const h = art.length;
  return (
    <svg className="v-pet-fig" viewBox={`0 0 ${w} ${h}`} width={Math.round(w * CELL)} height={Math.round(h * CELL)}
      shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

export default Pet;