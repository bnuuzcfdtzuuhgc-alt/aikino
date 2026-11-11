// Фирменная загрузка. Процент считается по реальной готовности критических ресурсов:
// разметка, шрифты, 3D-сцена, список работ, полная загрузка страницы.
(() => {
  const pre = document.getElementById('pre'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEPS = ['dom', 'fonts', 'hero', 'works', 'load'];
  const got = new Set();
  window.PRE = { done(k) { if (STEPS.includes(k)) got.add(k); } };
  if (!pre) { root.classList.add('go'); return; }
  root.classList.add('pre-lock');

  let lang = 'ru';
  try { lang = localStorage.getItem('aic-lang') || (/^(ru|uk|be|kk)/i.test(navigator.language || 'ru') ? 'ru' : 'en'); } catch { /* не критично */ }
  const WORDS = lang === 'en'
    ? ['VIDEO', 'PHOTO', 'REELS', 'CAROUSELS', 'FLYERS', 'AI', 'TASTE', 'SPEED']
    : ['ВИДЕО', 'ФОТО', 'REELS', 'КАРУСЕЛИ', 'ФЛАЕРЫ', 'ИИ', 'ВКУС', 'СКОРОСТЬ'];
  const MIN = reduce ? 500 : 1700;   // чтобы переход не мелькал
  const MAX = 8000;                  // страховка: дольше не держим ни при каких условиях
  const t0 = performance.now();
  const word = document.getElementById('pre-word'), num = document.getElementById('pre-num');
  const fill = document.getElementById('pre-fill'), tc = document.getElementById('pre-tc');
  const pad = n => String(n).padStart(2, '0');

  const dom = () => window.PRE.done('dom');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dom); else dom();
  const loaded = () => {
    window.PRE.done('load');
    // если сцена или список работ не отчитались (скрипт не загрузился), не ждём их бесконечно
    setTimeout(() => { window.PRE.done('hero'); window.PRE.done('works'); }, 1500);
  };
  if (document.readyState === 'complete') loaded(); else addEventListener('load', loaded);
  const fontsDone = () => window.PRE.done('fonts');
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 1em Unbounded', 'ИИ AI'),
      document.fonts.load('400 1em Onest', 'Аа Aa'),
      document.fonts.load('400 1em "JetBrains Mono"', 'Аа Aa')
    ].map(p => p.catch(() => null))).then(fontsDone);
    setTimeout(fontsDone, 3500);    // шрифт не пришёл: показываем сайт с запасным
  } else fontsDone();

  let shown = 0, closed = false, wi = 0, flashT = 0;
  const close = full => {
    if (closed) return; closed = true;
    clearInterval(flashT);
    if (full) { fill.style.transform = 'scaleX(1)'; num.textContent = '100'; }
    word.textContent = 'AI CRAFTS'; word.className = 'pre-word fin';
    setTimeout(() => {
      pre.classList.add('done'); root.classList.remove('pre-lock'); root.classList.add('go');
      setTimeout(() => pre.remove(), 1300);
    }, reduce ? 0 : 380);
  };
  const flash = () => { word.textContent = WORDS[wi % WORDS.length]; word.className = 'pre-word' + (wi % 2 ? ' o' : ''); wi++; };
  const tick = () => {
    if (closed) return;
    const dt = performance.now() - t0, real = got.size / STEPS.length * 100;
    // число догоняет реальный прогресс и никогда его не обгоняет
    shown = Math.min(real, shown + Math.max(1.2, (real - shown) * 0.16));
    fill.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')'; num.textContent = String(Math.round(shown));
    tc.textContent = '00:00:' + pad(Math.floor(dt / 1000) % 60) + ':' + pad(Math.floor((dt % 1000) / 40));
    if (real >= 100 && shown >= 99.5 && dt >= MIN) return close(true);
    if (dt >= MAX) return close(false);
    requestAnimationFrame(tick);
  };
  if (!reduce) { flash(); flashT = setInterval(flash, 190); } else word.textContent = 'AI CRAFTS';
  requestAnimationFrame(tick);
  // вкладка в фоне: requestAnimationFrame там не работает, а сайт всё равно должен открыться
  setTimeout(() => { if (!closed) close(got.size === STEPS.length); }, MAX + 500);
})();
