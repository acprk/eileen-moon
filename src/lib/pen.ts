/**
 * Hand-drawn line engine.
 *
 * Shapes are authored as SVG path strings (M L H V C S Q T Z, absolute or relative; no arcs) or as flat
 * polylines, flattened to `Poly` (= flat [x0,y0,x1,y1,…] array) and cached. A stroke is rendered as a filled
 * ribbon whose width follows a pen-pressure profile (tapered ends, slow pressure noise), whose centre-line is
 * displaced by smooth noise (hand wobble), and which can "boil" (re-seed the wobble a few times a second, like
 * hand-redrawn animation). `progress` reveals a stroke from its start, with a slightly heavier nib at the head.
 */
import { TAU, clamp, lerp, rand } from './math'
import { cached, type Ctx } from './texture'

export type Poly = number[]

// ───────────────────────────── path parsing ─────────────────────────────

const polyCache = new Map<string, Poly[]>()

function cubicPts(out: number[], x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, step: number) {
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)
  const n = Math.max(2, Math.ceil(len / step))
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3)
  }
}

/** Flatten an SVG path (no arcs) into polylines, one per subpath. Cached by (d, step). */
export function pathPolys(d: string, step = 4): Poly[] {
  const key = `${step}|${d}`
  const hit = polyCache.get(key)
  if (hit) return hit
  const toks = d.match(/[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const polys: Poly[] = []
  let cur: number[] = []
  let x = 0, y = 0, sx = 0, sy = 0
  let cx = 0, cy = 0 // last control point (for S/T)
  let cmd = ''
  let prev = ''
  let i = 0
  const num = () => parseFloat(toks[i++])
  const flush = () => {
    if (cur.length >= 4) polys.push(cur)
    cur = []
  }
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (C) {
      case 'M': {
        flush()
        x = ox + num(); y = oy + num(); sx = x; sy = y
        cur.push(x, y)
        cmd = rel ? 'l' : 'L'
        break
      }
      case 'L': x = ox + num(); y = oy + num(); cur.push(x, y); break
      case 'H': x = (rel ? x : 0) + num(); cur.push(x, y); break
      case 'V': y = (rel ? y : 0) + num(); cur.push(x, y); break
      case 'C': {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubicPts(cur, x, y, x1, y1, x2, y2, x3, y3, step)
        cx = x2; cy = y2; x = x3; y = y3
        break
      }
      case 'S': {
        const r = /[CcSs]/.test(prev)
        const x1 = r ? 2 * x - cx : x, y1 = r ? 2 * y - cy : y
        const x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubicPts(cur, x, y, x1, y1, x2, y2, x3, y3, step)
        cx = x2; cy = y2; x = x3; y = y3
        break
      }
      case 'Q': {
        const qx = ox + num(), qy = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubicPts(cur, x, y, x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x3 + (2 / 3) * (qx - x3), y3 + (2 / 3) * (qy - y3), x3, y3, step)
        cx = qx; cy = qy; x = x3; y = y3
        break
      }
      case 'T': {
        const r = /[QqTt]/.test(prev)
        const qx = r ? 2 * x - cx : x, qy = r ? 2 * y - cy : y
        const x3 = ox + num(), y3 = oy + num()
        cubicPts(cur, x, y, x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x3 + (2 / 3) * (qx - x3), y3 + (2 / 3) * (qy - y3), x3, y3, step)
        cx = qx; cy = qy; x = x3; y = y3
        break
      }
      case 'Z': {
        cur.push(sx, sy); x = sx; y = sy
        flush()
        cur.push(x, y)
        break
      }
      default: i++
    }
    prev = cmd
  }
  flush()
  polyCache.set(key, polys)
  return polys
}

/** Resample a polyline to roughly uniform spacing (keeps endpoints). */
export function resample(p: Poly, step = 3): Poly {
  const out: Poly = [p[0], p[1]]
  let carry = 0
  for (let i = 2; i < p.length; i += 2) {
    const ax = p[i - 2], ay = p[i - 1], bx = p[i], by = p[i + 1]
    const L = Math.hypot(bx - ax, by - ay)
    let s = step - carry
    while (s <= L) {
      out.push(ax + ((bx - ax) * s) / L, ay + ((by - ay) * s) / L)
      s += step
    }
    carry = L - (s - step)
  }
  const n = p.length
  if (out[out.length - 2] !== p[n - 2] || out[out.length - 1] !== p[n - 1]) out.push(p[n - 2], p[n - 1])
  return out
}

export function polyLength(p: Poly) {
  let L = 0
  for (let i = 2; i < p.length; i += 2) L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1])
  return L
}

/** Apply an affine map (scale s, then translate) to polylines. */
export function place(polys: Poly[], tx: number, ty: number, s = 1): Poly[] {
  return polys.map((p) => p.map((v, i) => (i & 1 ? ty + v * s : tx + v * s)))
}

// ───────────────────────────── smooth 1-D noise ─────────────────────────────

function n1(x: number, seed: number) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return lerp(rand(i, seed) * 2 - 1, rand(i + 1, seed) * 2 - 1, u)
}

// ───────────────────────────── strokes ─────────────────────────────

export type PenStyle = {
  /** nominal width in px (before ctx transform) */
  width?: number
  color?: string
  alpha?: number
  /** centre-line wobble amplitude (px) and wavelength (px) */
  wobble?: number
  wave?: number
  /** pressure variation 0..1 */
  pressure?: number
  /** taper lengths at start/end (px) */
  taperIn?: number
  taperOut?: number
  /** re-seed wobble this many times per second (0 = still line). Needs `t`. */
  boil?: number
  t?: number
  seed?: number
  /** additional faint sketch passes (each offset & lighter) */
  passes?: number
  /** global composite op */
  op?: GlobalCompositeOperation
  /** draw a darker blob at the moving nib while progress<1 */
  nib?: boolean
}

const DEF = { width: 2.2, color: '#2a1d14', alpha: 1, wobble: 1.2, wave: 90, pressure: 0.35, taperIn: 14, taperOut: 22, boil: 0, t: 0, seed: 1, passes: 0, nib: true }

/**
 * Draw one polyline as a pen stroke, revealed up to `progress` (0..1) of its length.
 * Returns the head position (for sparks / nib effects).
 */
export function penStroke(ctx: Ctx, poly: Poly, progress = 1, style: PenStyle = {}): [number, number] | null {
  const s = { ...DEF, ...style }
  if (progress <= 0 || poly.length < 4) return null
  const p = resample(poly, 3)
  const n = p.length / 2
  const total = polyLength(p)
  const cut = total * clamp(progress)
  const boilSeed = s.boil > 0 ? Math.floor(s.t * s.boil) : 0
  const seed = s.seed * 17 + boilSeed * 101
  let head: [number, number] | null = null
  for (let pass = 0; pass <= s.passes; pass++) {
    const ps = seed + pass * 7919
    const left: number[] = []
    const right: number[] = []
    let acc = 0
    let hx = p[0], hy = p[1]
    for (let k = 0; k < n; k++) {
      const x = p[k * 2], y = p[k * 2 + 1]
      if (k > 0) acc += Math.hypot(x - p[k * 2 - 2], y - p[k * 2 - 1])
      if (acc > cut + 0.001) break
      const k0 = Math.max(0, k - 1), k1 = Math.min(n - 1, k + 1)
      let tx = p[k1 * 2] - p[k0 * 2], ty = p[k1 * 2 + 1] - p[k0 * 2 + 1]
      const tl = Math.hypot(tx, ty) || 1
      tx /= tl; ty /= tl
      const nx = -ty, ny = tx
      const wob = s.wobble * (n1(acc / s.wave, ps) + 0.35 * n1(acc / (s.wave * 0.27), ps + 3)) + (pass > 0 ? (rand(pass, ps) - 0.5) * s.width * 2.2 : 0)
      const cx = x + nx * wob, cy = y + ny * wob
      const tin = clamp(acc / Math.max(1, s.taperIn))
      const tout = clamp((total - acc) / Math.max(1, s.taperOut))
      const pr = 1 + s.pressure * n1(acc / 140, ps + 11)
      const w = (s.width * (pass > 0 ? 0.55 : 1) * pr * (0.25 + 0.75 * Math.sqrt(tin)) * (0.2 + 0.8 * Math.sqrt(tout))) / 2
      left.push(cx + nx * w, cy + ny * w)
      right.push(cx - nx * w, cy - ny * w)
      hx = cx; hy = cy
    }
    if (left.length < 4) continue
    ctx.save()
    if (s.op) ctx.globalCompositeOperation = s.op
    ctx.globalAlpha *= s.alpha * (pass > 0 ? 0.35 : 1)
    ctx.fillStyle = s.color
    ctx.beginPath()
    ctx.moveTo(left[0], left[1])
    for (let i = 2; i < left.length; i += 2) ctx.lineTo(left[i], left[i + 1])
    for (let i = right.length - 2; i >= 0; i -= 2) ctx.lineTo(right[i], right[i + 1])
    ctx.closePath()
    ctx.fill()
    // round caps
    const r0 = Math.hypot(left[0] - right[0], left[1] - right[1]) / 2
    if (r0 > 0.4) {
      ctx.beginPath()
      ctx.arc((left[0] + right[0]) / 2, (left[1] + right[1]) / 2, r0, 0, TAU)
      ctx.fill()
    }
    if (pass === 0 && s.nib && progress < 1) {
      ctx.beginPath()
      ctx.arc(hx, hy, s.width * 0.75, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    if (pass === 0) head = [hx, hy]
  }
  return head
}

/**
 * Draw many strokes as one drawing. `progress` 0..1 reveals them in order (by cumulative length), so a whole
 * figure is "drawn" over a time span. `overlap` lets the next stroke start before the previous finishes.
 */
export function penDraw(ctx: Ctx, polys: Poly[], progress = 1, style: PenStyle = {}, overlap = 0.15): [number, number] | null {
  if (progress <= 0) return null
  const lens = polys.map(polyLength)
  const total = lens.reduce((a, b) => a + b, 0) || 1
  let acc = 0
  let head: [number, number] | null = null
  const span = progress * total * (1 + overlap)
  for (let i = 0; i < polys.length; i++) {
    const start = acc * (1 - overlap * 0.5)
    const local = (span - start) / lens[i]
    acc += lens[i]
    if (local <= 0) continue
    const h = penStroke(ctx, polys[i], clamp(local), { ...style, seed: (style.seed ?? 1) * 31 + i })
    if (local < 1 && h) head = h
  }
  return head
}

/** Convenience: draw an SVG path string with the pen. */
export function penPath(ctx: Ctx, d: string, progress = 1, style: PenStyle = {}, overlap = 0.15) {
  return penDraw(ctx, pathPolys(d), progress, style, overlap)
}

/** A sketchy straight line with slight overshoot at both ends. */
export function sketchLine(x0: number, y0: number, x1: number, y1: number, seed = 1, over = 6): Poly {
  const dx = x1 - x0, dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L, uy = dy / L
  const a = over * (0.4 + rand(seed, 1)), b = over * (0.4 + rand(seed, 2))
  const bow = (rand(seed, 3) - 0.5) * Math.min(8, L * 0.012)
  const mx = (x0 + x1) / 2 - uy * bow, my = (y0 + y1) / 2 + ux * bow
  const out: Poly = []
  cubicPts(out, x0 - ux * a, y0 - uy * a, mx, my, mx, my, x1 + ux * b, y1 + uy * b, 6)
  return [x0 - ux * a, y0 - uy * a, ...out]
}

/** A hand-drawn ellipse that doesn't quite close (overlaps its start by `lap` of a turn). */
export function sketchEllipse(cx: number, cy: number, rx: number, ry: number, seed = 1, lap = 0.08, rot = 0): Poly {
  const out: Poly = []
  const a0 = rand(seed, 4) * TAU
  const N = Math.max(24, Math.ceil(((rx + ry) * Math.PI) / 5))
  const turns = 1 + lap
  for (let i = 0; i <= N * turns; i++) {
    const a = a0 + (i / N) * TAU
    const k = 1 + 0.025 * n1(i / 9, seed) + (i / N) * 0.02
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k
    out.push(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot))
  }
  return out
}

// ───────────────────────────── fills ─────────────────────────────

/**
 * Pencil/pen hatching inside a closed region (given as polys or an SVG path). Lines at `angle` (rad), spacing
 * `gap`; `progress` sweeps the hatching across the region. Optional cross-hatch.
 */
export function hatch(ctx: Ctx, region: Poly[] | string, o: { angle?: number; gap?: number; progress?: number; cross?: boolean } & PenStyle = {}) {
  const polys = typeof region === 'string' ? pathPolys(region) : region
  const ang = o.angle ?? -0.9
  const gap = o.gap ?? 7
  const pr = o.progress ?? 1
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9
  for (const p of polys) for (let i = 0; i < p.length; i += 2) {
    minx = Math.min(minx, p[i]); maxx = Math.max(maxx, p[i]); miny = Math.min(miny, p[i + 1]); maxy = Math.max(maxy, p[i + 1])
  }
  ctx.save()
  ctx.beginPath()
  for (const p of polys) {
    ctx.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
    ctx.closePath()
  }
  ctx.clip()
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2
  const R = Math.hypot(maxx - minx, maxy - miny) / 2 + 10
  const dirs = o.cross ? [ang, ang + 1.25] : [ang]
  const st: PenStyle = { width: 1.1, wobble: 0.8, wave: 50, taperIn: 6, taperOut: 8, nib: false, ...o }
  dirs.forEach((a, di) => {
    const ux = Math.cos(a), uy = Math.sin(a)
    const nx = -uy, ny = ux
    const n = Math.floor((2 * R) / gap)
    for (let i = 0; i <= n; i++) {
      const lp = clamp(pr * (n + 6) - i) // sweep
      if (lp <= 0) break
      const off = -R + i * gap + (rand(i, 9 + di) - 0.5) * gap * 0.5
      const x0 = cx + nx * off - ux * R, y0 = cy + ny * off - uy * R
      const x1 = cx + nx * off + ux * R, y1 = cy + ny * off + uy * R
      penStroke(ctx, [x0, y0, x1, y1], lp, { ...st, seed: (st.seed ?? 1) + i * 13 + di * 1000 })
    }
  })
  ctx.restore()
}

/** Watercolour wash: soft blurred fill, darker pooled edge, granulation. `progress` grows it from the centre. */
export function wash(ctx: Ctx, region: Poly[] | string, color: string, o: { alpha?: number; blur?: number; progress?: number; edge?: number } = {}) {
  const polys = typeof region === 'string' ? pathPolys(region) : region
  const a = (o.alpha ?? 0.55) * clamp(o.progress ?? 1)
  if (a <= 0) return
  const path = new Path2D()
  for (const p of polys) {
    path.moveTo(p[0], p[1])
    for (let i = 2; i < p.length; i += 2) path.lineTo(p[i], p[i + 1])
    path.closePath()
  }
  ctx.save()
  ctx.globalAlpha *= a
  ctx.filter = `blur(${o.blur ?? 2.5}px)`
  ctx.fillStyle = color
  ctx.fill(path)
  ctx.filter = `blur(${(o.blur ?? 2.5) * 0.6}px)`
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.globalAlpha *= o.edge ?? 0.6
  ctx.stroke(path)
  ctx.filter = 'none'
  // granulation: pigment specks settling inside the wash
  ctx.clip(path)
  ctx.globalAlpha = a * 0.5
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = ctx.createPattern(speckle(), 'repeat')!
  ctx.fill(path)
  ctx.restore()
}

function speckle() {
  return cached('pen:speckle', 200, 200, (g) => {
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(60,40,30,${0.2 + rand(i, 3) * 0.6})`
      g.beginPath()
      g.arc(rand(i, 1) * 200, rand(i, 2) * 200, 0.4 + rand(i, 4) * 1.6, 0, TAU)
      g.fill()
    }
  })
}
