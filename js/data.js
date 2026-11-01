'use strict';
// ─────────────────────────────────────────────────────────────
//  DATA: 밸런스와 콘텐츠는 이 파일에서 조정합니다.
//  ms: 필요한 이정표 수, req: 추가 조건, max: 기본 최대 레벨 (한계 업그레이드로 늘어남)
//  상점 번호: 0 작업장(조각) 1 공방(꼭짓점) 2 석공소(결) 3 실험실(프리즘)
//            4 아틀리에(안료) 5 층계(겹) 6 등불 회관(등불) 7 물자 창고(물자)
// ─────────────────────────────────────────────────────────────
T.SHAPES = [
  { id: 'square',   name: '네모',     k: 4, cost: 15,   growth: 5.0, value: 1,    cd: 3, ring: 9, start: 4, gray: '#d4d4d1', color: '#e8b86d', motifs: ['poly', 'arch', 'zigg'],
    names: ['두부', '모찌', '깍두기', '주사위', '각설탕', '단추', '큐브', '벽돌이', '콩', '먼지', '카라멜', '버터', '쿠키', '타일'] },
  { id: 'triangle', name: '세모',     k: 3, cost: 3e3,  growth: 5.5, value: 14,   cd: 3, ring: 10, start: 9, gray: '#b9b9b6', color: '#df7a5e', motifs: ['poly', 'hexagram', 'petal'],
    names: ['삼각김밥', '뾰족이', '피라', '산', '세세', '나초', '트리', '모서리', '텐트'] },
  { id: 'circle',   name: '동그라미', k: 6, cost: 4e5,  growth: 6.0, value: 220,  cd: 3, ring: 8, start: 15, gray: '#a3a3a0', color: '#8fb996', motifs: ['circle', 'petal', 'rays'],
    names: ['방울토마토', '구슬', '동동', '경단', '완두', '보름', '도토리', '마카롱', '단팥'] },
  { id: 'pentagon', name: '오각',     k: 5, cost: 3e7,  growth: 6.5, value: 3500, cd: 3, ring: 11, start: 22, gray: '#8c8c89', color: '#6c96c4', motifs: ['poly', 'star', 'petal'],
    names: ['오각이', '펜타', '축구공', '오디', '다섯', '집게', '연필', '오월'] },
  { id: 'star',     name: '별',       k: 5, cost: 2e9,  growth: 7.0, value: 6e4,  cd: 3, ring: 12, start: 30, gray: '#dcdcd9', color: '#b49ad8', motifs: ['star', 'rays', 'petal8'],
    names: ['반짝', '샛별', '혜성', '유성', '별사탕', '은하', '북극성', '루미'] },
  { id: 'hexagon',  name: '육각',     k: 6, cost: 2e11, growth: 7.5, value: 1e6,  cd: 3, ring: 10, start: 38, gray: '#7b7b78', color: '#5fbfb6', motifs: ['poly', 'hexagram', 'petal'],
    names: ['벌집', '눈송이', '흑연', '너트', '육육', '결정', '육각정'] },
];
T.SHAPE = {};
T.SHAPES.forEach((s, i) => { s.index = i; T.SHAPE[s.id] = s; });
T.PLAYER_COLOR = { gray: '#6f6f6c', color: '#3d405b' };
const pw = Math.pow;
const fx = (n) => T.fmt(n);

// ── 0 작업장 (조각) ─────────────────────────────────────────
T.UP0 = [
  { id: 'solid', name: '단단한 블록', icon: 'block', max: 15, ms: 0, cost: (l) => 25 * pw(1.9, l) * pw(1.04, l * l), desc: (l) => `블록 기본가치 +1 (현재 +${l})` },
  { id: 'quick', name: '날렵한 손', icon: 'clock', max: 6, ms: 0, cost: (l) => 60 * pw(2.7, l) * pw(1.06, l * l), desc: (l) => `건축가 쿨타임 8% 감소 (현재 ×${pw(0.92, l).toFixed(2)})` },
  { id: 'hand', name: '손재주', icon: 'hand', max: 5, ms: 0, cost: (l) => 60 * pw(4.5, l) * pw(1.1, l * l), desc: (l) => `클릭 블록 가치 ×2, 소프트캡 있음 (현재 ×${fx(pw(2, l))})` },
  { id: 'tap', name: '손놀림', icon: 'tap', max: 5, ms: 1, cost: (l) => 250 * pw(3.4, l), desc: (l) => `클릭 쿨타임 10% 감소 (현재 ${T.G ? T.G.clickCD().toFixed(2) : '?'}초)` },
  { id: 'walk', name: '종종걸음', icon: 'boot', max: 3, ms: 1, cost: (l) => 400 * pw(3.8, l) * pw(1.15, l * l), desc: (l) => `걷기 속도 +25% (현재 ×${(1 + 0.25 * l).toFixed(2)})` },
  { id: 'arm', name: '긴 팔', icon: 'arm', max: 3, ms: 1, cost: (l) => 500 * pw(4, l) * pw(1.15, l * l), desc: (l) => `던지기 사거리 +30% (현재 ×${(1 + 0.3 * l).toFixed(2)})` },
  { id: 'eye', name: '장인의 눈', icon: 'eye', max: 8, ms: 2, cost: (l) => 900 * pw(5, l) * pw(1.05, l * l), desc: (l) => `판매가치 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'focus', name: '설계 집중', icon: 'grid', max: 3, ms: 2, cost: (l) => 1200 * pw(4, l), desc: (l) => `플레이어 설계도를 먼저 도울 확률 +8% (현재 ${60 + l * 8}%)` },
  { id: 'omen', name: '꼭짓점 예감', icon: 'vertex', max: 5, ms: 3, cost: (l) => 3e5 * pw(7, l), desc: (l) => `재구성 시 꼭짓점 ×1.25 (현재 ×${pw(1.25, l).toFixed(2)})` },
  { id: 'team', name: '협동', icon: 'team', max: 5, ms: 4, cost: (l) => 6e4 * pw(4.5, l), desc: (l) => `같은 건축물을 함께 짓는 동료 한 명당 쿨타임 4% 감소 (현재 ${l * 4}%)` },
  { id: 'double', name: '두 개씩', icon: 'two', max: 5, ms: 7, cost: (l) => 3e6 * pw(5, l), desc: (l) => `블록을 2개 던질 확률 +6% (현재 ${l * 6}%)` },
];
// ── 1 꼭짓점 공방 ───────────────────────────────────────────
T.UP1 = [
  { id: 'u_triangle', name: '세모 건축가', icon: 'tri', max: 1, shape: 'triangle', ms: 0, cost: () => 3, desc: () => '세모 건축가를 고용할 수 있습니다.' },
  { id: 'bless', name: '기하의 축복', icon: 'star4', max: 8, ms: 0, cost: (l) => 2 * pw(3.2, l), desc: (l) => `조각 ×2 (현재 ×${fx(pw(2, l))})` },
  { id: 'memory', name: '기억하는 손', icon: 'heart', max: 2, ms: 0, cost: (l) => 3 * pw(4, l), desc: (l) => `리셋 후 네모 건축가 ${l + 1}명과 함께 시작 (현재 ${l}명)` },
  { id: 'res', name: '꼭짓점 공명', icon: 'vertex', max: 6, ms: 4, cost: (l) => 10 * pw(4.5, l), desc: (l) => `꼭짓점 획득 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'legs', name: '긴 다리', icon: 'boot', max: 2, ms: 4, cost: (l) => 12 * pw(5, l), desc: (l) => `걷기 속도와 사거리 ×1.3 (현재 ×${pw(1.3, l).toFixed(2)})` },
  { id: 'u_circle', name: '동그라미 건축가', icon: 'circle', max: 1, shape: 'circle', ms: 4, req: (s) => s.vup.u_triangle, cost: () => 40, desc: () => '동그라미 건축가를 고용할 수 있습니다.' },
  { id: 'pet', name: '쓰다듬기 장인', icon: 'heart', max: 3, ms: 5, cost: (l) => 6 * pw(4, l), desc: (l) => `기분 좋음 지속시간 ×2, 효과 강화 (현재 ${10 * pw(2, l)}초)` },
  { id: 'shelf', name: '설계도 서고', icon: 'grid', max: 2, ms: 5, cost: (l) => 30 * pw(6, l), desc: (l) => `동시에 펼칠 수 있는 설계도 +1 (현재 ${1 + l}개)` },
  { id: 'lucky', name: '행운의 블록', icon: 'spark', max: 4, ms: 6, cost: (l) => 35 * pw(4.5, l), desc: (l) => `빛나는 블록(가치 ×25) 확률 +1% (현재 ${l}%)` },
  { id: 'u_pentagon', name: '오각 건축가', icon: 'penta', max: 1, shape: 'pentagon', ms: 6, req: (s) => s.vup.u_circle, cost: () => 600, desc: () => '오각 건축가를 고용할 수 있습니다.' },
  { id: 'fund', name: '시작 자금', icon: 'block', max: 4, ms: 6, cost: (l) => 15 * pw(3.5, l), desc: (l) => `리셋 후 조각 ${fx(100 * pw(10, l + 1))}개로 시작` },
];
// ── 2 석공소 (결) ───────────────────────────────────────────
T.RES_COST = [0, 1, 20, 300];
T.RES_MS = [0, 0, 10, 13];
T.UP2 = [
  { id: 'chisel', name: '끌 주민', icon: 'chisel', max: 4, ms: 0, cost: (l) => 1 * pw(3, l), desc: (l) => `블록을 쪼개는 끌 주민 +1 (현재 ${l + 1}명)` },
  { id: 'carve', name: '날 세우기', icon: 'clock', max: 8, ms: 0, cost: (l) => 2 * pw(2.8, l), desc: (l) => `쪼개기 쿨타임 20% 감소. 아주 빨라지면 한 칸을 한 번에 쪼갭니다 (현재 ${T.G ? T.G.carveCD().toFixed(2) : '?'}초)` },
  { id: 'sharp', name: '고운 결', icon: 'star4', max: 8, ms: 0, cost: (l) => 3 * pw(3.5, l), desc: (l) => `조각 ×3, 쪼갠 조각 판매 ×2 (현재 ×${fx(pw(3, l))})` },
  { id: 'grain', name: '결 따라', icon: 'chisel', max: 8, ms: 7, cost: (l) => 5 * pw(4, l), desc: (l) => `결 획득 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'cap0', name: '작업장 한계', icon: 'up', max: 4, ms: 7, cost: (l) => 8 * pw(5, l), desc: (l) => `작업장 업그레이드 최대 레벨 +5 (현재 +${l * 5})` },
];
// ── 3 프리즘 실험실 ─────────────────────────────────────────
T.UP3 = [
  { id: 'u_star', name: '별 건축가', icon: 'star', max: 1, shape: 'star', ms: 0, cost: () => 3, desc: () => '별 건축가를 고용할 수 있습니다.' },
  { id: 'spectrum', name: '스펙트럼', icon: 'prism', max: 8, ms: 0, cost: (l) => 1 * pw(3.4, l), desc: (l) => `조각 ×3 (현재 ×${fx(pw(3, l))})` },
  { id: 'refr', name: '굴절률', icon: 'vertex', max: 6, ms: 0, cost: (l) => 2 * pw(4, l), desc: (l) => `꼭짓점과 결 획득 ×2 (현재 ×${fx(pw(2, l))})` },
  { id: 'harmony', name: '무지개 조화', icon: 'flower', max: 1, ms: 10, cost: () => 4, desc: () => '고용한 건축가 종류 하나당 조각 ×1.5' },
  { id: 'keepShapes', name: '형태 기억', icon: 'penta', max: 1, ms: 10, cost: () => 5, desc: () => '굴절 후에도 세모, 동그라미, 오각 해금을 유지합니다.' },
  { id: 'u_hexagon', name: '육각 건축가', icon: 'hex', max: 1, shape: 'hexagon', ms: 10, req: (s) => s.pup.u_star, cost: () => 25, desc: () => '육각 건축가를 고용할 수 있습니다.' },
  { id: 'light', name: '빛의 투사', icon: 'bolt', max: 1, ms: 11, cost: () => 8, desc: () => '건축가 한 명이 던지는 대신 빛으로 블록을 즉시 놓습니다.' },
  { id: 'lightN', name: '빛의 제자', icon: 'bolt', max: 4, ms: 11, req: (s) => s.pup.light, cost: (l) => 12 * pw(4, l), desc: (l) => `빛의 투사를 쓰는 건축가 +1 (현재 ${1 + l}명)` },
  { id: 'blue', name: '청사진', icon: 'grid', max: 3, ms: 11, cost: (l) => 3 * pw(3.5, l), desc: (l) => `건축물 완공 보상 ×2 (현재 ×${pw(2, l)})` },
  { id: 'dawn', name: '이른 새벽', icon: 'sun', max: 1, ms: 11, cost: () => 6, desc: () => '리셋 후 Lv5 네모 건축가 2명과 함께 시작' },
  { id: 'cap1', name: '공방 한계', icon: 'up', max: 3, ms: 11, cost: (l) => 10 * pw(5, l), desc: (l) => `공방 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
];
// ── 4 아틀리에 (안료) ───────────────────────────────────────
T.UP4 = [
  { id: 'painter', name: '방울 주민', icon: 'drop', max: 4, ms: 0, cost: (l) => 1 * pw(2.8, l), desc: (l) => `채색하는 방울 주민 +1 (현재 ${l + 1}명)` },
  { id: 'brush', name: '빠른 붓', icon: 'brush', max: 8, ms: 0, cost: (l) => 2 * pw(2.6, l), desc: (l) => `붓질 쿨타임 20% 감소. 아주 빨라지면 한 칸을 한 번에 칠합니다 (현재 ${T.G ? T.G.paintCD().toFixed(2) : '?'}초)` },
  { id: 'dense', name: '안료 농도', icon: 'drop', max: 10, ms: 0, cost: (l) => 3 * pw(3, l), desc: (l) => `채색 판매 가치 ×2 (현재 ×${fx(4 * pw(2, l))})` },
  { id: 'prismX', name: '빛의 안료', icon: 'prism', max: 8, ms: 13, cost: (l) => 4 * pw(3.8, l), desc: (l) => `프리즘 획득 ×2 (현재 ×${fx(pw(2, l))})` },
  { id: 'all', name: '팔레트의 은총', icon: 'flower', max: 8, ms: 13, cost: (l) => 5 * pw(4.5, l), desc: (l) => `조각 ×4 (현재 ×${fx(pw(4, l))})` },
  { id: 'keepPrism', name: '프리즘 각인', icon: 'prism', max: 1, ms: 13, cost: () => 10, desc: () => '물들임 후에도 별, 육각 해금과 형태 기억을 유지' },
  { id: 'cap2', name: '석공소 한계', icon: 'up', max: 3, ms: 13, cost: (l) => 8 * pw(5, l), desc: (l) => `석공소 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
];
// ── 5 층계 (겹) ─────────────────────────────────────────────
T.UP5 = [
  { id: 'layer', name: '레이어 추가', icon: 'layers', max: 4, noCap: true, ms: 0, cost: (l) => [1, 6, 30, 150][l] ?? 1e9, desc: (l) => `뒤쪽에 새 레이어를 엽니다 (현재 ${l + 1}겹, 최대 5겹)` },
  { id: 'warper', name: '워프 주민', icon: 'portal', max: 3, ms: 0, cost: (l) => 2 * pw(3, l), desc: (l) => `일 없는 주민을 다른 레이어로 데려가는 워프 주민 +1 (현재 ${l + 1}명)` },
  { id: 'depth', name: '깊이감', icon: 'layers', max: 8, ms: 0, cost: (l) => 2 * pw(3.2, l), desc: (l) => `조각 ×1.6, 열린 레이어 하나당 조각 ×1.5 추가 (현재 ×${fx(pw(1.6, l))})` },
  { id: 'fold', name: '겹 접기', icon: 'up', max: 8, ms: 15, cost: (l) => 4 * pw(4, l), desc: (l) => `겹 획득 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'cap3', name: '실험실 한계', icon: 'up', max: 3, ms: 15, cost: (l) => 10 * pw(5, l), desc: (l) => `실험실, 아틀리에 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
  { id: 'keepPig', name: '물감 상자', icon: 'drop', max: 1, ms: 15, cost: () => 12, desc: () => '겹치기 후에도 아틀리에 업그레이드를 유지' },
];
// ── 6 등불 회관 (정착) ─────────────────────────────────────
T.UP6 = [
  { id: 'life', name: '오래오래', icon: 'heart', max: 6, ms: 0, cost: (l) => 1 * pw(2.6, l), desc: (l) => `주민 수명 +35% (현재 ×${(1 + 0.35 * l).toFixed(2)})` },
  { id: 'lshard', name: '등불 아래서', icon: 'lamp', max: 10, ms: 0, cost: (l) => 1 * pw(3.4, l), desc: (l) => `조각 ×4 (현재 ×${fx(pw(4, l))})` },
  { id: 'demo', name: '철거 주민', icon: 'hammer', max: 3, ms: 0, cost: (l) => 2 * pw(3, l), desc: (l) => `블록을 하나씩 허무는 망치 주민 +1 (현재 ${l + 1}명)` },
  { id: 'nap', name: '포근한 이불', icon: 'moon', max: 4, ms: 0, cost: (l) => 2 * pw(2.8, l), desc: (l) => `집에서 잘 때 수명 회복 ×1.5 (현재 ×${pw(1.5, l).toFixed(2)})` },
  { id: 'aura', name: '넓은 광장', icon: 'ring', max: 4, ms: 18, cost: (l) => 4 * pw(3.4, l), desc: (l) => `건축물 행복 범위 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'roomy', name: '다락방', icon: 'house', max: 2, ms: 18, cost: (l) => 6 * pw(5, l), desc: (l) => `집마다 거주 인원 +1 (현재 +${l})` },
  { id: 'birth', name: '요람', icon: 'baby', max: 4, ms: 18, cost: (l) => 5 * pw(3.4, l), desc: (l) => `아기가 생길 확률과 자라는 속도 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'lantern', name: '등불 잇기', icon: 'lamp', max: 8, ms: 20, cost: (l) => 10 * pw(4.5, l), desc: (l) => `등불 획득 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'cap4', name: '층계 한계', icon: 'up', max: 3, ms: 20, cost: (l) => 20 * pw(5, l), desc: (l) => `층계 업그레이드 최대 레벨 +3 (현재 +${l * 3})` },
];
// ── 7 물자 창고 (자동화) ───────────────────────────────────
T.UP7 = [
  { id: 'a_hire', name: '자동 고용', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 80, desc: () => '살 수 있는 가장 싼 건축가를 자동으로 고용합니다.' },
  { id: 'a_level', name: '자동 레벨업', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 200, desc: () => '가장 싼 건축가 레벨업을 자동으로 합니다.' },
  { id: 'a_up0', name: '작업장 자동화', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 500, desc: () => '작업장 업그레이드를 자동으로 삽니다.' },
  { id: 'k_up0', name: '작업장 유지', icon: 'lock', max: 1, ms: 0, cost: () => 900, desc: () => '이정표와 재구성을 해도 작업장 업그레이드가 남습니다.' },
  { id: 'm_work', name: '튼튼한 앞치마', icon: 'hammer', max: 10, ms: 0, cost: (l) => 25 * pw(2.8, l), desc: (l) => `일꾼 생산량 ×1.5 (현재 ×${fx(pw(1.5, l))})` },
  { id: 'm_shard', name: '마을 장터', icon: 'block', max: 10, ms: 0, cost: (l) => 40 * pw(3.4, l), desc: (l) => `조각 ×6 (현재 ×${fx(pw(6, l))})` },
  { id: 'a_up1', name: '공방 자동화', icon: 'auto', max: 1, auto: true, ms: 20, cost: () => 3000, desc: () => '꼭짓점 공방 업그레이드를 자동으로 삽니다.' },
  { id: 'k_up1', name: '공방 유지', icon: 'lock', max: 1, ms: 20, cost: () => 5000, desc: () => '쪼개기를 해도 공방 업그레이드가 남습니다.' },
  { id: 'a_vert', name: '꼭짓점 채굴', icon: 'vertex', max: 6, ms: 20, cost: (l) => 5000 * pw(4.5, l), desc: (l) => `재구성하지 않아도 매초 재구성 획득량의 ${l}%를 얻습니다.` },
  { id: 'm_cd', name: '박자 맞추기', icon: 'clock', max: 6, ms: 20, cost: (l) => 4000 * pw(3.4, l), desc: (l) => `건축가 쿨타임 6% 감소 (현재 ×${pw(0.94, l).toFixed(2)})` },
  { id: 'a_up2', name: '석공소, 실험실 자동화', icon: 'auto', max: 1, auto: true, ms: 21, cost: () => 4e4, desc: () => '석공소와 실험실 업그레이드를 자동으로 삽니다.' },
  { id: 'a_prism', name: '프리즘 증류', icon: 'prism', max: 6, ms: 21, cost: (l) => 6e4 * pw(5, l), desc: (l) => `굴절하지 않아도 매초 굴절 획득량의 ${(l * 0.5).toFixed(1)}%를 얻습니다. (결도 같은 비율)` },
  { id: 'k_up2', name: '석공소, 실험실 유지', icon: 'lock', max: 1, ms: 21, cost: () => 9e4, desc: () => '굴절과 물들임을 해도 석공소와 실험실 업그레이드가 남습니다.' },
  { id: 'a_up3', name: '아틀리에 자동화', icon: 'auto', max: 1, auto: true, ms: 21, cost: () => 2e5, desc: () => '아틀리에 업그레이드를 자동으로 삽니다.' },
  { id: 'm_life', name: '약초 정원', icon: 'leaf', max: 6, ms: 21, cost: (l) => 3e4 * pw(3.4, l), desc: (l) => `주민 수명 +25% (현재 ×${(1 + 0.25 * l).toFixed(2)})` },
];
// which upgrade raises the max level of which shop
T.CAPS = { 0: [2, 'cap0', 5], 1: [3, 'cap1', 4], 2: [4, 'cap2', 4], 3: [5, 'cap3', 4], 4: [5, 'cap3', 4], 5: [6, 'cap4', 3] };

// ── 이정표 (어떤 리셋에도 지워지지 않는 별도 레이어) ─────────
const runStructs = (s, tier) => s.run.built.filter((t) => t >= tier).length;
function cnt(s, id) { let n = 0; for (const a of s.archs) if (a.s === id) n++; return n; }
T.MILESTONES = [
  { name: '주춧돌', need: '이번 회차 건축가 3명', prog: (s) => [s.archs.length, 3], reward: '조각 ×1.5, 작업장에 손놀림, 종종걸음, 긴 팔' },
  { name: '첫 조형물들', need: '이번 회차 조형물 4개 완공', prog: (s) => [s.run.built.length, 4], reward: '장인의 눈, 설계 집중' },
  { name: '작은 무리', need: '건축가 5명과 이번 회차 조각 5만', prog: (s) => [Math.min(s.archs.length / 5, s.runEarned / 5e4), 1], frac: true, reward: '재구성 레이어가 보입니다. 조각 ×2' },
  { name: '모서리의 기억', need: '재구성 1회', prog: (s) => [s.flags.l1Done, 1], reward: '공방 확장, 꼭짓점 예감, 재구성 연출 생략 설정' },
  { name: '도형의 친구들', need: '세모 건축가 2명', prog: (s) => [cnt(s, 'triangle'), 2], reward: '공방 확장, 협동' },
  { name: '끌 소리', need: '꼭짓점 누적 120', prog: (s) => [s.stats.lifeVerts, 120], reward: '쪼개기 레이어가 보입니다. 하늘 건축물 도면' },
  { name: '첫 조각', need: '쪼개기 1회', prog: (s) => [s.flags.l2Done, 1], reward: '하늘 건축물, 석공소 확장, 두 개씩, 일괄 레벨업' },
  { name: '2비트의 세계', need: '해상도 2비트', prog: (s) => [s.resLv, 1], reward: '클릭 쿨타임 30% 감소, 중형 조형물' },
  { name: '굴절의 징조', need: '결 누적 25', prog: (s) => [s.stats.lifeGrains, 25], reward: '굴절 레이어가 보입니다. 쪼개기 연출 생략 설정' },
  { name: '첫 색', need: '굴절 1회', prog: (s) => [s.flags.l3Done, 1], reward: '조각 ×3, 실험실 확장, 4비트 해상도, 예상 소요시간' },
  { name: '다섯 모양', need: '프리즘 누적 8', prog: (s) => [s.stats.lifePrisms, 8], reward: '프리즘 ×1.5, 실험실 확장, 대형 조형물' },
  { name: '물감 냄새', need: '프리즘 누적 20', prog: (s) => [s.stats.lifePrisms, 20], reward: '물들임 레이어가 보입니다. 굴절 연출 생략 설정' },
  { name: '방울의 노래', need: '물들임 1회', prog: (s) => [s.flags.l4Done, 1], reward: '조각 ×5, 아틀리에 확장, 8비트 해상도' },
  { name: '8비트의 꿈', need: '해상도 8비트', prog: (s) => [s.resLv, 3], reward: '겹치기 레이어가 보입니다.' },
  { name: '겹겹이', need: '겹치기 1회', prog: (s) => [s.flags.l5Done, 1], reward: '층계 확장, 조각 ×4' },
  { name: '정착의 꿈', need: '겹 누적 20과 레이어 3겹', prog: (s) => [Math.min(s.stats.lifeFolds / 20, T.G.layers() / 3), 1], frac: true, reward: '정착 레이어가 보입니다.' },
  { name: '첫 마을', need: '정착 1회', prog: (s) => [s.flags.l6Done, 1], reward: '연대기와 구역, 등불 ×1.5' },
  { name: '가족', need: '인구 8', prog: (s) => [T.vil ? T.vil.population() : 0, 8], reward: '아기와 일꾼, 물자, 등불 회관 확장' },
  { name: '자동화의 씨앗', need: '물자 누적 50', prog: (s) => [s.stats.lifeGoods, 50], reward: '물자 창고가 열립니다.' },
  { name: '두 번째 시대', need: '시대: 돌담 마을', prog: (s) => [s.era, 2], reward: '등불 ×2, 공방 자동화와 유지, 꼭짓점 채굴' },
  { name: '장원의 종', need: '시대: 장원', prog: (s) => [s.era, 3], reward: '석공소와 실험실 자동화, 프리즘 증류' },
  { name: '성읍의 깃발', need: '시대: 중세 성읍', prog: (s) => [s.era, 4], reward: '조각 ×20, 크레딧' },
];
T.msShardMult = (n) => (n >= 1 ? 1.5 : 1) * (n >= 3 ? 2 : 1) * (n >= 10 ? 3 : 1) * (n >= 13 ? 5 : 1) * (n >= 15 ? 4 : 1) * (n >= 22 ? 20 : 1);

// ── 연대기 (정착 후 세부 리셋 레이어) ───────────────────────
T.ERA_REQ = [
  null, null,
  [ { text: '인구', cur: () => T.vil.population(), need: 8 }, { text: '완공한 집', cur: () => T.vil.countCat('house'), need: 3 },
    { text: '공원 건축물', cur: () => T.vil.countCat('park'), need: 4 }, { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 15 } ],
  [ { text: '인구', cur: () => T.vil.population(), need: 14 }, { text: '시장, 생산 건축물', cur: () => T.vil.countCat('market') + T.vil.countCat('prod'), need: 4 },
    { text: '평균 행복', cur: () => T.vil.avgHappy(), need: 0.6, frac: true }, { text: '이번 시대 물자 누적', cur: (s) => s.eraGoods, need: 600 } ],
  [ { text: '인구', cur: () => T.vil.population(), need: 22 }, { text: '예배당', cur: () => T.vil.countId('chapel'), need: 1 }, { text: '돌다리', cur: () => T.vil.countId('bridge'), need: 1 },
    { text: '대형 건축물', cur: () => T.vil.countTier(4), need: 3 }, { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 500 } ],
];
T.ZONES = {
  home: { name: '주거', color: '#e8b86d', gray: '#9a9a97', cats: ['house'], fill: ['park', 'deco'], era: 1 },
  park: { name: '공원', color: '#72b35c', gray: '#8a8a87', cats: ['park', 'sculpture'], fill: ['deco'], era: 1 },
  market: { name: '시장', color: '#d64545', gray: '#7a7a77', cats: ['market'], fill: ['deco', 'park'], era: 2 },
  prod: { name: '생산', color: '#8c6a4a', gray: '#6e6e6b', cats: ['prod'], fill: ['deco'], era: 2 },
  civic: { name: '광장', color: '#8e7cc3', gray: '#858582', cats: ['civic', 'park'], fill: ['deco', 'water'], era: 3 },
  water: { name: '물가', color: '#5aa9d6', gray: '#7f7f7c', cats: ['water'], fill: ['park'], era: 3 },
};
T.CODES = { ROSETTE: 1, 장미창: 1, PARADE: 1, CREDITS: 1, HELLO: 1 };
T.TUTORIAL = [
  { at: null, text: '어서 오세요. 이곳은 아무것도 없는 회색 세계입니다. 작은 건축가들과 함께 무언가를 지어 봐요.' },
  { at: '#cv', text: '하늘을 <b>왼쪽 클릭</b>하면 격자에 블록을 놓고, 블록을 팔아 <b>조각</b>을 얻습니다. 클릭에는 짧은 쿨타임이 있어요.', wait: (s) => s.stats.clicks >= 3 },
  { at: '#dock', text: '<b>오른쪽 버튼으로 끌면</b> 화면이 움직이고, 휠로 확대합니다. 「간격」 버튼 위에서 휠을 굴리면 블록 간격을 바꿔요.' },
  { at: '#panel', text: '조각 15개가 모이면 「고용」 탭에서 첫 <b>건축가</b>를 데려오세요. 건축가는 혼자서, 또는 함께 조형물을 짓습니다.', wait: (s) => s.archs.length >= 1 },
  { at: '#cv', text: '건축가를 <b>클릭</b>하면 쓰다듬고, <b>끌면</b> 들어 올립니다. 짓고 있는 곳 근처에 내려놓으면 거들어요.' },
  { at: '#cv', text: '<b>오른쪽 버튼을 짧게</b> 누르면 부탁 메뉴가 뜹니다. 모여, 춤추기, 따라와 같은 부탁을 해 보세요.' },
  { at: '#panel', text: '「이정표」 탭의 조건을 채우면 이정표를 세울 수 있어요. 이정표는 절대 사라지지 않고 새 기능을 엽니다. 즐거운 건축 되세요!' },
];
