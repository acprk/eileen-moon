/* 米麦 MIME TECH 宣传片 v6 — 密数科学研究院 出品 · 产品说明书
 * Built on v5 (film.js, loaded first); this overlay replaces only what changes. Direction: an Apple-keynote-style
 * product manual — a black stage with one lit hero and its floor reflection, eyebrow + headline + grey subhead
 * typography, thin spec callouts during the camera push-ins, an opening "presented by" card and a closing credit.
 * Function declarations here override film.js's by name (background, chapterBg, chrome, drawChapter, drawCard3D).
 */
window.FACE_HI = true;   // the portrait draws with its extra detail layer

const V6 = { grey: '#86868b', grey2: '#a1a1a6', white: '#f5f5f7', line: 'rgba(255,255,255,.14)' };
const V6_CH = {   // manual copy per chapter: headline sub-lines (the eyebrow is generated)
  1: ['在你的设备上加密，', '只有你能解锁。'],
  2: ['卖的是使用权，', '所有权永远归你。'],
  3: ['每一次使用，', '都要你亲自点头。'],
  4: ['钥匙只在你手里，', '随时收回。'],
  5: ['每次使用都记在账上，', '收益自动到账。'],
};
// spec callouts shown while the camera is pushed in: [chapter, from, to, [[label, sub], ...]]
const V6_SPECS = [
  [1, 1.75, 2.75, [['28 个面部关键点', '本地识别'], ['全程在本机完成', '不经过服务器'], ['原图从不上传', '只上传密文']]],
  [1, 4.25, 5.0, [['加密保管', '只有你的钥匙能打开'], ['密文存储', '平台也看不到']]],
  [2, 2.85, 5.2, [['使用权 · 按次计价', '¥2,000 / 次'], ['所有权', '永远归你']]],
  [3, 2.45, 4.9, [['推送到你的手机', '次数 · 期限 · 报酬'], ['你点同意', '才会放行']]],
  [4, 3.55, 5.1, [['一键撤销', '立即停止交付'], ['授权记录', '实时可查']]],
];

/* ───────────────────────── stage: black, one soft light, a floor ───────────────────────── */
function background(t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const ch = CHAPTERS.find(c => t >= c.a - 0.4 && t < c.b + 0.4);
  if (ch) {
    const acc = hex(ch.acc), cx = ch.side === 'L' ? 1260 : 660;
    glowDisc(ctx, cx, 470, 1000, mix(acc, [255, 255, 255], 0.2), 0.16);
    glowDisc(ctx, cx, 860, 700, [255, 255, 255], 0.05);
  }
}
function chapterBg(t) {
  const a = seg(t, 10.8, 11.6) * (1 - seg(t, 52.6, 53.2));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  // a polished floor: a faint horizon and a reflective falloff
  const hy = 880;
  const g = ctx.createLinearGradient(0, hy - 2, 0, H); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(0.04, 'rgba(255,255,255,.015)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  const hl = ctx.createLinearGradient(0, 0, W, 0); hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,.12)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; ctx.fillRect(0, hy, W, 1);
  // very sparse dust in the light
  const r = rng(61);
  for (let i = 0; i < 40; i++) {
    const x = (r() * W + t * (6 + r() * 10)) % W, y = 120 + r() * 700, tw2 = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.4 + r()) + i));
    circle(ctx, x, y, 0.8 + r() * 1.2, `rgba(255,255,255,${0.12 * tw2})`);
  }
  ctx.restore();
}

/* ───────────────────────── chrome: presented by · manual header · closing credit ───────────────────────── */
function chrome(t) {
  // opening card: 密数科学研究院 出品 (over the first seconds of the museum)
  const pc = 1 - seg(t, 1.25, 1.85);
  if (pc > 0) {
    ctx.save(); ctx.globalAlpha = pc; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const u = cmStep(t - 0.15, 8, 0.95) * pc;
    ctx.save(); ctx.globalAlpha = clamp(u);
    mark(ctx, W / 2 - 34, 430, 40);
    txt(ctx, '密数科学研究院  出品', W / 2, 540, { font: F(500, 34, CJK), align: 'center', ls: 14, color: V6.white });
    txt(ctx, 'PRESENTED BY MISHU RESEARCH INSTITUTE', W / 2, 586, { font: F(500, 15), align: 'center', ls: 6, color: V6.grey });
    ctx.restore();
  }
  // manual header during the chapters
  const a = seg(t, 11.0, 11.6) * (1 - seg(t, 52.6, 53.2));
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a;
    mark(ctx, 64, 44, 28);
    txt(ctx, '米麦 MIME TECH', 120, 66, { font: F(600, 17, CJK), color: V6.white, ls: 1 });
    line(ctx, 262, 50, 262, 72, V6.line, 1);
    txt(ctx, '产品说明书', 278, 66, { font: F(500, 17, CJK), color: V6.grey, ls: 2 });
    txt(ctx, '密数科学研究院 出品', W - 64, 66, { font: F(500, 16, CJK), color: V6.grey, ls: 2, align: 'right' });
    const ch = CHAPTERS.find(c => t >= c.a && t < c.b);
    if (ch) txt(ctx, `${String(ch.n).padStart(2, '0')} / 05`, W - 64, H - 46, { font: F(500, 16, MONO), color: V6.grey, align: 'right' });
    ctx.restore();
  }
  // credit line under the logo (covers the film's small footnote and restates it)
  const cr = seg(t, 56.4, 57.2);
  if (cr > 0 && t < 58.7) {
    ctx.save(); ctx.globalAlpha = cr;
    const g = ctx.createLinearGradient(0, 1022, 0, 1040); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.fillRect(0, 1022, W, 18); ctx.fillStyle = '#000'; ctx.fillRect(0, 1040, W, 40);
    txt(ctx, '密数科学研究院 出品  ·  密数科技（北京）有限公司', W / 2, 1052, { font: F(600, 18, CJK), align: 'center', ls: 4, color: V6.white });
    txt(ctx, '演示画面 · 部分能力为原型模拟实现', W / 2, 1072, { font: F(400, 12, CJK), align: 'center', ls: 1, color: V6.grey });
    ctx.restore();
  }
  // closing card, the bookend of the opening one
  const cc = seg(t, 58.6, 59.0);
  if (cc > 0) {
    ctx.save(); ctx.globalAlpha = cc; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const u = cmStep(t - 58.8, 8, 0.95) * (1 - seg(t, 59.75, 60));
    ctx.save(); ctx.globalAlpha = clamp(u);
    mark(ctx, W / 2 - 34, 410, 40);
    txt(ctx, '密数科学研究院  出品', W / 2, 520, { font: F(500, 34, CJK), align: 'center', ls: 14, color: V6.white });
    txt(ctx, '密数科技（北京）有限公司  ·  mimuseai.com', W / 2, 572, { font: F(500, 17, CJK), align: 'center', ls: 4, color: V6.grey });
    ctx.restore();
  }
}

/* ───────────────────────── 3D card with a floor reflection and an edge highlight ───────────────────────── */
function drawCard3D(img, cw, hc, px, py, zoom, fx, fy, rotY, rotZ, alpha) {
  const w = cw, h = img.height, f = 1700, N = 60, sw = w / N;
  const cs = Math.cos(rotY), sn = Math.sin(rotY);
  if (cs <= 0.03 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(px, py); ctx.rotate(rotZ); ctx.scale(zoom, zoom);
  ctx.translate(w / 2 - fx, h / 2 - fy);
  const P = (x) => { const s = f / (f + x * sn); return [x * cs * s, s]; };
  const [lx, ls] = P(-w / 2), [rx, rs] = P(w / 2);
  const top = -h / 2, bot = -h / 2 + hc;
  const quad = () => { ctx.beginPath(); ctx.moveTo(lx, top * ls); ctx.lineTo(rx, top * rs); ctx.lineTo(rx, bot * rs); ctx.lineTo(lx, bot * ls); ctx.closePath(); };
  // reflection on the floor: the lower part of the card, mirrored about its bottom edge, fading out
  ctx.save(); ctx.globalAlpha *= 0.16;
  for (let i = 0; i < N; i++) {
    const x0 = -w / 2 + i * sw, x1 = x0 + sw;
    const [X0, s0] = P(x0), [X1, s1] = P(x1), s = (s0 + s1) / 2, yb = bot * s;
    ctx.save(); ctx.translate(0, 2 * yb + 8); ctx.scale(1, -1);
    ctx.drawImage(img, i * sw, hc * 0.55, sw, hc * 0.45, X0, yb - hc * 0.45 * s, X1 - X0 + 0.9, hc * 0.45 * s);
    ctx.restore();
  }
  ctx.restore();
  const yb0 = bot * Math.min(ls, rs);
  const fade = ctx.createLinearGradient(0, yb0, 0, yb0 + hc * 0.45);
  fade.addColorStop(0, 'rgba(0,0,0,.35)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade; ctx.fillRect(Math.min(lx, rx) - 4, yb0 + 4, Math.abs(rx - lx) + 8, hc * 0.48);
  // the card
  ctx.save(); quad(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30; ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fill(); ctx.restore();
  for (let i = 0; i < N; i++) {
    const x0 = -w / 2 + i * sw, x1 = x0 + sw;
    const [X0, s0] = P(x0), [X1, s1] = P(x1);
    const s = (s0 + s1) / 2;
    ctx.drawImage(img, i * sw, 0, sw, hc, X0, -h / 2 * s, X1 - X0 + 0.9, hc * s);
  }
  // glass edge: a bright hairline along the top, a sheen on the edge that faces the light
  const g = ctx.createLinearGradient(lx, 0, rx, 0);
  g.addColorStop(0, `rgba(255,255,255,${Math.max(0, -sn) * 0.14})`); g.addColorStop(1, `rgba(255,255,255,${Math.max(0, sn) * 0.14})`);
  quad(); ctx.fillStyle = g; ctx.fill();
  const eg = ctx.createLinearGradient(lx, 0, rx, 0); eg.addColorStop(0, 'rgba(255,255,255,.1)'); eg.addColorStop(0.5, 'rgba(255,255,255,.55)'); eg.addColorStop(1, 'rgba(255,255,255,.1)');
  ctx.beginPath(); ctx.moveTo(lx + 20, top * ls + 0.5); ctx.lineTo(rx - 20, top * rs + 0.5); ctx.strokeStyle = eg; ctx.lineWidth = 1.4; ctx.stroke();
  quad(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

/* ───────────────────────── chapter: manual page (eyebrow · headline · subhead · steps) ───────────────────────── */
function drawChapter(ch, t) {
  const lt = t - ch.a, dur = ch.b - ch.a;
  if (lt < 0 || lt > dur) return;
  const slt = lt * ch.len / dur;
  const inU = E.outExpo(seg(lt, 0, 0.9)), outU = E.inCubic(seg(lt, dur - 0.5, dur));
  const L = ch.side === 'L', cardX0 = L ? 690 : 90, textX = L ? 120 : 1300, sgn = L ? 1 : -1;
  const sc = STAGE.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, STAGE.width, STAGE.height);
  sc.save(); rr(sc, 0, 0, CW, CHH, 24); sc.clip(); ch.stage(sc, slt, CW, CHH, ch); sc.restore();
  const [zoom, fx, fy] = camAt(ch.n, lt);
  const zu = clamp((zoom - 1) / 0.55);
  const rotY = sgn * (lerp(1.35, 0.2, inU) - 0.12 * seg(lt, 0.9, dur - 0.5)) * (1 - 0.8 * zu) + sgn * 1.45 * outU;
  const rotZ = sgn * ((1 - inU) * 0.04 + Math.sin(lt * 0.7) * 0.004);
  const px = lerp(cardX0 + fx, W / 2 + sgn * 60, zu) + sgn * (1 - inU) * 120 + sgn * outU * 160;
  const py = lerp(CY + fy, H / 2 - 30, zu) + Math.sin(lt * 0.9) * 3;
  drawCard3D(STAGE, CW, CHH, px, py, zoom * lerp(0.86, 1, inU) * lerp(1, 0.9, outU), fx, fy, rotY, rotZ, clamp(inU * 1.6) * (1 - outU * 0.6));
  const tf = clamp(1 - zu * 3.2);
  const el = (d) => { const u = cmStep(lt - d, 10, 0.9); return { a: clamp(u) * (1 - outU) * tf, y: (1 - clamp(u)) * 24 - outU * 14 }; };
  const acc = ch.acc;
  // eyebrow
  let e = el(0.15);
  txt(ctx, `使用说明 · 第 ${String(ch.n).padStart(2, '0')} 步`, textX, 268 + e.y, { font: F(600, 21, CJK), color: acc, alpha: e.a, ls: 2 });
  // headline: large, tight, a soft white-to-silver gradient
  e = el(0.24);
  ctx.save(); ctx.globalAlpha = e.a; ctx.font = F(700, ch.title.length > 4 ? 76 : 88, CJK); ctx.letterSpacing = '0px';
  const hg = ctx.createLinearGradient(0, 270, 0, 370); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#c7c7cc'); ctx.fillStyle = hg;
  ctx.fillText(ch.title, textX - 3, 366 + e.y); ctx.restore();
  // subhead in Apple grey, two lines
  V6_CH[ch.n].forEach((s, i) => { const q = el(0.34 + i * 0.08); txt(ctx, s, textX, 436 + i * 46 + q.y, { font: F(600, 30, CJK), color: i === 1 ? V6.white : V6.grey2, alpha: q.a }); });
  // steps: a quiet numbered list with hairlines, the current one lit
  const cur = ch.steps.reduce((k, s, i) => (slt >= s[1] ? i : k), 0);
  ch.steps.forEach(([s, at], i) => {
    const q = el(0.55 + i * 0.06), y = 584 + i * 58 + q.y, on = slt >= at, act = i === cur;
    ctx.save(); ctx.globalAlpha = q.a;
    line(ctx, textX, y - 34, textX + 420, y - 34, V6.line, 1);
    ctx.restore();
    txt(ctx, String(i + 1).padStart(2, '0'), textX, y, { font: F(500, 17, MONO), color: act ? acc : on ? V6.grey2 : 'rgba(134,134,139,.5)', alpha: q.a });
    txt(ctx, s, textX + 56, y, { font: F(act ? 700 : 500, 22, CJK), color: act ? V6.white : on ? V6.grey2 : 'rgba(134,134,139,.6)', alpha: q.a });
    if (on && !act) check(ctx, textX + 410, y - 7, 0.6, V6.grey2, 2.2);
    if (act) { ctx.save(); ctx.globalAlpha = q.a; circle(ctx, textX + 410, y - 7, 5, acc); ring(ctx, textX + 410, y - 7, 9 + 2 * Math.sin(lt * 5), rgb(hex(acc), 0.5), 1.5); ctx.restore(); }
  });
}

/* ───────────────────────── spec callouts during push-ins ───────────────────────── */
window.afterChapters = function (t) {
  for (const [n, a, b, specs] of V6_SPECS) {
    const ch = CHAPTERS.find(c => c.n === n), lt = t - ch.a;
    if (lt < a || lt > b) continue;
    const L = ch.side === 'L', sgn = L ? 1 : -1;
    const fx = W / 2 + sgn * 60, fy = H / 2 - 30;           // where the camera puts the focal point
    const out = 1 - seg(lt, b - 0.3, b);
    specs.forEach(([label, sub], i) => {
      const u = cmStep(lt - a - 0.15 - i * 0.18, 12, 0.9) * out;
      if (u <= 0) return;
      // anchor near the hero, label out on the free side (where the text block was)
      const ax = fx - sgn * (150 + i * 30), ay = fy - 150 + i * 170;
      const lx = L ? 150 : W - 150, ly = 330 + i * 190;
      const ex = lerp(ax, lx + (L ? 360 : -360), clamp(u));
      ctx.save(); ctx.globalAlpha = clamp(u);
      circle(ctx, ax, ay, 4, '#fff'); ring(ctx, ax, ay, 9, 'rgba(255,255,255,.5)', 1);
      line(ctx, ax, ay, ex, ly, 'rgba(255,255,255,.55)', 1);
      line(ctx, ex, ly, lx + (L ? 0 : 0), ly, 'rgba(255,255,255,.55)', 1);
      txt(ctx, label, lx, ly - 14, { font: F(700, 30, CJK), color: V6.white, align: L ? 'left' : 'right' });
      txt(ctx, sub, lx, ly + 30, { font: F(500, 20, CJK), color: V6.grey, align: L ? 'left' : 'right' });
      ctx.restore();
    });
  }
};
