(() => {
  const C = window.SITE_CONFIG || {};
  const BASE = (C.SUPABASE_URL || '').replace(/\/$/, ''), KEY = C.SUPABASE_ANON_KEY || '', BUCKET = 'portfolio';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LS = 'aic-admin-session';
  const TYPE_RU = { video:'Видео', photo:'Фото', carousel:'Карусель', flyer:'Флаер' };
  let session = null;
  const state = { works: [], sites: [] };

  // сессия и запросы
  try { session = JSON.parse(sessionStorage.getItem(LS) || 'null'); } catch { session = null; }
  const saveSession = s => { session = s; try { s ? sessionStorage.setItem(LS, JSON.stringify(s)) : sessionStorage.removeItem(LS); } catch { /* не критично */ } };
  async function authReq(grant, body) {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error_description || d.msg || d.error || 'Не удалось войти');
    return { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000 - 30000, email: (d.user && d.user.email) || '' };
  }
  async function token() {
    if (!session) throw new Error('Нет входа');
    if (Date.now() > session.exp) saveSession(await authReq('refresh_token', { refresh_token: session.refresh }));
    return session.access;
  }
  async function api(path, opts = {}) {
    const t = await token();
    const r = await fetch(BASE + path, { ...opts, headers: { apikey: KEY, Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
    if (!r.ok) {
      let m = ''; try { const j = await r.json(); m = j.message || j.error || ''; } catch { /* не критично */ }
      if (r.status === 401 || r.status === 403) m = (m ? m + '. ' : '') + 'Проверьте, что ваш email добавлен в таблицу admins.';
      throw new Error(m || 'Ошибка ' + r.status);
    }
    return (r.headers.get('content-type') || '').includes('json') ? r.json() : null;
  }
  const J = { 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  const pub = path => `${BASE}/storage/v1/object/public/${BUCKET}/${path}`;
  const upload = (path, blob, upsert) => api(`/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': upsert ? 'true' : 'false', 'cache-control': upsert ? 'max-age=300' : 'max-age=31536000' }, body: blob });
  const removeFiles = paths => paths.length ? api(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) }) : null;

  // подготовка файлов
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  async function prepImage(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(res => c.toBlob(res, 'image/webp', 0.86));
    if (!blob || blob.type !== 'image/webp') throw new Error('Не удалось обработать изображение ' + file.name);
    return { blob, w, h, ext: 'webp' };
  }
  function videoInfo(file) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video'), u = URL.createObjectURL(file);
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
      const done = (val, err) => { URL.revokeObjectURL(u); err ? reject(err) : resolve(val); };
      v.onerror = () => done(null, new Error('Не удалось прочитать видео ' + file.name));
      v.onloadedmetadata = () => { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); };
      v.onseeked = () => {
        const w = v.videoWidth, h = v.videoHeight; let frame = null;
        try { const c = document.createElement('canvas'); c.width = Math.min(w, 1600); c.height = Math.round(c.width * h / w); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(b => done({ w, h, frame: b }), 'image/webp', 0.84); }
        catch { done({ w, h, frame }); }
      };
    });
  }
  const extOf = f => (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';

  // вход / выход
  const show = authed => { $('#login').hidden = authed; $('#panel').hidden = !authed; $('#logout').hidden = !authed; };
  async function boot() {
    if (!BASE || !KEY) { $('#login').hidden = false; $('#cfg-warn').hidden = false; $('#login-form').hidden = true; return; }
    if (session) { try { await token(); show(true); await Promise.all([loadList('works'), loadList('sites')]); return; } catch { saveSession(null); } }
    show(false);
  }
  $('#login-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const st = $('#l-status'), b = $('#l-btn'); st.className = 'status'; st.textContent = 'Входим…'; b.disabled = true;
    try {
      saveSession(await authReq('password', { email: $('#l-email').value.trim(), password: $('#l-pass').value }));
      $('#l-pass').value = ''; st.textContent = ''; show(true); await Promise.all([loadList('works'), loadList('sites')]);
    } catch (e) { st.className = 'status err'; st.textContent = e.message; }
    finally { b.disabled = false; }
  });
  $('#logout').onclick = () => { saveSession(null); state.works = []; state.sites = []; show(false); };

  // вкладки
  function tab(name) {
    ['works', 'sites', 'reel'].forEach(n => { $('#tab-' + n).setAttribute('aria-selected', String(n === name)); $('#p-' + n).hidden = n !== name; });
  }
  $('#tab-works').onclick = () => tab('works'); $('#tab-sites').onclick = () => tab('sites'); $('#tab-reel').onclick = () => { tab('reel'); reelCheck(); };

  // список
  async function loadList(table) {
    try { state[table] = await api(`/rest/v1/${table}?select=*&order=sort.asc,created_at.desc`); renderList(table); }
    catch (e) { const el = $(table === 'works' ? '#w-list' : '#s-list'); el.innerHTML = `<li class="empty err">${esc(e.message)}</li>`; }
  }
  const thumbOf = (table, r) => {
    const u = table === 'sites' ? r.shot_url : (r.type === 'video' ? r.poster_url : r.type === 'carousel' ? (r.slides || [])[0] : r.file_url);
    return u ? `<img src="${esc(u)}" alt="">` : (table === 'works' ? esc(TYPE_RU[r.type] || '') : 'сайт');
  };
  function renderList(table) {
    const el = $(table === 'works' ? '#w-list' : '#s-list'), rows = state[table];
    if (!rows.length) { el.innerHTML = '<li class="empty">Пока пусто. Добавьте первую запись выше.</li>'; return; }
    el.innerHTML = rows.map((r, i) => `<li class="item ${r.published ? '' : 'off'}" data-id="${esc(r.id)}">
      <div class="th">${thumbOf(table, r)}</div>
      <div class="meta"><b>${esc(r.title)}</b><span>${table === 'works' ? esc(TYPE_RU[r.type]) + (r.type === 'carousel' ? ', слайдов: ' + (r.slides || []).length : '') : esc(r.url || 'без ссылки')}${r.published ? '' : ' · скрыто'}</span></div>
      <div class="acts">
        <button class="btn ghost sm" type="button" data-a="up" aria-label="Поднять выше" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn ghost sm" type="button" data-a="down" aria-label="Опустить ниже" ${i === rows.length - 1 ? 'disabled' : ''}>↓</button>
        ${table === 'works' ? `<button class="btn ghost sm" type="button" data-a="case">Кейс${r.task || r.solution || r.result ? ' ✓' : ''}</button>` : ''}
        <button class="btn ghost sm" type="button" data-a="toggle">${r.published ? 'Скрыть' : 'Показать'}</button>
        <button class="btn danger sm" type="button" data-a="del">Удалить</button>
      </div></li>`).join('');
  }
  async function move(table, id, dir) {
    const rows = state[table], i = rows.findIndex(r => r.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const sorts = rows.map(r => r.sort);
    if (new Set(sorts).size !== sorts.length) { for (let k = 0; k < rows.length; k++) { if (rows[k].sort !== k * 10) await api(`/rest/v1/${table}?id=eq.${rows[k].id}`, { method: 'PATCH', headers: J, body: JSON.stringify({ sort: k * 10 }) }); rows[k].sort = k * 10; } }
    const a = rows[i], b = rows[j], t = a.sort;
    await api(`/rest/v1/${table}?id=eq.${a.id}`, { method: 'PATCH', headers: J, body: JSON.stringify({ sort: b.sort }) });
    await api(`/rest/v1/${table}?id=eq.${b.id}`, { method: 'PATCH', headers: J, body: JSON.stringify({ sort: t }) });
    await loadList(table);
  }
  function wireList(table, el, statusEl) {
    el.addEventListener('click', async ev => {
      const btn = ev.target.closest('button[data-a]'); if (!btn) return;
      const li = btn.closest('.item'), id = li.dataset.id, row = state[table].find(r => r.id === id), act = btn.dataset.a;
      statusEl.className = 'status';
      try {
        if (act === 'case') {
          const ex = li.querySelector('.case-form');
          if (ex) { ex.remove(); return; }
          li.insertAdjacentHTML('beforeend', `<form class="case-form" style="flex-basis:100%;display:grid;gap:8px;margin-top:10px">
            <label>Задача<textarea name="task" rows="2" maxlength="600">${esc(row.task)}</textarea></label>
            <label>Что сделали<textarea name="solution" rows="3" maxlength="900">${esc(row.solution)}</textarea></label>
            <label>Результат<textarea name="result" rows="2" maxlength="600">${esc(row.result)}</textarea></label>
            <button class="btn sm" type="submit">Сохранить кейс</button></form>`);
          li.querySelector('.case-form').addEventListener('submit', async e => {
            e.preventDefault(); const f = e.target;
            try {
              await api(`/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: J, body: JSON.stringify({ task: f.task.value.trim(), solution: f.solution.value.trim(), result: f.result.value.trim() }) });
              await loadList(table); statusEl.className = 'status ok'; statusEl.textContent = 'Кейс сохранён.';
            } catch (er) { statusEl.className = 'status err'; statusEl.textContent = /column|task/i.test(er.message) ? 'Сначала выполните cases.sql в Supabase (SQL Editor).' : er.message; }
          });
          return;
        }
        if (act === 'up' || act === 'down') await move(table, id, act === 'up' ? -1 : 1);
        else if (act === 'toggle') { await api(`/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: J, body: JSON.stringify({ published: !row.published }) }); await loadList(table); }
        else if (act === 'del') {
          if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.textContent = 'Точно удалить?'; setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ''; btn.textContent = 'Удалить'; } }, 4000); return; }
          btn.disabled = true;
          await api(`/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE' });
          try { await removeFiles(Array.isArray(row.paths) ? row.paths : []); } catch { /* строка уже удалена, файлы можно убрать вручную */ }
          await loadList(table); statusEl.textContent = 'Удалено.';
        }
      } catch (e) { statusEl.className = 'status err'; statusEl.textContent = e.message; await loadList(table); }
    });
  }
  wireList('works', $('#w-list'), $('#w-status')); wireList('sites', $('#s-list'), $('#s-status'));
  const nextTopSort = table => state[table].length ? Math.min(...state[table].map(r => r.sort)) - 1 : 0;

  // форма работ
  let pending = [];
  const wType = $('#w-type'), wFile = $('#w-file');
  function setupType() {
    const t = wType.value; pending = []; wFile.value = '';
    wFile.accept = t === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp';
    wFile.multiple = t === 'carousel';
    $('#w-file-l').textContent = t === 'video' ? 'Файл видео (mp4 или webm)' : t === 'carousel' ? 'Слайды (можно выбрать несколько, порядок можно менять)' : t === 'flyer' ? 'Изображение флаера' : 'Фото';
    $('#w-poster-f').hidden = t !== 'video';
    renderPending();
  }
  function renderPending() {
    const el = $('#w-pending'), car = wType.value === 'carousel';
    el.innerHTML = pending.map((f, i) => `<li data-i="${i}"><span class="nm">${i + 1}. ${esc(f.name)}</span>${car ? `<button class="btn ghost sm" type="button" data-p="up" aria-label="Выше" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn ghost sm" type="button" data-p="down" aria-label="Ниже" ${i === pending.length - 1 ? 'disabled' : ''}>↓</button>` : ''}<button class="btn ghost sm" type="button" data-p="rm" aria-label="Убрать">✕</button></li>`).join('');
  }
  wType.onchange = setupType;
  wFile.onchange = () => { const fs = [...wFile.files]; pending = wType.value === 'carousel' ? pending.concat(fs) : fs.slice(0, 1); wFile.value = ''; renderPending(); };
  $('#w-pending').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-p]'); if (!b) return; const i = +b.closest('li').dataset.i, a = b.dataset.p;
    if (a === 'rm') pending.splice(i, 1);
    else { const j = a === 'up' ? i - 1 : i + 1; if (j >= 0 && j < pending.length) [pending[i], pending[j]] = [pending[j], pending[i]]; }
    renderPending();
  });
  $('#wf').addEventListener('submit', async ev => {
    ev.preventDefault(); const st = $('#w-status'), btn = $('#w-btn'), type = wType.value, title = $('#w-title').value.trim();
    st.className = 'status';
    if (!title) { st.className = 'status err'; st.textContent = 'Введите название.'; return; }
    if (!pending.length) { st.className = 'status err'; st.textContent = 'Выберите файл.'; return; }
    btn.disabled = true; const paths = [];
    try {
      const folder = `${type}/${rid()}`; let row = { type, title, description: $('#w-desc').value.trim(), paths: [], sort: nextTopSort('works'), published: true };
      if (type === 'video') {
        st.textContent = 'Читаем видео…'; const f = pending[0], info = await videoInfo(f);
        st.textContent = 'Загружаем видео…'; const vp = `${folder}/video.${extOf(f)}`; await upload(vp, f); paths.push(vp); row.file_url = pub(vp);
        let poster = $('#w-poster').files[0] ? await prepImage($('#w-poster').files[0]) : (info.frame ? { blob: info.frame } : null);
        if (poster) { st.textContent = 'Загружаем обложку…'; const pp = `${folder}/poster.webp`; await upload(pp, poster.blob); paths.push(pp); row.poster_url = pub(pp); }
        row.ratio_w = info.w || 16; row.ratio_h = info.h || 9;
      } else if (type === 'carousel') {
        row.slides = []; let first = null;
        for (let i = 0; i < pending.length; i++) {
          st.textContent = `Загружаем слайд ${i + 1} из ${pending.length}…`; const im = await prepImage(pending[i]); if (!first) first = im;
          const sp = `${folder}/s${String(i + 1).padStart(2, '0')}.webp`; await upload(sp, im.blob); paths.push(sp); row.slides.push(pub(sp));
        }
        row.ratio_w = first.w; row.ratio_h = first.h;
      } else {
        st.textContent = 'Загружаем изображение…'; const im = await prepImage(pending[0]); const ip = `${folder}/image.webp`;
        await upload(ip, im.blob); paths.push(ip); row.file_url = pub(ip); row.ratio_w = im.w; row.ratio_h = im.h;
      }
      row.paths = paths; st.textContent = 'Сохраняем…';
      await api('/rest/v1/works', { method: 'POST', headers: J, body: JSON.stringify(row) });
      $('#wf').reset(); setupType(); st.textContent = 'Готово: работа добавлена и уже на сайте.'; await loadList('works');
    } catch (e) { try { await removeFiles(paths); } catch { /* не критично */ } st.className = 'status err'; st.textContent = 'Не получилось: ' + e.message; }
    finally { btn.disabled = false; }
  });

  // форма сайтов
  $('#sf').addEventListener('submit', async ev => {
    ev.preventDefault(); const st = $('#s-status'), btn = $('#s-btn'); st.className = 'status'; btn.disabled = true; const paths = [];
    try {
      const row = { title: $('#s-title').value.trim(), url: $('#s-url').value.trim(), description: $('#s-desc').value.trim(), sort: nextTopSort('sites'), published: true, paths: [] };
      if (!row.title) throw new Error('Введите название.');
      if (row.url && !/^https?:\/\//.test(row.url)) throw new Error('Ссылка должна начинаться с http:// или https://');
      const f = $('#s-shot').files[0];
      if (f) { st.textContent = 'Загружаем скриншот…'; const im = await prepImage(f), sp = `sites/${rid()}/shot.webp`; await upload(sp, im.blob); paths.push(sp); row.shot_url = pub(sp); row.paths = paths; }
      st.textContent = 'Сохраняем…';
      await api('/rest/v1/sites', { method: 'POST', headers: J, body: JSON.stringify(row) });
      $('#sf').reset(); st.textContent = 'Готово: сайт добавлен.'; await loadList('sites');
    } catch (e) { try { await removeFiles(paths); } catch { /* не критично */ } st.className = 'status err'; st.textContent = e.message; }
    finally { btn.disabled = false; }
  });

  // шоурил
  const REEL_V = 'reel/reel.mp4', REEL_P = 'reel/poster.webp';
  async function reelCheck() {
    const box = $('#r-cur');
    try {
      const h = await fetch(pub(REEL_V), { method: 'HEAD', cache: 'no-store' });
      box.innerHTML = h.ok
        ? `<h2 class="mt-md">Сейчас на сайте</h2><video class="reel-preview" controls playsinline preload="metadata" src="${esc(pub(REEL_V))}?v=${Date.now()}"></video>`
        : '<p class="empty">Шоурил не загружен: на сайте показывается заглушка.</p>';
    } catch { box.innerHTML = ''; }
  }
  $('#rf').addEventListener('submit', async ev => {
    ev.preventDefault(); const st = $('#r-status'), btn = $('#r-btn'), f = $('#r-file').files[0]; st.className = 'status';
    if (!f) { st.className = 'status err'; st.textContent = 'Выберите видео mp4.'; return; }
    if (f.size > 50 * 1024 * 1024) { st.className = 'status err'; st.textContent = 'Файл больше 50 МБ. Сожмите видео.'; return; }
    btn.disabled = true;
    try {
      st.textContent = 'Читаем видео…'; const info = await videoInfo(f);
      st.textContent = 'Загружаем видео…'; await upload(REEL_V, f, true);
      const pf = $('#r-poster').files[0], poster = pf ? await prepImage(pf) : (info.frame ? { blob: info.frame } : null);
      if (poster) { st.textContent = 'Загружаем обложку…'; await upload(REEL_P, poster.blob, true); }
      $('#rf').reset(); st.textContent = 'Готово: шоурил на сайте (обновится в течение нескольких минут).'; await reelCheck();
    } catch (e) { st.className = 'status err'; st.textContent = 'Не получилось: ' + e.message; }
    finally { btn.disabled = false; }
  });
  $('#r-del').onclick = async () => {
    const st = $('#r-status'); st.className = 'status';
    if (!confirm('Убрать шоурил с сайта?')) return;
    try { await removeFiles([REEL_V, REEL_P]); st.textContent = 'Шоурил убран, на сайте снова заглушка.'; await reelCheck(); }
    catch (e) { st.className = 'status err'; st.textContent = e.message; }
  };

  setupType(); boot();
})();
