/* Commercial kit — shared motion language for the "commercial" cuts (see ../REFERENCES.md, refs 1/2/5/8).
 * Load after ../mishu/film.js (needs txt, rr, ring, circle, glowDisc, E, clamp, lerp, mix, hex, rgb, F, CJK, ctx).
 *  · CM palette: near-black surfaces, one precious accent (gold)
 *  · cmStep / cmSpr: closed-form springs; a value with many targets is a sum of springs (pure function of t)
 *  · cmTrack: one shape that never cuts — geometry/colour/content from a state table
 *  · cmType: kinetic type, characters rise out of a mask
 *  · cmCoin, cmCursor, cmRipple, cmGoldFill, cmBox
 */
const CM = {
  bg0: '#05070d', bg1: '#0b0f1c', s1: '#10141f', s2: '#151a29', s3: '#1c2234', line: 'rgba(255,255,255,.09)',
  text: '#eceef5', sub: '#8b93b5', gold: '#e8b84b', goldHi: '#f5d07a', goldLo: '#9b6d18', pos: '#34d399', neg: '#f87171', ink: '#0b0d14',
};
// closed-form damped spring step response 0 → 1 (tiny overshoot)
function cmStep(tau, w = 15, z = 0.8) {
  if (tau <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
}
// a value that changes target many times = sum of one spring per change; keys [[t, v, snap?], ...]
function cmSpr(t, keys, w = 15, z = 0.8) {
  let s = 0; for (let k = 0; k < keys.length; k++) if (keys[k][2] && t >= keys[k][0]) s = k;
  let v = keys[s][1];
  for (let k = s + 1; k < keys.length; k++) v += (keys[k][1] - keys[k - 1][1]) * cmStep(t - keys[k][0], w, z);
  return v;
}
const cmCol = (keys, t) => { let c = hex(keys[0][1]); for (let k = 1; k < keys.length; k++) c = mix(c, hex(keys[k][1]), clamp(cmStep(t - keys[k][0], 12, 0.95))); return c; };
// state table rows: [time, cx, cy, w, h, radius, fill, content, snap]
function cmTrack(t, states) {
  let k = 0; for (let i = 0; i < states.length; i++) if (t >= states[i][0]) k = i;
  const key = (j) => states.map(s => [s[0], s[j], s[8]]);
  return {
    x: cmSpr(t, key(1)), y: cmSpr(t, key(2)), w: Math.max(0, cmSpr(t, key(3))), h: Math.max(0, cmSpr(t, key(4))), r: Math.max(0, cmSpr(t, key(5))),
    col: cmCol(states.map(s => [s[0], s[6]]), t), k, content: states[k][7], t0: states[k][0], t1: k + 1 < states.length ? states[k + 1][0] : 99,
  };
}
// content enters after its container starts morphing and leaves before the next morph
const cmEnter = (S, t) => clamp((t - S.t0 - 0.1) / 0.22) * (1 - clamp((t - (S.t1 - 0.16)) / 0.14));
// kinetic type: characters rise out of a mask one after another
function cmType(s, x, y, t0, t, o = {}) {
  const size = o.size || 64, font = F(o.w || 900, size, CJK), ls = o.ls === undefined ? 2 : o.ls;
  const out = o.out === undefined ? 1e9 : o.out;
  // o.ctx: draw on another canvas (the 9:16 compositor); default is the film's own canvas
  const ctx = o.ctx || document.getElementById('c').getContext('2d');
  ctx.save(); ctx.font = font; ctx.letterSpacing = ls + 'px';
  const total = ctx.measureText(s).width;
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  [...s].forEach((ch, i) => {
    const ti = t0 + i * (o.stag || 0.035);
    const u = cmStep(t - ti, 14, 0.85), v = cmStep(t - out - i * 0.015, 14, 0.9);
    const wch = ctx.measureText(ch).width;
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 4, y - size * 1.05, wch + 8, size * 1.35); ctx.clip();
    txt(ctx, ch, cx, y + (1 - u) * size * 1.1 + v * size * -1.1, { font, color: o.color || CM.text, ls, alpha: clamp(u * 1.4) * (1 - clamp(v)) });
    ctx.restore();
    cx += wch;
  });
  ctx.restore();
}
function cmGoldFill(c, x0, y0, x1, y1) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, CM.goldHi); g.addColorStop(0.5, CM.gold); g.addColorStop(1, CM.goldLo); return g; }
const cmIsGold = (col) => col[0] > 200 && col[1] > 150 && col[2] < 140;
// the shape's body: soft shadow, fill (metallic if gold), hairline border, top sheen. Origin = shape centre.
function cmBox(c, S) {
  const r = Math.min(S.r, S.w / 2, S.h / 2), gold = cmIsGold(S.col);
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 60; c.shadowOffsetY = 26;
  rr(c, -S.w / 2, -S.h / 2, S.w, S.h, r); c.fillStyle = gold ? cmGoldFill(c, -S.w / 2, -S.h / 2, S.w / 2, S.h / 2) : rgb(S.col); c.fill(); c.restore();
  rr(c, -S.w / 2 + 0.5, -S.h / 2 + 0.5, S.w - 1, S.h - 1, r); c.strokeStyle = gold ? 'rgba(255,240,200,.5)' : 'rgba(255,255,255,.1)'; c.lineWidth = 1.2; c.stroke();
  if (!gold) { const sh = c.createLinearGradient(0, -S.h / 2, 0, -S.h / 2 + 60); sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sh; rr(c, -S.w / 2, -S.h / 2, S.w, Math.min(60, S.h), r); c.fill(); }
}
function cmCoin(c, x, y, r, spin = 0, a = 1) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(Math.max(0.08, Math.abs(Math.cos(spin))), 1);
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fillStyle = cmGoldFill(c, -r, -r, r, r); c.fill();
  ring(c, 0, 0, r * 0.78, 'rgba(110,70,10,.55)', Math.max(1, r * 0.07));
  txt(c, '¥', 0, r * 0.36, { font: F(900, r * 1.0), align: 'center', color: 'rgba(100,62,8,.85)' });
  c.beginPath(); c.arc(-r * 0.3, -r * 0.35, r * 0.35, 0, 7); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill();
  c.restore();
}
function cmCursor(x, y, press) {
  ctx.save(); ctx.translate(x, y); const s = 1 - press * 0.14; ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(19, 34); ctx.lineTo(13, 21); ctx.lineTo(24, 21); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#0b0d14'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function cmRipple(x, y, u) { if (u <= 0 || u >= 1) return; ring(ctx, x, y, 10 + 50 * E.outCubic(u), `rgba(245,208,122,${0.8 * (1 - u)})`, 2.5); }
// a bezier point (quadratic), used for coins flying into a balance
const cmQ = (a, q, b, v) => (1 - v) * (1 - v) * a + 2 * (1 - v) * v * q + v * v * b;
