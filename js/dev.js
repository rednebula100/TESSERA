'use strict';
// ─────────────────────────────────────────────────────────────
//  DEV: 개발자 모드 (코드 DEV / 개발자, 또는 URL ?dev)
//  화폐, 진행, 세계, 연출 재생, 배율 내역, 사운드 보드
// ─────────────────────────────────────────────────────────────
(function () {
  const D = (T.dev = {});
  const S = () => T.G.s;
  const fmt = (n) => T.fmt(n);
  const CURS = [['shards', '조각'], ['vertices', '꼭짓점'], ['grains', '결'], ['prisms', '프리즘'], ['pigments', '안료'], ['folds', '안개'], ['lanterns', '등불'], ['goods', '물자']];
  const RUN = { vertices: 'vertsRun', grains: 'grainRun', prisms: 'prismsRun', pigments: 'pigRun', folds: 'foldRun', lanterns: 'eraLanterns', goods: 'eraGoods', shards: 'runEarned' };
  const LIFE = { vertices: 'lifeVerts', grains: 'lifeGrains', prisms: 'lifePrisms', pigments: 'lifePigments', folds: 'lifeFolds', lanterns: 'lifeLanterns', goods: 'lifeGoods', shards: 'lifeEarned' };

  function give(k, f) {
    const s = S();
    const before = s[k];
    s[k] = f(s[k]);
    const d = Math.max(0, s[k] - before);
    if (RUN[k]) s[RUN[k]] = (s[RUN[k]] || 0) + d;
    if (LIFE[k]) s.stats[LIFE[k]] = (s.stats[LIFE[k]] || 0) + d;
    T.G.computeMult();
  }
  function refresh() { T.G.computeMult(); T.G.rebuild(); T.main.reindex(); T.ui.rebuildPanel(); T.ui.updateDock(); }
  const finishAll = (fn) => { for (const st of S().structs.slice()) fn(st); T.G.rebuild(); };

  function section(body, title, rows) {
    const box = T.h(`<div class="dev-sec"><div class="sub-head"><span>${title}</span></div></div>`);
    for (const r of rows) {
      const row = T.h(`<div class="dev-row"><span class="dev-l">${r[0]}</span><span class="dev-b"></span></div>`);
      for (const [label, fn, tip] of r[1]) {
        const b = T.h(`<button class="mini" ${tip ? `data-tip="${tip}"` : ''}>${label}</button>`);
        b.addEventListener('click', () => { fn(); T.audio.play('tick'); refreshSoft(); });
        row.querySelector('.dev-b').appendChild(b);
      }
      box.appendChild(row);
    }
    body.appendChild(box);
  }
  let soft = null;
  function refreshSoft() { if (soft) soft(); }

  D.tab = function (body) {
    const s = S();
    body.appendChild(T.h(`<p class="tab-intro">개발자 모드입니다. 테스트용 도구라 진행이 쉽게 망가질 수 있어요. 끄려면 설정에서 코드 <b>DEV</b>를 다시 입력하세요.</p>`));
    const status = T.h(`<div class="layer-bonus dev-status"></div>`);
    soft = () => { status.innerHTML = `이정표 <b>${s.ms}</b>  시대 <b>${T.ERAS[s.era].name}</b>  해상도 <b>${T.RES_NAME[s.resLv]}</b>  겹 <b>${T.G.layers()}</b>  배속 <b>×${T.main.timeScale || 1}</b><br>조각 배율 ×<b>${fmt(T.G.M)}</b>  초당 <b>${fmt(T.G.rate)}</b>`; };
    soft();
    body.appendChild(status);

    section(body, '화폐', CURS.map(([k, name]) => [name, [['×10', () => give(k, (v) => Math.max(10, v * 10))], ['+1000', () => give(k, (v) => v + 1000)], ['0', () => { s[k] = 0; T.G.computeMult(); }]]]));

    section(body, '진행', [
      ['이정표', [['+1', () => { s.ms = Math.min(T.MILESTONES.length, s.ms + 1); refresh(); }, '조건 없이 다음 이정표'], ['−1', () => { s.ms = Math.max(0, s.ms - 1); refresh(); }], ['모두', () => { s.ms = T.MILESTONES.length; refresh(); }]]],
      ['리셋 기록', [1, 2, 3, 4, 5, 6].map((n) => [T.G.L[n].name, () => { s.flags['l' + n + 'Done'] = Math.max(1, s.flags['l' + n + 'Done']); if (n >= 3) s.flags.color = true; if (n === 3) { document.body.classList.add('color'); const v = document.getElementById('veil'); if (v) v.classList.add('gone'); } if (n === 6 && s.era < 1) { s.era = 1; s.clock = 60; } refresh(); }, `${T.G.L[n].name}을(를) 한 번 한 것으로 표시`])],
      ['해상도', [0, 1, 2, 3].map((l) => [T.RES_NAME[l], () => { s.resLv = l; refresh(); }])],
      ['시대', [0, 1, 2, 3, 4].map((e) => [T.ERAS[e].name, () => { s.era = e; if (e >= 1) { s.flags.l6Done = Math.max(1, s.flags.l6Done); s.clock = s.clock || 60; } refresh(); }])],
      ['겹', [1, 2, 3, 4, 5].map((n) => [n + '겹', () => { s.zup.layer = n - 1; s.flags.l5Done = Math.max(1, s.flags.l5Done); T.ent.syncPets(); refresh(); }])],
      ['시대 전환', [['조건 무시 다음 시대', () => { if (s.era >= 1 && s.era < 4) { s.era++; refresh(); } }]]],
    ]);

    section(body, '세계', [
      ['건축물', [
        ['모두 쌓기', () => finishAll((st) => { if (!T.st.done(st)) { const n = T.st.count(st); for (let i = 0; i < n; i++) if (!st.f || st.f[i] === 0) T.st.fill(st, i); } })],
        ['모두 다듬기', () => finishAll((st) => { if (T.st.done(st)) { const mx = T.st.maxLvOf(st); st.lv = st.lv.map(() => mx); st.cv = st.cv.map(() => 0); if (!st.fin) T.st.finish(st); } })],
        ['모두 칠하기', () => finishAll((st) => { if (T.st.done(st)) st.pt = st.lv.map((l) => T.RES[l] * T.RES[l]); })],
        ['무작위 설계도', () => { const opts = T.DEFS.filter((d) => T.st.available(d) && !d.sky); if (!opts.length) return; const d = opts[Math.floor(Math.random() * opts.length)]; const x = Math.round((T.main.cursorX() + (Math.random() - 0.5) * 200) / T.B) * T.B; const st = T.st.create(d.id, T.st.variant(d.id), x, 'bp', { z: T.view() }); T.G.redrawRange(st.x - 8, st.x + T.st.shape(st).w * 8 + 8); T.ui.toast(`「${d.name}」 설계도`); }],
      ]],
      ['주민', [
        ['네모 +1', () => { T.G.addArch('square', 0, false); T.G.computeMult(); }, '자리 무시'],
        ['육각 +1', () => { T.G.addArch('hexagon', 10, false); T.G.computeMult(); }, '자리 무시, Lv10'],
        ['모두 Lv+10', () => { for (const a of s.archs) a.lvl += 10; T.G.computeMult(); }],
      ]],
      ['시간', [
        ['×1', () => (T.main.timeScale = 1)], ['×4', () => (T.main.timeScale = 4)], ['×16', () => (T.main.timeScale = 16)],
        ['아침', () => setClock(0.02)], ['정오', () => setClock(0.37)], ['해질녘', () => setClock(0.7)], ['밤', () => setClock(0.85)],
      ]],
      ['하늘', [['일식', () => T.vil.startEvent('eclipse', 40)], ['오로라', () => { setClock(0.85); T.vil.startEvent('aurora', 60); }], ['끝내기', () => { s.event = null; T.G.computeMult(); }]]],
    ]);

    section(body, '연출 재생 (진행은 바뀌지 않음)', [
      ['리셋', [1, 2, 3, 4, 5, 6].map((n) => [T.G.L[n].name, () => T.fx.reset(n, { preview: true })])],
      ['기타', [['색의 탄생', () => T.fx.reset(3, { preview: true, first: true })], ['첫 정착', () => T.fx.reset(6, { preview: true, first: true })], ['시대 전환', () => T.fx.era({ preview: true })], ['이정표', () => T.fx.milestone({ preview: true })], ['크레딧', () => T.fx.credits()]]],
      ['안내서', [['목록 열기', () => T.ui.guideBook && T.ui.guideBook()]]],
    ]);

    // multiplier breakdown: where the shard multiplier comes from
    const br = T.h(`<div class="dev-sec"><div class="sub-head"><span>조각 배율 내역</span></div><div class="dev-table"></div></div>`);
    const tb = br.querySelector('.dev-table');
    const lv = T.G.lv, ad = (a, l) => 1 + a * l;
    const rows = [
      ['장인의 눈', ad(0.4, lv(s.up, 'eye'))], ['보유 꼭짓점', T.G.hold(s.vertices, 1)], ['보유 결', T.G.hold(s.grains, 1.1)], ['보유 프리즘', T.G.hold(s.prisms, 1.2)],
      ['보유 안료', T.G.hold(s.pigments, 1.3)], ['보유 안개', T.G.hold(s.folds, 1.4)], ['보유 등불', T.G.hold(s.lanterns, 1.5)],
      ['기하의 축복', ad(1, lv(s.vup, 'bless'))], ['고운 결', ad(1, lv(s.sup, 'sharp'))], ['스펙트럼', ad(1.5, lv(s.pup, 'spectrum'))], ['팔레트의 은총', ad(2, lv(s.gup, 'all'))],
      ['깊이감, 겹', ad(0.75, lv(s.zup, 'depth')) * Math.pow(1.25, T.G.layers() - 1)], ['등불 아래서', ad(2, lv(s.lup, 'lshard'))], ['마을 장터', ad(1.5, lv(s.mup, 'm_shard'))],
      ['명성', T.G.fame()], ['이정표', T.msShardMult(s.ms)], ['시대', Math.pow(1.5, s.era)], ['하늘 축제', T.G.fever()], ['채색', s.flags.l4Done ? 1 + 2 * T.G.coverage() : 1],
    ];
    tb.innerHTML = rows.filter((r) => r[1] !== 1).map(([n, v]) => `<span>${n}</span><b>×${fmt(v)}</b>`).join('') || '<span>아직 배율이 없습니다</span><b></b>';
    body.appendChild(br);

    // sound board (filled by the audio engine)
    if (T.audio.cues) {
      const sb = T.h(`<div class="dev-sec"><div class="sub-head"><span>사운드 보드</span><small class="dev-meter" id="dev-meter"></small></div><div class="dev-sounds"></div></div>`);
      const box = sb.querySelector('.dev-sounds');
      for (const name of Object.keys(T.audio.cues)) {
        const b = T.h(`<button class="mini">${name}</button>`);
        b.addEventListener('click', () => { T.audio.init(); T.audio.play(name, { force: true }); if (T.audio.meter) T.audio.meter((v) => { const m = document.getElementById('dev-meter'); if (m) m.textContent = `최대 음량 ${v.toFixed(3)}`; }); });
        box.appendChild(b);
      }
      body.appendChild(sb);
    }
  };
  function setClock(frac) { const s = S(); if (s.era < 1) return; const DAY = 210; s.clock = (Math.floor(s.clock / DAY) + (frac < (s.clock % DAY) / DAY ? 1 : 0)) * DAY + frac * DAY; }
})();
