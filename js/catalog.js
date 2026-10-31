'use strict';
// ─────────────────────────────────────────────────────────────
//  CATALOG: 모든 건축물 (픽셀 단위, 실제 비율)
//  건축가 키 ≈ 16px, 블럭 = 8px. 문 ≈ 12px, 창 ≈ 6px.
//  tier: 0 소형 조형물 … 5 랜드마크 / era: 0 원시 … 4 중세 성읍
//  minRes: 짓는 데 필요한 쪼개기 해상도 단계 (0=1×1, 1=2×2, 2=4×4, 3=8×8)
// ─────────────────────────────────────────────────────────────
(function () {
  const Px = T.Px;
  const RI = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  T.TIERS = [
    { name: '소형 조형물', mult: 6, aura: 0.06, radius: 70 },
    { name: '중형 조형물', mult: 16, aura: 0.12, radius: 120 },
    { name: '대형 조형물', mult: 45, aura: 0.22, radius: 200 },
    { name: '건축물', mult: 90, aura: 0.16, radius: 160 },
    { name: '대형 건축물', mult: 240, aura: 0.32, radius: 280 },
    { name: '랜드마크', mult: 700, aura: 0.6, radius: 440 },
  ];
  T.ERAS = [
    { name: '원시', sub: '이름 없는 돌들의 시대', floor: 'stone' },
    { name: '움집 마을', sub: '처음으로 지붕을 얹다', floor: 'grass' },
    { name: '돌담 마을', sub: '돌을 쌓아 벽을 세우다', floor: 'path' },
    { name: '장원', sub: '물길을 끌고 다리를 놓다', floor: 'cobble' },
    { name: '중세 성읍', sub: '종소리가 성벽을 넘다', floor: 'town' },
  ];
  T.CATS = {
    sculpture: { name: '조형물' }, house: { name: '집' }, park: { name: '공원' }, market: { name: '시장' },
    prod: { name: '생산' }, civic: { name: '공공' }, water: { name: '물' }, deco: { name: '장식' }, sky: { name: '하늘' }, special: { name: '특별' },
  };
  T.RES = [1, 2, 4, 8];
  T.RES_NAME = ['1비트', '2비트', '4비트', '8비트'];

  const D = [];
  const def = (o) => { o.minRes = o.minRes ?? (o.era > 0 ? 3 : [0, 1, 2][o.tier] ?? 0); D.push(o); return o; };

  // shared pieces
  function tree(p, cx, rng, scale = 1) {
    const th = Math.round(RI(rng, 10, 16) * scale);
    p.rect(cx - 1, 0, 3, th, 'trunk');
    p.set(cx - 2, 0, 'trunk'); p.set(cx + 2, 0, 'trunk');
    const rx = RI(rng, 9, 13) * scale, ry = RI(rng, 9, 12) * scale;
    p.ellipse(cx + 0.5, th + ry * 0.75, rx, ry, 'leaf', rng, 0.25);
    for (let i = 0; i < 4; i++) p.ellipse(cx + 0.5 + (rng() - 0.5) * rx * 1.2, th + ry * (0.5 + rng() * 0.6), rx * 0.45, ry * 0.4, rng() < 0.5 ? 'dleaf' : 'leaf', rng, 0.3);
    return th + ry * 1.75;
  }
  function face(p, x, y, w, h) { // cute architect face on a block of stone
    const ex = Math.round(w * 0.28), ey = y + Math.round(h * 0.52);
    p.rect(x + ex, ey, 2, 3, 'ink'); p.rect(x + w - ex - 2, ey, 2, 3, 'ink');
    p.set(x + ex, ey + 2, 'white'); p.set(x + w - ex - 2, ey + 2, 'white');
    p.rect(x + ex - 2, ey - 2, 3, 1, 'blush'); p.rect(x + w - ex - 1, ey - 2, 3, 1, 'blush');
    p.rect(x + Math.floor(w / 2) - 1, ey - 2, 2, 1, 'ink');
  }

  // ── 원시 · 소형 조형물 ───────────────────────────────────
  def({ id: 'cairn', name: '돌탑', tier: 0, era: 0, cat: 'sculpture', note: '돌 하나를 올릴 때마다 소원 하나.',
    art(rng) { const p = new Px(20, 24); let y = 0, rx = RI(rng, 7, 9); while (rx >= 2 && y < 20) { const ry = RI(rng, 2, 3); p.ellipse(10 + (rng() - 0.5) * 2, y + ry, rx, ry, rng() < 0.5 ? 'stone' : 'dstone'); y += ry * 2 - 1; rx -= RI(rng, 1, 2); } return p; } });
  def({ id: 'menhir', name: '선돌', tier: 0, era: 0, cat: 'sculpture', note: '왜 세웠는지는 아무도 모른다. 그래서 더 멋지다.',
    art(rng) { const p = new Px(12, 30); const h = RI(rng, 22, 28); for (let y = 0; y < h; y++) { const w = Math.round(9 - (y / h) * 4 + Math.sin(y * 0.5) * 0.6); p.rect(Math.round((12 - w) / 2), y, w, 1, 'dstone'); } for (let i = 0; i < 6; i++) p.set(RI(rng, 2, 9), RI(rng, 0, 8), 'dleaf'); return p; } });
  def({ id: 'totem', name: '토템', tier: 0, era: 0, cat: 'sculpture', note: '얼굴이 셋. 셋 다 웃고 있다.',
    art(rng) { const p = new Px(20, 34); const n = 3; for (let i = 0; i < n; i++) { const y = i * 8; p.rect(5, y, 10, 8, i % 2 ? 'wood' : 'brick'); p.rect(7, y + 4, 2, 2, 'ink'); p.rect(11, y + 4, 2, 2, 'ink'); p.rect(8, y + 1, 4, 1, 'red'); } p.rect(0, 24, 20, 3, 'red'); p.rect(2, 27, 16, 2, 'gold'); p.rect(8, 29, 4, 3, 'gold'); return p; } });
  def({ id: 'mushroom', name: '버섯 조각', tier: 0, era: 0, cat: 'sculpture', note: '먹을 수는 없다. 건축가들이 여러 번 확인했다.',
    art(rng) { const p = new Px(20, 18); p.rect(7, 0, 6, 8, 'white'); p.ellipse(10, 10, 9, 5, 'red'); p.rect(1, 8, 18, 2, 'red'); for (let i = 0; i < 5; i++) p.ellipse(RI(rng, 4, 16), RI(rng, 10, 13), 1.4, 1.2, 'white'); return p; } });
  def({ id: 'statue_s', name: '네모 석상', tier: 0, era: 0, cat: 'sculpture', note: '누구를 닮았는지는 다들 알고 있다.',
    art() { const p = new Px(18, 24); p.rect(0, 0, 18, 3, 'dstone'); p.rect(2, 3, 14, 13, 'marble'); face(p, 2, 3, 14, 13); p.rect(8, 16, 2, 3, 'dstone'); p.ellipse(7, 20, 2.5, 1.6, 'leaf'); p.ellipse(11, 20.5, 2.5, 1.6, 'leaf'); return p; } });
  def({ id: 'pot', name: '화분', tier: 0, era: 0, cat: 'sculpture', note: '흙은 없는데 꽃은 핀다.',
    art(rng) { const p = new Px(16, 18); p.rect(5, 0, 6, 2, 'brick'); p.rect(4, 2, 8, 5, 'brick'); p.rect(3, 7, 10, 2, 'brick'); p.ellipse(8, 12, 6, 4, 'leaf', rng, 0.3); for (let i = 0; i < 5; i++) p.ellipse(RI(rng, 4, 12), RI(rng, 11, 16), 1.2, 1.2, pick(rng, ['flower', 'flower2', 'flower3'])); return p; } });
  def({ id: 'signpost', name: '이정표', tier: 0, era: 0, cat: 'sculpture', note: '화살표가 가리키는 쪽에는 또 다른 이정표가 있다.',
    art() { const p = new Px(22, 22); p.rect(10, 0, 2, 20, 'wood'); p.rect(11, 14, 10, 4, 'plank'); p.set(21, 15, 'plank'); p.set(21, 16, 'plank'); p.rect(1, 8, 10, 4, 'plank'); p.set(0, 9, 'plank'); p.set(0, 10, 'plank'); p.rect(10, 20, 2, 2, 'timber'); return p; } });
  def({ id: 'bench', name: '돌 의자', tier: 0, era: 0, cat: 'sculpture', note: '앉으면 엉덩이가 차갑다.',
    art() { const p = new Px(20, 10); p.rect(1, 0, 3, 4, 'dstone'); p.rect(16, 0, 3, 4, 'dstone'); p.rect(0, 4, 20, 2, 'stone'); p.rect(0, 6, 2, 4, 'dstone'); p.rect(2, 8, 18, 2, 'stone'); return p; } });
  def({ id: 'minipyramid', name: '작은 피라미드', tier: 0, era: 0, cat: 'sculpture', note: '꼭대기 금색 블럭은 서로 놓겠다고 싸웠다.',
    art() { const p = new Px(26, 14); for (let y = 0; y < 12; y++) p.rect(y + 1, y, 24 - y * 2, 1, y > 9 ? 'gold' : 'stone'); return p; } });
  def({ id: 'stonelamp', name: '석등', tier: 0, era: 0, cat: 'sculpture', note: '불을 켜는 법은 아직 모른다. 그래도 켜져 있다.',
    art() { const p = new Px(16, 24); p.rect(3, 0, 10, 2, 'dstone'); p.rect(6, 2, 4, 8, 'stone'); p.rect(3, 10, 10, 6, 'stone'); p.rect(5, 11, 6, 4, 'flame'); p.rect(1, 16, 14, 2, 'dstone'); p.rect(3, 18, 10, 2, 'dstone'); p.rect(7, 20, 2, 2, 'dstone'); return p; } });
  def({ id: 'cloudsculpt', name: '구름 조각', tier: 0, era: 0, cat: 'sky', sky: true, note: '하늘에 매달아 둔 구름. 진짜 구름이 질투한다.',
    art(rng) { const p = new Px(40, 18); p.ellipse(12, 7, 9, 6, 'cloud', rng, 0.15); p.ellipse(22, 10, 11, 8, 'cloud', rng, 0.15); p.ellipse(31, 7, 8, 5, 'cloud', rng, 0.15); p.rect(4, 2, 32, 4, 'cloud'); return p; } });
  def({ id: 'kite', name: '연', tier: 0, era: 0, cat: 'sky', sky: true, note: '줄은 없다. 그래도 날아간다.',
    art() { const p = new Px(20, 30); for (let y = 0; y < 16; y++) { const w = y < 8 ? y : 16 - y; p.rect(10 - w, y + 12, w * 2, 1, y < 8 ? 'red' : 'blue'); } p.line(10, 12, 10, 28, 'timber'); p.line(3, 20, 17, 20, 'timber'); for (let i = 0; i < 10; i++) p.set(10 + Math.round(Math.sin(i * 0.9) * 2), 11 - i, i % 3 ? 'white' : 'red'); return p; } });
  def({ id: 'skylantern', name: '풍등', tier: 0, era: 0, cat: 'sky', sky: true, note: '소원을 하나씩 적어 올렸다. 다들 같은 소원이었다.',
    art() { const p = new Px(12, 16); p.rect(2, 2, 8, 11, 'straw'); p.rect(3, 3, 6, 9, 'flame'); p.rect(1, 13, 10, 2, 'straw'); p.rect(3, 0, 6, 2, 'timber'); return p; } });

  // ── 원시 · 중형 조형물 ───────────────────────────────────
  def({ id: 'dolmen', name: '고인돌', tier: 1, era: 0, cat: 'sculpture', note: '돌 두 개가 큰 돌 하나를 들고 있다. 힘들어 보인다.',
    art(rng) { const p = new Px(40, 24); p.rect(5, 0, 7, 14, 'dstone'); p.rect(28, 0, 7, 14, 'dstone'); p.ellipse(20, 17, 19, 4.5, 'stone', rng, 0.1); for (let i = 0; i < 10; i++) p.set(RI(rng, 4, 36), RI(rng, 18, 21), 'dleaf'); return p; } });
  def({ id: 'obelisk', name: '오벨리스크', tier: 1, era: 0, cat: 'sculpture', note: '하늘이 얼마나 높은지 재기 위한 가느다란 자.',
    art(rng) { const p = new Px(20, 56); p.rect(0, 0, 20, 3, 'dstone'); p.rect(2, 3, 16, 3, 'dstone'); for (let y = 6; y < 48; y++) { const w = Math.round(10 - (y - 6) * 0.07); p.rect(10 - Math.ceil(w / 2), y, w, 1, 'marble'); } for (let y = 10; y < 44; y += 5) p.rect(9, y, 2, 2, rng() < 0.5 ? 'ink' : 'gold'); for (let y = 48; y < 54; y++) p.rect(10 - Math.ceil((54 - y) / 2), y, (54 - y), 1, 'gold'); return p; } });
  def({ id: 'archgate', name: '아치문', tier: 1, era: 0, cat: 'sculpture', note: '건너편이 보이는 문. 지나갈 때마다 고개를 든다.',
    art() { const p = new Px(40, 40); p.rect(0, 0, 40, 34, 'stone'); p.arch(20, 0, 10, 16); p.rect(0, 34, 40, 4, 'dstone'); p.rect(17, 25, 6, 5, 'gold'); p.rect(0, 0, 4, 34, 'dstone'); p.rect(36, 0, 4, 34, 'dstone'); return p; } });
  def({ id: 'trilithon', name: '거석문', tier: 1, era: 0, cat: 'sculpture', note: '해가 뜨는 날, 그림자가 정확히 가운데로 들어온다.',
    art(rng) { const p = new Px(44, 36); p.rect(4, 0, 9, 28, 'dstone'); p.rect(31, 0, 9, 28, 'dstone'); p.rect(0, 28, 44, 7, 'stone'); for (let i = 0; i < 14; i++) { const x = RI(rng, 0, 43), y = RI(rng, 0, 35); if (p.get(x, y)) p.set(x, y, 'dleaf'); } return p; } });
  def({ id: 'statue_m', name: '큰 네모 석상', tier: 1, era: 0, cat: 'sculpture', note: '눈이 반짝인다. 건축가들은 이 앞에서 자주 멈춘다.',
    art() { const p = new Px(34, 48); p.rect(0, 0, 34, 5, 'dstone'); p.rect(3, 5, 28, 3, 'dstone'); p.rect(8, 8, 6, 4, 'dstone'); p.rect(20, 8, 6, 4, 'dstone'); p.rect(4, 12, 26, 26, 'marble'); face(p, 4, 12, 26, 26); p.rect(16, 38, 2, 4, 'dstone'); p.ellipse(13, 44, 4, 2.4, 'leaf'); p.ellipse(21, 45, 4, 2.4, 'leaf'); return p; } });
  def({ id: 'fountain', name: '돌 분수', tier: 1, era: 0, cat: 'sculpture', note: '물은 어디서 오는 걸까. 묻는 건축가는 없다.',
    art() { const p = new Px(40, 30); p.rect(0, 0, 40, 7, 'stone'); p.rect(2, 5, 36, 2, 'water'); p.rect(17, 7, 6, 12, 'stone'); p.rect(10, 19, 20, 3, 'stone'); p.rect(12, 21, 16, 1, 'water'); p.rect(19, 22, 2, 5, 'water'); for (const s of [-1, 1]) for (let i = 0; i < 8; i++) p.set(20 + s * (3 + i), 22 - Math.round(i * i * 0.28), 'water'); return p; } });
  def({ id: 'altar', name: '계단 제단', tier: 1, era: 0, cat: 'sculpture', note: '꼭대기의 불은 꺼진 적이 없다.',
    art(rng) { const p = new Px(44, 28); for (let i = 0; i < 5; i++) p.rect(i * 4, i * 4, 44 - i * 8, 4, i % 2 ? 'stone' : 'marble'); p.rect(18, 20, 8, 3, 'dstone'); p.ellipse(22, 25, 3, 3.5, 'flame', rng, 0.3); return p; } });
  def({ id: 'watchstone', name: '망루 돌탑', tier: 1, era: 0, cat: 'sculpture', note: '올라가면 멀리 보인다. 올라가는 법은 아직 없다.',
    art() { const p = new Px(26, 50); p.rect(3, 0, 20, 40, 'stone'); p.rect(0, 40, 26, 4, 'dstone'); for (let x = 0; x < 26; x += 5) p.rect(x, 44, 3, 4, 'dstone'); p.rect(12, 14, 2, 6, 'ink'); p.rect(12, 28, 2, 6, 'ink'); p.door(10, 0, 6, 10); return p; } });

  // ── 원시 · 대형 조형물 ───────────────────────────────────
  def({ id: 'ziggurat', name: '지구라트', tier: 2, era: 0, cat: 'sculpture', note: '계단은 위로 갈수록 좁아진다. 꼭대기 방엔 창이 하나.',
    art() { const p = new Px(92, 60); let y = 0; for (let t = 0; t < 4; t++) { const a = t * 10, w = 92 - t * 20; p.rect(a, y, w, 11, t % 2 ? 'stone' : 'marble'); p.rect(a, y + 10, w, 1, 'dstone'); y += 11; } p.rect(40, 0, 12, 44, 'path'); for (let s = 0; s < 44; s += 2) p.rect(40, s, 12, 1, 'dstone'); p.rect(34, 44, 24, 12, 'stone'); p.win(43, 47, 6, 6, 'dstone'); p.rect(32, 56, 28, 2, 'gold'); return p; } });
  def({ id: 'colossus', name: '거대 네모 석상', tier: 2, era: 0, cat: 'sculpture', note: '가장 작은 건축가에게 바친다. 크기는 반대지만.',
    art(rng) { const p = new Px(70, 104); p.rect(0, 0, 70, 10, 'dstone'); p.rect(4, 10, 62, 6, 'dstone'); p.rect(14, 16, 12, 12, 'dstone'); p.rect(44, 16, 12, 12, 'dstone'); p.rect(6, 28, 58, 54, 'marble'); p.rect(6, 28, 58, 2, 'dstone'); const ey = 56; p.rect(16, ey, 8, 11, 'ink'); p.rect(46, ey, 8, 11, 'ink'); p.rect(16, ey + 8, 3, 3, 'white'); p.rect(46, ey + 8, 3, 3, 'white'); p.rect(10, 48, 12, 3, 'blush'); p.rect(48, 48, 12, 3, 'blush'); p.rect(31, 48, 8, 2, 'ink'); p.rect(33, 82, 4, 8, 'dstone'); p.ellipse(28, 94, 9, 5, 'leaf', rng, 0.2); p.ellipse(42, 96, 9, 5, 'leaf', rng, 0.2); return p; } });
  def({ id: 'pyramid', name: '피라미드', tier: 2, era: 0, cat: 'sculpture', note: '끝이 한 점으로 모인다. 모든 블럭이 그 점을 향해 있다.',
    art() { const p = new Px(116, 60); for (let y = 0; y < 58; y++) p.rect(y, y, 116 - y * 2, 1, y > 52 ? 'gold' : 'stone'); p.door(52, 0, 12, 16); return p; } });
  def({ id: 'henge', name: '거석 원', tier: 2, era: 0, cat: 'sculpture', note: '돌들이 둥글게 서서 무언가를 기다린다.',
    art(rng) { const p = new Px(120, 46); for (const [x0, h] of [[0, 34], [42, 40], [84, 34]]) { p.rect(x0 + 4, 0, 9, h, 'dstone'); p.rect(x0 + 23, 0, 9, h, 'dstone'); p.rect(x0, h, 36, 6, 'stone'); } p.rect(36, 0, 8, 6, 'dstone'); p.rect(78, 0, 10, 4, 'dstone'); for (let i = 0; i < 40; i++) { const x = RI(rng, 0, 119), y = RI(rng, 0, 45); if (p.get(x, y)) p.set(x, y, 'dleaf'); } return p; } });
  def({ id: 'greattower', name: '큰 석탑', tier: 2, era: 0, cat: 'sculpture', note: '층마다 처마가 넓어진다. 바람이 불면 처마 끝이 운다.',
    art() { const p = new Px(56, 96); let y = 0; for (let t = 0; t < 5; t++) { const w = 36 - t * 6; p.rect(28 - w / 2, y, w, 12, 'stone'); p.win(26, y + 3, 4, 6, 'dstone', false); p.rect(28 - w / 2 - 6, y + 12, w + 12, 4, 'roof'); y += 16; } p.rect(27, y, 2, 12, 'gold'); p.rect(24, y + 4, 8, 2, 'gold'); return p; } });
  def({ id: 'balloon', name: '열기구', tier: 1, era: 0, cat: 'sky', sky: true, note: '바구니 안엔 아무도 없다. 아마 다들 내렸나 보다.',
    art() { const p = new Px(34, 50); p.ellipse(17, 32, 16, 17, 'red'); p.paintIf((x, y, m) => (m === 'red' && Math.floor((x + 1) / 5) % 2 ? 'white' : undefined)); for (let y = 15; y < 20; y++) p.rect(17 - (20 - y) - 4, y, (20 - y) * 2 + 8, 1, 'red'); p.line(12, 15, 13, 7, 'timber'); p.line(22, 15, 21, 7, 'timber'); p.rect(11, 0, 12, 8, 'straw'); return p; } });
  def({ id: 'skyisland', name: '떠 있는 섬', tier: 2, era: 0, cat: 'sky', sky: true, note: '어떻게 떠 있는지는 묻지 않기로 했다.',
    art(rng) { const p = new Px(70, 64); for (let y = 0; y < 22; y++) { const w = Math.round(6 + y * 2.6 + (rng() - 0.5) * 3); p.rect(35 - w / 2, y, w, 1, y > 18 ? 'grass' : y > 12 ? 'path' : 'dstone'); } tree(p, 46, rng, 0.9); p.rect(18, 22, 6, 5, 'stone'); p.ellipse(28, 23, 3, 1.5, 'flower'); return p; } });

  // ── 1 움집 마을 ─────────────────────────────────────────
  def({ id: 'hut', name: '움집', tier: 3, era: 1, cat: 'house', cap: 2, note: '처음으로 얹은 지붕. 비가 와도 이제 괜찮다.',
    art(rng) { const w = pick(rng, [36, 42]); const p = new Px(w + 6, 40); const m = 3 + w / 2; p.rect(5, 0, w - 4, 8, 'wood'); p.door(m - 4, 0, 8, 12); let a = 0, b = w + 5, y = 8; while (a < b) { p.rect(a, y, b - a + 1, 1, 'thatch'); y++; if (y % 1 === 0) { a++; b--; } } p.rect(m - 1, y - 2, 2, 5, 'timber'); return p; } });
  def({ id: 'longhut', name: '큰 움집', tier: 3, era: 1, cat: 'house', cap: 4, note: '한 지붕 아래 넷이 산다. 코 고는 소리도 넷.',
    art() { const p = new Px(72, 36); p.rect(4, 0, 64, 12, 'wood'); p.door(12, 0, 8, 12); p.door(52, 0, 8, 12); p.win(33, 4, 6, 5); let a = 0, b = 71, y = 12; while (b - a > 10 && y < 34) { p.rect(a, y, b - a + 1, 1, 'thatch'); y++; a++; b--; } p.rect(a, y, b - a + 1, 2, 'timber'); return p; } });
  def({ id: 'campfire', name: '모닥불', tier: 0, era: 1, cat: 'park', visit: true, note: '밤이면 다들 여기 모여 앉는다.',
    art(rng) { const p = new Px(18, 14); p.rect(0, 0, 18, 2, 'dstone'); p.line(2, 2, 15, 5, 'trunk', 2); p.line(2, 5, 15, 2, 'trunk', 2); p.ellipse(9, 8, 4, 5, 'flame', rng, 0.4); p.ellipse(9, 7, 2, 3, 'flower2'); return p; } });
  def({ id: 'tree', name: '나무', tier: 0, era: 1, cat: 'park', note: '심은 적이 없는데 자랐다. 건축가들은 블럭이라고 우긴다.',
    art(rng) { const p = new Px(32, 52); tree(p, 16, rng, 1); if (rng() < 0.4) for (let i = 0; i < 5; i++) { const x = RI(rng, 6, 26), y = RI(rng, 18, 40); if (p.get(x, y)) p.set(x, y, 'red'); } return p; } });
  def({ id: 'pine', name: '전나무', tier: 0, era: 1, cat: 'park', note: '겨울이 오지 않아도 늘 초록.',
    art(rng) { const p = new Px(26, 56); p.rect(12, 0, 3, 8, 'trunk'); const h = RI(rng, 40, 48); for (let y = 6; y < h; y++) { const w = Math.round(((h - y) / h) * 22 * (0.75 + 0.25 * ((y % 8) / 8))); p.rect(13 - w / 2, y, w, 1, (y % 8) < 2 ? 'dleaf' : 'leaf'); } return p; } });
  def({ id: 'bush', name: '덤불', tier: 0, era: 1, cat: 'park', note: '안에 무언가 살고 있다. 아마도.',
    art(rng) { const p = new Px(18, 10); p.ellipse(9, 3, RI(rng, 6, 8), 5, 'leaf', rng, 0.35); p.ellipse(6, 2, 4, 3, 'dleaf', rng, 0.3); for (let i = 0; i < 3; i++) { const x = RI(rng, 3, 14), y = RI(rng, 2, 6); if (p.get(x, y)) p.set(x, y, pick(rng, ['flower', 'flower2'])); } return p; } });
  def({ id: 'woodpile', name: '장작더미', tier: 0, era: 1, cat: 'deco', note: '겨울은 오지 않지만 준비는 한다.',
    art() { const p = new Px(18, 12); for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { p.ellipse(3 + r * 2 + i * 4, 2 + r * 3.5, 2, 2, 'trunk'); p.set(3 + r * 2 + i * 4, 2 + r * 3.5, 'straw'); } return p; } });
  def({ id: 'fence', name: '울타리', tier: 0, era: 1, cat: 'deco', note: '넘어가지 말라는 뜻은 아니다. 그냥 예뻐서.',
    art() { const p = new Px(28, 10); for (let x = 0; x < 28; x += 6) { p.rect(x, 0, 2, 9, 'wood'); p.set(x, 9, 'wood'); } p.rect(0, 3, 28, 1, 'plank'); p.rect(0, 6, 28, 1, 'plank'); return p; } });
  def({ id: 'totempole', name: '마을 토템', tier: 1, era: 1, cat: 'park', note: '마을의 수호자. 표정이 매일 조금씩 다르다.',
    art() { const p = new Px(26, 52); p.rect(5, 0, 16, 3, 'dstone'); for (let i = 0; i < 4; i++) { const y = 3 + i * 9; p.rect(8, y, 10, 9, i % 2 ? 'wood' : 'brick'); p.rect(10, y + 5, 2, 2, 'ink'); p.rect(14, y + 5, 2, 2, 'ink'); p.rect(11, y + 2, 4, 1, 'red'); } p.rect(0, 39, 26, 3, 'red'); p.rect(3, 42, 20, 3, 'gold'); p.rect(11, 45, 4, 4, 'gold'); return p; } });

  // ── 2 돌담 마을 ─────────────────────────────────────────
  def({ id: 'stonehouse', name: '돌집', tier: 3, era: 2, cat: 'house', cap: 3, note: '벽이 두꺼워서 겨울에도 따뜻하다고 한다.',
    art(rng) { const w = pick(rng, [44, 50]); const p = new Px(w + 8, 52); p.rect(4, 0, w, 24, 'stone'); p.door(4 + Math.floor(w / 2) - 4, 0, 8, 13); p.win(9, 10, 6, 7, 'dstone'); p.win(w - 7, 10, 6, 7, 'dstone'); p.rect(2, 24, w + 4, 2, 'dstone'); const top = p.roof(4, w + 3, 26, 'roof', 1, 3); p.rect(w - 8, 30, 6, top - 30 + 3, 'brick'); p.rect(w - 9, top + 2, 8, 2, 'brick'); return p; } });
  def({ id: 'well', name: '우물', tier: 1, era: 2, cat: 'park', visit: true, note: '바닥에 동전 대신 블럭이 하나 빠져 있다.',
    art() { const p = new Px(28, 34); p.rect(2, 0, 24, 9, 'stone'); p.rect(4, 7, 20, 2, 'water'); p.rect(4, 9, 2, 14, 'wood'); p.rect(22, 9, 2, 14, 'wood'); p.rect(6, 18, 16, 2, 'timber'); p.rect(13, 12, 2, 6, 'metal'); p.rect(12, 10, 4, 3, 'wood'); p.roof(4, 23, 23, 'roof', 1, 3); return p; } });
  def({ id: 'stall', name: '시장 좌판', tier: 3, era: 2, cat: 'market', visit: true, note: '파는 건 블럭. 사는 것도 블럭.',
    art(rng) { const p = new Px(44, 32); p.rect(2, 0, 2, 26, 'wood'); p.rect(40, 0, 2, 26, 'wood'); p.rect(4, 0, 36, 10, 'plank'); p.rect(4, 10, 36, 2, 'timber'); for (let x = 5; x < 39; x += 3) p.ellipse(x + 1, 13.5, 1.4, 1.4, pick(rng, ['red', 'flower2', 'leaf', 'flower', 'gold'])); for (let x = 0; x < 44; x++) for (let y = 24; y < 31; y++) p.set(x, y - Math.floor((x % 8) / 4) * 0, Math.floor(x / 4) % 2 ? 'red' : 'white'); for (let x = 0; x < 44; x += 4) p.rect(x, 23, 2, 1, Math.floor(x / 4) % 2 ? 'red' : 'white'); return p; } });
  def({ id: 'workshop', name: '공방', tier: 3, era: 2, cat: 'prod', note: '망치 소리가 하루 종일. 그게 노래가 된다.',
    art() { const p = new Px(64, 52); p.rect(4, 0, 56, 26, 'plaster'); p.rect(4, 0, 56, 3, 'dstone'); p.door(10, 0, 14, 18, false); p.rect(10, 18, 14, 2, 'timber'); p.win(32, 9, 7, 8); p.win(46, 9, 7, 8); p.rect(28, 21, 10, 4, 'gold'); p.roof(4, 59, 26, 'roof', 1, 3); p.rect(48, 32, 6, 16, 'brick'); return p; } });
  def({ id: 'bakery', name: '빵집', tier: 3, era: 2, cat: 'prod', visit: true, note: '굽는 건 블럭인데 냄새는 빵 냄새가 난다.',
    art() { const p = new Px(54, 52); p.rect(4, 0, 46, 24, 'brick'); p.door(23, 0, 8, 13); p.win(8, 7, 9, 9); p.win(37, 7, 9, 9); p.rect(18, 17, 18, 5, 'straw'); p.rect(20, 18, 14, 3, 'flower2'); p.roof(4, 49, 24, 'roof', 1, 3); p.rect(8, 28, 6, 20, 'dstone'); p.ellipse(11, 50, 3, 1.6, 'white'); return p; } });
  def({ id: 'windmill', name: '풍차', tier: 4, era: 2, cat: 'prod', note: '바람이 없어도 돈다. 건축가들이 밀고 있다.',
    art() { const p = new Px(84, 110); for (let y = 0; y < 66; y++) { const w = Math.round(30 - y * 0.18); p.rect(42 - w / 2, y, w, 1, 'plaster'); } p.door(38, 0, 8, 14); p.win(39, 28, 6, 7); p.win(39, 46, 5, 6); p.roof(28, 55, 66, 'roof', 1, 2); const cx = 42, cy = 66; for (const [ux, uy] of [[0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707]]) { const vx = -uy, vy = ux; p.line(cx, cy, cx + ux * 40, cy + uy * 40, 'timber', 2); for (let t = 9; t < 40; t++) for (let k = 1; k <= 7; k++) { const x = cx + ux * t + vx * k, y = cy + uy * t + vy * k; p.set(x, y, t % 6 === 0 || k === 7 ? 'timber' : 'white'); } } p.rect(40, 64, 4, 4, 'metal'); return p; } });
  def({ id: 'stonewall', name: '돌담', tier: 0, era: 2, cat: 'deco', note: '키가 딱 건축가 둘만큼.',
    art() { const p = new Px(30, 12); p.rect(0, 0, 30, 10, 'stone'); for (let x = 0; x < 30; x += 5) p.rect(x, 10, 3, 2, 'stone'); return p; } });
  def({ id: 'smalllamp', name: '등잔 기둥', tier: 0, era: 2, cat: 'deco', note: '밤마다 누군가 불을 붙인다.',
    art() { const p = new Px(8, 26); p.rect(3, 0, 2, 18, 'wood'); p.rect(0, 18, 8, 6, 'metal'); p.rect(2, 19, 4, 4, 'flame'); p.rect(2, 24, 4, 2, 'metal'); return p; } });
  def({ id: 'haystack', name: '건초더미', tier: 0, era: 2, cat: 'deco', note: '안에 바늘은 없다. 블럭은 있을지도.',
    art(rng) { const p = new Px(22, 16); p.ellipse(11, 5, 10, 9, 'straw', rng, 0.15); p.rect(1, 0, 20, 4, 'straw'); return p; } });

  // ── 3 장원 ─────────────────────────────────────────────
  def({ id: 'timberhouse', name: '목조 주택', tier: 3, era: 3, cat: 'house', cap: 4, note: '나무 뼈대 사이로 하얀 벽. 2층 창가엔 화분.',
    art(rng) { const w = pick(rng, [44, 52]); const p = new Px(w + 10, 74); p.rect(5, 0, w, 3, 'stone'); p.rect(5, 3, w, 20, 'plaster'); p.door(5 + Math.floor(w / 2) - 4, 0, 8, 14); p.win(10, 9, 7, 8); p.win(w - 7, 9, 7, 8); p.rect(3, 23, w + 4, 22, 'plaster'); for (let x = 3; x <= w + 6; x += 9) p.rect(x, 23, 2, 22, 'timber'); p.rect(3, 23, w + 4, 2, 'timber'); p.rect(3, 43, w + 4, 2, 'timber'); for (let x = 3; x + 9 <= w + 6; x += 18) p.line(x + 2, 25, x + 8, 42, 'timber'); p.win(13, 30, 7, 8); p.win(w - 10, 30, 7, 8); p.rect(12, 28, 9, 2, 'flower'); p.rect(w - 11, 28, 9, 2, 'flower3'); const top = p.roof(3, w + 6, 45, 'roof', 1, 3); p.rect(w - 4, 52, 6, top - 50, 'brick'); return p; } });
  def({ id: 'chapel', name: '예배당', tier: 4, era: 3, cat: 'civic', visit: true, note: '종이 울리면 다들 하던 일을 멈추고 고개를 든다.',
    art() { const p = new Px(76, 104); p.rect(4, 0, 48, 40, 'stone'); p.arch(28, 0, 6, 10, null); p.door(23, 0, 10, 14, true); p.ellipse(28, 30, 7, 7, 'glass'); p.ellipse(28, 30, 2.5, 2.5, 'purple'); for (const x of [10, 44]) { p.rect(x, 12, 4, 16, 'glass'); p.ellipse(x + 2, 28, 2, 2, 'glass'); } p.roof(4, 51, 40, 'slate', 1, 2); p.rect(54, 0, 18, 70, 'stone'); p.door(59, 0, 8, 12); p.arch(63, 50, 4, 6, 'ink'); p.rect(61, 50, 4, 4, 'gold'); p.rect(52, 70, 22, 3, 'dstone'); let a = 54, b = 71, y = 73; while (a <= b) { p.rect(a, y, b - a + 1, 1, 'slate'); y++; if ((y - 73) % 2 === 0) { a++; b--; } } p.rect(62, y, 2, 6, 'gold'); p.rect(60, y + 3, 6, 2, 'gold'); return p; } });
  def({ id: 'watermill', name: '물레방앗간', tier: 4, era: 3, cat: 'prod', note: '물이 돌리고, 바퀴가 돌리고, 건축가가 구경한다.',
    art() { const p = new Px(84, 60, 16); p.rect(0, -16, 34, 15, 'water'); p.rect(0, -16, 34, 2, 'dstone'); p.rect(34, -16, 2, 16, 'dstone'); p.rect(38, 0, 44, 28, 'stone'); p.door(52, 0, 9, 14); p.win(68, 12, 7, 8); p.roof(38, 81, 28, 'roof', 1, 3); const cx = 17, cy = 10; p.ellipse(cx, cy, 16, 16, 'wood'); p.ellipse(cx, cy, 13, 13, null); for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2; p.line(cx, cy, cx + Math.cos(an) * 15, cy + Math.sin(an) * 15, 'timber'); } p.ellipse(cx, cy, 3, 3, 'metal'); return p; } });
  def({ id: 'waterway', name: '물길', tier: 1, era: 3, cat: 'water', note: '마을을 가로지르는 작은 물길. 건축가들은 건너뛰기 놀이를 한다.',
    art(rng) { const w = pick(rng, [48, 64]); const p = new Px(w, 2, 16); p.rect(3, -15, w - 6, 15, 'water'); p.rect(0, -16, 3, 16, 'dstone'); p.rect(w - 3, -16, 3, 16, 'dstone'); p.rect(0, -16, w, 2, 'dstone'); p.rect(0, 0, 4, 2, 'stone'); p.rect(w - 4, 0, 4, 2, 'stone'); return p; } });
  def({ id: 'bridge', name: '돌다리', tier: 2, era: 3, cat: 'water', note: '물 위로 둥근 아치 하나. 아래로는 하늘이 비친다.',
    art() { const W = 76; const p = new Px(W, 28, 16); p.rect(6, -15, W - 12, 15, 'water'); p.rect(0, -16, 6, 16, 'dstone'); p.rect(W - 6, -16, 6, 16, 'dstone'); p.rect(0, -16, W, 2, 'dstone'); p.rect(0, 0, W, 16, 'stone'); p.arch(38, -1, 24, 1, null); p.paintIf((x, y, m) => undefined); for (let y = -1; y < 1; y++) for (let x = 14; x < 62; x++) if (!p.get(x, y)) p.set(x, y, 'water'); p.rect(0, 16, W, 2, 'dstone'); for (let x = 0; x < W; x += 6) p.rect(x, 18, 2, 6, 'dstone'); p.rect(0, 23, W, 2, 'dstone'); return p; } });
  def({ id: 'lantern', name: '중세 가로등', tier: 0, era: 3, cat: 'deco', note: '쇠 장식에 유리 등. 밤길이 무섭지 않다.',
    art() { const p = new Px(14, 34); p.rect(4, 0, 6, 2, 'metal'); p.rect(6, 2, 2, 24, 'metal'); p.rect(6, 26, 7, 1, 'metal'); p.rect(9, 18, 5, 8, 'metal'); p.rect(10, 19, 3, 6, 'flame'); p.rect(5, 28, 4, 2, 'gold'); return p; } });
  def({ id: 'topiary', name: '수풀 조형', tier: 1, era: 3, cat: 'park', note: '정원사는 없다. 매일 아침 모양이 조금 바뀐다.',
    art(rng) { const p = new Px(22, 40); p.rect(5, 0, 12, 5, 'stone'); const k = RI(rng, 0, 2); if (k === 0) { p.ellipse(11, 11, 8, 6, 'leaf'); p.ellipse(11, 22, 6, 5, 'leaf'); p.ellipse(11, 31, 4, 3.5, 'leaf'); } else if (k === 1) { for (let y = 5; y < 38; y++) { const w = Math.round(((38 - y) / 33) * 18); p.rect(11 - w / 2, y, w, 1, y % 6 < 1 ? 'dleaf' : 'leaf'); } } else { p.rect(10, 5, 2, 12, 'trunk'); p.ellipse(11, 26, 9, 9, 'leaf'); } return p; } });
  def({ id: 'flowerbed', name: '화단', tier: 0, era: 3, cat: 'park', note: '줄 맞춰 핀 꽃. 하나만 줄을 안 맞췄다.',
    art(rng) { const p = new Px(32, 9); p.rect(0, 0, 32, 3, 'dstone'); p.rect(1, 3, 30, 2, 'leaf'); for (let x = 2; x < 30; x += 3) { p.rect(x, 5, 1, 2, 'leaf'); p.ellipse(x + 0.5, 7.5, 1.3, 1.3, pick(rng, ['flower', 'flower2', 'flower3', 'white'])); } return p; } });

  // ── 4 중세 성읍 ─────────────────────────────────────────
  def({ id: 'townhouse', name: '타운하우스', tier: 3, era: 4, cat: 'house', cap: 5, note: '좁고 높다. 맨 위층 창에서는 성벽 너머가 보인다.',
    art(rng) { const w = pick(rng, [34, 40]); const wall = pick(rng, ['plaster', 'brick', 'stone']); const p = new Px(w + 6, 96); p.rect(3, 0, w, 18, 'stone'); p.door(7, 0, 8, 14); p.win(19, 4, w - 20, 9); p.rect(18, 15, w - 18, 3, pick(rng, ['red', 'blue', 'purple'])); for (let f = 0; f < 3; f++) { const y0 = 18 + f * 20; p.rect(1, y0, w + 4, 20, wall); p.rect(1, y0, w + 4, 2, 'timber'); for (let x = 5; x + 6 < w + 4; x += 12) p.win(x, y0 + 6, 6, 9); } let a = 0, b = w + 5, y = 78; while (a <= b) { p.rect(a, y, b - a + 1, 1, 'slate'); y++; if (y % 2 === 0) { a++; b--; } } return p; } });
  def({ id: 'tavern', name: '여관', tier: 4, era: 4, cat: 'civic', visit: true, note: '간판엔 잔 두 개. 안에서는 웃음소리.',
    art() { const p = new Px(92, 76); p.rect(4, 0, 84, 26, 'stone'); p.door(12, 0, 10, 16); for (let x = 30; x < 84; x += 14) p.win(x, 7, 8, 10); p.rect(2, 26, 88, 26, 'plaster'); for (let x = 2; x <= 88; x += 11) p.rect(x, 26, 2, 26, 'timber'); p.rect(2, 26, 88, 2, 'timber'); p.rect(2, 50, 88, 2, 'timber'); for (let x = 7; x < 84; x += 22) p.win(x, 32, 8, 10); p.roof(2, 89, 52, 'roof', 1, 3); p.rect(88, 18, 2, 8, 'metal'); p.rect(86, 10, 6, 8, 'wood'); p.rect(87, 12, 4, 4, 'gold'); p.rect(14, 60, 6, 14, 'brick'); return p; } });
  def({ id: 'clocktower', name: '시계탑', tier: 4, era: 4, cat: 'civic', note: '바늘이 없는 시계. 이 세계의 시간은 블럭으로 잰다.',
    art() { const p = new Px(40, 130); p.rect(4, 0, 32, 88, 'stone'); p.door(15, 0, 10, 16); for (let y = 24; y < 70; y += 16) { p.win(10, y, 5, 8, 'dstone', false); p.win(25, y, 5, 8, 'dstone', false); } p.ellipse(20, 78, 11, 11, 'white'); p.ellipse(20, 78, 11, 11, null); p.ellipse(20, 78, 10, 10, 'white'); for (let a = 0; a < 12; a++) { const an = (a / 12) * Math.PI * 2; p.set(20 + Math.cos(an) * 8, 78 + Math.sin(an) * 8, 'ink'); } p.line(20, 78, 20, 85, 'ink'); p.line(20, 78, 25, 78, 'ink'); p.rect(0, 88, 40, 3, 'dstone'); for (let x = 0; x < 40; x += 5) p.rect(x, 91, 3, 4, 'dstone'); let a = 4, b = 35, y = 95; while (a <= b) { p.rect(a, y, b - a + 1, 1, 'slate'); y++; if (y % 2) { a++; b--; } } p.rect(19, y, 2, 6, 'gold'); return p; } });
  def({ id: 'citywall', name: '성벽', tier: 1, era: 4, cat: 'deco', note: '적은 없다. 그래도 성벽은 있어야 성읍이다.',
    art() { const p = new Px(52, 36); p.rect(0, 0, 52, 28, 'stone'); for (let x = 0; x < 52; x += 8) p.rect(x, 28, 5, 6, 'stone'); p.rect(25, 12, 2, 7, 'ink'); return p; } });
  def({ id: 'banner', name: '깃발 기둥', tier: 0, era: 4, cat: 'deco', note: '바람 방향이 매일 바뀐다. 깃발은 늘 오른쪽.',
    art(rng) { const p = new Px(18, 42); p.rect(1, 0, 2, 40, 'metal'); p.rect(0, 40, 4, 2, 'gold'); const c = pick(rng, ['red', 'purple', 'blue']); for (let y = 22; y < 38; y++) p.rect(3, y, 14 - (y < 26 ? 0 : 0), 1, c); p.rect(3, 29, 14, 2, 'gold'); for (let i = 0; i < 4; i++) p.set(16 - i, 22 + i, null); return p; } });
  def({ id: 'plaza', name: '분수 광장', tier: 2, era: 4, cat: 'park', visit: true, note: '세 단의 분수. 동전 대신 다들 블럭을 던진다.',
    art() { const p = new Px(72, 50); p.rect(0, 0, 72, 3, 'path'); p.rect(4, 3, 64, 9, 'marble'); p.rect(6, 10, 60, 2, 'water'); p.rect(32, 12, 8, 14, 'marble'); p.rect(20, 26, 32, 4, 'marble'); p.rect(22, 29, 28, 1, 'water'); p.rect(34, 30, 4, 8, 'marble'); p.rect(28, 38, 16, 3, 'marble'); p.rect(30, 40, 12, 1, 'water'); p.rect(35, 41, 2, 7, 'water'); for (const s of [-1, 1]) for (let i = 0; i < 10; i++) p.set(36 + s * (6 + i * 1.6), 40 - Math.round(i * i * 0.12), 'water'); return p; } });
  def({ id: 'lake', name: '호수와 아치 다리', tier: 4, era: 4, cat: 'water', note: '아치 셋이 물 위에 비쳐 동그라미 셋이 된다.',
    art() { const W = 132; const p = new Px(W, 32, 24); for (let y = -24; y < 0; y++) { const inset = Math.max(0, -y - 12) * 2; p.rect(inset, y, W - inset * 2, 1, 'water'); p.set(inset, y, 'dstone'); p.set(W - 1 - inset, y, 'dstone'); } p.rect(0, 0, W, 14, 'stone'); for (const cx of [30, 66, 102]) p.arch(cx, -1, 13, 1, null); for (let y = -1; y < 1; y++) for (let x = 0; x < W; x++) if (!p.get(x, y)) p.set(x, y, 'water'); p.rect(0, 14, W, 2, 'dstone'); for (let x = 0; x < W; x += 6) p.rect(x, 16, 2, 6, 'dstone'); p.rect(0, 21, W, 2, 'dstone'); p.rect(65, 22, 2, 8, 'metal'); p.rect(63, 28, 6, 4, 'flame'); return p; } });
  def({ id: 'cathedral', name: '대성당', tier: 5, era: 4, cat: 'civic', visit: true, note: '두 첨탑과 하나의 장미창. 장미창 무늬는 오래된 고리에서 따왔다.',
    art() { const W = 136; const p = new Px(W, 180); const m = 68; p.rect(28, 0, 80, 70, 'stone'); p.arch(m, 0, 9, 14, null); p.door(m - 8, 0, 16, 22); for (const dx of [-24, 24]) p.door(m + dx - 5, 0, 10, 16); p.ellipse(m, 50, 15, 15, 'glass'); for (let a = 0; a < 12; a++) { const an = (a / 12) * Math.PI * 2; p.line(m, 50, m + Math.cos(an) * 14, 50 + Math.sin(an) * 14, a % 2 ? 'purple' : 'red'); } p.ellipse(m, 50, 3, 3, 'gold'); for (const x of [36, 96]) { p.rect(x, 22, 6, 28, 'glass'); p.ellipse(x + 3, 50, 3, 3, 'glass'); } p.roof(28, 107, 70, 'slate', 1, 0); for (const tx of [2, 108]) { p.rect(tx, 0, 26, 112, 'stone'); p.door(tx + 8, 0, 10, 16); for (let y = 30; y < 104; y += 22) p.win(tx + 9, y, 8, 14, 'dstone'); p.rect(tx - 2, 112, 30, 4, 'dstone'); for (let x = tx - 2; x < tx + 28; x += 5) p.rect(x, 116, 3, 4, 'dstone'); let a = tx, b = tx + 25, y = 120; while (a <= b) { p.rect(a, y, b - a + 1, 1, 'slate'); y++; if ((y - 120) % 3 === 0) { a++; b--; } } p.rect(tx + 12, y, 2, 8, 'gold'); p.rect(tx + 9, y + 4, 8, 2, 'gold'); } return p; } });
  def({ id: 'castle', name: '성', tier: 5, era: 4, cat: 'civic', note: '성주는 없다. 가장 작은 건축가가 가끔 왕좌에 앉아 본다.',
    art() { const W = 196; const p = new Px(W, 160); p.rect(0, 0, W, 48, 'stone'); for (let x = 0; x < W; x += 8) p.rect(x, 48, 5, 6, 'stone'); p.arch(98, 0, 14, 18, null); p.rect(84, 0, 28, 32, 'door'); p.arch(98, 0, 12, 18, 'door'); for (let x = 86; x < 110; x += 4) p.rect(x, 4, 1, 26, 'metal'); for (const tx of [0, 164]) { p.rect(tx, 0, 32, 92, 'stone'); for (let y = 24; y < 84; y += 18) p.rect(tx + 14, y, 4, 9, 'ink'); p.rect(tx - 2, 92, 36, 4, 'dstone'); for (let x = tx - 2; x < tx + 34; x += 6) p.rect(x, 96, 4, 5, 'dstone'); p.rect(tx + 15, 101, 2, 20, 'metal'); p.rect(tx + 17, 110, 14, 10, 'red'); p.rect(tx + 17, 114, 14, 2, 'gold'); } p.rect(58, 48, 80, 70, 'stone'); for (let y = 60; y < 110; y += 20) for (const x of [70, 94, 118]) p.win(x, y, 8, 12, 'dstone'); p.rect(56, 118, 84, 4, 'dstone'); for (let x = 56; x < 140; x += 6) p.rect(x, 122, 4, 5, 'dstone'); p.rect(97, 127, 2, 28, 'metal'); p.rect(99, 140, 22, 14, 'red'); p.rect(99, 146, 22, 2, 'gold'); return p; } });

  // ── 특별 ─────────────────────────────────────────────
  def({ id: 'grave', name: '작은 무덤', tier: 0, era: 0, cat: 'special', hidden: true, note: '먼저 떠난 친구를 위해.',
    art(rng) { const p = new Px(14, 16); p.rect(0, 0, 14, 2, 'grass'); p.rect(3, 2, 8, 9, 'stone'); p.ellipse(7, 11, 4, 3, 'stone'); p.rect(6, 5, 2, 5, 'dstone'); p.rect(4, 7, 6, 2, 'dstone'); p.ellipse(1.5, 3, 1.4, 1.4, pick(rng, ['flower', 'flower2'])); p.ellipse(12.5, 3, 1.4, 1.4, 'flower3'); return p; } });

  T.DEFS = D;
  T.DEF = {};
  D.forEach((d, i) => { d.index = i; T.DEF[d.id] = d; });

  const cache = new Map();
  T.shapeOf = function (id, seed) {
    const key = id + '#' + seed;
    let s = cache.get(key);
    if (s) return s;
    const d = T.DEF[id];
    s = T.toShape(d.art(T.rng(seed * 7919 + d.index * 104729 + 1)));
    cache.set(key, s);
    if (cache.size > 600) cache.delete(cache.keys().next().value);
    return s;
  };
})();
