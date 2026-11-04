/* 米麦 MIME TECH · 产品说明书 v7 — 密数科学研究院 出品（60 s, 1920×1080, 30 fps）
 * Loaded after film.js (drawing library: frontFace, plateIcon, drawLogo, keyIcon, lockIcon, txt…), ../lib/cmkit.js (springs)
 * and v7_vo.js (voice-over timings written by tools/vo_v7.py). Replaces render().
 *
 * Built from three Apple films the user supplied (Creator Studio, Watch Series 12, Apple Card):
 *  · every section is ONE solid colour field chosen from its subject — no grids, particles, floors or slide frames;
 *    the colour changes every few seconds (indigo, emerald, white, orange, cream, plum, gold, midnight, black, green)
 *  · one big hero object, cropped and lit; one line of type; captions build phrase by phrase with the voice
 *  · the hero shape becomes the next field (iris from the hero); hard cuts only on the beat, in the verb run
 *  · craft shot: a needle engraves the 米麦 mark and the owner's name into a white card (Apple Card)
 *  · kinetic verbs, one effect each (Creator Studio); the giant toggle in a green glow (Watch battery)
 *  · ends on black in silence: logo, 密数科学研究院 出品
 * 0–3.4 出品 · 3.4–5.85 米麦 产品说明书 · 5.85–12.85 七种资产 · 12.85–15 都是你的资产 · 15–21 01 上传 · 21–27 02 上架 ·
 * 27–34 03 授权 · 34–40 04 掌控 · 40–47.5 05 收益 · 47.5–51.7 动词 · 51.7–53.8 由你决定 · 53.8–57 口号 · 57–60 落版
 */
const A7 = {
  white: '#f5f5f7', grey: '#86868b', grey2: '#a1a1a6', ink: '#1d1d1f', inkGrey: '#6e6e73',
  gold: '#f5c15a', green: '#30d158', pink: '#ff4fd8',
};
const sp = (t, t0, w = 12, z = 0.85) => cmStep(t - t0, w, z);
const VO = () => window.V7_VO || [];
const silver = (c, x, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e8e8ed'); g.addColorStop(1, '#a9a9b2'); return g; };
const goldG = (c, x0, x1) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#ffe7a3'); g.addColorStop(0.5, '#f5c15a'); g.addColorStop(1, '#d08f2a'); return g; };
const offs = {};
function oc7(name, w, h) { let o = offs[name]; if (!o) { o = document.createElement('canvas'); o.width = w; o.height = h; offs[name] = o; } return o; }

/* ───────────────────────── solid colour fields ───────────────────────── */
// [start, colour, mode, cx, cy, duration] — 'iris' grows the new colour from the hero, 'fade' cross-dissolves
const FIELDS = [
  [0, '#000000', 'cut'],
  [5.85, '#1f2a7a', 'iris', 960, 560, 0.42],
  [6.85, '#062a20', 'iris', 960, 640, 0.36], [7.85, '#f5f5f7', 'iris', 960, 640, 0.36], [8.85, '#ff5a1f', 'iris', 960, 640, 0.36],
  [9.85, '#efe9dc', 'iris', 960, 640, 0.36], [10.85, '#3b1352', 'iris', 960, 640, 0.36], [11.85, '#ffc934', 'iris', 960, 640, 0.36],
  [12.85, '#000000', 'iris', 960, 640, 0.4],
  [14.95, '#0a0e2a', 'fade', 0, 0, 0.5],
  [20.85, '#f5f5f7', 'fade', 0, 0, 0.5],
  [26.9, '#26102f', 'fade', 0, 0, 0.5],
  [33.85, '#000000', 'fade', 0, 0, 0.4],
  [39.9, '#f6c445', 'iris', 830, 560, 0.5],
  [47.45, '#000000', 'iris', 1210, 640, 0.5],
];
function field(t) {
  let k = 0; for (let i = 0; i < FIELDS.length; i++) if (t >= FIELDS[i][0]) k = i;
  const [t0, col, mode, cx, cy, d] = FIELDS[k], prev = k ? FIELDS[k - 1][1] : col;
  const u = mode === 'cut' ? 1 : E.inOutCubic(clamp((t - t0) / d));
  if (mode === 'fade') { ctx.fillStyle = rgb(mix(hex(prev), hex(col), u)); ctx.fillRect(0, 0, W, H); return; }
  ctx.fillStyle = prev; ctx.fillRect(0, 0, W, H);
  if (u <= 0) return;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4;
  ctx.beginPath(); ctx.arc(cx, cy, R * u, 0, 7); ctx.fillStyle = col; ctx.fill();
}

/* ───────────────────────── type ───────────────────────── */
// blur-in text: u 0→1 sharpens and rises; ex 0→1 blurs out and lifts
function bt(c, s, x, y, u, o = {}) {
  const ex = o.ex || 0; if (u <= 0 || ex >= 1) return;
  const e = E.outCubic(clamp(u));
  c.save(); c.globalAlpha *= e * (1 - ex);
  const b = (1 - e) * (o.blur || 12) + ex * 10; if (b > 0.4) c.filter = `blur(${b.toFixed(1)}px)`;
  txt(c, s, x, y + (1 - e) * (o.dy === undefined ? 16 : o.dy) - ex * 12, o);
  c.restore();
}
// a voice-over line as an on-screen caption: each phrase appears as it is spoken
// o: size, w, color, col[k] (colour or (x, y, w) => gradient per phrase), lines (one phrase per line), lh, align, out, strip
function voCap(i, x, y, t, o = {}) {
  const L = VO()[i]; if (!L) return;
  const size = o.size || 34, font = F(o.w || 600, size, CJK), ls = o.ls === undefined ? 1 : o.ls;
  const out = o.out !== undefined ? o.out : L.t + L.d + 1.0;
  const ex = clamp((t - out) / 0.35); if (ex >= 1 || t < L.t - 0.2) return;
  const S = L.ph.map(p => (o.strip ? p.s.replace(/[，]$/, '') : p.s));
  ctx.save(); ctx.font = font; ctx.letterSpacing = ls + 'px';
  const ws = S.map(s => ctx.measureText(s).width); ctx.restore();
  const total = ws.reduce((a, b) => a + b, 0);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  L.ph.forEach((p, k) => {
    const u = clamp((t - (L.t + p.a - 0.06)) / 0.34);
    const px = o.lines ? (o.align === 'center' ? x - ws[k] / 2 : x) : cx, py = o.lines ? y + k * (o.lh || size * 1.45) : y;
    let col = (o.col && o.col[k]) || o.color || A7.white;
    if (typeof col === 'function') col = col(px, py, ws[k]);
    bt(ctx, S[k], px, py, u, { font, color: col, ls, ex, dy: o.dy, glow: o.glow, glowR: o.glowR });
    cx += ws[k];
  });
}
function eyebrow(n, t, a, b, dark) {
  const u = E.outCubic(clamp((t - a - 0.25) / 0.45)) * (1 - clamp((t - (b - 0.45)) / 0.3));
  if (u <= 0) return;
  const c1 = dark ? '#6e6e73' : '#86868b';
  txt(ctx, '米麦 产品说明书', W / 2 - 18, 96, { font: F(600, 17, CJK), color: c1, align: 'right', alpha: u, ls: 4 });
  circle(ctx, W / 2, 90, 2.4, dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.4)');
  txt(ctx, `第 ${n} 步 / 共 5 步`, W / 2 + 18, 96, { font: F(600, 17, CJK), color: c1, align: 'left', alpha: u, ls: 4 });
}
function tapAt(x, y, press, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  circle(ctx, x, y, 34 - press * 6, `rgba(255,255,255,${0.28 + press * 0.2})`);
  ring(ctx, x, y, 34 - press * 6, 'rgba(255,255,255,.65)', 2);
  ctx.restore();
}
function rippleAt(x, y, u, col = '255,255,255') { if (u <= 0 || u >= 1) return; ring(ctx, x, y, 30 + 90 * E.outCubic(u), `rgba(${col},${0.6 * (1 - u)})`, 3); }

/* ───────────────────────── perspective: a flat image turned about its vertical axis ───────────────────────── */
function persp(img, cx, cy, w, h, ry, o = {}) {
  const N = 90, f = 2400, iw = img.width, ih = img.height, cs = Math.cos(ry), sn = Math.sin(ry);
  const back = cs < 0, src = back && o.back ? o.back : img;
  const P = (x) => { const k = f / (f + x * sn); return [cx + x * cs * k, k]; };
  ctx.save(); if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  const shade = 1 - 0.32 * Math.abs(sn); if (shade < 0.995) ctx.filter = `brightness(${shade.toFixed(3)})`;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const [X0, k0] = P((u0 - 0.5) * w), [X1, k1] = P((u1 - 0.5) * w), k = (k0 + k1) / 2, hh = h * k;
    const s0 = back ? 1 - u1 : u0, dx = Math.min(X0, X1), dw = Math.abs(X1 - X0);
    if (dw < 0.05) continue;
    ctx.drawImage(src, s0 * iw, 0, (u1 - u0) * iw, ih, dx - 0.35, cy - hh / 2, dw + 0.7, hh);
  }
  ctx.restore();
}

/* ───────────────────────── 0–3.4 出品 · 3.4–5.85 米麦 产品说明书 ───────────────────────── */
function opening(t) {
  if (t > 3.5) return;
  const ex = clamp((t - 2.85) / 0.45);
  const lw = 300 * E.inOutCubic(clamp((t - 0.3) / 0.7));
  ctx.save(); ctx.globalAlpha = 1 - ex;
  if (lw > 0) { const g = goldG(ctx, W / 2 - lw / 2, W / 2 + lw / 2); ctx.fillStyle = g; ctx.fillRect(W / 2 - lw / 2, 608, lw, 2); }
  ctx.restore();
  bt(ctx, '密数科学研究院', W / 2, 560, (t - 0.6) / 0.6, { font: F(700, 60, CJK), color: silver(ctx, 0, 500, 570), align: 'center', ls: 10, ex });
  bt(ctx, '出品', W / 2, 670, (t - 1.15) / 0.5, { font: F(600, 30, CJK), color: A7.grey2, align: 'center', ls: 16, ex });
  bt(ctx, 'MISHU RESEARCH INSTITUTE  ·  PRESENTS', W / 2, 712, (t - 1.45) / 0.6, { font: F(600, 15), color: A7.grey, align: 'center', ls: 6, ex });
}
function titleCard(t) {
  if (t < 3.3 || t > 5.9) return;
  const ex = clamp((t - 5.5) / 0.3), u = sp(t, 3.45, 9, 0.9);
  // 米麦, silver, with one light sweep across the letters
  const o = oc7('title', 1100, 360), c = o.getContext('2d');
  c.clearRect(0, 0, o.width, o.height);
  c.font = F(900, 250, CJK); c.letterSpacing = '36px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = silver(c, 0, 60, 300); c.fillText('米麦', 550 + 18, 290);
  const sx = lerp(-300, 1400, clamp((t - 4.25) / 0.95));
  c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(sx - 160, 0, sx + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, o.width, o.height); c.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha = clamp(u * 1.2) * (1 - ex);
  const b = (1 - clamp(u)) * 16 + ex * 12; if (b > 0.4) ctx.filter = `blur(${b.toFixed(1)}px)`;
  const s = 1.06 - 0.06 * u + 0.012 * (t - 3.45);
  ctx.translate(W / 2, 470); ctx.scale(s, s); ctx.drawImage(o, -550, -250); ctx.restore();
  bt(ctx, '产品说明书', W / 2 + 8, 640, (t - 3.85) / 0.5, { font: F(600, 40, CJK), color: A7.white, align: 'center', ls: 18, ex });
  bt(ctx, 'PRODUCT MANUAL', W / 2, 690, (t - 4.05) / 0.5, { font: F(600, 16), color: A7.grey, align: 'center', ls: 8, ex });
  voCap(0, W / 2, 846, t, { size: 30, color: A7.grey2, align: 'center', out: 5.5, col: [A7.grey2, A7.white] });
}

/* ───────────────────────── 5.85–12.85 七种资产: one colour field each ───────────────────────── */
const PL7 = [
  { zh: '一张脸', en: 'A FACE', fg: '#ffffff', icon: 'face' },
  { zh: '一段声音', en: 'A VOICE', fg: '#ffffff', icon: 'voice' },
  { zh: '一个虚拟形象', en: 'A DIGITAL AVATAR', fg: '#1d1d1f', icon: 'avatar' },
  { zh: '一段经验', en: 'EXPERIENCE', fg: '#ffffff', icon: 'exp' },
  { zh: '一件文化数字资产', en: 'CULTURAL HERITAGE', fg: '#14286e', icon: 'vase' },
  { zh: '一幅作品', en: 'A WORK OF ART', fg: '#ffffff', icon: 'art' },
  { zh: '一个灵感', en: 'A SPARK OF MUSE', fg: '#1d1d1f', icon: 'spark' },
];
function plates(t) {
  if (t < 5.9 || t > 12.9) return;
  PL7.forEach((p, k) => {
    const a = 6.0 + k; if (t < a - 0.1 || t > a + 0.98) return;
    const u = sp(t, a + 0.02, 13, 0.78), ex = clamp((t - (a + 0.84)) / 0.1);
    if (ex >= 1) return;
    const lt = t - a;
    ctx.save(); ctx.globalAlpha = 1 - ex;
    const s = (0.86 + 0.14 * u + 0.035 * lt);
    if (p.icon === 'face') {
      frontFace(ctx, 960, 735 + (1 - u) * 60, 1.12 * s, t, { hi: true });
    } else {
      ctx.save(); ctx.translate(960, 665 + (1 - u) * 50); ctx.scale(s, s);
      if (p.icon === 'voice') { ctx.shadowColor = 'rgba(53,240,160,.8)'; ctx.shadowBlur = 40; }
      plateIcon(ctx, p.icon, 0, 0, 1.5, t, p.icon === 'voice' ? '#35f0a0' : p.fg);
      ctx.restore();
    }
    ctx.restore();
    bt(ctx, p.zh, 960, 236, (lt - 0.04) / 0.26, { font: F(900, 76, CJK), color: p.fg, align: 'center', ls: 4, ex, blur: 8 });
    bt(ctx, p.en, 960, 284, (lt - 0.12) / 0.26, { font: F(600, 17), color: p.fg, align: 'center', ls: 8, ex, alpha: 0.6, blur: 6 });
  });
}
const PL_COLS = ['#1f2a7a', '#062a20', '#f5f5f7', '#ff5a1f', '#efe9dc', '#3b1352', '#ffc934'];
function statement(t) {
  if (t < 12.9 || t > 15.2) return;
  const ex = clamp((t - 14.65) / 0.35);
  PL_COLS.forEach((c, i) => {
    const q = sp(t, 12.95 + i * 0.045, 14, 0.7) * (1 - ex);
    if (q <= 0) return;
    const x = W / 2 + (i - 3) * 46;
    circle(ctx, x, 690, 10 * q, c); ring(ctx, x, 690, 10 * q, 'rgba(255,255,255,.25)', 1);
  });
  voCap(2, W / 2, 586, t, { size: 104, w: 900, align: 'center', ls: 6, out: 14.65, dy: 26,
    col: [(x, y, w) => { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.62, '#ffe7a3'); g.addColorStop(0.85, '#f5c15a'); g.addColorStop(1, '#ffffff'); return g; }] });
}

/* ───────────────────────── 15–21 01 上传: the face is scanned, then encrypted into gold cipher, locked ───────────────────────── */
function step1(t) {
  if (t < 14.95 || t > 21.1) return;
  const ex = clamp((t - 20.55) / 0.4), lt = t - 15;
  eyebrow(1, t, 15, 21);
  const FX = 640, FY = 610, FS = 1.25;
  const u = sp(t, 15.15, 8, 0.9);
  const scan = clamp((t - 16.35) / 1.2), mesh = clamp((t - 16.6) / 0.4) * (1 - clamp((t - 17.9) / 0.4));
  const front = lerp(300, 1090, E.inOutSine(clamp((t - 17.9) / 1.25)));     // encryption front, top → bottom
  // the face, drawn off-screen so the cipher can take its exact silhouette
  const fc = oc7('face', W, H), f = fc.getContext('2d');
  f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, H);
  frontFace(f, FX, FY + (1 - u) * 90, FS * (0.94 + 0.06 * u + 0.006 * lt), t, { hi: true, scan: scan > 0 && scan < 1 ? scan : undefined, mesh: mesh || undefined });
  ctx.save(); ctx.globalAlpha = clamp(u * 1.3) * (1 - ex);
  // soft key light behind the head
  glowDisc(ctx, FX, FY - 40, 520, [70, 90, 220], 0.3);
  ctx.save(); ctx.beginPath(); ctx.rect(0, front, W, H); ctx.clip(); ctx.drawImage(fc, 0, 0); ctx.restore();
  if (t > 17.85) {
    const gc = oc7('cipher', W, H), g = gc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.font = F(600, 17, MONO); g.textAlign = 'center';
    const done = clamp((t - 19.15) / 0.6);
    for (let y = 300; y < Math.min(front, H + 20); y += 22) for (let x = FX - 340; x < FX + 340; x += 19) {
      const hsh = hash(x * 0.37 + y * 1.91 + Math.floor(t * 12) * 0.13);
      g.fillStyle = `rgba(245,193,90,${(0.45 + 0.55 * hsh) * (1 - 0.45 * done)})`;
      g.fillText(GLY[(hsh * 16) | 0], x, y);
    }
    const bg = g.createLinearGradient(0, front - 44, 0, front + 2); bg.addColorStop(0, 'rgba(255,231,163,0)'); bg.addColorStop(1, 'rgba(255,240,200,.95)');
    g.fillStyle = bg; g.fillRect(0, front - 44, W, 46);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(fc, 0, 0); g.globalCompositeOperation = 'source-over';
    ctx.drawImage(gc, 0, 0);
  }
  // locked: only your key opens it
  const lk = sp(t, 19.3, 11, 0.7);
  if (lk > 0) {
    glowDisc(ctx, FX, FY - 30, 260, [245, 193, 90], 0.25 * lk);
    ctx.save(); ctx.translate(FX, FY - 40); ctx.scale(lk, lk);
    circle(ctx, 0, 0, 92, 'rgba(10,14,42,.82)'); ring(ctx, 0, 0, 92, 'rgba(245,193,90,.9)', 2);
    lockIcon(ctx, 0, -4, 3.1, '#f5c15a');
    ctx.restore();
    rippleAt(FX, FY - 40, (t - 19.3) / 0.9, '245,193,90');
    bt(ctx, '仅你可解锁', FX, FY + 112, (t - 19.55) / 0.4, { font: F(700, 24, CJK), color: '#f5c15a', align: 'center', ls: 6 });
  }
  ctx.restore();
  // type, right
  const TX = 1110;
  bt(ctx, '01', TX, 356, (lt - 0.35) / 0.4, { font: F(600, 22, MONO), color: A7.gold, ls: 4, ex });
  bt(ctx, '上传，', TX, 466, (lt - 0.4) / 0.45, { font: F(900, 96, CJK), color: silver(ctx, 0, 380, 470), ls: 4, ex });
  bt(ctx, '即加密。', TX, 580, (lt - 0.6) / 0.45, { font: F(900, 96, CJK), color: silver(ctx, 0, 494, 584), ls: 4, ex });
  voCap(4, TX, 676, t, { size: 34, lines: true, lh: 52, col: [A7.grey2, A7.white], out: 20.55, strip: true });
  // spec line: small, factual
  const specs = [['本地识别', '28 个面部关键点'], ['原图不上传', '只上传密文'], ['钥匙在你手里', '平台也看不到']];
  specs.forEach(([a, b], i) => {
    const q = (t - 17.0 - i * 0.55) / 0.4; if (q <= 0) return;
    const y = 830 + i * 56;
    ctx.save(); ctx.globalAlpha = E.outCubic(clamp(q)) * (1 - ex); line(ctx, TX, y - 34, TX + 520, y - 34, 'rgba(255,255,255,.14)', 1); ctx.restore();
    bt(ctx, a, TX, y, q, { font: F(700, 22, CJK), color: A7.white, ex, dy: 8 });
    bt(ctx, b, TX + 520, y, q, { font: F(500, 20, CJK), color: A7.grey, align: 'right', ex, dy: 8 });
  });
}

/* ───────────────────────── 21–27 02 上架: a needle engraves a white card, the card turns over: 使用权 ¥2,000 / 次 ───────────────────────── */
const CARD_W = 760, CARD_H = 480;
function cardBody(c, w, h) {
  rr(c, 0, 0, w, h, 64);
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#ededf0'); g.addColorStop(1, '#f8f8fa');
  c.fillStyle = g; c.fill();
  rr(c, 1.5, 1.5, w - 3, h - 3, 63); c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 3; c.stroke();
  const sh = c.createLinearGradient(0, 0, w * 0.6, h); sh.addColorStop(0, 'rgba(255,255,255,.0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.save(); rr(c, 0, 0, w, h, 64); c.clip(); c.fillStyle = sh; c.fillRect(0, 0, w, h); c.restore();
}
// engraved: a dark recess with a light lower lip
function engrave(c, draw) {
  c.save(); c.translate(2, 2.5); c.globalAlpha = 0.95; draw('#ffffff'); c.restore();
  c.save(); c.translate(-1, -1); draw('#9b9ba3'); c.restore();
  draw('#c2c2c9');
}
function cardFront(t) {
  const o = oc7('cardF', CARD_W * 2, CARD_H * 2), c = o.getContext('2d');
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, CARD_W, CARD_H);
  cardBody(c, CARD_W, CARD_H);
  const m1 = clamp((t - 21.6) / 1.1), m2 = clamp((t - 22.85) / 0.75);
  // the 米麦 mark, engraved left → right
  const mk = oc7('mark', 400, 238), mc = mk.getContext('2d');
  if (!mk.done) { mc.drawImage(LOGO_L, 0, 0, 800, 475, 0, 0, 400, 238); mk.done = true; }
  const tint = (col) => { const q = oc7('tint', 400, 238), qc = q.getContext('2d'); qc.globalCompositeOperation = 'source-over'; qc.clearRect(0, 0, 400, 238); qc.drawImage(mk, 0, 0); qc.globalCompositeOperation = 'source-in'; qc.fillStyle = col; qc.fillRect(0, 0, 400, 238); return q; };
  c.save(); c.beginPath(); c.rect(0, 0, 64 + 160 * m1, CARD_H); c.clip();
  engrave(c, (col) => c.drawImage(tint(col), 64, 60, 160, 95));
  c.restore();
  c.save(); c.beginPath(); c.rect(0, 0, 64 + 260 * m2, CARD_H); c.clip();
  engrave(c, (col) => txt(c, '林夏', 66, 400, { font: F(700, 50, CJK), color: col, ls: 6 }));
  c.restore();
  txt(c, '肖像使用权', CARD_W - 64, 110, { font: F(600, 24, CJK), color: '#8e8e93', align: 'right', ls: 4, alpha: clamp((t - 23.3) / 0.4) });
  txt(c, 'MM-2026-010482', CARD_W - 64, 400, { font: F(500, 20, MONO), color: '#a1a1a6', align: 'right', ls: 2, alpha: clamp((t - 23.5) / 0.4) });
  return { img: o, m1, m2 };
}
function cardBack() {
  const o = oc7('cardB', CARD_W * 2, CARD_H * 2);
  if (o.done) return o;
  const c = o.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0);
  cardBody(c, CARD_W, CARD_H);
  txt(c, '使用权 · 按次授权', CARD_W / 2, 132, { font: F(600, 26, CJK), color: '#6e6e73', align: 'center', ls: 6 });
  txt(c, '¥2,000', CARD_W / 2 - 40, 290, { font: F(900, 150), color: '#1d1d1f', align: 'center', ls: -2 });
  txt(c, '/ 次', CARD_W / 2 + 236, 290, { font: F(700, 40, CJK), color: '#6e6e73', align: 'left' });
  c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(64, 346, CARD_W - 128, 2);
  txt(c, '所有权', 64, 410, { font: F(700, 28, CJK), color: '#1d1d1f', ls: 4 });
  txt(c, '永远归你', CARD_W - 64, 410, { font: F(700, 28, CJK), color: '#1d1d1f', align: 'right', ls: 4 });
  o.done = true; return o;
}
function step2(t) {
  if (t < 20.9 || t > 27.1) return;
  const ex = clamp((t - 26.55) / 0.4), lt = t - 21;
  eyebrow(2, t, 21, 27, true);
  const { img, m1, m2 } = cardFront(t), back = cardBack();
  const u = sp(t, 21.1, 8, 0.9);
  const ry = -0.2 * sp(t, 23.75, 7, 0.9) + (Math.PI + 0.2) * sp(t, 24.35, 8, 0.72) + 0.04 * Math.sin(t * 1.3) * clamp((t - 25.4) / 0.6);
  const CX = 960, CY = 520 + (1 - u) * 60, cw = CARD_W * (0.96 + 0.04 * u), ch = CARD_H * (0.96 + 0.04 * u);
  ctx.save(); ctx.globalAlpha = clamp(u * 1.3) * (1 - ex);
  // contact shadow on the white floor
  ctx.save(); ctx.filter = 'blur(26px)'; ctx.beginPath(); ctx.ellipse(CX, CY + ch / 2 + 48, cw * 0.42 * Math.max(0.25, Math.abs(Math.cos(ry))), 22, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill(); ctx.restore();
  persp(img, CX, CY, cw, ch, ry, { back });
  // the needle: comes down, engraves, lifts (Apple Card craft shot)
  const nd = clamp((t - 21.25) / 0.35) * (1 - clamp((t - 23.65) / 0.3));
  if (nd > 0) {
    const ex0 = CX - cw / 2, ey0 = CY - ch / 2;
    const tipX = m2 > 0 ? ex0 + 66 + 250 * m2 : ex0 + 64 + 160 * m1, tipY = m2 > 0 ? ey0 + 386 : ey0 + 60 + 95 * (0.5 + 0.4 * Math.sin(t * 23));
    const top = lerp(-60, tipY, E.outCubic(nd));
    const g = ctx.createLinearGradient(tipX - 12, 0, tipX + 12, 0); g.addColorStop(0, '#16161a'); g.addColorStop(0.45, '#5a5a62'); g.addColorStop(1, '#0e0e12');
    ctx.fillStyle = g; ctx.fillRect(tipX - 14, -40, 28, top - 70 + 40);
    ctx.beginPath(); ctx.moveTo(tipX - 14, top - 70); ctx.lineTo(tipX + 14, top - 70); ctx.lineTo(tipX + 1.5, top); ctx.lineTo(tipX - 1.5, top); ctx.closePath(); ctx.fill();
    fillRR(ctx, tipX - 22, top - 140, 44, 30, 6, '#1c1c20');
    if (nd >= 1 && (m1 > 0 && m1 < 1 || m2 > 0 && m2 < 1)) {   // the glint where the needle cuts
      glowDisc(ctx, tipX, tipY, 46, [255, 255, 255], 0.95);
      ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(t * 3);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-26 - (i % 2) * 14, 0); ctx.lineTo(26 + (i % 2) * 14, 0); ctx.stroke(); }
      ctx.restore();
      glowDisc(ctx, tipX, tipY, 12, [255, 210, 255], 0.9);
    }
  }
  ctx.restore();
  bt(ctx, '上架，卖的是使用权。', W / 2, 180, (lt - 2.75) / 0.45, { font: F(900, 64, CJK), color: A7.ink, align: 'center', ls: 4, ex });
  voCap(6, W / 2, 940, t, { size: 34, align: 'center', col: [A7.inkGrey, A7.ink, A7.ink], out: 26.55, strip: true });
}

/* ───────────────────────── 27–34 03 授权: a request on your phone, you tap 同意 ───────────────────────── */
const PW = 400, PHH = 820;
function phone(t) {
  const o = oc7('phone', PW * 2, PHH * 2), c = o.getContext('2d');
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, PW, PHH);
  rr(c, 0, 0, PW, PHH, 66); const fr = c.createLinearGradient(0, 0, PW, 0); fr.addColorStop(0, '#3a3a40'); fr.addColorStop(0.5, '#1c1c1f'); fr.addColorStop(1, '#3a3a40'); c.fillStyle = fr; c.fill();
  rr(c, 12, 12, PW - 24, PHH - 24, 56); const sg = c.createLinearGradient(0, 0, 0, PHH); sg.addColorStop(0, '#120a1a'); sg.addColorStop(1, '#2a1238'); c.fillStyle = sg; c.fill();
  c.save(); rr(c, 12, 12, PW - 24, PHH - 24, 56); c.clip();
  glowDisc(c, PW * 0.8, 120, 300, [255, 79, 216], 0.28); glowDisc(c, PW * 0.1, PHH * 0.85, 320, [120, 60, 255], 0.3);
  fillRR(c, PW / 2 - 56, 26, 112, 32, 16, '#000');
  txt(c, '10:09', 44, 50, { font: F(600, 17), color: '#fff' });
  txt(c, '11月4日 星期三', PW / 2, 128, { font: F(600, 19, CJK), color: 'rgba(255,255,255,.8)', align: 'center', ls: 1 });
  txt(c, '10:09', PW / 2, 226, { font: F(600, 92), color: 'rgba(255,255,255,.92)', align: 'center', ls: -2 });
  // the request
  const ny = lerp(-280, 300, sp(t, 28.3, 10, 0.8));
  const ok = sp(t, 30.55, 14, 0.8), done = sp(t, 31.05, 9, 0.85);
  if (t > 28.2) {
    c.save(); c.globalAlpha = 1 - done;
    rr(c, 22, ny, PW - 44, 262, 34); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.stroke();
    fillRR(c, 42, ny + 20, 40, 40, 11, '#0b0d18'); c.drawImage(LOGO_L, 0, 0, 800, 475, 45, ny + 31, 34, 20);
    txt(c, '米麦 · 授权请求', 94, ny + 46, { font: F(700, 17, CJK), color: '#fff' });
    txt(c, '现在', PW - 44, ny + 46, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.6)', align: 'right' });
    txt(c, '星河影业 申请使用你的肖像', 42, ny + 100, { font: F(700, 21, CJK), color: '#fff' });
    txt(c, '用途 · 广告　次数 · 1 次　期限 · 7 天', 42, ny + 134, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.72)' });
    txt(c, '报酬', 42, ny + 168, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.72)' });
    txt(c, '¥2,000', 88, ny + 169, { font: F(800, 19), color: '#fff' });
    fillRR(c, 42, ny + 192, 148, 48, 24, 'rgba(255,255,255,.14)');
    txt(c, '拒绝', 116, ny + 223, { font: F(700, 19, CJK), color: '#fff', align: 'center' });
    fillRR(c, 202, ny + 192, 156, 48, 24, rgb(mix([255, 255, 255], [48, 209, 88], ok)));
    txt(c, ok > 0.5 ? '已同意' : '同意', 280, ny + 223, { font: F(700, 19, CJK), color: rgb(mix([29, 29, 31], [255, 255, 255], ok)), align: 'center' });
    c.restore();
  }
  if (done > 0) {
    c.save(); c.globalAlpha = clamp(done); c.translate(PW / 2, 470); c.scale(0.7 + 0.3 * done, 0.7 + 0.3 * done);
    circle(c, 0, 0, 74, '#30d158'); check(c, 2, 4, 3.2, '#fff', 9, clamp((t - 31.15) / 0.4));
    c.restore();
    txt(c, '已授权 · 仅此一次', PW / 2, 600, { font: F(700, 24, CJK), color: '#fff', align: 'center', alpha: clamp((t - 31.3) / 0.4), ls: 2 });
    txt(c, '交付后自动销毁', PW / 2, 638, { font: F(500, 17, CJK), color: 'rgba(255,255,255,.65)', align: 'center', alpha: clamp((t - 31.5) / 0.4), ls: 2 });
  }
  fillRR(c, PW / 2 - 70, PHH - 34, 140, 6, 3, 'rgba(255,255,255,.7)');
  c.restore();
  return o;
}
function step3(t) {
  if (t < 26.95 || t > 34.1) return;
  const ex = clamp((t - 33.55) / 0.4), lt = t - 27;
  // tonal arcs, one shade apart, and an orb travelling the middle one (Watch readiness)
  [[1240, '#2d1338'], [960, '#341744'], [680, '#3d1b50']].forEach(([r, c], i) => {
    const q = sp(t, 27.1 + i * 0.12, 6, 0.95);
    ctx.save(); ctx.globalAlpha = 1 - ex; ctx.beginPath(); ctx.arc(1330, 1250, r * (0.8 + 0.2 * q), 0, 7); ctx.fillStyle = c; ctx.globalAlpha *= clamp(q * 1.4); ctx.fill(); ctx.restore();
  });
  const oa = lerp(Math.PI * 1.05, Math.PI * 1.62, E.inOutSine(clamp((t - 27.6) / 6))), orx = 1330 + Math.cos(oa) * 960, ory = 1250 + Math.sin(oa) * 960;
  ctx.save(); ctx.globalAlpha = clamp((t - 27.5) / 0.5) * (1 - ex);
  glowDisc(ctx, orx, ory, 90, [255, 79, 216], 0.55); circle(ctx, orx, ory, 22, '#ff5be0'); ctx.restore();
  eyebrow(3, t, 27, 34);
  const u = sp(t, 27.35, 7, 0.85);
  const ry = 0.7 * (1 - u) + 0.05 * Math.sin(t * 0.9);
  const PX = 1330, PY = 560 + (1 - u) * 80;
  ctx.save(); ctx.globalAlpha = clamp(u * 1.4) * (1 - ex);
  ctx.save(); ctx.filter = 'blur(40px)'; fillRR(ctx, PX - 170, PY - 360, 340, 760, 60, 'rgba(0,0,0,.45)'); ctx.restore();
  persp(phone(t), PX, PY, PW, PHH, ry);
  ctx.restore();
  // finger on 同意
  const bx = PX - PW / 2 + 280, by = PY - PHH / 2 + 300 + 216;
  const fa = clamp((t - 29.9) / 0.3) * (1 - clamp((t - 30.95) / 0.25)) * (1 - ex);
  const press = clamp((t - 30.45) / 0.08) * (1 - clamp((t - 30.62) / 0.12));
  tapAt(lerp(bx + 120, bx, E.outCubic(clamp((t - 29.9) / 0.5))), lerp(by + 160, by, E.outCubic(clamp((t - 29.9) / 0.5))), press, fa);
  rippleAt(bx, by, (t - 30.55) / 0.6);
  const TX = 230;
  bt(ctx, '授权，', TX, 430, (lt - 0.4) / 0.45, { font: F(900, 110, CJK), color: A7.white, ls: 4, ex });
  bt(ctx, '你说了算。', TX, 560, (lt - 0.6) / 0.45, { font: F(900, 110, CJK), color: (() => { const g = ctx.createLinearGradient(TX, 0, TX + 560, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ff9be9'); return g; })(), ls: 4, ex });
  voCap(8, TX, 668, t, { size: 34, lines: true, lh: 52, col: [A7.grey2, A7.white], out: 33.55, strip: true });
}

/* ───────────────────────── 34–40 04 掌控: one giant switch in a green glow; you switch it off ───────────────────────── */
function step4(t) {
  if (t < 33.9 || t > 40.2) return;
  const ex = clamp((t - 39.55) / 0.3), lt = t - 34;
  eyebrow(4, t, 34, 39.9);
  const TX0 = 960, TY0 = 560, TW = 540, TH = 270;
  const on = 1 - sp(t, 36.95, 13, 0.8);         // knob position: 1 = on (right)
  const glow = clamp(on);
  // glow field: nested rounded rectangles, brightest at the switch (Watch battery)
  const L = [[980, '#04200d'], [660, '#0a3d1c'], [380, '#12652e'], [180, '#1b9a43']];
  L.forEach(([pad, c], i) => {
    const q = sp(t, 34.25 + i * 0.07, 7, 0.9) * (1 - ex);
    if (q <= 0) return;
    const p = pad * (0.35 + 0.65 * q) * (0.4 + 0.6 * glow);
    ctx.save(); ctx.globalAlpha = clamp(q * 1.2) * (0.25 + 0.75 * glow);
    ctx.filter = `blur(${30 + i * 6}px)`;
    fillRR(ctx, TX0 - TW / 2 - p, TY0 - TH / 2 - p * 0.62, TW + 2 * p, TH + 1.24 * p, TH / 2 + p * 0.62, c);
    ctx.restore();
  });
  const u = sp(t, 34.4, 9, 0.75);
  ctx.save(); ctx.globalAlpha = clamp(u * 1.3) * (1 - ex);
  ctx.translate(TX0, TY0); ctx.scale(0.8 + 0.2 * u, 0.8 + 0.2 * u);
  const track = rgb(mix([58, 58, 60], [48, 209, 88], glow));
  ctx.save(); ctx.shadowColor = `rgba(48,209,88,${0.8 * glow})`; ctx.shadowBlur = 70; fillRR(ctx, -TW / 2, -TH / 2, TW, TH, TH / 2, track); ctx.restore();
  rr(ctx, -TW / 2 + 1, -TH / 2 + 1, TW - 2, TH - 2, TH / 2); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.stroke();
  const kx = lerp(-TW / 2 + TH / 2, TW / 2 - TH / 2, on);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; circle(ctx, kx, 0, TH / 2 - 16, '#ffffff'); ctx.restore();
  const kg = ctx.createRadialGradient(kx - 30, -40, 10, kx, 0, TH / 2 - 16); kg.addColorStop(0, '#ffffff'); kg.addColorStop(1, '#e4e4ea'); circle(ctx, kx, 0, TH / 2 - 16, kg);
  keyIcon(ctx, kx - 34, 0, 0.9, null, rgb(mix([150, 150, 156], [26, 140, 60], glow)), 6);
  ctx.restore();
  // finger on the knob
  const kxs = TX0 + lerp(-TW / 2 + TH / 2, TW / 2 - TH / 2, on);
  const fa = clamp((t - 36.4) / 0.3) * (1 - clamp((t - 37.45) / 0.3));
  const press = clamp((t - 36.85) / 0.08) * (1 - clamp((t - 37.05) / 0.15));
  tapAt(kxs + 30 * (1 - E.outCubic(clamp((t - 36.4) / 0.4))), TY0 + 60 * (1 - E.outCubic(clamp((t - 36.4) / 0.4))), press, fa);
  rippleAt(kxs, TY0, (t - 36.95) / 0.7);
  // state line under the switch
  const sw = clamp((t - 37.05) / 0.25);
  bt(ctx, '星河影业 · 授权中', W / 2, 800, ((lt - 0.7) / 0.4) * (1 - sw), { font: F(700, 30, CJK), color: '#30d158', align: 'center', ls: 4, ex });
  bt(ctx, '已撤销 · 立即生效', W / 2, 800, (t - 37.15) / 0.35, { font: F(700, 30, CJK), color: A7.white, align: 'center', ls: 4, ex });
  bt(ctx, '掌控，随时收回。', W / 2, 236, (lt - 0.4) / 0.45, { font: F(900, 72, CJK), color: silver(ctx, 0, 170, 240), align: 'center', ls: 4, ex });
  voCap(10, W / 2, 936, t, { size: 34, align: 'center', col: [A7.white, A7.grey2], out: 39.55, strip: true });
}

/* ───────────────────────── 40–47.5 05 收益: a gold field, a giant counter, every use one line on the ledger ───────────────────────── */
const INC = [[41.1, 2000, '星河影业 · 广告'], [41.75, 1500, '青禾广告 · 海报'], [42.4, 3800, '北辰游戏 · 角色'], [43.05, 2600, '星河影业 · 续期'], [43.7, 1200, '青禾广告 · 短片'], [44.45, 5000, '北辰游戏 · 授权包']];
const BASE = 112500;
function step5(t) {
  if (t < 39.95 || t > 47.6) return;
  const ex = clamp((t - 46.9) / 0.4), lt = t - 40;
  eyebrow(5, t, 40, 47.4, true);
  // the value: rolls up to the base, then a spring per income
  let v = BASE * E.outExpo(clamp((t - 40.45) / 0.6));
  for (const [ti, a] of INC) v += a * clamp(sp(t, ti, 16, 0.9));
  const s = Math.round(v).toLocaleString('en-US');
  bt(ctx, '累计收益', 760, 400, (lt - 0.3) / 0.4, { font: F(700, 34, CJK), color: A7.ink, align: 'center', ls: 8, ex, alpha: 0.7 });
  const NS = 168, f = F(900, NS);
  ctx.save(); ctx.font = f; const cw = ctx.measureText('0').width, cm = ctx.measureText(',').width, cy = ctx.measureText('¥').width; ctx.restore();
  const chars = ['¥', ...s];
  const tot = chars.reduce((a, ch) => a + (ch === ',' ? cm : ch === '¥' ? cy : cw), 0);
  let x = 760 - tot / 2; const nu = (lt - 0.3) / 0.45;
  for (const ch of chars) {
    const wch = ch === ',' ? cm : ch === '¥' ? cy : cw;
    bt(ctx, ch, x + wch / 2, 610, nu, { font: f, color: A7.ink, align: 'center', ex, dy: 30 });
    x += wch;
  }
  // growth line under the number: one node per income
  const gx0 = 400, gx1 = 1210, gy = 760;
  const pts = [[gx0, gy + 30]];
  INC.forEach(([ti], i) => pts.push([lerp(gx0, gx1, (i + 1) / INC.length), gy + 30 - 150 * Math.pow((i + 1) / INC.length, 1.6)]));
  const grown = clamp((t - 41.0) / 3.6);
  ctx.save(); ctx.globalAlpha = clamp((t - 40.9) / 0.3) * (1 - ex);
  ctx.strokeStyle = A7.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  const segs = pts.length - 1, upto = grown * segs;
  let end = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const q = clamp(upto - (i - 1)); if (q <= 0) break;
    end = [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; ctx.lineTo(end[0], end[1]);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(29,29,31,.15)'; ctx.fillRect(gx0, gy + 46, gx1 - gx0, 2);
  circle(ctx, end[0], end[1], 10, A7.ink); circle(ctx, end[0], end[1], 4, '#f6c445');
  INC.forEach(([ti]) => { const q = (t - ti) / 0.5; if (q > 0 && q < 1) ring(ctx, end[0], end[1], 12 + 34 * E.outCubic(q), `rgba(29,29,31,${0.5 * (1 - q)})`, 2); });
  ctx.restore();
  // the ledger: newest on top
  INC.forEach(([ti, a, who], i) => {
    const q = sp(t, ti, 13, 0.8); if (q <= 0) return;
    const newer = INC.filter(([tj]) => tj <= t && tj > ti).length;
    const slot = newer + (1 - clamp(sp(t, ti, 13, 0.8)));
    const y = 352 + slot * 104, alpha = clamp(q * 1.4) * (1 - clamp((slot - 3.2) / 0.8)) * (1 - ex);
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(1540 + (1 - q) * 120, y);
    ctx.save(); ctx.shadowColor = 'rgba(80,50,0,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; fillRR(ctx, -220, -40, 440, 80, 40, '#1d1d1f'); ctx.restore();
    cmCoin(ctx, -176, 0, 22, (t - ti) * 9 * (1 - clamp((t - ti) / 0.8)));
    txt(ctx, `+¥${a.toLocaleString('en-US')}`, -138, 10, { font: F(800, 30), color: '#ffffff' });
    txt(ctx, who, 196, 9, { font: F(500, 20, CJK), color: 'rgba(255,255,255,.6)', align: 'right' });
    ctx.restore();
  });
  voCap(12, W / 2, 944, t, { size: 34, align: 'center', col: [A7.ink, A7.ink], out: 46.9, strip: true });
}

/* ───────────────────────── 47.5–51.7 verbs: one word per beat, each with its own move (Creator Studio) ───────────────────────── */
const VERBS = [['上传。', 'rise'], ['确权。', 'type'], ['上架。', 'blur'], ['授权。', 'decode'], ['收回。', 'scatter'], ['收益。', 'gold']];
function verbs(t) {
  if (t < 47.9 || t > 51.75) return;
  const k = Math.floor((t - 48.0) / 0.5); if (k < 0) return;
  const kk = Math.min(k, VERBS.length - 1), [w, fx] = VERBS[kk], a = 48.0 + kk * 0.5, lt = t - a;
  const ex = kk === VERBS.length - 1 ? clamp((t - 51.45) / 0.25) : 0;
  const S = 168, f = F(900, S, CJK), y = 600;
  ctx.save(); ctx.font = f; ctx.letterSpacing = '8px'; const tot = ctx.measureText(w).width; ctx.restore();
  const chs = [...w]; let x = W / 2 - tot / 2;
  ctx.save(); ctx.globalAlpha = 1 - ex;
  chs.forEach((ch, i) => {
    ctx.save(); ctx.font = f; ctx.letterSpacing = '8px'; const cw = ctx.measureText(ch).width; ctx.restore();
    const cx = x + cw / 2; x += cw;
    if (fx === 'rise') {
      const u = sp(lt, 0.0 + i * 0.05, 16, 0.85);
      ctx.save(); ctx.beginPath(); ctx.rect(cx - cw, y - S * 1.05, cw * 2, S * 1.3); ctx.clip();
      txt(ctx, ch, cx, y + (1 - u) * S * 1.1, { font: f, align: 'center', color: A7.white, ls: 8 }); ctx.restore();
    } else if (fx === 'type') {
      if (lt > i * 0.09) txt(ctx, ch, cx, y, { font: f, align: 'center', color: A7.white, ls: 8 });
    } else if (fx === 'blur') {
      const u = clamp(lt / 0.3);
      ctx.save(); ctx.filter = `blur(${((1 - u) * 26).toFixed(1)}px)`; ctx.globalAlpha *= clamp(u * 1.5);
      ctx.translate(cx, y - S * 0.35); ctx.scale(1.3 - 0.3 * E.outCubic(u), 1.3 - 0.3 * E.outCubic(u));
      txt(ctx, ch, 0, S * 0.35, { font: f, align: 'center', color: A7.white, ls: 8 }); ctx.restore();
    } else if (fx === 'decode') {
      const done = lt > 0.12 + i * 0.1;
      const g = '密数米麦钥权¥#%01ABCDEF'[(hash(i * 7 + Math.floor(t * 30)) * 21) | 0];
      txt(ctx, done ? ch : g, cx, y, { font: done ? f : F(900, S, MONO), align: 'center', color: done ? A7.white : '#f5c15a', ls: 8 });
    } else if (fx === 'scatter') {
      const u = sp(lt, i * 0.03, 15, 0.8), r0 = hash(i * 3.3 + 1);
      ctx.save(); ctx.translate(cx + (1 - u) * (r0 - 0.5) * 700, y - S * 0.35 + (1 - u) * (hash(i * 5.1) - 0.5) * 500); ctx.rotate((1 - u) * (r0 - 0.5) * 2.4);
      ctx.globalAlpha *= clamp(u * 2); txt(ctx, ch, 0, S * 0.35, { font: f, align: 'center', color: A7.white, ls: 8 }); ctx.restore();
    } else if (fx === 'gold') {
      const u = sp(lt, i * 0.04, 12, 0.8);
      ctx.save(); ctx.translate(cx, y - S * 0.35); ctx.scale(0.9 + 0.1 * u, 0.9 + 0.1 * u);
      txt(ctx, ch, 0, S * 0.35, { font: f, align: 'center', color: goldG(ctx, -cw, cw), ls: 8, glow: 'rgba(245,193,90,.55)', glowR: 40 * u, alpha: clamp(u * 1.5) });
      ctx.restore();
    }
  });
  if (fx === 'type' && Math.floor(t * 4) % 2 === 0) { const cxr = W / 2 - tot / 2 + tot * clamp(lt / 0.27); ctx.fillStyle = '#f5c15a'; ctx.fillRect(cxr + 6, y - S * 0.82, 8, S * 0.98); }
  ctx.restore();
}

/* ───────────────────────── 51.7–60 由你决定 · 口号 · 落版 ───────────────────────── */
function ending(t) {
  if (t > 51.7 && t < 54.0) voCap(13, W / 2, 590, t, { size: 92, w: 900, align: 'center', ls: 6, out: 53.6, dy: 24, col: [A7.white, (x, y, w) => silver(ctx, 0, y - 80, y)] });
  if (t > 53.8 && t < 57.3) {
    voCap(14, W / 2, 520, t, { size: 104, w: 900, align: 'center', lines: true, lh: 150, ls: 8, out: 56.75, dy: 26, strip: true,
      col: [(x, y) => silver(ctx, 0, y - 90, y), (x, y, w) => goldG(ctx, x, x + w)] });
  }
  if (t < 56.95) return;
  const ex = clamp((t - 59.55) / 0.45);
  const LW = 760, LX = (W - LW) / 2, LY = 300;
  ctx.save(); ctx.globalAlpha = 1 - ex;
  const lu = sp(t, 57.0, 7, 0.95);
  ctx.save(); ctx.globalAlpha *= clamp(lu * 1.3); if (lu < 0.98) ctx.filter = `blur(${((1 - lu) * 14).toFixed(1)}px)`;
  drawLogo(ctx, LX, LY + (1 - lu) * 20, LW, 1, clamp((t - 57.5) / 1.1));
  ctx.restore();
  voCap(15, W / 2, 720, t, { size: 46, w: 700, align: 'center', ls: 8, out: 99, strip: true, col: [A7.white, A7.grey2] });
  bt(ctx, '密数科技（北京）有限公司  ·  mimuseai.com', W / 2, 790, (t - 58.3) / 0.5, { font: F(500, 22, CJK), color: A7.grey, align: 'center', ls: 3 });
  bt(ctx, '演示画面 · 部分能力为原型模拟实现', W / 2, 1040, (t - 58.5) / 0.5, { font: F(400, 13, CJK), color: '#5a5a5f', align: 'center', ls: 1, blur: 4 });
  ctx.restore();
}

/* ───────────────────────── main ───────────────────────── */
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  field(t);
  opening(t); titleCard(t); plates(t); statement(t);
  step1(t); step2(t); step3(t); step4(t); step5(t);
  verbs(t); ending(t);
}
window.render = render;
