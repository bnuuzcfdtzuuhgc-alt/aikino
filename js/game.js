// Мини-игра «Крестики-нолики» и попап при попытке уйти с сайта.
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

  // крестики-нолики против «режиссёра»: серия из трёх партий
  const ROUNDS = 3;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let round = 0, wins = 0, draws = 0, losses = 0, board = [], over = false, thinking = false, msg = '', line = null, timer = 0, ended = false, fresh = -1, introT = 0;

  const verdict = b => {
    for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { w: b[l[0]], line: l };
    return b.every(Boolean) ? { w: 'D', line: null } : null;
  };
  const free = b => b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  function cpuPick(b) {
    const f = free(b);
    if (Math.random() < .22) return pick(f);                    // иногда «режиссёр» ошибается
    const tryWin = who => f.find(i => { const c = b.slice(); c[i] = who; const v = verdict(c); return v && v.w === who; });
    const m = tryWin('O'); if (m != null) return m;
    const bl = tryWin('X'); if (bl != null) return bl;
    if (!b[4]) return 4;
    const corners = [0, 2, 6, 8].filter(i => !b[i]); if (corners.length) return pick(corners);
    return pick(f);
  }

  function startRound() {
    board = Array(9).fill(''); over = false; thinking = false; msg = ''; line = null; fresh = -1;
    round++; render();
  }

  function finishRound(v) {
    over = true; thinking = false; line = v.line;
    if (v.w === 'X') { wins++; msg = pick(t('game.winMsg')); }
    else if (v.w === 'O') { losses++; msg = pick(t('game.loseMsg')); }
    else { draws++; msg = pick(t('game.drawMsg')); }
    result = v.w;
    render();
  }
  let result = '';

  function place(i) {
    if (over || thinking || board[i]) return;
    board[i] = 'X'; fresh = i;
    const v = verdict(board);
    if (v) return finishRound(v);
    thinking = true; render();
    timer = setTimeout(() => {
      fresh = cpuPick(board); board[fresh] = 'O';
      const w = verdict(board);
      thinking = false;
      if (w) finishRound(w); else render();
    }, 480);
  }

  function render() {
    if (ended) return renderEnd();
    step.textContent = t('game.round', round, ROUNDS);
    const prog = el('div', 'g-prog');
    for (let i = 0; i < ROUNDS; i++) prog.appendChild(el('i', i < round - 1 || (i === round - 1 && over) ? 'done' : i === round - 1 ? 'now' : ''));
    body.classList.remove('g-end');
    const sc = el('p', 'g-sc');
    const side = (label, n) => { const s = el('span'); s.append(el('small', null, label), el('b', null, String(n))); return s; };
    sc.append(side(t('game.you'), wins), el('i', null, ':'), side(t('game.cpu'), losses));
    const status = el('h3', 'g-q', over ? msg : t(thinking ? 'game.cpuTurn' : 'game.yourTurn'));
    status.setAttribute('role', 'status');
    const grid = el('div', 'g-board');
    board.forEach((v, i) => {
      const c = el('button', 'g-cell', v === 'X' ? '✕' : v === 'O' ? '○' : '');
      c.type = 'button'; c.dataset.v = v;
      c.setAttribute('aria-label', t('game.cell', i + 1, v === 'X' ? t('game.you') : v === 'O' ? t('game.cpu') : ''));
      c.disabled = over || thinking || !!v;
      if (line && line.includes(i)) c.classList.add(result === 'X' ? 'win' : 'lose');
      if (i === fresh && v) c.classList.add('new');
      c.addEventListener('click', () => place(i));
      grid.appendChild(c);
    });
    const next = el('button', 'btn g-next', t(round === ROUNDS ? 'game.finish' : 'game.next'));
    next.type = 'button'; next.hidden = !over;
    next.addEventListener('click', () => { if (round === ROUNDS) { ended = true; renderEnd(); } else startRound(); });
    body.replaceChildren(prog, sc, status, grid, next);
    fresh = -1;
    if (over) next.focus();
  }

  function renderEnd() {
    clearTimeout(timer);
    save('aic-bonus', '1');
    body.classList.add('g-end');
    step.textContent = t('game.endTitle');
    const rank = wins >= 2 ? 'game.rank5' : wins === 1 ? 'game.rank3' : 'game.rank0';
    const prog = el('div', 'g-prog'); for (let i = 0; i < ROUNDS; i++) prog.appendChild(el('i', 'done'));
    const code = el('p', 'g-code'); code.append(el('span', 'mono', t('game.codeLabel')), el('b', null, CODE));
    const claim = el('a', 'btn', t('game.claim'));
    claim.href = C.TELEGRAM || '#contact'; claim.target = '_blank'; claim.rel = 'noopener';
    const hint = el('p', 'g-note ok'); hint.setAttribute('role', 'status');
    claim.addEventListener('click', () => {
      try { navigator.clipboard.writeText(CODE); hint.textContent = t('game.copied'); } catch { /* не критично */ }
    });
    const again = el('button', 'btn ghost', t('game.again')); again.type = 'button';
    again.addEventListener('click', () => { resetSeries(); startRound(); });
    body.replaceChildren(
      prog,
      el('h3', 'g-q', t(rank)),
      el('p', 'g-score mono', t('game.score', wins, draws, losses)),
      el('p', 'g-bonus-l mono', t('game.bonusLabel')),
      el('p', 'g-bonus', bonusText()),
      code,
      el('div', 'g-row'),
      hint
    );
    $('.g-row', body).append(claim, again);
  }

  function resetSeries() { clearTimeout(timer); round = 0; wins = draws = losses = 0; ended = false; }

  function openGame() {
    if (pop.open) pop.close();
    resetSeries(); startRound();
    if (!game.open) {
      game.showModal(); document.documentElement.classList.add('lock'); game.focus();
      // занавес при открытии: только если пользователь не просил уменьшить движение
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { game.classList.add('intro'); clearTimeout(introT); introT = setTimeout(() => game.classList.remove('intro'), 1500); }
    }
  }
  const closeGame = () => game.close();
  game.addEventListener('close', () => { clearTimeout(timer); document.documentElement.classList.remove('lock'); });
  $('#g-close').onclick = closeGame;
  game.addEventListener('click', e => { if (e.target === game) closeGame(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-game]')) openGame(); });

  // смена языка в процессе игры: перерисовываем текущий экран
  I18N.onChange(() => { if (game.open) render(); });

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
