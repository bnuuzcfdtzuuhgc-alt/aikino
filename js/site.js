(async () => {
  const C = window.SITE_CONFIG || {};
  const CONFIG = {
    TELEGRAM: C.TELEGRAM || '',
    INSTAGRAM: C.INSTAGRAM || '',
    EMAIL: C.EMAIL || '',
    PRIVACY_URL: C.PRIVACY_URL || '',
    REEL: C.REEL || { src: '', poster: '' }
  };
  // демо-работы: показываются, пока в базе пусто
  let WORKS = [
    { id:'A001_C001', type:'video',    title:'Рекламный ролик', en:'Promo video',        ratio:[16,9],     h:18,  src:'', poster:'',
      cs:{ task:'Короткий ролик для запуска нового продукта: 15 секунд, вертикальный и горизонтальный формат, без съёмочной группы.', solution:'Собрали раскадровку, сгенерировали ключевые сцены, довели до единого стиля и смонтировали под музыку.', result:'Готовый ролик за 3 дня вместо 3 недель — в двух форматах для рекламы и соцсетей.' },
      csEn:{ task:'A short launch video for a new product: 15 seconds, vertical and horizontal, no film crew.', solution:'Built the storyboard, generated key scenes, unified the look and cut it to music.', result:'Finished in 3 days instead of 3 weeks — in two formats for ads and social.' } },
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
  const csOf = w => (I18N.lang === 'en' && w.csEn) || w.cs || null;
  const hasCase = w => { const c = csOf(w); return !!(c && (c.task || c.solution || c.result)); };
  const thumb = w => { const s = thumbSrc(w); return s ? `<img src="${esc(s)}" alt="${esc(w.alt || wt(w))}" loading="lazy">` : ph(w); };

  // hero: reel + timecode + wordmark fit
  // шоурил: секция появляется, только когда есть настоящее видео
  const reel = $('#reel'), reelSec = $('#reel-sec');
  const showReel = (src, poster) => {
    reel.insertAdjacentHTML('afterbegin', `<video controls playsinline preload="none" ${poster ? `poster="${esc(poster)}"` : ''} src="${esc(src)}"></video>`);
    reelSec.hidden = false;
  };
  if (CONFIG.REEL.src) showReel(CONFIG.REEL.src, CONFIG.REEL.poster);
  // анимации: только если пользователь не просил уменьшить движение
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  if (motion) { html.classList.add('anim'); setTimeout(() => html.classList.add('go'), 10000); }
  // главный экран: «Контент без …» — боль появляется и перечёркивается красным
  const pain = $('#pain'), painW = $('#pain-w');
  let pi = 0, pt = 0;
  const painShow = () => {
    const a = t('hero.pains'); painW.textContent = a[pi % a.length];
    pain.classList.remove('x', 'in'); void pain.offsetWidth; pain.classList.add('in');
    clearTimeout(pt);
    pt = setTimeout(() => { pain.classList.add('x'); pt = setTimeout(() => { pi++; painShow(); }, 2000); }, 700);
  };
  const buildWordmark = () => {
    pi = 0;
    if (motion) painShow(); else { painW.textContent = t('hero.pains')[0]; pain.classList.add('in', 'x'); }
  };
  buildWordmark();
  const fit = () => {}, swapSet = () => {};

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
          slidesSrc: Array.isArray(x.slides) ? x.slides : [], slides: (x.slides || []).length,
          cs: { task: x.task || '', solution: x.solution || '', result: x.result || '' }
        }));
      }
    } catch { /* остаются заглушки */ }
  }

  // лёд поверх скриншота сайта: удары мышкой оставляют трещины, на третьем лёд разлетается осколками
  const ICE_HITS = 3;
  let actx = null;
  const crackSound = big => {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const d = big ? 0.55 : 0.13, len = Math.floor(actx.sampleRate * d), b = actx.createBuffer(1, len, actx.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < len; i++) { const q = i / len; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - q, big ? 2.4 : 7) * (big && Math.random() < 0.003 ? 4 : 1); }
      const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = b; f.type = 'highpass'; f.frequency.value = big ? 1600 : 2400; g.gain.value = big ? 0.3 : 0.22;
      src.connect(f).connect(g).connect(actx.destination); src.start();
    } catch { /* без звука */ }
  };
  function makeIce(shot, card) {
    const ice = document.createElement('div'); ice.className = 'ice';
    const cv = document.createElement('canvas'); cv.className = 'ice-c';
    const hint = document.createElement('span'); hint.className = 'ice-hint mono';
    hint.innerHTML = `<span data-i18n="sites.ice">${t('sites.ice')}</span><b>${'<i></i>'.repeat(ICE_HITS)}</b>`;
    shot.append(ice, cv, hint); shot.classList.add('iced');
    const ctx = cv.getContext('2d');
    let W = 1, H = 1, hits = 0, done = false;
    const cracks = [];   // ломаные в долях ширины и высоты, чтобы переживать изменение размера
    const dots = Array.from({ length: 220 }, () => [Math.random(), Math.random(), Math.random()]);
    function paint() {
      if (done) return;
      ctx.clearRect(0, 0, W, H);
      // иней: мелкие штрихи и белёсые края
      dots.forEach(([x, y, k]) => { ctx.strokeStyle = `rgba(255,255,255,${0.06 + k * 0.16})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x * W, y * H); ctx.lineTo(x * W + (k - 0.5) * 14, y * H + (0.5 - k) * 9); ctx.stroke(); });
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.38)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // трещины: тёмная тень и светлый скол поверх
      cracks.forEach(l => {
        [[`rgba(10,40,60,.28)`, 2.4, 0.8], ['rgba(255,255,255,.95)', 1, 0]].forEach(([c, w, o]) => {
          ctx.strokeStyle = c; ctx.lineWidth = w * l.w; ctx.beginPath();
          l.p.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x * W + o, y * H + o)); ctx.stroke();
        });
      });
    }
    const size = () => {
      const r = shot.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint();
    };
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(shot); else size();
    function crack(x, y) {
      const n = 6 + Math.floor(Math.random() * 5), D = Math.max(W, H), ends = [];
      for (let i = 0; i < n; i++) {
        let a = (i / n) * Math.PI * 2 + Math.random() * 0.5, px = x, py = y;
        const pts = [[px / W, py / H]], len = D * (0.18 + Math.random() * 0.3) * (0.7 + hits * 0.3);
        for (let d = 0; d < len;) {
          const st = 10 + Math.random() * 26; d += st; a += (Math.random() - 0.5) * 0.6;
          px += Math.cos(a) * st; py += Math.sin(a) * st; pts.push([px / W, py / H]);
          if (Math.random() < 0.12) { // ответвление
            let ba = a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6), bx = px, by = py; const bp = [[bx / W, by / H]];
            for (let k = 0; k < 3; k++) { bx += Math.cos(ba) * 14; by += Math.sin(ba) * 14; ba += (Math.random() - 0.5) * 0.5; bp.push([bx / W, by / H]); }
            cracks.push({ p: bp, w: 0.7 });
          }
        }
        cracks.push({ p: pts, w: 1.2 }); ends.push(pts);
      }
      // кольцевые трещины между лучами, начиная со второго удара
      if (hits > 0) for (let i = 0; i < ends.length; i++) {
        const A = ends[i], B = ends[(i + 1) % ends.length], k = Math.min(A.length, B.length) - 1, m = Math.max(1, Math.floor(k * (0.3 + Math.random() * 0.3)));
        cracks.push({ p: [A[m], [(A[m][0] + B[m][0]) / 2 + (Math.random() - 0.5) * 0.02, (A[m][1] + B[m][1]) / 2 + (Math.random() - 0.5) * 0.02], B[m]], w: 0.8 });
      }
      paint();
    }
    function shatter(x, y) {
      done = true; shot.classList.add('broken');
      const K = 11 + Math.floor(Math.random() * 4), angs = Array.from({ length: K }, (_, i) => (i + Math.random() * 0.7) / K * Math.PI * 2);
      const D = Math.hypot(W, H), rings = [0, 0.1, 0.24, 0.42, 0.7, 1.6].map((r, i) => i ? r * D * (0.85 + Math.random() * 0.3) : 0);
      const P = (a, r) => [x + Math.cos(a) * r, y + Math.sin(a) * r], shards = [];
      for (let i = 0; i < K; i++) for (let j = 0; j < rings.length - 1; j++) {
        const a0 = angs[i], a1 = angs[(i + 1) % K] + (i === K - 1 ? Math.PI * 2 : 0);
        const pts = j ? [P(a0, rings[j]), P(a1, rings[j]), P(a1, rings[j + 1]), P(a0, rings[j + 1])] : [[x, y], P(a1, rings[1]), P(a0, rings[1])];
        const cx = pts.reduce((s2, p) => s2 + p[0], 0) / pts.length, cy = pts.reduce((s2, p) => s2 + p[1], 0) / pts.length;
        const dx = cx - x, dy = cy - y, l = Math.hypot(dx, dy) || 1, sp = (260 + Math.random() * 380) / (1 + j * 0.35);
        shards.push({ pts: pts.map(p => [p[0] - cx, p[1] - cy]), x: cx, y: cy, vx: dx / l * sp, vy: dy / l * sp - 160, r: 0, vr: (Math.random() - 0.5) * 7, d: j * 0.025 });
      }
      const t0 = performance.now(), T = 1.3;
      const anim = now => {
        const tt = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
        shards.forEach(sh => {
          const q = Math.max(0, tt - sh.d), al = Math.max(0, 1 - Math.max(0, q - T * 0.45) / (T * 0.55));
          if (al <= 0) return;
          ctx.save(); ctx.translate(sh.x + sh.vx * q, sh.y + sh.vy * q + 900 * q * q); ctx.rotate(sh.vr * q);
          ctx.beginPath(); sh.pts.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, px, py)); ctx.closePath();
          ctx.fillStyle = `rgba(214,233,243,${0.55 * al})`; ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${0.9 * al})`; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.restore();
        });
        if (tt < T + 0.4) requestAnimationFrame(anim);
        else { cv.remove(); ice.remove(); hint.remove(); shot.classList.remove('iced', 'broken'); }
      };
      requestAnimationFrame(anim);
    }
    card.addEventListener('click', e => {
      if (!shot.classList.contains('iced') || done) { if (done && shot.classList.contains('iced')) e.preventDefault(); return; }
      e.preventDefault();
      const r = shot.getBoundingClientRect();
      let x = e.clientX - r.left, y = e.clientY - r.top;
      if (!e.clientX || x < 0 || y < 0 || x > W || y > H) { x = W * (0.3 + Math.random() * 0.4); y = H * (0.3 + Math.random() * 0.4); }
      shot.classList.remove('hit'); void shot.offsetWidth; shot.classList.add('hit');
      hint.querySelectorAll('i')[hits] && hint.querySelectorAll('i')[hits].classList.add('on');
      if (hits + 1 >= ICE_HITS) { hits++; crackSound(true); shatter(x, y); }
      else { crack(x, y); hits++; crackSound(false); }
    });
  }

  // сайты из Supabase: секция появляется, когда есть хотя бы один
  async function loadSites() {
    if (!SB || !SK) return;
    try {
      const r = await fetch(`${SB}/rest/v1/sites?select=*&published=eq.true&order=sort.asc,created_at.desc`, { headers: { apikey: SK } });
      const rows = r.ok ? await r.json() : [];
      if (!Array.isArray(rows) || !rows.length) return;
      const list = $('#sites-list');
      // стопка карточек: каждая следующая наезжает на предыдущую и прижимает её
      const pad2 = n => String(n).padStart(2, '0');
      rows.forEach((x, k) => {
        let href = '';
        try { const u = new URL(x.url); if (/^https?:$/.test(u.protocol)) href = u.href; } catch { /* не критично */ }
        let host = x.url || ''; try { host = new URL(x.url).host.replace(/^www\./, ''); } catch { /* не критично */ }
        const li = document.createElement('li'); li.className = 'sk sk-' + 'abc'[k % 3]; li.style.setProperty('--i', k);
        const a = document.createElement(href ? 'a' : 'div');
        a.className = 'sk-card';
        if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        const info = document.createElement('div'); info.className = 'sk-info';
        const num = document.createElement('span'); num.className = 'sk-n mono'; num.textContent = `${pad2(k + 1)} / ${pad2(rows.length)}`;
        const ttl = document.createElement('span'); ttl.className = 'sk-title'; ttl.textContent = x.title;
        const words = String(x.title || '').split(/\s+/); ttl.style.setProperty('--lw', Math.max(4, ...words.map(w2 => w2.length))); ttl.style.setProperty('--tl', Math.max(10, String(x.title || '').length));
        info.append(num, ttl);
        if (x.description) { const d = document.createElement('span'); d.className = 'sk-desc'; d.textContent = x.description; info.appendChild(d); }
        const foot = document.createElement('span'); foot.className = 'sk-foot mono';
        const hs = document.createElement('span'); hs.textContent = host; foot.appendChild(hs);
        if (href) { const g = document.createElement('span'); g.className = 'sk-go'; g.dataset.i18n = 'sites.open'; g.textContent = t('sites.open'); foot.appendChild(g); }
        info.appendChild(foot);
        const shot = document.createElement('div'); shot.className = 'sk-shot';
        if (x.shot_url) {
          const im = document.createElement('img'); im.src = x.shot_url; im.alt = x.title; im.loading = 'lazy'; im.decoding = 'async';
          // длинный скриншот листается при наведении: скорость одинаковая для любой длины
          im.addEventListener('load', () => { const k2 = im.naturalHeight / Math.max(1, im.naturalWidth); shot.style.setProperty('--dur', Math.min(14, Math.max(2.5, k2 * 2.6)).toFixed(1) + 's'); if (k2 > 0.9) shot.classList.add('long'); });
          shot.appendChild(im);
          makeIce(shot, a);
        } else { const em = document.createElement('span'); em.className = 'sk-empty'; em.textContent = host || x.title; shot.appendChild(em); }
        a.append(info, shot); li.appendChild(a); list.appendChild(li);
      });
      // карточка, на которую наезжает следующая, уменьшается и темнеет
      const cards = [...list.children];
      let skRaf = 0;
      const skUpd = () => {
        skRaf = 0;
        cards.forEach((li, k) => {
          const nx = cards[k + 1]; if (!nx) return;
          const a = li.getBoundingClientRect(), b = nx.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / Math.max(1, a.height)));
          li.style.setProperty('--p', p.toFixed(3));
        });
      };
      addEventListener('scroll', () => { if (!skRaf) skRaf = requestAnimationFrame(skUpd); }, { passive: true });
      addEventListener('resize', skUpd); skUpd();
      // красный круг «Открыть ↗» вместо курсора над карточкой со ссылкой
      const cur = $('#sk-cur');
      if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        let cx = 0, cy = 0, tx = 0, ty = 0, on = false, cr = 0;
        const loop = () => { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cur.style.transform = `translate(${cx}px,${cy}px)`; cr = on || Math.abs(tx - cx) + Math.abs(ty - cy) > .5 ? requestAnimationFrame(loop) : 0; };
        list.addEventListener('pointermove', e => {
          const card = e.target.closest('.sk-card'), iced = !!(card && card.querySelector('.sk-shot.iced'));
          const c = card && (iced || card.tagName === 'A'); tx = e.clientX; ty = e.clientY;
          const txt = t(iced ? 'sites.hit' : 'sites.cur'); if (cur.textContent !== txt) cur.textContent = txt;
          cur.classList.toggle('hit', iced);
          if (!!c !== on) { on = !!c; cur.classList.toggle('on', on); if (on && !cr) { cx = tx; cy = ty; } }
          if (!cr) cr = requestAnimationFrame(loop);
        });
        list.addEventListener('pointerleave', () => { on = false; cur.classList.remove('on'); });
      }
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
    showReel(src, poster);
  }
  setReel();

  // works grid + filters
  const list = $('#works-list'), filtersEl = $('#filters');
  let filter = 'all';
  const renderWorks = () => {
    list.innerHTML = WORKS.map((w, i) => `<li data-type="${w.type}" style="--rn:${rn(w).toFixed(4)}"><button class="work" type="button" data-i="${i}" aria-label="${esc(t('works.open', wt(w), TYPES[w.type]))}"><span class="frame">${thumb(w)}</span><span class="cap"><span class="cap-n mono">${String(i + 1).padStart(2, '0')}</span><b>${esc(wt(w))}</b><span class="cap-t mono">${TYPES[w.type]}${hasCase(w) ? ` · ${t('case.badge')}` : ''}</span></span></button></li>`).join('');
  };
  renderWorks();
  if (window.PRE) window.PRE.done('works');
  // появление при прокрутке: кадры работ, заголовки и строки секций
  if (motion && 'IntersectionObserver' in window) {
    html.classList.add('rv');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    list.querySelectorAll('li').forEach(li => io.observe(li));
    document.querySelectorAll('[data-rv], .fmt li, .step').forEach(el => io.observe(el));
    // страховка: если что-то не попало в наблюдение, содержимое всё равно должно быть видно
    setTimeout(() => html.classList.add('rv-all'), 9000);
  }
  const counts = { all: WORKS.length }; WORKS.forEach(w => counts[w.type] = (counts[w.type] || 0) + 1);
  const FILTERS = ['all', 'video', 'photo', 'carousel', 'flyer'];
  // «хлопушка» под главным экраном: форматы с реальным числом работ ведут сразу в отфильтрованную ленту
  const slateF = $('#slate-f');
  const renderSlate = () => {
    if (!slateF) return;
    slateF.innerHTML = FILTERS.filter(f => f !== 'all' && counts[f]).map(f => `<a href="#works" data-filter="${f}">${t('filter.' + f)}<sup>${counts[f]}</sup></a>`).join('');
    $('#slate-n').textContent = String(WORKS.length).padStart(2, '0');
  };
  renderSlate();
  if (slateF) slateF.addEventListener('click', e => { const a = e.target.closest('a[data-filter]'); if (a) setFilter(a.dataset.filter); });
  const renderFilters = () => {
    filtersEl.innerHTML = FILTERS.filter(f => counts[f]).map(f => `<button type="button" data-f="${f}" aria-pressed="${f === filter}">${t('filter.' + f)}<span class="n">${counts[f]}</span></button>`).join('');
  };
  renderFilters();
  const countEl = $('#works-count');
  function setFilter(f) {
    filter = f;
    filtersEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    list.querySelectorAll('li').forEach(li => { li.hidden = !(f === 'all' || li.dataset.type === f); });
    list.scrollLeft = 0; railSync(); pinLayout();
    countEl.textContent = t('works.count', f === 'all' ? WORKS.length : counts[f], f === 'all');
  }
  filtersEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.f); });
  $('#fmt-list').addEventListener('click', e => { const a = e.target.closest('a[data-filter]'); if (a) setFilter(a.dataset.filter); });

  // лента: стрелки, полоса прокрутки, перетаскивание мышью
  const prevB = $('#rail-prev'), nextB = $('#rail-next'), bar = $('#rail-i');
  const railSync = () => {
    const max = list.scrollWidth - list.clientWidth, x = list.scrollLeft;
    prevB.disabled = x < 4; nextB.disabled = x > max - 4;
    const w = max > 0 ? list.clientWidth / list.scrollWidth : 1, bw = bar.parentElement.clientWidth;
    bar.style.setProperty('--w', (w * 100) + '%');
    bar.style.setProperty('--x', (max > 0 ? (x / max) * (bw - bw * w) : 0) + 'px');
  };
  list.addEventListener('scroll', railSync, { passive: true });
  addEventListener('resize', railSync);
  const railGo = d => {
    const dist = d * Math.max(300, list.clientWidth * .7), beh = reduce ? 'auto' : 'smooth';
    if (pinOn) window.scrollBy({ top: dist / PIN_K, behavior: beh }); else list.scrollBy({ left: dist, behavior: beh });
  };
  prevB.onclick = () => railGo(-1); nextB.onclick = () => railGo(1);
  let dragX = null, dragL = 0, moved = false;
  list.addEventListener('pointerdown', e => { if (pinOn || e.pointerType !== 'mouse' || e.button) return; dragX = e.clientX; dragL = list.scrollLeft; moved = false; });
  addEventListener('pointermove', e => {
    if (dragX == null) return;
    const dx = e.clientX - dragX;
    if (!moved && Math.abs(dx) > 6) { moved = true; list.classList.add('drag'); }
    if (moved) list.scrollLeft = dragL - dx;
  });
  addEventListener('pointerup', () => { if (dragX == null) return; dragX = null; list.classList.remove('drag'); setTimeout(() => { moved = false; }, 0); });
  list.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
  // режим «выставка» (ПК): вертикальная прокрутка двигает ленту вбок
  const pinEl = $('#rail-pin'), stick = $('.rail-stick');
  const pinMQ = matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)');
  const PIN_K = 2; // сколько px ленты на 1 px прокрутки
  let pinOn = false, pinMax = 0;
  function pinSync() {
    if (!pinOn) return;
    const top = pinEl.getBoundingClientRect().top - (parseFloat(window.getComputedStyle(stick).top) || 0);
    list.scrollLeft = Math.min(Math.max(-top * PIN_K, 0), pinMax);
  }
  function pinLayout() {
    pinOn = motion && pinMQ.matches;
    pinEl.classList.toggle('on', pinOn);
    if (!pinOn) { pinEl.style.removeProperty('--pin-h'); return; }
    pinMax = Math.max(0, list.scrollWidth - list.clientWidth);
    pinEl.style.setProperty('--pin-h', (stick.offsetHeight + pinMax / PIN_K) + 'px');
    pinSync();
  }
  addEventListener('scroll', pinSync, { passive: true });
  addEventListener('resize', pinLayout);
  addEventListener('load', pinLayout);
  pinMQ.addEventListener('change', pinLayout);
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
      for (let k = 0; k < n; k++) s += `<div class="slide" style="--k:${k}" role="group" aria-roledescription="${t('slide.role')}" aria-label="${t('slide.label', k + 1, n)}"><div class="sl-in">${(w.slidesSrc && w.slidesSrc[k]) ? `<img src="${esc(w.slidesSrc[k])}" alt="${esc(t('slide.alt', wt(w), k + 1))}">` : ph(w, `SLIDE ${k + 1}/${n}`)}</div></div>`;
      return `<div class="lbf cf" ${r}><div class="track" tabindex="0" aria-label="${t('slides.aria')}">${s}</div><button class="ib sl-btn sl-prev" type="button" aria-label="${t('sl.prev')}">‹</button><button class="ib sl-btn sl-next" type="button" aria-label="${t('sl.next')}">›</button><div class="dots" aria-hidden="true">${'<i></i>'.repeat(n)}</div></div>`;
    }
    if (w.type === 'video' && w.src) return `<div class="lbf" ${r}><video controls playsinline autoplay ${w.poster ? `poster="${esc(w.poster)}"` : ''} src="${esc(w.src)}"></video></div>`;
    if (w.type !== 'video' && w.src) return `<div class="lbf" ${r}><img src="${esc(w.src)}" alt="${esc(w.alt || wt(w))}"></div>`;
    return `<div class="lbf" ${r}>${ph(w)}</div>`;
  }
  // карусель-«коверфлоу»: слайды веером раскладываются из стопки, центральный крупно, соседи под углом
  function wireCarousel() {
    const tr = $('.track', stage); if (!tr) return;
    const cf = tr.parentElement, slides = [...tr.children], dots = [...stage.querySelectorAll('.dots i')], GAP = 22;
    let sw = 0, cur0 = -1;
    const layout = () => {
      sw = slides[0].getBoundingClientRect().width / (parseFloat(slides[0].style.getPropertyValue('--z')) || 1);
      sw = slides[0].offsetWidth;
      tr.style.paddingInline = Math.max(0, (tr.clientWidth - sw) / 2) + 'px';
      cf.style.setProperty('--sw', sw + 'px');
    };
    const upd = () => {
      const c = tr.scrollLeft + tr.clientWidth / 2;
      slides.forEach(sl => {
        const d = (sl.offsetLeft + sl.offsetWidth / 2 - c) / (sw + GAP), a = Math.min(Math.abs(d), 3);
        sl.style.setProperty('--d', Math.max(-3, Math.min(3, d)).toFixed(3)); sl.style.setProperty('--a', a.toFixed(3));
        sl.style.zIndex = String(10 - Math.round(a));
      });
      const k = Math.max(0, Math.min(slides.length - 1, Math.round(tr.scrollLeft / (sw + GAP))));
      if (k !== cur0) { cur0 = k; dots.forEach((dd, j) => dd.setAttribute('aria-current', String(j === k))); }
    };
    const goTo = k => tr.scrollTo({ left: Math.max(0, Math.min(slides.length - 1, k)) * (sw + GAP), behavior: reduce ? 'auto' : 'smooth' });
    // раскладка зависит от размеров, которых нет, пока диалог ещё закрыт, поэтому следим за размером ленты
    let started = false;
    let raf = 0;
    const relayout = () => {
      raf = 0;
      if (!tr.isConnected) { ro.disconnect(); return; }
      if (!tr.clientWidth) return;
      const k0 = cur0 < 0 ? 0 : cur0; layout(); tr.scrollLeft = k0 * (sw + GAP); upd();
      if (!started) { started = true; if (motion) cf.classList.add('fan'); }
    };
    // кадр откладываем, а следим за внешним размером: иначе смена отступов вызывает «ResizeObserver loop»
    const ro = new window.ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(relayout); });
    ro.observe(tr, { box: 'border-box' });
    tr.addEventListener('scroll', upd, { passive: true });
    slides.forEach((sl, k) => sl.addEventListener('click', () => { if (k !== cur0) goTo(k); }));
    $('.sl-prev', stage).onclick = () => goTo(cur0 - 1); $('.sl-next', stage).onclick = () => goTo(cur0 + 1);
  }
  const strip = $('#lb-strip');
  function renderStrip() {
    strip.innerHTML = visible().map(i => { const w = WORKS[i]; return `<button type="button" data-i="${i}" aria-label="${esc(wt(w))}" aria-current="${i === cur}">${thumb(w)}</button>`; }).join('');
  }
  function show(i, dir) {
    const first = !lb.open;
    cur = i; const w = WORKS[i], v = visible(), pos = v.indexOf(i) + 1;
    stage.classList.toggle('back', dir < 0);
    stage.innerHTML = stageHTML(w); wireCarousel();
    if (first || strip.children.length !== v.length) renderStrip();
    strip.querySelectorAll('button').forEach(b => {
      const on = +b.dataset.i === i; b.setAttribute('aria-current', String(on));
      if (on) strip.scrollTo({ left: b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2, top: b.offsetTop - (strip.clientHeight - b.offsetHeight) / 2, behavior: reduce ? 'auto' : 'smooth' });
    });
    const p2 = n => String(n).padStart(2, '0'), numEl = $('#lb-n');
    $('#lb-meta').textContent = `${w.id} · ${TYPES[w.type]} · ${pos}/${v.length}`;
    numEl.textContent = p2(pos); $('#lb-of').textContent = '/ ' + p2(v.length);
    numEl.classList.remove('tick'); void numEl.offsetWidth; if (!first) numEl.classList.add('tick');
    $('#lb-type').textContent = `${TYPES[w.type]} · ${w.id}`;
    $('#lb-title').textContent = wt(w);
    $('#lb-case').hidden = !hasCase(w);
  }
  // карточка «вылетает» из ленты и раскрывается до размера кадра в просмотре
  function flyFrom(btn) {
    const from = btn && btn.querySelector('.frame'), el = stage.firstElementChild;
    if (!motion || !from || !el || el.classList.contains('cf')) return;
    const a = from.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!(a.width > 0 && b.width > 0)) return;
    el.style.animation = 'none'; el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`;
    void el.offsetWidth;
    el.style.transition = 'transform .8s cubic-bezier(.76,0,.24,1)'; el.style.transform = 'none';
    const clean = () => { el.style.transition = ''; el.style.transform = ''; el.style.transformOrigin = ''; };
    el.addEventListener('transitionend', clean, { once: true }); setTimeout(clean, 1000);
  }
  // для баннера при уходе: работы с настоящими превью и открытие просмотра
  window.AIC = { works: () => WORKS.map((w, i) => ({ i, src: thumbSrc(w), title: wt(w), rn: rn(w), type: w.type })).filter(x => x.src), open: i => open(i, null) };
  let openT = 0;
  function open(i, btn) {
    opener = btn; show(i);
    if (lb.open) return;
    lb.showModal(); root.classList.add('lock'); lb.focus();
    if (motion) { lb.classList.add('opening'); clearTimeout(openT); openT = setTimeout(() => lb.classList.remove('opening'), 1300); }
    flyFrom(btn);
  }
  function step(d) { const v = visible(); if (!v.length) return; show(v[(v.indexOf(cur) + d + v.length) % v.length], d); }
  strip.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { const n = +b.dataset.i, v = visible(); show(n, v.indexOf(n) < v.indexOf(cur) ? -1 : 1); } });
  // свайп по фото и флаерам (у видео и каруселей свои жесты)
  let sx = null, sy0 = 0;
  stage.addEventListener('pointerdown', e => { sx = e.target.closest('video,.track,.sl-btn') ? null : e.clientX; sy0 = e.clientY; });
  stage.addEventListener('pointerup', e => {
    if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy0; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { sx = null; });
  list.addEventListener('click', e => { const b = e.target.closest('.work'); if (b) open(+b.dataset.i, b); });
  $('#lb-close').onclick = () => lb.close();
  $('#lb-prev').onclick = () => step(-1); $('#lb-next').onclick = () => step(1);
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => { if (lb.open) return; stage.innerHTML = ''; strip.innerHTML = ''; root.classList.remove('lock'); if (opener) opener.focus(); });
  // страница кейса: задача → решение → результат
  const cdlg = $('#case');
  function openCase(i) {
    const w = WORKS[i]; if (!w || !hasCase(w)) return;
    const c = csOf(w), main = w.type === 'video' && w.src
      ? `<video controls playsinline ${w.poster ? `poster="${esc(w.poster)}"` : ''} src="${esc(w.src)}"></video>`
      : thumb(w);
    let nx = -1;
    for (let k = 1; k < WORKS.length; k++) { const j = (i + k) % WORKS.length; if (hasCase(WORKS[j])) { nx = j; break; } }
    const blk = (k, txt, n) => txt ? `<section class="cs-b"><span class="cs-n mono">0${n}</span><h3>${t('case.' + k)}</h3><p>${esc(txt).replace(/\n/g, '<br>')}</p></section>` : '';
    $('#case-body').innerHTML = `<p class="mono cs-kind">${w.id} · ${TYPES[w.type]}</p><h2 id="case-t">${esc(wt(w))}</h2><div class="cs-media" style="--r:${rn(w).toFixed(4)}">${main}</div><div class="cs-grid">${blk('task', c.task, 1)}${blk('solution', c.solution, 2)}${blk('result', c.result, 3)}</div><div class="cs-cta"><a class="btn big" data-tg href="${esc(CONFIG.TELEGRAM || '#')}" target="_blank" rel="noopener">${t('case.cta')}</a></div>${nx >= 0 ? `<button class="cs-next" type="button" data-next="${nx}"><span class="mono">${t('case.next')}</span><b>${esc(wt(WORKS[nx]))}</b><span class="arr" aria-hidden="true">→</span></button>` : ''}`;
    cdlg.dataset.i = i;
    if (!cdlg.open) cdlg.showModal();
    cdlg.scrollTop = 0;
    try { window.history.replaceState(null, '', '#case-' + (i + 1)); } catch { /* не критично */ }
  }
  $('#lb-case').onclick = () => openCase(cur);
  $('#case-body').addEventListener('click', e => {
    const b = e.target.closest('.cs-next'); if (!b) return;
    const n = +b.dataset.next; if (lb.open) show(n, 1); openCase(n);
  });
  $('#case-close').onclick = () => cdlg.close();
  cdlg.addEventListener('click', e => { if (e.target === cdlg) cdlg.close(); });
  cdlg.addEventListener('close', () => {
    $('#case-body').innerHTML = '';
    try { window.history.replaceState(null, '', location.pathname + location.search); } catch { /* не критично */ }
    if (lb.open) $('#lb-case').focus();
  });
  I18N.onChange(() => { if (cdlg.open) openCase(+cdlg.dataset.i); });
  { const m = /^#case-(\d+)$/.exec(location.hash); if (m && WORKS[+m[1] - 1] && hasCase(WORKS[+m[1] - 1])) { open(+m[1] - 1, null); openCase(+m[1] - 1); } }
  lb.addEventListener('keydown', e => {
    if (e.target.closest('.track')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  // menu + active section
  const mb = $('#menu-btn'), menu = $('#menu');
  const setMenu = o => {
    menu.hidden = !o; mb.setAttribute('aria-expanded', String(o));
    mb.setAttribute('aria-label', t(o ? 'menu.close' : 'menu.open'));
    html.classList.toggle('menu-open', o);
  };
  mb.onclick = () => setMenu(menu.hidden);
  matchMedia('(min-width:1000px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  // страницу под открытым меню не листаем (без overflow:hidden на html: он сбрасывал позицию и прятал липкую шапку)
  const stopBg = e => { if (!menu.hidden && !menu.contains(e.target)) e.preventDefault(); };
  document.addEventListener('touchmove', stopBg, { passive: false });
  document.addEventListener('wheel', stopBg, { passive: false });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.hdr')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); mb.focus(); } });
  // шапка-капсула: чёрная плашка скользит под активный раздел
  const nav = $('.nav'), ind = $('.nav-ind');
  const moveInd = () => {
    const cur = nav && nav.querySelector('a[aria-current="true"]:not([hidden])');
    if (!cur || !ind) { if (nav) nav.classList.remove('has'); return; }
    ind.style.setProperty('--ix', cur.offsetLeft + 'px'); ind.style.setProperty('--iw', cur.offsetWidth + 'px');
    nav.classList.add('has');
  };
  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.nav a')];
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id))); moveInd(); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'works', 'formats', 'sites', 'process', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
  addEventListener('resize', moveInd);
  // полоса прогресса и прячущаяся при прокрутке вниз шапка
  const hdr = $('.hdr');
  let lastY = scrollY, hRaf = 0;
  addEventListener('scroll', () => {
    if (hRaf) return;
    hRaf = requestAnimationFrame(() => {
      hRaf = 0;
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      hdr.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
      if (menu.hidden && Math.abs(y - lastY) > 6) { html.classList.toggle('hdr-hide', y > lastY && y > 240); lastY = y; }
      html.classList.toggle('hdr-up', y > 40);
    });
  }, { passive: true });

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
  addEventListener('scroll', () => { scrolled = scrollY > 480; root.classList.toggle('scrolled', scrollY > 160); syncBar(); }, { passive: true });
  if ('IntersectionObserver' in window) {
    const zio = new IntersectionObserver(es => es.forEach(en => { en.isIntersecting ? hideZones.add(en.target) : hideZones.delete(en.target); syncBar(); }));
    [document.getElementById('contact'), document.querySelector('footer')].forEach(el => { if (el) zio.observe(el); });
  }
  scrolled = scrollY > 480; root.classList.toggle('scrolled', scrollY > 160); syncBar();

  // ИИ-ассистент: настоящий ИИ через /api/chat, а без него умный FAQ
  const chat = $('#chat'), fab = $('#chat-fab'), clog = $('#chat-log'), cform = $('#chat-form'), cin = $('#chat-in'), cchips = $('#chat-chips');
  const hist = []; let busy = false, aiOff = false, greeted = false;
  /* лимит на клиента: не больше 5 запросов к ИИ за 5 минут (ИИ платный) */
  const RL_MAX = 5, RL_WIN = 5 * 60 * 1000, RL_KEY = 'aic-chat-rl';
  const rlHits = () => { try { return JSON.parse(localStorage.getItem(RL_KEY) || '[]').filter(ts => Date.now() - ts < RL_WIN); } catch { return []; } };
  const rlMark = () => { try { localStorage.setItem(RL_KEY, JSON.stringify(rlHits().concat(Date.now()))); } catch { /* не критично */ } };
  const FAQ = [
    [/цен|стоим|сколько|бюджет|прайс|руб|евро|€|\$|price|cost|how much|budget|rate|pay/i, 'faq.price', true],
    [/пример|покаж|портфолио|работы|кейс|example|portfolio|show|sample/i, 'faq.examples', false],
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
        else {
          let d = {}; try { d = await r.json(); } catch { /* не критично */ }
          console.warn('AI chat unavailable:', r.status, d.error || '', d.detail || '');
          if (r.status === 503 || r.status === 403) aiOff = true;
        }
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
  // смена языка: обновляем всё, что строится скриптом
  I18N.onChange(() => {
    buildWordmark(); fit(); swapSet(); renderSlate();
    renderWorks();
    list.querySelectorAll('li').forEach(li => li.classList.add('in'));
    renderFilters(); setFilter(filter);
    setMenu(!menu.hidden);
    document.querySelectorAll('[data-frame]').forEach(p => { p.textContent = t('proc.frame', p.dataset.frame); });
    if (greeted && !cchips.hidden) renderChips();
    if (tip.classList.contains('on')) tip.textContent = t('chat.tips')[tipIdx % 3];
  });
  document.querySelectorAll('[data-frame]').forEach(p => { p.textContent = t('proc.frame', p.dataset.frame); });
})();
