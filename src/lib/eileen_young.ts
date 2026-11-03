/**
 * OWNER: agent H1 — the young 张爱玲 (1940s–1950s), five poses:
 *   iconic · youngStand · lookBack · walkUmbrella · writing
 *
 * Each pose is authored once in "pose units" with smooth key-point curves (centripetal Catmull–Rom), limbs
 * generated from a centre line + width profile, hidden lines removed by occluder regions, then normalised to a
 * box 1000 units tall (bottom-centre origin) and cached. Per frame the cached polylines are placed at
 * (o.x, o.y, o.h). Strokes are ordered like an artist draws (head → features → hair → collar → body →
 * arms/hands → hem → legs/shoes → props), so `progress` draws the figure; washes (`fill`) go under the lines,
 * hatching comes last. Level of detail follows the on-screen head size. `mono` renders a silver-gelatin
 * style grey print (the 1954 portrait) with a studio background.
 */
import { C } from '../config'
import type { EileenOpts, EileenPose } from './eileen'
import { clamp, rand, smoothstep } from './math'
import { hatch, penStroke, polyLength, wash, type Poly } from './pen'
import type { Ctx } from './texture'

// ───────────────────────────── types ─────────────────────────────

type Part = { p: Poly; w: number; uw: number; lo: number; hi: number; a: number; fine: boolean; len: number; clip: number; hl: boolean; light: boolean; soft: boolean }
type FillK = 'skin' | 'dress' | 'coat' | 'book' | 'wood' | 'umb' | 'paper' | 'shade' | 'shoe' | 'pattern' | 'hair' | 'lip' | 'iris' | 'shadow' | 'hairhl' | 'glow'
type Fill = { p: Poly[]; k: FillK; a: number; lo: number; clip: number; ex: Poly[] | null }
type Hat = { p: Poly[]; ang: number; gap: number; a: number; w: number; lo: number; clip: number }
type Pose = { parts: Part[]; fills: Fill[]; hats: Hat[]; head: number; wk: number; clip: Poly[] | null; occ: Poly[] | null; bg: boolean }
type M = [number, number, number, number, number, number]
type LOpt = { lo?: number; hi?: number; a?: number; fine?: boolean; step?: number; clip?: number; uw?: number; hl?: boolean; light?: boolean; soft?: boolean }
type Limb = { A: Poly; B: Poly; R: Poly }

// clip modes: 0 none · 1 inside dress region · 2 outside the occluder (umbrella canopy)
const FILL_ORDER: Record<FillK, number> = { skin: 0, dress: 1, coat: 1, book: 2, wood: 1, umb: 3, paper: 2, shade: 2, shoe: 2, pattern: 2, hair: 4, hairhl: 5, lip: 5, iris: 6, shadow: 7, glow: 8 }

// ───────────────────────────── geometry helpers ─────────────────────────────

/** Centripetal Catmull–Rom through flat key points. */
function crv(pts: number[], closed = false, step = 2.5): Poly {
  const n = pts.length / 2
  if (n < 2) return pts.slice()
  if (n === 2) return seg(pts, step)
  const P = (i: number): [number, number] => {
    if (closed) {
      const k = ((i % n) + n) % n
      return [pts[k * 2], pts[k * 2 + 1]]
    }
    if (i < 0) return [2 * pts[0] - pts[2], 2 * pts[1] - pts[3]]
    if (i > n - 1) return [2 * pts[(n - 1) * 2] - pts[(n - 2) * 2], 2 * pts[(n - 1) * 2 + 1] - pts[(n - 2) * 2 + 1]]
    return [pts[i * 2], pts[i * 2 + 1]]
  }
  const out: Poly = [pts[0], pts[1]]
  const segs = closed ? n : n - 1
  const dt = (a: [number, number], b: [number, number]) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])))
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2)
    const t0 = 0, t1 = dt(p0, p1), t2 = t1 + dt(p1, p2), t3 = t2 + dt(p2, p3)
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const k = Math.max(2, Math.ceil(L / step))
    for (let j = 1; j <= k; j++) {
      const t = t1 + ((t2 - t1) * j) / k
      for (let c = 0; c < 2; c++) {
        const A1 = ((t1 - t) / (t1 - t0)) * p0[c] + ((t - t0) / (t1 - t0)) * p1[c]
        const A2 = ((t2 - t) / (t2 - t1)) * p1[c] + ((t - t1) / (t2 - t1)) * p2[c]
        const A3 = ((t3 - t) / (t3 - t2)) * p2[c] + ((t - t2) / (t3 - t2)) * p3[c]
        const B1 = ((t2 - t) / (t2 - t0)) * A1 + ((t - t0) / (t2 - t0)) * A2
        const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3
        out.push(((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2)
      }
    }
  }
  return out
}

/** Straight polyline, resampled (hard corners kept). */
function seg(pts: number[], step = 2.5): Poly {
  const o: Poly = [pts[0], pts[1]]
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2], ay = pts[i - 1], bx = pts[i], by = pts[i + 1]
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step))
    for (let j = 1; j <= k; j++) o.push(ax + ((bx - ax) * j) / k, ay + ((by - ay) * j) / k)
  }
  return o
}

/** Offset a polyline sideways by d (+d = right of travel when travelling down the screen). */
function offsetPoly(p: Poly, d: number | ((u: number) => number)): Poly {
  const n = p.length / 2
  const o: Poly = []
  for (let k = 0; k < n; k++) {
    const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1)
    let tx = p[b * 2] - p[a * 2], ty = p[b * 2 + 1] - p[a * 2 + 1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l; ty /= l
    const dd = typeof d === 'number' ? d : d(k / Math.max(1, n - 1))
    o.push(p[k * 2] - ty * dd, p[k * 2 + 1] + tx * dd)
  }
  return o
}

/** reverse the order of flat (x, y) key points */
function revPts(p: number[]): number[] {
  const o: number[] = []
  for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1])
  return o
}

function area(p: Poly) {
  let a = 0
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length
    a += p[i] * p[j + 1] - p[j] * p[i + 1]
  }
  return a / 2
}
function reversePoly(p: Poly): Poly {
  const o: Poly = []
  for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1])
  return o
}
function inPoly(x: number, y: number, p: number[]) {
  let c = false
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    if (p[i + 1] > y !== p[j + 1] > y && x < ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c
  }
  return c
}
function convexHull(P: number[][]): number[] {
  const pts = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], c: number[]) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0])
  const lower: number[][] = [], upper: number[][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1)).flat()
}

const mul = (A: M, B: M): M => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
]
/** Map local point (cx, cy) to (tx, ty) with scale s, rotation r (rad, clockwise on screen), optional mirror. */
function place2(tx: number, ty: number, s: number, r: number, cx = 0, cy = 50, mirror = false): M {
  const co = Math.cos(r) * s, si = Math.sin(r) * s
  const mx = mirror ? -1 : 1
  const a = co * mx, b = si * mx, c = -si, d = co
  return [a, b, c, d, tx - (a * cx + c * cy), ty - (b * cx + d * cy)]
}

// ───────────────────────────── builder ─────────────────────────────

class Bld {
  parts: Part[] = []
  fills: Fill[] = []
  hats: Hat[] = []
  clip: Poly[] | null = null
  occ: Poly[] | null = null
  m: M = [1, 0, 0, 1, 0, 0]
  headUnits = 100
  ax: number | null = null
  bg = false
  tp(p: Poly): Poly {
    const [a, b, c, d, e, f] = this.m
    const o: Poly = []
    for (let i = 0; i < p.length; i += 2) o.push(a * p[i] + c * p[i + 1] + e, b * p[i] + d * p[i + 1] + f)
    return o
  }
  scale() {
    return Math.hypot(this.m[0], this.m[1])
  }
  st(o: LOpt = {}) {
    return o.step ?? 2.5 / Math.max(0.2, this.scale())
  }
  /** add an already-transformed polyline */
  add(q: Poly, w = 1, o: LOpt = {}) {
    this.parts.push({ p: q, w, uw: (o.uw ?? 0) * (o.uw ? 1 : 0), lo: o.lo ?? 0, hi: o.hi ?? 2, a: o.a ?? 1, fine: o.fine ?? w < 0.7, len: polyLength(q), clip: o.clip ?? 0, hl: o.hl ?? false, light: o.light ?? false, soft: o.soft ?? false })
  }
  raw(p: Poly, w = 1, o: LOpt = {}) {
    this.add(this.tp(p), w, { ...o, uw: o.uw ? o.uw * this.scale() : 0 })
  }
  /** smooth stroke through key points */
  L(pts: number[], w = 1, o: LOpt = {}) {
    this.raw(crv(pts, false, this.st(o)), w, o)
  }
  /** straight polyline (hard corners) */
  P(pts: number[], w = 1, o: LOpt = {}) {
    this.raw(seg(pts, this.st(o)), w, o)
  }
  /** stroke offset sideways from the curve (piping, double edges) */
  Lo(pts: number[], d: number, w = 0.5, o: LOpt = {}) {
    this.raw(offsetPoly(crv(pts, false, this.st(o)), d), w, { a: 0.75, ...o })
  }
  region(pts: number[], sharp = false): Poly {
    const st = 4 / Math.max(0.2, this.scale())
    return this.tp(sharp ? seg([...pts, pts[0], pts[1]], st) : crv(pts, true, st))
  }
  /** wash region from local key points */
  F(pts: number[], k: FillK, a = 1, o: { lo?: number; clip?: number; ex?: Poly[]; sharp?: boolean } = {}) {
    this.FR([this.region(pts, o.sharp)], k, a, o)
  }
  /** wash region from already-transformed polys */
  FR(polys: Poly[], k: FillK, a = 1, o: { lo?: number; clip?: number; ex?: Poly[] } = {}) {
    const ps = polys.map((q) => (area(q) < 0 ? reversePoly(q) : q))
    this.fills.push({ p: ps, k, a, lo: o.lo ?? 0, clip: o.clip ?? 0, ex: o.ex ?? null })
  }
  H(pts: number[], ang: number, gap: number, a = 0.5, w = 0.5, lo = 1, clip = 0) {
    this.hats.push({ p: [this.region(pts)], ang, gap: gap * this.scale(), a, w, lo, clip })
  }
  sub(m: M, fn: () => void) {
    const old = this.m
    this.m = mul(old, m)
    fn()
    this.m = old
  }
  /** hidden-line removal: split parts [from, to) where they pass inside `region` (pose coords) */
  cut(from: number, region: Poly, to = this.parts.length) {
    const out: Part[] = this.parts.slice(0, from)
    for (let i = from; i < this.parts.length; i++) {
      const p = this.parts[i]
      if (i >= to) {
        out.push(p)
        continue
      }
      let run: number[] = []
      const flush = () => {
        if (run.length >= 4) {
          const len = polyLength(run)
          if (len > 1.5) out.push({ ...p, p: run, len })
        }
        run = []
      }
      for (let k = 0; k < p.p.length; k += 2) {
        if (inPoly(p.p[k], p.p[k + 1], region)) flush()
        else run.push(p.p[k], p.p[k + 1])
      }
      flush()
    }
    this.parts = out
  }
  /** limb from a centre line + half-widths (ha: right of travel, hb: left of travel); draws both edges */
  limb(pts: number[], ha: number[], hb: number[], o: { w?: number; draw?: 'AB' | 'A' | 'B' | ''; lo?: number } = {}): Limb {
    const c = crv(pts, false, 2)
    const n = c.length / 2
    const cum: number[] = [0]
    for (let k = 1; k < n; k++) cum.push(cum[k - 1] + Math.hypot(c[k * 2] - c[k * 2 - 2], c[k * 2 + 1] - c[k * 2 - 1]))
    const keyS: number[] = []
    for (let i = 0; i < pts.length / 2; i++) {
      let best = 0, bd = 1e9
      for (let k = 0; k < n; k++) {
        const d = Math.hypot(c[k * 2] - pts[i * 2], c[k * 2 + 1] - pts[i * 2 + 1])
        if (d < bd) { bd = d; best = k }
      }
      keyS.push(cum[best])
    }
    const W = (arr: number[], s: number) => {
      if (s <= keyS[0]) return arr[0]
      for (let i = 0; i < keyS.length - 1; i++) {
        if (s <= keyS[i + 1]) {
          const f = smoothstep(0, 1, (s - keyS[i]) / Math.max(1e-6, keyS[i + 1] - keyS[i]))
          return arr[i] + (arr[i + 1] - arr[i]) * f
        }
      }
      return arr[arr.length - 1]
    }
    const A: Poly = [], B: Poly = []
    for (let k = 0; k < n; k++) {
      const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1)
      let tx = c[b * 2] - c[a * 2], ty = c[b * 2 + 1] - c[a * 2 + 1]
      const l = Math.hypot(tx, ty) || 1
      tx /= l; ty /= l
      const wa = W(ha, cum[k]), wb = W(hb, cum[k])
      A.push(c[k * 2] - ty * wa, c[k * 2 + 1] + tx * wa)
      B.push(c[k * 2] + ty * wb, c[k * 2 + 1] - tx * wb)
    }
    const At = this.tp(A), Bt = this.tp(B)
    const d = o.draw ?? 'AB'
    if (d.includes('A')) this.add(At, o.w ?? 1, { lo: o.lo })
    if (d.includes('B')) this.add(Bt, o.w ?? 1, { lo: o.lo })
    return { A: At, B: Bt, R: [...At, ...reversePoly(Bt)] }
  }
  /**
   * A slender hand, back view, fingers together and gently tapered. Local: wrist centre (0,0), fingers toward
   * +y, length 100, thumb on +x. Returns the hand region (pose coords).
   */
  hand(x: number, y: number, s: number, r: number, o: { thumb?: boolean; mirror?: boolean; w?: number } = {}) {
    let reg: Poly = []
    this.sub(place2(x, y, s, r, 0, 0, o.mirror), () => {
      const w = o.w ?? 0.95
      const outline = [-11, 0, -13.4, 16, -15.6, 34, -16.4, 48, -15.4, 60, -13.8, 70, -12.6, 76.6, -11.2, 78.8, -9.6, 78, -8.4, 75.4, -7.4, 80, -6.4, 88, -4.6, 91.8, -2.6, 91, -1.4, 88, -0.6, 93, 0.6, 98.6, 2.6, 100.4, 4.6, 99, 5.6, 93, 6.4, 88.6, 8, 91.6, 9.8, 92.4, 11.6, 90, 13, 82, 14.4, 70, 15.4, 58, 15.6, 46]
      this.L(outline, w)
      if (o.thumb !== false) {
        this.L([11, 2, 17, 17, 21, 31, 21.6, 43, 19.4, 53, 16.8, 55, 15.4, 50, 15.6, 44], w)
        this.L([14.4, 22, 15.4, 34], 0.45, { lo: 2, a: 0.6 })
      } else {
        this.L([15.6, 46, 15, 30, 12.4, 12, 11, 0], w)
      }
      this.L([-8.4, 75.4, -8.8, 62], 0.42, { lo: 1, a: 0.85 })
      this.L([-1.4, 88, -1.6, 64], 0.42, { lo: 1, a: 0.85 })
      this.L([6.4, 88.6, 6.6, 64], 0.42, { lo: 1, a: 0.85 })
      this.L([-12, 52, -4, 49.4, 5, 48.6, 12.4, 50.4], 0.38, { lo: 2, a: 0.45 })
      const regPts = o.thumb !== false ? [...outline, 17, 55, 21.6, 43, 21, 31, 17, 17, 11, 2] : [...outline, 15, 30, 12.4, 12, 11, 0]
      reg = this.tp(crv(regPts, true, 3 / Math.max(0.2, this.scale())))
      this.FR([reg], 'skin', 1)
    })
    return reg
  }
  /** 盘扣 frog button: a short knot bar with a small loop */
  knot(x: number, y: number, L: number, lo = 1, ang = 0) {
    const c = Math.cos(ang), s = Math.sin(ang)
    const P = (u: number, v: number) => [x + u * c - v * s, y + u * s + v * c]
    this.L([...P(-L, 0.4), ...P(-L * 0.2, -0.3), ...P(L * 0.55, 0)], 0.8, { lo, fine: false })
    this.L([...P(L * 0.45, -L * 0.28), ...P(L * 0.85, -L * 0.3), ...P(L * 1.05, 0), ...P(L * 0.85, L * 0.3), ...P(L * 0.45, L * 0.26)], 0.6, { lo: lo + 1, a: 0.85 })
  }
  /** front-view pump; ankle centre (x,y), t = +1 toe to the right, -1 to the left */
  shoeFront(x: number, y: number, s: number, t: 1 | -1) {
    let reg: Poly = []
    this.sub(place2(x, y, s, 0, 0, 0, t < 0), () => {
      this.L([-8, -6, -8.6, 4, -9.4, 12], 0.8)
      this.L([8, -6, 8.4, 4, 9, 11], 0.8)
      this.L([-9.4, 12, -3, 16.6, 4, 16, 9, 11], 0.7)
      const out = [-9.4, 12, -11, 22, -9, 32, -3, 39, 5, 42.6, 12, 42.4, 14.6, 38, 13, 28, 11, 18, 9, 11]
      this.L(out, 0.95)
      this.L([-4, 40.4, 4, 44.4, 12, 44], 0.5, { lo: 1, a: 0.7 })
      this.L([-10.6, 26, -12, 44], 1.6, { fine: false })
      reg = this.region([...out, -3, 16.6])
      this.FR([reg], 'shoe', 1)
    })
    return reg
  }
  /** heel seen from behind; ankle centre (x,y); lift raises the heel (stem shorter, angled) */
  shoeBack(x: number, y: number, s: number, lift = 0) {
    this.sub(place2(x, y, s, 0, 0, 0), () => {
      const out = [-8.6, 0, -9.6, 10, -8.4, 19, -3, 23, 3, 23, 8.4, 19, 9.6, 10, 8.6, 0]
      this.L(out, 0.95)
      this.L([0, 23, 0.6 + lift * 3, 40 - lift * 12], 1.7, { fine: false })
      this.L([-9.6, 12, -12, 22 - lift * 4, -10, 28 - lift * 6], 0.55, { lo: 1, a: 0.7 })
      this.L([9.6, 12, 12, 22 - lift * 4, 10, 28 - lift * 6], 0.55, { lo: 1, a: 0.7 })
      this.F(out, 'shoe', 1)
    })
  }
}

// ───────────────────────────── heads (local: crown y=0, chin y=100) ─────────────────────────────

/** Three-quarter head turned toward viewer-left, chin up, lids lowered — the aloof downward glance. */
function head3q(b: Bld, neckY: number) {
  // skin (face + neck) and ear
  b.F([-29.6, 34, -31.5, 42, -32, 46, -30.4, 52, -32.6, 60, -31.4, 68, -28, 78, -22, 88, -14, 96, -8.6, 99.6, -10.4, 111, -11, neckY, 25, neckY, 25.6, 98, 27.6, 83, 30.5, 72, 33.4, 62, 33.6, 41, 24, 28, 12, 22.4, -2, 20.4, -15, 21.6, -25, 26.4], 'skin', 1)
  b.F([33.4, 54, 37.6, 54, 39.6, 59, 38.6, 66, 36, 71.4, 32.6, 73.6], 'skin', 1)
  // face: far temple → brow → high cheekbone → long oval chin → near jaw, one confident stroke (soft in mono)
  const S = { soft: true }
  b.L([-29.6, 33, -31.6, 41, -32, 46, -30.5, 52, -32.8, 60, -31.6, 68, -28.4, 78, -22.4, 88.6, -14.6, 97, -7, 101.4, 0, 102, 9.6, 99.4, 19.6, 92.2, 26.6, 82, 30.4, 71], 1.05, S)
  b.L([33.4, 41, 34.6, 50], 0.7, { lo: 1, a: 0.8, ...S })
  // ear
  b.L([33.4, 54, 37.6, 54, 39.6, 59, 38.6, 66, 36, 71.4, 32.6, 73.6], 0.8, { lo: 1, ...S })
  b.L([35.6, 57.6, 37, 62, 35.6, 66.6], 0.45, { lo: 2, a: 0.7, ...S })
  // brows: thin, long, arched — slightly raised (the aloof look)
  b.L([-29.8, 44.4, -26.6, 41.6, -21.6, 41.2, -18.4, 42.4], 0.75, { lo: 1 })
  b.L([-7.8, 43, -1, 39.6, 7, 38.2, 13.6, 39.4, 18, 42], 0.85, { lo: 1 })
  b.L([-7.4, 43.5, -0.4, 40.8, 6, 39.6], 0.5, { lo: 2, a: 0.7 })
  // eyes: heavy, half-lowered upper lids; irises low and partly hidden — looking down at the viewer
  b.F([1.6, 51.6, 1.4, 54, 2.3, 56, 4.3, 56.6, 6.3, 56, 7.1, 54, 6.9, 51.6, 4.3, 51.2], 'iris', 1, { lo: 1 })
  b.F([-25.2, 52.2, -25.3, 54.2, -24.4, 55.7, -23, 56, -21.7, 55.1, -21.4, 53.2, -22, 51.8, -23.6, 51.6], 'iris', 0.9, { lo: 1 })
  b.L([1.6, 52, 2, 55, 4.3, 56.4, 6.5, 55.2, 7, 52], 0.45, { lo: 2, a: 0.6, ...S })
  b.L([4.1, 54, 4.5, 54.2], 1.6, { lo: 2, uw: 2.0 })
  b.L([-23.4, 54, -23.1, 54.2], 1.4, { lo: 2, uw: 1.5 })
  // the lid hood: shadow between crease and lash line
  b.F([-6.4, 54, -3, 52.6, 3, 51.6, 9, 51.7, 13.4, 52.7, 15.6, 53.6, 13, 49.2, 6, 47.4, -1, 48, -5, 50], 'shadow', 1.2, { lo: 2 })
  b.F([-28.6, 54, -26.4, 52.6, -22.4, 52, -18.2, 53.4, -22.6, 48.8, -27, 49.4], 'shadow', 1.0, { lo: 2 })
  b.L([-28.8, 54.2, -26.4, 52.6, -22.6, 52, -19.6, 52.8, -18, 53.8], 1.2, { lo: 1, fine: false })
  b.L([-28.6, 54, -30.8, 52.8], 0.6, { lo: 2 })
  b.L([-6.6, 53.8, -3, 52.6, 3, 51.7, 9, 51.8, 13.4, 52.8, 15.6, 53.6], 1.45, { lo: 1, fine: false })
  b.L([-4, 53.2, 3, 52.3, 9, 52.5, 13, 53.3], 0.75, { lo: 2, a: 0.85 })
  b.L([15, 53.3, 18, 52], 0.75, { lo: 2 })
  b.L([-27.4, 55.4, -24, 56.6, -20.2, 55.6], 0.4, { lo: 2, a: 0.55, ...S })
  b.L([-4.6, 55.2, 1, 56.8, 7, 57, 12, 55.8, 14.6, 54], 0.42, { lo: 2, a: 0.6, ...S })
  b.L([-3.6, 48, 3, 46.4, 10, 47, 13.6, 49], 0.42, { lo: 2, a: 0.55, ...S })
  b.L([-26.8, 48.8, -23, 47.6, -19.8, 48.4], 0.38, { lo: 2, a: 0.5, ...S })
  b.L([3.2, 53.4, 3.5, 53.6], 1.3, { lo: 2, light: true, uw: 0.75 })
  b.L([-24, 53.5, -23.8, 53.6], 1.0, { lo: 2, light: true, uw: 0.55 })
  // nose: refined and straight — bridge on the far side, tip and nostril
  b.L([-12.2, 49, -13.8, 57, -16.4, 64.2, -18.4, 67.8], 0.5, { lo: 2, a: 0.55, ...S })
  b.L([-18.8, 67.6, -18.4, 70.2, -15.6, 71.6, -13.2, 71.2], 0.85, { lo: 1, ...S })
  b.L([-10.6, 67.8, -9, 70.2, -10.8, 72], 0.55, { lo: 2, a: 0.85, ...S })
  b.L([-14.6, 70.6, -12.8, 70.8], 0.9, { lo: 2, a: 0.8 })
  // mouth: closed, small, a faint asymmetric half-smile (the near corner lifts)
  b.L([-16.2, 83, -12.6, 82.4, -9.4, 83, -5.6, 82.4, -1.4, 82, 1.2, 80.6], 0.8, { lo: 1, ...S })
  b.L([0.4, 80.8, 1.8, 82.2], 0.4, { lo: 2, a: 0.5, ...S })
  b.L([-15.6, 82.6, -12.6, 80.6, -10.2, 80.2, -9.2, 80.8, -8, 80, -4.6, 80.6, -1.2, 81.6], 0.4, { lo: 2, a: 0.5, ...S })
  b.L([-13.4, 85.6, -9.4, 87, -5, 86.2], 0.45, { lo: 2, a: 0.55, ...S })
  b.F([-16.2, 82.8, -12.6, 80.6, -10, 80.2, -9.2, 80.8, -8, 80, -4.6, 80.6, 1, 80.8, -4.6, 85.8, -9.4, 87, -13.6, 85.6], 'lip', 1, { lo: 1 })
  // photographic modelling — key light from the upper left: lit far cheek/forehead/bridge, shade on the near side
  b.F([-24, 30, -6, 25, 6, 30, -2, 40, -14, 46, -26, 42], 'glow', 1, { lo: 1 })
  b.F([-29, 57, -21, 59, -19, 68, -24, 76, -29, 72], 'glow', 0.8, { lo: 1 })
  b.F([-15, 50, -12.6, 50, -15.6, 65, -17.8, 65], 'glow', 0.7, { lo: 2 })
  b.F([-8, 89, -2, 90, -6, 95, -11, 94], 'glow', 0.5, { lo: 2 })
  b.F([16, 62, 27, 58, 31.5, 68, 27, 82, 18, 89, 13, 78], 'shadow', 0.6, { lo: 1 })
  b.F([28, 42, 33.6, 44, 33.4, 62, 30.5, 72, 27, 62], 'shadow', 0.55, { lo: 1 })
  b.F([-11, 50, -7.6, 58, -7.8, 67, -11.6, 69, -13.6, 60], 'shadow', 0.55, { lo: 2 })
  b.F([-17, 72, -11, 72.6, -13, 74.6], 'shadow', 0.45, { lo: 2 })
  b.F([-12.4, 88, -5.6, 88, -9, 90.6], 'shadow', 0.45, { lo: 2 })
  b.F([0, 81, 3, 82.6, 1.6, 84.6], 'shadow', 0.3, { lo: 2 })
  // raised chin: the underside of the jaw is a mid-tone plane, the neck below falls into shade
  b.F([-8.6, 101, 0, 102, 10, 99.4, 20, 92.2, 26.6, 82, 25.6, 96, 18, 103, 6, 106, -8, 106], 'shadow', 0.55)
  b.F([-9, 106, 6, 106, 18, 103, 25.6, 96, 25.2, neckY, -11, neckY], 'shadow', 0.75)
  b.F([-28, 78, -22.4, 88.6, -24, 80], 'shadow', 0.3, { lo: 2 })
  // neck
  b.L([-8.6, 100.6, -10.4, 111, -11, neckY], 0.95, S)
  b.L([27.6, 83, 25.6, 98, 25, neckY], 0.95, S)
  b.L([14, 105, 6, neckY - 3], 0.38, { lo: 2, a: 0.4, ...S })
  hair3q(b)
}

/** small spiral curl (a pin curl end), centre (x,y), radius r, turning direction d */
function curl(b: Bld, x: number, y: number, r: number, d: 1 | -1, o: LOpt = {}) {
  const pts: number[] = []
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI * 1.7 * d - Math.PI * 0.5
    const rr = r * (1 - k * 0.055)
    pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  b.L(pts, 0.5, { lo: 1, a: 0.85, ...o })
}

/** 1940s short perm, side part, swept up from the forehead in a soft roll; waves; curled ends at the jaw. */
function hair3q(b: Bld) {
  // silhouette: far-side waves → front roll over the crown → back curls behind the ear
  const far = [-29, 80, -32.6, 84.6, -38, 84, -41.6, 79.6, -44, 73.6, -42.4, 67.6, -43.8, 60.6, -41.4, 54, -42.4, 47, -39.6, 40.4]
  const top = [-39.6, 40.4, -42, 30, -42.4, 18, -38, 6.6, -29, -2.6, -17, -8.6, -5, -9.4, 4, -6.4, 10, -7.4, 21, -7.6, 32, -3, 42, 4.4, 49.6, 12.6, 55, 22]
  const back = [55, 22, 59.6, 31, 61, 40, 63.2, 47, 61.6, 54, 63.6, 61, 62, 69, 58.6, 75, 59.8, 82, 56, 88.6, 49.6, 92, 44, 90.2, 40, 94.6, 34, 94, 30.6, 89]
  b.L([...far, ...top.slice(2)], 1.1)
  b.L(back, 1.1)
  // hairline (forehead swept clear) and the edge behind the ear
  b.L([-29.6, 35, -26, 28, -16, 22.5, -3, 21, 10, 22.6, 22, 27, 30, 34, 33.6, 41], 0.75)
  b.L([33.6, 41, 37, 43, 40, 48, 41.6, 55, 41.4, 63, 40.4, 72, 36, 80, 30.6, 89], 0.8)
  // strands swept back from the hairline toward the crown, then the roll's crest
  b.L([-27, 29, -32, 19, -31, 9, -24, 1], 0.5, { lo: 1, a: 0.8, hl: true })
  b.L([-17, 23.4, -20, 13, -15, 3, -5, -3.6], 0.48, { lo: 1, a: 0.8 })
  b.L([-5, 21.4, -6, 11, 1, 1, 12, -3.4], 0.48, { lo: 2, a: 0.75, hl: true })
  b.L([7, 22.4, 8, 13, 16, 5, 28, 1], 0.48, { lo: 1, a: 0.8 })
  b.L([18, 25.6, 22, 17, 32, 11, 43, 11], 0.46, { lo: 2, a: 0.75, hl: true })
  b.L([27, 31, 34, 25, 44, 23, 52, 29], 0.46, { lo: 1, a: 0.8 })
  b.L([32, 38, 40, 34, 48, 38, 54, 48], 0.44, { lo: 2, a: 0.75 })
  b.L([-36, 18, -26, 4, -12, -3, 4, -3, 22, -1, 38, 6], 0.5, { lo: 1, a: 0.7, hl: true })
  b.L([44, 34, 50, 46, 52, 58, 50, 70, 52, 80], 0.45, { lo: 2, a: 0.75 })
  b.L([46, 26, 55, 38, 57, 52, 56, 64], 0.42, { lo: 2, a: 0.7, hl: true })
  b.L([-37, 44, -39, 54, -38, 64, -40, 74], 0.42, { lo: 2, a: 0.7 })
  b.L([-35, 50, -35.6, 60, -34, 70], 0.4, { lo: 2, a: 0.6, hl: true })
  b.L([8, -6, 11, 3, 12, 9], 0.45, { lo: 2, a: 0.6 })
  b.L([60, 44, 58, 47.6, 60, 51], 0.42, { lo: 2, a: 0.7, hl: true })
  b.L([60.6, 60, 58.4, 64, 60.4, 68], 0.42, { lo: 2, a: 0.7 })
  // curled ends
  curl(b, 50, 87, 4.2, 1)
  curl(b, 38.6, 90, 3.6, -1)
  curl(b, -37.4, 80.4, 3.6, -1)
  curl(b, 58, 70.6, 3.4, 1, { lo: 2 })
  curl(b, -40.6, 64, 3.2, -1, { lo: 2 })
  // washes: mass, darker underside, sheen along the crest of the roll
  const reg = [...far, ...top.slice(2), ...back.slice(2), 36, 80, 40.4, 72, 41.4, 63, 41.6, 55, 40, 48, 37, 43, 33.6, 41, 30, 34, 22, 27, 10, 22.6, -3, 21, -16, 22.5, -26, 28, -29.6, 35, -31.5, 42, -32, 46, -30.4, 52, -32.6, 60, -31.4, 68, -29, 77]
  b.F(reg, 'hair', 1)
  b.F([42, 58, 50, 50, 58, 54, 61, 66, 57, 82, 50, 92, 38, 93, 36, 80, 40.4, 72, 41.4, 63], 'shadow', 0.8)
  b.F([-42, 56, -37, 50, -33, 62, -31, 76, -36, 83, -43, 74], 'shadow', 0.6)
  b.F([-34, 14, -24, 2, -10, -3, 2, 0, -8, 3, -22, 7], 'hairhl', 1, { lo: 1 })
  b.F([8, 2, 22, 1, 36, 8, 22, 6], 'hairhl', 0.8, { lo: 1 })
  b.F([46, 28, 54, 40, 56, 52, 52, 46, 47, 36], 'hairhl', 0.8, { lo: 1 })
  b.F([-38, 46, -36, 56, -38, 66, -40, 58], 'hairhl', 0.6, { lo: 1 })
  b.H([42, 60, 50, 52, 58, 56, 59, 70, 54, 84, 46, 90, 38, 88, 40, 74], -1.0, 2.0, 0.45, 0.42, 1)
}

/** Profile head facing right. gaze: 'down' (writing), 'back' (glance back toward the viewer). */
function headProfile(b: Bld, neckY: number, gaze: 'down' | 'back' | 'level' = 'level') {
  b.F([27, 23, 31.5, 32.5, 34.6, 41.5, 35.2, 47.4, 34, 51.4, 37, 56.8, 41, 61.8, 45.4, 67.4, 45, 70.4, 41.2, 72.2, 39.4, 74.4, 39.6, 77.4, 41.2, 79.9, 38.8, 82.3, 40.2, 84.8, 38.4, 88, 35.4, 90.4, 36.8, 95, 33.8, 99.6, 25.6, 102.6, 17, 105.2, 15.4, 118, 16, neckY, -23, neckY, -20, 104, -16, 86, -7, 73, -4, 64, -2.4, 55, 1.6, 49.4, 7.6, 44.4, 14.6, 38.4, 21.6, 31], 'skin', 1)
  b.L([27, 23, 31.5, 32.5, 34.6, 41.5, 35.2, 47.4, 34, 51.4, 37, 56.8, 41, 61.8, 45.4, 67.4, 45, 70.4, 41.2, 72.2, 39.4, 74.4, 39.6, 77.4, 41.2, 79.9, 38.8, 82.3, 40.2, 84.8, 38.4, 88, 35.4, 90.4, 36.8, 95, 33.8, 99.6, 25.6, 102.6, 17, 105.2, 15.4, 118, 16, neckY], 1.05)
  b.L([4, 80, 11, 91, 19, 98.6], 0.45, { lo: 2, a: 0.5 })
  b.L([0.4, 54.4, 5, 53.4, 8.6, 58, 8, 65, 5, 71, 1.6, 74.2], 0.8, { lo: 1 })
  b.L([3, 57.4, 5.6, 61.4, 4, 67], 0.45, { lo: 2, a: 0.7 })
  b.L([20.6, 45.2, 27, 41.6, 33.6, 43.6], 0.8, { lo: 1 })
  if (gaze === 'down') {
    b.F([28.4, 54, 29, 56.8, 31.6, 57.6, 33, 55.6], 'iris', 1, { lo: 1 })
    b.L([24.6, 53.6, 29, 52.6, 33.4, 55.2], 1.1, { lo: 1, fine: false })
    b.L([32.8, 55, 35.6, 55.8], 0.55, { lo: 2 })
    b.L([27, 57.6, 31, 58.2, 33.2, 56.2], 0.4, { lo: 2, a: 0.6 })
    b.L([25.6, 50.4, 30, 49.4, 32.8, 51.2], 0.4, { lo: 2, a: 0.55 })
  } else {
    if (gaze === 'back') b.F([26.2, 52.4, 26, 55.4, 28.4, 56.4, 29.4, 53.6, 28.4, 52], 'iris', 1, { lo: 1 })
    else b.F([29.4, 52.2, 29.2, 55.4, 31.6, 56.4, 32.6, 53.6, 31.6, 51.8], 'iris', 1, { lo: 1 })
    b.L([25.2, 52.8, 29, 51, 33.2, 53.2], 1.1, { lo: 1, fine: false })
    b.L([32.6, 52.6, 35.4, 51.4], 0.55, { lo: 2 })
    b.L([27.4, 57, 31.5, 56.8, 33.2, 54.6], 0.42, { lo: 2, a: 0.7 })
    b.L([26, 49.6, 30, 48.6, 32.6, 50], 0.4, { lo: 2, a: 0.55 })
  }
  b.L([38.4, 69.2, 40.6, 70.8], 0.55, { lo: 2 })
  b.L([38.6, 82.4, 35.4, 83.4], 0.6, { lo: 1 })
  b.F([39.4, 77.4, 41.2, 79.9, 38.8, 82.3, 40.2, 84.8, 38.2, 87, 35.6, 83.6], 'lip', 1, { lo: 1 })
  b.F([-2, 76, 10, 90, 24, 102, 17, 105, 15.4, 118, 2, 112, -14, 98], 'shadow', 0.7)
  b.L([-16, 86, -20, 104, -23, neckY], 0.95)
  // hair: swept up from the forehead in a soft roll, waves to the back, curled ends at the nape
  const out = [27, 23, 31, 14, 29, 5, 22, -1.6, 10, -5.6, -4, -7, -18, -5.4, -29, -1, -38, 5, -44, 13, -48.4, 23, -50.4, 33, -49.6, 41, -51.8, 49, -50.4, 57, -51.4, 65, -48, 72, -47, 79.6, -42.6, 86.6, -36, 88.4, -32.4, 92.6, -26, 93, -21, 89, -18, 85]
  b.L(out, 1.1)
  const edge = [-18, 85, -12, 80, -7, 73, -4, 64, -2.4, 55, 1.6, 49.4, 7.6, 44.4, 14.6, 38.4, 21.6, 31, 27, 23]
  b.L(edge, 0.8)
  b.L([24, 18, 16, 9, 2, 5, -14, 7, -28, 14, -38, 26, -44, 40], 0.6, { lo: 1, a: 0.85 })
  b.L([20, 30, 8, 22, -8, 20, -22, 26, -32, 38, -38, 52, -40, 66], 0.5, { lo: 1, a: 0.75, hl: true })
  b.L([16, 4, 2, -2.6, -16, -2, -32, 6], 0.45, { lo: 2, a: 0.7, hl: true })
  b.L([6, 40, -6, 34, -18, 40, -26, 54, -30, 68, -34, 80], 0.45, { lo: 2, a: 0.75 })
  b.L([-44, 30, -46, 44, -45, 58, -46, 70], 0.42, { lo: 2, a: 0.7 })
  b.L([-49.6, 46, -47.4, 50, -49.6, 54], 0.42, { lo: 2, a: 0.7, hl: true })
  b.L([-49.2, 62, -47, 66, -49, 70], 0.42, { lo: 2, a: 0.7 })
  curl(b, -40, 83.6, 3.6, 1)
  curl(b, -27.4, 88, 3.4, -1)
  curl(b, -46.4, 66, 3, 1, { lo: 2 })
  b.F([...out, ...edge.slice(2)], 'hair', 1)
  b.F([-46, 50, -38, 60, -30, 76, -25, 92, -38, 95, -45, 86, -49, 66], 'shadow', 0.7)
  b.F([20, 8, 6, 0, -12, 1, -26, 10, -12, 7, 4, 6], 'hairhl', 1, { lo: 1 })
  b.F([-40, 32, -42, 46, -40, 58, -38, 46], 'hairhl', 0.6, { lo: 1 })
  b.H([-46, 50, -38, 60, -30, 76, -25, 92, -38, 95, -45, 86, -49, 66], -1.0, 2.2, 0.45, 0.42, 1)
}

/** Back of the head, slight turn to viewer-left (a sliver of cheek), curls at the nape. */
function headBack(b: Bld, neckY: number) {
  b.F([-38, 56, -41, 66, -38.6, 78, -32, 87, -22, 90, -20.4, neckY, 17.4, neckY, 17, 88, -10, 92], 'skin', 1)
  b.L([-38.4, 56, -41, 66, -38.6, 78, -32, 87], 0.8, { lo: 1, a: 0.85 })
  b.L([-38, 60, -41.4, 64.6, -40, 71], 0.6, { lo: 1, a: 0.8 })
  b.L([-22, 88, -20, 104, -20.4, neckY], 0.95)
  b.L([17, 88, 16, 104, 17.4, neckY], 0.95)
  const out = [-38.4, 62, -42, 48, -43, 38, -40, 26, -34, 14, -24, 4, -10, -2, 6, -4, 20, 0, 32, 8, 40, 18, 44.6, 30, 46.4, 40, 45, 48, 47, 56, 45, 64, 46, 72, 42, 79, 43, 86, 37, 92, 30, 91, 25, 95, 17, 95, 12, 91, 5, 95, -3, 95, -8, 91, -15, 94, -23, 93, -27, 88, -33, 87, -37, 80, -38, 70, -38.4, 62]
  b.L(out, 1.1)
  b.L([-30, 12, -16, 20, 0, 22, 16, 30, 30, 46, 34, 64], 0.5, { lo: 1, a: 0.8, hl: true })
  b.L([-36, 34, -22, 40, -6, 44, 10, 52, 20, 68, 22, 82], 0.45, { lo: 1, a: 0.75 })
  b.L([-36, 56, -24, 60, -12, 66, -6, 80], 0.42, { lo: 2, a: 0.65, hl: true })
  b.L([-10, 2, 8, 6, 26, 16, 38, 34], 0.42, { lo: 2, a: 0.65 })
  b.L([40, 40, 42, 54, 40, 68], 0.42, { lo: 2, a: 0.65 })
  curl(b, 35, 86, 3.6, 1)
  curl(b, 19, 89, 3.6, -1)
  curl(b, 2, 89.6, 3.6, 1)
  curl(b, -14, 88.6, 3.4, -1)
  curl(b, -30, 82, 3.4, 1, { lo: 2 })
  b.F(out, 'hair', 1)
  b.F([-36, 60, -10, 70, 20, 72, 40, 66, 42, 84, 20, 95, -10, 96, -34, 88], 'shadow', 0.6)
  b.F([-24, 14, -6, 18, 14, 26, 26, 38, 10, 30, -10, 24], 'hairhl', 1, { lo: 1 })
  b.H([-36, 60, -10, 70, 20, 72, 40, 66, 42, 84, 20, 95, -10, 96, -34, 88], -0.9, 2.2, 0.5, 0.42, 1)
}

// ───────────────────────────── pattern ─────────────────────────────

/** A printed blossom: rounded petals around an open centre, optional leaves; clipped to the dress. */
function motif(b: Bld, x: number, y: number, R: number, seed: number, lines = true, leaves = false) {
  const rot = rand(seed, 3) * 6.28
  const n = 5
  const polys: Poly[] = []
  const shape = (a: number, local: number[]) => {
    const c = Math.cos(a), s = Math.sin(a)
    const pts: number[] = []
    for (let i = 0; i < local.length; i += 2) pts.push(x + local[i] * c - local[i + 1] * s, y + local[i] * s + local[i + 1] * c)
    return pts
  }
  const outl: number[][] = []
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2 + (rand(seed * 9 + k, 5) - 0.5) * 0.3
    const L = R * (0.85 + 0.25 * rand(seed * 7 + k, 6)), w = R * 0.34
    const pts = shape(a, [0.16 * L, 0, 0.4 * L, 0.85 * w, 0.78 * L, 0.85 * w, L, 0.12 * w, 0.95 * L, -0.3 * w, 0.78 * L, -0.85 * w, 0.4 * L, -0.85 * w])
    polys.push(b.region(pts))
    outl.push(pts)
  }
  if (leaves) {
    for (const [da, sc] of [[0.55, 1.5], [Math.PI + 0.25, 1.25]]) {
      const L = R * sc, w = R * 0.26
      const pts = shape(rot + da, [0.5 * R, 0, 0.5 * R + 0.35 * L, w, 0.5 * R + 0.75 * L, 0.6 * w, 0.5 * R + L, 0, 0.5 * R + 0.7 * L, -0.55 * w, 0.5 * R + 0.3 * L, -0.8 * w])
      polys.push(b.region(pts))
      outl.push(pts)
    }
  }
  b.FR(polys, 'pattern', 1, { lo: 1, clip: 1 })
  if (lines) for (const p of outl) b.L([...p, p[0], p[1], p[2], p[3]], 0.36, { lo: 2, a: 0.32, clip: 1 })
}

// ───────────────────────────── poses ─────────────────────────────

function poseIconic(b: Bld) {
  b.bg = true
  b.sub(place2(-14, 172, 2.8, 0.1), () => head3q(b, 114))
  b.headUnits = 280
  // tall stand collar (立领) with piping and a frog button
  const cL = [-57, 334, -40, 339.5, -24, 344.6, -13.4, 350, -8, 360, -7, 410]
  const cR = [54, 330, 36, 336, 18, 342, 4, 348.6, -2.4, 359, -3.6, 410]
  b.L([-70, 410, -71.4, 372, ...cL], 1)
  b.L([58, 404, 58.6, 368, ...cR], 1)
  b.Lo(cL, -5.5, 0.45, { lo: 1 })
  b.Lo(cR, 5.5, 0.45, { lo: 1 })
  b.knot(-5, 384, 16, 1)
  b.L([-73, 410, -40, 414, -6, 417, 26, 414, 61, 406], 0.9)
  // shoulders — sloping, elegant
  b.L([-73, 410, -120, 417, -166, 430, -208, 450], 1)
  b.L([61, 406, 115, 414, 170, 428, 226, 448], 1)
  // 斜襟: from the collar across the chest to her right armpit, piping + 盘扣 (body turned a little to her right)
  const jin = [-6, 417, -38, 424, -78, 437, -110, 458, -130, 492, -138, 538]
  b.L(jin, 0.95)
  b.Lo(jin, 6, 0.45, { lo: 1 })
  b.knot(-70, 434, 14, 1, 0.3)
  b.knot(-124, 474, 14, 1, 0.85)
  // cap sleeves
  b.L([-208, 450, -226, 476, -236, 510, -240, 544], 1)
  b.L([-240, 544, -196, 554, -144, 546], 0.85)
  b.Lo([-240, 544, -196, 554, -144, 546], -5.5, 0.45, { lo: 1 })
  b.L([226, 448, 248, 474, 262, 510, 270, 542], 1)
  b.L([270, 542, 240, 566, 212, 588], 0.85)
  b.Lo([270, 542, 240, 566, 212, 588], 5.5, 0.45, { lo: 1 })
  b.L([212, 588, 182, 572, 152, 548], 0.8)
  // torso
  const T0 = b.parts.length
  b.L([-140, 545, -138, 600, -131, 660, -120, 720, -112, 780, -115, 840, -124, 900, -131, 960, -135, 1000], 1)
  b.L([148, 545, 146, 600, 138, 660, 126, 720, 118, 776, 122, 840, 134, 920, 142, 1000], 1)
  b.knot(-134, 612, 13, 1, 1.5)
  b.knot(-126, 692, 13, 1, 1.42)
  b.L([-124, 640, -90, 668, -52, 664], 0.48, { lo: 1, a: 0.5 })
  b.L([24, 664, 70, 670, 116, 646], 0.48, { lo: 1, a: 0.5 })
  b.L([-100, 790, -76, 806, -50, 808], 0.42, { lo: 1, a: 0.45 })
  b.L([30, 806, 64, 810, 92, 798], 0.42, { lo: 1, a: 0.45 })
  b.L([-108, 850, -90, 910, -86, 980], 0.4, { lo: 2, a: 0.4 })
  const T1 = b.parts.length
  // her right arm (viewer-left), hanging, cut by the frame
  const A0 = b.parts.length
  const armL = b.limb([-190, 500, -195, 640, -198, 760, -195, 880, -190, 1010], [40, 36, 30, 32, 30], [44, 40, 34, 35, 33])
  b.L([-226, 762, -218, 770], 0.45, { lo: 2, a: 0.5 })
  const sleeveL = b.region([-208, 450, -226, 476, -236, 510, -242, 546, -196, 556, -142, 548, -136, 520, -156, 468])
  b.cut(A0, sleeveL)
  b.cut(T0, armL.R, T1)
  // her left arm: hand on hip, elbow out
  const R0 = b.parts.length
  // upper arm angled out to a high elbow, forearm sloping back in to the waist, relaxed wrist
  const up = [268, 540, 298, 570, 328, 604, 356, 642, 376, 674, 388, 698, 385, 718, 372, 730]
  const low = [372, 730, 334, 750, 288, 768, 244, 784, 212, 800]
  const inUp = [212, 588, 244, 620, 276, 652, 298, 676, 306, 686]
  const inLow = [306, 686, 278, 704, 244, 726, 214, 748, 192, 764]
  b.L(up, 1)
  b.L(low, 1)
  b.L(inUp, 1)
  b.L(inLow, 1)
  b.L([306, 686, 320, 684], 0.45, { lo: 2, a: 0.6 })
  b.L([378, 676, 384, 694], 0.45, { lo: 2, a: 0.5 })
  const armR = b.region([...up, ...low, ...revPts(inLow), ...revPts(inUp)])
  void R0
  // hand on the hip: back of the hand, fingers down over the hip
  const handR = b.hand(201, 783, 1.7, 0.62, { thumb: false, mirror: true })
  b.cut(T0, handR, T1)
  // fabric pattern hint (bold motifs, lightly), clipped to the dress
  // busy mid-scale print: staggered grid of small blossoms with leaf sprigs, jittered
  let mi = 0
  for (let gy = 330; gy < 1040; gy += 62) {
    const row = Math.round((gy - 330) / 62)
    for (let gx = -260 + (row % 2) * 34; gx < 290; gx += 68) {
      mi++
      const jx = (rand(mi, 41) - 0.5) * 26, jy = (rand(mi, 42) - 0.5) * 22
      motif(b, gx + jx, gy + jy, 15 + rand(mi, 43) * 7, mi + 3, false, rand(mi, 44) < 0.45)
    }
  }
  // washes
  const dress = [b.region([-70, 410, -71.4, 372, -57, 334, 0, 350, 54, 330, 58.6, 368, 61, 406, 115, 414, 226, 448, 262, 510, 270, 542, 212, 588, 152, 548, 146, 600, 126, 720, 118, 776, 134, 920, 142, 1010, -136, 1010, -131, 960, -112, 780, -131, 660, -140, 545, -240, 544, -208, 450, -120, 417])]
  b.FR(dress, 'dress', 1, { ex: [handR] })
  b.clip = dress
  b.FR([armL.R, armR], 'skin', 1)
  b.F([-70, 410, -6, 417, 61, 406, 20, 440, -40, 446], 'shadow', 0.5)
  b.F([118, 560, 148, 548, 140, 660, 122, 760, 100, 700, 104, 620], 'shadow', 0.5)
  b.F([-140, 548, -118, 566, -102, 700, -98, 860, -114, 1000, -135, 1000, -124, 900, -112, 780, -131, 660], 'shadow', 0.45)
  b.F([-234, 580, -212, 580, -216, 1000, -232, 1000], 'shadow', 0.55)
  b.F([-170, 570, -152, 566, -152, 1000, -164, 1000], 'shadow', 0.45)
  b.F([-200, 600, -186, 600, -188, 900, -200, 900], 'glow', 0.5, { lo: 1 })
  b.F([214, 596, 250, 628, 300, 680, 250, 724, 204, 760, 232, 680], 'shadow', 0.45)
  b.F([336, 742, 372, 730, 360, 744, 300, 764, 240, 788, 280, 768], 'shadow', 0.4)
  b.H([110, 570, 146, 560, 138, 660, 124, 740, 100, 700, 100, 620], -1.15, 7, 0.3, 0.45, 1)
}

function poseYoungStand(b: Bld) {
  b.sub(place2(-2, 79, 1.22, 0.05), () => head3q(b, 112))
  b.headUnits = 122
  b.ax = 4
  // collar
  const cL = [-26, 146.6, -14, 149.8, -4, 152.8, 1.2, 157.2, 2.4, 163, 2.4, 179]
  const cR = [33, 145.6, 22, 149, 12, 152.2, 6.2, 156.8, 4.8, 163, 4.6, 179]
  b.L([-27, 178, -27.6, 162, ...cL], 0.95)
  b.L([34, 177, 34.6, 161, ...cR], 0.95)
  b.Lo(cL, -2.4, 0.4, { lo: 2 })
  b.Lo(cR, 2.4, 0.4, { lo: 2 })
  b.knot(3.5, 168, 6.5, 1)
  b.L([-29, 178, -12, 181, 4, 182, 20, 181, 36, 177], 0.85)
  // shoulders
  b.L([-29, 178, -52, 183, -78, 190, -102, 201], 1)
  b.L([36, 177, 60, 183, 84, 192, 106, 206], 1)
  // 斜襟 + piping + 盘扣
  const jin = [3, 182, -14, 186, -34, 193, -54, 203, -68, 218, -75, 240]
  b.L(jin, 0.9)
  b.Lo(jin, 2.6, 0.4, { lo: 2 })
  b.knot(-36, 194.6, 5.6, 1, 0.35)
  b.knot(-63, 211, 5.6, 1, 0.75)
  // cap sleeves
  b.L([-102, 201, -110, 216, -114, 236, -115, 256], 1)
  b.L([-115, 256, -96, 261, -76, 258], 0.85)
  b.Lo([-115, 256, -96, 261, -76, 258], -2.4, 0.4, { lo: 2 })
  b.L([106, 206, 114, 222, 117, 242, 117, 262], 1)
  b.L([117, 262, 99, 266, 80, 262], 0.85)
  b.Lo([117, 262, 99, 266, 80, 262], 2.4, 0.4, { lo: 2 })
  // torso
  const T0 = b.parts.length
  const torso = b.limb([4, 256, 4, 290, 5, 360, 7, 450, 3, 560, 0, 700, 2, 800], [78, 79, 57, 82, 72, 60, 55], [76, 80, 57, 80, 71, 61, 55], { draw: '' })
  b.add(torso.A)
  b.add(torso.B)
  b.knot(-72, 268, 5.6, 1, 1.5)
  b.knot(-67, 300, 5.6, 1, 1.42)
  b.L([-58, 284, -45, 292.6, -30, 291], 0.45, { lo: 1, a: 0.5 })
  b.L([22, 290, 37, 296, 52, 289], 0.45, { lo: 1, a: 0.5 })
  b.L([74, 452, 50, 484, 26, 530], 0.42, { lo: 1, a: 0.5 })
  b.L([78, 500, 56, 540, 40, 586], 0.4, { lo: 2, a: 0.45 })
  b.L([-24, 650, -18, 700, -16, 760], 0.42, { lo: 1, a: 0.5 })
  b.L([-50, 368, -36, 382], 0.4, { lo: 2, a: 0.5 })
  b.L([-10, 470, -6, 520], 0.38, { lo: 2, a: 0.4 })
  // hem + slit
  const hem = [-55, 800, -30, 804, 0, 806, 30, 804, 57, 799]
  b.L(hem, 0.95)
  b.Lo(hem, -2.6, 0.4, { lo: 2 })
  b.L([58, 712, 56, 799], 0.7)
  b.L([58, 712, 61, 801], 0.7)
  const T1 = b.parts.length
  // her right arm (viewer-left): hanging, relaxed
  const A0 = b.parts.length
  const armL = b.limb([-94, 228, -102, 300, -106, 360, -104, 420, -99, 470], [20, 19, 16, 15, 11], [22, 21, 17, 17, 11.5])
  b.L([-110, 360, -106, 366], 0.4, { lo: 2, a: 0.5 })
  const sleeveL = b.region([-102, 201, -110, 216, -114, 236, -116, 258, -96, 262, -74, 259, -74, 230, -86, 205])
  b.cut(A0, sleeveL)
  const handL = b.hand(-99, 468, 0.98, 0.04, { thumb: true })
  // her left arm (viewer-right): bent, the hand laid on a slim book held at the hip
  const B0 = b.parts.length
  const bc = [46, 452], bw = 34, bh = 50, br = -0.2
  const corner = (u: number, v: number) => [bc[0] + u * Math.cos(br) - v * Math.sin(br), bc[1] + u * Math.sin(br) + v * Math.cos(br)]
  const bookPts = [...corner(-bw, -bh), ...corner(bw, -bh), ...corner(bw, bh), ...corner(-bw, bh)]
  b.P([...bookPts, bookPts[0], bookPts[1]], 0.85)
  b.P([...corner(bw, -bh + 3), ...corner(bw + 5, -bh + 6), ...corner(bw + 5, bh + 3), ...corner(-bw + 4, bh + 3)], 0.55, { a: 0.8 })
  b.P([...corner(-bw + 8, -bh), ...corner(-bw + 8, bh)], 0.45, { lo: 1, a: 0.6 })
  const bookReg = b.region([...corner(-bw, -bh), ...corner(bw, -bh), ...corner(bw + 5, -bh + 6), ...corner(bw + 5, bh + 3), ...corner(-bw + 4, bh + 3), ...corner(-bw, bh)], true)
  b.cut(T0, bookReg, T1)
  const U0 = b.parts.length
  const upR = b.limb([98, 232, 106, 300, 110, 352], [22, 20, 17], [20, 19, 16])
  const sleeveR = b.region([106, 206, 114, 222, 117, 242, 118, 263, 99, 267, 79, 263, 80, 230, 92, 210])
  b.cut(U0, sleeveR)
  const F0 = b.parts.length
  const fore = b.limb([109, 346, 92, 392, 72, 430], [18, 16, 11], [16, 15, 10.5])
  b.cut(F0, upR.R)
  b.L([112, 352, 118, 358], 0.4, { lo: 2, a: 0.5 })
  const handR = b.hand(71, 428, 0.9, 0.62, { thumb: true, mirror: true })
  b.cut(B0, fore.R, F0)
  b.cut(B0, handR, F0)
  b.cut(T0, upR.R, T1)
  b.cut(T0, fore.R, T1)
  b.cut(T0, armL.R, T1)
  // legs and shoes
  const legR = b.limb([34, 800, 33, 850, 30, 900, 27, 948], [19, 19, 13, 8.5], [18, 17, 13, 8])
  const legL = b.limb([-28, 803, -26, 860, -24, 910, -22, 958], [18, 17, 12, 8.5], [19, 19.5, 13, 9])
  b.L([20, 940, 22, 946], 0.4, { lo: 2, a: 0.5 })
  const shoeR = b.shoeFront(27, 950, 1.05, 1)
  const shoeL = b.shoeFront(-22, 960, 1.1, -1)
  void shoeR
  void shoeL
  // washes
  const dress = [torso.R, b.region([-27, 178, -26, 146.6, 2, 156, 33, 145.6, 34, 177, 60, 183, 106, 206, 117, 262, 80, 262, 80, 256, -76, 256, -115, 256, -102, 201, -52, 183])]
  b.FR(dress, 'dress', 1, { ex: [armL.R, upR.R, fore.R, handR, handL, bookReg] })
  b.clip = dress
  b.FR([armL.R, upR.R, fore.R, legL.R, legR.R], 'skin', 1)
  b.FR([bookReg], 'book', 1, { ex: [fore.R, handR] })
  // print: small blossoms
  const dots: [number, number][] = [[-30, 236], [26, 320], [-36, 420], [20, 600], [-40, 560], [6, 700], [-56, 480], [40, 760], [-30, 760], [-8, 640], [50, 660], [-50, 340], [56, 230], [-12, 300]]
  dots.forEach(([x, y], i) => motif(b, x, y, 9 + rand(i, 2) * 4, i + 20, true))
  b.F([-29, 178, 36, 177, 20, 196, -20, 198], 'shadow', 0.45)
  b.H([50, 520, 78, 500, 72, 600, 62, 790, 44, 790, 48, 640], -1.1, 6, 0.32, 0.42, 1)
}

function poseLookBack(b: Bld) {
  b.sub(place2(4, 80, 1.2, -0.06), () => headProfile(b, 115, 'back'))
  b.headUnits = 120
  b.ax = 0
  // collar (back view)
  const cTop = [-27, 147, -12, 145, 4, 144.4, 18, 145.6, 28, 148]
  b.L([-27, 177, -28, 162, ...cTop, 29, 162, 29, 175], 0.95)
  b.Lo(cTop, -2.4, 0.4, { lo: 2 })
  b.L([-29, 178, 0, 181, 30, 177], 0.85)
  // shoulders
  b.L([-29, 178, -52, 183, -78, 190, -102, 201], 1)
  b.L([30, 177, 54, 182, 80, 190, 104, 200], 1)
  // sleeves
  b.L([-102, 201, -110, 216, -114, 236, -115, 256], 1)
  b.L([-115, 256, -96, 261, -76, 258], 0.85)
  b.Lo([-115, 256, -96, 261, -76, 258], -2.4, 0.4, { lo: 2 })
  b.L([104, 200, 112, 216, 116, 236, 117, 256], 1)
  b.L([117, 256, 98, 261, 78, 258], 0.85)
  b.Lo([117, 256, 98, 261, 78, 258], 2.4, 0.4, { lo: 2 })
  // back of the torso
  const T0 = b.parts.length
  const torso = b.limb([2, 256, 2, 300, 3, 365, 0, 455, 2, 560, 1, 700, 0, 800], [78, 76, 56, 76, 70, 61, 55], [78, 76, 57, 84, 72, 61, 55], { draw: '' })
  b.add(torso.A)
  b.add(torso.B)
  b.L([2, 196, 1, 260, 3, 320], 0.45, { lo: 1, a: 0.45 })
  b.L([-46, 226, -36, 252, -42, 276], 0.42, { lo: 2, a: 0.45 })
  b.L([-52, 372, -32, 382], 0.42, { lo: 1, a: 0.5 })
  b.L([40, 380, 54, 372], 0.42, { lo: 1, a: 0.5 })
  b.L([2, 430, 3, 480, 0, 530], 0.42, { lo: 1, a: 0.45 })
  b.L([-70, 470, -44, 520, -26, 590], 0.42, { lo: 1, a: 0.5 })
  b.L([62, 480, 46, 530], 0.4, { lo: 2, a: 0.45 })
  const hem = [-55, 800, -30, 804, 0, 806, 30, 804, 55, 800]
  b.L(hem, 0.95)
  b.Lo(hem, -2.6, 0.4, { lo: 2 })
  b.L([-57, 712, -55, 800], 0.7)
  b.L([-57, 712, -60, 802], 0.7)
  const T1 = b.parts.length
  // her left arm (viewer-left) hanging, back of the hand
  const A0 = b.parts.length
  const armL = b.limb([-94, 228, -102, 300, -106, 360, -104, 420, -99, 470], [20, 19, 16, 15, 11], [22, 21, 17, 17, 11.5])
  const sleeveL = b.region([-102, 201, -110, 216, -114, 236, -116, 258, -96, 262, -74, 259, -74, 230, -86, 205])
  b.cut(A0, sleeveL)
  const handL = b.hand(-99, 468, 0.98, 0.05, { thumb: false })
  // her right arm: elbow down, forearm rising, fingertips at the collar
  const U0 = b.parts.length
  const upR = b.limb([96, 228, 104, 290, 104, 345], [22, 20, 17], [20, 19, 16])
  const sleeveR = b.region([104, 200, 112, 216, 116, 236, 118, 258, 98, 262, 76, 259, 78, 228, 90, 206])
  b.cut(U0, sleeveR)
  b.L([104, 344, 106, 356, 100, 364, 92, 362], 0.95)
  const F0 = b.parts.length
  const fore = b.limb([98, 352, 80, 290, 56, 226], [17, 16, 11], [17, 15, 10.5])
  b.cut(F0, upR.R)
  const handR = b.hand(56, 226, 0.92, 2.78, { thumb: false })
  // hidden lines behind the raised arm and hands
  b.cut(0, fore.R, F0)
  b.cut(0, handR, F0)
  b.cut(T0, armL.R, T1)
  b.cut(T0, upR.R, T1)
  // legs: weight on her left; heels seen from behind
  const legL = b.limb([-34, 800, -35, 850, -33, 900, -30, 950], [18, 17, 13, 8.5], [19, 19.5, 13, 9])
  const legR = b.limb([32, 800, 30, 855, 27, 905, 26, 942], [19, 18, 12, 8.5], [18, 17, 12, 8])
  b.L([-36, 930, -33, 946], 0.4, { lo: 2, a: 0.5 })
  b.L([30, 920, 30, 936], 0.4, { lo: 2, a: 0.5 })
  b.shoeBack(-30, 952, 1.1, 0)
  b.shoeBack(26, 944, 1.05, 1)
  const dress = [torso.R, b.region([-27, 177, -27, 147, 4, 144.4, 28, 148, 30, 177, 54, 182, 104, 200, 117, 256, 78, 256, -76, 256, -115, 256, -102, 201, -52, 183])]
  b.FR(dress, 'dress', 1, { ex: [armL.R, upR.R, fore.R, handR, handL] })
  b.clip = dress
  b.FR([armL.R, upR.R, fore.R, legL.R, legR.R], 'skin', 1)
  const dots: [number, number][] = [[-30, 236], [26, 320], [-36, 420], [20, 600], [-40, 560], [6, 700], [-56, 480], [40, 760], [-30, 760], [-8, 640], [50, 660], [-50, 340], [-12, 300]]
  dots.forEach(([x, y], i) => motif(b, x, y, 9 + rand(i, 2) * 4, i + 20, true))
  b.F([-29, 178, 30, 177, 18, 194, -20, 196], 'shadow', 0.4)
  b.H([30, 390, 56, 372, 76, 455, 66, 600, 58, 780, 40, 780, 46, 560, 50, 450], -1.1, 6, 0.32, 0.42, 1)
}

/** Oil-paper umbrella as a projected 3-D dome: ribs, scalloped rim, painted bands, finial. */
function umbrella(b: Bld, hx: number, hy: number, o: { R: number; alpha: number; beta: number; reach: number; ribs: number }) {
  const { R, alpha, beta, reach, ribs } = o
  const ca = Math.cos(alpha), sa = Math.sin(alpha), cb = Math.cos(beta), sb = Math.sin(beta)
  const up = [ca * sb, -ca * cb]
  const e1 = [cb, sb]
  const e2 = [-sa * sb, sa * cb]
  const hgt = 0.34
  const rimC = [hx + up[0] * R * reach, hy + up[1] * R * reach]
  const pt = (th: number, u: number) => {
    const r = R * u, z = R * hgt * (1 - Math.pow(u, 1.7))
    const c = Math.cos(th), s = Math.sin(th)
    return [rimC[0] + r * (c * e1[0] + s * e2[0]) + z * up[0], rimC[1] + r * (c * e1[1] + s * e2[1]) + z * up[1]]
  }
  const crown = pt(0, 0)
  const th0 = 0.3
  const all: number[][] = [crown]
  const rimPts: number[] = []
  for (let k = 0; k <= ribs; k++) {
    const th = th0 + (k / ribs) * Math.PI * 2
    const p = pt(th, 1)
    rimPts.push(p[0], p[1])
    all.push(p)
    if (k < ribs) {
      const m = pt(th + Math.PI / ribs, 0.965)
      rimPts.push(m[0], m[1])
    }
  }
  const tip = [crown[0] + up[0] * R * 0.08, crown[1] + up[1] * R * 0.08]
  all.push(tip)
  const hull = convexHull(all)
  b.F(hull, 'umb', 1)
  // drawing order: rim, ribs, bands, finial
  b.L(rimPts, 1.0, { step: 3 })
  for (let k = 0; k < ribs; k++) {
    const th = th0 + (k / ribs) * Math.PI * 2
    const pts: number[] = []
    for (let j = 0; j <= 6; j++) {
      const p = pt(th, 0.06 + (0.94 * j) / 6)
      pts.push(p[0], p[1])
    }
    b.L(pts, 0.5, { lo: k % 2 ? 1 : 0, a: 0.8 })
  }
  const band = (u: number, w: number, lo: number) => {
    const pts: number[] = []
    for (let k = 0; k <= 48; k++) {
      const p = pt(th0 + (k / 48) * Math.PI * 2, u)
      pts.push(p[0], p[1])
    }
    b.L(pts, w, { lo, a: 0.7, step: 3 })
  }
  band(0.2, 0.55, 1)
  band(0.86, 0.45, 2)
  band(0.9, 0.4, 2)
  b.L([crown[0], crown[1], tip[0], tip[1]], 1.6, { fine: false })
  b.occ = [b.tp(crv(hull, true, 6))]
  return { up, hull }
}

function poseWalkUmbrella(b: Bld) {
  const BH = 2 // behind the canopy
  b.ax = 0
  const P0 = b.parts.length, F0 = b.fills.length, H0 = b.hats.length
  b.sub(place2(-6, 84, 1.16, -0.04), () => headBack(b, 116))
  b.headUnits = 116
  // short swing coat: small stand collar, padded shoulders, flared hem at the hip, back half-belt
  b.L([-30, 172, -31, 160, -30, 152, -15, 148.4, 0, 147.6, 16, 149, 30, 153, 31, 170], 0.95)
  b.L([-34, 172, 0, 176, 33, 171], 0.85)
  b.L([-34, 172, -58, 177, -84, 188, -94, 200], 1)
  b.L([33, 171, 58, 174, 82, 184, 92, 196], 1)
  const C0 = b.parts.length
  const coat = b.limb([0, 232, 0, 320, 1, 420, 2, 508], [82, 86, 100, 116], [84, 88, 102, 118], { draw: '' })
  b.add(coat.A)
  b.add(coat.B)
  const chem = [-116, 504, -60, 513, 0, 516, 60, 512, 118, 500]
  b.L(chem, 0.95)
  b.Lo(chem, -2.6, 0.42, { lo: 1 })
  b.L([0, 180, 1, 320, 2, 514], 0.45, { lo: 1, a: 0.5 })
  b.L([-40, 250, -54, 380, -72, 500], 0.42, { lo: 2, a: 0.45 })
  b.L([40, 250, 54, 380, 72, 498], 0.42, { lo: 2, a: 0.45 })
  b.L([-62, 200, -54, 240], 0.42, { lo: 2, a: 0.45 })
  const C1 = b.parts.length
  // left sleeve hanging, flared cuff, hand below
  const sl = b.limb([-90, 212, -100, 300, -106, 380, -106, 432], [22, 22, 21, 22], [24, 25, 25, 27])
  b.L([-133, 430, -108, 438, -84, 434], 0.85)
  b.Lo([-133, 430, -108, 438, -84, 434], 2.6, 0.45, { lo: 1 })
  const handL = b.hand(-108, 438, 1.0, 0.06, { thumb: false })
  // right arm raised to the shaft: elbow down-out, forearm hidden in front of her
  const sr = b.limb([92, 210, 104, 280, 106, 322], [24, 24, 22], [22, 22, 20])
  b.L([128, 322, 124, 340, 108, 346, 90, 338], 0.95)
  b.cut(C0, sl.R, C1)
  b.cut(C0, sr.R, C1)
  b.cut(C0, b.region([84, 300, 128, 322, 124, 340, 108, 346, 86, 336]), C1)
  // qipao below the coat, narrow skirt in stride
  const K0 = b.parts.length
  const skirt = b.limb([0, 500, -1, 600, -3, 700, -4, 792], [58, 54, 48, 44], [58, 54, 48, 44])
  const hem = [-48, 792, -20, 798, 10, 795, 40, 786]
  b.L(hem, 0.95)
  b.Lo(hem, -2.4, 0.4, { lo: 2 })
  b.L([-50, 704, -47, 794], 0.7)
  b.L([-20, 560, -14, 630, -12, 700], 0.42, { lo: 1, a: 0.5 })
  b.L([30, 590, 24, 660], 0.4, { lo: 2, a: 0.45 })
  b.cut(K0, b.region([-130, 420, 130, 420, 118, 500, 60, 512, 0, 516, -60, 513, -116, 504]))
  // legs: far (viewer-right) planted further away, near (viewer-left) lifting off with the sole showing
  const legF = b.limb([22, 788, 22, 840, 20, 890, 18, 930], [16, 15, 11, 7.5], [15, 14, 10, 7])
  b.shoeBack(18, 932, 0.95, 0)
  const legN = b.limb([-24, 796, -32, 860, -40, 915, -46, 950], [18, 19, 13, 9], [19, 20, 13, 9])
  const sole = [-55, 946, -58, 961, -53, 976, -45, 988, -39, 1000, -31, 998, -31, 986, -35, 966, -38, 952]
  b.L(sole, 0.95)
  b.L([-56, 966, -64, 979], 1.6, { fine: false })
  b.L([-50, 972, -42, 986, -36, 995], 0.45, { lo: 1, a: 0.7 })
  b.F(sole, 'shoe', 1)
  // washes
  b.FR([coat.R, b.region([-30, 152, 0, 147.6, 30, 153, 33, 171, 92, 196, 84, 232, -86, 232, -94, 200, -34, 172]), sl.R, sr.R], 'coat', 1)
  b.FR([skirt.R], 'dress', 1)
  b.clip = [skirt.R]
  b.FR([legF.R, legN.R, handL], 'skin', 1)
  b.H([46, 330, 84, 320, 116, 500, 70, 510, 56, 420], -1.1, 6, 0.32, 0.42, 1)
  b.H([20, 530, 58, 516, 50, 680, 42, 780, 20, 780, 28, 640], -1.1, 6, 0.3, 0.42, 1)
  for (let i = P0; i < b.parts.length; i++) b.parts[i].clip = BH
  for (let i = F0; i < b.fills.length; i++) b.fills[i].clip = BH
  for (let i = H0; i < b.hats.length; i++) b.hats[i].clip = BH
  // umbrella over the right shoulder, leaning back and to the right
  const hx = 46, hy = 236
  const U = umbrella(b, hx, hy, { R: 240, alpha: 0.6, beta: 0.78, reach: 1.0, ribs: 20 })
  const sh: number[] = []
  for (let j = 0; j <= 60; j++) {
    const d = (j / 60) * 230 * 1.5
    const x = hx + U.up[0] * d, y = hy + U.up[1] * d
    if (y < 178 && !inPoly(x, y, U.hull)) sh.push(x, y)
  }
  if (sh.length >= 4) {
    b.L(sh, 1.1)
    b.L(offsetPoly(sh, 3.4), 0.6, { a: 0.8 })
  }
}

function poseWriting(b: Bld) {
  b.ax = 0
  // head bowed over the page
  b.sub(place2(-95, 252, 1.45, 0.38), () => headProfile(b, 122, 'down'))
  b.headUnits = 145
  // collar band, tilted with the neck
  b.L([-166, 322, -137, 331, -111, 339], 0.9)
  b.Lo([-166, 322, -137, 331, -111, 339], -2.4, 0.4, { lo: 2 })
  b.L([-111, 339, -108, 364], 0.85)
  b.L([-166, 322, -171, 348], 0.85)
  b.L([-171, 348, -140, 358, -108, 364], 0.8)
  b.knot(-114, 351, 7, 1, 0.3)
  // back: upper back curve, lower back, onto the seat
  const T0 = b.parts.length
  b.L([-171, 348, -194, 382, -216, 432, -232, 492, -244, 552, -248, 600, -261, 640, -271, 672, -266, 690], 1)
  b.L([-108, 364, -100, 388, -94, 414, -96, 440, -108, 466, -122, 500, -133, 540, -140, 580, -149, 622, -152, 630], 1)
  b.L([-104, 470, -120, 476], 0.42, { lo: 2, a: 0.5 })
  const T1 = b.parts.length
  // near arm: cap sleeve, elbow on the desk, forearm along it
  const A0 = b.parts.length
  b.L([-168, 346, -152, 348, -136, 358, -126, 376, -121, 396], 0.95)
  b.L([-121, 396, -127, 408, -138, 419], 0.85)
  b.Lo([-121, 396, -127, 408, -138, 419], -2.4, 0.4, { lo: 2 })
  const up = b.limb([-128, 404, -80, 430, -16, 458], [19, 19, 18], [20, 20, 19])
  const sleeve = b.region([-171, 348, -152, 348, -136, 358, -126, 376, -121, 396, -127, 408, -138, 419, -160, 420, -186, 390])
  b.cut(A0 + 3, sleeve)
  const F0 = b.parts.length
  const fore = b.limb([-20, 454, 60, 452, 138, 452], [19, 17, 12], [19, 16, 12])
  b.cut(F0, up.R)
  b.L([-36, 474, -24, 478, -10, 474], 0.6)
  b.cut(T0, up.R, T1)
  b.cut(T0, sleeve, T1)
  // writing hand and pen
  b.L([138, 440, 150, 436, 164, 437, 176, 443, 186, 452, 192, 462], 1)
  b.L([150, 444, 164, 444, 176, 448], 0.6, { lo: 1 })
  b.L([138, 464, 152, 468, 166, 469, 180, 466, 187, 468, 192, 464], 0.9)
  b.L([168, 456, 182, 458], 0.45, { lo: 2 })
  b.L([200, 472, 178, 440, 158, 410], 1.3, { fine: false })
  b.L([201, 474, 197, 469], 1.8, { fine: false })
  const handReg = b.region([138, 440, 164, 437, 186, 452, 192, 464, 166, 469, 138, 464])
  // lap and legs: thigh to the knee, shin down, heels together
  const L0 = b.parts.length
  const thigh = b.limb([-230, 664, -130, 664, -30, 666], [30, 28, 24], [28, 28, 24], { draw: '' })
  b.add(thigh.B)
  b.L([-262, 692, -200, 694, -130, 694, -60, 692], 1)
  b.L([-30, 642, -14, 652, -10, 670, -18, 690], 1)
  const hem = [-84, 690, -60, 702, -30, 700, -14, 690]
  b.L(hem, 0.85)
  b.Lo(hem, 2.4, 0.4, { lo: 2 })
  b.L([-120, 642, -80, 660, -60, 676], 0.42, { lo: 1, a: 0.5 })
  b.L([-200, 560, -170, 600], 0.42, { lo: 2, a: 0.45 })
  const shin = b.limb([-30, 690, -38, 800, -48, 940], [22, 17, 9], [24, 25, 9])
  b.cut(L0, b.region([-84, 690, -14, 690, -22, 640, -84, 640]), b.parts.length)
  // shoe in profile (pump)
  b.L([-58, 938, -64, 950, -66, 966, -60, 974], 0.95)
  b.L([-62, 972, -61, 1000], 1.7, { fine: false })
  b.L([-56, 974, -40, 980, -22, 990, -4, 996, 6, 998, 8, 994, -6, 986, -24, 974, -38, 958, -40, 944], 0.95)
  b.L([-50, 958, -42, 962], 0.45, { lo: 2, a: 0.6 })
  b.F([-58, 938, -66, 966, -56, 974, -22, 990, 8, 996, -24, 974, -40, 946], 'shoe', 1)
  // desk: slab top seen slightly from above, apron with a drawer, tapered legs
  const D0 = b.parts.length
  b.P([-62, 476, 420, 476], 1.0)
  b.P([-54, 456, 428, 456], 0.8)
  b.P([-62, 476, -54, 456], 0.8)
  b.P([420, 476, 428, 456], 0.8)
  b.P([-62, 476, -62, 490, 420, 490, 420, 476], 0.85)
  b.P([-52, 490, -52, 534, 410, 534, 410, 490], 0.75)
  b.P([120, 500, 220, 500, 220, 526, 120, 526, 120, 500], 0.5, { lo: 1, a: 0.7 })
  b.L([164, 512, 176, 512], 1.2, { lo: 1, fine: false })
  b.P([-40, 534, -34, 1000], 0.95)
  b.P([-24, 534, -24, 1000], 0.7)
  b.P([388, 534, 386, 1000], 0.95)
  b.P([402, 534, 398, 1000], 0.7)
  b.cut(D0, fore.R)
  b.cut(D0, up.R)
  b.cut(D0, handReg)
  b.cut(D0, shin.R)
  b.cut(D0, thigh.R)
  // papers and books on the desk
  const P0 = b.parts.length
  b.P([84, 472, 112, 460, 300, 460, 284, 472, 84, 472], 0.6)
  b.P([118, 470, 140, 462, 320, 463, 302, 471], 0.5, { a: 0.7 })
  const P1 = b.parts.length
  b.P([250, 456, 252, 430, 330, 430, 330, 456], 0.7)
  b.P([252, 430, 262, 420, 336, 420, 330, 430], 0.6)
  b.P([336, 420, 336, 446, 330, 456], 0.6)
  b.P([256, 443, 328, 443], 0.4, { lo: 1, a: 0.6 })
  b.cut(P0, fore.R)
  b.cut(P0, handReg)
  // desk lamp: round base, slender stem, bell shade
  b.L([326, 466, 340, 459, 372, 457, 388, 462, 382, 470, 344, 471, 326, 466], 0.85)
  b.P([354, 459, 360, 300], 0.9)
  b.P([364, 459, 368, 300], 0.7)
  b.L([350, 236, 360, 228, 376, 228, 386, 236], 0.85)
  b.L([350, 236, 330, 270, 312, 304], 0.95)
  b.L([386, 236, 404, 270, 418, 304], 0.95)
  b.L([312, 304, 340, 314, 380, 316, 418, 304], 0.9)
  b.L([312, 304, 344, 296, 388, 296, 418, 304], 0.55, { a: 0.7 })
  b.P([364, 300, 364, 312], 0.6, { a: 0.7 })
  b.cut(P0, b.region([250, 456, 252, 430, 262, 420, 336, 420, 336, 446, 330, 456], true), P1)
  // chair: bentwood back post, top rail, seat, splayed legs
  const K0 = b.parts.length
  b.L([-286, 690, -292, 600, -300, 500, -310, 420], 0.95)
  b.L([-300, 690, -305, 600, -313, 500, -324, 422], 0.85)
  b.L([-324, 422, -320, 410, -306, 410, -310, 420], 0.8)
  b.P([-312, 694, -312, 708, -150, 708, -150, 694], 0.85)
  b.P([-306, 708, -312, 850, -320, 1000], 0.9)
  b.P([-294, 708, -298, 850, -304, 1000], 0.7)
  b.P([-162, 708, -160, 850, -158, 1000], 0.9)
  b.P([-150, 708, -146, 850, -143, 1000], 0.7)
  b.P([-300, 860, -156, 860], 0.6, { lo: 1, a: 0.75 })
  b.cut(K0, shin.R)
  b.cut(K0, b.region([-271, 672, -262, 692, -60, 692, -60, 640, -248, 600]))
  // washes
  const dress = [b.region([-166, 322, -111, 339, -108, 364, -96, 440, -122, 500, -149, 622, -152, 640, -30, 642, -14, 652, -10, 670, -14, 690, -84, 690, -130, 694, -262, 692, -271, 672, -248, 600, -232, 492, -194, 382, -171, 348])]
  b.FR(dress, 'dress', 1, { ex: [up.R] })
  b.clip = dress
  b.FR([up.R, fore.R, shin.R, handReg], 'skin', 1)
  b.F([-62, 476, -54, 456, 428, 456, 420, 476, 420, 490, -62, 490], 'wood', 1, { sharp: true })
  b.F([-52, 490, 410, 490, 410, 534, -52, 534], 'wood', 0.7, { sharp: true })
  b.F([84, 472, 112, 460, 300, 460, 284, 472], 'paper', 1, { sharp: true })
  b.F([250, 456, 252, 430, 262, 420, 336, 420, 336, 446, 330, 456], 'book', 1, { sharp: true })
  b.F([350, 236, 386, 236, 418, 304, 380, 316, 340, 314, 312, 304], 'shade', 1)
  b.F([-286, 690, -310, 420, -324, 422, -300, 690], 'wood', 1)
  b.F([-312, 694, -150, 694, -150, 708, -312, 708], 'wood', 0.8, { sharp: true })
  b.H([-240, 560, -200, 600, -170, 640, -262, 688, -266, 640, -250, 600], -1.1, 6, 0.3, 0.42, 1)
}

// ───────────────────────────── cache & normalise ─────────────────────────────

const BUILDERS: Partial<Record<EileenPose, (b: Bld) => void>> = {
  iconic: poseIconic,
  youngStand: poseYoungStand,
  lookBack: poseLookBack,
  walkUmbrella: poseWalkUmbrella,
  writing: poseWriting,
}
const POSES = new Map<string, Pose>()

function getPose(name: EileenPose): Pose | null {
  const hit = POSES.get(name)
  if (hit) return hit
  const fn = BUILDERS[name]
  if (!fn) return null
  const b = new Bld()
  fn(b)
  // normalise: bbox of lines → height 1000, bottom at y = 1000, centred on the figure (ax) or the bbox
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
  for (const p of b.parts) for (let i = 0; i < p.p.length; i += 2) {
    x0 = Math.min(x0, p.p[i]); x1 = Math.max(x1, p.p[i]); y0 = Math.min(y0, p.p[i + 1]); y1 = Math.max(y1, p.p[i + 1])
  }
  if (name === 'iconic') y1 = Math.min(y1, 1000)
  const k = 1000 / (y1 - y0)
  const cx = b.ax ?? (x0 + x1) / 2
  const N = (p: Poly): Poly => p.map((v, i) => (i & 1 ? (v - y0) * k : (v - cx) * k))
  const pose: Pose = {
    parts: b.parts.map((p) => ({ ...p, p: N(p.p), len: p.len * k, uw: p.uw * k })),
    fills: b.fills.map((f) => ({ ...f, p: f.p.map(N), ex: f.ex ? f.ex.map(N) : null })).sort((a, c) => FILL_ORDER[a.k] - FILL_ORDER[c.k]),
    hats: b.hats.map((h) => ({ ...h, p: h.p.map(N), gap: h.gap * k })),
    head: (b.headUnits * k) / 1000,
    wk: name === 'iconic' ? 0.62 : name === 'writing' ? 1.15 : 1,
    clip: b.clip ? b.clip.map(N) : null,
    occ: b.occ ? b.occ.map(N) : null,
    bg: b.bg,
  }
  POSES.set(name, pose)
  return pose
}

// ───────────────────────────── drawing ─────────────────────────────

function isLight(col: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(col)
  if (!m) return false
  const v = parseInt(m[1], 16)
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 140
}

function pathOf(polys: Poly[]) {
  const p = new Path2D()
  for (const q of polys) {
    p.moveTo(q[0], q[1])
    for (let i = 2; i < q.length; i += 2) p.lineTo(q[i], q[i + 1])
    p.closePath()
  }
  return p
}

/** Soft photographic tone (no pigment granulation) — used by the mono print. */
function tone(ctx: Ctx, polys: Poly[], color: string, alpha: number, blur: number) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = color
  ctx.fill(pathOf(polys))
  ctx.filter = 'none'
  ctx.restore()
}

type Look = { c: string; a: number }
function fillLook(k: FillK, night: boolean, mono: boolean, dress: string, line: string, mask = false): Look {
  if (mask) {
    // white-on-transparent mask for text-as-material: brightness = density of characters
    switch (k) {
      case 'hair': return { c: '#ffffff', a: 0.95 }
      case 'dress': return { c: dress, a: 0.95 }
      case 'skin': return { c: '#ffffff', a: 0.45 }
      case 'pattern': return { c: '#000000', a: 0.45 }
      case 'lip': return { c: '#ffffff', a: 0.7 }
      case 'iris': return { c: '#ffffff', a: 0.9 }
      case 'shoe': return { c: '#ffffff', a: 0.85 }
      case 'shadow': case 'hairhl': return { c: '#000000', a: 0 }
      case 'coat': return { c: '#bbbbbb', a: 0.9 }
      case 'umb': return { c: '#dddddd', a: 0.85 }
      default: return { c: '#cccccc', a: 0.7 }
    }
  }
  if (mono) {
    switch (k) {
      case 'skin': return { c: '#e4e0d8', a: 0.96 }
      case 'dress': return { c: '#a29e97', a: 0.95 }
      case 'pattern': return { c: '#4a4743', a: 0.62 }
      case 'hair': return { c: '#141312', a: 0.96 }
      case 'hairhl': return { c: '#a8a49d', a: 0.9 }
      case 'lip': return { c: '#7d7470', a: 0.6 }
      case 'glow': return { c: '#faf8f3', a: 0.75 }
      case 'iris': return { c: '#3a3734', a: 0.92 }
      case 'shadow': return { c: '#000000', a: 0.3 }
      case 'shoe': return { c: '#1c1b1a', a: 0.9 }
      default: return { c: '#8a8782', a: 0.8 }
    }
  }
  switch (k) {
    case 'skin': return night ? { c: '#e6ecf6', a: 0.62 } : { c: '#fbf3e2', a: 0.35 }
    case 'glow': return night ? { c: '#eef3fb', a: 0.18 } : { c: '#fffaf0', a: 0.3 }
    case 'dress': return { c: dress, a: night ? 0.5 : 0.42 }
    case 'pattern': return night ? { c: '#070a12', a: 0.32 } : { c: line, a: 0.2 }
    case 'hair': return night ? { c: '#04060b', a: 0.66 } : { c: '#1d1510', a: 0.6 }
    case 'hairhl': return night ? { c: '#9aa6c0', a: 0.12 } : { c: '#f4ead6', a: 0.35 }
    case 'lip': return { c: C.rouge, a: night ? 0.55 : 0.5 }
    case 'iris': return night ? { c: '#05070d', a: 0.85 } : { c: '#1a120c', a: 0.85 }
    case 'shadow': return night ? { c: '#1b2438', a: 0.22 } : { c: '#3a2614', a: 0.1 }
    case 'coat': return night ? { c: '#7d89a3', a: 0.22 } : { c: '#6e5c49', a: 0.3 }
    case 'umb': return night ? { c: '#9c7f4e', a: 0.42 } : { c: C.gold, a: 0.4 }
    case 'wood': return night ? { c: '#4e5872', a: 0.32 } : { c: '#7a5a3c', a: 0.24 }
    case 'shade': return { c: C.jade, a: night ? 0.5 : 0.45 }
    case 'book': return { c: C.jade, a: 0.5 }
    case 'shoe': return night ? { c: '#04060b', a: 0.55 } : { c: '#2a1d14', a: 0.5 }
    case 'paper': return night ? { c: '#dfe6f2', a: 0.22 } : { c: '#f6eedc', a: 0.6 }
  }
}

export function drawYoung(ctx: Ctx, pose: EileenPose, o: EileenOpts) {
  const P = getPose(pose)
  if (!P) return
  const s = o.h / 1000
  const fx = o.flip ? -s : s
  const ox = o.x, oy = o.y - 1000 * s
  const tr = (p: Poly): Poly => {
    const q: Poly = new Array(p.length)
    for (let i = 0; i < p.length; i += 2) {
      q[i] = ox + p[i] * fx
      q[i + 1] = oy + p[i + 1] * s
    }
    return q
  }
  const mono = !!o.mono
  const col = mono ? '#2a2928' : o.color ?? C.ink
  const maskMode = !mono && /^#f{3}(f{3})?$/i.test(col)
  const night = !mono && isLight(col)
  const pr = clamp(o.progress ?? 1)
  const headPx = o.h * P.head
  const lod = headPx < 22 ? 0 : headPx < 60 ? 1 : 2
  const fill = clamp(o.fill ?? smoothstep(0.55, 1, pr))
  const base = (o.weight ?? 1) * clamp(0.7 + (o.h * P.wk) / 520, 0.85, 3.2)
  const wob = clamp(o.h / 700, 0.2, 1.0)
  const t = o.t ?? 0
  const boil = o.boil ?? 8
  const blur = clamp(o.h / 320, 0.8, 3)
  const dressCol = o.dress ?? C.rouge
  const lightCol = mono ? '#ebe7df' : night ? '#e9eef8' : '#fbf5e6'
  const hlCol = mono ? '#a9a59e' : col

  let clipDress: Path2D | null = null
  let clipOut: Path2D | null = null
  const clipped = (mode: number, ex: Poly[] | null, fn: () => void) => {
    if (mode === 0 && !ex) return fn()
    ctx.save()
    if (mode === 1 && P.clip) {
      clipDress ??= pathOf(P.clip.map(tr))
      ctx.clip(clipDress)
    } else if (mode === 2 && P.occ) {
      if (!clipOut) {
        clipOut = pathOf(P.occ.map(tr))
        clipOut.rect(-1e5, -1e5, 2e5, 2e5)
      }
      ctx.clip(clipOut, 'evenodd')
    }
    if (ex) {
      const e = pathOf(ex.map(tr))
      e.rect(-1e5, -1e5, 2e5, 2e5)
      ctx.clip(e, 'evenodd')
    }
    fn()
    ctx.restore()
  }

  // ── mono: studio background (caller clips to the photo frame)
  if (mono && P.bg && fill > 0.001) {
    ctx.save()
    ctx.globalAlpha *= fill
    const bx = ox - 900 * s, by = oy - 80 * s, bw = 1800 * s, bh = 1080 * s
    const g = ctx.createRadialGradient(ox - 120 * fx, oy + 330 * s, 40 * s, ox - 60 * fx, oy + 420 * s, 900 * s)
    g.addColorStop(0, '#9b9893')
    g.addColorStop(0.45, '#6f6c68')
    g.addColorStop(1, '#2e2d2c')
    ctx.fillStyle = g
    ctx.fillRect(bx, by, bw, bh)
    ctx.restore()
  }

  // ── washes (under the lines)
  if (fill > 0.001) {
    for (const f of P.fills) {
      if (lod < f.lo) continue
      const L = fillLook(f.k, night, mono, dressCol, col, maskMode)
      if (L.a <= 0) continue
      clipped(f.clip, f.ex, () => {
        const softK = f.k === 'shadow' || f.k === 'hairhl' || f.k === 'glow'
        const bl = f.k === 'iris' ? Math.min(0.6, blur * 0.3) : f.k === 'pattern' && mono ? Math.max(0.5, blur * 0.35) : softK ? Math.max(blur * 2.2, mono ? headPx * 0.045 : 0) : blur
        if (mono || maskMode || softK || f.k === 'iris' || f.k === 'skin') tone(ctx, f.p.map(tr), L.c, L.a * f.a * fill, bl)
        else wash(ctx, f.p.map(tr), L.c, { alpha: L.a * f.a, blur, progress: fill, edge: 0.5 })
      })
    }
  }

  // ── lines, in drawing order
  const vis: number[] = []
  let total = 0
  for (let i = 0; i < P.parts.length; i++) {
    const p = P.parts[i]
    if (lod < p.lo || lod > p.hi) continue
    vis.push(i)
    total += p.len
  }
  const lineP = clamp(pr / 0.9)
  const ov = 0.12
  const span = lineP * total * (1 + ov)
  let acc = 0
  for (const i of vis) {
    const p = P.parts[i]
    const start = acc * (1 - ov * 0.5)
    acc += p.len
    const lp = clamp((span - start) / Math.max(1e-3, p.len))
    if (lp <= 0) continue
    const lenPx = p.len * s
    const w = p.uw > 0 ? Math.max(0.6, p.uw * s) : Math.max(0.55, base * p.w)
    const c = p.light ? lightCol : p.hl && fill > 0.5 ? hlCol : col
    clipped(p.clip, null, () =>
      penStroke(ctx, tr(p.p), lp, {
        width: w,
        color: c,
        alpha: p.a * (p.light ? fill : 1) * (mono && p.soft ? 1 - 0.75 * fill : 1),
        wobble: p.fine ? wob * 0.35 : wob,
        wave: p.fine ? 40 : 90,
        pressure: p.fine ? 0.2 : 0.35,
        taperIn: Math.min(3 + base * 4, lenPx * 0.3),
        taperOut: Math.min(5 + base * 6, lenPx * 0.42),
        boil,
        t,
        seed: i + 1,
        nib: !p.fine,
      }),
    )
  }

  // ── hatching last
  const hp = clamp((pr - 0.78) / 0.22)
  if (hp > 0) {
    P.hats.forEach((h, j) => {
      if (lod < h.lo) return
      const ang = o.flip ? Math.PI - h.ang : h.ang
      clipped(h.clip, null, () =>
        hatch(ctx, h.p.map(tr), { angle: ang, gap: Math.max(2.4, h.gap * s), progress: hp, color: mono ? '#1d1c1b' : col, alpha: h.a * (mono ? 0.35 : 1), width: Math.max(0.5, base * h.w), boil, t, seed: 50 + j * 7, wobble: wob * 0.4 }),
      )
    })
  }

  // ── mono: photographic finish — soft focus falloff, vignette, silver grain (caller clips to the print)
  if (mono && P.bg && fill > 0.001) {
    const bx = ox - 900 * s, by = oy - 80 * s, bw = 1800 * s, bh = 1080 * s
    const cx = ox - 40 * fx, cy = oy + 420 * s
    ctx.save()
    ctx.globalAlpha *= fill
    // haze toward the edges (out-of-focus falloff)
    let g = ctx.createRadialGradient(cx, cy, 260 * s, cx, cy, 760 * s)
    g.addColorStop(0, 'rgba(120,118,114,0)')
    g.addColorStop(1, 'rgba(120,118,114,0.28)')
    ctx.fillStyle = g
    ctx.fillRect(bx, by, bw, bh)
    // vignette
    g = ctx.createRadialGradient(cx, cy, 330 * s, cx, cy, 820 * s)
    g.addColorStop(0, 'rgba(10,10,10,0)')
    g.addColorStop(1, 'rgba(10,10,10,0.5)')
    ctx.fillStyle = g
    ctx.fillRect(bx, by, bw, bh)
    // grain (shifts per frame like film)
    const tile = grainTile()
    const f = Math.floor(t * 24)
    ctx.translate(bx + ((f * 37) % 97), by + ((f * 53) % 89))
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha *= 0.15
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')!
    ctx.fillRect(-100, -100, bw + 200, bh + 200)
    ctx.restore()
  }
}

let GRAIN: HTMLCanvasElement | null = null
function grainTile() {
  if (GRAIN) return GRAIN
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const g = c.getContext('2d')!
  const img = g.createImageData(160, 160)
  for (let i = 0; i < 160 * 160; i++) {
    const v = 128 + (rand(i, 77) + rand(i, 78) - 1) * 150
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = clamp(v, 0, 255)
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  GRAIN = c
  return c
}
