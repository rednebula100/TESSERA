'use strict';
// ─────────────────────────────────────────────────────────────
//  UI: HUD, 패널, 리셋 봉인, 모달, 카드, 라디얼 메뉴, 튜토리얼
// ─────────────────────────────────────────────────────────────
(function () {
  const $ = T.$;
  const fmt = T.fmt;
  const UI = (T.ui = { tab: 'arch', bpTier: 0, msOpen: {} });
  let binds = [], sig = '', card = null, lastTab = null;
  const S = () => T.G.s;
  const CUR = {
    shards: { name: '조각', ic: 'shard' }, vertices: { name: '꼭짓점', ic: 'vertex' }, grains: { name: '결', ic: 'grain' }, prisms: { name: '프리즘', ic: 'prism' },
    pigments: { name: '안료', ic: 'pigment' }, folds: { name: '안개', ic: 'fold' }, lanterns: { name: '등불', ic: 'lantern' }, goods: { name: '물자', ic: 'goods' },
  };
  const ic = (k) => `<i class="ic ic-${k}"></i>`;

  // ── HUD ──────────────────────────────────────────────────
  function buildHud() {
    $('#cur').innerHTML = `
      <div class="cur-main">${ic('shard')}<div><div class="cur-val" id="v-shards">0</div><div class="cur-sub"><span id="v-rate">0</span> /초 조각</div></div></div>
      ${['vertices', 'grains', 'prisms', 'pigments', 'folds', 'lanterns', 'goods'].map((k) => `<div class="cur-row" data-c="${k}">${ic(CUR[k].ic)}<span id="v-${k}">0</span><small>${CUR[k].name}</small></div>`).join('')}
      <div class="cur-town" id="v-town"></div>`;
  }
  function updateHud() {
    const s = S();
    $('#v-shards').textContent = fmt(s.shards);
    $('#v-rate').textContent = fmt(T.G.rate);
    const show = { vertices: s.flags.l1Done, grains: s.flags.l2Done, prisms: s.flags.l3Done, pigments: s.flags.l4Done, folds: s.flags.l5Done, lanterns: s.flags.l6Done, goods: s.ms >= 18 };
    for (const k in show) { $('#v-' + k).textContent = fmt(s[k]); $(`[data-c=${k}]`).classList.toggle('show', !!show[k]); }
    const town = $('#v-town');
    if (s.era >= 1) {
      const n = T.vil.night(), m = T.vil.moon();
      const ev = s.event && s.event.t > 0 ? `<span class="ev">${s.event.type === 'aurora' ? '오로라' : '일식'} ${Math.ceil(s.event.t)}초</span>` : '';
      town.innerHTML = `<span>${T.vil.day()}일째</span><span>${n > 0.5 ? '밤' : '낮'} ${T.vil.timeLabel()}</span><span>${n > 0.3 ? m.name : ''}</span>${ev}<span>${T.ERAS[s.era].name}</span><span>인구 ${T.vil.population()}/${T.vil.capacity()}</span>`;
      town.classList.add('show');
    } else town.classList.remove('show');
  }

  // ── seals ────────────────────────────────────────────────
  function seal(key, name, iconK, cls, onClick) {
    const box = $('#seals');
    let el = box.querySelector(`[data-k="${key}"]`);
    if (!el) {
      el = T.h(`<button class="seal ${cls}" data-k="${key}"><span class="seal-ic">${ic(iconK)}</span><span class="seal-body"><span class="seal-name">${name}</span><span class="seal-bar"><i></i></span><span class="seal-txt"></span></span></button>`);
      el.addEventListener('click', () => { T.audio.click(); onClick(); });
      box.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
    }
    return el;
  }
  const SEEN_LINE = ['', '지평선 너머, 무언가가 모습을 드러냅니다.', '어디선가 톡톡, 돌 다듬는 소리가 들립니다.', '빛이 모서리에 걸려 흔들립니다.', '어디선가 물감 냄새가 납니다.', '세상 뒤에 또 다른 세상이 겹쳐 보입니다.', '멀리서 굴뚝 연기가 피어오릅니다.'];
  function updateSeals() {
    const s = S(), box = $('#seals'), want = new Set();
    for (let n = 1; n <= 6; n++) {
      const L = T.G.L[n];
      if (!L.seen(s)) continue;
      want.add('L' + n);
      if (!s.flags.seen[n]) { s.flags.seen[n] = 1; UI.toast(SEEN_LINE[n], 'big'); T.audio.unlock(); }
      const el = seal('L' + n, L.name, L.icon, 'seal-' + n, () => confirmReset(n));
      const prog = L.prog(s);
      el.querySelector('.seal-bar i').style.width = (prog <= 0 ? 0 : T.clamp(Math.log10(1 + prog) / Math.log10(1 + L.need), 0, 1) * 100).toFixed(1) + '%';
      const ready = T.G.canReset(n);
      el.classList.toggle('ready', ready);
      el.querySelector('.seal-txt').innerHTML = ready ? `지금 하면 ${ic(L.icon)} <b>+${fmt(L.gain(s))}</b>` : `${L.needText} ${fmt(prog)} / ${fmt(L.need)}`;
    }
    if (T.G.eraReady()) {
      want.add('era');
      const el = seal('era', '시대 전환', 'era', 'seal-era ready', () => { UI.tab = 'town'; UI.rebuildPanel(true); });
      el.querySelector('.seal-bar i').style.width = '100%';
      el.querySelector('.seal-txt').textContent = `${T.ERAS[s.era + 1].name}(으)로 넘어갈 준비가 되었습니다`;
    }
    for (const el of [...box.children]) if (!want.has(el.dataset.k)) el.remove();
  }
  function confirmReset(n) {
    const s = S(), L = T.G.L[n], ready = T.G.canReset(n), settled = s.era >= 1;
    const lose = ['', '조각, 작업장' + (settled ? ', 건축가 레벨' : ', 건축가, 세계의 모든 블록과 건축물'), '위의 모든 것과 꼭짓점, 공방', '위의 모든 것과 결, 석공소', '위의 모든 것과 프리즘, 실험실', '위의 모든 것과 안료, 아틀리에', '위의 모든 것과 안개, 층계 일부, <b>마을 전체</b>'][n];
    const keep = ['', '이정표, 도감, 공방' + (settled ? ', 마을과 주민' : ''), '이정표, 도감, 석공소, <b>해상도</b>', '이정표, 도감, 실험실, 해상도, <b>색</b>', '이정표, 도감, 아틀리에, 방울', '이정표, 도감, 층계, 겹', '이정표, 도감, 등불 회관, 겹, 시대, 구역'][n];
    const flavor = ['', '모든 블록을 허물고 그 모서리만 남깁니다. 남은 모서리는 <b>꼭짓점</b>이 됩니다.',
      '블록 하나를 더 고운 조각으로 다듬을 수 있다면? 톡톡 주민이 찾아와 <b>결</b>을 따라 블록을 다듬습니다.',
      s.flags.color ? '쌓아 올린 빛을 다시 프리즘에 통과시킵니다.' : '이 세계는 아직 회색입니다. 결을 모아 빛을 굴절시키면 무언가 달라질지도 모릅니다.',
      '세계를 한 번 씻어내고, 그 물로 물감을 만듭니다. 방울 주민이 다듬어진 칸을 하나하나 칠합니다.',
      '세상 뒤에 세상을 겹칩니다. 앞뒤로 <b>겹</b>이 생기고, 폴짝 주민이 주민들을 데려갑니다. 겹 사이에 깔린 <b>안개</b>를 모읍니다.',
      s.flags.l6Done ? '마을을 정리하고 새로운 땅에 다시 정착합니다.' : '흩어진 조형물을 뒤로하고, 처음으로 <b>지붕</b>을 얹습니다. 건축가들은 이제 마을을 이루어 삽니다.'][n];
    modal(`<div class="m-head"><span class="m-kicker">${n}번째 리셋</span><h2>${ic(L.icon)} ${L.name}</h2></div><p class="m-flavor">${flavor}</p>
      <div class="m-grid"><div><h4>초기화</h4><p>${lose}</p></div><div><h4>유지</h4><p>${keep}</p></div></div>
      <div class="m-gain">${ready ? `획득: ${ic(L.icon)} <b>${fmt(L.gain(s))}</b> ${L.cur}` : `조건: ${L.needText} <b>${fmt(L.need)}</b> (현재 ${fmt(L.prog(s))})`}</div>
      <div class="m-actions"><button class="btn ghost" data-close>돌아가기</button><button class="btn primary" id="do-reset" ${ready ? '' : 'disabled'}>${L.name}하기</button></div>`, 'm-reset');
    const b = $('#do-reset'); if (b) b.addEventListener('click', () => { closeModal(); T.fx.reset(n); });
  }
  UI.confirmReset = confirmReset;

  // ── tabs ─────────────────────────────────────────────────
  function tabsDef() {
    const s = S();
    const t = [{ id: 'arch', name: '고용' }];
    if (s.archs.length || s.workers.length || s.pets.length) t.push({ id: 'people', name: '주민' });
    t.push({ id: 'work', name: '작업장' }, { id: 'bp', name: '설계도' }, { id: 'ms', name: '이정표', dot: T.G.msReady() });
    if (s.flags.l1Done) t.push({ id: 'v', name: '공방', layer: 1 });
    if (s.flags.l2Done) t.push({ id: 's', name: '석공소', layer: 2 });
    if (s.flags.l3Done) t.push({ id: 'p', name: '실험실', layer: 3 });
    if (s.flags.l4Done) t.push({ id: 'g', name: '아틀리에', layer: 4 });
    if (s.flags.l5Done) t.push({ id: 'z', name: '층계', layer: 5 });
    if (s.flags.l6Done) t.push({ id: 'l', name: '등불', layer: 6 });
    if (s.era >= 1) t.push({ id: 'town', name: '마을', layer: 6, dot: T.G.eraReady() });
    if (s.ms >= 19) t.push({ id: 'auto', name: '물자', layer: 7 });
    return t;
  }
  function structureSig() {
    const s = S();
    const ups = T.G.UPS().map((list, i) => list.filter((d) => T.G.upVisible(i, d)).length).join(',');
    return [UI.tab, tabsDef().map((t) => t.id + (t.dot ? '!' : '')).join(), T.SHAPES.map((x) => +T.G.shapeUnlocked(x.id)).join(''), ups, s.resLv, UI.bpTier,
      T.DEFS.filter((d) => T.st.visible(d)).length, T.DEFS.filter((d) => T.st.available(d)).length, T.st.activeBps().length, Object.keys(s.bps.done).length,
      Math.min(s.archs.length, 200) + '/' + s.workers.length + '/' + s.kids.length + '/' + s.pets.length, s.ms, s.era, s.flags.color, Object.keys(s.mup).length, T.G.layers()].join('|');
  }
  function buildTabs() {
    const s = S(), nav = $('#tabs');
    nav.innerHTML = '';
    for (const t of tabsDef()) {
      const isNew = t.layer && !s.flags.seenTabs[t.id];
      const b = T.h(`<button class="tab ${t.layer ? 'tab-l' + t.layer : ''} ${UI.tab === t.id ? 'on' : ''}">${t.name}${isNew || t.dot ? '<i class="newdot"></i>' : ''}</button>`);
      b.addEventListener('click', () => { if (UI.tab === t.id) return; UI.tab = t.id; s.flags.seenTabs[t.id] = 1; T.audio.click(); UI.rebuildPanel(true); });
      nav.appendChild(b);
    }
  }
  UI.rebuildPanel = function (animate) {
    binds = [];
    if (!tabsDef().some((t) => t.id === UI.tab)) UI.tab = 'arch';
    buildTabs();
    const body = $('#tabbody');
    const keep = !animate && lastTab === UI.tab ? body.scrollTop : 0;
    body.innerHTML = '';
    body.classList.toggle('anim', !!animate || lastTab !== UI.tab);
    lastTab = UI.tab;
    $('#panel').dataset.theme = UI.tab;
    ({ arch: tabArch, people: tabPeople, work: (b) => tabUp(0, b), bp: tabBp, ms: tabMs, v: (b) => tabUp(1, b), s: (b) => tabUp(2, b), p: (b) => tabUp(3, b), g: (b) => tabUp(4, b), z: (b) => tabUp(5, b), l: (b) => tabUp(6, b), town: tabTown, auto: (b) => tabUp(7, b) })[UI.tab](body);
    body.scrollTop = keep;
    sig = structureSig();
    updateBinds();
  };
  const bind = (el, fn) => binds.push({ el, fn });
  const updateBinds = () => { for (const b of binds) b.fn(b.el); };

  // press and hold: keeps buying, faster the longer you hold; pointer capture + a hidden bigger hitbox keep it held
  function holdable(btn, act) {
    let timer = null, t0 = 0, delay = 0;
    const stop = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    const step = () => {
      const held = (performance.now() - t0) / 1000;
      const n = 1 + Math.floor(Math.max(0, held - 2) * 1.5);
      let ok = false;
      for (let i = 0; i < n; i++) { if (btn.disabled || !act(i > 0)) break; ok = true; }
      if (!ok) { stop(); return; }
      delay = Math.max(16, delay * 0.8);
      timer = setTimeout(step, delay);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || btn.disabled) return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (!act(false)) return;
      t0 = performance.now(); delay = 150;
      btn.classList.add('holding');
      timer = setTimeout(step, 320);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, stop);
  }
  function costBtn(costFn, curKey, onBuy, label = '', maxText = '최대') {
    const b = T.h(`<button class="buy"><span class="buy-l">${label}</span><span class="buy-c">${ic(CUR[curKey].ic)}<b></b></span></button>`);
    holdable(b, (quiet) => {
      if (onBuy()) { if (!quiet) T.audio.buy(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); updateBinds(); return true; }
      if (!quiet) T.audio.deny(); return false;
    });
    bind(b, () => {
      const c = costFn();
      if (c === null) { b.classList.add('maxed'); b.disabled = true; b.querySelector('b').textContent = maxText; return; }
      b.classList.remove('maxed');
      b.querySelector('b').textContent = fmt(c);
      b.disabled = !(S()[curKey] >= c);
    });
    return b;
  }

  function tabArch(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">건축가는 저마다 조형물을 짓습니다. 혼자 멀리 떠나기도 하고, 친구의 일을 돕기도 합니다. 세계에는 <b>자리</b>가 정해져 있어서 한 명 한 명이 소중합니다.</p>`));
    const capBox = T.h(`<div class="capbox" data-tip="<b>자리</b><br>함께 지낼 수 있는 건축가 수입니다. 이정표를 세우면 늘어나고, 정착한 뒤에는 집 정원만큼 늘어납니다."><span class="cap-l">자리</span><span class="cap-pips"></span><b class="cap-n"></b></div>`);
    bind(capBox, () => { const n = s.archs.length, c = T.G.archCap(); capBox.querySelector('.cap-n').textContent = `${n}/${c}`; const pips = capBox.querySelector('.cap-pips'); if (pips.childElementCount !== c) { pips.innerHTML = ''; for (let i = 0; i < Math.min(c, 40); i++) pips.appendChild(T.h('<i></i>')); } [...pips.children].forEach((p, i) => p.classList.toggle('on', i < n)); capBox.classList.toggle('full', n >= c); });
    body.appendChild(capBox);
    let shownLocked = false;
    for (const sh of T.SHAPES) {
      if (!T.G.shapeUnlocked(sh.id)) {
        if (shownLocked || !s.flags.l1Done) continue;
        shownLocked = true;
        const row = T.h(`<div class="row locked"><div class="pt"></div><div class="row-main"><div class="row-name">???</div><div class="row-desc">${sh.index <= 3 ? '꼭짓점 공방에서 해금' : s.flags.l3Done ? '프리즘 실험실에서 해금' : '아직 보이지 않는 빛 너머에'}</div></div></div>`);
        const pc = T.sprites.portrait(sh.id, s.flags.color, 3); pc.classList.add('sil'); row.querySelector('.pt').appendChild(pc);
        body.appendChild(row); continue;
      }
      const row = T.h(`<div class="row"><div class="pt"></div><div class="row-main"><div class="row-name">${sh.name} 건축가 <small class="own"></small></div><div class="row-desc"></div></div></div>`);
      row.querySelector('.pt').appendChild(T.sprites.portrait(sh.id, s.flags.color, 3, 'normal'));
      const hb = costBtn(() => (T.G.capFull() ? null : T.G.hireCost(sh.id)), 'shards', () => T.G.hire(sh.id), '고용', '자리 없음');
      row.appendChild(hb);
      bind(row, () => { const n = T.G.owned(sh.id); row.querySelector('.own').textContent = n ? `${n}명` : ''; row.querySelector('.row-desc').innerHTML = `블록 ${ic('shard')}${fmt((sh.value + T.G.lv(s.up, 'solid')) * T.G.M)}  ${T.G.cooldown({ s: sh.id }).toFixed(1)}초`; });
      body.appendChild(row);
    }
    if (!s.flags.l1Done) body.appendChild(T.h(`<p class="tab-note">다른 모양의 건축가는 「재구성」 너머에서 기다립니다.</p>`));
  }

  // ── residents tab ────────────────────────────────────────
  UI.filter = { shapes: {}, upTo: 0 };
  function tabPeople(body) {
    const s = S();
    const head = T.h(`<div class="sub-head"><span>건축가 ${s.archs.length}명</span></div>`);
    const one = T.h(`<button class="mini">가장 싼 레벨업</button>`);
    holdable(one, () => levelCheapest(() => true));
    bind(one, () => { let bc = Infinity; for (const d of s.archs) bc = Math.min(bc, T.G.levelCost(d)); one.innerHTML = `가장 싼 레벨업 ${ic('shard')}${fmt(bc)}`; one.disabled = !s.archs.length || s.shards < bc; });
    head.appendChild(one);
    body.appendChild(head);
    if (s.ms >= 7) {
      // bulk level-up with filters
      const box = T.h(`<div class="bulk"><div class="bulk-f"></div><label class="bulk-to">목표 레벨 <input type="number" min="0" max="999" value="${UI.filter.upTo || ''}" placeholder="제한 없음"></label><button class="btn primary">일괄 레벨업</button></div>`);
      const f = box.querySelector('.bulk-f');
      for (const sh of T.SHAPES) {
        if (!T.G.owned(sh.id)) continue;
        const on = UI.filter.shapes[sh.id] !== false;
        const c = T.h(`<button class="chip ${on ? 'on' : ''}">${sh.name}</button>`);
        c.addEventListener('click', () => { UI.filter.shapes[sh.id] = !(UI.filter.shapes[sh.id] !== false); c.classList.toggle('on'); });
        f.appendChild(c);
      }
      box.querySelector('input').addEventListener('change', (e) => (UI.filter.upTo = Math.max(0, parseInt(e.target.value) || 0)));
      box.querySelector('.btn').addEventListener('click', () => {
        const ok = (d) => UI.filter.shapes[d.s] !== false && (!UI.filter.upTo || d.lvl < UI.filter.upTo);
        let n = 0; while (n < 2000 && levelCheapest(ok, true)) n++;
        if (n) { T.audio.buy(); UI.toast(`레벨업 ${n}번`); } else T.audio.deny();
        updateBinds();
      });
      body.appendChild(box);
    }
    const grid = T.h(`<div class="roster"></div>`);
    for (const d of s.archs.slice(0, 200)) grid.appendChild(personTile(d, 'arch'));
    body.appendChild(grid);
    const others = [...s.workers.map((d) => [d, 'worker']), ...s.kids.map((d) => [d, 'kid']), ...s.pets.map((d) => [d, d.kind])];
    if (others.length) {
      body.appendChild(T.h(`<div class="sub-head"><span>일꾼 ${s.workers.length}, 아기 ${s.kids.length}, 다른 주민 ${s.pets.length}</span></div>`));
      const g2 = T.h(`<div class="roster"></div>`);
      for (const [d, k] of others) g2.appendChild(personTile(d, k));
      body.appendChild(g2);
    }
    if (s.era >= 1) body.appendChild(T.h(`<p class="tab-note left">분홍 막대는 수명입니다. 「밖」 표시는 집이 없어 밖에서 자는 주민이라 수명이 빨리 줄어듭니다.</p>`));
  }
  function levelCheapest(filter, quiet) {
    const s = S();
    let best = null, bc = Infinity;
    for (const d of s.archs) { if (!filter(d)) continue; const c = T.G.levelCost(d); if (c < bc) { bc = c; best = d; } }
    if (!best || !T.G.levelUp(best)) { if (!quiet) T.audio.deny(); return false; }
    if (!quiet) T.audio.buy();
    const e = T.ent.archs.find((x) => x.d === best); if (e) { e.happyT = 1; T.ent.hop(e); }
    updateBinds();
    return true;
  }
  function personTile(d, kind) {
    const s = S();
    const sprite = T.PET[kind] ? T.PET[kind].sprite : d.s;
    const it = T.h(`<button class="ro ${kind}" title="${d.name}"><span class="ro-top"><span class="ro-life"><i></i></span><span class="ro-lv"></span></span><span class="ro-out">밖</span></button>`);
    it.appendChild(T.sprites.portrait(sprite, s.flags.color, kind === 'kid' ? 1 : 2));
    it.addEventListener('click', () => { const e = T.ent.all().find((x) => x.d === d); if (e) { T.main.focus(e.x, 60); if (!e.inside) UI.openCard(e); else UI.toast(`${d.name}은(는) 지금 ${e.inside === 'sleep' ? '자고' : '구경하고'} 있어요.`); } });
    bind(it, () => {
      it.querySelector('.ro-lv').textContent = kind === 'arch' ? 'Lv' + d.lvl : kind === 'kid' ? '아기' : '';
      const life = it.querySelector('.ro-life');
      if (s.era >= 1 && d.life !== undefined) { life.style.visibility = 'visible'; life.firstChild.style.width = T.clamp(d.life / T.vil.maxLife(), 0, 1) * 100 + '%'; } else life.style.visibility = 'hidden';
      const e = T.ent.all().find((x) => x.d === d);
      it.querySelector('.ro-out').style.display = e && e.napping ? '' : 'none';
    });
    return it;
  }

  // ── upgrade shops ────────────────────────────────────────
  function upRow(def, store) {
    const s = S(), book = T.G.book(store), curKey = T.G.curKey(store);
    const row = T.h(`<div class="row up"><div class="up-ic">${T.icon(def.icon)}</div><div class="row-main"><div class="row-name">${def.name} <small class="lvl"></small></div><div class="row-desc"></div></div></div>`);
    const btn = costBtn(() => { const l = book[def.id] || 0; return l >= T.G.maxOf(store, def) ? null : def.cost(l); }, curKey, () => {
      const ok = T.G.buyUp(store, def);
      if (ok && def.shape) { T.audio.unlock(); UI.toast(`새 건축가 해금: ${T.SHAPE[def.shape].name}`, 'big'); setTimeout(() => UI.rebuildPanel(), 0); return false; }
      return ok;
    });
    row.appendChild(btn);
    if (def.auto) {
      const tg = T.h(`<button class="toggle"></button>`);
      tg.addEventListener('click', () => { s.autoOff[def.id] = !s.autoOff[def.id]; T.audio.click(); updateBinds(); });
      bind(tg, () => { const own = !!book[def.id]; tg.style.display = own ? '' : 'none'; tg.classList.toggle('on', own && !s.autoOff[def.id]); tg.textContent = s.autoOff[def.id] ? '꺼짐' : '켜짐'; });
      row.appendChild(tg);
    }
    bind(row, () => {
      const l = book[def.id] || 0, mx = T.G.maxOf(store, def);
      row.querySelector('.lvl').textContent = mx > 1 ? `${l}/${mx}` : l ? '보유' : '';
      row.querySelector('.row-desc').textContent = def.desc(l);
      row.classList.toggle('owned', l >= mx);
    });
    return row;
  }
  function hiddenNote(body, store) {
    const s = S();
    const hidden = T.G.UPS()[store].filter((d) => !T.G.upVisible(store, d));
    if (!hidden.length) return;
    const next = Math.min(...hidden.map((d) => d.ms || 0));
    const m = T.MILESTONES[next - 1];
    body.appendChild(T.h(`<p class="tab-note">업그레이드 ${hidden.length}개가 더 있습니다. ${m && next > s.ms ? `이정표 「${m.name}」을(를) 세우면 열립니다.` : ''}</p>`));
  }
  function resCard(body) {
    const s = S();
    const c = T.h(`<div class="res-card"><div class="res-title"><span>해상도</span><b id="res-now"></b></div><div class="res-steps"></div><p class="res-desc">블록 한 칸을 몇 조각으로 다듬을 수 있는지 정합니다. 쪼갤수록 건축물의 진짜 모습이 드러나고, 방울이 칠할 칸도 세밀해집니다. 한 번 올린 해상도는 어떤 리셋에도 남습니다.</p></div>`);
    const steps = c.querySelector('.res-steps');
    T.RES.forEach((r, i) => {
      const st = T.h(`<div class="res-step" data-i="${i}"><div class="res-grid" style="--n:${r}">${'<i></i>'.repeat(r * r)}</div><small>${T.RES_NAME[i]}</small><em>${r}×${r}</em></div>`);
      steps.appendChild(st);
    });
    const btn = T.h(`<button class="btn primary wide res-buy"></button>`);
    btn.addEventListener('click', () => { if (T.G.buyRes()) { T.audio.unlock(); T.fx.flash(); UI.toast(`해상도 ${T.RES_NAME[s.resLv]}! 톡톡 주민들이 더 곱게 다듬을 수 있습니다.`, 'big'); UI.rebuildPanel(); } else T.audio.deny(); });
    c.appendChild(btn);
    bind(c, () => {
      c.querySelector('#res-now').textContent = T.RES_NAME[s.resLv];
      T.$$('.res-step', c).forEach((el) => { const i = +el.dataset.i; el.classList.toggle('on', i <= s.resLv); el.classList.toggle('next', i === s.resLv + 1); });
      const next = s.resLv + 1;
      if (next > 3) { btn.textContent = '최고 해상도'; btn.disabled = true; return; }
      if (s.ms < T.RES_MS[next]) { btn.innerHTML = `이정표 「${T.MILESTONES[T.RES_MS[next] - 1].name}」 필요`; btn.disabled = true; return; }
      btn.innerHTML = `${T.RES_NAME[next]}로 올리기 ${ic('grain')} ${fmt(T.RES_COST[next])}`;
      btn.disabled = s.grains < T.RES_COST[next];
    });
    body.appendChild(c);
  }
  function tabUp(store, body) {
    const s = S();
    const meta = [
      ['작업장', 'shard', '작은 손들을 위한 작은 개선. 이번 회차에만 유지됩니다. 버튼을 꾹 누르면 점점 빠르게 연속으로 삽니다.', null],
      ['꼭짓점 공방', 'vertex', '허문 블록의 모서리를 모아 둔 공방. 재구성해도 사라지지 않습니다.', () => `보유 꼭짓점 효과: 조각 ×<b>${fmt(Math.sqrt(1 + s.vertices))}</b>`],
      ['석공소', 'grain', '블록을 결대로 다듬는 석공들의 작업장. 다듬기를 다시 해도 유지됩니다.', () => `다듬은 정도 ${(avgSplit() * 100).toFixed(1)}%  보유 결 효과: 조각 ×<b>${fmt(Math.pow(1 + s.grains, 0.5))}</b>`],
      ['프리즘 실험실', 'prism', '빛을 갈라 다시 모으는 실험실. 굴절해도 유지됩니다.', () => `보유 프리즘 효과: 조각 ×<b>${fmt(Math.pow(1 + s.prisms, 0.6))}</b>`],
      ['아틀리에', 'pigment', '방울 주민들이 다듬어진 칸을 하나하나 칠합니다. 걸어 다닌 땅에도 물감이 스며듭니다.', () => `채색 ${(T.G.coverage() * 100).toFixed(1)}% → 조각 ×${(1 + 2 * T.G.coverage()).toFixed(2)}`],
      ['층계', 'fold', '세상 뒤에 세상을 겹치는 층계. 겹치기를 다시 해도 유지됩니다.', () => `${T.G.layers()}겹, 보유 안개 효과: 조각 ×<b>${fmt(Math.pow(1 + s.folds, 0.75))}</b>`],
      ['등불 회관', 'lantern', '정착한 마을의 회관. 정착을 다시 해도 유지됩니다.', () => `보유 등불 효과: 조각 ×<b>${fmt(Math.pow(1 + s.lanterns, 0.8))}</b>`],
      ['물자 창고', 'goods', '일꾼들이 만든 물자로 일을 자동화하고 업그레이드를 지킵니다. 어떤 리셋에도 사라지지 않습니다.', () => `일꾼 ${s.workers.length}명, 초당 물자 약 ${fmt((s.workers.length * T.vil.goodsRate()) / 3)}`],
    ][store];
    if (store > 0) body.appendChild(T.h(`<div class="layer-head l${store}"><div class="lh-ic">${ic(meta[1])}</div><div><div class="lh-name">${meta[0]}</div><div class="lh-desc">${meta[2]}</div></div></div>`));
    else body.appendChild(T.h(`<p class="tab-intro">${meta[2]}</p>`));
    if (meta[3]) { const bonus = T.h(`<div class="layer-bonus"></div>`); bind(bonus, () => (bonus.innerHTML = meta[3]())); body.appendChild(bonus); }
    if (store === 2) resCard(body);
    for (const def of T.G.UPS()[store]) if (T.G.upVisible(store, def)) body.appendChild(upRow(def, store));
    hiddenNote(body, store);
  }
  function avgSplit() { const d = T.vil.done(); if (!d.length) return 0; let a = 0; for (const st of d) a += T.st.splitFrac(st); return a / d.length; }

  // ── milestones: expandable table ─────────────────────────
  function tabMs(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">이정표는 어떤 리셋에도 지워지지 않습니다. 세우는 순간 이번 회차(조각, 작업장, 레벨${s.era >= 1 ? '' : ', 건축가와 건축물'})가 처음으로 돌아가고 영원한 보상을 얻습니다.</p>`));
    const m = T.MILESTONES[s.ms];
    if (m) {
      const c = T.h(`<div class="ms-card"><div class="ms-no">${s.ms + 1}번째 이정표</div><div class="ms-name">${m.name}</div><div class="ms-need"><span>조건</span><b>${m.need}</b></div><div class="ms-bar"><i></i></div><div class="ms-reward"><span>보상</span><b>${m.reward}</b></div></div>`);
      const btn = T.h(`<button class="btn primary wide">이정표 세우기</button>`);
      btn.addEventListener('click', () => { if (T.G.msReady()) T.fx.milestone(); });
      c.appendChild(btn);
      bind(c, () => { const [a, n] = m.prog(s); c.querySelector('.ms-bar i').style.width = T.clamp(a / n, 0, 1) * 100 + '%'; btn.disabled = !T.G.msReady(); c.classList.toggle('ready', T.G.msReady()); });
      body.appendChild(c);
    } else { const c = T.h(`<div class="ms-card ready"><div class="ms-name">모든 이정표를 세웠습니다</div><button class="btn wide">크레딧 보기</button></div>`); c.querySelector('.btn').addEventListener('click', () => T.fx.credits()); body.appendChild(c); }
    body.appendChild(T.h(`<div class="sub-head"><span>이정표 기록</span></div>`));
    const table = T.h(`<div class="ms-table"></div>`);
    T.MILESTONES.forEach((x, i) => {
      const state = i < s.ms ? 'done' : i === s.ms ? 'now' : 'later';
      const known = i <= s.ms + 1;
      const row = T.h(`<div class="ms-row ${state} ${UI.msOpen[i] ? 'open' : ''}"><button class="ms-head"><b>${i + 1}</b><span>${known ? x.name : '???'}</span><em>${state === 'done' ? '완료' : state === 'now' ? '진행 중' : ''}</em></button><div class="ms-more"><p><small>조건</small>${known ? x.need : '아직 알 수 없습니다'}</p><p><small>보상</small>${known ? x.reward : '???'}</p></div></div>`);
      row.querySelector('.ms-head').addEventListener('click', () => { UI.msOpen[i] = !UI.msOpen[i]; row.classList.toggle('open'); T.audio.click(); });
      table.appendChild(row);
    });
    body.appendChild(table);
  }

  function tabTown(body) {
    const s = S(), era = T.ERAS[s.era];
    body.appendChild(T.h(`<div class="layer-head l6"><div class="lh-ic">${ic('era')}</div><div><div class="lh-name">${era.name}</div><div class="lh-desc">${era.sub}</div></div></div>`));
    const stats = T.h(`<div class="layer-bonus town-stats"></div>`);
    bind(stats, () => { stats.innerHTML = `인구 <b>${T.vil.population()}</b>/${T.vil.capacity()}  집 ${T.vil.countCat('house')}  평균 행복 ${T.vil.avgHappy().toFixed(2)}  ${T.vil.day()}일째  시대 배율 조각 ×${fmt(Math.pow(2.5, s.era))}`; });
    body.appendChild(stats);
    const req = T.ERA_REQ[s.era + 1];
    if (req) {
      const box = T.h(`<div class="era-card"><div class="era-next"><small>다음 시대</small><b>${T.ERAS[s.era + 1].name}</b><span>${T.ERAS[s.era + 1].sub}</span></div><ul class="era-req"></ul></div>`);
      const items = req.map((r) => { const li = T.h(`<li><span>${r.text}</span><b></b><i><em></em></i></li>`); box.querySelector('.era-req').appendChild(li); return [li, r]; });
      const btn = T.h(`<button class="btn primary wide">시대 전환</button>`);
      btn.addEventListener('click', () => {
        modal(`<div class="m-head"><span class="m-kicker">연대기</span><h2>${T.ERAS[s.era + 1].name}(으)로</h2></div>
          <p class="m-flavor">시간을 앞으로 감습니다. 마을은 처음부터 다시 지어지고 조각부터 등불까지 모든 화폐가 초기화됩니다. 대신 새 시대의 건축물과 구역, 땅이 열리고 조각 배율이 2.5배가 됩니다.</p>
          <div class="m-grid"><div><h4>초기화</h4><p>마을, 주민, 모든 화폐, 공방, 석공소, 실험실, 아틀리에</p></div><div><h4>유지</h4><p>이정표, 도감, 해상도, 레이어, 등불 회관, 물자 창고, 구역</p></div></div>
          <div class="m-actions"><button class="btn ghost" data-close>아직</button><button class="btn primary" id="era-ok">시대 전환</button></div>`);
        $('#era-ok').addEventListener('click', () => { closeModal(); T.fx.era(); });
      });
      box.appendChild(btn);
      bind(box, () => { for (const [li, r] of items) { const c = r.cur(s); li.querySelector('b').textContent = `${r.frac ? c.toFixed(2) : fmt(c)} / ${r.frac ? r.need.toFixed(2) : fmt(r.need)}`; li.querySelector('em').style.width = T.clamp(c / r.need, 0, 1) * 100 + '%'; li.classList.toggle('ok', c >= r.need); } btn.disabled = !T.G.eraReady(); });
      body.appendChild(box);
    } else body.appendChild(T.h(`<p class="tab-note">지금 갈 수 있는 가장 먼 시대에 와 있습니다.</p>`));
    body.appendChild(T.h(`<div class="sub-head"><span>구역</span></div>`));
    body.appendChild(T.h(`<p class="tab-note left">건축가들은 알아서 구역을 정하지만 직접 칠할 수도 있습니다. 구역을 고른 뒤 바닥을 드래그하세요.</p>`));
    const zg = T.h(`<div class="zones"></div>`);
    for (const k in T.ZONES) {
      const z = T.ZONES[k], open = z.era <= s.era;
      const b = T.h(`<button class="zone-btn ${T.vil.zoneTool === k ? 'on' : ''}" ${open ? '' : 'disabled'}><i style="background:${s.flags.color ? z.color : z.gray}"></i>${open ? z.name : '???'}<small>${open ? '' : T.ERAS[z.era].name}</small></button>`);
      b.addEventListener('click', () => { T.vil.zoneTool = T.vil.zoneTool === k ? null : k; document.body.classList.toggle('zoning', !!T.vil.zoneTool); UI.placingHint(!!T.vil.zoneTool, `${z.name} 구역`, true); UI.rebuildPanel(); });
      zg.appendChild(b);
    }
    body.appendChild(zg);
  }

  // ── blueprints ───────────────────────────────────────────
  // preview at the resolution it will have when finished; fits inside a size×size box, standing on its base
  function thumb(id, seed, size = 40, lvl) {
    const sh = T.shapeOf(id, seed);
    const cv = document.createElement('canvas');
    const rows = sh.h + sh.sink;
    const scale = Math.min(size / (sh.w * 8), size / (rows * 8), 3);
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const res = T.RES[lvl ?? T.st.previewLv(T.DEF[id])];
    const ox = Math.floor((size - sh.w * 8 * scale) / 2), oy = size - Math.ceil(rows * 8 * scale);
    sh.blocks.forEach((b, i) => { const cols = sh.colorAt(i, res), sub = 8 / res; cols.forEach((c, k) => { if (!c) return; ctx.fillStyle = T.st.tint(c, S().flags.l4Done > 0); ctx.fillRect(ox + Math.floor((b.c * 8 + (k % res) * sub) * scale), oy + Math.floor(((sh.h - 1 - b.r) * 8 + Math.floor(k / res) * sub) * scale), Math.ceil(sub * scale), Math.ceil(sub * scale)); }); });
    return cv;
  }
  UI.thumb = thumb;
  // tiers with at least one open blueprint are shown; the next one stays a locked chip
  function bpTiers() {
    const vis = T.DEFS.filter((d) => T.st.visible(d));
    const open = [...new Set(vis.filter((d) => T.st.available(d)).map((d) => d.tier))].sort((a, b) => a - b);
    const next = [...new Set(vis.map((d) => d.tier))].filter((t) => !open.includes(t)).sort((a, b) => a - b)[0];
    return { vis, open, next };
  }
  function tierChips(box, cur, onPick) {
    const { open, next } = bpTiers();
    for (const t of open) { const b = T.h(`<button class="dt ${t === cur ? 'on' : ''}">${T.TIERS[t].name}</button>`); b.addEventListener('click', () => { onPick(t); T.audio.play('tab'); }); box.appendChild(b); }
    if (next !== undefined) box.appendChild(T.h(`<button class="dt lockchip" disabled data-tip="아직 열리지 않은 단계">${T.icon('lock')} ???</button>`));
  }
  function tabBp(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">설계도를 펼치면 건축가들이 힘을 모아 짓고, 짓는 중에는 <b>빈칸을 클릭</b>해 거들 수도 있습니다. 도면 해상도까지 다듬으면 완공되어 도감에 기록되고, 영원한 <b>명성</b>이 됩니다.</p>`));
    const fame = T.h(`<div class="layer-bonus"></div>`);
    bind(fame, () => (fame.innerHTML = `명성: 조각 ×<b>${T.G.fame().toFixed(2)}</b>  펼친 설계도 ${T.st.activeBps().length}/${T.G.bpSlots()}  해상도 ${T.RES_NAME[s.resLv]}`));
    body.appendChild(fame);
    const { vis, open } = bpTiers();
    if (!open.includes(UI.bpTier)) UI.bpTier = open[0] ?? 0;
    const chips = T.h(`<div class="tier-chips"></div>`);
    tierChips(chips, UI.bpTier, (t) => { UI.bpTier = t; UI.rebuildPanel(); });
    body.appendChild(chips);
    const grid = T.h(`<div class="bpgrid"></div>`);
    for (const d of vis.filter((x) => x.tier === UI.bpTier)) {
      const av = T.st.available(d), done = s.bps.done[d.id] || 0;
      const c = T.h(`<button class="bpc ${av ? '' : 'locked'}" data-tip="${av ? `<b>${d.name}</b><br>${T.TIERS[d.tier].name}  도면 ${T.RES_NAME[d.res]}` : '아직 이른 도면'}"><span class="bpc-t"></span><span class="bpc-n">${av ? d.name : '???'}</span>${done ? `<span class="bpc-d">${done}</span>` : ''}${d.sky ? '<span class="bpc-s">하늘</span>' : ''}</button>`);
      const th = thumb(d.id, T.st.variant(d.id)); if (!av) th.classList.add('sil');
      c.querySelector('.bpc-t').appendChild(th);
      c.addEventListener('click', () => { T.audio.play('open'); openDrafting(d.id); });
      grid.appendChild(c);
    }
    body.appendChild(grid);
  }
  let draftTier = 0;
  function openDrafting(id) {
    const s = S();
    draftTier = T.DEF[id].tier;
    modal(`<div class="draft"><div class="draft-list"><div class="draft-title">도면 서랍</div><div class="draft-tiers"></div><div class="draft-items px-scroll"></div></div>
      <div class="draft-main"><div class="sheet"><canvas id="sheet" width="560" height="420"></canvas><div class="sheet-pencil"></div><button class="mini sheet-var" id="sheet-var" data-tip="같은 설계도의 다른 모양">${T.icon('spark')} 다른 모양</button></div><div class="titleblock" id="tb"></div></div></div>`, 'm-draft');
    const { vis } = bpTiers();
    const items = $('.draft-items');
    const drawItems = () => {
      items.innerHTML = '';
      for (const d of vis.filter((x) => x.tier === draftTier)) {
        const av = T.st.available(d);
        const b = T.h(`<button class="dl ${d.id === id ? 'on' : ''} ${av ? '' : 'locked'}"><span class="dl-name">${av ? d.name : '???'}</span>${s.bps.done[d.id] ? `<span class="dl-done">${s.bps.done[d.id]}</span>` : ''}</button>`);
        b.addEventListener('click', () => { T.audio.play('page'); id = d.id; drawItems(); showSheet(d.id); });
        items.appendChild(b);
      }
    };
    const tiersBox = $('.draft-tiers');
    const drawTiers = () => { tiersBox.innerHTML = ''; tierChips(tiersBox, draftTier, (t) => { draftTier = t; drawTiers(); drawItems(); }); };
    drawTiers();
    drawItems();
    showSheet(id);
    $('#sheet-var').addEventListener('click', () => { if (!T.st.available(T.DEF[id])) return; T.st.nextVariant(id); T.audio.play('page'); showSheet(id); UI.rebuildPanel(); });
  }
  function showSheet(id) {
    const s = S(), def = T.DEF[id], av = T.st.available(def);
    const cv = $('#sheet'); if (!cv) return;
    const seed = T.st.variant(id);
    T.st.renderSheet(cv, id, seed, !av);
    const sheet = cv.parentElement; sheet.classList.remove('drawn'); void sheet.offsetWidth; sheet.classList.add('drawn');
    const vb = $('#sheet-var'); if (vb) vb.style.visibility = av ? '' : 'hidden';
    const sh = T.shapeOf(id, seed);
    const full = T.st.activeBps().length >= T.G.bpSlots();
    const why = !av ? (def.era > s.era ? `${T.ERAS[def.era].name} 시대에 열립니다` : (def.res || 0) > s.resLv ? `해상도 ${T.RES_NAME[def.res]}가 필요합니다` : '다음 이정표에서 열립니다') : '';
    const pv = T.st.previewLv(def);
    $('#tb').innerHTML = `<div class="tb-grid">
        <div class="tb-cell tb-name"><small>명칭</small><b>${def.name}</b></div>
        <div class="tb-cell"><small>단계</small><b>${T.TIERS[def.tier].name}</b></div>
        <div class="tb-cell"><small>용도</small><b>${T.CATS[def.cat] ? T.CATS[def.cat].name : '특별'}${def.cap ? ` (${def.cap}명)` : ''}</b></div>
        <div class="tb-cell"><small>규격</small><b>${sh.w} × ${sh.h}${sh.sink ? ` 땅속 ${sh.sink}` : ''}</b></div>
        <div class="tb-cell"><small>블록 수</small><b>${sh.blocks.length}</b></div>
        <div class="tb-cell"><small>완공 보상</small><b>${ic('shard')} ${fmt(T.st.reward(def, sh))}</b></div>
        <div class="tb-cell"><small>도면 해상도</small><b>${T.RES_NAME[def.res || 0]}${pv > (def.res || 0) ? ` → ${T.RES_NAME[pv]}` : ''}</b></div>
        <div class="tb-cell"><small>행복</small><b>${def.cap ? '잠자리' : `최대 +${T.TIERS[def.tier].aura} (반경 ${T.TIERS[def.tier].radius})`}</b></div>
        <div class="tb-cell tb-note"><small>비고</small><span>${av ? def.note : why}</span></div></div>
      <div class="tb-actions">${av ? `<button class="btn primary" id="bp-place" ${full ? 'disabled' : ''}>${full ? `펼칠 자리가 없음 (${T.G.bpSlots()})` : def.sky ? '하늘에 펼치기' : '현장에 펼치기'}</button>` : ''}
        <span class="tb-done">${s.bps.done[id] ? `완공 ${s.bps.done[id]}회` : '미완공'}${(def.res || 0) > 0 ? `  블록을 다 쌓은 뒤 ${T.RES_NAME[def.res]}까지 다듬어야 완공됩니다.` : ''}${s.era >= 1 ? '  다른 건축물 위에 펼치면 쿵쿵 주민이 먼저 치웁니다.' : ''}</span></div>`;
    const b = $('#bp-place'); if (b) b.addEventListener('click', () => { closeModal(); T.st.startPlacing(id); });
  }
  UI.openDrafting = openDrafting;

  // ── modal ────────────────────────────────────────────────
  function modal(html, cls = '') {
    const root = $('#modal');
    root.innerHTML = `<div class="m-back"></div><div class="m-box ${cls}"><button class="m-x" data-close>${T.icon('minus', 'x')}</button>${html}</div>`;
    root.classList.add('on');
    T.$$('[data-close]', root).forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.m-back').addEventListener('click', closeModal);
  }
  function closeModal() { const root = $('#modal'); root.classList.remove('on'); root.innerHTML = ''; }
  UI.modal = modal; UI.closeModal = closeModal;
  UI.modalOpen = () => $('#modal').classList.contains('on');

  // ── toasts, stamp, hints ─────────────────────────────────
  UI.toast = function (text, kind = '') {
    const box = $('#toasts');
    const el = T.h(`<div class="toast ${kind}">${text}</div>`);
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 500); }, kind === 'big' ? 4200 : 2600);
    while (box.children.length > 4) box.firstChild.remove();
  };
  UI.stamp = function (def, reward, first) {
    const el = T.h(`<div class="stamp"><div class="stamp-seal">완공</div><div class="stamp-body"><small>${T.TIERS[def.tier].name}</small><b>${def.name}</b><span>${ic('shard')} +<em>0</em></span>${first ? '<i>도감에 새로 기록됨  명성 ×1.1</i>' : ''}</div></div>`);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const em = el.querySelector('em'), t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 1100); em.textContent = fmt(reward * T.easeOut(k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 3400);
  };
  UI.placingHint = function (on, name, zone) {
    const h = $('#hint');
    if (on) { h.innerHTML = zone ? `${name} 칠하기: 바닥을 드래그 <kbd>Esc</kbd> 끝내기` : `「${name}」 펼치는 중: 클릭해서 확정 <kbd>Esc</kbd> 취소`; h.classList.add('on'); } else h.classList.remove('on');
  };

  // ── tutorial ─────────────────────────────────────────────
  let tutEl = null;
  UI.tutorial = function () {
    const s = S();
    const step = T.TUTORIAL[s.flags.tut];
    if (!step || T.ui.modalOpen() || document.querySelector('#titlecard')) { if (!step && tutEl) { tutEl.remove(); tutEl = null; } return; }
    if (!tutEl || tutEl.dataset.i !== String(s.flags.tut)) {
      if (tutEl) tutEl.remove();
      tutEl = T.h(`<div class="tut" data-i="${s.flags.tut}"><div class="tut-n">${s.flags.tut + 1} / ${T.TUTORIAL.length}</div><p>${step.text}</p><div class="tut-a"><button class="mini" data-k="skip">건너뛰기</button>${step.wait ? '<span class="tut-w">해 보세요</span>' : '<button class="mini on" data-k="next">다음</button>'}</div></div>`);
      tutEl.querySelector('[data-k=skip]').addEventListener('click', () => { s.flags.tut = T.TUTORIAL.length; tutEl.remove(); tutEl = null; });
      const nx = tutEl.querySelector('[data-k=next]'); if (nx) nx.addEventListener('click', () => { s.flags.tut++; T.audio.click(); UI.tutorial(); });
      document.body.appendChild(tutEl);
      requestAnimationFrame(() => tutEl && tutEl.classList.add('in'));
      T.$$('.tut-hl').forEach((x) => x.classList.remove('tut-hl'));
      if (step.at && step.at !== '#cv') { const t = $(step.at); if (t) t.classList.add('tut-hl'); }
    }
    if (step.wait && step.wait(s)) { s.flags.tut++; T.$$('.tut-hl').forEach((x) => x.classList.remove('tut-hl')); UI.tutorial(); }
  };

  // ── cards: residents and structures ──────────────────────
  UI.openCard = function (e) {
    card = { e };
    T.st.selected = null;
    const el = $('#card'), s = S();
    if (T.PET[e.kind]) {
      const P = T.PET[e.kind];
      const extra = { painter: `<span>붓질 <b>${T.G.paintCD().toFixed(2)}초</b></span>`, splitter: `<span>다듬기 <b>${T.G.carveCD().toFixed(2)}초</b></span><span>해상도 <b>${T.RES_NAME[s.resLv]}</b></span>`, demo: `<span>철거 대기 <b>${T.st.condemned().length}</b></span>`, warper: `<span>레이어 <b>${T.G.layers()}겹</b></span>` }[e.kind];
      el.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>${e.d.name}</b><small>${P.role}</small></div><button class="m-x" id="ac-x">${T.icon('minus')}</button></div><div class="ac-stats">${extra}<span>지금 <b id="ac-m"></b></span></div><div class="ac-life"><small>수명</small><i><em></em></i></div>`;
      el.querySelector('.ac-pt').appendChild(T.sprites.portrait(P.sprite, s.flags.color, 3, 'happy'));
    } else {
      const d = e.d;
      const role = e.kind === 'arch' ? `${T.SHAPE[d.s].name} 건축가` : e.kind === 'worker' ? '일꾼' : '아기';
      el.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>${d.name}</b><small>${role}${(d.z || 0) ? `  ${d.z + 1}번째 겹` : ''}</small></div><button class="m-x" id="ac-x">${T.icon('minus')}</button></div>
        <div class="ac-stats">${e.kind === 'arch' ? '<span>레벨 <b id="ac-lv"></b></span><span>블록 가치 <b id="ac-v"></b></span>' : ''}<span>행복 <b id="ac-h"></b></span><span>지금 <b id="ac-m"></b></span></div>
        <div class="ac-life"><small>수명</small><i><em></em></i></div><div class="ac-act"></div>`;
      el.querySelector('.ac-pt').appendChild(T.sprites.portrait(d.s, s.flags.color, 3, 'happy'));
      if (e.kind === 'arch') {
        const b = T.h(`<button class="buy wide"><span class="buy-l">레벨업</span><span class="buy-c">${ic('shard')}<b></b></span></button>`);
        holdable(b, (quiet) => {
          if (!T.G.levelUp(d)) { if (!quiet) T.audio.deny(); return false; }
          if (!quiet) T.audio.buy();
          e.happyT = 1.2; T.ent.hop(e, 120);
          if (d.lvl % 5 === 0) { T.fx.hearts(e.x, e.y + 20); e.bubble = { text: d.lvl === 5 ? '리본!' : d.lvl === 10 ? '안전모!' : d.lvl === 25 ? '왕관!' : '레벨업!', t: 1.4 }; }
          refreshCard(); return true;
        });
        el.querySelector('.ac-act').appendChild(b);
      }
    }
    el.querySelector('#ac-x').addEventListener('click', UI.closeCard);
    el.classList.add('on');
    refreshCard();
  };
  UI.openStruct = function (st) {
    card = { st };
    T.st.selected = st;
    const s = S(), d = T.DEF[st.id], sh = T.st.shape(st), el = $('#card');
    const people = d.cap ? T.vil.sleepersIn(st) : [];
    const aura = T.vil.auraAt(st);
    el.innerHTML = `<div class="ac-head"><div class="ac-pt bp"></div><div><b>${d.name}${st.src === 'grave' && st.name ? `: ${st.name}` : ''}</b><small>${T.TIERS[d.tier].name}  ${st.src === 'bp' ? '설계도로 지음' : st.src === 'grave' ? '무덤' : '건축가의 작품'}</small></div><button class="m-x" id="ac-x">${T.icon('minus')}</button></div>
      <div class="ac-stats">
        <span>블록 <b>${sh.blocks.length}</b></span>
        ${!T.st.done(st) ? '<span>쌓는 중 <b id="sc-p"></b></span>' : !T.st.finished(st) ? '<span>다듬는 중 <b id="sc-r"></b></span>' : ''}
        ${aura ? `<span>행복 <b id="sc-h"></b></span><span>범위 <b>${Math.round(T.TIERS[d.tier].radius * (1 + 0.3 * (s.lup.aura || 0)))}</b></span>` : ''}
        ${d.cap ? `<span>정원 <b>${people.length}/${T.vil.houseCap(st)}</b></span>` : ''}
      </div>
      ${T.st.done(st) && st.src !== 'grave' ? `<div class="ac-comp" data-tip="완성도는 기본 100%에 다듬은 정도(8비트 기준 최대 +100%)와 칠한 정도(최대 +100%)를 더한 값입니다. 행복 효과는 완성도에 비례하고, 300%일 때 가장 큽니다."><div class="acc-head"><small>완성도</small><b id="sc-c"></b></div><div class="acc-bar"><i class="acc-base"></i><i class="acc-split" id="sc-cs"></i><i class="acc-paint" id="sc-cp"></i></div><div class="acc-legend"><span>기본</span><span>다듬기 <b id="sc-cs2"></b></span><span>색 <b id="sc-cp2"></b></span></div></div>` : ''}
      ${d.cap ? `<div class="ac-people">${people.map((e) => `<span class="${e.inside === 'sleep' ? 'zz' : ''}">${e.d.name}${e.inside === 'sleep' ? ' (자는 중)' : ''}</span>`).join('') || '<span>아직 아무도 살지 않아요</span>'}</div>` : ''}
      <p class="ac-note">${d.note}</p>`;
    el.querySelector('.ac-pt').appendChild(thumb(st.id, st.seed, 48, st.lv ? Math.max(...st.lv) : 0));
    el.querySelector('#ac-x').addEventListener('click', UI.closeCard);
    el.classList.add('on');
    refreshCard();
  };
  function refreshCard() {
    if (!card) return;
    const el = $('#card'), s = S();
    const set = (id, v) => { const x = el.querySelector(id); if (x) x.innerHTML = v; };
    if (card.st) {
      const st = card.st;
      if (!s.structs.includes(st)) { UI.closeCard(); return; }
      set('#sc-p', `${st.n}/${T.st.count(st)}`);
      set('#sc-r', `${Math.floor(T.st.refineFrac(st) * 100)}%`);
      const sp = T.st.splitFrac(st), pa = T.st.paintedFrac(st);
      set('#sc-c', `${Math.round((1 + sp + pa) * 100)}%`);
      set('#sc-cs2', `+${Math.round(sp * 100)}%`); set('#sc-cp2', `+${Math.round(pa * 100)}%`);
      const cs = el.querySelector('#sc-cs'), cp = el.querySelector('#sc-cp');
      if (cs) cs.style.width = (sp * 100 / 3).toFixed(1) + '%';
      if (cp) cp.style.width = (pa * 100 / 3).toFixed(1) + '%';
      set('#sc-h', `+${T.vil.auraAt(st).toFixed(3)}`);
      return;
    }
    const e = card.e, d = e.d;
    if (!T.ent.all().includes(e)) { UI.closeCard(); return; }
    if (e.kind === 'arch') { set('#ac-lv', d.lvl); set('#ac-v', `${ic('shard')}${fmt(T.G.blockValue(d))}`); }
    set('#ac-h', (e.happy || 0).toFixed(2));
    const doing = e.inside === 'sleep' ? '자는 중' : e.inside ? '구경 중' : e.napping ? '밖에서 자는 중' : e.mournT > 0 ? '슬퍼하는 중' : e.emote ? '부탁 들어주는 중' : e.proj ? `${T.DEF[e.proj.id].name} 짓는 중` : e.job ? `${T.DEF[e.job.id].name}에서 일하는 중` : '쉬는 중';
    set('#ac-m', doing);
    const life = el.querySelector('.ac-life');
    if (life) { life.style.display = s.era >= 1 && d.life !== undefined ? '' : 'none'; if (d.life !== undefined) life.querySelector('em').style.width = T.clamp(d.life / T.vil.maxLife(), 0, 1) * 100 + '%'; }
    const b = el.querySelector('.buy b');
    if (b && e.kind === 'arch') { const cost = T.G.levelCost(d); b.textContent = fmt(cost); b.closest('button').disabled = s.shards < cost; }
  }
  UI.closeCard = function () { card = null; T.st.selected = null; $('#card').classList.remove('on'); };
  function positionCard() {
    if (!card) return;
    const el = $('#card');
    let sx, sy;
    if (card.e) [sx, sy] = T.w2s(card.e.x, card.e.y + 40);
    else { const [a, b, top] = T.st.bbox(card.st); [sx, sy] = T.w2s((a + b) / 2, top); }
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.transform = `translate(${Math.round(T.clamp(sx - w / 2, 10, innerWidth - w - 370))}px, ${Math.round(T.clamp(sy - h - 16, 70, innerHeight - h - 10))}px)`;
  }

  // ── radial menu ──────────────────────────────────────────
  const RADIAL = [{ id: 'gather', icon: 'home', name: '모여!' }, { id: 'dance', icon: 'note', name: '춤추기' }, { id: 'cheer', icon: 'star4', name: '만세' }, { id: 'rest', icon: 'moon', name: '쉬어' }, { id: 'scatter', icon: 'spark', name: '흩어져' }, { id: 'follow', icon: 'boot', name: '따라와' }];
  UI.radial = function (sx, sy, wx) {
    UI.closeRadial();
    const el = T.h(`<div class="radial" style="left:${sx}px;top:${sy}px"><div class="radial-core"></div></div>`);
    RADIAL.forEach((r, i) => {
      const an = -Math.PI / 2 + (i / RADIAL.length) * Math.PI * 2;
      const b = T.h(`<button class="radial-b" style="--x:${Math.cos(an) * 62}px;--y:${Math.sin(an) * 62}px;--d:${i * 25}ms">${T.icon(r.icon)}<small>${r.name}</small></button>`);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => { const n = T.ent.groupAction(r.id, wx); S().stats.radial++; T.audio.pet(); UI.toast(n ? `${n}명이 「${r.name}」 부탁을 들었습니다.` : '근처에 들어줄 친구가 없어요.'); UI.closeRadial(); });
      el.appendChild(b);
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
  };
  UI.closeRadial = function () { const r = $('.radial'); if (r) { r.classList.remove('in'); r.classList.add('out'); setTimeout(() => r.remove(), 180); } };

  // ── settings, codes, intros ──────────────────────────────
  UI.settings = function () {
    const s = S();
    const skips = [[1, 4, '재구성'], [2, 9, '다듬기'], [3, 12, '굴절']].filter(([, m]) => s.ms >= m);
    modal(`<div class="m-head"><h2>설정</h2></div>
      <label class="opt"><input type="checkbox" id="o-snd" ${s.settings.sound ? 'checked' : ''}> 소리</label>
      ${skips.map(([n, , name]) => `<label class="opt"><input type="checkbox" data-skip="${n}" ${s.settings.skip[n] ? 'checked' : ''}> ${name} 연출 생략</label>`).join('')}
      <label class="opt"><button class="mini" id="o-tut">튜토리얼 다시 보기</button></label>
      <div class="sub-head"><span>비밀 코드</span></div>
      <div class="code-row"><input id="o-code" type="text" placeholder="코드를 입력하세요" maxlength="20" autocomplete="off"><button class="btn" id="o-code-go">입력</button></div>
      <div class="sub-head"><span>저장</span></div>
      <textarea id="o-save" rows="3" placeholder="여기에 저장 코드를 붙여 넣고 가져오기"></textarea>
      <div class="m-actions left"><button class="btn" id="o-exp">내보내기</button><button class="btn" id="o-imp">가져오기</button><button class="btn danger" id="o-wipe">처음부터</button></div>
      <div class="sub-head"><span>기록</span></div>
      <p class="stats">쌓은 블록 ${fmt(s.stats.lifeBlocks)}<br>다듬은 조각 ${fmt(s.stats.carved)}<br>누적 조각 ${fmt(s.stats.lifeEarned)}<br>완공한 건축물 ${s.stats.built}<br>쓰다듬기 ${fmt(s.stats.pets)}회<br>플레이 ${T.fmtTime(s.stats.played)}</p>
      <div class="m-actions left"><button class="btn ghost" id="o-cred">크레딧</button></div>`);
    $('#o-snd').addEventListener('change', (e) => { s.settings.sound = e.target.checked; T.audio.setOn(e.target.checked); UI.updateDock(); });
    T.$$('[data-skip]').forEach((x) => x.addEventListener('change', (e) => (s.settings.skip[x.dataset.skip] = e.target.checked)));
    $('#o-tut').addEventListener('click', () => { s.flags.tut = 0; closeModal(); });
    const go = () => UI.enterCode($('#o-code').value);
    $('#o-code-go').addEventListener('click', go);
    $('#o-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    $('#o-exp').addEventListener('click', () => { $('#o-save').value = T.G.exportSave(); $('#o-save').select(); try { document.execCommand('copy'); UI.toast('저장 코드를 복사했습니다.'); } catch (e) { /* ignore */ } });
    $('#o-imp').addEventListener('click', () => { if (T.G.importSave($('#o-save').value)) { T.main.noSave = true; location.reload(); } else UI.toast('저장 코드가 올바르지 않습니다.'); });
    $('#o-cred').addEventListener('click', () => { closeModal(); T.fx.credits(); });
    $('#o-wipe').addEventListener('click', () => {
      modal(`<div class="m-head"><h2>처음부터 다시</h2></div><p class="m-flavor">모든 진행 상황이 지워집니다. 되돌릴 수 없습니다.</p><div class="m-actions"><button class="btn ghost" data-close>취소</button><button class="btn danger" id="o-wipe2">지우기</button></div>`);
      $('#o-wipe2').addEventListener('click', () => { T.main.noSave = true; T.G.wipe(); });
    });
  };
  UI.enterCode = function (raw) {
    const s = S();
    const code = (raw || '').trim().toUpperCase();
    if (code === 'ROSETTE' || code === '장미창') { s.flags.rosette = !s.flags.rosette; T.G.rebuild(); UI.toast(s.flags.rosette ? '장미창: 건축가들이 하늘에 오래된 기하학 무늬를 짓기 시작합니다.' : '장미창이 조용히 잠듭니다.', 'big'); T.audio.reveal(); }
    else if (code === 'PARADE') { T.ent.groupAction('parade', T.main.cursorX()); UI.toast('행진: 모두 한 줄로 걷습니다.'); }
    else if (code === 'HELLO') { T.ent.groupAction('hello', 0); UI.toast('모두가 손을 흔듭니다.'); }
    else if (code === 'CREDITS') { closeModal(); T.fx.credits(); }
    else { UI.toast('아무 일도 일어나지 않았습니다.'); T.audio.deny(); return; }
    closeModal();
  };
  UI.offline = function (r) {
    modal(`<div class="m-head"><span class="m-kicker">돌아오셨군요</span><h2>자리를 비운 ${T.fmtTime(r.el)} 동안</h2></div><p class="m-flavor">건축가들은 쉬지 않고 일했습니다.</p>
      <div class="m-gain">${ic('shard')} <b>+${fmt(r.earned)}</b>${r.goods ? `  ${ic('goods')} <b>+${fmt(r.goods)}</b>` : ''}</div><div class="m-actions"><button class="btn primary" data-close>좋아요</button></div>`);
  };
  const intro = (kicker, title, sprites, text) => {
    modal(`<div class="m-head"><span class="m-kicker">${kicker}</span><h2>${title}</h2></div><div class="intro-pt" id="ip"></div>${text}<div class="m-actions"><button class="btn primary" data-close>반가워!</button></div>`);
    for (const k of sprites) $('#ip').appendChild(T.sprites.portrait(k, true, 5, 'happy'));
  };
  UI.introSplit = () => intro('새 주민', '톡톡', ['chisel'], `<p class="m-flavor">건축물의 블록을 결대로 다듬는 주민입니다. 처음에는 한 칸을 조금씩 다듬지만, 손이 빨라지면 한 칸을 한 번에 다듬습니다.<br>석공소의 <b>해상도</b>를 올리면 블록을 더 곱게 다듬을 수 있어서, 건축물의 진짜 모습이 드러납니다.</p>`);
  UI.introPainter = () => intro('새 주민', '방울', ['drop'], `<p class="m-flavor">물감 한 방울에서 태어난 채색 주민. 다듬어진 칸을 <b>하나하나</b> 진짜 색으로 칠합니다. 붓이 빨라지면 한 칸을 한 번에 칠해요. 걸어 다닌 땅에도 물감을 남깁니다.</p>`);
  UI.introLayers = () => intro('겹치기', '겹', ['portal'], `<p class="m-flavor">세상 뒤에 세상이 겹칩니다. 「층계」에서 <b>겹</b>을 늘리면 뒤쪽에 새 땅이 생기고, 폴짝 주민이 일 없는 주민을 데리고 그곳으로 건너갑니다. 뒤쪽 겹은 조금 작고 흐릿하게 보입니다.</p>`);
  UI.introVillage = function () {
    modal(`<div class="m-head"><span class="m-kicker">정착</span><h2>마을이 시작됩니다</h2></div><div class="intro-pt" id="ip"></div>
      <ul class="intro-list"><li><b>집</b>을 지으면 밤에 들어가 잠을 잡니다. 잠은 <b>수명</b>을 회복시킵니다. 밖에서 자면 수명이 빨리 줄어요.</li>
      <li>모든 주민에게는 수명이 있습니다. 다한 주민은 긴 잠에 들고, 친구들은 슬퍼하며 가끔 작은 무덤을 지어 줍니다.</li>
      <li>집이 아닌 건축물 근처에 있으면 <b>행복</b>해져서 더 빨리 일합니다. 건축물을 클릭하면 범위가 보여요.</li>
      <li>하루가 지나고 달이 차오릅니다. 아주 가끔 <b>오로라</b>나 <b>일식</b>이 찾아오면 잠시 모든 게 빨라집니다.</li>
      <li>짓고 있는 건축물은 뼈대로 보이고, 다른 건축물 위에 설계도를 펼치면 쿵쿵 주민이 먼저 치웁니다.</li></ul>
      <div class="m-actions"><button class="btn primary" data-close>시작하기</button></div>`);
    for (const k of ['square', 'demo']) $('#ip').appendChild(T.sprites.portrait(k, true, 5, 'happy'));
  };
  UI.afterReset = function (n) {
    const names = ['', '공방', '석공소', '실험실', '아틀리에', '층계', '등불 회관과 마을'];
    if (S().flags['l' + n + 'Done'] === 1 && n !== 3) UI.toast(`새로운 공간이 열렸습니다: <b>${names[n]}</b>`, 'big');
  };

  // ── dock ─────────────────────────────────────────────────
  UI.updateGap = function () { const g = S().settings.gap; $('#gap-v').textContent = g === 0 ? '자유' : g === 1 ? '격자' : `${g}칸`; $('#gap').classList.toggle('free', g === 0); };
  UI.updateDock = function () {
    const c = S().flags.color;
    const set = (id, icon) => { const b = $(id); b.innerHTML = T.icon(icon); };
    set('#btn-zin', 'plus'); set('#btn-zout', 'minus'); set('#btn-home', 'home'); set('#btn-obs', 'observe'); set('#btn-snd', S().settings.sound ? 'note' : 'mute'); set('#btn-set', 'gear'); set('#btn-panel', 'panel');
    void c;
  };
  UI.tick = function () {
    updateHud();
    updateSeals();
    if (structureSig() !== sig) { UI.rebuildPanel(); UI.updateDock(); } else updateBinds();
    refreshCard();
    UI.tutorial();
  };
  UI.frame = positionCard;
  UI.init = function () {
    buildHud();
    UI.rebuildPanel(true);
    $('#btn-zin').addEventListener('click', () => T.main.zoomBy(1.4));
    $('#btn-zout').addEventListener('click', () => T.main.zoomBy(1 / 1.4));
    $('#btn-home').addEventListener('click', () => T.main.home());
    $('#btn-obs').addEventListener('click', () => T.main.observe());
    $('#btn-snd').addEventListener('click', () => { const s = S(); s.settings.sound = !s.settings.sound; T.audio.setOn(s.settings.sound); UI.updateDock(); });
    $('#btn-set').addEventListener('click', UI.settings);
    $('#btn-panel').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    const gap = $('#gap');
    gap.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); const s = S(); s.settings.gap = T.clamp(s.settings.gap + (e.deltaY > 0 ? -1 : 1), 0, 8); T.audio.tick(); UI.updateGap(); }, { passive: false });
    gap.addEventListener('click', () => { const s = S(); s.settings.gap = (s.settings.gap + 1) % 9; T.audio.tick(); UI.updateGap(); });
    UI.updateGap();
    UI.updateDock();
  };
})();
