/** Bilibili cover (render at t=5, then pad to 1920×1080). Keep the subject inside x 260–1660 (4:3 safe area). */
import { FONT, H } from '../config'
import { eileen } from '../lib/eileen'
import { glowAt, moon, nightPaper } from '../lib/ground'
import type { Scene } from '../lib/film'
import { floatLines, textPlane } from '../lib/textmatter'

const PX = 450, PY = 70, PW = 470, PH = 600 // photo print

export const scenes: Scene[] = [
  {
    id: 'cover', t0: 0, t1: 10, theme: 'night', noSubs: true, noLyrics: true, grain: 0.3, vignette: 0.55,
    draw(ctx) {
      const t = 5
      nightPaper(ctx, t)
      textPlane(ctx, { y0: H * 0.72, t, light: 1, lightX: 1300, rows: 16, alpha: 0.85 })
      moon(ctx, 1300, 200, 80, { t, glow: 1.3 })
      floatLines(ctx, 9, [
        { text: '见了他，她变得很低很低，低到尘埃里。', x: 1190, y: 600, t0: 0, t1: 20, size: 17, alpha: 0.5, drift: 0 },
      ])
      // the 1954 portrait as a silver print, slightly tilted, lit by the moon
      ctx.save()
      ctx.translate(PX + PW / 2, PY + PH / 2)
      ctx.rotate(-0.035)
      ctx.translate(-(PX + PW / 2), -(PY + PH / 2))
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 40
      ctx.shadowOffsetY = 14
      ctx.fillStyle = '#efe9dc'
      ctx.fillRect(PX - 18, PY - 18, PW + 36, PH + 36)
      ctx.shadowColor = 'transparent'
      ctx.beginPath()
      ctx.rect(PX, PY, PW, PH)
      ctx.clip()
      eileen(ctx, 'iconic', { x: PX + PW / 2, y: PY + PH + 10, h: 600, mono: true, fill: 1, boil: 0, t })
      ctx.restore()
      glowAt(ctx, 1300, 200, 700, 'rgba(243,217,164,ALPHA)', 0.1)
      // title
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(5,8,16,0.95)'
      ctx.shadowBlur = 20
      ctx.fillStyle = '#f7eed9'
      ctx.font = `400 96px ${FONT.kai}`
      ;[...'一个有月亮的晚上'].forEach((ch, i) => ctx.fillText(ch, 1080, 70 + i * 88))
      ctx.fillStyle = 'rgba(244,232,208,0.95)'
      ctx.font = `400 40px ${FONT.zh}`
      ;[...'张爱玲'].forEach((ch, i) => ctx.fillText(ch, 1200, 330 + i * 52))
      ctx.textAlign = 'left'
      ctx.font = `italic 400 34px ${FONT.en}`
      ctx.fillText('1920 — 1995', 1245, 440)
      ctx.font = `400 28px ${FONT.zh}`
      ctx.fillStyle = 'rgba(244,232,208,0.8)'
      ctx.fillText('手绘传记', 1245, 494)
      ctx.fillText('赵雷《程艾影》', 1245, 536)
      ctx.restore()
    },
  },
]
