/** H2 lab: preview the five "other ages" poses. Times are global seconds starting at 10. */
import { C, FONT, H, W } from '../config'
import { eileen, type EileenPose } from '../lib/eileen'
import type { Scene } from '../lib/film'
import { moon, nightPaper, oldPaper } from '../lib/ground'
import { textImage } from '../lib/textmatter'

const POSES: EileenPose[] = ['child', 'girlWindow', 'shipRail', 'oldProfile', 'oldAtDesk']
/** focus point (box units) for close-ups */
const FOCUS: Record<string, [number, number, number]> = {
  child: [500, 200, 2200], girlWindow: [530, 420, 1500], shipRail: [500, 260, 1700], oldProfile: [520, 330, 1400], oldAtDesk: [460, 420, 2600],
}

function label(ctx: CanvasRenderingContext2D, s: string, night: boolean) {
  ctx.save()
  ctx.font = `22px ${FONT.en}`
  ctx.fillStyle = night ? 'rgba(220,230,250,0.8)' : 'rgba(40,30,20,0.8)'
  ctx.fillText(s, 24, 34)
  ctx.restore()
}

function timed(f: () => void) {
  const t0 = performance.now()
  f()
  return performance.now() - t0
}

const scenes: Scene[] = []
const base = 10
// 10..14 paper, big + small + flipped small
POSES.forEach((p, i) => {
  scenes.push({
    id: `H2-paper-${p}`, t0: base + i, t1: base + i + 1, theme: 'paper', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.2,
    draw(ctx, t) {
      oldPaper(ctx, t, { sepia: 0.25 })
      const ms = timed(() => eileen(ctx, p, { x: W * 0.33, y: H * 0.96, h: 740, t }))
      eileen(ctx, p, { x: W * 0.68, y: H * 0.72, h: 300, t })
      eileen(ctx, p, { x: W * 0.86, y: H * 0.5, h: 160, t, flip: true })
      label(ctx, `${p} paper h=740 ${ms.toFixed(0)} ms | h=300 | h=160 flip`, false)
    },
  })
})
// 15..19 night
POSES.forEach((p, i) => {
  scenes.push({
    id: `H2-night-${p}`, t0: base + 5 + i, t1: base + 6 + i, theme: 'night', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.2,
    draw(ctx, t) {
      nightPaper(ctx, t)
      moon(ctx, W * 0.78, H * 0.22, 46, { t })
      const ms = timed(() => eileen(ctx, p, { x: W * 0.4, y: H * 0.96, h: 600, t, color: C.lineNight }))
      label(ctx, `${p} night h=600 ${ms.toFixed(0)} ms`, true)
    },
  })
})
// 20..24 mid-drawing: progress .35 / .7 fill 0 / progress 1 fill .5
POSES.forEach((p, i) => {
  scenes.push({
    id: `H2-prog-${p}`, t0: base + 10 + i, t1: base + 11 + i, theme: 'paper', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.2,
    draw(ctx, t) {
      oldPaper(ctx, t, { sepia: 0.25 })
      eileen(ctx, p, { x: W * 0.18, y: H * 0.95, h: 520, t, progress: 0.35, fill: 0 })
      eileen(ctx, p, { x: W * 0.5, y: H * 0.95, h: 520, t, progress: 0.7, fill: 0 })
      eileen(ctx, p, { x: W * 0.8, y: H * 0.95, h: 520, t, progress: 1, fill: 0.5 })
      label(ctx, `${p} progress .35 / .7 (fill 0) / 1 (fill .5)`, false)
    },
  })
})
// 25..29 close-ups
POSES.forEach((p, i) => {
  scenes.push({
    id: `H2-close-${p}`, t0: base + 15 + i, t1: base + 16 + i, theme: 'paper', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.2,
    draw(ctx, t) {
      oldPaper(ctx, t, { sepia: 0.25 })
      const [fx, fy, h] = FOCUS[p]
      const s = h / 1000
      const x = W / 2 - (fx - 500) * s
      const y = H / 2 + (1000 - fy) * s
      const ms = timed(() => eileen(ctx, p, { x, y, h, t }))
      label(ctx, `${p} close-up h=${h} ${ms.toFixed(0)} ms`, false)
    },
  })
})

// 30..31 text-as-material masks (textImage), 32 raw masks
const MASKED: [EileenPose, number, number, number][] = [['shipRail', 0.4, 0.98, 760], ['oldAtDesk', 0.42, 0.98, 760]]
MASKED.forEach(([p, fx, fy, h], i) => {
  scenes.push({
    id: `H2-mask-${p}`, t0: base + 20 + i, t1: base + 21 + i, theme: 'night', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.2,
    draw(ctx, t) {
      nightPaper(ctx, t)
      moon(ctx, W * 0.8, H * 0.2, 46, { t })
      textImage(ctx, {
        key: `H2-mask-${p}`, cell: 11, emerge: 1, t,
        draw: (g) => eileen(g, p, { x: W * fx, y: H * fy, h, color: '#fff', dress: '#666', fill: 1, weight: 3.5, boil: 0 }),
      })
      label(ctx, `${p} as textImage mask (color #fff, dress #666, weight 3.5)`, true)
    },
  })
})
scenes.push({
  id: 'H2-rawmask', t0: base + 22, t1: base + 23, theme: 'night', noSubs: true, noLyrics: true, grain: 0, vignette: 0,
  draw(ctx) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    eileen(ctx, 'shipRail', { x: W * 0.27, y: H * 0.98, h: 760, color: '#fff', dress: '#666', fill: 1, weight: 3.5, boil: 0 })
    eileen(ctx, 'oldAtDesk', { x: W * 0.72, y: H * 0.98, h: 760, color: '#fff', dress: '#666', fill: 1, weight: 3.5, boil: 0 })
    label(ctx, 'raw masks', true)
  },
})

export { scenes }
