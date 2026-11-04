/* 米麦集市 MIME BAZAAR — 商业版（60 s, 1920×1080, 30 fps + motion blur, 120 BPM）
 * Direction (see ../REFERENCES.md, refs 1/2/5/8):
 *  · restraint: near-black surfaces, ONE precious accent (gold), no chrome on screen, short copy only
 *  · one shape, never cut: a single element morphs through every product state, driven by a cursor, on the beat
 *  · story: WHY (your face/voice/experience/work are value) → PAIN (copied, used, ¥0) → FIX (open · list · sell,
 *    escrow, your yes) → WHAT YOU GET (settlement climax: charge → burst → reveal → coins into the balance) →
 *    everyone can open a shop → logo + line + URL
 * Loaded after ../mishu/film.js (txt, fillRR, rr, circle, ring, line, glowDisc, E, seg, lerp, clamp, hash, rng, rgb,
 * hex, mix, F, CJK, MONO, frontFace, plateIcon, drawLogo, mark, coin, check, lockIcon, grain). Names here start with cm/CM.
 */
// palette (CM) and motion primitives (cmStep, cmSpr, cmCol, cmType, cmGoldFill, cmCoin, cmCursor, cmRipple)
// live in ../lib/cmkit.js, shared with the MiShu commercial cut.

/* ───────────────────────── the one shape: state track ───────────────────────── */
// [time, cx, cy, w, h, radius, fill, content, snap]
const CM_S = [
  [0.0, 1300, 540, 2, 2, 1, '#e8b84b', 'glint'],
  [0.8, 1320, 560, 420, 520, 44, '#151a29', 'face'],
  [1.8, 1320, 560, 560, 280, 140, '#151a29', 'voice'],
  [2.8, 1320, 560, 440, 440, 54, '#151a29', 'exp'],
  [3.8, 1320, 560, 580, 400, 28, '#151a29', 'art'],
  [4.8, 1320, 560, 460, 160, 80, '#e8b84b', 'price'],
  [8.0, 1320, 560, 420, 520, 44, '#14161d', 'faceGrey'],
  [14.2, 960, 640, 380, 100, 50, '#e8b84b', 'open'],
  [16.5, 960, 560, 760, 120, 30, '#151a29', 'name'],
  [18.0, 960, 540, 660, 360, 32, '#151a29', 'shop'],
  [19.5, 960, 540, 780, 440, 32, '#151a29', 'upload'],
  [21.0, 960, 540, 780, 460, 32, '#151a29', 'product'],
  [23.0, 960, 540, 780, 220, 32, '#151a29', 'license'],
  [24.0, 960, 560, 300, 96, 48, '#e8b84b', 'list'],
  [24.6, 960, 540, 250, 300, 22, '#151a29', 'cell'],
  [26.0, 960, 150, 760, 88, 44, '#151a29', 'search'],
  [27.8, 960, 540, 250, 300, 22, '#151a29', 'cell', true],
  [27.85, 960, 540, 780, 520, 32, '#151a29', 'detail'],
  [29.0, 960, 520, 560, 110, 55, '#0b0d14', 'escrow'],
  [30.5, 960, 540, 600, 320, 32, '#151a29', 'approve'],
  [32.0, 960, 540, 150, 150, 75, '#151a29', 'deliver'],
  [33.6, 960, 540, 200, 200, 100, '#e8b84b', 'coin'],
  [34.0, 960, 540, 0, 0, 0, '#e8b84b', 'none', true],   // the climax takes the coin from here
];
function cmShape(t) {
  let k = 0; for (let i = 0; i < CM_S.length; i++) if (t >= CM_S[i][0]) k = i;
  const key = (j) => CM_S.map(s => [s[0], s[j], s[8]]);
  return {
    x: cmSpr(t, key(1)), y: cmSpr(t, key(2)), w: Math.max(0, cmSpr(t, key(3))), h: Math.max(0, cmSpr(t, key(4))), r: Math.max(0, cmSpr(t, key(5))),
    col: cmCol(CM_S.map(s => [s[0], s[6]]), t), k, content: CM_S[k][7], t0: CM_S[k][0], t1: k + 1 < CM_S.length ? CM_S[k + 1][0] : 99,
  };
}
// content enters after its container starts morphing and leaves before the next morph
const cmIn = (S, t) => clamp((t - S.t0 - 0.1) / 0.22) * (1 - clamp((t - (S.t1 - 0.16)) / 0.14));

const CM_CUR = [ // cursor: [t, x, y]  (only during the product section)
  [15.0, 1500, 900], [15.8, 975, 650], [17.6, 975, 650], [18.4, 1080, 660], [19.6, 1500, 300], [20.4, 1010, 560], [21.15, 986, 610],
  [21.6, 986, 610], [22.6, 1125, 610], [23.2, 1265, 584], [23.8, 960, 566], [25.0, 1400, 860], [27.2, 960, 560], [28.3, 960, 600],
  [28.7, 1202, 686], [30.6, 1300, 860], [31.1, 1098, 638], [33.0, 1500, 900],
];
const CM_CLICK = [16.0, 18.6, 21.6, 23.5, 24.0, 27.6, 28.9, 31.4];
const CM_DRAG = [[21.6, 22.6]];

function cmBackdrop(t, S) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, CM.bg0); g.addColorStop(1, CM.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // one warm light behind whatever is the hero
  const pain = seg(t, 7.6, 8.4) * (1 - seg(t, 13.8, 14.6));
  glowDisc(ctx, S ? S.x : W / 2, S ? S.y : H / 2, 900, [232, 184, 75], 0.10 * (1 - pain * 0.8));
  glowDisc(ctx, W * 0.15, H * 0.1, 900, [60, 80, 160], 0.10);
  // a faint dotted field gives depth without noise
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let x = 48; x < W; x += 48) for (let y = 48; y < H; y += 48) { const d = Math.hypot(x - W / 2, y - H / 2) / 1100; circle(ctx, x, y, 1.1, `rgba(180,190,230,${0.08 * (1 - d)})`); }
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/* ───────────────────────── contents of the shape ───────────────────────── */
function cmContent(S, t) {
  const a = cmIn(S, t);
  if (a <= 0 || S.w < 4) return;
  const c = ctx, w = S.w, h = S.h;
  c.save(); c.globalAlpha *= a; c.translate(0, (1 - a) * 10);
  switch (S.content) {
    case 'glint': break;
    case 'face': case 'faceGrey': {
      c.save(); rr(c, -w / 2, -h / 2, w, h, S.r); c.clip();
      const bg = c.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, S.content === 'face' ? '#1c2440' : '#1a1c22'); bg.addColorStop(1, '#0c0f18');
      c.fillStyle = bg; c.fillRect(-w / 2, -h / 2, w, h);
      if (S.content === 'faceGrey') c.filter = 'grayscale(1) brightness(.62)';
      frontFace(c, 0, h * 0.13, h / 640, t);
      c.filter = 'none';
      c.restore();
      txt(c, S.content === 'face' ? '肖像' : '肖像 · 未授权', -w / 2 + 24, h / 2 - 22, { font: F(700, 16, CJK), color: S.content === 'face' ? CM.goldHi : CM.sub, ls: 2 });
      break;
    }
    case 'voice':
      for (let i = 0; i < 17; i++) { const hh = 18 + 110 * Math.abs(Math.sin(t * 8 + i * 0.7)) * (1 - Math.abs(i - 8) / 10); fillRR(c, -152 + i * 19, -hh / 2, 9, hh, 4.5, i === 8 ? CM.goldHi : 'rgba(236,238,245,.85)'); }
      txt(c, '声音', 0, h / 2 - 22, { font: F(700, 16, CJK), color: CM.goldHi, ls: 2, align: 'center' });
      break;
    case 'exp':
      plateIcon(c, 'exp', 0, -10, 0.62, t, 'rgba(236,238,245,.9)');
      txt(c, '经验', -w / 2 + 24, h / 2 - 22, { font: F(700, 16, CJK), color: CM.goldHi, ls: 2 });
      break;
    case 'art': {
      c.strokeStyle = 'rgba(236,238,245,.9)'; c.lineWidth = 3; c.lineJoin = 'round';
      c.strokeRect(-150, -96, 300, 192);
      c.beginPath(); c.moveTo(-150, 96); c.lineTo(-60, -10); c.lineTo(0, 50); c.lineTo(60, -20); c.lineTo(150, 96); c.stroke();
      ring(c, 70, -50, 20, CM.goldHi, 3);
      txt(c, '作品', -w / 2 + 24, h / 2 - 22, { font: F(700, 16, CJK), color: CM.goldHi, ls: 2 });
      break;
    }
    case 'price': {
      const P = ['¥2,000', '¥800', '¥1,200', '¥2,600'], i = Math.min(3, Math.floor((t - 4.9) / 0.5));
      txt(c, P[Math.max(0, i)], -20, 18, { font: F(900, 52), color: CM.ink, align: 'center' });
      txt(c, '/ 次', 120, 16, { font: F(700, 22, CJK), color: 'rgba(11,13,20,.7)', align: 'center' });
      break;
    }
    case 'open':
      txt(c, '开一家店', 0, 13, { font: F(900, 36, CJK), color: CM.ink, align: 'center', ls: 6 });
      break;
    case 'name': {
      txt(c, '店铺名称', -w / 2 + 36, -14, { font: F(600, 16, CJK), color: CM.sub });
      const s = '林夏的灵感小铺', n = Math.floor(s.length * seg(t, 16.7, 17.7));
      txt(c, s.slice(0, n), -w / 2 + 36, 30, { font: F(800, 34, CJK), color: CM.text });
      c.font = F(800, 34, CJK);
      if (Math.floor(t * 3) % 2 === 0) fillRR(c, -w / 2 + 40 + c.measureText(s.slice(0, n)).width, 2, 3, 36, 1, CM.goldHi);
      break;
    }
    case 'shop': {
      c.save(); c.beginPath(); c.arc(-w / 2 + 110, -20, 62, 0, 7); c.fillStyle = '#1c2440'; c.fill(); c.clip(); frontFace(c, -w / 2 + 110, 18, 0.3, t); c.restore();
      ring(c, -w / 2 + 110, -20, 64, CM.gold, 2);
      txt(c, '林夏的灵感小铺', -w / 2 + 200, -28, { font: F(900, 34, CJK) });
      txt(c, '肖像 · 声音 · 经验', -w / 2 + 200, 10, { font: F(600, 18, CJK), color: CM.sub });
      fillRR(c, -w / 2 + 200, 36, 104, 34, 17, 'rgba(52,211,153,.14)');
      circle(c, -w / 2 + 220, 53, 5, CM.pos); txt(c, '已开张', -w / 2 + 232, 59, { font: F(700, 15, CJK), color: CM.pos });
      line(c, -w / 2 + 36, h / 2 - 70, w / 2 - 36, h / 2 - 70, CM.line, 1);
      txt(c, '收款 · 平台托管，自动结算', -w / 2 + 36, h / 2 - 32, { font: F(600, 16, CJK), color: CM.sub });
      break;
    }
    case 'upload': {
      c.save(); c.setLineDash([10, 8]); rr(c, -w / 2 + 24, -h / 2 + 24, w - 48, h - 48, 22); c.strokeStyle = 'rgba(245,208,122,.45)'; c.lineWidth = 2; c.stroke(); c.restore();
      txt(c, '拖入你的素材', 0, -h / 2 + 76, { font: F(800, 22, CJK), color: CM.sub, align: 'center' });
      const files = [['face', '正脸肖像.jpg'], ['voice', '声音样本.wav'], ['exp', '表演课程.pdf'], ['art', '数字绘画.png']];
      files.forEach(([k, n], i) => {
        const at = 19.8 + i * 0.3, u = cmStep(t - at, 13, 0.82);
        if (t < at) return;
        const fx = lerp(560, -w / 2 + 60 + i * 170, u), fy = lerp(-300, 10, u);
        c.save(); c.translate(fx, fy);
        fillRR(c, 0, 0, 150, 150, 18, CM.s3);
        rr(c, 0.5, 0.5, 149, 149, 18); c.strokeStyle = CM.line; c.stroke();
        c.save(); rr(c, 0, 0, 150, 110, 18); c.clip();
        if (k === 'face') { c.fillStyle = '#1c2440'; c.fillRect(0, 0, 150, 110); frontFace(c, 75, 82, 0.16, t); }
        else if (k === 'voice') for (let b = 0; b < 9; b++) { const hh = 10 + 40 * Math.abs(Math.sin(t * 8 + b)); fillRR(c, 30 + b * 10, 55 - hh / 2, 5, hh, 2.5, 'rgba(236,238,245,.85)'); }
        else if (k === 'exp') plateIcon(c, 'exp', 75, 55, 0.2, t, 'rgba(236,238,245,.85)');
        else { c.strokeStyle = 'rgba(236,238,245,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(25, 90); c.lineTo(60, 45); c.lineTo(85, 70); c.lineTo(110, 40); c.lineTo(130, 90); c.stroke(); }
        c.restore();
        txt(c, n, 75, 136, { font: F(600, 13, CJK), color: CM.text, align: 'center' });
        if (t > at + 0.4) { circle(c, 136, 14, 10, CM.pos); check(c, 136, 15, 0.5, CM.ink, 2.4); }
        c.restore();
      });
      break;
    }
    case 'product': {
      c.save(); rr(c, -w / 2 + 32, -h / 2 + 32, 300, h - 64, 22); c.clip(); c.fillStyle = '#1c2440'; c.fillRect(-w / 2 + 32, -h / 2 + 32, 300, h - 64); frontFace(c, -w / 2 + 182, 70, 0.4, t); c.restore();
      const X = -w / 2 + 370;
      txt(c, '正脸肖像', X, -h / 2 + 80, { font: F(900, 34, CJK) });
      txt(c, '使用权 · 按次授权', X, -h / 2 + 116, { font: F(600, 17, CJK), color: CM.sub });
      // price slider dragged by the cursor
      const dragU = E.inOutCubic(seg(t, 21.6, 22.6));
      const val = Math.round(lerp(500, 2000, dragU) / 100) * 100;
      txt(c, '单次价格', X, 10, { font: F(600, 16, CJK), color: CM.sub });
      txt(c, `¥${val.toLocaleString()}`, w / 2 - 40, 16, { font: F(800, 44, MONO), color: CM.goldHi, align: 'right' });
      const sx0 = X, sx1 = w / 2 - 40, ky = 66, kx = lerp(sx0, sx1, lerp(0.125, 0.5, dragU));
      fillRR(c, sx0, ky - 4, sx1 - sx0, 8, 4, 'rgba(255,255,255,.1)');
      fillRR(c, sx0, ky - 4, kx - sx0, 8, 4, cmGoldFill(c, sx0, 0, kx, 0));
      circle(c, kx, ky, 15, '#fff'); ring(c, kx, ky, 15, CM.gold, 3);
      txt(c, '所有权 · 永远归你', X, h / 2 - 60, { font: F(700, 17, CJK), color: CM.pos });
      break;
    }
    case 'license': {
      const rows = [['按次授权', 23.2], ['每次使用，需要你同意', 23.5]];
      rows.forEach(([s, at], i) => {
        const y = -40 + i * 80, on = cmStep(t - at, 16, 0.85);
        txt(c, s, -w / 2 + 40, y + 8, { font: F(700, 24, CJK) });
        const tx = w / 2 - 130;
        fillRR(c, tx, y - 22, 90, 44, 22, rgb(mix([40, 46, 66], hex(CM.gold), on)));
        // the knob's two edges ride different springs, so it stretches as it moves
        const lead = lerp(tx + 22, tx + 68, cmStep(t - at, 18, 0.8)), trail = lerp(tx + 22, tx + 68, cmStep(t - at - 0.05, 12, 0.85));
        fillRR(c, Math.min(lead, trail) - 17, y - 17, Math.abs(lead - trail) + 34, 34, 17, '#fff');
      });
      break;
    }
    case 'list': {
      const done = t > 24.15;
      txt(c, done ? '已上架' : '上架', done ? 22 : 0, 11, { font: F(900, 30, CJK), color: CM.ink, align: 'center', ls: 4 });
      if (done) check(c, -72, 2, 1.0, CM.ink, 4);
      break;
    }
    case 'cell': cmCard(c, 0, 0, w, h, CM_GRID_HERO, t, 1); break;
    case 'search': {
      ring(c, -w / 2 + 52, -2, 13, CM.goldHi, 3.5); line(c, -w / 2 + 62, 8, -w / 2 + 71, 17, CM.goldHi, 3.5);
      const s = '肖像', n = Math.ceil(2 * seg(t, 26.3, 26.7));
      txt(c, s.slice(0, n), -w / 2 + 92, 12, { font: F(800, 30, CJK) });
      txt(c, '搜索集市', w / 2 - 36, 10, { font: F(600, 17, CJK), color: CM.sub, align: 'right' });
      break;
    }
    case 'detail': {
      c.save(); rr(c, -w / 2, -h / 2, w, 250, S.r); c.clip(); c.fillStyle = '#1c2440'; c.fillRect(-w / 2, -h / 2, w, 250); frontFace(c, 0, -h / 2 + 170, 0.5, t); c.restore();
      txt(c, '林夏的灵感小铺', -w / 2 + 36, -h / 2 + 300, { font: F(700, 16, CJK), color: CM.sub });
      txt(c, '正脸肖像 · 使用权', -w / 2 + 36, -h / 2 + 344, { font: F(900, 32, CJK) });
      txt(c, '¥2,000', -w / 2 + 36, -h / 2 + 420, { font: F(800, 56, MONO), color: CM.goldHi });
      txt(c, '/ 次', -w / 2 + 250, -h / 2 + 420, { font: F(600, 20, CJK), color: CM.sub });
      const pressed = t > 28.9;
      fillRR(c, w / 2 - 260, -h / 2 + 370, 224, 64, 32, pressed ? CM.pos : cmGoldFill(c, w / 2 - 260, 0, w / 2 - 36, 0));
      txt(c, pressed ? '已下单' : '购买', w / 2 - 148, -h / 2 + 412, { font: F(900, 24, CJK), color: CM.ink, align: 'center' });
      txt(c, '星河影业 · 买家', -w / 2 + 36, h / 2 - 30, { font: F(600, 15, CJK), color: CM.sub });
      break;
    }
    case 'escrow': {
      const lk = cmStep(t - 29.35, 16, 0.6);
      lockIcon(c, -w / 2 + 62, 4 - (1 - clamp(lk)) * 8, 1.4, CM.goldHi);
      txt(c, '资金托管中', -w / 2 + 110, 13, { font: F(800, 32, CJK) });
      txt(c, '¥2,000', w / 2 - 44, 13, { font: F(800, 32, MONO), color: CM.goldHi, align: 'right' });
      circle(c, w / 2 - 190, 2, 6, `rgba(245,208,122,${0.5 + 0.5 * Math.sin(t * 8)})`);
      break;
    }
    case 'approve': {
      c.save(); c.beginPath(); c.arc(-w / 2 + 70, -h / 2 + 74, 34, 0, 7); c.fillStyle = '#1c2440'; c.fill(); c.clip(); frontFace(c, -w / 2 + 70, -h / 2 + 96, 0.17, t); c.restore();
      txt(c, '星河影业 想使用你的肖像', -w / 2 + 122, -h / 2 + 68, { font: F(800, 22, CJK) });
      txt(c, '广告短片 · 1 次 · 48 小时', -w / 2 + 122, -h / 2 + 96, { font: F(600, 16, CJK), color: CM.sub });
      txt(c, '¥2,000', w / 2 - 36, -h / 2 + 82, { font: F(800, 26, MONO), color: CM.goldHi, align: 'right' });
      const yes = cmStep(t - 31.4, 14, 0.85);
      rr(c, -w / 2 + 36, h / 2 - 96, (w - 96) / 2, 60, 30); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5; c.stroke();
      txt(c, '拒绝', -w / 2 + 36 + (w - 96) / 4, h / 2 - 57, { font: F(800, 22, CJK), align: 'center', color: CM.sub });
      fillRR(c, 12, h / 2 - 96, (w - 96) / 2, 60, 30, rgb(mix(hex(CM.gold), hex(CM.pos), clamp(yes))));
      txt(c, yes > 0.5 ? '已同意' : '同意', 12 + (w - 96) / 4 + (yes > 0.5 ? 14 : 0), h / 2 - 57, { font: F(900, 22, CJK), align: 'center', color: CM.ink });
      if (yes > 0.5) check(c, 12 + (w - 96) / 4 - 44, h / 2 - 66, 0.9, CM.ink, 3.5, clamp((yes - 0.5) * 2));
      break;
    }
    case 'deliver': {
      const done = t > 33.0;
      if (!done) { ring(c, 0, 0, 40, 'rgba(255,255,255,.12)', 6); ring(c, 0, 0, 40, CM.goldHi, 6, t * 6, t * 6 + 2.2); }
      else { circle(c, 0, 0, 44, CM.pos); check(c, 0, 2, 2.0, CM.ink, 5, seg(t, 33.0, 33.3)); }
      break;
    }
    case 'coin': break;
  }
  c.restore();
}
function cmDrawShape(t) {
  const S = cmShape(t);
  if (S.w < 1 || S.content === 'none') return S;
  ctx.save(); ctx.translate(S.x, S.y);
  // glint: the opening point of light
  if (S.content === 'glint' || t < 0.9) {
    const g = seg(t, 0.0, 0.8);
    const len = 600 * Math.sin(g * Math.PI);
    const lg = ctx.createLinearGradient(-len, 0, len, 0); lg.addColorStop(0, 'rgba(245,208,122,0)'); lg.addColorStop(0.5, `rgba(255,236,190,${0.9 * Math.sin(g * Math.PI)})`); lg.addColorStop(1, 'rgba(245,208,122,0)');
    ctx.fillStyle = lg; ctx.fillRect(-len, -1.5, 2 * len, 3);
    glowDisc(ctx, 0, 0, 80, [255, 220, 150], 0.6 * Math.sin(g * Math.PI));
  }
  const isGold = S.col[0] > 200 && S.col[1] > 150 && S.col[2] < 140;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  rr(ctx, -S.w / 2, -S.h / 2, S.w, S.h, Math.min(S.r, S.w / 2, S.h / 2));
  ctx.fillStyle = isGold ? cmGoldFill(ctx, -S.w / 2, -S.h / 2, S.w / 2, S.h / 2) : rgb(S.col); ctx.fill(); ctx.restore();
  rr(ctx, -S.w / 2 + 0.5, -S.h / 2 + 0.5, S.w - 1, S.h - 1, Math.min(S.r, S.w / 2, S.h / 2));
  ctx.strokeStyle = isGold ? 'rgba(255,240,200,.5)' : 'rgba(255,255,255,.1)'; ctx.lineWidth = 1.2; ctx.stroke();
  // top sheen
  if (!isGold) { const sh = ctx.createLinearGradient(0, -S.h / 2, 0, -S.h / 2 + 60); sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; rr(ctx, -S.w / 2, -S.h / 2, S.w, Math.min(60, S.h), Math.min(S.r, S.w / 2, S.h / 2)); ctx.fill(); }
  if (S.content === 'coin') { ctx.restore(); return S; }
  cmContent(S, t);
  ctx.restore();
  return S;
}

/* ───────────────────────── market grid (the shape becomes one card among many) ───────────────────────── */
const CM_SHOPS = [['阿哲声音铺', '声音样本', '¥800', 'voice'], ['小鹿插画屋', '国风插画', '¥2,600', 'art'], ['王老师表演课', '表演课程', '¥1,200', 'exp'],
  ['数字敦煌', '飞天纹样', '¥3,800', 'art'], ['配音演员小林', '旁白声音', '¥900', 'voice'], ['Mia 形象坊', '虚拟形象', '¥1,500', 'exp'],
  ['山野摄影', '星空大片', '¥1,800', 'art'], ['京剧脸谱馆', '脸谱肖像', '¥2,200', 'face'], ['城市速写', '速写作品', '¥700', 'art'],
  ['古琴音色库', '古琴采样', '¥1,100', 'voice'], ['街舞教学', '舞蹈课程', '¥1,300', 'exp'], ['汉服造型', '造型肖像', '¥1,900', 'face'],
  ['播客声音', '主播声音', '¥1,000', 'voice'], ['手作陶艺', '陶艺课程', '¥1,400', 'exp']];
const CM_GRID_HERO = ['林夏的灵感小铺', '正脸肖像', '¥2,000', 'face'];
function cmCard(c, x, y, w, h, d, t, a = 1, hl = 0) {
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  fillRR(c, -w / 2, -h / 2, w, h, 22, CM.s2);
  rr(c, -w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 22); c.strokeStyle = hl > 0 ? `rgba(245,208,122,${0.4 + 0.6 * hl})` : CM.line; c.lineWidth = hl > 0 ? 2.5 : 1; c.stroke();
  c.save(); rr(c, -w / 2 + 12, -h / 2 + 12, w - 24, h * 0.52, 14); c.clip(); c.fillStyle = '#1a2034'; c.fillRect(-w / 2, -h / 2, w, h);
  const cy = -h / 2 + 12 + h * 0.26;
  if (d[3] === 'face') frontFace(c, 0, cy + h * 0.14, h / 1100, t);
  else if (d[3] === 'voice') for (let b = 0; b < 11; b++) { const hh = 8 + 44 * Math.abs(Math.sin(t * 7 + b + x)); fillRR(c, -55 + b * 10, cy - hh / 2, 5, hh, 2.5, 'rgba(236,238,245,.8)'); }
  else if (d[3] === 'exp') plateIcon(c, 'exp', 0, cy, 0.24, t, 'rgba(236,238,245,.8)');
  else { c.strokeStyle = 'rgba(236,238,245,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-60, cy + 34); c.lineTo(-20, cy - 14); c.lineTo(8, cy + 14); c.lineTo(34, cy - 20); c.lineTo(60, cy + 34); c.stroke(); }
  c.restore();
  txt(c, d[0], -w / 2 + 18, h * 0.16, { font: F(600, 13, CJK), color: CM.sub });
  txt(c, d[1], -w / 2 + 18, h * 0.16 + 28, { font: F(800, 19, CJK) });
  txt(c, d[2], -w / 2 + 18, h / 2 - 20, { font: F(800, 20, MONO), color: CM.goldHi });
  c.restore();
}
function cmGrid(t) {
  const on = seg(t, 24.5, 24.9) * (1 - seg(t, 27.8, 28.2));
  if (on <= 0) return;
  const cw = 250, ch = 300, gx = 24, gy = 24, cols = 5, rows = 3;
  const search = seg(t, 26.6, 27.0);
  let n = 0;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    if (r === 1 && q === 2) continue;   // the hero's own cell (drawn by the shape)
    const d = CM_SHOPS[n++ % CM_SHOPS.length];
    const x = W / 2 + (q - 2) * (cw + gx), y = H / 2 + 30 + (r - 1) * (ch + gy);
    const dist = Math.hypot(q - 2, r - 1);
    const u = cmStep(t - 24.6 - dist * 0.07, 13, 0.85);
    const match = d[3] === 'face';
    const a = on * clamp(u) * lerp(1, match ? 1 : 0.22, search);
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(0.85, 1, u), lerp(0.85, 1, u)); cmCard(ctx, 0, 0, cw, ch, d, t, a, match ? search * 0.5 : 0); ctx.restore();
  }
  // while the shape is the search bar, the hero's own card stays in its cell and lights up as the match
  if (t >= 25.95 && t < 27.8) cmCard(ctx, W / 2, H / 2 + 30, cw, ch, CM_GRID_HERO, t, on, 0.4 + 0.6 * search * (0.7 + 0.3 * Math.sin(t * 6)));
}

/* ───────────────────────── copy (short, kinetic) ───────────────────────── */
const CM_COPY = [
  // [in, out, text, x, y, size, align, colour]
  [0.9, 4.5, '你的脸，', 160, 470, 92, 'left'], [1.9, 4.5, '你的声音，', 160, 580, 92, 'left'],
  [2.9, 4.5, '你的经验，', 160, 690, 92, 'left'], [3.9, 4.5, '你的作品。', 160, 800, 92, 'left'],
  [4.9, 7.6, '都是价值。', 160, 600, 120, 'left', CM.goldHi],
  [8.2, 13.6, '可今天，', 160, 470, 80, 'left'], [9.0, 13.6, '它们被随意复制、', 160, 580, 80, 'left'],
  [10.1, 13.6, '被随意使用，', 160, 690, 80, 'left'], [11.2, 13.6, '你却分文未得。', 160, 800, 80, 'left', CM.sub],
  [14.0, 15.6, '现在，有了米麦集市。', 960, 500, 72, 'center', CM.goldHi],
  [16.6, 19.3, '三步，开一家店。', 960, 900, 40, 'center'], [19.6, 23.8, '定价，上架。', 960, 900, 40, 'center'],
  [24.8, 27.6, '被整个集市看见。', 960, 1054, 34, 'center'], [29.3, 30.3, '钱，先托管。', 960, 900, 40, 'center'],
  [30.6, 33.4, '你点头，才交付。', 960, 900, 40, 'center', CM.goldHi],
  [40.2, 45.4, '每一次使用，', 160, 560, 84, 'left'], [41.0, 45.4, '都是一笔收入。', 160, 680, 84, 'left', CM.goldHi],
  [46.6, 52.6, '每个人，', 960, 860, 72, 'center'], [47.3, 52.6, '都能开一家店。', 960, 960, 72, 'center', CM.goldHi],
];
function cmCopy(t) {
  for (const [a, b, s, x, y, size, align, col] of CM_COPY) {
    if (t < a - 0.1 || t > b + 0.6) continue;
    cmType(s, x, y, a, t, { size, align, color: col, out: b, stag: size > 60 ? 0.04 : 0.025 });
  }
}

/* ───────────────────────── pain: uncontrolled copies ───────────────────────── */
function cmGhosts(t) {
  const on = seg(t, 8.8, 9.2) * (1 - seg(t, 13.4, 14.2));
  if (on <= 0) return;
  const r = rng(41);
  const collapse = E.inOutCubic(seg(t, 13.2, 14.0));
  for (let i = 0; i < 26; i++) {
    const at = 8.9 + i * 0.12, u = cmStep(t - at, 9, 0.9);
    if (t < at) { r(); r(); r(); continue; }
    const tx = 760 + r() * 1100, ty = 80 + r() * 920, rot = (r() - 0.5) * 0.5;
    const x = lerp(lerp(1300, tx, u), 1300, collapse), y = lerp(lerp(540, ty, u), 540, collapse);
    const s = lerp(0.55, 0.32 + 0.12 * (i % 3), u);
    ctx.save(); ctx.globalAlpha = on * 0.55 * clamp(u * 2) * (1 - collapse); ctx.translate(x, y); ctx.rotate(rot * u); ctx.scale(s, s);
    fillRR(ctx, -160, -200, 320, 400, 36, '#14161d');
    ctx.save(); rr(ctx, -160, -200, 320, 400, 36); ctx.clip(); ctx.filter = 'grayscale(1) brightness(.5)'; frontFace(ctx, 0, 52, 0.62, t); ctx.filter = 'none'; ctx.restore();
    txt(ctx, '复制', -136, 180, { font: F(700, 24, CJK), color: 'rgba(255,255,255,.4)' });
    ctx.restore();
  }
  // income: ¥0
  const zu = seg(t, 11.4, 11.8) * (1 - seg(t, 13.4, 13.8));
  if (zu > 0) {
    ctx.save(); ctx.globalAlpha = zu;
    fillRR(ctx, 1640, 90, 220, 72, 36, 'rgba(20,22,29,.92)');
    txt(ctx, '收入', 1672, 134, { font: F(600, 16, CJK), color: CM.sub });
    txt(ctx, '¥0', 1830, 138, { font: F(800, 30, MONO), color: CM.sub, align: 'right' });
    ctx.restore();
  }
}

/* ───────────────────────── 34–46 · settlement climax ───────────────────────── */
const CM_BAL0 = 12480;
function cmWallet(t, bal, bump) {
  const u = cmStep(t - 37.0, 12, 0.85) * (1 - seg(t, 45.8, 46.3));
  if (u <= 0) return [1700, 120];
  const x = 1700, y = 120 - (1 - clamp(u)) * 60;
  ctx.save(); ctx.globalAlpha = clamp(u); ctx.translate(x, y); const s = 1 + bump * 0.08; ctx.scale(s, s);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; fillRR(ctx, -170, -44, 340, 88, 44, CM.s2); ctx.restore();
  rr(ctx, -169.5, -43.5, 339, 87, 44); ctx.strokeStyle = `rgba(245,208,122,${0.3 + bump * 0.6})`; ctx.lineWidth = 1.5; ctx.stroke();
  cmCoin(ctx, -124, 0, 22);
  txt(ctx, '余额', -88, -6, { font: F(600, 14, CJK), color: CM.sub });
  txt(ctx, `¥${Math.round(bal).toLocaleString()}`, 146, 16, { font: F(800, 32, MONO), color: CM.text, align: 'right' });
  ctx.restore();
  return [x - 124, y];
}
const CM_ORDERS = [[42.0, '青禾广告', '声音', 800], [43.5, '北辰游戏', '虚拟形象', 1600], [45.0, '博物馆文创', '文化资产', 3800]];
function cmClimax(t) {
  if (t < 33.6 || t > 54.2) return;
  const C0 = [960, 540];
  // ── charge 34.0–35.5: coin trembles, energy is drawn inward, light leaks from the rim
  const ch = seg(t, 34.0, 35.5), burst = t >= 35.5;
  if (t < 35.6) {
    const amp = ch * ch * 10;
    const sx = Math.sin(t * 70) * amp, sy = Math.cos(t * 63) * amp;
    for (let i = 0; i < 30; i++) {
      const ph = ((t * 0.9 + i / 30) % 1), an = i * 2.4, rad = lerp(520, 90, ph);
      circle(ctx, C0[0] + Math.cos(an) * rad, C0[1] + Math.sin(an) * rad, 2 + 2 * ph, `rgba(245,208,122,${0.6 * ph * ch})`);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const an = i * 0.9 + t * 0.4, len = 160 + 260 * ch;
      ctx.save(); ctx.translate(C0[0], C0[1]); ctx.rotate(an);
      const g = ctx.createLinearGradient(100, 0, 100 + len, 0); g.addColorStop(0, `rgba(255,220,150,${0.35 * ch})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(100, -6); ctx.lineTo(100 + len, -24); ctx.lineTo(100 + len, 24); ctx.lineTo(100, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    glowDisc(ctx, C0[0], C0[1], 260, [255, 210, 130], 0.25 + 0.35 * ch);
    const sq = 1 - 0.18 * E.inExpo(seg(t, 35.2, 35.5));   // final squash
    ctx.save(); ctx.translate(C0[0] + sx, C0[1] + sy); ctx.scale(1 / sq, sq);
    if (t >= 34.0) cmCoin(ctx, 0, 0, 100, 0);
    ctx.restore();
  }
  // ── burst 35.5: soft bloom (≤0.8), three-layer shockwave, streaks, coins
  if (burst) {
    const b = seg(t, 35.5, 36.4);
    if (b < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      glowDisc(ctx, C0[0], C0[1], 1100, [255, 236, 200], 0.8 * (1 - b) * (1 - b));
      ctx.restore();
      const R = 60 + 900 * E.outCubic(b);
      ring(ctx, C0[0], C0[1], R, `rgba(245,208,122,${0.18 * (1 - b)})`, 34);
      ring(ctx, C0[0], C0[1], R * 0.86, `rgba(245,208,122,${0.4 * (1 - b)})`, 10);
      ring(ctx, C0[0], C0[1], R * 0.74, `rgba(255,245,220,${0.9 * (1 - b)})`, 2.5);
      for (let i = 0; i < 18; i++) {
        const an = i * 0.349 + 0.2, r0 = 120 + 700 * E.outCubic(b), r1 = r0 + 120 * (1 - b);
        line(ctx, C0[0] + Math.cos(an) * r0, C0[1] + Math.sin(an) * r0, C0[0] + Math.cos(an) * r1, C0[1] + Math.sin(an) * r1, `rgba(255,236,190,${0.8 * (1 - b)})`, 2);
      }
    }
    const cr = rng(13);
    for (let i = 0; i < 16; i++) {
      const an = cr() * Math.PI * 2, sp = 400 + cr() * 600, tt = t - 35.5;
      if (tt > 1.6) continue;
      const x = C0[0] + Math.cos(an) * sp * tt, y = C0[1] + Math.sin(an) * sp * tt + 500 * tt * tt;
      cmCoin(ctx, x, y, 20 + cr() * 14, tt * 9 + i, 1 - seg(tt, 1.0, 1.6));
    }
  }
  // ── reveal 36.0: the income card flies out of the burst on an arc and settles with a tiny overshoot
  const rv = cmStep(t - 36.0, 11, 0.72), rvOut = seg(t, 39.9, 40.4);
  if (t >= 36.0 && rvOut < 1) {
    const x = lerp(C0[0], 960, rv), y = lerp(C0[1], 470, rv) - Math.sin(clamp(rv) * Math.PI) * 120;
    const s = lerp(0.2, 1, clamp(rv)) * (1 - rvOut * 0.3);
    ctx.save(); ctx.globalAlpha = clamp(rv * 2) * (1 - rvOut); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((1 - clamp(rv)) * -0.2);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30; fillRR(ctx, -360, -170, 720, 340, 30, CM.s2); ctx.restore();
    rr(ctx, -359.5, -169.5, 719, 339, 30); ctx.strokeStyle = 'rgba(245,208,122,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    txt(ctx, '本次收入', -310, -100, { font: F(700, 20, CJK), color: CM.sub, ls: 3 });
    const roll = E.outCubic(seg(t, 36.2, 37.4));
    txt(ctx, `+¥${Math.round(1950 * roll).toLocaleString()}`, -310, 10, { font: F(800, 96, MONO), color: CM.goldHi });
    line(ctx, -310, 50, 310, 50, CM.line, 1);
    txt(ctx, '成交 ¥2,000  ·  平台服务费 ¥50（2.5%）', -310, 100, { font: F(600, 19, CJK), color: CM.sub });
    const pu = cmStep(t - 37.3, 16, 0.6);
    if (t > 37.3) { ctx.save(); ctx.translate(250, -96); ctx.scale(pu, pu); fillRR(ctx, -60, -20, 120, 40, 20, 'rgba(52,211,153,.18)'); txt(ctx, '▲ 到账', 0, 8, { font: F(800, 18, CJK), color: CM.pos, align: 'center' }); ctx.restore(); }
    ctx.restore();
  }
  // ── settle 37.6–39.8: coins fly on curves into the balance; it ticks up on every arrival
  let bal = CM_BAL0, bump = 0;
  const COINS = 10;
  const arrive = (i) => 37.6 + i * 0.2 + 0.55;
  for (let i = 0; i < COINS; i++) { if (t >= arrive(i)) { bal += 195; bump = Math.max(bump, Math.exp(-(t - arrive(i)) * 10)); } }
  // later orders (40–46): each streams a few coins into the balance
  CM_ORDERS.forEach(([at, , , p]) => { const net = p * 0.975; for (let k = 0; k < 4; k++) { const ar = at + 0.5 + k * 0.12; if (t >= ar) { bal += net / 4; bump = Math.max(bump, Math.exp(-(t - ar) * 10)); } } });
  const [wx, wy] = cmWallet(t, bal, bump);
  for (let i = 0; i < COINS; i++) {
    const s0 = 37.6 + i * 0.2, u = seg(t, s0, s0 + 0.55);
    if (u <= 0 || u >= 1) continue;
    const sx = 960 + (i - 4.5) * 40, sy = 520, qx = (sx + wx) / 2 + 160, qy = Math.min(sy, wy) - 240, v = E.inOutCubic(u);
    const x = (1 - v) * (1 - v) * sx + 2 * (1 - v) * v * qx + v * v * wx, y = (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * qy + v * v * wy;
    cmCoin(ctx, x, y, lerp(26, 16, v), u * 8);
  }
  // ── orders keep arriving (40–46)
  CM_ORDERS.forEach(([at, who, what, p], i) => {
    const u = cmStep(t - at, 12, 0.85), out = seg(t, 45.8, 46.3);
    if (t < at || out >= 1) return;
    const x = 1420, y = 380 + i * 150 - (1 - clamp(u)) * -60;
    ctx.save(); ctx.globalAlpha = clamp(u * 1.5) * (1 - out);
    fillRR(ctx, x - 230, y - 56, 460, 112, 24, CM.s2); rr(ctx, x - 229.5, y - 55.5, 459, 111, 24); ctx.strokeStyle = CM.line; ctx.stroke();
    txt(ctx, `${who} · ${what}`, x - 200, y - 8, { font: F(800, 22, CJK) });
    txt(ctx, '使用 1 次 · 已结算', x - 200, y + 24, { font: F(600, 15, CJK), color: CM.sub });
    txt(ctx, `+¥${Math.round(p * 0.975).toLocaleString()}`, x + 200, y + 10, { font: F(800, 28, MONO), color: CM.goldHi, align: 'right' });
    ctx.restore();
    for (let k = 0; k < 4; k++) {
      const s0 = at + k * 0.12, v0 = seg(t, s0, s0 + 0.5);
      if (v0 <= 0 || v0 >= 1) continue;
      const v = E.inOutCubic(v0), sx = x + 160, sy = y, qx = (sx + wx) / 2 + 60, qy = Math.min(sy, wy) - 120;
      cmCoin(ctx, (1 - v) * (1 - v) * sx + 2 * (1 - v) * v * qx + v * v * wx, (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * qy + v * v * wy, 14, v0 * 8);
    }
  });
}

/* ───────────────────────── 46–54 · everyone can open a shop ───────────────────────── */
function cmNetwork(t) {
  const on = seg(t, 45.8, 46.6) * (1 - seg(t, 53.2, 54.0));
  if (on <= 0) return;
  const z = lerp(1.0, 0.74, E.inOutCubic(seg(t, 46, 53.5)));
  ctx.save(); ctx.globalAlpha = on; ctx.translate(W / 2, H / 2 - 90); ctx.scale(z, z); ctx.rotate(lerp(-0.03, 0.01, seg(t, 46, 54)));
  const cols = 7, rows = 3, cw = 230, chh = 270, gap = 26;
  const pos = (q, r) => [(q - 3) * (cw + gap), (r - 1) * (chh + gap)];
  let n = 0;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const d = r === 1 && q === 3 ? CM_GRID_HERO : CM_SHOPS[n++ % CM_SHOPS.length];
    const [x, y] = pos(q, r), u = cmStep(t - 46.2 - Math.hypot(q - 3, r - 1) * 0.08, 12, 0.85);
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(0.8, 1, u), lerp(0.8, 1, u)); cmCard(ctx, 0, 0, cw, chh, d, t, clamp(u), d === CM_GRID_HERO ? 1 : 0); ctx.restore();
  }
  // trades between shops: a coin travels, a soft "+¥" lands
  const tr = rng(57);
  for (let i = 0; i < 12; i++) {
    const a = [(tr() * cols) | 0, (tr() * rows) | 0], b = [(tr() * cols) | 0, (tr() * rows) | 0], per = 1.6 + tr() * 1.4, off = tr() * 3;
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const [x0, y0] = pos(...a), [x1, y1] = pos(...b);
    const u = ((t + off) % per) / per;
    if (t < 47) continue;
    if (u < 0.75) { const v = E.inOutCubic(u / 0.75), mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 160; cmCoin(ctx, (1 - v) * (1 - v) * x0 + 2 * (1 - v) * v * mx + v * v * x1, (1 - v) * (1 - v) * y0 + 2 * (1 - v) * v * my + v * v * y1, 13, v * 6); }
    else { const v = (u - 0.75) / 0.25; txt(ctx, `+¥${[780, 1950, 1170, 3705, 877][i % 5].toLocaleString()}`, x1, y1 - 150 - v * 30, { font: F(800, 20, MONO), color: CM.goldHi, align: 'center', alpha: 1 - v }); }
  }
  ctx.restore();
  // scrim for the copy
  const g = ctx.createLinearGradient(0, 760, 0, H); g.addColorStop(0, 'rgba(5,7,13,0)'); g.addColorStop(0.4, 'rgba(5,7,13,.85)'); g.addColorStop(1, 'rgba(5,7,13,.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 760, W, H - 760);
}

/* ───────────────────────── 54–60 · logo ───────────────────────── */
function cmLogo(t) {
  if (t < 53.4) return;
  const lt = t - 54;
  // a coin travels to the centre, flattens into a line of light, the line reveals the mark
  if (t < 54.4) { const u = E.inOutCubic(seg(t, 53.4, 54.2)); cmCoin(ctx, lerp(960, 960, u), lerp(860, 400, u), lerp(14, 30, u), t * 8, 1 - seg(t, 54.1, 54.35)); }
  const ln = seg(t, 54.2, 54.7), lnOut = seg(t, 55.6, 56.0);
  if (ln > 0 && lnOut < 1) {
    const len = 520 * E.outCubic(ln);
    const g = ctx.createLinearGradient(960 - len, 0, 960 + len, 0); g.addColorStop(0, 'rgba(245,208,122,0)'); g.addColorStop(0.5, `rgba(255,240,200,${0.95 * (1 - lnOut)})`); g.addColorStop(1, 'rgba(245,208,122,0)');
    ctx.fillStyle = g; ctx.fillRect(960 - len, 398, 2 * len, 3);
  }
  const p = cmStep(t - 54.6, 10, 0.95);
  drawLogo(ctx, 960 - 380, 260 + (1 - clamp(p)) * 14, 760, E.inOutCubic(seg(t, 54.6, 55.6)), seg(t, 55.8, 57.0), clamp(p));
  cmType('米麦集市  ·  MIME BAZAAR', 960, 520, 55.6, t, { size: 30, align: 'center', w: 800, color: CM.goldHi, ls: 8, stag: 0.02 });
  cmType('开一家店，卖你的灵感。', 960, 640, 56.1, t, { size: 76, align: 'center', ls: 10 });
  const du = cmStep(t - 56.8, 12, 0.9);
  if (du > 0) {
    ctx.save(); ctx.globalAlpha = clamp(du);
    rr(ctx, 960 - 170, 712, 340, 56, 28); ctx.strokeStyle = 'rgba(245,208,122,.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    txt(ctx, 'mimuseai.com', 960, 750, { font: F(600, 24, MONO), align: 'center', color: CM.text });
    ctx.restore();
  }
  txt(ctx, '演示画面 · 部分能力为原型模拟实现', 960, H - 24, { font: F(400, 13, CJK), align: 'center', color: 'rgba(255,255,255,.28)', alpha: seg(t, 57, 57.5) });
  const end = seg(t, 59.4, 60);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
}

/* ───────────────────────── camera + main ───────────────────────── */
// each product state fills the frame; pull back to reveal the market; a hit on the burst
const CM_CAM = [[0, 1], [14.0, 1], [16.2, 1.36], [23.8, 1.36], [24.4, 1.2], [24.9, 0.9], [27.7, 0.9], [28.0, 1.3], [32.0, 1.3], [32.4, 1.6], [33.6, 1.0], [35.5, 1.1, true], [35.55, 1], [46, 1]];
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const S0 = cmShape(t);
  cmBackdrop(t, S0);
  // camera: gentle push on the product section, pull back to reveal the market, a hit on the burst
  const zoom = cmSpr(t, CM_CAM, 9, 0.9);
  const shake = t > 35.5 && t < 35.9 ? (1 - (t - 35.5) / 0.4) * 9 : 0;
  ctx.save();
  ctx.translate(W / 2 + (hash(Math.floor(t * 60)) - 0.5) * shake, H / 2 + (hash(Math.floor(t * 60) + 3) - 0.5) * shake);
  ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  cmGhosts(t);
  cmGrid(t);
  cmDrawShape(t);
  cmClimax(t);
  cmNetwork(t);
  ctx.restore();
  cmCopy(t);
  // cursor (product section)
  if (t > 15.0 && t < 33.2) {
    // cursor keys are in world (card) space; map them through the camera so clicks land on the zoomed UI
    const wx = cmSpr(t, CM_CUR.map(k => [k[0], k[1]]), 9, 0.95), wy = cmSpr(t, CM_CUR.map(k => [k[0], k[2]]), 9, 0.95);
    const cx = W / 2 + (wx - W / 2) * zoom, cy = H / 2 + (wy - H / 2) * zoom;
    let press = 0; for (const c of CM_CLICK) press = Math.max(press, Math.sin(Math.PI * clamp((t - c + 0.08) / 0.18)));
    for (const [a, b] of CM_DRAG) if (t > a && t < b) press = 1;
    for (const c of CM_CLICK) cmRipple(cx, cy, seg(t, c, c + 0.5));
    ctx.save(); ctx.globalAlpha = seg(t, 15.0, 15.3) * (1 - seg(t, 32.9, 33.2)); cmCursor(cx, cy, press); ctx.restore();
  }
  cmLogo(t);
  grain(t);
}
window.render = render;
