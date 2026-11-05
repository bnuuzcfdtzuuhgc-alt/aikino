// Мини-игра «Угадай кино» и попап при попытке уйти с сайта.
(() => {
  const C = window.SITE_CONFIG || {};
  const t = (...a) => I18N.t(...a);
  const $ = (s, r = document) => r.querySelector(s);
  const game = $('#game'), body = $('#g-body'), step = $('#g-step');
  const pop = $('#exit');
  if (!game || !pop) return;

  const BONUS = C.BONUS || {};
  const CODE = BONUS.code || 'KINO5';
  const bonusText = () => (I18N.lang === 'en' ? BONUS.en : BONUS.ru) || t('game.bonusDefault');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const save = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* не критично */ } };
  const read = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  let qn = 0, score = 0;

  function progress(total) {
    const p = el('div', 'g-prog');
    for (let i = 0; i < total; i++) p.appendChild(el('i', i < qn ? 'done' : i === qn ? 'now' : ''));
    return p;
  }

  function renderQuestion() {
    const qs = t('game.questions'), q = qs[qn];
    step.textContent = t('game.q', qn + 1, qs.length);
    body.replaceChildren(progress(qs.length), el('h3', 'g-q', q.q));
    const list = el('div', 'g-opts');
    const note = el('p', 'g-note');
    note.setAttribute('role', 'status');
    const next = el('button', 'btn g-next', t(qn + 1 === qs.length ? 'game.finish' : 'game.next'));
    next.type = 'button'; next.hidden = true;
    q.a.forEach((text, i) => {
      const b = el('button', 'g-opt', text); b.type = 'button';
      b.addEventListener('click', () => {
        const ok = i === q.c;
        if (ok) score++;
        list.querySelectorAll('button').forEach((x, j) => { x.disabled = true; if (j === q.c) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        note.textContent = pick(t(ok ? 'game.ok' : 'game.bad'));
        note.className = 'g-note ' + (ok ? 'ok' : 'bad');
        next.hidden = false; next.focus();
      });
      list.appendChild(b);
    });
    next.addEventListener('click', () => { qn++; qn < qs.length ? renderQuestion() : renderEnd(); });
    body.append(list, note, next);
  }

  function renderEnd() {
    const total = t('game.questions').length;
    save('aic-bonus', '1');
    step.textContent = t('game.endTitle');
    const rank = score >= 5 ? 'game.rank5' : score >= 3 ? 'game.rank3' : 'game.rank0';
    const code = el('p', 'g-code'); code.append(el('span', 'mono', t('game.codeLabel')), el('b', null, CODE));
    const claim = el('a', 'btn', t('game.claim'));
    claim.href = C.TELEGRAM || '#contact'; claim.target = '_blank'; claim.rel = 'noopener';
    const hint = el('p', 'g-note ok'); hint.setAttribute('role', 'status');
    claim.addEventListener('click', () => {
      try { navigator.clipboard.writeText(CODE); hint.textContent = t('game.copied'); } catch { /* не критично */ }
    });
    const again = el('button', 'btn ghost', t('game.again')); again.type = 'button';
    again.addEventListener('click', () => { qn = 0; score = 0; renderQuestion(); });
    body.replaceChildren(
      progress(total),
      el('h3', 'g-q', t(rank)),
      el('p', 'g-score mono', t('game.score', score, total)),
      el('p', 'g-bonus-l mono', t('game.bonusLabel')),
      el('p', 'g-bonus', bonusText()),
      code,
      el('div', 'g-row'),
      hint
    );
    $('.g-row', body).append(claim, again);
  }

  function openGame() {
    if (pop.open) pop.close();
    qn = 0; score = 0;
    renderQuestion();
    if (!game.open) { game.showModal(); document.documentElement.classList.add('lock'); }
  }
  const closeGame = () => game.close();
  game.addEventListener('close', () => { document.documentElement.classList.remove('lock') });
  $('#g-close').onclick = closeGame;
  game.addEventListener('click', e => { if (e.target === game) closeGame(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-game]')) openGame(); });

  // смена языка в процессе игры: перерисовываем текущий экран
  I18N.onChange(() => { if (game.open) { qn >= t('game.questions').length ? renderEnd() : renderQuestion(); } });

  // попап при уходе: только на компьютере, по выходу курсора за верхний край окна
  const SHOWN = 'aic-exit';
  const born = Date.now();
  const mobile = matchMedia('(max-width: 819px), (pointer: coarse)');
  const busy = () => game.open || pop.open || $('#lb').open || $('#chat').classList.contains('open') ||
    /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');
  const canShow = () => !mobile.matches && !read(SHOWN) && !read('aic-bonus') && Date.now() - born > 15000 && !busy();
  const showExit = () => { if (!canShow()) return; save(SHOWN, '1'); pop.showModal(); };
  document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 0) showExit(); });

  $('#exit-yes').onclick = () => { pop.close(); openGame(); };
  $('#exit-no').onclick = () => pop.close();
  pop.addEventListener('click', e => { if (e.target === pop) pop.close(); });
})();
