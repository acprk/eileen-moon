/* 米麦集市 MIME BAZAAR — 每个人都可以开一家店（60 s, 1920×1080, 30 fps, 120 BPM）
 * Loaded after ../mishu/film.js and reuses its drawing library (txt, fillRR, rr, circle, ring, line, glowDisc, E, seg,
 * lerp, clamp, hash, rng, rgb, hex, mix, shade, F, CJK, MONO, frontFace, plateIcon, PLATES, wipe, drawLogo, mark,
 * coin, check, cursor, ripple, lockIcon, keyIcon, grain). Every name defined here starts with bz / BZ, except render().
 *
 *  0–5   open      night bazaar lights up stall by stall, title
 *  5–9   hook      colour plates: your face / voice / experience / work / muse → "开一家店，卖你的灵感"
 *  9–18  01 开一家店  shop front builds itself + shop-opening app
 * 18–27  02 上架     assets fly onto the shelves with price tags + listing editor
 * 27–37  03 逛集市·下单 buyer flies through the bazaar, finds the shop, buys
 * 37–46  04 安全成交  the trade, step by step: order → escrow → owner's yes → delivery → settlement
 * 46–54  05 人人都是店主 thousands of shops, shopkeepers, live totals
 * 54–60  outro
 */
const BZ_CUTS = [5, 9, 18, 27, 37, 46, 54];
const BZ_NIGHT = ['#070a1c', '#141039'];
const BZ_AWN = [['#ff5a3c', '#fff1e0'], ['#2a3cf2', '#e8ecff'], ['#19e3a6', '#0b2a24'], ['#ffc934', '#3a2a00'], ['#7a3cff', '#efe6ff'], ['#ff4fa3', '#ffe8f3']];
const BZ_NAMES = ['林夏的灵感小铺', '阿哲声音铺', '小鹿插画屋', '老周瓷器馆', 'Mia 虚拟形象坊', '王老师表演课', '山野摄影', '京剧脸谱馆',
  'AI 配音坊', '古琴音色库', '手作陶艺', '街舞教学', '数字敦煌', '舞美设计', '汉服造型', '电竞解说', '播客声音', '川剧变脸', '城市速写',
  '剪纸工作室', '国风插画', '配音演员小林', '书法字库', '民谣吉他', '手语课堂', '动画分镜', '面塑非遗', '咖啡师课程', '刺绣纹样', '星空摄影'];
const BZ_KEEPERS = [
  { skin: '#f4c9ab' }, { skin: '#e2a982', hair: '#2b2b2b', short: true, top: '#1f6b5a' }, { skin: '#f7d6c0', hair: '#7a4a2a', top: '#7a3cff' },
  { skin: '#c98e6b', hair: '#1b1b1b', short: true, top: '#c0392b' }, { skin: '#efc3a4', hair: '#4a2c6e', top: '#ff5a3c' }, { skin: '#d9a07c', hair: '#3a2a1a', short: true, top: '#2a3cf2' },
  { skin: '#f2cdb3', hair: '#a0522d', top: '#19a37a' }, { skin: '#b97f5c', hair: '#141414', short: true, top: '#ffb020' }, { skin: '#f6d2bb', hair: '#2a1a40', top: '#e0457b' },
];
// stalls on a grid with streets between rows
const BZ_STALLS = (() => {
  const a = []; let n = 0;
  for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) {
    if (i % 3 === 2 || j % 4 === 3) continue;
    a.push({ i, j, name: BZ_NAMES[(i * 7 + j * 3) % BZ_NAMES.length], awn: BZ_AWN[(i + j * 2) % BZ_AWN.length], goods: [(i + j) % 7, (i * 2 + j + 3) % 7, (i + 3 * j + 5) % 7], id: n++ });
  }
  const hero = a.find(s => s.i === 4 && s.j === 4); hero.name = BZ_NAMES[0]; hero.awn = BZ_AWN[0]; hero.goods = [0, 1, 3];
  return a.sort((p, q) => p.i + p.j - (q.i + q.j));
})();
const BZ_TRADES = (() => { const r = rng(91), a = []; for (let k = 0; k < 26; k++) a.push({ a: (r() * BZ_STALLS.length) | 0, b: (r() * BZ_STALLS.length) | 0, per: 2.2 + r() * 2.4, off: r() * 4, amt: [800, 2000, 1500, 600, 3800, 1200, 2600][(r() * 7) | 0] }); return a.filter(x => x.a !== x.b); })();
const BZ_TW = 150, BZ_TH = 75;
const bzP = (i, j, z = 0) => [(i - j) * BZ_TW / 2, (i + j) * BZ_TH / 2 - z];
const bzPoly = (c, pts, fill) => { c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = fill; c.fill(); };
const bzDim = (col, lit) => rgb(mix(hex(col), [14, 18, 46], (1 - lit) * 0.8));

/* ───────────────────────── night sky & bokeh ───────────────────────── */
function bzSky(t, warm = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, BZ_NIGHT[0]); g.addColorStop(1, BZ_NIGHT[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowDisc(ctx, W * 0.5, H * 0.75, 900, [255, 120, 70], 0.18 + warm * 0.12);
  glowDisc(ctx, W * 0.15, H * 0.2, 700, [60, 90, 255], 0.25);
  glowDisc(ctx, W * 0.9, H * 0.25, 600, [150, 70, 255], 0.2);
  const r = rng(5);
  for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H * 0.6, tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + r()) + i)); circle(ctx, x, y, r() * 1.4 + 0.4, `rgba(220,230,255,${0.5 * tw})`); }
}
function bzBokeh(t, a = 1) {
  const r = rng(17);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const col = BZ_AWN[i % 6][0], x = ((r() * W + t * (8 + r() * 14)) % (W + 200)) - 100, y = H * 0.3 + r() * H * 0.7, rad = 20 + r() * 70;
    glowDisc(ctx, x, y, rad, hex(col), 0.12 * a * (0.5 + 0.5 * Math.sin(t * 1.3 + i)));
  }
  ctx.restore();
}

/* ───────────────────────── an isometric stall ───────────────────────── */
function bzStall(c, s, t, lit = 1, hl = 0, la = 1) {
  const { i, j } = s, q = 0.44, wh = 112;
  const [A1, A2] = s.awn;
  const P = bzP;
  // ground tile
  bzPoly(c, [P(i - .5, j - .5), P(i + .5, j - .5), P(i + .5, j + .5), P(i - .5, j + .5)], bzDim('#1a2150', lit * 0.6 + 0.4));
  if (hl > 0) {
    c.save(); c.globalAlpha = hl;
    bzPoly(c, [P(i - .52, j - .52), P(i + .52, j - .52), P(i + .52, j + .52), P(i - .52, j + .52)], 'rgba(255,201,52,.35)');
    c.restore();
  }
  // back walls
  bzPoly(c, [P(i - q, j - q), P(i + q, j - q), P(i + q, j - q, wh), P(i - q, j - q, wh)], bzDim('#3a2d7a', lit));
  bzPoly(c, [P(i - q, j - q), P(i - q, j + q), P(i - q, j + q, wh), P(i - q, j - q, wh)], bzDim('#2a2160', lit));
  // goods on the back shelf (little boxes)
  s.goods.forEach((g, k) => {
    const it = PLATES[g], u = -q + 0.18 + k * 0.28;
    const [bx, by] = P(i + u, j - q + 0.06, 64);
    fillRR(c, bx - 12, by - 14, 24, 22, 5, bzDim(it.bg, lit));
  });
  // counter (front-left edge)
  const cz = 40, cj = j + q - 0.2;
  bzPoly(c, [P(i - q, cj, cz), P(i + q, cj, cz), P(i + q, j + q, cz), P(i - q, j + q, cz)], bzDim('#c99a5a', lit));
  bzPoly(c, [P(i - q, j + q, 0), P(i + q, j + q, 0), P(i + q, j + q, cz), P(i - q, j + q, cz)], bzDim('#8a5a34', lit));
  bzPoly(c, [P(i + q, cj, 0), P(i + q, j + q, 0), P(i + q, j + q, cz), P(i + q, cj, cz)], bzDim('#6e4428', lit));
  // goods on the counter
  s.goods.slice(0, 2).forEach((g, k) => {
    const it = PLATES[g]; const [gx, gy] = P(i - q + 0.25 + k * 0.4, cj + 0.1, cz + 16);
    fillRR(c, gx - 11, gy - 11, 22, 20, 5, bzDim(it.bg, lit));
  });
  // striped awning
  const z0 = wh + 30, z1 = wh - 6, n = 6;
  for (let k = 0; k < n; k++) {
    const u0 = -q - 0.04 + (2 * q + 0.08) * k / n, u1 = -q - 0.04 + (2 * q + 0.08) * (k + 1) / n;
    bzPoly(c, [P(i + u0, j - q, z0), P(i + u1, j - q, z0), P(i + u1, j + q + 0.14, z1), P(i + u0, j + q + 0.14, z1)], bzDim(k % 2 ? A2 : A1, lit));
  }
  // scalloped front edge
  for (let k = 0; k < n; k++) {
    const u = -q - 0.04 + (2 * q + 0.08) * (k + 0.5) / n; const [sx, sy] = P(i + u, j + q + 0.14, z1);
    c.beginPath(); c.arc(sx, sy, 10, 0, Math.PI); c.fillStyle = bzDim(k % 2 ? A2 : A1, lit); c.fill();
  }
  // string lights
  if (lit > 0.05) {
    for (let k = 0; k <= 8; k++) {
      const u = -q + (2 * q) * k / 8; const [lx, ly] = P(i + u, j + q + 0.16, z1 - 14 - Math.sin(Math.PI * k / 8) * 8);
      const col = BZ_AWN[(k + i) % 6][0];
      circle(c, lx, ly, 2.6, rgb(mix(hex(col), [255, 255, 255], 0.4), lit));
      glowDisc(c, lx, ly, 12, hex(col), 0.35 * lit * (0.6 + 0.4 * Math.sin(t * 4 + k + i)));
    }
  }
  // sign board
  const [nx, ny] = P(i, j - q, wh + 64);
  c.save(); c.globalAlpha *= la;
  c.font = F(800, 14, CJK); const w = c.measureText(s.name).width + 22;
  fillRR(c, nx - w / 2, ny - 16, w, 28, 7, lit > 0.5 ? 'rgba(20,14,50,.92)' : 'rgba(20,14,50,.6)');
  rr(c, nx - w / 2 + 0.5, ny - 15.5, w - 1, 27, 7); c.strokeStyle = rgb(hex(A1), 0.3 + 0.6 * lit); c.lineWidth = 1.2; c.stroke();
  txt(c, s.name, nx, ny + 3, { font: F(800, 14, CJK), align: 'center', color: lit > 0.5 ? '#fff' : 'rgba(255,255,255,.4)' });
  c.restore();
  if (lit > 0.05) glowDisc(c, ...P(i, j, 60), 110, [255, 170, 90], 0.12 * lit);
}
function bzBazaar(t, cam, o = {}) {
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.rotate(cam.r || 0);
  const [wx, wy] = bzP(cam.i, cam.j, 0); ctx.translate(-wx, -wy);
  // ground
  const e0 = -1.5, e1 = 11.5;
  bzPoly(ctx, [bzP(e0, e0), bzP(e1, e0), bzP(e1, e1), bzP(e0, e1)], '#0e1336');
  ctx.strokeStyle = 'rgba(120,150,255,.08)'; ctx.lineWidth = 1;
  for (let k = e0; k <= e1; k++) {
    ctx.beginPath(); ctx.moveTo(...bzP(k - 0.5, e0)); ctx.lineTo(...bzP(k - 0.5, e1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...bzP(e0, k - 0.5)); ctx.lineTo(...bzP(e1, k - 0.5)); ctx.stroke();
  }
  // street lanterns along the streets
  for (let i = 2; i < 11; i += 3) for (let j = 0; j < 11; j++) {
    const [x, y] = bzP(i, j, 90);
    const col = BZ_AWN[(i + j) % 6][0];
    circle(ctx, x, y, 4, rgb(mix(hex(col), [255, 255, 255], 0.5))); glowDisc(ctx, x, y, 26, hex(col), 0.35);
  }
  for (const s of BZ_STALLS) bzStall(ctx, s, t, o.lit ? o.lit(s) : 1, o.hl ? o.hl(s) : 0, o.la ? o.la(s) : 1);
  // trades: payments arcing between stalls, "+¥" at the receiving stall
  if (o.trades) {
    for (const tr of BZ_TRADES) {
      const A = BZ_STALLS[tr.a], B = BZ_STALLS[tr.b];
      const [x0, y0] = bzP(A.i, A.j, 150), [x1, y1] = bzP(B.i, B.j, 150);
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 120 - Math.abs(x1 - x0) * 0.2;
      const u = ((t + tr.off) % tr.per) / tr.per;
      ctx.save(); ctx.globalAlpha = o.trades;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.strokeStyle = 'rgba(255,214,120,.18)'; ctx.lineWidth = 1.5 / cam.z; ctx.stroke();
      if (u < 0.8) {
        const v = u / 0.8, bx = (1 - v) * (1 - v) * x0 + 2 * (1 - v) * v * mx + v * v * x1, by = (1 - v) * (1 - v) * y0 + 2 * (1 - v) * v * my + v * v * y1;
        coin(ctx, bx, by, 9);
      } else {
        const v = (u - 0.8) / 0.2;
        txt(ctx, `+¥${tr.amt.toLocaleString()}`, x1, y1 - 20 - v * 40, { font: F(900, 18), align: 'center', color: '#ffe3a8', alpha: 1 - v, glow: 'rgba(255,190,80,.8)', glowR: 10 });
        ring(ctx, x1, y1 + 40, 20 + v * 40, `rgba(255,214,120,${1 - v})`, 2);
      }
      ctx.restore();
    }
  }
  if (o.after) o.after();
  ctx.restore();
}
const bzWorld = (i, j, z, cam) => { const [x, y] = bzP(i, j, z), [cx, cy] = bzP(cam.i, cam.j, 0); return [W / 2 + (x - cx) * cam.z, H / 2 + (y - cy) * cam.z]; };

/* ───────────────────────── chrome & chapter labels ───────────────────────── */
const BZ_CH = [
  { n: 1, a: 9, b: 18, title: '开一家店', en: 'OPEN A SHOP', line: '三步开店，零门槛。', acc: '#ff5a3c' },
  { n: 2, a: 18, b: 27, title: '上架你的素材', en: 'LIST YOUR ASSETS', line: '脸、声音、经验、作品，都能定价。', acc: '#ffc934' },
  { n: 3, a: 27, b: 37, title: '逛集市 · 下单', en: 'BROWSE & BUY', line: '买家逛遍全城，一键下单。', acc: '#19e3a6' },
  { n: 4, a: 37, b: 46, title: '安全成交', en: 'SAFE TRADE', line: '钱先托管，你点头才交付。', acc: '#4d7bff' },
  { n: 5, a: 46, b: 54, title: '人人都是店主', en: 'EVERYONE OWNS A SHOP', line: '每个人，都在这里做生意。', acc: '#ff4fa3' },
];
function bzChrome(t) {
  const a = seg(t, 9, 9.5) * (1 - seg(t, 53.6, 54.1));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  mark(ctx, 56, 34, 36);
  txt(ctx, '米麦集市', 130, 62, { font: F(900, 24, CJK) });
  txt(ctx, 'MIME BAZAAR', 238, 61, { font: F(700, 14), color: 'rgba(255,255,255,.6)', ls: 3 });
  txt(ctx, 'mimuseai.com', W - 56, 60, { font: F(500, 16, MONO), color: 'rgba(255,255,255,.6)', align: 'right' });
  const p = seg(t, 9, 54);
  line(ctx, 0, H - 2, W, H - 2, 'rgba(255,255,255,.06)', 4);
  line(ctx, 0, H - 2, W * p, H - 2, '#ffc934', 4);
  ctx.restore();
  const ch = BZ_CH.find(c => t >= c.a && t < c.b);
  if (!ch) return;
  const lt = t - ch.a, dur = ch.b - ch.a;
  const u = E.outExpo(seg(lt, 0.1, 0.8)), out = E.inCubic(seg(lt, dur - 0.4, dur));
  const x = 90 - (1 - u) * 80 - out * 60;
  ctx.save(); ctx.globalAlpha = u * (1 - out);
  // dark scrim for legibility
  const g = ctx.createLinearGradient(0, 0, 760, 0); g.addColorStop(0, 'rgba(5,7,20,.72)'); g.addColorStop(1, 'rgba(5,7,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 96, 760, 250);
  ctx.transform(1, 0, -0.08 * (1 - u), 1, 0, 0);
  txt(ctx, `0${ch.n}`, x, 168, { font: F(700, 40, MONO), color: ch.acc });
  line(ctx, x + 70, 155, x + 70 + 140 * u, 155, ch.acc, 2.5);
  txt(ctx, ch.title, x - 3, 250, { font: F(900, ch.title.length > 5 ? 70 : 80, CJK), ls: 2, glow: 'rgba(0,0,0,.6)', glowR: 16 });
  txt(ctx, ch.en, x, 288, { font: F(700, 16), color: 'rgba(255,255,255,.6)', ls: 5 });
  txt(ctx, ch.line, x, 328, { font: F(700, 26, CJK), color: ch.acc, ls: 1 });
  ctx.restore();
}
function bzCutFlash(t) {
  for (const c of BZ_CUTS) {
    const u = seg(t, c - 0.22, c + 0.28);
    if (u <= 0 || u >= 1) continue;
    const x = lerp(-600, W + 600, E.inOutCubic(u));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 300, 0, x + 300, 0);
    g.addColorStop(0, 'rgba(255,180,120,0)'); g.addColorStop(0.5, `rgba(255,210,170,${0.4 * Math.sin(u * Math.PI)})`); g.addColorStop(1, 'rgba(255,180,120,0)');
    ctx.setTransform(1, 0, -0.35, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(x - 300, 0, 900, H);
    ctx.restore();
  }
}

/* ───────────────────────── 0–5 · the bazaar lights up ───────────────────────── */
function bzOpen(t) {
  bzSky(t);
  const z = lerp(2.7, 0.92, E.inOutCubic(seg(t, 0.2, 4.4))) + E.inExpo(seg(t, 4.6, 5.0)) * 1.2;
  const cam = { i: lerp(4, 5, seg(t, 0, 5)), j: lerp(4, 5, seg(t, 0, 5)), z, r: lerp(-0.04, 0, seg(t, 0, 4)) };
  const lit = (s) => { const d = Math.hypot(s.i - 4, s.j - 4); return E.outCubic(seg(t, 0.5 + d * 0.32, 0.8 + d * 0.32)); };
  bzBazaar(t, cam, { lit, trades: seg(t, 3.0, 4.0) });
  // "开张" flash on the first shop
  const f = seg(t, 0.45, 1.3);
  if (f > 0 && f < 1) { const [x, y] = bzWorld(4, 4, 250, cam); txt(ctx, '开张！', x, y - f * 40, { font: F(900, 46, CJK), align: 'center', color: '#ffe3a8', alpha: Math.sin(f * Math.PI), glow: 'rgba(255,160,60,.9)', glowR: 24 }); }
  // title
  const ta = E.outExpo(seg(t, 2.2, 3.0)) * (1 - E.inCubic(seg(t, 4.6, 5.0)));
  if (ta > 0) {
    const band = ctx.createLinearGradient(0, 60, 0, 540);
    band.addColorStop(0, 'rgba(4,6,20,0)'); band.addColorStop(0.2, `rgba(4,6,20,${0.93 * ta})`); band.addColorStop(0.85, `rgba(4,6,20,${0.93 * ta})`); band.addColorStop(1, 'rgba(4,6,20,0)');
    ctx.fillStyle = band; ctx.fillRect(0, 60, W, 480);
    drawLogo(ctx, W / 2 - 260, 110, 520, E.inOutCubic(seg(t, 2.2, 3.0)), seg(t, 3.0, 4.2), ta);
    txt(ctx, '米麦集市', W / 2, 360 + (1 - ta) * 20, { font: F(900, 120, CJK), align: 'center', ls: 16, alpha: ta, glow: 'rgba(255,150,80,.6)', glowR: 30 });
    txt(ctx, 'MIME BAZAAR', W / 2, 410, { font: F(800, 24), align: 'center', ls: 16, color: '#ffd9a0', alpha: ta });
    txt(ctx, '每个人，都可以开一家店。', W / 2, 482, { font: F(800, 40, CJK), align: 'center', ls: 6, color: 'rgba(255,255,255,.9)', alpha: seg(t, 2.8, 3.4) * ta });
  }
  // wayfinding numbers
  const wf = seg(t, 1.0, 1.6) * (1 - seg(t, 4.6, 5.0));
  txt(ctx, '今晚开张', 64, H - 92, { font: F(600, 14, CJK), color: 'rgba(255,220,180,.7)', ls: 3, alpha: wf });
  txt(ctx, `${Math.floor(lerp(1, 52318, E.outCubic(seg(t, 0.5, 4.5)))).toLocaleString()} 家店`, 64, H - 52, { font: F(900, 34), color: '#fff', alpha: wf });
}

/* ───────────────────────── 5–9 · colour plates ───────────────────────── */
const BZ_PLATES = [
  { a: 5.0, zh: '你的脸', en: 'YOUR FACE', p: 0, tr: 'up' },
  { a: 5.5, zh: '你的声音', en: 'YOUR VOICE', p: 1, tr: 'split' },
  { a: 6.0, zh: '你的经验', en: 'YOUR EXPERIENCE', p: 3, tr: 'diag' },
  { a: 6.5, zh: '你的作品', en: 'YOUR WORK', p: 5, tr: 'iris' },
  { a: 7.0, zh: '你的灵感', en: 'YOUR MUSE', p: 6, tr: 'left' },
];
function bzAwning(y0, u, t) {
  // a striped shop awning unrolling across the top of the screen
  const n = 16, sw = W / n, hgt = 150 * u;
  for (let k = 0; k < n; k++) {
    const [A1, A2] = BZ_AWN[0];
    ctx.fillStyle = k % 2 ? A2 : A1; ctx.fillRect(k * sw, y0, sw + 1, hgt);
    ctx.beginPath(); ctx.arc(k * sw + sw / 2, y0 + hgt, sw / 2, 0, Math.PI); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y0, 0, y0 + hgt + 60); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, hgt + 60);
  for (let k = 0; k <= 24; k++) { const x = k * W / 24, y = y0 + hgt + 70 + Math.sin(Math.PI * k / 24) * 26; circle(ctx, x, y, 5, BZ_AWN[k % 6][0]); glowDisc(ctx, x, y, 22, hex(BZ_AWN[k % 6][0]), 0.5 * (0.6 + 0.4 * Math.sin(t * 5 + k))); }
}
function bzHook(t) {
  if (t < 5 || t >= 9) return;
  if (t < 7.5) {
    let k = 0; for (let i = 0; i < BZ_PLATES.length; i++) if (t >= BZ_PLATES[i].a) k = i;
    const pl = BZ_PLATES[k], it = PLATES[pl.p], lt = t - pl.a;
    ctx.fillStyle = k > 0 ? PLATES[BZ_PLATES[k - 1].p].bg : '#070a1c'; ctx.fillRect(0, 0, W, H);
    wipe(pl.tr, E.outExpo(seg(lt, 0, 0.2)), it.bg);
    const p = E.outExpo(seg(lt, 0.03, 0.34)), s = lerp(1.18, 1, p);
    ctx.save(); ctx.globalAlpha = 0.1; ctx.font = F(900, 400); ctx.textAlign = 'center'; ctx.strokeStyle = it.fg; ctx.lineWidth = 3;
    ctx.strokeText('SHOP', W / 2 - (lt - 0.25) * 200, H / 2 + 160); ctx.restore();
    const shake = (1 - seg(lt, 0, 0.12)) * 12;
    ctx.save(); ctx.translate((hash(Math.floor(t * 30)) - 0.5) * shake, (hash(Math.floor(t * 30) + 5) - 0.5) * shake);
    const iu = E.outBack(seg(lt, 0.03, 0.36));
    if (pl.p === 0) { ctx.save(); ctx.translate(560, 620); ctx.scale(iu, iu); frontFace(ctx, 0, 0, 1.1, t); ctx.restore(); }
    else plateIcon(ctx, it.icon, 560, 540, 1.05 * iu, t, it.fg);
    ctx.save(); ctx.translate(1000, 560); ctx.scale(s, s);
    txt(ctx, pl.zh, 0, 0, { font: F(900, 170, CJK), color: it.fg, ls: 8, alpha: p });
    txt(ctx, pl.en, 6, 64, { font: F(700, 24), color: it.fg, ls: 12, alpha: 0.75 * p });
    ctx.restore();
    // shop tag: "可开店出售 · ¥price"
    const tu = E.outBack(seg(lt, 0.1, 0.34));
    if (tu > 0) {
      ctx.save(); ctx.translate(1010, 700); ctx.scale(tu, tu);
      fillRR(ctx, 0, 0, 380, 64, 32, it.fg);
      txt(ctx, '可开店出售', 30, 42, { font: F(900, 26, CJK), color: it.bg });
      txt(ctx, `¥${it.price} / 次`, 350, 42, { font: F(900, 26), color: it.bg, align: 'right' });
      ctx.restore();
    }
    ctx.restore();
    txt(ctx, `0${k + 1} / 05`, 80, H - 64, { font: F(600, 18, MONO), color: it.fg, alpha: 0.65 });
    txt(ctx, '米麦集市 MIME BAZAAR', W - 80, 92, { font: F(800, 18, CJK), color: it.fg, alpha: 0.75, align: 'right', ls: 3 });
  } else {
    const lt = t - 7.5;
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#120c3a'); g.addColorStop(1, '#2a3cf2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    bzBokeh(t, 1);
    bzAwning(0, E.outBack(seg(lt, 0, 0.35)), t);
    const p = E.outExpo(seg(lt, 0.12, 0.45));
    txt(ctx, '开一家店，', W / 2, 470 + (1 - p) * 30, { font: F(800, 72, CJK), align: 'center', ls: 8, alpha: p, color: '#ffe3c8' });
    txt(ctx, '卖你的灵感', W / 2, 640 + (1 - p) * 30, { font: F(900, 170, CJK), align: 'center', ls: 16, alpha: p, glow: 'rgba(255,120,70,.6)', glowR: 34 });
    // the five goods on a counter
    BZ_PLATES.forEach((pl, i) => {
      const it = PLATES[pl.p], q = E.outBack(seg(lt, 0.3 + i * 0.06, 0.6 + i * 0.06));
      if (q <= 0) return;
      const x = W / 2 + (i - 2) * 220, y = 850;
      ctx.save(); ctx.translate(x, y); ctx.scale(q, q);
      fillRR(ctx, -90, -70, 180, 140, 20, it.bg);
      ctx.save(); rr(ctx, -90, -70, 180, 140, 20); ctx.clip(); plateIcon(ctx, it.icon, 0, it.icon === 'face' ? 6 : -10, 0.22, t, it.fg); ctx.restore();
      txt(ctx, `¥${it.price}`, 0, 58, { font: F(900, 20), align: 'center', color: it.fg });
      ctx.restore();
    });
    fillRR(ctx, 120, 940, W - 240, 18, 9, '#8a5a34');
  }
}

/* ───────────────────────── the shop front (front elevation) ───────────────────────── */
const BZ_SLOTS = [[-120, -110], [120, -110], [340, -110], [-120, 40], [120, 40], [340, 40]];
const BZ_ITEMS = [0, 1, 3, 5, 4, 6];   // PLATES index per slot: face, voice, experience, art, culture, muse
function bzProduct(c, x, y, k, t, a = 1, swing = 0) {
  const it = PLATES[k];
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 16; c.shadowOffsetY = 8; fillRR(c, -70, -104, 140, 104, 16, it.bg); c.restore();
  c.save(); rr(c, -70, -104, 140, 104, 16); c.clip(); plateIcon(c, it.icon, 0, it.icon === 'face' ? -40 : -54, 0.2, t, it.fg); c.restore();
  // price tag hanging from the box
  c.save(); c.translate(56, -96); c.rotate(0.25 + Math.sin(t * 3 + k) * 0.06 + swing);
  line(c, 0, 0, 0, 26, '#e8d3a2', 1.5);
  fillRR(c, -40, 26, 80, 34, 8, '#fff6e6'); circle(c, 0, 33, 3, '#8a5a34');
  txt(c, `¥${it.price}`, 0, 53, { font: F(900, 16), align: 'center', color: '#1a1a2e' });
  c.restore();
  c.restore();
}
function bzShopFront(c, t, o) {
  // origin = centre of the shop front; ~1000 × 760 units
  const lit = o.lit === undefined ? 1 : o.lit;
  // glow
  glowDisc(c, 0, -60, 700, [255, 170, 90], 0.35 * lit);
  // posts
  fillRR(c, -490, -320, 28, 640, 6, '#6b3f2a'); fillRR(c, 462, -320, 28, 640, 6, '#6b3f2a');
  // back wall
  const wg = c.createLinearGradient(0, -240, 0, 200); wg.addColorStop(0, '#3a2d7a'); wg.addColorStop(1, '#241b55');
  fillRR(c, -460, -240, 920, 440, 10, wg);
  glowDisc(c, 0, -200, 420, [255, 200, 140], 0.2 * lit);
  // shelves
  for (const y of [-110, 40]) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 12; c.shadowOffsetY = 6; fillRR(c, -440, y, 880, 14, 4, '#c99a5a'); c.restore();
    fillRR(c, -440, y + 14, 880, 4, 2, '#8a5a34');
  }
  // products already on the shelves
  if (o.items) o.items(c);
  // shopkeeper behind the counter
  if (o.keeper > 0) { c.save(); c.translate(-320, 150 + (1 - o.keeper) * 80); c.globalAlpha *= clamp(o.keeper); frontFace(c, 0, 0, 0.62, t, BZ_KEEPERS[0]); c.restore(); }
  // counter
  const cg = c.createLinearGradient(0, 180, 0, 330); cg.addColorStop(0, '#9a6a3e'); cg.addColorStop(1, '#5e3a20');
  fillRR(c, -500, 180, 1000, 150, 12, cg);
  fillRR(c, -500, 180, 1000, 16, 6, '#c99a5a');
  for (let k = 0; k < 9; k++) line(c, -440 + k * 110, 210, -440 + k * 110, 316, 'rgba(0,0,0,.18)', 2);
  mark(c, -40, 228, 40);
  txt(c, '米麦集市', 30, 258, { font: F(900, 22, CJK), color: '#ffe3c8', ls: 4 });
  // awning (unrolls from the top)
  const au = o.awn === undefined ? 1 : o.awn;
  if (au > 0) {
    const n = 12, sw = 1040 / n, top = -340, hgt = 100 * au;
    for (let k = 0; k < n; k++) {
      const [A1, A2] = BZ_AWN[0];
      c.fillStyle = k % 2 ? A2 : A1; c.fillRect(-520 + k * sw, top, sw + 1, hgt);
      c.beginPath(); c.arc(-520 + k * sw + sw / 2, top + hgt, sw / 2, 0, Math.PI); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-520, top, 1040, 10);
    // string lights below the awning
    if (au >= 1) for (let k = 0; k <= 20; k++) {
      const x = -480 + k * 48, y = -210 + Math.sin(Math.PI * k / 20) * 22, col = BZ_AWN[k % 6][0];
      circle(c, x, y, 5, rgb(mix(hex(col), [255, 255, 255], 0.4), lit)); glowDisc(c, x, y, 20, hex(col), 0.45 * lit * (0.6 + 0.4 * Math.sin(t * 5 + k)));
    }
  }
  // sign with bulbs
  const su = o.sign === undefined ? 1 : o.sign;
  if (su > 0) {
    c.save(); c.translate(0, -400); c.scale(lerp(0.8, 1, E.outBack(clamp(su * 1.4))), lerp(0.8, 1, E.outBack(clamp(su * 1.4))));
    c.save(); c.shadowColor = 'rgba(255,150,60,.6)'; c.shadowBlur = 40 * su; fillRR(c, -330, -54, 660, 108, 18, '#1d1640'); c.restore();
    rr(c, -330, -54, 660, 108, 18); c.strokeStyle = '#e8c26a'; c.lineWidth = 4; c.stroke();
    const nb = 34;
    for (let k = 0; k < nb; k++) {
      const p = k / nb, per = 2 * 660 + 2 * 108;
      let d = p * per, bx, by;
      if (d < 660) { bx = -330 + d; by = -54; } else if ((d -= 660) < 108) { bx = 330; by = -54 + d; } else if ((d -= 108) < 660) { bx = 330 - d; by = 54; } else { d -= 660; bx = -330; by = 54 - d; }
      const on = su >= p ? 1 : 0.15;
      circle(c, bx, by, 5, on > 0.5 ? '#fff3c8' : 'rgba(255,240,200,.25)');
      if (on > 0.5) glowDisc(c, bx, by, 16, [255, 200, 120], 0.6 * (0.7 + 0.3 * Math.sin(t * 8 + k)));
    }
    txt(c, o.name || BZ_NAMES[0], 0, 18, { font: F(900, 54, CJK), align: 'center', color: '#ffe3a8', ls: 6, alpha: clamp(su * 1.6), glow: 'rgba(255,160,60,.9)', glowR: 20 });
    if (o.stats) txt(c, o.stats, 300, 44, { font: F(700, 14, CJK), align: 'right', color: 'rgba(255,230,190,.75)', alpha: clamp(su) });
    c.restore();
  }
  // opening ribbon, cut at o.cut
  const cu = o.cut === undefined ? 1 : o.cut;
  if (o.ribbon && cu < 1) {
    for (const sd of [-1, 1]) {
      c.save(); c.translate(0, 120);
      if (cu > 0) { c.rotate(sd * cu * 0.9); c.translate(sd * cu * 40, cu * cu * 400); }
      c.globalAlpha *= 1 - clamp(cu * 1.3 - 0.3);
      fillRR(c, sd > 0 ? 0 : -540, -18, 540, 36, 4, '#e0283c');
      c.restore();
    }
    if (cu <= 0) {
      c.save(); c.translate(0, 120);
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 40, 0, 46, 26, sd * 0.3, 0, 7); c.fillStyle = '#c81e32'; c.fill(); }
      circle(c, 0, 0, 20, '#ff4057');
      c.restore();
    }
  }
}
function bzConfetti(x, y, u, n = 90, seed = 3) {
  if (u <= 0 || u >= 1) return;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const an = -Math.PI / 2 + (r() - 0.5) * 2.6, sp = 500 + r() * 700, col = BZ_AWN[i % 6][0];
    const px = x + Math.cos(an) * sp * u, py = y + Math.sin(an) * sp * u + 900 * u * u;
    ctx.save(); ctx.translate(px, py); ctx.rotate(u * 12 * (r() - 0.5)); ctx.globalAlpha = 1 - u;
    ctx.fillStyle = col; ctx.fillRect(-6, -3, 12, 6); ctx.restore();
  }
}

/* ───────────────────────── 9–18 · 01 open a shop ───────────────────────── */
function bzPanel(x, y, w, h, title, sub) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; fillRR(ctx, x, y, w, h, 26, '#fbfaf6'); ctx.restore();
  mark(ctx, x + 28, y + 26, 30);
  txt(ctx, title, x + 86, y + 52, { font: F(900, 26, CJK), color: '#1a1a2e' });
  if (sub) txt(ctx, sub, x + w - 28, y + 52, { font: F(600, 14, CJK), color: 'rgba(26,26,46,.5)', align: 'right' });
  line(ctx, x + 28, y + 80, x + w - 28, y + 80, 'rgba(26,26,46,.08)', 1.5);
}
function bzOpenShop(t) {
  const lt = t - 9;
  bzSky(t, 1); bzBokeh(t, 1);
  // camera: start close on the sign, pull back, punch in at the ribbon cut
  const z = lerp(1.45, 0.82, E.inOutCubic(seg(lt, 0.3, 2.6))) + 0.06 * Math.sin(Math.PI * seg(lt, 6.4, 7.4));
  const cy = lerp(-330, 0, E.inOutCubic(seg(lt, 0.3, 2.6)));
  const shake = (1 - seg(lt, 6.6, 7.0)) * (lt > 6.6 ? 10 : 0);
  ctx.save(); ctx.translate(880 + (hash(Math.floor(t * 30)) - 0.5) * shake, 620); ctx.scale(z, z); ctx.translate(0, -cy);
  bzShopFront(ctx, t, {
    awn: E.outBack(seg(lt, 0.2, 1.2)), sign: seg(lt, 1.8, 2.6), keeper: E.outBack(seg(lt, 2.8, 3.4)),
    ribbon: true, cut: E.inCubic(seg(lt, 6.6, 7.6)),
    items: (c) => { if (lt > 7.4) [0, 1, 3].forEach((k, i) => { const q = E.outBack(seg(lt, 7.5 + i * 0.15, 7.9 + i * 0.15)); if (q > 0) bzProduct(c, BZ_SLOTS[i][0], BZ_SLOTS[i][1], k, t, clamp(q)); }); },
  });
  ctx.restore();
  bzConfetti(880, 660, seg(lt, 6.6, 8.4), 120, 5);
  const ka = seg(lt, 6.7, 7.0) * (1 - seg(lt, 8.0, 8.4));
  if (ka > 0) { ctx.save(); ctx.translate(880, 560); ctx.rotate(-0.08); ctx.scale(lerp(1.6, 1, E.outExpo(ka)), lerp(1.6, 1, E.outExpo(ka))); txt(ctx, '开张大吉', 0, 0, { font: F(900, 90, CJK), align: 'center', color: '#ffe3a8', alpha: ka, glow: 'rgba(255,120,60,.9)', glowR: 30, ls: 10 }); ctx.restore(); }
  // the shop-opening app
  const pu = E.outExpo(seg(lt, 0.4, 1.1));
  if (pu > 0) {
    const X = 1340 + (1 - pu) * 120, Y = 150, PW = 480, PH = 720;
    ctx.save(); ctx.globalAlpha = pu;
    bzPanel(X, Y, PW, PH, '开店', '3 步完成');
    // 1 name (typed)
    const name = BZ_NAMES[0], nt = Math.floor(name.length * seg(lt, 0.8, 1.9));
    txt(ctx, '① 店铺名称', X + 28, Y + 124, { font: F(700, 15, CJK), color: 'rgba(26,26,46,.55)' });
    fillRR(ctx, X + 28, Y + 138, PW - 56, 54, 14, '#f0eef8');
    txt(ctx, name.slice(0, nt) + (lt < 2.2 && Math.floor(lt * 4) % 2 ? '|' : ''), X + 46, Y + 174, { font: F(800, 22, CJK), color: '#1a1a2e' });
    // 2 avatar
    txt(ctx, '② 店主头像', X + 28, Y + 232, { font: F(700, 15, CJK), color: 'rgba(26,26,46,.55)' });
    for (let k = 0; k < 4; k++) {
      const ax = X + 66 + k * 104, ay = Y + 300, sel = lt > 2.6 && k === 0;
      ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 40, 0, 7); ctx.fillStyle = ['#2a3cf2', '#1f6b5a', '#7a3cff', '#c0392b'][k]; ctx.fill(); ctx.clip();
      frontFace(ctx, ax, ay + 18, 0.22, t, BZ_KEEPERS[[0, 1, 2, 3][k]]); ctx.restore();
      if (sel) { ring(ctx, ax, ay, 46, '#ff5a3c', 4); circle(ctx, ax + 30, ay - 30, 12, '#19d68c'); check(ctx, ax + 30, ay - 29, 0.6, '#fff', 2.6); }
    }
    ripple(ctx, X + 66, Y + 300, seg(lt, 2.6, 3.1), [255, 90, 60]);
    // 3 categories
    txt(ctx, '③ 主营', X + 28, Y + 382, { font: F(700, 15, CJK), color: 'rgba(26,26,46,.55)' });
    let cx = X + 28;
    ['肖像', '声音', '经验', '作品', '文化资产'].forEach((s, k) => {
      const on = lt > 3.5 + k * 0.25 && k < 3;
      const wd = tw(ctx, s, F(700, 16, CJK)) + 30;
      fillRR(ctx, cx, Y + 398, wd, 40, 20, on ? '#1a1a2e' : '#f0eef8');
      txt(ctx, s, cx + wd / 2, Y + 424, { font: F(700, 16, CJK), color: on ? '#fff' : 'rgba(26,26,46,.6)', align: 'center' });
      cx += wd + 10;
    });
    fillRR(ctx, X + 28, Y + 462, PW - 56, 52, 14, '#eafaf3');
    circle(ctx, X + 56, Y + 488, 12, '#19d68c'); check(ctx, X + 56, Y + 489, 0.6, '#fff', 2.6);
    txt(ctx, '收款 · 平台托管，自动结算', X + 78, Y + 494, { font: F(700, 16, CJK), color: '#0f7a55' });
    // button
    const pressed = lt >= 6.4, pr = 1 - 0.05 * Math.sin(Math.PI * seg(lt, 6.3, 6.6));
    ctx.save(); ctx.translate(X + PW / 2, Y + 566); ctx.scale(pr, pr);
    const bg = ctx.createLinearGradient(-200, 0, 200, 0); bg.addColorStop(0, '#ff5a3c'); bg.addColorStop(1, '#ff4fa3');
    fillRR(ctx, -(PW - 56) / 2, -30, PW - 56, 60, 30, pressed ? '#19d68c' : bg);
    txt(ctx, pressed ? '已开张 ✓' : '一键开店', 0, 9, { font: F(900, 24, CJK), align: 'center' });
    ctx.restore();
    ripple(ctx, X + PW / 2, Y + 566, seg(lt, 6.4, 7.0), [255, 255, 255]);
    if (lt > 5.4 && lt < 6.6) cursor(ctx, lerp(X + PW + 60, X + PW / 2 + 20, E.inOutCubic(seg(lt, 5.4, 6.2))), lerp(Y + PH + 40, Y + 572, E.inOutCubic(seg(lt, 5.4, 6.2))), Math.sin(Math.PI * seg(lt, 6.25, 6.5)));
    // mini map: a new pin drops
    const mx = X + 28, my = Y + 620, mw = PW - 56, mh = 80;
    fillRR(ctx, mx, my, mw, mh, 14, '#141039');
    const r = rng(9);
    for (let k = 0; k < 70; k++) circle(ctx, mx + 12 + r() * (mw - 24), my + 10 + r() * (mh - 20), 2.2, `rgba(255,200,120,${0.3 + r() * 0.5})`);
    const pin = E.outBack(seg(lt, 7.2, 7.7));
    if (pin > 0) {
      const px = mx + mw * 0.62, py = my + mh * 0.55 - (1 - pin) * 40;
      circle(ctx, px, py - 10, 10, '#ff5a3c'); ctx.beginPath(); ctx.moveTo(px - 8, py - 6); ctx.lineTo(px, py + 8); ctx.lineTo(px + 8, py - 6); ctx.fillStyle = '#ff5a3c'; ctx.fill();
      ring(ctx, px, py + 6, 10 + seg(lt, 7.6, 8.4) * 26, `rgba(255,90,60,${1 - seg(lt, 7.6, 8.4)})`, 2);
      txt(ctx, '第 52,318 家店', mx + 16, my + 28, { font: F(800, 16, CJK), color: '#ffe3a8', alpha: clamp(pin) });
    }
    ctx.restore();
  }
}

/* ───────────────────────── 18–27 · 02 list your assets ───────────────────────── */
function bzList(t) {
  const lt = t - 18;
  bzSky(t, 1); bzBokeh(t, 1);
  const land = (i) => 0.9 + i * 0.95;           // landing time of item i
  let k = 0; for (let i = 0; i < 6; i++) if (lt >= land(i) - 0.6) k = i;
  // camera dollies along the shelves toward the slot being filled
  const tgt = BZ_SLOTS[k];
  const z = 1.0 + 0.12 * Math.sin(Math.PI * clamp((lt - 0.4) / 6.4));
  const camX = lerp(0, tgt[0] * 0.35, seg(lt, 0.5, 1.2)), camY = lerp(0, tgt[1] * 0.3, seg(lt, 0.5, 1.2));
  ctx.save(); ctx.translate(890, 640); ctx.scale(z * 0.8, z * 0.8); ctx.translate(-camX, -camY);
  bzShopFront(ctx, t, {
    keeper: 1, stats: `★ 4.9 · 关注 ${(1.2 + seg(lt, 0, 9) * 0.6).toFixed(1)}k`,
    items: (c) => {
      BZ_ITEMS.forEach((it, i) => {
        const L = land(i);
        if (lt < L - 0.6) return;
        const u = E.inOutCubic(seg(lt, L - 0.6, L));
        const [sx, sy] = BZ_SLOTS[i];
        const fx = 900, fy = -420;           // flies in from upper right
        const x = lerp(fx, sx, u), y = lerp(fy, sy, u) - Math.sin(u * Math.PI) * 160;
        const bounce = lt > L ? Math.exp(-(lt - L) * 7) * Math.sin((lt - L) * 30) * 10 : 0;
        bzProduct(c, x, y - bounce, it, t, 1, lt > L ? Math.exp(-(lt - L) * 4) * Math.sin((lt - L) * 16) * 0.4 : 0);
      });
    },
  });
  ctx.restore();
  // listing editor
  const pu = E.outExpo(seg(lt, 0.3, 0.9));
  if (pu > 0) {
    const X = 1340 + (1 - pu) * 120, Y = 150, PW = 480, PH = 720;
    ctx.save(); ctx.globalAlpha = pu;
    bzPanel(X, Y, PW, PH, '上架商品', `${BZ_ITEMS.filter((_, i) => lt >= land(i)).length} / 6`);
    const it = PLATES[BZ_ITEMS[k]];
    const ku = seg(lt, land(k) - 0.6, land(k) - 0.3);
    ctx.save(); ctx.globalAlpha *= ku;
    fillRR(ctx, X + 28, Y + 104, 140, 140, 20, it.bg);
    ctx.save(); rr(ctx, X + 28, Y + 104, 140, 140, 20); ctx.clip(); plateIcon(ctx, it.icon, X + 98, Y + 174 + (it.icon === 'face' ? 30 : 0), 0.28, t, it.fg); ctx.restore();
    txt(ctx, it.file.split(' · ')[0], X + 190, Y + 146, { font: F(900, 24, CJK), color: '#1a1a2e' });
    fillRR(ctx, X + 190, Y + 162, 96, 30, 15, '#f0eef8'); txt(ctx, it.kind, X + 238, Y + 183, { font: F(700, 14, CJK), color: '#4a4080', align: 'center' });
    txt(ctx, it.file.split(' · ').slice(1).join(' · ') || '原创', X + 190, Y + 228, { font: F(500, 14, CJK), color: 'rgba(26,26,46,.5)' });
    // price slider
    const pv = parseInt(it.price.replace(',', ''), 10), pu2 = E.outCubic(seg(lt, land(k) - 0.55, land(k) - 0.1));
    txt(ctx, '单次价格', X + 28, Y + 296, { font: F(700, 15, CJK), color: 'rgba(26,26,46,.55)' });
    txt(ctx, `¥ ${Math.round(pv * pu2 / 10) * 10}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','), X + PW - 28, Y + 300, { font: F(900, 34), color: '#1a1a2e', align: 'right' });
    fillRR(ctx, X + 28, Y + 322, PW - 56, 10, 5, '#ece9f7');
    const kx = X + 28 + (PW - 56) * clamp(pv / 4000) * pu2;
    fillRR(ctx, X + 28, Y + 322, kx - X - 28, 10, 5, '#ffc934'); circle(ctx, kx, Y + 327, 14, '#fff'); ring(ctx, kx, Y + 327, 14, '#ffc934', 4);
    ctx.restore();
    // licence + ownership
    [['授权方式', '使用权 · 按次'], ['所有权', '永远归你'], ['每次使用', '需要你同意']].forEach(([a, b], i) => {
      const y = Y + 380 + i * 58;
      fillRR(ctx, X + 28, y, PW - 56, 46, 12, '#f6f5fb');
      txt(ctx, a, X + 46, y + 30, { font: F(600, 15, CJK), color: 'rgba(26,26,46,.55)' });
      txt(ctx, b, X + PW - 46, y + 30, { font: F(800, 16, CJK), color: i === 1 ? '#0f9d6e' : '#1a1a2e', align: 'right' });
    });
    // listed items
    BZ_ITEMS.forEach((pi, i) => {
      const it2 = PLATES[pi], on = lt >= land(i), x = X + 28 + i * 72, y = Y + 572;
      fillRR(ctx, x, y, 60, 60, 14, on ? it2.bg : '#f0eef8');
      if (on) { ctx.save(); rr(ctx, x, y, 60, 60, 14); ctx.clip(); plateIcon(ctx, it2.icon, x + 30, y + 30 + (it2.icon === 'face' ? 12 : 0), 0.12, t, it2.fg); ctx.restore(); circle(ctx, x + 54, y + 6, 9, '#19d68c'); check(ctx, x + 54, y + 7, 0.45, '#fff', 2.4); }
    });
    const bp2 = lt >= land(k) && lt < land(k) + 0.4;
    const bg = ctx.createLinearGradient(X, 0, X + PW, 0); bg.addColorStop(0, '#ffc934'); bg.addColorStop(1, '#ff8a3c');
    fillRR(ctx, X + 28, Y + 650, PW - 56, 50, 25, bp2 ? '#19d68c' : bg);
    txt(ctx, bp2 ? '已上架 ✓' : '上架', X + PW / 2, Y + 683, { font: F(900, 22, CJK), align: 'center', color: '#1a1a2e' });
    ctx.restore();
  }
}

/* ───────────────────────── 27–37 · 03 browse & buy ───────────────────────── */
function bzBrowse(t) {
  const lt = t - 27;
  bzSky(t);
  // camera path through the bazaar: street fly-through → overview with search → swoop to the shop → pull out
  const K = [[0, 0.6, 8.2, 1.55, 0.06], [2.4, 2.4, 8.2, 1.45, 0.03], [3.2, 4.6, 4.6, 0.95, 0], [4.6, 4.6, 4.6, 0.95, 0], [5.4, 3.6, 4.6, 1.6, -0.02], [8.0, 3.7, 4.5, 1.6, -0.02], [9.4, 5, 5, 0.8, 0], [10, 5, 5, 0.78, 0]];
  let i = 0; while (i < K.length - 2 && lt > K[i + 1][0]) i++;
  const [a, i0, j0, z0, r0] = K[i], [b, i1, j1, z1, r1] = K[i + 1], u = E.inOutCubic(seg(lt, a, b));
  const cam = { i: lerp(i0, i1, u), j: lerp(j0, j1, u), z: lerp(z0, z1, u), r: lerp(r0, r1, u) };
  const search = seg(lt, 2.6, 3.4) * (1 - seg(lt, 5.0, 5.4));
  const hl = (s) => (s.goods.includes(0) ? search * (0.6 + 0.4 * Math.sin(lt * 6)) : 0);
  // during the search and the swoop, other shops' signs step back so the hero shop reads
  const focus = Math.max(search, seg(lt, 4.6, 5.2) * (1 - seg(lt, 8.6, 9.2)));
  const hero = (s) => s.i === 4 && s.j === 4;
  const la = (s) => (hero(s) ? 1 : lerp(1, s.goods.includes(0) ? 0.75 : 0.2, focus));
  const pinU = seg(lt, 4.8, 5.3) * (1 - seg(lt, 8.6, 9.0));
  bzBazaar(t, cam, {
    trades: 0.5 + 0.5 * seg(lt, 7.8, 8.6), hl, la,
    after: () => {
      if (pinU <= 0) return;
      const [x, y] = bzP(4, 4, 260 + Math.sin(lt * 4) * 8);
      ctx.save(); ctx.globalAlpha = pinU;
      const [gx, gy] = bzP(4, 4, 0);
      for (let k = 0; k < 2; k++) { const r2 = ((lt * 0.8 + k * 0.5) % 1); ctx.beginPath(); ctx.ellipse(gx, gy, 60 + r2 * 120, (60 + r2 * 120) / 2, 0, 0, 7); ctx.strokeStyle = `rgba(255,90,60,${1 - r2})`; ctx.lineWidth = 3; ctx.stroke(); }
      circle(ctx, x, y - 22, 22, '#ff5a3c'); ctx.beginPath(); ctx.moveTo(x - 18, y - 12); ctx.lineTo(x, y + 14); ctx.lineTo(x + 18, y - 12); ctx.fillStyle = '#ff5a3c'; ctx.fill();
      circle(ctx, x, y - 22, 9, '#fff');
      ctx.restore();
    },
  });
  // buyer badge
  const bb = seg(lt, 0.4, 0.9);
  if (bb > 0) {
    ctx.save(); ctx.globalAlpha = bb;
    fillRR(ctx, W - 380, 110, 320, 72, 36, 'rgba(10,12,34,.85)');
    ctx.save(); ctx.beginPath(); ctx.arc(W - 344, 146, 26, 0, 7); ctx.fillStyle = '#1f6b5a'; ctx.fill(); ctx.clip(); frontFace(ctx, W - 344, 158, 0.15, t, BZ_KEEPERS[5]); ctx.restore();
    txt(ctx, '买家 · 星河影业', W - 306, 140, { font: F(800, 18, CJK) });
    txt(ctx, '正在逛集市…', W - 306, 164, { font: F(500, 14, CJK), color: 'rgba(255,255,255,.6)' });
    ctx.restore();
  }
  // search bar
  if (search > 0) {
    ctx.save(); ctx.globalAlpha = search; ctx.translate(0, (1 - search) * -30);
    fillRR(ctx, W / 2 - 360, 110, 720, 70, 35, 'rgba(255,255,255,.96)');
    ring(ctx, W / 2 - 316, 144, 13, '#ff5a3c', 3.5); line(ctx, W / 2 - 306, 154, W / 2 - 297, 163, '#ff5a3c', 3.5);
    const q = '肖像'.slice(0, Math.ceil(2 * seg(lt, 2.8, 3.2)));
    txt(ctx, q, W / 2 - 280, 155, { font: F(800, 26, CJK), color: '#1a1a2e' });
    txt(ctx, `${Math.round(3268 * seg(lt, 3.2, 4.2)).toLocaleString()} 家店在卖`, W / 2 + 330, 154, { font: F(700, 18, CJK), color: '#ff5a3c', align: 'right' });
    ctx.restore();
  }
  // product sheet at the hero shop
  const pu = E.outBack(seg(lt, 5.5, 6.0)) * (1 - E.inCubic(seg(lt, 8.6, 9.0)));
  if (pu > 0) {
    const X = 1220, Y = 210, PW = 520, PH = 600;
    ctx.save(); ctx.globalAlpha = clamp(pu); ctx.translate(X + PW / 2, Y + PH / 2); ctx.scale(lerp(0.85, 1, pu), lerp(0.85, 1, pu)); ctx.translate(-X - PW / 2, -Y - PH / 2);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; fillRR(ctx, X, Y, PW, PH, 26, '#fbfaf6'); ctx.restore();
    ctx.save(); rr(ctx, X, Y, PW, 250, 26); ctx.clip(); ctx.fillStyle = '#2a3cf2'; ctx.fillRect(X, Y, PW, 250); frontFace(ctx, X + PW / 2, Y + 168, 0.5, t, BZ_KEEPERS[0]); ctx.restore();
    fillRR(ctx, X + 20, Y + 20, 170, 36, 18, 'rgba(10,12,34,.7)'); txt(ctx, BZ_NAMES[0], X + 105, Y + 44, { font: F(800, 14, CJK), align: 'center' });
    txt(ctx, '林夏 · 正脸肖像', X + 30, Y + 300, { font: F(900, 28, CJK), color: '#1a1a2e' });
    txt(ctx, '★ 4.9 · 已售 386 次 · 使用权', X + 30, Y + 334, { font: F(600, 16, CJK), color: 'rgba(26,26,46,.55)' });
    txt(ctx, '¥ 2,000', X + 30, Y + 404, { font: F(900, 52), color: '#1a1a2e' });
    txt(ctx, '/ 次', X + 230, Y + 404, { font: F(600, 20, CJK), color: 'rgba(26,26,46,.55)' });
    const paid = lt >= 7.4, buying = lt >= 6.6;
    if (!buying) {
      const bg = ctx.createLinearGradient(X, 0, X + PW, 0); bg.addColorStop(0, '#ff5a3c'); bg.addColorStop(1, '#ff4fa3');
      fillRR(ctx, X + 30, Y + 450, PW - 60, 64, 32, bg); txt(ctx, '立即购买', X + PW / 2, Y + 492, { font: F(900, 24, CJK), align: 'center' });
    } else {
      fillRR(ctx, X + 30, Y + 440, PW - 60, 130, 20, paid ? '#eafaf3' : '#f6f5fb');
      txt(ctx, paid ? '支付成功 · 资金已托管' : '确认支付', X + 54, Y + 480, { font: F(900, 22, CJK), color: paid ? '#0f7a55' : '#1a1a2e' });
      txt(ctx, '平台托管 · 店主同意后交付', X + 54, Y + 512, { font: F(600, 15, CJK), color: 'rgba(26,26,46,.55)' });
      if (paid) { circle(ctx, X + PW - 70, Y + 500, 22, '#19d68c'); check(ctx, X + PW - 70, Y + 501, 1, '#fff', 3.5, seg(lt, 7.4, 7.7)); }
      else { fillRR(ctx, X + PW - 190, Y + 520, 140, 40, 20, '#1a1a2e'); txt(ctx, '支付 ¥2,000', X + PW - 120, Y + 546, { font: F(800, 16, CJK), align: 'center' }); }
    }
    ctx.restore();
    if (lt > 6.0 && lt < 7.5) {
      const c1 = E.inOutCubic(seg(lt, 6.0, 6.5)), c2 = E.inOutCubic(seg(lt, 6.9, 7.3));
      const cx = lt < 6.8 ? lerp(W - 80, X + PW / 2, c1) : lerp(X + PW / 2, X + PW - 120, c2), cy = lt < 6.8 ? lerp(H - 40, Y + 486, c1) : lerp(Y + 486, Y + 542, c2);
      cursor(ctx, cx, cy, Math.sin(Math.PI * seg(lt, 6.5, 6.7)) + Math.sin(Math.PI * seg(lt, 7.3, 7.45)));
    }
    ripple(ctx, X + PW / 2, Y + 486, seg(lt, 6.55, 7.1), [255, 255, 255]);
  }
  // the coin flies from the buyer into the shop
  const cf = seg(lt, 7.5, 8.2);
  if (cf > 0 && cf < 1) {
    const [sx, sy] = bzWorld(4, 4, 160, cam);
    const u2 = E.inOutCubic(cf), x = lerp(W - 220, sx, u2), y = lerp(150, sy, u2) - Math.sin(u2 * Math.PI) * 200;
    coin(ctx, x, y, 30); glowDisc(ctx, x, y, 90, [255, 200, 90], 0.5);
  }
  const pop = seg(lt, 8.2, 9.2);
  if (pop > 0 && pop < 1) { const [sx, sy] = bzWorld(4, 4, 200, cam); txt(ctx, '+¥2,000', sx, sy - pop * 60, { font: F(900, 54), align: 'center', color: '#ffe3a8', alpha: 1 - pop * pop, glow: 'rgba(255,170,60,.9)', glowR: 24 }); }
  // today's totals once we pull out
  const tu = seg(lt, 8.6, 9.2);
  if (tu > 0) {
    ctx.save(); ctx.globalAlpha = tu;
    fillRR(ctx, W / 2 - 360, H - 190, 720, 110, 24, 'rgba(10,12,34,.85)');
    txt(ctx, '今日成交', W / 2 - 320, H - 128, { font: F(700, 18, CJK), color: 'rgba(255,255,255,.6)' });
    txt(ctx, `${Math.round(lerp(12000, 12486, seg(lt, 8.6, 10))).toLocaleString()} 笔`, W / 2 - 320, H - 96, { font: F(900, 30), color: '#fff' });
    txt(ctx, '成交额', W / 2 + 60, H - 128, { font: F(700, 18, CJK), color: 'rgba(255,255,255,.6)' });
    txt(ctx, `¥ ${Math.round(lerp(3500000, 3624000, seg(lt, 8.6, 10))).toLocaleString()}`, W / 2 + 60, H - 96, { font: F(900, 30), color: '#ffe3a8' });
    ctx.restore();
  }
}

/* ───────────────────────── 37–46 · 04 safe trade ───────────────────────── */
const BZ_FLOW = [
  { t: '买家下单', s: '星河影业 · ¥2,000', icon: 'buyer', col: '#ff5a3c' },
  { t: '平台托管', s: '资金锁在保险箱里', icon: 'vault', col: '#2a3cf2' },
  { t: '店主同意', s: '你点头，才交付', icon: 'yes', col: '#ff4fa3' },
  { t: '交付使用权', s: '使用 1 次 · 48 小时', icon: 'deliver', col: '#19e3a6' },
  { t: '自动结算', s: '店主 +¥1,950 · 服务费 ¥50', icon: 'settle', col: '#ffc934' },
];
function bzTrade(t) {
  const lt = t - 37;
  bzSky(t); bzBokeh(t, 0.5);
  const NX = (k) => k * 640, NY = 0;
  // camera pans along the flow, then pulls back to show all five steps
  const at = [0.6, 1.8, 3.4, 4.8, 6.2];
  let k = 0; for (let i = 0; i < 5; i++) if (lt >= at[i] - 0.5) k = i;
  const panX = lerp(NX(Math.max(0, k - 1)), NX(k), E.inOutCubic(seg(lt, at[k] - 0.5, at[k])));
  const ov = E.inOutCubic(seg(lt, 7.2, 8.2));
  const camX = lerp(panX, NX(2), ov), z = lerp(1.15, 0.52, ov);
  const tilt = lerp(-0.05, 0, ov) + Math.sin(lt * 0.6) * 0.01;
  ctx.save(); ctx.translate(W / 2, H / 2 + 60); ctx.rotate(tilt); ctx.scale(z, z); ctx.translate(-camX, -NY);
  // track
  ctx.save(); ctx.setLineDash([16, 14]); ctx.lineDashOffset = -lt * 80;
  line(ctx, NX(0), NY, NX(4), NY, 'rgba(255,255,255,.25)', 5); ctx.restore();
  BZ_FLOW.forEach((n, i) => {
    const on = lt >= at[i];
    const u = E.outBack(seg(lt, at[i] - 0.6, at[i] - 0.1));
    ctx.save(); ctx.translate(NX(i), NY); ctx.scale(lerp(0.7, 1, u), lerp(0.7, 1, u));
    // card with a fake 3D tilt (vertical skew)
    ctx.transform(1, (i - k) * 0.03 * (1 - ov), 0, 1, 0, 0);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; fillRR(ctx, -220, -230, 440, 460, 30, on ? '#fbfaf6' : 'rgba(251,250,246,.35)'); ctx.restore();
    fillRR(ctx, -220, -230, 440, 200, 30, n.col); ctx.fillRect(-220, -60, 440, 30);
    txt(ctx, `STEP 0${i + 1}`, -190, -186, { font: F(700, 18, MONO), color: n.col === '#ffc934' || n.col === '#19e3a6' ? '#1a1a2e' : '#ffffff', alpha: 0.8 });
    // step icon
    ctx.save(); ctx.translate(0, -100);
    if (n.icon === 'buyer') { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 62, 0, 7); ctx.fillStyle = '#1f6b5a'; ctx.fill(); ctx.clip(); frontFace(ctx, 0, 30, 0.36, t, BZ_KEEPERS[5]); ctx.restore(); }
    if (n.icon === 'vault') { fillRR(ctx, -70, -60, 140, 120, 20, '#19e3a6'); circle(ctx, 0, -2, 34, '#f4efe4'); ring(ctx, 0, -2, 34, '#121a46', 5); circle(ctx, 0, -2, 9, '#121a46'); const lk = seg(lt, at[1], at[1] + 0.4); lockIcon(ctx, 62, 48 - (1 - lk) * 10, 1.1, '#121a46'); }
    if (n.icon === 'yes') { fillRR(ctx, -44, -70, 88, 140, 16, '#1d1640'); fillRR(ctx, -36, -58, 72, 116, 10, '#ff8bd0'); const y2 = seg(lt, at[2], at[2] + 0.4); circle(ctx, 0, 0, 24, y2 > 0 ? '#19d68c' : 'rgba(255,255,255,.4)'); if (y2 > 0) check(ctx, 0, 1, 1.1, '#fff', 4, y2); }
    if (n.icon === 'deliver') { fillRR(ctx, -70, -50, 140, 110, 12, '#c99a5a'); fillRR(ctx, -70, -50, 140, 26, 8, '#e0b878'); line(ctx, 0, -50, 0, 60, '#8a5a34', 6); keyIcon(ctx, -40, 10, 0.5, '#ffc934', '#1a1a2e', 3); }
    if (n.icon === 'settle') { for (let c2 = 0; c2 < 5; c2++) coin(ctx, -60 + c2 * 30, 20 - c2 * 6 - Math.abs(Math.sin(lt * 4 + c2)) * 6 * seg(lt, at[4], at[4] + 1), 24); }
    ctx.restore();
    txt(ctx, n.t, 0, 60, { font: F(900, 40, CJK), align: 'center', color: '#1a1a2e' });
    txt(ctx, n.s, 0, 104, { font: F(700, 20, CJK), align: 'center', color: 'rgba(26,26,46,.6)' });
    if (on) { circle(ctx, 0, 176, 26, '#19d68c'); check(ctx, 0, 177, 1.1, '#fff', 4, seg(lt, at[i], at[i] + 0.3)); }
    ctx.restore();
  });
  // tokens moving along the track: the coin into escrow, the key out to the buyer, the split at settlement
  const c1 = seg(lt, 0.9, 1.8);
  if (c1 > 0 && c1 < 1) { const x = lerp(NX(0), NX(1), E.inOutCubic(c1)); coin(ctx, x, NY - Math.sin(c1 * Math.PI) * 160, 34); }
  const d1 = seg(lt, 3.8, 4.8);
  if (d1 > 0 && d1 < 1) { const x = lerp(NX(2), NX(3), E.inOutCubic(d1)); keyIcon(ctx, x - 20, NY - Math.sin(d1 * Math.PI) * 160, 0.7, '#ffc934', '#1a1a2e', 3); }
  const s1 = seg(lt, 5.4, 6.2);
  if (s1 > 0 && s1 < 1) { const x = lerp(NX(1), NX(4), E.inOutCubic(s1)); coin(ctx, x, NY - 280 - Math.sin(s1 * Math.PI) * 120, 34); }
  const sp = seg(lt, 6.2, 7.2);
  if (sp > 0) {
    const big = E.outCubic(sp);
    ctx.save(); ctx.globalAlpha = 1 - seg(lt, 7.6, 8.0);
    txt(ctx, '+¥1,950 → 店主', NX(4) + 260, NY - 140 - big * 30, { font: F(900, 44, CJK), color: '#ffe3a8', glow: 'rgba(255,170,60,.9)', glowR: 20, alpha: clamp(sp * 2) });
    txt(ctx, '¥50 → 平台服务费 2.5%', NX(4) + 260, NY - 80 - big * 20, { font: F(700, 24, CJK), color: 'rgba(255,255,255,.75)', alpha: clamp(sp * 2 - 0.4) });
    ctx.restore();
  }
  ctx.restore();
  // headline
  const hu = E.outExpo(seg(lt, 0.3, 0.9)) * (1 - E.inCubic(seg(lt, 8.6, 9.0)));
  if (hu > 0) {
    ctx.save(); ctx.globalAlpha = hu;
    txt(ctx, '钱先托管，你点头才交付', W - 90, 220, { font: F(900, 52, CJK), align: 'right', ls: 4, glow: 'rgba(0,0,0,.6)', glowR: 16 });
    txt(ctx, 'ESCROW FIRST · DELIVERED ONLY ON YOUR YES', W - 90, 258, { font: F(700, 16), align: 'right', ls: 4, color: 'rgba(255,255,255,.6)' });
    ctx.restore();
  }
}

/* ───────────────────────── 46–54 · 05 everyone owns a shop ───────────────────────── */
function bzEveryone(t) {
  const lt = t - 46;
  bzSky(t);
  // a huge map of tiny shops lighting up in waves
  const z = lerp(1.4, 0.55, E.inOutCubic(seg(lt, 0, 6.5)));
  ctx.save(); ctx.translate(W / 2, H / 2 + 40); ctx.scale(z, z); ctx.rotate(lerp(0.05, -0.02, seg(lt, 0, 8)));
  const N = 34, tw2 = 60, th2 = 30;
  for (let s = 0; s < 2 * N; s++) for (let i = 0; i < N; i++) {
    const j = s - i; if (j < 0 || j >= N) continue;
    if (i % 5 === 2 || j % 6 === 4) continue;
    const x = (i - j) * tw2 / 2, y = (i + j - N) * th2 / 2;
    const d = Math.hypot(i - N / 2, j - N / 2);
    const l = E.outCubic(seg(lt, d * 0.12, d * 0.12 + 0.4));
    const col = BZ_AWN[(i * 3 + j) % 6][0];
    ctx.beginPath(); ctx.moveTo(x, y - th2 / 2); ctx.lineTo(x + tw2 / 2, y); ctx.lineTo(x, y + th2 / 2); ctx.lineTo(x - tw2 / 2, y); ctx.closePath();
    ctx.fillStyle = bzDim(col, l * 0.85); ctx.fill();
    if (l > 0.5) { circle(ctx, x, y - 10, 3, '#fff3c8'); if ((i + j) % 7 === 0) glowDisc(ctx, x, y - 10, 30, hex(col), 0.4 * l); }
  }
  ctx.restore();
  glowDisc(ctx, W / 2, H / 2, 640, [5, 7, 20], 0.55);
  // shopkeepers on an orbit
  const n = BZ_KEEPERS.length;
  BZ_KEEPERS.forEach((kp, i) => {
    const an = i / n * Math.PI * 2 + lt * 0.35, x = W / 2 + Math.cos(an) * 680, y = H / 2 - 30 + Math.sin(an) * 215;
    const dep = 0.65 + 0.35 * (Math.sin(an) + 1) / 2, q = E.outBack(seg(lt, 0.6 + i * 0.1, 1.0 + i * 0.1));
    if (q <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(q * dep, q * dep);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fillStyle = BZ_AWN[i % 6][0]; ctx.fill(); ctx.clip(); frontFace(ctx, 0, 40, 0.38, t, kp); ctx.restore();
    ring(ctx, 0, 0, 72, '#ffffff', 3);
    const nm = BZ_NAMES[(i * 3 + 1) % BZ_NAMES.length];
    ctx.font = F(800, 18, CJK); const wd = ctx.measureText(nm).width + 28;
    fillRR(ctx, -wd / 2, 84, wd, 34, 17, 'rgba(10,12,34,.85)'); txt(ctx, nm, 0, 107, { font: F(800, 18, CJK), align: 'center' });
    const pp = ((lt + i * 0.43) % 1.8) / 1.8;
    if (pp < 0.5) txt(ctx, `+¥${[800, 2000, 1500, 600, 3800, 1200, 2600][i % 7].toLocaleString()}`, 0, -86 - pp * 60, { font: F(900, 24), align: 'center', color: '#ffe3a8', alpha: 1 - pp * 2 });
    ctx.restore();
  });
  // headline + totals
  const hu = E.outExpo(seg(lt, 0.2, 0.8));
  txt(ctx, '每个人，都是店主', W / 2, H / 2 + 20, { font: F(900, 110, CJK), align: 'center', ls: 10, alpha: hu, glow: 'rgba(255,120,70,.6)', glowR: 34 });
  txt(ctx, 'EVERYONE OWNS A SHOP', W / 2, H / 2 + 76, { font: F(800, 22), align: 'center', ls: 14, color: '#ffd9a0', alpha: hu });
  const su = seg(lt, 1.2, 6.0);
  const stats = [['开店', `${Math.round(lerp(40000, 52318, su)).toLocaleString()} 家`], ['在售商品', `${Math.round(lerp(1000000, 1286400, su)).toLocaleString()} 件`], ['今日成交', `¥ ${Math.round(lerp(3000000, 3624000, su)).toLocaleString()}`]];
  stats.forEach(([k2, v], i) => {
    const u = E.outExpo(seg(lt, 1.0 + i * 0.15, 1.6 + i * 0.15));
    const x = W / 2 + (i - 1) * 470, y = H - 120;
    ctx.save(); ctx.globalAlpha = u; ctx.translate(0, (1 - u) * 30);
    fillRR(ctx, x - 210, y - 70, 420, 110, 24, 'rgba(10,12,34,.8)');
    txt(ctx, k2, x, y - 32, { font: F(700, 18, CJK), align: 'center', color: 'rgba(255,255,255,.6)', ls: 3 });
    txt(ctx, v, x, y + 14, { font: F(900, 40), align: 'center', color: i === 2 ? '#ffe3a8' : '#ffffff' });
    ctx.restore();
  });
}

/* ───────────────────────── 54–60 · outro ───────────────────────── */
function bzOutro(t) {
  const lt = t - 54;
  bzSky(t);
  bzBazaar(t, { i: 5, j: 5, z: lerp(0.95, 1.1, seg(lt, 0, 6)), r: 0 }, { trades: 0.6 });
  const band = ctx.createLinearGradient(0, 100, 0, 860);
  band.addColorStop(0, 'rgba(4,6,20,0)'); band.addColorStop(0.15, 'rgba(4,6,20,.86)'); band.addColorStop(0.85, 'rgba(4,6,20,.86)'); band.addColorStop(1, 'rgba(4,6,20,0)');
  ctx.fillStyle = band; ctx.fillRect(0, 100, W, 760);
  const p = E.outExpo(seg(lt, 0.1, 0.9));
  drawLogo(ctx, W / 2 - 400, 170 + (1 - p) * 30, 800, E.inOutCubic(seg(lt, 0.1, 0.9)), seg(lt, 1.2, 2.4), p);
  txt(ctx, '米麦集市  ·  MIME BAZAAR', W / 2, 470, { font: F(800, 34, CJK), align: 'center', ls: 8, color: '#ffd9a0', alpha: seg(lt, 0.6, 1.2) });
  const s = E.outExpo(seg(lt, 1.0, 1.8));
  txt(ctx, '开一家店，卖你的灵感', W / 2, 600 + (1 - s) * 24, { font: F(900, 90, CJK), align: 'center', ls: 12, alpha: s, glow: 'rgba(255,120,70,.6)', glowR: 34 });
  txt(ctx, '密码保护资产  ·  数学生长价值', W / 2, 680, { font: F(700, 30, CJK), align: 'center', ls: 8, color: 'rgba(220,230,255,.85)', alpha: seg(lt, 1.6, 2.2) });
  const du = E.outExpo(seg(lt, 2.2, 2.8));
  if (du > 0) {
    ctx.save(); ctx.globalAlpha = du;
    fillRR(ctx, W / 2 - 200, 740, 400, 60, 30, 'rgba(255,255,255,.1)');
    rr(ctx, W / 2 - 199.5, 740.5, 399, 59, 30); ctx.strokeStyle = 'rgba(255,210,160,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    txt(ctx, 'mimuseai.com', W / 2, 780, { font: F(700, 28, MONO), align: 'center', color: '#fff' });
    ctx.restore();
  }
  txt(ctx, '演示画面 · 部分能力为原型模拟实现', W / 2, H - 20, { font: F(400, 13, CJK), align: 'center', color: 'rgba(255,255,255,.32)', alpha: seg(lt, 2.5, 3) });
  const end = seg(t, 59.3, 60);
  if (end > 0) { ctx.fillStyle = `rgba(0,0,0,${end})`; ctx.fillRect(0, 0, W, H); }
}

/* ───────────────────────── main ───────────────────────── */
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (t < 5) bzOpen(t);
  else if (t < 9) bzHook(t);
  else if (t < 18) bzOpenShop(t);
  else if (t < 27) bzList(t);
  else if (t < 37) bzBrowse(t);
  else if (t < 46) bzTrade(t);
  else if (t < 54) bzEveryone(t);
  else bzOutro(t);
  bzChrome(t);
  bzCutFlash(t);
  grain(t);
}
window.render = render;
