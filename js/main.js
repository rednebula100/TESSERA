'use strict';
// ─────────────────────────────────────────────────────────────
//  MAIN — 루프, 입력, 카메라
// ─────────────────────────────────────────────────────────────
(function () {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const cam = T.cam;
  const B = T.B;
  const M = (T.main = { noSave: false });
  let hitstop = 0;
  let observing = false;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cam.dpr = dpr;
    cam.W = innerWidth; cam.H = innerHeight;
    cv.width = Math.round(cam.W * dpr); cv.height = Math.round(cam.H * dpr);
    cv.style.width = cam.W + 'px'; cv.style.height = cam.H + 'px';
  }
  addEventListener('resize', resize);

  // ── camera helpers ───────────────────────────────────────
  const ZMIN = 0.04, ZMAX = 6;
  function zoomAt(sx, sy, f) {
    const nz = T.clamp(cam.tz * f, ZMIN, ZMAX);
    const [wx, wy] = T.s2w(sx, sy);
    // keep world point under cursor fixed (in target space)
    cam.tx = wx - (sx - cam.W / 2) / nz;
    cam.ty = wy - (cam.H / 2 - sy) / nz;
    cam.tz = nz;
    clampCam();
  }
  function clampCam() {
    const minY = cam.H / 2 / cam.tz - 60 / cam.tz - 10;
    cam.ty = Math.max(cam.ty, minY);
    cam.tx = T.clamp(cam.tx, -20000, 20000);
    cam.ty = Math.min(cam.ty, 20000);
  }
  M.zoomBy = (f) => zoomAt(cam.W / 2 - 160, cam.H / 2, f);
  M.focus = (x, y, z) => { cam.tx = x; cam.ty = y; if (z) cam.tz = z; else cam.tz = Math.max(cam.tz, 1.6); clampCam(); };
  M.home = () => { const e = extents(); if (e.n < 30) M.focus(0, 140, 2); else fit(e); };
  M.hitstop = (t) => { hitstop = Math.max(hitstop, t); };

  function extents() {
    let mx = 120, my = 200, n = 0;
    for (const e of T.ent.archs) {
      for (let i = 0; i < e.len; i += Math.max(1, Math.floor(e.len / 400))) {
        mx = Math.max(mx, Math.abs(e.pos[i * 2]));
        my = Math.max(my, e.pos[i * 2 + 1]);
      }
      n += e.len;
    }
    for (const b of T.G.s.bps.built) { mx = Math.max(mx, Math.abs(b.x) + 200); my = Math.max(my, b.y + 260); }
    return { mx, my, n };
  }
  function fit(e) {
    const zx = (cam.W - 380) / (e.mx * 2 + 120);
    const zy = (cam.H - 160) / (e.my + 100);
    const z = T.clamp(Math.min(zx, zy), ZMIN, 3);
    cam.tz = z; cam.tx = 0 + 150 / z; cam.ty = (cam.H / 2 - 70) / z;
    clampCam();
  }
  M.observe = function () {
    observing = !observing;
    document.body.classList.toggle('observe', observing);
    if (observing) {
      T.ui.closeCard();
      const e = extents();
      const zx = (cam.W - 80) / (e.mx * 2 + 120), zy = (cam.H - 80) / (e.my + 80);
      cam.tz = T.clamp(Math.min(zx, zy), ZMIN, 3) * 1.25;
      cam.tx = 0; cam.ty = (cam.H / 2 - 40) / cam.tz;
      clampCam();
    }
  };

  // ── input ────────────────────────────────────────────────
  const ptrs = new Map();
  let down = null; // {sx, sy, moved, ent, held, cam0}
  let pinch = null;

  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); if (T.bp.placing) T.bp.cancel(); });
  cv.addEventListener('pointerdown', (e) => {
    T.audio.init();
    if (observing) { M.observe(); return; }
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.tz };
      down = null;
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    const ent = T.bp.placing ? null : T.ent.pick(wx, wy);
    down = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, ent, held: false };
  });
  cv.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (T.bp.placing) T.bp.ghostPos = [wx, wy];
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const f = (pinch.z * (d / pinch.d)) / cam.tz;
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, f);
      return;
    }
    if (!down) {
      const h = T.ent.pick(wx, wy);
      T.ent.hover = h;
      cv.style.cursor = T.bp.placing ? 'copy' : h ? 'grab' : 'crosshair';
      return;
    }
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY;
    if (!down.moved && Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 5) {
      down.moved = true;
      if (down.ent) { down.held = true; T.ent.hold(down.ent); T.ui.closeCard(); cv.style.cursor = 'grabbing'; }
      else cv.style.cursor = 'move';
    }
    if (!down.moved) return;
    if (down.held) T.ent.drag(down.ent, wx, wy);
    else {
      cam.tx -= dx / cam.tz; cam.ty += dy / cam.tz;
      cam.x -= dx / cam.z; cam.y += dy / cam.z;
      clampCam();
    }
  });
  function endPtr(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!down) return;
    const d = down; down = null;
    cv.style.cursor = 'crosshair';
    if (d.held) { T.ent.release(d.ent); return; }
    if (d.moved) return;
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (T.bp.placing) { T.bp.confirm(wx, wy); return; }
    if (d.ent) { T.ent.pet(d.ent); T.ui.openCard(d.ent); return; }
    T.ui.closeCard();
    placePlayer(wx, wy);
  }
  cv.addEventListener('pointerup', endPtr);
  cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); if (down && down.held) T.ent.release(down.ent); down = null; pinch = null; });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (observing) return;
    const f = Math.exp(-T.clamp(e.deltaY, -120, 120) * 0.0018);
    zoomAt(e.clientX, e.clientY, f);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') {
      if (observing) M.observe();
      else if (T.bp.placing) T.bp.cancel();
      else if (T.ui.modalOpen()) T.ui.closeModal();
      else T.ui.closeCard();
    } else if (e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') M.observe();
    else if (e.key === '+' || e.key === '=') M.zoomBy(1.3);
    else if (e.key === '-') M.zoomBy(1 / 1.3);
    else if (e.key === 'ArrowLeft') { cam.tx -= 80 / cam.tz; }
    else if (e.key === 'ArrowRight') { cam.tx += 80 / cam.tz; }
    else if (e.key === 'ArrowUp') { cam.ty += 80 / cam.tz; }
    else if (e.key === 'ArrowDown') { cam.ty -= 80 / cam.tz; clampCam(); }
  });

  function placePlayer(wx, wy) {
    const s = T.G.s;
    if (wy < -12) return;
    wy = Math.max(wy, B / 2 + 1);
    s.stats.clicks++;
    const v = T.G.clickValue();
    const bpHit = T.bp.playerFill(wx, wy);
    let x = wx, y = wy;
    if (bpHit) { x = bpHit[0]; y = bpHit[1]; }
    else {
      const painted = false;
      T.world.drawBlock(x, y, painted ? '#000' : T.G.playerColor(), false);
      if (s.player.length < 30000) s.player.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    T.G.earn(v);
    s.stats.lifeBlocks++;
    T.fx.floatText(x, y + 8, '+' + T.fmt(v), false);
    T.fx.splash(x, y, T.G.playerColor());
    T.audio.place(y);
    T.ent.notifyPlayerBlock(x, y);
  }

  // ── loop ─────────────────────────────────────────────────
  let last = performance.now();
  let tickAcc = 0, saveAcc = 0, autoAcc = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // camera smoothing
    const k = 1 - Math.pow(0.0001, dt);
    cam.z += (cam.tz - cam.z) * k;
    cam.x += (cam.tx - cam.x) * k;
    cam.y += (cam.ty - cam.y) * k;
    if (observing) { cam.tz = Math.max(ZMIN, cam.tz * (1 - dt * 0.012)); cam.tx = Math.sin(now / 9000) * 40 / cam.tz; }

    let gdt = dt;
    if (hitstop > 0) { hitstop -= dt; gdt = 0; }
    T.ent.update(gdt);
    T.fx.update(gdt);
    T.G.s.stats.played += dt;

    tickAcc += dt; saveAcc += dt; autoAcc += dt;
    if (tickAcc >= 0.25) {
      T.G.computeMult();
      const inst = T.G._acc / tickAcc;
      T.G._acc = 0;
      T.G.rate += (inst - T.G.rate) * (1 - Math.exp(-tickAcc / 4));
      tickAcc = 0;
      T.ui.tick();
    }
    if (autoAcc >= 0.5) { autoAcc = 0; autos(); }
    if (saveAcc >= 15) { saveAcc = 0; T.G.save(); }

    render(now);
    T.ui.frame();
    requestAnimationFrame(frame);
  }

  function autos() {
    const s = T.G.s;
    if (s.vup.auto && s.flags.autoHire && !T.fx.busy) {
      for (let i = 0; i < 4; i++) {
        let best = null, bc = Infinity;
        for (const sh of T.SHAPES) {
          if (!T.G.shapeUnlocked(sh.id)) continue;
          const c = T.G.hireCost(sh.id);
          if (c < bc) { bc = c; best = sh.id; }
        }
        if (!best || s.shards < bc) break;
        T.G.hire(best);
      }
    }
    if (s.pup.autoL1 && s.flags.autoL1 && !T.fx.busy && T.G.canReset(1)) {
      const g = T.G.L[1].gain(s);
      if (g >= Math.max(1, s.vertices)) {
        T.G.applyReset(1);
        T.ui.rebuildPanel();
        T.ui.toast(`자동 재구성 · 꼭짓점 +${T.fmt(g)}`);
      }
    }
  }

  function render(now) {
    const dpr = cam.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const color = T.G.s.flags.color;
    T.world.drawSky(ctx, color);
    T.world.render(ctx);
    T.world.drawFloor(ctx, color);
    T.bp.render(ctx, now);
    T.ent.draw(ctx);
    T.fx.draw(ctx);
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    resize();
    const isDemo = new URLSearchParams(location.search).has('demo');
    if (isDemo) M.noSave = true;
    const loaded = isDemo ? false : T.G.load();
    const s = T.G.s;
    T.audio.setOn(s.settings.sound);
    if (s.flags.color) document.body.classList.add('color');
    T.G.computeMult();
    const off = loaded ? T.G.offline() : null;
    T.G.rebuild();
    T.ui.init();
    if (loaded && s.archs.length) M.home(); else { cam.tx = cam.x = 0; cam.ty = cam.y = 140; cam.tz = cam.z = 2; }
    clampCam(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
    if (off) setTimeout(() => T.ui.offline(off), 2400);
    // title card
    const tc = document.getElementById('titlecard');
    setTimeout(() => tc.classList.add('in'), 50);
    const hide = () => { tc.classList.add('out'); setTimeout(() => tc.remove(), 900); };
    setTimeout(hide, 2300);
    tc.addEventListener('pointerdown', hide);
    // debug: ?demo=N spawns N architects with blocks for viewing at scale
    const q = new URLSearchParams(location.search);
    if (q.has('demo')) demo(parseInt(q.get('demo')) || 60, q.has('color'));
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  function demo(n, color) {
    M.noSave = true;
    const s = T.G.s;
    if (color) { s.flags.color = true; document.body.classList.add('color'); s.flags.l2Done = 1; s.flags.l1Done = 1; s.pup.u_star = 1; s.pup.u_hexagon = 1; }
    s.vup.u_triangle = s.vup.u_circle = s.vup.u_pentagon = 1;
    const shapes = color ? ['square', 'triangle', 'circle', 'pentagon', 'star', 'hexagon'] : ['square', 'triangle', 'circle', 'pentagon'];
    const per = parseInt(new URLSearchParams(location.search).get('blocks')) || 1500;
    for (let i = 0; i < n; i++) {
      const d = { s: shapes[i % shapes.length], o: Math.floor(i / shapes.length), lvl: (i * 7) % 30, n: per, p: 0, name: '데모' };
      s.archs.push(d);
    }
    if (new URLSearchParams(location.search).has('paint')) { s.flags.painter = true; s.flags.l3Done = 1; for (const d of s.archs) d.p = Math.floor(per * 0.6); }
    s.shards = 1e9;
    T.G.computeMult();
    T.G.rebuild();
    T.ui.rebuildPanel();
    M.home();
  }
  addEventListener('beforeunload', () => { if (!M.noSave) T.G.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !M.noSave) T.G.save(); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
