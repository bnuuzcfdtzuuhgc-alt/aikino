// Секция «Остановите ленту»: телефон сам листает Reels, нужно нажать «Стоп» на красном кадре.
// Карточки создаются на лету, в ленте всегда две: текущая и следующая. Вне экрана лента стоит.
(() => {
  const $ = s => document.querySelector(s);
  const feed = $('#st-feed'), btn = $('#st-btn'), phone = $('#st-phone'), res = $('#st-res');
  if (!feed || !btn || !window.I18N) return;
  const t = (...a) => I18N.t(...a);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOVE = reduce ? 0 : 200;
  const TONES = [['#8d8d8d', '#3b3b3b'], ['#b9b9b9', '#6a6a6a'], ['#5a5a5a', '#1e1e1e'], ['#a3a3a3', '#2c2c2c'], ['#d0d0d0', '#7d7d7d'], ['#747474', '#141414']];
  const MASK = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6C19 6 11 16 11 30c0 10 3 17 7 22 4 5 9 8 14 8s10-3 14-8c4-5 7-12 7-22C53 16 45 6 32 6Z" fill="#fff"/><path d="M8 27c0-4 6-6 12-6 5 0 8 2 12 2s7-2 12-2c6 0 12 2 12 6 0 6-5 11-11 11-5 0-9-4-13-4s-8 4-13 4c-6 0-11-5-11-11Z" fill="#111"/><ellipse cx="21" cy="29" rx="4.5" ry="2.6" fill="#fff"/><ellipse cx="43" cy="29" rx="4.5" ry="2.6" fill="#fff"/></svg>';

  let running = false, visible = false, stopped = false, timer = 0, moving = false, moveAt = 0;
  let since = 0, gap = 5, shownAt = 0, tries = 0, hits = 0, best = Infinity, li = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmtK = () => { const n = Math.round(rnd(1, 99)); return Math.random() < .6 ? n + 'K' : n * 10 + ''; };
  const sec = v => t('stop.sec', I18N.lang === 'ru' ? v.toFixed(2).replace('.', ',') : v.toFixed(2));

  function card(ours, hold) {
    const c = document.createElement('div');
    c.className = 'fc' + (ours ? ' ours' : '');
    c.style.setProperty('--t', hold + 'ms');
    if (ours) {
      c.dataset.ours = '1';
      c.innerHTML = `<span class="fc-logo">${MASK}<b>AI CRAFTS</b></span><span class="fc-u mono">@aicrafts · ${t('stop.ours')}</span><i class="fc-bar"></i>`;
    } else {
      const list = t('stop.feed'), label = list[li++ % list.length];
      const [g1, g2] = TONES[Math.floor(Math.random() * TONES.length)];
      c.dataset.label = label;
      c.style.cssText += `;--g:${g1};--g2:${g2};--x:${rnd(15, 85)}%;--y:${rnd(15, 65)}%`;
      c.innerHTML = `<span class="fc-side mono"><span>♥<br>${fmtK()}</span><span>◯<br>${fmtK()}</span><span>↗</span></span><span class="fc-l"></span><span class="fc-u mono">@user_${Math.floor(rnd(1000, 9999))}</span><i class="fc-bar"></i>`;
      c.querySelector('.fc-l').textContent = label;
    }
    return c;
  }
  const holdFor = ours => ours ? Math.max(520, 780 - hits * 40) : rnd(380, 720);

  function step() {
    timer = 0;
    if (!running) return;
    since++;
    const ours = since >= gap;
    if (ours) { since = 0; gap = Math.floor(rnd(4, 8)); }
    const hold = holdFor(ours);
    const next = card(ours, hold);
    feed.appendChild(next);
    moving = true; moveAt = performance.now();
    const done = () => {
      moving = false;
      while (feed.children.length > 1) feed.firstElementChild.remove();
      feed.classList.remove('mv'); feed.style.transform = '';
      next.classList.add('on');
      shownAt = performance.now();
      if (running) timer = setTimeout(step, hold);
    };
    if (!MOVE) return done();
    feed.classList.add('mv');
    requestAnimationFrame(() => { feed.style.transform = 'translateY(-100%)'; });
    timer = setTimeout(done, MOVE);
  }

  const play = () => {
    const want = visible && !document.hidden && !stopped;
    if (want && !running) { running = true; if (!timer) timer = setTimeout(step, 350); }
    else if (!want && running) { running = false; clearTimeout(timer); timer = 0; if (moving) { feed.classList.remove('mv'); feed.style.transform = ''; while (feed.children.length > 1) feed.firstElementChild.remove(); moving = false; } }
  };

  const setNum = (id, v) => { const el = $(id); el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  const setBtn = key => { const s = btn.firstElementChild; s.dataset.i18n = key; s.textContent = t(key); btn.classList.toggle('again', key === 'stop.again'); };

  function stop() {
    // во время перелистывания засчитывается та карточка, которая уже въехала больше чем наполовину
    let cur = feed.firstElementChild;
    if (moving && performance.now() - moveAt > MOVE / 2) cur = feed.lastElementChild;
    const now = performance.now();
    if (moving) { [...feed.children].forEach(c => { if (c !== cur) c.remove(); }); feed.classList.remove('mv'); feed.style.transform = ''; moving = false; }
    stopped = true; play();
    cur && cur.classList.add('on', 'frozen');
    tries++; setNum('#st-tries', tries);
    const msg = $('#st-msg'), win = !!(cur && cur.dataset.ours);
    phone.classList.remove('win', 'miss'); void phone.offsetWidth; phone.classList.add(win ? 'win' : 'miss');
    if (win) {
      const r = Math.max(0, (now - shownAt) / 1000);
      hits++; setNum('#st-hits', hits);
      if (r < best) { best = r; setNum('#st-best', sec(best)); }
      const w = t('stop.win');
      msg.textContent = w[(hits - 1) % w.length]; msg.className = 'stop-msg win';
      res.innerHTML = `<b>${sec(r)}</b><span class="mono">${t('stop.ours')}</span>`;
      $('#st-cta').hidden = false;
    } else {
      msg.textContent = t('stop.miss', cur ? cur.dataset.label || '…' : '…'); msg.className = 'stop-msg';
      res.innerHTML = '<b>✕</b>';
    }
    res.classList.add('on');
    setBtn('stop.again');
  }
  function again() {
    res.classList.remove('on'); phone.classList.remove('win', 'miss');
    const f = feed.firstElementChild; if (f) f.classList.remove('frozen');
    stopped = false; since = Math.max(since, gap - 3); setBtn('stop.btn'); play();
  }
  const press = () => (stopped ? again() : stop());

  feed.appendChild(card(false, 600)); feed.firstElementChild.classList.add('on');
  btn.addEventListener('click', press);
  phone.addEventListener('click', press);
  addEventListener('keydown', e => {
    if (!visible || e.code !== 'Space' || e.repeat) return;
    if (e.target.closest && e.target.closest('input,textarea,select,button,a,dialog,[contenteditable]')) return;
    e.preventDefault(); press();
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; play(); }, { threshold: .35 }).observe(phone);
  else { visible = true; play(); }
  document.addEventListener('visibilitychange', play);

  // телефон чуть наклоняется за курсором
  const stage = phone.parentElement;
  if (!reduce && matchMedia('(hover: hover)').matches) {
    stage.addEventListener('pointermove', e => {
      const r = phone.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      phone.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg'); phone.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
    });
    stage.addEventListener('pointerleave', () => { phone.style.removeProperty('--ry'); phone.style.removeProperty('--rx'); });
  }
  // часы в «статус-баре»
  const clock = $('#st-clock');
  const tick = () => { const d = new Date(); clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  tick(); setInterval(tick, 30000);
})();
