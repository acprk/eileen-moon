/**
 * Segment E · 176.866–211.603 s · chorus 2 + post-chorus · America, 1955–1990s.  OWNER: agent E.
 * Images made of her words and light (textmatter), pen lines as delicate traces.
 *
 *   E1a 176.87  the Pacific as a plane of words under the moon column; the liner surfaces out of characters
 *   E1b 179.51  she at the rail; 《童言无忌》 line written across the sky (continues from E1a)
 *   E2  182.16  New York 1955: a street canyon whose walls are English words; she and 胡适 on the steps;
 *               《忆胡适之》 line blown in on the wind from the Hudson; windows of words light on the beats
 *   E3  185.83  1956, MacDowell Colony: woods of characters, snow of characters, two figures, one step per beat
 *   E4  190.03  1967: the empty chair with his hat; a golden column of words toward the setting sun; one line
 *               of footprints (one more each beat)
 *   E5a 194.26  1972, Los Angeles: a stucco block made of words, palms; windows go dark on the beats
 *   E5b 195.84  her door: four locks click on four beats, the blinds shut on the fifth
 *   E6a 198.46  rain of characters outside her window; she at the desk
 *   E6b 202.66  close on the wet glass: the line written in the condensation, drops, the blurred moon
 *   E7  206.36  beat montage: doors, boxes, airmail letters, rewritten pages surface out of characters → lift-off
 */
import { C, FONT, H, W } from '../config'
import { SEGMENTS } from '../data/script'
import { eileen } from '../lib/eileen'
import type { Scene } from '../lib/film'
import { moon, nightPaper, oldPaper } from '../lib/ground'
import { TAU, beatPos, beatPulse, beatTime, clamp, ease, hit, lerp, prog, rand } from '../lib/math'
import { hatch, pathPolys, penDraw, penStroke, sketchEllipse, sketchLine, type PenStyle, type Poly } from '../lib/pen'
import { textImage, textPlane, textRain } from '../lib/textmatter'
import { cached, type Ctx } from '../lib/texture'
import { writeVertical } from '../lib/type'

const [S0, S1] = SEGMENTS.E
const B = beatTime
const T1B = B(346), T2 = B(351), T3 = B(358), T4 = B(366), T5 = B(374), T5B = B(377), T6 = B(382), T6B = B(390), T7 = B(397)

type St = PenStyle
const NL = (t: number, o: St = {}): St => ({ color: C.lineNight, width: 1.6, boil: 8, t, ...o })
const PL = (t: number, o: St = {}): St => ({ color: C.ink, width: 1.8, boil: 8, t, ...o })
/** styles for cached layers: boil seed = layer variant */
const nb = (bt: number, o: St = {}) => NL(bt, { boil: 1, ...o })
const pb = (bt: number, o: St = {}) => PL(bt, { boil: 1, ...o })

/** A static drawing cached in 3 boil states (cycled at 8 fps). Inside `draw` use boil:1, t:bt. */
function boiled(key: string, t: number, draw: (g: Ctx, bt: number) => void, w = W, h = H) {
  const v = Math.floor(t * 8) % 3
  return cached(`segE:${key}:${v}`, w, h, (g) => draw(g, v + 0.5))
}

function zoom(ctx: Ctx, cx: number, cy: number, s: number, rot = 0, dx = 0, dy = 0) {
  ctx.translate(cx + dx, cy + dy)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.translate(-cx, -cy)
}
const rev = (p: Poly): Poly => {
  const o: Poly = []
  for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1])
  return o
}
const closed = (p: Poly): Poly => [...p, p[0], p[1]]
/** cubic Bézier sampled to a polyline (for per-frame shapes; avoids growing the path-string cache) */
function bez(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, n = 10): Poly {
  const p: Poly = []
  for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s
    p.push(u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3, u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3)
  }
  return p
}
function pathOf(pts: number[]) {
  const p = new Path2D()
  p.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1])
  p.closePath()
  return p
}
const nightTex = () => cached('segE:nightTex', W, H, (g) => nightPaper(g, 0))
const paperTex = () => cached('segE:paperTex', W, H, (g) => oldPaper(g, 0, { sepia: 0.12, stains: 0.25 }))
const patCache = new WeakMap<Ctx, { n?: CanvasPattern; p?: CanvasPattern }>()
function pat(ctx: Ctx, which: 'n' | 'p') {
  let e = patCache.get(ctx)
  if (!e) patCache.set(ctx, (e = {}))
  return (e[which] ??= ctx.createPattern(which === 'n' ? nightTex() : paperTex(), 'repeat')!)
}
/** Opaque matte cut from the night paper (keeps its texture), tinted. */
function nMatte(ctx: Ctx, pts: number[], dark = 0.3, tint = '6,9,18') {
  const p = pathOf(pts)
  ctx.save()
  ctx.fillStyle = pat(ctx, 'n')
  ctx.fill(p)
  ctx.fillStyle = `rgba(${tint},${dark})`
  ctx.fill(p)
  ctx.restore()
}
/** Opaque matte cut from the paper. */
function pMatte(ctx: Ctx, pts: number[], tint = 'rgba(255,252,244,0.25)') {
  const p = pathOf(pts)
  ctx.save()
  ctx.fillStyle = pat(ctx, 'p')
  ctx.fill(p)
  ctx.fillStyle = tint
  ctx.fill(p)
  ctx.restore()
}
function dots(ctx: Ctx, pts: [number, number, number][], color: string, a = 1) {
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha *= a
  ctx.beginPath()
  for (const [x, y, r] of pts) {
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, TAU)
  }
  ctx.fill()
  ctx.restore()
}
function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a: number, op: GlobalCompositeOperation = 'screen') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.save()
  ctx.globalCompositeOperation = op
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  ctx.restore()
}

/** Horizontal text that lands character by character (optionally flying in from the right on the wind). */
function lineText(ctx: Ctx, t: number, text: string, x: number, y: number, o: { size: number; t0: number; rate: number; color: string; font?: string; style?: string; gap?: number; alpha?: number; fly?: number; shadow?: string; wave?: number }) {
  const chars = [...text]
  ctx.save()
  ctx.font = `${o.style ?? ''} 400 ${o.size}px ${o.font ?? FONT.kai}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (o.shadow) {
    ctx.shadowColor = o.shadow
    ctx.shadowBlur = 12
  }
  let cx = x
  chars.forEach((ch, i) => {
    const w = ctx.measureText(ch).width + (o.gap ?? 3)
    const st = o.t0 + i * o.rate
    const dur = o.fly ? 0.8 : 0.45
    const p = prog(t, st, st + dur)
    if (p > 0) {
      const e = o.fly ? ease.outQuart(p) : ease.outCubic(p)
      const fly = o.fly ?? 0
      const wv = (o.wave ?? 0) * Math.sin(t * 2.1 + i * 0.6)
      ctx.save()
      ctx.globalAlpha *= clamp(p * 2.2) * (o.alpha ?? 1)
      if (p < 0.9) ctx.filter = `blur(${(1 - p / 0.9) * (fly ? 5 : 3)}px)`
      ctx.translate(cx + w / 2 + (1 - e) * fly, y + wv + (1 - e) * (fly ? (rand(i, 3) - 0.5) * 140 : 6))
      ctx.rotate((1 - e) * (fly ? (rand(i, 4) - 0.5) * 2 : 0))
      ctx.fillStyle = o.color
      ctx.fillText(ch, 0, 0)
      ctx.restore()
    }
    cx += w
  })
  ctx.restore()
}

// ══════════════════════════════════════ E1 · the Pacific ══════════════════════════════════════

const SEA_QUOTE = ['像我们这样生长在都市文化中的人，总是先看见海的图画，后看见海；', '先读到爱情小说，后知道爱。']
const SEA_WORDS = ['先看见海的图画', '后看见海', '先读到爱情小说', '后知道爱', '生长在都市文化中的人', '像我们这样', '总是先看见海的图画']
const SHIP_CORPUS = '像我们这样生长在都市文化中的人总是先看见海的图画后看见海先读到爱情小说后知道爱'

/** 《童言无忌》 written across the night sky, continuous over E1a → E1b. */
function seaQuote(ctx: Ctx, t: number) {
  const a = 1 - prog(t, T2 - 0.5, T2 + 0.1)
  if (a <= 0) return
  const o = { size: 31, rate: 0.072, color: 'rgba(236,230,214,0.92)', shadow: 'rgba(5,8,16,0.9)', gap: 3, alpha: a, wave: 1.5 }
  lineText(ctx, t, SEA_QUOTE[0], 112, 84, { ...o, t0: 177.25 })
  lineText(ctx, t, SEA_QUOTE[1], 112, 134, { ...o, t0: 177.25 + 31 * 0.072 + 0.25 })
}

/** Sparse pen wave traces over the word-sea; moon-road glints under `mx`. */
function seaRows(ctx: Ctx, t: number, lt: number, HY: number, mx: number, o: { yMax?: number; speed?: number; dense?: number; road?: number; alpha?: number } = {}) {
  const NR = 30
  const s = lt * (o.speed ?? 2.4) + 50
  const m1 = Math.floor(s)
  const pulse = beatPulse(t, 5)
  const yMax = o.yMax ?? H + 60
  for (let m = m1 - NR + 1; m <= m1; m++) {
    const z = (s - m) / NR
    const y = HY + 3 + (yMax - HY) * Math.pow(z, 2.2)
    const n = Math.round(lerp(18, 4, Math.sqrt(z)) * (o.dense ?? 1))
    const len = lerp(12, 230, Math.pow(z, 1.3))
    const a = clamp(z * 14) * lerp(0.25, 0.6, z) * (0.8 + 0.35 * pulse) * (o.alpha ?? 1)
    for (let k = 0; k < n; k++) {
      const x = rand(m * 31 + k, 7) * (W + 300) - 150
      const amp = len * (0.05 + 0.05 * rand(k, m))
      const yy = y + (rand(k, m + 5) - 0.5) * lerp(2, 30, z)
      const lean = rand(k, m + 6) < 0.5 ? 1 : 0.6
      penStroke(ctx, bez(x, yy, x + len * 0.3 * lean, yy - amp * 1.3, x + len * 0.6, yy - amp * 1.1, x + len, yy + amp * 0.25, 7), 1,
        NL(t, { width: lerp(0.6, 2.2, z), alpha: a, seed: m * 7 + k, wobble: 0.4 + z * 0.8, wave: 30 + len * 0.5, taperIn: len * 0.4, taperOut: len * 0.5, nib: false }))
    }
    const spread = lerp(14, 300, z)
    const ng = Math.round(lerp(2, 8, z) * (o.road ?? 1))
    for (let k = 0; k < ng; k++) {
      const r = rand(m * 13 + k, 21) - 0.5
      const gx = mx + r * Math.abs(r) * 4 * spread
      const tw = rand(m * 5 + k, Math.floor(t * 7) + 3)
      const gl = lerp(5, 85, z) * (0.4 + rand(k, m + 9))
      penStroke(ctx, [gx - gl / 2, y + 2, gx + gl / 2, y + 1], 1, { color: C.moon, width: lerp(0.8, 3.4, z), alpha: clamp(z * 10) * (0.3 + 0.7 * tw) * 0.8, op: 'screen', wobble: 0.4, taperIn: gl * 0.45, taperOut: gl * 0.45, nib: false })
    }
  }
}

/** On each beat, a few crests break (drawn fast) and throw spray. */
function whitecaps(ctx: Ctx, t: number, HY: number, b0: number, b1: number, o: { yMax?: number; speed?: number; xMin?: number; xMax?: number; z0?: number; z1?: number } = {}) {
  const yMax = o.yMax ?? H + 60
  for (let i = b0; i < b1; i++) {
    const age = t - B(i)
    if (age < 0 || age > 1.4) continue
    for (let j = 0; j < 3; j++) {
      const z = lerp(o.z0 ?? 0.3, o.z1 ?? 0.8, rand(i * 3 + j, 41)) + (age * (o.speed ?? 2.4)) / 30
      const y = HY + 3 + (yMax - HY) * Math.pow(z, 2.2)
      const x = (o.xMin ?? 60) + rand(i * 3 + j, 42) * ((o.xMax ?? W - 300) - (o.xMin ?? 60))
      const L = lerp(20, 150, z)
      const p = ease.outCubic(prog(age, 0, 0.16))
      const a = (1 - prog(age, 0.3, 1.4)) * 0.7
      const crest = [...bez(x, y, x + L * 0.25, y - L * 0.2, x + L * 0.62, y - L * 0.24, x + L * 0.82, y - L * 0.09, 10), ...bez(x + L * 0.82, y - L * 0.09, x + L * 0.92, y - L * 0.01, x + L * 0.8, y + L * 0.05, x + L * 0.7, y - L * 0.03, 6).slice(2)]
      penStroke(ctx, crest, p, NL(t, { width: lerp(0.8, 2.2, z), alpha: a, seed: i * 5 + j }))
      penStroke(ctx, [x - L * 0.15, y + L * 0.05, x + L * 0.5, y + L * 0.02, x + L * 1.1, y + L * 0.06], p, NL(t, { width: lerp(0.8, 2, z), alpha: a * 0.6, seed: i * 9 + j }))
      const sp: [number, number, number][] = []
      for (let k = 0; k < 9; k++) {
        const r = rand(i * 40 + j * 9 + k, 43)
        sp.push([x + L * (0.7 + r * 0.35), y - L * (0.12 + rand(k, i + j) * 0.2) - age * 40 * z + age * age * 60 * z, lerp(0.6, 2.4, z) * (0.5 + r)])
      }
      dots(ctx, sp, C.lineNight, a * 0.7 * clamp(age * 8))
    }
  }
}

// ── the liner (2-point perspective along its length; u = bow→stern, hm = metres above water) ──
const SX0 = 230, SLEN = 1270, SHY = 352, SPX = 10.5
const sf = (u: number) => (u * 2) / (1 + u)
const sk = (u: number) => 1 / (1 + u)
const SP = (u: number, hm: number): [number, number] => [SX0 + SLEN * sf(u), SHY + 175 * sk(u) - hm * SPX * sk(u)]
function sl(u0: number, h0: number, u1: number, h1: number, n = 8): Poly {
  const p: Poly = []
  for (let i = 0; i <= n; i++) p.push(...SP(lerp(u0, u1, i / n), lerp(h0, h1, i / n)))
  return p
}
function sc(u0: number, u1: number, hf: (u: number) => number, n = 40): Poly {
  const p: Poly = []
  for (let i = 0; i <= n; i++) {
    const u = lerp(u0, u1, i / n)
    p.push(...SP(u, hf(u)))
  }
  return p
}
const sheer = (u: number) => 10 + 3.2 * Math.pow(1 - u, 3)
/** two streamlined funnels (offsets along the hull from u≈0.546) */
const FUN_D = [-0.08, 0.075]
const fnL = (h: number, d = 0) => 0.515 + d + (0.02 * (h - 20)) / 13
const fnR = (h: number, d = 0) => 0.577 + d + (0.017 * (h - 20)) / 13
const funnelPts = (d: number) => [...SP(fnL(20, d), 20), ...SP(fnL(33, d), 33), ...SP(0.562 + d, 33.9), ...SP(fnR(33, d), 33), ...SP(fnR(20, d), 20)]
function shipParts() {
  const hullTop = sc(0, 1, sheer, 70)
  const wl = sc(0.04, 0.985, () => 0, 50)
  const hull = [...hullTop, ...SP(0.997, 6), ...SP(0.99, 2.5), ...rev(wl), ...SP(0.02, 6)]
  const supA = [...SP(0.18, sheer(0.18)), ...SP(0.176, 13.5), ...sc(0.18, 0.86, () => 16, 30), ...SP(0.86, sheer(0.86))]
  const supB = [...SP(0.22, 16), ...SP(0.218, 18), ...sc(0.222, 0.78, () => 20, 30), ...SP(0.78, 16)]
  const supC = [...SP(0.235, 20), ...sc(0.235, 0.345, () => 24.2, 10), ...SP(0.345, 20)]
  const funnels = FUN_D.map(funnelPts)
  const boats: number[][] = []
  for (let i = 0; i < 6; i++) {
    const uc = 0.39 + i * 0.064
    const keel = [...SP(uc - 0.027, 22.8), ...SP(uc - 0.021, 21.5), ...SP(uc, 21.0), ...SP(uc + 0.021, 21.5), ...SP(uc + 0.027, 22.8)]
    boats.push([...keel, ...rev(sl(uc - 0.027, 22.8, uc + 0.027, 22.8, 4))])
  }
  return { hullTop, wl, hull, supA, supB, supC, funnels, boats }
}

/** mask for the textImage ship: grey bodies, white contours, bright portholes */
function shipMask(g: Ctx) {
  const P = shipParts()
  const fill = (pts: number[], c: string) => {
    g.fillStyle = c
    g.fill(pathOf(pts))
  }
  fill(P.hull, '#8a8a8a')
  fill(P.supA, '#c0c0c0')
  fill(P.supB, '#c8c8c8')
  fill(P.supC, '#d0d0d0')
  for (const f of P.funnels) fill(f, '#a4a4a4')
  for (const b of P.boats) fill(b, '#e4e4e4')
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const line = (p: Poly, w: number) => {
    g.lineWidth = w
    g.beginPath()
    g.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1])
    g.stroke()
  }
  line(P.hullTop, 4)
  line(P.wl, 3)
  line(sl(0, sheer(0), 0.04, 0, 6), 4)
  line(sc(0.18, 0.86, () => 16, 30), 3)
  line(sc(0.222, 0.78, () => 20, 30), 3)
  line(sc(0.19, 0.85, () => 13.6, 30), 2.4)
  line(sc(0.235, 0.77, () => 18.2, 24), 2.2)
  for (const f of P.funnels) line(closed(f), 3.4)
  line(sl(0.11, sheer(0.11), 0.118, 32, 8), 3)
  line(sl(0.88, sheer(0.88), 0.888, 30, 8), 3)
  for (let u = 0.07; u < 0.96; u += 0.021) {
    const [x, y] = SP(u, 6.8)
    g.beginPath()
    g.arc(x, y, 3.2 * sk(u) + 1.4, 0, TAU)
    g.fill()
  }
}

function drawShipMatte(g: Ctx) {
  const P = shipParts()
  nMatte(g, P.hull, 0.45)
  for (const s of [P.supA, P.supB, P.supC]) nMatte(g, s, 0.25)
  for (const f of P.funnels) nMatte(g, f, 0.35)
  for (const b of P.boats) nMatte(g, b, 0.2)
}

/** delicate pen traces of the liner, laid over its body of characters */
function drawShipLines(g: Ctx, bt: number) {
  const st = (w: number, a = 0.62, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  const P = shipParts()
  penDraw(g, [P.hullTop, P.wl], 1, st(2))
  penDraw(g, [sl(0, sheer(0), 0.04, 0, 6), [...SP(1, sheer(1)), ...SP(0.997, 6), ...SP(0.99, 2.5), ...SP(0.985, 0)]], 1, st(2.2))
  // name on the bow
  {
    const [x0, y0] = SP(0.045, 9.4)
    const [x1, y1] = SP(0.16, 9.4)
    g.save()
    g.translate(x0, y0)
    g.rotate(Math.atan2(y1 - y0, x1 - x0))
    g.font = `600 11px ${FONT.en}`
    ;(g as any).letterSpacing = '1.5px'
    g.fillStyle = 'rgba(214,224,242,0.8)'
    g.fillText('PRESIDENT CLEVELAND', 0, 0)
    g.restore()
  }
  penStroke(g, sc(0, 0.17, (u) => sheer(u) + 1.2, 16), 1, st(0.7, 0.5))
  for (let u = 0.01; u < 0.17; u += 0.012) penStroke(g, sl(u, sheer(u), u, sheer(u) + 1.2, 1), 1, st(0.5, 0.45, { seed: u * 300 }))
  penDraw(g, [[...SP(0.18, sheer(0.18)), ...SP(0.176, 13.5), ...SP(0.18, 16)], sc(0.18, 0.86, () => 16, 30), sl(0.86, 16, 0.86, sheer(0.86), 3)], 1, st(1.4))
  penDraw(g, [[...SP(0.22, 16), ...SP(0.218, 18), ...SP(0.222, 20)], sc(0.222, 0.78, () => 20, 30), sl(0.78, 20, 0.78, 16, 2)], 1, st(1.3))
  penDraw(g, [sl(0.235, 20, 0.235, 24.2, 2), sc(0.235, 0.345, () => 24.2, 10), sl(0.345, 24.2, 0.345, 20, 2), sl(0.215, 20.4, 0.37, 20.4, 6)], 1, st(1.3))
  for (let u = 0.243; u < 0.34; u += 0.0085) penStroke(g, sl(u, 21.6, u, 23.4, 1), 1, st(0.5, 0.55, { seed: u * 511 }))
  // masts, rigging, signal flags
  penDraw(g, [sl(0.11, sheer(0.11), 0.118, 32, 8), sl(0.1, 27, 0.135, 27, 3), sl(0.88, sheer(0.88), 0.888, 30, 8), sl(0.872, 25.5, 0.9, 25.5, 3)], 1, st(1.6, 0.8))
  penDraw(g, [sl(0.118, 32, 0.004, sheer(0) + 0.2, 10), sl(0.118, 31.5, 0.888, 29.5, 20), sl(0.888, 30, 0.995, sheer(1) + 0.5, 8), sl(0.118, 27, 0.09, sheer(0.09), 6), sl(0.118, 27, 0.15, sheer(0.15), 6), sl(0.888, 25.5, 0.86, 16, 6), sl(0.888, 25.5, 0.92, sheer(0.92), 6)], 1, st(0.6, 0.45))
  for (let i = 0; i < 9; i++) {
    const [x, y] = SP(lerp(0.118, 0.012, i / 9), lerp(31.6, sheer(0) + 1, i / 9))
    penStroke(g, [x, y, x - 4, y + 7, x + 3, y + 6], 1, st(0.7, 0.5, { seed: 400 + i }))
  }
  penDraw(g, [sl(0.065, sheer(0.065), 0.065, 20, 3), sl(0.065, 18.5, 0.15, 13.3, 6), sl(0.93, sheer(0.93), 0.93, 18, 3), sl(0.93, 17, 0.86, 12, 6)], 1, st(1, 0.6))
  // funnel with its band
  for (const d of FUN_D) {
    penDraw(g, [sl(fnL(20, d), 20, fnL(33, d), 33, 4), sl(fnR(20, d), 20, fnR(33, d), 33, 4), [...SP(fnL(33, d), 33), ...SP(0.562 + d, 32.3), ...SP(fnR(33, d), 33)], [...SP(fnL(33, d), 33), ...SP(0.562 + d, 33.9), ...SP(fnR(33, d), 33)]], 1, st(1.6, 0.75))
    for (const h of [28.6, 30.8]) penStroke(g, [...SP(fnL(h, d), h), ...SP(0.548 + d, h - 0.35), ...SP(fnR(h, d), h)], 1, st(1, 0.7))
  }
  // lifeboats & davits
  for (let i = 0; i < 6; i++) {
    const uc = 0.39 + i * 0.064
    penDraw(g, [P.boats[i].slice(0, 10), sl(uc - 0.027, 22.8, uc + 0.027, 22.8, 4)], 1, st(1, 0.7))
    penDraw(g, [[...SP(uc - 0.029, 20), ...SP(uc - 0.03, 24.4), ...SP(uc - 0.025, 25)], [...SP(uc + 0.029, 20), ...SP(uc + 0.028, 24.4), ...SP(uc + 0.023, 25)]], 1, st(1, 0.7))
  }
}

function shipSmoke(ctx: Ctx, t: number, lt: number) {
  FUN_D.forEach((d, q) => {
    const [fx, fy] = SP(0.562 + d, 34)
    const L = q ? 0.75 : 1
    const path = (s: number, j: number): [number, number] => [fx + s * 380 * L + j * 5 * s, fy - s * 210 * L + s * s * 50 + Math.sin(s * 6 - lt * 1.8 + j * 0.9 + q) * 18 * s + (j - 2) * 8 * s]
    for (let k = 0; k < 8; k++) {
      const s = 0.08 + k * 0.12
      const [px, py] = path(s, 2)
      glow(ctx, px, py, 16 + s * 80 * L, '150,162,190', 0.1 * (1 - s * 0.8), 'source-over')
    }
    for (let j = 0; j < 5; j++) {
      const p: Poly = []
      const len = 0.55 + rand(j + q * 7, 5) * 0.45
      for (let i = 0; i <= 24; i++) {
        const [px, py] = path((i / 24) * len, j)
        p.push(px + (j - 2) * 3, py)
      }
      penStroke(ctx, p, 1, NL(t, { width: 1.1 - j * 0.1, alpha: 0.28 - Math.abs(j - 2) * 0.05, seed: 900 + j + q * 10, taperIn: 10, taperOut: 180, wobble: 1.6 }))
    }
  })
}

function bowWave(ctx: Ctx, t: number, lt: number) {
  const st = (w: number, a: number, sd: number) => NL(t, { width: w, alpha: a, seed: sd })
  for (let j = 0; j < 4; j++) {
    const p: Poly = []
    for (let i = 0; i <= 14; i++) {
      const [x, y] = SP(0.035 + i * 0.012 + j * 0.01, -0.2)
      p.push(x, y + 2 + j * 3.5 + Math.sin(i * 0.9 + lt * 5 + j) * 1.6 + i * 0.4)
    }
    penStroke(ctx, p, 1, st(2.2 - j * 0.4, 0.85 - j * 0.15, 70 + j))
  }
  const [bx, by] = SP(0.04, 0)
  for (let j = 0; j < 3; j++) {
    const ph = (lt * 1.6 + j / 3) % 1
    const L = 70 + ph * 90
    penStroke(ctx, bez(bx - 4, by + 2, bx - L * 0.4, by + 6 + ph * 10, bx - L * 0.8, by + 14 + ph * 22, bx - L, by + 26 + ph * 30, 10), 1, st(1.6 * (1 - ph) + 0.4, (1 - ph) * 0.8, 80 + j))
  }
  const [wx, wy] = SP(0.985, 0)
  penStroke(ctx, [wx, wy + 1, wx + 180, wy - 6, wx + 420, wy - 14, wx + 700, wy - 22], 1, st(1.3, 0.55, 90))
  penStroke(ctx, [wx, wy + 3, wx + 200, wy + 10, wx + 470, wy + 12, wx + 760, wy + 10], 1, st(1.1, 0.45, 91))
  for (let k = 0; k < 14; k++) {
    const s = (k + lt * 2) % 14
    const x = wx + 20 + s * 42, y = wy + (rand(k, 92) - 0.5) * (6 + s * 2.2)
    penStroke(ctx, [x, y, x + 14 + s * 2, y - 1], 1, st(1.2, 0.6 * (1 - s / 14), 93 + k))
  }
}

function drawE1a(ctx: Ctx, t: number) {
  const lt = t - S0
  nightPaper(ctx, t, { lift: 0.1 })
  ctx.save()
  zoom(ctx, W * 0.5, H * 0.42, 1 + 0.035 * ease.inOutSine(clamp(lt / 3)))
  const MX = 1610, MY = 150
  moon(ctx, MX, MY, 40, { t, glow: 0.95 })
  penStroke(ctx, sketchEllipse(MX, MY, 43, 43, 31, 0.1), 1, NL(t, { width: 1.5, alpha: 0.6 }))
  penDraw(ctx, [[MX - 420, MY + 70, MX - 250, MY + 58, MX - 60, MY + 76, MX + 120, MY + 64], [MX - 300, MY + 100, MX - 140, MY + 92, MX + 20, MY + 104]], 1, NL(t, { width: 1.1, alpha: 0.32 }))
  // the Pacific: a plane of her words with the moon's column
  textPlane(ctx, { y0: SHY, rows: 32, words: SEA_WORDS, light: 0.95, lightX: MX, t, speed: 0.8, seed: 11, alpha: 0.72 })
  penStroke(ctx, sketchLine(-200, SHY, W + 200, SHY, 3, 0), 1, NL(t, { width: 1.2, alpha: 0.6 }))
  seaRows(ctx, t, lt, SHY, MX, { speed: 1.6, dense: 0.45, road: 0.8, alpha: 0.8 })
  // the liner drifts left, rolling slightly, surfacing out of characters
  const ox = -18 * lt
  ctx.save()
  ctx.translate(900 + ox, 470)
  ctx.rotate(0.004 * Math.sin(lt * 1.3))
  ctx.translate(-900, -470 + 2 * Math.sin(lt * 1.3 + 0.5))
  shipSmoke(ctx, t, lt)
  ctx.drawImage(cached('segE:shipMatte', W, H, drawShipMatte), 0, 0)
  const em = prog(t, S0 - 0.4, S0 + 2.0)
  textImage(ctx, { key: 'E-ship', draw: shipMask, corpus: SHIP_CORPUS, cell: 10, emerge: em, order: 'sweepYUp', scatter: 50, gamma: 1.2, thr: 0.12, t, color: '#e6ecf8', seed: 5 })
  ctx.save()
  ctx.globalAlpha = 0.25 + 0.75 * prog(t, S0 + 0.6, S0 + 2.2)
  ctx.drawImage(boiled('shipLines', t, drawShipLines), 0, 0)
  ctx.restore()
  bowWave(ctx, t, lt)
  ctx.restore()
  whitecaps(ctx, t, SHY, 341, 346, { speed: 1.6, xMin: 40, xMax: W - 200, z0: 0.62, z1: 0.92 })
  ctx.restore()
  seaQuote(ctx, t)
}

// ── E1b: at the rail ──  (her drawing brings its own stretch of rail; we extend it to the frame edges)
const RAIL = { x: 1170, y: 640, h: 450 }
const ru = (v: number) => RAIL.y + (v - 1000) * (RAIL.h / 1000)
const rx = (v: number) => RAIL.x + (v - 500) * (RAIL.h / 1000)

function drawRail(g: Ctx, bt: number) {
  const st = (w: number, a = 0.95, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  const xa = rx(40), xb = rx(960)
  nMatte(g, [-20, ru(805), W + 20, ru(805), W + 20, H + 20, -20, H + 20], 0.4)
  for (const [v, w] of [[805, 1.8], [815, 0.9], [840, 0.7], [882, 0.7], [934, 0.75], [992, 0.75]] as [number, number][]) {
    penStroke(g, [-20, ru(v), xa + 4, ru(v)], 1, st(w, v > 815 ? 0.5 : 0.9, { seed: v }))
    penStroke(g, [xb - 4, ru(v), W + 20, ru(v)], 1, st(w, v > 815 ? 0.5 : 0.9, { seed: v + 1 }))
  }
  for (const [x0, x1] of [[-20, xa + 6], [xb - 6, W + 20]]) {
    const band: Poly = [x0, ru(404), x1, ru(404), x1, ru(423), x0, ru(423)]
    nMatte(g, band, 0.2, '90,80,90')
    hatch(g, [band], { angle: -0.3, gap: 3.5, ...st(0.6, 0.55) })
    penDraw(g, [[x0, ru(404), x1, ru(404)], [x0, ru(423), x1, ru(423)]], 1, st(2.1))
    penDraw(g, [[x0, ru(545), x1, ru(545)], [x0, ru(675), x1, ru(675)]], 1, st(1.1, 0.8))
  }
  const sp = 165 * (RAIL.h / 1000)
  const posts: number[] = []
  for (let x = rx(90) - sp; x > -40; x -= sp) posts.push(x)
  for (let x = rx(930) + sp; x < W + 40; x += sp) posts.push(x)
  for (const x of posts) {
    penDraw(g, [[x - 2.5, ru(423), x - 2.5, ru(805)], [x + 2.5, ru(423), x + 2.5, ru(805)]], 1, st(1.4, 0.9, { seed: x }))
    penStroke(g, sketchEllipse(x, ru(545), 3.6, 2.7, x, 0.1), 1, st(0.8, 0.8))
    penStroke(g, sketchEllipse(x, ru(675), 3.6, 2.7, x + 1, 0.1), 1, st(0.8, 0.8))
  }
  for (let i = 0; i < 4; i++) penStroke(g, sketchEllipse(420, ru(900) - i * 5, 62 - i * 7, 13 - i * 1.4, 500 + i, 0.15), 1, st(1.4, 0.8, { seed: 500 + i }))
  // a folded deck chair leaning on the rail
  penDraw(g, [[160, ru(992), 214, ru(430)], [236, ru(992), 262, ru(440)], [214, ru(430), 262, ru(440)], [150, ru(740), 250, ru(752)], [170, ru(620), 246, ru(628)]], 1, st(1.6))
  hatch(g, [[214, ru(430), 262, ru(440), 250, ru(752), 196, ru(742)]], { angle: 1.3, gap: 5, ...st(0.6, 0.45) })
  // overhead lifeboat in its davits, cropped by the top-right of the frame
  const keel: Poly = [1150, -30, 1210, 40, 1330, 88, 1520, 104, 1700, 92, 1800, 60, 1840, -30]
  nMatte(g, keel, 0.38)
  hatch(g, [keel], { angle: -0.15, gap: 5, ...st(0.7, 0.45) })
  penDraw(g, [keel, [1185, 10, 1330, 62, 1520, 76, 1720, 66, 1830, 30]], 1, st(2.2))
  for (let i = 0; i < 6; i++) penStroke(g, [1290 + i * 90, 70 + Math.sin(i) * 4, 1296 + i * 90, -10], 1, st(0.7, 0.4, { seed: 700 + i }))
  penDraw(g, [[1760, -40, 1772, 40, 1745, 96, 1700, 112], [1700, 112, 1702, 160], [1240, -40, 1236, 60]], 1, st(2.6))
  penStroke(g, sketchEllipse(1702, 166, 7, 7, 71, 0.1), 1, st(1.4))
}

function drawE1b(ctx: Ctx, t: number) {
  const lt = t - T1B
  nightPaper(ctx, t, { lift: 0.12 })
  const HY = 292
  const roll = 0.011 * Math.sin(lt * 1.2 + 0.6) + 0.005 * Math.sin(lt * 0.5 + 1)
  ctx.save()
  zoom(ctx, RAIL.x, 420, 1.0 + 0.04 * ease.inOutSine(clamp(lt / 3)), 0, -8 * lt, 0)
  ctx.save()
  ctx.translate(W / 2, HY)
  ctx.rotate(roll)
  ctx.translate(-W / 2, -HY + 6 * Math.sin(lt * 1.2))
  const MX = 560, MY = 214
  moon(ctx, MX, MY, 38, { t, glow: 0.95 })
  penStroke(ctx, sketchEllipse(MX, MY, 41, 41, 33, 0.1), 1, NL(t, { width: 1.5, alpha: 0.6 }))
  penDraw(ctx, [[MX + 120, MY + 30, MX + 300, MY + 22, MX + 520, MY + 34, MX + 760, MY + 26], [MX + 260, MY + 52, MX + 460, MY + 46, MX + 640, MY + 54]], 1, NL(t, { width: 1.1, alpha: 0.32 }))
  textPlane(ctx, { y0: HY, y1: 640, rows: 24, words: SEA_WORDS, light: 0.95, lightX: MX, t, speed: 1, seed: 12, alpha: 0.75 })
  penStroke(ctx, sketchLine(-200, HY, W + 200, HY, 4, 0), 1, NL(t, { width: 1.2, alpha: 0.6 }))
  seaRows(ctx, t, lt + 8, HY, MX, { speed: 2.6, yMax: 640, dense: 0.4, road: 0.7, alpha: 0.8 })
  whitecaps(ctx, t, HY, 346, 351, { speed: 2.6, yMax: 640, xMin: 100, xMax: W - 300, z0: 0.35, z1: 0.75 })
  ctx.restore()
  ctx.drawImage(boiled('rail', t, drawRail), 0, 0)
  // an opaque body under her (her washes are translucent; the sea must not show through her coat)
  const U = (pts: number[]) => pts.map((v, i) => (i % 2 ? ru(v) : rx(v)))
  nMatte(ctx, U([372, 236, 346, 370, 352, 402, 390, 405, 395, 470, 352, 800, 425, 812, 425, 960, 578, 958, 590, 812, 642, 796, 606, 470, 600, 300, 690, 350, 710, 410, 628, 234, 560, 215, 540, 190, 568, 150, 560, 60, 500, 36, 440, 60, 428, 150, 462, 190, 440, 215]), 0.42)
  eileen(ctx, 'shipRail', { x: RAIL.x, y: RAIL.y, h: RAIL.h, t, color: C.lineNight, fill: 1 })
  ctx.restore()
  seaQuote(ctx, t)
}

// ══════════════════════════════════════ E2 · New York, 1955 ══════════════════════════════════════

const WIND_QUOTE = '仿佛有一阵悲风，隔着十万八千里从时代的深处吹出来，吹得眼睛都睁不开。'
const NY_WORDS = 'ROOMS TO LET · HELP WANTED · NO VACANCY · EXCUSE ME · NEXT · WHO? · TAXI · SUBWAY · HOTEL · NEWS · BROADWAY · WE REGRET · NOT INTERESTED · SORRY · SIGN HERE · NAME? · NATIONALITY? · OCCUPATION? · WRITER? · NEVER HEARD OF HER · THANK YOU · MOVE ALONG · RENT DUE · LUNCH · COFFEE · '
const VPX = 1290, VPY = 455, FOC = 600
const NP = (X: number, Y: number, z: number): [number, number] => [VPX + (FOC * X) / z, VPY + (FOC * (1.6 - Y)) / z]
const CITY_OFF = 520 // world y range [-CITY_OFF, H]
type Kind = 'brown' | 'tene' | 'tower' | 'low'
const LEFT: [number, number, number, Kind][] = [[60, 82, 8, 'low'], [42, 60, 24, 'tene'], [30, 42, 20, 'tene'], [21, 30, 26, 'tene'], [15, 21, 17, 'tene'], [9.6, 15, 22, 'tene'], [4.2, 9.6, 18, 'brown']]
const RIGHT: [number, number, number, Kind][] = [[60, 82, 9, 'low'], [40, 60, 40, 'tower'], [26, 40, 95, 'tower'], [16, 26, 30, 'tene'], [8, 16, 70, 'tower']]
const FRONTS: [number, number, number, number, number][] = [[-48, -34, 55, 150, 4], [-26, -18, 95, 110, 3], [16, 28, 75, 160, 4]]
const LAMPS: [number, number, number][] = [[-6.3, 11, 1], [-6.3, 22, 1], [-6.3, 40, 1], [8.3, 15, -1], [8.3, 30, -1]]

/** Rows of English words running along a facade plane x = X (letters shrink with depth): walls made of words. */
function wordWall(g: Ctx, X: number, z0: number, z1: number, Hh: number, a: number, seed: number) {
  let idx = Math.floor(rand(seed, 3) * NY_WORDS.length)
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  let lastSize = -1
  // letters must advance left→right on screen: near→far on the left wall, far→near on the right wall
  const dir = X < 0 ? 1 : -1
  for (let Y = 0.6; Y < Hh - 0.7; Y += 0.82) {
    let z = dir > 0 ? z0 + 0.15 : z1 - 0.1
    while (z < z1 - 0.1 + 1e-6 && z > z0 + 0.15 - 1e-6) {
      const size = Math.round(Math.max(3, (FOC * 0.5) / z))
      if (size !== lastSize) {
        g.font = `500 ${size}px ${FONT.en}`
        lastSize = size
      }
      const ch = NY_WORDS[idx++ % NY_WORDS.length]
      const [x, y] = NP(X, Y, z)
      if (ch !== ' ') {
        g.globalAlpha = a * (0.55 + 0.45 * rand(idx, seed))
        g.fillText(ch, x, y)
      }
      z += (dir * size * 0.62 * z * z) / (FOC * Math.abs(X))
    }
  }
  g.globalAlpha = 1
}

/** Static layer: background towers and facades as mattes + walls of words. */
function drawCityText(g: Ctx) {
  g.translate(0, CITY_OFF)
  g.fillStyle = 'rgb(205,214,236)'
  for (const [X0, X1, z, Hh, tiers] of FRONTS) {
    let x0 = X0, x1 = X1, h0 = 0, h = Hh * 0.55
    for (let k = 0; k < tiers; k++) {
      const a = NP(x0, h0, z), b = NP(x0, h, z), c = NP(x1, h, z), d = NP(x1, h0, z)
      nMatte(g, [...a, ...b, ...c, ...d], 0.5)
      g.save()
      g.clip(pathOf([...a, ...b, ...c, ...d]))
      const size = Math.max(3, Math.round((FOC * 0.9) / z))
      g.font = `500 ${size}px ${FONT.en}`
      g.textBaseline = 'alphabetic'
      g.globalAlpha = 0.32
      g.fillStyle = 'rgb(205,214,236)'
      let i = k * 37
      for (let y = b[1] + size; y < a[1]; y += size * 1.25) {
        const s = NY_WORDS.slice(i % 200) + NY_WORDS
        g.fillText(s, a[0] - (i % 7) * 3, y)
        i += 13
      }
      g.restore()
      h0 = h
      h = h + Hh * (0.45 / tiers) * (k === tiers - 2 ? 1.6 : 0.8)
      const inset = (x1 - x0) * 0.16
      x0 += inset
      x1 -= inset
    }
  }
  const facade = (X: number, z0: number, z1: number, Hh: number, kind: Kind, seed: number) => {
    const a = NP(X, 0, z0), b = NP(X, Hh, z0), c = NP(X, Hh, z1), d = NP(X, 0, z1)
    nMatte(g, [...a, ...b, ...c, ...d], kind === 'tower' ? 0.45 : 0.35)
    g.fillStyle = 'rgb(205,214,236)'
    const near = z0 < 9 ? 0.16 : 1
    wordWall(g, X, z0, z1, Hh, (kind === 'tower' ? 0.42 : 0.34) * near, seed)
  }
  RIGHT.forEach(([z0, z1, h, k], i) => facade(12, z0, z1, h, k, 40 + i))
  LEFT.forEach(([z0, z1, h, k], i) => facade(-9, z0, z1, h, k, 10 + i))
}

/** Boiled layer: pen traces of edges, cornices, fire escapes, water towers, lamps, the stoop. */
function drawCityLines(g: Ctx, bt: number) {
  g.translate(0, CITY_OFF)
  const L = (p: Poly, w = 1.1, a = 0.75, sd = 0) => penStroke(g, p, 1, nb(bt, { width: w, alpha: a, seed: sd + p[0], wobble: 0.7 }))
  const seg = (a: [number, number], b: [number, number]): Poly => [a[0], a[1], b[0], b[1]]
  for (const [X0, X1, z, Hh] of FRONTS) {
    const a = NP(X0, 0, z), b = NP(X0, Hh * 0.55, z), c = NP(X1, Hh * 0.55, z), d = NP(X1, 0, z)
    L([...a, ...b, ...c, ...d], 0.8, 0.45)
  }
  const facade = (X: number, z0: number, z1: number, Hh: number, kind: Kind, seed: number) => {
    const a = NP(X, 0, z0), b = NP(X, Hh, z0), c = NP(X, Hh, z1), d = NP(X, 0, z1)
    const near = Math.min(1, 12 / z0)
    L(seg(a, b), 1.2 + near, 0.85)
    L(seg(b, c), 1 + near * 0.8, 0.8)
    L(seg(d, c), 0.8, 0.45)
    if (kind !== 'tower') {
      L(seg(NP(X, Hh - 0.7, z0), NP(X, Hh - 0.7, z1)), 0.8, 0.6)
      for (let z = z0 + 0.3; z < z1; z += 0.6) L(seg(NP(X, Hh - 0.7, z), NP(X, Hh - 0.35, z)), 0.5, 0.45)
    }
    if (kind === 'tene') {
      const za = z0 + (z1 - z0) * 0.28, zb = za + Math.min(3.2, (z1 - z0) * 0.45)
      const Xo = X + (X < 0 ? 1.3 : -1.3)
      for (let f = 1; f * 3.2 < Hh - 2; f++) {
        const y = f * 3.2
        L(seg(NP(Xo, y, za), NP(Xo, y, zb)), 1, 0.8)
        L(seg(NP(Xo, y + 1, za), NP(Xo, y + 1, zb)), 0.7, 0.7)
        L(seg(NP(X, y, za), NP(Xo, y, za)), 0.7, 0.6)
        for (let z = za; z <= zb + 0.01; z += 0.5) L(seg(NP(Xo, y, z), NP(Xo, y + 1, z)), 0.4, 0.5)
        if ((f + 1) * 3.2 < Hh - 2) {
          const up = f % 2 ? [za + 0.2, zb - 0.3] : [zb - 0.2, za + 0.3]
          const Xl = Xo - (X < 0 ? 0.3 : -0.3)
          L(seg(NP(Xl, y, up[0]), NP(Xl, y + 3.2, up[1])), 0.7, 0.7)
        }
      }
    }
    if ((kind === 'tene' || kind === 'brown') && rand(seed, 5) < 0.75) {
      const zc = lerp(z0, z1, 0.55), Xw = X + (X < 0 ? -2.6 : 2.6)
      const [cx, yb] = NP(Xw, Hh, zc)
      const rpx = (FOC * 1.5) / zc
      const legH = (FOC * 2.4) / zc, tankH = (FOC * 3.4) / zc, cone = (FOC * 1.5) / zc
      const yt0 = yb - legH, yt1 = yt0 - tankH
      nMatte(g, [cx - rpx, yt0, cx - rpx, yt1, cx, yt1 - cone, cx + rpx, yt1, cx + rpx, yt0, cx, yt0 + rpx * 0.25], 0.4)
      L([cx - rpx * 0.8, yb, cx - rpx * 0.7, yt0], 0.8, 0.8)
      L([cx + rpx * 0.8, yb, cx + rpx * 0.7, yt0], 0.8, 0.8)
      L([cx - rpx * 0.75, yb - legH * 0.5, cx + rpx * 0.75, yt0], 0.4, 0.5)
      L([cx - rpx, yt0, cx - rpx, yt1], 1, 0.85)
      L([cx + rpx, yt0, cx + rpx, yt1], 1, 0.85)
      for (const yy of [yt0, yt0 - tankH * 0.33, yt0 - tankH * 0.66, yt1]) {
        const e: Poly = []
        for (let i = 0; i <= 12; i++) {
          const an = Math.PI * (i / 12)
          e.push(cx - Math.cos(an) * rpx, yy + Math.sin(an) * rpx * 0.25)
        }
        L(e, yy === yt0 || yy === yt1 ? 1 : 0.6, 0.75)
      }
      L([cx - rpx * 1.05, yt1, cx, yt1 - cone, cx + rpx * 1.05, yt1], 1, 0.85)
      for (let i = 1; i < 6; i++) {
        const xx = cx - rpx + (2 * rpx * i) / 6
        const dy = Math.sin(Math.acos(1 - (2 * i) / 6)) * rpx * 0.25
        L([xx, yt0 + dy, xx, yt1 + dy], 0.4, 0.4)
      }
    }
  }
  RIGHT.forEach(([z0, z1, h, k], i) => facade(12, z0, z1, h, k, 40 + i))
  LEFT.forEach(([z0, z1, h, k], i) => facade(-9, z0, z1, h, k, 10 + i))
  // street
  L(seg(NP(-6, 0, 3), NP(-6, 0, 82)), 1.2, 0.7)
  L(seg(NP(8, 0, 6), NP(8, 0, 82)), 1.1, 0.6)
  for (let z = 6; z < 80; z *= 1.35) L(seg(NP(1, 0, z), NP(1, 0, z * 1.15)), 0.9, 0.45)
  // lamps (bishop's crook)
  for (const [X, z, dir] of LAMPS) {
    const b0 = NP(X, 0, z), b1 = NP(X, 4.3, z), hd = NP(X + dir * 1.2, 4.0, z)
    const w = (FOC * 0.08) / z
    L([b0[0] - w, b0[1], b1[0] - w * 0.4, b1[1]], 1, 0.85)
    L([b0[0] + w, b0[1], b1[0] + w * 0.4, b1[1]], 1, 0.85)
    L([b0[0] - w * 2.4, b0[1], b0[0] + w * 2.4, b0[1]], 1, 0.75)
    const r = (FOC * 0.5) / z
    L(bez(b1[0], b1[1], b1[0], b1[1] - r * 1.2, hd[0] - dir * r * 0.2, b1[1] - r * 1.4, hd[0], hd[1] - r * 0.5, 8), 1, 0.85)
    const lr = (FOC * 0.2) / z
    L([hd[0], hd[1] - r * 0.5, hd[0], hd[1] - lr], 0.8, 0.8)
    L([hd[0] - lr, hd[1] - lr, hd[0] + lr, hd[1] - lr, hd[0] + lr * 0.7, hd[1] + lr, hd[0] - lr * 0.7, hd[1] + lr, hd[0] - lr, hd[1] - lr], 0.9, 0.85)
  }
  // the stoop (side profile in plane z = 6.6) and the arched doorway
  const zN = 6.6, zF = 8.6
  const prof: Poly = [...NP(-9, 2.2, zN)]
  let X = -8.2, Y = 2.2
  prof.push(...NP(X, Y, zN))
  for (let i = 0; i < 6; i++) {
    Y -= 0.367
    prof.push(...NP(X, Y, zN))
    X += 0.35
    prof.push(...NP(X, Y, zN))
  }
  prof.push(...NP(-9, 0, zN))
  nMatte(g, prof, 0.15, '40,48,70')
  hatch(g, [prof], { angle: -0.6, gap: 6, ...nb(bt, { width: 0.7, alpha: 0.4 }) })
  L(prof, 1.5, 0.9)
  X = -8.2
  Y = 2.2
  for (let i = 0; i <= 6; i++) {
    L(seg(NP(X, Y, zN), NP(X, Y, zF)), 0.7, 0.55)
    Y -= 0.367
    X += 0.35
  }
  const r0 = NP(-6.05, 0.95, zN - 0.05), r1 = NP(-8.2, 3.15, zN - 0.05), r2 = NP(-9, 3.15, zN - 0.05)
  L([...r0, ...r1, ...r2], 1.3, 0.9)
  for (let i = 0; i <= 8; i++) {
    const f = i / 8
    const Xb = lerp(-6.15, -8.2, f), Yt = lerp(0.95, 3.15, f), Yb = Math.max(0, 2.2 - Math.max(0, (Xb + 8.2) / 0.35) * 0.367)
    L(seg(NP(Xb, Yb, zN - 0.05), NP(Xb, Yt, zN - 0.05)), 0.6, 0.7)
  }
  const nw = NP(-6.0, 0, zN - 0.05), nt = NP(-6.0, 1.2, zN - 0.05)
  L([nw[0], nw[1], nt[0], nt[1], nt[0] + 10, nt[1] + 4, nt[0] + 9, nt[1] + 14, nt[0] + 2, nt[1] + 12], 1.2, 0.85)
  const d0 = NP(-9, 2.2, 6.95), d1 = NP(-9, 4.9, 6.95), d2 = NP(-9, 4.9, 8.15), d3 = NP(-9, 2.2, 8.15)
  nMatte(g, [...d0, ...d1, ...d2, ...d3], 0.5)
  L([...d0, ...d1, ...d2, ...d3], 1.3, 0.85)
  L(seg(NP(-9, 4.3, 6.95), NP(-9, 4.3, 8.15)), 0.8, 0.7)
  L(seg(NP(-9, 4.3, 7.55), NP(-9, 2.2, 7.55)), 0.7, 0.6)
}

/** Back-view figure of an older man in a long coat and hat (faceless). Unit height 100, anchored at the feet. */
const MAN_BACK = {
  hat: 'M -13.5 -90.6 C -11 -93.2 11 -93.2 13.5 -90.6 C 11 -88.8 -11 -88.8 -13.5 -90.6 Z M -7.6 -91.6 C -8 -96.6 -6 -99.6 -2 -99.2 L 0 -98.2 L 2 -99.2 C 6 -99.6 8 -96.6 7.6 -91.6',
  head: 'M -5.6 -89.2 C -6 -85.6 -5 -83.4 -2.6 -82.8 L 2.6 -82.8 C 5 -83.4 6 -85.6 5.6 -89.2',
  coat: 'M -4 -83 C -9 -82 -14.5 -80.6 -17 -77 C -18.2 -70 -17.8 -60 -16.8 -50 C -17.4 -38 -18.4 -24 -19 -14 C -8 -12.2 8 -12.2 19 -14 C 18.4 -24 17.4 -38 16.8 -50 C 17.8 -60 18.2 -70 17 -77 C 14.5 -80.6 9 -82 4 -83 Z',
  seam: 'M -17 -77 C -20.4 -68 -21.4 -56 -20.6 -44.5 L -17.2 -44 M 17 -77 C 20.4 -68 21.4 -56 20.6 -44.5 L 17.2 -44 M -6 -82.6 C -4 -79 4 -79 6 -82.6 M -16.6 -52 C -6 -50.4 6 -50.4 16.6 -52 M 0 -50.6 L 0 -14.5 M -4 -82.5 L 0 -78.5 L 4 -82.5',
  legs: 'M -8.6 -13 L -9 -0.6 M -3.2 -12.6 L -3.4 -0.6 M 3.2 -12.6 L 3.4 -0.6 M 8.6 -13 L 9 -0.6 M -10.6 0 L -2 0 M 2 0 L 10.6 0',
}
function manBack(ctx: Ctx, x: number, y: number, h: number, t: number, night: boolean, o: { alpha?: number; lean?: number } = {}) {
  const s = h / 100
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(o.lean ?? 0)
  ctx.scale(s, s)
  ctx.globalAlpha *= o.alpha ?? 1
  const coat = pathPolys(MAN_BACK.coat)[0]
  const hat = pathPolys(MAN_BACK.hat)
  for (const m of [coat, hat[0], [-9.4, -13.5, -2.6, -13.5, -2.8, 0, -9.6, 0], [2.6, -13.5, 9.4, -13.5, 9.6, 0, 2.8, 0], [-7.6, -91.6, -8, -96.6, -6, -99.6, 6, -99.6, 8, -96.6, 7.6, -91.6]]) {
    if (night) nMatte(ctx, m, 0.5)
    else pMatte(ctx, m, 'rgba(70,52,38,0.35)')
  }
  const st = (night ? NL : PL)(t, { width: 1.7 / s, wobble: 0.6 / s })
  hatch(ctx, [coat], { angle: 1.2, gap: 3.2 / Math.max(0.6, s), ...st, width: 0.7 / s, alpha: night ? 0.4 : 0.55 })
  penDraw(ctx, [...hat, ...pathPolys(MAN_BACK.head), coat, ...pathPolys(MAN_BACK.legs)], 1, st)
  penDraw(ctx, pathPolys(MAN_BACK.seam), 1, { ...st, width: 0.9 / s, alpha: 0.6 })
  ctx.restore()
}

function drawE2(ctx: Ctx, t: number) {
  const lt = t - T2
  nightPaper(ctx, t, { lift: 0.16 })
  const dy = lerp(CITY_OFF - 40, 0, ease.inOutCubic(prog(lt, 0.05, 2.1)))
  ctx.save()
  zoom(ctx, 620, 420, 1 + 0.05 * ease.inOutSine(prog(lt, 1.6, 4)), 0, -8 * lt, dy)
  // moon over the river at the end of the street, mist, far shore
  moon(ctx, 1302, 300, 24, { t, glow: 0.85 })
  penStroke(ctx, sketchEllipse(1302, 300, 26, 26, 41, 0.1), 1, NL(t, { width: 1.2, alpha: 0.5 }))
  glow(ctx, 1300, 452, 220, '170,182,206', 0.32, 'source-over')
  penDraw(ctx, [[1150, 437, 1210, 432, 1260, 436, 1330, 430, 1450, 436], [1180, 446, 1290, 444, 1420, 447], [1200, 452, 1300, 451, 1400, 453]], 1, NL(t, { width: 1, alpha: 0.5 }))
  for (let k = 0; k < 10; k++) {
    const x = 1200 + rand(k, 51) * 200, y = 440 + rand(k, 52) * 14
    penStroke(ctx, [x, y, x + 12 + rand(k, 53) * 16, y], 1, { color: C.moon, width: 1.2, alpha: 0.35 * (0.4 + 0.6 * rand(k, Math.floor(t * 6))), op: 'screen', nib: false })
  }
  ctx.drawImage(cached('segE:cityText', W, H + CITY_OFF, drawCityText), 0, -CITY_OFF)
  // a few rows of words light up on each beat (windows coming on)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = 351; i < 359; i++) {
    const age = t - B(i)
    if (age < 0) continue
    for (let j = 0; j < 3; j++) {
      const r = rand(i * 3 + j, 61)
      const X = r < 0.5 ? 12 : -9
      const z0 = r < 0.5 ? 16 + r * 40 : 11 + (r - 0.5) * 60
      const zz1 = z0 + 3 + rand(i, j) * 4
      const Y = 0.6 + Math.floor(rand(i * 5 + j, 62) * 18) * 0.82
      const a = (0.25 + 0.5 * hit(t, B(i), 4)) * clamp(age * 12)
      const p0 = NP(X, Y, z0), p1 = NP(X, Y, zz1)
      const hgt = (FOC * 0.62) / z0
      ctx.fillStyle = `rgba(205,215,240,${a * 0.35})`
      ctx.fill(pathOf([p0[0], p0[1] + 2, p0[0], p0[1] - hgt, p1[0], p1[1] - (FOC * 0.62) / zz1, p1[0], p1[1] + 2]))
    }
  }
  ctx.restore()
  ctx.drawImage(boiled('cityLines', t, drawCityLines, W, H + CITY_OFF), 0, -CITY_OFF)
  for (const [X, z, dir] of LAMPS) {
    const [hx, hy] = NP(X + dir * 1.2, 4.0, z)
    glow(ctx, hx, hy, (FOC * 2.4) / z, '205,215,240', 0.4)
  }
  // a few passers-by far down the street
  for (let k = 0; k < 4; k++) {
    const z = 18 + k * 7 + ((lt * (k % 2 ? 1.2 : -1.0)) % 4)
    const [px, py] = NP(k % 2 ? -7.4 : 6.6, 0, z)
    manBack(ctx, px, py, (FOC * 1.75) / z, t, true, { alpha: 0.8 })
  }
  // the two of them on the steps, looking toward the river
  const [mx, my] = NP(-8.55, 2.2, 7.25)
  manBack(ctx, mx, my, (FOC * 1.72) / 7.25, t, true, { lean: Math.sin(t * 2.3) * 0.004 })
  const [ex, ey] = NP(-8.45, 2.2, 8.0)
  eileen(ctx, 'lookBack', { x: ex, y: ey, h: (FOC * 1.62) / 8.0, t, color: C.lineNight, fill: 1, dress: '#3a465e' })
  ctx.restore()
  // the wind off the river: a gust on every beat, fine streaks between
  for (let i = 351; i < 359; i++) {
    const age = t - B(i)
    if (age < 0 || age > 1.2) continue
    for (let j = 0; j < 2; j++) {
      const y0 = 200 + rand(i * 4 + j, 71) * 360
      const len = 520 + rand(j, i) * 420
      const x0 = 1420 + rand(i, j + 3) * 260
      const p: Poly = []
      for (let k = 0; k <= 24; k++) {
        const f = k / 24
        p.push(x0 - len * f, y0 + Math.sin(f * 4.2 + j * 2 + i) * 26 * f + f * 30 + (f > 0.8 ? -(f - 0.8) * 160 : 0))
      }
      const head = ease.outCubic(prog(age, 0, 0.6))
      penStroke(ctx, p, head, NL(t, { width: 1, alpha: 0.28 * (1 - prog(age, 0.5, 1.2)), seed: i * 7 + j, taperIn: 120, taperOut: 80, wobble: 2.5 }))
    }
  }
  for (let k = 0; k < 16; k++) {
    const x = ((rand(k, 81) * (W + 400) - t * (650 + rand(k, 82) * 450)) % (W + 400) + W + 400) % (W + 400) - 200
    const y = 160 + rand(k, 83) * 420
    const l = 40 + rand(k, 84) * 110
    penStroke(ctx, bez(x + l, y, x + l * 0.6, y + 3, x + l * 0.3, y + 1, x, y + 6, 5), 1, NL(t, { width: 0.8, alpha: 0.22, seed: k, nib: false }))
  }
  // 《忆胡适之》 blown in on the wind, character by character
  lineText(ctx, t, WIND_QUOTE, 300, 150, { size: 32, t0: 182.42, rate: 0.074, color: 'rgba(236,230,214,0.93)', shadow: 'rgba(5,8,16,0.9)', fly: 560, gap: 2.5, wave: 2.5, alpha: 1 - prog(t, T3 - 0.3, T3 + 0.5) })
}

// ══════════════════════════════════════ E3 · MacDowell, snow ══════════════════════════════════════

/** an organic snow-laden pine: drooping branches, irregular tiers; returns polylines */
function pine(x: number, yb: number, h: number, seed: number) {
  const br: Poly[] = []
  const snow: Poly[] = []
  const n = Math.max(5, Math.round(h / 16) + 2)
  const lean = (rand(seed, 9) - 0.5) * h * 0.04
  for (let i = 0; i < n; i++) {
    const f = (i + 0.6) / n
    const y = yb - h + f * h * 0.9 + (rand(i, seed + 1) - 0.5) * h * 0.03
    const cx = x + lean * (1 - f)
    for (const s of [-1, 1]) {
      if (rand(i * 2 + (s > 0 ? 1 : 0), seed + 2) < 0.12 && i > 1) continue
      const w = (h * 0.34 * Math.pow(f, 0.85) + 3) * (0.7 + 0.55 * rand(i * 2 + (s > 0 ? 1 : 0), seed))
      const tip: [number, number] = [cx + s * w, y + w * (0.25 + 0.2 * rand(i, seed + 3))]
      br.push(bez(cx, y - 1, cx + s * w * 0.35, y - w * 0.04, cx + s * w * 0.7, y + w * 0.05, tip[0], tip[1], 6))
      for (let k = 1; k < 4; k++) {
        const u = k / 4
        const bx = cx + s * w * u, by = y + (tip[1] - y) * u * u
        br.push([bx, by, bx + s * w * 0.06, by + w * (0.14 + 0.08 * rand(k, i + seed))])
      }
      if (rand(i * 3 + (s > 0 ? 1 : 0), seed + 4) < 0.8) {
        const th = Math.max(2, w * 0.1)
        snow.push([cx + s * w * 0.1, y - 2, cx + s * w * 0.45, y - th - w * 0.02, cx + s * w * 0.85, tip[1] - th * 0.8 - w * 0.1, cx + s * w * 0.9, tip[1] - w * 0.12, cx + s * w * 0.5, y + w * 0.03, cx + s * w * 0.1, y + 1])
      }
    }
  }
  return { trunk: [x, yb, x + lean * 0.5, yb - h * 0.5, x + lean, yb - h - 4] as Poly, br, snow }
}

const FAR_PINES: [number, number, number][] = []
for (let i = 0; i < 64; i++) {
  const f = i / 64
  const x = lerp(-20, 1900, f) + (rand(i, 1) - 0.5) * 30
  if (x > 640 && x < 1000) continue
  FAR_PINES.push([x, lerp(330, 262, f) + rand(i, 2) * 14, 34 + rand(i, 3) * 44])
}
const MID_PINES: [number, number, number][] = [[200, 400, 160], [262, 412, 120], [120, 424, 200], [700, 372, 96], [742, 382, 118], [1010, 362, 128], [1084, 374, 160], [1166, 368, 112], [1252, 382, 180], [1342, 372, 136], [1446, 392, 200], [1534, 382, 156], [1616, 398, 220]]

function pinesMask(list: [number, number, number][], seed0: number, wk: number) {
  return (g: Ctx) => {
    g.lineCap = 'round'
    list.forEach(([x, yb, h], i) => {
      const p = pine(x, yb, h, seed0 + i)
      // body of the tree (grey), branches (white), snow carved out (empty paper)
      g.fillStyle = '#7c7c7c'
      g.beginPath()
      g.moveTo(x, yb - h - 4)
      g.lineTo(x - h * 0.34, yb - h * 0.1)
      g.lineTo(x + h * 0.34, yb - h * 0.1)
      g.closePath()
      g.fill()
      g.strokeStyle = '#fff'
      for (const b of [p.trunk, ...p.br]) {
        g.lineWidth = b.length > 4 ? wk * (0.7 + h / 200) : wk * 0.6
        g.beginPath()
        g.moveTo(b[0], b[1])
        for (let k = 2; k < b.length; k += 2) g.lineTo(b[k], b[k + 1])
        g.stroke()
      }
      g.save()
      g.globalCompositeOperation = 'destination-out'
      for (const s of p.snow) g.fill(pathOf(s))
      g.restore()
    })
  }
}

function drawSnowLand(g: Ctx, bt: number) {
  const st = (w: number, a = 0.9, o: St = {}) => pb(bt, { width: w, alpha: a, ...o })
  // overcast sky (soft gradient, no granulation) and paler snowfield
  const sky = g.createLinearGradient(0, 0, 0, 330)
  sky.addColorStop(0, 'rgba(96,108,130,0.34)')
  sky.addColorStop(1, 'rgba(96,108,130,0.06)')
  g.fillStyle = sky
  g.fillRect(0, 0, W, 330)
  const field = g.createLinearGradient(0, 260, 0, H)
  field.addColorStop(0, 'rgba(255,254,250,0.0)')
  field.addColorStop(0.15, 'rgba(255,254,250,0.5)')
  field.addColorStop(1, 'rgba(255,254,250,0.4)')
  g.fillStyle = field
  g.fillRect(0, 260, W, H - 260)
  penStroke(g, [0, 300, 300, 270, 650, 285, 1000, 250, 1400, 262, 1920, 236], 1, st(1, 0.35))
  // the cabin: log walls, snowy roof, stone chimney
  const fx0 = 360, fx1 = 520, fy = 392, wh = 74, peak = 58
  const sx1 = 640, sy0 = 378, shrink = 0.8
  const front: Poly = [fx0, fy, fx0, fy - wh, (fx0 + fx1) / 2, fy - wh - peak, fx1, fy - wh, fx1, fy]
  const side: Poly = [fx1, fy, fx1, fy - wh, sx1, sy0 - wh * shrink, sx1, sy0]
  pMatte(g, front, 'rgba(120,90,60,0.12)')
  pMatte(g, side, 'rgba(90,70,50,0.22)')
  for (let y = fy - 8; y > fy - wh; y -= 8.5) {
    penStroke(g, [fx0, y, fx1, y + 0.5], 1, st(0.9, 0.7, { seed: y }))
    const k = (fy - y) / wh
    penStroke(g, [fx1, y, sx1, lerp(sy0, sy0 - wh * shrink, k)], 1, st(0.8, 0.65, { seed: y + 9 }))
    penStroke(g, sketchEllipse(fx1 + 2, y + 4, 4.5, 4, y, 0.1), 1, st(0.8, 0.8))
    penStroke(g, sketchEllipse(fx0 - 2, y + 4, 4.5, 4, y + 3, 0.1), 1, st(0.8, 0.8))
  }
  for (let y = fy - wh + 4; y > fy - wh - peak + 8; y -= 8.5) {
    const k = (fy - wh - y) / peak
    penStroke(g, [fx0 + (fx1 - fx0) * 0.5 * k + 4, y, fx1 - (fx1 - fx0) * 0.5 * k - 4, y], 1, st(0.7, 0.55, { seed: y + 20 }))
  }
  penDraw(g, [front, side], 1, st(1.8))
  const door: Poly = [418, fy, 418, fy - 50, 450, fy - 50, 450, fy]
  pMatte(g, door, 'rgba(60,40,25,0.35)')
  penDraw(g, [door, [446, fy - 26, 446, fy - 22]], 1, st(1.3))
  const win: Poly = [560, sy0 - 50, 560, sy0 - 28, 600, sy0 - 32, 600, sy0 - 54, 560, sy0 - 50]
  pMatte(g, win, 'rgba(240,215,160,0.45)')
  penDraw(g, [win, [580, sy0 - 52, 580, sy0 - 30], [560, sy0 - 39, 600, sy0 - 43]], 1, st(1.1))
  const roofF: Poly = [fx0 - 16, fy - wh + 6, (fx0 + fx1) / 2, fy - wh - peak - 8, fx1 + 14, fy - wh + 6]
  const ridgeEnd: [number, number] = [sx1 + 22, sy0 - wh * shrink - peak * shrink - 4]
  const roofS: Poly = [(fx0 + fx1) / 2, fy - wh - peak - 8, ...ridgeEnd, sx1 + 26, sy0 - wh * shrink + 8, fx1 + 14, fy - wh + 6]
  pMatte(g, roofS, 'rgba(255,253,248,0.7)')
  pMatte(g, [...roofF, (fx0 + fx1) / 2, fy - wh - peak + 6], 'rgba(255,253,248,0.7)')
  penDraw(g, [roofF, roofS.slice(0, 4), roofS.slice(2, 8), [fx1 + 14, fy - wh + 6, sx1 + 26, sy0 - wh * shrink + 8]], 1, st(1.6))
  penStroke(g, [fx1 + 14, fy - wh + 10, (fx1 + sx1) / 2 + 20, (fy - wh + sy0 - wh * shrink) / 2 + 13, sx1 + 26, sy0 - wh * shrink + 12], 1, st(0.8, 0.6))
  for (let i = 0; i < 7; i++) penStroke(g, [fx1 + 20 + i * 18, fy - wh + 8 - i * 1.4, fx1 + 20 + i * 18, fy - wh + 15 + rand(i, 5) * 10 - i * 1.4], 1, st(0.6, 0.6, { seed: 50 + i, taperOut: 8 }))
  const ch: Poly = [590, sy0 - wh * shrink - 20, 590, sy0 - wh * shrink - 66, 612, sy0 - wh * shrink - 68, 612, sy0 - wh * shrink - 24]
  pMatte(g, ch, 'rgba(120,110,100,0.2)')
  penDraw(g, [ch, [588, sy0 - wh * shrink - 66, 614, sy0 - wh * shrink - 68]], 1, st(1.4))
  for (let i = 0; i < 6; i++) penStroke(g, sketchEllipse(596 + (i % 2) * 9, sy0 - wh * shrink - 28 - i * 7, 5, 3, 80 + i, 0.1), 1, st(0.6, 0.6))
  penStroke(g, [fx0 - 30, fy + 3, fx0, fy - 2, fx1, fy - 1, sx1, sy0 - 1, sx1 + 40, sy0 + 3], 1, st(0.9, 0.5))
  // split-rail fence receding along the path
  for (let i = 0; i < 7; i++) {
    const f = i / 6
    const x = lerp(1180, 820, Math.pow(f, 0.8)), y = lerp(640, 400, Math.pow(f, 0.7)), hh = lerp(70, 16, Math.pow(f, 0.7))
    penStroke(g, [x, y, x + 1, y - hh], 1, st(lerp(2.4, 1, f)))
    if (i < 6) {
      const f2 = (i + 1) / 6
      const x2 = lerp(1180, 820, Math.pow(f2, 0.8)), y2 = lerp(640, 400, Math.pow(f2, 0.7)), h2 = lerp(70, 16, Math.pow(f2, 0.7))
      penStroke(g, [x, y - hh * 0.75, x2, y2 - h2 * 0.75], 1, st(lerp(1.8, 0.8, f), 0.85))
      penStroke(g, [x, y - hh * 0.4, x2, y2 - h2 * 0.4], 1, st(lerp(1.6, 0.7, f), 0.8))
    }
  }
  const pe = pathEdges()
  penDraw(g, [pe.l, pe.r], 1, st(0.9, 0.4))
  // birches at the right edge
  for (const [bx, w, lean] of [[1690, 20, 0.02], [1760, 14, -0.03]] as [number, number, number][]) {
    const Lp: Poly = [bx - w / 2, 820, bx - w / 2 + lean * 800, -20]
    const Rp: Poly = [bx + w / 2, 820, bx + w / 2 + lean * 800, -20]
    pMatte(g, [...Lp, ...rev(Rp)], 'rgba(255,253,248,0.5)')
    penDraw(g, [Lp, Rp], 1, st(1.4))
    for (let k = 0; k < 16; k++) {
      const y = 40 + rand(k, bx) * 700
      const x = bx + lean * (820 - y)
      penStroke(g, [x - w / 2 + rand(k, 2) * 3, y, x - w / 2 + w * (0.4 + rand(k, 3) * 0.5), y + 2], 1, st(2 + rand(k, 4) * 2, 0.75, { seed: k + bx }))
    }
    penStroke(g, [bx + lean * 500, 320, bx + lean * 500 - 90, 250, bx + lean * 500 - 160, 236], 1, st(1.2, 0.8))
  }
}
const PATH_P = [1460, 760, 1140, 560, 680, 520, 820, 372]
function pathAt(s: number): [number, number] {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = PATH_P
  const u = 1 - s
  return [u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3, u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3]
}
const pathScale = (s: number) => lerp(1, 0.13, Math.pow(s, 0.85))
function pathEdges() {
  const l: Poly = [], r: Poly = []
  for (let i = 0; i <= 30; i++) {
    const s = i / 30
    const [x, y] = pathAt(s)
    const w = 120 * pathScale(s)
    l.push(x - w, y)
    r.push(x + w, y + 2)
  }
  return { l, r }
}
/** a soft footprint: tiny radial shadow + pen lip */
function footprint(ctx: Ctx, t: number, x: number, y: number, rx: number, ry: number, seed: number, col: string, ink: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(${col},0.42)`)
  g.addColorStop(1, `rgba(${col},0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
  ctx.restore()
  penStroke(ctx, sketchEllipse(x, y + 0.5, rx, ry, seed, 0).slice(0, 26), 1, { color: ink, width: 0.6 + rx * 0.06, alpha: 0.55, boil: 8, t, nib: false, taperIn: 3, taperOut: 3 })
}

function drawE3(ctx: Ctx, t: number) {
  const lt = t - T3
  oldPaper(ctx, t, { sepia: 0.03, stains: 0.3 })
  ctx.save()
  zoom(ctx, 860, 420, 1.0 + 0.06 * ease.inOutSine(clamp(lt / 4.6)), 0, -6 * lt, 0)
  // a pale daytime moon in the overcast
  glow(ctx, 1480, 110, 60, '255,250,236', 0.5, 'source-over')
  penStroke(ctx, sketchEllipse(1480, 110, 27, 27, 4, 0.1), 1, PL(t, { width: 1, alpha: 0.45 }))
  ctx.drawImage(boiled('snowland', t, drawSnowLand), 0, 0)
  // woods of characters (far, then mid), snow carved out of the branches
  const em = clamp(0.55 + lt / 1.6)
  textImage(ctx, { key: 'E-farpines', draw: pinesMask(FAR_PINES, 0, 3), cell: 7, emerge: em, order: 'random', scatter: 20, gamma: 0.9, thr: 0.1, color: '#4a3a2e', seed: 3, alpha: 0.8 })
  textImage(ctx, { key: 'E-midpines', draw: pinesMask(MID_PINES, 100, 5), cell: 10, emerge: em, order: 'random', scatter: 30, gamma: 1.0, thr: 0.1, color: '#2a1d14', seed: 4, alpha: 1 })
  // chimney smoke
  for (let k = 0; k < 6; k++) {
    const s = (k + lt * 0.8) % 6
    const x = 601 + s * 14 + Math.sin(s + lt) * 5, y = 250 - s * 20
    penStroke(ctx, sketchEllipse(x, y, 6 + s * 4, 4 + s * 2.2, 300 + Math.floor(k + lt * 0.8), 0.1), 0.7, PL(t, { width: 0.9, alpha: 0.4 * (1 - s / 6), seed: k }))
  }
  // walking: one step per beat
  const bp = beatPos(t) - 358
  const sA = 0.6, ds = 0.019
  const sNow = sA + ds * Math.max(0, bp)
  for (let i = 0; i < 60; i++) {
    const s = 0.04 + i * ds
    if (s > sNow - 0.012) break
    const born = s > sA ? B(358 + Math.round((s - sA) / ds)) : -1
    const a = born < 0 ? 1 : clamp((t - born) * 8)
    for (const who of [0, 1]) {
      const ss = s + (who ? ds * 0.45 : 0)
      if (ss > sNow - 0.01) continue
      const [x, y] = pathAt(ss)
      const k = pathScale(ss)
      const side = (i + who) % 2 ? 1 : -1
      ctx.save()
      ctx.globalAlpha *= a
      footprint(ctx, t, x + (who === 0 ? -34 : 30) * k + side * 7 * k, y + side * 1.5 * k, (who === 0 ? 7.5 : 9.5) * k + 0.6, (who === 0 ? 3.2 : 3.8) * k + 0.5, i * 2 + who, '70,82,108', C.ink)
      ctx.restore()
    }
  }
  // the two of them walking away; he is the taller, in a hat; she glances back
  const [hx, hy] = pathAt(sNow)
  const k = pathScale(sNow)
  const bob = Math.abs(Math.sin(bp * Math.PI)) * 3 * k
  manBack(ctx, hx + 30 * k, hy - bob, 330 * k * 1.1, t, false, { lean: 0.01 * Math.sin(bp * Math.PI) })
  eileen(ctx, 'lookBack', { x: hx - 34 * k, y: hy - Math.abs(Math.sin(bp * Math.PI + 1.4)) * 3 * k, h: 330 * k, t, color: C.ink, fill: 1, dress: '#4b5a74' })
  ctx.restore()
  // snow made of characters, with a faint shadow so it reads on the paper
  textRain(ctx, t, { n: 110, speed: 55, angle: -0.08, color: '#6d7894', alpha: 0.75, size: 17, seed: 7 })
  textRain(ctx, t, { n: 70, speed: 80, angle: -0.08, color: '#ffffff', alpha: 0.95, size: 22, seed: 8 })
  lineText(ctx, t, 'MacDowell Colony · Peterborough, New Hampshire · 1956', 70, 58, { size: 23, t0: T3 + 0.3, rate: 0.025, color: 'rgba(42,29,20,0.78)', font: FONT.en, style: 'italic', gap: 0.5 })
}

// ══════════════════════════════════════ E4 · the empty chair, 1967 ══════════════════════════════════════

const ridge = (k: number, x: number) => [348 + 20 * Math.sin(x * 0.004 + 1) + 9 * Math.sin(x * 0.013), 392 + 26 * Math.sin(x * 0.003 + 2.2) + 8 * Math.sin(x * 0.01 + 1), 438 + 22 * Math.sin(x * 0.0042 + 0.3), 490 + 12 * Math.sin(x * 0.002 + 1)][k]
const SUN: [number, number] = [1300, 344]
const CHAIR = { x: 560, y: 668, s: 1.45 }
const fas = (x: number) => 64 - x * 0.012
const rt = (x: number) => 486 - (x - 250) * 0.04
const rb = (x: number) => 590 - (x - 250) * 0.06

function drawPorch(g: Ctx, bt: number) {
  const st = (w: number, a = 0.9, o: St = {}) => pb(bt, { width: w, alpha: a, ...o })
  for (let k = 0; k < 4; k++) {
    const p: Poly = []
    for (let x = 200; x <= 1920; x += 30) p.push(x, ridge(k, x))
    penStroke(g, p, 1, st(lerp(1, 1.6, k / 3), lerp(0.4, 0.75, k / 3), { seed: 40 + k }))
    if (k === 1) for (let x = 230; x < 1900; x += 22 + rand(x, 1) * 30) {
      if (Math.abs(x - SUN[0]) < 60) continue
      const y = ridge(1, x)
      const h = 8 + rand(x, 2) * 12
      penDraw(g, [[x, y + 2, x, y - h], [x - h * 0.3, y - h * 0.2, x, y - h, x + h * 0.3, y - h * 0.2]], 1, st(0.7, 0.5))
    }
  }
  // porch floor (matte), floorboards converging
  const floor: Poly = [0, rb(0) + 10, W, rb(W) + 10, W, H + 20, 0, H + 20]
  pMatte(g, floor, 'rgba(120,85,50,0.22)')
  for (let i = 0; i < 12; i++) {
    const x = -200 + i * 190
    penStroke(g, [x, 830, lerp(x, 1100, 0.6), lerp(830, rb(1100) + 10, 0.95)], 1, st(0.8, 0.35, { seed: 900 + i }))
  }
  // rail, balusters, steps through the gap
  const railTop: Poly = [], railTop2: Poly = []
  for (let x = 250; x <= 1700; x += 50) {
    railTop.push(x, rt(x))
    railTop2.push(x, rt(x) + 9)
  }
  pMatte(g, [...railTop, ...rev(railTop2)], 'rgba(120,80,40,0.2)')
  penDraw(g, [railTop, railTop2, [250, rb(250), 1180, rb(1180)], [1470, rb(1470), 1700, rb(1700)]], 1, st(1.9))
  for (let x = 270, d = 34; x < 1700; x += d, d *= 0.985) {
    if (x > 1185 && x < 1465) continue
    penStroke(g, [x, rt(x) + 10, x + 1, rb(x)], 1, st(1.3, 0.8, { seed: x }))
  }
  for (let i = 0; i < 3; i++) penStroke(g, [1190, rb(1190) + 12 + i * 14, 1462, rb(1462) + 12 + i * 14], 1, st(1, 0.6))
  // roof: soffit hatched dark, fascia, icicles
  const soffit: Poly = [0, -10, W, -10, W, fas(W), 0, fas(0)]
  pMatte(g, soffit, 'rgba(60,40,24,0.35)')
  hatch(g, [soffit], { angle: 0.15, gap: 4, cross: true, ...st(0.8, 0.55) })
  penDraw(g, [[0, fas(0), W, fas(W)], [0, fas(0) + 16, W, fas(W) + 16]], 1, st(2.2))
  for (let i = 0; i < 26; i++) {
    const x = 280 + rand(i, 11) * 1500
    const l = 8 + rand(i, 12) * 34
    penStroke(g, [x, fas(x) + 16, x + 1, fas(x) + 16 + l], 1, st(1.6, 0.7, { taperIn: 1, taperOut: l, seed: i }))
  }
  // posts
  for (const [x0, w] of [[150, 52], [1180, 18], [1470, 16]] as [number, number][]) {
    const post: Poly = [x0, fas(x0) + 16, x0, 830, x0 + w, 830, x0 + w, fas(x0 + w) + 16]
    pMatte(g, post, 'rgba(110,75,40,0.25)')
    hatch(g, [post], { angle: 1.5, gap: x0 < 300 ? 4 : 5, ...st(0.8, 0.6) })
    penDraw(g, [[x0, fas(x0) + 16, x0, 830], [x0 + w, fas(x0 + w) + 16, x0 + w, 830]], 1, st(x0 < 300 ? 2.6 : 1.6))
  }
  // the chair (ladder-back), 3/4 from behind, facing the hills; his hat on the seat
  g.save()
  g.translate(CHAIR.x, CHAIR.y)
  g.scale(CHAIR.s, CHAIR.s)
  const cs = (w: number, a = 0.9) => st(w / CHAIR.s, a)
  hatch(g, [[-74, 0, 86, -30, -120, 150, -360, 170]], { angle: 0.5, gap: 5, ...cs(0.7, 0.25) })
  const seat = [-70, -122, 40, -116, 84, -138, -30, -146]
  pMatte(g, seat, 'rgba(120,80,40,0.3)')
  hatch(g, [seat], { angle: 0.1, gap: 3.5, ...cs(0.6, 0.5) })
  const legs: Poly[] = [[-68, -120, -74, 0], [38, -114, 42, -2], [-28, -144, -32, -34], [82, -136, 86, -30]]
  const rungs: Poly[] = [[-72, -40, 41, -38], [-31, -70, 84, -66], [-71, -60, -31, -88]]
  const back: Poly[] = [[-70, -122, -78, -318, -74, -326], [40, -116, 46, -306, 50, -312]]
  const slats: Poly[] = [[-77, -300, -16, -296, 45, -290], [-76, -258, -16, -254, 44, -248], [-75, -214, -16, -210, 43, -206]]
  for (const s of slats) {
    const s2 = s.map((v, i) => (i % 2 ? v + 14 : v))
    pMatte(g, [...s, ...rev(s2)], 'rgba(120,80,40,0.3)')
    hatch(g, [[...s, ...rev(s2)]], { angle: 1.2, gap: 3, ...cs(0.5, 0.5) })
    penStroke(g, s2, 1, cs(1.2))
  }
  penDraw(g, [closed(seat), ...legs, ...rungs, ...back, ...slats], 1, cs(2))
  const hb = sketchEllipse(2, -134, 50, 13, 7, 0.05, -0.05)
  pMatte(g, hb, 'rgba(80,60,40,0.35)')
  const crown: Poly = bez(-26, -136, -30, -160, -22, -176, 2, -177, 10)
  crown.push(...bez(2, -177, 26, -178, 34, -162, 30, -136, 10).slice(2))
  pMatte(g, [...crown, 2, -128], 'rgba(80,60,40,0.45)')
  hatch(g, [[...crown, 2, -128]], { angle: 1.1, gap: 3, ...cs(0.7, 0.6) })
  penDraw(g, [hb, crown, [-14, -172, 2, -165, 18, -172]], 1, cs(1.8))
  hatch(g, [[-27, -146, 31, -146, 30, -137, -26, -137]], { angle: 0.2, gap: 2, cross: true, ...cs(0.6, 0.7) })
  g.restore()
}

function drawE4(ctx: Ctx, t: number) {
  const lt = t - T4
  oldPaper(ctx, t, { sepia: 0.36, stains: 0.5 })
  ctx.save()
  zoom(ctx, 700, 420, 1.07 - 0.07 * ease.inOutSine(clamp(lt / 4.4)))
  // sunset sky: soft gold gradient + the sun's glow
  const sky = ctx.createLinearGradient(0, 60, 0, 560)
  sky.addColorStop(0, 'rgba(200,150,80,0.04)')
  sky.addColorStop(0.55, 'rgba(214,150,70,0.4)')
  sky.addColorStop(1, 'rgba(214,150,70,0)')
  ctx.fillStyle = sky
  ctx.fillRect(0, 60, W, 500)
  glow(ctx, SUN[0], SUN[1], 620, '226,150,70', 0.5, 'multiply')
  glow(ctx, SUN[0], SUN[1], 300, '255,236,190', 0.6, 'screen')
  const sy = SUN[1] + 6 + lt * 5
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(200, 0)
  for (let x = 200; x <= W; x += 20) ctx.lineTo(x, ridge(0, x))
  ctx.lineTo(W, 0)
  ctx.closePath()
  ctx.clip()
  glow(ctx, SUN[0], sy, 52, '240,165,70', 1, 'source-over')
  glow(ctx, SUN[0], sy, 40, '252,214,150', 0.9, 'source-over')
  penStroke(ctx, sketchEllipse(SUN[0], sy, 46, 46, 10, 0.1), 1, PL(t, { width: 1.3, alpha: 0.6 }))
  ctx.restore()
  // a pale moon already up in the east
  // the snowfield as a plane of words; a golden column of them runs toward the setting sun
  // the snowfield's road of light toward the setting sun, made of words (fades to the sides)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(SUN[0] - 10, ridge(0, SUN[0]))
  ctx.lineTo(SUN[0] + 10, ridge(0, SUN[0]))
  ctx.lineTo(SUN[0] + 420, 640)
  ctx.lineTo(SUN[0] - 360, 640)
  ctx.closePath()
  ctx.clip()
  glow(ctx, SUN[0], 470, 330, '236,170,70', 0.45, 'source-over')
  for (const s of [21, 22]) textPlane(ctx, { y0: ridge(0, SUN[0]) + 4, y1: 660, rows: 22, words: ['越过群山追斜阳', '雪', '山', '斜阳', '群山'], color: [120, 66, 18], light: 0, t, speed: 0.5, seed: s, alpha: 2 })
  ctx.restore()
  ctx.drawImage(boiled('porch', t, drawPorch), 0, 0)
  // one line of footprints from the steps toward the hills — one more on each beat
  for (let i = 0; i < 14; i++) {
    const f = i / 13
    const born = i < 4 ? -1 : B(366 + (i - 4))
    if (born > 0 && t < born) break
    const x = lerp(1330, SUN[0] + 10, Math.pow(f, 0.7)) + (i % 2 ? 8 : -8) * (1 - f)
    const y = lerp(rb(1330) + 4, ridge(2, SUN[0]) + 12, Math.pow(f, 0.6))
    const k = lerp(1, 0.18, Math.pow(f, 0.6))
    ctx.save()
    ctx.globalAlpha *= born < 0 ? 1 : clamp((t - born) * 8)
    footprint(ctx, t, x, y, 13 * k + 0.8, 4.6 * k + 0.6, i, '70,45,25', C.ink)
    ctx.restore()
  }
  ctx.restore()
  // dusk grade: the warm glow at the horizon sinks into indigo above and around
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const dk = 0.75 + 0.25 * prog(t, T4, T5)
  const gr = ctx.createLinearGradient(0, 0, 0, H)
  gr.addColorStop(0, `rgba(38,48,92,${0.9 * dk})`)
  gr.addColorStop(0.3, `rgba(90,96,150,${0.55 * dk})`)
  gr.addColorStop(0.47, 'rgba(255,255,255,0)')
  gr.addColorStop(0.72, `rgba(110,110,160,${0.35 * dk})`)
  gr.addColorStop(1, `rgba(40,46,86,${0.75 * dk})`)
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  glow(ctx, SUN[0], SUN[1], 420, '255,190,110', 0.28)
  moon(ctx, 860, 150, 18, { t, glow: 0.7 })
}

// ══════════════════════════════════════ E5 · Los Angeles, 1972 ══════════════════════════════════════

const LVP = -300, RVP = 2600, EYE = 430, CX = 760
const rf = (x: number, yc: number) => yc + ((EYE - yc) * (x - CX)) / (RVP - CX)
const lf = (x: number, yc: number) => yc + ((EYE - yc) * (CX - x)) / (CX - LVP)
const YG = 600, YF = 400, YR = 196, X0 = 140, X1 = 1580
const LA_WIN_R: [number, number, number, number][] = [[1010, 1130, 452, 540], [860, 960, 262, 350], [1040, 1140, 264, 350], [1230, 1320, 266, 350]]
const LA_WIN_L: [number, number, number, number][] = [[250, 370, 450, 540], [500, 620, 450, 540], [250, 370, 262, 350], [500, 620, 262, 350]]
const winQ = (xa: number, xb: number, ya: number, yb: number, f: (x: number, y: number) => number) => [xa, f(xa, ya), xa, f(xa, yb), xb, f(xb, yb), xb, f(xb, ya)]
const LA_DOOR = winQ(850, 930, 455, YG, rf)

function laMask(g: Ctx) {
  g.fillStyle = '#7a7a7a'
  g.fill(pathOf([X0, lf(X0, YG), X0, lf(X0, YR - 14), CX, YR - 14, CX, YG]))
  g.fillStyle = '#a8a8a8'
  g.fill(pathOf([CX, YG, CX, YR - 14, X1, rf(X1, YR - 14), X1, rf(X1, YG)]))
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (const w of LA_WIN_R) g.fill(pathOf(winQ(...w, rf)))
  for (const w of LA_WIN_L) g.fill(pathOf(winQ(...w, lf)))
  g.fill(pathOf(LA_DOOR))
  g.restore()
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(CX, YG)
  g.lineTo(CX, YR - 14)
  g.moveTo(X0, lf(X0, YR - 14))
  g.lineTo(CX, YR - 14)
  g.lineTo(X1, rf(X1, YR - 14))
  g.moveTo(X0, lf(X0, YF + 6))
  g.lineTo(CX, YF + 6)
  g.lineTo(X1, rf(X1, YF + 6))
  g.stroke()
}

function palm(g: Ctx, bt: number, trunk: Poly, crown: [number, number], size: number, seed: number) {
  const st = (w: number, a = 0.9, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  const tw = size * 0.06
  const L = trunk.map((v, i) => (i % 2 ? v : v - tw * (1 - (i / trunk.length) * 0.5)))
  const R = trunk.map((v, i) => (i % 2 ? v : v + tw * (1 - (i / trunk.length) * 0.5)))
  nMatte(g, [...L, ...rev(R)], 0.35)
  penDraw(g, [L, R], 1, st(1.4))
  for (let i = 2; i < trunk.length - 2; i += 2) {
    const k = 1 - (i / trunk.length) * 0.5
    for (let q = 0; q < 4; q++) {
      const y = lerp(trunk[i + 1], trunk[i + 3], q / 4)
      const x = lerp(trunk[i], trunk[i + 2], q / 4)
      penStroke(g, [x - tw * k, y, x + tw * k, y + 3], 1, st(0.6, 0.55, { seed: i * 4 + q + seed }))
    }
  }
  // fronds: arching ribs with dense drooping leaflets
  const n = 13
  for (let f = 0; f < n; f++) {
    const a = -Math.PI / 2 + (f / (n - 1) - 0.5) * 4.6 + (rand(f, seed) - 0.5) * 0.25
    const Lf = size * (0.72 + rand(f, seed + 1) * 0.38)
    const pts: Poly = []
    for (let i = 0; i <= 16; i++) {
      const s = i / 16
      pts.push(crown[0] + Math.cos(a) * Lf * s, crown[1] + Math.sin(a) * Lf * s * 0.8 + Lf * 0.7 * s * s)
    }
    penStroke(g, pts, 1, st(1.4, 0.95, { seed: f + seed, taperOut: Lf * 0.5 }))
    for (let i = 2; i < 16; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1]
      const dx = pts[i * 2 + 2] - pts[i * 2 - 2], dy = pts[i * 2 + 3] - pts[i * 2 - 1]
      const dl = Math.hypot(dx, dy) || 1
      const ll = size * 0.26 * Math.sin((i / 16) * Math.PI) + 2
      for (const s of [-1, 1]) {
        const nx = (-dy / dl) * s, ny = (dx / dl) * s
        penStroke(g, bez(x, y, x + nx * ll * 0.3, y + ny * ll * 0.3, x + nx * ll * 0.4 + (dx / dl) * ll * 0.4, y + ny * ll * 0.4 + ll * 0.3, x + nx * ll * 0.35 + (dx / dl) * ll * 0.5, y + ny * ll * 0.35 + (dy / dl) * ll * 0.5 + ll * 0.8, 5), 1, st(1, 0.8, { seed: f * 40 + i * 2 + s + seed, taperOut: ll * 0.8, taperIn: 2 }))
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 2 + (i / 7 - 0.5) * 1.3
    penStroke(g, [crown[0], crown[1] + 4, crown[0] + Math.cos(a) * size * 0.22, crown[1] + 4 + Math.sin(a) * size * 0.32], 1, st(1, 0.5, { seed: 300 + i }))
  }
}

function drawLALines(g: Ctx, bt: number) {
  const st = (w: number, a = 0.85, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  penDraw(g, [[CX, YG + 2, CX, YR - 16], [X0, lf(X0, YR - 14), CX, YR - 14, X1, rf(X1, YR - 14)], [X0, lf(X0, YR), CX, YR, X1, rf(X1, YR)], [X0, lf(X0, YG), CX, YG, X1, rf(X1, YG)], [X0, lf(X0, YF), CX, YF, X1, rf(X1, YF)], [X0, lf(X0, YF + 10), CX, YF + 10, X1, rf(X1, YF + 10)]], 1, st(1.6))
  penDraw(g, [[X0, lf(X0, YG), X0, lf(X0, YR - 14)], [X1, rf(X1, YG), X1, rf(X1, YR - 14)]], 1, st(1.2, 0.6))
  const blinds = (q: number[], key: number) => {
    nMatte(g, q, 0.55)
    penStroke(g, closed(q), 1, st(1.2))
    for (let k = 1; k < 10; k++) {
      const f = k / 10
      penStroke(g, [q[0] + 2, lerp(q[1], q[3], f), q[6] - 2, lerp(q[7], q[5], f)], 1, st(0.5, 0.55, { seed: key * 10 + k }))
    }
    penStroke(g, [q[2] - 6, q[3] + 5, q[4] + 6, q[5] + 5], 1, st(1, 0.75))
  }
  LA_WIN_R.forEach((w, i) => blinds(winQ(...w, rf), i))
  LA_WIN_L.forEach((w, i) => blinds(winQ(...w, lf), 10 + i))
  nMatte(g, LA_DOOR, 0.4)
  penDraw(g, [closed(LA_DOOR), [842, rf(842, 448), 938, rf(938, 448)]], 1, st(1.5))
  penStroke(g, sketchEllipse(918, rf(918, 530), 3, 3, 5, 0.1), 1, st(1))
  // mailboxes beside the door
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const xa = 784 + c * 20, ya = 470 + r * 20
    penStroke(g, closed([xa, rf(xa, ya), xa, rf(xa, ya + 16), xa + 16, rf(xa + 16, ya + 16), xa + 16, rf(xa + 16, ya)]), 1, st(0.8, 0.8, { seed: r * 3 + c }))
    penStroke(g, [xa + 3, rf(xa + 3, ya + 5), xa + 13, rf(xa + 13, ya + 5)], 1, st(0.5, 0.7))
  }
  // exterior stair to the walkway, railing
  penDraw(g, [[1330, rf(1330, YG), 1540, rf(1540, 412)], [1350, rf(1350, YG + 10), 1560, rf(1560, 420)]], 1, st(1.5))
  for (let i = 0; i < 10; i++) {
    const x = 1340 + i * 21
    penStroke(g, [x, rf(x, YG - i * 19), x + 19, rf(x + 19, YG - i * 19)], 1, st(0.8, 0.7, { seed: 60 + i }))
  }
  penStroke(g, [CX, YF - 34, X1, rf(X1, YF - 34)], 1, st(1.3))
  for (let x = CX + 14; x < X1; x += 22) penStroke(g, [x, rf(x, YF), x, rf(x, YF - 34)], 1, st(0.6, 0.55, { seed: x }))
  // hatched shrubs at the base
  for (const [bx, bw, f] of [[320, 150, lf], [1180, 150, rf]] as [number, number, typeof lf][]) {
    const y0 = f(bx, YG)
    const outline: Poly = []
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + (i / 18) * Math.PI
      outline.push(bx + Math.cos(a) * bw * 0.5 * (0.9 + 0.2 * rand(i, bx)), y0 + Math.sin(a) * 46 * (0.8 + 0.4 * rand(i, bx + 1)))
    }
    nMatte(g, outline, 0.4)
    hatch(g, [outline], { angle: -0.8, gap: 4, cross: true, ...st(0.6, 0.45) })
    penStroke(g, outline, 1, st(1.1, 0.8))
  }
  penDraw(g, [[0, 650, W, 616], [0, 708, W, 668]], 1, st(1, 0.45))
  palm(g, bt, [1250, 300, 1262, 240, 1272, 170, 1286, 110], [1286, 108], 70, 7)
  palm(g, bt, [1660, 640, 1640, 520, 1610, 400, 1586, 280, 1570, 170], [1570, 166], 150, 3)
  palm(g, bt, [300, 900, 322, 700, 318, 500, 300, 300, 318, 120, 350, 20], [350, 18], 230, 5)
}

function drawE5a(ctx: Ctx, t: number) {
  const lt = t - T5
  nightPaper(ctx, t, { lift: 0.18 })
  ctx.save()
  zoom(ctx, 890, 520, 1 + 0.16 * ease.inOutSine(clamp(lt / 1.8)))
  moon(ctx, 1450, 150, 36, { t, glow: 0.95 })
  penStroke(ctx, sketchEllipse(1450, 150, 38, 38, 21, 0.1), 1, NL(t, { width: 1.3, alpha: 0.6 }))
  // the stucco block: its walls are her words
  ctx.drawImage(cached('segE:laMatte', W, H, (g) => {
    nMatte(g, [X0, lf(X0, YG), X0, lf(X0, YR - 14), CX, YR - 14, CX, YG], 0.3)
    nMatte(g, [CX, YG, CX, YR - 14, X1, rf(X1, YR - 14), X1, rf(X1, YG)], 0.1, '150,160,190')
  }), 0, 0)
  textImage(ctx, { key: 'E-la', draw: laMask, cell: 9, emerge: 1, gamma: 1.1, thr: 0.1, color: '#dfe6f4', seed: 9, alpha: 0.85, t })
  ctx.drawImage(boiled('laLines', t, drawLALines), 0, 0)
  // lit windows going dark on the beats
  const lit: [number, number, number, number, number, boolean][] = [[860, 960, 262, 350, 375, true], [1230, 1320, 266, 350, 376, true], [500, 620, 450, 540, 375, false], [1010, 1130, 452, 540, 377, true]]
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const [xa, xb, ya, yb, bi, r] of lit) {
    const on = t < B(bi) ? 1 : 0.15 * Math.exp(-(t - B(bi)) * 6)
    ctx.fillStyle = `rgba(200,212,238,${0.32 * on})`
    ctx.fill(pathOf(winQ(xa, xb, ya, yb, r ? rf : lf)))
  }
  ctx.restore()
  ctx.restore()
}

// ── E5b: the door ──
const DL = 520, DR = 840
const dTop = (x: number) => lerp(96, 124, (x - DL) / (DR - DL)), dBot = (x: number) => lerp(600, 578, (x - DL) / (DR - DL))
const WL = 1130, WR = 1480
const wTop = (x: number) => lerp(214, 238, (x - WL) / (WR - WL)), wBot = (x: number) => lerp(446, 428, (x - WL) / (WR - WL))
const MB = [40, 262, 300, 256, 300, 418, 40, 426]

function doorWallMask(g: Ctx) {
  // moonlit from the upper right, falling off to the lower left
  const gr = g.createRadialGradient(1700, -60, 100, 1700, -60, 1900)
  gr.addColorStop(0, '#f0f0f0')
  gr.addColorStop(1, '#3a3a3a')
  g.fillStyle = gr
  g.fillRect(0, 0, W, H)
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.fill(pathOf([DL - 36, dTop(DL) - 36, DR + 32, dTop(DR) - 30, DR + 32, dBot(DR) + 14, DL - 36, dBot(DL) + 14]))
  g.fill(pathOf([WL - 22, wTop(WL) - 22, WR + 20, wTop(WR) - 20, WR + 20, wBot(WR) + 36, WL - 22, wBot(WL) + 36]))
  g.fill(pathOf([MB[0] - 6, MB[1] - 20, MB[2] + 6, MB[3] - 20, MB[4] + 6, MB[5] + 6, MB[6] - 6, MB[7] + 6]))
  g.restore()
}

function frondShadow(g: Ctx) {
  g.save()
  for (let f = 0; f < 5; f++) {
    const a = 2.25 + f * 0.2
    const p: Poly = []
    for (let i = 0; i <= 12; i++) {
      const s = i / 12
      p.push(1560 + Math.cos(a) * 980 * s, -80 + Math.sin(a) * 980 * s + 180 * s * s)
    }
    penStroke(g, p, 1, { color: 'rgb(6,9,18)', width: 7, alpha: 0.45, nib: false })
    for (let i = 2; i < 12; i++) {
      const x = p[i * 2], y = p[i * 2 + 1]
      const ll = 120 * Math.sin((i / 12) * Math.PI)
      for (const s of [-1, 1]) penStroke(g, [x, y, x + s * ll * 0.3, y + ll], 1, { color: 'rgb(6,9,18)', width: 6, alpha: 0.4, nib: false, taperOut: ll * 0.6 })
    }
  }
  g.restore()
}

function drawDoorLines(g: Ctx, bt: number) {
  const st = (w: number, a = 0.92, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  // palm-frond shadow thrown across the wall by the moon (soft, dark; blurred once)
  g.save()
  g.filter = 'blur(3px)'
  g.drawImage(cached('segE:frondShadow', W, H, frondShadow), 0, 0)
  g.restore()
  // door and casing (3/4: hinge left, lock edge right)
  const casing = [DL - 34, dTop(DL) - 34, DR + 30, dTop(DR) - 28, DR + 30, dBot(DR) + 10, DL - 34, dBot(DL) + 10]
  nMatte(g, casing, 0.15, '120,130,160')
  const door = [DL, dTop(DL), DR, dTop(DR), DR, dBot(DR), DL, dBot(DL)]
  nMatte(g, door, 0.45)
  penDraw(g, [closed(casing), closed(door)], 1, st(2.1))
  for (const [ya, yb] of [[0.1, 0.42], [0.52, 0.9]]) {
    const xa = DL + 40, xb = DR - 46
    const p = [xa, lerp(dTop(xa), dBot(xa), ya), xb, lerp(dTop(xb), dBot(xb), ya), xb, lerp(dTop(xb), dBot(xb), yb), xa, lerp(dTop(xa), dBot(xa), yb)]
    penStroke(g, closed(p), 1, st(1.2, 0.75))
    hatch(g, [[p[0], p[1], p[2], p[3], p[2], p[3] + 10, p[0], p[1] + 10]], { angle: 0, gap: 3, ...st(0.6, 0.5) })
  }
  hatch(g, [door], { angle: 1.52, gap: 6, ...st(0.6, 0.22) })
  penStroke(g, sketchEllipse(680, 220, 6, 6, 3, 0.1), 1, st(1.2))
  for (const y of [160, 360, 550]) penStroke(g, closed([DL + 2, y, DL + 14, y, DL + 14, y + 32, DL + 2, y + 32]), 1, st(0.9, 0.8))
  // mailbox with an airmail envelope sticking out
  // mailbox (nearer, larger) with an airmail envelope sticking out of the slot
  nMatte(g, MB, 0.25)
  penDraw(g, [closed(MB), [MB[0] + 14, MB[1] + 34, MB[2] - 14, MB[3] + 32], [MB[0] + 6, MB[1], MB[0], MB[1] - 18, MB[2] - 6, MB[3] - 20, MB[2], MB[3]]], 1, st(1.6))
  penStroke(g, sketchEllipse(MB[2] - 30, MB[5] - 30, 6, 6, 77, 0.1), 1, st(1.2))
  const env = [100, 290, 106, 246, 238, 238, 232, 284]
  g.save()
  g.fillStyle = 'rgba(232,230,222,0.92)'
  g.fill(pathOf(env))
  g.clip(pathOf(env))
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? 'rgba(179,52,58,0.9)' : 'rgba(60,80,140,0.9)'
    const x = 104 + i * 9
    g.fill(pathOf([x, 245, x + 5, 245, x + 1, 254, x - 4, 254]))
  }
  g.font = `italic 400 13px ${FONT.en}`
  g.fillStyle = 'rgba(42,29,20,0.8)'
  g.fillText('Eileen Chang', 138, 274)
  g.restore()
  penStroke(g, closed(env), 1, st(1))
  // window frame, sill, potted plant
  const frame = [WL - 18, wTop(WL) - 18, WR + 16, wTop(WR) - 16, WR + 16, wBot(WR) + 22, WL - 18, wBot(WL) + 22]
  nMatte(g, frame, 0.12, '120,130,160')
  penDraw(g, [closed(frame), closed([WL, wTop(WL), WR, wTop(WR), WR, wBot(WR), WL, wBot(WL)]), closed([WL - 30, wBot(WL) + 22, WR + 28, wBot(WR) + 22, WR + 28, wBot(WR) + 32, WL - 30, wBot(WL) + 32])], 1, st(1.9))
}

function drawE5b(ctx: Ctx, t: number) {
  const lt = t - T5B
  nightPaper(ctx, t, { lift: 0.14 })
  let shake = 0
  for (let i = 377; i <= 381; i++) shake += hit(t, B(i), 20) * (i % 2 ? 4 : -4)
  ctx.save()
  zoom(ctx, 760, 380, 1.04 + 0.04 * ease.inOutSine(clamp(lt / 2.6)), -0.004, -10 * lt + shake, shake * 0.3)
  // the stucco wall is a field of her words
  textImage(ctx, { key: 'E-doorwall', draw: doorWallMask, cell: 10, emerge: 1, gamma: 1, thr: 0.1, color: '#cfd8ea', seed: 13, alpha: 0.42, t })
  ctx.drawImage(boiled('doorwall', t, drawDoorLines), 0, 0)
  // window: lamp light behind blinds; the blinds shut on beat 381
  const close = ease.inOutCubic(prog(t, B(381), B(381) + 0.18))
  ctx.save()
  ctx.clip(pathOf([WL, wTop(WL), WR, wTop(WR), WR, wBot(WR), WL, wBot(WL)]))
  glow(ctx, (WL + WR) / 2, 330, 320, '205,214,236', 0.55 * (1 - close) + 0.05, 'source-over')
  const ns = 15
  for (let k = 0; k < ns; k++) {
    const f = (k + 0.5) / ns
    const yl = lerp(wTop(WL), wBot(WL), f), yr = lerp(wTop(WR), wBot(WR), f)
    const gap = (wBot(WL) - wTop(WL)) / ns
    const w = lerp(gap * 0.38, gap * 1.05, close)
    penStroke(ctx, [WL - 6, yl, WR + 6, yr], 1, NL(t, { width: w, color: 'rgb(26,32,50)', alpha: 0.96, wobble: 0.6, taperIn: 2, taperOut: 2, seed: k }))
    penStroke(ctx, [WL - 6, yl + w / 2, WR + 6, yr + w / 2], 1, NL(t, { width: 0.8, alpha: 0.55, seed: k + 50 }))
  }
  penStroke(ctx, [WL + 44, wTop(WL + 44), WL + 46, wBot(WL + 46)], 1, NL(t, { width: 0.7, alpha: 0.6 }))
  penStroke(ctx, [WR - 44, wTop(WR - 44), WR - 42, wBot(WR - 42)], 1, NL(t, { width: 0.7, alpha: 0.6 }))
  ctx.restore()
  // the moon reflected in the glass
  ctx.save()
  ctx.globalAlpha = 0.35 * (1 - 0.6 * close)
  ctx.filter = 'blur(3px)'
  moon(ctx, WL + 70, wTop(WL + 70) + 40, 16, { t, glow: 0.5 })
  ctx.restore()
  // the locks: chain, two deadbolts, knob — one per beat
  const k0 = (i: number) => ease.outCubic(prog(t, B(377 + i), B(377 + i) + 0.09))
  const st = (w: number, a = 0.95) => NL(t, { width: w, alpha: a })
  {
    const c = k0(0)
    penDraw(ctx, [closed([DR - 70, 236, DR - 12, 238, DR - 12, 252, DR - 70, 250]), [DR - 66, 245, DR - 16, 246]], 1, st(1.4))
    penDraw(ctx, [closed([DR + 6, 234, DR + 24, 234, DR + 24, 262, DR + 6, 262])], 1, st(1.4))
    const ax = DR + 14, ay = 248
    const ex = lerp(DR + 2, DR - 60, c), ey = lerp(366, 245, c)
    const mx = lerp(DR + 30, (ax + ex) / 2, c), my = lerp(316, 254, c)
    for (let i = 0; i <= 12; i++) {
      const s = i / 12
      const x = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * mx + s * s * ex
      const y = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * my + s * s * ey
      penStroke(ctx, sketchEllipse(x, y, i % 2 ? 2 : 4.2, i % 2 ? 4.2 : 2, i, 0.1), 1, st(1.1))
    }
    penStroke(ctx, sketchEllipse(ex, ey, 5, 5, 31, 0.1), 1, st(1.6))
  }
  for (const [i, y] of [[1, 300], [2, 352]] as [number, number][]) {
    const c = k0(i)
    const x = DR - 34
    penStroke(ctx, sketchEllipse(x, y, 17, 19, 40 + i, 0.08), 1, st(1.6))
    penStroke(ctx, sketchEllipse(x, y, 10, 11, 50 + i, 0.08), 1, st(1))
    const a = lerp(Math.PI / 2, 0, c)
    penStroke(ctx, [x - Math.cos(a) * 12, y - Math.sin(a) * 12, x + Math.cos(a) * 12, y + Math.sin(a) * 12], 1, st(4.2))
  }
  {
    const c = k0(3)
    const x = DR - 36, y = 432
    penStroke(ctx, sketchEllipse(x, y, 22, 24, 60, 0.08), 1, st(1.4))
    penStroke(ctx, sketchEllipse(x - 3, y, 16, 18, 61, 0.08), 1, st(2))
    hatch(ctx, [sketchEllipse(x + 4, y + 2, 13, 15, 62, 0)], { angle: 1.1, gap: 3, ...NL(t, { width: 0.6, alpha: 0.6 }) })
    penStroke(ctx, [x - 5, y - 4, x - 5 + lerp(0, 8, c), y + 4], 1, st(2.4))
  }
  for (let i = 0; i < 4; i++) {
    const age = t - B(377 + i)
    if (age < 0 || age > 0.4) continue
    const y = [248, 300, 352, 432][i]
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU + i
      const r0 = 28 + age * 70, r1 = r0 + 12
      penStroke(ctx, [DR - 34 + Math.cos(a) * r0, y + Math.sin(a) * r0, DR - 34 + Math.cos(a) * r1, y + Math.sin(a) * r1], 1, NL(t, { width: 1.2, alpha: 0.7 * (1 - age / 0.4), nib: false }))
    }
  }
  ctx.restore()
}

// ══════════════════════════════════════ E6 · rain ══════════════════════════════════════

/** Drops running down glass inside `rect`; new ones land on beats. */
function glassDrops(ctx: Ctx, t: number, rect: [number, number, number, number], n: number, scale: number, b0: number, b1: number, seed: number) {
  const [x0, y0, x1, y1] = rect
  const st = (w: number, a: number, sd: number) => NL(t, { width: w, alpha: a, seed: sd, wobble: 0.5, nib: false })
  for (let i = 0; i < n; i++) {
    const period = 5 + rand(i, seed) * 5
    const ph = rand(i, seed + 1) * period
    const age = (t + ph) % period
    const cyc = Math.floor((t + ph) / period)
    const x = lerp(x0 + 10, x1 - 10, rand(i * 7 + cyc, seed + 2))
    const ys = lerp(y0, y0 + (y1 - y0) * 0.6, rand(i * 3 + cyc, seed + 3))
    const v = (40 + rand(i, seed + 4) * 70) * scale
    const y = ys + v * age + 14 * scale * Math.floor(age * 1.7)
    const yEnd = Math.min(y, y1)
    const p: Poly = []
    for (let yy = ys; yy <= yEnd; yy += 8) p.push(x + (rand(Math.floor(yy / 23), i) - 0.5) * 2.4 * scale, yy)
    const a = 1 - prog(age, period - 1, period)
    if (p.length >= 4) penStroke(ctx, p, 1, st(0.8 * scale, 0.35 * a, i))
    if (y < y1) {
      const hx = p.length >= 2 ? p[p.length - 2] : x
      penStroke(ctx, sketchEllipse(hx, y, 3 * scale, 3.8 * scale, i + cyc, 0.1), 1, st(0.9 * scale, 0.7 * a, i + 9))
      dots(ctx, [[hx - 1 * scale, y - 1.2 * scale, 1.1 * scale]], 'rgba(235,240,252,1)', 0.7 * a)
    }
  }
  const bd: [number, number, number][] = []
  for (let i = 0; i < n * 5; i++) bd.push([lerp(x0, x1, rand(i, seed + 20)), lerp(y0, y1, rand(i, seed + 21)), (0.8 + rand(i, seed + 22) * 1.8) * scale])
  dots(ctx, bd, 'rgba(210,222,245,1)', 0.32)
  for (let i = b0; i < b1; i++) {
    const age = t - B(i)
    if (age < 0 || age > 0.8) continue
    const x = lerp(x0 + 30, x1 - 30, rand(i, seed + 30)), y = lerp(y0 + 30, y1 - 30, rand(i, seed + 31))
    penStroke(ctx, sketchEllipse(x, y, (4 + age * 30) * scale, (3.4 + age * 24) * scale, i, 0.1), 1, st(1.2 * scale, 0.8 * (1 - age / 0.8), i))
    dots(ctx, [[x, y, 3 * scale]], 'rgba(225,232,250,1)', 0.8)
  }
}

/** night outside a window: lifted sky, blurred wet moon, rain of characters */
function windowView(ctx: Ctx, t: number, mx: number, my: number, mr: number, blur: number, rainSize: number, x0: number, x1: number) {
  nightPaper(ctx, t, { lift: 0.3, seed: 9 })
  ctx.save()
  ctx.filter = `blur(${blur}px)`
  moon(ctx, mx, my, mr, { t, glow: 1, wet: 0.5 })
  ctx.restore()
  textRain(ctx, t, { n: 140, speed: 420, angle: 0.1, color: '#cfd9ee', alpha: 0.55, size: rainSize, seed: 17, x0, x1 })
}

const DESK = { x: 560, y: 768, h: 760 }
const BW = { x0: 1160, y0: 70, x1: 1720, y1: 560 }
const du = (v: number) => DESK.y + (v - 1000) * (DESK.h / 1000)
const dx = (v: number) => DESK.x + (v - 500) * (DESK.h / 1000)

function drawRoom(g: Ctx, bt: number) {
  const st = (w: number, a = 0.85, o: St = {}) => nb(bt, { width: w, alpha: a, ...o })
  // the tall window on the right: frame, mullions, sill, a curtain pushed aside
  const { x0, y0, x1, y1 } = BW
  const mx = (x0 + x1) / 2
  nMatte(g, [x0 - 24, y0 - 24, x1 + 24, y0 - 24, x1 + 24, y0, x0 - 24, y0], 0.2, '80,90,120')
  nMatte(g, [mx - 8, y0, mx + 8, y0, mx + 8, y1, mx - 8, y1], 0.3)
  nMatte(g, [x0, 300, x1, 300, x1, 314, x0, 314], 0.3)
  penDraw(g, [closed([x0 - 24, y0 - 24, x1 + 24, y0 - 24, x1 + 24, y1 + 8, x0 - 24, y1 + 8]), closed([x0, y0, x1, y0, x1, y1, x0, y1]), [mx - 8, y0, mx - 8, y1], [mx + 8, y0, mx + 8, y1], [x0, 300, x1, 300], [x0, 314, x1, 314]], 1, st(1.7))
  const sill = [x0 - 44, y1 + 8, x1 + 44, y1 + 8, x1 + 60, y1 + 28, x0 - 60, y1 + 28]
  nMatte(g, sill, 0.1, '80,90,120')
  penStroke(g, closed(sill), 1, st(1.5))
  for (let i = 0; i < 8; i++) {
    const x = x1 - 10 + i * 12
    const p: Poly = []
    for (let y = y0 - 34; y <= y1 + 60; y += 20) p.push(x + Math.sin(y * 0.02 + i) * 5 - (y > 380 ? (y - 380) * 0.1 * (1 - i / 8) : 0), y)
    penStroke(g, p, 1, st(i % 3 ? 0.8 : 1.3, 0.65, { seed: i }))
  }
  penStroke(g, [x0 - 70, y0 - 38, x1 + 130, y0 - 38], 1, st(2.2))
  // moving cartons stacked in front of the window (silhouetted against the rain)
  const box = (x: number, y: number, w: number, h: number, d: number, seed: number) => {
    const front = [x, y, x + w, y, x + w, y + h, x, y + h]
    const top = [x, y, x + d, y - d * 0.5, x + w + d, y - d * 0.5, x + w, y]
    const side = [x + w, y, x + w + d, y - d * 0.5, x + w + d, y + h - d * 0.5, x + w, y + h]
    nMatte(g, front, 0.3)
    nMatte(g, top, 0.15, '110,120,150')
    nMatte(g, side, 0.45)
    hatch(g, [side], { angle: 1.2, gap: 5, ...st(0.6, 0.4) })
    penDraw(g, [closed(front), closed(top), closed(side), [x + w * 0.5, y, x + w * 0.5 + d, y - d * 0.5]], 1, st(1.3, 0.8, { seed }))
    penStroke(g, [x + w * 0.5 - 6, y, x + w * 0.5 - 6, y + h * 0.4], 1, st(0.8, 0.6))
  }
  box(1120, 560, 220, 150, 64, 1)
  box(1150, 436, 170, 124, 52, 2)
  box(1380, 590, 190, 120, 54, 3)
  box(1180, 336, 120, 100, 40, 4)
  // a pile of manuscript pages on the floor between
  for (let i = 0; i < 10; i++) penStroke(g, [960 + rand(i, 1) * 8, 640 - i * 3.4, 1090 + rand(i, 2) * 8, 634 - i * 3.4], 1, st(0.8, 0.7, { seed: i }))
}

function drawE6a(ctx: Ctx, t: number) {
  const lt = t - T6
  nightPaper(ctx, t)
  ctx.save()
  zoom(ctx, 1100, 330, 1 + 0.05 * ease.inOutSine(clamp(lt / 4.2)), 0, -10 * lt, 0)
  // outside the windows: sky, the blurred moon, rain of characters
  const gx0 = dx(614), gx1 = dx(866), gy0 = du(230), gy1 = du(406)
  ctx.save()
  ctx.beginPath()
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0)
  ctx.rect(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0)
  ctx.clip()
  windowView(ctx, t, 1520, 190, 40, 6, 22, 300, W + 100)
  glassDrops(ctx, t, [BW.x0, BW.y0, BW.x1, BW.y1], 18, 1, 382, 391, 5)
  glassDrops(ctx, t, [gx0, gy0, gx1, gy1], 6, 0.7, 390, 390, 6)
  ctx.restore()
  // moonlight spilling from the big window onto the floor and the cartons
  glow(ctx, 1380, 480, 520, '243,217,164', 0.1)
  ctx.drawImage(boiled('room', t, drawRoom), 0, 0)
  ctx.restore()
  // she, nearer (moves a little more)
  ctx.save()
  zoom(ctx, 1100, 330, 1 + 0.065 * ease.inOutSine(clamp(lt / 4.2)), 0, -14 * lt, 0)
  // she surfaces out of characters; only faint pen traces; the lamp's warm pool on her hands and pages
  nMatte(ctx, [dx(170), du(588), dx(890), du(594), dx(890), du(1000), dx(170), du(1000)], 0.25)
  glow(ctx, dx(560), du(612), 230, '236,196,140', 0.32)
  glow(ctx, dx(780), du(480), 90, '246,214,160', 0.35)
  textImage(ctx, {
    key: 'E-oldDesk', cell: 9, gamma: 1.6, thr: 0.08, emerge: clamp(0.35 + lt / 1.8), order: 'sweepYUp', scatter: 50, t, seed: 33, color: '#e4e9f4',
    draw: (g) => eileen(g, 'oldAtDesk', { x: DESK.x, y: DESK.y, h: DESK.h, color: '#fff', dress: '#666', fill: 1, weight: 3, boil: 0 }),
  })
  // where the lamp light falls, the characters warm
  ctx.save()
  ctx.beginPath()
  ctx.arc(dx(560), du(612), 150, 0, TAU)
  ctx.clip()
  textImage(ctx, {
    key: 'E-oldDesk', cell: 9, gamma: 1.6, thr: 0.08, emerge: clamp(0.35 + lt / 1.8), order: 'sweepYUp', scatter: 50, t, seed: 33, color: '#f3d9a4', alpha: 0.75,
    draw: (g) => eileen(g, 'oldAtDesk', { x: DESK.x, y: DESK.y, h: DESK.h, color: '#fff', dress: '#666', fill: 1, weight: 3, boil: 0 }),
  })
  ctx.restore()
  eileen(ctx, 'oldAtDesk', { x: DESK.x, y: DESK.y, h: DESK.h, t, color: C.lineNight, fill: 0, alpha: 0.22 })
  ctx.restore()
}

function drawE6b(ctx: Ctx, t: number) {
  const lt = t - T6B
  ctx.save()
  zoom(ctx, 1100, 340, 1.0 + 0.05 * ease.inOutSine(clamp(lt / 3.7)), 0, -12 * lt, 4 * lt)
  windowView(ctx, t, 1180, 236, 72, 9, 30, -100, W + 100)
  glassDrops(ctx, t, [-100, -100, W + 100, H + 100], 26, 1.8, 390, 397, 13)
  nMatte(ctx, [720, -100, 780, -100, 780, H + 100, 720, H + 100], 0.4)
  nMatte(ctx, [-100, 560, 780, 560, 780, 610, -100, 610], 0.4)
  penDraw(ctx, [[720, -100, 721, H + 100], [780, -100, 781, H + 100], [-100, 560, 720, 561], [-100, 610, 720, 611]], 1, NL(t, { width: 2 }))
  ctx.restore()
  // the line, written in the condensation on the glass
  writeVertical(ctx, t, { text: '宁愿天天下雨，\n以为你是因为下雨不来。', x: 1470, y: 76, size: 36, t0: 202.95, rate: 0.15, perCol: 11, color: 'rgba(222,229,242,0.8)' })
}

// ══════════════════════════════════════ E7 · the years, on beats ══════════════════════════════════════

type Item = { kind: 'door' | 'box' | 'env' | 'page'; x: number; y: number; rot: number; s: number; v: number }
const ITEMS: Item[] = [
  { kind: 'door', x: 400, y: 340, rot: -0.07, s: 1.0, v: 14 },
  { kind: 'box', x: 720, y: 470, rot: 0.04, s: 1.0, v: 0 },
  { kind: 'env', x: 1120, y: 300, rot: -0.12, s: 1.0, v: 0 },
  { kind: 'page', x: 1420, y: 330, rot: 0.08, s: 1.0, v: 0 },
  { kind: 'door', x: 640, y: 250, rot: 0.1, s: 0.86, v: 7 },
  { kind: 'box', x: 1230, y: 500, rot: -0.06, s: 0.84, v: 1 },
  { kind: 'env', x: 880, y: 190, rot: 0.16, s: 0.92, v: 1 },
  { kind: 'page', x: 250, y: 440, rot: -0.15, s: 0.95, v: 1 },
  { kind: 'page', x: 1010, y: 420, rot: 0.03, s: 1.05, v: 2 },
  { kind: 'env', x: 760, y: 330, rot: -0.05, s: 1.12, v: 2 },
]
const PAGE_TEXT = '大考的早晨，那惨淡的心情大家都知道。'
const ITEM_CORPUS: Record<Item['kind'], string> = {
  door: '她一次次搬家一封封写信一遍遍改着旧稿',
  box: '她一次次搬家书稿传奇流言秧歌怨女',
  env: '一封封写信香港宋淇邝文美',
  page: '大考的早晨那惨淡的心情大家都知道小团圆',
}
const ITEM_SIZE: Record<Item['kind'], [number, number]> = { door: [160, 320], box: [260, 230], env: [300, 180], page: [260, 330] }

function itemOutline(kind: Item['kind']): Poly[] {
  if (kind === 'door') return [[-80, -160, 80, -160, 80, 160, -80, 160]]
  if (kind === 'box') return [[-120, -40, 40, -40, 40, 100, -120, 100], [40, -40, 115, -76, 115, 62, 40, 100], [-120, -40, -45, -76, 115, -76, 40, -40], [-120, -40, -150, -96, -70, -122, -45, -76], [40, -40, 70, -10, 145, -46, 115, -76], [-45, -76, -20, -128, 140, -128, 115, -76]]
  if (kind === 'env') return [[-150, -90, 150, -90, 150, 90, -150, 90]]
  return [[-130, -165, 130, -165, 130, 165, -130, 165]]
}

function itemMask(it: Item) {
  return (g: Ctx) => {
    g.translate(it.x, it.y)
    g.rotate(it.rot)
    g.scale(it.s, it.s)
    g.fillStyle = '#7a7a7a'
    for (const p of itemOutline(it.kind)) g.fill(pathOf(p))
    g.strokeStyle = '#fff'
    g.lineWidth = 5
    for (const p of itemOutline(it.kind)) g.stroke(pathOf(p))
    if (it.kind === 'door') {
      g.lineWidth = 3
      g.strokeRect(-60, -136, 120, 116)
      g.strokeRect(-60, 4, 120, 132)
    }
  }
}

/** the pen details that carry the meaning (numbers, addresses, stripes, crossings-out) */
function drawItemDetails(g: Ctx, it: Item, p: number, t: number) {
  const st = (w: number, a = 0.92, o: St = {}) => PL(t, { width: w, alpha: a, ...o })
  const txt = clamp((p - 0.35) / 0.4)
  if (it.kind === 'door') {
    penDraw(g, [closed([-80, -160, 80, -160, 80, 160, -80, 160])], p, st(1.6))
    penDraw(g, [sketchEllipse(60, 10, 8, 8, 3, 0.1), sketchEllipse(60, -18, 5, 5, 4, 0.1)], p, st(1.4))
    g.save()
    g.globalAlpha *= txt
    g.font = `500 46px ${FONT.en}`
    g.textAlign = 'center'
    g.fillStyle = C.ink
    g.fillText(String(it.v), 0, -76)
    g.restore()
    if (it.v === 7) {
      g.save()
      g.translate(60, 18)
      g.rotate(0.12)
      g.globalAlpha *= txt
      g.fillStyle = 'rgba(236,228,206,0.95)'
      g.fillRect(-22, 0, 44, 70)
      g.font = `600 9px ${FONT.en}`
      g.textAlign = 'center'
      g.fillStyle = C.ink
      ;['DO', 'NOT', 'DISTURB'].forEach((w, i) => g.fillText(w, 0, 26 + i * 12))
      penDraw(g, [closed([-22, 0, 22, 0, 22, 70, -22, 70]), sketchEllipse(0, 9, 6, 6, 9, 0.1)], 1, st(1))
      g.restore()
    }
  } else if (it.kind === 'box') {
    penDraw(g, itemOutline('box').map(closed), p, st(1.4, 0.85))
    penDraw(g, [[-50, -40, -50, 40], [-60, -40, -60, 30]], p, st(1.2, 0.7))
    g.save()
    g.globalAlpha *= txt * 0.9
    g.font = `400 28px ${FONT.kai}`
    g.fillStyle = C.ink
    g.fillText(it.v ? '書' : '稿', -100, 72)
    g.restore()
  } else if (it.kind === 'env') {
    g.save()
    g.globalAlpha *= clamp(p * 2)
    for (let k = 0; k < 44; k++) {
      let d = (k / 44) * 960
      let x: number, y: number, a: number
      if (d < 300) { x = -150 + d; y = -90; a = 0 } else if ((d -= 300) < 180) { x = 150; y = -90 + d; a = Math.PI / 2 } else if ((d -= 180) < 300) { x = 150 - d; y = 90; a = Math.PI } else { d -= 300; x = -150; y = 90 - d; a = -Math.PI / 2 }
      g.save()
      g.translate(x, y)
      g.rotate(a)
      g.fillStyle = k % 2 ? 'rgba(179,52,58,0.85)' : 'rgba(62,84,146,0.85)'
      g.fill(pathOf([2, 0, 11, 0, 7, 9, -2, 9]))
      g.restore()
    }
    g.restore()
    penDraw(g, [closed([-150, -90, 150, -90, 150, 90, -150, 90]), closed([88, -76, 136, -76, 136, -18, 88, -18])], p, st(1.3))
    hatch(g, [[92, -72, 132, -72, 132, -22, 92, -22]], { angle: 0.6, gap: 3, progress: p, ...st(0.6, 0.6, { color: C.rouge }) })
    g.save()
    g.globalAlpha *= txt
    g.fillStyle = C.ink
    g.font = `600 11px ${FONT.en}`
    ;(g as any).letterSpacing = '1.5px'
    g.fillText('BY AIR MAIL · PAR AVION', -132, -62)
    ;(g as any).letterSpacing = '0px'
    g.font = `italic 400 21px ${FONT.en}`
    g.fillText('Mr. & Mrs. Stephen Soong', -70, 14)
    g.fillText('Hong Kong', -40, 44)
    g.restore()
    const pm = clamp((p - 0.75) / 0.25)
    if (pm > 0) {
      g.save()
      g.globalAlpha *= pm
      penDraw(g, [sketchEllipse(84, -40, 30, 30, 12, 0.05), sketchEllipse(84, -40, 22, 22, 13, 0.05)], 1, st(1.4, 0.7))
      for (let k = 0; k < 4; k++) penStroke(g, [100, -60 + k * 9, 120, -64 + k * 9, 140, -56 + k * 9, 160, -60 + k * 9, 176, -56 + k * 9], 1, st(1.2, 0.65, { seed: k }))
      g.restore()
    }
  } else {
    const cols = 8, rows = 12, cw = 26, rh = 22
    const gx0 = 110 - cols * cw, gy0 = -140
    const grid: Poly[] = []
    for (let c = 0; c <= cols; c++) grid.push([gx0 + c * cw, gy0, gx0 + c * cw, gy0 + rows * rh])
    for (let r = 0; r <= rows; r++) grid.push([gx0, gy0 + r * rh, gx0 + cols * cw, gy0 + r * rh])
    penDraw(g, grid, p, st(0.6, 0.55, { color: C.rouge, wobble: 0.3 }))
    penStroke(g, closed([-130, -165, 130, -165, 130, 165, -130, 165]), p, st(1.1))
    g.save()
    g.globalAlpha *= txt
    g.font = `400 18px ${FONT.kai}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = C.ink
    ;[...PAGE_TEXT].forEach((ch, i) => {
      const c = Math.floor(i / rows), r = i % rows
      g.fillText(ch, gx0 + (cols - 1 - c) * cw + cw / 2, gy0 + r * rh + rh / 2 + 1)
    })
    g.restore()
    // her crossings-out: different on every draft
    const strikes = ([[[0, 1, 5], [1, 0, 6]], [[0, 5, 11], [1, 2, 5]], [[0, 0, 11], [1, 0, 5]]] as [number, number, number][][])[it.v]
    strikes.forEach(([c, r0, r1], k) => {
      const x = gx0 + (cols - 1 - c) * cw + cw / 2
      const pts: Poly = []
      for (let y = gy0 + r0 * rh + 4; y <= gy0 + (r1 + 1) * rh - 4; y += 7) pts.push(x + (Math.round(y / 7) % 2 ? -8 : 8), y)
      penStroke(g, pts, clamp((p - 0.6) / 0.35), st(1.5, 0.85, { seed: k + it.v * 7 }))
    })
    if (it.v === 2) penStroke(g, [...bez(gx0 + 10, gy0 + 40, gx0 + 60, gy0 + 10, gx0 + 150, gy0 + 200, gx0 + 200, gy0 + 160, 12), ...bez(gx0 + 200, gy0 + 160, gx0 + 250, gy0 + 120, gx0 + 120, gy0 + 60, gx0 + 60, gy0 + 230, 12).slice(2)], clamp((p - 0.7) / 0.3), st(1.4, 0.8))
  }
}

function drawE7(ctx: Ctx, t: number) {
  const lt = t - T7
  nightPaper(ctx, t, { lift: 0.08 })
  const lift = Math.max(0, t - (B(406) + 0.12))
  // the lamp's warm pool on the table; faint drifting characters (the years) in the dark around it
  glow(ctx, 820, 380, 900, '236,196,140', 0.2)
  glow(ctx, 820, 380, 480, '246,214,160', 0.16)
  textRain(ctx, t, { n: 80, speed: 30, angle: 0.3, color: '#c9d3e6', alpha: 0.22, size: 18, seed: 31, corpus: '她一次次搬家一封封写信一遍遍改着旧稿' })
  ctx.save()
  zoom(ctx, 820, 360, 1.1 - 0.08 * ease.outCubic(clamp(lt / 5)) + 0.04 * ease.inCubic(clamp(lift / 0.6)), -0.012 + (0.006 * lt) / 5)
  ITEMS.forEach((it, i) => {
    const bt0 = B(397 + i)
    const age = t - bt0
    if (age < -0.05) return
    const land = ease.outBack(clamp(age / 0.22))
    const sc = lerp(1.18, 1, land)
    const r = rand(i, 77)
    const flies = it.kind === 'env' || it.kind === 'page'
    const fx = lift > 0 ? lift * lift * (300 + r * 900) * (flies ? 1.4 : 0.6) : 0
    const fy = lift > 0 ? -lift * lift * (900 + r * 1500) * (flies ? 1.3 : 0.5) : 0
    const dr = lift * lift * (r - 0.4) * 4
    // whole-item transform about its centre (mask was drawn at its resting pose)
    ctx.save()
    ctx.translate(it.x + fx, it.y + fy)
    ctx.rotate(dr)
    ctx.scale(sc, sc)
    ctx.translate(-it.x, -it.y)
    // contact shadow + paper matte so later items cover earlier ones
    ctx.save()
    ctx.translate(it.x, it.y)
    ctx.rotate(it.rot)
    ctx.scale(it.s, it.s)
    const [sw, sh] = ITEM_SIZE[it.kind]
    ctx.save()
    ctx.globalAlpha *= 0.22 * clamp(age * 6)
    ctx.filter = 'blur(10px)'
    ctx.fillStyle = 'rgb(60,40,20)'
    ctx.fillRect(-sw / 2 + 10, -sh / 2 + 14, sw, sh)
    ctx.restore()
    ctx.globalAlpha *= clamp(age * 5)
    for (const p of itemOutline(it.kind)) pMatte(ctx, p, it.kind === 'box' ? 'rgba(180,135,80,0.28)' : it.kind === 'door' ? 'rgba(160,120,80,0.2)' : 'rgba(255,252,244,0.5)')
    ctx.restore()
    // the item surfaces out of characters (radial from its centre)
    textImage(ctx, { key: `E-item${i}`, draw: itemMask(it), corpus: ITEM_CORPUS[it.kind], cell: 9, emerge: prog(age, 0, 0.38), order: 'radial', ox: it.x, oy: it.y, scatter: 50, gamma: 1.0, thr: 0.12, color: it.kind === 'box' ? '#5a3c22' : '#3a2a1e', seed: 20 + i, alpha: 0.85 })
    ctx.translate(it.x, it.y)
    ctx.rotate(it.rot)
    ctx.scale(it.s, it.s)
    drawItemDetails(ctx, it, ease.outCubic(clamp(age / 0.45)), t)
    ctx.restore()
  })
  ctx.restore()
  // 飞雨: slanting rain of characters sweeps in for the last beats
  const rk = clamp((t - B(405)) / 0.8)
  // lamp light falls off into indigo at the edges
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const vg = ctx.createRadialGradient(820, 380, 260, 820, 400, 1150)
  vg.addColorStop(0, 'rgba(255,255,255,0)')
  vg.addColorStop(1, 'rgba(30,38,70,0.85)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  if (rk > 0) textRain(ctx, t, { n: Math.round(220 * rk), speed: 900, angle: -0.35, color: '#d8dfee', alpha: 0.5 * rk, size: 20, seed: 41 })
  const fl = beatPulse(t, 14)
  if (fl > 0.01) {
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.fillStyle = `rgba(255,240,210,${0.25 * fl})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

// ══════════════════════════════════════ scenes ══════════════════════════════════════

export const scenes: Scene[] = [
  { id: 'E1a-liner', t0: S0, t1: T1B, theme: 'night', trans: { kind: 'ink', dur: 1.0 }, draw: (ctx, t) => drawE1a(ctx, t) },
  { id: 'E1b-rail', t0: T1B, t1: T2, theme: 'night', trans: { kind: 'dissolve', dur: 0.35 }, draw: (ctx, t) => drawE1b(ctx, t) },
  { id: 'E2-newyork', t0: T2, t1: T3, theme: 'night', trans: { kind: 'ink', dur: 0.5 }, draw: (ctx, t) => drawE2(ctx, t) },
  { id: 'E3-macdowell', t0: T3, t1: T4, theme: 'paper', trans: { kind: 'whiteout', dur: 0.55 }, draw: (ctx, t) => drawE3(ctx, t) },
  { id: 'E4-chair', t0: T4, t1: T5, theme: 'night', trans: { kind: 'ink', dur: 0.8 }, draw: (ctx, t) => drawE4(ctx, t) },
  { id: 'E5a-la', t0: T5, t1: T5B, theme: 'night', trans: { kind: 'ink', dur: 0.7 }, draw: (ctx, t) => drawE5a(ctx, t) },
  { id: 'E5b-door', t0: T5B, t1: T6, theme: 'night', trans: { kind: 'cut', dur: 0 }, draw: (ctx, t) => drawE5b(ctx, t) },
  { id: 'E6a-rain', t0: T6, t1: T6B, theme: 'night', trans: { kind: 'dissolve', dur: 0.6 }, draw: (ctx, t) => drawE6a(ctx, t) },
  { id: 'E6b-glass', t0: T6B, t1: T7, theme: 'night', trans: { kind: 'cut', dur: 0 },draw: (ctx, t) => drawE6b(ctx, t) },
  { id: 'E7-years', t0: T7, t1: S1, theme: 'night', trans: { kind: 'cut', dur: 0 }, draw: (ctx, t) => drawE7(ctx, t) },
]
