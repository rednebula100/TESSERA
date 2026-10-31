'use strict';
// ─────────────────────────────────────────────────────────────
//  MAIN: 루프, 입력, 카메라
//  좌클릭: 블럭(격자) / 건축가 쓰다듬기, 끌기 / 설계도 확정 / 구역 칠하기
//  우클릭 드래그: 화면 이동, 우클릭: 부탁 메뉴
// ─────────────────────────────────────────────────────────────
(function () {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const cam = T.cam;
  const B = T.B;
  const M = (T.main = { noSave: false });
  let hitstop = 0, observing = false;
  let mouse = { sx: 0, sy: 0, wx: 0, wy: 0 };
  let clickCD = 0, denyFlash = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cam.dpr = dpr; cam.W = innerWidth; cam.H = innerHeight;
    cv.width = Math.round(cam.W * dpr); cv.height = Math.round(cam.H * dpr);
    cv.style.width = cam.W + 'px'; cv.style.height = cam.H + 'px';
  }
  addEventListener('resize', resize);

  // ── camera ───────────────────────────────────────────────
  const ZMIN = 0.04, ZMAX = 6;
  function zoomAt(sx, sy, f) {
    const nz = T.clamp(cam.tz * f, ZMIN, ZMAX);
    const [wx, wy] = T.s2w(sx, sy);
    cam.tx = wx - (sx - cam.W / 2) / nz;
    cam.ty = wy - (cam.H / 2 - sy) / nz;
    cam.tz = nz;
    clampCam();
  }
  function clampCam() {
    const minY = cam.H / 2 / cam.tz - 70 / cam.tz - 10;
    cam.ty = Math.min(Math.max(cam.ty, minY), 20000);
    cam.tx = T.clamp(cam.tx, -30000, 30000);
  }
  M.zoomBy = (f) => zoomAt(cam.W / 2 - 170, cam.H / 2, f);
  M.focus = (x, y, z) => { cam.tx = x; cam.ty = y; cam.tz = z || Math.max(cam.tz, 1.6); clampCam(); };
  M.cursorX = () => mouse.wx;
  M.hitstop = (t) => { hitstop = Math.max(hitstop, t); };
  function extents() {
    let L = -100, R = 100, top = 120;
    for (const st of T.G.s.structs) { const [a, b, t] = T.st.bbox(st); L = Math.min(L, a); R = Math.max(R, b); top = Math.max(top, t); }
    for (const e of T.ent.archs) { L = Math.min(L, e.x - 40); R = Math.max(R, e.x + 40); if (e.pos) for (let i = 0; i < e.pos.length; i += 20) { L = Math.min(L, e.pos[i][0]); R = Math.max(R, e.pos[i][0]); top = Math.max(top, e.pos[i][1]); } }
    return { L, R, top };
  }
  M.home = function () {
    const e = extents();
    const z = T.clamp(Math.min((cam.W - 420) / (e.R - e.L + 120), (cam.H - 200) / (e.top + 120)), ZMIN, 2.4);
    cam.tz = z; cam.tx = (e.L + e.R) / 2 + 170 / z; cam.ty = (cam.H / 2 - 80) / z;
    clampCam();
  };
  M.observe = function () {
    observing = !observing;
    document.body.classList.toggle('observe', observing);
    if (observing) {
      T.ui.closeCard(); T.ui.closeRadial();
      const e = extents();
      cam.tz = T.clamp(Math.min((cam.W - 80) / (e.R - e.L + 120), (cam.H - 100) / (e.top + 100)), ZMIN, 3);
      cam.tx = (e.L + e.R) / 2; cam.ty = (cam.H / 2 - 50) / cam.tz;
      clampCam();
    }
  };

  // ── block placement ──────────────────────────────────────
  function snap(wx, wy) {
    const g = T.G.s.settings.gap;
    if (g === 0) return [wx, Math.max(wy, B / 2 + 1)];
    const st = B * g;
    return [Math.round((wx - B / 2) / st) * st + B / 2, Math.max(B / 2, Math.round((wy - B / 2) / st) * st + B / 2)];
  }
  const keyOf = (x, y) => Math.round(x) + ',' + Math.round(y);
  let occupied = new Set();
  M.reindex = () => { occupied = new Set(T.G.s.player.map((p) => keyOf(p[0], p[1]))); };
  function placePlayer(wx, wy, quiet) {
    const s = T.G.s;
    if (wy < -12 || clickCD > 0) return false;
    const [x, y] = snap(wx, wy);
    if (T.st.inFootprint(x, y, true)) { denyFlash = 0.4; if (!quiet) { T.audio.deny(); T.ui.toast('짓고 있는 건축물 위에는 블럭을 놓을 수 없어요.'); } return false; }
    const k = keyOf(x, y);
    if (s.settings.gap > 0 && occupied.has(k)) return false;
    clickCD = T.G.clickCD();
    s.stats.clicks++;
    const v = T.G.clickValue();
    const p = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    if (s.player.length < 30000) { s.player.push(p); occupied.add(k); }
    T.G.drawPlayerBlock(p);
    T.G.earn(v);
    s.stats.lifeBlocks++;
    T.fx.floatText(x, y + 8, '+' + T.fmt(v), false);
    T.fx.splash(x, y, T.G.playerColor());
    T.audio.place(y);
    T.ent.notifyPlayerBlock(x, y);
    return true;
  }

  // ── input ────────────────────────────────────────────────
  let down = null, rdown = null;
  const ptrs = new Map();
  let pinch = null;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    T.audio.init();
    if (observing) { M.observe(); return; }
    T.ui.closeRadial();
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.tz }; down = null; return; }
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (e.button === 2 || e.button === 1) { rdown = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, wx }; return; }
    if (T.st.placing) { down = { placing: true, sx: e.clientX, sy: e.clientY }; return; }
    if (T.vil.zoneTool && wy < 40) { T.vil.zoneDrag = [wx, wx]; down = { zone: true }; return; }
    const ent = T.ent.pick(wx, wy);
    down = { sx: e.clientX, sy: e.clientY, moved: false, ent, held: false, painted: false };
  });
  cv.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    mouse = { sx: e.clientX, sy: e.clientY, wx, wy };
    if (T.st.placing) T.st.ghostX = wx;
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)) / cam.tz);
      return;
    }
    if (rdown) {
      const dx = e.clientX - rdown.lx, dy = e.clientY - rdown.ly;
      rdown.lx = e.clientX; rdown.ly = e.clientY;
      if (!rdown.moved && Math.hypot(e.clientX - rdown.sx, e.clientY - rdown.sy) > 5) { rdown.moved = true; cv.style.cursor = 'grabbing'; }
      if (rdown.moved) { cam.tx -= dx / cam.tz; cam.ty += dy / cam.tz; cam.x -= dx / cam.z; cam.y += dy / cam.z; clampCam(); }
      return;
    }
    if (down && down.zone) { T.vil.zoneDrag[1] = wx; return; }
    if (!down || down.placing) {
      const h = T.ent.pick(wx, wy);
      T.ent.hover = h;
      cv.style.cursor = T.st.placing ? 'copy' : T.vil.zoneTool ? 'ew-resize' : h ? 'grab' : 'crosshair';
      return;
    }
    if (!down.moved && Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 5) {
      down.moved = true;
      if (down.ent) { down.held = true; T.ent.hold(down.ent); T.ui.closeCard(); cv.style.cursor = 'grabbing'; }
    }
    if (down.held) T.ent.drag(down.ent, wx, wy);
    else if (down.moved) { if (placePlayer(wx, wy, true)) down.painted = true; } // drag-paint, cooldown applies
  });
  function endPtr(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (rdown && (e.button === 2 || e.button === 1 || !down)) {
      const r = rdown; rdown = null; cv.style.cursor = 'crosshair';
      if (!r.moved && e.button === 2) {
        if (T.st.placing) T.st.cancel();
        else if (T.vil.zoneTool) { T.vil.zoneTool = null; document.body.classList.remove('zoning'); T.ui.placingHint(false); T.ui.rebuildPanel(); }
        else T.ui.radial(e.clientX, e.clientY, wx);
      }
      return;
    }
    if (!down) return;
    const d = down; down = null;
    cv.style.cursor = 'crosshair';
    if (d.zone) { T.vil.paintZone(T.vil.zoneDrag[0], T.vil.zoneDrag[1], T.vil.zoneTool); T.vil.zoneDrag = null; return; }
    if (d.placing) { T.st.confirm(wx); return; }
    if (d.held) { T.ent.release(d.ent); return; }
    if (d.moved) return;
    if (d.ent) { T.ent.pet(d.ent); T.ui.openCard(d.ent); return; }
    T.ui.closeCard();
    placePlayer(wx, wy);
  }
  cv.addEventListener('pointerup', endPtr);
  cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); if (down && down.held) T.ent.release(down.ent); down = null; rdown = null; pinch = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (observing) return; zoomAt(e.clientX, e.clientY, Math.exp(-T.clamp(e.deltaY, -120, 120) * 0.0018)); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const s = T.G.s;
    if (e.key === 'Escape') {
      if (observing) M.observe();
      else if (document.querySelector('.radial')) T.ui.closeRadial();
      else if (T.st.placing) T.st.cancel();
      else if (T.vil.zoneTool) { T.vil.zoneTool = null; document.body.classList.remove('zoning'); T.ui.placingHint(false); T.ui.rebuildPanel(); }
      else if (T.ui.modalOpen()) T.ui.closeModal();
      else T.ui.closeCard();
    } else if (e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') M.observe();
    else if (e.key === '+' || e.key === '=') M.zoomBy(1.3);
    else if (e.key === '-') M.zoomBy(1 / 1.3);
    else if (e.key === '[') { s.settings.gap = Math.max(0, s.settings.gap - 1); T.ui.updateGap(); }
    else if (e.key === ']') { s.settings.gap = Math.min(8, s.settings.gap + 1); T.ui.updateGap(); }
    else if (e.key === 'ArrowLeft') cam.tx -= 80 / cam.tz;
    else if (e.key === 'ArrowRight') cam.tx += 80 / cam.tz;
    else if (e.key === 'ArrowUp') cam.ty += 80 / cam.tz;
    else if (e.key === 'ArrowDown') { cam.ty -= 80 / cam.tz; clampCam(); }
  });

  // ── loop ─────────────────────────────────────────────────
  let last = performance.now();
  let tickAcc = 0, saveAcc = 0, autoAcc = 0, homeAcc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.pow(0.0001, dt);
    cam.z += (cam.tz - cam.z) * k; cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
    if (observing) { cam.tz = Math.max(ZMIN, cam.tz * (1 - dt * 0.01)); }
    let gdt = dt;
    if (hitstop > 0) { hitstop -= dt; gdt = 0; }
    clickCD = Math.max(0, clickCD - dt);
    denyFlash = Math.max(0, denyFlash - dt);
    const s = T.G.s;
    if (s.era >= 1) s.clock += gdt;
    T.ent.update(gdt);
    T.fx.update(gdt);
    T.vil.updateHappiness(gdt);
    if (s.era >= 1) { T.vil.familyTick(); T.vil.growKids(gdt); }
    s.stats.played += dt;
    tickAcc += dt; saveAcc += dt; autoAcc += dt; homeAcc += dt;
    if (tickAcc >= 0.25) {
      T.G.computeMult();
      const inst = T.G._acc / tickAcc;
      T.G._acc = 0;
      T.G.rate += (inst - T.G.rate) * (1 - Math.exp(-tickAcc / 4));
      tickAcc = 0;
      T.ui.tick();
    }
    if (autoAcc >= 0.5) { T.G.automate(autoAcc); autoAcc = 0; }
    if (homeAcc >= 5) { homeAcc = 0; T.vil.assignHomes(); }
    if (saveAcc >= 15) { saveAcc = 0; T.G.save(); }
    render(now);
    T.ui.frame();
    requestAnimationFrame(frame);
  }

  function render(now) {
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const s = T.G.s;
    const color = s.flags.color;
    const n = T.vil.night();
    T.world.drawSky(ctx, color, n, now / 1000);
    T.world.render(ctx, 'back', 0.42);
    T.world.render(ctx, 'front');
    T.world.drawFloor(ctx, color, s.era, n);
    T.world.render(ctx, 'under');
    T.vil.renderZones(ctx);
    T.st.render(ctx, now);
    T.ent.draw(ctx);
    T.fx.draw(ctx);
    if (n > 0.01) {
      ctx.fillStyle = `rgba(16,18,46,${0.3 * n})`;
      ctx.fillRect(0, 0, cam.W, cam.H);
      T.vil.renderGlow(ctx, n);
      T.ent.drawSleepers(ctx, n);
    }
    // click cooldown ring at the cursor
    if (!T.st.placing && !T.vil.zoneTool && (clickCD > 0 || denyFlash > 0)) {
      const tot = T.G.clickCD();
      ctx.strokeStyle = denyFlash > 0 ? 'rgba(200,60,60,0.8)' : color ? 'rgba(47,111,176,0.7)' : 'rgba(40,40,40,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouse.sx + 14, mouse.sy + 14, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (denyFlash > 0 ? 1 : 1 - clickCD / tot));
      ctx.stroke();
    }
    // grid preview
    if (!T.st.placing && !T.vil.zoneTool && !down && !rdown && cam.z > 0.6 && T.G.s.settings.gap > 0 && mouse.wy > 0) {
      const [x, y] = snap(mouse.wx, mouse.wy);
      const [px, py] = T.w2s(x - B / 2, y + B / 2);
      ctx.strokeStyle = T.st.inFootprint(x, y, true) ? 'rgba(200,60,60,0.6)' : color ? 'rgba(47,111,176,0.45)' : 'rgba(40,40,40,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(px) + 0.5, Math.round(py) + 0.5, B * cam.z - 1, B * cam.z - 1);
    }
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    resize();
    const q = new URLSearchParams(location.search);
    const isDemo = q.has('demo');
    if (isDemo) M.noSave = true;
    const loaded = isDemo ? false : T.G.load();
    const s = T.G.s;
    T.audio.setOn(s.settings.sound);
    if (s.flags.color) document.body.classList.add('color');
    T.G.computeMult();
    const off = loaded ? T.G.offline() : null;
    T.G.rebuild();
    M.reindex();
    T.ui.init();
    if (loaded && (s.archs.length || s.structs.length)) M.home(); else { cam.tx = cam.x = 0; cam.ty = cam.y = 140; cam.tz = cam.z = 2; }
    clampCam(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
    if (off) setTimeout(() => T.ui.offline(off), 2400);
    if (!loaded && T.G.oldSave) setTimeout(() => T.ui.toast('새 버전이 나와서 처음부터 시작합니다. 마을을 다시 지어 볼까요?', 'big'), 2600);
    const tc = document.getElementById('titlecard');
    setTimeout(() => tc.classList.add('in'), 50);
    const hide = () => { tc.classList.add('out'); setTimeout(() => tc.remove(), 900); };
    setTimeout(hide, 2300);
    tc.addEventListener('pointerdown', hide);
    if (isDemo) demo(q);
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  // ?demo=village&era=3  or  ?demo=wild&n=6  for previewing
  function demo(q) {
    const s = T.G.s;
    const kind = q.get('demo');
    s.shards = 1e12;
    if (q.has('color') || kind === 'village') { s.flags.color = true; document.body.classList.add('color'); s.flags.l1Done = s.flags.l2Done = 1; }
    s.ms = parseInt(q.get('ms')) || (kind === 'village' ? 15 : 4);
    if (kind === 'village') {
      s.era = parseInt(q.get('era')) || 2; s.flags.l3Done = 1; s.flags.l4Done = 1; s.flags.painter = q.has('paint');
      s.clock = parseFloat(q.get('clock')) || 60;
    }
    const n = parseInt(q.get('n')) || (kind === 'village' ? 10 : 6);
    const shapes = ['square', 'triangle', 'circle', 'pentagon', 'star', 'hexagon'];
    for (let i = 0; i < n; i++) T.G.addArch(shapes[i % (kind === 'village' ? 4 : 2)], (i * 7) % 20);
    T.G.computeMult();
    // pre-build a bunch of structures instantly
    const builds = parseInt(q.get('b')) || (kind === 'village' ? 22 : 12);
    for (let i = 0; i < builds; i++) {
      const st = T.vil.startProject((Math.random() - 0.5) * 300);
      if (!st) continue;
      st.f = null; st.p = s.flags.painter ? T.st.shape(st).cells.length : 0;
    }
    if (kind === 'village') for (let i = 0; i < 4; i++) s.workers.push({ s: 'square', home: 0, name: '일꾼' + i, life: 400 });
    T.G.rebuild();
    T.ui.rebuildPanel(true);
    setTimeout(() => M.home(), 50);
  }
  addEventListener('beforeunload', () => { if (!M.noSave) T.G.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !M.noSave) T.G.save(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
