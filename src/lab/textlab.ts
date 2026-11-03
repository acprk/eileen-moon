/** Lead's lab for textmatter.ts (global t = 0..6). */
import { C, H, W } from '../config'
import { moon, nightPaper } from '../lib/ground'
import { eileen } from '../lib/eileen'
import { prog } from '../lib/math'
import type { Scene } from '../lib/film'
import { floatLines, textImage, textPlane, textRain } from '../lib/textmatter'

export const scenes: Scene[] = [
  {
    id: 'lab', t0: 0, t1: 10, theme: 'night', noSubs: true, noLyrics: true,
    draw(ctx, t) {
      nightPaper(ctx, t)
      textPlane(ctx, { y0: H * 0.62, t, light: 0.8, lightX: W * 0.7, rows: 18 })
      moon(ctx, W * 0.7, H * 0.2, 46, { t })
      textImage(ctx, {
        key: 'lab-iconic', cell: 11, emerge: prog(t, 0, 4), order: 'sweepYUp', t, scatter: 90,
        draw: (g) => eileen(g, 'iconic', { x: W * 0.36, y: H * 0.98, h: 720, color: '#fff', dress: '#bbb', fill: 1, weight: 3, boil: 0 }),
      })
      textRain(ctx, t, { n: 80, alpha: 0.35 })
      floatLines(ctx, t, [{ text: '因为懂得，所以慈悲。', x: W * 0.62, y: H * 0.4, t0: 0.5, t1: 5, size: 30, alpha: 0.7 }])
      void C
    },
  },
]
