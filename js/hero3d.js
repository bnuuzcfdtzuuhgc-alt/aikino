// 3D-сцена главного экрана: бесконечная киноплёнка («лента»), завязанная узлом.
// Чистый WebGL без библиотек: один объект, один draw call, один источник света.
// Качество подстраивается под устройство; вне экрана и в фоне рендер останавливается.
(() => {
  const root = document.documentElement;
  const canvas = document.getElementById('hero3d');
  const ready = () => { if (window.PRE) window.PRE.done('hero'); };
  const fallback = () => { root.classList.add('no-3d'); ready(); };
  if (!canvas) return ready();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const opts = { alpha: true, antialias: true, premultipliedAlpha: true, depth: true, stencil: false, powerPreference: 'default' };
  let gl = null, gl2 = false;
  try {
    gl = canvas.getContext('webgl2', opts); gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  } catch { gl = null; }
  if (!gl) return fallback();
  const deriv = gl2 || !!gl.getExtension('OES_standard_derivatives');

  /* ---------- шейдеры ---------- */
  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aSide; attribute vec2 aUv;
uniform mat3 uRot; uniform vec3 uOff; uniform float uScale; uniform mat4 uProj;
varying vec3 vPos; varying vec3 vNor; varying vec3 vSide; varying vec2 vUv;
void main(){
  vec3 p = uRot * aPos * uScale + uOff;
  vPos = p; vNor = uRot * aNor; vSide = uRot * aSide; vUv = aUv;
  gl_Position = uProj * vec4(p, 1.0);
}`;
  const FS = `
varying vec3 vPos; varying vec3 vNor; varying vec3 vSide; varying vec2 vUv;
uniform float uFlow; uniform vec2 uPtr; uniform vec4 uDim; uniform float uHard;
float aa(float d){
#ifdef DERIV
  float w = fwidth(d) * 0.75 + 1e-5;
#else
  float w = 0.004;
#endif
  return smoothstep(-w, w, d);
}
void main(){
  float u = vUv.x + uFlow, v = vUv.y;
  // перфорация по краям: четыре отверстия на кадр, как у 35-мм плёнки
  float pu = (abs(fract(u * 4.0) - 0.5) - 0.2) * uDim.x * 0.25;
  float pv = (abs(abs(v - 0.5) - 0.415) - 0.036) * uDim.y;
  float r = uDim.y * 0.012;
  float hole = length(max(vec2(pu, pv) + r, 0.0)) + min(max(pu, pv) + r, 0.0) - r;
  float alpha = aa(hole);
  if (uHard > 0.5 && alpha < 0.5) discard;
  if (alpha < 0.02) discard;

  // окно кадра
  float fu = (abs(fract(u) - 0.5) - 0.455) * uDim.x;
  float fv = (abs(v - 0.5) - 0.335) * uDim.y;
  float win = 1.0 - aa(max(fu, fv));

  float face = gl_FrontFacing ? 1.0 : -1.0;
  vec3 N = normalize(vNor) * face;
  // лёгкий изгиб поперёк ленты: блик ложится мягкой дугой, а не плоским пятном
  N = normalize(N + normalize(vSide) * (v - 0.5) * 0.55 * face);
  vec3 V = normalize(-vPos);
  vec3 R = reflect(-V, N);
  vec3 L = normalize(vec3(-0.45 + uPtr.x * 0.7, 0.85 + uPtr.y * 0.5, 0.75));

  vec3 red = mix(vec3(0.6, 0.03, 0.06), vec3(0.86, 0.06, 0.1), win);
  vec3 ink = mix(vec3(0.03, 0.03, 0.032), vec3(0.065, 0.065, 0.07), win);
  vec3 base = face > 0.0 ? red : ink;

  float ndl = dot(N, L) * 0.5 + 0.5;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  // студийный свет: большой софтбокс сверху и узкий блик от ключевого источника
  float box = smoothstep(0.25, 0.5, R.y) * smoothstep(1.0, 0.8, R.y) * smoothstep(-0.75, -0.25, R.x) * smoothstep(0.85, 0.35, R.x);
  float spec = pow(max(dot(R, L), 0.0), 70.0);
  float gloss = mix(0.55, 1.0, win);

  vec3 col = base * (0.5 + 0.62 * ndl * ndl);
  vec3 sheen = face > 0.0 ? vec3(1.0, 0.62, 0.58) : vec3(0.62, 0.61, 0.6);
  col += sheen * (box * 0.2 * gloss + fres * 0.16);
  col += vec3(1.0) * spec * 0.7 * gloss;
  // мягкое затенение в глубине узла
  col *= mix(0.62, 1.0, smoothstep(-uDim.w, uDim.w, vPos.z + uDim.z));

  OUT = vec4(col * mix(1.0, alpha, uHard), alpha);
}`;
  const head = gl2
    ? ['#version 300 es\n#define attribute in\n#define varying out\n', '#version 300 es\nprecision highp float;\n#define varying in\n#define DERIV\nout vec4 outColor;\n#define OUT outColor\n']
    : ['', (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV\n' : '') + 'precision highp float;\n#define OUT gl_FragColor\n'];

  let prog = null, uni = {}, count = 0, frameLen = 0;
  const W = 0.37;         // ширина ленты
  const FRAMES = 32;      // кадров на всей длине

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }

  /* ---------- геометрия: лента вдоль торического узла (2,3) ---------- */
  function build() {
    const SEG = coarse ? 300 : 460, P = 2, Q = 3, R0 = 1, r0 = 0.46, TWIST = 1;
    const pt = t => {
      const c = R0 + r0 * Math.cos(Q * t);
      return [c * Math.cos(P * t), c * Math.sin(P * t), r0 * Math.sin(Q * t)];
    };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const TAU = Math.PI * 2, e = 1e-4;
    // длина дуги: кадры плёнки одинаковой длины по всей ленте
    const len = [0]; let prev = pt(0);
    for (let i = 1; i <= SEG; i++) { const p = pt(i / SEG * TAU), d = sub(p, prev); len.push(len[i - 1] + Math.hypot(d[0], d[1], d[2])); prev = p; }
    const total = len[SEG]; frameLen = total / FRAMES;
    const data = new Float32Array((SEG + 1) * 2 * 11);
    let o = 0;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG * TAU, p = pt(t);
      const T = norm(sub(pt(t + e), pt(t - e)));
      const out = norm(sub(p, [R0 * Math.cos(P * t), R0 * Math.sin(P * t), 0]));
      const B = norm(cross(T, out)), N0 = cross(B, T);
      const a = TWIST * t, ca = Math.cos(a), sa = Math.sin(a);
      const side = [B[0] * ca + N0[0] * sa, B[1] * ca + N0[1] * sa, B[2] * ca + N0[2] * sa];
      const n = norm(cross(T, side));
      const u = len[i] / total * FRAMES;
      for (let k = 0; k < 2; k++) {
        const s = k ? 0.5 : -0.5;
        data[o++] = p[0] + side[0] * W * s; data[o++] = p[1] + side[1] * W * s; data[o++] = p[2] + side[2] * W * s;
        data[o++] = n[0]; data[o++] = n[1]; data[o++] = n[2];
        data[o++] = side[0]; data[o++] = side[1]; data[o++] = side[2];
        data[o++] = u; data[o++] = k;
      }
    }
    count = (SEG + 1) * 2;
    return data;
  }

  function init() {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, head[0] + VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, head[1] + FS));
    ['aPos', 'aNor', 'aSide', 'aUv'].forEach((n, i) => gl.bindAttribLocation(prog, i, n));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);
    ['uRot', 'uOff', 'uScale', 'uProj', 'uFlow', 'uPtr', 'uDim', 'uHard'].forEach(n => { uni[n] = gl.getUniformLocation(prog, n); });
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, build(), gl.STATIC_DRAW);
    const st = 44; [[0, 3, 0], [1, 3, 12], [2, 3, 24], [3, 2, 36]].forEach(([i, n, off]) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, st, off); });
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    // сглаживание краёв отверстий через MSAA; без него — жёсткая обрезка
    const msaa = gl.getContextAttributes().antialias && gl.getParameter(gl.SAMPLES) > 1;
    if (msaa) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    else { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    gl.uniform1f(uni.uHard, msaa ? 0 : 1);
  }
  try { init(); } catch (err) { console.warn('3D hero disabled:', err.message); return fallback(); }

  /* ---------- камера и композиция ---------- */
  const CAM = 7.2, FOV = 28 * Math.PI / 180, F = 1 / Math.tan(FOV / 2);
  const proj = new Float32Array(16), rot = new Float32Array(9);
  const caps = coarse ? [1.5, 1.25, 1, 0.75] : [2, 1.5, 1, 0.75];
  let capI = 0, w = 0, h = 0, cssW = 0, cssH = 0, off = [0, 0, 0], scale = 1;

  function layout() {
    cssW = canvas.clientWidth; cssH = canvas.clientHeight;
    if (!cssW || !cssH) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, caps[capI]);
    w = Math.max(2, Math.round(cssW * dpr)); h = Math.max(2, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const asp = w / h, near = 1, far = 30;
    proj.fill(0);
    proj[0] = F / asp; proj[5] = F; proj[10] = (far + near) / (near - far); proj[11] = -1; proj[14] = 2 * far * near / (near - far);
    // положение и размер объекта задаёт CSS (переменные --gx, --gy, --gs): у телефона и компьютера разные композиции
    const cs = getComputedStyle(canvas);
    const gx = parseFloat(cs.getPropertyValue('--gx')) || 0, gy = parseFloat(cs.getPropertyValue('--gy')) || 0, gs = parseFloat(cs.getPropertyValue('--gs')) || 0.5;
    const halfH = Math.tan(FOV / 2) * CAM, halfW = halfH * asp;
    off = [gx * halfW, gy * halfH, -CAM];
    scale = gs * Math.min(halfH, halfW) / 1.5;
    return true;
  }

  /* ---------- состояние ---------- */
  let px = 0, py = 0, tx = 0, ty = 0, spin = 0, flow = 0, last = 0, visible = true, running = false, firstFrame = false, stat = false;
  let slowN = 0, slowSum = 0, raf = 0;

  function setRot(ax, ay, az) {
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    // R = Rx * Ry * Rz, по столбцам
    rot[0] = cy * cz;                 rot[1] = sx * sy * cz + cx * sz;  rot[2] = -cx * sy * cz + sx * sz;
    rot[3] = -cy * sz;                rot[4] = -sx * sy * sz + cx * cz; rot[5] = cx * sy * sz + sx * cz;
    rot[6] = sy;                      rot[7] = -sx * cy;                rot[8] = cx * cy;
  }

  function draw() {
    const sc = Math.min(window.scrollY, 1400);
    setRot(0.5 + py * 0.28 + sc * 0.0006, spin + px * 0.5 + sc * 0.0016, -0.18 + spin * 0.35);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix3fv(uni.uRot, false, rot);
    gl.uniformMatrix4fv(uni.uProj, false, proj);
    gl.uniform3f(uni.uOff, off[0], off[1], off[2]);
    gl.uniform1f(uni.uScale, scale);
    gl.uniform1f(uni.uFlow, flow);
    gl.uniform2f(uni.uPtr, px, py);
    gl.uniform4f(uni.uDim, frameLen, W, CAM, scale * 1.2);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
    if (!firstFrame) { firstFrame = true; root.classList.add('gl-on'); ready(); }
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    px += (tx - px) * Math.min(1, dt * 4); py += (ty - py) * Math.min(1, dt * 4);
    spin += dt * 0.16; flow += dt * 0.55;
    draw();
    // адаптивное качество: если кадры идут медленно, снижаем разрешение, в крайнем случае оставляем неподвижный кадр
    if (dt > 0) { slowSum += dt; slowN++; }
    if (slowN >= 45) {
      const avg = slowSum / slowN; slowN = 0; slowSum = 0;
      if (avg > 0.03) {
        if (capI < caps.length - 1) { capI++; layout(); }
        else if (avg > 0.045) { stat = true; running = false; return; }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  const play = () => {
    const want = visible && !document.hidden && !reduce && !stat;
    if (want && !running) { running = true; last = performance.now(); slowN = 0; slowSum = 0; if (!raf) raf = requestAnimationFrame(frame); }
    else if (!want) running = false;
  };
  const still = () => { if (!running && layout()) draw(); };

  if (!layout()) { return fallback(); }
  spin = 0.9;
  draw();

  if ('ResizeObserver' in window) {
    let rr = 0;
    new ResizeObserver(() => { if (!rr) rr = requestAnimationFrame(() => { rr = 0; if (layout() && !running) draw(); }); }).observe(canvas);
  } else addEventListener('resize', still);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; play(); }).observe(canvas);
  document.addEventListener('visibilitychange', play);
  addEventListener('pointermove', e => {
    if (!visible) return;
    tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  addEventListener('scroll', () => { if ((reduce || stat) && visible && !running && !raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }, { passive: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; root.classList.remove('gl-on'); root.classList.add('no-3d'); });
  canvas.addEventListener('webglcontextrestored', () => {
    try { uni = {}; init(); layout(); root.classList.remove('no-3d'); root.classList.add('gl-on'); draw(); play(); } catch { /* остаётся запасная графика */ }
  });
  play();
})();
