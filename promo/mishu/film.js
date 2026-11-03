/* 米麦 MIME TECH · 密数科技 — 产品使用说明商业宣传片（60 s, 1920×1080, 30 fps）
 * Everything is drawn procedurally on one Canvas 2D context; render(t) is a pure function of time t (seconds).
 * Sections:  intro 0–6 · hook 6–9 · 01 flat 9–19 · 02 isometric 19–29 · 03 glass 29–39 · 04 HUD 39–49 ·
 *            05 data 49–55 · outro 55–60.  Music is 120 BPM (beat = 0.5 s); every cut sits on a beat.
 */
const W = 1920, H = 1080, FPS = 30, DUR = 60;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let LOGO = null;       // keyed logo (2000×475, transparent)
let GRAIN = null;      // noise tile
let AUR = null;        // offscreen for glass blur
let SWEEP = null;      // offscreen for logo light sweep

/* ───────────────────────── utils ───────────────────────── */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inCubic: u => u * u * u,
  inOutCubic: u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outExpo: u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  inExpo: u => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
  outBack: u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  outQuint: u => 1 - Math.pow(1 - u, 5),
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
const GLY = '0123456789abcdef';
function cipher(n, seed) { let s = ''; for (let i = 0; i < n; i++) s += GLY[(hash(seed * 31 + i * 7.3) * 16) | 0]; return s; }
function decode(str, u, seed) { // text resolving from random glyphs
  const k = Math.floor(str.length * clamp(u)); let s = str.slice(0, k);
  for (let i = k; i < str.length; i++) s += str[i] === ' ' ? ' ' : '#%01ABCDEF><'[(hash(seed + i * 3.1) * 12) | 0];
  return u <= 0 ? '' : s;
}
function tc(sec) { const s = Math.max(0, Math.floor(sec)); return `00:${String(s).padStart(2, '0')}`; }

/* key glyph (bow + shaft + teeth), centred on bow */
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

/* ───────────────────────── background & chrome ───────────────────────── */
const SCENE_COL = [ // [t, glowA, glowB]
  [0, hex('#2a56c8'), hex('#5a3fd0')],
  [6, hex('#2a56c8'), hex('#5a3fd0')],
  [9, hex('#2b44ff'), hex('#ffb43a')],
  [19, hex('#7a5cff'), hex('#4fd7c0')],
  [29, hex('#9a4dff'), hex('#ff4fa3')],
  [39, hex('#13c7c0'), hex('#1a6fff')],
  [49, hex('#e8b04a'), hex('#3d5bff')],
  [55, hex('#2a6bd8'), hex('#6a5cff')],
  [60, hex('#2a6bd8'), hex('#6a5cff')],
];
function sceneCol(t) {
  for (let i = 0; i < SCENE_COL.length - 1; i++) {
    const [a, A, B] = SCENE_COL[i], [b, A2, B2] = SCENE_COL[i + 1];
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
  // vignette
  g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grain(t) {
  const f = Math.floor(t * FPS);
  ctx.save(); ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
  const ox = (f * 173) % 512, oy = (f * 97) % 512;
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) ctx.drawImage(GRAIN, x, y);
  ctx.restore();
}
function mark(c, x, y, h) { c.drawImage(LOGO, 0, 0, 800, 475, x, y, h * 800 / 475, h); }
function chrome(t) {
  const a = seg(t, 6.0, 6.6) * (1 - seg(t, 54.6, 55.2));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  mark(ctx, 56, 36, 38);
  txt(ctx, '米麦', 132, 64, { font: F(900, 24, CJK) });
  txt(ctx, 'MIME TECH', 192, 63, { font: F(600, 15), color: 'rgba(255,255,255,.62)', ls: 3 });
  line(ctx, 316, 44, 316, 70, 'rgba(255,255,255,.22)', 1);
  txt(ctx, '密数科技 · 产品使用说明  PRODUCT GUIDE', 334, 62, { font: F(400, 14), color: 'rgba(255,255,255,.48)', ls: 2 });
  txt(ctx, '密码保护资产 · 数学生长价值', W - 56, 62, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.55)', ls: 3, align: 'right' });
  // global progress
  const p = seg(t, 9, 55);
  line(ctx, 0, H - 2, W, H - 2, 'rgba(255,255,255,.06)', 4);
  const [A] = sceneCol(t);
  line(ctx, 0, H - 2, W * p, H - 2, rgb(mix(A, [255, 255, 255], 0.3), 0.85), 4);
  ctx.restore();
}

/* ───────────────────────── subtitles (中英) ───────────────────────── */
const SUBS = [
  [9.2, 14, '演员在本地完成肖像加密，原图从不离开设备。', 'Actors encrypt their likeness on-device. The original never leaves it.'],
  [14, 19, '平台只保存密文与承诺，私钥只在演员手中。', 'The platform stores only ciphertext and commitments. The private key stays with the actor.'],
  [19.2, 24, '加密资产进入市场：面部、声纹、虚拟形象。', 'Encrypted assets enter the market: faces, voices, avatars.'],
  [24, 29, '买家获得的是使用权，而不是所有权。', 'Buyers acquire a licence to use, never ownership.'],
  [29.2, 34, '每一次使用，都要经过演员本人同意。', 'Every single use requires the actor’s own consent.'],
  [34, 39, '签名授权后受控生成，用后即焚，原件不出域。', 'A signed approval unlocks controlled generation. Nothing leaks, nothing remains.'],
  [39.2, 44, '密钥始终在演员手中，每份许可一目了然。', 'The key never leaves the actor’s hands. Every licence is in plain sight.'],
  [44, 49, '一键撤销或冻结，密文立即停止交付。', 'Revoke or freeze in one tap, and delivery stops at once.'],
  [49.2, 54.8, '每次使用写入透明账本，收益自动回流演员。', 'Each use is written to a transparent ledger; revenue flows back to the actor.'],
];
function subtitles(t) {
  for (const [a, b, zh, en] of SUBS) {
    if (t < a || t > b) continue;
    const u = seg(t, a, a + 0.25) * (1 - seg(t, b - 0.25, b));
    const y = 948 + (1 - E.outCubic(seg(t, a, a + 0.35))) * 10;
    txt(ctx, zh, W / 2, y, { font: F(700, 34, CJK), align: 'center', alpha: u, ls: 2, glow: 'rgba(0,0,0,.8)', glowR: 14 });
    txt(ctx, en, W / 2, y + 40, { font: F(400, 20), align: 'center', alpha: u * 0.72, color: '#dfe6ff', glow: 'rgba(0,0,0,.8)', glowR: 10 });
  }
}

/* ───────────────────────── chapter frame ───────────────────────── */
const CW = 1140, CHH = 640, CY = 176;
const CHAPTERS = [
  { n: 1, a: 9, b: 19, side: 'L', title: '肖像确权', en: 'LIKENESS MINTING', acc: '#4d7bff',
    desc: ['脸、声音、虚拟形象，', '在你自己的设备上加密，', '平台只看得到密文。'], tags: ['客户端加密', 'Ed25519 签名', '明文不出域'],
    steps: [['上传肖像', 0], ['本地加密', 3.2], ['生成承诺', 5.0], ['上链登记', 7.2]], stage: stage1 },
  { n: 2, a: 19, b: 29, side: 'R', title: '加密市场', en: 'ENCRYPTED MARKET', acc: '#9b86ff',
    desc: ['资产以密文挂单，', '买家申请的，', '是一份可计量的使用权。'], tags: ['使用权许可', '版税 0–15%', '托管交付'],
    steps: [['浏览资产', 0], ['查看许可', 3.0], ['申请使用', 6.2], ['推送演员', 7.0]], stage: stage2 },
  { n: 3, a: 29, b: 39, side: 'L', title: '逐次授权', en: 'CONSENT PER USE', acc: '#ff5fb0',
    desc: ['每一次调用，', '都推送到演员手机，', '本人签名，才会放行。'], tags: ['手机审批', '配额 · 有效期', '受控执行'],
    steps: [['收到申请', 1.0], ['核对条款', 2.4], ['签名同意', 4.4], ['受控生成', 6.0]], stage: stage3 },
  { n: 4, a: 39, b: 49, side: 'R', title: '密钥在手', en: 'YOUR KEY, YOUR CONTROL', acc: '#2ee6d6',
    desc: ['所有权与密钥，', '始终在演员手中，', '随时撤销、冻结、续期。'], tags: ['一键撤销', '冻结 · 续期', '加密粉碎'],
    steps: [['查看许可', 0.2], ['实时监控', 1.6], ['一键撤销', 5.0], ['续期 / 冻结', 6.3]], stage: stage4 },
  { n: 5, a: 49, b: 55, side: 'L', title: '数学生长价值', en: 'MATHEMATICS GROWS VALUE', acc: '#f2b84b',
    desc: ['每次使用写入透明账本，', 'Merkle 证明人人可验，', '收益自动回流演员。'], tags: ['透明账本', 'Merkle 证明', '自动结算'],
    steps: [['记录使用', 0.2], ['生成证明', 2.2], ['自动结算', 3.0]], stage: stage5 },
];
function drawChapter(ch, t) {
  const lt = t - ch.a, dur = ch.b - ch.a;
  if (lt < 0 || lt > dur) return;
  const inU = E.outExpo(seg(lt, 0, 0.9));
  const outU = E.inCubic(seg(lt, dur - 0.45, dur));
  const L = ch.side === 'L';
  const cardX0 = L ? 690 : 90;
  const textX = L ? 112 : 1296;
  const acc = hex(ch.acc);
  // ── card
  const dir = L ? 1 : -1;
  const cx = cardX0 + dir * (1 - inU) * 160 - dir * outU * 220;
  const sc = lerp(0.9, 1, inU) * lerp(1, 0.94, outU);
  const al = clamp(inU * 1.4) * (1 - outU);
  ctx.save();
  ctx.globalAlpha = al;
  ctx.translate(cx + CW / 2, CY + CHH / 2); ctx.scale(sc, sc); ctx.translate(-CW / 2, -CHH / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 36;
  fillRR(ctx, 0, 0, CW, CHH, 22, '#111');
  ctx.restore();
  ctx.save(); rr(ctx, 0, 0, CW, CHH, 22); ctx.clip();
  ch.stage(ctx, lt, CW, CHH, ch);
  ctx.restore();
  rr(ctx, 0.5, 0.5, CW - 1, CHH - 1, 22); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5; ctx.stroke();
  // caption under card
  const cur = ch.steps.reduce((k, s, i) => (lt >= s[1] ? i : k), 0);
  circle(ctx, 8, CHH + 36, 5, rgb(acc, 0.5 + 0.5 * Math.abs(Math.sin(lt * 3.2))));
  txt(ctx, `演示 DEMO · 步骤 ${cur + 1}/${ch.steps.length} · ${ch.steps[cur][0]}`, 24, CHH + 42, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.62)', ls: 1 });
  txt(ctx, `${tc(lt)} / ${tc(dur)}`, CW, CHH + 42, { font: F(400, 15, MONO), color: 'rgba(255,255,255,.45)', align: 'right' });
  ctx.restore();

  // ── text block
  const el = (d) => { const u = E.outCubic(seg(lt, d, d + 0.55)); return { a: u * (1 - outU), y: (1 - u) * 26 - outU * 16 }; };
  let e = el(0.15);
  txt(ctx, `0${ch.n}`, textX, 262 + e.y, { font: F(600, 36, MONO), color: ch.acc, alpha: e.a });
  txt(ctx, '/ 05', textX + 52, 262 + e.y, { font: F(400, 18, MONO), color: 'rgba(255,255,255,.4)', alpha: e.a });
  e = el(0.25);
  txt(ctx, ch.title, textX - 4, 352 + e.y, { font: F(900, ch.title.length > 4 ? 70 : 82, CJK), alpha: e.a, ls: 2 });
  e = el(0.33);
  txt(ctx, ch.en, textX, 392 + e.y, { font: F(600, 15), color: 'rgba(255,255,255,.5)', alpha: e.a, ls: 4 });
  ch.desc.forEach((s, i) => { const q = el(0.42 + i * 0.07); txt(ctx, s, textX, 452 + i * 40 + q.y, { font: F(400, 24, CJK), color: 'rgba(235,240,255,.82)', alpha: q.a, ls: 1 }); });
  // tags
  let tx = textX; e = el(0.7);
  for (const s of ch.tags) {
    const w = tw(ctx, s, F(500, 15, CJK)) + 28;
    ctx.save(); ctx.globalAlpha = e.a;
    fillRR(ctx, tx, 588 + e.y, w, 34, 17, 'rgba(255,255,255,.07)');
    rr(ctx, tx + 0.5, 588.5 + e.y, w - 1, 33, 17); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    txt(ctx, s, tx + 14, 610 + e.y, { font: F(500, 15, CJK), color: 'rgba(255,255,255,.78)', alpha: e.a });
    tx += w + 10;
  }
  // steps (usage flow)
  ch.steps.forEach(([s, at], i) => {
    const q = el(0.8 + i * 0.06);
    const y = 668 + i * 44 + q.y;
    const on = lt >= at, act = i === cur;
    const pulse = act ? 0.5 + 0.5 * Math.sin(lt * 5) : 0;
    ctx.save(); ctx.globalAlpha = q.a;
    if (i < ch.steps.length - 1) line(ctx, textX + 13, y + 13, textX + 13, y + 44 - 13, on ? rgb(acc, .7) : 'rgba(255,255,255,.15)', 2);
    circle(ctx, textX + 13, y, 12, on ? ch.acc : 'rgba(255,255,255,.1)');
    if (act) ring(ctx, textX + 13, y, 16 + pulse * 3, rgb(acc, 0.5), 2);
    ctx.restore();
    if (on && !act) check(ctx, textX + 13, y + 1, 0.8, '#0b0d14', 3);
    else txt(ctx, String(i + 1), textX + 13, y + 5, { font: F(700, 13), align: 'center', color: on ? '#0b0d14' : 'rgba(255,255,255,.5)', alpha: q.a });
    txt(ctx, s, textX + 40, y + 7, { font: F(act ? 700 : 400, 19, CJK), color: act ? '#fff' : on ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.38)', alpha: q.a });
  });
}

/* ───────────────────────── 01 · flat vector: likeness minting ───────────────────────── */
const FACE_PTS = (() => { // landmarks relative to head centre
  const p = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.05 + 0.9 * i / 8); p.push([Math.cos(a) * 74, 10 + Math.sin(a) * 88]); }
  p.push([-44, -18], [-28, -24], [-12, -20], [12, -20], [28, -24], [44, -18]);       // brows
  p.push([-38, -2], [-26, -8], [-14, -2], [14, -2], [26, -8], [38, -2]);            // eyes
  p.push([0, 4], [-8, 30], [8, 30]);                                                 // nose
  p.push([-22, 52], [0, 46], [22, 52], [0, 60]);                                     // mouth
  return p;
})();
const FACE_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[9,10],[10,11],[12,13],[13,14],[15,16],[16,17],[18,19],[19,20],
  [21,22],[21,23],[22,23],[24,25],[25,26],[26,27],[27,24],[11,21],[12,21],[17,1],[20,7],[22,24],[23,26]];
function portrait(c, x, y, s, alpha = 1) {
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s, s);
  // shoulders
  c.beginPath(); c.moveTo(-170, 210); c.bezierCurveTo(-160, 120, -90, 96, 0, 96); c.bezierCurveTo(90, 96, 160, 120, 170, 210); c.closePath();
  c.fillStyle = '#121a46'; c.fill();
  c.beginPath(); c.moveTo(-34, 96); c.lineTo(0, 150); c.lineTo(34, 96); c.closePath(); c.fillStyle = '#f6f1e7'; c.fill();
  // neck
  fillRR(c, -26, 50, 52, 60, 14, '#e2a780');
  // hair back
  c.beginPath(); c.ellipse(0, -18, 96, 110, 0, Math.PI, 0); c.lineTo(96, 70); c.quadraticCurveTo(80, 96, 56, 86); c.lineTo(-56, 86); c.quadraticCurveTo(-80, 96, -96, 70); c.closePath();
  c.fillStyle = '#1b1238'; c.fill();
  // head
  c.beginPath(); c.ellipse(0, 0, 74, 92, 0, 0, Math.PI * 2); c.fillStyle = '#f3c39d'; c.fill();
  // fringe
  c.beginPath(); c.moveTo(-80, -10); c.bezierCurveTo(-78, -96, 40, -126, 84, -40); c.bezierCurveTo(40, -66, -10, -60, -34, -30); c.bezierCurveTo(-48, -14, -66, -8, -80, -10);
  c.fillStyle = '#1b1238'; c.fill();
  // features
  c.fillStyle = '#1b1238';
  c.beginPath(); c.ellipse(-26, -2, 7, 5, 0, 0, Math.PI * 2); c.ellipse(26, -2, 7, 5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#1b1238'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-40, -22); c.lineTo(-14, -24); c.moveTo(14, -24); c.lineTo(40, -22); c.stroke();
  c.strokeStyle = '#c98462'; c.lineWidth = 3; c.beginPath(); c.moveTo(2, 6); c.lineTo(-6, 30); c.lineTo(6, 31); c.stroke();
  c.beginPath(); c.moveTo(-20, 50); c.quadraticCurveTo(0, 64, 20, 50); c.quadraticCurveTo(0, 54, -20, 50); c.fillStyle = '#e0526b'; c.fill();
  circle(c, -44, 26, 10, 'rgba(255,120,120,.25)'); circle(c, 44, 26, 10, 'rgba(255,120,120,.25)');
  c.restore();
}
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
  // dotted texture
  c.fillStyle = 'rgba(18,26,70,.07)';
  for (let x = 20; x < w; x += 28) for (let y = 20; y < h; y += 28) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
  // local device panel
  const pIn = E.outExpo(seg(lt, 0, 0.9));
  fillRR(c, 36, 36, 520 * pIn, h - 72, 26, BLUE);
  txt(c, 'LOCAL DEVICE', 70, 72, { font: F(700, 15), color: 'rgba(255,255,255,.7)', ls: 4, alpha: seg(lt, 0.5, 0.9) });
  txt(c, '本地设备 · 明文只在这里', 70, 98, { font: F(700, 20, CJK), color: '#fff', alpha: seg(lt, 0.6, 1) });
  const cx = 296, cy = 318;
  // sun disc
  const sIn = E.outBack(seg(lt, 0.25, 1.0));
  circle(c, cx, cy - 10, 168 * sIn, YEL);
  // viewfinder brackets
  const bIn = E.outExpo(seg(lt, 0.5, 1.3));
  const bw = lerp(420, 300, bIn), bh = lerp(440, 330, bIn);
  c.save(); c.globalAlpha = bIn; brackets(c, cx - bw / 2, cy - 30 - bh / 2, bw, bh, 34, '#fff', 5); c.restore();
  // portrait
  const pS = E.outBack(seg(lt, 0.35, 1.1));
  const encU = seg(lt, 3.2, 4.9);          // plaintext → cipher tiles
  const flyU = seg(lt, 5.0, 7.0);          // tiles fly to the vault
  const headY = cy - 20;
  c.save(); rr(c, 36, 36, 520, h - 72, 26); c.clip();
  portrait(c, cx, headY, 0.95 * pS, 1);
  // scan
  const scanU = seg(lt, 1.2, 3.0);
  if (scanU > 0 && lt < 3.6) {
    const sy = lerp(headY - 120, headY + 110, E.inOutCubic(scanU));
    const fade = 1 - seg(lt, 3.0, 3.6);
    const g = c.createLinearGradient(0, sy - 60, 0, sy);
    g.addColorStop(0, 'rgba(25,227,166,0)'); g.addColorStop(1, `rgba(25,227,166,${0.35 * fade})`);
    c.fillStyle = g; c.fillRect(cx - 170, sy - 60, 340, 60);
    line(c, cx - 170, sy, cx + 170, sy, `rgba(25,227,166,${fade})`, 3);
    // landmarks
    c.save(); c.translate(cx, headY); c.scale(0.95, 0.95);
    for (const [i, j] of FACE_EDGES) {
      const A = FACE_PTS[i], B = FACE_PTS[j];
      if (headY + Math.max(A[1], B[1]) * 0.95 < sy) line(c, A[0], A[1], B[0], B[1], `rgba(25,227,166,${0.8 * fade})`, 1.6);
    }
    for (const P of FACE_PTS) if (headY + P[1] * 0.95 < sy) { circle(c, P[0], P[1], 3.6, `rgba(255,255,255,${fade})`); ring(c, P[0], P[1], 3.6, `rgba(18,26,70,${fade})`, 1.2); }
    c.restore();
  }
  c.restore();
  // cipher tiles over the portrait
  const TS = 26, gx0 = cx - 156, gy0 = headY - 130, NX = 12, NY = 13;
  const vx = w - 250, vy = 250;
  const tick = Math.floor(lt * 10);
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
    const k = iy * NX + ix;
    const x = gx0 + ix * TS, y = gy0 + iy * TS;
    const dx = x + TS / 2 - cx, dy = y + TS / 2 - (headY + 20);
    if (Math.hypot(dx * 0.9, dy * 0.8) > 190) continue;          // rough silhouette
    const d = Math.hypot(dx, dy) / 200;
    const on = E.outCubic(seg(encU, d * 0.6, d * 0.6 + 0.4));
    if (on <= 0) continue;
    const fd = hash(k) * 0.55;
    const fu = E.inOutCubic(seg(flyU, fd, fd + 0.45));
    if (fu >= 1) continue;
    const px = lerp(x, vx + (hash(k + 3) - 0.5) * 60, fu) + Math.sin(fu * Math.PI) * 0;
    const py = lerp(y, vy + (hash(k + 5) - 0.5) * 50, fu) - Math.sin(fu * Math.PI) * 140;
    const s = lerp(TS - 2, 10, fu) * on;
    c.fillStyle = (ix + iy) % 3 === 0 ? MINT : (ix + iy) % 3 === 1 ? NAVY : '#1d2bd0';
    c.fillRect(px + (TS - s) / 2, py + (TS - s) / 2, s, s);
    if (fu < 0.4 && on > 0.8) txt(c, GLY[(hash(k * 3 + tick) * 16) | 0], px + TS / 2, py + TS / 2 + 5, { font: F(600, 13, MONO), align: 'center', color: (ix + iy) % 3 === 0 ? NAVY : MINT });
  }
  // portrait returns as the local original
  const back = seg(lt, 6.2, 7.0);
  if (back > 0) {
    c.save(); rr(c, 36, 36, 520, h - 72, 26); c.clip();
    c.globalAlpha = back; portrait(c, cx, headY, 0.95, 1); c.restore();
    fillRR(c, cx - 96, cy + 120, 192, 38, 19, 'rgba(18,26,70,.85)');
    lockIcon(c, cx - 70, cy + 141, 0.6, '#fff');
    txt(c, '原图 · 仅在本机', cx + 10, cy + 146, { font: F(700, 16, CJK), align: 'center', alpha: back });
  }
  // "明文不出域" stamp
  const st = seg(lt, 4.2, 4.6) * (1 - seg(lt, 6.0, 6.4));
  if (st > 0) {
    c.save(); c.translate(cx + 120, cy + 150); c.rotate(-0.16); c.scale(lerp(1.6, 1, E.outExpo(st)), lerp(1.6, 1, E.outExpo(st))); c.globalAlpha = st;
    rr(c, -96, -30, 192, 60, 10); c.strokeStyle = YEL; c.lineWidth = 4; c.stroke();
    txt(c, '明文不出域', 0, 10, { font: F(900, 28, CJK), align: 'center', color: YEL, ls: 3 });
    c.restore();
  }
  // vault
  const vIn = E.outBack(seg(lt, 4.4, 5.1));
  c.save(); c.translate(vx, vy); c.scale(vIn, vIn);
  c.save(); c.shadowColor = 'rgba(18,26,70,.25)'; c.shadowOffsetY = 14; c.shadowBlur = 0;
  fillRR(c, -120, -110, 240, 220, 28, '#10b98a'); c.restore();
  fillRR(c, -120, -110, 240, 200, 28, MINT);
  fillRR(c, -96, -88, 192, 156, 18, '#0fa77d');
  const dial = lt * 2.2 + E.outCubic(flyU) * 6;
  circle(c, 0, -10, 46, '#f4efe4'); ring(c, 0, -10, 46, NAVY, 5);
  for (let i = 0; i < 8; i++) { const a = dial + i * Math.PI / 4; line(c, Math.cos(a) * 30, -10 + Math.sin(a) * 30, Math.cos(a) * 40, -10 + Math.sin(a) * 40, NAVY, 4); }
  circle(c, 0, -10, 12, NAVY);
  fillRR(c, 70, -30, 12, 44, 6, NAVY);
  c.restore();
  if (vIn > 0.01) {
    txt(c, 'CLOUD · 平台', vx, vy - 140, { font: F(700, 15, CJK), align: 'center', color: 'rgba(18,26,70,.55)', ls: 3, alpha: clamp(vIn) });
    txt(c, '密文金库 · 仅存密文', vx, vy + 146, { font: F(900, 22, CJK), align: 'center', color: NAVY, alpha: clamp(vIn) });
    const n = Math.floor(E.outCubic(flyU) * 1248);
    txt(c, `已接收 ${n.toLocaleString()} 块 · XChaCha20-Poly1305`, vx, vy + 176, { font: F(500, 14, MONO), align: 'center', color: 'rgba(18,26,70,.65)', alpha: clamp(vIn) });
  }
  // key into the actor's hand
  const kU = E.outBack(seg(lt, 6.0, 7.0));
  if (kU > 0) {
    const kx = lerp(cx, 100, E.outCubic(seg(lt, 6.0, 6.8))), ky = lerp(cy - 30, h - 92, E.outCubic(seg(lt, 6.0, 6.8)));
    fillRR(c, 64, h - 128, 440 * clamp(kU), 72, 36, 'rgba(255,201,52,.18)');
    c.save(); c.globalAlpha = clamp(kU); keyIcon(c, kx, ky, 0.55, YEL, NAVY, 3); c.restore();
    txt(c, '私钥 · 只在你的手中', 150, h - 98, { font: F(900, 22, CJK), color: '#fff', alpha: seg(lt, 6.6, 7.0) });
    txt(c, 'PRIVATE KEY NEVER LEAVES THE DEVICE', 150, h - 74, { font: F(600, 11), color: 'rgba(255,255,255,.65)', ls: 2, alpha: seg(lt, 6.7, 7.1) });
  }
  // chips
  const chips = [['featureCommit', '0x9f3a…c21e'], ['Ed25519 签名', '✓ 已验证'], ['透明账本', 'BIND_LIKENESS #10482']];
  chips.forEach(([k, v], i) => {
    const u = E.outExpo(seg(lt, 7.2 + i * 0.35, 7.8 + i * 0.35));
    if (u <= 0) return;
    const x = 640 + (1 - u) * 60, y = 456 + i * 52;
    c.save(); c.globalAlpha = u;
    fillRR(c, x, y, 440, 42, 21, NAVY);
    txt(c, k, x + 22, y + 27, { font: F(600, 15, CJK), color: MINT });
    txt(c, v, x + 418, y + 27, { font: F(500, 15, MONO), color: '#fff', align: 'right' });
    c.restore();
  });
}

/* ───────────────────────── 02 · isometric 2.5D: encrypted market ───────────────────────── */
function stage2(c, lt, w, h) {
  let g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bdb2ff'); g.addColorStop(1, '#efeaff');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  g = c.createRadialGradient(w * 0.45, h * 0.55, 0, w * 0.45, h * 0.55, 600);
  g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // clouds
  for (let i = 0; i < 3; i++) {
    const x = ((i * 410 + lt * 16) % (w + 300)) - 150, y = 70 + i * 46;
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(x, y, 60, 18, 0, 0, 7); c.ellipse(x + 34, y - 12, 34, 20, 0, 0, 7); c.ellipse(x - 30, y - 6, 26, 14, 0, 0, 7); c.fill();
  }
  const N = 7, TWd = 108, THd = 54;
  const cam = E.inOutCubic(seg(lt, 0, 10));
  c.save();
  c.translate(w * 0.44 - cam * 30, h * 0.56 + 8 - cam * 10);
  const z0 = lerp(0.94, 1.06, cam); c.scale(z0, z0);
  const P = (i, j, z = 0) => [(i - j) * TWd / 2, (i + j - (N - 1)) * THd / 2 - z];
  const poly = (pts, fill) => { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };
  // slab
  const sIn = E.outExpo(seg(lt, 0, 0.9));
  const D = 34 * sIn, e0 = -0.5, e1 = N - 0.5;
  c.save(); c.globalAlpha = sIn;
  poly([P(e1, e0), P(e1, e1), P(e1, e1, -D), P(e1, e0, -D)], '#a99ef0');
  poly([P(e0, e1), P(e1, e1), P(e1, e1, -D), P(e0, e1, -D)], '#8c80e0');
  poly([P(e0, e0), P(e1, e0), P(e1, e1), P(e0, e1)], '#e6e1ff');
  c.restore();
  // tiles
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i; if (j < 0 || j >= N) continue;
    const u = E.outBack(seg(lt, 0.15 + s * 0.05, 0.55 + s * 0.05));
    if (u <= 0) continue;
    const z = (1 - u) * 120, q = 0.46;
    c.save(); c.globalAlpha = clamp(u * 2);
    poly([P(i - q, j - q, z), P(i + q, j - q, z), P(i + q, j + q, z), P(i - q, j + q, z)], (i + j) % 2 ? '#fbfaff' : '#f3f0ff');
    c.restore();
  }
  // assets
  const AS = [
    { i: 1, j: 1, h: 64, c: '#b7a6ff', tag: '声纹' }, { i: 5, j: 1, h: 96, c: '#7fe0c4', tag: '虚拟形象' },
    { i: 0, j: 4, h: 50, c: '#ffb3c7' }, { i: 4, j: 5, h: 74, c: '#8fc3ff', tag: '视频' },
    { i: 5, j: 4, h: 42, c: '#ffd27a' }, { i: 2, j: 6, h: 84, c: '#b7a6ff', tag: '面部' },
    { i: 6, j: 2, h: 56, c: '#ffb3c7' }, { i: 1, j: 3, h: 38, c: '#8fc3ff' }, { i: 3, j: 0, h: 70, c: '#ffd27a', tag: '肖像' },
    { i: 3, j: 3, h: 0, c: '#6b5cff', hero: true },
  ].sort((a, b) => a.i + a.j - (b.i + b.j));
  const heroU = E.outBack(seg(lt, 1.8, 3.0));
  for (const a of AS) {
    const d = 0.7 + (a.i + a.j) * 0.06;
    const u = a.hero ? 1 : E.outBack(seg(lt, d, d + 0.5));
    if (u <= 0) continue;
    let hh = a.hero ? lerp(24, 168, heroU) : a.h * u;
    const q = a.hero ? 0.38 : 0.32, i = a.i, j = a.j;
    if (a.hero) {
      const pul = 0.5 + 0.5 * Math.sin(lt * 4);
      c.save(); c.globalAlpha = seg(lt, 1.6, 2.2);
      poly([P(i - .5, j - .5), P(i + .5, j - .5), P(i + .5, j + .5), P(i - .5, j + .5)], `rgba(107,92,255,${0.18 + 0.12 * pul})`);
      c.beginPath(); [P(i - .55, j - .55), P(i + .55, j - .55), P(i + .55, j + .55), P(i - .55, j + .55)].forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
      c.strokeStyle = '#6b5cff'; c.lineWidth = 2.5; c.setLineDash([8, 6]); c.lineDashOffset = -lt * 30; c.stroke(); c.setLineDash([]);
      c.restore();
    }
    poly([P(i + q, j - q, 0), P(i + q, j + q, 0), P(i + q, j + q, hh), P(i + q, j - q, hh)], shade(a.c, -0.1));
    poly([P(i - q, j + q, 0), P(i + q, j + q, 0), P(i + q, j + q, hh), P(i - q, j + q, hh)], shade(a.c, -0.24));
    poly([P(i - q, j - q, hh), P(i + q, j - q, hh), P(i + q, j + q, hh), P(i - q, j + q, hh)], shade(a.c, 0.18));
    // lock on the left face
    const [lx, ly] = P(i, j + q, hh / 2);
    if (hh > 30) lockIcon(c, lx, ly + 2, a.hero ? 0.9 : 0.55, 'rgba(255,255,255,.85)');
    if (a.hero && heroU > 0.3) {
      const [tx, ty] = P(i, j, hh);
      const g2 = c.createRadialGradient(tx, ty, 0, tx, ty, 120);
      g2.addColorStop(0, 'rgba(255,255,255,.65)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g2; c.fillRect(tx - 120, ty - 120, 240, 240);
      // portrait glyph on top
      c.save(); c.translate(tx, ty); c.scale(1, 0.5); c.rotate(Math.PI / 4);
      circle(c, 0, -6, 12, 'rgba(255,255,255,.95)'); c.beginPath(); c.arc(0, 18, 20, Math.PI, 0); c.fillStyle = 'rgba(255,255,255,.95)'; c.fill();
      c.restore();
    }
    if (a.tag) {
      const tu = E.outBack(seg(lt, 1.2 + (a.i + a.j) * 0.05, 1.7 + (a.i + a.j) * 0.05));
      const [tx, ty] = P(i, j, hh + 34 + Math.sin(lt * 2 + i) * 4);
      if (tu > 0) {
        c.save(); c.translate(tx, ty); c.scale(tu, tu);
        const ww = tw(c, a.tag, F(700, 14, CJK)) + 40;
        c.shadowColor = 'rgba(60,40,160,.25)'; c.shadowBlur = 12; c.shadowOffsetY = 4;
        fillRR(c, -ww / 2, -16, ww, 32, 16, '#fff'); c.shadowColor = 'transparent';
        lockIcon(c, -ww / 2 + 16, 2, 0.42, '#6b5cff');
        txt(c, a.tag, 8, 5, { font: F(700, 14, CJK), align: 'center', color: '#2a2060' });
        c.restore();
      }
    }
  }
  const heroTop = P(3, 3, lerp(24, 168, heroU));
  c.restore();
  // map hero top to card space (same transform as above)
  const hx = w * 0.44 - cam * 30 + heroTop[0] * z0, hy = h * 0.56 + 8 - cam * 10 + heroTop[1] * z0;
  // licence card
  const cu = E.outExpo(seg(lt, 3.0, 3.8));
  const kx = 700, ky = 150, kw = 360, kh = 290;
  if (cu > 0) {
    c.save(); c.globalAlpha = cu;
    c.strokeStyle = '#6b5cff'; c.lineWidth = 2; c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(hx + 10, hy - 10); c.lineTo(kx, ky + 150); c.stroke(); c.setLineDash([]);
    circle(c, hx + 10, hy - 10, 6, '#6b5cff');
    c.translate(0, (1 - cu) * 30);
    c.shadowColor = 'rgba(50,30,150,.3)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    fillRR(c, kx, ky, kw, kh, 20, '#fff'); c.shadowColor = 'transparent';
    const ag = c.createLinearGradient(kx + 24, ky + 24, kx + 72, ky + 72); ag.addColorStop(0, '#ffb3c7'); ag.addColorStop(1, '#6b5cff');
    circle(c, kx + 48, ky + 50, 24, ag);
    circle(c, kx + 48, ky + 44, 8, '#fff'); c.beginPath(); c.arc(kx + 48, ky + 64, 13, Math.PI, 0); c.fillStyle = '#fff'; c.fill();
    txt(c, '林夏 · 面部肖像', kx + 86, ky + 46, { font: F(900, 20, CJK), color: '#1d1640' });
    fillRR(c, kx + 86, ky + 56, 78, 22, 11, '#dcf9ee'); check(c, kx + 100, ky + 67, 0.55, '#0f9d6e', 2.4);
    txt(c, '已校验', kx + 136, ky + 72, { font: F(700, 12, CJK), color: '#0f9d6e', align: 'center' });
    txt(c, 'ast_Cu1H…PXwg', kx + 174, ky + 72, { font: F(400, 12, MONO), color: '#8a83b5' });
    const rows = [['许可类型', '使用权 · 非独占'], ['单次价格', '¥ 2,000 / 次'], ['版税', '10% 回流演员'], ['所有权', '始终归演员']];
    rows.forEach(([k, v], r) => {
      const y = ky + 112 + r * 30;
      txt(c, k, kx + 26, y, { font: F(400, 15, CJK), color: '#8a83b5' });
      txt(c, v, kx + kw - 26, y, { font: F(700, 15, CJK), color: '#1d1640', align: 'right' });
      if (r < 3) line(c, kx + 26, y + 11, kx + kw - 26, y + 11, '#efecfb', 1);
    });
    const pressed = lt >= 6.2;
    const bg2 = c.createLinearGradient(kx, 0, kx + kw, 0); bg2.addColorStop(0, '#7b5cff'); bg2.addColorStop(1, '#5a7bff');
    const pr = 1 - 0.04 * Math.sin(Math.PI * seg(lt, 6.15, 6.4));
    c.save(); c.translate(kx + kw / 2, ky + 252); c.scale(pr, pr);
    fillRR(c, -kw / 2 + 24, -22, kw - 48, 44, 22, pressed ? '#1d1640' : bg2);
    txt(c, pressed ? '已提交 · 等待演员同意' : '申请使用', 0, 6, { font: F(700, 17, CJK), align: 'center' });
    c.restore();
    ripple(c, kx + kw / 2, ky + 252, seg(lt, 6.2, 6.8), [255, 255, 255]);
    c.restore();
  }
  // cursor
  if (lt > 4.4) {
    const mu = E.inOutCubic(seg(lt, 4.6, 6.0));
    const mx = lerp(w - 40, kx + kw / 2 + 10, mu), my = lerp(h - 10, ky + 256, mu);
    cursor(c, mx, my, Math.sin(Math.PI * seg(lt, 6.1, 6.4)));
  }
  // push to the actor's phone
  const fu = seg(lt, 6.8, 8.2);
  if (fu > 0) {
    const px = w - 90, py = 62;
    const pa = E.outBack(seg(lt, 6.6, 7.0));
    c.save(); c.translate(px, py); c.scale(pa, pa);
    fillRR(c, -26, -44, 52, 88, 12, '#1d1640'); fillRR(c, -21, -36, 42, 70, 6, '#6b5cff');
    circle(c, 0, -2, 9, '#fff'); const bump = lt > 8.2 ? Math.max(0, 1 - (lt - 8.2) * 3) : 0;
    circle(c, 24, -40, 9 + bump * 5, '#ff4f8b'); txt(c, '1', 24, -36, { font: F(800, 11), align: 'center' });
    c.restore();
    txt(c, '推送至演员手机', px - 40, py + 6, { font: F(700, 15, CJK), align: 'right', color: '#1d1640', alpha: seg(lt, 7.0, 7.4) });
    const sx = kx + kw / 2, sy = ky - 2;
    c.save(); c.strokeStyle = 'rgba(107,92,255,.6)'; c.setLineDash([4, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + 120, py - 40, px - 30, py); c.stroke(); c.setLineDash([]); c.restore();
    if (fu < 1) {
      const u = E.inOutCubic(fu), qx = sx + 120, qy = py - 40;
      const bx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * qx + u * u * (px - 30);
      const by = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * qy + u * u * py;
      circle(c, bx, by, 9, '#ff4f8b'); circle(c, bx, by, 18, 'rgba(255,79,139,.25)');
    }
  }
}

/* ───────────────────────── 03 · glassmorphism: consent per use ───────────────────────── */
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
  const a = AUR.getContext('2d');
  aurora(a, lt, w, h);
  c.drawImage(AUR, 0, 0);
  // phone
  const pu = E.outExpo(seg(lt, 0.1, 1.0));
  const PX = 150, PY = 40 + (1 - pu) * 120, PW = 330, PH = 560;
  c.save(); c.globalAlpha = pu;
  c.save(); c.shadowColor = 'rgba(10,0,40,.5)'; c.shadowBlur = 60; c.shadowOffsetY = 24; fillRR(c, PX, PY, PW, PH, 48, 'rgba(255,255,255,.01)'); c.restore();
  glass(c, PX, PY, PW, PH, 48);
  fillRR(c, PX + PW / 2 - 50, PY + 14, 100, 26, 13, 'rgba(10,6,30,.85)');
  txt(c, '9:41', PX + 34, PY + 34, { font: F(700, 15) });
  txt(c, '授权中心', PX + 28, PY + 92, { font: F(900, 26, CJK) });
  txt(c, 'MIME · 米麦', PX + 28, PY + 116, { font: F(500, 13, CJK), color: 'rgba(255,255,255,.65)', ls: 1 });
  // idle list
  for (let i = 0; i < 3; i++) { fillRR(c, PX + 24, PY + 300 + i * 64, PW - 48, 50, 14, 'rgba(255,255,255,.08)'); fillRR(c, PX + 40, PY + 316 + i * 64, 120, 8, 4, 'rgba(255,255,255,.22)'); fillRR(c, PX + 40, PY + 330 + i * 64, 70, 6, 3, 'rgba(255,255,255,.12)'); }
  c.restore();
  // notification
  const nu = E.outBack(seg(lt, 1.0, 1.6));
  const ny = PY + 140 + (1 - nu) * -90;
  if (nu > 0) {
    c.save(); c.globalAlpha = clamp(nu * 1.5);
    glass(c, PX + 16, ny, PW - 32, 112, 22);
    fillRR(c, PX + 32, ny + 18, 40, 40, 11, '#fff');
    c.drawImage(LOGO, 0, 0, 800, 475, PX + 35, ny + 29, 34, 20);
    txt(c, '肖像使用申请', PX + 84, ny + 36, { font: F(700, 16, CJK) });
    txt(c, '刚刚', PX + PW - 34, ny + 36, { font: F(400, 13, CJK), align: 'right', color: 'rgba(255,255,255,.6)' });
    txt(c, '星河影业 申请使用', PX + 84, ny + 60, { font: F(400, 14, CJK), color: 'rgba(255,255,255,.85)' });
    txt(c, '「林夏 · 面部肖像」', PX + 80, ny + 82, { font: F(700, 14, CJK), color: '#ffd1e8' });
    ['生成', '1 次', '48h', '商用'].forEach((s, i) => { fillRR(c, PX + 32 + i * 64, ny + 92, 56, 0, 0, '#0000'); });
    c.restore();
  }
  // approval sheet
  const su = E.outExpo(seg(lt, 2.4, 3.1));
  if (su > 0) {
    const sy = PY + PH - 330 * su - 12;
    c.save(); rr(c, PX, PY, PW, PH, 48); c.clip();
    glass(c, PX + 10, sy, PW - 20, 330, 34);
    fillRR(c, PX + PW / 2 - 24, sy + 10, 48, 5, 3, 'rgba(255,255,255,.5)');
    txt(c, '授权详情', PX + 34, sy + 50, { font: F(900, 20, CJK) });
    const rows = [['用途', '广告短片 · 15s'], ['次数', '1 次'], ['有效期', '48 小时'], ['报酬', '¥ 2,000']];
    rows.forEach(([k, v], i) => {
      txt(c, k, PX + 34, sy + 88 + i * 34, { font: F(400, 15, CJK), color: 'rgba(255,255,255,.66)' });
      txt(c, v, PX + PW - 34, sy + 88 + i * 34, { font: F(700, 15, CJK), align: 'right' });
    });
    // buttons
    const by = sy + 238;
    rr(c, PX + 30, by, 96, 50, 25); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.stroke();
    txt(c, '拒绝', PX + 78, by + 31, { font: F(700, 16, CJK), align: 'center' });
    const signU = seg(lt, 4.6, 5.6), done = lt >= 5.6;
    const bx = PX + 138, bw = PW - 168;
    const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#ff5fb0'); g.addColorStop(1, '#8a5cff');
    fillRR(c, bx, by, bw, 50, 25, done ? '#19d68c' : 'rgba(255,255,255,.18)');
    if (!done) { c.save(); rr(c, bx, by, bw, 50, 25); c.clip(); fillRR(c, bx, by, lt < 4.6 ? bw : bw * signU, 50, 25, g); c.restore(); }
    if (done) { check(c, bx + 34, by + 25, 1, '#fff', 3.5, seg(lt, 5.6, 5.9)); txt(c, '已签名授权', bx + bw / 2 + 14, by + 31, { font: F(800, 16, CJK), align: 'center' }); }
    else txt(c, lt < 4.6 ? '同意并签名' : '签名中…', bx + bw / 2, by + 31, { font: F(800, 16, CJK), align: 'center' });
    c.restore();
    // finger tap
    if (lt > 3.6 && lt < 5.2) {
      const tu = E.inOutCubic(seg(lt, 3.6, 4.4));
      const fx = lerp(PX + PW + 60, bx + bw / 2 + 10, tu), fy = lerp(PY + PH + 40, by + 28, tu);
      const press = Math.sin(Math.PI * seg(lt, 4.4, 4.7));
      circle(c, fx, fy, 26 - press * 4, 'rgba(255,255,255,.35)'); ring(c, fx, fy, 26 - press * 4, 'rgba(255,255,255,.8)', 2);
    }
    ripple(c, bx + bw / 2 + 10, by + 28, seg(lt, 4.45, 5.1), [255, 255, 255]);
  }
  // toast
  const tu = E.outBack(seg(lt, 5.7, 6.2)) * (1 - seg(lt, 9.0, 9.4));
  if (tu > 0) {
    c.save(); c.globalAlpha = clamp(tu);
    fillRR(c, PX + 34, PY + 46 + (1 - tu) * -30, PW - 68, 40, 20, 'rgba(10,6,30,.85)');
    check(c, PX + 58, PY + 66 + (1 - tu) * -30, 0.7, '#19d68c', 3);
    txt(c, 'License LIC-7F3A 已签发', PX + 74, PY + 72 + (1 - tu) * -30, { font: F(600, 14, CJK) });
    c.restore();
  }
  // desktop job panel
  const du = E.outExpo(seg(lt, 0.6, 1.4));
  const DX = 540 + (1 - du) * 80, DY = 70, DW = 560, DH = 470;
  glass(c, DX, DY, DW, DH, 28, du);
  if (du > 0) {
    c.save(); c.globalAlpha = du;
    circle(c, DX + 30, DY + 30, 6, '#ff5f57'); circle(c, DX + 50, DY + 30, 6, '#febc2e'); circle(c, DX + 70, DY + 30, 6, '#28c840');
    txt(c, '受控生成任务', DX + 30, DY + 82, { font: F(900, 24, CJK) });
    txt(c, 'JOB-2291 · 星河影业 · 广告短片', DX + 30, DY + 108, { font: F(400, 14, CJK), color: 'rgba(255,255,255,.65)' });
    const st = [['远程证明', 'Attest'], ['密钥释放', 'Release'], ['密态解密', 'Decrypt'], ['生成', 'Generate'], ['擦除', 'Wipe']];
    if (lt < 5.8) {
      const sp = lt * 5;
      for (let i = 0; i < 10; i++) { const an = sp + i * 0.6; circle(c, DX + 50 + Math.cos(an) * 18, DY + 190 + Math.sin(an) * 18, 2 + i * 0.3, `rgba(255,255,255,${0.1 + i * 0.08})`); }
      txt(c, '等待演员授权…', DX + 84, DY + 196, { font: F(700, 18, CJK) });
      txt(c, '未经本人签名，密钥不会释放', DX + 84, DY + 222, { font: F(400, 14, CJK), color: 'rgba(255,255,255,.6)' });
    }
    st.forEach(([zh, en], i) => {
      const at = 6.0 + i * 0.55, ru = E.outExpo(seg(lt, at - 0.3, at));
      if (ru <= 0) return;
      const y = DY + 160 + i * 54;
      c.save(); c.globalAlpha *= ru; c.translate((1 - ru) * 20, 0);
      fillRR(c, DX + 26, y - 22, 300, 44, 12, 'rgba(255,255,255,.08)');
      const isGen = i === 3, gp = seg(lt, at, at + 1.1);
      const ok = isGen ? gp >= 1 : lt >= at + 0.15;
      circle(c, DX + 50, y, 12, ok ? '#19d68c' : 'rgba(255,255,255,.2)');
      if (ok) check(c, DX + 50, y + 1, 0.7, '#fff', 3);
      txt(c, zh, DX + 74, y + 6, { font: F(700, 16, CJK) });
      txt(c, en, DX + 160, y + 6, { font: F(400, 13), color: 'rgba(255,255,255,.55)' });
      if (isGen) { fillRR(c, DX + 236, y - 3, 76, 6, 3, 'rgba(255,255,255,.2)'); fillRR(c, DX + 236, y - 3, 76 * gp, 6, 3, '#ff8bd0'); }
      c.restore();
    });
    // result thumbnail
    const ru = E.outBack(seg(lt, 8.4, 9.0));
    if (ru > 0) {
      c.save(); c.translate(DX + 440, DY + 260); c.scale(ru, ru);
      const g = c.createLinearGradient(-75, -130, 75, 130); g.addColorStop(0, '#ff9a4f'); g.addColorStop(0.5, '#ff4fa3'); g.addColorStop(1, '#5a3cff');
      fillRR(c, -75, -130, 150, 260, 16, g);
      c.globalAlpha = 0.9; portrait(c, 0, 20, 0.32, 1); c.globalAlpha = 1;
      circle(c, 0, -60, 22, 'rgba(255,255,255,.85)');
      c.beginPath(); c.moveTo(-7, -71); c.lineTo(11, -60); c.lineTo(-7, -49); c.closePath(); c.fillStyle = '#5a3cff'; c.fill();
      c.restore();
      txt(c, '成片 · 已交付', DX + 440, DY + 420, { font: F(700, 14, CJK), align: 'center', alpha: ru > 0 ? clamp(ru) : 0 });
    }
    fillRR(c, DX + 26, DY + DH - 50, 152, 32, 16, 'rgba(255,255,255,.12)');
    txt(c, `配额 ${lt > 8.6 ? 1 : 0} / 1 · 已用`, DX + 102, DY + DH - 29, { font: F(600, 13, CJK), align: 'center' });
    fillRR(c, DX + 188, DY + DH - 50, 196, 32, 16, 'rgba(25,214,140,.25)');
    txt(c, '原件不出域 · 用后即焚', DX + 286, DY + DH - 29, { font: F(700, 13, CJK), align: 'center', color: '#b8ffe0' });
    c.restore();
  }
}

/* ───────────────────────── 04 · HUD: your key, your control ───────────────────────── */
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
  const cx = 420, cy = 330;
  // rings
  const A = Math.PI * 2;
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
  g = c.createRadialGradient(0, 0, 0, 0, 0, 120); g.addColorStop(0, `rgba(34,255,196,${0.25 + 0.1 * pul})`); g.addColorStop(1, 'rgba(34,255,196,0)');
  c.fillStyle = g; c.fillRect(-120, -120, 240, 240);
  ring(c, 0, 0, 96, 'rgba(34,255,196,.85)', 2, -Math.PI / 2, -Math.PI / 2 + A * E.outCubic(seg(lt, 0.4, 1.4)));
  c.restore();
  c.save(); c.globalAlpha = seg(lt, 0.8, 1.4); c.shadowColor = TEAL; c.shadowBlur = 24;
  keyIcon(c, cx - 32, cy, 0.8, null, TEAL, 4); c.restore();
  txt(c, decode('ROOT KEY', seg(lt, 1.0, 1.8), 3), cx, cy + 62, { font: F(600, 13, MONO), align: 'center', color: TEAL, ls: 3 });
  // licensees
  const L = [['星河影业', 'LIC-7F3A', '2 / 3', 150], ['青禾广告', 'LIC-91C0', '5 / 10', 330], ['北辰游戏', 'LIC-3E7D', '1 / 5', 510]];
  L.forEach(([name, id, q, y], i) => {
    const u = E.outExpo(seg(lt, 1.4 + i * 0.25, 2.0 + i * 0.25));
    if (u <= 0) return;
    const bx = 760, isRev = i === 2 && revoked, isRen = i === 0 && lt >= 6.3;
    const col = isRev ? RED : isRen ? TEAL : CY_;
    // link
    const a = Math.atan2(y - cy, bx - cx), sx = cx + Math.cos(a) * 228, sy = cy + Math.sin(a) * 228;
    c.save(); c.globalAlpha = u;
    if (isRev) {
      const gl = flash * 30;
      c.setLineDash([10, 10]); line(c, sx, sy, lerp(sx, bx, 0.42) + (hash(Math.floor(lt * 24)) - 0.5) * gl, lerp(sy, y, 0.42), rgb(hex(RED), 0.6), 2);
      line(c, lerp(sx, bx, 0.58), lerp(sy, y, 0.58), bx, y, rgb(hex(RED), 0.3), 2); c.setLineDash([]);
      const mx = lerp(sx, bx, 0.5), my = lerp(sy, y, 0.5);
      line(c, mx - 10, my - 10, mx + 10, my + 10, RED, 3); line(c, mx + 10, my - 10, mx - 10, my + 10, RED, 3);
    } else {
      line(c, sx, sy, sx + (bx - sx) * u, sy + (y - sy) * u, rgb(hex(col), 0.45), 1.5);
      for (let k = 0; k < 3; k++) { const p = ((lt * 0.7 + k / 3 + i * 0.13) % 1); circle(c, lerp(sx, bx, p), lerp(sy, y, p), 3.5, col); }
    }
    // box
    const bw = 340, bh = 92;
    c.translate((1 - u) * 40, 0);
    fillRR(c, bx, y - bh / 2, bw, bh, 6, isRev ? `rgba(255,61,90,${0.12 + flash * 0.4})` : 'rgba(63,232,255,.06)');
    brackets(c, bx, y - bh / 2, bw, bh, 14, col, 2);
    txt(c, name, bx + 22, y - 10, { font: F(700, 22, CJK), color: '#e8fdff' });
    txt(c, id, bx + 22, y + 22, { font: F(500, 14, MONO), color: rgb(hex(col), .8), ls: 1 });
    const st = isRev ? '已撤销 · 停止交付' : isRen ? '已续期 +48h' : '使用中';
    txt(c, st, bx + bw - 20, y - 10, { font: F(700, 16, CJK), color: col, align: 'right' });
    txt(c, isRev ? 'REVOKED' : `配额 ${q}`, bx + bw - 20, y + 22, { font: F(500, 14, isRev ? MONO : CJK), color: 'rgba(232,253,255,.6)', align: 'right' });
    // revoke button on 3rd
    if (i === 2 && lt > 3.6 && !revoked) {
      const hu = seg(lt, 3.6, 4.0), pr = Math.sin(Math.PI * seg(lt, 4.8, 5.0));
      c.save(); c.globalAlpha *= hu;
      fillRR(c, bx + bw - 120 + pr * 2, y + 52, 120 - pr * 4, 34, 4, rgb(hex(AMB), .18 + pr * .4));
      rr(c, bx + bw - 120, y + 52, 120, 34, 4); c.strokeStyle = AMB; c.lineWidth = 1.5; c.stroke();
      txt(c, '撤销 REVOKE', bx + bw - 60, y + 75, { font: F(700, 14, CJK), align: 'center', color: AMB });
      c.restore();
    }
    c.restore();
  });
  // left readouts
  const ru = seg(lt, 0.6, 1.6);
  txt(c, decode('KEY HOLDER // 持钥人', ru, 9), 34, 54, { font: F(600, 13, MONO), color: 'rgba(63,232,255,.7)', ls: 2 });
  txt(c, decode('林夏', ru, 11), 34, 92, { font: F(900, 32, CJK), color: '#e8fdff' });
  txt(c, decode('ROOT KEY · 设备生成 · 平台不可见', seg(lt, 1.0, 2.0), 13), 34, 120, { font: F(500, 14, CJK), color: 'rgba(34,255,196,.85)' });
  const ttl = Math.max(0, 47 * 3600 + 59 * 60 + 12 - Math.floor(lt * 37));
  const hh = String(Math.floor(ttl / 3600)).padStart(2, '0'), mm = String(Math.floor(ttl / 60) % 60).padStart(2, '0'), ss = String(ttl % 60).padStart(2, '0');
  txt(c, 'TTL', 34, h - 92, { font: F(600, 12, MONO), color: 'rgba(63,232,255,.6)', ls: 3, alpha: ru });
  txt(c, `${hh}:${mm}:${ss}`, 34, h - 54, { font: F(600, 36, MONO), color: '#e8fdff', alpha: ru });
  const act = revoked ? 2 : 3;
  txt(c, `ACTIVE LICENSES  ${act}`, 260, h - 54, { font: F(600, 16, MONO), color: revoked ? AMB : TEAL, alpha: ru, ls: 2 });
  // banner
  const bu = E.outExpo(seg(lt, 6.8, 7.4));
  if (bu > 0) {
    c.save(); c.globalAlpha = bu;
    const bx = 760, by = 580, bw = 340;
    fillRR(c, bx, by - 20, bw * bu, 40, 4, 'rgba(34,255,196,.14)');
    txt(c, decode('所有权从未转移 · OWNERSHIP NEVER MOVES', seg(lt, 6.8, 7.8), 5), bx + 16, by + 6, { font: F(700, 14, CJK), color: TEAL });
    c.restore();
  }
  // revoke flash
  if (flash > 0) { c.fillStyle = `rgba(255,61,90,${flash * 0.25})`; c.fillRect(0, 0, w, h); }
  // scanline
  const sy = (lt * 140) % (h + 80) - 40;
  g = c.createLinearGradient(0, sy - 40, 0, sy); g.addColorStop(0, 'rgba(63,232,255,0)'); g.addColorStop(1, 'rgba(63,232,255,.08)');
  c.fillStyle = g; c.fillRect(0, sy - 40, w, 40);
}

/* ───────────────────────── 05 · data: mathematics grows value ───────────────────────── */
function stage5(c, lt, w, h) {
  const GOLD = '#f2b84b';
  let g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#141a44');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.05)';
  for (let x = 30; x < w; x += 30) for (let y = 30; y < h; y += 30) { c.beginPath(); c.arc(x, y, 1.2, 0, 7); c.fill(); }
  // merkle tree
  const leaves = 8, lx0 = 70, ldx = 66, ly = 520;
  const lit = (k) => 0.2 + k * 0.24;
  const nodes = [];
  for (let k = 0; k < leaves; k++) nodes.push({ x: lx0 + k * ldx, y: ly, at: lit(k), lvl: 0 });
  let cur = nodes.slice(), lvl = 0;
  while (cur.length > 1) {
    const nx = []; lvl++;
    for (let k = 0; k < cur.length; k += 2) { const a = cur[k], b = cur[k + 1]; const n = { x: (a.x + b.x) / 2, y: ly - lvl * 118, at: Math.max(a.at, b.at) + 0.18, lvl, kids: [a, b] }; nx.push(n); nodes.push(n); }
    cur = nx;
  }
  const root = cur[0];
  for (const n of nodes) if (n.kids) for (const k of n.kids) {
    const u = E.outCubic(seg(lt, n.at - 0.18, n.at));
    line(c, k.x, k.y, n.x, n.y, 'rgba(255,255,255,.12)', 2);
    if (u > 0) line(c, k.x, k.y, lerp(k.x, n.x, u), lerp(k.y, n.y, u), GOLD, 2.5);
  }
  for (const n of nodes) {
    const u = E.outBack(seg(lt, n.at, n.at + 0.3));
    const isRoot = n === root;
    const s = isRoot ? 22 : n.lvl === 0 ? 16 : 13;
    c.save(); c.translate(n.x, n.y); c.rotate(Math.PI / 4);
    fillRR(c, -s / 2, -s / 2, s, s, 3, 'rgba(255,255,255,.08)');
    if (u > 0) { c.scale(u, u); fillRR(c, -s / 2, -s / 2, s, s, 3, GOLD); }
    c.restore();
    if (n.lvl === 0) txt(c, `USE`, n.x, n.y + 34, { font: F(600, 11, MONO), align: 'center', color: 'rgba(255,255,255,.5)', alpha: clamp(u) });
    if (n.lvl === 0) txt(c, `#${String(1277 + nodes.indexOf(n)).padStart(4, '0')}`, n.x, n.y + 50, { font: F(400, 11, MONO), align: 'center', color: 'rgba(255,255,255,.35)', alpha: clamp(u) });
  }
  const rU = seg(lt, root.at, root.at + 0.4);
  if (rU > 0) {
    ring(c, root.x, root.y, 24 + 40 * E.outCubic(rU), `rgba(242,184,75,${1 - rU})`, 2);
    txt(c, 'MERKLE ROOT', root.x, root.y - 46, { font: F(600, 13, MONO), align: 'center', color: GOLD, ls: 3, alpha: rU });
    txt(c, decode('0x7c1e…a94b', rU, 21), root.x, root.y - 26, { font: F(500, 14, MONO), align: 'center', color: '#fff', alpha: rU });
  }
  txt(c, 'LICENSE_USE → 透明账本', 70, 600, { font: F(600, 15, CJK), color: 'rgba(255,255,255,.55)', ls: 1, alpha: seg(lt, 0.2, 0.6) });
  // chart
  const X0 = 640, X1 = 1090, Y0 = 470, Y1 = 170;
  const cu = E.inOutCubic(seg(lt, 1.0, 4.8));
  line(c, X0, Y0, X1, Y0, 'rgba(255,255,255,.25)', 1.5);
  for (let k = 1; k <= 3; k++) line(c, X0, Y0 - k * 100, X1, Y0 - k * 100, 'rgba(255,255,255,.06)', 1);
  const fx = (u) => Math.pow(u, 2.1) * 0.92 + 0.04 * Math.sin(u * 14) * u;
  c.save(); c.beginPath(); c.rect(X0, 0, (X1 - X0) * cu, h); c.clip();
  c.beginPath(); c.moveTo(X0, Y0);
  for (let k = 0; k <= 80; k++) { const u = k / 80; c.lineTo(lerp(X0, X1, u), lerp(Y0, Y1, fx(u))); }
  c.lineTo(X1, Y0); c.closePath();
  g = c.createLinearGradient(0, Y1, 0, Y0); g.addColorStop(0, 'rgba(242,184,75,.45)'); g.addColorStop(1, 'rgba(242,184,75,0)');
  c.fillStyle = g; c.fill();
  c.beginPath();
  for (let k = 0; k <= 80; k++) { const u = k / 80; const x = lerp(X0, X1, u), y = lerp(Y0, Y1, fx(u)); k ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = GOLD; c.lineWidth = 3.5; c.shadowColor = GOLD; c.shadowBlur = 14; c.stroke();
  c.restore();
  if (cu > 0 && cu < 1.01) { const x = lerp(X0, X1, cu), y = lerp(Y0, Y1, fx(cu)); circle(c, x, y, 7, '#fff'); circle(c, x, y, 16, 'rgba(242,184,75,.3)'); }
  // bars: each settlement
  for (let k = 0; k < 12; k++) {
    const u = E.outBack(seg(lt, 1.0 + k * 0.3, 1.4 + k * 0.3));
    const x = X0 + 18 + k * 36, bh = 20 + fx((k + 1) / 12) * 120;
    fillRR(c, x, Y0 + 70 - bh * 0.35 * u, 20, bh * 0.35 * u, 3, 'rgba(120,150,255,.55)');
  }
  txt(c, '12 个月 · 每笔使用自动结算', X0, Y0 + 98, { font: F(500, 14, CJK), color: 'rgba(255,255,255,.5)', alpha: seg(lt, 1.2, 1.6) });
  const val = Math.floor(128600 * E.outCubic(seg(lt, 1.0, 4.8)) / 10) * 10;
  txt(c, '演员累计收益', X0, 92, { font: F(600, 16, CJK), color: 'rgba(255,255,255,.6)', alpha: seg(lt, 0.8, 1.2) });
  txt(c, `¥ ${val.toLocaleString()}`, X0, 150, { font: F(800, 54), color: '#fff', glow: 'rgba(242,184,75,.6)', glowR: 20, alpha: seg(lt, 0.8, 1.2) });
  const stats = [['使用次数', Math.floor(1284 * cu).toLocaleString()], ['版税', '10%'], ['结算', 'T+0']];
  stats.forEach(([k, v], i) => {
    const u = seg(lt, 3.0 + i * 0.2, 3.4 + i * 0.2);
    txt(c, k, X0 + i * 130, 222, { font: F(500, 13, CJK), color: 'rgba(255,255,255,.5)', alpha: u });
    txt(c, v, X0 + i * 130, 252, { font: F(800, 24), color: GOLD, alpha: u });
  });
  // link root → chart
  const lu = seg(lt, root.at + 0.2, root.at + 0.8);
  if (lu > 0) {
    c.save(); c.setLineDash([6, 6]); c.lineDashOffset = -lt * 40;
    c.strokeStyle = 'rgba(242,184,75,.7)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(root.x + 20, root.y); c.lineTo(lerp(root.x + 20, X0 - 10, lu), lerp(root.y, Y0 - 20, lu)); c.stroke(); c.restore();
  }
}

/* ───────────────────────── intro / hook / outro ───────────────────────── */
const DOTS = (() => {
  const r = rng(7), out = [];
  for (let gx = 0; gx < 17; gx++) for (let gy = 0; gy < 10; gy++) out.push({ sx: r() * W, sy: r() * H, tx: 80 + gx * 110, ty: 45 + gy * 110, d: r() });
  return out;
})();
function lattice(t, a) {
  const u = E.inOutCubic(seg(t, 0.1, 2.0));
  for (const p of DOTS) {
    const x = lerp(p.sx, p.tx, u) + Math.sin(t * 0.8 + p.d * 9) * 6 * (1 - u);
    const y = lerp(p.sy, p.ty, u) + Math.cos(t * 0.7 + p.d * 7) * 6 * (1 - u);
    const tw2 = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.5 + p.d * 20));
    circle(ctx, x, y, 1.8 + p.d * 1.4, `rgba(150,190,255,${tw2 * a})`);
  }
  if (u > 0.7) {
    ctx.save(); ctx.globalAlpha = (u - 0.7) / 0.3 * a * 0.16; ctx.strokeStyle = '#8fb4ff'; ctx.lineWidth = 1;
    for (let gx = 0; gx < 17; gx++) { ctx.beginPath(); ctx.moveTo(80 + gx * 110, 45); ctx.lineTo(80 + gx * 110, 45 + 9 * 110); ctx.stroke(); }
    for (let gy = 0; gy < 10; gy++) { ctx.beginPath(); ctx.moveTo(80, 45 + gy * 110); ctx.lineTo(80 + 16 * 110, 45 + gy * 110); ctx.stroke(); }
    ctx.restore();
  }
}
function logoSweep(x, y, w, reveal, sweepU, bright = 1.25) {
  const h = w * 475 / 2000;
  const s = SWEEP.getContext('2d');
  s.clearRect(0, 0, SWEEP.width, SWEEP.height);
  s.filter = `brightness(${bright}) saturate(1.15)`;
  s.drawImage(LOGO, 0, 0, SWEEP.width, SWEEP.height);
  s.filter = 'none';
  if (sweepU > 0 && sweepU < 1) {
    s.globalCompositeOperation = 'source-atop';
    const sx = lerp(-400, SWEEP.width + 400, sweepU);
    const g = s.createLinearGradient(sx - 220, 0, sx + 220, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, SWEEP.width, SWEEP.height);
    s.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 20, y - 40, (w + 40) * reveal, h + 80); ctx.clip();
  ctx.drawImage(SWEEP, x, y, w, h);
  ctx.restore();
  if (reveal > 0 && reveal < 1) {
    const ex = x - 20 + (w + 40) * reveal;
    const g = ctx.createLinearGradient(ex - 60, 0, ex + 6, 0);
    g.addColorStop(0, 'rgba(140,190,255,0)'); g.addColorStop(1, 'rgba(200,230,255,.9)');
    ctx.fillStyle = g; ctx.fillRect(ex - 60, y - 30, 66, h + 60);
  }
}
function intro(t) {
  if (t >= 6.05) return;
  const out = E.inExpo(seg(t, 5.3, 6.0));
  ctx.save();
  ctx.translate(W / 2, H / 2); const s = 1 + out * 0.35; ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = 1 - out;
  lattice(t, 1);
  // backlight
  const bl = seg(t, 1.6, 2.6);
  let g = ctx.createRadialGradient(W / 2, 430, 0, W / 2, 430, 760);
  g.addColorStop(0, `rgba(120,170,255,${0.32 * bl})`); g.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const LW = 1040, LX = (W - LW) / 2, LY = 300;
  // white plate so the logo keeps its true colours
  const pl = E.outExpo(seg(t, 1.7, 2.5));
  ctx.save(); ctx.globalAlpha *= pl;
  ctx.shadowColor = 'rgba(40,90,220,.55)'; ctx.shadowBlur = 80;
  fillRR(ctx, LX - 70, LY - 64 + (1 - pl) * 30, LW + 140, LW * 475 / 2000 + 128, 28, 'rgba(250,252,255,.97)');
  ctx.restore();
  logoSweep(LX, LY + (1 - pl) * 30, LW, E.inOutCubic(seg(t, 1.9, 2.9)), seg(t, 3.0, 4.2), 1.0);
  // MIME 米麦
  const m = E.outExpo(seg(t, 2.9, 3.5));
  const tag = '米麦  ·  MIME TECH  ·  密数科技';
  txt(ctx, tag, W / 2, 680 + (1 - m) * 20, { font: F(700, 26, CJK), align: 'center', alpha: m, ls: 6, color: '#dce8ff' });
  // slogan
  const sl = '密码保护资产  数学生长价值';
  ctx.font = F(900, 62, CJK); ctx.letterSpacing = '10px';
  const sw = ctx.measureText(sl).width; let x = W / 2 - sw / 2;
  [...sl].forEach((ch, i) => {
    const u = E.outCubic(seg(t, 3.5 + i * 0.07, 3.9 + i * 0.07));
    txt(ctx, ch, x, 790 + (1 - u) * 30, { font: F(900, 62, CJK), alpha: u, ls: 10, glow: 'rgba(90,150,255,.6)', glowR: 22 });
    ctx.font = F(900, 62, CJK); ctx.letterSpacing = '10px'; x += ctx.measureText(ch).width;
  });
  txt(ctx, 'CRYPTOGRAPHY PROTECTS ASSETS  ·  MATHEMATICS GROWS VALUE', W / 2, 846, { font: F(600, 16), align: 'center', ls: 6, color: 'rgba(200,215,255,.7)', alpha: seg(t, 4.3, 4.8) });
  ctx.restore();
}
const HOOK = [
  { a: 6.0, zh: '一张脸', en: 'A FACE', bg: '#2a3cf2', fg: '#fff', icon: 'face' },
  { a: 6.75, zh: '一段声音', en: 'A VOICE', bg: '#0b0d18', fg: '#fff', icon: 'voice' },
  { a: 7.5, zh: '一个虚拟形象', en: 'A DIGITAL AVATAR', bg: '#19e3a6', fg: '#0b0d18', icon: 'avatar' },
  { a: 8.25, zh: '都是你的资产', en: 'ALL OF THEM ARE YOUR ASSETS', bg: '#f4efe4', fg: '#0b0d18', icon: 'key' },
];
function hook(t) {
  if (t < 6.0 || t >= 9.0) return;
  let k = 0; for (let i = 0; i < HOOK.length; i++) if (t >= HOOK[i].a) k = i;
  const it = HOOK[k], lt = t - it.a;
  const prev = k > 0 ? HOOK[k - 1].bg : null;
  if (prev) { ctx.fillStyle = prev; ctx.fillRect(0, 0, W, H); }
  const wu = E.outExpo(seg(lt, 0, 0.22));
  ctx.fillStyle = it.bg; ctx.fillRect(0, H * (1 - wu), W, H * wu);
  if (k === 0) { ctx.globalAlpha = 1; }
  const p = E.outExpo(seg(lt, 0.04, 0.4)), s = lerp(1.18, 1, p);
  const exitU = k === 3 ? E.inExpo(seg(t, 8.7, 9.0)) : 0;
  ctx.save(); ctx.translate(W / 2, H / 2 + 40); ctx.scale(s * (1 - exitU * 0.2), s * (1 - exitU * 0.2)); ctx.globalAlpha = p * (1 - exitU);
  const big = k === 3 ? 170 : 190;
  txt(ctx, it.zh, 0, 60, { font: F(900, big, CJK), align: 'center', color: it.fg, ls: 8 });
  txt(ctx, it.en, 0, 140, { font: F(700, 22), align: 'center', color: it.fg, ls: 10, alpha: 0.7 });
  // icon
  ctx.translate(0, -200);
  const col = it.fg, ic = E.outBack(seg(lt, 0.08, 0.45));
  ctx.scale(ic, ic);
  if (it.icon === 'face') { ring(ctx, 0, 0, 58, col, 6); circle(ctx, -20, -8, 7, col); circle(ctx, 20, -8, 7, col); ring(ctx, 0, 8, 26, col, 6, 0.25 * Math.PI, 0.75 * Math.PI); }
  if (it.icon === 'voice') for (let i = 0; i < 9; i++) { const hh = 20 + 70 * Math.abs(Math.sin(t * 9 + i * 0.9)); fillRR(ctx, -100 + i * 24, -hh / 2, 12, hh, 6, i === 4 ? '#19e3a6' : col); }
  if (it.icon === 'avatar') {
    ctx.save(); ctx.rotate(t * 1.4); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3; i ? ctx.lineTo(Math.cos(a) * 62, Math.sin(a) * 62) : ctx.moveTo(62, 0); } ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i < 6; i += 2) { const a = i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); } ctx.stroke(); ctx.restore();
  }
  if (it.icon === 'key') keyIcon(ctx, -30, 0, 0.9, '#ffc934', '#0b0d18', 5);
  ctx.restore();
  // beat bars
  ctx.fillStyle = it.fg; ctx.globalAlpha = 0.5 * (1 - exitU);
  txt(ctx, `0${k + 1} / 04`, 80, H - 70, { font: F(600, 18, MONO), color: it.fg, alpha: 0.6 });
  txt(ctx, '米麦 MIME TECH', W - 80, H - 70, { font: F(700, 18, CJK), color: it.fg, alpha: 0.6, align: 'right', ls: 2 });
  ctx.globalAlpha = 1;
}
function outro(t) {
  if (t < 54.9) return;
  const a = seg(t, 55.0, 55.6);
  const LW = 980, LX = (W - LW) / 2, LY = 250;
  const pl = E.outExpo(seg(t, 55.0, 55.8));
  ctx.save(); ctx.globalAlpha = pl;
  ctx.shadowColor = 'rgba(40,90,220,.6)'; ctx.shadowBlur = 100;
  fillRR(ctx, LX - 64, LY - 60 + (1 - pl) * 40, LW + 128, LW * 475 / 2000 + 120, 28, 'rgba(250,252,255,.97)');
  ctx.restore();
  logoSweep(LX, LY + (1 - pl) * 40, LW, E.inOutCubic(seg(t, 55.1, 55.9)), seg(t, 56.2, 57.4), 1.0);
  const m = E.outExpo(seg(t, 55.7, 56.3));
  txt(ctx, '米麦  ·  MIME TECH', W / 2, 600 + (1 - m) * 16, { font: F(700, 30, CJK), align: 'center', alpha: m, ls: 8, color: '#dce8ff' });
  const sU = E.outExpo(seg(t, 56.2, 57.0));
  ctx.save(); ctx.globalAlpha = sU;
  ctx.font = F(900, 74, CJK); ctx.letterSpacing = '12px'; ctx.textAlign = 'center';
  const g = ctx.createLinearGradient(W / 2 - 520, 0, W / 2 + 520, 0);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfe0ff'); g.addColorStop(1, '#8fb6ff');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(80,140,255,.6)'; ctx.shadowBlur = 30;
  ctx.fillText('密码保护资产  数学生长价值', W / 2, 730 + (1 - sU) * 24);
  ctx.restore();
  txt(ctx, 'CRYPTOGRAPHY PROTECTS ASSETS  ·  MATHEMATICS GROWS VALUE', W / 2, 790, { font: F(600, 18), align: 'center', ls: 6, color: 'rgba(200,215,255,.75)', alpha: seg(t, 56.8, 57.4) });
  line(ctx, W / 2 - 60, 840, W / 2 + 60, 840, `rgba(255,255,255,${0.3 * seg(t, 57, 57.5)})`, 1);
  txt(ctx, '让每一张脸、每一段声音，都只为它的主人工作。', W / 2, 890, { font: F(500, 22, CJK), align: 'center', ls: 3, color: 'rgba(235,240,255,.85)', alpha: seg(t, 57.2, 57.8) });
  txt(ctx, '演示画面 · 平台部分能力（可信执行环境 / 实名认证 / 支付）目前为原型模拟实现', W / 2, H - 46, { font: F(400, 13, CJK), align: 'center', color: 'rgba(255,255,255,.38)', ls: 1, alpha: seg(t, 57.5, 58) });
  const end = seg(t, 59.3, 60);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
}
/* transition light band */
const CUTS = [9, 19, 29, 39, 49, 55];
function cutFlash(t) {
  for (const c of CUTS) {
    const u = seg(t, c - 0.25, c + 0.3);
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
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  background(t);
  intro(t);
  hook(t);
  for (const ch of CHAPTERS) drawChapter(ch, t);
  outro(t);
  chrome(t);
  subtitles(t);
  cutFlash(t);
  grain(t);
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
    const f = new FontFace(fam, `url(fonts/${file})`, { weight: String(wt) });
    await f.load(); document.fonts.add(f);
  }));
  LOGO = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/logo.png'; });
  GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 512;
  const g = GRAIN.getContext('2d'), id = g.createImageData(512, 512), r = rng(3);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  AUR = document.createElement('canvas'); AUR.width = CW; AUR.height = CHH;
  SWEEP = document.createElement('canvas'); SWEEP.width = 2000; SWEEP.height = 475;
  window.READY = true;
}
window.render = render; window.boot = boot; window.DUR = DUR; window.FPS = FPS;
