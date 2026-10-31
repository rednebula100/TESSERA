'use strict';
// ─────────────────────────────────────────────────────────────
//  UI: HUD, 패널, 리셋 봉인, 모달, 라디얼 메뉴
// ─────────────────────────────────────────────────────────────
(function () {
  const $ = T.$;
  const fmt = T.fmt;
  const UI = (T.ui = { tab: 'arch', bpTier: 0 });
  let binds = [];
  let sig = '';
  let cardEnt = null;
  let lastTab = null;
  const S = () => T.G.s;

  const CUR = {
    shards: { name: '조각', ic: 'shard' }, vertices: { name: '꼭짓점', ic: 'vertex' }, prisms: { name: '프리즘', ic: 'prism' },
    pigments: { name: '안료', ic: 'pigment' }, lanterns: { name: '등불', ic: 'lantern' }, goods: { name: '물자', ic: 'goods' },
  };
  const ic = (k) => `<i class="ic ic-${k}"></i>`;

  // ── HUD ──────────────────────────────────────────────────
  function buildHud() {
    $('#cur').innerHTML = `
      <div class="cur-main">${ic('shard')}<div><div class="cur-val" id="v-shards">0</div><div class="cur-sub"><span id="v-rate">0</span> /초 조각</div></div></div>
      ${['vertices', 'prisms', 'pigments', 'lanterns', 'goods'].map((k) => `<div class="cur-row" data-c="${k}">${ic(CUR[k].ic)}<span id="v-${k}">0</span><small>${CUR[k].name}</small></div>`).join('')}
      <div class="cur-town" id="v-town"></div>`;
  }
  function updateHud() {
    const s = S();
    $('#v-shards').textContent = fmt(s.shards);
    $('#v-rate').textContent = fmt(T.G.rate);
    const show = { vertices: s.flags.l1Done > 0, prisms: s.flags.l2Done > 0, pigments: s.flags.l3Done > 0, lanterns: s.flags.l4Done > 0, goods: s.ms >= 14 };
    for (const k in show) { $('#v-' + k).textContent = fmt(s[k]); $(`[data-c=${k}]`).classList.toggle('show', show[k]); }
    const town = $('#v-town');
    if (s.era >= 1) {
      town.classList.add('show');
      const n = T.vil.night();
      town.innerHTML = `<span>${n > 0.5 ? '☾' : '☀'} ${T.vil.timeLabel()}</span><span>${T.ERAS[s.era].name}</span><span>인구 ${T.vil.population()}/${T.vil.capacity()}</span>`;
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
  function updateSeals() {
    const s = S();
    const box = $('#seals');
    const want = new Set();
    for (let n = 1; n <= 4; n++) {
      const L = T.G.L[n];
      if (!L.seen(s)) continue;
      want.add('L' + n);
      if (!s.flags['l' + n + 'Seen']) {
        s.flags['l' + n + 'Seen'] = true;
        UI.toast(['', '지평선 너머, 무언가가 모습을 드러냅니다.', '빛이 모서리에 걸려 흔들립니다.', '어디선가 물감 냄새가 납니다.', '멀리서 굴뚝 연기가 피어오릅니다.'][n], 'big');
        T.audio.unlock();
      }
      const el = seal('L' + n, L.name, L.icon, 'seal-' + n, () => confirmReset(n));
      const prog = L.prog(s);
      const k = prog <= 0 ? 0 : T.clamp(Math.log10(1 + prog) / Math.log10(1 + L.need), 0, 1);
      el.querySelector('.seal-bar i').style.width = (k * 100).toFixed(1) + '%';
      const ready = T.G.canReset(n);
      el.classList.toggle('ready', ready);
      el.querySelector('.seal-txt').innerHTML = ready ? `지금 하면 ${ic(L.icon)} <b>+${fmt(L.gain(s))}</b>` : `${L.needText} ${fmt(prog)} / ${fmt(L.need)}`;
    }
    if (T.G.eraReady()) {
      want.add('era');
      const el = seal('era', '시대 전환', 'era', 'seal-era', () => { UI.tab = 'town'; UI.rebuildPanel(true); });
      el.classList.add('ready');
      el.querySelector('.seal-bar i').style.width = '100%';
      el.querySelector('.seal-txt').textContent = `${T.ERAS[s.era + 1].name}로 넘어갈 준비가 되었습니다`;
    }
    for (const el of [...box.children]) if (!want.has(el.dataset.k)) el.remove();
  }

  function confirmReset(n) {
    const s = S();
    const L = T.G.L[n];
    const ready = T.G.canReset(n);
    const settled = s.era >= 1;
    const lose = ['', '조각, 작업장 업그레이드' + (settled ? ', 건축가 레벨' : ', 건축가, 세계의 모든 블럭과 건축물'),
      '위의 모든 것과 꼭짓점, 꼭짓점 공방 업그레이드', '위의 모든 것과 프리즘, 프리즘 실험실 업그레이드',
      '위의 모든 것과 안료, 아틀리에, <b>마을 전체</b>'][n];
    const keep = ['', '이정표, 설계도 도감, 꼭짓점 공방' + (settled ? ', 마을과 주민' : ''), '이정표, 도감, 프리즘 실험실, <b>색</b>' + (settled ? ', 마을' : ''),
      '이정표, 도감, 아틀리에, 방울' + (settled ? ', 마을' : ''), '이정표, 도감, 등불 회관, 시대, 구역'][n];
    const flavor = ['', '모든 블럭을 허물고 그 모서리만 남깁니다. 남은 모서리는 <b>꼭짓점</b>이 됩니다.',
      s.flags.color ? '쌓아 올린 빛을 다시 프리즘에 통과시킵니다.' : '이 세계는 아직 회색입니다. 꼭짓점을 모아 빛을 굴절시키면 무언가 달라질지도 모릅니다.',
      '세계를 한 번 씻어내고, 그 물로 물감을 만듭니다. 새 친구가 찾아옵니다.',
      s.flags.l4Done ? '마을을 정리하고 새로운 땅에 다시 정착합니다.' : '흩어진 조형물을 뒤로하고, 처음으로 <b>지붕</b>을 얹습니다. 건축가들은 이제 마을을 이루어 삽니다.'][n];
    modal(`
      <div class="m-head"><span class="m-kicker">${n}차 리셋 레이어</span><h2>${ic(L.icon)} ${L.name}</h2></div>
      <p class="m-flavor">${flavor}</p>
      <div class="m-grid"><div><h4>초기화</h4><p>${lose}</p></div><div><h4>유지</h4><p>${keep}</p></div></div>
      <div class="m-gain">${ready ? `획득: ${ic(L.icon)} <b>${fmt(L.gain(s))}</b> ${L.cur}` : `조건: ${L.needText} <b>${fmt(L.need)}</b> (현재 ${fmt(L.prog(s))})`}</div>
      <div class="m-actions"><button class="btn ghost" data-close>돌아가기</button><button class="btn primary" id="do-reset" ${ready ? '' : 'disabled'}>${L.name}하기</button></div>`, 'm-reset');
    const b = $('#do-reset');
    if (b) b.addEventListener('click', () => { closeModal(); T.fx.reset(n); });
  }
  UI.confirmReset = confirmReset;

  // ── tabs ─────────────────────────────────────────────────
  function tabsDef() {
    const s = S();
    const t = [{ id: 'arch', name: '고용' }];
    if (s.archs.length || s.workers.length) t.push({ id: 'people', name: '주민' });
    t.push({ id: 'work', name: '작업장' }, { id: 'bp', name: '설계도' }, { id: 'ms', name: '이정표', dot: T.G.msReady() });
    if (s.flags.l1Done > 0) t.push({ id: 'v', name: '공방', layer: 1 });
    if (s.flags.l2Done > 0) t.push({ id: 'p', name: '실험실', layer: 2 });
    if (s.flags.l3Done > 0) t.push({ id: 'g', name: '아틀리에', layer: 3 });
    if (s.flags.l4Done > 0) t.push({ id: 'l', name: '등불', layer: 4 });
    if (s.era >= 1) t.push({ id: 'town', name: '마을', layer: 4, dot: T.G.eraReady() });
    if (s.ms >= 14) t.push({ id: 'auto', name: '물자', layer: 5 });
    return t;
  }
  function structureSig() {
    const s = S();
    const ups = T.G.UPS().map((list, i) => list.filter((d) => T.G.upVisible(i, d)).length).join(',');
    return [UI.tab, tabsDef().map((t) => t.id + (t.dot ? '!' : '')).join(), T.SHAPES.map((x) => +T.G.shapeUnlocked(x.id)).join(''), ups,
      T.DEFS.filter((d) => T.st.visible(d)).length, T.DEFS.filter((d) => T.st.available(d)).length, T.st.activeBps().length,
      Object.keys(s.bps.done).length, UI.bpTier, Math.min(s.archs.length, 200) + '/' + s.workers.length + '/' + s.kids.length, s.ms, s.era, s.flags.color,
      Object.keys(s.mup).length, T.G.msReady(), T.G.eraReady()].join('|');
  }
  function buildTabs() {
    const s = S();
    const nav = $('#tabs');
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
    const keepScroll = !animate && lastTab === UI.tab ? body.scrollTop : 0;
    body.innerHTML = '';
    body.classList.toggle('anim', !!animate || lastTab !== UI.tab);
    lastTab = UI.tab;
    $('#panel').dataset.theme = UI.tab;
    ({ arch: tabArch, people: tabPeople, work: tabWork, bp: tabBp, ms: tabMs, v: (b) => tabUp(1, b), p: (b) => tabUp(2, b), g: (b) => tabUp(3, b), l: (b) => tabUp(4, b), town: tabTown, auto: (b) => tabUp(5, b) })[UI.tab](body);
    body.scrollTop = keepScroll;
    sig = structureSig();
    updateBinds();
  };
  function bind(el, fn) { binds.push({ el, fn }); }
  function updateBinds() { for (const b of binds) b.fn(b.el); }

  // press-and-hold to keep buying
  function holdable(btn, act) {
    let timer = null, delay = 0;
    const stop = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    const step = () => {
      if (btn.disabled || !act()) { stop(); return; }
      delay = Math.max(35, delay * 0.82);
      timer = setTimeout(step, delay);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || btn.disabled) return;
      e.preventDefault();
      if (!act()) return;
      btn.classList.add('holding');
      delay = 160;
      timer = setTimeout(step, 360);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
  }
  function costBtn(costFn, curKey, onBuy, label = '') {
    const b = T.h(`<button class="buy"><span class="buy-l">${label}</span><span class="buy-c">${ic(CUR[curKey].ic)}<b></b></span></button>`);
    holdable(b, () => {
      if (onBuy()) { T.audio.buy(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); updateBinds(); return true; }
      T.audio.deny(); return false;
    });
    bind(b, () => {
      const c = costFn();
      if (c === null) { b.classList.add('maxed'); b.disabled = true; b.querySelector('b').textContent = '최대'; return; }
      b.querySelector('b').textContent = fmt(c);
      b.disabled = S()[curKey] < c;
    });
    return b;
  }

  function tabArch(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">건축가는 저마다 조형물을 짓습니다. 혼자 멀리 떠나기도 하고, 친구의 일을 돕기도 합니다. 한 명 한 명이 소중해서 많이 고용하기는 어렵습니다.</p>`));
    let shownLocked = false;
    for (const sh of T.SHAPES) {
      if (!T.G.shapeUnlocked(sh.id)) {
        if (shownLocked || s.flags.l1Done === 0) continue;
        shownLocked = true;
        const hint = sh.index <= 3 ? '꼭짓점 공방에서 해금' : s.flags.l2Done ? '프리즘 실험실에서 해금' : '아직 보이지 않는 빛 너머에';
        const row = T.h(`<div class="row locked"><div class="pt"></div><div class="row-main"><div class="row-name">???</div><div class="row-desc">${hint}</div></div></div>`);
        const pc = T.sprites.portrait(sh.id, s.flags.color, 3); pc.classList.add('sil');
        row.querySelector('.pt').appendChild(pc);
        body.appendChild(row);
        continue;
      }
      const row = T.h(`<div class="row"><div class="pt"></div><div class="row-main"><div class="row-name">${sh.name} 건축가 <small class="own"></small></div><div class="row-desc"></div></div></div>`);
      row.querySelector('.pt').appendChild(T.sprites.portrait(sh.id, s.flags.color, 3, 'normal'));
      row.appendChild(costBtn(() => T.G.hireCost(sh.id), 'shards', () => T.G.hire(sh.id), '고용'));
      bind(row, () => {
        const n = T.G.owned(sh.id);
        row.querySelector('.own').textContent = n ? `${n}명` : '';
        row.querySelector('.row-desc').innerHTML = `블럭 ${ic('shard')}${fmt((sh.value + T.G.lv(s.up, 'solid')) * T.G.M)}  ${T.G.cooldown({ s: sh.id }).toFixed(1)}초`;
      });
      body.appendChild(row);
    }
    if (s.flags.l1Done === 0) body.appendChild(T.h(`<p class="tab-note">다른 모양의 건축가는 「재구성」 너머에서 기다립니다.</p>`));
  }

  function tabPeople(body) {
    const s = S();
    const head = T.h(`<div class="sub-head"><span>건축가 ${s.archs.length}명</span></div>`);
    const lvAll = T.h(`<button class="mini hold">가장 싼 레벨업</button>`);
    holdable(lvAll, () => {
      let best = null, bc = Infinity;
      for (const d of s.archs) { const c = T.G.levelCost(d); if (c < bc) { bc = c; best = d; } }
      if (best && T.G.levelUp(best)) { T.audio.buy(); const e = T.ent.archs.find((x) => x.d === best); if (e) { e.happyT = 1; T.ent.hop(e); } updateBinds(); return true; }
      T.audio.deny(); return false;
    });
    bind(lvAll, () => {
      let bc = Infinity; for (const d of s.archs) bc = Math.min(bc, T.G.levelCost(d));
      lvAll.innerHTML = `가장 싼 레벨업 ${ic('shard')}${fmt(bc)}`;
      lvAll.disabled = !s.archs.length || s.shards < bc;
    });
    head.appendChild(lvAll);
    body.appendChild(head);
    const grid = T.h(`<div class="roster"></div>`);
    for (const d of s.archs.slice(0, 200)) grid.appendChild(personTile(d, 'arch'));
    body.appendChild(grid);
    if (s.workers.length || s.kids.length) {
      body.appendChild(T.h(`<div class="sub-head"><span>일꾼 ${s.workers.length}명, 아기 ${s.kids.length}명</span></div>`));
      const g2 = T.h(`<div class="roster"></div>`);
      for (const d of s.workers) g2.appendChild(personTile(d, 'worker'));
      for (const d of s.kids) g2.appendChild(personTile(d, 'kid'));
      body.appendChild(g2);
    }
  }
  function personTile(d, kind) {
    const s = S();
    const it = T.h(`<button class="ro ${kind}" title="${d.name}"><span class="ro-lv"></span><span class="ro-life"><i></i></span></button>`);
    it.prepend(T.sprites.portrait(d.s, s.flags.color, kind === 'kid' ? 1 : 2));
    it.addEventListener('click', () => {
      const e = T.ent.all().find((x) => x.d === d);
      if (e) { T.main.focus(e.x, 60); if (!e.inside) UI.openCard(e); }
    });
    bind(it, () => {
      it.querySelector('.ro-lv').textContent = kind === 'arch' ? d.lvl : kind === 'kid' ? '아기' : '';
      const life = it.querySelector('.ro-life');
      if (s.era >= 1 && d.life !== undefined) { life.style.display = 'block'; life.firstChild.style.width = T.clamp(d.life / T.vil.maxLife(), 0, 1) * 100 + '%'; }
      else life.style.display = 'none';
    });
    return it;
  }

  function upRow(def, store) {
    const s = S();
    const book = T.G.book(store);
    const curKey = T.G.curKey(store);
    const row = T.h(`<div class="row up"><div class="up-ic">${def.icon}</div><div class="row-main"><div class="row-name">${def.name} <small class="lvl"></small></div><div class="row-desc"></div></div></div>`);
    const btn = costBtn(() => { const l = book[def.id] || 0; return l >= def.max ? null : def.cost(l); }, curKey, () => {
      const ok = T.G.buyUp(store, def);
      if (ok && def.shape) { T.audio.unlock(); UI.toast(`새 건축가 해금: ${T.SHAPE[def.shape].name}`, 'big'); setTimeout(() => UI.rebuildPanel(), 0); return false; }
      return ok;
    });
    row.appendChild(btn);
    if (def.auto) {
      const tg = T.h(`<button class="toggle" title="켜기/끄기"></button>`);
      tg.addEventListener('click', () => { s.autoOff[def.id] = !s.autoOff[def.id]; T.audio.click(); updateBinds(); });
      bind(tg, () => { const own = !!book[def.id]; tg.style.display = own ? '' : 'none'; tg.classList.toggle('on', own && !s.autoOff[def.id]); tg.textContent = s.autoOff[def.id] ? '꺼짐' : '켜짐'; });
      row.appendChild(tg);
    }
    bind(row, () => {
      const l = book[def.id] || 0;
      row.querySelector('.lvl').textContent = def.max > 1 ? `${l}/${def.max}` : l ? '보유' : '';
      row.querySelector('.row-desc').textContent = def.desc(l);
      row.classList.toggle('owned', l >= def.max);
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
  function tabWork(body) {
    body.appendChild(T.h(`<p class="tab-intro">작은 손들을 위한 작은 개선. 이번 회차에만 유지됩니다. 버튼을 꾹 누르면 연속으로 삽니다.</p>`));
    for (const def of T.UP0) if (T.G.upVisible(0, def)) body.appendChild(upRow(def, 0));
    hiddenNote(body, 0);
  }
  function tabUp(store, body) {
    const s = S();
    const meta = {
      1: ['꼭짓점 공방', 'vertex', '허문 블럭의 모서리를 모아 둔 공방. 여기서 산 것은 재구성해도 사라지지 않습니다.', () => `보유 꼭짓점 효과: 조각 ×<b>${fmt(Math.sqrt(1 + s.vertices))}</b>`],
      2: ['프리즘 실험실', 'prism', '빛을 쪼개고 다시 모으는 실험실. 굴절해도 유지됩니다.', () => `보유 프리즘 효과: 조각 ×<b>${fmt(Math.pow(1 + s.prisms, 0.6))}</b>`],
      3: ['아틀리에', 'pigment', '방울들이 완공된 건축물에 진짜 색을 입힙니다. 걸어 다닌 땅에도 물감이 스며듭니다.', () => `채색 ${(T.G.coverage() * 100).toFixed(1)}% → 조각 ×${(1 + 2 * T.G.coverage()).toFixed(2)}, 보유 안료 ×${fmt(Math.pow(1 + s.pigments, 0.7))}`],
      4: ['등불 회관', 'lantern', '정착한 마을의 회관. 정착을 다시 해도 유지됩니다.', () => `보유 등불 효과: 조각 ×<b>${fmt(Math.pow(1 + s.lanterns, 0.8))}</b>`],
      5: ['물자 창고', 'goods', '일꾼들이 만든 물자로 마을을 돕고 일을 자동화합니다. 어떤 리셋에도 사라지지 않습니다.', () => `일꾼 ${s.workers.length}명, 초당 물자 약 ${fmt((s.workers.length * T.vil.goodsRate()) / 3)}`],
    }[store];
    body.appendChild(T.h(`<div class="layer-head l${store}"><div class="lh-ic">${ic(meta[1])}</div><div><div class="lh-name">${meta[0]}</div><div class="lh-desc">${meta[2]}</div></div></div>`));
    const bonus = T.h(`<div class="layer-bonus"></div>`);
    bind(bonus, () => { bonus.innerHTML = meta[3](); });
    body.appendChild(bonus);
    for (const def of T.G.UPS()[store]) if (T.G.upVisible(store, def)) body.appendChild(upRow(def, store));
    hiddenNote(body, store);
  }

  function tabMs(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">이정표는 다른 어떤 리셋에도 지워지지 않습니다. 세우는 순간 이번 회차(조각, 작업장, 레벨${s.era >= 1 ? '' : ', 건축가와 건축물'})가 처음으로 돌아가고, 영원한 보상을 얻습니다.</p>`));
    const m = T.MILESTONES[s.ms];
    if (m) {
      const card = T.h(`<div class="ms-card"><div class="ms-no">${s.ms + 1}번째 이정표</div><div class="ms-name">${m.name}</div>
        <div class="ms-need"><span>조건</span><b>${m.need}</b></div><div class="ms-bar"><i></i></div><div class="ms-reward"><span>보상</span><b>${m.reward}</b></div></div>`);
      const btn = T.h(`<button class="btn primary wide">이정표 세우기</button>`);
      btn.addEventListener('click', () => { if (T.G.msReady()) T.fx.milestone(); });
      card.appendChild(btn);
      bind(card, () => {
        const [c, n] = m.prog(s);
        card.querySelector('.ms-bar i').style.width = T.clamp(c / n, 0, 1) * 100 + '%';
        btn.disabled = !T.G.msReady();
        card.classList.toggle('ready', T.G.msReady());
      });
      body.appendChild(card);
      const nx = T.MILESTONES[s.ms + 1];
      if (nx) body.appendChild(T.h(`<div class="ms-next"><span>다음</span> ${nx.name}</div>`));
    } else body.appendChild(T.h(`<div class="ms-card ready"><div class="ms-name">모든 이정표를 세웠습니다</div><button class="btn wide" id="ms-cr">크레딧 보기</button></div>`));
    const cr = body.querySelector('#ms-cr'); if (cr) cr.addEventListener('click', () => T.fx.credits());
    if (s.ms) {
      body.appendChild(T.h(`<div class="sub-head"><span>세운 이정표</span></div>`));
      const list = T.h(`<div class="ms-done"></div>`);
      T.MILESTONES.slice(0, s.ms).forEach((x, i) => list.appendChild(T.h(`<div class="ms-chip" title="${x.reward}"><b>${i + 1}</b>${x.name}</div>`)));
      body.appendChild(list);
    }
  }

  function tabTown(body) {
    const s = S();
    const era = T.ERAS[s.era];
    body.appendChild(T.h(`<div class="layer-head l4"><div class="lh-ic">${ic('era')}</div><div><div class="lh-name">${era.name}</div><div class="lh-desc">${era.sub}</div></div></div>`));
    const stats = T.h(`<div class="layer-bonus town-stats"></div>`);
    bind(stats, () => { stats.innerHTML = `인구 <b>${T.vil.population()}</b>/${T.vil.capacity()}  집 ${T.vil.countCat('house')}  평균 행복 ${T.vil.avgHappy().toFixed(2)}  시대 배율 조각 ×${fmt(Math.pow(4, s.era))}`; });
    body.appendChild(stats);
    const req = T.ERA_REQ[s.era + 1];
    if (req) {
      const box = T.h(`<div class="era-card"><div class="era-next"><small>다음 시대</small><b>${T.ERAS[s.era + 1].name}</b><span>${T.ERAS[s.era + 1].sub}</span></div><ul class="era-req"></ul></div>`);
      const ul = box.querySelector('.era-req');
      const items = req.map((r) => { const li = T.h(`<li><span>${r.text}</span><b></b><i><em></em></i></li>`); ul.appendChild(li); return [li, r]; });
      const btn = T.h(`<button class="btn primary wide">시대 전환</button>`);
      btn.addEventListener('click', () => {
        modal(`<div class="m-head"><span class="m-kicker">연대기</span><h2>${T.ERAS[s.era + 1].name}(으)로</h2></div>
          <p class="m-flavor">시간을 앞으로 감습니다. 마을은 처음부터 다시 지어지고, 조각부터 등불까지 모든 화폐가 초기화됩니다. 대신 새 시대의 건축물과 구역, 땅이 열리고 조각 배율이 4배가 됩니다.</p>
          <div class="m-grid"><div><h4>초기화</h4><p>마을, 주민, 조각, 꼭짓점, 프리즘, 안료, 등불, 물자 잔고, 공방과 실험실</p></div><div><h4>유지</h4><p>이정표, 도감, 등불 회관, 물자 창고, 구역 설정</p></div></div>
          <div class="m-actions"><button class="btn ghost" data-close>아직</button><button class="btn primary" id="era-ok">시대 전환</button></div>`);
        $('#era-ok').addEventListener('click', () => { closeModal(); T.fx.era(); });
      });
      box.appendChild(btn);
      bind(box, () => {
        for (const [li, r] of items) {
          const c = r.cur(s);
          li.querySelector('b').textContent = `${r.frac ? c.toFixed(2) : fmt(c)} / ${r.frac ? r.need.toFixed(2) : fmt(r.need)}`;
          li.querySelector('em').style.width = T.clamp(c / r.need, 0, 1) * 100 + '%';
          li.classList.toggle('ok', c >= r.need);
        }
        btn.disabled = !T.G.eraReady();
      });
      body.appendChild(box);
    } else body.appendChild(T.h(`<p class="tab-note">지금 갈 수 있는 가장 먼 시대에 와 있습니다. 다음 시대는 아직 지평선 너머에 있습니다.</p>`));
    body.appendChild(T.h(`<div class="sub-head"><span>구역</span></div>`));
    body.appendChild(T.h(`<p class="tab-note left">건축가들은 알아서 구역을 정하지만, 직접 땅을 칠해 정할 수도 있습니다. 구역을 고른 뒤 바닥을 드래그하세요.</p>`));
    const zg = T.h(`<div class="zones"></div>`);
    for (const k in T.ZONES) {
      const z = T.ZONES[k];
      const open = z.era <= s.era;
      const b = T.h(`<button class="zone-btn ${T.vil.zoneTool === k ? 'on' : ''}" ${open ? '' : 'disabled'}><i style="background:${s.flags.color ? z.color : z.gray}"></i>${open ? z.name : '???'}<small>${open ? '' : T.ERAS[z.era].name}</small></button>`);
      b.addEventListener('click', () => { T.vil.zoneTool = T.vil.zoneTool === k ? null : k; document.body.classList.toggle('zoning', !!T.vil.zoneTool); UI.placingHint(!!T.vil.zoneTool, `${z.name} 구역`, true); UI.rebuildPanel(); });
      zg.appendChild(b);
    }
    body.appendChild(zg);
  }

  // ── blueprints ───────────────────────────────────────────
  function thumb(id, seed, size = 40) {
    const sh = T.shapeOf(id, seed);
    const cv = document.createElement('canvas');
    const rows = sh.h + sh.sink;
    const cs = Math.max(1, Math.floor(Math.min(size / sh.w, size / rows)));
    cv.width = sh.w * cs; cv.height = rows * cs;
    const ctx = cv.getContext('2d');
    for (const c of sh.cells) { ctx.fillStyle = T.st.colorOf(c.ch, S().flags.painter); ctx.fillRect(c.c * cs, (sh.h - 1 - c.r) * cs, cs, cs); }
    return cv;
  }
  function tabBp(body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">설계도를 펼치면 건축가들이 힘을 모아 짓습니다. 완공하면 큰 값에 팔리고, 도감에 기록되어 영원한 <b>명성</b>이 됩니다. 설계도로 지은 건축물 근처에서는 건축가들이 더 행복합니다.</p>`));
    const fame = T.h(`<div class="layer-bonus"></div>`);
    bind(fame, () => { fame.innerHTML = `명성: 조각 ×<b>${T.G.fame().toFixed(2)}</b>  펼친 설계도 ${T.st.activeBps().length}/${T.G.bpSlots()}`; });
    body.appendChild(fame);
    const vis = T.DEFS.filter((d) => T.st.visible(d));
    const tiers = [...new Set(vis.map((d) => d.tier))].sort((a, b) => a - b);
    if (!tiers.includes(UI.bpTier)) UI.bpTier = tiers[0];
    const chips = T.h(`<div class="tier-chips"></div>`);
    for (const t of tiers) {
      const b = T.h(`<button class="dt ${t === UI.bpTier ? 'on' : ''}">${T.TIERS[t].name}</button>`);
      b.addEventListener('click', () => { UI.bpTier = t; T.audio.click(); UI.rebuildPanel(); });
      chips.appendChild(b);
    }
    body.appendChild(chips);
    const grid = T.h(`<div class="bpgrid"></div>`);
    for (const d of vis.filter((x) => x.tier === UI.bpTier)) {
      const av = T.st.available(d);
      const done = s.bps.done[d.id] || 0;
      const card = T.h(`<button class="bpc ${av ? '' : 'locked'}" title="${d.name}"><span class="bpc-t"></span><span class="bpc-n">${av ? d.name : '???'}</span>${done ? `<span class="bpc-d">${done}</span>` : ''}</button>`);
      const th = thumb(d.id, 3); if (!av) th.classList.add('sil');
      card.querySelector('.bpc-t').appendChild(th);
      card.addEventListener('click', () => { T.audio.click(); openDrafting(d.id); });
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }
  let draftTier = 0;
  function openDrafting(id) {
    const s = S();
    draftTier = T.DEF[id].tier;
    modal(`<div class="draft">
        <div class="draft-list"><div class="draft-title">도면 서랍</div><div class="draft-tiers"></div><div class="draft-items"></div></div>
        <div class="draft-main"><div class="sheet"><canvas id="sheet" width="560" height="420"></canvas><div class="sheet-pencil"></div></div><div class="titleblock" id="tb"></div></div>
      </div>`, 'm-draft');
    const vis = T.DEFS.filter((d) => T.st.visible(d));
    const tiers = [...new Set(vis.map((d) => d.tier))];
    const tbox = $('.draft-tiers');
    const items = $('.draft-items');
    const drawItems = () => {
      items.innerHTML = '';
      for (const d of vis.filter((x) => x.tier === draftTier)) {
        const av = T.st.available(d);
        const b = T.h(`<button class="dl ${d.id === id ? 'on' : ''} ${av ? '' : 'locked'}"><span class="dl-name">${av ? d.name : '???'}</span>${s.bps.done[d.id] ? `<span class="dl-done">${s.bps.done[d.id]}</span>` : ''}</button>`);
        b.addEventListener('click', () => { T.audio.click(); id = d.id; drawItems(); showSheet(d.id); });
        items.appendChild(b);
      }
    };
    for (const t of tiers) {
      const b = T.h(`<button class="dt ${t === draftTier ? 'on' : ''}">${T.TIERS[t].name}</button>`);
      b.addEventListener('click', () => { draftTier = t; T.$$('.dt').forEach((x) => x.classList.remove('on')); b.classList.add('on'); drawItems(); });
      tbox.appendChild(b);
    }
    drawItems();
    showSheet(id);
  }
  function showSheet(id) {
    const s = S();
    const def = T.DEF[id];
    const av = T.st.available(def);
    const cv = $('#sheet');
    if (!cv) return;
    T.st.renderSheet(cv, id, 3, !av);
    const sheet = cv.parentElement;
    sheet.classList.remove('drawn'); void sheet.offsetWidth; sheet.classList.add('drawn');
    const sh = T.shapeOf(id, 3);
    const full = T.st.activeBps().length >= T.G.bpSlots();
    const why = !av ? (def.era > s.era ? `${T.ERAS[def.era].name} 시대에 열립니다` : '다음 이정표에서 열립니다') : '';
    $('#tb').innerHTML = `
      <div class="tb-grid">
        <div class="tb-cell tb-name"><small>명칭</small><b>${def.name}</b></div>
        <div class="tb-cell"><small>분류</small><b>${T.TIERS[def.tier].name}</b></div>
        <div class="tb-cell"><small>용도</small><b>${T.CATS[def.cat] ? T.CATS[def.cat].name : '특별'}${def.cap ? ` (${def.cap}명)` : ''}</b></div>
        <div class="tb-cell"><small>규격</small><b>${sh.w} × ${sh.h}${sh.sink ? ` (땅속 ${sh.sink})` : ''}</b></div>
        <div class="tb-cell"><small>블럭 수</small><b>${sh.cells.length}</b></div>
        <div class="tb-cell"><small>완공 보상</small><b>${ic('shard')} ${fmt(T.st.reward(def, sh))}</b></div>
        <div class="tb-cell"><small>시대</small><b>${T.ERAS[def.era].name}</b></div>
        <div class="tb-cell"><small>행복</small><b>${def.cap ? '잠자리' : `+${T.TIERS[def.tier].aura} (${T.TIERS[def.tier].radius})`}</b></div>
        <div class="tb-cell tb-note"><small>비고</small><span>${av ? def.note : why}</span></div>
      </div>
      <div class="tb-actions">
        ${av ? `<button class="btn primary" id="bp-place" ${full ? 'disabled' : ''}>${full ? `펼칠 자리가 없음 (${T.G.bpSlots()})` : '현장에 펼치기'}</button>` : ''}
        <span class="tb-done">${s.bps.done[id] ? `완공 ${s.bps.done[id]}회` : '미완공'}${s.era >= 1 ? '  다른 건축물 위에 펼치면 철거반이 먼저 치웁니다.' : ''}</span>
      </div>`;
    const b = $('#bp-place');
    if (b) b.addEventListener('click', () => { closeModal(); T.st.startPlacing(id); });
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
  function closeModal() { const root = $('#modal'); root.classList.remove('on'); root.innerHTML = ''; }
  UI.modal = modal; UI.closeModal = closeModal;
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
    const el = T.h(`<div class="stamp"><div class="stamp-seal">완공</div><div class="stamp-body"><small>${T.TIERS[def.tier].name}</small><b>${def.name}</b><span>${ic('shard')} +<em>0</em></span>${first ? '<i>도감에 새로 기록됨  명성 ×1.1</i>' : ''}</div></div>`);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const em = el.querySelector('em');
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 1100); em.textContent = fmt(reward * T.easeOut(k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 3400);
  };
  UI.placingHint = function (on, name, zone) {
    const h = $('#hint');
    if (on) { h.innerHTML = zone ? `${name} 칠하기: 바닥을 드래그 <kbd>Esc</kbd> 끝내기` : `「${name}」 펼치는 중: 클릭해서 확정 <kbd>Esc</kbd> 취소`; h.classList.add('on'); }
    else h.classList.remove('on');
  };
  let tip = null;
  UI.tutorial = function () {
    const s = S();
    let t = null;
    if (s.stats.clicks < 3 && !s.archs.length && s.ms === 0) t = '하늘을 클릭해 블럭을 놓아 보세요. 오른쪽 버튼으로 끌면 화면이 움직입니다.';
    else if (!s.archs.length && s.shards >= 15 && s.ms === 0) t = '「고용」 탭에서 첫 건축가를 데려오세요.';
    else if (s.archs.length && s.stats.pets === 0 && s.archs.length < 3) t = '건축가를 클릭하면 쓰다듬을 수 있어요. 끌어서 들어 올릴 수도 있어요.';
    else if (s.archs.length >= 2 && !s.stats.radial && s.ms <= 1) t = '오른쪽 버튼을 짧게 누르면 건축가들에게 부탁할 수 있어요.';
    else if (T.G.msReady() && s.ms < 3) t = '「이정표」 탭에서 첫 이정표를 세울 수 있어요.';
    if (t !== tip) { tip = t; const el = $('#tip'); if (t) { el.textContent = t; el.classList.add('on'); } else el.classList.remove('on'); }
  };

  // ── card ─────────────────────────────────────────────────
  UI.openCard = function (e) {
    cardEnt = e;
    const card = $('#card');
    const s = S();
    if (e.kind === 'painter' || e.kind === 'demo') {
      const p = e.kind === 'painter';
      card.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>${p ? '방울' : '망치'}</b><small>${p ? '채색 펫' : '철거 펫'}</small></div><button class="m-x" id="ac-x">×</button></div>
        <div class="ac-stats">${p ? `<span>붓 크기 <b>${T.ent.brushSize()}</b></span><span>붓질 <b>${T.ent.strokeTime().toFixed(2)}초</b></span><span>채색 판매 <b>×${fmt(T.ent.paintMult())}</b></span>` : `<span>철거 대기 <b>${T.st.condemned().length}</b></span>`}</div>`;
      card.querySelector('.ac-pt').appendChild(T.sprites.portrait(p ? 'drop' : 'demo', s.flags.color, 3, 'happy'));
    } else {
      const d = e.d;
      const role = e.kind === 'arch' ? `${T.SHAPE[d.s].name} 건축가` : e.kind === 'worker' ? '일꾼' : '아기';
      card.innerHTML = `<div class="ac-head"><div class="ac-pt"></div><div><b>${d.name}</b><small>${role}</small></div><button class="m-x" id="ac-x">×</button></div>
        <div class="ac-stats">${e.kind === 'arch' ? '<span>레벨 <b id="ac-lv"></b></span><span>블럭 가치 <b id="ac-v"></b></span>' : ''}<span>행복 <b id="ac-h"></b></span><span>지금 <b id="ac-m"></b></span></div>
        <div class="ac-life"><small>수명</small><i><em></em></i></div><div class="ac-act"></div>`;
      card.querySelector('.ac-pt').appendChild(T.sprites.portrait(d.s, s.flags.color, 3, 'happy'));
      if (e.kind === 'arch') {
        const b = T.h(`<button class="buy wide"><span class="buy-l">레벨업 (꾹)</span><span class="buy-c">${ic('shard')}<b></b></span></button>`);
        holdable(b, () => {
          if (!T.G.levelUp(d)) { T.audio.deny(); return false; }
          T.audio.buy(); e.happyT = 1.2; T.ent.hop(e, 120);
          if (d.lvl % 5 === 0) { T.fx.hearts(e.x, e.y + 20); e.bubble = { text: d.lvl === 5 ? '리본!' : d.lvl === 10 ? '안전모!' : d.lvl === 25 ? '왕관!' : '레벨업!', t: 1.4 }; }
          refreshCard(); return true;
        });
        card.querySelector('.ac-act').appendChild(b);
      }
    }
    card.querySelector('#ac-x').addEventListener('click', UI.closeCard);
    card.classList.add('on');
    refreshCard();
  };
  function refreshCard() {
    if (!cardEnt || !cardEnt.d) return;
    const e = cardEnt, d = e.d, s = S();
    const c = $('#card');
    const set = (id, v) => { const el = c.querySelector(id); if (el) el.innerHTML = v; };
    if (e.kind === 'arch') { set('#ac-lv', d.lvl); set('#ac-v', `${ic('shard')}${fmt(T.G.blockValue(d))}`); }
    set('#ac-h', (e.happy || 0).toFixed(2));
    const doing = e.inside === 'sleep' ? '자는 중' : e.inside ? '방문 중' : e.mournT > 0 ? '슬퍼하는 중' : e.emote ? '부탁 들어주는 중' : e.proj ? `${T.DEF[e.proj.id].name} 짓는 중` : e.kind === 'worker' ? (e.job ? `${T.DEF[e.job.id].name}에서 일함` : '일자리 찾는 중') : '쉬는 중';
    set('#ac-m', doing);
    const life = c.querySelector('.ac-life');
    if (life) { life.style.display = s.era >= 1 && d.life !== undefined ? '' : 'none'; if (d.life !== undefined) life.querySelector('em').style.width = T.clamp(d.life / T.vil.maxLife(), 0, 1) * 100 + '%'; }
    const b = c.querySelector('.buy b');
    if (b && e.kind === 'arch') { const cost = T.G.levelCost(d); b.textContent = fmt(cost); b.closest('button').disabled = s.shards < cost; }
    if (!T.ent.all().includes(e)) UI.closeCard();
  }
  UI.closeCard = function () { cardEnt = null; $('#card').classList.remove('on'); };
  function positionCard() {
    if (!cardEnt) return;
    const card = $('#card');
    const [sx, sy] = T.w2s(cardEnt.x, cardEnt.y);
    const w = card.offsetWidth, h = card.offsetHeight;
    const x = T.clamp(sx - w / 2, 10, innerWidth - w - 360);
    const y = T.clamp(sy - 46 * T.cam.z - h - 30, 70, innerHeight - h - 10);
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  // ── radial menu (right click) ────────────────────────────
  const RADIAL = [
    { id: 'gather', icon: '◎', name: '모여!' }, { id: 'dance', icon: '♪', name: '춤추기' }, { id: 'cheer', icon: '✦', name: '만세' },
    { id: 'rest', icon: '☾', name: '쉬어' }, { id: 'scatter', icon: '✺', name: '흩어져' }, { id: 'follow', icon: '➜', name: '따라와' },
  ];
  UI.radial = function (sx, sy, wx) {
    UI.closeRadial();
    const el = T.h(`<div class="radial" style="left:${sx}px;top:${sy}px"><div class="radial-core"></div></div>`);
    RADIAL.forEach((r, i) => {
      const an = -Math.PI / 2 + (i / RADIAL.length) * Math.PI * 2;
      const b = T.h(`<button class="radial-b" style="--x:${Math.cos(an) * 62}px;--y:${Math.sin(an) * 62}px;--d:${i * 25}ms"><span>${r.icon}</span><small>${r.name}</small></button>`);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => {
        const n = T.ent.groupAction(r.id, wx);
        S().stats.radial = (S().stats.radial || 0) + 1;
        T.audio.pet();
        UI.toast(n ? `${n}명이 「${r.name}」 부탁을 들었습니다.` : '근처에 들어줄 친구가 없어요.');
        UI.closeRadial();
      });
      el.appendChild(b);
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
  };
  UI.closeRadial = function () { const r = $('.radial'); if (r) { r.classList.remove('in'); r.classList.add('out'); setTimeout(() => r.remove(), 180); } };

  // ── settings, codes, offline, intros ─────────────────────
  UI.settings = function () {
    const s = S();
    modal(`<div class="m-head"><h2>설정</h2></div>
      <label class="opt"><input type="checkbox" id="o-snd" ${s.settings.sound ? 'checked' : ''}> 소리</label>
      <div class="sub-head"><span>비밀 코드</span></div>
      <div class="code-row"><input id="o-code" type="text" placeholder="코드를 입력하세요" maxlength="20" autocomplete="off"><button class="btn" id="o-code-go">입력</button></div>
      <div class="sub-head"><span>저장</span></div>
      <textarea id="o-save" rows="3" placeholder="여기에 저장 코드를 붙여 넣고 가져오기"></textarea>
      <div class="m-actions left"><button class="btn" id="o-exp">내보내기</button><button class="btn" id="o-imp">가져오기</button><button class="btn danger" id="o-wipe">처음부터</button></div>
      <div class="sub-head"><span>기록</span></div>
      <p class="stats">쌓은 블럭 ${fmt(s.stats.lifeBlocks)}<br>누적 조각 ${fmt(s.stats.lifeEarned)}<br>완공한 건축물 ${s.stats.built}<br>쓰다듬기 ${fmt(s.stats.pets)}회<br>플레이 ${T.fmtTime(s.stats.played)}</p>
      <div class="m-actions left"><button class="btn ghost" id="o-cred">크레딧</button></div>`);
    $('#o-snd').addEventListener('change', (e) => { s.settings.sound = e.target.checked; T.audio.setOn(e.target.checked); $('#btn-snd').classList.toggle('off', !e.target.checked); });
    const go = () => UI.enterCode($('#o-code').value);
    $('#o-code-go').addEventListener('click', go);
    $('#o-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    $('#o-exp').addEventListener('click', () => { $('#o-save').value = T.G.exportSave(); $('#o-save').select(); try { document.execCommand('copy'); UI.toast('저장 코드를 복사했습니다.'); } catch (e) { /* ignore */ } });
    $('#o-imp').addEventListener('click', () => { if (T.G.importSave($('#o-save').value)) { T.main.noSave = true; location.reload(); } else UI.toast('저장 코드가 올바르지 않습니다.'); });
    $('#o-cred').addEventListener('click', () => { closeModal(); T.fx.credits(); });
    $('#o-wipe').addEventListener('click', () => {
      modal(`<div class="m-head"><h2>처음부터 다시</h2></div><p class="m-flavor">모든 진행 상황이 지워집니다. 되돌릴 수 없습니다.</p>
        <div class="m-actions"><button class="btn ghost" data-close>취소</button><button class="btn danger" id="o-wipe2">지우기</button></div>`);
      $('#o-wipe2').addEventListener('click', () => { T.main.noSave = true; T.G.wipe(); });
    });
  };
  UI.enterCode = function (raw) {
    const s = S();
    let code = (raw || '').trim().toUpperCase();
    if (T.CODES[code] && T.CODES[T.CODES[code]]) code = T.CODES[code];
    if (code === 'ROSETTE' || code === '장미창') {
      s.flags.rosette = !s.flags.rosette;
      T.G.rebuild();
      UI.toast(s.flags.rosette ? T.CODES.ROSETTE : '장미창이 조용히 잠듭니다.', 'big');
      T.audio.reveal();
    } else if (code === 'PARADE') { T.ent.groupAction('parade', T.main.cursorX()); UI.toast(T.CODES.PARADE); }
    else if (code === 'HELLO') { T.ent.groupAction('hello', 0); UI.toast(T.CODES.HELLO); }
    else if (code === 'CREDITS') { closeModal(); T.fx.credits(); }
    else { UI.toast('아무 일도 일어나지 않았습니다.'); T.audio.deny(); return; }
    closeModal();
  };
  UI.offline = function (r) {
    modal(`<div class="m-head"><span class="m-kicker">돌아오셨군요</span><h2>자리를 비운 ${T.fmtTime(r.el)} 동안</h2></div>
      <p class="m-flavor">건축가들은 쉬지 않고 일했습니다.</p>
      <div class="m-gain">${ic('shard')} <b>+${fmt(r.earned)}</b>${r.goods ? `  ${ic('goods')} <b>+${fmt(r.goods)}</b>` : ''}</div>
      <div class="m-actions"><button class="btn primary" data-close>좋아요</button></div>`);
  };
  UI.introPainter = function () {
    modal(`<div class="m-head"><span class="m-kicker">새 친구</span><h2>방울</h2></div><div class="intro-pt" id="ip"></div>
      <p class="m-flavor">물감 한 방울에서 태어난 채색 펫. 완공된 건축물에 <b>진짜 색</b>을 입히고, 걸어 다닌 땅에도 물감을 남깁니다. 많이 밟은 땅일수록 색이 깊이 스며듭니다.</p>
      <div class="m-actions"><button class="btn primary" data-close>반가워!</button></div>`);
    $('#ip').appendChild(T.sprites.portrait('drop', true, 6, 'happy'));
  };
  UI.introVillage = function () {
    modal(`<div class="m-head"><span class="m-kicker">정착</span><h2>마을이 시작됩니다</h2></div><div class="intro-pt" id="ip"></div>
      <ul class="intro-list"><li><b>집</b>을 지으면 밤에 들어가 잠을 잡니다. 잠은 <b>수명</b>을 회복시킵니다.</li>
      <li>수명이 다한 건축가는 긴 잠에 듭니다. 친구들은 슬퍼하고, 가끔 작은 무덤을 지어 줍니다.</li>
      <li>집이 아닌 건축물 근처에 있으면 <b>행복</b>해져서 더 빨리 일합니다.</li>
      <li>마을은 <b>구역</b>을 따라 바깥으로 자랍니다. 「마을」 탭에서 직접 구역을 칠할 수도 있어요.</li>
      <li>설계도를 다른 건축물 위에 펼치면 철거 펫 <b>망치</b>가 먼저 치웁니다.</li>
      <li>이정표, 리셋과 별개로 마을은 재구성, 굴절, 물들임을 해도 남습니다.</li></ul>
      <div class="m-actions"><button class="btn primary" data-close>시작하기</button></div>`);
    const ip = $('#ip');
    ip.appendChild(T.sprites.portrait('square', true, 5, 'happy'));
    ip.appendChild(T.sprites.portrait('demo', true, 5, 'normal'));
  };
  UI.afterReset = function (n) {
    const s = S();
    const names = ['', '공방', '실험실', '아틀리에', '등불 회관과 마을'];
    if (s.flags['l' + n + 'Done'] === 1 && n !== 2) UI.toast(`새로운 공간이 열렸습니다: <b>${names[n]}</b>`, 'big');
  };

  // ── gap widget (grid placement) ──────────────────────────
  UI.updateGap = function () {
    const g = S().settings.gap;
    $('#gap-v').textContent = g === 0 ? '자유' : g === 1 ? '격자' : `${g}칸`;
    $('#gap').classList.toggle('free', g === 0);
  };

  UI.tick = function () {
    updateHud();
    updateSeals();
    if (structureSig() !== sig) UI.rebuildPanel(); else updateBinds();
    refreshCard();
    UI.tutorial();
  };
  UI.frame = function () { positionCard(); };

  UI.init = function () {
    buildHud();
    UI.rebuildPanel(true);
    $('#btn-zin').addEventListener('click', () => T.main.zoomBy(1.4));
    $('#btn-zout').addEventListener('click', () => T.main.zoomBy(1 / 1.4));
    $('#btn-home').addEventListener('click', () => T.main.home());
    $('#btn-obs').addEventListener('click', () => T.main.observe());
    $('#btn-snd').addEventListener('click', () => { const s = S(); s.settings.sound = !s.settings.sound; T.audio.setOn(s.settings.sound); $('#btn-snd').classList.toggle('off', !s.settings.sound); });
    $('#btn-set').addEventListener('click', UI.settings);
    $('#btn-panel').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
    $('#btn-snd').classList.toggle('off', !S().settings.sound);
    const gap = $('#gap');
    gap.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); const s = S(); s.settings.gap = T.clamp(s.settings.gap + (e.deltaY > 0 ? -1 : 1), 0, 8); T.audio.tick(); UI.updateGap(); }, { passive: false });
    gap.addEventListener('click', () => { const s = S(); s.settings.gap = (s.settings.gap + 1) % 9; T.audio.tick(); UI.updateGap(); });
    UI.updateGap();
  };
})();
