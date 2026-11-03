/* 米麦 MIME TECH · 密数科技 — 商业宣传片 v2（60 s, 1920×1080, 30 fps）
 * Everything is drawn procedurally on one Canvas 2D context; render(t) is a pure function of time t (seconds).
 * intro 0–6 (灵感博物馆 MIMUSE + logo) · hook 6–11 (展品：脸/声音/虚拟形象/灵感 → 都可以成为商品) ·
 * 01 11–19.5 · 02 19.5–28 · 03 28–37 · 04 37–46 · 05 46–53 · outro 53–60.  120 BPM; every cut sits on a beat.
 */
const W = 1920, H = 1080, FPS = 30, DUR = 60;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let LOGO = null, LOGO_L = null, GRAIN = null, AUR = null, NEB = null;

/* ───────────────────────── utils ───────────────────────── */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inCubic: u => u * u * u,
  inOutCubic: u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inOutSine: u => -(Math.cos(Math.PI * u) - 1) / 2,
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outBack: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SANS = '"Inter","SC",sans-serif', MONO = '"JBM","SC",monospace', CJK = '"SC","Inter",sans-serif';
const F = (w, s, fam = SANS) => `${w} ${s}px ${fam}`;
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => { const c = hex(h); const m = k < 0 ? [0, 0, 0] : [255, 255, 255]; return rgb(mix(c, m, Math.abs(k))); };
const BEAT = 0.5;
const bp = (t, k = 8) => Math.exp(-(((t % BEAT) + BEAT) % BEAT) * k);

function txt(c, s, x, y, o = {}) {
  c.save();
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  c.font = o.font || F(400, 20);
  c.fillStyle = o.color || '#fff';
  c.textAlign = o.align || 'left';
  c.textBaseline = o.base || 'alphabetic';
  c.letterSpacing = (o.ls || 0) + 'px';
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = o.glowR || 18; }
  c.fillText(s, x, y);
  c.restore();
}
function tw(c, s, font, ls = 0) { c.save(); c.font = font; c.letterSpacing = ls + 'px'; const w = c.measureText(s).width; c.restore(); return w; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fillRR(c, x, y, w, h, r, fill) { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); }
function circle(c, x, y, r, fill) { if (r <= 0) return; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function ring(c, x, y, r, stroke, lw, a0 = 0, a1 = Math.PI * 2) { if (r <= 0) return; c.beginPath(); c.arc(x, y, r, a0, a1); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
function line(c, x0, y0, x1, y1, stroke, lw = 1) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
function glowDisc(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(col, a)); g.addColorStop(1, rgb(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
const GLY = '0123456789abcdef';
function decode(str, u, seed) {
  const k = Math.floor(str.length * clamp(u)); let s = str.slice(0, k);
  for (let i = k; i < str.length; i++) s += str[i] === ' ' ? ' ' : '#%01ABCDEF><'[(hash(seed + i * 3.1) * 12) | 0];
  return u <= 0 ? '' : s;
}

function keyIcon(c, x, y, s, fill, stroke, lw = 3) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath();
  c.arc(0, 0, 22, 0, Math.PI * 2);
  c.moveTo(20, -5); c.lineTo(78, -5); c.lineTo(78, 5); c.lineTo(70, 5); c.lineTo(70, 18); c.lineTo(60, 18); c.lineTo(60, 5);
  c.lineTo(50, 5); c.lineTo(50, 14); c.lineTo(42, 14); c.lineTo(42, 5); c.lineTo(20, 5);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw / s; c.lineJoin = 'round'; c.stroke(); }
  c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2);
  if (fill) { c.fillStyle = stroke || '#000'; c.fill(); }
  if (stroke && !fill) { c.stroke(); }
  c.restore();
}
function lockIcon(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = col; c.lineWidth = 3.2; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -8, 8, Math.PI, 0); c.lineTo(8, -2); c.moveTo(-8, -2); c.lineTo(-8, -8); c.stroke();
  fillRR(c, -12, -3, 24, 18, 4, col);
  c.restore();
}
function check(c, x, y, s, col, lw = 3, u = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = col; c.lineWidth = lw / s; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-8, 0);
  const p1 = clamp(u * 2), p2 = clamp(u * 2 - 1);
  c.lineTo(-8 + 5 * p1, 6 * p1);
  if (p2 > 0) c.lineTo(-3 + 13 * p2, 6 - 14 * p2);
  c.stroke(); c.restore();
}
function cursor(c, x, y, press = 0) {
  c.save(); c.translate(x, y); const s = 1 - press * 0.12; c.scale(s, s);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 30); c.lineTo(8, 23); c.lineTo(14, 36); c.lineTo(19, 34); c.lineTo(13, 21); c.lineTo(24, 21); c.closePath();
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = '#fff'; c.fill(); c.shadowColor = 'transparent';
  c.strokeStyle = '#111'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
  c.restore();
}
function ripple(c, x, y, u, col) {
  if (u <= 0 || u >= 1) return;
  ring(c, x, y, 8 + 46 * E.outCubic(u), rgb(col, 0.7 * (1 - u)), 3);
  circle(c, x, y, 18 * (1 - u), rgb(col, 0.35 * (1 - u)));
}
function coin(c, x, y, r, a = 1) {
  c.save(); c.globalAlpha *= a;
  const g = c.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#ffe7a3'); g.addColorStop(0.5, '#f2b84b'); g.addColorStop(1, '#b97a1c');
  circle(c, x, y, r, g); ring(c, x, y, r * 0.72, 'rgba(120,70,10,.55)', Math.max(1, r * 0.1));
  txt(c, '¥', x, y + r * 0.36, { font: F(900, r * 1.0), align: 'center', color: 'rgba(120,70,10,.8)' });
  c.restore();
}

/* ───────────────────────── brand: transparent logo ───────────────────────── */
// LOGO_L = the supplied transparent logo with the mark brightened and the wordmark lit by a white→ice-blue gradient,
// so it reads on dark backgrounds without a plate.
function drawLogo(c, x, y, w, reveal = 1, sweepU = -1, alpha = 1) {
  const h = w * 475 / 2000;
  c.save(); c.globalAlpha *= alpha;
  c.beginPath(); c.rect(x - 40, y - 60, (w + 80) * reveal, h + 120); c.clip();
  c.save(); c.shadowColor = 'rgba(70,140,255,.75)'; c.shadowBlur = w * 0.05; c.drawImage(LOGO_L, x, y, w, h); c.restore();
  c.drawImage(LOGO_L, x, y, w, h);
  if (sweepU > 0 && sweepU < 1) {
    // light sweep, masked by the logo itself
    const o = SWEEP_CANVAS(); const s = o.getContext('2d');
    s.clearRect(0, 0, o.width, o.height); s.globalCompositeOperation = 'source-over';
    s.drawImage(LOGO_L, 0, 0, o.width, o.height);
    s.globalCompositeOperation = 'source-in';
    const sx = lerp(-500, o.width + 500, sweepU);
    const g = s.createLinearGradient(sx - 260, 0, sx + 260, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, o.width, o.height);
    c.globalCompositeOperation = 'lighter'; c.drawImage(o, x, y, w, h); c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  if (reveal > 0 && reveal < 1) {
    const ex = x - 40 + (w + 80) * reveal;
    const g = c.createLinearGradient(ex - 80, 0, ex + 4, 0);
    g.addColorStop(0, 'rgba(140,190,255,0)'); g.addColorStop(1, `rgba(220,240,255,${0.9 * alpha})`);
    c.fillStyle = g; c.fillRect(ex - 80, y - 20, 84, h + 40);
  }
}
let _sw = null; function SWEEP_CANVAS() { if (!_sw) { _sw = document.createElement('canvas'); _sw.width = 2000; _sw.height = 475; } return _sw; }
function mark(c, x, y, h) { c.drawImage(LOGO_L, 0, 0, 800, 475, x, y, h * 800 / 475, h); }

/* ───────────────────────── the face: nebula profile ───────────────────────── */
function profilePath(c) {
  c.beginPath();
  c.moveTo(-40, 300);
  c.bezierCurveTo(-48, 230, -58, 172, -92, 122);
  c.bezierCurveTo(-152, 58, -176, -58, -134, -142);
  c.bezierCurveTo(-92, -224, 10, -252, 82, -216);
  c.bezierCurveTo(132, -190, 152, -140, 154, -96);
  c.bezierCurveTo(156, -76, 152, -62, 147, -52);
  c.bezierCurveTo(151, -40, 162, -20, 174, 0);
  c.bezierCurveTo(184, 14, 188, 26, 179, 33);
  c.bezierCurveTo(171, 39, 161, 38, 157, 45);
  c.bezierCurveTo(163, 52, 167, 59, 161, 65);
  c.bezierCurveTo(157, 69, 157, 73, 161, 79);
  c.bezierCurveTo(163, 87, 157, 95, 149, 99);
  c.bezierCurveTo(147, 109, 151, 121, 151, 131);
  c.bezierCurveTo(147, 151, 121, 163, 93, 169);
  c.bezierCurveTo(81, 201, 85, 251, 97, 300);
  c.closePath();
}
// museFace: a woman's profile filled with nebula (echoing the logo), lit rim, flowing hair lines.
function museFace(c, x, y, s, t, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  // long hair: a flowing mass behind the head, then lit strands on top
  const sw = Math.sin(t * 1.1) * 8;
  c.beginPath();
  c.moveTo(96, -214);
  c.bezierCurveTo(20, -262, -150, -250, -196, -130);
  c.bezierCurveTo(-236, -30, -232, 90, -262 + sw, 210);
  c.bezierCurveTo(-276 + sw, 268, -250 + sw, 320, -206 + sw, 340);
  c.bezierCurveTo(-150, 300, -96, 250, -70, 200);
  c.bezierCurveTo(-60, 120, -40, 20, -20, -60);
  c.bezierCurveTo(10, -140, 60, -180, 96, -214);
  c.closePath();
  const hg = c.createLinearGradient(-60, -250, -220, 330);
  hg.addColorStop(0, '#2c4fa8'); hg.addColorStop(0.5, '#142a66'); hg.addColorStop(1, 'rgba(10,20,52,.15)');
  c.fillStyle = hg; c.fill();
  c.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const sway = Math.sin(t * 1.3 + k * 0.6) * 8;
    const q = k / 15;
    c.beginPath();
    c.moveTo(80 - q * 150, -222 + q * 40);
    c.bezierCurveTo(-60 - q * 140, -250 + q * 60, -200 - q * 40 + sway, -60 + q * 40, -150 - q * 110 + sway * 1.6, 180 + q * 150);
    c.strokeStyle = `rgba(${150 + k * 4},${205 - k * 2},255,${0.18 + 0.12 * ((k * 7) % 3) / 2})`; c.lineWidth = 2.4; c.stroke();
  }
  // face fill
  c.save(); profilePath(c); c.clip();
  c.drawImage(NEB, -200, -270, 420, 590);
  const g = c.createLinearGradient(-180, -250, 190, 300);
  g.addColorStop(0, 'rgba(10,20,60,.0)'); g.addColorStop(0.7, 'rgba(8,14,40,.25)'); g.addColorStop(1, 'rgba(5,8,25,.8)');
  c.fillStyle = g; c.fillRect(-200, -270, 420, 590);
  // inner light on the face front
  const g2 = c.createRadialGradient(150, -10, 0, 150, -10, 180);
  g2.addColorStop(0, 'rgba(190,230,255,.45)'); g2.addColorStop(1, 'rgba(190,230,255,0)');
  c.fillStyle = g2; c.fillRect(-200, -270, 420, 590);
  if (o.scan !== undefined && o.scan > 0 && o.scan < 1) {
    const sy = lerp(-260, 300, o.scan);
    const g3 = c.createLinearGradient(0, sy - 70, 0, sy);
    g3.addColorStop(0, 'rgba(25,227,166,0)'); g3.addColorStop(1, 'rgba(25,227,166,.55)');
    c.fillStyle = g3; c.fillRect(-200, sy - 70, 420, 70);
  }
  c.restore();
  // rim
  profilePath(c);
  c.shadowColor = 'rgba(120,200,255,.9)'; c.shadowBlur = 18;
  c.strokeStyle = 'rgba(200,235,255,.95)'; c.lineWidth = 2.6 / s * 1.4; c.stroke();
  c.shadowColor = 'transparent';
  // eye and lips accent
  c.strokeStyle = 'rgba(230,245,255,.9)'; c.lineWidth = 2.4 / s * 1.4;
  c.beginPath(); c.moveTo(104, -40); c.quadraticCurveTo(118, -48, 132, -40); c.stroke();
  c.beginPath(); c.moveTo(110, -52); c.quadraticCurveTo(122, -60, 136, -54); c.strokeStyle = 'rgba(230,245,255,.5)'; c.stroke();
  // ear
  c.beginPath(); c.ellipse(-20, -10, 16, 30, -0.15, -1.2, 2.2); c.strokeStyle = 'rgba(200,235,255,.45)'; c.stroke();
  if (o.mesh) {
    const pts = [[154, -96], [147, -52], [179, 33], [161, 65], [149, 99], [151, 131], [93, 169], [118, -44], [-20, -10], [40, 60], [80, -140], [-80, -100], [30, -200], [0, 120]];
    const ed = [[0, 1], [1, 7], [7, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 13], [13, 9], [9, 2], [9, 8], [8, 11], [11, 10], [10, 0], [10, 12], [12, 11], [7, 10], [9, 7], [8, 13]];
    const m = o.mesh;
    c.strokeStyle = `rgba(25,227,166,${0.7 * m})`; c.lineWidth = 1.4 / s * 1.4;
    for (const [i, j] of ed) { c.beginPath(); c.moveTo(...pts[i]); c.lineTo(...pts[j]); c.stroke(); }
    for (const p of pts) { circle(c, p[0], p[1], 4.5, `rgba(255,255,255,${m})`); }
  }
  c.restore();
}

/* ───────────────────────── MIMUSE: the museum of inspiration ───────────────────────── */
const DUST = (() => { const r = rng(21), a = []; for (let i = 0; i < 170; i++) a.push([r() * 11 - 5.5, r() * 10 - 2.2, r() * 60, r()]); return a; })();
const EXHIBIT_KIND = ['face', 'wave', 'avatar', 'spark'];
function museum(c, t, camZ, o = {}) {
  const VX = W / 2, VY = H * 0.46 + (o.vy || 0), f = 820;
  // points behind the camera are clamped to a near plane; everything near it is faded out by fade()
  const P = (x, y, z) => { const d = Math.max(z - camZ, 0.35); const s = f / d; return [VX + x * s, VY - y * s, s, d]; };
  const fade = (d) => clamp(1 - (d - 3) / 58) * clamp((d - 0.4) / 1.5);
  const FY = -2.4, CY_ = 5.4, WX = 6.2, CX = 4.7, ZMAX = 66;
  c.fillStyle = '#04060f'; c.fillRect(0, 0, W, H);
  // far glow
  glowDisc(c, VX, VY, 700, [60, 110, 230], 0.45);
  glowDisc(c, VX, VY + 20, 260, [170, 210, 255], 0.35);
  // floor
  const fl = c.createLinearGradient(0, VY, 0, H);
  fl.addColorStop(0, 'rgba(30,50,110,.35)'); fl.addColorStop(1, 'rgba(8,12,30,1)');
  c.fillStyle = fl; c.fillRect(0, VY, W, H - VY);
  c.lineWidth = 1;
  for (let x = -WX; x <= WX + 0.01; x += 1.24) {
    const a = P(x, FY, camZ + 0.6), b = P(x, FY, ZMAX);
    if (a && b) { line(c, a[0], a[1], b[0], b[1], `rgba(120,170,255,${Math.abs(x) < 1.3 ? 0.22 : 0.10})`, 1); }
  }
  for (let z = Math.ceil(camZ / 2) * 2; z < ZMAX; z += 2) {
    const a = P(-WX, FY, z), b = P(WX, FY, z);
    if (a && b) line(c, a[0], a[1], b[0], b[1], `rgba(120,170,255,${0.14 * fade(a[3])})`, 1);
  }
  // light runner on the floor
  { const a = P(-1.1, FY, camZ + 0.6), b = P(1.1, FY, camZ + 0.6), cc = P(1.1, FY, ZMAX), d = P(-1.1, FY, ZMAX);
    if (a && b) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath();
      const g = c.createLinearGradient(0, H, 0, VY); g.addColorStop(0, 'rgba(120,170,255,.02)'); g.addColorStop(1, 'rgba(160,200,255,.22)'); c.fillStyle = g; c.fill(); } }
  // walls
  for (const sd of [-1, 1]) {
    const a = P(sd * WX, FY, camZ + 0.6), b = P(sd * WX, 9.5, camZ + 0.6), cc = P(sd * WX, 9.5, ZMAX), d = P(sd * WX, FY, ZMAX);
    if (!a) continue;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath();
    const g = c.createLinearGradient(a[0], 0, d[0], 0); g.addColorStop(0, '#0a1024'); g.addColorStop(1, '#16224a'); c.fillStyle = g; c.fill();
    // cornice lines
    for (const yy of [CY_ + 0.6, 8.2]) { const p = P(sd * WX, yy, camZ + 0.6), q = P(sd * WX, yy, ZMAX); if (p && q) line(c, p[0], p[1], q[0], q[1], 'rgba(150,190,255,.18)', 1.2); }
  }
  // frames with exhibits (gilded) on both walls
  for (let k = 0; k < 15; k++) {
    const z = 6 + k * 4;
    for (const sd of [-1, 1]) {
      const zc = z, d = zc - camZ; if (d < 1.2) continue;
      const fa = fade(d);
      const y0 = -0.5, y1 = 3.1, z0 = zc - 1.25, z1 = zc + 1.25, xw = sd * (WX - 0.05);
      const q = [P(xw, y0, z0), P(xw, y1, z0), P(xw, y1, z1), P(xw, y0, z1)];
      if (q.some(p => !p)) continue;
      const poly = (pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
      const kind = EXHIBIT_KIND[(k + (sd > 0 ? 2 : 0)) % 4];
      const hue = kind === 'face' ? [90, 150, 255] : kind === 'wave' ? [40, 220, 200] : kind === 'avatar' ? [150, 110, 255] : [255, 190, 90];
      // spot on the wall
      const cp = P(xw, 1.3, zc);
      glowDisc(c, cp[0], cp[1], cp[2] * 2.4, hue, 0.22 * fa);
      poly(q); c.fillStyle = `rgba(6,10,26,${0.9 * fa})`; c.fill();
      c.lineWidth = Math.max(1, cp[2] * 0.06); c.strokeStyle = `rgba(214,178,104,${0.85 * fa})`; poly(q); c.stroke();
      // icon drawn on the wall plane
      const W2 = (u, v) => P(xw, 1.3 + v * 1.35, zc + sd * u * 0.95);
      c.save(); c.strokeStyle = rgb(mix(hue, [255, 255, 255], 0.35), 0.9 * fa); c.lineWidth = Math.max(1, cp[2] * 0.035);
      c.shadowColor = rgb(hue, fa); c.shadowBlur = 10;
      c.beginPath();
      if (kind === 'wave') for (let i = 0; i <= 40; i++) { const u = -1 + i / 20; const v = Math.sin(u * 9 + t * 3 + k) * 0.5 * Math.cos(u * 1.4); const p = W2(u * 0.9, v); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
      if (kind === 'face') { const pr = [[0.1, -0.95], [0.05, -0.5], [-0.1, -0.3], [0.0, -0.1], [-0.25, 0.05], [-0.05, 0.15], [0.05, 0.4], [0.35, 0.65], [0.4, 0.95]]; pr.forEach(([u, v], i) => { const p = W2(-u - 0.1, -v); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); }
      if (kind === 'avatar') { for (let i = 0; i <= 6; i++) { const an = i * Math.PI / 3 + t * 0.6; const p = W2(Math.cos(an) * 0.65, Math.sin(an) * 0.5); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } for (let i = 0; i < 6; i += 2) { const an = i * Math.PI / 3 + t * 0.6; const a0 = W2(0, 0), p = W2(Math.cos(an) * 0.65, Math.sin(an) * 0.5); c.moveTo(a0[0], a0[1]); c.lineTo(p[0], p[1]); } }
      if (kind === 'spark') { for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + Math.PI / 4 * 0; const p0 = W2(Math.cos(an) * 0.08, Math.sin(an) * 0.08), p1 = W2(Math.cos(an) * 0.6, Math.sin(an) * 0.6); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); } const cc = W2(0, 0); c.moveTo(cc[0] + cp[2] * 0.15, cc[1]); c.arc(cc[0], cc[1], cp[2] * 0.15, 0, 7); }
      c.stroke(); c.restore();
      // brass plaque
      const pl = P(xw, -0.95, zc);
      if (pl && fa > 0.25) { c.save(); c.globalAlpha = fa * 0.9; fillRR(c, pl[0] - pl[2] * 0.42, pl[1] - pl[2] * 0.09, pl[2] * 0.84, pl[2] * 0.18, 2, 'rgba(214,178,104,.55)'); c.restore(); }
    }
  }
  // columns (far → near)
  for (let k = 16; k >= 0; k--) {
    const z = 4 + k * 4;
    for (const sd of [-1, 1]) {
      const d = z - 0.45 - camZ; if (d < 0.5) continue;
      const fa = fade(d);
      const xi = sd * (CX - 0.45), xo = sd * (CX + 0.45);
      const fr = [P(xi, FY, z - 0.45), P(xo, FY, z - 0.45), P(xo, CY_, z - 0.45), P(xi, CY_, z - 0.45)];
      const inn = [P(xi, FY, z - 0.45), P(xi, CY_, z - 0.45), P(xi, CY_, z + 0.45), P(xi, FY, z + 0.45)];
      if (fr.some(p => !p) || inn.some(p => !p)) continue;
      const poly = (pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
      poly(inn); c.fillStyle = `rgba(14,22,52,${fa})`; c.fill();
      poly(fr); const g = c.createLinearGradient(fr[0][0], 0, fr[1][0], 0);
      g.addColorStop(0, `rgba(36,58,120,${fa})`); g.addColorStop(1, `rgba(16,26,60,${fa})`); c.fillStyle = g; c.fill();
      c.strokeStyle = `rgba(160,200,255,${0.5 * fa})`; c.lineWidth = Math.max(1, fr[0][2] * 0.02); poly(fr); c.stroke();
      // flutes
      for (let q = 1; q < 4; q++) { const xx = lerp(xi, xo, q / 4); const a = P(xx, FY + 0.3, z - 0.45), b = P(xx, CY_ - 0.3, z - 0.45); line(c, a[0], a[1], b[0], b[1], `rgba(160,200,255,${0.22 * fa})`, Math.max(1, a[2] * 0.012)); }
      // capital & base
      for (const [y0, y1] of [[CY_, CY_ + 0.4], [FY, FY + 0.3]]) {
        const a = P(xi - sd * 0.15, y0, z - 0.5), b = P(xo + sd * 0.15, y1, z - 0.5);
        if (a && b) { c.fillStyle = `rgba(40,64,130,${fa})`; c.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); c.strokeStyle = `rgba(170,210,255,${0.45 * fa})`; c.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
      }
      // floor reflection
      const ra = P(xi, FY, z - 0.45), rb = P(xo, FY - 1.6, z - 0.45);
      if (ra && rb) { const g2 = c.createLinearGradient(0, ra[1], 0, rb[1]); g2.addColorStop(0, `rgba(60,100,200,${0.18 * fa})`); g2.addColorStop(1, 'rgba(60,100,200,0)'); c.fillStyle = g2; c.fillRect(Math.min(ra[0], rb[0]), ra[1], Math.abs(rb[0] - ra[0]), rb[1] - ra[1]); }
    }
    // arch across the hall at this column
    const d = z - camZ; if (d < 0.6) continue;
    const fa = fade(d);
    c.beginPath();
    for (let i = 0; i <= 32; i++) { const th = Math.PI * i / 32; const p = P(Math.cos(th) * (CX - 0.45), CY_ + 0.4 + Math.sin(th) * 3.1, z - 0.45); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }
    c.strokeStyle = `rgba(160,200,255,${0.35 * fa})`; c.lineWidth = Math.max(1, (f / d) * 0.04); c.stroke();
  }
  // back wall portal + MIMUSE
  const bw = P(0, 3.4, ZMAX);
  if (bw) {
    const s = bw[2];
    c.save(); c.beginPath();
    c.moveTo(VX - 2.2 * s, VY + 2.4 * s); c.lineTo(VX - 2.2 * s, VY - 1.6 * s); c.arc(VX, VY - 1.6 * s, 2.2 * s, Math.PI, 0); c.lineTo(VX + 2.2 * s, VY + 2.4 * s); c.closePath();
    const g = c.createLinearGradient(0, VY - 4 * s, 0, VY + 2.4 * s); g.addColorStop(0, 'rgba(190,225,255,.9)'); g.addColorStop(1, 'rgba(90,150,255,.5)');
    c.fillStyle = g; c.shadowColor = 'rgba(140,190,255,1)'; c.shadowBlur = 60; c.fill(); c.restore();
    txt(c, 'MIMUSE', VX, VY - 4.6 * s, { font: F(800, Math.max(8, 1.05 * s)), align: 'center', ls: Math.max(2, 0.5 * s), color: 'rgba(200,225,255,.85)' });
  }
  // light shafts
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const z = 10 + k * 8, sx = (k % 2 ? 1 : -1) * 1.6;
    const a = P(sx - 0.8, 9.4, z), b = P(sx + 0.8, 9.4, z), cc = P(sx + 2.6, FY, z + 3), dd = P(sx + 1.0, FY, z + 3);
    if (!a || !cc) continue;
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(dd[0], dd[1]); c.closePath();
    const g = c.createLinearGradient(0, a[1], 0, cc[1]); g.addColorStop(0, `rgba(150,190,255,${0.10 * fade(a[3])})`); g.addColorStop(1, 'rgba(150,190,255,0)');
    c.fillStyle = g; c.fill();
  }
  // dust motes
  for (const [x, y, z0, r] of DUST) {
    const z = camZ + 1 + ((z0 - camZ * 0.0 + t * 0.3) % 46 + 46) % 46;
    const p = P(x + Math.sin(t * 0.4 + r * 9) * 0.3, y + Math.sin(t * 0.3 + r * 5) * 0.3, z);
    if (!p) continue;
    circle(c, p[0], p[1], Math.max(0.6, p[2] * 0.018), `rgba(190,220,255,${0.5 * fade(p[3]) * (0.4 + 0.6 * r)})`);
  }
  c.restore();
  // vignette
  const vg = c.createRadialGradient(VX, VY, H * 0.25, VX, VY, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,6,.75)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

/* ───────────────────────── background & chrome ───────────────────────── */
const SCENE_COL = [
  [0, hex('#2a56c8'), hex('#5a3fd0')], [11, hex('#2a56c8'), hex('#5a3fd0')],
  [11.01, hex('#2b44ff'), hex('#ffb43a')], [19.5, hex('#7a5cff'), hex('#4fd7c0')],
  [28, hex('#9a4dff'), hex('#ff4fa3')], [37, hex('#13c7c0'), hex('#1a6fff')],
  [46, hex('#e8b04a'), hex('#3d5bff')], [53, hex('#2a6bd8'), hex('#6a5cff')], [60, hex('#2a6bd8'), hex('#6a5cff')],
];
function sceneCol(t) {
  for (let i = 0; i < SCENE_COL.length - 1; i++) {
    const [, A, B] = SCENE_COL[i], [b, A2, B2] = SCENE_COL[i + 1];
    if (t < b) { const u = E.inOutCubic(seg(t, b - 0.8, b + 0.2)); return [mix(A, A2, u), mix(B, B2, u)]; }
  }
  return [SCENE_COL.at(-1)[1], SCENE_COL.at(-1)[2]];
}
function background(t) {
  ctx.fillStyle = '#06080f'; ctx.fillRect(0, 0, W, H);
  const [A, B] = sceneCol(t);
  const g1x = W * (0.18 + 0.05 * Math.sin(t * 0.21)), g1y = H * (0.22 + 0.06 * Math.cos(t * 0.17));
  let g = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, 1100);
  g.addColorStop(0, rgb(A, 0.42)); g.addColorStop(0.45, rgb(A, 0.12)); g.addColorStop(1, rgb(A, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const g2x = W * (0.86 + 0.04 * Math.cos(t * 0.13)), g2y = H * (0.86 + 0.05 * Math.sin(t * 0.19));
  g = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, 1000);
  g.addColorStop(0, rgb(B, 0.30)); g.addColorStop(0.5, rgb(B, 0.08)); g.addColorStop(1, rgb(B, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // faint lattice
  ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#9fc0ff'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grain(t) {
  const f = Math.floor(t * FPS);
  ctx.save(); ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = 'overlay';
  const ox = (f * 173) % 512, oy = (f * 97) % 512;
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) ctx.drawImage(GRAIN, x, y);
  ctx.restore();
}
function chrome(t) {
  const a = seg(t, 11.0, 11.6) * (1 - seg(t, 52.6, 53.2));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  mark(ctx, 56, 36, 38);
  txt(ctx, '米麦', 132, 64, { font: F(900, 24, CJK) });
  txt(ctx, 'MIME TECH', 192, 63, { font: F(600, 15), color: 'rgba(255,255,255,.62)', ls: 3 });
  txt(ctx, 'mimuseai.com', W - 56, 62, { font: F(500, 16, MONO), color: 'rgba(255,255,255,.55)', ls: 1, align: 'right' });
  const p = seg(t, 11, 53);
  line(ctx, 0, H - 2, W, H - 2, 'rgba(255,255,255,.06)', 4);
  const [A] = sceneCol(t);
  line(ctx, 0, H - 2, W * p, H - 2, rgb(mix(A, [255, 255, 255], 0.3), 0.85), 4);
  ctx.restore();
}

/* ───────────────────────── chapter frame ───────────────────────── */
const CW = 1140, CHH = 640, CY = 190;
const CHAPTERS = [
  { n: 1, a: 11, b: 19.5, len: 10, side: 'L', title: '上传确权', line: '你的脸，只属于你。', en: 'Upload it. It stays yours.', acc: '#4d7bff', stage: stage1 },
  { n: 2, a: 19.5, b: 28, len: 10, side: 'R', title: '上架变现', line: '卖的是使用权，', line2: '所有权永远是你的。', en: 'Sell the right to use, never the ownership.', acc: '#9b86ff', stage: stage2 },
  { n: 3, a: 28, b: 37, len: 10, side: 'L', title: '你说了算', line: '每一次使用，', line2: '都要你点头。', en: 'Every use waits for your yes.', acc: '#ff5fb0', stage: stage3 },
  { n: 4, a: 37, b: 46, len: 10, side: 'R', title: '密钥在手', line: '随时收回，', line2: '一键撤销。', en: 'Take it back, any time.', acc: '#2ee6d6', stage: stage4 },
  { n: 5, a: 46, b: 53, len: 6, side: 'L', title: '收益生长', line: '每用一次，', line2: '收益到账一次。', en: 'Every use pays you.', acc: '#f2b84b', stage: stage5 },
];
function drawChapter(ch, t) {
  const lt = t - ch.a, dur = ch.b - ch.a;
  if (lt < 0 || lt > dur) return;
  const slt = lt * ch.len / dur;           // stage time (stage choreography is authored on ch.len seconds)
  const inU = E.outExpo(seg(lt, 0, 0.9));
  const outU = E.inCubic(seg(lt, dur - 0.45, dur));
  const L = ch.side === 'L';
  const cardX0 = L ? 690 : 90;
  const textX = L ? 112 : 1296;
  const dir = L ? 1 : -1;
  const cx = cardX0 + dir * (1 - inU) * 160 - dir * outU * 220;
  const sc = lerp(0.9, 1, inU) * lerp(1, 0.94, outU);
  const al = clamp(inU * 1.4) * (1 - outU);
  ctx.save();
  ctx.globalAlpha = al;
  ctx.translate(cx + CW / 2, CY + CHH / 2); ctx.scale(sc, sc); ctx.translate(-CW / 2, -CHH / 2);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 36; fillRR(ctx, 0, 0, CW, CHH, 22, '#111'); ctx.restore();
  ctx.save(); rr(ctx, 0, 0, CW, CHH, 22); ctx.clip(); ch.stage(ctx, slt, CW, CHH, ch); ctx.restore();
  rr(ctx, 0.5, 0.5, CW - 1, CHH - 1, 22); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  // text block: number · title · one line
  const el = (d) => { const u = E.outCubic(seg(lt, d, d + 0.55)); return { a: u * (1 - outU), y: (1 - u) * 30 - outU * 16 }; };
  let e = el(0.1);
  txt(ctx, `0${ch.n}`, textX, 380 + e.y, { font: F(600, 40, MONO), color: ch.acc, alpha: e.a });
  ctx.save(); ctx.globalAlpha = e.a; line(ctx, textX + 70, 367 + e.y, textX + 70 + 120 * E.outCubic(seg(lt, 0.2, 0.9)), 367 + e.y, ch.acc, 2); ctx.restore();
  e = el(0.2);
  txt(ctx, ch.title, textX - 4, 490 + e.y, { font: F(900, 96, CJK), alpha: e.a, ls: 4 });
  e = el(0.34);
  txt(ctx, ch.line, textX, 572 + e.y, { font: F(700, 34, CJK), color: 'rgba(240,244,255,.92)', alpha: e.a, ls: 2 });
  if (ch.line2) { const q = el(0.42); txt(ctx, ch.line2, textX, 620 + q.y, { font: F(700, 34, CJK), color: ch.acc, alpha: q.a, ls: 2 }); }
  e = el(0.5);
  txt(ctx, ch.en, textX, (ch.line2 ? 668 : 620) + e.y, { font: F(400, 19), color: 'rgba(220,228,255,.55)', alpha: e.a, ls: 0.5 });
}

/* ───────────────────────── 01 · upload & own (flat vector) ───────────────────────── */
function brackets(c, x, y, w, h, arm, col, lw) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
  c.moveTo(x, y + arm); c.lineTo(x, y); c.lineTo(x + arm, y);
  c.moveTo(x + w - arm, y); c.lineTo(x + w, y); c.lineTo(x + w, y + arm);
  c.moveTo(x + w, y + h - arm); c.lineTo(x + w, y + h); c.lineTo(x + w - arm, y + h);
  c.moveTo(x + arm, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - arm);
  c.stroke(); c.restore();
}
function stage1(c, lt, w, h) {
  const BLUE = '#2a3cf2', NAVY = '#121a46', MINT = '#19e3a6', YEL = '#ffc934', CREAM = '#f4efe4';
  c.fillStyle = CREAM; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(18,26,70,.07)';
  for (let x = 20; x < w; x += 28) for (let y = 20; y < h; y += 28) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
  const pIn = E.outExpo(seg(lt, 0, 0.9));
  // device panel: deep blue with a soft gradient
  c.save(); rr(c, 36, 36, 520 * pIn, h - 72, 26);
  const pg = c.createLinearGradient(0, 36, 0, h - 36); pg.addColorStop(0, '#1c2bd8'); pg.addColorStop(1, '#0d1680'); c.fillStyle = pg; c.fill(); c.restore();
  txt(c, '你的设备', 70, 92, { font: F(900, 24, CJK), color: '#fff', alpha: seg(lt, 0.5, 0.9) });
  const cx = 300, cy = 316;
  c.save(); rr(c, 36, 36, 520, h - 72, 26); c.clip();
  glowDisc(c, cx, cy, 300 * E.outCubic(seg(lt, 0.2, 1.2)), [120, 180, 255], 0.45);
  const sIn = E.outBack(seg(lt, 0.25, 1.0));
  ring(c, cx, cy - 10, 176 * sIn, 'rgba(255,201,52,.9)', 3);
  ring(c, cx, cy - 10, 196 * sIn, 'rgba(255,201,52,.3)', 1.5);
  const encU = seg(lt, 3.2, 4.9), flyU = seg(lt, 5.0, 7.0);
  const faceA = E.outCubic(seg(lt, 0.35, 1.1)) * (1 - encU * 0.85) + seg(lt, 6.2, 7.0) * 0.85;
  museFace(c, cx - 10, cy + 6, 0.78, lt, { alpha: clamp(faceA), scan: seg(lt, 1.2, 3.0), mesh: seg(lt, 1.6, 2.4) * (1 - seg(lt, 3.0, 3.6)) });
  c.restore();
  const bIn = E.outExpo(seg(lt, 0.5, 1.3));
  const bw = lerp(420, 330, bIn), bh = lerp(470, 400, bIn);
  c.save(); c.globalAlpha = bIn; brackets(c, cx - bw / 2, cy - 4 - bh / 2, bw, bh, 34, '#fff', 4); c.restore();
  // tiles
  const TS = 26, gx0 = cx - 170, gy0 = cy - 200, NX = 13, NY = 16;
  const vx = w - 260, vy = 270;
  const tick = Math.floor(lt * 10);
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
    const k = iy * NX + ix;
    const x = gx0 + ix * TS, y = gy0 + iy * TS;
    const dx = x + TS / 2 - cx, dy = y + TS / 2 - (cy + 10);
    if (Math.hypot(dx * 0.95, dy * 0.75) > 175) continue;
    const d = Math.hypot(dx, dy) / 220;
    const on = E.outCubic(seg(encU, d * 0.6, d * 0.6 + 0.4));
    if (on <= 0) continue;
    const fd = hash(k) * 0.55;
    const fu = E.inOutCubic(seg(flyU, fd, fd + 0.45));
    if (fu >= 1) continue;
    const px = lerp(x, vx + (hash(k + 3) - 0.5) * 60, fu);
    const py = lerp(y, vy + (hash(k + 5) - 0.5) * 50, fu) - Math.sin(fu * Math.PI) * 140;
    const s = lerp(TS - 3, 10, fu) * on;
    c.fillStyle = (ix + iy) % 3 === 0 ? MINT : (ix + iy) % 3 === 1 ? '#5f7bff' : '#9fb4ff';
    c.fillRect(px + (TS - s) / 2, py + (TS - s) / 2, s, s);
    if (fu < 0.4 && on > 0.8) txt(c, GLY[(hash(k * 3 + tick) * 16) | 0], px + TS / 2, py + TS / 2 + 5, { font: F(600, 13, MONO), align: 'center', color: NAVY });
  }
  const st = seg(lt, 4.2, 4.6) * (1 - seg(lt, 6.0, 6.4));
  if (st > 0) {
    c.save(); c.translate(cx + 130, cy + 160); c.rotate(-0.16); const z = lerp(1.6, 1, E.outExpo(st)); c.scale(z, z); c.globalAlpha = st;
    rr(c, -92, -30, 184, 60, 10); c.strokeStyle = YEL; c.lineWidth = 4; c.stroke();
    txt(c, '仅你可见', 0, 10, { font: F(900, 28, CJK), align: 'center', color: YEL, ls: 4 });
    c.restore();
  }
  // vault
  const vIn = E.outBack(seg(lt, 4.4, 5.1));
  c.save(); c.translate(vx, vy); c.scale(vIn, vIn);
  c.save(); c.shadowColor = 'rgba(18,26,70,.2)'; c.shadowOffsetY = 24; c.shadowBlur = 30; fillRR(c, -130, -120, 260, 240, 30, '#10b98a'); c.restore();
  fillRR(c, -130, -120, 260, 220, 30, MINT);
  fillRR(c, -104, -96, 208, 172, 20, '#0fa77d');
  const dial = lt * 2.2 + E.outCubic(flyU) * 6;
  circle(c, 0, -10, 50, CREAM); ring(c, 0, -10, 50, NAVY, 5);
  for (let i = 0; i < 8; i++) { const a = dial + i * Math.PI / 4; line(c, Math.cos(a) * 32, -10 + Math.sin(a) * 32, Math.cos(a) * 43, -10 + Math.sin(a) * 43, NAVY, 4); }
  circle(c, 0, -10, 13, NAVY); fillRR(c, 76, -32, 12, 46, 6, NAVY);
  c.restore();
  if (vIn > 0.01) txt(c, '加密保管', vx, vy + 160, { font: F(900, 26, CJK), align: 'center', color: NAVY, alpha: clamp(vIn), ls: 4 });
  // key → your hand
  const kU = E.outBack(seg(lt, 6.0, 7.0));
  if (kU > 0) {
    const kx = lerp(cx, 104, E.outCubic(seg(lt, 6.0, 6.8))), ky = lerp(cy - 30, h - 96, E.outCubic(seg(lt, 6.0, 6.8)));
    fillRR(c, 64, h - 134, 440 * clamp(kU), 76, 38, 'rgba(255,201,52,.2)');
    c.save(); c.globalAlpha = clamp(kU); keyIcon(c, kx, ky, 0.55, YEL, NAVY, 3); c.restore();
    txt(c, '钥匙，只在你手里', 154, h - 86, { font: F(900, 24, CJK), color: '#fff', alpha: seg(lt, 6.6, 7.0) });
  }
  // done chip
  const u = E.outBack(seg(lt, 7.3, 7.9));
  if (u > 0) {
    c.save(); c.translate(vx, 500); c.scale(u, u);
    c.shadowColor = 'rgba(18,26,70,.25)'; c.shadowBlur = 24; c.shadowOffsetY = 10;
    fillRR(c, -170, -32, 340, 64, 32, NAVY); c.shadowColor = 'transparent';
    circle(c, -132, 0, 18, MINT); check(c, -132, 1, 0.9, NAVY, 3.5);
    txt(c, '确权完成', 10, 10, { font: F(900, 26, CJK), align: 'center', color: '#fff', ls: 4 });
    c.restore();
  }
}

/* ───────────────────────── 02 · list & earn (isometric 2.5D) ───────────────────────── */
function stage2(c, lt, w, h) {
  let g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#b4a8ff'); g.addColorStop(1, '#efeaff');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  glowDisc(c, w * 0.42, h * 0.56, 620, [255, 255, 255], 0.7);
  for (let i = 0; i < 3; i++) {
    const x = ((i * 410 + lt * 16) % (w + 300)) - 150, y = 70 + i * 46;
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(x, y, 60, 18, 0, 0, 7); c.ellipse(x + 34, y - 12, 34, 20, 0, 0, 7); c.ellipse(x - 30, y - 6, 26, 14, 0, 0, 7); c.fill();
  }
  const N = 7, TWd = 112, THd = 56;
  const cam = E.inOutCubic(seg(lt, 0, 10));
  const OX = w * 0.40 - cam * 30, OY = h * 0.58 - cam * 10, z0 = lerp(0.96, 1.06, cam);
  c.save(); c.translate(OX, OY); c.scale(z0, z0);
  const P = (i, j, z = 0) => [(i - j) * TWd / 2, (i + j - (N - 1)) * THd / 2 - z];
  const poly = (pts, fill) => { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };
  const sIn = E.outExpo(seg(lt, 0, 0.9));
  const D = 36 * sIn, e0 = -0.5, e1 = N - 0.5;
  c.save(); c.globalAlpha = sIn;
  c.save(); c.shadowColor = 'rgba(60,40,160,.35)'; c.shadowBlur = 60; c.shadowOffsetY = 40;
  poly([P(e0, e0), P(e1, e0), P(e1, e1, -D), P(e0, e1, -D)], 'rgba(0,0,0,.01)'); c.restore();
  poly([P(e1, e0), P(e1, e1), P(e1, e1, -D), P(e1, e0, -D)], '#a99ef0');
  poly([P(e0, e1), P(e1, e1), P(e1, e1, -D), P(e0, e1, -D)], '#8c80e0');
  poly([P(e0, e0), P(e1, e0), P(e1, e1), P(e0, e1)], '#e6e1ff');
  c.restore();
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i; if (j < 0 || j >= N) continue;
    const u = E.outBack(seg(lt, 0.15 + s * 0.05, 0.55 + s * 0.05));
    if (u <= 0) continue;
    const z = (1 - u) * 120, q = 0.46;
    c.save(); c.globalAlpha = clamp(u * 2);
    poly([P(i - q, j - q, z), P(i + q, j - q, z), P(i + q, j + q, z), P(i - q, j + q, z)], (i + j) % 2 ? '#fbfaff' : '#f3f0ff');
    c.restore();
  }
  const AS = [
    { i: 1, j: 1, h: 64, c: '#b7a6ff', tag: '声音' }, { i: 5, j: 1, h: 96, c: '#7fe0c4', tag: '虚拟形象' },
    { i: 0, j: 4, h: 50, c: '#ffb3c7' }, { i: 4, j: 5, h: 74, c: '#8fc3ff', tag: '灵感' },
    { i: 5, j: 4, h: 42, c: '#ffd27a' }, { i: 2, j: 6, h: 84, c: '#b7a6ff', tag: '面部' },
    { i: 6, j: 2, h: 56, c: '#ffb3c7' }, { i: 1, j: 3, h: 38, c: '#8fc3ff' }, { i: 3, j: 0, h: 70, c: '#ffd27a', tag: '肖像' },
    { i: 3, j: 3, h: 0, c: '#6b5cff', hero: true },
  ].sort((a, b) => a.i + a.j - (b.i + b.j));
  const heroU = E.outBack(seg(lt, 1.8, 3.0));
  let heroTop = null;
  for (const a of AS) {
    const d = 0.7 + (a.i + a.j) * 0.06;
    const u = a.hero ? 1 : E.outBack(seg(lt, d, d + 0.5));
    if (u <= 0) continue;
    const hh = a.hero ? lerp(24, 170, heroU) : a.h * u;
    const q = a.hero ? 0.38 : 0.32, i = a.i, j = a.j;
    if (a.hero) {
      const pul = 0.5 + 0.5 * Math.sin(lt * 4);
      c.save(); c.globalAlpha = seg(lt, 1.6, 2.2);
      poly([P(i - .5, j - .5), P(i + .5, j - .5), P(i + .5, j + .5), P(i - .5, j + .5)], `rgba(107,92,255,${0.18 + 0.12 * pul})`);
      c.beginPath(); [P(i - .56, j - .56), P(i + .56, j - .56), P(i + .56, j + .56), P(i - .56, j + .56)].forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      c.strokeStyle = '#6b5cff'; c.lineWidth = 2.5; c.setLineDash([8, 6]); c.lineDashOffset = -lt * 30; c.stroke(); c.setLineDash([]);
      c.restore();
    }
    poly([P(i + q, j - q, 0), P(i + q, j + q, 0), P(i + q, j + q, hh), P(i + q, j - q, hh)], shade(a.c, -0.1));
    poly([P(i - q, j + q, 0), P(i + q, j + q, 0), P(i + q, j + q, hh), P(i - q, j + q, hh)], shade(a.c, -0.24));
    poly([P(i - q, j - q, hh), P(i + q, j - q, hh), P(i + q, j + q, hh), P(i - q, j + q, hh)], shade(a.c, 0.18));
    // edge highlight
    c.beginPath(); c.moveTo(...P(i + q, j + q, 0)); c.lineTo(...P(i + q, j + q, hh)); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.stroke();
    const [lx, ly] = P(i, j + q, hh / 2);
    if (hh > 30) lockIcon(c, lx, ly + 2, a.hero ? 0.9 : 0.55, 'rgba(255,255,255,.85)');
    if (a.hero) heroTop = P(i, j, hh);
    if (a.tag) {
      const tu = E.outBack(seg(lt, 1.2 + (a.i + a.j) * 0.05, 1.7 + (a.i + a.j) * 0.05));
      const [tx, ty] = P(i, j, hh + 36 + Math.sin(lt * 2 + i) * 4);
      if (tu > 0) {
        c.save(); c.translate(tx, ty); c.scale(tu, tu);
        const ww = tw(c, a.tag, F(700, 15, CJK)) + 44;
        c.shadowColor = 'rgba(60,40,160,.25)'; c.shadowBlur = 12; c.shadowOffsetY = 4;
        fillRR(c, -ww / 2, -17, ww, 34, 17, '#fff'); c.shadowColor = 'transparent';
        lockIcon(c, -ww / 2 + 17, 2, 0.42, '#6b5cff');
        txt(c, a.tag, 9, 6, { font: F(700, 15, CJK), align: 'center', color: '#2a2060' });
        c.restore();
      }
    }
  }
  // hero portrait hologram above the hero cube
  if (heroTop && heroU > 0.2) {
    const [tx, ty] = heroTop;
    glowDisc(c, tx, ty, 150, [255, 255, 255], 0.6 * heroU);
    c.save(); c.globalAlpha = clamp(heroU);
    const beam = c.createLinearGradient(0, ty - 170, 0, ty); beam.addColorStop(0, 'rgba(107,92,255,0)'); beam.addColorStop(1, 'rgba(107,92,255,.35)');
    c.fillStyle = beam; c.beginPath(); c.moveTo(tx - 40, ty); c.lineTo(tx + 40, ty); c.lineTo(tx + 70, ty - 170); c.lineTo(tx - 70, ty - 170); c.closePath(); c.fill();
    museFace(c, tx - 4, ty - 100 + Math.sin(lt * 2) * 4, 0.24, lt, {});
    c.restore();
  }
  c.restore();
  const hx = heroTop ? OX + heroTop[0] * z0 : 0, hy = heroTop ? OY + heroTop[1] * z0 : 0;
  // product card
  const cu = E.outExpo(seg(lt, 3.0, 3.8));
  const kx = 726, ky = 150, kw = 360, kh = 268;
  if (cu > 0) {
    c.save(); c.globalAlpha = cu;
    c.strokeStyle = '#6b5cff'; c.lineWidth = 2; c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(hx + 10, hy - 30); c.lineTo(kx, ky + 140); c.stroke(); c.setLineDash([]);
    circle(c, hx + 10, hy - 30, 6, '#6b5cff');
    c.translate(0, (1 - cu) * 30);
    c.shadowColor = 'rgba(50,30,150,.3)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    fillRR(c, kx, ky, kw, kh, 22, '#fff'); c.shadowColor = 'transparent';
    c.save(); rr(c, kx + 22, ky + 22, 64, 64, 16); c.clip(); c.fillStyle = '#121a46'; c.fillRect(kx + 22, ky + 22, 64, 64); museFace(c, kx + 50, ky + 62, 0.15, lt, {}); c.restore();
    txt(c, '林夏 · 面部', kx + 102, ky + 50, { font: F(900, 22, CJK), color: '#1d1640' });
    fillRR(c, kx + 102, ky + 62, 86, 24, 12, '#ece8ff');
    txt(c, '使用权', kx + 145, ky + 79, { font: F(700, 13, CJK), color: '#6b5cff', align: 'center' });
    txt(c, '¥ 2,000', kx + 26, ky + 150, { font: F(900, 46), color: '#1d1640' });
    txt(c, '/ 次', kx + 196, ky + 150, { font: F(500, 18, CJK), color: '#8a83b5' });
    txt(c, '所有权 · 永远归你', kx + 26, ky + 186, { font: F(700, 16, CJK), color: '#0f9d6e' });
    const pressed = lt >= 6.2;
    const bg2 = c.createLinearGradient(kx, 0, kx + kw, 0); bg2.addColorStop(0, '#7b5cff'); bg2.addColorStop(1, '#5a7bff');
    const pr = 1 - 0.04 * Math.sin(Math.PI * seg(lt, 6.15, 6.4));
    c.save(); c.translate(kx + kw / 2, ky + 228); c.scale(pr, pr);
    fillRR(c, -kw / 2 + 24, -22, kw - 48, 44, 22, pressed ? '#1d1640' : bg2);
    txt(c, pressed ? '已发送给演员' : '申请使用', 0, 7, { font: F(800, 18, CJK), align: 'center' });
    c.restore();
    ripple(c, kx + kw / 2, ky + 228, seg(lt, 6.2, 6.8), [255, 255, 255]);
    c.restore();
  }
  if (lt > 4.4) {
    const mu = E.inOutCubic(seg(lt, 4.6, 6.0));
    cursor(c, lerp(w - 40, kx + kw / 2 + 10, mu), lerp(h - 10, ky + 232, mu), Math.sin(Math.PI * seg(lt, 6.1, 6.4)));
  }
  const fu = seg(lt, 6.8, 8.2);
  if (fu > 0) {
    const px = w - 70, py = 64;
    const pa = E.outBack(seg(lt, 6.6, 7.0));
    c.save(); c.translate(px, py); c.scale(pa, pa);
    fillRR(c, -24, -40, 48, 80, 12, '#1d1640'); fillRR(c, -19, -33, 38, 64, 6, '#6b5cff');
    circle(c, 0, -2, 8, '#fff'); const bump = lt > 8.2 ? Math.max(0, 1 - (lt - 8.2) * 3) : 0;
    circle(c, 22, -36, 9 + bump * 5, '#ff4f8b'); txt(c, '1', 22, -32, { font: F(800, 11), align: 'center' });
    c.restore();
    const sx = kx + kw / 2, sy = ky - 2, qx = sx + 140, qy = py - 30;
    c.save(); c.strokeStyle = 'rgba(107,92,255,.6)'; c.setLineDash([4, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(qx, qy, px - 30, py); c.stroke(); c.setLineDash([]); c.restore();
    if (fu < 1) {
      const u = E.inOutCubic(fu);
      const bx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * qx + u * u * (px - 30);
      const by = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * qy + u * u * py;
      circle(c, bx, by, 9, '#ff4f8b'); circle(c, bx, by, 18, 'rgba(255,79,139,.25)');
    }
  }
}

/* ───────────────────────── 03 · your yes (glassmorphism) ───────────────────────── */
function aurora(c, lt, w, h) {
  c.fillStyle = '#140a3c'; c.fillRect(0, 0, w, h);
  const B = [['#7b4dff', 0.2, 0.3, 420], ['#2d6bff', 0.75, 0.25, 460], ['#ff4fa3', 0.6, 0.85, 380], ['#29d3ff', 0.15, 0.85, 360], ['#ff9a4f', 0.95, 0.7, 260]];
  B.forEach(([col, x, y, r], i) => {
    const px = w * x + Math.sin(lt * 0.5 + i * 1.7) * 90, py = h * y + Math.cos(lt * 0.4 + i) * 60;
    const g = c.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgb(hex(col), 0.85)); g.addColorStop(1, rgb(hex(col), 0));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
function glass(c, x, y, w, h, r, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.save(); rr(c, x, y, w, h, r); c.clip();
  c.filter = 'blur(28px)'; c.drawImage(AUR, 0, 0); c.filter = 'none';
  c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore();
  const s = c.createLinearGradient(x, y, x + w, y + h);
  s.addColorStop(0, 'rgba(255,255,255,.7)'); s.addColorStop(0.5, 'rgba(255,255,255,.12)'); s.addColorStop(1, 'rgba(255,255,255,.35)');
  rr(c, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); c.strokeStyle = s; c.lineWidth = 1.5; c.stroke();
  c.restore();
}
function stage3(c, lt, w, h) {
  aurora(AUR.getContext('2d'), lt, w, h);
  c.drawImage(AUR, 0, 0);
  const pu = E.outExpo(seg(lt, 0.1, 1.0));
  const PX = 150, PY = 40 + (1 - pu) * 120, PW = 330, PH = 560;
  c.save(); c.globalAlpha = pu;
  c.save(); c.shadowColor = 'rgba(10,0,40,.5)'; c.shadowBlur = 60; c.shadowOffsetY = 24; fillRR(c, PX, PY, PW, PH, 48, 'rgba(255,255,255,.01)'); c.restore();
  glass(c, PX, PY, PW, PH, 48);
  fillRR(c, PX + PW / 2 - 50, PY + 14, 100, 26, 13, 'rgba(10,6,30,.85)');
  txt(c, '9:41', PX + 34, PY + 34, { font: F(700, 15) });
  mark(c, PX + 28, PY + 66, 26);
  txt(c, '米麦', PX + 76, PY + 88, { font: F(900, 24, CJK) });
  for (let i = 0; i < 3; i++) { fillRR(c, PX + 24, PY + 300 + i * 64, PW - 48, 50, 14, 'rgba(255,255,255,.08)'); fillRR(c, PX + 40, PY + 316 + i * 64, 120, 8, 4, 'rgba(255,255,255,.22)'); fillRR(c, PX + 40, PY + 330 + i * 64, 70, 6, 3, 'rgba(255,255,255,.12)'); }
  c.restore();
  const nu = E.outBack(seg(lt, 1.0, 1.6));
  const ny = PY + 128 + (1 - nu) * -90;
  if (nu > 0) {
    c.save(); c.globalAlpha = clamp(nu * 1.5);
    glass(c, PX + 16, ny, PW - 32, 104, 22);
    c.save(); rr(c, PX + 32, ny + 18, 44, 44, 12); c.clip(); c.fillStyle = '#121a46'; c.fillRect(PX + 32, ny + 18, 44, 44); museFace(c, PX + 52, ny + 46, 0.1, lt, {}); c.restore();
    txt(c, '星河影业 想用你的脸', PX + 88, ny + 40, { font: F(800, 16, CJK) });
    txt(c, '广告短片 · 1 次 · ¥2,000', PX + 88, ny + 66, { font: F(500, 14, CJK), color: 'rgba(255,255,255,.8)' });
    txt(c, '刚刚', PX + PW - 34, ny + 90, { font: F(400, 12, CJK), align: 'right', color: 'rgba(255,255,255,.55)' });
    c.restore();
  }
  const su = E.outExpo(seg(lt, 2.4, 3.1));
  if (su > 0) {
    const sy = PY + PH - 300 * su - 12;
    c.save(); rr(c, PX, PY, PW, PH, 48); c.clip();
    glass(c, PX + 10, sy, PW - 20, 300, 34);
    fillRR(c, PX + PW / 2 - 24, sy + 10, 48, 5, 3, 'rgba(255,255,255,.5)');
    txt(c, '同意这次使用？', PX + 34, sy + 56, { font: F(900, 22, CJK) });
    const rows = [['次数', '1 次'], ['期限', '48 小时'], ['你将获得', '¥ 2,000']];
    rows.forEach(([k, v], i) => {
      txt(c, k, PX + 34, sy + 98 + i * 36, { font: F(400, 16, CJK), color: 'rgba(255,255,255,.7)' });
      txt(c, v, PX + PW - 34, sy + 98 + i * 36, { font: F(800, 16, CJK), align: 'right', color: i === 2 ? '#ffd9a0' : '#fff' });
    });
    const by = sy + 214;
    rr(c, PX + 30, by, 96, 52, 26); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.stroke();
    txt(c, '拒绝', PX + 78, by + 33, { font: F(700, 17, CJK), align: 'center' });
    const signU = seg(lt, 4.6, 5.6), done = lt >= 5.6;
    const bx = PX + 138, bw = PW - 168;
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff5fb0'); g.addColorStop(1, '#8a5cff');
    fillRR(c, bx, by, bw, 52, 26, done ? '#19d68c' : 'rgba(255,255,255,.18)');
    if (!done) { c.save(); rr(c, bx, by, bw, 52, 26); c.clip(); fillRR(c, bx, by, lt < 4.6 ? bw : bw * signU, 52, 26, g); c.restore(); }
    if (done) { check(c, bx + 34, by + 26, 1, '#fff', 3.5, seg(lt, 5.6, 5.9)); txt(c, '已同意', bx + bw / 2 + 14, by + 33, { font: F(800, 17, CJK), align: 'center' }); }
    else txt(c, lt < 4.6 ? '同意' : '确认中…', bx + bw / 2, by + 33, { font: F(800, 17, CJK), align: 'center' });
    c.restore();
    if (lt > 3.6 && lt < 5.2) {
      const tu = E.inOutCubic(seg(lt, 3.6, 4.4));
      const fx = lerp(PX + PW + 60, bx + bw / 2 + 10, tu), fy = lerp(PY + PH + 40, by + 28, tu);
      const press = Math.sin(Math.PI * seg(lt, 4.4, 4.7));
      circle(c, fx, fy, 26 - press * 4, 'rgba(255,255,255,.35)'); ring(c, fx, fy, 26 - press * 4, 'rgba(255,255,255,.8)', 2);
    }
    ripple(c, bx + bw / 2 + 10, by + 28, seg(lt, 4.45, 5.1), [255, 255, 255]);
  }
  // right panel: locked until you say yes → unlocked → delivered → paid
  const du = E.outExpo(seg(lt, 0.6, 1.4));
  const DX = 540 + (1 - du) * 80, DY = 70, DW = 560, DH = 470;
  glass(c, DX, DY, DW, DH, 28, du);
  if (du > 0) {
    c.save(); c.globalAlpha = du;
    circle(c, DX + 30, DY + 30, 6, '#ff5f57'); circle(c, DX + 50, DY + 30, 6, '#febc2e'); circle(c, DX + 70, DY + 30, 6, '#28c840');
    txt(c, '星河影业 · 广告短片', DX + 30, DY + 80, { font: F(900, 24, CJK) });
    const open = seg(lt, 5.8, 6.4);
    // preview frame
    const fx = DX + 30, fy = DY + 110, fw = 300, fh = 330;
    c.save(); rr(c, fx, fy, fw, fh, 18); c.clip();
    const gg = c.createLinearGradient(fx, fy, fx + fw, fy + fh); gg.addColorStop(0, '#ff9a4f'); gg.addColorStop(0.5, '#ff4fa3'); gg.addColorStop(1, '#5a3cff');
    c.fillStyle = gg; c.fillRect(fx, fy, fw, fh);
    museFace(c, fx + fw / 2 - 10, fy + fh / 2 + 30, 0.5, lt, {});
    if (open < 1) { c.fillStyle = `rgba(20,10,60,${0.86 * (1 - open)})`; c.fillRect(fx, fy, fw, fh); }
    c.restore();
    rr(c, fx, fy, fw, fh, 18); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.stroke();
    if (open < 1) {
      c.save(); c.globalAlpha *= 1 - open;
      lockIcon(c, fx + fw / 2, fy + fh / 2 - 10, 2.0, '#fff');
      txt(c, '等你同意', fx + fw / 2, fy + fh / 2 + 60, { font: F(800, 20, CJK), align: 'center' });
      c.restore();
    }
    // generation progress then paid
    const gp = seg(lt, 6.2, 7.6);
    const rx = DX + 360;
    if (lt > 6.0) {
      txt(c, gp < 1 ? '生成中' : '已交付', rx, DY + 150, { font: F(800, 20, CJK), alpha: seg(lt, 6.0, 6.3) });
      fillRR(c, rx, DY + 166, 170, 8, 4, 'rgba(255,255,255,.2)'); fillRR(c, rx, DY + 166, 170 * gp, 8, 4, '#ff8bd0');
      txt(c, `${Math.round(gp * 100)}%`, rx + 170, DY + 150, { font: F(700, 16, MONO), align: 'right', alpha: seg(lt, 6.0, 6.3) });
    }
    const pu2 = E.outBack(seg(lt, 7.7, 8.3));
    if (pu2 > 0) {
      c.save(); c.translate(rx + 85, DY + 300); c.scale(pu2, pu2);
      glowDisc(c, 0, 0, 120, [255, 200, 90], 0.5);
      for (let i = 0; i < 5; i++) coin(c, -50 + i * 25, -36 - Math.abs(Math.sin(lt * 5 + i)) * 10 * (1 - seg(lt, 8.3, 9)), 16);
      txt(c, '+ ¥2,000', 0, 30, { font: F(900, 36), align: 'center', color: '#ffe3a8', glow: 'rgba(255,190,80,.8)', glowR: 20 });
      txt(c, '已到账', 0, 62, { font: F(700, 16, CJK), align: 'center', color: 'rgba(255,255,255,.8)' });
      c.restore();
    }
    c.restore();
  }
}

/* ───────────────────────── 04 · your key (HUD) ───────────────────────── */
function stage4(c, lt, w, h) {
  const CY_ = '#3fe8ff', TEAL = '#22ffc4', AMB = '#ffb020', RED = '#ff3d5a';
  let g = c.createRadialGradient(w * 0.42, h * 0.5, 0, w * 0.42, h * 0.5, 700);
  g.addColorStop(0, '#062a2e'); g.addColorStop(1, '#020a0e');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(63,232,255,.06)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  const boot = seg(lt, 0, 1.4);
  const revoked = lt >= 5.0, flash = revoked ? Math.max(0, 1 - (lt - 5.0) * 2.5) : 0;
  const cx = 400, cy = 320, A = Math.PI * 2;
  c.save(); c.translate(cx, cy);
  const r0 = E.outExpo(boot);
  c.save(); c.rotate(lt * 0.25);
  for (let i = 0; i < 120; i++) {
    if (i / 120 > r0) break;
    const a = (i / 120) * A, L = i % 10 === 0 ? 14 : 6;
    line(c, Math.cos(a) * 214, Math.sin(a) * 214, Math.cos(a) * (214 - L), Math.sin(a) * (214 - L), `rgba(63,232,255,${i % 10 === 0 ? .8 : .35})`, 1.5);
  }
  c.restore();
  ring(c, 0, 0, 226, 'rgba(63,232,255,.25)', 1, 0, A * r0);
  c.save(); c.rotate(-lt * 0.6);
  for (let k = 0; k < 4; k++) ring(c, 0, 0, 180, revoked && k === 3 ? rgb(hex(RED), .9) : CY_, 6, k * A / 4 + 0.15, k * A / 4 + 0.15 + (A / 4 - 0.3) * r0);
  c.restore();
  c.save(); c.rotate(lt * 1.1); c.setLineDash([3, 9]); ring(c, 0, 0, 140, 'rgba(34,255,196,.6)', 2); c.setLineDash([]); c.restore();
  const pul = 0.5 + 0.5 * Math.sin(lt * 3);
  glowDisc(c, 0, 0, 130, [34, 255, 196], 0.25 + 0.1 * pul);
  ring(c, 0, 0, 96, 'rgba(34,255,196,.85)', 2, -Math.PI / 2, -Math.PI / 2 + A * E.outCubic(seg(lt, 0.4, 1.4)));
  c.restore();
  c.save(); c.globalAlpha = seg(lt, 0.8, 1.4); c.shadowColor = TEAL; c.shadowBlur = 24;
  keyIcon(c, cx - 32, cy, 0.8, null, TEAL, 4); c.restore();
  txt(c, decode('只在你手里', seg(lt, 1.0, 1.8), 3), cx, cy + 66, { font: F(800, 18, CJK), align: 'center', color: TEAL, ls: 4 });
  const L = [['星河影业', '¥ 4,000', '2 / 3', 150], ['青禾广告', '¥ 10,000', '5 / 10', 330], ['北辰游戏', '¥ 1,200', '1 / 5', 510]];
  L.forEach(([name, money, q, y], i) => {
    const u = E.outExpo(seg(lt, 1.4 + i * 0.25, 2.0 + i * 0.25));
    if (u <= 0) return;
    const bx = 740, isRev = i === 2 && revoked, isRen = i === 0 && lt >= 6.3;
    const col = isRev ? RED : isRen ? TEAL : CY_;
    const a = Math.atan2(y - cy, bx - cx), sx = cx + Math.cos(a) * 228, sy = cy + Math.sin(a) * 228;
    c.save(); c.globalAlpha = u;
    if (isRev) {
      const gl = flash * 30;
      c.setLineDash([10, 10]); line(c, sx, sy, lerp(sx, bx, 0.42) + (hash(Math.floor(lt * 24)) - 0.5) * gl, lerp(sy, y, 0.42), rgb(hex(RED), 0.6), 2);
      line(c, lerp(sx, bx, 0.58), lerp(sy, y, 0.58), bx, y, rgb(hex(RED), 0.3), 2); c.setLineDash([]);
      const mx = lerp(sx, bx, 0.5), my = lerp(sy, y, 0.5);
      line(c, mx - 11, my - 11, mx + 11, my + 11, RED, 3.5); line(c, mx + 11, my - 11, mx - 11, my + 11, RED, 3.5);
    } else {
      line(c, sx, sy, sx + (bx - sx) * u, sy + (y - sy) * u, rgb(hex(col), 0.45), 1.5);
      for (let k = 0; k < 3; k++) { const p = ((lt * 0.7 + k / 3 + i * 0.13) % 1); circle(c, lerp(sx, bx, p), lerp(sy, y, p), 3.5, col); }
    }
    const bw = 360, bh = 100;
    c.translate((1 - u) * 40, 0);
    fillRR(c, bx, y - bh / 2, bw, bh, 6, isRev ? `rgba(255,61,90,${0.12 + flash * 0.4})` : 'rgba(63,232,255,.06)');
    brackets(c, bx, y - bh / 2, bw, bh, 14, col, 2);
    txt(c, name, bx + 24, y - 6, { font: F(800, 26, CJK), color: '#e8fdff' });
    txt(c, isRev ? '已收回' : `已收益 ${money}`, bx + 24, y + 28, { font: F(600, 16, CJK), color: rgb(hex(isRev ? RED : '#ffd27a'), .9) });
    const st = isRev ? '已撤销' : isRen ? '已续期' : '使用中';
    txt(c, st, bx + bw - 22, y - 6, { font: F(800, 20, CJK), color: col, align: 'right' });
    txt(c, isRev ? '— —' : `${q} 次`, bx + bw - 22, y + 28, { font: F(500, 16, CJK), color: 'rgba(232,253,255,.6)', align: 'right' });
    if (i === 2 && lt > 3.6 && !revoked) {
      const hu = seg(lt, 3.6, 4.0), pr = Math.sin(Math.PI * seg(lt, 4.8, 5.0));
      c.save(); c.globalAlpha *= hu;
      fillRR(c, bx + bw - 124 + pr * 2, y + 58, 124 - pr * 4, 38, 4, rgb(hex(AMB), .18 + pr * .4));
      rr(c, bx + bw - 124, y + 58, 124, 38, 4); c.strokeStyle = AMB; c.lineWidth = 1.5; c.stroke();
      txt(c, '一键撤销', bx + bw - 62, y + 84, { font: F(800, 16, CJK), align: 'center', color: AMB });
      c.restore();
    }
    c.restore();
  });
  const ru = seg(lt, 0.6, 1.6);
  txt(c, decode('持钥人', ru, 9), 34, 60, { font: F(600, 15, CJK), color: 'rgba(63,232,255,.7)', ls: 4 });
  txt(c, decode('林夏', ru, 11), 34, 102, { font: F(900, 36, CJK), color: '#e8fdff' });
  const ttl = Math.max(0, 47 * 3600 + 59 * 60 + 12 - Math.floor(lt * 37));
  const hh = String(Math.floor(ttl / 3600)).padStart(2, '0'), mm = String(Math.floor(ttl / 60) % 60).padStart(2, '0'), ss = String(ttl % 60).padStart(2, '0');
  txt(c, `${hh}:${mm}:${ss}`, 34, h - 50, { font: F(600, 36, MONO), color: '#e8fdff', alpha: ru });
  const bu = E.outExpo(seg(lt, 6.8, 7.4));
  if (bu > 0) {
    c.save(); c.globalAlpha = bu;
    fillRR(c, 740, 590 - 22, 360 * bu, 44, 4, 'rgba(34,255,196,.14)');
    txt(c, decode('所有权从未离开你', seg(lt, 6.8, 7.8), 5), 760, 598, { font: F(800, 18, CJK), color: TEAL, ls: 3 });
    c.restore();
  }
  if (flash > 0) { c.fillStyle = `rgba(255,61,90,${flash * 0.25})`; c.fillRect(0, 0, w, h); }
  const sy = (lt * 140) % (h + 80) - 40;
  g = c.createLinearGradient(0, sy - 40, 0, sy); g.addColorStop(0, 'rgba(63,232,255,0)'); g.addColorStop(1, 'rgba(63,232,255,.08)');
  c.fillStyle = g; c.fillRect(0, sy - 40, w, 40);
}

/* ───────────────────────── 05 · value grows (data) ───────────────────────── */
function stage5(c, lt, w, h) {
  const GOLD = '#f2b84b';
  let g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#161c4a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 30; x < w; x += 30) for (let y = 30; y < h; y += 30) { c.beginPath(); c.arc(x, y, 1.2, 0, 7); c.fill(); }
  // tree of uses → one ledger
  const leaves = 8, lx0 = 70, ldx = 64, ly = 520;
  const nodes = [];
  for (let k = 0; k < leaves; k++) nodes.push({ x: lx0 + k * ldx, y: ly, at: 0.2 + k * 0.24, lvl: 0 });
  let cur = nodes.slice(), lvl = 0;
  while (cur.length > 1) {
    const nx = []; lvl++;
    for (let k = 0; k < cur.length; k += 2) { const a = cur[k], b = cur[k + 1]; const n = { x: (a.x + b.x) / 2, y: ly - lvl * 112, at: Math.max(a.at, b.at) + 0.18, lvl, kids: [a, b] }; nx.push(n); nodes.push(n); }
    cur = nx;
  }
  const root = cur[0];
  for (const n of nodes) if (n.kids) for (const k of n.kids) {
    const u = E.outCubic(seg(lt, n.at - 0.18, n.at));
    line(c, k.x, k.y, n.x, n.y, 'rgba(255,255,255,.12)', 2);
    if (u > 0) { c.save(); c.shadowColor = GOLD; c.shadowBlur = 10; line(c, k.x, k.y, lerp(k.x, n.x, u), lerp(k.y, n.y, u), GOLD, 2.5); c.restore(); }
  }
  for (const n of nodes) {
    const u = E.outBack(seg(lt, n.at, n.at + 0.3));
    if (n.lvl === 0 && u > 0) { coin(c, n.x, n.y, 15 * u); continue; }
    const s = n === root ? 24 : 14;
    c.save(); c.translate(n.x, n.y); c.rotate(Math.PI / 4);
    fillRR(c, -s / 2, -s / 2, s, s, 3, 'rgba(255,255,255,.08)');
    if (u > 0) { c.scale(u, u); fillRR(c, -s / 2, -s / 2, s, s, 3, GOLD); }
    c.restore();
  }
  for (let k = 0; k < leaves; k++) { const u = seg(lt, 0.2 + k * 0.24, 0.5 + k * 0.24); txt(c, '+¥', nodes[k].x, ly + 44, { font: F(700, 14), align: 'center', color: 'rgba(255,220,150,.75)', alpha: u }); }
  const rU = seg(lt, root.at, root.at + 0.4);
  if (rU > 0) {
    ring(c, root.x, root.y, 24 + 46 * E.outCubic(rU), `rgba(242,184,75,${1 - rU})`, 2);
    txt(c, '每一次，都记在你的账上', root.x, root.y - 36, { font: F(800, 18, CJK), align: 'center', color: '#ffe3a8', alpha: rU, ls: 2 });
  }
  // value curve
  const X0 = 640, X1 = 1090, Y0 = 500, Y1 = 200;
  const cu = E.inOutCubic(seg(lt, 1.0, 4.8));
  line(c, X0, Y0, X1, Y0, 'rgba(255,255,255,.25)', 1.5);
  for (let k = 1; k <= 3; k++) line(c, X0, Y0 - k * 100, X1, Y0 - k * 100, 'rgba(255,255,255,.06)', 1);
  const fx = (u) => Math.pow(u, 2.1) * 0.92 + 0.04 * Math.sin(u * 14) * u;
  c.save(); c.beginPath(); c.rect(X0, 0, (X1 - X0) * cu, h); c.clip();
  c.beginPath(); c.moveTo(X0, Y0);
  for (let k = 0; k <= 80; k++) { const u = k / 80; c.lineTo(lerp(X0, X1, u), lerp(Y0, Y1, fx(u))); }
  c.lineTo(X1, Y0); c.closePath();
  g = c.createLinearGradient(0, Y1, 0, Y0); g.addColorStop(0, 'rgba(242,184,75,.5)'); g.addColorStop(1, 'rgba(242,184,75,0)');
  c.fillStyle = g; c.fill();
  c.beginPath();
  for (let k = 0; k <= 80; k++) { const u = k / 80; const x = lerp(X0, X1, u), y = lerp(Y0, Y1, fx(u)); k ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = GOLD; c.lineWidth = 4; c.shadowColor = GOLD; c.shadowBlur = 16; c.stroke();
  c.restore();
  if (cu > 0) { const x = lerp(X0, X1, cu), y = lerp(Y0, Y1, fx(cu)); circle(c, x, y, 7, '#fff'); glowDisc(c, x, y, 40, [242, 184, 75], 0.6); }
  for (let k = 0; k < 12; k++) {
    const u = E.outBack(seg(lt, 1.0 + k * 0.3, 1.4 + k * 0.3));
    const x = X0 + 18 + k * 36, bh = 20 + fx((k + 1) / 12) * 120;
    fillRR(c, x, Y0 + 80 - bh * 0.35 * u, 20, bh * 0.35 * u, 3, 'rgba(120,150,255,.55)');
  }
  const val = Math.floor(128600 * E.outCubic(seg(lt, 1.0, 4.8)) / 10) * 10;
  txt(c, '你的收益', X0, 100, { font: F(700, 20, CJK), color: 'rgba(255,255,255,.65)', alpha: seg(lt, 0.8, 1.2), ls: 2 });
  txt(c, `¥ ${val.toLocaleString()}`, X0, 168, { font: F(900, 64), color: '#fff', glow: 'rgba(242,184,75,.7)', glowR: 24, alpha: seg(lt, 0.8, 1.2) });
  const lu = seg(lt, root.at + 0.2, root.at + 0.8);
  if (lu > 0) {
    c.save(); c.setLineDash([6, 6]); c.lineDashOffset = -lt * 40;
    c.strokeStyle = 'rgba(242,184,75,.7)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(root.x + 22, root.y); c.lineTo(lerp(root.x + 22, X0 - 10, lu), lerp(root.y, Y0 - 20, lu)); c.stroke(); c.restore();
  }
}

/* ───────────────────────── intro: MIMUSE hall + transparent logo ───────────────────────── */
function intro(t) {
  if (t >= 6.05) return;
  const zoom = E.inExpo(seg(t, 5.2, 6.0));
  const camZ = -4 + t * 1.6 + zoom * 26;
  museum(ctx, t, camZ);
  ctx.save();
  ctx.globalAlpha = 1 - zoom;
  // dark halo behind the logo so it reads over the hall
  glowDisc(ctx, W / 2, 470, 760, [2, 4, 14], 0.75 * seg(t, 1.4, 2.4));
  const LW = 1080, LX = (W - LW) / 2, LY = 300;
  drawLogo(ctx, LX, LY + (1 - E.outExpo(seg(t, 1.6, 2.6))) * 24, LW, E.inOutCubic(seg(t, 1.7, 2.8)), seg(t, 3.0, 4.3));
  const m = E.outExpo(seg(t, 2.9, 3.5));
  txt(ctx, '米麦  ·  MIME TECH', W / 2, 650 + (1 - m) * 20, { font: F(700, 28, CJK), align: 'center', alpha: m, ls: 8, color: '#e4eeff' });
  const sl = '密码保护资产  数学生长价值';
  ctx.font = F(900, 62, CJK); ctx.letterSpacing = '10px';
  const sw = ctx.measureText(sl).width; let x = W / 2 - sw / 2;
  [...sl].forEach((ch, i) => {
    const u = E.outCubic(seg(t, 3.4 + i * 0.07, 3.8 + i * 0.07));
    txt(ctx, ch, x, 770 + (1 - u) * 30, { font: F(900, 62, CJK), alpha: u, ls: 10, glow: 'rgba(90,150,255,.7)', glowR: 24 });
    ctx.font = F(900, 62, CJK); ctx.letterSpacing = '10px'; x += ctx.measureText(ch).width;
  });
  txt(ctx, 'mimuseai.com', W / 2, 840, { font: F(500, 22, MONO), align: 'center', ls: 4, color: 'rgba(200,220,255,.75)', alpha: seg(t, 4.3, 4.8) });
  ctx.restore();
}

/* ───────────────────────── hook: exhibits → goods ───────────────────────── */
function exhibit(c, kind, x, y, s, t, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  if (kind === 'face') museFace(c, -10, 30, 0.82, t, {});
  if (kind === 'voice') {
    glowDisc(c, 0, 0, 260, [40, 220, 200], 0.35);
    for (let i = 0; i < 96; i++) {
      const an = (i / 96) * Math.PI * 2, hh = 30 + 90 * Math.abs(Math.sin(t * 6 + i * 0.37) * Math.cos(i * 0.21 + t * 2));
      const r0 = 120;
      c.save(); c.rotate(an); fillRR(c, r0, -4, hh, 8, 4, i % 12 === 0 ? '#ffffff' : `rgba(60,${200 + (i % 3) * 18},210,.95)`); c.restore();
    }
    circle(c, 0, 0, 104, 'rgba(10,30,40,.85)'); ring(c, 0, 0, 104, 'rgba(120,255,230,.9)', 3);
    for (let i = 0; i < 7; i++) { const hh = 20 + 50 * Math.abs(Math.sin(t * 9 + i)); fillRR(c, -66 + i * 20, -hh / 2, 10, hh, 5, '#b8fff0'); }
  }
  if (kind === 'avatar') {
    glowDisc(c, 0, 0, 280, [150, 110, 255], 0.35);
    const ry = t * 1.2, rx = 0.5;
    const pr = (v) => { let [px, py, pz] = v; const cx_ = Math.cos(ry), sx_ = Math.sin(ry); [px, pz] = [px * cx_ + pz * sx_, -px * sx_ + pz * cx_]; const cy_ = Math.cos(rx), sy_ = Math.sin(rx); [py, pz] = [py * cy_ - pz * sy_, py * sy_ + pz * cy_]; const k = 4 / (4 + pz); return [px * 150 * k, py * 150 * k, pz]; };
    const V = ICO.v.map(pr);
    c.lineWidth = 2.2;
    for (const [i, j] of ICO.e) { const z = (V[i][2] + V[j][2]) / 2; c.strokeStyle = `rgba(${190 - z * 30},${160 - z * 30},255,${0.85 - z * 0.25})`; c.beginPath(); c.moveTo(V[i][0], V[i][1]); c.lineTo(V[j][0], V[j][1]); c.stroke(); }
    for (const v of V) circle(c, v[0], v[1], 5 - v[2] * 1.5, '#ffffff');
  }
  if (kind === 'spark') {
    glowDisc(c, 0, 0, 300, [255, 190, 90], 0.45);
    c.save(); c.rotate(t * 0.4);
    for (let i = 0; i < 4; i++) {
      c.save(); c.rotate(i * Math.PI / 2);
      c.beginPath(); c.moveTo(0, -170); c.quadraticCurveTo(14, -14, 0, 0); c.quadraticCurveTo(-14, -14, 0, -170);
      const g = c.createLinearGradient(0, -170, 0, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, '#fff4d8'); c.fillStyle = g; c.fill();
      c.restore();
    }
    c.restore();
    circle(c, 0, 0, 22, '#fff');
    for (let i = 0; i < 18; i++) { const an = i * 0.7 + t * (0.6 + (i % 3) * 0.3), r = 70 + (i * 37) % 120; circle(c, Math.cos(an) * r, Math.sin(an) * r * 0.6, 2 + (i % 3), 'rgba(255,230,170,.9)'); }
  }
  c.restore();
}
function pedestal(c, x, y, s, a = 1) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  // spotlight
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(0, -760, 0, 0); g.addColorStop(0, 'rgba(160,200,255,0)'); g.addColorStop(1, 'rgba(160,200,255,.16)');
  c.fillStyle = g; c.beginPath(); c.moveTo(-60, -760); c.lineTo(60, -760); c.lineTo(250, 0); c.lineTo(-250, 0); c.closePath(); c.fill();
  c.restore();
  const body = c.createLinearGradient(-230, 0, 230, 0); body.addColorStop(0, '#0b1230'); body.addColorStop(0.5, '#1d2b62'); body.addColorStop(1, '#0b1230');
  c.fillStyle = body; c.fillRect(-230, 0, 460, 260);
  c.beginPath(); c.ellipse(0, 0, 230, 42, 0, 0, 7); c.fillStyle = '#26377a'; c.fill();
  c.strokeStyle = 'rgba(214,178,104,.8)'; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.ellipse(0, 0, 200, 34, 0, 0, 7); c.strokeStyle = 'rgba(180,210,255,.35)'; c.lineWidth = 1.2; c.stroke();
  c.restore();
}
const HOOK = [
  { a: 6.0, zh: '一张脸', en: 'A FACE', kind: 'face', price: '¥ 2,000 / 次' },
  { a: 7.0, zh: '一段声音', en: 'A VOICE', kind: 'voice', price: '¥ 800 / 次' },
  { a: 8.0, zh: '一个虚拟形象', en: 'A DIGITAL AVATAR', kind: 'avatar', price: '¥ 1,500 / 次' },
  { a: 9.0, zh: '你的灵感', en: 'YOUR MUSE', kind: 'spark', price: '¥ 600 / 次' },
];
function hook(t) {
  if (t < 5.95 || t >= 11.05) return;
  // the camera keeps walking down the hall
  const camZ = 2 + (t - 6) * 0.9;
  museum(ctx, t, camZ, { vy: -40 });
  glowDisc(ctx, W / 2, H / 2, 900, [2, 4, 14], 0.55);
  const fin = t >= 10.0;
  if (!fin) {
    let k = 0; for (let i = 0; i < HOOK.length; i++) if (t >= HOOK[i].a) k = i;
    const it = HOOK[k], lt = t - it.a;
    const enter = E.outBack(seg(lt, 0, 0.45)), leave = E.inCubic(seg(lt, 0.82, 1.0));
    pedestal(ctx, 1180, 830, 1, 1);
    const ex = 1180, ey = 520 - (1 - enter) * 60 - leave * 40;
    exhibit(ctx, it.kind, ex, ey, lerp(0.6, 1, enter) * (1 - leave * 0.3), t, clamp(enter) * (1 - leave));
    // title slam
    const p = E.outExpo(seg(lt, 0.02, 0.35));
    ctx.save(); ctx.globalAlpha = p * (1 - leave);
    txt(ctx, it.zh, 180, 520 + (1 - p) * 40, { font: F(900, it.zh.length > 4 ? 112 : 138, CJK), ls: 6, glow: 'rgba(80,140,255,.55)', glowR: 30 });
    txt(ctx, it.en, 186, 580 + (1 - p) * 40, { font: F(700, 22), ls: 10, color: 'rgba(210,225,255,.75)' });
    ctx.restore();
    // price tag
    const pu = E.outBack(seg(lt, 0.2, 0.55)) * (1 - leave);
    if (pu > 0) {
      ctx.save(); ctx.translate(1470, 380); ctx.rotate(-0.06); ctx.scale(pu, pu);
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      fillRR(ctx, 0, 0, 300, 130, 18, 'rgba(250,246,236,.96)'); ctx.shadowColor = 'transparent';
      circle(ctx, 22, 22, 7, '#c9a96a');
      txt(ctx, '商品 · 使用权', 40, 30, { font: F(700, 15, CJK), color: '#8a6a2a', ls: 2 });
      txt(ctx, it.price, 24, 92, { font: F(900, 38), color: '#1a1a2e' });
      ctx.restore();
      line(ctx, 1490, 386, ex + 80, ey - 60, `rgba(214,178,104,${0.6 * pu})`, 1.5);
    }
  } else {
    // finale: all four exhibits become goods
    const lt = t - 10.0;
    const pos = [[330, 700, 'face'], [770, 680, 'voice'], [1170, 680, 'avatar'], [1600, 700, 'spark']];
    pos.forEach(([x, y, kind], i) => {
      const u = E.outBack(seg(lt, i * 0.06, 0.4 + i * 0.06));
      pedestal(ctx, x, y + 120, 0.5, clamp(u));
      exhibit(ctx, kind, x, y - 40, 0.42 * u, t, clamp(u));
      const tu = E.outBack(seg(lt, 0.25 + i * 0.06, 0.55 + i * 0.06));
      if (tu > 0) { ctx.save(); ctx.translate(x, y + 82); ctx.scale(tu, tu); fillRR(ctx, -70, -18, 140, 36, 18, 'rgba(250,246,236,.95)'); txt(ctx, HOOK[i].price.replace(' / 次', ''), 0, 7, { font: F(800, 18), align: 'center', color: '#1a1a2e' }); ctx.restore(); }
    });
    const p = E.outExpo(seg(lt, 0.0, 0.4));
    ctx.save(); ctx.globalAlpha = p;
    txt(ctx, '在米麦，都可以成为商品', W / 2, 300 + (1 - p) * 30, { font: F(900, 96, CJK), align: 'center', ls: 6, glow: 'rgba(80,140,255,.6)', glowR: 34 });
    txt(ctx, 'ON MIME, ALL OF IT BECOMES YOURS TO SELL', W / 2, 360 + (1 - p) * 30, { font: F(700, 20), align: 'center', ls: 8, color: 'rgba(210,225,255,.7)' });
    ctx.restore();
    const out = E.inExpo(seg(t, 10.7, 11.0));
    if (out > 0) { ctx.fillStyle = `rgba(6,8,15,${out})`; ctx.fillRect(0, 0, W, H); }
  }
}

/* ───────────────────────── outro ───────────────────────── */
function outro(t) {
  if (t < 52.9) return;
  const camZ = 9 + (t - 53) * 0.5;
  ctx.save(); ctx.globalAlpha = seg(t, 52.9, 53.5);
  museum(ctx, t, camZ, { vy: -30 });
  glowDisc(ctx, W / 2, 470, 820, [2, 4, 14], 0.75);
  const LW = 1000, LX = (W - LW) / 2, LY = 250;
  drawLogo(ctx, LX, LY + (1 - E.outExpo(seg(t, 53.0, 53.8))) * 30, LW, E.inOutCubic(seg(t, 53.1, 53.9)), seg(t, 54.2, 55.4));
  const m = E.outExpo(seg(t, 53.7, 54.3));
  txt(ctx, '米麦  ·  MIME TECH', W / 2, 590 + (1 - m) * 16, { font: F(700, 30, CJK), align: 'center', alpha: m, ls: 8, color: '#e4eeff' });
  const sU = E.outExpo(seg(t, 54.2, 55.0));
  ctx.save(); ctx.globalAlpha *= sU;
  ctx.font = F(900, 78, CJK); ctx.letterSpacing = '12px'; ctx.textAlign = 'center';
  const g = ctx.createLinearGradient(W / 2 - 540, 0, W / 2 + 540, 0);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d6e6ff'); g.addColorStop(1, '#9cc0ff');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(80,140,255,.7)'; ctx.shadowBlur = 34;
  ctx.fillText('密码保护资产  数学生长价值', W / 2, 726 + (1 - sU) * 24);
  ctx.restore();
  txt(ctx, 'CRYPTOGRAPHY PROTECTS ASSETS  ·  MATHEMATICS GROWS VALUE', W / 2, 786, { font: F(600, 18), align: 'center', ls: 6, color: 'rgba(200,215,255,.75)', alpha: seg(t, 54.8, 55.4) });
  const du = E.outExpo(seg(t, 55.4, 56.0));
  if (du > 0) {
    ctx.save(); ctx.globalAlpha *= du;
    const wd = 380; fillRR(ctx, W / 2 - wd / 2, 832, wd, 56, 28, 'rgba(255,255,255,.08)');
    rr(ctx, W / 2 - wd / 2 + 0.5, 832.5, wd - 1, 55, 28); ctx.strokeStyle = 'rgba(160,200,255,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    txt(ctx, 'mimuseai.com', W / 2, 870, { font: F(600, 26, MONO), align: 'center', ls: 2, color: '#e8f0ff' });
    ctx.restore();
  }
  txt(ctx, '演示画面 · 部分能力为原型模拟实现', W / 2, H - 40, { font: F(400, 13, CJK), align: 'center', color: 'rgba(255,255,255,.32)', ls: 1, alpha: seg(t, 56, 56.5) });
  ctx.restore();
  const end = seg(t, 59.3, 60);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
}
const CUTS = [11, 19.5, 28, 37, 46, 53];
function cutFlash(t) {
  for (const cT of CUTS) {
    const u = seg(t, cT - 0.25, cT + 0.3);
    if (u <= 0 || u >= 1) continue;
    const x = lerp(-600, W + 600, E.inOutCubic(u));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 300, 0, x + 300, 0);
    g.addColorStop(0, 'rgba(120,160,255,0)'); g.addColorStop(0.5, `rgba(160,200,255,${0.35 * Math.sin(u * Math.PI)})`); g.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.setTransform(1, 0, -0.35, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(x - 300, 0, 900, H);
    ctx.restore();
  }
}

/* ───────────────────────── main ───────────────────────── */
let ICO = null;
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  background(t);
  intro(t);
  hook(t);
  for (const ch of CHAPTERS) drawChapter(ch, t);
  outro(t);
  chrome(t);
  cutFlash(t);
  grain(t);
}
function makeNebula() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), r = rng(5);
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#2a5bb8'); g.addColorStop(0.5, '#173c86'); g.addColorStop(1, '#0c1d4a');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.filter = 'blur(14px)';
  for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S, rad = 30 + r() * 140; const gg = x.createRadialGradient(px, py, 0, px, py, rad); const col = r() < 0.5 ? [120, 190, 255] : [190, 225, 255]; gg.addColorStop(0, rgb(col, 0.25 + r() * 0.25)); gg.addColorStop(1, rgb(col, 0)); x.fillStyle = gg; x.fillRect(0, 0, S, S); }
  x.filter = 'blur(2px)';
  x.strokeStyle = 'rgba(210,235,255,.35)'; x.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) { x.beginPath(); let px = r() * S, py = r() * S; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 120; py += (r() - 0.3) * 60; x.quadraticCurveTo(px + (r() - 0.5) * 60, py + (r() - 0.5) * 60, px, py); } x.stroke(); }
  x.filter = 'none';
  for (let i = 0; i < 160; i++) circle(x, r() * S, r() * S, r() * 1.4 + 0.3, `rgba(255,255,255,${0.4 + r() * 0.6})`);
  return c;
}
function makeIco() {
  const p = (1 + Math.sqrt(5)) / 2, v = [];
  for (const a of [-1, 1]) for (const b of [-p, p]) { v.push([0, a, b], [a, b, 0], [b, 0, a]); }
  const n = v.map(q => { const l = Math.hypot(...q); return q.map(z => z / l); });
  const e = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (Math.abs(Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]) - 2) < 1e-6) e.push([i, j]);
  return { v: n, e };
}
async function boot() {
  const faces = [
    ['SC', 'noto-sans-sc-chinese-simplified-400-normal.woff2', 400], ['SC', 'noto-sans-sc-chinese-simplified-700-normal.woff2', 700], ['SC', 'noto-sans-sc-chinese-simplified-900-normal.woff2', 900],
    ['SC', 'noto-sans-sc-chinese-simplified-700-normal.woff2', 500], ['SC', 'noto-sans-sc-chinese-simplified-700-normal.woff2', 600], ['SC', 'noto-sans-sc-chinese-simplified-900-normal.woff2', 800],
    ['Inter', 'inter-latin-300-normal.woff2', 300], ['Inter', 'inter-latin-400-normal.woff2', 400], ['Inter', 'inter-latin-600-normal.woff2', 500], ['Inter', 'inter-latin-600-normal.woff2', 600],
    ['Inter', 'inter-latin-800-normal.woff2', 700], ['Inter', 'inter-latin-800-normal.woff2', 800], ['Inter', 'inter-latin-900-normal.woff2', 900],
    ['JBM', 'jetbrains-mono-latin-400-normal.woff2', 400], ['JBM', 'jetbrains-mono-latin-400-normal.woff2', 500], ['JBM', 'jetbrains-mono-latin-600-normal.woff2', 600],
  ];
  await Promise.all(faces.map(async ([fam, file, wt]) => {
    const f = new FontFace(fam, `url(../fonts/${file})`, { weight: String(wt) });
    await f.load(); document.fonts.add(f);
  }));
  LOGO = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/logo.png'; });
  // light logo: mark brightened, wordmark lit with a white → ice-blue gradient (keeps the transparent original's shapes)
  LOGO_L = document.createElement('canvas'); LOGO_L.width = 2000; LOGO_L.height = 475;
  { const x = LOGO_L.getContext('2d');
    x.filter = 'brightness(1.45) saturate(1.15) contrast(1.05)'; x.drawImage(LOGO, 0, 0, 820, 475, 0, 0, 820, 475); x.filter = 'none';
    const tx = document.createElement('canvas'); tx.width = 1180; tx.height = 475; const y = tx.getContext('2d');
    y.drawImage(LOGO, 820, 0, 1180, 475, 0, 0, 1180, 475);
    y.globalCompositeOperation = 'source-in';
    const g = y.createLinearGradient(0, 0, 1180, 475); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e2ecff'); g.addColorStop(1, '#9fc2ff');
    y.fillStyle = g; y.fillRect(0, 0, 1180, 475);
    x.drawImage(tx, 820, 0); }
  GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 512;
  const g = GRAIN.getContext('2d'), id = g.createImageData(512, 512), r = rng(3);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  AUR = document.createElement('canvas'); AUR.width = CW; AUR.height = CHH;
  NEB = makeNebula();
  ICO = makeIco();
  window.READY = true;
}
window.render = render; window.boot = boot; window.DUR = DUR; window.FPS = FPS;
