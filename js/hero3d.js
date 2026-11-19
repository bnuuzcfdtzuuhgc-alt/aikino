// 3D-сцена главного экрана: гипсовая голова в чёрной лаковой маске.
// Чистый WebGL без библиотек: лицо описано функцией расстояния (SDF) и рисуется лучами в одном шейдере.
// Голова поворачивается за курсором, глаза следят за ним. Качество подстраивается под устройство;
// вне экрана и в фоне рендер останавливается.
(() => {
  const root = document.documentElement;
  const canvas = document.getElementById('hero3d');
  const ready = () => { if (window.PRE) window.PRE.done('hero'); };
  const fallback = () => { root.classList.add('no-3d'); ready(); };
  if (!canvas) return ready();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const opts = { alpha: true, antialias: false, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'default' };
  let gl = null, gl2 = false;
  try {
    gl = canvas.getContext('webgl2', opts); gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  } catch { gl = null; }
  if (!gl) return fallback();

  /* ---------- шейдеры ---------- */
  const VS = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS = `
uniform vec2 uRes; uniform mat3 uRot; uniform vec3 uOff; uniform float uScale; uniform float uTan;
uniform float uDark; uniform vec3 uLook; uniform vec2 uLight; uniform float uQ;

float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
float sdEll2(vec2 p, vec2 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }

const vec3 EYE = vec3(0.265, 0.05, 0.665);

// основа лица без носа и глазниц: по ней же «ложится» маска
float faceBase(vec3 p, vec3 q){
  float d = sdEll(p - vec3(0.0, 0.16, -0.06), vec3(0.76, 0.87, 0.86));        // череп
  d = smin(d, sdEll(p - vec3(0.0, -0.3, 0.15), vec3(0.55, 0.62, 0.64)), 0.22); // нижняя часть лица
  d = smin(d, sdEll(p - vec3(0.0, -0.75, 0.4), vec3(0.23, 0.18, 0.22)), 0.18); // подбородок
  d = smin(d, sdEll(q - vec3(0.36, -0.07, 0.49), vec3(0.2, 0.15, 0.2)), 0.16); // скулы
  d = smin(d, sdEll(p - vec3(0.0, 0.25, 0.6), vec3(0.5, 0.14, 0.2)), 0.12);    // надбровье
  return d;
}
float headD(vec3 p, vec3 q){
  float d = faceBase(p, q);
  d = smax(d, -sdEll(q - vec3(0.265, 0.05, 0.8), vec3(0.15, 0.09, 0.15)), 0.07); // глазницы
  float n = sdCap(p, vec3(0.0, 0.14, 0.8), vec3(0.0, -0.19, 0.975), 0.055);      // нос
  n = smin(n, sdEll(p - vec3(0.0, -0.23, 0.9), vec3(0.12, 0.07, 0.09)), 0.06);
  d = smin(d, n, 0.08);
  float lip = sdEll(p - vec3(0.0, -0.43, 0.765), vec3(0.16, 0.036, 0.07));       // губы
  lip = smin(lip, sdEll(p - vec3(0.0, -0.515, 0.74), vec3(0.14, 0.042, 0.07)), 0.03);
  d = smin(d, lip, 0.06);
  d = smax(d, -sdEll(p - vec3(0.0, -0.47, 0.84), vec3(0.17, 0.008, 0.09)), 0.015);
  d = smin(d, sdEll(q - vec3(0.73, 0.0, -0.03), vec3(0.07, 0.2, 0.13)), 0.05);  // уши
  d = smin(d, sdCap(p, vec3(0.0, -0.6, -0.12), vec3(0.0, -1.8, -0.22), 0.34), 0.2); // шея
  return max(d, -1.6 - p.y);
}
float eyeD(vec3 q){ return length(q - EYE) - 0.11; }
// маска-домино: тонкая оболочка поверх лица, вырезанная по контуру, с прорезями для глаз
float maskD(vec3 p, vec3 q){
  float b = smin(faceBase(p, q), sdCap(p, vec3(0.0, 0.16, 0.78), vec3(0.0, -0.05, 0.9), 0.07), 0.08);
  float shell = abs(b - 0.03) - 0.022;
  float mx = q.x, my = p.y - 0.07 + 0.16 * mx * mx;
  float top = 0.17 - 0.07 * smoothstep(0.3, 0.78, mx);
  float bot = -0.13 + 0.07 * smoothstep(0.16, 0.0, mx) + 0.05 * smoothstep(0.4, 0.78, mx);
  vec2 e = vec2(mx - 0.7, max(my - top, bot - my)) + 0.06;            // скруглённые концы
  float o = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - 0.06;
  o = max(o, -sdEll2(q.xy - vec2(0.265, 0.06), vec2(0.115, 0.062)));
  o = max(o, 0.15 - p.z);
  return max(shell, o * 0.8);
}
float map(vec3 p){
  vec3 q = vec3(abs(p.x), p.yz);
  return min(min(headD(p, q), maskD(p, q)), eyeD(q));
}
vec3 nrm(vec3 p){
  const vec2 k = vec2(1.0, -1.0); const float e = 0.0015;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) + k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}
float ao(vec3 p, vec3 n){
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++){ float h = 0.02 + 0.06 * float(i); o += (h - map(p + n * h)) * s; s *= 0.7; }
  return clamp(1.0 - 1.7 * o, 0.0, 1.0);
}
float shadow(vec3 ro, vec3 rd){
  float r = 1.0, t = 0.03;
  for (int i = 0; i < 22; i++){
    float h = map(ro + rd * t); r = min(r, 8.0 * h / t); t += clamp(h, 0.02, 0.2);
    if (r < 0.005 || t > 2.5) break;
  }
  return clamp(r, 0.0, 1.0);
}
vec3 shade(vec3 p, vec3 rd){
  vec3 q = vec3(abs(p.x), p.yz);
  float dh = headD(p, q), dm = maskD(p, q), de = eyeD(q);
  vec3 n = nrm(p), v = -rd;
  vec3 L = normalize(vec3(-0.55 + uLight.x * 0.45, 0.62 - uLight.y * 0.25, 0.62));
  float dif = max(dot(n, L), 0.0);
  float sh = uQ > 0.5 ? shadow(p + n * 0.01, L) : 1.0;
  float occ = ao(p, n);
  float fill = clamp(0.5 + 0.5 * dot(n, normalize(vec3(0.75, -0.1, 0.6))), 0.0, 1.0);
  float top = clamp(0.5 + 0.5 * n.y, 0.0, 1.0);
  float fre = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 h = normalize(L + v);
  vec3 col;
  if (dm <= min(dh, de)) {
    // чёрный лак: тёмная основа, отражение софтбокса и узкий блик
    vec3 r = reflect(rd, n);
    float box = smoothstep(0.25, 0.55, r.y) * smoothstep(-0.95, -0.35, r.x) * smoothstep(0.5, 0.05, r.x);
    col = vec3(0.022) * (0.4 + 0.6 * dif);
    col += vec3(0.95) * pow(max(dot(n, h), 0.0), 110.0) * sh;
    col += vec3(0.3) * box + vec3(0.1) * fre;
    col *= mix(0.55, 1.0, occ);
  } else {
    // матовый гипс
    float alb = mix(0.93, 0.82, uDark);
    vec3 base = vec3(alb, alb * 0.985, alb * 0.965);
    col = base * (0.2 * top + 0.2 * fill + 0.74 * dif * sh) * occ;
    col += vec3(0.05) * fre + vec3(0.06) * pow(max(dot(n, h), 0.0), 24.0) * sh;
    if (de < dh) {
      // зрачок смотрит туда, где курсор
      vec3 c = vec3(sign(p.x) * EYE.x, EYE.yz);
      float k = dot(normalize(p - c), normalize(uLook - c));
      col *= mix(1.0, 0.55, smoothstep(0.93, 0.945, k));   // радужка
      col *= mix(1.0, 0.1, smoothstep(0.97, 0.978, k));    // зрачок
      col += vec3(0.55) * pow(max(dot(n, h), 0.0), 140.0);
    }
  }
  return col;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 rv = normalize(vec3(uv.x * uTan * uRes.x / uRes.y, uv.y * uTan, -1.0));
  // в систему координат головы: v * M = transpose(M) * v
  vec3 ro = (-uOff * uRot) / uScale;
  vec3 rd = normalize(rv * uRot);
  vec3 oc = ro - vec3(0.0, -0.25, 0.05);
  float b = dot(oc, rd), disc = b * b - (dot(oc, oc) - 2.7);
  if (disc < 0.0) { OUT = vec4(0.0); return; }
  float sq = sqrt(disc), t = max(-b - sq, 0.0), tEnd = -b + sq;
  float pix = 2.0 * uTan / uRes.y;
  float minR = 1e9, tMin = t; bool hit = false;
  for (int i = 0; i < 110; i++){
    float d = map(ro + rd * t);
    float r = d / (pix * t);
    if (r < minR) { minR = r; tMin = t; }
    if (r < 0.25) { hit = true; break; }
    t += d * 0.9;
    if (t > tEnd) break;
  }
  float a = hit ? 1.0 : clamp(1.0 - minR, 0.0, 1.0);
  if (a <= 0.0) { OUT = vec4(0.0); return; }
  vec3 p = ro + rd * (hit ? t : tMin);
  vec3 col = shade(p, rd);
  a *= smoothstep(-1.55, -0.95, p.y); // шея растворяется в фоне
  OUT = vec4(col * a, a);
}`;
  const head = gl2
    ? ['#version 300 es\n#define attribute in\n', '#version 300 es\nprecision highp float;\nout vec4 outColor;\n#define OUT outColor\n']
    : ['', 'precision highp float;\n#define OUT gl_FragColor\n'];

  let prog = null, uni = {};

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }

  function init() {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, head[0] + VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, head[1] + FS));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);
    ['uRes', 'uRot', 'uOff', 'uScale', 'uTan', 'uDark', 'uLook', 'uLight', 'uQ'].forEach(n => { uni[n] = gl.getUniformLocation(prog, n); });
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
  }
  try { init(); } catch (err) { console.warn('3D hero disabled:', err.message); return fallback(); }

  /* ---------- камера и композиция ---------- */
  const CAM = 7.2, FOV = 28 * Math.PI / 180, TAN = Math.tan(FOV / 2);
  const rot = new Float32Array(9);
  // лучевой рендер тяжелее сетки, поэтому разрешение ниже; при медленных кадрах снижается ещё
  const caps = coarse ? [1, 0.85, 0.7, 0.55] : [1.25, 1, 0.8, 0.65];
  let capI = 0, w = 0, h = 0, off = [0, 0, -CAM], scale = 1, halfW = 1, halfH = 1;

  function layout() {
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, caps[capI]);
    w = Math.max(2, Math.round(cssW * dpr)); h = Math.max(2, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    // положение и размер головы задаёт CSS (переменные --gx, --gy, --gs): у телефона и компьютера разные композиции
    const cs = getComputedStyle(canvas);
    const gx = parseFloat(cs.getPropertyValue('--gx')) || 0, gy = parseFloat(cs.getPropertyValue('--gy')) || 0, gs = parseFloat(cs.getPropertyValue('--gs')) || 0.5;
    halfH = TAN * CAM; halfW = halfH * (w / h);
    off = [gx * halfW, gy * halfH, -CAM];
    scale = gs * Math.min(halfH, halfW * 1.3) / 1.5;
    return true;
  }

  /* ---------- состояние ---------- */
  let px = 0, py = 0, tx = 0, ty = 0, time = 0, last = 0, visible = true, running = false, firstFrame = false, stat = false;
  let slowN = 0, slowSum = 0, raf = 0;

  function setRot(ax, ay, az) {
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    // R = Rx * Ry * Rz, по столбцам
    rot[0] = cy * cz;                 rot[1] = sx * sy * cz + cx * sz;  rot[2] = -cx * sy * cz + sx * sz;
    rot[3] = -cy * sz;                rot[4] = -sx * sy * sz + cx * cz; rot[5] = cx * sy * sz + sx * cz;
    rot[6] = sy;                      rot[7] = -sx * cy;                rot[8] = cx * cy;
  }
  // точка в мировых координатах -> в систему головы (R^T * (v - off) / scale)
  const toLocal = v => {
    const d = [v[0] - off[0], v[1] - off[1], v[2] - off[2]];
    return [0, 1, 2].map(c => (rot[c * 3] * d[0] + rot[c * 3 + 1] * d[1] + rot[c * 3 + 2] * d[2]) / scale);
  };

  function draw() {
    const sc = Math.min(window.scrollY, 1400);
    // курсор: голова поворачивается к нему, плюс лёгкое «дыхание»
    const yaw = px * 0.55 + Math.sin(time * 0.35) * 0.12 - off[0] / CAM * 0.6;
    const pitch = py * 0.28 + Math.sin(time * 0.27 + 1) * 0.04 + sc * 0.0005 - off[1] / CAM * 0.4;
    setRot(pitch, yaw, Math.sin(time * 0.2) * 0.03 - px * 0.05);
    // взгляд: точка перед головой, куда указывает курсор
    const look = toLocal([px * halfW, -py * halfH, off[2] + 3.2]);
    gl.uniform2f(uni.uRes, w, h);
    gl.uniformMatrix3fv(uni.uRot, false, rot);
    gl.uniform3f(uni.uOff, off[0], off[1], off[2]);
    gl.uniform1f(uni.uScale, scale);
    gl.uniform1f(uni.uTan, TAN);
    gl.uniform1f(uni.uDark, root.dataset.theme === 'dark' ? 1 : 0);
    gl.uniform3f(uni.uLook, look[0], look[1], look[2]);
    gl.uniform2f(uni.uLight, px, py);
    gl.uniform1f(uni.uQ, capI < 2 ? 1 : 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!firstFrame) { firstFrame = true; root.classList.add('gl-on'); ready(); }
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
    time += dt;
    draw();
    // адаптивное качество: если кадры идут медленно, снижаем разрешение, в крайнем случае оставляем неподвижный кадр
    if (dt > 0) { slowSum += dt; slowN++; }
    if (slowN >= 40) {
      const avg = slowSum / slowN; slowN = 0; slowSum = 0;
      if (avg > 0.028) {
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
  draw();

  if ('ResizeObserver' in window) {
    let rr = 0;
    new ResizeObserver(() => { if (!rr) rr = requestAnimationFrame(() => { rr = 0; if (layout() && !running) draw(); }); }).observe(canvas);
  } else addEventListener('resize', still);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; play(); }).observe(canvas);
  document.addEventListener('visibilitychange', play);
  if ('MutationObserver' in window) new MutationObserver(() => { if (!running && firstFrame) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  addEventListener('pointermove', e => {
    if (!visible) return;
    tx = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1)); ty = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1));
  }, { passive: true });
  addEventListener('scroll', () => { if ((reduce || stat) && visible && !running && !raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }, { passive: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; root.classList.remove('gl-on'); root.classList.add('no-3d'); });
  canvas.addEventListener('webglcontextrestored', () => {
    try { uni = {}; init(); layout(); root.classList.remove('no-3d'); root.classList.add('gl-on'); draw(); play(); } catch { /* остаётся запасная графика */ }
  });
  play();
})();
