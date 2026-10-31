'use strict';
// ─────────────────────────────────────────────────────────────
//  DATA — 밸런스와 콘텐츠는 이 파일에서 조정합니다.
// ─────────────────────────────────────────────────────────────

T.SHAPES = [
  { id: 'square',   name: '네모',     k: 4, cost: 10,   growth: 1.14, value: 1,     cd: 5, ring: 9, start: 4,
    gray: '#d4d4d1', color: '#e8b86d', body: '#f4f1ea', motifs: ['poly', 'arch', 'zigg'],
    names: ['두부', '모찌', '깍두기', '주사위', '각설탕', '단추', '큐브', '벽돌이', '콩', '먼지', '네모네', '카라멜', '버터', '쿠키', '타일'] },
  { id: 'triangle', name: '세모',     k: 3, cost: 500,  growth: 1.16, value: 12,    cd: 5, ring: 10, start: 9,
    gray: '#b9b9b6', color: '#df7a5e', body: '#f7ebe6', motifs: ['poly', 'hexagram', 'petal'],
    names: ['삼각김밥', '뾰족이', '피라', '산', '세세', '나초', '트리', '모서리', '삼순이', '텐트'] },
  { id: 'circle',   name: '동그라미', k: 6, cost: 2.5e4, growth: 1.18, value: 150,  cd: 5, ring: 8, start: 15,
    gray: '#a3a3a0', color: '#8fb996', body: '#ecf4ef', motifs: ['circle', 'petal', 'rays'],
    names: ['방울토마토', '구슬', '동동', '경단', '완두', '보름', '도토리', '마카롱', '오리알', '단팥'] },
  { id: 'pentagon', name: '오각',     k: 5, cost: 1.5e6, growth: 1.20, value: 2000, cd: 5, ring: 11, start: 22,
    gray: '#8c8c89', color: '#6c96c4', body: '#e8eff6', motifs: ['poly', 'star', 'petal'],
    names: ['오각이', '펜타', '축구공', '오디', '다섯', '집게', '연필', '오월'] },
  { id: 'star',     name: '별',       k: 5, cost: 1e8,  growth: 1.22, value: 3e4,   cd: 5, ring: 12, start: 30,
    gray: '#dcdcd9', color: '#b49ad8', body: '#f2ecfb', motifs: ['star', 'rays', 'petal8'],
    names: ['반짝', '샛별', '혜성', '유성', '별사탕', '은하', '북극성', '루미'] },
  { id: 'hexagon',  name: '육각',     k: 6, cost: 1e10, growth: 1.24, value: 5e5,   cd: 5, ring: 10, start: 38,
    gray: '#7b7b78', color: '#5fbfb6', body: '#e6f7f6', motifs: ['poly', 'hexagram', 'petal'],
    names: ['벌집', '눈송이', '흑연', '너트', '육육', '결정', '육각정'] },
];
T.SHAPE = {};
T.SHAPES.forEach((s, i) => { s.index = i; T.SHAPE[s.id] = s; });

T.PLAYER_COLOR = { gray: '#6f6f6c', color: '#3d405b' };

// ── 작업장 (조각) ───────────────────────────────────────────
T.UP0 = [
  { id: 'quick', name: '날렵한 손', icon: '⏱', max: 15,
    cost: (l) => 40 * Math.pow(2.3, l), desc: (l) => `건축가 쿨타임 −8%  (현재 ×${Math.pow(0.92, l).toFixed(2)})` },
  { id: 'solid', name: '단단한 블럭', icon: '▣', max: 50,
    cost: (l) => 20 * Math.pow(1.75, l), desc: (l) => `모든 블럭 기본가치 +1  (현재 +${l})` },
  { id: 'eye', name: '장인의 눈', icon: '◎', max: 40,
    cost: (l) => 250 * Math.pow(4, l), desc: (l) => `판매가치 ×1.5  (현재 ×${T.fmt(Math.pow(1.5, l))})` },
  { id: 'walk', name: '종종걸음', icon: '≫', max: 8,
    cost: (l) => 80 * Math.pow(2.2, l), desc: (l) => `걷기 속도 +30%  (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'arm', name: '긴 팔', icon: '↗', max: 8,
    cost: (l) => 150 * Math.pow(2.6, l), desc: (l) => `던지기 사거리 +35%  (현재 ×${(1 + 0.35 * l).toFixed(2)})` },
  { id: 'hand', name: '손재주', icon: '✋', max: 30,
    cost: (l) => 30 * Math.pow(3, l), desc: (l) => `클릭 블럭 가치 ×2, 초당 수입의 3%를 더함  (현재 ×${T.fmt(Math.pow(2, l))})` },
  { id: 'double', name: '두 개씩', icon: '⧉', max: 10,
    cost: (l) => 1500 * Math.pow(3.2, l), desc: (l) => `건축가가 블럭을 2개 던질 확률 +6%  (현재 ${l * 6}%)` },
  { id: 'focus', name: '설계 집중', icon: '⌗', max: 5,
    cost: (l) => 300 * Math.pow(3, l), desc: (l) => `설계도 우선 확률 +12%  (현재 ${40 + l * 12}%)` },
  { id: 'omen', name: '꼭짓점 예감', icon: '▲', max: 20, req: (s) => s.flags.l1Seen,
    cost: (l) => 2e5 * Math.pow(6, l), desc: (l) => `재구성 시 꼭짓점 ×1.25  (현재 ×${Math.pow(1.25, l).toFixed(2)})` },
];

// ── 꼭짓점 공방 ─────────────────────────────────────────────
T.UP1 = [
  { id: 'u_triangle', name: '세모 건축가', icon: '△', max: 1, shape: 'triangle',
    cost: () => 3, desc: () => '세 갈래 대칭을 짓는 세모 건축가를 고용할 수 있습니다.' },
  { id: 'u_circle', name: '동그라미 건축가', icon: '○', max: 1, shape: 'circle', req: (s) => s.vup.u_triangle,
    cost: () => 40, desc: () => '원과 꽃잎, 햇살을 짓는 동그라미 건축가.' },
  { id: 'u_pentagon', name: '오각 건축가', icon: '⬠', max: 1, shape: 'pentagon', req: (s) => s.vup.u_circle,
    cost: () => 600, desc: () => '다섯 갈래 별과 오각 고리를 짓는 오각 건축가.' },
  { id: 'bless', name: '기하의 축복', icon: '✦', max: 30,
    cost: (l) => 2 * Math.pow(3, l), desc: (l) => `조각 ×2  (현재 ×${T.fmt(Math.pow(2, l))})` },
  { id: 'memory', name: '기억하는 손', icon: '♥', max: 5,
    cost: (l) => 2 * Math.pow(2.5, l), desc: (l) => `재구성 후 네모 건축가 ${l + 1}명과 함께 시작  (현재 ${l}명)` },
  { id: 'res', name: '꼭짓점 공명', icon: '▲', max: 20,
    cost: (l) => 8 * Math.pow(4, l), desc: (l) => `꼭짓점 획득 ×1.5  (현재 ×${T.fmt(Math.pow(1.5, l))})` },
  { id: 'legs', name: '긴 다리', icon: '⇄', max: 4,
    cost: (l) => 6 * Math.pow(3, l), desc: (l) => `걷기 속도와 사거리 ×1.5  (현재 ×${Math.pow(1.5, l).toFixed(2)})` },
  { id: 'pet', name: '쓰다듬기 장인', icon: '♡', max: 3,
    cost: (l) => 5 * Math.pow(4, l), desc: (l) => `기분 좋음 지속시간 ×2, 효과 강화  (현재 ${10 * Math.pow(2, l)}초)` },
  { id: 'auto', name: '자동 고용', icon: '⟳', max: 1, req: (s) => s.vup.u_triangle,
    cost: () => 60, desc: () => '살 수 있는 가장 싼 건축가를 자동으로 고용합니다. (설정에서 끄기 가능)' },
  { id: 'shelf', name: '설계도 서고', icon: '⌗', max: 2,
    cost: (l) => 25 * Math.pow(6, l), desc: (l) => `동시에 배치 가능한 설계도 +1  (현재 ${1 + l}개)` },
  { id: 'lucky', name: '행운의 블럭', icon: '✧', max: 5,
    cost: (l) => 30 * Math.pow(4, l), desc: (l) => `빛나는 블럭(가치 ×25) 확률 +1%  (현재 ${l}%)` },
  { id: 'fund', name: '시작 자금', icon: '◼', max: 6,
    cost: (l) => 10 * Math.pow(3, l), desc: (l) => `재구성 후 조각 ${T.fmt(100 * Math.pow(10, l + 1))}개로 시작` },
];

// ── 프리즘 실험실 ───────────────────────────────────────────
T.UP2 = [
  { id: 'u_star', name: '별 건축가', icon: '☆', max: 1, shape: 'star',
    cost: () => 3, desc: () => '빛줄기와 별을 짓는 별 건축가.' },
  { id: 'u_hexagon', name: '육각 건축가', icon: '⬡', max: 1, shape: 'hexagon', req: (s) => s.pup.u_star,
    cost: () => 25, desc: () => '눈송이와 벌집을 닮은 고리를 짓는 육각 건축가.' },
  { id: 'spectrum', name: '스펙트럼', icon: '◆', max: 30,
    cost: (l) => 1 * Math.pow(3, l), desc: (l) => `조각 ×3  (현재 ×${T.fmt(Math.pow(3, l))})` },
  { id: 'refr', name: '굴절률', icon: '▲', max: 20,
    cost: (l) => 2 * Math.pow(3.5, l), desc: (l) => `꼭짓점 획득 ×2  (현재 ×${T.fmt(Math.pow(2, l))})` },
  { id: 'harmony', name: '무지개 조화', icon: '❋', max: 1,
    cost: () => 4, desc: () => '고용한 건축가 종류 하나당 조각 ×1.5' },
  { id: 'keepShapes', name: '형태 기억', icon: '⬠', max: 1,
    cost: () => 5, desc: () => '굴절 후에도 세모·동그라미·오각 해금을 유지합니다.' },
  { id: 'light', name: '빛의 투사', icon: '⚡', max: 1,
    cost: () => 8, desc: () => '건축가가 걷지 않고 빛으로 블럭을 즉시 설치합니다.' },
  { id: 'blue', name: '청사진', icon: '⌗', max: 5,
    cost: (l) => 3 * Math.pow(3, l), desc: (l) => `설계도 완공 보상 ×2  (현재 ×${Math.pow(2, l)})` },
  { id: 'dawn', name: '이른 새벽', icon: '☀', max: 1,
    cost: () => 6, desc: () => '재구성 후 Lv5 네모 건축가 5명과 함께 시작' },
  { id: 'autoL1', name: '자동 재구성', icon: '⟲', max: 1,
    cost: () => 20, desc: () => '재구성 획득량이 보유 꼭짓점 이상이면 자동으로 재구성 (설정에서 끄기)' },
];

// ── 아틀리에 (안료) ─────────────────────────────────────────
T.UP3 = [
  { id: 'painter', name: '방울 고용', icon: '●', max: 12,
    cost: (l) => 1 * Math.pow(2, l), desc: (l) => `채색 펫 방울 +1  (현재 ${l + 1}마리)` },
  { id: 'brush', name: '큰 붓', icon: '✎', max: 15,
    cost: (l) => 2 * Math.pow(2.4, l), desc: (l) => `한 번에 칠하는 블럭 수 ×1.6  (현재 ${Math.round(6 * Math.pow(1.6, l))}개)` },
  { id: 'stroke', name: '빠른 붓질', icon: '≈', max: 10,
    cost: (l) => 2 * Math.pow(2.8, l), desc: (l) => `붓질 간격 −15%  (현재 ${(2.5 * Math.pow(0.85, l)).toFixed(2)}초)` },
  { id: 'dense', name: '안료 농도', icon: '◍', max: 30,
    cost: (l) => 3 * Math.pow(3, l), desc: (l) => `채색 판매 가치 ×2  (현재 ×${T.fmt(4 * Math.pow(2, l))})` },
  { id: 'prismX', name: '빛의 안료', icon: '◆', max: 20,
    cost: (l) => 4 * Math.pow(3.5, l), desc: (l) => `프리즘 획득 ×2  (현재 ×${T.fmt(Math.pow(2, l))})` },
  { id: 'all', name: '팔레트의 은총', icon: '✺', max: 30,
    cost: (l) => 5 * Math.pow(4, l), desc: (l) => `조각 ×5  (현재 ×${T.fmt(Math.pow(5, l))})` },
  { id: 'keepPrism', name: '프리즘 각인', icon: '◇', max: 1,
    cost: () => 10, desc: () => '물들임 후에도 별·육각 해금과 형태 기억을 유지' },
];

// ── 색 설계도 (팔레트) ─────────────────────────────────────
T.PALETTES = [
  { id: 'sunset', name: '노을', desc: '높이를 따라 주홍에서 보랏빛으로', cost: 0,
    fn: (x, y) => T.hsl(18 + T.clamp(y / 1800, 0, 1) * 250, 72, 66 - T.clamp(y / 3000, 0, 1) * 10) },
  { id: 'aurora', name: '오로라', desc: '중심을 도는 각도에 따라 초록과 보라가 흐름', cost: 3,
    fn: (x, y) => { const a = Math.atan2(y - T.YC, x); return T.hsl(140 + Math.sin(a * 3) * 70 + 40, 60, 62); } },
  { id: 'deep', name: '심해', desc: '중심에서 멀어질수록 깊은 바다색', cost: 8,
    fn: (x, y) => { const d = Math.hypot(x, y - T.YC); return T.hsl(185 + T.clamp(d / 1500, 0, 1) * 45, 55, 70 - T.clamp(d / 1500, 0, 1) * 30); } },
  { id: 'rainbow', name: '무지개', desc: '동심원 띠를 따라 모든 색이 한 바퀴', cost: 20,
    fn: (x, y) => { const d = Math.hypot(x, y - T.YC); return T.hsl(d * 0.6, 65, 66); } },
  { id: 'blossom', name: '벚꽃', desc: '흩날리는 분홍과 흰빛', cost: 50,
    fn: (x, y) => { const n = Math.sin(x * 0.051 + y * 0.037) * Math.sin(x * 0.013 - y * 0.029); return T.hsl(345 + n * 15, 70, 80 + n * 10); } },
];
T.PALETTE = {};
T.PALETTES.forEach((p) => (T.PALETTE[p.id] = p));

// ── 설계도 ─────────────────────────────────────────────────
// 좌우 대칭: 각 행은 왼쪽 절반(가운데 열 포함)만 적습니다.
function mirror(rows) {
  return rows.map((r) => r + r.slice(0, -1).split('').reverse().join(''));
}
function monument() {
  const rows = [];
  const H = 19;
  for (let r = 0; r < H; r++) {
    const w = Math.min(r, H - 1 - r);
    let half = '';
    for (let c = 0; c < 13; c++) {
      const dx = 12 - c;
      if (dx > w + 2) { half += '.'; continue; }
      if (dx === w + 2 || dx === w + 1) { half += (r % 2 ? 'x' : '.'); continue; }
      const m = (dx + r) % 4;
      half += m === 0 ? 'o' : m === 2 ? '=' : '#';
    }
    rows.push(half);
  }
  rows.push('....xxxxxxxxx', '...##########', '..###########', 'xxxxxxxxxxxxx');
  return rows;
}

T.BLUEPRINTS = [
  { id: 'obelisk', no: 'TS-001', name: '오벨리스크', tier: 0,
    note: '처음 세워지는 것은 언제나 가느다란 기둥이다. 하늘이 얼마나 높은지 재기 위해.',
    unlock: () => true, unlockText: '',
    rows: ['..x', '.x#', '.##', '.##', '.#o', '.##', '.##', '.##', '.##', '.##', '###', 'xxx'] },
  { id: 'arch', no: 'TS-002', name: '아치문', tier: 0,
    note: '건너편이 보이는 문. 건축가들은 이 아래를 지나갈 때마다 고개를 든다.',
    unlock: (s) => s.stats.lifeBlocks >= 120, unlockText: '블럭 120개 쌓기',
    rows: ['..===', '.=###', '=###x', '##x..', '##...', '##...', '##...', 'xx...'] },
  { id: 'house', no: 'TS-003', name: '작은 집', tier: 0,
    note: '창문 네 개, 문 하나. 아무도 살지 않지만 누군가 살 것 같은 집.',
    unlock: (s) => s.stats.lifeBlocks >= 500, unlockText: '블럭 500개 쌓기',
    rows: ['.....x', '....=x', '...===', '..====', '.=====', 'xxxxxx', '.#####', '.#oo##', '.#oo#x', '.####x', 'xxxxxx'] },
  { id: 'lighthouse', no: 'TS-101', name: '등대', tier: 1,
    note: '빛을 비출 바다는 없다. 그래도 등대는 매일 밤 회색 지평선을 비춘다.',
    unlock: (s) => s.flags.l1Done > 0, unlockText: '재구성 1회',
    rows: ['....x', '...xx', '..xoo', '..xoo', '.xxxx', '...##', '...#x', '...##', '...xx', '...##', '..##o', '..###', '..xxx', '..###', '.###o', '.####', '.xxxx', '.###x', '#####'] },
  { id: 'ziggurat', no: 'TS-102', name: '지구라트', tier: 1,
    note: '계단은 위로 갈수록 좁아진다. 꼭대기의 작은 방에는 창 하나만 있다.',
    unlock: (s) => s.stats.lifeVerts >= 15, unlockText: '꼭짓점 누적 15',
    rows: ['......==', '......#o', '....xxxx', '....###x', '..xxxxxx', '..#####x', 'xxxxxxxx', '######xx', '######x.'] },
  { id: 'pagoda', no: 'TS-103', name: '오층탑', tier: 1,
    note: '층마다 처마가 넓어진다. 바람이 불면 처마 끝이 조금씩 운다.',
    unlock: (s) => s.stats.lifeVerts >= 60, unlockText: '꼭짓점 누적 60',
    rows: ['......x', '......x', '.....==', '...====', '.....#o', '....===', '..=====', '....#o#', '...====', '.======', '...#o#x', '..=====', '=======', '..##o#x', '..##o#x', '..#####', '.xxxxxx'] },
  { id: 'triumph', no: 'TS-201', name: '개선문', tier: 2,
    note: '돌아온 모든 것을 위한 문. 색이 처음 생긴 날을 기념한다.',
    unlock: (s) => s.flags.l2Done > 0, unlockText: '굴절 1회',
    rows: ['.xxxxxxxx', '.#=======', '.########', '.#x#x#x#x', '.########', '.#####...', '.####....', '.###.....', '.###.....', '.##o.....', '.###.....', '.###.....', '.###.....', 'xxxxx....'] },
  { id: 'cathedral', no: 'TS-202', name: '대성당', tier: 2,
    note: '세 개의 첨탑과 하나의 장미창. 장미창의 무늬는 건축가들의 고리에서 따왔다.',
    unlock: (s) => s.stats.lifePrisms >= 10, unlockText: '프리즘 누적 10',
    rows: ['.....x.....x', '.....x.....x', '....=x=....x', '....===...==', '...=====.===', '...#o#o#.###', '...#####.#o#', '...#o#o#=###', '...#####====', '...xxxxx####', '...#o#o##xxx', '...#####xooo', '...#o#o#xoox', '...#####xooo', '...#o#o##xxx', '..xxxxxxxxxx', '..##########', '..#o#o#o####', '..#o#o#o##..', '..########..', '..#o#o#o##..', '.xxxxxxxxx..', '##########..'] },
  { id: 'clock', no: 'TS-301', name: '시계탑', tier: 2,
    note: '바늘이 없는 시계. 이 세계의 시간은 블럭의 개수로 잰다.',
    unlock: (s) => s.flags.l3Done > 0, unlockText: '물들임 1회',
    rows: ['.....x', '.....x', '....==', '...===', '..====', '..####', '..#xxx', '..#xoo', '..#xoo', '..#xxx', '..####', '.xxxxx', '..###o', '..####', '..##o#', '..####', '..###o', '..####', '.xxxxx', '.#####', '.##o##', '.#####', '.###..', 'xxxx..'] },
  { id: 'monument', no: 'TS-302', name: '테세라 기념비', tier: 2,
    note: '모든 조각은 결국 하나의 그림이 된다. 가장 작은 건축가에게 바친다.',
    unlock: (s) => s.stats.lifePigments >= 10, unlockText: '안료 누적 10',
    rows: monument() },
];
T.TIERS = [
  { name: '소형 조형물', mult: 10 },
  { name: '건축물', mult: 25 },
  { name: '랜드마크', mult: 80 },
];
T.BP_COLORS = {
  '#': { gray: '#e2e2df', color: '#efe6d2' },
  '=': { gray: '#8d8d8a', color: '#c8553d' },
  'x': { gray: '#5f5f5c', color: '#5c5470' },
  'o': { gray: '#bdbdba', color: '#8ecae6' },
};
T.BLUEPRINT = {};
T.BLUEPRINTS.forEach((bp) => {
  bp.grid = mirror(bp.rows);
  bp.h = bp.grid.length;
  bp.w = bp.grid[0].length;
  bp.grid.forEach((r, i) => { if (r.length !== bp.w) console.warn('blueprint row width mismatch', bp.id, i); });
  bp.cells = [];
  // cells listed bottom row first (r=0 at bottom)
  for (let r = bp.h - 1; r >= 0; r--) {
    for (let c = 0; c < bp.w; c++) {
      const ch = bp.grid[r][c];
      if (ch !== '.') bp.cells.push({ c, r: bp.h - 1 - r, ch });
    }
  }
  T.BLUEPRINT[bp.id] = bp;
});
