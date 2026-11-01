'use strict';
// ─────────────────────────────────────────────────────────────
//  DATA: 밸런스와 콘텐츠는 이 파일에서 조정합니다.
//  ms: 필요한 이정표 수, req: 추가 조건, max: 기본 최대 레벨 (한계 업그레이드로 늘어남)
//  상점 번호: 0 작업장(조각) 1 공방(꼭짓점) 2 석공소(결) 3 실험실(프리즘)
//            4 아틀리에(안료) 5 층계(겹) 6 등불 회관(등불) 7 물자 창고(물자)
// ─────────────────────────────────────────────────────────────
T.SHAPES = [
  { id: 'square',   name: '네모',     k: 4, cost: 15,   growth: 3.2, value: 1,    cd: 2.6, ring: 9, start: 4, gray: '#d4d4d1', color: '#e8b86d', motifs: ['poly', 'arch', 'zigg'],
    names: ['두부', '모찌', '깍두기', '주사위', '각설탕', '단추', '큐브', '벽돌이', '콩', '먼지', '카라멜', '버터', '쿠키', '타일'] },
  { id: 'triangle', name: '세모',     k: 3, cost: 3e3,  growth: 3.4, value: 14,   cd: 2.6, ring: 10, start: 9, gray: '#b9b9b6', color: '#df7a5e', motifs: ['poly', 'hexagram', 'petal'],
    names: ['삼각김밥', '뾰족이', '피라', '산', '세세', '나초', '트리', '모서리', '텐트'] },
  { id: 'circle',   name: '동그라미', k: 6, cost: 4e5,  growth: 3.6, value: 220,  cd: 2.6, ring: 8, start: 15, gray: '#a3a3a0', color: '#8fb996', motifs: ['circle', 'petal', 'rays'],
    names: ['방울토마토', '구슬', '동동', '경단', '완두', '보름', '도토리', '마카롱', '단팥'] },
  { id: 'pentagon', name: '오각',     k: 5, cost: 3e7,  growth: 3.8, value: 3500, cd: 2.6, ring: 11, start: 22, gray: '#8c8c89', color: '#6c96c4', motifs: ['poly', 'star', 'petal'],
    names: ['오각이', '펜타', '축구공', '오디', '다섯', '집게', '연필', '오월'] },
  { id: 'star',     name: '별',       k: 5, cost: 2e9,  growth: 4.0, value: 6e4,  cd: 2.6, ring: 12, start: 30, gray: '#dcdcd9', color: '#b49ad8', motifs: ['star', 'rays', 'petal8'],
    names: ['반짝', '샛별', '혜성', '유성', '별사탕', '은하', '북극성', '루미'] },
  { id: 'hexagon',  name: '육각',     k: 6, cost: 2e11, growth: 4.2, value: 1e6,  cd: 2.6, ring: 10, start: 38, gray: '#7b7b78', color: '#5fbfb6', motifs: ['poly', 'hexagram', 'petal'],
    names: ['벌집', '눈송이', '흑연', '너트', '육육', '결정', '육각정'] },
];
T.SHAPE = {};
T.SHAPES.forEach((s, i) => { s.index = i; T.SHAPE[s.id] = s; });
T.PLAYER_COLOR = { gray: '#6f6f6c', color: '#3d405b' };
const pw = Math.pow;
const fx = (n) => T.fmt(n);

// 원칙(v4): 같은 상점 안의 배율은 더하기형 ×(1 + a·L), 비용은 a·b^L·c^(L²). 레벨이 오를수록 효율이 줄어 폭주하지 않습니다.
const ad = (a, l) => 1 + a * l;
const pct = (x) => `${Math.round(x * 100)}%`;
// ── 0 작업장 (조각) ─────────────────────────────────────────
T.UP0 = [
  { id: 'solid', name: '단단한 블록', icon: 'block', max: 15, ms: 0, cost: (l) => 25 * pw(1.9, l) * pw(1.04, l * l), desc: (l) => `블록 기본가치 +1 (현재 +${l})` },
  { id: 'quick', name: '날렵한 손', icon: 'clock', max: 6, ms: 0, cost: (l) => 60 * pw(2.6, l) * pw(1.06, l * l), desc: (l) => `건축가 작업 속도 +10% (현재 ×${ad(0.1, l).toFixed(1)})` },
  { id: 'hand', name: '손재주', icon: 'hand', max: 5, noCap: true, ms: 0, cost: (l) => 60 * pw(4.5, l) * pw(1.1, l * l), desc: (l) => `클릭 한 번이 건축가 생산 ${T.G ? T.G.clickSecs(l + 1).toFixed(2) : '?'}초 분량 (현재 ${T.G ? T.G.clickSecs(l).toFixed(2) : '?'}초)` },
  { id: 'tap', name: '손놀림', icon: 'tap', max: 5, noCap: true, ms: 1, cost: (l) => 250 * pw(3.4, l), desc: (l) => `클릭 쿨타임 10% 감소 (현재 ${T.G ? T.G.clickCD().toFixed(2) : '?'}초)` },
  { id: 'walk', name: '종종걸음', icon: 'boot', max: 3, noCap: true, ms: 1, cost: (l) => 400 * pw(3.8, l) * pw(1.15, l * l), desc: (l) => `걷기 속도 +10% (현재 ×${ad(0.1, l).toFixed(2)})` },
  { id: 'arm', name: '긴 팔', icon: 'arm', max: 3, noCap: true, ms: 1, cost: (l) => 500 * pw(4, l) * pw(1.15, l * l), desc: (l) => `던지기 사거리 +12% (현재 ×${ad(0.12, l).toFixed(2)})` },
  { id: 'eye', name: '장인의 눈', icon: 'eye', max: 8, ms: 2, cost: (l) => 900 * pw(4.2, l) * pw(1.05, l * l), desc: (l) => `판매가치 +40% (현재 ×${ad(0.4, l).toFixed(1)})` },
  { id: 'focus', name: '설계 집중', icon: 'grid', max: 3, ms: 2, cost: (l) => 1200 * pw(4, l), desc: (l) => `플레이어 설계도를 먼저 도울 확률 +8% (현재 ${60 + l * 8}%)` },
  { id: 'omen', name: '꼭짓점 예감', icon: 'vertex', max: 5, ms: 3, cost: (l) => 3e5 * pw(6, l), desc: (l) => `재구성 때 꼭짓점 +20% (현재 ×${ad(0.2, l).toFixed(1)})` },
  { id: 'team', name: '협동', icon: 'team', max: 5, ms: 4, cost: (l) => 6e4 * pw(4.5, l), desc: (l) => `같은 건축물을 함께 짓는 동료 한 명당 쿨타임 4% 감소 (현재 ${l * 4}%)` },
  { id: 'double', name: '두 개씩', icon: 'two', max: 5, ms: 7, cost: (l) => 3e6 * pw(5, l), desc: (l) => `블록을 2개 던질 확률 +6% (현재 ${l * 6}%)` },
];
// ── 1 꼭짓점 공방 ───────────────────────────────────────────
T.UP1 = [
  { id: 'u_triangle', name: '세모 건축가', icon: 'tri', max: 1, shape: 'triangle', ms: 0, cost: () => 3, desc: () => '세모 건축가를 고용할 수 있습니다.' },
  { id: 'bless', name: '기하의 축복', icon: 'star4', max: 8, ms: 0, cost: (l) => 2 * pw(3, l) * pw(1.05, l * l), desc: (l) => `조각 +100% (현재 ×${ad(1, l)})` },
  { id: 'memory', name: '기억하는 손', icon: 'heart', max: 2, ms: 0, cost: (l) => 3 * pw(4, l), desc: (l) => `리셋 후 네모 건축가 ${l + 1}명과 함께 시작 (현재 ${l}명)` },
  { id: 'res', name: '꼭짓점 공명', icon: 'vertex', max: 6, ms: 4, cost: (l) => 10 * pw(4, l), desc: (l) => `꼭짓점 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'legs', name: '긴 다리', icon: 'boot', max: 2, noCap: true, ms: 4, cost: (l) => 12 * pw(5, l), desc: (l) => `걷기 속도와 사거리 +10% (현재 ×${ad(0.1, l).toFixed(1)})` },
  { id: 'room', name: '작은 방', icon: 'house', max: 2, noCap: true, ms: 4, cost: (l) => 20 * pw(8, l), desc: (l) => `건축가 자리 +1 (현재 +${l})` },
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
  { id: 'chisel', name: '톡톡 주민', icon: 'chisel', max: 4, ms: 0, cost: (l) => 1 * pw(3, l), desc: (l) => `블록을 다듬는 톡톡 주민 +1 (현재 ${l + 1}명)` },
  { id: 'carve', name: '날 세우기', icon: 'clock', max: 8, ms: 0, cost: (l) => 2 * pw(2.8, l), desc: (l) => `다듬기 쿨타임 20% 감소. 아주 빨라지면 한 칸을 한 번에 다듬습니다 (현재 ${T.G ? T.G.carveCD().toFixed(2) : '?'}초)` },
  { id: 'sharp', name: '고운 결', icon: 'star4', max: 8, ms: 0, cost: (l) => 3 * pw(3.4, l) * pw(1.05, l * l), desc: (l) => `조각 +100%, 다듬은 조각 판매 +100% (현재 ×${ad(1, l)})` },
  { id: 'grain', name: '결 따라', icon: 'chisel', max: 8, ms: 7, cost: (l) => 5 * pw(4, l), desc: (l) => `결 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'cap0', name: '작업장 한계', icon: 'up', max: 4, ms: 7, cost: (l) => 8 * pw(5, l), desc: (l) => `작업장 업그레이드 최대 레벨 +5 (현재 +${l * 5})` },
];
// ── 3 프리즘 실험실 ─────────────────────────────────────────
T.UP3 = [
  { id: 'u_star', name: '별 건축가', icon: 'star', max: 1, shape: 'star', ms: 0, cost: () => 3, desc: () => '별 건축가를 고용할 수 있습니다.' },
  { id: 'spectrum', name: '스펙트럼', icon: 'prism', max: 8, ms: 0, cost: (l) => 1 * pw(3.2, l) * pw(1.05, l * l), desc: (l) => `조각 +150% (현재 ×${ad(1.5, l)})` },
  { id: 'refr', name: '굴절률', icon: 'vertex', max: 6, ms: 0, cost: (l) => 2 * pw(4, l), desc: (l) => `꼭짓점 +50% (현재 ×${ad(0.5, l)})` },
  { id: 'harmony', name: '무지개 조화', icon: 'flower', max: 1, ms: 10, cost: () => 4, desc: () => '고용한 건축가 종류 하나당 조각 ×1.25' },
  { id: 'keepShapes', name: '형태 기억', icon: 'penta', max: 1, ms: 10, cost: () => 5, desc: () => '굴절 후에도 세모, 동그라미, 오각 해금을 유지합니다.' },
  { id: 'u_hexagon', name: '육각 건축가', icon: 'hex', max: 1, shape: 'hexagon', ms: 10, req: (s) => s.pup.u_star, cost: () => 25, desc: () => '육각 건축가를 고용할 수 있습니다.' },
  { id: 'attic', name: '다락', icon: 'house', max: 2, noCap: true, ms: 10, cost: (l) => 8 * pw(6, l), desc: (l) => `건축가 자리 +1 (현재 +${l})` },
  { id: 'light', name: '빛의 투사', icon: 'bolt', max: 1, ms: 11, cost: () => 8, desc: () => '건축가 한 명이 던지는 대신 빛으로 블록을 즉시 놓습니다.' },
  { id: 'lightN', name: '빛의 제자', icon: 'bolt', max: 4, ms: 11, req: (s) => s.pup.light, cost: (l) => 12 * pw(4, l), desc: (l) => `빛의 투사를 쓰는 건축가 +1 (현재 ${1 + l}명)` },
  { id: 'blue', name: '청사진', icon: 'grid', max: 3, ms: 11, cost: (l) => 3 * pw(3.5, l), desc: (l) => `건축물 완공 보상 +100% (현재 ×${ad(1, l)})` },
  { id: 'dawn', name: '이른 새벽', icon: 'sun', max: 1, ms: 11, cost: () => 6, desc: () => '리셋 후 Lv5 네모 건축가 2명과 함께 시작' },
  { id: 'cap1', name: '공방 한계', icon: 'up', max: 3, ms: 11, cost: (l) => 10 * pw(5, l), desc: (l) => `공방 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
];
// ── 4 아틀리에 (안료) ───────────────────────────────────────
T.UP4 = [
  { id: 'painter', name: '방울 주민', icon: 'drop', max: 4, ms: 0, cost: (l) => 1 * pw(2.8, l), desc: (l) => `채색하는 방울 주민 +1 (현재 ${l + 1}명)` },
  { id: 'brush', name: '빠른 붓', icon: 'brush', max: 8, ms: 0, cost: (l) => 2 * pw(2.6, l), desc: (l) => `붓질 쿨타임 20% 감소. 아주 빨라지면 한 칸을 한 번에 칠합니다 (현재 ${T.G ? T.G.paintCD().toFixed(2) : '?'}초)` },
  { id: 'dense', name: '안료 농도', icon: 'drop', max: 10, ms: 0, cost: (l) => 3 * pw(3, l), desc: (l) => `채색 판매 가치 +100% (현재 ×${2 + l})` },
  { id: 'prismX', name: '빛의 안료', icon: 'prism', max: 8, ms: 13, cost: (l) => 4 * pw(3.8, l), desc: (l) => `프리즘 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'all', name: '팔레트의 은총', icon: 'flower', max: 8, ms: 13, cost: (l) => 5 * pw(4, l) * pw(1.05, l * l), desc: (l) => `조각 +200% (현재 ×${ad(2, l)})` },
  { id: 'fine', name: '섬세한 손길', icon: 'chisel', max: 3, noCap: true, ms: 13, cost: (l) => 6 * pw(6, l), desc: (l) => `건축물을 도면 해상도보다 한 단계 더 곱게 다듬을 수 있습니다 (현재 +${l}단계)` },
  { id: 'keepPrism', name: '프리즘 각인', icon: 'prism', max: 1, ms: 13, cost: () => 10, desc: () => '물들임 후에도 별, 육각 해금과 형태 기억을 유지' },
  { id: 'cap2', name: '석공소 한계', icon: 'up', max: 3, ms: 13, cost: (l) => 8 * pw(5, l), desc: (l) => `석공소 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
];
// ── 5 층계 (안개) ───────────────────────────────────────────
T.UP5 = [
  { id: 'layer', name: '겹 열기', icon: 'layers', max: 4, noCap: true, ms: 0, cost: (l) => [1, 6, 30, 150][l] ?? 1e9, desc: (l) => `뒤쪽에 새 겹을 엽니다 (현재 ${l + 1}겹, 최대 5겹)` },
  { id: 'warper', name: '폴짝 주민', icon: 'portal', max: 3, ms: 0, cost: (l) => 2 * pw(3, l), desc: (l) => `일 없는 주민을 다른 겹으로 데려가는 폴짝 주민 +1 (현재 ${l + 1}명)` },
  { id: 'depth', name: '깊이감', icon: 'layers', max: 8, ms: 0, cost: (l) => 2 * pw(3.2, l) * pw(1.05, l * l), desc: (l) => `조각 +75%, 열린 겹 하나당 조각 ×1.25 (현재 ×${ad(0.75, l).toFixed(2)})` },
  { id: 'fold', name: '안개 모으기', icon: 'up', max: 8, ms: 15, cost: (l) => 4 * pw(4, l), desc: (l) => `안개 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'cap3', name: '실험실 한계', icon: 'up', max: 3, ms: 15, cost: (l) => 10 * pw(5, l), desc: (l) => `실험실, 아틀리에 업그레이드 최대 레벨 +4 (현재 +${l * 4})` },
  { id: 'keepPig', name: '물감 상자', icon: 'drop', max: 1, ms: 15, cost: () => 12, desc: () => '겹치기 후에도 아틀리에 업그레이드를 유지' },
];
// ── 6 등불 회관 (정착) ─────────────────────────────────────
T.UP6 = [
  { id: 'life', name: '오래오래', icon: 'heart', max: 6, ms: 0, cost: (l) => 1 * pw(2.6, l), desc: (l) => `주민 수명 +35% (현재 ×${ad(0.35, l).toFixed(2)})` },
  { id: 'lshard', name: '등불 아래서', icon: 'lamp', max: 10, ms: 0, cost: (l) => 1 * pw(3.2, l) * pw(1.04, l * l), desc: (l) => `조각 +200% (현재 ×${ad(2, l)})` },
  { id: 'demo', name: '쿵쿵 주민', icon: 'hammer', max: 3, ms: 0, cost: (l) => 2 * pw(3, l), desc: (l) => `블록을 하나씩 허무는 쿵쿵 주민 +1 (현재 ${l + 1}명)` },
  { id: 'nap', name: '포근한 이불', icon: 'moon', max: 4, ms: 0, cost: (l) => 2 * pw(2.8, l), desc: (l) => `집에서 잘 때 수명 회복 +50% (현재 ×${ad(0.5, l).toFixed(1)})` },
  { id: 'aura', name: '넓은 광장', icon: 'ring', max: 4, ms: 18, cost: (l) => 4 * pw(3.4, l), desc: (l) => `건축물 행복 범위 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'roomy', name: '다락방', icon: 'house', max: 2, ms: 18, cost: (l) => 6 * pw(5, l), desc: (l) => `집마다 거주 인원 +1 (현재 +${l})` },
  { id: 'birth', name: '요람', icon: 'baby', max: 4, ms: 18, cost: (l) => 5 * pw(3.4, l), desc: (l) => `아기가 생길 확률과 자라는 속도 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'lantern', name: '등불 잇기', icon: 'lamp', max: 8, ms: 20, cost: (l) => 10 * pw(4.5, l), desc: (l) => `등불 +30% (현재 ×${ad(0.3, l).toFixed(1)})` },
  { id: 'cap4', name: '층계 한계', icon: 'up', max: 3, ms: 20, cost: (l) => 20 * pw(5, l), desc: (l) => `층계 업그레이드 최대 레벨 +3 (현재 +${l * 3})` },
];
// ── 7 물자 창고 (자동화) ───────────────────────────────────
T.UP7 = [
  { id: 'a_hire', name: '자동 고용', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 80, desc: () => '빈 자리가 있으면 살 수 있는 가장 싼 건축가를 자동으로 고용합니다.' },
  { id: 'a_level', name: '자동 레벨업', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 200, desc: () => '가장 싼 건축가 레벨업을 자동으로 합니다.' },
  { id: 'a_up0', name: '작업장 자동화', icon: 'auto', max: 1, auto: true, ms: 0, cost: () => 500, desc: () => '작업장 업그레이드를 자동으로 삽니다.' },
  { id: 'k_up0', name: '작업장 유지', icon: 'lock', max: 1, ms: 0, cost: () => 900, desc: () => '이정표와 재구성을 해도 작업장 업그레이드가 남습니다.' },
  { id: 'm_work', name: '튼튼한 앞치마', icon: 'hammer', max: 10, ms: 0, cost: (l) => 25 * pw(2.8, l), desc: (l) => `일꾼 생산량 +50% (현재 ×${ad(0.5, l).toFixed(1)})` },
  { id: 'm_shard', name: '마을 장터', icon: 'block', max: 10, ms: 0, cost: (l) => 40 * pw(3.2, l), desc: (l) => `조각 +150% (현재 ×${ad(1.5, l)})` },
  { id: 'a_up1', name: '공방 자동화', icon: 'auto', max: 1, auto: true, ms: 20, cost: () => 3000, desc: () => '꼭짓점 공방 업그레이드를 자동으로 삽니다.' },
  { id: 'k_up1', name: '공방 유지', icon: 'lock', max: 1, ms: 20, cost: () => 5000, desc: () => '다듬기를 해도 공방 업그레이드가 남습니다.' },
  { id: 'a_vert', name: '꼭짓점 채굴', icon: 'vertex', max: 6, ms: 20, cost: (l) => 5000 * pw(4.5, l), desc: (l) => `재구성하지 않아도 매초 재구성 획득량의 ${l}%를 얻습니다.` },
  { id: 'm_cd', name: '박자 맞추기', icon: 'clock', max: 6, ms: 20, cost: (l) => 4000 * pw(3.4, l), desc: (l) => `건축가 작업 속도 +6% (현재 ×${ad(0.06, l).toFixed(2)})` },
  { id: 'a_up2', name: '석공소, 실험실 자동화', icon: 'auto', max: 1, auto: true, ms: 21, cost: () => 4e4, desc: () => '석공소와 실험실 업그레이드를 자동으로 삽니다.' },
  { id: 'a_prism', name: '프리즘 증류', icon: 'prism', max: 6, ms: 21, cost: (l) => 6e4 * pw(5, l), desc: (l) => `굴절하지 않아도 매초 굴절 획득량의 ${(l * 0.5).toFixed(1)}%를 얻습니다.` },
  { id: 'k_up2', name: '석공소, 실험실 유지', icon: 'lock', max: 1, ms: 21, cost: () => 9e4, desc: () => '굴절과 물들임을 해도 석공소와 실험실 업그레이드가 남습니다.' },
  { id: 'a_up3', name: '아틀리에 자동화', icon: 'auto', max: 1, auto: true, ms: 21, cost: () => 2e5, desc: () => '아틀리에 업그레이드를 자동으로 삽니다.' },
  { id: 'm_life', name: '약초 정원', icon: 'leaf', max: 6, ms: 21, cost: (l) => 3e4 * pw(3.4, l), desc: (l) => `주민 수명 +25% (현재 ×${ad(0.25, l).toFixed(2)})` },
];
// which upgrade raises the max level of which shop
T.CAPS = { 0: [2, 'cap0', 5], 1: [3, 'cap1', 4], 2: [4, 'cap2', 4], 3: [5, 'cap3', 4], 4: [5, 'cap3', 4], 5: [6, 'cap4', 3] };

// ── 이정표 (어떤 리셋에도 지워지지 않는 별도 레이어) ─────────
// rewards: k = mult(배율) up(업그레이드) feat(기능) unlock(리셋 해금) cap(자리) bp(설계도 단계)
function cnt(s, id) { let n = 0; for (const a of s.archs) if (a.s === id) n++; return n; }
const R = (k, t, tab) => ({ k, t, tab });
T.MILESTONES = [
  { name: '주춧돌', need: '이번 회차 건축가 3명', prog: (s) => [s.archs.length, 3], rewards: [R('mult', '조각 ×1.5'), R('up', '작업장: 손놀림, 종종걸음, 긴 팔', 'work'), R('cap', '자리 4'), R('bp', '설계도 단계: 작은 조형물', 'bp')] },
  { name: '첫 조형물들', need: '이번 회차 조형물 4개 완공', prog: (s) => [s.run.built.length, 4], rewards: [R('up', '작업장: 장인의 눈, 설계 집중', 'work'), R('cap', '자리 5')] },
  { name: '작은 무리', need: '건축가 5명과 이번 회차 조각 5만', prog: (s) => [Math.min(s.archs.length / 5, s.runEarned / 5e4), 1], frac: true, rewards: [R('unlock', '재구성 해금'), R('mult', '조각 ×2')] },
  { name: '모서리의 기억', need: '재구성 1회', prog: (s) => [s.flags.l1Done, 1], rewards: [R('up', '공방 업그레이드 +3, 작업장: 꼭짓점 예감', 'v'), R('feat', '재구성 연출 생략 설정')] },
  { name: '도형의 친구들', need: '세모 건축가 2명', prog: (s) => [cnt(s, 'triangle'), 2], rewards: [R('up', '공방: 꼭짓점 공명, 긴 다리, 작은 방, 동그라미 / 작업장: 협동', 'v'), R('cap', '자리 6')] },
  { name: '톡톡 소리', need: '꼭짓점 누적 120', prog: (s) => [s.stats.lifeVerts, 120], rewards: [R('unlock', '다듬기 해금'), R('feat', '하늘 건축물 도면')] },
  { name: '첫 다듬기', need: '다듬기 1회', prog: (s) => [s.flags.l2Done, 1], rewards: [R('feat', '하늘 건축물, 일괄 레벨업'), R('up', '석공소 업그레이드 +2, 작업장: 두 개씩', 's'), R('cap', '자리 7')] },
  { name: '2비트의 세계', need: '해상도 2비트', prog: (s) => [s.resLv, 1], rewards: [R('mult', '클릭 쿨타임 -30%'), R('bp', '설계도 단계: 조형물', 'bp'), R('feat', '구매 수량 고르기')] },
  { name: '굴절의 징조', need: '결 누적 25', prog: (s) => [s.stats.lifeGrains, 25], rewards: [R('unlock', '굴절 해금'), R('feat', '다듬기 연출 생략 설정')] },
  { name: '첫 색', need: '굴절 1회', prog: (s) => [s.flags.l3Done, 1], rewards: [R('mult', '조각 ×2'), R('up', '실험실 업그레이드 +4', 'p'), R('feat', '4비트 해상도, 예상 소요시간'), R('bp', '설계도 단계: 큰 조형물', 'bp'), R('cap', '자리 8')] },
  { name: '다섯 모양', need: '프리즘 누적 8', prog: (s) => [s.stats.lifePrisms, 8], rewards: [R('mult', '프리즘 ×1.5'), R('up', '실험실 업그레이드 +6', 'p'), R('bp', '설계도 단계: 기념물', 'bp')] },
  { name: '물감 냄새', need: '프리즘 누적 20', prog: (s) => [s.stats.lifePrisms, 20], rewards: [R('unlock', '물들임 해금'), R('feat', '굴절 연출 생략 설정'), R('bp', '설계도 단계: 건축물', 'bp'), R('cap', '자리 9')] },
  { name: '방울의 노래', need: '물들임 1회', prog: (s) => [s.flags.l4Done, 1], rewards: [R('mult', '조각 ×2.5'), R('up', '아틀리에 업그레이드 +5, 섬세한 손길', 'g'), R('feat', '8비트 해상도')] },
  { name: '8비트의 꿈', need: '해상도 8비트', prog: (s) => [s.resLv, 3], rewards: [R('unlock', '겹치기 해금'), R('bp', '설계도 단계: 큰 건축물', 'bp'), R('cap', '자리 10')] },
  { name: '겹겹이', need: '겹치기 1회', prog: (s) => [s.flags.l5Done, 1], rewards: [R('up', '층계 업그레이드 +3', 'z'), R('mult', '조각 ×2'), R('bp', '설계도 단계: 랜드마크', 'bp')] },
  { name: '정착의 꿈', need: '안개 누적 20과 3겹', prog: (s) => [Math.min(s.stats.lifeFolds / 20, T.G.layers() / 3), 1], frac: true, rewards: [R('unlock', '정착 해금')] },
  { name: '첫 마을', need: '정착 1회', prog: (s) => [s.flags.l6Done, 1], rewards: [R('feat', '연대기와 구역'), R('mult', '등불 ×1.5'), R('bp', '설계도 단계: 불가사의', 'bp')] },
  { name: '가족', need: '인구 8', prog: (s) => [T.vil ? T.vil.population() : 0, 8], rewards: [R('feat', '아기와 일꾼, 물자'), R('up', '등불 회관 업그레이드 +3', 'l')] },
  { name: '자동화의 씨앗', need: '물자 누적 50', prog: (s) => [s.stats.lifeGoods, 50], rewards: [R('feat', '물자 창고 열림')] },
  { name: '두 번째 시대', need: '시대: 돌담 마을', prog: (s) => [s.era, 2], rewards: [R('mult', '등불 ×2'), R('up', '물자: 공방 자동화와 유지, 꼭짓점 채굴', 'auto')] },
  { name: '장원의 종', need: '시대: 장원', prog: (s) => [s.era, 3], rewards: [R('up', '물자: 석공소와 실험실 자동화, 프리즘 증류', 'auto')] },
  { name: '성읍의 깃발', need: '시대: 중세 성읍', prog: (s) => [s.era, 4], rewards: [R('mult', '조각 ×5'), R('feat', '크레딧')] },
];
T.MILESTONES.forEach((m) => { m.reward = m.rewards.map((r) => r.t).join(', '); });
T.msShardMult = (n) => (n >= 1 ? 1.5 : 1) * (n >= 3 ? 2 : 1) * (n >= 10 ? 2 : 1) * (n >= 13 ? 2.5 : 1) * (n >= 15 ? 2 : 1) * (n >= 22 ? 5 : 1);

// ── 연대기 (정착 후 세부 리셋 레이어) ───────────────────────
T.ERA_REQ = [
  null, null,
  [ { text: '인구', cur: () => T.vil.population(), need: 8 }, { text: '완공한 집', cur: () => T.vil.countCat('house'), need: 3 },
    { text: '공원 건축물', cur: () => T.vil.countCat('park'), need: 4 }, { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 15 } ],
  [ { text: '인구', cur: () => T.vil.population(), need: 14 }, { text: '시장, 생산 건축물', cur: () => T.vil.countCat('market') + T.vil.countCat('prod'), need: 4 },
    { text: '평균 행복', cur: () => T.vil.avgHappy(), need: 0.45, frac: true }, { text: '이번 시대 물자 누적', cur: (s) => s.eraGoods, need: 600 } ],
  [ { text: '인구', cur: () => T.vil.population(), need: 22 }, { text: '예배당', cur: () => T.vil.countId('chapel'), need: 1 }, { text: '돌다리', cur: () => T.vil.countId('bridge'), need: 1 },
    { text: '기념물 단계 이상', cur: () => T.vil.countTier(4), need: 3 }, { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 500 } ],
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
  { at: '#cv', text: '하늘을 <b>왼쪽 클릭</b>하면 격자에 블록을 놓고, 블록을 팔아 <b>조각</b>을 얻습니다. 클릭에는 짧은 쿨타임이 있어요.', m: '하늘을 <b>톡 누르면</b> 블록을 놓고, 블록을 팔아 <b>조각</b>을 얻습니다. 누르기에는 짧은 쿨타임이 있어요.', wait: (s) => s.stats.clicks >= 3 },
  { at: '#dock', text: '<b>오른쪽 버튼으로 끌면</b> 화면이 움직이고, 휠로 확대합니다. 「간격」 버튼 위에서 휠을 굴리면 블록 간격을 바꿔요.', m: '<b>한 손가락으로 끌면</b> 화면이 움직이고, <b>두 손가락</b>으로 벌리면 확대합니다. 오른쪽 아래 <b>붓</b> 버튼을 켜면 끌어서 블록을 이어 놓아요.' },
  { at: '#panel', text: '조각 15개가 모이면 「고용」 탭에서 첫 <b>건축가</b>를 데려오세요. 건축가는 혼자서, 또는 함께 조형물을 짓습니다.', m: '아래 패널은 손잡이를 끌어 올리고 내릴 수 있어요. 조각 15개가 모이면 「고용」 탭에서 첫 <b>건축가</b>를 데려오세요.', wait: (s) => s.archs.length >= 1 },
  { at: '#cv', text: '건축가를 <b>클릭</b>하면 쓰다듬고, <b>끌면</b> 들어 올립니다. 짓고 있는 곳 근처에 내려놓으면 거들어요.', m: '건축가를 <b>톡</b> 누르면 쓰다듬고, <b>꾹 누른 채 끌면</b> 들어 올립니다. 짓고 있는 곳 근처에 내려놓으면 거들어요.' },
  { at: '#cv', text: '짓는 중인 건축물의 <b>빈칸</b>에 마우스를 올리면 칸이 깜빡입니다. 그 칸을 클릭하면 직접 채울 수 있어요.', m: '짓는 중인 건축물의 <b>빈칸</b>을 누르면 그 칸을 직접 채웁니다. 손가락이 조금 빗나가도 가장 가까운 빈칸을 찾아 줘요. 빈 땅을 <b>꾹 누르면</b> 부탁 메뉴가 열립니다.' },
  { at: '#tabs', text: '「이정표」 탭의 조건을 채우면 이정표를 세울 수 있어요. 이정표는 절대 사라지지 않고 새 기능을 엽니다. 즐거운 건축 되세요!' },
];
// 안내서: 새 기능이 열리는 순간 짧게 설명합니다. 다 본 장은 설정 → 안내서에서 다시 볼 수 있습니다.
T.GUIDES = [
  { id: 'slots', title: '자리', icon: 'house', when: (s) => s.archs.length >= 3 && s.ms <= 1, pages: [
    { at: '.capbox', tab: 'arch', text: '세계에는 건축가가 지낼 <b>자리</b>가 정해져 있습니다. 자리가 차면 더 고용할 수 없어요.' },
    { at: '.capbox', tab: 'arch', text: '대신 한 명 한 명을 <b>레벨업</b>해서 키우세요. 이정표를 세울 때마다 자리가 늘어납니다.' } ] },
  { id: 'bp', title: '설계도', icon: 'grid', when: (s) => s.ms >= 1, pages: [
    { at: '.bpgrid', tab: 'bp', text: '설계도를 펼치면 건축가들이 힘을 모아 짓습니다. 단계가 오를수록 <b>확실히 커지고</b> 보상도 커집니다.' },
    { at: '#cv', text: '짓는 중에는 <b>빈칸을 클릭</b>해 직접 채울 수 있습니다. 완공하면 도감에 남아 영원한 <b>명성</b>이 됩니다.' } ] },
  { id: 'l1', title: '재구성과 공방', icon: 'up', when: (s) => s.flags.l1Done >= 1, pages: [
    { at: '.tab[data-name="공방"]', tab: 'v', text: '재구성으로 얻은 <b>꼭짓점</b>은 공방에서 씁니다. 공방 업그레이드는 다음 재구성에도 남아요.' },
    { at: '#cur', text: '쓰지 않고 모아 둔 꼭짓점도 조각을 조금 늘려 줍니다. 쓸지, 모을지 골라 보세요.' } ] },
  { id: 'l2', title: '다듬기와 해상도', icon: 'chisel', when: (s) => s.flags.l2Done >= 1, pages: [
    { at: '.res-card', tab: 's', text: '석공소의 <b>해상도</b>를 올리면 <b>톡톡</b> 주민이 블록을 더 곱게 다듬습니다. 해상도는 어떤 리셋에도 남아요.' },
    { at: '#cv', text: '설계도마다 <b>도면 해상도</b>가 있습니다. 블록을 다 쌓으면 「골조 완성」, 도면 해상도까지 다듬으면 「완공」이고 그때 보상이 들어옵니다.' },
    { at: '#cv', text: '완공된 건축물을 클릭하면 <b>완성도</b>가 보입니다. 다듬고 칠할수록 완성도가 오르고, 주변 주민이 더 행복해집니다.' } ] },
  { id: 'bulk', title: '일괄 레벨업', icon: 'up', when: (s) => s.ms >= 7 && s.archs.length >= 2, pages: [
    { at: '.bulk', tab: 'people', text: '목표 버튼 하나로 고른 모양의 건축가를 한꺼번에 올립니다. 버튼에 마우스를 올리면 비용이 미리 보여요.' } ] },
  { id: 'buyn', title: '구매 수량', icon: 'two', when: (s) => s.ms >= 8, pages: [
    { at: '#buyn', text: '「구매」 버튼으로 한 번에 살 개수를 고릅니다. ×1, ×5, ×10, ×25, 최대. 버튼은 살 수 있을 만큼 차오르는 게이지예요.', m: '「구매」 버튼을 누를 때마다 한 번에 살 개수가 바뀝니다. ×1, ×5, ×10, ×25, 최대.' } ] },
  { id: 'l3', title: '색과 실험실', icon: 'prism', when: (s) => s.flags.l3Done >= 1, pages: [
    { at: '.tab[data-name="실험실"]', tab: 'p', text: '세상에 색이 생겼습니다. <b>프리즘</b>은 실험실에서 씁니다. 별과 육각 건축가도 이곳에서 열려요.' } ] },
  { id: 'l4', title: '방울과 채색', icon: 'drop', when: (s) => s.flags.l4Done >= 1, pages: [
    { at: '.tab[data-name="아틀리에"]', tab: 'g', text: '<b>방울</b> 주민이 다듬어진 칸을 하나하나 진짜 색으로 칠합니다. 칠한 만큼 조각이 늘고 완성도가 오릅니다.' },
    { at: '.tab[data-name="아틀리에"]', tab: 'g', text: '아틀리에의 <b>섬세한 손길</b>을 사면 작은 조형물도 도면보다 곱게 다듬을 수 있어요.' } ] },
  { id: 'l5', title: '겹과 폴짝', icon: 'layers', when: (s) => s.flags.l5Done >= 1 && (s.zup.layer || 0) >= 1, pages: [
    { at: '#layerw', text: '세상 뒤에 <b>겹</b>이 생겼습니다. 이 버튼이나 <b>Q</b> / <b>E</b>로 보고 있는 겹을 바꿀 수 있어요. 블록과 설계도는 보고 있는 겹에 놓입니다.', m: '세상 뒤에 <b>겹</b>이 생겼습니다. 화살표 버튼으로 보고 있는 겹을 바꿀 수 있어요. 블록과 설계도는 보고 있는 겹에 놓입니다.' },
    { at: '#cv', text: '<b>폴짝</b> 주민은 일이 없는 주민을 비어 있는 겹으로 데려갑니다.' } ] },
  { id: 'l6', title: '마을', icon: 'house', when: (s) => s.era >= 1, pages: [
    { at: '#cv', text: '이제 주민들은 <b>집</b>에서 잡니다. 잠은 <b>수명</b>을 회복합니다. 집이 모자라면 밖에서 자서 수명이 빨리 줄어요.' },
    { at: '#cur', text: '하루가 흐르고 달이 차오릅니다. 가끔 <b>오로라</b>나 <b>일식</b>이 오면 잠시 조각이 세 배가 됩니다.' },
    { at: '.tab[data-name="마을"]', tab: 'town', text: '「마을」 탭에서 다음 <b>시대</b>의 조건을 확인하세요. 조건을 모두 채우면 시대가 바뀝니다.' } ] },
  { id: 'zones', title: '구역', icon: 'grid', when: (s) => s.era >= 1 && s.stats.played > 0 && T.vil && T.vil.population() >= 4, pages: [
    { at: '.zones', tab: 'town', text: '구역을 고르고 바닥을 끌어 칠하면 그곳에는 구역에 맞는 건축물만 지어집니다. 빽빽한 곳을 칠하면 안 맞는 건축물을 쿵쿵 주민이 치우고 다시 지어요.' } ] },
  { id: 'family', title: '가족과 일꾼', icon: 'baby', when: (s) => s.ms >= 18, pages: [
    { at: '#cv', text: '집에 둘 이상 살면 밤에 <b>아기</b>가 태어납니다. 아기는 자라서 <b>일꾼</b>이 되고, 시장과 생산 건축물에서 <b>물자</b>를 만들어요.' } ] },
  { id: 'auto', title: '물자 창고', icon: 'auto', when: (s) => s.ms >= 19, pages: [
    { at: '.tab[data-name="물자"]', tab: 'auto', text: '물자로 고용, 레벨업, 업그레이드를 <b>자동화</b>하고 리셋해도 업그레이드를 지킬 수 있습니다. 자동화는 버튼으로 켜고 끕니다.' } ] },
  { id: 'radial', title: '부탁 메뉴', icon: 'star4', when: (s) => s.stats.clicks > 60 && !s.stats.radial && s.archs.length >= 3, pages: [
    { at: '#cv', text: '<b>오른쪽 버튼을 짧게</b> 누르면 부탁 메뉴가 열립니다. 「모여」, 「춤추기」, 「따라와」… 「모여」 다음 「흩어져」 하면 밤에도 일해요.', m: '빈 땅을 <b>꾹 누르면</b> 부탁 메뉴가 열립니다. 「모여」, 「춤추기」, 「따라와」… 「모여」 다음 「흩어져」 하면 밤에도 일해요.' } ] },
];
