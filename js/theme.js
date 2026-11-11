// Тема сайта: светлая по умолчанию, выбор посетителя запоминается.
// Подключается в <head> без defer, чтобы страница сразу рисовалась в нужной теме.
(() => {
  const KEY = 'aic-theme', root = document.documentElement;
  const COLORS = { light: '#ebe9e3', dark: '#0e0e0d' };
  let theme = 'light';
  try { if (localStorage.getItem(KEY) === 'dark') theme = 'dark'; } catch { /* не критично */ }
  const paint = () => {
    root.dataset.theme = theme;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', COLORS[theme]);
    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.setAttribute('aria-pressed', String(theme === 'dark')));
  };
  const set = next => { theme = next === 'dark' ? 'dark' : 'light'; try { localStorage.setItem(KEY, theme); } catch { /* не критично */ } paint(); };
  paint();
  document.addEventListener('DOMContentLoaded', paint);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-toggle]'); if (!b) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || calm) return set(next);
    // новая тема раскрывается кругом из точки нажатия
    const r = b.getBoundingClientRect();
    root.style.setProperty('--tx', (r.left + r.width / 2) + 'px'); root.style.setProperty('--ty', (r.top + r.height / 2) + 'px');
    root.classList.add('theme-vt');
    const done = () => root.classList.remove('theme-vt');
    try { document.startViewTransition(() => set(next)).finished.then(done, done); } catch { done(); set(next); }
  });
  window.THEME = { get: () => theme, set };
})();
