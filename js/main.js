'use strict';
// ─────────────────────────────────────────────────────────────
//  MAIN: 루프, 입력, 카메라, 레이어별 렌더링
//  좌클릭: 블록(격자) / 주민 쓰다듬기, 끌기 / 짓는 건축물 거들기 / 건축물 정보 / 설계도 확정 / 구역
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
  let clickCD = 0, denyFlash = 0, pending = null;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cam.dpr = dpr; cam.W = innerWidth; cam.H = innerHeight;
    cv.width = Math.round(cam.W * dpr); cv.height = Math.round(cam.H * dpr);
    cv.style.width = cam.W + 'px'; cv.style.height = cam.H + 'px';
  }
  addEventListener('resize', resize);
  // no browser context menu anywhere in the game
  document.addEventListener('contextmenu', (e) => { if (!(e.target.closest && e.target.closest('textarea, input'))) e.preventDefault(); });

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
    for (const st of T.G.s.structs) { if ((st.z || 0) !== 0) continue; const [a, b, t] = T.st.bbox(st); L = Math.min(L, a); R = Math.max(R, b); top = Math.max(top, t); }
    for (const e of T.ent.archs) { L = Math.min(L, e.x - 40); R = Math.max(R, e.x + 40); }
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

  // ── blocks ───────────────────────────────────────────────
  function snap(wx, wy) {
    const g = T.G.s.settings.gap;
    if (g === 0) return [wx, Math.max(wy, B / 2 + 1)];
    const st = B * g;
    return [Math.round((wx - B / 2) / st) * st + B / 2, Math.max(B / 2, Math.round((wy - B / 2) / st) * st + B / 2)];
  }
  const keyOf = (x, y, z = T.view()) => Math.round(x) + ',' + Math.round(y) + ',' + z;
  let occupied = new Set();
  M.reindex = () => { occupied = new Set(T.G.s.player.map((p) => keyOf(p[0], p[1], p[2] || 0))); };
  function canAct() { return clickCD <= 0; }
  function spend() { clickCD = T.G.clickCD(); T.G.s.stats.clicks++; }
  // help build: only the empty cell under the cursor gets filled
  M.cellAt = function (st, wx, wy) {
    const sh = T.st.shape(st);
    const c = Math.floor((wx - st.x) / B), r = Math.floor((wy - (st.y || 0)) / B);
    const ci = sh.blocks.findIndex((b) => b.c === c && b.r === r);
    return ci >= 0 && !st.f[ci] ? ci : -1;
  };
  function contribute(st, ci) {
    spend();
    T.st.fill(st, ci);
    const v = T.G.clickValue();
    T.G.earn(v);
    T.G.s.stats.lifeBlocks++;
    const [x, y] = T.st.cellPos(st, ci);
    T.fx.floatText(x, y + 8, '+' + T.fmt(v), false);
    T.fx.splash(x, y, T.st.tint(T.st.blockColor(st, ci), false));
    T.fx.snapRing(x, y);
    T.audio.play('fill', { y });
    return true;
  }
  function placePlayer(wx, wy, quiet) {
    const s = T.G.s;
    if (wy < -12) return false;
    const [x, y] = snap(wx, wy);
    const k = keyOf(x, y);
    if (s.settings.gap > 0 && occupied.has(k)) { if (!quiet) { denyFlash = 0.25; } return false; }
    spend();
    const v = T.G.clickValue();
    const vz = T.view();
    const p = vz ? [Math.round(x * 10) / 10, Math.round(y * 10) / 10, vz] : [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
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
  function leftClick(wx, wy, quiet) {
    const z = T.view();
    const st = T.st.hit(wx, wy, z);
    if (st && !T.st.done(st)) {
      if (st.clearing) { if (!quiet) T.ui.toast('철거가 끝나면 함께 지을 수 있어요.'); return true; }
      const ci = M.cellAt(st, wx, wy);
      if (ci < 0) { if (!quiet) T.audio.play('tapEmpty'); return true; }
      if (!canAct()) { pending = [wx, wy]; return true; }
      return contribute(st, ci);
    }
    if (st && !quiet) { T.ui.openStruct(st); T.audio.play('open'); return true; }
    if (T.G.s.settings.noPlace) return false;
    if (!canAct()) { pending = [wx, wy]; return true; }
    return placePlayer(wx, wy, quiet);
  }

  // ── input ────────────────────────────────────────────────
  let down = null, rdown = null, pinch = null;
  const ptrs = new Map();
  cv.addEventListener('pointerdown', (e) => {
    T.audio.init();
    if (observing) { M.observe(); return; }
    T.ui.closeRadial();
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.tz }; down = null; return; }
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (e.button === 2 || e.button === 1) { rdown = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, wx, button: e.button }; return; }
    if (T.st.placing) { down = { placing: true }; return; }
    if (T.vil.zoneTool && wy < 40) { T.vil.zoneDrag = [wx, wx]; down = { zone: true }; return; }
    down = { sx: e.clientX, sy: e.clientY, moved: false, ent: T.ent.pick(wx, wy), held: false };
  });
  cv.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    mouse = { sx: e.clientX, sy: e.clientY, wx, wy };
    if (T.st.placing) T.st.ghost = [wx, wy];
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (pinch.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)) / cam.tz); return; }
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
      const st = !h && T.st.hit(wx, wy, T.view());
      cv.style.cursor = T.st.placing ? 'copy' : T.vil.zoneTool ? 'ew-resize' : h ? 'grab' : st ? (T.st.done(st) ? 'help' : 'cell') : 'crosshair';
      return;
    }
    if (!down.moved && Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 5) {
      down.moved = true;
      if (down.ent) { down.held = true; T.ent.hold(down.ent); T.ui.closeCard(); cv.style.cursor = 'grabbing'; }
    }
    if (down.held) T.ent.drag(down.ent, wx, wy);
    else if (down.moved && canAct()) leftClick(wx, wy, true);
  });
  function endPtr(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    const [wx, wy] = T.s2w(e.clientX, e.clientY);
    if (rdown) {
      const r = rdown; rdown = null; cv.style.cursor = 'crosshair';
      if (!r.moved && r.button === 2) {
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
    if (d.placing) { T.st.confirm(wx, wy); return; }
    if (d.held) { T.ent.release(d.ent); return; }
    if (d.moved) return;
    if (d.ent) { T.ent.pet(d.ent); T.ui.openCard(d.ent); return; }
    T.ui.closeCard();
    leftClick(wx, wy, false);
  }
  cv.addEventListener('pointerup', endPtr);
  cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); if (down && down.held) T.ent.release(down.ent); down = null; rdown = null; pinch = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (!observing) zoomAt(e.clientX, e.clientY, Math.exp(-T.clamp(e.deltaY, -120, 120) * 0.0018)); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (!(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) && T.G.layers() > 1) {
      if (e.key === 'q' || e.key === 'Q' || e.key === 'PageUp') { M.layerBy(1); e.preventDefault(); return; }
      if (e.key === 'e' || e.key === 'E' || e.key === 'PageDown') { M.layerBy(-1); e.preventDefault(); return; }
    }
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

  // ── layers in view ───────────────────────────────────────
  let ghost = null, gctx = null;
  function ghostCtx() {
    if (!ghost || ghost.width !== cv.width || ghost.height !== cv.height) { ghost = document.createElement('canvas'); ghost.width = cv.width; ghost.height = cv.height; gctx = ghost.getContext('2d'); }
    gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, ghost.width, ghost.height);
    gctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); gctx.imageSmoothingEnabled = false;
    return gctx;
  }
  M.focusT = 0;
  M.setLayer = function (z) {
    const L = T.G.layers();
    const t = T.clamp(Math.round(z), 0, L - 1);
    if (t === M.focusT) { T.audio.play('deny'); return; }
    M.focusT = t;
    T.audio.play(t > T.focus ? 'warpIn' : 'warpOut');
    T.ui.updateLayerW();
    if (T.st.placing) T.st.ghost = null;
  };
  M.layerBy = (d) => M.setLayer(M.focusT + d);

  // ── loop ─────────────────────────────────────────────────
  let last = performance.now();
  let tickAcc = 0, saveAcc = 0, autoAcc = 0, homeAcc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.pow(0.0001, dt);
    if (M.focusT > T.G.layers() - 1) { M.focusT = T.G.layers() - 1; T.ui.updateLayerW(); }
    T.focus += (M.focusT - T.focus) * (1 - Math.pow(0.004, dt));
    if (Math.abs(M.focusT - T.focus) < 0.002) T.focus = M.focusT;
    cam.z += (cam.tz - cam.z) * k; cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
    if (observing) cam.tz = Math.max(ZMIN, cam.tz * (1 - dt * 0.01));
    let gdt = dt * (M.timeScale || 1);
    if (hitstop > 0) { hitstop -= dt; gdt = 0; }
    clickCD = Math.max(0, clickCD - dt);
    denyFlash = Math.max(0, denyFlash - dt);
    if (pending && clickCD <= 0) { const p = pending; pending = null; leftClick(p[0], p[1], true); }
    const s = T.G.s;
    if (s.era >= 1) s.clock += gdt;
    T.ent.update(gdt);
    T.fx.update(gdt);
    T.vil.updateHappiness(gdt);
    if (s.era >= 1) { T.vil.familyTick(); T.vil.growKids(gdt); T.vil.tickSky(gdt); }
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
    if (autoAcc >= 0.5) { T.G.automate(autoAcc * (M.timeScale || 1)); autoAcc = 0; }
    if (homeAcc >= 5) { homeAcc = 0; T.vil.assignHomes(); }
    if (saveAcc >= 15) { saveAcc = 0; T.G.save(); }
    render(now);
    T.fx.drawUI(dt);
    T.ui.frame();
    requestAnimationFrame(frame);
  }

  function render(now) {
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const s = T.G.s;
    const color = s.flags.color;
    const sky = T.vil.sky(now / 1000);
    const n = sky.night || 0;
    T.Z = 0;
    T.world.drawSky(ctx, color, sky);
    const L = T.G.layers();
    // layers behind the one in view get smaller and hazier; layers in front of it pass by the camera as ghosts
    for (let z = L - 1; z >= 0; z--) {
      T.Z = z;
      const d = z - T.focus;
      const front = d < -0.05;
      const g = front ? ghostCtx() : ctx;
      if (front && d < -1.6) continue;
      T.world.render(g, 'back', 0.42, z);
      T.world.render(g, 'front', 1, z);
      T.world.drawFloor(g, color, s.era, n, z);
      T.world.render(g, 'under', 1, z);
      T.vil.renderZones(g, z);
      T.st.render(g, now, z, n);
      T.ent.draw(g, z);
      if (n > 0.01) T.st.renderGlow(g, n, z);
      if (front) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = T.clamp(0.28 + d * 0.16, 0.04, 0.28); ctx.drawImage(ghost, 0, 0); ctx.restore(); }
      else if (d > 0.05) T.world.fog(ctx, color, n, T.clamp(0.16 + 0.04 * d, 0, 0.5) * T.clamp(d, 0, 1));
    }
    T.Z = T.view();
    T.fx.draw(ctx);
    if (n > 0.01) {
      ctx.fillStyle = `rgba(16,18,46,${0.28 * n})`;
      ctx.fillRect(0, 0, cam.W, cam.H);
      T.st.renderGlow(ctx, n, T.view());
      T.ent.drawSleepers(ctx, n, T.view());
    }
    if (!T.st.placing && !T.vil.zoneTool && (clickCD > 0 || denyFlash > 0)) {
      const tot = T.G.clickCD();
      ctx.strokeStyle = denyFlash > 0 ? 'rgba(200,60,60,0.8)' : color ? 'rgba(47,111,176,0.7)' : 'rgba(40,40,40,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mouse.sx + 14, mouse.sy + 14, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (denyFlash > 0 ? 1 : 1 - clickCD / tot));
      ctx.stroke();
    }
    const hov = !T.st.placing && !T.vil.zoneTool && !rdown && cam.z > 0.35 ? T.st.at(mouse.wx, mouse.wy, T.view(), true) : null;
    if (hov && !hov.clearing) {
      // the empty cell under the cursor: click fills exactly this one
      const ci = M.cellAt(hov, mouse.wx, mouse.wy);
      if (ci >= 0) {
        const [cx, cy] = T.st.cellPos(hov, ci);
        const [px, py] = T.w2s(cx - B / 2, cy + B / 2);
        const zz = cam.z * T.layerK();
        const pulse = 0.55 + Math.sin(performance.now() / 140) * 0.25;
        ctx.fillStyle = color ? `rgba(47,111,176,${0.18 * pulse})` : `rgba(40,40,40,${0.12 * pulse})`;
        ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(B * zz), Math.ceil(B * zz));
        ctx.strokeStyle = color ? `rgba(47,111,176,${pulse})` : `rgba(40,40,40,${pulse * 0.8})`;
        ctx.lineWidth = Math.max(1, Math.round(zz / 3));
        ctx.strokeRect(Math.round(px) + 0.5, Math.round(py) + 0.5, Math.ceil(B * zz) - 1, Math.ceil(B * zz) - 1);
      }
    }
    if (!hov && !s.settings.noPlace && !T.st.placing && !T.vil.zoneTool && !down && !rdown && cam.z > 0.6 && s.settings.gap > 0 && mouse.wy > 0 && !T.st.at(mouse.wx, mouse.wy, T.view())) {
      const [x, y] = snap(mouse.wx, mouse.wy);
      const [px, py] = T.w2s(x - B / 2, y + B / 2);
      ctx.strokeStyle = occupied.has(keyOf(x, y)) ? 'rgba(200,60,60,0.5)' : color ? 'rgba(47,111,176,0.45)' : 'rgba(40,40,40,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(px) + 0.5, Math.round(py) + 0.5, B * cam.z - 1, B * cam.z - 1);
    }
  }

  // ── boot ─────────────────────────────────────────────────
  function boot() {
    resize();
    const q = new URLSearchParams(location.search);
    const isDemo = q.has('demo');
    if (q.has('dev')) setTimeout(() => { T.G.s.flags.dev = true; T.ui.rebuildPanel(true); }, 0);
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
    if (loaded && (s.archs.length || s.structs.length)) M.home(); else { cam.tx = cam.x = 0; cam.ty = cam.y = 120; cam.tz = cam.z = 2.4; }
    clampCam(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
    if (off) setTimeout(() => T.ui.offline(off), 2400);
    if (!loaded && T.G.oldSave && !isDemo) setTimeout(() => T.ui.toast('아주 오래된 저장이라 처음부터 시작합니다.', 'big'), 1800);
    if (loaded && T.G.migrated && !isDemo) setTimeout(() => T.ui.toast('v4 업데이트: 저장을 그대로 옮겼습니다. 다듬기, 소리, 새 설계도 단계를 만나 보세요.', 'big'), 1800);
    const tc = document.getElementById('titlecard');
    setTimeout(() => tc.classList.add('in'), 50);
    const hide = () => { tc.classList.add('out'); setTimeout(() => tc.remove(), 900); };
    setTimeout(hide, 2300);
    tc.addEventListener('pointerdown', hide);
    if (isDemo) demo(q);
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  // ?demo=wild | village  &era=3 &res=3 &paint &layers=3 &clock=185
  function demo(q) {
    const s = T.G.s;
    const kind = q.get('demo');
    s.flags.tut = 99;
    s.shards = 1e12;
    s.resLv = parseInt(q.get('res') ?? (kind === 'village' ? 3 : 0));
    if (q.has('color') || kind === 'village') { s.flags.color = true; document.body.classList.add('color'); s.flags.l1Done = s.flags.l2Done = s.flags.l3Done = 1; }
    s.ms = parseInt(q.get('ms')) || (kind === 'village' ? 20 : 8);
    if (s.resLv > 0) s.flags.l2Done = 1;
    if (q.has('layers')) { s.flags.l5Done = 1; s.zup.layer = parseInt(q.get('layers')) - 1; }
    if (kind === 'village') { s.era = parseInt(q.get('era')) || 2; s.flags.l4Done = 1; s.flags.l5Done = 1; s.flags.l6Done = 1; s.clock = parseFloat(q.get('clock')) || 60; }
    const n = parseInt(q.get('n')) || (kind === 'village' ? 10 : 6);
    const shapes = ['square', 'triangle', 'circle', 'pentagon'];
    for (let i = 0; i < n; i++) { const e = T.G.addArch(shapes[i % (kind === 'village' ? 4 : 2)], (i * 7) % 20); e.d.z = s.zup.layer ? i % T.G.layers() : 0; }
    T.G.computeMult();
    const builds = parseInt(q.get('b')) || (kind === 'village' ? 22 : 12);
    for (let i = 0; i < builds; i++) {
      const z = s.zup.layer ? i % T.G.layers() : 0;
      const st = T.vil.startProject((Math.random() - 0.5) * 300, z);
      if (!st) continue;
      st.f = null; st.fin = 1;
      const nb = T.st.count(st);
      st.lv = new Array(nb).fill(T.st.maxLvOf(st)); st.cv = new Array(nb).fill(0);
      st.pt = st.lv.map((l) => (q.has('paint') ? T.RES[l] * T.RES[l] : 0));
    }
    if (kind === 'village') for (let i = 0; i < 4; i++) s.workers.push({ s: 'square', home: 0, name: '일꾼' + i, life: 400, z: 0 });
    T.ent.syncPets();
    T.G.rebuild();
    T.ui.rebuildPanel(true);
    setTimeout(() => M.home(), 50);
  }
  addEventListener('beforeunload', () => { if (!M.noSave) T.G.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !M.noSave) T.G.save(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
