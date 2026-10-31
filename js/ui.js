'use strict';
// ─────────────────────────────────────────────────────────────
//  UI — HUD, 패널, 리셋 봉인, 모달
// ─────────────────────────────────────────────────────────────
(function () {
  const $ = T.$;
  const fmt = T.fmt;
  const UI = (T.ui = { tab: 'arch' });
  let binds = [];
  let sig = '';
  let cardEnt = null;

  const CUR = {
    shards: { name: '조각', ic: 'shard' },
    vertices: { name: '꼭짓점', ic: 'vertex' },
    prisms: { name: '프리즘', ic: 'prism' },
    pigments: { name: '안료', ic: 'pigment' },
  };
  const ic = (k) => `<i class="ic ic-${k}"></i>`;

  // ── HUD ──────────────────────────────────────────────────
  function buildHud() {
    const hud = $('#cur');
    hud.innerHTML = `
      <div class="cur-main" data-c="shards">${ic('shard')}<div><div class="cur-val" id="v-shards">0</div><div class="cur-sub"><span id="v-rate">0</span> /초 · 조각</div></div></div>
      <div class="cur-row" data-c="vertices">${ic('vertex')}<span id="v-vertices">0</span><small>꼭짓점</small></div>
      <div class="cur-row" data-c="prisms">${ic('prism')}<span id="v-prisms">0</span><small>프리즘</small></div>
      <div class="cur-row" data-c="pigments">${ic('pigment')}<span id="v-pigments">0</span><small>안료</small></div>`;
  }
  function updateHud() {
    const s = T.G.s;
    $('#v-shards').textContent = fmt(s.shards);
    $('#v-rate').textContent = fmt(T.G.rate);
    $('#v-vertices').textContent = fmt(s.vertices);
    $('#v-prisms').textContent = fmt(s.prisms);
    $('#v-pigments').textContent = fmt(s.pigments);
    $('[data-c=vertices]').classList.toggle('show', s.flags.l1Done > 0 || s.vertices > 0);
    $('[data-c=prisms]').classList.toggle('show', s.flags.l2Done > 0);
    $('[data-c=pigments]').classList.toggle('show', s.flags.l3Done > 0);
  }

  // ── seals (reset layers) ─────────────────────────────────
  function updateSeals() {
    const s = T.G.s;
    const box = $('#seals');
    for (let n = 1; n <= 3; n++) {
      const L = T.G.L[n];
      let el = box.querySelector(`[data-l="${n}"]`);
      const seen = L.seen(s);
      if (!seen) { if (el) el.remove(); continue; }
      if (!s.flags['l' + n + 'Seen']) {
        s.flags['l' + n + 'Seen'] = true;
        const lines = ['', '지평선 너머, 무언가가 모습을 드러냅니다…', '빛이 모서리에 걸려 흔들립니다…', '어디선가 물감 냄새가 납니다…'];
        UI.toast(lines[n], 'big');
        T.audio.unlock();
      }
      if (!el) {
        el = T.h(`<button class="seal seal-${n}" data-l="${n}">
          <span class="seal-ic">${ic(L.icon)}</span>
          <span class="seal-body"><span class="seal-name">${L.name}</span><span class="seal-bar"><i></i></span><span class="seal-txt"></span></span>
        </button>`);
        el.addEventListener('click', () => { T.audio.click(); confirmReset(n); });
        box.appendChild(el);
        requestAnimationFrame(() => el.classList.add('in'));
      }
      const prog = L.prog(s);
      const k = prog <= 0 ? 0 : T.clamp(Math.log10(1 + prog) / Math.log10(1 + L.need), 0, 1);
      el.querySelector('.seal-bar i').style.width = (k * 100).toFixed(1) + '%';
      const ready = T.G.canReset(n);
      el.classList.toggle('ready', ready);
      el.querySelector('.seal-txt').innerHTML = ready
        ? `지금 하면 ${ic(L.icon)} <b>+${fmt(L.gain(s))}</b>`
        : `${L.needText} ${fmt(prog)} / ${fmt(L.need)}`;
    }
  }

  function confirmReset(n) {
    const s = T.G.s;
    const L = T.G.L[n];
    const ready = T.G.canReset(n);
    const lose = [
      '',
      '조각, 건축가, 작업장 업그레이드, 세계의 모든 블럭과 설계도 현장',
      '위의 모든 것 + 꼭짓점, 꼭짓점 공방 업그레이드',
      '위의 모든 것 + 프리즘, 프리즘 실험실 업그레이드',
    ][n];
    const keep = [
      '',
      '설계도 도감(명성), 꼭짓점 공방',
      '설계도 도감, 프리즘 실험실, <b>색</b>',
      '설계도 도감, 아틀리에, 색 설계도, 방울',
    ][n];
    const flavor = [
      '',
      '모든 블럭을 허물고, 그 모서리만 남깁니다. 남은 모서리는 <b>꼭짓점</b>이 됩니다.',
      s.flags.color ? '쌓아 올린 빛을 다시 프리즘에 통과시킵니다.' : '이 세계는 아직 회색입니다. 꼭짓점을 모아 빛을 굴절시키면… 무언가 달라질지도 모릅니다.',
      '세계를 한 번 씻어내고, 그 물로 물감을 만듭니다. 새 친구가 찾아옵니다.',
    ][n];
    modal(`
      <div class="m-head"><span class="m-kicker">${['', '1차', '2차', '3차'][n]} 리셋 레이어</span><h2>${ic(L.icon)} ${L.name}</h2></div>
      <p class="m-flavor">${flavor}</p>
      <div class="m-grid">
        <div><h4>초기화</h4><p>${lose}</p></div>
        <div><h4>유지</h4><p>${keep}</p></div>
      </div>
      <div class="m-gain">${ready ? `획득: ${ic(L.icon)} <b>${fmt(L.gain(s))}</b> ${L.cur}` : `조건: ${L.needText} <b>${fmt(L.need)}</b> (현재 ${fmt(L.prog(s))})`}</div>
      <div class="m-actions"><button class="btn ghost" data-close>돌아가기</button><button class="btn primary" id="do-reset" ${ready ? '' : 'disabled'}>${L.name}하기</button></div>
    `, 'm-reset');
    const b = $('#do-reset');
    if (b) b.addEventListener('click', () => { closeModal(); T.fx.reset(n); });
  }
  UI.confirmReset = confirmReset;

  // ── tabs ─────────────────────────────────────────────────
  function tabsDef() {
    const s = T.G.s;
    const t = [
      { id: 'arch', name: '건축가' },
      { id: 'work', name: '작업장' },
      { id: 'bp', name: '설계도' },
    ];
    if (s.flags.l1Done > 0) t.push({ id: 'v', name: '꼭짓점 공방', layer: 1 });
    if (s.flags.l2Done > 0) t.push({ id: 'p', name: '프리즘 실험실', layer: 2 });
    if (s.flags.l3Done > 0) t.push({ id: 'g', name: '아틀리에', layer: 3 });
    return t;
  }
  function structureSig() {
    const s = T.G.s;
    return [UI.tab, tabsDef().map((t) => t.id).join(), T.SHAPES.map((x) => +T.G.shapeUnlocked(x.id)).join(''),
      T.UP0.filter((u) => !u.req || u.req(s)).length, T.UP1.filter((u) => !u.req || u.req(s)).length, T.UP2.filter((u) => !u.req || u.req(s)).length,
      T.BLUEPRINTS.map((b) => +b.unlock(s)).join(''), s.bps.active.length, Object.keys(s.bps.done).length, s.archs.length > 80 ? 80 : s.archs.length,
      s.palette, Object.keys(s.palOwned).length, s.flags.color].join('|');
  }

  function buildTabs() {
    const s = T.G.s;
    const nav = $('#tabs');
    nav.innerHTML = '';
    for (const t of tabsDef()) {
      const b = T.h(`<button class="tab ${t.layer ? 'tab-l' + t.layer : ''} ${UI.tab === t.id ? 'on' : ''}">${t.name}${!s.flags.seenTabs[t.id] && t.layer ? '<i class="newdot"></i>' : ''}</button>`);
      b.addEventListener('click', () => { UI.tab = t.id; s.flags.seenTabs[t.id] = 1; T.audio.click(); UI.rebuildPanel(); });
      nav.appendChild(b);
    }
  }

  UI.rebuildPanel = function () {
    binds = [];
    if (!tabsDef().some((t) => t.id === UI.tab)) UI.tab = 'arch';
    buildTabs();
    const body = $('#tabbody');
    body.innerHTML = '';
    const panel = $('#panel');
    panel.dataset.theme = UI.tab;
    ({ arch: tabArch, work: tabWork, bp: tabBp, v: (b) => tabUp(1, b), p: (b) => tabUp(2, b), g: tabAtelier })[UI.tab](body);
    sig = structureSig();
    updateBinds();
  };
  function bind(el, fn) { binds.push({ el, fn }); }
  function updateBinds() { for (const b of binds) b.fn(b.el); }

  function costBtn(costFn, curKey, onBuy, label = '') {
    const b = T.h(`<button class="buy"><span class="buy-l">${label}</span><span class="buy-c">${ic(CUR[curKey].ic)}<b></b></span></button>`);
    b.addEventListener('click', () => {
      if (onBuy()) { T.audio.buy(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); updateBinds(); }
      else T.audio.deny();
    });
    bind(b, () => {
      const c = costFn();
      if (c === null) { b.classList.add('maxed'); b.disabled = true; b.querySelector('b').textContent = '최대'; return; }
      b.querySelector('b').textContent = fmt(c);
      b.disabled = T.G.s[curKey] < c;
    });
    return b;
  }

  function tabArch(body) {
    const s = T.G.s;
    body.appendChild(T.h(`<p class="tab-intro">건축가는 <b>5초</b>마다 블럭을 하나씩 던져 올립니다. 같은 모양끼리는 서로 조금씩 회전된 고리를 지어 하나의 무늬를 이룹니다.</p>`));
    let shownLocked = false;
    for (const sh of T.SHAPES) {
      const unlocked = T.G.shapeUnlocked(sh.id);
      if (!unlocked) {
        if (shownLocked || (sh.index >= 4 && s.flags.l2Done === 0 && s.flags.l1Done === 0)) continue;
        shownLocked = true;
        const hint = sh.index <= 3 ? (s.flags.l1Done ? '꼭짓점 공방에서 해금' : '「재구성」 너머에서 기다리는 중') : (s.flags.l2Done ? '프리즘 실험실에서 해금' : '아직 보이지 않는 빛 너머에…');
        const row = T.h(`<div class="row locked"><div class="pt"></div><div class="row-main"><div class="row-name">???</div><div class="row-desc">${hint}</div></div></div>`);
        const pc = T.sprites.portrait(sh.id, s.flags.color, 3);
        pc.classList.add('sil');
        row.querySelector('.pt').appendChild(pc);
        body.appendChild(row);
        continue;
      }
      const row = T.h(`<div class="row"><div class="pt"></div><div class="row-main"><div class="row-name">${sh.name} 건축가 <small class="own"></small></div><div class="row-desc"></div></div></div>`);
      row.querySelector('.pt').appendChild(T.sprites.portrait(sh.id, s.flags.color, 3, 'normal'));
      const btn = costBtn(() => T.G.hireCost(sh.id), 'shards', () => T.G.hire(sh.id), '고용');
      row.appendChild(btn);
      bind(row, () => {
        const n = T.G.owned(sh.id);
        row.querySelector('.own').textContent = n ? `×${n}` : '';
        const v = (sh.value + T.G.lv(s.up, 'solid')) * T.G.M;
        row.querySelector('.row-desc').innerHTML = `블럭 ${ic('shard')}${fmt(v)} · ${(T.G.cooldown({ s: sh.id })).toFixed(1)}초 · ${sh.k === 6 && sh.id === 'circle' ? '원' : sh.k + '갈래'} 대칭`;
      });
      body.appendChild(row);
    }
    if (s.archs.length) {
      const head = T.h(`<div class="sub-head"><span>건축가 목록</span></div>`);
      const lvAll = T.h(`<button class="mini">가장 싼 레벨업</button>`);
      lvAll.addEventListener('click', () => {
        let best = null, bc = Infinity;
        for (const d of s.archs) { const c = T.G.levelCost(d); if (c < bc) { bc = c; best = d; } }
        if (best && T.G.levelUp(best)) { T.audio.buy(); const e = T.ent.archs.find((x) => x.d === best); if (e) { e.happyT = 1; e.vy = 120; } } else T.audio.deny();
        updateBinds();
      });
      bind(lvAll, () => {
        let bc = Infinity;
        for (const d of s.archs) bc = Math.min(bc, T.G.levelCost(d));
        lvAll.textContent = `가장 싼 레벨업 · ${fmt(bc)}`;
        lvAll.disabled = s.shards < bc;
      });
      head.appendChild(lvAll);
      body.appendChild(head);
      const grid = T.h(`<div class="roster"></div>`);
      s.archs.slice(0, 80).forEach((d) => {
        const it = T.h(`<button class="ro" title="${d.name}"><span class="ro-lv"></span></button>`);
        it.prepend(T.sprites.portrait(d.s, s.flags.color, 2));
        it.addEventListener('click', () => {
          const e = T.ent.archs.find((x) => x.d === d);
          if (e) { T.main.focus(e.x, 60); UI.openCard(e); }
        });
        bind(it, () => { it.querySelector('.ro-lv').textContent = d.lvl; });
        grid.appendChild(it);
      });
      body.appendChild(grid);
      if (s.archs.length > 80) body.appendChild(T.h(`<p class="tab-note">외 ${s.archs.length - 80}명이 일하는 중</p>`));
    }
  }

  function upRow(def, store, curKey) {
    const s = T.G.s;
    const book = [s.up, s.vup, s.pup, s.gup][store];
    const row = T.h(`<div class="row up"><div class="up-ic">${def.icon}</div><div class="row-main"><div class="row-name">${def.name} <small class="lvl"></small></div><div class="row-desc"></div></div></div>`);
    const btn = costBtn(() => { const l = book[def.id] || 0; return l >= def.max ? null : def.cost(l); }, curKey, () => {
      const ok = T.G.buyUp(store, def);
      if (ok && def.shape) { T.audio.unlock(); UI.toast(`새 건축가 해금: ${T.SHAPE[def.shape].name}`, 'big'); UI.rebuildPanel(); }
      return ok;
    });
    row.appendChild(btn);
    bind(row, () => {
      const l = book[def.id] || 0;
      row.querySelector('.lvl').textContent = def.max > 1 ? `${l}/${def.max}` : l ? '보유' : '';
      row.querySelector('.row-desc').textContent = def.desc(l);
      row.classList.toggle('owned', l >= def.max);
    });
    return row;
  }

  function tabWork(body) {
    body.appendChild(T.h(`<p class="tab-intro">작은 손들을 위한 작은 개선. 모두 이번 회차에만 유지됩니다.</p>`));
    for (const def of T.UP0) {
      if (def.req && !def.req(T.G.s)) continue;
      body.appendChild(upRow(def, 0, 'shards'));
    }
  }

  function tabUp(layer, body) {
    const s = T.G.s;
    const list = [null, T.UP1, T.UP2][layer];
    const cur = ['', 'vertices', 'prisms'][layer];
    const intro = [
      '',
      '허문 블럭의 모서리를 모아 둔 공방. 여기서 산 것은 재구성해도 사라지지 않습니다.',
      '빛을 쪼개고 다시 모으는 실험실. 굴절해도 유지됩니다.',
    ][layer];
    body.appendChild(T.h(`<div class="layer-head l${layer}"><div class="lh-ic">${ic(['', 'vertex', 'prism'][layer])}</div><div><div class="lh-name">${['', '꼭짓점 공방', '프리즘 실험실'][layer]}</div><div class="lh-desc">${intro}</div></div></div>`));
    const bonus = T.h(`<div class="layer-bonus"></div>`);
    bind(bonus, () => {
      bonus.innerHTML = layer === 1
        ? `보유 꼭짓점 효과: 조각 ×<b>${fmt(Math.sqrt(1 + s.vertices))}</b>`
        : `보유 프리즘 효과: 조각 ×<b>${fmt(Math.pow(1 + s.prisms, 0.6))}</b>`;
    });
    body.appendChild(bonus);
    for (const def of list) {
      if (def.req && !def.req(s)) continue;
      body.appendChild(upRow(def, layer, cur));
    }
  }

  function tabAtelier(body) {
    const s = T.G.s;
    body.appendChild(T.h(`<div class="layer-head l3"><div class="lh-ic">${ic('pigment')}</div><div><div class="lh-name">아틀리에</div><div class="lh-desc">방울들이 중심에서 바깥으로, 블럭이 쌓인 순서대로 색을 칠합니다. 칠할 때마다 블럭을 다시 팝니다.</div></div></div>`));
    const bonus = T.h(`<div class="layer-bonus"></div>`);
    bind(bonus, () => {
      bonus.innerHTML = `채색 커버리지 <b>${(T.G.coverage() * 100).toFixed(1)}%</b> → 조각 ×${(1 + 3 * T.G.coverage()).toFixed(2)} · 보유 안료 ×${fmt(Math.pow(1 + s.pigments, 0.7))}`;
    });
    body.appendChild(bonus);
    body.appendChild(T.h(`<div class="sub-head"><span>색 설계도</span></div>`));
    const pals = T.h(`<div class="pals"></div>`);
    for (const p of T.PALETTES) {
      const owned = s.palOwned[p.id];
      const sw = [0, 0.25, 0.5, 0.75, 1].map((k) => {
        const ang = Math.PI * k, r = 200 + 1200 * k;
        return `<i style="background:${p.fn(Math.cos(ang) * r, T.YC + Math.sin(ang) * r * 0.8 + k * 1400)}"></i>`;
      }).join('');
      const el = T.h(`<button class="pal ${s.palette === p.id ? 'on' : ''} ${owned ? '' : 'lockedp'}"><span class="pal-sw">${sw}</span><span class="pal-name">${p.name}${s.palDone[p.id] ? ' ✓' : ''}</span><span class="pal-desc">${owned ? p.desc : `${ic('pigment')} ${p.cost}`}</span></button>`);
      el.addEventListener('click', () => {
        if (s.palette === p.id) return;
        if (!owned) {
          if (s.pigments < p.cost) { T.audio.deny(); return; }
          s.pigments -= p.cost; s.palOwned[p.id] = 1; T.audio.buy();
        }
        modal(`<div class="m-head"><h2>색 설계도 교체</h2></div><p class="m-flavor">「${p.name}」로 바꾸면 지금까지 칠한 색이 지워지고, 방울들이 중심부터 다시 칠합니다.</p>
          <div class="m-actions"><button class="btn ghost" data-close>취소</button><button class="btn primary" id="pal-ok">교체</button></div>`);
        $('#pal-ok').addEventListener('click', () => {
          s.palette = p.id;
          for (const d of s.archs) d.p = 0;
          s.playerPainted = 0;
          closeModal(); T.G.rebuild(); T.G.computeMult(); UI.rebuildPanel();
        });
      });
      pals.appendChild(el);
    }
    body.appendChild(pals);
    body.appendChild(T.h(`<div class="sub-head"><span>아틀리에 업그레이드</span></div>`));
    for (const def of T.UP3) body.appendChild(upRow(def, 3, 'pigments'));
  }

  // ── blueprint tab & drafting table ───────────────────────
  function thumb(def, size = 46) {
    const cv = document.createElement('canvas');
    const cs = Math.max(1, Math.floor(Math.min(size / def.w, size / def.h)));
    cv.width = def.w * cs; cv.height = def.h * cs;
    const ctx = cv.getContext('2d');
    for (const c of def.cells) {
      ctx.fillStyle = T.G.bpColor(c.ch);
      ctx.fillRect(c.c * cs, (def.h - 1 - c.r) * cs, cs, cs);
    }
    return cv;
  }
  function tabBp(body) {
    const s = T.G.s;
    body.appendChild(T.h(`<p class="tab-intro">설계도를 현장에 펼치면 건축가들이 빈칸을 채웁니다. 완공하면 한 묶음이 되어 큰 값에 팔리고, 도감에 기록되어 영구 <b>명성</b>을 얻습니다.</p>`));
    const fame = T.h(`<div class="layer-bonus"></div>`);
    bind(fame, () => { fame.innerHTML = `명성: 조각 ×<b>${T.G.fame().toFixed(2)}</b> · 현장 ${s.bps.active.length}/${T.G.bpSlots()}`; });
    body.appendChild(fame);
    let tier = -1;
    for (const def of T.BLUEPRINTS) {
      if (def.tier !== tier) { tier = def.tier; body.appendChild(T.h(`<div class="sub-head"><span>${T.TIERS[tier].name}</span></div>`)); }
      const un = def.unlock(s);
      const done = s.bps.done[def.id] || 0;
      const active = s.bps.active.some((b) => b.id === def.id);
      const row = T.h(`<button class="row bprow ${un ? '' : 'locked'}"><div class="pt bpt"></div><div class="row-main"><div class="row-name">${un ? def.name : '미해금 도면'} <small>${def.no}</small></div><div class="row-desc">${un ? `${def.cells.length} 블럭 · ${def.w}×${def.h}${active ? ' · <b>현장 진행 중</b>' : ''}` : def.unlockText}</div></div>${done ? `<span class="stamp-mini">완공 ${done}</span>` : ''}</button>`);
      const th = thumb(def);
      if (!un) th.classList.add('sil');
      row.querySelector('.pt').appendChild(th);
      row.addEventListener('click', () => { T.audio.click(); openDrafting(def.id); });
      body.appendChild(row);
    }
  }

  function openDrafting(id) {
    const s = T.G.s;
    const list = T.BLUEPRINTS.map((d) => {
      const un = d.unlock(s);
      return `<button class="dl ${d.id === id ? 'on' : ''} ${un ? '' : 'locked'}" data-id="${d.id}"><span class="dl-no">${d.no}</span><span class="dl-name">${un ? d.name : '???'}</span>${s.bps.done[d.id] ? `<span class="dl-done">${s.bps.done[d.id]}</span>` : ''}</button>`;
    }).join('');
    modal(`
      <div class="draft">
        <div class="draft-list"><div class="draft-title">도면 서랍</div>${list}</div>
        <div class="draft-main">
          <div class="sheet"><canvas id="sheet" width="560" height="430"></canvas><div class="sheet-pencil"></div></div>
          <div class="titleblock" id="tb"></div>
        </div>
      </div>`, 'm-draft');
    T.$$('.dl').forEach((b) => b.addEventListener('click', () => { T.audio.click(); T.$$('.dl').forEach((x) => x.classList.remove('on')); b.classList.add('on'); showSheet(b.dataset.id); }));
    showSheet(id);
  }
  function showSheet(id) {
    const s = T.G.s;
    const def = T.BLUEPRINT[id];
    const un = def.unlock(s);
    const cv = $('#sheet');
    if (!cv) return;
    T.bp.renderSheet(cv, def, !un);
    // drafting reveal: sweep a mask from bottom to top
    const sheet = cv.parentElement;
    sheet.classList.remove('drawn'); void sheet.offsetWidth; sheet.classList.add('drawn');
    const active = s.bps.active.some((b) => b.id === id);
    const full = s.bps.active.length >= T.G.bpSlots();
    $('#tb').innerHTML = `
      <div class="tb-grid">
        <div class="tb-cell tb-name"><small>명칭</small><b>${un ? def.name : '기밀'}</b></div>
        <div class="tb-cell"><small>도면 번호</small><b>${def.no}</b></div>
        <div class="tb-cell"><small>분류</small><b>${T.TIERS[def.tier].name}</b></div>
        <div class="tb-cell"><small>규격</small><b>${def.w} × ${def.h}</b></div>
        <div class="tb-cell"><small>블럭 수</small><b>${def.cells.length}</b></div>
        <div class="tb-cell"><small>완공 보상(현재)</small><b>${ic('shard')} ${fmt(T.bp.reward(def))}</b></div>
        <div class="tb-cell tb-note"><small>비고</small><span>${un ? def.note : `해금 조건 — ${def.unlockText}`}</span></div>
      </div>
      <div class="tb-actions">
        ${un ? `<button class="btn primary" id="bp-place" ${active || full ? 'disabled' : ''}>${active ? '현장 진행 중' : full ? `현장이 가득 참 (${T.G.bpSlots()})` : '현장에 배치'}</button>` : ''}
        <span class="tb-done">${s.bps.done[id] ? `완공 ${s.bps.done[id]}회` : '미완공'}</span>
      </div>`;
    const b = $('#bp-place');
    if (b) b.addEventListener('click', () => { closeModal(); T.bp.startPlacing(id); });
  }
  UI.openDrafting = openDrafting;

  // ── modal ────────────────────────────────────────────────
  function modal(html, cls = '') {
    const root = $('#modal');
    root.innerHTML = `<div class="m-back"></div><div class="m-box ${cls}"><button class="m-x" data-close>×</button>${html}</div>`;
    root.classList.add('on');
    T.$$('[data-close]', root).forEach((b) => b.addEventListener('click', closeModal));
    root.querySelector('.m-back').addEventListener('click', closeModal);
  }
  function closeModal() {
    const root = $('#modal');
    root.classList.remove('on');
    root.innerHTML = '';
  }
  UI.modal = modal;
  UI.closeModal = closeModal;
  UI.modalOpen = () => $('#modal').classList.contains('on');

  // ── toasts / stamp / hints ───────────────────────────────
  UI.toast = function (text, kind = '') {
    const box = $('#toasts');
    const el = T.h(`<div class="toast ${kind}">${text}</div>`);
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 500); }, kind === 'big' ? 4200 : 2600);
    while (box.children.length > 4) box.firstChild.remove();
  };
  UI.stamp = function (def, reward, first) {
    const el = T.h(`<div class="stamp">
      <div class="stamp-seal">완공</div>
      <div class="stamp-body"><small>${def.no} · ${T.TIERS[def.tier].name}</small><b>${def.name}</b><span>${ic('shard')} +<em>0</em></span>${first ? '<i>최초 완공 · 명성 ×1.15</i>' : '<i>명성 ×1.05</i>'}</div>
    </div>`);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const em = el.querySelector('em');
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1100);
      em.textContent = fmt(reward * T.easeOut(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 3600);
  };
  UI.placingHint = function (on, name) {
    const h = $('#hint');
    if (on) { h.innerHTML = `「${name}」 배치 중 — 클릭해서 펼치기 · <kbd>Esc</kbd> 취소`; h.classList.add('on'); }
    else h.classList.remove('on');
  };
  let tip = null;
  UI.tutorial = function () {
    const s = T.G.s;
    let t = null;
    if (s.stats.clicks < 3 && !s.archs.length) t = '하늘 아무 곳이나 클릭해 블럭을 놓아 보세요.';
    else if (!s.archs.length && s.shards >= 10) t = '오른쪽 패널에서 첫 건축가를 고용해 보세요.';
    else if (s.archs.length && s.stats.pets === 0 && s.archs.length < 4) t = '건축가를 클릭하면 쓰다듬을 수 있어요. 끌어서 들어 올릴 수도 있어요.';
    else if (s.stats.lifeBlocks > 40 && !s.bps.active.length && !s.stats.bpDone && s.stats.lifeBlocks < 400) t = '「설계도」 탭에서 첫 도면을 현장에 펼쳐 보세요.';
    if (t !== tip) {
      tip = t;
      const el = $('#tip');
      if (t) { el.textContent = t; el.classList.add('on'); } else el.classList.remove('on');
    }
  };

  // ── architect card ───────────────────────────────────────
  UI.openCard = function (e) {
    cardEnt = e;
    const card = $('#card');
    if (e.isPainter) {
      card.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>방울</b><small>채색 펫</small></div><button class="m-x" id="ac-x">×</button></div>
        <div class="ac-stats"><span>붓 크기 <b>${T.ent.brushSize()}</b></span><span>붓질 <b>${T.ent.strokeTime().toFixed(2)}초</b></span><span>채색 판매 <b>×${fmt(T.ent.paintMult())}</b></span></div>`;
      card.querySelector('.ac-pt').appendChild(T.sprites.portrait('drop', T.G.s.flags.color, 3, 'happy'));
    } else {
      const d = e.d;
      const sh = T.SHAPE[d.s];
      card.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>${d.name}</b><small>${sh.name} 건축가 · #${d.o + 1}</small></div><button class="m-x" id="ac-x">×</button></div>
        <div class="ac-stats"><span>레벨 <b id="ac-lv"></b></span><span>블럭 가치 <b id="ac-v"></b></span><span>쌓은 블럭 <b id="ac-n"></b></span><span>기분 <b id="ac-m"></b></span></div>
        <div class="ac-act"></div>`;
      card.querySelector('.ac-pt').appendChild(T.sprites.portrait(d.s, T.G.s.flags.color, 3, 'happy'));
      const b = T.h(`<button class="buy wide"><span class="buy-l">레벨업</span><span class="buy-c">${ic('shard')}<b></b></span></button>`);
      b.addEventListener('click', () => {
        if (T.G.levelUp(d)) { T.audio.buy(); e.happyT = 1.2; e.vy = 130; if (d.lvl % 5 === 0) { T.fx.hearts(e.x, e.y + 20); e.bubble = { text: d.lvl === 5 ? '리본!' : d.lvl === 10 ? '안전모!' : d.lvl === 25 ? '왕관!' : '레벨업!', t: 1.4 }; } }
        else T.audio.deny();
        refreshCard();
      });
      card.querySelector('.ac-act').appendChild(b);
    }
    card.querySelector('#ac-x').addEventListener('click', UI.closeCard);
    card.classList.add('on');
    refreshCard();
  };
  function refreshCard() {
    if (!cardEnt || cardEnt.isPainter) return;
    const d = cardEnt.d;
    const c = $('#card');
    const set = (id, v) => { const el = c.querySelector(id); if (el) el.innerHTML = v; };
    set('#ac-lv', d.lvl + (d.lvl >= 25 ? ' 👑' : ''));
    set('#ac-v', `${ic('shard')}${fmt(T.G.blockValue(d))}`);
    set('#ac-n', fmt(d.n));
    set('#ac-m', cardEnt.petT > 0 ? `기분 좋음 ${Math.ceil(cardEnt.petT)}초` : '평온');
    const b = c.querySelector('.buy b');
    if (b) { const cost = T.G.levelCost(d); b.textContent = fmt(cost); b.parentElement.parentElement.disabled = T.G.s.shards < cost; }
  }
  UI.closeCard = function () { cardEnt = null; $('#card').classList.remove('on'); };
  function positionCard() {
    if (!cardEnt) return;
    const card = $('#card');
    const [sx, sy] = T.w2s(cardEnt.x, cardEnt.y);
    const w = card.offsetWidth, h = card.offsetHeight;
    let x = sx - w / 2, y = sy - 40 * T.cam.z * 1.15 - h - 30;
    x = T.clamp(x, 10, innerWidth - w - 340);
    y = T.clamp(y, 70, innerHeight - h - 10);
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ── misc modals ──────────────────────────────────────────
  UI.settings = function () {
    const s = T.G.s;
    modal(`<div class="m-head"><h2>설정</h2></div>
      <label class="opt"><input type="checkbox" id="o-snd" ${s.settings.sound ? 'checked' : ''}> 소리</label>
      ${s.vup.auto ? `<label class="opt"><input type="checkbox" id="o-auto" ${s.flags.autoHire ? 'checked' : ''}> 자동 고용</label>` : ''}
      ${s.pup.autoL1 ? `<label class="opt"><input type="checkbox" id="o-al1" ${s.flags.autoL1 ? 'checked' : ''}> 자동 재구성</label>` : ''}
      <div class="sub-head"><span>저장</span></div>
      <textarea id="o-save" rows="3" placeholder="여기에 저장 코드를 붙여 넣고 가져오기"></textarea>
      <div class="m-actions left"><button class="btn" id="o-exp">내보내기</button><button class="btn" id="o-imp">가져오기</button><button class="btn danger" id="o-wipe">처음부터</button></div>
      <div class="sub-head"><span>기록</span></div>
      <p class="stats">쌓은 블럭 ${fmt(s.stats.lifeBlocks)} · 누적 조각 ${fmt(s.stats.lifeEarned)} · 쓰다듬기 ${fmt(s.stats.pets)}회 · 완공 ${s.stats.bpDone} · 플레이 ${T.fmtTime(s.stats.played)}</p>
      <p class="credits">TESSERA · 테세라 — 폰트 Galmuri (OFL) · Rough.js (MIT) · ZzFX (MIT)</p>`);
    $('#o-snd').addEventListener('change', (e) => { s.settings.sound = e.target.checked; T.audio.setOn(e.target.checked); });
    const a = $('#o-auto'); if (a) a.addEventListener('change', (e) => (s.flags.autoHire = e.target.checked));
    const al = $('#o-al1'); if (al) al.addEventListener('change', (e) => (s.flags.autoL1 = e.target.checked));
    $('#o-exp').addEventListener('click', () => { $('#o-save').value = T.G.exportSave(); $('#o-save').select(); try { document.execCommand('copy'); UI.toast('저장 코드를 복사했습니다.'); } catch (e) { /* ignore */ } });
    $('#o-imp').addEventListener('click', () => { if (T.G.importSave($('#o-save').value)) { T.main.noSave = true; location.reload(); } else UI.toast('저장 코드가 올바르지 않습니다.'); });
    $('#o-wipe').addEventListener('click', () => {
      modal(`<div class="m-head"><h2>처음부터 다시</h2></div><p class="m-flavor">모든 진행 상황이 지워집니다. 되돌릴 수 없습니다.</p>
        <div class="m-actions"><button class="btn ghost" data-close>취소</button><button class="btn danger" id="o-wipe2">지우기</button></div>`);
      $('#o-wipe2').addEventListener('click', () => { T.main.noSave = true; T.G.wipe(); });
    });
  };
  UI.offline = function (r) {
    modal(`<div class="m-head"><span class="m-kicker">돌아오셨군요</span><h2>자리를 비운 ${T.fmtTime(r.el)} 동안</h2></div>
      <p class="m-flavor">건축가들은 쉬지 않고 쌓았습니다.</p>
      <div class="m-gain">${ic('shard')} <b>+${fmt(r.earned)}</b> · 블럭 <b>+${fmt(r.blocks)}</b></div>
      <div class="m-actions"><button class="btn primary" data-close>좋아요</button></div>`);
  };
  UI.introPainter = function () {
    modal(`<div class="m-head"><span class="m-kicker">새 친구</span><h2>방울</h2></div>
      <div class="intro-pt" id="ip"></div>
      <p class="m-flavor">물감 한 방울에서 태어난 채색 펫. 베레모를 쓰고, 붓을 들고, 건축가들이 쌓은 블럭을 <b>중심에서 바깥으로</b> 칠해 나갑니다.<br>아틀리에에서 색 설계도를 고르고 방울을 더 데려올 수 있어요.</p>
      <div class="m-actions"><button class="btn primary" data-close>반가워!</button></div>`);
    $('#ip').appendChild(T.sprites.portrait('drop', true, 6, 'happy'));
  };
  UI.afterReset = function (n) {
    if (n === 1 && T.G.s.flags.l1Done === 1) UI.toast('새로운 공간이 열렸습니다: <b>꼭짓점 공방</b>', 'big');
    if (n === 3 && T.G.s.flags.l3Done === 1) UI.toast('새로운 공간이 열렸습니다: <b>아틀리에</b>', 'big');
  };

  // ── per-frame/tick update ────────────────────────────────
  UI.tick = function () {
    updateHud();
    updateSeals();
    const ns = structureSig();
    if (ns !== sig) UI.rebuildPanel(); else updateBinds();
    refreshCard();
    UI.tutorial();
  };
  UI.frame = function () { positionCard(); };

  UI.init = function () {
    buildHud();
    UI.rebuildPanel();
    $('#btn-zin').addEventListener('click', () => T.main.zoomBy(1.4));
    $('#btn-zout').addEventListener('click', () => T.main.zoomBy(1 / 1.4));
    $('#btn-home').addEventListener('click', () => T.main.home());
    $('#btn-obs').addEventListener('click', () => T.main.observe());
    $('#btn-snd').addEventListener('click', () => {
      const s = T.G.s; s.settings.sound = !s.settings.sound; T.audio.setOn(s.settings.sound);
      $('#btn-snd').classList.toggle('off', !s.settings.sound);
    });
    $('#btn-set').addEventListener('click', UI.settings);
    $('#btn-panel').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    $('#btn-snd').classList.toggle('off', !T.G.s.settings.sound);
  };
})();
