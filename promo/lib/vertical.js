/* 9:16 compositor for the commercial cuts — a recomposition, not a centre crop.
 * The film renders its 16:9 scene (without copy) on #c; this file builds a 1080×1920 frame on #v:
 *  · a framing window that follows the action (keyframed centre/width, springs), scaled to the vertical width
 *  · a blurred, darkened extension of the same scene above and below, feathered into the window
 *  · the film's copy table re-laid out natively for vertical (big type in the lower third)
 * Page config: window.VCFG = { copy: <copy table>, crop: [[t, cx, cw], ...] }. Exposes window.renderV(t).
 */
(function () {
  const VW = 1080, VH = 1920;
  window.CM_NOCOPY = true;
  const vc = document.getElementById('v');
  const v = vc.getContext('2d');
  const src = document.getElementById('c');
  const small = Object.assign(document.createElement('canvas'), { width: 270, height: 480 });
  const sc = small.getContext('2d');

  // copy table rows: [in, out, text, x, y, size, align, colour] in 16:9 space → vertical position and size
  function vCopy(row) {
    const [a, b, s, x, y, size, align, col] = row;
    if (align === 'left') return { a, b, s, x: 72, y: 1360 + (y - 470) * 0.95, size: Math.min(86, size * 0.82), align: 'left', col };
    // centred lines: a headline in the upper band of the copy area, captions lower down
    const yy = y < 700 ? 1400 : 1540 + (y - 860) * 0.9;
    return { a, b, s, x: VW / 2, y: yy, size: Math.min(64, Math.max(46, size * 1.15)), align: 'center', col };
  }

  window.renderV = function (t) {
    const cfg = window.VCFG;
    render(t);   // the 16:9 scene, copy suppressed
    // framing window
    const cx = cmSpr(t, cfg.crop.map(k => [k[0], k[1]]), 6, 0.95), cw = cmSpr(t, cfg.crop.map(k => [k[0], k[2]]), 6, 0.95);
    const s = VW / cw, dh = 1080 * s, top = 790 - dh / 2;
    // background: the scene, cover-scaled, blurred cheaply via a small canvas, darkened
    // (cover = the centre 608×1080 of the 16:9 frame; drawing it through a 270×480 canvas is a cheap blur)
    sc.drawImage(src, cx - 304, 0, 608, 1080, 0, 0, 270, 480);
    v.save();
    v.fillStyle = CM.bg0; v.fillRect(0, 0, VW, VH);
    v.filter = 'blur(6px)'; v.globalAlpha = 0.55;
    v.drawImage(small, 0, 0, 270, 480, -60, -60, VW + 120, VH + 120);
    v.filter = 'none'; v.globalAlpha = 1;
    const dim = v.createLinearGradient(0, 0, 0, VH);
    dim.addColorStop(0, 'rgba(5,7,13,.78)'); dim.addColorStop(0.5, 'rgba(5,7,13,.55)'); dim.addColorStop(1, 'rgba(5,7,13,.9)');
    v.fillStyle = dim; v.fillRect(0, 0, VW, VH);
    // the window
    v.drawImage(src, cx - cw / 2, 0, cw, 1080, 0, top, VW, dh);
    // feather its top and bottom edges into the background
    const f = 140;
    let g = v.createLinearGradient(0, top, 0, top + f); g.addColorStop(0, 'rgba(5,7,13,1)'); g.addColorStop(1, 'rgba(5,7,13,0)');
    v.fillStyle = g; v.fillRect(0, top - 2, VW, f + 2);
    g = v.createLinearGradient(0, top + dh - f, 0, top + dh); g.addColorStop(0, 'rgba(5,7,13,0)'); g.addColorStop(1, 'rgba(5,7,13,1)');
    v.fillStyle = g; v.fillRect(0, top + dh - f, VW, f + 2);
    // a quiet brand line at the top (not during the logo ending, which carries its own)
    const ba = seg(t, 0.9, 1.6) * (1 - seg(t, 53.2, 53.8));
    if (ba > 0) {
      v.save(); v.globalAlpha = ba * 0.85;
      v.font = F(800, 26, CJK); v.letterSpacing = '4px';
      const tw2 = v.measureText(cfg.brand).width, mw = 36 * 800 / 475, x0 = VW / 2 - (mw + 16 + tw2) / 2;
      mark(v, x0, 118, 36);
      txt(v, cfg.brand, x0 + mw + 16, 146, { font: F(800, 26, CJK), color: CM.text, ls: 4 });
      line(v, VW / 2 - 40, 186, VW / 2 + 40, 186, 'rgba(245,208,122,.6)', 2);
      v.restore();
    }
    // copy, laid out for vertical
    for (const row of cfg.copy) {
      const c = vCopy(row);
      if (t < c.a - 0.1 || t > c.b + 0.6) continue;
      cmType(c.s, c.x, c.y, c.a, t, { size: c.size, align: c.align, color: c.col, out: c.b, stag: c.size > 60 ? 0.04 : 0.025, ctx: v });
    }
    // closing fade follows the film
    const end = seg(t, 59.4, 60);
    if (end > 0) { v.fillStyle = `rgba(0,0,0,${end})`; v.fillRect(0, 0, VW, VH); }
    v.restore();
  };
})();
