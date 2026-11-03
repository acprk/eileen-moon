/** H1 lab: preview sheet for the young 张爱玲 poses. One configuration per second of global time (from t=3). */
import { C, H, W } from '../config'
import { eileen, type EileenOpts, type EileenPose } from '../lib/eileen'
import type { Scene } from '../lib/film'
import { nightPaper, oldPaper } from '../lib/ground'
import { textImage } from '../lib/textmatter'
import type { Ctx } from '../lib/texture'

type Fig = { pose: EileenPose } & EileenOpts
type Cfg = { theme: 'night' | 'paper'; figs: Fig[] }

const N = C.lineNight
const CFG: Cfg[] = [
  // 3: iconic on paper (bust), 4: iconic on night
  { theme: 'paper', figs: [{ pose: 'iconic', x: 700, y: 800, h: 760 }, { pose: 'iconic', x: 1400, y: 600, h: 300, dress: '#3f5c7a' }] },
  { theme: 'night', figs: [{ pose: 'iconic', x: 700, y: 800, h: 760, color: N }, { pose: 'iconic', x: 1400, y: 600, h: 300, color: N, dress: C.jade }] },
  // 5/6: youngStand
  { theme: 'paper', figs: [{ pose: 'youngStand', x: 560, y: 760, h: 700 }, { pose: 'youngStand', x: 1150, y: 600, h: 300, dress: C.jade }, { pose: 'youngStand', x: 1500, y: 600, h: 130, dress: '#3f5c7a' }] },
  { theme: 'night', figs: [{ pose: 'youngStand', x: 560, y: 760, h: 700, color: N }, { pose: 'youngStand', x: 1150, y: 600, h: 300, color: N, dress: C.jade }, { pose: 'youngStand', x: 1500, y: 600, h: 130, color: N }] },
  // 7/8: lookBack
  { theme: 'paper', figs: [{ pose: 'lookBack', x: 560, y: 760, h: 700 }, { pose: 'lookBack', x: 1150, y: 600, h: 300, dress: C.jade }, { pose: 'lookBack', x: 1500, y: 600, h: 130 }] },
  { theme: 'night', figs: [{ pose: 'lookBack', x: 560, y: 760, h: 700, color: N }, { pose: 'lookBack', x: 1150, y: 600, h: 300, color: N, dress: '#3f5c7a' }] },
  // 9/10: walkUmbrella
  { theme: 'night', figs: [{ pose: 'walkUmbrella', x: 640, y: 780, h: 740, color: N, dress: C.jade }, { pose: 'walkUmbrella', x: 1300, y: 600, h: 300, color: N }, { pose: 'walkUmbrella', x: 1600, y: 600, h: 130, color: N }] },
  { theme: 'paper', figs: [{ pose: 'walkUmbrella', x: 640, y: 780, h: 740 }, { pose: 'walkUmbrella', x: 1300, y: 600, h: 300, dress: C.jade }] },
  // 11/12: writing
  { theme: 'paper', figs: [{ pose: 'writing', x: 760, y: 780, h: 700 }, { pose: 'writing', x: 1500, y: 600, h: 220 }] },
  { theme: 'night', figs: [{ pose: 'writing', x: 760, y: 780, h: 700, color: N }, { pose: 'writing', x: 1500, y: 600, h: 220, color: N }] },
  // 13: mid-drawing progress (no fill), 14: fill fading in
  { theme: 'paper', figs: [{ pose: 'iconic', x: 420, y: 760, h: 600, progress: 0.45, fill: 0 }, { pose: 'youngStand', x: 900, y: 760, h: 600, progress: 0.75, fill: 0 }, { pose: 'writing', x: 1450, y: 760, h: 500, progress: 0.6, fill: 0 }] },
  { theme: 'night', figs: [{ pose: 'lookBack', x: 420, y: 760, h: 600, progress: 0.92, fill: 0.4, color: N }, { pose: 'walkUmbrella', x: 1000, y: 760, h: 600, progress: 1, fill: 0, color: N }, { pose: 'youngStand', x: 1500, y: 760, h: 600, progress: 1, fill: 1, color: N, flip: true }] },
  // 15: small sizes row on paper
  { theme: 'paper', figs: [{ pose: 'iconic', x: 260, y: 560, h: 150 }, { pose: 'youngStand', x: 560, y: 560, h: 110 }, { pose: 'lookBack', x: 760, y: 560, h: 110 }, { pose: 'walkUmbrella', x: 1000, y: 560, h: 130 }, { pose: 'writing', x: 1350, y: 560, h: 110 }, { pose: 'youngStand', x: 1600, y: 560, h: 60 }] },
  // 16: face close-ups (iconic huge; youngStand / lookBack / writing heads large)
  { theme: 'paper', figs: [{ pose: 'iconic', x: 560, y: 2330, h: 2300 }, { pose: 'youngStand', x: 1250, y: 4200, h: 4200 }, { pose: 'lookBack', x: 1700, y: 4200, h: 4200 }] },
  { theme: 'paper', figs: [{ pose: 'writing', x: 1100, y: 1900, h: 2400 }] },
]

/** mono portrait in a photo frame on night paper (as segment F will show it) */
const MONO: { x: number; y: number; h: number; fw: number; progress?: number; fill?: number }[][] = [
  [{ x: 760, y: 700, h: 560, fw: 470 }, { x: 1420, y: 640, h: 300, fw: 250 }],
  [{ x: 960, y: 2050, h: 2000, fw: 1700 }],
  [{ x: 560, y: 700, h: 560, fw: 470, progress: 0.6, fill: 0 }, { x: 1300, y: 700, h: 560, fw: 470, progress: 1, fill: 0.5 }],
]

function bg(ctx: Ctx, t: number, theme: 'night' | 'paper') {
  if (theme === 'night') nightPaper(ctx, t)
  else oldPaper(ctx, t, { sepia: 0.25 })
}

export const scenes: Scene[] = [
  ...CFG.map((c, i): Scene => ({
    id: `H1-${i}`,
    t0: 3 + i,
    t1: 4 + i,
    theme: c.theme,
    noSubs: true,
    noLyrics: true,
    vignette: 0.2,
    draw(ctx, t) {
      bg(ctx, t, c.theme)
      ctx.font = '22px monospace'
      c.figs.forEach((f, j) => {
        const t0 = performance.now()
        eileen(ctx, f.pose, { t, ...f })
        const ms = performance.now() - t0
        ctx.fillStyle = c.theme === 'night' ? 'rgba(220,230,255,0.6)' : 'rgba(60,40,20,0.6)'
        ctx.fillText(`${f.pose} h=${f.h} ${ms.toFixed(1)}ms`, 20, 30 + j * 26)
      })
    },
  })),
  ...MONO.map((figs, i): Scene => ({
    id: `H1-mono-${i}`,
    t0: 20 + i,
    t1: 21 + i,
    theme: 'night',
    noSubs: true,
    noLyrics: true,
    vignette: 0.2,
    draw(ctx, t) {
      bg(ctx, t, 'night')
      ctx.font = '22px monospace'
      figs.forEach((f, j) => {
        const fh = f.h * 1.08, fx = f.x - f.fw / 2, fy = f.y - fh
        ctx.save()
        ctx.fillStyle = '#d9d3c6'
        ctx.fillRect(fx - 14, fy - 14, f.fw + 28, fh + 28)
        ctx.beginPath()
        ctx.rect(fx, fy, f.fw, fh)
        ctx.clip()
        const t0 = performance.now()
        eileen(ctx, 'iconic', { x: f.x, y: f.y, h: f.h, t, mono: true, progress: f.progress, fill: f.fill })
        const ms = performance.now() - t0
        ctx.restore()
        ctx.fillStyle = 'rgba(220,230,255,0.6)'
        ctx.fillText(`iconic mono h=${f.h} ${ms.toFixed(1)}ms`, 20, 30 + j * 26)
      })
    },
  })),
  {
    // text-as-material masks: left = raw mask drawing, right = textImage surfacing out of characters
    id: 'H1-mask',
    t0: 23,
    t1: 24,
    theme: 'night',
    noSubs: true,
    noLyrics: true,
    draw(ctx, t) {
      bg(ctx, t, 'night')
      eileen(ctx, 'iconic', { x: 330, y: 790, h: 640, color: '#fff', dress: '#666', fill: 1, weight: 3, boil: 0 })
      textImage(ctx, {
        key: 'H1-iconic', cell: 11, emerge: 1, t, scatter: 90,
        draw: (g) => eileen(g, 'iconic', { x: 1000, y: 790, h: 640, color: '#fff', dress: '#666', fill: 1, weight: 3, boil: 0 }),
      })
      textImage(ctx, {
        key: 'H1-walk', cell: 9, emerge: 1, t, scatter: 90,
        draw: (g) => eileen(g, 'lookBack', { x: 1600, y: 790, h: 620, color: '#fff', dress: '#666', fill: 1, weight: 4, boil: 0 }),
      })
    },
  },
  {
    id: 'H1-perf',
    t0: 3 + CFG.length,
    t1: 4 + CFG.length,
    theme: 'paper',
    noSubs: true,
    noLyrics: true,
    draw(ctx, t) {
      bg(ctx, t, 'paper')
      const poses: EileenPose[] = ['iconic', 'youngStand', 'lookBack', 'walkUmbrella', 'writing']
      ctx.font = '24px monospace'
      ctx.fillStyle = 'rgba(60,40,20,0.8)'
      poses.forEach((p, j) => {
        // warm-up then 5 timed draws at h=600
        eileen(ctx, p, { x: 200 + j * 360, y: 700, h: 600, t })
        const t0 = performance.now()
        for (let k = 0; k < 5; k++) eileen(ctx, p, { x: 200 + j * 360, y: 700, h: 600, t: t + k })
        const ms = (performance.now() - t0) / 5
        ctx.fillText(`${p} ${ms.toFixed(1)} ms`, 20, 40 + j * 30)
      })
      void W
      void H
    },
  },
]
