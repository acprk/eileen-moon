/* 米麦 MIME TECH · 密数科技 — 商业版（60 s, 1920×1080, 30 fps + motion blur, 120 BPM）
 * Same commercial language as ../bazaar/commercial.js (refs 1/2/5/8 in ../REFERENCES.md), using ../lib/cmkit.js:
 *  WHY   0–8    exhibits in gold frames (MIMUSE): your face / voice / avatar / muse → 都是你的资产
 *  PAIN  8–14   once uploaded: copied, misused, impossible to take back
 *  FIX   14–34  one shape: upload → on-device scan → encrypted → your key → listed (licence per use) → a request,
 *               your yes → controlled generation & delivery → revoke in one tap → ownership never moves → ledger → coin
 *  GET   34–46  settlement climax (charge → burst → reveal → coins into the balance), more uses keep paying
 *  VALUE 46–54  a value curve grows from the ledger: 密码保护资产，数学生长价值
 *  LOGO  54–60
 * Loaded after ../mishu/film.js and ../lib/cmkit.js. Names here start with ms / MS.
 */
const MS_S = [
  // [time, cx, cy, w, h, radius, fill, content, snap]
  [0.0, 1320, 560, 2, 2, 1, '#e8b84b', 'glint'],
  [0.8, 1320, 560, 420, 520, 10, '#151a29', 'face'],
  [1.8, 1320, 560, 560, 300, 10, '#151a29', 'voice'],
  [2.8, 1320, 560, 460, 460, 10, '#151a29', 'avatar'],
  [3.8, 1320, 560, 460, 460, 10, '#151a29', 'muse'],
  [4.8, 1320, 560, 520, 170, 85, '#e8b84b', 'asset'],
  [8.0, 1320, 560, 420, 520, 10, '#14161d', 'faceGrey'],
  [14.2, 960, 640, 400, 100, 50, '#e8b84b', 'upload'],
  [15.6, 960, 540, 460, 560, 36, '#151a29', 'scan'],
  [17.2, 960, 540, 460, 560, 36, '#0e1220', 'cipher'],
  [18.8, 960, 540, 680, 300, 32, '#151a29', 'key'],
  [20.4, 960, 540, 800, 460, 32, '#151a29', 'listing'],
  [22.4, 960, 540, 640, 330, 32, '#151a29', 'request'],
  [24.6, 960, 540, 460, 560, 36, '#151a29', 'generate'],
  [26.8, 960, 540, 760, 420, 32, '#151a29', 'licenses'],
  [30.2, 960, 540, 640, 240, 120, '#e8b84b', 'owner'],
  [31.8, 960, 540, 900, 260, 32, '#151a29', 'ledger'],
  [33.6, 960, 540, 200, 200, 100, '#e8b84b', 'coin'],
  [34.0, 960, 540, 0, 0, 0, '#e8b84b', 'none', true],
];
const MS_CUR = [
  [14.4, 1500, 900], [15.0, 975, 650], [16.0, 1500, 900], [22.6, 1450, 880], [23.3, 1088, 650], [24.2, 1500, 900],
  [27.0, 1500, 820], [27.6, 1240, 680], [28.2, 1000, 680], [28.4, 1250, 680], [29.6, 1500, 900],
];
const MS_CLICK = [15.0, 23.5, 28.6];
const MS_DRAG = [[27.6, 28.2]];
const MS_LIC = [['星河影业', '使用中 · 2 / 3 次', '¥4,000'], ['青禾广告', '使用中 · 5 / 10 次', '¥10,000'], ['北辰游戏', '使用中 · 1 / 5 次', '¥1,200']];

function msBackdrop(t, S) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, CM.bg0); g.addColorStop(1, CM.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const pain = seg(t, 7.6, 8.4) * (1 - seg(t, 13.8, 14.6));
  glowDisc(ctx, S.x, S.y, 900, [232, 184, 75], 0.1 * (1 - pain * 0.8));
  glowDisc(ctx, W * 0.15, H * 0.1, 900, [60, 90, 200], 0.12);
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let x = 48; x < W; x += 48) for (let y = 48; y < H; y += 48) { const d = Math.hypot(x - W / 2, y - H / 2) / 1100; circle(ctx, x, y, 1.1, `rgba(180,190,230,${0.08 * (1 - d)})`); }
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
// a museum-style gold frame inside the shape, with a small brass plaque
function msFrame(c, w, h, label) {
  c.strokeStyle = 'rgba(245,208,122,.75)'; c.lineWidth = 2; c.strokeRect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36);
  c.strokeStyle = 'rgba(245,208,122,.25)'; c.lineWidth = 1; c.strokeRect(-w / 2 + 26, -h / 2 + 26, w - 52, h - 52);
  if (label) { const tw2 = 110; fillRR(c, -tw2 / 2, h / 2 - 44, tw2, 26, 4, 'rgba(201,169,106,.9)'); txt(c, label, 0, h / 2 - 25, { font: F(800, 14, CJK), align: 'center', color: CM.ink, ls: 3 }); }
}
function msContent(S, t) {
  const a = cmEnter(S, t);
  if (a <= 0 || S.w < 4) return;
  const c = ctx, w = S.w, h = S.h;
  c.save(); c.globalAlpha *= a; c.translate(0, (1 - a) * 10);
  switch (S.content) {
    case 'face': case 'faceGrey': {
      c.save(); rr(c, -w / 2, -h / 2, w, h, S.r); c.clip();
      const bg = c.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, S.content === 'face' ? '#1c2440' : '#1a1c22'); bg.addColorStop(1, '#0c0f18');
      c.fillStyle = bg; c.fillRect(-w / 2, -h / 2, w, h);
      if (S.content === 'faceGrey') c.filter = 'grayscale(1) brightness(.62)';
      frontFace(c, 0, h * 0.1, h / 680, t);
      c.filter = 'none'; c.restore();
      if (S.content === 'face') msFrame(c, w, h, '肖像');
      else txt(c, '肖像 · 已失控', -w / 2 + 24, h / 2 - 22, { font: F(700, 16, CJK), color: CM.sub, ls: 2 });
      break;
    }
    case 'voice':
      for (let i = 0; i < 19; i++) { const hh = 18 + 130 * Math.abs(Math.sin(t * 8 + i * 0.7)) * (1 - Math.abs(i - 9) / 11); fillRR(c, -171 + i * 19, -hh / 2 - 10, 9, hh, 4.5, i === 9 ? CM.goldHi : 'rgba(236,238,245,.85)'); }
      msFrame(c, w, h, '声音');
      break;
    case 'avatar': plateIcon(c, 'avatar', 0, -16, 0.85, t, 'rgba(236,238,245,.9)'); msFrame(c, w, h, '虚拟形象'); break;
    case 'muse': plateIcon(c, 'spark', 0, -16, 0.8, t, 'rgba(245,208,122,.95)'); msFrame(c, w, h, '灵感'); break;
    case 'asset':
      txt(c, '仅属于你', 0, 4, { font: F(900, 46, CJK), color: CM.ink, align: 'center', ls: 8 });
      txt(c, 'ASSET · MM-2026-010482', 0, 46, { font: F(600, 16, MONO), color: 'rgba(11,13,20,.6)', align: 'center', ls: 2 });
      break;
    case 'upload': txt(c, '上传到米麦', 0, 13, { font: F(900, 36, CJK), color: CM.ink, align: 'center', ls: 6 }); break;
    case 'scan': {
      c.save(); rr(c, -w / 2, -h / 2, w, h, S.r); c.clip();
      c.fillStyle = '#1c2440'; c.fillRect(-w / 2, -h / 2, w, h);
      frontFace(c, 0, h * 0.1, h / 680, t, { scan: seg(t, 15.9, 17.0), mesh: seg(t, 16.2, 16.6) * (1 - seg(t, 16.9, 17.1)) });
      c.restore();
      fillRR(c, -w / 2 + 20, -h / 2 + 20, 170, 38, 19, 'rgba(10,12,22,.75)');
      circle(c, -w / 2 + 42, -h / 2 + 39, 6, CM.pos);
      txt(c, `本地识别 ${Math.round(seg(t, 15.9, 17.0) * 100)}%`, -w / 2 + 56, -h / 2 + 45, { font: F(700, 15, CJK) });
      break;
    }
    case 'cipher': {
      // the portrait dissolves into encrypted cells; only gold digits are left
      c.save(); rr(c, -w / 2, -h / 2, w, h, S.r); c.clip();
      const u = seg(t, 17.2, 18.2), TS = 26, tick = Math.floor(t * 10);
      for (let iy = 0; iy < Math.ceil(h / TS); iy++) for (let ix = 0; ix < Math.ceil(w / TS); ix++) {
        const x = -w / 2 + ix * TS, y = -h / 2 + iy * TS, d = Math.hypot(x, y) / 400;
        const on = clamp((u - d * 0.6) / 0.3);
        if (on <= 0) continue;
        c.fillStyle = `rgba(232,184,75,${0.05 + 0.1 * hash(ix * 31 + iy)})`; c.fillRect(x + 1, y + 1, TS - 2, TS - 2);
        txt(c, '0123456789abcdef'[(hash(ix * 7 + iy * 13 + tick) * 16) | 0], x + TS / 2, y + TS / 2 + 5, { font: F(600, 13, MONO), align: 'center', color: `rgba(245,208,122,${0.35 + 0.5 * on})` });
      }
      c.restore();
      const lu = cmStep(t - 17.9, 14, 0.7);
      if (t > 17.9) { c.save(); c.scale(lu, lu); circle(c, 0, -20, 70, CM.s2); ring(c, 0, -20, 70, CM.gold, 2); lockIcon(c, 0, -14, 2.2, CM.goldHi); c.restore(); c.save(); c.globalAlpha *= clamp(lu); fillRR(c, -120, 66, 240, 50, 25, 'rgba(10,12,22,.92)'); c.restore(); txt(c, '仅你可解锁', 0, 100, { font: F(900, 28, CJK), align: 'center', alpha: clamp(lu), ls: 4 }); }
      break;
    }
    case 'key': {
      keyIcon(c, -w / 2 + 110, 0, 1.0, CM.goldHi, CM.ink, 3);
      txt(c, '你的密钥', -w / 2 + 260, -20, { font: F(900, 40, CJK) });
      txt(c, '只在你的设备上 · 平台看不到', -w / 2 + 260, 24, { font: F(600, 19, CJK), color: CM.sub });
      fillRR(c, -w / 2 + 260, 52, 150, 34, 17, 'rgba(52,211,153,.14)'); circle(c, -w / 2 + 280, 69, 5, CM.pos); txt(c, '已确权', -w / 2 + 294, 75, { font: F(700, 15, CJK), color: CM.pos });
      break;
    }
    case 'listing': {
      c.save(); rr(c, -w / 2 + 32, -h / 2 + 32, 300, h - 64, 22); c.clip(); c.fillStyle = '#1c2440'; c.fillRect(-w / 2 + 32, -h / 2 + 32, 300, h - 64); frontFace(c, -w / 2 + 182, 70, 0.4, t); c.restore();
      const X = -w / 2 + 370;
      txt(c, '林夏 · 正脸肖像', X, -h / 2 + 80, { font: F(900, 32, CJK) });
      txt(c, '¥2,000', X, -h / 2 + 156, { font: F(800, 52, MONO), color: CM.goldHi });
      txt(c, '/ 次', X + 210, -h / 2 + 156, { font: F(600, 20, CJK), color: CM.sub });
      [['使用权 · 按次授权', 20.8], ['每次使用，需要你同意', 21.2]].forEach(([s, at], i) => {
        const y = 30 + i * 64, on = cmStep(t - at, 16, 0.85);
        txt(c, s, X, y + 8, { font: F(700, 20, CJK) });
        const tx = w / 2 - 120;
        fillRR(c, tx, y - 18, 80, 36, 18, rgb(mix([40, 46, 66], hex(CM.gold), on)));
        const lead = lerp(tx + 18, tx + 62, cmStep(t - at, 18, 0.8)), trail = lerp(tx + 18, tx + 62, cmStep(t - at - 0.05, 12, 0.85));
        fillRR(c, Math.min(lead, trail) - 14, y - 14, Math.abs(lead - trail) + 28, 28, 14, '#fff');
      });
      txt(c, '所有权 · 永远归你', X, h / 2 - 50, { font: F(700, 18, CJK), color: CM.pos });
      break;
    }
    case 'request': {
      c.save(); c.beginPath(); c.arc(-w / 2 + 72, -h / 2 + 76, 36, 0, 7); c.fillStyle = '#1c2440'; c.fill(); c.clip(); frontFace(c, -w / 2 + 72, -h / 2 + 98, 0.18, t); c.restore();
      txt(c, '星河影业 想使用你的肖像', -w / 2 + 126, -h / 2 + 70, { font: F(800, 23, CJK) });
      txt(c, '广告短片 · 1 次 · 48 小时', -w / 2 + 126, -h / 2 + 100, { font: F(600, 17, CJK), color: CM.sub });
      txt(c, '¥2,000', w / 2 - 36, -h / 2 + 84, { font: F(800, 28, MONO), color: CM.goldHi, align: 'right' });
      const yes = cmStep(t - 23.5, 14, 0.85);
      rr(c, -w / 2 + 36, h / 2 - 100, (w - 96) / 2, 62, 31); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5; c.stroke();
      txt(c, '拒绝', -w / 2 + 36 + (w - 96) / 4, h / 2 - 60, { font: F(800, 22, CJK), align: 'center', color: CM.sub });
      fillRR(c, 12, h / 2 - 100, (w - 96) / 2, 62, 31, rgb(mix(hex(CM.gold), hex(CM.pos), clamp(yes))));
      txt(c, yes > 0.5 ? '已授权 1 次' : '同意', 12 + (w - 96) / 4, h / 2 - 60, { font: F(900, 22, CJK), align: 'center', color: CM.ink });
      break;
    }
    case 'generate': {
      const open = seg(t, 25.0, 26.2);
      c.save(); rr(c, -w / 2, -h / 2, w, h, S.r); c.clip();
      const g2 = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g2.addColorStop(0, '#2a2140'); g2.addColorStop(1, '#141a30');
      c.fillStyle = g2; c.fillRect(-w / 2, -h / 2, w, h);
      if (open < 1) c.filter = `blur(${(1 - open) * 18}px)`;
      frontFace(c, 0, h * 0.1, h / 680, t);
      c.filter = 'none';
      c.fillStyle = `rgba(10,12,22,${0.5 * (1 - open)})`; c.fillRect(-w / 2, -h / 2, w, h);
      c.restore();
      if (t < 26.3) { ring(c, 0, 0, 44, 'rgba(255,255,255,.15)', 6); ring(c, 0, 0, 44, CM.goldHi, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * open); }
      else { circle(c, 0, 0, 44, CM.pos); check(c, 0, 2, 2.0, CM.ink, 5, seg(t, 26.3, 26.6)); }
      fillRR(c, -w / 2 + 20, -h / 2 + 20, 230, 38, 19, 'rgba(10,12,22,.75)');
      txt(c, t < 26.3 ? '受控生成 · 原件不出域' : '已交付 · 用后即焚', -w / 2 + 38, -h / 2 + 45, { font: F(700, 15, CJK), color: t < 26.3 ? CM.text : CM.pos });
      break;
    }
    case 'licenses': {
      txt(c, '我发出的授权', -w / 2 + 36, -h / 2 + 56, { font: F(800, 22, CJK) });
      txt(c, '随时收回', w / 2 - 36, -h / 2 + 56, { font: F(600, 16, CJK), color: CM.sub, align: 'right' });
      c.beginPath(); c.rect(-w / 2 + 36, -h / 2, w - 72, h); c.clip();   // the swiped row stays inside the card
      MS_LIC.forEach(([who, st, earn], i) => {
        const y = -h / 2 + 96 + i * 100;
        const isRev = i === 2;
        const swipe = isRev ? E.inOutCubic(seg(t, 27.6, 28.2)) * (1 - seg(t, 28.6, 28.8)) : 0;
        const rev = isRev ? cmStep(t - 28.6, 14, 0.85) : 0;
        const collapse = isRev ? E.inCubic(seg(t, 29.3, 29.9)) : 0;
        if (collapse >= 1) return;
        c.save(); c.globalAlpha *= 1 - collapse;
        // the revoke action hiding under the row
        if (isRev) { fillRR(c, w / 2 - 200, y, 164, 80, 18, rgb(mix(hex('#3a1e26'), hex(CM.neg), 0.6))); txt(c, '撤销', w / 2 - 118, y + 48, { font: F(900, 22, CJK), align: 'center', color: '#fff' }); }
        c.translate(-swipe * 180, 0);
        fillRR(c, -w / 2 + 36, y, w - 72, 80, 18, rev > 0.3 ? rgb(mix(hex(CM.s3), hex('#3a1e26'), clamp(rev))) : CM.s3);
        txt(c, who, -w / 2 + 64, y + 36, { font: F(800, 22, CJK) });
        txt(c, rev > 0.3 ? '已撤销 · 立即停止交付' : st, -w / 2 + 64, y + 62, { font: F(600, 15, CJK), color: rev > 0.3 ? CM.neg : CM.sub });
        txt(c, rev > 0.3 ? '—' : `已收益 ${earn}`, w / 2 - 64, y + 48, { font: F(800, 20, MONO), color: rev > 0.3 ? CM.sub : CM.goldHi, align: 'right' });
        c.restore();
      });
      break;
    }
    case 'owner': {
      keyIcon(c, -w / 2 + 100, 0, 0.8, CM.ink, null, 4);
      keyIcon(c, -w / 2 + 100, 0, 0.8, null, CM.ink, 4);
      txt(c, '所有权，从未离开你', -w / 2 + 210, 13, { font: F(900, 34, CJK), color: CM.ink, ls: 2 });
      break;
    }
    case 'ledger': {
      txt(c, '每一次使用，都记在账上', -w / 2 + 36, -h / 2 + 54, { font: F(800, 22, CJK) });
      const blocks = [['LICENSE_USE', '星河影业', '+¥1,950', 32.0], ['LICENSE_USE', '青禾广告', '+¥780', 32.4], ['LICENSE_USE', '星河影业', '+¥1,950', 32.8], ['REVOKE', '北辰游戏', '—', 33.2]];
      blocks.forEach(([kind, who, v, at], i) => {
        const u = cmStep(t - at, 14, 0.8);
        if (t < at) return;
        const x = -w / 2 + 40 + i * 210, y = -h / 2 + 90;
        c.save(); c.globalAlpha *= clamp(u); c.translate(0, (1 - clamp(u)) * 20);
        fillRR(c, x, y, 190, 130, 16, CM.s3);
        rr(c, x + 0.5, y + 0.5, 189, 129, 16); c.strokeStyle = kind === 'REVOKE' ? 'rgba(248,113,113,.5)' : 'rgba(245,208,122,.45)'; c.stroke();
        txt(c, `#${10482 + i}`, x + 16, y + 30, { font: F(600, 13, MONO), color: CM.sub });
        txt(c, kind, x + 16, y + 56, { font: F(700, 13, MONO), color: kind === 'REVOKE' ? CM.neg : CM.goldHi });
        txt(c, who, x + 16, y + 86, { font: F(800, 18, CJK) });
        txt(c, v, x + 16, y + 114, { font: F(800, 18, MONO), color: kind === 'REVOKE' ? CM.sub : CM.goldHi });
        if (i > 0) { line(c, x - 20, y + 65, x, y + 65, 'rgba(245,208,122,.6)', 2); circle(c, x - 20, y + 65, 3, CM.goldHi); }
        c.restore();
      });
      break;
    }
  }
  c.restore();
}
function msDrawShape(t) {
  const S = cmTrack(t, MS_S);
  if (S.w < 1 || S.content === 'none') return S;
  ctx.save(); ctx.translate(S.x, S.y);
  if (t < 0.9) {
    const g = seg(t, 0.0, 0.8), len = 600 * Math.sin(g * Math.PI);
    const lg = ctx.createLinearGradient(-len, 0, len, 0); lg.addColorStop(0, 'rgba(245,208,122,0)'); lg.addColorStop(0.5, `rgba(255,236,190,${0.9 * Math.sin(g * Math.PI)})`); lg.addColorStop(1, 'rgba(245,208,122,0)');
    ctx.fillStyle = lg; ctx.fillRect(-len, -1.5, 2 * len, 3);
    glowDisc(ctx, 0, 0, 80, [255, 220, 150], 0.6 * Math.sin(g * Math.PI));
  }
  cmBox(ctx, S);
  if (S.content !== 'coin') msContent(S, t);
  ctx.restore();
  return S;
}
function msGhosts(t) {
  const on = seg(t, 8.8, 9.2) * (1 - seg(t, 13.4, 14.2));
  if (on <= 0) return;
  const r = rng(43), collapse = E.inOutCubic(seg(t, 13.2, 14.0));
  for (let i = 0; i < 26; i++) {
    const at = 8.9 + i * 0.12, u = cmStep(t - at, 9, 0.9);
    const tx = 760 + r() * 1100, ty = 80 + r() * 920, rot = (r() - 0.5) * 0.5;
    if (t < at) continue;
    const x = lerp(lerp(1320, tx, u), 1320, collapse), y = lerp(lerp(560, ty, u), 560, collapse), s = lerp(0.55, 0.3 + 0.12 * (i % 3), u);
    ctx.save(); ctx.globalAlpha = on * 0.55 * clamp(u * 2) * (1 - collapse); ctx.translate(x, y); ctx.rotate(rot * u); ctx.scale(s, s);
    fillRR(ctx, -160, -200, 320, 400, 10, '#14161d');
    ctx.save(); rr(ctx, -160, -200, 320, 400, 10); ctx.clip(); ctx.filter = 'grayscale(1) brightness(.5)'; frontFace(ctx, 0, 52, 0.62, t); ctx.filter = 'none'; ctx.restore();
    txt(ctx, '复制', -136, 180, { font: F(700, 24, CJK), color: 'rgba(255,255,255,.4)' });
    ctx.restore();
  }
}

/* ───────────────────────── 34–46 · settlement climax ───────────────────────── */
const MS_BAL0 = 12480;
const MS_ORDERS = [[42.0, '青禾广告', '声音', 800], [43.5, '博物馆文创', '文化资产', 3800], [45.0, '星河影业', '续期 · 肖像', 2000]];
function msWallet(t, bal, bump) {
  const u = cmStep(t - 37.0, 12, 0.85) * (1 - seg(t, 53.6, 54.0));
  if (u <= 0) return [1576, 120];
  const x = 1700, y = 120 - (1 - clamp(u)) * 60;
  ctx.save(); ctx.globalAlpha = clamp(u); ctx.translate(x, y); const s = 1 + bump * 0.08; ctx.scale(s, s);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; fillRR(ctx, -170, -44, 340, 88, 44, CM.s2); ctx.restore();
  rr(ctx, -169.5, -43.5, 339, 87, 44); ctx.strokeStyle = `rgba(245,208,122,${0.3 + bump * 0.6})`; ctx.lineWidth = 1.5; ctx.stroke();
  cmCoin(ctx, -124, 0, 22);
  txt(ctx, '你的收益', -88, -6, { font: F(600, 14, CJK), color: CM.sub });
  txt(ctx, `¥${Math.round(bal).toLocaleString()}`, 146, 16, { font: F(800, 32, MONO), color: CM.text, align: 'right' });
  ctx.restore();
  return [x - 124, y];
}
function msBalance(t) {
  let bal = MS_BAL0, bump = 0;
  for (let i = 0; i < 10; i++) { const ar = 37.6 + i * 0.2 + 0.55; if (t >= ar) { bal += 195; bump = Math.max(bump, Math.exp(-(t - ar) * 10)); } }
  MS_ORDERS.forEach(([at, , , p]) => { for (let k = 0; k < 4; k++) { const ar = at + 0.5 + k * 0.12; if (t >= ar) { bal += p * 0.975 / 4; bump = Math.max(bump, Math.exp(-(t - ar) * 10)); } } });
  return [bal, bump];
}
function msClimax(t) {
  if (t < 33.9 || t > 46.5) return;
  const C0 = [960, 540];
  const ch = seg(t, 34.0, 35.5);
  if (t < 35.6) {
    const amp = ch * ch * 10;
    for (let i = 0; i < 30; i++) { const ph = (t * 0.9 + i / 30) % 1, an = i * 2.4, rad = lerp(520, 90, ph); circle(ctx, C0[0] + Math.cos(an) * rad, C0[1] + Math.sin(an) * rad, 2 + 2 * ph, `rgba(245,208,122,${0.6 * ph * ch})`); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const an = i * 0.9 + t * 0.4, len = 160 + 260 * ch;
      ctx.save(); ctx.translate(C0[0], C0[1]); ctx.rotate(an);
      const g = ctx.createLinearGradient(100, 0, 100 + len, 0); g.addColorStop(0, `rgba(255,220,150,${0.35 * ch})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(100, -6); ctx.lineTo(100 + len, -24); ctx.lineTo(100 + len, 24); ctx.lineTo(100, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    glowDisc(ctx, C0[0], C0[1], 260, [255, 210, 130], 0.25 + 0.35 * ch);
    const sq = 1 - 0.18 * E.inExpo(seg(t, 35.2, 35.5));
    ctx.save(); ctx.translate(C0[0] + Math.sin(t * 70) * amp, C0[1] + Math.cos(t * 63) * amp); ctx.scale(1 / sq, sq); cmCoin(ctx, 0, 0, 100, 0); ctx.restore();
  } else {
    const b = seg(t, 35.5, 36.4);
    if (b < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; glowDisc(ctx, C0[0], C0[1], 1100, [255, 236, 200], 0.8 * (1 - b) * (1 - b)); ctx.restore();
      const R = 60 + 900 * E.outCubic(b);
      ring(ctx, C0[0], C0[1], R, `rgba(245,208,122,${0.18 * (1 - b)})`, 34); ring(ctx, C0[0], C0[1], R * 0.86, `rgba(245,208,122,${0.4 * (1 - b)})`, 10); ring(ctx, C0[0], C0[1], R * 0.74, `rgba(255,245,220,${0.9 * (1 - b)})`, 2.5);
      for (let i = 0; i < 18; i++) { const an = i * 0.349 + 0.2, r0 = 120 + 700 * E.outCubic(b), r1 = r0 + 120 * (1 - b); line(ctx, C0[0] + Math.cos(an) * r0, C0[1] + Math.sin(an) * r0, C0[0] + Math.cos(an) * r1, C0[1] + Math.sin(an) * r1, `rgba(255,236,190,${0.8 * (1 - b)})`, 2); }
    }
    const cr = rng(13);
    for (let i = 0; i < 16; i++) { const an = cr() * Math.PI * 2, sp = 400 + cr() * 600, size = 20 + cr() * 14, tt = t - 35.5; if (tt > 1.6) continue; cmCoin(ctx, C0[0] + Math.cos(an) * sp * tt, C0[1] + Math.sin(an) * sp * tt + 500 * tt * tt, size, tt * 9 + i, 1 - seg(tt, 1.0, 1.6)); }
  }
  // reveal
  const rv = cmStep(t - 36.0, 11, 0.72), rvOut = seg(t, 39.9, 40.4);
  if (t >= 36.0 && rvOut < 1) {
    const x = lerp(C0[0], 960, rv), y = lerp(C0[1], 470, rv) - Math.sin(clamp(rv) * Math.PI) * 120, s = lerp(0.2, 1, clamp(rv)) * (1 - rvOut * 0.3);
    ctx.save(); ctx.globalAlpha = clamp(rv * 2) * (1 - rvOut); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((1 - clamp(rv)) * -0.2);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30; fillRR(ctx, -360, -170, 720, 340, 30, CM.s2); ctx.restore();
    rr(ctx, -359.5, -169.5, 719, 339, 30); ctx.strokeStyle = 'rgba(245,208,122,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    txt(ctx, '本次授权收入', -310, -100, { font: F(700, 20, CJK), color: CM.sub, ls: 3 });
    txt(ctx, `+¥${Math.round(1950 * E.outCubic(seg(t, 36.2, 37.4))).toLocaleString()}`, -310, 10, { font: F(800, 96, MONO), color: CM.goldHi });
    line(ctx, -310, 50, 310, 50, CM.line, 1);
    txt(ctx, '星河影业 · 使用 1 次  ·  平台服务费 ¥50（2.5%）', -310, 100, { font: F(600, 19, CJK), color: CM.sub });
    const pu = cmStep(t - 37.3, 16, 0.6);
    if (t > 37.3) { ctx.save(); ctx.translate(250, -96); ctx.scale(pu, pu); fillRR(ctx, -60, -20, 120, 40, 20, 'rgba(52,211,153,.18)'); txt(ctx, '▲ 到账', 0, 8, { font: F(800, 18, CJK), color: CM.pos, align: 'center' }); ctx.restore(); }
    ctx.restore();
  }
  const [bal, bump] = msBalance(t);
  const [wx, wy] = msWallet(t, bal, bump);
  for (let i = 0; i < 10; i++) {
    const s0 = 37.6 + i * 0.2, u = seg(t, s0, s0 + 0.55);
    if (u <= 0 || u >= 1) continue;
    const sx = 960 + (i - 4.5) * 40, sy = 520, qx = (sx + wx) / 2 + 160, qy = Math.min(sy, wy) - 240, v = E.inOutCubic(u);
    cmCoin(ctx, cmQ(sx, qx, wx, v), cmQ(sy, qy, wy, v), lerp(26, 16, v), u * 8);
  }
  MS_ORDERS.forEach(([at, who, what, p], i) => {
    const u = cmStep(t - at, 12, 0.85), out = seg(t, 45.8, 46.3);
    if (t < at || out >= 1) return;
    const x = 1420, y = 380 + i * 150;
    ctx.save(); ctx.globalAlpha = clamp(u * 1.5) * (1 - out); ctx.translate((1 - clamp(u)) * 80, 0);
    fillRR(ctx, x - 230, y - 56, 460, 112, 24, CM.s2); rr(ctx, x - 229.5, y - 55.5, 459, 111, 24); ctx.strokeStyle = CM.line; ctx.stroke();
    txt(ctx, `${who} · ${what}`, x - 200, y - 8, { font: F(800, 22, CJK) });
    txt(ctx, '使用 1 次 · 你已同意', x - 200, y + 24, { font: F(600, 15, CJK), color: CM.sub });
    txt(ctx, `+¥${Math.round(p * 0.975).toLocaleString()}`, x + 200, y + 10, { font: F(800, 28, MONO), color: CM.goldHi, align: 'right' });
    ctx.restore();
    for (let k = 0; k < 4; k++) {
      const v0 = seg(t, at + k * 0.12, at + k * 0.12 + 0.5);
      if (v0 <= 0 || v0 >= 1) continue;
      const v = E.inOutCubic(v0), sx = x + 160, sy = y, qx = (sx + wx) / 2 + 60, qy = Math.min(sy, wy) - 120;
      cmCoin(ctx, cmQ(sx, qx, wx, v), cmQ(sy, qy, wy, v), 14, v0 * 8);
    }
  });
}

/* ───────────────────────── 46–54 · value grows ───────────────────────── */
function msValue(t) {
  const on = seg(t, 46.0, 46.8) * (1 - seg(t, 53.4, 54.0));
  if (on <= 0) return;
  const u = E.inOutCubic(seg(t, 46.4, 52.6));
  const X0 = 140, X1 = 1780, Y0 = 760, Y1 = 220;
  const fx = (p) => Math.pow(p, 1.8) * 0.94 + 0.03 * Math.sin(p * 18) * p;
  ctx.save(); ctx.globalAlpha = on;
  for (let k = 0; k <= 4; k++) { const y = lerp(Y0, Y1, k / 4); line(ctx, X0, y, X1, y, 'rgba(255,255,255,.05)', 1); }
  // ledger nodes along the curve: each use is a point that settles into the line
  ctx.save(); ctx.beginPath(); ctx.rect(X0, 0, (X1 - X0) * u, H); ctx.clip();
  ctx.beginPath(); ctx.moveTo(X0, Y0);
  for (let k = 0; k <= 160; k++) { const p = k / 160; ctx.lineTo(lerp(X0, X1, p), lerp(Y0, Y1, fx(p))); }
  ctx.lineTo(X1, Y0); ctx.closePath();
  const g = ctx.createLinearGradient(0, Y1, 0, Y0); g.addColorStop(0, 'rgba(232,184,75,.28)'); g.addColorStop(1, 'rgba(232,184,75,0)'); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath();
  for (let k = 0; k <= 160; k++) { const p = k / 160, x = lerp(X0, X1, p), y = lerp(Y0, Y1, fx(p)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.strokeStyle = cmGoldFill(ctx, X0, 0, X1, 0); ctx.lineWidth = 4; ctx.shadowColor = 'rgba(245,208,122,.8)'; ctx.shadowBlur = 18; ctx.stroke();
  ctx.restore();
  for (let k = 1; k <= 14; k++) {
    const p = k / 15; if (p > u) continue;
    const x = lerp(X0, X1, p), y = lerp(Y0, Y1, fx(p)), age = (u - p) * 6;
    circle(ctx, x, y, 6, CM.goldHi); ring(ctx, x, y, 6 + 18 * clamp(age), `rgba(245,208,122,${0.6 * (1 - clamp(age))})`, 1.5);
    if (age < 0.6) txt(ctx, `+¥${[780, 1950, 1170, 3705, 1950, 877][k % 6].toLocaleString()}`, x, y - 22 - age * 30, { font: F(800, 18, MONO), align: 'center', color: CM.goldHi, alpha: 1 - age / 0.6 });
  }
  if (u > 0) { const x = lerp(X0, X1, u), y = lerp(Y0, Y1, fx(u)); circle(ctx, x, y, 8, '#fff'); glowDisc(ctx, x, y, 60, [245, 208, 122], 0.6); }
  ctx.restore();
}

/* ───────────────────────── copy ───────────────────────── */
const MS_COPY = [
  [0.9, 4.5, '你的脸，', 160, 470, 92, 'left'], [1.9, 4.5, '你的声音，', 160, 580, 92, 'left'],
  [2.9, 4.5, '你的虚拟形象，', 160, 690, 92, 'left'], [3.9, 4.5, '你的灵感。', 160, 800, 92, 'left'],
  [4.9, 7.6, '都是你的资产。', 160, 620, 110, 'left', CM.goldHi],
  [8.2, 13.6, '可一旦上传，', 160, 500, 80, 'left'], [9.1, 13.6, '就被复制、被滥用，', 160, 620, 80, 'left'],
  [10.6, 13.6, '你却无从收回。', 160, 740, 80, 'left', CM.sub],
  [14.0, 15.4, '现在，米麦用密码守护它。', 960, 500, 66, 'center', CM.goldHi],
  [15.8, 18.6, '在你的设备上加密，', 960, 1002, 38, 'center'], [18.9, 20.2, '钥匙，只在你手里。', 960, 1002, 38, 'center', CM.goldHi],
  [20.6, 22.2, '卖使用权，不卖所有权。', 960, 1002, 38, 'center'], [22.6, 24.4, '每一次使用，都要你点头。', 960, 1002, 38, 'center', CM.goldHi],
  [24.8, 26.6, '用完即焚，原件不出域。', 960, 1002, 38, 'center'], [27.0, 30.0, '随时收回，一键撤销。', 960, 1002, 38, 'center', CM.goldHi],
  [40.2, 45.4, '每一次使用，', 160, 560, 84, 'left'], [41.0, 45.4, '都是一笔收入。', 160, 680, 84, 'left', CM.goldHi],
  [46.6, 53.0, '密码保护资产，', 960, 900, 72, 'center'], [47.4, 53.0, '数学生长价值。', 960, 1000, 72, 'center', CM.goldHi],
];
function msCopy(t) {
  for (const [a, b, s, x, y, size, align, col] of MS_COPY) {
    if (t < a - 0.1 || t > b + 0.6) continue;
    cmType(s, x, y, a, t, { size, align, color: col, out: b, stag: size > 60 ? 0.04 : 0.025 });
  }
}

/* ───────────────────────── 54–60 · logo ───────────────────────── */
function msLogo(t) {
  if (t < 53.4) return;
  if (t < 54.4) { const u = E.inOutCubic(seg(t, 53.4, 54.2)); cmCoin(ctx, 960, lerp(300, 400, u), lerp(14, 30, u), t * 8, seg(t, 53.4, 53.6) * (1 - seg(t, 54.1, 54.35))); }
  const ln = seg(t, 54.2, 54.7), lnOut = seg(t, 55.6, 56.0);
  if (ln > 0 && lnOut < 1) {
    const len = 520 * E.outCubic(ln);
    const g = ctx.createLinearGradient(960 - len, 0, 960 + len, 0); g.addColorStop(0, 'rgba(245,208,122,0)'); g.addColorStop(0.5, `rgba(255,240,200,${0.95 * (1 - lnOut)})`); g.addColorStop(1, 'rgba(245,208,122,0)');
    ctx.fillStyle = g; ctx.fillRect(960 - len, 398, 2 * len, 3);
  }
  const p = cmStep(t - 54.6, 10, 0.95);
  drawLogo(ctx, 960 - 400, 250 + (1 - clamp(p)) * 14, 800, E.inOutCubic(seg(t, 54.6, 55.6)), seg(t, 55.8, 57.0), clamp(p));
  cmType('米麦  ·  MIME TECH', 960, 520, 55.6, t, { size: 30, align: 'center', w: 800, color: CM.goldHi, ls: 8, stag: 0.02 });
  cmType('密码保护资产，数学生长价值。', 960, 640, 56.1, t, { size: 70, align: 'center', ls: 8 });
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
const MS_CAM = [[0, 1], [14.0, 1], [15.4, 1.3], [26.6, 1.3], [26.9, 1.25], [31.6, 1.25], [31.9, 1.1], [33.6, 1.0], [35.5, 1.1, true], [35.55, 1], [46, 1], [46.4, 1.0], [53.4, 1.06]];
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const S0 = cmTrack(t, MS_S);
  msBackdrop(t, S0);
  const zoom = cmSpr(t, MS_CAM, 9, 0.9);
  const shake = t > 35.5 && t < 35.9 ? (1 - (t - 35.5) / 0.4) * 9 : 0;
  ctx.save();
  ctx.translate(W / 2 + (hash(Math.floor(t * 60)) - 0.5) * shake, H / 2 + (hash(Math.floor(t * 60) + 3) - 0.5) * shake);
  ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  msGhosts(t);
  msDrawShape(t);
  msClimax(t);
  msValue(t);
  ctx.restore();
  msCopy(t);
  if (t > 14.4 && t < 29.8) {
    const wx = cmSpr(t, MS_CUR.map(k => [k[0], k[1]]), 9, 0.95), wy = cmSpr(t, MS_CUR.map(k => [k[0], k[2]]), 9, 0.95);
    const cx = W / 2 + (wx - W / 2) * zoom, cy = H / 2 + (wy - H / 2) * zoom;
    let press = 0; for (const c of MS_CLICK) press = Math.max(press, Math.sin(Math.PI * clamp((t - c + 0.08) / 0.18)));
    for (const [a, b] of MS_DRAG) if (t > a && t < b) press = 1;
    for (const c of MS_CLICK) cmRipple(cx, cy, seg(t, c, c + 0.5));
    const vis = seg(t, 14.4, 14.7) * (1 - seg(t, 15.6, 15.9)) + seg(t, 22.5, 22.8) * (1 - seg(t, 24.0, 24.3)) + seg(t, 26.9, 27.2) * (1 - seg(t, 29.4, 29.7));
    ctx.save(); ctx.globalAlpha = clamp(vis); cmCursor(cx, cy, press); ctx.restore();
  }
  msLogo(t);
  grain(t);
}
window.render = render;
