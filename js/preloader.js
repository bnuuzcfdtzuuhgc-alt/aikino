(() => {
  const pre = document.getElementById('pre'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('pre-lock');
  let lang = 'ru';
  try { lang = localStorage.getItem('aic-lang') || (/^(ru|uk|be|kk)/i.test(navigator.language || 'ru') ? 'ru' : 'en'); } catch { /* не критично */ }
  const WORDS = lang === 'en'
    ? ['VIDEO', 'PHOTO', 'REELS', 'CAROUSELS', 'FLYERS', 'AI', 'TASTE', 'SPEED', 'CINEMA']
    : ['ВИДЕО', 'ФОТО', 'REELS', 'КАРУСЕЛИ', 'ФЛАЕРЫ', 'ИИ', 'ВКУС', 'СКОРОСТЬ', 'КИНО'];
  const MIN = reduce ? 900 : 2200, MAX = 5000, t0 = performance.now();
  const word = document.getElementById('pre-word'), num = document.getElementById('pre-num');
  const fill = document.getElementById('pre-fill'), tc = document.getElementById('pre-tc');
  let loaded = document.readyState === 'complete', closed = false, wi = 0;
  addEventListener('load', () => { loaded = true; });
  const pad = n => String(n).padStart(2, '0');
  const close = () => {
    if (closed) return; closed = true;
    fill.style.width = '100%'; num.textContent = '100'; word.textContent = 'AI CRAFTS'; word.className = 'pre-word fin';
    setTimeout(() => {
      pre.classList.add('done'); root.classList.remove('pre-lock'); root.classList.add('go');
      setTimeout(() => pre.remove(), 1400);
    }, reduce ? 0 : 320);
  };
  // быстрая смена слов: чем мы занимаемся
  const flash = () => {
    if (closed) return;
    word.textContent = WORDS[wi % WORDS.length];
    word.className = 'pre-word' + (wi % 2 ? ' o' : '');
    wi++;
  };
  const tick = () => {
    if (closed) return;
    const dt = performance.now() - t0, p = Math.min(dt / MIN, 1);
    const eased = 1 - Math.pow(1 - p, 2);
    const shown = loaded ? eased : Math.min(eased, .9);
    fill.style.width = shown * 100 + '%'; num.textContent = String(Math.round(shown * 100));
    tc.textContent = '00:' + pad(Math.floor(dt / 1000)) + ':' + pad(Math.floor((dt % 1000) / 40)) + ':00';
    if ((loaded && dt >= MIN) || dt >= MAX) close(); else setTimeout(tick, 50);
  };
  if (!reduce) { flash(); setInterval(flash, 210); } else word.textContent = WORDS[0];
  tick();
})();
