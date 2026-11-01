'use strict';
// ─────────────────────────────────────────────────────────────
//  MOBILE: 휴대폰과 태블릿 전용 UI와 터치 조작
//  · 모바일일 때만 body.mobile(+ .phone / .tablet, .portrait / .landscape)을 붙입니다.
//    PC에는 아무 클래스도, 아무 요소도, 아무 입력 처리도 더하지 않습니다.
//  · 감지: 손가락 입력(coarse pointer)이 주 입력이고 터치가 되는 기기. URL ?mobile=1 / ?mobile=0으로 강제.
// ─────────────────────────────────────────────────────────────
(function () {
  const q = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const ua = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let mobile = touch && (coarse || ua);
  if (q.get('mobile') === '1') mobile = true;
  if (q.get('mobile') === '0') mobile = false;
  T.mobile = mobile;
  if (!mobile) { T.mobileUI = null; return; }

  const B = document.body;
  B.classList.add('mobile');
  const MU = (T.mobileUI = { sheet: 'half' });
  function classify() {
    const w = innerWidth, h = innerHeight;
    const tablet = Math.min(screen.width || w, screen.height || h) >= 600 && Math.min(w, h) >= 600;
    B.classList.toggle('tablet', tablet);
    B.classList.toggle('phone', !tablet);
    B.classList.toggle('portrait', h >= w);
    B.classList.toggle('landscape', w > h);
    // landscape keeps a side panel (like the PC layout, sized for fingers); portrait uses a bottom sheet
    MU.side = w > h;
    if (MU.side && T.cam) T.cam.cy = undefined;
    B.classList.toggle('sidepanel', MU.side);
    B.classList.toggle('sheetpanel', !MU.side);
  }
  classify();
  addEventListener('resize', classify);
  addEventListener('orientationchange', () => setTimeout(classify, 200));

  // ── haptics ───────────────────────────────────────────────
  MU.buzz = (ms = 8) => { const s = T.G && T.G.s; if (s && s.settings.haptic === false) return; if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  // ── bottom sheet ──────────────────────────────────────────
  const SNAP = { peek: 0, half: 0.5, full: 0.86 };
  function sheetHeight(k) {
    const head = document.getElementById('tabs');
    const peek = (head ? head.offsetHeight : 90) + 24;
    return k === 'peek' ? peek : Math.max(peek, Math.round(innerHeight * SNAP[k]));
  }
  MU.setSheet = function (k, quiet) {
    MU.sheet = k;
    const h = sheetHeight(k);
    document.documentElement.style.setProperty('--sheet-h', h + 'px');
    B.dataset.sheet = k;
    // the world is centred in the part of the screen above the sheet (never above the half-sheet line, so it does not jump)
    if (T.cam) T.cam.cy = MU.side ? undefined : Math.round((innerHeight - Math.min(h, sheetHeight('half'))) / 2);
    if (!quiet) MU.buzz(6);
  };
  function initSheet() {
    const panel = document.getElementById('panel');
    const grip = document.createElement('div');
    grip.className = 'm-grip';
    grip.innerHTML = '<i></i>';
    panel.insertBefore(grip, panel.firstChild);
    let drag = null;
    const start = (e) => { if (MU.side) return; drag = { y: e.clientY, h: panel.offsetHeight, t: performance.now() }; grip.setPointerCapture(e.pointerId); panel.classList.add('dragging'); };
    const move = (e) => { if (!drag) return; const h = T.clamp(drag.h + (drag.y - e.clientY), sheetHeight('peek'), innerHeight * 0.92); document.documentElement.style.setProperty('--sheet-h', h + 'px'); };
    const end = (e) => {
      if (!drag) return;
      const h = panel.offsetHeight, v = (drag.y - e.clientY) / Math.max(1, performance.now() - drag.t);
      panel.classList.remove('dragging');
      const moved = Math.abs(drag.y - e.clientY) > 6;
      drag = null;
      if (!moved) { MU.setSheet(MU.sheet === 'peek' ? 'half' : MU.sheet === 'half' ? 'full' : 'peek'); return; }
      // fling or nearest snap
      if (v > 0.6) MU.setSheet(h < innerHeight * 0.5 ? 'half' : 'full');
      else if (v < -0.6) MU.setSheet(h > innerHeight * 0.55 ? 'half' : 'peek');
      else { const ks = ['peek', 'half', 'full']; let best = 'half', bd = 1e9; for (const k of ks) { const d = Math.abs(sheetHeight(k) - h); if (d < bd) { bd = d; best = k; } } MU.setSheet(best); }
    };
    grip.addEventListener('pointerdown', start);
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    // tapping a tab while the sheet is peeking opens it
    document.getElementById('tabs').addEventListener('click', () => { if (!MU.side && MU.sheet === 'peek') MU.setSheet('half'); }, true);
    MU.setSheet('half', true);
    addEventListener('resize', () => MU.setSheet(MU.sheet, true));
  }

  // ── action rail (replaces the PC dock buttons on phones) ──
  function initRail() {
    const dock = document.getElementById('dock');
    const rail = document.createElement('div');
    rail.id = 'm-rail';
    const btn = (id, icon, tip, fn) => { const b = document.createElement('button'); b.className = 'mr-b'; b.id = id; b.innerHTML = T.icon(icon); b.setAttribute('aria-label', tip); b.addEventListener('click', (e) => { e.stopPropagation(); MU.buzz(6); fn(b); }); rail.appendChild(b); return b; };
    MU.brushBtn = btn('mr-brush', 'brush', '연속 놓기', (b) => { MU.brush = !MU.brush; b.classList.toggle('on', MU.brush); T.ui.toast(MU.brush ? '연속 놓기: 하늘을 끌면 블록을 이어서 놓습니다.' : '연속 놓기 끔: 끌면 화면이 움직입니다.'); });
    btn('mr-home', 'home', '전체 보기', () => T.main.home());
    btn('mr-menu', 'gear', '설정', () => T.ui.settings());
    btn('mr-snd', T.G.s.settings.sound ? 'note' : 'mute', '소리', (b) => { const s = T.G.s; s.settings.sound = !s.settings.sound; T.audio.setOn(s.settings.sound); b.innerHTML = T.icon(s.settings.sound ? 'note' : 'mute'); });
    document.body.appendChild(rail);
    // the PC dock keeps its gap / buy-amount / layer widgets; on mobile they move into a compact strip
    dock.classList.add('m-strip');
  }

  // ── seals: one 「리셋」 chip that opens the list ───────────
  function initSeals() {
    const seals = document.getElementById('seals');
    const chip = document.createElement('button');
    chip.id = 'm-seals';
    chip.innerHTML = `${T.icon('up')}<span>리셋</span><b></b>`;
    chip.addEventListener('click', (e) => { e.stopPropagation(); seals.classList.toggle('open'); MU.buzz(6); T.audio.play(seals.classList.contains('open') ? 'open' : 'close'); });
    document.body.appendChild(chip);
    document.addEventListener('pointerdown', (e) => { if (!seals.contains(e.target) && e.target !== chip && !chip.contains(e.target)) seals.classList.remove('open'); });
    setInterval(() => {
      const n = seals.children.length, ready = seals.querySelectorAll('.ready').length;
      chip.style.display = n ? '' : 'none';
      chip.querySelector('b').textContent = ready ? ready : '';
      chip.classList.toggle('ready', ready > 0);
    }, 400);
  }

  // ── HUD: tap the currency box to show every currency ──────
  function initHud() {
    const cur = document.getElementById('cur');
    cur.addEventListener('click', () => { cur.classList.toggle('m-open'); MU.buzz(5); });
  }

  // ── tooltips: long-press anything with a tip ─────────────
  function initTips() {
    let t = null, start = null;
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip],[data-tip-fn]');
      clearTimeout(t);
      if (!el || e.target.closest('.buy')) return;
      start = [e.clientX, e.clientY];
      t = setTimeout(() => { if (T.showTip) { T.showTip(el); MU.buzz(10); } }, 480);
    }, true);
    document.addEventListener('pointermove', (e) => { if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) clearTimeout(t); }, true);
    document.addEventListener('pointerup', () => clearTimeout(t), true);
  }

  // ── touch gestures on the world ──────────────────────────
  // tap: place / fill the nearest empty cell / pet / open a card. drag: pan (or keep placing with the brush).
  // long-press: lift a builder, or open the request menu on empty ground. two fingers: pinch to zoom and pan.
  MU.gestures = function (api) {
    const cv = document.getElementById('cv');
    const pts = new Map();
    let g = null;
    const LONG = 420, SLOP = 9;
    cv.addEventListener('pointerdown', (e) => {
      T.audio.init();
      if (api.observing()) { api.observe(); return; }
      T.ui.closeRadial();
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        clearTimeout(g && g.timer);
        const [a, b] = [...pts.values()];
        if (g && g.held) T.ent.release(g.ent);
        g = { pinch: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: api.cam.tz, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
        return;
      }
      if (pts.size > 2) return;
      const [wx, wy] = T.s2w(e.clientX, e.clientY);
      api.setMouse(e.clientX, e.clientY, wx, wy);
      if (T.st.placing) { T.st.ghost = [wx, wy]; g = { placing: true, sx: e.clientX, sy: e.clientY }; return; }
      if (T.vil.zoneTool && wy < 40) { T.vil.zoneDrag = [wx, wx]; g = { zone: true }; return; }
      const cell = api.nearestCell(wx, wy, 14 / (api.cam.z * T.layerK()));
      const ent = cell ? null : api.pickNear(wx, wy, 10 / api.cam.z);
      g = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, wx, wy, ent, cell, moved: false, held: false, long: false, t0: performance.now() };
      g.timer = setTimeout(() => {
        if (!g || g.moved || g.pinch) return;
        g.long = true;
        MU.buzz(18);
        if (g.ent) { g.held = true; T.ent.hold(g.ent); T.ui.closeCard(); }
        else T.ui.radial(T.clamp(g.sx, 90, innerWidth - 90), Math.max(110, g.sy - 110), g.wx);
      }, LONG);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (!g) return;
      if (g.pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        api.pan(mx - g.mx, my - g.my); g.mx = mx; g.my = my;
        api.zoomAt(mx, my, (g.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / g.d)) / api.cam.tz);
        return;
      }
      const [wx, wy] = T.s2w(e.clientX, e.clientY);
      api.setMouse(e.clientX, e.clientY, wx, wy);
      if (g.placing) { T.st.ghost = [wx, wy]; return; }
      if (g.zone) { T.vil.zoneDrag[1] = wx; return; }
      if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > SLOP) { g.moved = true; clearTimeout(g.timer); }
      if (g.held) { T.ent.drag(g.ent, wx, wy); return; }
      if (!g.moved) return;
      if (MU.brush && !g.long) { if (api.canAct()) api.click(wx, wy, true); return; }
      api.pan(e.clientX - g.lx, e.clientY - g.ly);
      g.lx = e.clientX; g.ly = e.clientY;
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (!g) return;
      if (g.pinch) { if (pts.size === 0) g = null; return; }
      const d = g; g = null;
      clearTimeout(d.timer);
      const [wx, wy] = T.s2w(e.clientX, e.clientY);
      if (d.zone) { T.vil.paintZone(T.vil.zoneDrag[0], T.vil.zoneDrag[1], T.vil.zoneTool); T.vil.zoneDrag = null; return; }
      if (d.placing) { T.st.ghost = [wx, wy]; MU.showPlaceBar(); return; }
      if (d.held) { T.ent.release(d.ent); return; }
      if (d.moved || d.long) return;
      if (d.ent) { T.ent.pet(d.ent); T.ui.openCard(d.ent); MU.buzz(8); return; }
      T.ui.closeCard();
      if (d.cell) { api.fillCell(d.cell.st, d.cell.i); return; }
      if (api.click(wx, wy, false)) MU.buzz(5);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (g && g.held) T.ent.release(g.ent); if (g) clearTimeout(g.timer); g = null; });
  };

  // blueprint placement: tap moves the ghost, a bar confirms or cancels
  MU.showPlaceBar = function () {
    let bar = document.getElementById('m-place');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'm-place';
      bar.innerHTML = '<span>위치를 옮기려면 다시 누르세요</span><button class="btn ghost" data-a="no">취소</button><button class="btn primary" data-a="ok">여기에 펼치기</button>';
      bar.addEventListener('click', (e) => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'ok' && T.st.ghost) { const [x, y] = T.st.ghost; T.st.confirm(x, y); MU.buzz(12); }
        else T.st.cancel();
      });
      document.body.appendChild(bar);
    }
    bar.classList.add('on');
  };
  setInterval(() => { const bar = document.getElementById('m-place'); if (bar && !T.st.placing) bar.classList.remove('on'); }, 300);

  MU.init = function () {
    initSheet();
    initRail();
    initSeals();
    initHud();
    initTips();
  };
})();
