(() => {
  const pre = document.getElementById('pre'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('pre-lock');
  const MIN = reduce ? 1200 : 2100, MAX = 5000, t0 = performance.now();
  const num = document.getElementById('pre-num'), fill = document.getElementById('pre-fill'), pct = document.getElementById('pre-pct');
  let loaded = document.readyState === 'complete', closed = false;
  addEventListener('load', () => { loaded = true; });
  const close = () => {
    if (closed) return; closed = true;
    fill.style.width = '100%'; pct.textContent = '100%'; num.textContent = '▶';
    pre.classList.add('done'); root.classList.remove('pre-lock'); root.classList.add('go');
    setTimeout(() => pre.remove(), 1400);
  };
  const tick = () => {
    if (closed) return;
    const dt = performance.now() - t0, p = Math.min(dt / MIN, 1);
    const shown = loaded ? p : Math.min(p, .9);
    fill.style.width = shown * 100 + '%'; pct.textContent = Math.round(shown * 100) + '%';
    num.textContent = String(Math.max(1, 3 - Math.floor(p * 3)));
    if ((loaded && dt >= MIN) || dt >= MAX) close(); else setTimeout(tick, 80);
  };
  tick();
})();
