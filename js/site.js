(async () => {
  const C = window.SITE_CONFIG || {};
  const CONFIG = {
    ENDPOINT: C.ENDPOINT || '',
    TELEGRAM: C.TELEGRAM || '',
    INSTAGRAM: C.INSTAGRAM || '',
    EMAIL: C.EMAIL || '',
    PRIVACY_URL: C.PRIVACY_URL || '',
    REEL: C.REEL || { src: '', poster: '' }
  };
  // демо-работы: показываются, пока в базе пусто
  let WORKS = [
    { id:'A001_C001', type:'video',    title:'Рекламный ролик', en:'Promo video',        ratio:[16,9],     h:18,  src:'', poster:'' },
    { id:'A001_C002', type:'photo',    title:'Предметная съёмка', en:'Product shoot',      ratio:[4,5],      h:200, src:'' },
    { id:'A001_C003', type:'carousel', title:'Карусель для Instagram', en:'Instagram carousel', ratio:[4,5],      h:160, slides:5, slidesSrc:[] },
    { id:'A001_C004', type:'flyer',    title:'Флаер для события', en:'Event flyer',      ratio:[1000,1414],h:28,  src:'' },
    { id:'A001_C005', type:'video',    title:'Вертикальное видео', en:'Vertical video',     ratio:[9,16],     h:330, src:'', poster:'' },
    { id:'A001_C006', type:'photo',    title:'Портрет', en:'Portrait',                ratio:[3,2],      h:35,  src:'' },
    { id:'A001_C007', type:'flyer',    title:'Афиша', en:'Poster',                  ratio:[1000,1414],h:260, src:'' },
    { id:'A001_C008', type:'carousel', title:'Серия слайдов', en:'Slide series',          ratio:[4,5],      h:100, slides:6, slidesSrc:[] },
    { id:'A001_C009', type:'video',    title:'Видеоклип', en:'Music video',              ratio:[16,9],     h:285, src:'', poster:'' },
    { id:'A001_C010', type:'photo',    title:'Репортаж', en:'Reportage',               ratio:[1,1],      h:210, src:'' },
    { id:'A001_C011', type:'flyer',    title:'Листовка', en:'Leaflet',               ratio:[1000,1414],h:50,  src:'' },
    { id:'A001_C012', type:'photo',    title:'Интерьер', en:'Interior',               ratio:[3,2],      h:180, src:'' }
  ];

  const t = (...a) => I18N.t(...a);
  const TYPES = new Proxy({}, { get: (_, k) => t('type.' + k) });
  const wt = w => (I18N.lang === 'en' && w.en) || w.title;
  const ICON = {
    video:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><circle cx="24" cy="24" r="20"/><path d="M20 16l14 8-14 8z" fill="currentColor"/></svg>',
    photo:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="7"/><path d="M24 5v12M41 14l-10 6M41 34l-10-6M24 43V31M7 34l10-6M7 14l10 6"/></svg>',
    carousel:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="8" width="24" height="32"/><path d="M6 14v20M42 14v20"/></svg>',
    flyer:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5h24v38H12z"/><path d="M18 14h12M18 21h12M18 28h7"/></svg>'
  };
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rn = w => w.ratio[0] / w.ratio[1];
  const ph = (w, label) => `<span class="ph" style="--h:${w.h == null ? 200 : w.h}"><span class="ph-grain"></span><span class="ph-tag" data-i18n="ph.tag">${t('ph.tag')}</span><span class="ph-ico">${ICON[w.type]}</span><span class="ph-id">${esc(label || w.id)}</span></span>`;
  const thumbSrc = w => w.type === 'video' ? w.poster : w.type === 'carousel' ? (w.slidesSrc && w.slidesSrc[0]) : w.src;
  const thumb = w => { const s = thumbSrc(w); return s ? `<img src="${esc(s)}" alt="${esc(w.alt || wt(w))}" loading="lazy">` : ph(w); };

  // hero: reel + timecode + wordmark fit
  const reel = $('#reel');
  if (CONFIG.REEL.src) {
    reel.insertAdjacentHTML('afterbegin', `<video controls playsinline preload="metadata" ${CONFIG.REEL.poster ? `poster="${esc(CONFIG.REEL.poster)}"` : ''} src="${esc(CONFIG.REEL.src)}"></video>`);
  } else {
    reel.insertAdjacentHTML('afterbegin', ph({type:'video', h:200}, 'REEL_001') );
    reel.insertAdjacentHTML('beforeend', '<figcaption class="reel-cap mono"><span data-i18n="reel.cap"></span><span data-i18n="reel.soon"></span></figcaption>');
    I18N.apply(reel);
  }
  const tc = $('#tc');
  if (!reduce) {
    const t0 = performance.now(); let last = -1;
    const pad = n => String(n).padStart(2, '0');
    const tick = now => {
      const f = Math.floor((now - t0) / 40);
      if (f !== last) { last = f; tc.textContent = `${pad(Math.floor(f / 90000) % 100)}:${pad(Math.floor(f / 1500) % 60)}:${pad(Math.floor(f / 25) % 60)}:${pad(f % 25)}`; }
      if (!document.hidden) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(tick); });
  }
  const wm = $('#wm');

  // анимации: только если пользователь не просил уменьшить движение
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const buildWordmark = () => {
    const word = wm.firstElementChild, text = t('hero.wm');
    if (!motion) { word.textContent = text; return; }
    word.setAttribute('aria-hidden', 'true');
    word.removeAttribute('data-i18n');
    word.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'wl'; s.style.setProperty('--i', i); s.textContent = ch === ' ' ? '\u00a0' : ch;
      word.appendChild(s);
    });
  };
  if (motion) { html.classList.add('anim'); setTimeout(() => html.classList.add('go'), 7000); }
  buildWordmark();
  if (motion) {
    html.classList.add('stack');
    document.querySelectorAll('.step').forEach((s, i) => s.style.setProperty('--n', i));
    let sy = 0, ticking = false;
    addEventListener('scroll', () => {
      sy = Math.min(scrollY, 1200);
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { html.style.setProperty('--sy', sy); ticking = false; });
    }, { passive: true });
  }
  const fit = () => {
    const s = wm.firstElementChild; wm.style.fontSize = '100px';
    const w = s.getBoundingClientRect().width, box = wm.clientWidth;
    if (w > 0 && box > 0) wm.style.fontSize = Math.min(box / w * 100, 340) + 'px';
  };
  let fitRaf; addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); });
  fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  // подключение config.js и Supabase: работы из базы заменяют заглушки
  const SB = (C.SUPABASE_URL || '').replace(/\/$/, ''), SK = C.SUPABASE_ANON_KEY || '';
  if (SB && SK) {
    try {
      const r = await fetch(`${SB}/rest/v1/works?select=*&published=eq.true&order=sort.asc,created_at.desc`, { headers: { apikey: SK } });
      const rows = r.ok ? await r.json() : [];
      if (Array.isArray(rows) && rows.length) {
        WORKS = rows.map((x, i) => ({
          id: 'A001_C' + String(i + 1).padStart(3, '0'), type: x.type, title: x.title, alt: x.description || '',
          ratio: [x.ratio_w || 4, x.ratio_h || 5], h: 200,
          src: x.file_url || '', poster: x.poster_url || '',
          slidesSrc: Array.isArray(x.slides) ? x.slides : [], slides: (x.slides || []).length
        }));
      }
    } catch { /* остаются заглушки */ }
  }

  // сайты из Supabase: секция появляется, когда есть хотя бы один
  async function loadSites() {
    if (!SB || !SK) return;
    try {
      const r = await fetch(`${SB}/rest/v1/sites?select=*&published=eq.true&order=sort.asc,created_at.desc`, { headers: { apikey: SK } });
      const rows = r.ok ? await r.json() : [];
      if (!Array.isArray(rows) || !rows.length) return;
      const list = $('#sites-list');
      rows.forEach(x => {
        let href = '';
        try { const u = new URL(x.url); if (/^https?:$/.test(u.protocol)) href = u.href; } catch { /* не критично */ }
        const li = document.createElement('li');
        const a = document.createElement(href ? 'a' : 'div');
        a.className = 'site';
        if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        const shot = document.createElement('div'); shot.className = 'site-shot';
        if (x.shot_url) { const im = document.createElement('img'); im.src = x.shot_url; im.alt = x.title; im.loading = 'lazy'; shot.appendChild(im); }
        const body = document.createElement('div'); body.className = 'site-body';
        const ttl = document.createElement('span'); ttl.className = 'site-title'; ttl.textContent = x.title;
        body.appendChild(ttl);
        if (x.description) { const d = document.createElement('span'); d.className = 'site-desc'; d.textContent = x.description; body.appendChild(d); }
        if (href) { const g = document.createElement('span'); g.className = 'site-go'; g.dataset.i18n = 'sites.open'; g.textContent = t('sites.open'); body.appendChild(g); }
        a.append(shot, body); li.appendChild(a); list.appendChild(li);
      });
      $('#sites').hidden = false;
      document.querySelectorAll('[data-sites]').forEach(e => { e.hidden = false; });
    } catch { /* секция остаётся скрытой */ }
  }
  loadSites();

  // шоурил: из config.js или из админки (Supabase Storage)
  async function setReel() {
    if (reel.querySelector('video')) return;
    let src = CONFIG.REEL.src, poster = CONFIG.REEL.poster;
    if (!src && SB) {
      const base = `${SB}/storage/v1/object/public/portfolio/reel/`, v = Math.floor(Date.now() / 300000);
      try {
        const h = await fetch(base + 'reel.mp4', { method: 'HEAD' });
        if (h.ok) {
          src = base + 'reel.mp4?v=' + v;
          try { const p = await fetch(base + 'poster.webp', { method: 'HEAD' }); if (p.ok) poster = base + 'poster.webp?v=' + v; } catch { /* не критично */ }
        }
      } catch { /* не критично */ }
    }
    if (!src) return;
    reel.querySelectorAll('.ph, .reel-cap').forEach(n => n.remove());
    reel.insertAdjacentHTML('afterbegin', `<video controls playsinline preload="metadata" ${poster ? `poster="${esc(poster)}"` : ''} src="${esc(src)}"></video>`);
  }
  setReel();

  // works grid + filters
  const list = $('#works-list'), filtersEl = $('#filters');
  let filter = 'all';
  const renderWorks = () => {
    list.innerHTML = WORKS.map((w, i) => `<li data-type="${w.type}"><button class="work" type="button" data-i="${i}" aria-label="${esc(t('works.open', wt(w), TYPES[w.type]))}"><span class="frame" style="--r:${w.ratio[0]}/${w.ratio[1]}">${thumb(w)}</span><span class="cap mono"><b>${esc(wt(w))}</b><span>${TYPES[w.type]}</span></span></button></li>`).join('');
  };
  renderWorks();
  if (motion && 'IntersectionObserver' in window) {
    html.classList.add('rv');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    list.querySelectorAll('li').forEach((li, i) => { li.style.setProperty('--d', (i % 3) * 90 + 'ms'); io.observe(li); });
  }
  const counts = { all: WORKS.length }; WORKS.forEach(w => counts[w.type] = (counts[w.type] || 0) + 1);
  const FILTERS = ['all', 'video', 'photo', 'carousel', 'flyer'];
  const renderFilters = () => {
    filtersEl.innerHTML = FILTERS.filter(f => counts[f]).map(f => `<button type="button" data-f="${f}" aria-pressed="${f === filter}">${t('filter.' + f)}<span class="n">${counts[f]}</span></button>`).join('');
  };
  renderFilters();
  const countEl = $('#works-count');
  function setFilter(f) {
    filter = f;
    filtersEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    list.querySelectorAll('li').forEach(li => { li.hidden = !(f === 'all' || li.dataset.type === f); });
    countEl.textContent = t('works.count', f === 'all' ? WORKS.length : counts[f], f === 'all');
  }
  filtersEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.f); });
  $('#fmt-list').addEventListener('click', e => { const a = e.target.closest('a[data-filter]'); if (a) setFilter(a.dataset.filter); });
  setFilter('all');

  // lightbox
  const lb = $('#lb'), stage = $('#lb-stage'), root = document.documentElement;
  let cur = -1, opener = null;
  const visible = () => WORKS.map((w, i) => i).filter(i => filter === 'all' || WORKS[i].type === filter);
  function stageHTML(w) {
    const r = `style="--rn:${rn(w)}"`;
    if (w.type === 'carousel') {
      const n = (w.slidesSrc && w.slidesSrc.length) || w.slides || 5;
      let s = '';
      for (let k = 0; k < n; k++) s += `<div class="slide" role="group" aria-roledescription="${t('slide.role')}" aria-label="${t('slide.label', k + 1, n)}">${(w.slidesSrc && w.slidesSrc[k]) ? `<img src="${esc(w.slidesSrc[k])}" alt="${esc(t('slide.alt', wt(w), k + 1))}">` : ph(w, `SLIDE ${k + 1}/${n}`)}</div>`;
      return `<div class="lbf" ${r}><div class="track" tabindex="0" aria-label="${t('slides.aria')}">${s}</div><button class="ib sl-btn sl-prev" type="button" aria-label="${t('sl.prev')}">‹</button><button class="ib sl-btn sl-next" type="button" aria-label="${t('sl.next')}">›</button><div class="dots" aria-hidden="true">${'<i></i>'.repeat(n)}</div></div>`;
    }
    if (w.type === 'video' && w.src) return `<div class="lbf" ${r}><video controls playsinline autoplay ${w.poster ? `poster="${esc(w.poster)}"` : ''} src="${esc(w.src)}"></video></div>`;
    if (w.type !== 'video' && w.src) return `<div class="lbf" ${r}><img src="${esc(w.src)}" alt="${esc(w.alt || wt(w))}"></div>`;
    return `<div class="lbf" ${r}>${ph(w)}</div>`;
  }
  function wireCarousel() {
    const tr = $('.track', stage); if (!tr) return;
    const dots = [...stage.querySelectorAll('.dots i')];
    const upd = () => { const k = Math.round(tr.scrollLeft / tr.clientWidth); dots.forEach((d, j) => d.setAttribute('aria-current', String(j === k))); };
    tr.addEventListener('scroll', upd, { passive: true }); upd();
    const go = d => tr.scrollBy({ left: d * tr.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    $('.sl-prev', stage).onclick = () => go(-1); $('.sl-next', stage).onclick = () => go(1);
  }
  function show(i) {
    cur = i; const w = WORKS[i], v = visible(), pos = v.indexOf(i) + 1;
    stage.innerHTML = stageHTML(w); wireCarousel();
    $('#lb-meta').textContent = `${w.id} · ${TYPES[w.type]} · ${pos}/${v.length}`;
    $('#lb-title').textContent = wt(w);
  }
  function open(i, btn) { opener = btn; show(i); if (!lb.open) { lb.showModal(); root.classList.add('lock'); } }
  function step(d) { const v = visible(); if (!v.length) return; show(v[(v.indexOf(cur) + d + v.length) % v.length]); }
  list.addEventListener('click', e => { const b = e.target.closest('.work'); if (b) open(+b.dataset.i, b); });
  $('#lb-close').onclick = () => lb.close();
  $('#lb-prev').onclick = () => step(-1); $('#lb-next').onclick = () => step(1);
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => { stage.innerHTML = ''; root.classList.remove('lock'); if (opener) opener.focus(); });
  lb.addEventListener('keydown', e => {
    if (e.target.closest('.track')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  // menu + active section
  const mb = $('#menu-btn'), menu = $('#menu');
  const setMenu = o => { menu.hidden = !o; mb.setAttribute('aria-expanded', String(o)); mb.textContent = t(o ? 'menu.close' : 'menu.open'); };
  mb.onclick = () => setMenu(menu.hidden);
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); mb.focus(); } });
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.nav a')];
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id))); }), { rootMargin: '-45% 0px -50% 0px' });
    ['works','formats','process','contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // contacts + consent text
  const links = $('#links');
  const add = h => links.insertAdjacentHTML('beforeend', `<li>${h}</li>`);
  if (CONFIG.TELEGRAM) add(`<a href="${esc(CONFIG.TELEGRAM)}" target="_blank" rel="noopener">Telegram ↗</a>`);
  if (CONFIG.INSTAGRAM) add(`<a href="${esc(CONFIG.INSTAGRAM)}" target="_blank" rel="noopener">Instagram ↗</a>`);
  if (CONFIG.EMAIL) add(`<span>${esc(CONFIG.EMAIL)}</span>`);
  if (CONFIG.TELEGRAM) document.querySelectorAll('[data-tg]').forEach(a => { a.href = CONFIG.TELEGRAM; a.target = '_blank'; a.rel = 'noopener'; });
  // плавающая плашка: появляется при прокрутке, прячется у заявки и подвала
  const tgbar = $('#tgbar'), tgLink = tgbar.querySelector('a');
  const hideZones = new Set();
  let scrolled = false;
  const syncBar = () => {
    const on = scrolled && !hideZones.size;
    tgbar.classList.toggle('on', on);
    root.classList.toggle('tg-on', on);
    tgLink.tabIndex = on ? 0 : -1;
  };
  addEventListener('scroll', () => { scrolled = scrollY > 480; syncBar(); }, { passive: true });
  if ('IntersectionObserver' in window) {
    const zio = new IntersectionObserver(es => es.forEach(en => { en.isIntersecting ? hideZones.add(en.target) : hideZones.delete(en.target); syncBar(); }));
    [document.getElementById('contact'), document.querySelector('footer')].forEach(el => { if (el) zio.observe(el); });
  }
  scrolled = scrollY > 480; syncBar();

  // ИИ-ассистент: настоящий ИИ через /api/chat, а без него умный FAQ
  const chat = $('#chat'), fab = $('#chat-fab'), clog = $('#chat-log'), cform = $('#chat-form'), cin = $('#chat-in'), cchips = $('#chat-chips');
  const hist = []; let busy = false, aiOff = false, greeted = false;
  /* лимит на клиента: не больше 5 запросов к ИИ за 5 минут (ИИ платный) */
  const RL_MAX = 5, RL_WIN = 5 * 60 * 1000, RL_KEY = 'aic-chat-rl';
  const rlHits = () => { try { return JSON.parse(localStorage.getItem(RL_KEY) || '[]').filter(ts => Date.now() - ts < RL_WIN); } catch { return []; } };
  const rlMark = () => { try { localStorage.setItem(RL_KEY, JSON.stringify(rlHits().concat(Date.now()))); } catch { /* не критично */ } };
  const FAQ = [
    [/цен|стоим|сколько|бюджет|прайс|руб|евро|€|\$|price|cost|how much|budget|rate/i, 'faq.price', true],
    [/срок|быстр|долго|когда|успе|how (fast|long|soon)|deadline|timeline|turnaround|when/i, 'faq.time', true],
    [/формат|видео|reels|рилс|фото|карусел|флаер|афиш|листов|услуг|делаете|умеете|what do you|services|video|photo|carousel|flyer|poster|format/i, 'faq.formats', false],
    [/заказ|связ|написать|заявк|хочу|нужен|нужна|проект|начать|order|contact|start|project|want|need|hire/i, 'faq.order', true],
    [/привет|здравств|добр|хай|hello|\bhi\b|hey/i, 'faq.hello', false]
  ];
  // язык ответа определяем по тексту вопроса: кириллица значит русский
  const replyLang = text => /[а-яё]/i.test(text) ? 'ru' : 'en';
  function addMsg(role, text, withTg) {
    const d = document.createElement('div'); d.className = 'm ' + (role === 'me' ? 'me' : 'bot'); d.textContent = text;
    if (withTg && CONFIG.TELEGRAM) {
      const a = document.createElement('a'); a.className = 'm-go'; a.href = CONFIG.TELEGRAM; a.target = '_blank'; a.rel = 'noopener'; a.dataset.i18n = 'cta.tgArrow'; a.textContent = t('cta.tgArrow');
      d.appendChild(document.createElement('br')); d.appendChild(a);
    }
    clog.appendChild(d); clog.scrollTop = clog.scrollHeight; return d;
  }
  function addTyping() {
    const d = document.createElement('div'); d.className = 'm bot'; d.setAttribute('aria-label', t('chat.typing'));
    d.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; clog.appendChild(d); clog.scrollTop = clog.scrollHeight; return d;
  }
  async function ask(raw) {
    const text = String(raw || '').trim().slice(0, 600);
    if (!text || busy) return;
    if (!aiOff && rlHits().length >= RL_MAX) {
      addMsg('me', text); cin.value = ''; cchips.hidden = true;
      addMsg('bot', I18N.tl(replyLang(text), 'chat.limit'), true);
      return;
    }
    busy = true; cform.querySelector('button').disabled = true;
    addMsg('me', text); hist.push({ role: 'user', content: text }); cchips.hidden = true; cin.value = '';
    const typing = addTyping(); const rl = replyLang(text); let reply = '', tg = false;
    if (!aiOff) {
      try {
        rlMark();
        const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist.slice(-6), lang: rl }), signal: ctl.signal });
        clearTimeout(timer);
        if (r.ok) { const d = await r.json(); reply = String(d.reply || '').trim(); }
        else if (r.status === 429) { reply = I18N.tl(rl, 'chat.fast'); tg = true; }
        else aiOff = true;
      } catch { /* сеть или таймаут: ответим из FAQ */ }
    }
    if (!reply) { const hit = FAQ.find(f => f[0].test(text)); reply = I18N.tl(rl, hit ? hit[1] : 'faq.fallback'); tg = hit ? hit[2] : true; }
    typing.remove();
    addMsg('bot', reply, tg || /telegram|телеграм|\bтг\b/i.test(reply));
    hist.push({ role: 'assistant', content: reply });
    busy = false; cform.querySelector('button').disabled = false; cin.focus();
  }
  const renderChips = () => { cchips.innerHTML = t('chat.chips').map(c => `<button type="button">${esc(c)}</button>`).join(''); };
  function setChat(o) {
    chat.classList.toggle('open', o); fab.setAttribute('aria-expanded', String(o));
    if (o) {
      if (!greeted) {
        greeted = true;
        addMsg('bot', t('chat.greet'));
        renderChips();
      }
      setTimeout(() => cin.focus(), 50);
    } else fab.focus();
  }
  const tip = $('#chat-tip');
  let tipN = 0, tipIdx = 0, tipDone = false; try { tipDone = sessionStorage.getItem('aic-tip') === '1'; } catch { /* не критично */ }
  const stopTip = () => { tipDone = true; tip.classList.remove('on'); try { sessionStorage.setItem('aic-tip', '1'); } catch { /* не критично */ } };
  const showTip = () => {
    if (tipDone || chat.classList.contains('open')) return;
    tipIdx = tipN; tip.textContent = t('chat.tips')[tipIdx % 3]; tipN++; tip.classList.add('on');
    setTimeout(() => tip.classList.remove('on'), 6500);
    if (tipN < 3) setTimeout(showTip, 24000);
  };
  if (!tipDone) setTimeout(showTip, 5000);
  tip.onclick = () => { stopTip(); setChat(true); };
  fab.onclick = () => { stopTip(); setChat(true); };
  $('#chat-x').onclick = () => setChat(false);
  cform.addEventListener('submit', e => { e.preventDefault(); ask(cin.value); });
  cchips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && chat.classList.contains('open')) setChat(false); });

  const fl = $('#ftr-links');
  if (CONFIG.TELEGRAM) fl.insertAdjacentHTML('beforeend', `<li><a href="${esc(CONFIG.TELEGRAM)}" target="_blank" rel="noopener">Telegram ↗</a></li>`);
  if (CONFIG.INSTAGRAM) fl.insertAdjacentHTML('beforeend', `<li><a href="${esc(CONFIG.INSTAGRAM)}" target="_blank" rel="noopener">Instagram ↗</a></li>`);
  if (CONFIG.EMAIL) fl.insertAdjacentHTML('beforeend', `<li>${esc(CONFIG.EMAIL)}</li>`);
  if (!links.children.length) links.remove();
  const setConsent = () => {
    const c = $('#consent-text');
    if (CONFIG.PRIVACY_URL) c.innerHTML = `${esc(t('form.consent'))} <a href="${esc(CONFIG.PRIVACY_URL)}" target="_blank" rel="noopener">${esc(t('form.privacy'))}</a>`;
    else c.textContent = t('form.consent');
  };
  setConsent();

  // lead form
  const form = $('#lead-form'), status = $('#lf-status'), btn = $('#lf-btn');
  const fail = msg => { status.className = 'status err'; status.innerHTML = msg; };
  const fallback = () => CONFIG.TELEGRAM ? ` ${t('form.viaTg')} <a href="${esc(CONFIG.TELEGRAM)}" target="_blank" rel="noopener">Telegram</a>.` : (CONFIG.EMAIL ? ' ' + esc(t('form.viaMail', CONFIG.EMAIL)) : ' ' + t('form.later'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault(); status.className = 'status';
    if (!CONFIG.ENDPOINT || CONFIG.ENDPOINT.startsWith('PASTE_')) { fail(t('form.noEndpoint')); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    btn.disabled = true; status.textContent = t('form.sending');
    const fd = new FormData(form);
    const topics = fd.getAll('topic'); fd.delete('topic');
    fd.set('message', (topics.length ? 'Интересует: ' + topics.join(', ') + '\n\n' : '') + (fd.get('message') || ''));
    fd.set('page', location.href);
    try {
      const res = await fetch(CONFIG.ENDPOINT, { method: 'POST', body: new URLSearchParams(fd) });
      const data = await res.json();
      if (data.ok) { form.reset(); status.className = 'status'; status.textContent = t('form.ok'); }
      else if (data.error === 'too_many_requests') fail(t('form.dup'));
      else throw new Error(data.error || 'failed');
    } catch { fail(t('form.fail') + fallback()); }
    finally { btn.disabled = false; }
  });

  // смена языка: обновляем всё, что строится скриптом
  I18N.onChange(() => {
    buildWordmark(); fit();
    renderWorks();
    list.querySelectorAll('li').forEach(li => li.classList.add('in'));
    renderFilters(); setFilter(filter);
    setMenu(!menu.hidden);
    document.querySelectorAll('[data-frame]').forEach(p => { p.textContent = t('proc.frame', p.dataset.frame); });
    if (greeted && !cchips.hidden) renderChips();
    setConsent();
    if (tip.classList.contains('on')) tip.textContent = t('chat.tips')[tipIdx % 3];
  });
  document.querySelectorAll('[data-frame]').forEach(p => { p.textContent = t('proc.frame', p.dataset.frame); });
})();
