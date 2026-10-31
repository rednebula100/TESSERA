'use strict';
// ─────────────────────────────────────────────────────────────
//  CATALOG: 건축가들이 짓는 모든 건축물
//  tier: 0 소형 조형물, 1 중형 조형물, 2 대형 조형물, 3 건축물, 4 대형 건축물, 5 랜드마크
//  era : 0 원시(정착 전), 1 움집 마을, 2 돌담 마을, 3 장원, 4 중세 성읍
//  cat : sculpture 조형물, house 집, park 공원, market 시장, prod 생산, civic 공공, water 물, deco 장식
// ─────────────────────────────────────────────────────────────
(function () {
  const G = T.Grid;
  const RI = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  T.TIERS = [
    { name: '소형 조형물', mult: 6, aura: 0.06, radius: 90 },
    { name: '중형 조형물', mult: 16, aura: 0.12, radius: 140 },
    { name: '대형 조형물', mult: 45, aura: 0.22, radius: 220 },
    { name: '건축물', mult: 90, aura: 0.16, radius: 180 },
    { name: '대형 건축물', mult: 240, aura: 0.32, radius: 300 },
    { name: '랜드마크', mult: 700, aura: 0.6, radius: 480 },
  ];
  T.ERAS = [
    { name: '원시', sub: '이름 없는 돌들의 시대', floor: 'stone' },
    { name: '움집 마을', sub: '처음으로 지붕을 얹다', floor: 'grass' },
    { name: '돌담 마을', sub: '돌을 쌓아 벽을 세우다', floor: 'path' },
    { name: '장원', sub: '물길을 끌고 다리를 놓다', floor: 'cobble' },
    { name: '중세 성읍', sub: '종소리가 성벽을 넘다', floor: 'town' },
  ];
  T.CATS = {
    sculpture: { name: '조형물', icon: '◆' },
    house: { name: '집', icon: '⌂' },
    park: { name: '공원', icon: '♣' },
    market: { name: '시장', icon: '⚑' },
    prod: { name: '생산', icon: '⚒' },
    civic: { name: '공공', icon: '♜' },
    water: { name: '물', icon: '≈' },
    deco: { name: '장식', icon: '✦' },
  };

  // painted colours. The unpainted colour is a desaturated version of this.
  T.CELL = {
    '#': '#ece2cc', s: '#cfc6b6', k: '#8c8377', x: '#5b4636', w: '#b07c50', '=': '#c4543a', h: '#d8b257',
    o: '#a6d8ea', d: '#7a4a2c', l: '#72b35c', L: '#4e8b45', t: '#7b5537', f: '#f08aa8', F: '#ffd166',
    a: '#5aa9d6', m: '#56606b', y: '#ffcf5a', r: '#d64545', c: '#f6f0e4', g: '#e2b23c', b: '#b8664a',
    p: '#aaa39a', e: '#2b2b2b', v: '#8e7cc3',
  };
  T.GLOW = { y: 1, o: 0.55 };

  const D = [];
  const def = (o) => { D.push(o); return o; };

  // ── 원시 · 소형 ─────────────────────────────────────────
  def({ id: 'cairn', name: '돌탑', tier: 0, era: 0, cat: 'sculpture', note: '돌 하나를 올릴 때마다 소원 하나.',
    gen(rng) { const g = new G(9, 12); const w = RI(rng, 2, 3); let r = 0, half = w, lv = 0; while (half >= 0) { const h = RI(rng, 1, 2); g.rect(4 - half, r, 4 + half, r + h - 1, lv % 2 ? 's' : 'k'); r += h; lv++; half -= rng() < 0.5 ? 1 : 0; if (r > 7) break; if (rng() < 0.4) half--; } g.set(4, r, 's'); return g; } });
  def({ id: 'menhir', name: '선돌', tier: 0, era: 0, cat: 'sculpture', note: '왜 세웠는지는 아무도 모른다. 그래서 더 멋지다.',
    gen(rng) { const g = new G(4, 10); const h = RI(rng, 6, 9); g.rect(0, 0, 2, h - 2, 'k'); g.rect(0, h - 1, 1, h - 1, 'k'); for (let i = 0; i < 3; i++) g.set(RI(rng, 0, 2), RI(rng, 0, h - 3), 'L'); return g; } });
  def({ id: 'totem', name: '토템', tier: 0, era: 0, cat: 'sculpture', note: '얼굴이 셋. 셋 다 웃고 있다.',
    gen(rng) { const g = new G(7, 11); const n = RI(rng, 2, 3); for (let i = 0; i < n; i++) { const r = i * 3; g.rect(2, r, 4, r + 2, i % 2 ? 'w' : 'b'); g.set(2, r + 1, 'e'); g.set(4, r + 1, 'e'); } const top = n * 3; g.rect(0, top, 6, top, 'r'); g.rect(1, top + 1, 5, top + 1, 'g'); g.set(3, top + 2, 'g'); return g; } });
  def({ id: 'mushroom', name: '버섯 조각', tier: 0, era: 0, cat: 'sculpture', note: '먹을 수는 없다. 건축가들이 여러 번 확인했다.',
    gen(rng) { const g = new G(9, 8); const s = RI(rng, 3, 4); g.rect(3, 0, 5, s - 1, 'c'); g.blob(4, s + 1, 4, 1.8, '=', null); for (let i = 0; i < 4; i++) g.set(RI(rng, 1, 7), s + RI(rng, 0, 2), 'c'); return g; } });
  def({ id: 'statue_s', name: '네모 석상', tier: 0, era: 0, cat: 'sculpture', note: '누구를 닮았는지는 다들 알고 있다.',
    gen() { const g = new G(7, 8); g.rect(0, 0, 6, 0, 'k'); g.rect(1, 1, 5, 5, 's'); g.set(2, 4, 'e'); g.set(4, 4, 'e'); g.set(1, 3, 'f'); g.set(5, 3, 'f'); g.set(3, 3, 'e'); g.set(3, 6, 'k'); g.set(3, 7, 'l'); g.set(2, 7, 'l'); return g; } });
  def({ id: 'pot', name: '화분', tier: 0, era: 0, cat: 'sculpture', note: '흙은 없는데 꽃은 핀다.',
    gen(rng) { const g = new G(7, 8); g.rect(2, 0, 4, 0, 'b'); g.rect(1, 1, 5, 2, 'b'); g.blob(3, 4.5, 2.5, 2, 'l', rng, 0.4); for (let i = 0; i < 3; i++) g.set(RI(rng, 1, 5), RI(rng, 4, 6), pick(rng, ['f', 'F'])); return g; } });
  def({ id: 'signpost', name: '이정표', tier: 0, era: 0, cat: 'sculpture', note: '화살표가 가리키는 쪽에는 또 다른 이정표가 있다.',
    gen(rng) { const g = new G(7, 8); g.rect(3, 0, 3, 6, 'w'); g.rect(1, 5, 6, 5, 'w'); g.set(6, 5, 'x'); g.rect(0, 3, 4, 3, 'w'); g.set(0, 3, 'x'); return g; } });
  def({ id: 'bench', name: '돌 의자', tier: 0, era: 0, cat: 'sculpture', note: '앉으면 엉덩이가 차갑다.',
    gen() { const g = new G(7, 4); g.set(0, 0, 'k'); g.set(6, 0, 'k'); g.rect(0, 1, 6, 1, 's'); g.rect(0, 2, 0, 3, 'k'); g.rect(1, 3, 6, 3, 's'); return g; } });
  def({ id: 'minipyramid', name: '작은 피라미드', tier: 0, era: 0, cat: 'sculpture', note: '꼭대기 금색 블럭은 서로 놓겠다고 싸웠다.',
    gen() { const g = new G(7, 4); for (let r = 0; r < 4; r++) g.rect(r, r, 6 - r, r, r === 3 ? 'g' : r % 2 ? 's' : '#'); return g; } });
  def({ id: 'stonelamp', name: '석등', tier: 0, era: 0, cat: 'sculpture', note: '불을 켜는 법은 아직 모른다. 그래도 켜져 있다.',
    gen() { const g = new G(7, 8); g.rect(1, 0, 5, 0, 'k'); g.rect(2, 1, 4, 3, 's'); g.rect(1, 4, 5, 5, 's'); g.set(3, 5, 'y'); g.set(3, 4, 'y'); g.rect(0, 6, 6, 6, 'k'); g.rect(2, 7, 4, 7, 'k'); return g; } });

  // ── 원시 · 중형 ─────────────────────────────────────────
  def({ id: 'dolmen', name: '고인돌', tier: 1, era: 0, cat: 'sculpture', note: '돌 두 개가 큰 돌 하나를 들고 있다. 힘들어 보인다.',
    gen(rng) { const g = new G(13, 8); g.rect(1, 0, 3, 5, 'k'); g.rect(9, 0, 11, 5, 'k'); g.rect(0, 6, 12, 7, 's'); g.set(12, 7, '.'); g.set(0, 7, '.'); for (let i = 0; i < 4; i++) g.set(RI(rng, 0, 12), RI(rng, 6, 7), 'L'); return g; } });
  def({ id: 'obelisk', name: '오벨리스크', tier: 1, era: 0, cat: 'sculpture', note: '하늘이 얼마나 높은지 재기 위한 가느다란 자.',
    gen(rng) { const g = new G(9, 16); g.rect(0, 0, 8, 1, 'k'); g.rect(1, 2, 7, 2, 'k'); g.rect(3, 3, 5, 13, 's'); for (let r = 4; r < 13; r += 2) g.set(4, r, rng() < 0.5 ? 'e' : 's'); g.set(4, 14, 'g'); g.set(3, 14, 'g'); g.set(5, 14, 'g'); g.set(4, 15, 'g'); return g; } });
  def({ id: 'archgate', name: '아치문', tier: 1, era: 0, cat: 'sculpture', note: '건너편이 보이는 문. 지나갈 때마다 고개를 든다.',
    gen() { const g = new G(11, 11); g.rect(0, 0, 10, 9, 's'); g.arch(5, 0, 2.6, 4, '.'); g.rect(0, 10, 10, 10, 'k'); g.set(5, 8, 'g'); g.rect(0, 0, 1, 0, 'k'); g.rect(9, 0, 10, 0, 'k'); return g; } });
  def({ id: 'trilithon', name: '거석문', tier: 1, era: 0, cat: 'sculpture', note: '해가 뜨는 날, 그림자가 정확히 가운데로 들어온다.',
    gen(rng) { const g = new G(13, 11); g.rect(1, 0, 3, 8, 'k'); g.rect(9, 0, 11, 8, 'k'); g.rect(0, 9, 12, 10, 's'); for (let i = 0; i < 5; i++) { const c = RI(rng, 0, 12), r = RI(rng, 0, 10); if (g.get(c, r) !== '.') g.set(c, r, 'L'); } return g; } });
  def({ id: 'statue_m', name: '큰 네모 석상', tier: 1, era: 0, cat: 'sculpture', note: '눈이 반짝인다. 건축가들은 이 앞에서 자주 멈춘다.',
    gen() { const g = new G(11, 14); g.rect(0, 0, 10, 1, 'k'); g.rect(1, 2, 9, 2, 'k'); g.rect(2, 3, 3, 3, 'k'); g.rect(7, 3, 8, 3, 'k'); g.rect(1, 4, 9, 11, 's'); g.rect(3, 8, 3, 9, 'e'); g.rect(7, 8, 7, 9, 'e'); g.set(3, 9, 'c'); g.set(7, 9, 'c'); g.rect(2, 6, 3, 6, 'f'); g.rect(7, 6, 8, 6, 'f'); g.set(5, 6, 'e'); g.set(5, 12, 'k'); g.rect(4, 13, 6, 13, 'l'); return g; } });
  def({ id: 'fountain', name: '돌 분수', tier: 1, era: 0, cat: 'sculpture', note: '물은 어디서 오는 걸까. 묻는 건축가는 없다.',
    gen() { const g = new G(13, 10); g.rect(0, 0, 12, 2, 's'); g.rect(1, 2, 11, 2, 'a'); g.rect(5, 3, 7, 6, 's'); g.rect(3, 7, 9, 7, 's'); g.rect(4, 8, 8, 8, 'a'); g.set(6, 9, 'a'); g.set(2, 3, 'a'); g.set(10, 3, 'a'); g.set(3, 4, 'a'); g.set(9, 4, 'a'); return g; } });
  def({ id: 'altar', name: '계단 제단', tier: 1, era: 0, cat: 'sculpture', note: '꼭대기의 불은 꺼진 적이 없다.',
    gen() { const g = new G(13, 8); for (let r = 0; r < 5; r++) g.rect(r, r, 12 - r, r, r % 2 ? 's' : '#'); g.rect(5, 5, 7, 5, 'k'); g.set(6, 6, 'y'); g.set(5, 6, 'r'); g.set(7, 6, 'r'); g.set(6, 7, 'y'); return g; } });
  def({ id: 'watchstone', name: '망루 돌탑', tier: 1, era: 0, cat: 'sculpture', note: '올라가면 멀리 보인다. 올라가는 법은 아직 없다.',
    gen() { const g = new G(9, 16); g.rect(1, 0, 7, 12, 's'); g.rect(0, 13, 8, 13, 'k'); for (let c = 0; c <= 8; c += 2) g.set(c, 14, 'k'); g.set(4, 4, 'e'); g.set(4, 5, 'e'); g.set(4, 9, 'e'); g.set(4, 10, 'e'); g.rect(3, 0, 5, 2, 'd'); return g; } });

  // ── 원시 · 대형 ─────────────────────────────────────────
  def({ id: 'ziggurat', name: '지구라트', tier: 2, era: 0, cat: 'sculpture', note: '계단은 위로 갈수록 좁아진다. 꼭대기 방엔 창이 하나.',
    gen() { const g = new G(23, 20); let r = 0; for (let t = 0; t < 4; t++) { const a = t * 3, b = 22 - t * 3; g.rect(a, r, b, r + 3, t % 2 ? 's' : '#'); g.rect(a, r + 3, b, r + 3, 'k'); r += 4; } g.rect(10, 0, 12, r - 1, 'p'); g.rect(9, r, 13, r + 3, 's'); g.set(11, r + 1, 'o'); g.rect(8, r + 4, 14, r + 4, 'k'); return g; } });
  def({ id: 'colossus', name: '거대 네모 석상', tier: 2, era: 0, cat: 'sculpture', note: '가장 작은 건축가에게 바친다. 크기는 반대지만.',
    gen() { const g = new G(19, 26); g.rect(0, 0, 18, 2, 'k'); g.rect(1, 3, 17, 3, 'k'); g.rect(3, 4, 6, 6, 'k'); g.rect(12, 4, 15, 6, 'k'); g.rect(1, 7, 17, 21, 's'); g.rect(1, 7, 17, 7, 'k'); g.rect(4, 14, 6, 17, 'e'); g.rect(12, 14, 14, 17, 'e'); g.rect(4, 17, 4, 17, 'c'); g.rect(12, 17, 12, 17, 'c'); g.rect(2, 12, 5, 12, 'f'); g.rect(13, 12, 16, 12, 'f'); g.rect(8, 11, 10, 11, 'e'); g.rect(9, 22, 9, 23, 'k'); g.blob(9, 24.5, 3, 1.4, 'l', null); return g; } });
  def({ id: 'pyramid', name: '피라미드', tier: 2, era: 0, cat: 'sculpture', note: '끝이 한 점으로 모인다. 모든 블럭이 그 점을 향해 있다.',
    gen() { const g = new G(25, 13); for (let r = 0; r < 13; r++) g.rect(r, r, 24 - r, r, r === 12 ? 'g' : r % 3 === 2 ? 's' : '#'); g.rect(11, 0, 13, 2, 'd'); return g; } });
  def({ id: 'henge', name: '거석 원', tier: 2, era: 0, cat: 'sculpture', note: '돌들이 둥글게 서서 무언가를 기다린다.',
    gen(rng) { const g = new G(27, 13); for (const x0 of [0, 10, 20]) { const h = x0 === 10 ? 11 : 9; g.rect(x0 + 1, 0, x0 + 2, h - 2, 'k'); g.rect(x0 + 5, 0, x0 + 6, h - 2, 'k'); g.rect(x0, h - 1, x0 + 7, h, 's'); } g.rect(8, 0, 9, 1, 'k'); g.rect(17, 0, 19, 0, 'k'); for (let i = 0; i < 8; i++) { const c = RI(rng, 0, 26), r = RI(rng, 0, 12); if (g.get(c, r) !== '.') g.set(c, r, 'L'); } return g; } });
  def({ id: 'greattower', name: '큰 석탑', tier: 2, era: 0, cat: 'sculpture', note: '층마다 처마가 넓어진다. 바람이 불면 처마 끝이 운다.',
    gen() { const g = new G(15, 25); let r = 0; for (let t = 0; t < 5; t++) { const half = 5 - t; g.rect(7 - half, r, 7 + half, r + 2, 's'); g.set(7, r + 1, 'o'); g.rect(7 - half - 2, r + 3, 7 + half + 2, r + 3, '='); r += 4; } g.rect(7, r, 7, r + 3, 'g'); g.rect(6, r + 1, 8, r + 1, 'g'); return g; } });

  // ── 1 움집 마을 ─────────────────────────────────────────
  def({ id: 'hut', name: '움집', tier: 3, era: 1, cat: 'house', cap: 2, note: '처음으로 얹은 지붕. 비가 와도 이제 괜찮다.',
    gen(rng) { const w = pick(rng, [13, 15]); const g = new G(w, 13); const m = (w - 1) / 2; g.rect(1, 0, w - 2, 2, 'w'); g.rect(m - 1, 0, m + 1, 2, 'd'); let a = 0, b = w - 1, r = 3; while (a <= b) { g.rect(a, r, b, r, 'h'); if (r % 3 === 0) { g.set(a, r, 'w'); g.set(b, r, 'w'); } a++; b--; r++; } g.set(m, r - 1, 'x'); g.set(m, r, 'x'); return g; } });
  def({ id: 'longhut', name: '큰 움집', tier: 3, era: 1, cat: 'house', cap: 4, note: '한 지붕 아래 넷이 산다. 코 고는 소리도 넷.',
    gen() { const g = new G(21, 12); g.rect(1, 0, 19, 3, 'w'); g.rect(4, 0, 5, 2, 'd'); g.rect(15, 0, 16, 2, 'd'); g.set(10, 2, 'o'); g.set(10, 1, 'o'); let a = 0, b = 20, r = 4; while (b - a > 2) { g.rect(a, r, b, r, 'h'); a += 1; b -= 1; r++; if (r > 10) break; } g.rect(a, r, b, r, 'x'); return g; } });
  def({ id: 'campfire', name: '모닥불', tier: 0, era: 1, cat: 'park', visit: true, note: '밤이면 다들 여기 모여 앉는다.',
    gen() { const g = new G(7, 5); g.rect(0, 0, 6, 0, 'k'); g.rect(1, 1, 5, 1, 'w'); g.set(2, 2, 'r'); g.set(3, 2, 'y'); g.set(4, 2, 'r'); g.set(3, 3, 'y'); g.set(2, 3, 'y'); g.set(3, 4, 'r'); return g; } });
  def({ id: 'tree', name: '나무', tier: 0, era: 1, cat: 'park', note: '심은 적이 없는데 자랐다. 건축가들은 블럭이라고 우긴다.',
    gen(rng) { const g = new G(11, 14); const th = RI(rng, 3, 5); g.rect(5, 0, 5, th, 't'); if (rng() < 0.5) g.set(4, 0, 't'); const rx = RI(rng, 3, 5), ry = RI(rng, 3, 4); g.blob(5, th + ry, rx, ry, 'l', rng, 0.35); g.paintIf((c, r, ch) => ch === 'l' && (c < 5 - rx / 2 || r < th + ry - 1) && rng() < 0.6 ? 'L' : null); if (rng() < 0.4) for (let i = 0; i < 3; i++) { const c = RI(rng, 2, 8), r = RI(rng, th + 1, th + ry * 2); if (g.get(c, r) !== '.') g.set(c, r, 'r'); } return g; } });
  def({ id: 'bush', name: '덤불', tier: 0, era: 1, cat: 'park', note: '안에 무언가 살고 있다. 아마도.',
    gen(rng) { const g = new G(9, 5); g.blob(4, 1.2, RI(rng, 3, 4), 2.2, 'l', rng, 0.4); g.paintIf((c, r) => (r === 0 && rng() < 0.6 ? 'L' : null)); for (let i = 0; i < 3; i++) { const c = RI(rng, 1, 7), r = RI(rng, 1, 3); if (g.get(c, r) !== '.') g.set(c, r, pick(rng, ['f', 'F'])); } return g; } });
  def({ id: 'woodpile', name: '장작더미', tier: 0, era: 1, cat: 'deco', note: '겨울은 오지 않지만 준비는 한다.',
    gen() { const g = new G(7, 4); g.rect(0, 0, 6, 0, 'w'); g.rect(0, 1, 5, 1, 'w'); g.rect(1, 2, 5, 2, 'w'); g.rect(2, 3, 4, 3, 'w'); g.paintIf((c, r) => ((c + r) % 3 === 0 ? 'x' : null)); return g; } });
  def({ id: 'fence', name: '울타리', tier: 0, era: 1, cat: 'deco', note: '넘어가지 말라는 뜻은 아니다. 그냥 예뻐서.',
    gen() { const g = new G(10, 4); for (let c = 0; c < 10; c += 3) g.rect(c, 0, c, 3, 'w'); g.rect(0, 1, 9, 1, 'w'); g.rect(0, 3, 9, 3, 'w'); return g; } });
  def({ id: 'totempole', name: '마을 토템', tier: 1, era: 1, cat: 'park', note: '마을의 수호자. 표정이 매일 조금씩 다르다.',
    gen() { const g = new G(9, 16); g.rect(0, 0, 8, 0, 'k'); for (let i = 0; i < 4; i++) { const r = 1 + i * 3; g.rect(3, r, 5, r + 2, i % 2 ? 'w' : 'b'); g.set(3, r + 1, 'e'); g.set(5, r + 1, 'e'); g.set(4, r, 'r'); } g.rect(0, 13, 8, 13, 'r'); g.rect(1, 14, 7, 14, 'g'); g.set(4, 15, 'g'); return g; } });

  // ── 2 돌담 마을 ─────────────────────────────────────────
  def({ id: 'stonehouse', name: '돌집', tier: 3, era: 2, cat: 'house', cap: 3, note: '벽이 두꺼워서 겨울에도 따뜻하다고 한다.',
    gen(rng) { const w = pick(rng, [15, 17]); const g = new G(w, 16); const m = (w - 1) / 2; g.rect(1, 0, w - 2, 6, 's'); g.paintIf((c, r) => ((c * 7 + r * 3) % 5 === 0 ? '#' : null)); g.rect(m - 1, 0, m + 1, 3, 'd'); g.rect(2, 3, 3, 4, 'o'); g.rect(w - 4, 3, w - 3, 4, 'o'); g.rect(0, 7, w - 1, 7, 'k'); const top = g.roof(1, w - 2, 8, '=', 1, 1); g.rect(w - 5, 9, w - 4, top + 1, 'b'); return g; } });
  def({ id: 'well', name: '우물', tier: 1, era: 2, cat: 'park', visit: true, note: '바닥에 동전 대신 블럭이 하나 빠져 있다.',
    gen() { const g = new G(9, 10); g.rect(0, 0, 8, 2, 's'); g.rect(1, 2, 7, 2, 'a'); g.rect(1, 3, 1, 7, 'w'); g.rect(7, 3, 7, 7, 'w'); g.rect(3, 5, 5, 5, 'x'); g.set(4, 4, 'm'); g.roof(1, 7, 8, '=', 1, 1); return g; } });
  def({ id: 'stall', name: '시장 좌판', tier: 3, era: 2, cat: 'market', visit: true, note: '파는 건 블럭. 사는 것도 블럭.',
    gen(rng) { const g = new G(13, 10); g.rect(0, 0, 0, 7, 'w'); g.rect(12, 0, 12, 7, 'w'); g.rect(1, 0, 11, 2, 'w'); g.rect(1, 3, 11, 3, 'x'); for (let c = 1; c <= 11; c++) g.set(c, 4, pick(rng, ['f', 'F', 'r', 'l', 'g'])); for (let c = 0; c <= 12; c++) { g.set(c, 8, c % 2 ? 'r' : 'c'); g.set(c, 9, c % 2 ? 'r' : 'c'); } g.set(-1 + 1, 8, 'r'); return g; } });
  def({ id: 'workshop', name: '공방', tier: 3, era: 2, cat: 'prod', note: '망치 소리가 하루 종일. 그게 노래가 된다.',
    gen() { const g = new G(19, 15); g.rect(1, 0, 17, 7, '#'); g.rect(1, 0, 17, 0, 'k'); g.rect(3, 0, 7, 5, 'd'); g.rect(3, 5, 7, 5, 'x'); g.rect(11, 3, 12, 5, 'o'); g.rect(14, 3, 15, 5, 'o'); g.rect(9, 6, 10, 7, 'g'); g.roof(1, 17, 8, '=', 1, 1); g.rect(14, 9, 15, 13, 'b'); return g; } });
  def({ id: 'bakery', name: '빵집', tier: 3, era: 2, cat: 'prod', visit: true, note: '굽는 건 블럭인데 냄새는 빵 냄새가 난다.',
    gen() { const g = new G(15, 15); g.rect(1, 0, 13, 6, 'b'); g.rect(6, 0, 8, 3, 'd'); g.rect(2, 2, 4, 4, 'o'); g.rect(10, 2, 12, 4, 'o'); g.rect(5, 5, 9, 5, 'F'); g.roof(1, 13, 7, '=', 1, 1); g.rect(2, 8, 3, 13, 'k'); g.set(2, 14, 'c'); return g; } });
  def({ id: 'windmill', name: '풍차', tier: 4, era: 2, cat: 'prod', note: '바람이 없어도 돈다. 건축가들이 밀고 있다.',
    gen() { const g = new G(27, 34); for (let r = 0; r < 20; r++) { const half = Math.round(6 - r * 0.15); g.rect(13 - half, r, 13 + half, r, r % 4 === 0 ? 's' : '#'); } g.rect(12, 0, 14, 3, 'd'); g.set(13, 8, 'o'); g.set(13, 13, 'o'); g.roof(9, 17, 20, '=', 1, 1); const cy = 21, cx = 13; for (let i = -12; i <= 12; i++) { g.set(cx + i, cy + i, Math.abs(i) > 3 ? 'c' : 'w'); g.set(cx + i, cy - i, Math.abs(i) > 3 ? 'c' : 'w'); } g.set(cx, cy, 'x'); return g; } });
  def({ id: 'stonewall', name: '돌담', tier: 0, era: 2, cat: 'deco', note: '키가 딱 건축가 둘만큼.',
    gen(rng) { const g = new G(11, 3); g.rect(0, 0, 10, 2, 's'); g.paintIf(() => (rng() < 0.3 ? 'k' : null)); for (let c = 0; c < 11; c += 2) g.set(c, 3, 's'); return g; } });
  def({ id: 'smalllamp', name: '등잔 기둥', tier: 0, era: 2, cat: 'deco', note: '밤마다 누군가 불을 붙인다.',
    gen() { const g = new G(3, 8); g.rect(1, 0, 1, 5, 'w'); g.rect(0, 6, 2, 6, 'm'); g.set(1, 6, 'y'); g.set(1, 7, 'm'); return g; } });

  // ── 3 장원 ─────────────────────────────────────────────
  def({ id: 'timberhouse', name: '목조 주택', tier: 3, era: 3, cat: 'house', cap: 4, note: '나무 뼈대 사이로 하얀 벽. 2층 창가엔 화분.',
    gen(rng) { const w = pick(rng, [15, 17]); const g = new G(w + 2, 22); const m = Math.floor(w / 2) + 1; g.rect(2, 0, w - 1, 6, '#'); g.rect(2, 0, w - 1, 0, 's'); g.rect(m - 1, 0, m + 1, 4, 'd'); g.rect(3, 2, 4, 4, 'o'); g.rect(w - 4, 2, w - 3, 4, 'o'); g.rect(1, 7, w, 13, '#'); g.paintIf((c, r) => (r >= 7 && (c === 1 || c === w || c === m || r === 7 || r === 13) ? 'x' : null)); g.rect(3, 9, 4, 11, 'o'); g.rect(w - 4, 9, w - 3, 11, 'o'); g.rect(3, 8, 4, 8, 'f'); g.rect(w - 4, 8, w - 3, 8, 'f'); g.roof(1, w, 14, '=', 1, 1); g.rect(w - 3, 15, w - 2, 20, 'b'); return g; } });
  def({ id: 'chapel', name: '예배당', tier: 4, era: 3, cat: 'civic', visit: true, note: '종이 울리면 다들 하던 일을 멈추고 고개를 든다.',
    gen() { const g = new G(23, 32); g.rect(2, 0, 16, 11, '#'); g.rect(2, 0, 16, 0, 's'); g.arch(9, 0, 1.6, 3, 'd'); g.blob(9, 8, 2.2, 2.2, 'o', null); g.set(9, 8, 'v'); g.rect(4, 3, 4, 6, 'o'); g.rect(14, 3, 14, 6, 'o'); g.roof(2, 16, 12, '=', 1, 1); g.rect(17, 0, 21, 21, 's'); g.rect(18, 0, 20, 2, 'd'); g.rect(18, 14, 20, 16, 'o'); g.set(19, 15, 'g'); g.rect(16, 22, 22, 22, 'k'); let a = 17, b = 21, r = 23; while (a <= b) { g.rect(a, r, b, r, '='); r++; if ((r - 23) % 2 === 0) { a++; b--; } } g.set(19, r, 'g'); g.set(19, r + 1, 'g'); g.set(18, r, 'g'); g.set(20, r, 'g'); return g; } });
  def({ id: 'watermill', name: '물레방앗간', tier: 4, era: 3, cat: 'prod', note: '물이 돌리고, 바퀴가 돌리고, 건축가가 구경한다.',
    gen() { const g = new G(25, 20, 3); g.rect(0, -3, 10, -1, 'a'); g.rect(0, -3, 10, -3, 'k'); g.rect(11, 0, 23, 9, 's'); g.rect(15, 0, 17, 4, 'd'); g.rect(20, 4, 21, 6, 'o'); g.roof(11, 23, 10, '=', 1, 1); const cx = 5, cy = 3; for (let a = 0; a < 16; a++) { const an = (a / 16) * Math.PI * 2; g.set(cx + Math.cos(an) * 5, cy + Math.sin(an) * 5, 'w'); } for (let i = -4; i <= 4; i++) { g.set(cx + i, cy, 'x'); g.set(cx, cy + i, 'x'); } return g; } });
  def({ id: 'waterway', name: '물길', tier: 1, era: 3, cat: 'water', note: '마을을 가로지르는 작은 물길. 건축가들은 건너뛰기 놀이를 한다.',
    gen(rng) { const w = pick(rng, [13, 15, 17]); const g = new G(w, 1, 4); g.rect(1, -4, w - 2, -1, 'a'); g.rect(0, -4, 0, -1, 'k'); g.rect(w - 1, -4, w - 1, -1, 'k'); g.rect(0, -4, w - 1, -4, 'k'); g.set(0, 0, 's'); g.set(w - 1, 0, 's'); return g; } });
  def({ id: 'bridge', name: '돌다리', tier: 2, era: 3, cat: 'water', note: '물 위로 둥근 아치 하나. 아래로는 하늘이 비친다.',
    gen() { const g = new G(23, 7, 4); g.rect(2, -4, 20, -1, 'a'); g.rect(0, -4, 1, -1, 'k'); g.rect(21, -4, 22, -1, 'k'); g.rect(0, -4, 22, -4, 'k'); g.rect(0, 0, 22, 4, 's'); g.arch(11, -1, 6.5, 1, '.'); for (let r = -1; r <= 0; r++) for (let c = 5; c <= 17; c++) if (g.get(c, r) === '.') g.set(c, r, r < 0 ? 'a' : '.'); g.rect(0, 5, 22, 5, 'k'); for (let c = 0; c <= 22; c += 3) g.set(c, 6, 'k'); return g; } });
  def({ id: 'lantern', name: '중세 가로등', tier: 0, era: 3, cat: 'deco', note: '쇠 장식에 유리 등. 밤길이 무섭지 않다.',
    gen() { const g = new G(5, 11); g.rect(2, 0, 2, 8, 'm'); g.rect(1, 0, 3, 0, 'm'); g.rect(2, 8, 4, 8, 'm'); g.rect(3, 5, 4, 7, 'm'); g.set(3, 6, 'y'); g.set(4, 6, 'y'); g.set(2, 9, 'm'); g.set(2, 10, 'g'); return g; } });
  def({ id: 'topiary', name: '수풀 조형', tier: 1, era: 3, cat: 'park', note: '정원사는 없다. 매일 아침 모양이 조금 바뀐다.',
    gen(rng) { const g = new G(9, 14); g.rect(2, 0, 6, 1, 's'); const k = RI(rng, 0, 2); if (k === 0) { g.blob(4, 4, 3, 2.2, 'l'); g.blob(4, 8, 2.3, 1.8, 'l'); g.blob(4, 11, 1.5, 1.2, 'l'); } else if (k === 1) { for (let r = 2; r < 13; r++) { const hw = Math.max(0, Math.round((13 - r) / 3)); g.rect(4 - hw, r, 4 + hw, r, r % 3 ? 'l' : 'L'); } } else { g.rect(4, 2, 4, 6, 't'); g.blob(4, 9, 3.5, 3, 'l'); } return g; } });
  def({ id: 'flowerbed', name: '화단', tier: 0, era: 3, cat: 'park', note: '줄 맞춰 핀 꽃. 하나만 줄을 안 맞췄다.',
    gen(rng) { const g = new G(11, 3); g.rect(0, 0, 10, 0, 'k'); g.rect(1, 1, 9, 1, 'l'); for (let c = 1; c <= 9; c++) if (rng() < 0.7) g.set(c, 2, pick(rng, ['f', 'F', 'v', 'c'])); return g; } });

  // ── 4 중세 성읍 ─────────────────────────────────────────
  def({ id: 'townhouse', name: '타운하우스', tier: 3, era: 4, cat: 'house', cap: 5, note: '좁고 높다. 맨 위층 창에서는 성벽 너머가 보인다.',
    gen(rng) { const w = pick(rng, [11, 13]); const g = new G(w + 2, 30); const m = Math.floor(w / 2) + 1; const wall = pick(rng, ['#', 'b', 's']); g.rect(1, 0, w, 6, 's'); g.rect(2, 0, 4, 4, 'd'); g.rect(6, 2, w - 1, 4, 'o'); g.rect(6, 5, w - 1, 5, pick(rng, ['r', 'g', 'v'])); for (let f = 0; f < 3; f++) { const r0 = 7 + f * 6; g.rect(0, r0, w + 1, r0 + 5, wall); g.rect(0, r0, w + 1, r0, 'x'); g.rect(2, r0 + 2, 3, r0 + 4, 'o'); g.rect(m, r0 + 2, m + 1, r0 + 4, 'o'); g.rect(w - 2, r0 + 2, w - 1, r0 + 4, 'o'); } let a = 0, b = w + 1, r = 25; while (a <= b) { g.rect(a, r, b, r, '='); r++; a++; b--; } return g; } });
  def({ id: 'tavern', name: '여관', tier: 4, era: 4, cat: 'civic', visit: true, note: '간판엔 잔 두 개. 안에서는 웃음소리.',
    gen() { const g = new G(27, 24); g.rect(1, 0, 25, 7, 's'); g.rect(4, 0, 7, 5, 'd'); g.rect(10, 2, 13, 5, 'o'); g.rect(16, 2, 19, 5, 'o'); g.rect(21, 2, 23, 5, 'o'); g.rect(0, 8, 26, 15, '#'); g.paintIf((c, r) => (r >= 8 && r <= 15 && (c % 5 === 0 || r === 8 || r === 15) ? 'x' : null)); for (let c = 2; c < 25; c += 5) g.rect(c + 1, 10, c + 2, 13, 'o'); g.roof(0, 26, 16, '=', 1, 1); g.rect(-1 + 1, 6, 0, 6, 'm'); g.rect(26, 5, 26, 7, 'g'); g.rect(3, 22, 4, 23, 'b'); return g; } });
  def({ id: 'clocktower', name: '시계탑', tier: 4, era: 4, cat: 'civic', note: '바늘이 없는 시계. 이 세계의 시간은 블럭으로 잰다.',
    gen() { const g = new G(13, 40); g.rect(1, 0, 11, 27, 's'); g.rect(5, 0, 7, 3, 'd'); for (let r = 6; r < 22; r += 5) { g.set(4, r, 'o'); g.set(8, r, 'o'); } g.blob(6, 24, 3.3, 3.3, 'c'); g.set(6, 24, 'e'); g.rect(6, 25, 6, 26, 'e'); g.rect(7, 24, 8, 24, 'e'); g.rect(0, 28, 12, 28, 'k'); for (let c = 0; c <= 12; c += 2) g.set(c, 29, 'k'); let a = 1, b = 11, r = 30; while (a <= b) { g.rect(a, r, b, r, '='); r++; if (r % 2) { a++; b--; } } g.set(6, r, 'g'); g.set(6, r + 1, 'g'); return g; } });
  def({ id: 'citywall', name: '성벽', tier: 1, era: 4, cat: 'deco', note: '적은 없다. 그래도 성벽은 있어야 성읍이다.',
    gen() { const g = new G(15, 11); g.rect(0, 0, 14, 8, 's'); g.paintIf((c, r) => ((c + r * 2) % 7 === 0 ? 'k' : null)); for (let c = 0; c < 15; c += 3) g.rect(c, 9, c + 1, 10, 's'); g.set(7, 5, 'e'); g.set(7, 6, 'e'); return g; } });
  def({ id: 'banner', name: '깃발 기둥', tier: 0, era: 4, cat: 'deco', note: '바람 방향이 매일 바뀐다. 깃발은 늘 오른쪽.',
    gen(rng) { const g = new G(6, 13); g.rect(0, 0, 0, 12, 'm'); const col = pick(rng, ['r', 'v', 'g']); g.rect(1, 7, 4, 11, col); g.rect(1, 9, 4, 9, 'c'); g.set(5, 11, col); g.set(5, 7, col); return g; } });
  def({ id: 'plaza', name: '분수 광장', tier: 2, era: 4, cat: 'park', visit: true, note: '세 단의 분수. 동전 대신 다들 블럭을 던진다.',
    gen() { const g = new G(21, 14); g.rect(0, 0, 20, 0, 'p'); g.rect(1, 1, 19, 3, 's'); g.rect(2, 3, 18, 3, 'a'); g.rect(9, 4, 11, 7, 's'); g.rect(5, 8, 15, 8, 's'); g.rect(6, 9, 14, 9, 'a'); g.rect(10, 10, 10, 11, 's'); g.rect(8, 12, 12, 12, 'a'); g.set(10, 13, 'a'); for (const c of [3, 17]) { g.set(c, 4, 'a'); g.set(c + (c < 10 ? 1 : -1), 5, 'a'); } return g; } });
  def({ id: 'lake', name: '호수와 아치 다리', tier: 4, era: 4, cat: 'water', note: '아치 셋이 물 위에 비쳐 동그라미 셋이 된다.',
    gen() { const W = 39; const g = new G(W, 8, 6); for (let r = -6; r <= -1; r++) { const inset = Math.max(0, -r - 3) * 2; g.rect(inset, r, W - 1 - inset, r, 'a'); g.set(inset, r, 'k'); g.set(W - 1 - inset, r, 'k'); } g.rect(0, 0, W - 1, 3, 's'); for (const cx of [9, 19, 29]) g.arch(cx, -1, 3.5, 1, '.'); g.paintIf(() => null); for (let r = -1; r <= 0; r++) for (let c = 0; c < W; c++) if (g.get(c, r) === '.' && r < 0) g.set(c, r, 'a'); g.rect(0, 4, W - 1, 4, 'k'); for (let c = 0; c < W; c += 3) g.set(c, 5, 'k'); g.set(19, 6, 'm'); g.set(19, 7, 'y'); return g; } });
  def({ id: 'cathedral', name: '대성당', tier: 5, era: 4, cat: 'civic', visit: true, note: '두 첨탑과 하나의 장미창. 장미창 무늬는 오래된 고리에서 따왔다.',
    gen() { const W = 41; const g = new G(W, 52); const m = 20; g.rect(8, 0, 32, 20, '#'); g.rect(8, 0, 32, 0, 's'); g.arch(m, 0, 2.6, 5, 'd'); g.arch(m - 7, 0, 1.4, 3, 'd'); g.arch(m + 7, 0, 1.4, 3, 'd'); g.blob(m, 14, 4.2, 4.2, 'o'); for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2; for (let rr = 1; rr <= 4; rr++) g.set(m + Math.cos(an) * rr, 14 + Math.sin(an) * rr, a % 2 ? 'v' : 'r'); } g.set(m, 14, 'g'); for (const cx of [11, 29]) { g.rect(cx - 1, 4, cx + 1, 10, 'o'); g.set(cx, 11, 'o'); } g.roof(8, 32, 21, '=', 1, 0); for (const tx of [1, 33]) { g.rect(tx, 0, tx + 6, 33, 's'); g.rect(tx + 2, 0, tx + 4, 3, 'd'); for (let r = 8; r < 30; r += 6) g.rect(tx + 2, r, tx + 4, r + 3, 'o'); g.rect(tx - 1, 34, tx + 7, 34, 'k'); let a = tx, b = tx + 6, r = 35; while (a <= b) { g.rect(a, r, b, r, '='); r++; if ((r - 35) % 3 === 0) { a++; b--; } } g.set(tx + 3, r, 'g'); g.set(tx + 3, r + 1, 'g'); g.set(tx + 2, r, 'g'); g.set(tx + 4, r, 'g'); } return g; } });
  def({ id: 'castle', name: '성', tier: 5, era: 4, cat: 'civic', note: '성주는 없다. 가장 작은 건축가가 가끔 왕좌에 앉아 본다.',
    gen() { const W = 49; const g = new G(W, 46); g.rect(0, 0, W - 1, 13, 's'); g.paintIf((c, r) => ((c * 7 + r * 13) % 23 === 0 ? 'k' : null)); for (let c = 0; c < W; c += 3) g.rect(c, 14, c + 1, 15, 's'); g.arch(24, 0, 3.5, 6, 'd'); g.rect(21, 7, 27, 7, 'm'); for (const tx of [0, 41]) { g.rect(tx, 0, tx + 7, 24, 's'); for (let r = 6; r < 22; r += 5) g.rect(tx + 3, r, tx + 4, r + 2, 'e'); g.rect(tx - 1, 25, tx + 8, 25, 'k'); for (let c = tx - 1; c <= tx + 8; c += 2) g.set(c, 26, 'k'); g.rect(tx + 3, 27, tx + 3, 31, 'm'); g.rect(tx + 4, 29, tx + 7, 31, 'r'); } g.rect(15, 14, 33, 32, 's'); for (let r = 18; r < 31; r += 5) for (const c of [18, 24, 30]) g.rect(c - 1, r, c, r + 2, 'o'); g.rect(14, 33, 34, 33, 'k'); for (let c = 14; c <= 34; c += 2) g.set(c, 34, 'k'); g.rect(24, 35, 24, 42, 'm'); g.rect(25, 38, 30, 42, 'r'); g.rect(25, 40, 30, 40, 'g'); return g; } });

  // ── 특별 ─────────────────────────────────────────────
  def({ id: 'grave', name: '작은 무덤', tier: 0, era: 0, cat: 'special', hidden: true, note: '먼저 떠난 친구를 위해.',
    gen(rng) { const g = new G(5, 6); g.rect(0, 0, 4, 0, 'l'); g.rect(1, 1, 3, 3, 's'); g.set(2, 4, 's'); g.set(2, 2, 'e'); g.set(0, 1, pick(rng, ['f', 'F'])); g.set(4, 1, pick(rng, ['f', 'v'])); return g; } });

  // normalise every def: compute footprint from a reference seed
  T.DEFS = D;
  T.DEF = {};
  D.forEach((d, i) => { d.index = i; T.DEF[d.id] = d; });

  const cache = new Map();
  T.shapeOf = function (id, seed) {
    const key = id + '#' + seed;
    let s = cache.get(key);
    if (s) return s;
    const d = T.DEF[id];
    const g = d.gen(T.rng(seed * 7919 + d.index * 104729 + 1));
    const cells = g.cells();
    let minc = Infinity, maxc = -Infinity, minr = Infinity, maxr = -Infinity;
    for (const c of cells) { minc = Math.min(minc, c.c); maxc = Math.max(maxc, c.c); minr = Math.min(minr, c.r); maxr = Math.max(maxr, c.r); }
    for (const c of cells) c.c -= minc;
    // build order: bottom row first (underground first, then upwards), left to right
    cells.sort((a, b) => a.r - b.r || a.c - b.c);
    const glow = [];
    cells.forEach((c, i) => { if (T.GLOW[c.ch]) glow.push(i); });
    s = { cells, w: maxc - minc + 1, h: maxr + 1, sink: Math.max(0, -minr), glow };
    cache.set(key, s);
    if (cache.size > 4000) cache.delete(cache.keys().next().value);
    return s;
  };
})();
