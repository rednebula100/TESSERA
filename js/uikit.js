'use strict';
// ─────────────────────────────────────────────────────────────
//  UIKIT: 고유 툴팁(data-tip), 픽셀 스크롤바(모든 브라우저에서 같은 모양)
// ─────────────────────────────────────────────────────────────
(function () {
  // ── tooltip ──────────────────────────────────────────────
  // any element with data-tip="html" (or data-tip-fn="key" → T.tipFns[key](el)) gets a pixel tooltip
  T.tipFns = {};
  let tipEl = null, cur = null, timer = null;
  function el() {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.id = 'ptip'; tipEl.innerHTML = '<div class="pt-body"></div><i class="pt-arrow"></i>'; document.body.appendChild(tipEl); }
    return tipEl;
  }
  function content(t) {
    const fn = t.getAttribute('data-tip-fn');
    if (fn && T.tipFns[fn]) return T.tipFns[fn](t);
    return t.getAttribute('data-tip');
  }
  function place(t) {
    const box = el();
    const html = content(t);
    if (!html) { hide(); return; }
    box.querySelector('.pt-body').innerHTML = html;
    box.className = '';
    const r = t.getBoundingClientRect();
    box.style.left = '0px'; box.style.top = '0px';
    const w = box.offsetWidth, h = box.offsetHeight;
    let x = Math.round(r.left + r.width / 2 - w / 2), y = Math.round(r.top - h - 10), below = false;
    if (y < 6) { y = Math.round(r.bottom + 10); below = true; }
    x = Math.max(6, Math.min(innerWidth - w - 6, x));
    box.style.left = x + 'px'; box.style.top = y + 'px';
    const ax = Math.max(8, Math.min(w - 14, Math.round(r.left + r.width / 2 - x - 3)));
    box.querySelector('.pt-arrow').style.left = ax + 'px';
    box.classList.toggle('below', below);
    void box.offsetWidth;
    box.classList.add('on');
  }
  function hide() { clearTimeout(timer); timer = null; cur = null; if (tipEl) tipEl.classList.remove('on'); }
  T.hideTip = hide;
  T.showTip = (t) => { cur = t; place(t); };
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest && e.target.closest('[data-tip],[data-tip-fn]');
    if (t === cur) return;
    hide();
    if (!t) return;
    cur = t;
    timer = setTimeout(() => { if (cur === t && document.body.contains(t)) place(t); }, 260);
  });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('wheel', () => { if (tipEl && tipEl.classList.contains('on')) hide(); }, { passive: true, capture: true });
  // refresh a visible tooltip whose content changes (costs, timers)
  setInterval(() => { if (cur && tipEl && tipEl.classList.contains('on') && cur.hasAttribute('data-tip-fn')) { if (!document.body.contains(cur)) hide(); else tipEl.querySelector('.pt-body').innerHTML = content(cur) || ''; } }, 500);

  // ── pixel scrollbar ──────────────────────────────────────
  // native scrollbars are hidden on these hosts; a stepped pixel track and thumb are drawn beside them
  function attach(host) {
    if (host._pxs) return;
    const parent = host.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    host.classList.add('pxs-host');
    const bar = document.createElement('div'); bar.className = 'pxs-bar';
    bar.innerHTML = '<i class="pxs-track"></i><b class="pxs-thumb"><i></i><i></i><i></i></b>';
    parent.appendChild(bar);
    const thumb = bar.querySelector('.pxs-thumb');
    const st = { host, bar, thumb, drag: null };
    host._pxs = st;
    const update = () => {
      if (!document.body.contains(host)) { bar.remove(); return; }
      const ch = host.clientHeight, sh = host.scrollHeight;
      const show = sh > ch + 2 && ch > 30;
      bar.style.display = show ? '' : 'none';
      if (!show) return;
      bar.style.top = host.offsetTop + 3 + 'px';
      bar.style.left = host.offsetLeft + host.offsetWidth - 13 + 'px';
      bar.style.height = ch - 6 + 'px';
      const bh = ch - 6;
      const th = Math.max(26, Math.round((bh * ch) / sh));
      const top = Math.round(((bh - th) * host.scrollTop) / Math.max(1, sh - ch));
      thumb.style.height = th + 'px';
      thumb.style.transform = `translateY(${top}px)`;
    };
    st.update = update;
    host.addEventListener('scroll', () => { update(); bar.classList.add('active'); clearTimeout(st.t); st.t = setTimeout(() => bar.classList.remove('active'), 700); }, { passive: true });
    if (window.ResizeObserver) { const ro = new ResizeObserver(update); ro.observe(host); }
    new MutationObserver(() => requestAnimationFrame(update)).observe(host, { childList: true, subtree: true });
    thumb.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      thumb.setPointerCapture(e.pointerId);
      st.drag = { y: e.clientY, top: host.scrollTop };
      bar.classList.add('drag');
    });
    thumb.addEventListener('pointermove', (e) => {
      if (!st.drag) return;
      const bh = host.clientHeight - 6, th = thumb.offsetHeight;
      const k = (host.scrollHeight - host.clientHeight) / Math.max(1, bh - th);
      host.scrollTop = st.drag.top + (e.clientY - st.drag.y) * k;
    });
    const end = () => { st.drag = null; bar.classList.remove('drag'); };
    thumb.addEventListener('pointerup', end); thumb.addEventListener('lostpointercapture', end);
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.pxs-thumb')) return;
      const r = thumb.getBoundingClientRect();
      host.scrollBy({ top: (e.clientY < r.top ? -1 : 1) * host.clientHeight * 0.85, behavior: 'smooth' });
    });
    bar.addEventListener('wheel', (e) => { host.scrollTop += e.deltaY; e.preventDefault(); }, { passive: false });
    update();
  }
  T.pxScroll = attach;
  // watch for new scroll hosts (#tabbody and anything with .px-scroll)
  function scan(root) {
    const list = [];
    if (root.matches && (root.matches('.px-scroll') || root.id === 'tabbody')) list.push(root);
    if (root.querySelectorAll) list.push(...root.querySelectorAll('.px-scroll, #tabbody'));
    for (const h of list) attach(h);
  }
  const boot = () => {
    scan(document.body);
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); }).observe(document.body, { childList: true, subtree: true });
    addEventListener('resize', () => document.querySelectorAll('.pxs-host').forEach((h) => h._pxs && h._pxs.update()));
  };
  if (document.body) boot(); else addEventListener('DOMContentLoaded', boot);
})();
