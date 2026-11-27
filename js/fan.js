// Главный экран на компьютере: веер вертикальных кадров с работами.
// Кадры висят в 3D и наклоняются за мышью; наведённый выезжает вперёд, клик открывает работу.
// Работы берутся из портфолио (window.AIC из site.js); пока их нет — заглушки по форматам.
(() => {
  if (!matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement, hero = document.querySelector('.hero');
  const ready = () => { if (window.PRE) window.PRE.done('hero'); };
  if (!hero) return ready();
  root.classList.add('fan-on');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (k, ...a) => (window.I18N ? I18N.t(k, ...a) : k);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fan = document.createElement('div'); fan.className = 'fan';
  const inner = document.createElement('div'); inner.className = 'fan-in';
  fan.appendChild(inner); hero.appendChild(fan);
  const N = 6;

  function render(items) {
    inner.innerHTML = '';
    items.slice(0, N).forEach((w, k, all) => {
      const n = all.length, mid = (n - 1) / 2, d = k - mid;
      const b = document.createElement(w.i != null ? 'button' : 'div');
      b.className = 'fc3' + (w.src ? '' : ' ph3');
      if (w.i != null) { b.type = 'button'; b.setAttribute('aria-label', w.title); b.addEventListener('click', () => window.AIC.open(w.i)); }
      else b.setAttribute('aria-hidden', 'true');
      b.style.setProperty('--d', d); b.style.setProperty('--k', k); b.style.setProperty('--z', Math.round(10 - Math.abs(d) * 2));
      b.innerHTML = `${w.src ? `<img src="${esc(w.src)}" alt="" loading="eager" decoding="async">` : `<span class="ph3-f">${esc(w.label)}</span>`}<span class="fc3-cap"><span class="mono">${String(k + 1).padStart(2, '0')}</span><b>${esc(w.title || '')}</b></span>`;
      inner.appendChild(b);
    });
    requestAnimationFrame(() => fan.classList.add('in'));
  }
  // заглушки, чтобы веер был сразу
  const PH = () => ['video', 'photo', 'carousel', 'flyer', 'video', 'photo'].map(t2 => ({ label: T('filter.' + t2), title: '' }));
  render(PH()); ready();
  // настоящие работы, когда site.js их загрузит
  let tries = 0;
  const poll = () => {
    const list = window.AIC && window.AIC.works ? window.AIC.works() : null;
    if (list && list.length) { fan.classList.remove('in'); setTimeout(() => render(list), reduce ? 0 : 250); return; }
    if (++tries < 40) setTimeout(poll, 150);
  };
  poll();
  if (window.I18N) I18N.onChange(() => { const list = window.AIC && window.AIC.works ? window.AIC.works() : null; render(list && list.length ? list : PH()); });

  // наклон за мышью
  if (!reduce) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      inner.style.transform = `rotateY(${(x * 7).toFixed(2)}deg) rotateX(${(-y * 5).toFixed(2)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', e => {
      tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }
  const hint = document.getElementById('cubes-hint');
  if (hint) hint.hidden = false;
})();
