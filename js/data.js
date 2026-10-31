'use strict';
// ─────────────────────────────────────────────────────────────
//  DATA: 밸런스와 콘텐츠는 이 파일에서 조정합니다.
//  ms: 필요한 이정표 수, req: 추가 조건
// ─────────────────────────────────────────────────────────────

T.SHAPES = [
  { id: 'square',   name: '네모',     k: 4, cost: 15,   growth: 5.0, value: 1,    cd: 3, ring: 9, start: 4,
    gray: '#d4d4d1', color: '#e8b86d', motifs: ['poly', 'arch', 'zigg'],
    names: ['두부', '모찌', '깍두기', '주사위', '각설탕', '단추', '큐브', '벽돌이', '콩', '먼지', '카라멜', '버터', '쿠키', '타일'] },
  { id: 'triangle', name: '세모',     k: 3, cost: 3e3,  growth: 5.5, value: 14,   cd: 4, ring: 10, start: 9,
    gray: '#b9b9b6', color: '#df7a5e', motifs: ['poly', 'hexagram', 'petal'],
    names: ['삼각김밥', '뾰족이', '피라', '산', '세세', '나초', '트리', '모서리', '텐트'] },
  { id: 'circle',   name: '동그라미', k: 6, cost: 4e5,  growth: 6.0, value: 220,  cd: 4, ring: 8, start: 15,
    gray: '#a3a3a0', color: '#8fb996', motifs: ['circle', 'petal', 'rays'],
    names: ['방울토마토', '구슬', '동동', '경단', '완두', '보름', '도토리', '마카롱', '단팥'] },
  { id: 'pentagon', name: '오각',     k: 5, cost: 8e7,  growth: 6.5, value: 3500, cd: 4, ring: 11, start: 22,
    gray: '#8c8c89', color: '#6c96c4', motifs: ['poly', 'star', 'petal'],
    names: ['오각이', '펜타', '축구공', '오디', '다섯', '집게', '연필', '오월'] },
  { id: 'star',     name: '별',       k: 5, cost: 2e10, growth: 7.0, value: 6e4,  cd: 4, ring: 12, start: 30,
    gray: '#dcdcd9', color: '#b49ad8', motifs: ['star', 'rays', 'petal8'],
    names: ['반짝', '샛별', '혜성', '유성', '별사탕', '은하', '북극성', '루미'] },
  { id: 'hexagon',  name: '육각',     k: 6, cost: 6e12, growth: 7.5, value: 1e6,  cd: 4, ring: 10, start: 38,
    gray: '#7b7b78', color: '#5fbfb6', motifs: ['poly', 'hexagram', 'petal'],
    names: ['벌집', '눈송이', '흑연', '너트', '육육', '결정', '육각정'] },
];
T.SHAPE = {};
T.SHAPES.forEach((s, i) => { s.index = i; T.SHAPE[s.id] = s; });
T.PLAYER_COLOR = { gray: '#6f6f6c', color: '#3d405b' };

const pw = Math.pow;

// ── 작업장 (조각) ───────────────────────────────────────────
T.UP0 = [
  { id: 'solid', name: '단단한 블럭', icon: '▣', max: 60, ms: 0,
    cost: (l) => 25 * pw(1.8, l), desc: (l) => `모든 블럭 기본가치 +1 (현재 +${l})` },
  { id: 'quick', name: '날렵한 손', icon: '⏱', max: 15, ms: 0,
    cost: (l) => 60 * pw(2.4, l), desc: (l) => `건축가 쿨타임 8% 감소 (현재 ×${pw(0.92, l).toFixed(2)})` },
  { id: 'hand', name: '손재주', icon: '✋', max: 40, ms: 0,
    cost: (l) => 40 * pw(3.2, l), desc: (l) => `클릭 블럭 가치 ×2 (현재 ×${T.fmt(pw(2, l))})` },
  { id: 'tap', name: '손놀림', icon: '☝', max: 10, ms: 1,
    cost: (l) => 200 * pw(3, l), desc: (l) => `클릭 쿨타임 12% 감소 (현재 ${T.G ? T.G.clickCD().toFixed(2) : '?'}초)` },
  { id: 'walk', name: '종종걸음', icon: '≫', max: 8, ms: 1,
    cost: (l) => 120 * pw(2.3, l), desc: (l) => `걷기 속도 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'arm', name: '긴 팔', icon: '↗', max: 8, ms: 1,
    cost: (l) => 220 * pw(2.6, l), desc: (l) => `던지기 사거리 +35% (현재 ×${(1 + 0.35 * l).toFixed(2)})` },
  { id: 'eye', name: '장인의 눈', icon: '◎', max: 40, ms: 2,
    cost: (l) => 600 * pw(4.5, l), desc: (l) => `판매가치 ×1.5 (현재 ×${T.fmt(pw(1.5, l))})` },
  { id: 'focus', name: '설계 집중', icon: '⌗', max: 5, ms: 2,
    cost: (l) => 900 * pw(3.5, l), desc: (l) => `플레이어 설계도를 먼저 도울 확률 +8% (현재 ${60 + l * 8}%)` },
  { id: 'omen', name: '꼭짓점 예감', icon: '▲', max: 20, ms: 3,
    cost: (l) => 3e5 * pw(6, l), desc: (l) => `재구성 시 꼭짓점 ×1.25 (현재 ×${pw(1.25, l).toFixed(2)})` },
  { id: 'team', name: '협동', icon: '⚇', max: 10, ms: 4,
    cost: (l) => 5e4 * pw(4, l), desc: (l) => `같은 건축물을 함께 짓는 동료 한 명당 쿨타임 4% 감소 (현재 ${l * 4}%)` },
  { id: 'double', name: '두 개씩', icon: '⧉', max: 10, ms: 5,
    cost: (l) => 2e6 * pw(4, l), desc: (l) => `블럭을 2개 던질 확률 +6% (현재 ${l * 6}%)` },
];

// ── 꼭짓점 공방 ─────────────────────────────────────────────
T.UP1 = [
  { id: 'u_triangle', name: '세모 건축가', icon: '△', max: 1, shape: 'triangle', ms: 0,
    cost: () => 3, desc: () => '세모 건축가를 고용할 수 있습니다.' },
  { id: 'bless', name: '기하의 축복', icon: '✦', max: 30, ms: 0,
    cost: (l) => 2 * pw(3, l), desc: (l) => `조각 ×2 (현재 ×${T.fmt(pw(2, l))})` },
  { id: 'memory', name: '기억하는 손', icon: '♥', max: 3, ms: 0,
    cost: (l) => 3 * pw(3, l), desc: (l) => `리셋 후 네모 건축가 ${l + 1}명과 함께 시작 (현재 ${l}명)` },
  { id: 'res', name: '꼭짓점 공명', icon: '▲', max: 20, ms: 4,
    cost: (l) => 10 * pw(4, l), desc: (l) => `꼭짓점 획득 ×1.5 (현재 ×${T.fmt(pw(1.5, l))})` },
  { id: 'legs', name: '긴 다리', icon: '⇄', max: 4, ms: 4,
    cost: (l) => 8 * pw(3, l), desc: (l) => `걷기 속도와 사거리 ×1.5 (현재 ×${pw(1.5, l).toFixed(2)})` },
  { id: 'u_circle', name: '동그라미 건축가', icon: '○', max: 1, shape: 'circle', ms: 4, req: (s) => s.vup.u_triangle,
    cost: () => 40, desc: () => '동그라미 건축가를 고용할 수 있습니다.' },
  { id: 'pet', name: '쓰다듬기 장인', icon: '♡', max: 3, ms: 5,
    cost: (l) => 6 * pw(4, l), desc: (l) => `기분 좋음 지속시간 ×2, 효과 강화 (현재 ${10 * pw(2, l)}초)` },
  { id: 'shelf', name: '설계도 서고', icon: '⌗', max: 2, ms: 5,
    cost: (l) => 30 * pw(6, l), desc: (l) => `동시에 펼칠 수 있는 설계도 +1 (현재 ${1 + l}개)` },
  { id: 'lucky', name: '행운의 블럭', icon: '✧', max: 5, ms: 5,
    cost: (l) => 35 * pw(4, l), desc: (l) => `빛나는 블럭(가치 ×25) 확률 +1% (현재 ${l}%)` },
  { id: 'u_pentagon', name: '오각 건축가', icon: '⬠', max: 1, shape: 'pentagon', ms: 6, req: (s) => s.vup.u_circle,
    cost: () => 600, desc: () => '오각 건축가를 고용할 수 있습니다.' },
  { id: 'fund', name: '시작 자금', icon: '◼', max: 6, ms: 6,
    cost: (l) => 12 * pw(3, l), desc: (l) => `리셋 후 조각 ${T.fmt(100 * pw(10, l + 1))}개로 시작` },
];

// ── 프리즘 실험실 ───────────────────────────────────────────
T.UP2 = [
  { id: 'u_star', name: '별 건축가', icon: '☆', max: 1, shape: 'star', ms: 0,
    cost: () => 3, desc: () => '별 건축가를 고용할 수 있습니다.' },
  { id: 'spectrum', name: '스펙트럼', icon: '◆', max: 30, ms: 0,
    cost: (l) => 1 * pw(3, l), desc: (l) => `조각 ×3 (현재 ×${T.fmt(pw(3, l))})` },
  { id: 'refr', name: '굴절률', icon: '▲', max: 20, ms: 0,
    cost: (l) => 2 * pw(3.5, l), desc: (l) => `꼭짓점 획득 ×2 (현재 ×${T.fmt(pw(2, l))})` },
  { id: 'harmony', name: '무지개 조화', icon: '❋', max: 1, ms: 8,
    cost: () => 4, desc: () => '고용한 건축가 종류 하나당 조각 ×1.5' },
  { id: 'keepShapes', name: '형태 기억', icon: '⬠', max: 1, ms: 8,
    cost: () => 5, desc: () => '굴절 후에도 세모, 동그라미, 오각 해금을 유지합니다.' },
  { id: 'u_hexagon', name: '육각 건축가', icon: '⬡', max: 1, shape: 'hexagon', ms: 8, req: (s) => s.pup.u_star,
    cost: () => 25, desc: () => '육각 건축가를 고용할 수 있습니다.' },
  { id: 'light', name: '빛의 투사', icon: '⚡', max: 1, ms: 9,
    cost: () => 8, desc: () => '건축가가 던지는 대신 빛으로 블럭을 즉시 놓습니다.' },
  { id: 'blue', name: '청사진', icon: '⌗', max: 5, ms: 9,
    cost: (l) => 3 * pw(3, l), desc: (l) => `건축물 완공 보상 ×2 (현재 ×${pw(2, l)})` },
  { id: 'dawn', name: '이른 새벽', icon: '☀', max: 1, ms: 9,
    cost: () => 6, desc: () => '리셋 후 Lv5 네모 건축가 2명과 함께 시작' },
];

// ── 아틀리에 (안료) ─────────────────────────────────────────
T.UP3 = [
  { id: 'painter', name: '방울 고용', icon: '●', max: 8, ms: 0,
    cost: (l) => 1 * pw(2.5, l), desc: (l) => `채색 펫 방울 +1 (현재 ${l + 1}마리)` },
  { id: 'brush', name: '큰 붓', icon: '✎', max: 15, ms: 0,
    cost: (l) => 2 * pw(2.4, l), desc: (l) => `한 번에 칠하는 블럭 수 ×1.6 (현재 ${Math.round(5 * pw(1.6, l))}개)` },
  { id: 'stroke', name: '빠른 붓질', icon: '≈', max: 10, ms: 0,
    cost: (l) => 2 * pw(2.8, l), desc: (l) => `붓질 간격 15% 감소 (현재 ${(2.5 * pw(0.85, l)).toFixed(2)}초)` },
  { id: 'dense', name: '안료 농도', icon: '◍', max: 30, ms: 0,
    cost: (l) => 3 * pw(3, l), desc: (l) => `채색 판매 가치 ×2 (현재 ×${T.fmt(4 * pw(2, l))})` },
  { id: 'prismX', name: '빛의 안료', icon: '◆', max: 20, ms: 11,
    cost: (l) => 4 * pw(3.5, l), desc: (l) => `프리즘 획득 ×2 (현재 ×${T.fmt(pw(2, l))})` },
  { id: 'all', name: '팔레트의 은총', icon: '✺', max: 30, ms: 11,
    cost: (l) => 5 * pw(4, l), desc: (l) => `조각 ×5 (현재 ×${T.fmt(pw(5, l))})` },
  { id: 'keepPrism', name: '프리즘 각인', icon: '◇', max: 1, ms: 11,
    cost: () => 10, desc: () => '물들임 후에도 별, 육각 해금과 형태 기억을 유지' },
];

// ── 등불 회관 (정착) ───────────────────────────────────────
T.UP4 = [
  { id: 'life', name: '오래오래', icon: '♥', max: 10, ms: 0,
    cost: (l) => 1 * pw(2.2, l), desc: (l) => `건축가 수명 +40% (현재 ×${(1 + 0.4 * l).toFixed(1)})` },
  { id: 'lshard', name: '등불 아래서', icon: '◼', max: 30, ms: 0,
    cost: (l) => 1 * pw(3, l), desc: (l) => `조각 ×10 (현재 ×${T.fmt(pw(10, l))})` },
  { id: 'demo', name: '철거반', icon: '⚒', max: 4, ms: 0,
    cost: (l) => 2 * pw(3, l), desc: (l) => `철거 펫 망치 +1 (현재 ${l + 1}마리)` },
  { id: 'nap', name: '포근한 이불', icon: '☾', max: 5, ms: 0,
    cost: (l) => 2 * pw(2.5, l), desc: (l) => `잠잘 때 수명 회복 ×1.5 (현재 ×${pw(1.5, l).toFixed(2)})` },
  { id: 'aura', name: '넓은 광장', icon: '◌', max: 5, ms: 13,
    cost: (l) => 4 * pw(3, l), desc: (l) => `건축물 행복 범위 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'roomy', name: '다락방', icon: '⌂', max: 3, ms: 13,
    cost: (l) => 6 * pw(4, l), desc: (l) => `집마다 거주 인원 +1 (현재 +${l})` },
  { id: 'birth', name: '요람', icon: '◡', max: 5, ms: 13,
    cost: (l) => 5 * pw(3, l), desc: (l) => `아기가 생길 확률과 자라는 속도 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
  { id: 'lantern', name: '등불 잇기', icon: '✹', max: 20, ms: 15,
    cost: (l) => 10 * pw(4, l), desc: (l) => `등불 획득 ×1.5 (현재 ×${T.fmt(pw(1.5, l))})` },
  { id: 'keepPig', name: '물감 상자', icon: '●', max: 1, ms: 15,
    cost: () => 25, desc: () => '정착 후에도 아틀리에 업그레이드를 유지' },
];

// ── 물자 (생산 & 자동화) ───────────────────────────────────
T.UP5 = [
  { id: 'a_hire', name: '자동 고용', icon: '⟳', max: 1, auto: true, ms: 0,
    cost: () => 60, desc: () => '살 수 있는 가장 싼 건축가를 자동으로 고용합니다.' },
  { id: 'a_level', name: '자동 레벨업', icon: '⟳', max: 1, auto: true, ms: 0,
    cost: () => 150, desc: () => '가장 싼 건축가 레벨업을 자동으로 합니다.' },
  { id: 'a_up0', name: '작업장 자동화', icon: '⟳', max: 1, auto: true, ms: 0,
    cost: () => 400, desc: () => '작업장 업그레이드를 자동으로 삽니다.' },
  { id: 'm_work', name: '튼튼한 앞치마', icon: '⚒', max: 20, ms: 0,
    cost: (l) => 20 * pw(2.6, l), desc: (l) => `일꾼 생산량 ×1.5 (현재 ×${T.fmt(pw(1.5, l))})` },
  { id: 'm_shard', name: '마을 장터', icon: '◼', max: 30, ms: 0,
    cost: (l) => 30 * pw(3, l), desc: (l) => `조각 ×25 (현재 ×${T.fmt(pw(25, l))})` },
  { id: 'a_up1', name: '공방 자동화', icon: '⟳', max: 1, auto: true, ms: 15,
    cost: () => 2500, desc: () => '꼭짓점 공방 업그레이드를 자동으로 삽니다.' },
  { id: 'a_vert', name: '꼭짓점 채굴', icon: '▲', max: 10, ms: 15,
    cost: (l) => 4000 * pw(4, l), desc: (l) => `재구성하지 않아도 매초 재구성 획득량의 ${l}%를 얻습니다.` },
  { id: 'm_cd', name: '박자 맞추기', icon: '♪', max: 10, ms: 15,
    cost: (l) => 3000 * pw(3, l), desc: (l) => `건축가 쿨타임 6% 감소 (현재 ×${pw(0.94, l).toFixed(2)})` },
  { id: 'a_up2', name: '실험실 자동화', icon: '⟳', max: 1, auto: true, ms: 16,
    cost: () => 3e4, desc: () => '프리즘 실험실 업그레이드를 자동으로 삽니다.' },
  { id: 'a_prism', name: '프리즘 증류', icon: '◆', max: 10, ms: 16,
    cost: (l) => 5e4 * pw(5, l), desc: (l) => `굴절하지 않아도 매초 굴절 획득량의 ${(l * 0.5).toFixed(1)}%를 얻습니다.` },
  { id: 'a_up3', name: '아틀리에 자동화', icon: '⟳', max: 1, auto: true, ms: 16,
    cost: () => 1.5e5, desc: () => '아틀리에 업그레이드를 자동으로 삽니다.' },
  { id: 'm_life', name: '약초 정원', icon: '♣', max: 10, ms: 16,
    cost: (l) => 2e4 * pw(3, l), desc: (l) => `건축가 수명 +30% (현재 ×${(1 + 0.3 * l).toFixed(1)})` },
];

// ── 이정표 (마일스톤 리셋 레이어: 다른 리셋에 지워지지 않음) ──
// 이정표를 세우면 이번 회차(조각, 작업장, 레벨)가 초기화되고 영구 보상을 얻습니다.
const runStructs = (s, tier) => s.run.built.filter((t) => t >= tier).length;
T.MILESTONES = [
  { name: '주춧돌', need: '이번 회차 건축가 3명', prog: (s) => [s.archs.length, 3],
    reward: '조각 ×1.5, 작업장에 손놀림, 종종걸음, 긴 팔' },
  { name: '첫 조형물들', need: '이번 회차 조형물 4개 완공', prog: (s) => [s.run.built.length, 4],
    reward: '중형 조형물 해금, 장인의 눈, 설계 집중' },
  { name: '작은 무리', need: '이번 회차 건축가 5명과 조각 5만', prog: (s) => [Math.min(s.archs.length / 5, s.runEarned / 5e4), 1], frac: true,
    reward: '재구성 레이어가 보입니다. 조각 ×2' },
  { name: '모서리의 기억', need: '재구성 1회', prog: (s) => [s.flags.l1Done, 1],
    reward: '대형 조형물 해금, 꼭짓점 예감, 공방 확장' },
  { name: '탑을 세우다', need: '이번 회차 대형 조형물 1개 완공', prog: (s) => [runStructs(s, 2), 1],
    reward: '클릭 쿨타임 30% 감소, 협동, 공방 확장' },
  { name: '도형의 친구들', need: '세모 2명과 동그라미 1명', prog: (s) => [Math.min(cnt(s, 'triangle') / 2, cnt(s, 'circle')), 1], frac: true,
    reward: '꼭짓점 ×1.5, 두 개씩, 공방 확장' },
  { name: '굴절의 징조', need: '꼭짓점 누적 200', prog: (s) => [s.stats.lifeVerts, 200],
    reward: '굴절 레이어가 보입니다.' },
  { name: '첫 색', need: '굴절 1회', prog: (s) => [s.flags.l2Done, 1],
    reward: '조각 ×3, 실험실 확장' },
  { name: '다섯 모양', need: '별 건축가 1명', prog: (s) => [cnt(s, 'star'), 1],
    reward: '프리즘 ×1.5, 실험실 확장' },
  { name: '물감 냄새', need: '프리즘 누적 25', prog: (s) => [s.stats.lifePrisms, 25],
    reward: '물들임 레이어가 보입니다.' },
  { name: '방울의 노래', need: '물들임 1회', prog: (s) => [s.flags.l3Done, 1],
    reward: '조각 ×5, 아틀리에 확장' },
  { name: '정착의 꿈', need: '안료 누적 15와 이번 회차 대형 조형물 2개', prog: (s) => [Math.min(s.stats.lifePigments / 15, runStructs(s, 2) / 2), 1], frac: true,
    reward: '정착 레이어가 보입니다.' },
  { name: '첫 마을', need: '정착 1회', prog: (s) => [s.flags.l4Done, 1],
    reward: '연대기와 구역, 등불 ×1.5' },
  { name: '가족', need: '인구 8', prog: (s) => [T.vil ? T.vil.population() : 0, 8],
    reward: '아기와 일꾼, 물자, 등불 회관 확장' },
  { name: '자동화의 씨앗', need: '물자 누적 50', prog: (s) => [s.stats.lifeGoods, 50],
    reward: '자동화 탭이 열립니다.' },
  { name: '두 번째 시대', need: '시대: 돌담 마을', prog: (s) => [s.era, 2],
    reward: '등불 ×2, 공방 자동화, 꼭짓점 채굴' },
  { name: '장원의 종', need: '시대: 장원', prog: (s) => [s.era, 3],
    reward: '실험실과 아틀리에 자동화, 프리즘 증류' },
  { name: '성읍의 깃발', need: '시대: 중세 성읍', prog: (s) => [s.era, 4],
    reward: '조각 ×100, 크레딧' },
];
function cnt(s, id) { let n = 0; for (const a of s.archs) if (a.s === id) n++; return n; }

// 이정표 보상 배율
T.msShardMult = (n) => (n > 0 ? 1.5 : 1) * (n > 2 ? 2 : 1) * (n > 7 ? 3 : 1) * (n > 10 ? 5 : 1) * (n > 17 ? 100 : 1);

// ── 연대기 (정착 후 열리는 세부 리셋 레이어) ────────────────
// 시대를 넘기려면 모든 조건을 동시에 채워야 합니다.
T.ERA_REQ = [
  null,
  null,
  [ // → 돌담 마을
    { text: '인구', cur: (s) => T.vil.population(), need: 8 },
    { text: '완공한 집', cur: (s) => T.vil.countCat('house'), need: 3 },
    { text: '공원 건축물', cur: (s) => T.vil.countCat('park'), need: 3 },
    { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 12 },
  ],
  [ // → 장원
    { text: '인구', cur: (s) => T.vil.population(), need: 14 },
    { text: '시장, 생산 건축물', cur: (s) => T.vil.countCat('market') + T.vil.countCat('prod'), need: 4 },
    { text: '평균 행복', cur: (s) => T.vil.avgHappy(), need: 0.6, frac: true },
    { text: '이번 시대 물자 누적', cur: (s) => s.eraGoods, need: 400 },
  ],
  [ // → 중세 성읍
    { text: '인구', cur: (s) => T.vil.population(), need: 22 },
    { text: '예배당', cur: (s) => T.vil.countId('chapel'), need: 1 },
    { text: '돌다리', cur: (s) => T.vil.countId('bridge'), need: 1 },
    { text: '대형 건축물', cur: (s) => T.vil.countTier(4), need: 3 },
    { text: '이번 시대 등불 누적', cur: (s) => s.eraLanterns, need: 400 },
  ],
];

// ── 구역 ───────────────────────────────────────────────────
T.ZONES = {
  home: { name: '주거', color: '#e8b86d', gray: '#9a9a97', cats: ['house'], fill: ['park', 'deco'], era: 1 },
  park: { name: '공원', color: '#72b35c', gray: '#8a8a87', cats: ['park', 'sculpture'], fill: ['deco'], era: 1 },
  market: { name: '시장', color: '#d64545', gray: '#7a7a77', cats: ['market'], fill: ['deco', 'park'], era: 2 },
  prod: { name: '생산', color: '#8c6a4a', gray: '#6e6e6b', cats: ['prod'], fill: ['deco'], era: 2 },
  civic: { name: '광장', color: '#8e7cc3', gray: '#858582', cats: ['civic', 'park'], fill: ['deco', 'water'], era: 3 },
  water: { name: '물가', color: '#5aa9d6', gray: '#7f7f7c', cats: ['water'], fill: ['park'], era: 3 },
};

T.CODES = {
  ROSETTE: '장미창: 건축가들이 하늘에 오래된 기하학 무늬를 짓기 시작합니다.',
  장미창: 'ROSETTE',
  PARADE: '행진: 모두 한 줄로 걷습니다.',
  CREDITS: '크레딧',
  HELLO: '모두가 손을 흔듭니다.',
};
