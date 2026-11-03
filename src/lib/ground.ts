/**
 * Grounds and light: night paper (indigo ink-dyed sheet, never flat black), old paper (pale 宣纸 / sepia),
 * the moon (the film's single warm light, like the amber bar in the reference), and light effects.
 */
import { H, W } from '../config'
import { TAU, clamp, lerp, rand } from './math'
import { cached, fbmField, fieldCanvas, paperBase, paperStains, smooth, type Ctx } from './texture'

/** Night sheet: deep indigo with ink blooms and faint fibres. `lift` 0..1 brightens toward dusk blue. */
export function nightPaper(ctx: Ctx, t: number, o: { lift?: number; seed?: number } = {}) {
  const seed = o.seed ?? 5
  const c = fieldCanvas(`night:${seed}`, 480, 201, () => {
    const a = fbmField(480, 201, 4, 5, seed, 'billow', 0.55)
    const b = fbmField(480, 201, 2, 3, seed + 9)
    for (let i = 0; i < a.length; i++) a[i] = a[i] * 0.6 + b[i] * 0.4
    return a
  }, (v, x, y) => {
    const k = smooth(0.2, 0.85, v)
    const vy = y / 201
    return [lerp(14, 34, k) + vy * 4, lerp(19, 42, k) + vy * 3, lerp(31, 62, k) - vy * 6, 1]
  })
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(c, 0, 0, W, H)
  const lift = o.lift ?? 0
  if (lift > 0) {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = clamp(lift)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgb(40,58,92)')
    g.addColorStop(1, 'rgb(12,16,26)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 0.5
  ctx.drawImage(nightFibres(), 0, 0)
  ctx.restore()
}

function nightFibres() {
  return cached('night:fibres', W, H, (g) => {
    g.lineCap = 'round'
    for (let i = 0; i < 2200; i++) {
      const x = rand(i, 1) * W, y = rand(i, 2) * H, a = rand(i, 3) * TAU, l = 6 + rand(i, 4) * 40
      g.strokeStyle = rand(i, 5) < 0.5 ? 'rgba(200,215,255,0.10)' : 'rgba(0,0,0,0.18)'
      g.lineWidth = 0.6 + rand(i, 6)
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l)
      g.stroke()
    }
  })
}

/** Old paper: pale xuan sheet with stains; `sepia` 0..1 warms it toward an old photograph. */
export function oldPaper(ctx: Ctx, t: number, o: { sepia?: number; stains?: number } = {}) {
  ctx.save()
  ctx.drawImage(paperBase('ash'), 0, 0, W, H)
  ctx.globalAlpha = clamp(o.stains ?? 0.6)
  ctx.drawImage(paperStains('ash'), 0, 0, W, H)
  ctx.globalAlpha = 1
  const sp = o.sepia ?? 0.3
  if (sp > 0) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = sp
    ctx.fillStyle = 'rgb(222,190,140)'
    ctx.fillRect(0, 0, W, H)
  }
  // breathing lamp light
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = 1
  const lx = W * (0.5 + 0.06 * Math.sin(t * 0.19)), ly = H * (0.45 + 0.05 * Math.cos(t * 0.15))
  const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.7)
  g.addColorStop(0, 'rgba(255,240,210,0.45)')
  g.addColorStop(1, 'rgba(60,35,15,0.4)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

/**
 * The moon: warm disc with a soft corona and a hand-made rim. `r` radius, `glow` 0..1, `phase` 0 = full,
 * >0 = crescent shadow from the right (0..1). `wet` adds the 金锁记 "red-yellow wet halo".
 */
export function moon(ctx: Ctx, x: number, y: number, r: number, o: { glow?: number; alpha?: number; phase?: number; wet?: number; t?: number } = {}) {
  const a = o.alpha ?? 1
  if (a <= 0) return
  const glow = o.glow ?? 1
  const t = o.t ?? 0
  ctx.save()
  ctx.globalAlpha = a
  ctx.globalCompositeOperation = 'screen'
  // corona
  const R = r * (4.2 + 0.15 * Math.sin(t * 0.7))
  let g = ctx.createRadialGradient(x, y, r * 0.6, x, y, R)
  g.addColorStop(0, `rgba(243,217,164,${0.42 * glow})`)
  g.addColorStop(0.25, `rgba(220,170,110,${0.16 * glow})`)
  g.addColorStop(1, 'rgba(120,80,60,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - R, y - R, R * 2, R * 2)
  const wet = o.wet ?? 0
  if (wet > 0) {
    const R2 = r * 1.9
    g = ctx.createRadialGradient(x, y, r * 0.8, x, y, R2)
    g.addColorStop(0, `rgba(230,150,80,${0.35 * wet})`)
    g.addColorStop(1, 'rgba(200,100,60,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - R2, y - R2, R2 * 2, R2 * 2)
  }
  // disc
  g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r)
  g.addColorStop(0, 'rgba(255,246,222,1)')
  g.addColorStop(0.7, 'rgba(246,224,176,1)')
  g.addColorStop(1, 'rgba(232,196,138,1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  // maria (soft blotches)
  ctx.globalCompositeOperation = 'multiply'
  for (let i = 0; i < 6; i++) {
    const mx = x + (rand(i, 71) - 0.5) * r * 1.1, my = y + (rand(i, 72) - 0.5) * r * 1.1, mr = r * (0.12 + rand(i, 73) * 0.22)
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr)
    mg.addColorStop(0, 'rgba(214,180,130,0.55)')
    mg.addColorStop(1, 'rgba(214,180,130,0)')
    ctx.fillStyle = mg
    ctx.beginPath()
    ctx.arc(mx, my, mr, 0, TAU)
    ctx.fill()
  }
  const ph = o.phase ?? 0
  if (ph > 0) {
    ctx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r + 0.5, 0, TAU)
    ctx.clip()
    ctx.fillStyle = 'rgba(16,20,32,0.92)'
    ctx.beginPath()
    ctx.arc(x - r * lerp(2, 0.15, ph), y, r * 1.02, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** Soft light shaft / spill (screen-blended radial). */
export function glowAt(ctx: Ctx, x: number, y: number, r: number, color: string, a = 0.5) {
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color.replace('ALPHA', String(a)))
  g.addColorStop(1, color.replace('ALPHA', '0'))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

/** Rain: slanted pale streaks, deterministic in t. */
export function rain(ctx: Ctx, t: number, o: { n?: number; alpha?: number; angle?: number; speed?: number; color?: string; len?: number } = {}) {
  const n = o.n ?? 260
  const ang = o.angle ?? 0.18
  const sp = o.speed ?? 1400
  const len = o.len ?? 34
  ctx.save()
  ctx.strokeStyle = o.color ?? 'rgba(200,214,240,1)'
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const z = 0.4 + rand(i, 2) * 0.6
    const x0 = rand(i, 1) * (W + 400) - 200
    const y = ((rand(i, 3) * (H + 200) + t * sp * z) % (H + 200)) - 100
    const x = x0 + y * Math.tan(ang)
    ctx.globalAlpha = (o.alpha ?? 0.35) * z
    ctx.lineWidth = 0.6 + z
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.sin(ang) * len * z, y + Math.cos(ang) * len * z)
    ctx.stroke()
  }
  ctx.restore()
}
