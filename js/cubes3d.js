// 3D-сцена главного экрана на компьютере: шар из кубиков, с которым можно играть мышкой.
// Мышь расталкивает кубики, зажать и тянуть — вращать шар, клик — взрыв, потом кубики собираются обратно.
// Чистый WebGL без библиотек: все кубики в одном буфере, один draw call. На телефоне вместо этого голова (hero3d.js).
(() => {
  const DESK = '(min-width: 900px) and (hover: hover) and (pointer: fine)';
  if (!matchMedia(DESK).matches) return;
  const root = document.documentElement;
  const canvas = document.getElementById('hero3d'), hero = document.querySelector('.hero');
  const ready = () => { if (window.PRE) window.PRE.done('hero'); };
  const fallback = () => { root.classList.add('no-3d'); ready(); };
  if (!canvas || !hero) return ready();
  root.classList.add('cubes');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, depth: true }) || canvas.getContext('experimental-webgl');
  if (!gl) return fallback();

  /* ---------- шейдеры ---------- */
  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol; attribute vec3 aLoc;
uniform mat4 uProj;
varying vec3 vNor; varying vec3 vCol; varying vec3 vLoc; varying vec3 vPos;
void main(){ vNor = aNor; vCol = aCol; vLoc = aLoc; vPos = aPos; gl_Position = uProj * vec4(aPos, 1.0); }`;
  const FS = `
precision mediump float;
varying vec3 vNor; varying vec3 vCol; varying vec3 vLoc; varying vec3 vPos;
uniform vec2 uLight;
void main(){
  vec3 n = normalize(vNor);
  vec3 L = normalize(vec3(-0.5 + uLight.x * 0.4, 0.75 - uLight.y * 0.3, 0.6));
  vec3 V = normalize(-vPos);
  float dif = max(dot(n, L), 0.0);
  float amb = 0.42 + 0.2 * n.y;
  vec3 col = vCol * (amb + 0.62 * dif);
  col += vec3(0.25) * pow(max(dot(reflect(-L, n), V), 0.0), 40.0);
  // фаска по рёбрам: светлые кубики темнеют к краю, тёмные светлеют
  vec3 a = abs(vLoc) * 2.0;
  float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z));
  float s = a.x + a.y + a.z - mx - mn;
  float e = smoothstep(0.78, 0.97, s);
  float lum = dot(vCol, vec3(0.333));
  col = mix(col, lum > 0.5 ? col * 0.72 : col + 0.16, e * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  let prog, uProj, uLight, buf;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    ['aPos', 'aNor', 'aCol', 'aLoc'].forEach((n, i) => gl.bindAttribLocation(prog, i, n));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog);
    uProj = gl.getUniformLocation(prog, 'uProj'); uLight = gl.getUniformLocation(prog, 'uLight');
  } catch (e) { console.warn('3D cubes disabled:', e.message); return fallback(); }

  /* ---------- кубики: шар из вокселей ---------- */
  const R = 3.4, cubes = [];
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) {
    if (Math.hypot(x, y, z) > R) continue;
    const r = Math.random();
    const f = 2.2 + Math.random() * 2.5;
    cubes.push({ h: [x, y, z], p: [x * f + (Math.random() - .5) * 6, y * f + (Math.random() - .5) * 6, z * f], v: [0, 0, 0], a: [0, 0], w: [0, 0], t: r < 0.07 ? 2 : r < 0.32 ? 1 : 0 });
  }
  const N = cubes.length;
  // цвета: 0 — белый, 1 — чёрный, 2 — красный; в тёмной теме чёрный становится графитовым
  const COL = dark => [[0.95, 0.95, 0.95], dark ? [0.32, 0.32, 0.33] : [0.09, 0.09, 0.1], [0.89, 0.08, 0.12]];
  const FACES = [
    [[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]],
    [[-1, 0, 0], [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]]],
    [[0, 1, 0], [[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]]],
    [[0, -1, 0], [[-.5, -.5, .5], [-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5]]],
    [[0, 0, 1], [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]]],
    [[0, 0, -1], [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]]]
  ];
  const TRI = [0, 1, 2, 0, 2, 3];
  const STRIDE = 12, data = new Float32Array(N * 36 * STRIDE);
  buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  [0, 1, 2, 3].forEach(i => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, STRIDE * 4, i * 12); });
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);

  /* ---------- камера ---------- */
  const CAM = 7.2, TAN = Math.tan(14 * Math.PI / 180), proj = new Float32Array(16);
  let w = 0, h = 0, cssW = 0, cssH = 0, halfW = 1, halfH = 1, C = [0, 0, -CAM], scale = 1;
  // холст заканчивается над тёмной полосой под главным экраном
  const slate = document.querySelector('.hero .slate');
  const fitSlate = () => { if (slate) canvas.style.setProperty('--sh', slate.offsetHeight + 'px'); };
  fitSlate(); if (slate && 'ResizeObserver' in window) new ResizeObserver(fitSlate).observe(slate);
  function layout() {
    cssW = canvas.clientWidth; cssH = canvas.clientHeight;
    if (!cssW || !cssH) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.round(cssW * dpr); h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const asp = w / h, near = 1, far = 40, F = 1 / TAN;
    proj.fill(0); proj[0] = F / asp; proj[5] = F; proj[10] = (far + near) / (near - far); proj[11] = -1; proj[14] = 2 * far * near / (near - far);
    const cs = getComputedStyle(canvas);
    const gx = parseFloat(cs.getPropertyValue('--cx')) || 0.5, gy = parseFloat(cs.getPropertyValue('--cy')) || 0.2, gs = parseFloat(cs.getPropertyValue('--cs')) || 0.8;
    halfH = TAN * CAM; halfW = halfH * asp;
    C = [gx * halfW, gy * halfH, -CAM];
    scale = gs * halfH / (R + 0.6);
    return true;
  }

  /* ---------- вращение шара ---------- */
  let rx = -0.35, ry = 0.6, vrx = 0, vry = 0.25;
  const M = new Float32Array(9);
  const rotM = (out, ax, ay) => {
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    // R = Rx * Ry (по строкам)
    out[0] = cy; out[1] = 0; out[2] = sy;
    out[3] = sx * sy; out[4] = cx; out[5] = -sx * cy;
    out[6] = -cx * sy; out[7] = sx; out[8] = cx * cy;
    return out;
  };
  const mul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const L3 = new Float32Array(9), T3 = new Float32Array(9);
  const mm = (a, b, o) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]; return o; };

  /* ---------- мышь ---------- */
  let mx = 9, my = 9, mOn = false, px = 0, py = 0, drag = null, moved = 0, hover = false;
  const toLocal = e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width * 2 - 1, ny = 1 - (e.clientY - r.top) / r.height * 2;
    return [(nx * halfW - C[0]) / scale, (ny * halfH - C[1]) / scale];
  };
  const near = (lx, ly) => Math.hypot(lx, ly) < R + 1.6;
  addEventListener('pointermove', e => {
    px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1;
    const [lx, ly] = toLocal(e); mx = lx; my = ly; mOn = true;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vry = dx * 0.35; vrx = dy * 0.35;
    }
    const hv = near(lx, ly) && e.target.closest && !e.target.closest('a,button,input,.hero-row,.slate');
    if (hv !== hover) { hover = hv; hero.classList.toggle('cubes-hover', hv); }
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mOn = false; });
  hero.addEventListener('pointerdown', e => {
    if (e.button !== 0 || (e.target.closest && e.target.closest('a,button,input,.slate'))) return;
    const [lx, ly] = toLocal(e); if (!near(lx, ly)) return;
    e.preventDefault(); drag = { x: e.clientX, y: e.clientY, lx, ly }; moved = 0;
    hero.classList.add('cubes-drag');
    try { hero.setPointerCapture(e.pointerId); } catch { /* не критично */ }
  });
  const up = () => {
    if (!drag) return;
    if (moved < 6) burst(drag.lx, drag.ly);
    drag = null; hero.classList.remove('cubes-drag');
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  function burst(lx, ly) {
    cubes.forEach(c => {
      const d = [c.p[0] - lx, c.p[1] - ly, c.p[2] + 2], l = Math.hypot(...d) || 1, k = 14 + Math.random() * 16;
      c.v[0] += d[0] / l * k; c.v[1] += d[1] / l * k + 4; c.v[2] += d[2] / l * k;
      c.w[0] += (Math.random() - 0.5) * 30; c.w[1] += (Math.random() - 0.5) * 30;
    });
    hint && hint.classList.add('used');
  }

  /* ---------- шаг физики и отрисовка ---------- */
  function step(dt) {
    // шар: инерция вращения и медленное собственное вращение
    ry += vry * dt; rx += vrx * dt;
    const k = Math.exp(-dt * (drag ? 8 : 1.6));
    vry = vry * k + (drag ? 0 : 0.25 * (1 - k)); vrx *= k;
    rx += (-0.35 - rx) * dt * 0.6;
    rotM(M, rx + py * 0.12, ry + px * 0.15);
    const K = 46, D = 8.5, Rm = 2.6;
    for (const c of cubes) {
      const home = mul(M, c.h);
      let fx = (home[0] - c.p[0]) * K - c.v[0] * D, fy = (home[1] - c.p[1]) * K - c.v[1] * D, fz = (home[2] - c.p[2]) * K - c.v[2] * D;
      if (mOn && !drag) {
        // мышь расталкивает кубики, сильнее — ближние к зрителю
        const dx = c.p[0] - mx, dy = c.p[1] - my, d = Math.hypot(dx, dy);
        if (d < Rm) {
          const f = (1 - d / Rm) * 140 * (0.55 + Math.max(0, c.p[2]) / (R * 2)), l = d || 1;
          fx += dx / l * f; fy += dy / l * f; fz += f * 0.7;
          c.w[0] += dy * f * 0.004; c.w[1] -= dx * f * 0.004;
        }
      }
      c.v[0] += fx * dt; c.v[1] += fy * dt; c.v[2] += fz * dt;
      c.p[0] += c.v[0] * dt; c.p[1] += c.v[1] * dt; c.p[2] += c.v[2] * dt;
      // собственный поворот кубика пружинит обратно к нулю
      for (let i = 0; i < 2; i++) { c.w[i] += (-c.a[i] * 30 - c.w[i] * 4) * dt; c.a[i] += c.w[i] * dt; }
    }
  }
  function draw() {
    const dark = root.dataset.theme === 'dark', cols = COL(dark), hs = 0.88;
    let o = 0;
    for (const c of cubes) {
      rotM(L3, c.a[0], c.a[1]); mm(M, L3, T3);
      const col = cols[c.t];
      const cx = C[0] + c.p[0] * scale, cy = C[1] + c.p[1] * scale, cz = C[2] + c.p[2] * scale, s = hs * scale;
      for (const [n, q] of FACES) {
        const wn = mul(T3, n);
        for (const ti of TRI) {
          const v = q[ti], wv = mul(T3, v);
          data[o++] = cx + wv[0] * s; data[o++] = cy + wv[1] * s; data[o++] = cz + wv[2] * s;
          data[o++] = wn[0]; data[o++] = wn[1]; data[o++] = wn[2];
          data[o++] = col[0]; data[o++] = col[1]; data[o++] = col[2];
          data[o++] = v[0]; data[o++] = v[1]; data[o++] = v[2];
        }
      }
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.uniformMatrix4fv(uProj, false, proj);
    gl.uniform2f(uLight, px, py);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, N * 36);
  }

  let visible = true, running = false, raf = 0, last = 0, first = false;
  const frame = now => {
    raf = 0; if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    step(dt); draw();
    if (!first) { first = true; root.classList.add('gl-on'); ready(); }
    raf = requestAnimationFrame(frame);
  };
  const play = () => {
    const want = visible && !document.hidden;
    if (want && !running) { running = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
    else if (!want) running = false;
  };
  if (!layout()) return fallback();
  rotM(M, rx, ry); step(0); draw(); first = true; root.classList.add('gl-on'); ready();
  if (reduce) vry = 0.08;
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (layout() && !running) draw(); }).observe(canvas);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; play(); }).observe(canvas);
  document.addEventListener('visibilitychange', play);
  if ('MutationObserver' in window) new MutationObserver(() => { if (!running) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; root.classList.add('no-3d'); });

  // подсказка «кубики можно трогать» исчезает после первой игры
  const hint = document.getElementById('cubes-hint');
  if (hint) hint.hidden = false;
  play();
})();
