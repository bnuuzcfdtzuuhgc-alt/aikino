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
  // подписи шагов: загораются, когда соответствующий ресурс действительно готов
  const LABELS = lang === 'en'
    ? { dom: 'Markup', fonts: 'Fonts', hero: '3D scene', works: 'Works', load: 'Page' }
    : { dom: 'Разметка', fonts: 'Шрифты', hero: '3D-сцена', works: 'Работы', load: 'Страница' };
  const MIN = reduce ? 500 : 1700;   // чтобы переход не мелькал
  const MAX = 8000;                  // страховка: дольше не держим ни при каких условиях
  const t0 = performance.now();
  const num = document.getElementById('pre-num'), fill = document.getElementById('pre-fill');
  const tc = document.getElementById('pre-tc'), frame = document.getElementById('pre-frame'), stepsEl = document.getElementById('pre-steps');
  const pad = n => String(n).padStart(2, '0');
  const items = {};
  STEPS.forEach(k => { const li = document.createElement('li'); li.textContent = LABELS[k]; stepsEl.appendChild(li); items[k] = li; });

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

  let shown = 0, closed = false, lastReal = -1;
  // окно кадра растёт вместе с реальным прогрессом; у вертикального экрана свои пропорции
  const setFrame = p => {
    const tall = innerHeight > innerWidth;
    const v = tall ? 44 - 12 * p : 44 - 22 * p, h = tall ? 30 - 22 * p : 41 - 27 * p;
    frame.style.clipPath = 'inset(' + v.toFixed(2) + '% ' + h.toFixed(2) + '%)';
  };
  const close = full => {
    if (closed) return; closed = true;
    if (full) { fill.style.transform = 'scaleX(1)'; num.textContent = '100'; }
    frame.style.clipPath = '';
    pre.classList.add('done');
    setTimeout(() => { root.classList.remove('pre-lock'); root.classList.add('go'); }, reduce ? 0 : 520);
    setTimeout(() => pre.remove(), reduce ? 200 : 1200);
  };
  const tick = () => {
    if (closed) return;
    const dt = performance.now() - t0, real = got.size / STEPS.length * 100;
    if (real !== lastReal) {
      lastReal = real; setFrame(real / 100); fill.style.transform = 'scaleX(' + (real / 100).toFixed(3) + ')';
      STEPS.forEach(k => items[k].classList.toggle('ok', got.has(k)));
    }
    // число догоняет реальный прогресс и никогда его не обгоняет
    shown = Math.min(real, shown + Math.max(1.4, (real - shown) * 0.14));
    num.textContent = String(Math.round(shown));
    tc.textContent = '00:00:' + pad(Math.floor(dt / 1000) % 60) + ':' + pad(Math.floor((dt % 1000) / 40));
    if (real >= 100 && shown >= 99.5 && dt >= MIN) return close(true);
    if (dt >= MAX) return close(false);
    requestAnimationFrame(tick);
  };
  setFrame(0);
  requestAnimationFrame(tick);
  // вкладка в фоне: requestAnimationFrame там не работает, а сайт всё равно должен открыться
  setTimeout(() => { if (!closed) close(got.size === STEPS.length); }, MAX + 500);
})();
