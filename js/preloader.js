// Загрузка: быстрые слова на белом листе. Ждём только то, без чего первый экран выглядит сломанным:
// разметку, шрифты и первый кадр 3D-головы. Работы из базы и тяжёлые файлы догружаются уже на открытом сайте.
(() => {
  const pre = document.getElementById('pre'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEPS = ['dom', 'fonts', 'hero'];
  const got = new Set();
  window.PRE = { done(k) { if (STEPS.includes(k)) got.add(k); } };
  if (!pre) { root.classList.add('go'); return; }
  root.classList.add('pre-lock');

  let lang = 'ru';
  try { lang = localStorage.getItem('aic-lang') || (/^(ru|uk|be|kk)/i.test(navigator.language || 'ru') ? 'ru' : 'en'); } catch { /* не критично */ }
  // слова берём из переводов (i18n.js грузится позже, поэтому запасной список здесь же)
  const FALLBACK = lang === 'en'
    ? ['Video', 'Reels', 'Photo', 'Carousels', 'Flyers', 'Ideas', 'Script', 'Frame', 'Edit', 'Sound', 'Taste', 'Hook']
    : ['Видео', 'Reels', 'Фото', 'Карусели', 'Флаеры', 'Идеи', 'Сценарий', 'Кадр', 'Монтаж', 'Звук', 'Вкус', 'Крючок'];
  const FINAL = lang === 'en' ? 'AI CONTENT' : 'ИИ КОНТЕНТ';
  const MIN = reduce ? 300 : 1100;   // чтобы слова успели промелькнуть
  const MAX = 4000;                  // страховка: дольше не держим ни при каких условиях
  const t0 = performance.now();
  const word = document.getElementById('pre-w'), num = document.getElementById('pre-num'), fill = document.getElementById('pre-fill');

  const dom = () => window.PRE.done('dom');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dom); else dom();
  // 3D-скрипт не загрузился или WebGL думает слишком долго — не ждём его
  addEventListener('load', () => setTimeout(() => window.PRE.done('hero'), 600));
  const fontsDone = () => window.PRE.done('fonts');
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 1em Unbounded', 'ИИ AI'),
      document.fonts.load('400 1em Onest', 'Аа Aa')
    ].map(p => p.catch(() => null))).then(fontsDone);
    setTimeout(fontsDone, 1500);    // шрифт не пришёл: показываем сайт с запасным
  } else fontsDone();

  // быстрые слова: каждое ~80 мс, каждое четвёртое красное
  let wi = 0, flash = 0;
  const words = () => (window.I18N && I18N.t('pre.words')) || FALLBACK;
  const next = () => {
    const list = words(); const w = list[wi % list.length];
    word.textContent = w; word.classList.toggle('r', wi % 4 === 3); wi++;
  };
  if (!reduce) { next(); flash = setInterval(next, 80); }

  let shown = 0, closed = false;
  const close = () => {
    if (closed) return; closed = true;
    clearInterval(flash);
    num.textContent = '100'; fill.style.transform = 'scaleX(1)';
    word.textContent = FINAL; word.classList.remove('r'); word.classList.add('fin');
    setTimeout(() => {
      pre.classList.add('done');
      root.classList.remove('pre-lock'); root.classList.add('go');
    }, reduce ? 0 : 320);
    setTimeout(() => pre.remove(), reduce ? 300 : 1200);
  };
  const tick = () => {
    if (closed) return;
    const dt = performance.now() - t0;
    // число идёт и за временем, и за реальной готовностью, но не обгоняет готовность
    const real = got.size / STEPS.length * 100, byTime = Math.min(100, dt / MIN * 100);
    shown = Math.max(shown, Math.min(real, byTime));
    num.textContent = String(Math.round(shown)); fill.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')';
    if (got.size === STEPS.length && dt >= MIN) return close();
    if (dt >= MAX) return close();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // вкладка в фоне: requestAnimationFrame там не работает, а сайт всё равно должен открыться
  setTimeout(close, MAX + 300);
})();
