/**
 * Segment D · 110.573–176.866 s · 1944–1952 — 常德公寓, 胡兰成, the photograph, the 婚书, the letter, leaving.
 * Owner: agent D. Verse 2 → pre-chorus → interlude. Cuts on lyric-line starts / beats (beatTime indices).
 *
 *   D1 110.57 night  Eddington House in rain, the sixth-floor window; the wet moon in a puddle (114.7)
 *   D2 115.29 night  her room: writing by the window, a tram passes below, spark on the wire
 *   D3 121.09 paper  her door: cobwebs, a hat's shadow on the transom, a note slides under the door; 《爱》 on 稿纸
 *   D4 127.41 paper  the photograph's back, her inscription; dust settles; a flower opens out of the dust (135.3)
 *   D5 143.20 paper  the 婚书 on 洒金 red paper; 「因为懂得，所以慈悲。」 on a slip beside it
 *   D6 147.93 paper  the map: Shanghai → Wuhan (Yangtze), → Wenzhou; faint women beside a faceless man
 *   D7 156.34 night  Wenzhou 1946, rain: she walks to the boat under an umbrella; the flower withers; pages fly
 *   D8 161.10 paper  June 1947: the letter, written, folded, carried off by wind and rain
 *   D9 167.42 night  1952: the city un-draws itself; only the moon and the horizon remain (171.8)
 */
import { C, FONT, H, W } from '../config'
import { eileen } from '../lib/eileen'
import type { Scene } from '../lib/film'
import { glowAt, moon, nightPaper, oldPaper, rain } from '../lib/ground'
import { TAU, beatPulse, beatTime, clamp, ease, envelope, lerp, prog, rand, smoothstep } from '../lib/math'
import { hatch, pathPolys, penDraw, penStroke, sketchEllipse, sketchLine, wash, type PenStyle, type Poly } from '../lib/pen'
import { cached, type Ctx } from '../lib/texture'
import { writeVertical, yearMark } from '../lib/type'
import { CORPUS, floatLines, textImage, textPlane, textRain } from '../lib/textmatter'

// ───────────────────────────── timing (beat-aligned cuts) ─────────────────────────────
const T1 = 110.573
const T2 = beatTime(224) // 115.287 「我是非得听见电车响…」
const T3 = beatTime(235) // 121.092 「常德路上爬满蛛网的门窗」
const T4 = beatTime(247) // 127.408 「梦里回到他的身旁」
const T5 = beatTime(277) // 143.197 「没有奇迹 没有惊喜」
const T6 = beatTime(286) // 147.934 「尘埃里花不会哭泣」
const T7 = beatTime(302) // 156.340 「褶皱的信乘飞雨」
const T8 = beatTime(311) // 161.100 interlude
const T9 = beatTime(323) // 167.416
const TEND = 176.866

// ───────────────────────────── helpers ─────────────────────────────
type Pt = [number, number]
const flat = (pts: Pt[]): Poly => pts.flatMap((p) => [p[0], p[1]])
const n2 = (x: number, y: number): Pt => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}
function camera(ctx: Ctx, cx: number, cy: number, z: number, rot = 0) {
  ctx.translate(W / 2, H / 2)
  if (rot) ctx.rotate(rot)
  ctx.scale(z, z)
  ctx.translate(-cx, -cy)
}
const ink = (t: number, o: PenStyle = {}): PenStyle => ({ width: 1.8, color: C.ink, alpha: 0.88, boil: 6, t, wobble: 1.0, ...o })
const chalk = (t: number, o: PenStyle = {}): PenStyle => ({ width: 1.6, color: C.lineNight, alpha: 0.82, boil: 6, t, wobble: 1.0, ...o })
const quad = (a: Pt, b: Pt, c: Pt, d: Pt): Poly => flat([a, b, c, d, a])
const rectP = (x: number, y: number, w: number, h: number): Poly => flat([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]])
function qb(p0: Pt, p1: Pt, p2: Pt, n = 24): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u
    out.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]])
  }
  return out
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
/** soft (blurred) tone fill — used for glass, shadows, paper bodies under the pen line */
function tone(ctx: Ctx, polys: Poly[], color: string, alpha: number, blur = 1.5) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = color
  ctx.fill(pathOf(polys))
  ctx.restore()
}
/** irregular closed blob (deckled paper, puddles) */
function blobPts(cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.12, n = 40): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU
    const k = 1 + wob * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 5 + seed * 2.3) * 0.3 + (rand(i % n, seed) - 0.5) * 0.4)
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return out
}
/** char-by-char handwriting along a line (vertical or horizontal), 楷体, brush landing blur */
function hand(ctx: Ctx, t: number, text: string, x: number, y: number, o: { size: number; t0: number; rate?: number; color: string; vertical?: boolean; step?: number; alpha?: number; font?: string }) {
  const chars = [...text]
  const rate = o.rate ?? 0.12
  const step = o.step ?? o.size * 1.15
  ctx.save()
  ctx.font = `400 ${o.size}px ${o.font ?? FONT.kai}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = o.color
  chars.forEach((ch, i) => {
    const p = prog(t, o.t0 + i * rate, o.t0 + i * rate + 0.3)
    if (p <= 0) return
    const punct = /[，。、；：！？”“]/.test(ch)
    let cx = o.vertical === false ? x + i * step : x
    let cy = o.vertical === false ? y : y + i * step
    if (punct && o.vertical !== false) { cx += o.size * 0.3; cy -= o.size * 0.3 }
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((rand(i, 17) - 0.5) * 0.05)
    const s = lerp(1.1, 1, ease.outCubic(p))
    ctx.scale(s, s)
    if (p < 1) ctx.filter = `blur(${(1 - p) * 2.5}px)`
    ctx.globalAlpha *= ease.outCubic(p) * (o.alpha ?? 1)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.restore()
}

// ───────────────────────────── the flower (D4 blooms, D7 withers) ─────────────────────────────
type FlowerO = {
  stem: number; leaves: number; bud: number; open: number[]; wither: number; fall?: number[]
  t: number; line: string; wash: number; washColor?: string; leafColor?: string; pulse?: number; gold: number; width?: number
}
function flower(ctx: Ctx, x: number, y: number, s: number, o: FlowerO) {
  const w = o.wither
  const P0: Pt = [0, 0]
  const P1: Pt = [lerp(16, 76, w), lerp(-130, -215, w)]
  const P2: Pt = [lerp(-14, 124, w), lerp(-250, -150, w)]
  const stem = qb(P0, P1, P2, 30)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const st: PenStyle = { width: (o.width ?? 2.2), color: o.line, alpha: 0.9, boil: 6, t: o.t, wobble: 0.7, seed: 41, taperOut: 8 }
  penStroke(ctx, flat(stem), o.stem, st)
  // leaves
  const leaf = (k: number, side: number, len: number, seed: number) => {
    if (o.leaves <= 0) return
    const i = Math.round(k * 30)
    const p = stem[i], q = stem[Math.min(30, i + 1)]
    const ta = Math.atan2(q[1] - p[1], q[0] - p[0])
    const a = ta + side * (0.85 + w * 1.0)
    const L = len * ease.outCubic(o.leaves)
    const tip: Pt = [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L]
    const m: Pt = [(p[0] + tip[0]) / 2, (p[1] + tip[1]) / 2]
    const nx = -Math.sin(a) * L * 0.28, ny = Math.cos(a) * L * 0.28
    const poly = flat([...qb(p, [m[0] + nx, m[1] + ny], tip, 10), ...qb(tip, [m[0] - nx, m[1] - ny], p, 10)])
    wash(ctx, [poly], o.leafColor ?? C.jade, { alpha: 0.32 * o.leaves * (1 - w * 0.5), blur: 1.5 })
    if (o.leaves > 0.6) hatch(ctx, [poly], { angle: a + side * 0.9, gap: 4, width: 0.6, color: o.line, alpha: 0.35 * o.leaves, seed, boil: 0, progress: prog(o.leaves, 0.6, 1) })
    for (let v = 1; v <= 3; v++) {
      const b: Pt = [lerp(p[0], tip[0], v * 0.2), lerp(p[1], tip[1], v * 0.2)]
      for (const sgn of [1, -1]) penStroke(ctx, flat([b, [b[0] + Math.cos(a + sgn * 0.7) * L * 0.18, b[1] + Math.sin(a + sgn * 0.7) * L * 0.18]]), o.leaves, { ...st, width: 0.6, alpha: 0.5, seed: seed + v * 3 + sgn })
    }
    penStroke(ctx, poly, o.leaves, { ...st, width: 1.3, seed })
    penStroke(ctx, flat([p, [lerp(p[0], tip[0], 0.8), lerp(p[1], tip[1], 0.8)]]), o.leaves, { ...st, width: 0.8, alpha: 0.6, seed: seed + 1 })
  }
  leaf(0.32, -1, 62, 51)
  leaf(0.52, 1, 50, 61)
  // head frame
  const Hd = P2
  const ha = Math.atan2(P2[1] - P1[1], P2[0] - P1[0])
  const U: Pt = [Math.cos(ha), Math.sin(ha)], R: Pt = [-Math.sin(ha), Math.cos(ha)]
  const toW = (lat: number, ax: number): Pt => [Hd[0] + R[0] * lat + U[0] * ax, Hd[1] + R[1] * lat + U[1] * ax]
  if (o.bud > 0) {
    const N = 6
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => Math.sin(b / N * TAU + 0.4) - Math.sin(a / N * TAU + 0.4))
    for (const i of order) {
      const ph = (i / N) * TAU + 0.4
      const op = o.open[i] ?? 0
      const bud = o.bud
      const tipB: Pt = [Math.cos(ph) * 5, 34 * bud]
      const tipO: Pt = [Math.cos(ph) * 54, 14 + Math.sin(ph) * 17]
      const tip: Pt = [lerp(tipB[0], tipO[0], op), lerp(tipB[1], tipO[1], op)]
      const base: Pt = [Math.cos(ph) * 5, 2]
      const mid: Pt = [lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.55)]
      const dl = n2(tip[0] - base[0], tip[1] - base[1])
      const wd = (7 + 15 * op) * bud
      const c1: Pt = [mid[0] - dl[1] * wd, mid[1] + dl[0] * wd]
      const c2: Pt = [mid[0] + dl[1] * wd, mid[1] - dl[0] * wd]
      let pts: Pt[] = [...qb(base, c1, tip, 10), ...qb(tip, c2, base, 10)].map(([a, b]) => toW(a, b))
      let alpha = 1
      const ft = o.fall?.[i] ?? -1
      if (ft >= 0) {
        let cx = 0, cy = 0
        for (const p of pts) { cx += p[0]; cy += p[1] }
        cx /= pts.length; cy /= pts.length
        const ang = ft * (1.4 + rand(i, 3)) * (i % 2 ? 1 : -1)
        const dx = ft * 46 + Math.sin(ft * 3 + i) * 22, dy = ft * ft * 120 + ft * 30
        const ca = Math.cos(ang), sa = Math.sin(ang)
        pts = pts.map(([px, py]) => [cx + (px - cx) * ca - (py - cy) * sa + dx, cy + (px - cx) * sa + (py - cy) * ca + dy])
        alpha = 1 - prog(ft, 1.0, 2.2)
      }
      if (alpha <= 0) continue
      const poly = flat(pts)
      ctx.save()
      ctx.globalAlpha *= alpha
      wash(ctx, [poly], o.washColor ?? C.rouge, { alpha: o.wash * (0.5 + 0.3 * (o.pulse ?? 0)) * (0.6 + 0.4 * op), blur: 1.8 })
      penStroke(ctx, poly, 1, { ...st, width: 1.3, seed: 70 + i })
      // veins
      if (op > 0.3) {
        const n = pts.length
        const b0 = pts[0], tp = pts[Math.floor(n / 2)]
        for (const f of [-0.18, 0, 0.18]) {
          const mx = lerp(b0[0], tp[0], 0.75) + (pts[Math.floor(n * 0.25)][0] - pts[Math.floor(n * 0.75)][0]) * f
          const my = lerp(b0[1], tp[1], 0.75) + (pts[Math.floor(n * 0.25)][1] - pts[Math.floor(n * 0.75)][1]) * f
          penStroke(ctx, flat([b0, [mx, my]]), prog(op, 0.3, 1), { ...st, width: 0.55, alpha: 0.45, seed: 80 + i * 3 + f * 10 })
        }
      }
      ctx.restore()
    }
    // inner ring: smaller petals cupped round the heart
    const inner = Math.min(...o.open.slice(0, 6)) * (1 - smoothstep(0.35, 0.7, w))
    if (inner > 0) {
      for (let i = 0; i < 5; i++) {
        const ph = (i / 5) * TAU + 1.1
        const base: Pt = [Math.cos(ph) * 3, 4]
        const tip: Pt = [Math.cos(ph) * 26 * inner, 16 + Math.sin(ph) * 9 + 10 * (1 - inner)]
        const mid: Pt = [lerp(base[0], tip[0], 0.5), lerp(base[1], tip[1], 0.5)]
        const dl = n2(tip[0] - base[0], tip[1] - base[1])
        const wd = 9 * inner
        const pts = [...qb(base, [mid[0] - dl[1] * wd, mid[1] + dl[0] * wd], tip, 8), ...qb(tip, [mid[0] + dl[1] * wd, mid[1] - dl[0] * wd], base, 8)].map(([a, b]) => toW(a, b))
        const poly = flat(pts)
        tone(ctx, [poly], o.washColor ?? C.rouge, 0.5 * o.wash * inner, 1.2)
        penStroke(ctx, poly, inner, { ...st, width: 1, seed: 110 + i })
      }
    }
    if (o.gold > 0) {
      const c = toW(0, 12)
      wash(ctx, [flat(blobPts(c[0], c[1], 9, 7, 3))], C.gold, { alpha: 0.7 * o.gold, blur: 1.5 })
      for (let k = 0; k < 4; k++) {
        const e = toW((k - 1.5) * 5, 22 + rand(k, 9) * 6)
        penStroke(ctx, flat([toW((k - 1.5) * 1.5, 8), e]), o.gold, { ...st, width: 0.9, seed: 90 + k })
      }
    }
  }
  ctx.restore()
}

// ───────────────────────────── the magnolia (玉兰) made of words ─────────────────────────────
type Mag = { x: number; y: number; s: number; hs?: number }
/** tepal outline (base → tip → base), pointed-ovate */
function tepal(bx: number, by: number, ang: number, L: number, wd: number): Pt[] {
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx
  const tip: Pt = [bx + dx * L, by + dy * L]
  const m: Pt = [bx + dx * L * 0.55, by + dy * L * 0.55]
  return [...qb([bx, by], [m[0] + px * wd, m[1] + py * wd], tip, 10), ...qb(tip, [m[0] - px * wd, m[1] - py * wd], [bx, by], 10)]
}
/** geometry of the branch, the open flower and a bud (world coords) */
function magGeo(m: Mag) {
  const { x, y, s } = m
  const hs = s * (m.hs ?? 1)
  const branch = qb([x, y], [x + 30 * s, y - 150 * s], [x - 18 * s, y - 262 * s], 20)
  const twig = qb(branch[9], [branch[9][0] + 60 * s, branch[9][1] - 30 * s], [branch[9][0] + 92 * s, branch[9][1] - 96 * s], 10)
  const H0: Pt = [x - 18 * s, y - 262 * s]
  const back: Pt[][] = [], front: Pt[][] = []
  // inner cupped tepals, rising
  for (const [a, L, w] of [[-1.57, 78, 21], [-1.85, 74, 22], [-1.29, 74, 22]] as const) back.push(tepal(H0[0], H0[1], a, L * hs, w * hs))
  // outer tepals, opening sideways and toward us
  for (const [a, L, w] of [[-2.45, 66, 22], [-0.72, 66, 22], [-2.05, 70, 24], [-1.08, 70, 24], [-1.62, 58, 26]] as const) front.push(tepal(H0[0], H0[1] + 6 * hs, a, L * hs, w * hs))
  const tw = twig[twig.length - 1]
  const bud = tepal(tw[0], tw[1], -1.25, 52 * s, 13 * s)
  const budSheath = tepal(tw[0], tw[1] + 2 * s, -1.25, 26 * s, 14 * s)
  return { branch, twig, H0, back, front, bud, budSheath }
}
function magMaskPetals(g: Ctx, m: Mag) {
  const G0 = magGeo(m)
  g.lineJoin = 'round'
  const fillP = (pts: Pt[], grey: string, lw: number) => {
    g.beginPath()
    pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)))
    g.closePath()
    g.fillStyle = grey
    g.fill()
    g.strokeStyle = '#fff'
    g.lineWidth = lw
    g.stroke()
  }
  for (const p of G0.back) fillP(p, '#9a9a9a', 4)
  for (const p of G0.front) fillP(p, '#c4c4c4', 4.5)
  fillP(G0.bud, '#b0b0b0', 4)
}
function magMaskBranch(g: Ctx, m: Mag) {
  const G0 = magGeo(m)
  g.lineCap = 'round'
  g.strokeStyle = '#f0f0f0'
  for (const [pts, w] of [[G0.branch, 9], [G0.twig, 6]] as const) {
    g.lineWidth = w * m.s
    g.beginPath()
    pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)))
    g.stroke()
  }
  g.fillStyle = '#9a9a9a'
  g.beginPath()
  G0.budSheath.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)))
  g.fill()
}

// ═════════════════════════════ D1 · Eddington House in the rain ═════════════════════════════
// A pinhole projection of the building (low camera, looking up) — perspective verticals converge.
const D1P = 0.28, D1F = 900, D1CY = 140
function pj(x: number, y: number, z: number): Pt {
  const dy = y - 4.5, c = Math.cos(D1P), s = Math.sin(D1P)
  const yc = dy * c - z * s
  const zc = Math.max(0.5, z * c + dy * s)
  return [960 + (D1F * x) / zc, D1CY - (D1F * yc) / zc]
}
const OC: Pt = [3, 52], RC = 3.5, LF = 36, LS = 24
const dF = n2(-1, 0.3), dS = n2(0.45, 1)
const nF: Pt = [-dF[1], dF[0]], nS: Pt = [dS[1], -dS[0]]
const aF = Math.atan2(nF[1], nF[0]), aS = Math.atan2(nS[1], nS[0])
function plan(off: number, exF = 0, exS = 0, part: 'all' | 'arc' = 'all'): Pt[] {
  const r = RC + off
  const tf: Pt = [OC[0] + nF[0] * r, OC[1] + nF[1] * r]
  const ts: Pt = [OC[0] + nS[0] * r, OC[1] + nS[1] * r]
  const pts: Pt[] = []
  if (part === 'all') for (let s = LF + exF; s > 0; s -= 1.5) pts.push([tf[0] + dF[0] * s, tf[1] + dF[1] * s])
  for (let i = 0; i <= 12; i++) {
    const a = lerp(aF, aS, i / 12)
    pts.push([OC[0] + Math.cos(a) * r, OC[1] + Math.sin(a) * r])
  }
  if (part === 'all') for (let s = 1.5; s <= LS + exS; s += 1.5) pts.push([ts[0] + dS[0] * s, ts[1] + dS[1] * s])
  return pts
}
const band = (y: number, off: number, exF = 0, exS = 0, part: 'all' | 'arc' = 'all'): Poly => flat(plan(off, exF, exS, part).map(([x, z]) => pj(x, y, z)))
const fP = (s: number, y: number, off = 0): Pt => {
  const r = RC + off
  return pj(OC[0] + nF[0] * r + dF[0] * s, y, OC[1] + nF[1] * r + dF[1] * s)
}
const sP = (s: number, y: number, off = 0): Pt => {
  const r = RC + off
  return pj(OC[0] + nS[0] * r + dS[0] * s, y, OC[1] + nS[1] * r + dS[1] * s)
}
const aP = (a: number, y: number, off = 0): Pt => pj(OC[0] + Math.cos(a) * (RC + off), y, OC[1] + Math.sin(a) * (RC + off))
const FL = (n: number) => (n <= 1 ? 0 : 5 + (n - 2) * 3.2)
const TOP = 28.6
const PF = Array.from({ length: 10 }, (_, k) => 1.2 + 3.8 * k) // front piers
const PS = Array.from({ length: 5 }, (_, k) => 1.5 + 4.6 * k) // side piers
const LIT = { n: 6, k: 1 } // the sixth floor

type D1Geo = { main: Poly[]; street: Poly[] }
let D1G: D1Geo | null = null
function d1geo(): D1Geo {
  if (D1G) return D1G
  const main: Poly[] = []
  // silhouette first (base, roof, ends), then bands, then piers
  main.push(band(TOP, 0))
  main.push(flat([fP(LF, 0), fP(LF, TOP)]))
  main.push(flat([sP(LS, 0), sP(LS, TOP)]))
  main.push(band(0, 0))
  // corner tower over the rounded corner
  main.push(band(TOP + 3.2, -0.5, 0, 0, 'arc'))
  for (let i = 0; i <= 4; i++) {
    const a = lerp(aF, aS, i / 4)
    main.push(flat([aP(a, TOP, -0.5), aP(a, TOP + 3.2, -0.5)]))
  }
  // balcony slabs (continuous Deco bands round the corner)
  for (let n = 2; n <= 8; n++) {
    main.push(band(FL(n), 0.7))
    main.push(band(FL(n) - 0.32, 0.7))
  }
  // vertical piers
  for (const s of PF) {
    main.push(flat([fP(s, 0, 0.35), fP(s, TOP + 0.6, 0.35)]))
    main.push(flat([fP(s + 0.7, 0, 0.35), fP(s + 0.7, TOP + 0.6, 0.35)]))
  }
  for (const s of PS) main.push(flat([sP(s, 0, 0.3), sP(s, TOP + 0.6, 0.3)]))
  // entrance canopy at the corner, with two slim posts
  main.push(band(4.0, 2.2, 0, 0, 'arc'))
  main.push(band(3.6, 2.2, 0, 0, 'arc'))
  for (const a of [lerp(aF, aS, 0.25), lerp(aF, aS, 0.75)]) main.push(flat([aP(a, 0, 2.0), aP(a, 3.6, 2.0)]))
  // neighbouring lower lane-house block continuing the street to the left
  const nb = (s: number, y: number): Pt => fP(s, y, -0.6)
  main.push(flat(Array.from({ length: 21 }, (_, i) => nb(LF + 0.6 + i * 1.6, 11.5))))
  main.push(flat([nb(LF + 0.6, 0), nb(LF + 0.6, 11.5)]))
  main.push(flat(Array.from({ length: 21 }, (_, i) => nb(LF + 0.6 + i * 1.6, 12.4))))
  for (let i = 0; i < 6; i++) {
    const s = LF + 2.5 + i * 5
    for (const y of [1.0, 5.0, 8.4]) main.push(quad(nb(s, y), nb(s + 2.2, y), nb(s + 2.2, y + 2.2), nb(s, y + 2.2)))
  }
  // street: kerb, tram tracks, wires
  const street: Poly[] = []
  street.push(band(0, 3.6, 30, 20))
  street.push(band(0, 8.8, 60, 30))
  street.push(band(0, 10.2, 60, 30))
  street.push(band(0, 12.4, 60, 30))
  street.push(band(0, 13.8, 60, 30))
  street.push(band(6.6, 9.5, 60, 30))
  street.push(band(6.6, 13.1, 60, 30))
  D1G = { main, street }
  return D1G
}
function d1Windows() {
  // static detail layer (no boil): window grids, balcony railings, hatching, cobbles. World offset OY.
  const OY = 360
  return cached('D1:detail', W, H + OY, (g) => {
    g.translate(0, OY)
    const st: PenStyle = { width: 1.0, color: C.lineNight, alpha: 0.55, wobble: 0.5, taperIn: 3, taperOut: 3, nib: false }
    // glass panes (dark), with Deco glazing bars
    const winF = (n: number, k: number) => {
      const s0 = PF[k] + 0.7 + 0.45, s1 = PF[k + 1] - 0.45, y0 = FL(n) + 0.8, y1 = FL(n) + 2.65
      return { s0, s1, y0, y1, q: [fP(s0, y0), fP(s1, y0), fP(s1, y1), fP(s0, y1)] as Pt[] }
    }
    for (let n = 2; n <= 8; n++) {
      for (let k = 0; k < PF.length - 1; k++) {
        const { s0, s1, y0, y1, q } = winF(n, k)
        tone(g, [quad(q[0], q[1], q[2], q[3])], 'rgb(6,8,16)', 0.45, 1)
        penStroke(g, quad(q[0], q[1], q[2], q[3]), 1, { ...st, seed: n * 40 + k })
        // casement split + 3 horizontal glazing bars
        const sm = (s0 + s1) / 2
        penStroke(g, flat([fP(sm, y0), fP(sm, y1)]), 1, { ...st, width: 0.7, seed: n * 40 + k + 3 })
        for (let b = 1; b <= 3; b++) {
          const yy = lerp(y0, y1, b / 4)
          penStroke(g, flat([fP(s0, yy), fP(s1, yy)]), 1, { ...st, width: 0.6, alpha: 0.4, seed: n * 40 + k + 5 + b })
        }
      }
      // side face
      for (let k = 0; k < PS.length - 1; k++) {
        const s0 = PS[k] + 0.6, s1 = PS[k + 1] - 0.6, y0 = FL(n) + 0.8, y1 = FL(n) + 2.65
        const q: Pt[] = [sP(s0, y0), sP(s1, y0), sP(s1, y1), sP(s0, y1)]
        tone(g, [quad(q[0], q[1], q[2], q[3])], 'rgb(6,8,16)', 0.45, 1)
        penStroke(g, quad(q[0], q[1], q[2], q[3]), 1, { ...st, alpha: 0.4, seed: n * 70 + k })
        const sm = (s0 + s1) / 2
        penStroke(g, flat([sP(sm, y0), sP(sm, y1)]), 1, { ...st, width: 0.6, alpha: 0.35, seed: n * 70 + k + 2 })
      }
      // round-corner windows: curved glass ribbon
      const y0 = FL(n) + 0.8, y1 = FL(n) + 2.65
      const ra = (y: number) => flat(Array.from({ length: 9 }, (_, i) => aP(lerp(aF + 0.12, aS - 0.12, i / 8), y, 0.05)))
      penStroke(g, ra(y0), 1, { ...st, seed: n * 90 })
      penStroke(g, ra(y1), 1, { ...st, seed: n * 90 + 1 })
      for (let i = 0; i <= 4; i++) {
        const a = lerp(aF + 0.12, aS - 0.12, i / 4)
        penStroke(g, flat([aP(a, y0, 0.05), aP(a, y1, 0.05)]), 1, { ...st, width: 0.7, seed: n * 90 + 3 + i })
      }
      // balcony railings: thin top rail + balusters along the front band and corner
      if (n >= 3) {
        const yr = FL(n) + 1.0
        penStroke(g, band(yr, 0.7, 0, 0), 1, { ...st, width: 0.7, alpha: 0.45, seed: n * 11 })
        for (let s = 0.4; s < LF; s += 0.55) {
          penStroke(g, flat([fP(s, FL(n), 0.7), fP(s, yr, 0.7)]), 1, { ...st, width: 0.5, alpha: 0.3, wobble: 0.2, taperIn: 1, taperOut: 1, seed: n * 1000 + s * 10 })
        }
        for (let i = 0; i <= 10; i++) {
          const a = lerp(aF, aS, i / 10)
          penStroke(g, flat([aP(a, FL(n), 0.7), aP(a, yr, 0.7)]), 1, { ...st, width: 0.5, alpha: 0.3, wobble: 0.2, seed: n * 1300 + i })
        }
      }
    }
    // pier hatching (the Deco vertical bands read darker), side face in shadow
    for (const s of PF) {
      const q = quad(fP(s, 0, 0.35), fP(s + 0.7, 0, 0.35), fP(s + 0.7, TOP + 0.6, 0.35), fP(s, TOP + 0.6, 0.35))
      hatch(g, [q], { angle: 1.45, gap: 3.2, width: 0.7, color: C.lineNight, alpha: 0.35, seed: s * 7 })
    }
    hatch(g, [quad(sP(0, 0), sP(LS, 0), sP(LS, TOP), sP(0, TOP))], { angle: 0.95, gap: 9, width: 0.8, color: C.lineNight, alpha: 0.22, seed: 3 })
    // corner shading (cylinder)
    const arcQ = flat([...Array.from({ length: 9 }, (_, i) => aP(lerp(aF + 0.6, aS, i / 8), 0)), ...Array.from({ length: 9 }, (_, i) => aP(lerp(aS, aF + 0.6, i / 8), TOP))])
    hatch(g, [arcQ], { angle: 1.5, gap: 5, width: 0.7, color: C.lineNight, alpha: 0.22, seed: 5 })
    // ground-floor shopfronts
    for (let k = 0; k < PF.length - 1; k++) {
      const s0 = PF[k] + 1.0, s1 = PF[k + 1] - 0.3
      const q: Pt[] = [fP(s0, 0.2), fP(s1, 0.2), fP(s1, 3.4), fP(s0, 3.4)]
      tone(g, [quad(q[0], q[1], q[2], q[3])], 'rgb(6,8,16)', 0.5, 1)
      penStroke(g, quad(q[0], q[1], q[2], q[3]), 1, { ...st, seed: 500 + k })
      for (let b = 1; b < 4; b++) {
        const ss = lerp(s0, s1, b / 4)
        penStroke(g, flat([fP(ss, 0.2), fP(ss, 3.4)]), 1, { ...st, width: 0.6, alpha: 0.35, seed: 520 + k * 4 + b })
      }
    }
    // wet cobbles between kerb and far track: little stones, sparse, in perspective
    for (let i = 0; i < 900; i++) {
      const off = 3.8 + rand(i, 1) * 16
      const s = -10 + rand(i, 2) * 70
      if (rand(i, 3) < 0.35) continue
      const r = RC + off
      const px = OC[0] + nF[0] * r + dF[0] * s, pz = OC[1] + nF[1] * r + dF[1] * s
      if (pz < 8) continue
      const c = pj(px, 0, pz)
      const sc = D1F /pz
      g.globalAlpha = 0.18 + rand(i, 4) * 0.18
      g.strokeStyle = C.lineNight
      g.lineWidth = 0.7
      g.beginPath()
      g.ellipse(c[0], c[1], sc * 0.16, sc * 0.05, -0.15, 0, TAU)
      g.stroke()
    }
    g.globalAlpha = 1
  })
}
function lamp(ctx: Ctx, t: number, x: number, z: number, s = 1, glow = 1) {
  const b = pj(x, 0, z), tp = pj(x, 4.6, z), arm = pj(x + 0.9, 4.4, z)
  const st = chalk(t, { width: 2.0 * s, seed: Math.round(x * 13 + z) })
  penStroke(ctx, flat([b, tp]), 1, st)
  penStroke(ctx, flat(qb(tp, pj(x + 0.4, 4.9, z), arm, 8)), 1, { ...st, width: 1.4 * s })
  const lp = pj(x + 0.9, 4.1, z)
  const sc = D1F /z
  penStroke(ctx, flat(blobPts(lp[0], lp[1], sc * 0.18, sc * 0.26, 3, 0.05, 16)), 1, { ...st, width: 1.2 * s })
  glowAt(ctx, lp[0], lp[1], sc * 1.6, 'rgba(200,214,240,ALPHA)', 0.22 * glow)
  // reflection on wet street
  const rb = pj(x + 0.9, 0, z + 0.8)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < 9; i++) {
    const yy = rb[1] + i * sc * 0.22
    const ww = sc * 0.25 * (1 - i / 10) * (0.7 + 0.5 * Math.sin(t * 6 + i * 1.7))
    ctx.globalAlpha = 0.16 * glow * (1 - i / 9)
    ctx.fillStyle = 'rgb(200,214,240)'
    ctx.fillRect(rb[0] - ww / 2, yy, ww, sc * 0.08)
  }
  ctx.restore()
}

const sceneD1: Scene = {
  id: 'D1-eddington',
  t0: T1,
  t1: T2,
  theme: 'night',
  trans: { kind: 'dissolve', dur: 0.8 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.12 })
    const g = d1geo()
    const k = ease.inOutSine(prog(lt, 0, 5.2))
    const cy = lerp(275, 420, k), z = lerp(1.06, 1.0, k), cx = lerp(930, 980, k)
    // sky: moon behind rain clouds (slow parallax)
    const mx = 1560 - (cx - 930) * 0.3, my = 92 - (cy - 285) * 0.35
    ctx.save()
    moon(ctx, mx, my + (1 - z) * 20, 38, { glow: 0.75, wet: 0.7, t, alpha: smoothstep(0.2, 1.6, lt) })
    const cl = [[mx - 230, my + 40, mx - 80, my + 22, mx + 60, my + 46, mx + 230, my + 30], [mx - 150, my + 70, mx + 10, my + 58, mx + 170, my + 76]]
    penDraw(ctx, cl, prog(lt, 0.6, 2.4), chalk(t, { width: 1.2, alpha: 0.4 }))
    ctx.restore()
    ctx.save()
    camera(ctx, cx, cy, z)
    // street layer
    penDraw(ctx, g.street, prog(lt, 0.1, 1.6), chalk(t, { width: 1.4, alpha: 0.75 }))
    // wet street: the building's lights smeared downward
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 40; i++) {
      const s = 1 + rand(i, 61) * 34
      const b = fP(s, 0, 4 + rand(i, 62) * 8)
      const len = 30 + rand(i, 63) * 70
      ctx.globalAlpha = 0.07 + 0.05 * Math.sin(t * 4 + i)
      ctx.fillStyle = 'rgb(200,214,240)'
      ctx.fillRect(b[0], b[1], 1.6 + rand(i, 64) * 2.5, len)
    }
    ctx.restore()
    // detail layer
    ctx.save()
    ctx.globalAlpha = smoothstep(0.8, 2.6, lt)
    ctx.drawImage(d1Windows(), 0, -360)
    ctx.restore()
    // lit window, sixth floor
    const lw = (() => {
      const s0 = PF[LIT.k] + 0.7 + 0.45, s1 = PF[LIT.k + 1] - 0.45, y0 = FL(LIT.n) + 0.8, y1 = FL(LIT.n) + 2.65
      return [fP(s0, y0), fP(s1, y0), fP(s1, y1), fP(s0, y1)] as Pt[]
    })()
    const lit = smoothstep(beatTime(218) - T1, beatTime(218) - T1 + 0.6, lt)
    if (lit > 0) {
      const c: Pt = [(lw[0][0] + lw[2][0]) / 2, (lw[0][1] + lw[2][1]) / 2]
      wash(ctx, [quad(lw[0], lw[1], lw[2], lw[3])], C.moon, { alpha: 0.75 * lit, blur: 2 })
      glowAt(ctx, c[0], c[1], 90, 'rgba(243,217,164,ALPHA)', 0.35 * lit)
    }
    // main linework, drawn on
    penDraw(ctx, g.main, ease.inOutSine(prog(lt, 0.0, 2.6)), chalk(t, { width: 1.7 }))
    // street lamps (the near one larger)
    const lp = smoothstep(0.6, 1.6, lt)
    ctx.save()
    ctx.globalAlpha *= lp
    lamp(ctx, t, -4.2, 32, 1, 1)
    lamp(ctx, t, -15, 46, 0.8, 0.8)
    lamp(ctx, t, 16.5, 44, 0.8, 0.7)
    ctx.restore()
    // the puddle and the wet moon (潮湿的月亮, 114.7)
    const pc: Pt = [6.0, 25]
    const pud = flat(blobPts(pc[0], pc[1], 4.8, 2.6, 7, 0.16, 28).map(([x, zz]) => pj(x, 0.01, zz)))
    const pctr = pj(pc[0], 0, pc[1])
    tone(ctx, [pud], 'rgb(4,6,12)', 0.45, 3)
    penStroke(ctx, pud, prog(lt, 1.0, 2.2), chalk(t, { width: 1.3, alpha: 0.6 }))
    const wet = 0.25 + 0.75 * smoothstep(114.4, 115.0, t)
    ctx.save()
    ctx.clip(pathOf([pud]))
    // reflected building edge + lit window streak
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = C.lineNight
    ctx.lineWidth = 1
    for (let i = 0; i < 10; i++) {
      const yy = pctr[1] - 26 + i * 6
      ctx.beginPath()
      ctx.moveTo(pctr[0] - 120 + Math.sin(t * 3 + i) * 4, yy)
      ctx.lineTo(pctr[0] - 40 + Math.sin(t * 3 + i) * 4, yy + 1)
      ctx.stroke()
    }
    ctx.restore()
    ctx.save()
    ctx.clip(pathOf([pud]))
    for (let sl = 0; sl < 10; sl++) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(pctr[0] - 300, pctr[1] - 40 + sl * 8, 600, 8)
      ctx.clip()
      ctx.translate(pctr[0] + 70 + Math.sin(t * 4 + sl * 1.3) * 4 * wet, pctr[1] - 2)
      ctx.scale(1, 0.5)
      moon(ctx, 0, 0, 44, { glow: 0.8 * wet, alpha: wet, t, wet: 0.5 * wet })
      ctx.restore()
    }
    // ripples on beats
    ctx.strokeStyle = C.lineNight
    for (let b = 216; b <= 226; b++) {
      const tb = beatTime(b)
      const age = t - tb
      if (age < 0 || age > 1.2) continue
      const rx = pctr[0] - 90 + rand(b, 1) * 200, ry = pctr[1] - 14 + rand(b, 2) * 26
      ctx.globalAlpha = 0.55 * (1 - age / 1.2)
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.ellipse(rx, ry, 4 + age * 40, (4 + age * 40) * 0.28, 0, 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
    ctx.restore() // camera
    // foreground: a lamp post very near the lens, left (parallax) + rain
    ctx.save()
    ctx.translate(-(cx - 930) * 1.6, -(cy - 285) * 1.4)
    penStroke(ctx, flat([[118, 900], [176, -60]]), prog(lt, 0.2, 1.2), chalk(t, { width: 5, alpha: 0.5, seed: 9 }))
    penStroke(ctx, flat([[132, 900], [188, -60]]), prog(lt, 0.2, 1.2), chalk(t, { width: 1.4, alpha: 0.35, seed: 10 }))
    ctx.restore()
    rain(ctx, t, { n: 240, alpha: 0.24, angle: 0.13, len: 38 })
    textRain(ctx, t, { n: 110, speed: 480, angle: 0.13, alpha: 0.38, size: 20 })
  },
}

// ═════════════════════════════ D2 · her room, writing; a tram below ═════════════════════════════
const D2WIN = { x0: 1000, y0: 52, x1: 1610, y1: 586 }
function d2Shelf() {
  return cached('D2:shelf', 440, 620, (g) => {
    const st: PenStyle = { width: 1.1, color: C.lineNight, alpha: 0.6, wobble: 0.6, taperIn: 3, taperOut: 3, nib: false }
    // books on shelves (spines of varying height, a few leaning)
    const shelves = [110, 225, 340, 455, 570]
    shelves.forEach((sy, si) => {
      let x = 20 + rand(si, 1) * 20
      while (x < 400) {
        const bw = 9 + rand(x, si) * 12
        const bh = 70 + rand(x, si + 3) * 36
        const lean = rand(x, si + 5) < 0.12 ? 0.18 : 0
        const p: Pt[] = [[x, sy], [x + bw, sy], [x + bw + lean * bh, sy - bh], [x + lean * bh, sy - bh], [x, sy]]
        if (rand(x, si + 9) < 0.5) tone(g, [flat(p)], 'rgb(5,7,14)', 0.25, 0.8)
        penStroke(g, flat(p), 1, { ...st, seed: x * 3 + si })
        if (rand(x, si + 11) < 0.6) penStroke(g, flat([[x + 2, sy - bh * 0.25], [x + bw - 2, sy - bh * 0.25]]), 1, { ...st, width: 0.6, alpha: 0.4, seed: x + 7 })
        x += bw + (lean ? bh * lean + 4 : 1.5)
        if (rand(x, si + 13) < 0.08) x += 30
      }
    })
  })
}
function tram(ctx: Ctx, t: number, x: number, y: number, s: number, glow: number) {
  // a 1940s Shanghai single-deck tram, side view, base at (x, y)
  const st = chalk(t, { width: 1.3 * s, seed: 31, alpha: 0.75 })
  const L = 190 * s, Hh = 58 * s
  const body: Poly = flat([[x - L / 2, y - 6 * s], [x + L / 2, y - 6 * s], [x + L / 2 + 4 * s, y - Hh * 0.5], [x + L / 2, y - Hh], [x - L / 2, y - Hh], [x - L / 2 - 4 * s, y - Hh * 0.5], [x - L / 2, y - 6 * s]])
  tone(ctx, [body], 'rgb(8,10,20)', 0.55, 1)
  penStroke(ctx, body, 1, st)
  penStroke(ctx, flat([[x - L / 2 + 6 * s, y - Hh - 5 * s], [x + L / 2 - 6 * s, y - Hh - 5 * s]]), 1, { ...st, width: 1 })
  for (let i = 0; i < 7; i++) {
    const wx = x - L / 2 + 14 * s + i * 24 * s
    const wr = rectP(wx, y - Hh + 10 * s, 17 * s, 20 * s)
    wash(ctx, [wr], 'rgb(210,220,240)', { alpha: 0.32 * glow, blur: 2 })
    penStroke(ctx, wr, 1, { ...st, width: 0.8, seed: 40 + i })
  }
  for (const wx of [-L * 0.33, L * 0.33]) penStroke(ctx, flat(blobPts(x + wx, y - 3 * s, 7 * s, 7 * s, wx, 0.02, 14)), 1, { ...st, width: 1 })
}
const sceneD2: Scene = {
  id: 'D2-room-tram',
  t0: T2,
  t1: T3,
  theme: 'night',
  trans: { kind: 'dissolve', dur: 0.6 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.06, seed: 7 })
    const k = ease.inOutSine(prog(lt, 0, 6.4))
    const ix = -70 * k, ex = -26 * k, fx = -130 * k
    const z = lerp(1.0, 1.04, k)
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.scale(z, z)
    ctx.translate(-W / 2, -H / 2)
    const wx0 = D2WIN.x0 + ix, wx1 = D2WIN.x1 + ix, wy0 = D2WIN.y0, wy1 = D2WIN.y1
    // ── exterior through the window (clipped) ──
    ctx.save()
    ctx.beginPath()
    ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0)
    ctx.clip()
    ctx.translate(ex, 0)
    nightPaper(ctx, t, { lift: 0.22, seed: 5 })
    moon(ctx, 1455, 112, 24, { glow: 0.8, wet: 0.4, t })
    const ex1 = chalk(t, { width: 1.1, alpha: 0.5 })
    // distant roofline with water tanks and chimneys
    const roof: Pt[] = []
    for (let x = 880; x <= 1760; x += 20) {
      const h = 236 + Math.sin(x * 0.013) * 8 - (rand(Math.floor(x / 60), 4) < 0.3 ? 18 : 0)
      roof.push([x, h], [x + 20, h])
    }
    penStroke(ctx, flat(roof), 1, ex1)
    for (let i = 0; i < 5; i++) {
      const tx = 920 + i * 170 + rand(i, 8) * 60
      penStroke(ctx, rectP(tx, 205 - rand(i, 2) * 20, 18, 26), 1, { ...ex1, seed: 300 + i })
    }
    // opposite building facade, seen from above
    penStroke(ctx, flat([[880, 268], [1760, 290]]), 1, { ...ex1, alpha: 0.6 })
    for (let r = 0; r < 3; r++) for (let c = 0; c < 11; c++) {
      const x = 900 + c * 78 + r * 2, y = 288 + r * 46 + c * 1.6
      const wr = rectP(x, y, 40, 26)
      tone(ctx, [wr], 'rgb(5,7,14)', 0.35, 0.8)
      penStroke(ctx, wr, 1, { ...ex1, width: 0.8, alpha: 0.35, seed: 400 + r * 20 + c })
    }
    penStroke(ctx, flat([[880, 432], [1760, 456]]), 1, { ...ex1, alpha: 0.6, seed: 2 })
    // overhead wires & tracks (receding gently)
    const wireY = (x: number, o: number) => 452 + o + (x - 880) * 0.03
    const trackY = (x: number, o: number) => 540 + o + (x - 880) * 0.04
    for (const o of [0, 10]) penStroke(ctx, flat([[880, wireY(880, o)], [1760, wireY(1760, o)]]), 1, { ...ex1, width: 0.9, seed: 5 + o })
    for (const o of [0, 14, 40, 54]) penStroke(ctx, flat([[880, trackY(880, o)], [1760, trackY(1760, o)]]), 1, { ...ex1, width: 1, seed: 9 + o })
    // wet street sheen
    hatch(ctx, [rectP(880, 498, 880, 100)], { angle: 0.04, gap: 7, width: 0.6, color: C.lineNight, alpha: 0.18, seed: 12 })
    // the tram
    const u = prog(t, 115.45, 121.4)
    if (u > 0 && u < 1) {
      const tx = lerp(800, 1820, u)
      const ty = trackY(tx, 8)
      tram(ctx, t, tx, ty, 1, 1)
      // trolley pole to the wire
      const base: Pt = [tx - 40, ty - 62], tip: Pt = [tx - 112, wireY(tx - 112, 0)]
      penStroke(ctx, flat([base, tip]), 1, chalk(t, { width: 1.2, alpha: 0.8 }))
      const sp = beatPulse(t, 9, 2)
      if (sp > 0.02) {
        glowAt(ctx, tip[0], tip[1], 60, 'rgba(210,225,255,ALPHA)', 0.8 * sp)
        // the spark lights her words for an instant
        ctx.save()
        ctx.font = `400 15px ${FONT.kai}`
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgb(225,232,250)'
        const sw = [...'我是非得听见电车响才睡得着觉的']
        const bi = beatIndexSafe(t)
        for (let j = 0; j < 14; j++) {
          const a = rand(j, bi) * TAU, r = 18 + rand(j, bi + 1) * 70
          ctx.globalAlpha = sp * 0.75 * (1 - r / 100)
          ctx.fillText(sw[(j + bi) % sw.length], tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r * 0.6)
        }
        ctx.restore()
        for (let j = 0; j < 3; j++) {
          const a = -0.4 - j * 0.9 + rand(beatIndexSafe(t), j) * 0.4
          penStroke(ctx, flat([tip, [tip[0] + Math.cos(a) * 16 * sp, tip[1] + Math.sin(a) * 16 * sp]]), 1, { width: 1, color: 'rgb(235,240,255)', alpha: sp, wobble: 0.4, nib: false })
        }
      }
      // reflection of tram windows on the wet street
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.12
      ctx.fillStyle = 'rgb(200,214,240)'
      for (let i = 0; i < 6; i++) ctx.fillRect(tx - 80 + i * 26, ty + 6 + (i % 2) * 3, 14, 26)
      ctx.restore()
    }
    rain(ctx, t, { n: 120, alpha: 0.22, angle: 0.1, len: 26 })
    textRain(ctx, t, { n: 50, speed: 300, angle: 0.1, alpha: 0.3, size: 14, x0: 900, x1: 1700 })
    ctx.restore()
    // glass sheen + streaks on the panes
    ctx.save()
    ctx.beginPath()
    ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0)
    ctx.clip()
    for (let i = 0; i < 26; i++) {
      const sx = wx0 + rand(i, 41) * (wx1 - wx0)
      const sy0 = wy0 + rand(i, 42) * 300
      const len = 40 + rand(i, 43) * 160
      const drip = ((t * (20 + rand(i, 44) * 30)) % 200)
      penStroke(ctx, flat([[sx, sy0 + drip], [sx + 2, sy0 + drip + len]]), 1, { width: 0.8, color: C.lineNight, alpha: 0.18, wobble: 1.4, wave: 30, nib: false, seed: i })
    }
    ctx.restore()
    // ── interior: window frame (Deco steel casement) ──
    const fst = chalk(t, { width: 2.0 })
    const fr: Poly[] = [
      rectP(wx0 - 14, wy0 - 14, wx1 - wx0 + 28, wy1 - wy0 + 28),
      rectP(wx0, wy0, wx1 - wx0, wy1 - wy0),
      flat([[(wx0 + wx1) / 2, wy0 + 120], [(wx0 + wx1) / 2, wy1]]),
      flat([[wx0, wy0 + 120], [wx1, wy0 + 120]]),
    ]
    penDraw(ctx, fr, prog(lt, -0.5, 0.8), fst)
    for (let r = 1; r <= 3; r++) {
      const y = wy0 + 120 + ((wy1 - wy0 - 120) * r) / 4
      penStroke(ctx, flat([[wx0, y], [wx1, y]]), 1, chalk(t, { width: 1.1, alpha: 0.6, seed: 600 + r }))
    }
    for (const c of [0.25, 0.75]) penStroke(ctx, flat([[lerp(wx0, wx1, c), wy0], [lerp(wx0, wx1, c), wy0 + 120]]), 1, chalk(t, { width: 1.1, alpha: 0.6, seed: 620 + c * 10 }))
    // sill
    penStroke(ctx, flat([[wx0 - 40, wy1 + 16], [wx1 + 40, wy1 + 16]]), 1, chalk(t, { width: 2.2, seed: 640 }))
    // curtain at right
    const cu: Poly[] = []
    for (let i = 0; i < 9; i++) {
      const x = wx1 + 6 + i * 13
      const pts: Pt[] = []
      for (let y = wy0 - 30; y <= wy1 + 40; y += 20) pts.push([x + Math.sin(y * 0.02 + i * 1.3 + t * 0.6) * 5 + (y - wy0) * 0.04, y])
      cu.push(flat(pts))
    }
    hatch(ctx, [rectP(wx1 + 4, wy0 - 30, 120, wy1 - wy0 + 70)], { angle: 1.52, gap: 6, width: 0.8, color: C.lineNight, alpha: 0.18, seed: 77 })
    penDraw(ctx, cu, 1, chalk(t, { width: 1.1, alpha: 0.55 }))
    penStroke(ctx, flat([[wx0 - 60, wy0 - 34], [wx1 + 150, wy0 - 34]]), 1, chalk(t, { width: 2.4, seed: 650 }))
    // moonlight spilling on the floor
    glowAt(ctx, 1080 + ix, 640, 320, 'rgba(200,214,240,ALPHA)', 0.08)
    // on the sill: teacup and a small radio
    ctx.save()
    ctx.translate(ix, 0)
    const cupx = 1088, cupy = wy1 + 14
    const cupSt = chalk(t, { width: 1.3, seed: 700 })
    penStroke(ctx, flat(qb([cupx - 18, cupy - 22], [cupx - 16, cupy + 2], [cupx, cupy], 8).concat(qb([cupx, cupy], [cupx + 16, cupy + 2], [cupx + 18, cupy - 22], 8))), 1, cupSt)
    penStroke(ctx, flat(blobPts(cupx, cupy - 22, 18, 4, 2, 0.02, 18)), 1, { ...cupSt, seed: 701 })
    penStroke(ctx, flat(blobPts(cupx + 22, cupy - 13, 6, 6, 4, 0.05, 12)), 1, { ...cupSt, seed: 702, width: 1 })
    penStroke(ctx, flat(blobPts(cupx, cupy + 1, 28, 5, 3, 0.03, 18)), 1, { ...cupSt, seed: 703, width: 1 })
    // steam
    for (let i = 0; i < 2; i++) {
      const pts: Pt[] = []
      for (let y = 0; y < 50; y += 5) pts.push([cupx - 5 + i * 9 + Math.sin(y * 0.15 + t * 2 + i) * 4, cupy - 30 - y])
      penStroke(ctx, flat(pts), 1, { ...cupSt, width: 0.8, alpha: 0.3, seed: 710 + i })
    }
    // radio (Deco arched cabinet)
    const rx = 1470, ry = wy1 + 14
    const rad: Poly = flat([[rx - 46, ry], [rx - 46, ry - 52], ...qb([rx - 46, ry - 52], [rx, ry - 96], [rx + 46, ry - 52], 12), [rx + 46, ry], [rx - 46, ry]])
    tone(ctx, [rad], 'rgb(6,8,16)', 0.4)
    penStroke(ctx, rad, 1, chalk(t, { width: 1.4, seed: 720 }))
    penStroke(ctx, flat(qb([rx - 30, ry - 40], [rx, ry - 74], [rx + 30, ry - 40], 10)), 1, chalk(t, { width: 1, seed: 721, alpha: 0.6 }))
    for (let i = 0; i < 4; i++) penStroke(ctx, flat([[rx - 26 + i * 17, ry - 40], [rx - 26 + i * 17, ry - 14]]), 1, chalk(t, { width: 0.8, alpha: 0.5, seed: 722 + i }))
    penStroke(ctx, flat(blobPts(rx - 22, ry - 7, 4, 4, 1, 0.05, 10)), 1, chalk(t, { width: 0.9, seed: 730 }))
    penStroke(ctx, flat(blobPts(rx + 22, ry - 7, 4, 4, 2, 0.05, 10)), 1, chalk(t, { width: 0.9, seed: 731 }))
    ctx.restore()
    // ── her, writing (midground) ──
    ctx.save()
    ctx.translate(ix * 1.05, 0)
    glowAt(ctx, 828, 318, 300, 'rgba(240,200,140,ALPHA)', 0.22)
    textImage(ctx, {
      key: 'D2-her', cell: 9, emerge: ease.inOutSine(prog(lt, 0, 3.2)), order: 'sweepYUp', scatter: 80, t, gamma: 1.5, color: '#dfe4f0',
      corpus: '我是非得听见电车响才睡得着觉的公寓生活记趣',
      draw: (g) => eileen(g, 'writing', { x: 690, y: 606, h: 330, color: '#fff', dress: '#888', fill: 1, weight: 3, boil: 0 }),
    })
    eileen(ctx, 'writing', { x: 690, y: 606, h: 330, t, color: C.lineNight, progress: prog(lt, 1.0, 3.6), fill: 0.6, alpha: 0.55 })
    ctx.restore()
    // manuscript stacks on the floor beside the desk
    ctx.save()
    ctx.translate(ix * 1.1, 0)
    for (let i = 0; i < 9; i++) {
      const y = 600 - i * 6, sk = (rand(i, 3) - 0.5) * 8
      penStroke(ctx, flat([[880 + sk, y], [960 + sk, y - 3]]), 1, chalk(t, { width: 1, alpha: 0.55, seed: 800 + i }))
    }
    penStroke(ctx, flat([[882, 600], [878, 552], [962, 548], [958, 597]]), 1, chalk(t, { width: 1.2, alpha: 0.6, seed: 820 }))
    ctx.restore()
    // ── bookshelf (foreground left, fastest parallax) ──
    ctx.save()
    ctx.translate(fx, 0)
    const sx = 80, sy = 30
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.drawImage(d2Shelf(), sx, sy)
    ctx.restore()
    const sh: Poly[] = [flat([[sx, sy - 10], [sx, sy + 640]]), flat([[sx + 440, sy - 10], [sx + 440, sy + 640]])]
    for (const yy of [110, 225, 340, 455, 570]) sh.push(flat([[sx - 6, sy + yy], [sx + 446, sy + yy]]))
    penDraw(ctx, sh, 1, chalk(t, { width: 2.2 }))
    // gramophone horn on top of the shelf
    const gx = sx + 300, gy = sy - 6
    penStroke(ctx, rectP(gx - 40, gy - 30, 80, 30), 1, chalk(t, { width: 1.3, seed: 900 }))
    penStroke(ctx, flat(qb([gx + 10, gy - 30], [gx + 10, gy - 70], [gx - 40, gy - 110], 10)), 1, chalk(t, { width: 1.3, seed: 901 }))
    penStroke(ctx, flat(qb([gx + 22, gy - 30], [gx + 30, gy - 80], [gx + 70, gy - 130], 10)), 1, chalk(t, { width: 1.3, seed: 902 }))
    penStroke(ctx, flat(blobPts(gx + 15, gy - 122, 58, 20, 5, 0.04, 24).map(([a, b]) => [a, b] as Pt)), 1, chalk(t, { width: 1.3, seed: 903 }))
    ctx.restore()
    ctx.restore()
  },
}
function beatIndexSafe(t: number) {
  return Math.floor(beatPos(t))
}
function beatPos(t: number) {
  // local copy to avoid import churn: nearest lower beat index via binary search of beatTime
  let lo = 200, hi = 360
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1
    if (beatTime(m) <= t) lo = m
    else hi = m - 1
  }
  return lo
}

// ═════════════════════════════ D3 · her door, the note ═════════════════════════════
const AI_QUOTE = '于千万人之中遇见你所要遇见的人，于千万年之中，时间的无涯的荒野里，没有早一步，也没有晚一步，刚巧赶上了，那也没有别的话可说，惟有轻轻地问一声：“噢，你也在这里吗？”'
function cobweb(cx: number, cy: number, a0: number, a1: number, R: number, seed: number): Poly[] {
  const n = 6
  const rad: Pt[][] = []
  const out: Poly[] = []
  for (let i = 0; i < n; i++) {
    const a = lerp(a0, a1, i / (n - 1)) + (rand(i, seed) - 0.5) * 0.12
    const L = R * (0.75 + rand(i, seed + 1) * 0.35)
    rad.push([[cx, cy], [cx + Math.cos(a) * L, cy + Math.sin(a) * L]])
    out.push(flat(rad[i]))
  }
  for (let r = 1; r <= 6; r++) {
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
      const a = lerp(a0, a1, i / (n - 1))
      const rr = (R * r) / 7 * (0.92 + rand(i * 7 + r, seed + 2) * 0.16)
      const p: Pt = [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
      if (i > 0) {
        const q = pts[pts.length - 1]
        const m: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        pts.push([lerp(m[0], cx, 0.12), lerp(m[1], cy, 0.12)])
      }
      pts.push(p)
    }
    out.push(flat(pts))
  }
  // a torn loose strand
  out.push(flat([[cx + Math.cos(a1) * R * 0.5, cy + Math.sin(a1) * R * 0.5], [cx + Math.cos(a1) * R * 0.7 + 6, cy + Math.sin(a1) * R + 30]]))
  return out
}
function d3Static() {
  return cached('D3:static', W, H + 200, (g) => {
    // left foreground wall in shade + parquet + wall texture
    hatch(g, [rectP(0, 0, 230, H + 200)], { angle: 1.2, gap: 6, width: 1, color: C.ink, alpha: 0.35, seed: 4 })
    hatch(g, [rectP(0, 0, 230, H + 200)], { angle: -0.4, gap: 11, width: 0.8, color: C.ink, alpha: 0.2, seed: 5 })
    // parquet boards in one-point perspective toward the door
    const VP: Pt = [950, 250]
    for (let i = -16; i <= 16; i++) {
      const x = 950 + i * 70
      const k = (804 + 200 - 250) / (500 - 250)
      const x2 = VP[0] + (x - VP[0]) * k
      penStroke(g, flat([[x, 500], [x2, 1004]]), 1, { width: 0.9, color: C.ink, alpha: 0.35, wobble: 0.6, nib: false, seed: 30 + i })
    }
    for (let j = 0; j < 9; j++) {
      const y = 500 + Math.pow(j / 8, 1.8) * 500
      penStroke(g, flat([[0, y], [W, y]]), 1, { width: 0.7, color: C.ink, alpha: 0.18, wobble: 0.8, nib: false, seed: 60 + j })
    }
    // wallpaper: faint Deco fan pattern
    for (let r = 0; r < 6; r++) for (let c = 0; c < 22; c++) {
      const x = 250 + c * 76 + (r % 2) * 38, y = 40 + r * 78
      if (x > 735 && x < 1165) continue
      for (let a = 0; a < 3; a++) {
        const rr = 12 + a * 7
        const pts: Pt[] = []
        for (let i = 0; i <= 8; i++) {
          const an = Math.PI + (i / 8) * Math.PI
          pts.push([x + Math.cos(an) * rr, y + 20 + Math.sin(an) * rr])
        }
        penStroke(g, flat(pts), 1, { width: 0.6, color: C.ink, alpha: 0.12, wobble: 0.4, nib: false, seed: r * 100 + c * 3 + a })
      }
    }
  })
}
const sceneD3: Scene = {
  id: 'D3-door-note',
  t0: T3,
  t1: T4,
  theme: 'paper',
  trans: { kind: 'cut', dur: 0 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.36 })
    const k = ease.inOutSine(prog(lt, 0, 6.6))
    ctx.save()
    camera(ctx, lerp(930, 905, k), lerp(330, 372, k), lerp(1.0, 1.12, k))
    ctx.drawImage(d3Static(), 0, 0)
    // baseboard + wall/floor line
    penDraw(ctx, [flat([[230, 500], [762, 500]]), flat([[1138, 500], [1990, 500]]), flat([[230, 484], [762, 484]]), flat([[1138, 484], [1990, 484]])], prog(lt, 0, 0.8), ink(t, { width: 1.4 }))
    // door: casing, transom, leaf, panels, knob
    const door: Poly[] = [
      rectP(760, 12, 380, 488), rectP(778, 26, 344, 474),
      rectP(792, 30, 316, 62), flat([[778, 100], [1122, 100]]), flat([[778, 106], [1122, 106]]),
      rectP(792, 112, 316, 388),
      rectP(822, 142, 112, 300), rectP(966, 142, 112, 300),
      rectP(832, 152, 92, 280), rectP(976, 152, 92, 280),
    ]
    tone(ctx, [rectP(792, 112, 316, 388)], 'rgb(120,82,52)', 0.18, 2)
    penDraw(ctx, door, ease.inOutSine(prog(lt, 0, 1.6)), ink(t, { width: 1.9 }))
    penStroke(ctx, flat(blobPts(1086, 318, 9, 9, 2, 0.04, 14)), prog(lt, 1.2, 1.6), ink(t, { width: 1.5, seed: 50 }))
    penStroke(ctx, flat([[1086, 338], [1086, 350]]), prog(lt, 1.3, 1.6), ink(t, { width: 2.2, seed: 51 }))
    // frosted transom glass + transom grid
    wash(ctx, [rectP(794, 32, 312, 58)], 'rgb(250,240,214)', { alpha: 0.55, blur: 3 })
    for (const xx of [870, 950, 1030]) penStroke(ctx, flat([[xx, 30], [xx, 92]]), prog(lt, 0.6, 1.4), ink(t, { width: 1, seed: xx }))
    // the hat's shadow on the transom (he stands outside; never a face)
    const hx = t < 124 ? lerp(1250, 980, ease.outCubic(prog(t, 121.7, 122.9))) : lerp(980, 640, ease.inCubic(prog(t, 126.0, 127.2)))
    const hy = 82 + Math.sin(t * 1.3) * 1.5
    ctx.save()
    ctx.beginPath()
    ctx.rect(794, 32, 312, 58)
    ctx.clip()
    const hat = pathPolys(`M ${hx - 64} ${hy + 6} Q ${hx - 52} ${hy - 6} ${hx - 32} ${hy - 8} L ${hx - 27} ${hy - 44} Q ${hx} ${hy - 58} ${hx + 27} ${hy - 44} L ${hx + 32} ${hy - 8} Q ${hx + 52} ${hy - 6} ${hx + 64} ${hy + 6} Q ${hx} ${hy + 14} ${hx - 64} ${hy + 6} Z M ${hx - 40} ${hy + 8} L ${hx + 40} ${hy + 8} L ${hx + 46} ${hy + 60} L ${hx - 46} ${hy + 60} Z`)
    tone(ctx, hat, 'rgb(58,40,28)', 0.5, 4)
    ctx.restore()
    // cobwebs in the corners of the door and the transom (爬满蛛网的门窗)
    const cw = prog(t, 121.2, 124.6)
    penDraw(ctx, cobweb(778, 26, 0, Math.PI / 2, 120, 3), cw, ink(t, { width: 0.7, alpha: 0.55, wobble: 0.6 }))
    penDraw(ctx, cobweb(1122, 26, Math.PI / 2, Math.PI, 84, 7), prog(t, 122.0, 125.0), ink(t, { width: 0.7, alpha: 0.5, wobble: 0.6 }))
    penDraw(ctx, cobweb(230, 0, 0.1, Math.PI / 2, 150, 11), prog(t, 121.6, 124.8), ink(t, { width: 0.7, alpha: 0.45, wobble: 0.6 }))
    // light under the door + his feet's shadows
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const lg = ctx.createLinearGradient(0, 494, 0, 540)
    lg.addColorStop(0, 'rgba(255,236,190,0.55)')
    lg.addColorStop(1, 'rgba(255,236,190,0)')
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.moveTo(792, 497)
    ctx.lineTo(1108, 497)
    ctx.lineTo(1160, 560)
    ctx.lineTo(740, 560)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    const feet = envelope(t, 122.6, 126.6, 0.5, 0.6)
    if (feet > 0) {
      for (const fx of [900, 988]) tone(ctx, [flat([[fx - 22, 497], [fx + 22, 497], [fx + 34, 548], [fx - 34, 548]])], 'rgb(70,46,30)', 0.35 * feet, 5)
    }
    // the note slides in on the beat
    const nt0 = beatTime(241), nt1 = beatTime(244)
    const np = ease.outCubic(prog(t, nt0, nt1))
    if (np > 0) {
      const nx = lerp(960, 905, np), ny = lerp(492, 556, np), rot = lerp(0, -0.28, np)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 499, W, 600)
      ctx.clip()
      ctx.translate(nx, ny)
      ctx.rotate(rot)
      ctx.scale(1, lerp(0.35, 0.5, np))
      const np1 = rectP(-46, -34, 92, 68)
      tone(ctx, [rectP(-40, -24, 92, 68)], 'rgb(60,40,26)', 0.25, 5)
      wash(ctx, [np1], 'rgb(248,242,226)', { alpha: 0.95, blur: 1 })
      penStroke(ctx, np1, 1, ink(t, { width: 2.2, seed: 70 }))
      penStroke(ctx, flat([[-46, 0], [46, 0]]), 1, ink(t, { width: 1.2, alpha: 0.5, seed: 71 }))
      ctx.restore()
    }
    // 《爱》 on 稿纸, pinned to the wall left of the door (their meeting)
    ctx.save()
    ctx.translate(420, 74)
    ctx.rotate(-0.03)
    const sheet: Poly = flat([[0, 0], [262, 3], [264, 446], [-2, 444], [0, 0]])
    tone(ctx, [rectP(8, 10, 262, 444)], 'rgb(70,45,26)', 0.2, 8)
    tone(ctx, [sheet], 'rgb(246,238,218)', 0.85, 1)
    penStroke(ctx, sheet, prog(lt, 0.1, 0.9), ink(t, { width: 1.1, alpha: 0.6, seed: 80 }))
    penStroke(ctx, flat(blobPts(131, 8, 4, 4, 1, 0.05, 10)), 1, ink(t, { width: 1.8, seed: 81 }))
    hand(ctx, t, '爱', 236, 34, { size: 24, t0: 121.3, color: C.ink, alpha: 0.9 })
    writeVertical(ctx, t, { text: AI_QUOTE, x: 216, y: 18, size: 20, t0: 121.6, rate: 0.066, perCol: 15, color: C.ink, grid: null })
    ctx.restore()
    ctx.restore()
  },
}

// ═════════════════════════════ D4 · the photograph · dust · the flower ═════════════════════════════
const INSCR = '见了他她变得很低很低低到尘埃里但她心里是欢喜的从尘埃里开出花来'
const GY = 520 // dust drift / flower root on the tabletop
const FX = 720
const TB = 300, TF = 560 // table back / front edge
const PH = { x: 1320, y: 268, w: 270, h: 380, rot: 0.04 }
const D4_OPEN = [262, 263, 264, 265, 266, 267, 268].map((b) => beatTime(b))
// the window light shaft (world coords)
const SHAFT: Poly = flat([[150, 240], [500, 240], [1010, GY + 20], [470, GY + 20], [150, 240]])
function d4Cam(t: number): [number, number, number] {
  const a = ease.inOutSine(prog(t, 134.6, 136.6))
  const b = ease.inOutSine(prog(t, 136.6, 143.6))
  const p0 = prog(t, T4, 134.6)
  const c0: [number, number, number] = [lerp(1290, 1260, p0), lerp(296, 300, p0), lerp(1.14, 1.2, p0)]
  const c1: [number, number, number] = [lerp(920, 880, b), lerp(338, 340, b), lerp(1.0, 1.05, b)]
  return [lerp(c0[0], c1[0], a), lerp(c0[1], c1[1], a), lerp(c0[2], c1[2], a)]
}
function d4Still() {
  return cached('D4:still', 2400, 900, (g) => {
    g.translate(200, 100)
    const IC = C.lineNight // night interior: chalk lines on indigo
    const st: PenStyle = { width: 1.4, color: IC, alpha: 0.6, wobble: 0.8, nib: false, boil: 0 }
    const L = (pts: Pt[], o: PenStyle = {}) => penStroke(g, flat(pts), 1, { ...st, ...o })
    // wall: faint vertical paper stripes and a picture rail
    for (let x = -180; x < 2200; x += 46) L([[x, -100], [x + 2, TB]], { width: 0.6, alpha: 0.1, seed: x })
    L([[-200, 40], [2200, 44]], { width: 1, alpha: 0.4, seed: 2 })
    // the window, upper left (light comes from here)
    L([[120, -110], [120, 250], [530, 250], [530, -110]], { width: 2, seed: 3 })
    L([[100, 262], [552, 262]], { width: 2.2, seed: 4 })
    L([[325, -110], [325, 250]], { width: 1.2, seed: 5 })
    for (const y of [-20, 70, 160]) L([[120, y], [530, y]], { width: 0.9, alpha: 0.6, seed: y + 9 })
    hatch(g, [rectP(540, -110, 70, 380)], { angle: 1.5, gap: 5, width: 0.7, color: IC, alpha: 0.25, seed: 6 })
    for (let i = 0; i < 6; i++) L(Array.from({ length: 12 }, (_, k) => [548 + i * 11 + Math.sin(k * 0.9 + i) * 4, -110 + k * 34] as Pt), { width: 0.8, alpha: 0.5, seed: 30 + i })
    // table: back edge, front edge, apron, grain
    L([[-200, TB], [2200, TB + 4]], { width: 1.6, seed: 7 })
    L([[-200, TF], [2200, TF - 6]], { width: 2.2, seed: 8 })
    L([[-200, TF + 8], [2200, TF + 2]], { width: 1, alpha: 0.6, seed: 9 })
    hatch(g, [flat([[-200, TF + 8], [2200, TF + 2], [2200, 800], [-200, 800]])], { angle: 1.45, gap: 6, width: 0.8, color: IC, alpha: 0.2, seed: 10 })
    for (let i = 0; i < 26; i++) {
      const y = TB + 8 + i * 10 + rand(i, 2) * 4
      const x0 = -200 + rand(i, 3) * 900
      L(Array.from({ length: 10 }, (_, k) => [x0 + k * 150, y + Math.sin(k * 0.7 + i) * 2.5] as Pt), { width: 0.6, alpha: 0.13, seed: 50 + i })
    }
    // lace doily under the photograph
    const dc: Pt = [1310, 470]
    const sc: Pt[] = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU
      const r = 1 + 0.06 * Math.abs(Math.sin(a * 12))
      sc.push([dc[0] + Math.cos(a) * 190 * r, dc[1] + Math.sin(a) * 40 * r])
    }
    tone(g, [flat(sc)], 'rgb(200,210,232)', 0.14, 1)
    L(sc, { width: 1.1, alpha: 0.7, seed: 11 })
    for (const k of [0.78, 0.55, 0.32]) L(blobPts(dc[0], dc[1], 190 * k, 40 * k, k * 10, 0.01, 48), { width: 0.7, alpha: 0.5, seed: 12 + k * 10 })
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU
      g.globalAlpha = 0.4
      g.fillStyle = IC
      g.beginPath()
      g.arc(dc[0] + Math.cos(a) * 190 * 0.67, dc[1] + Math.sin(a) * 40 * 0.67, 1.6, 0, TAU)
      g.fill()
      L([[dc[0] + Math.cos(a) * 190 * 0.32, dc[1] + Math.sin(a) * 40 * 0.32], [dc[0] + Math.cos(a) * 190 * 0.55, dc[1] + Math.sin(a) * 40 * 0.55]], { width: 0.5, alpha: 0.35, seed: 100 + i })
    }
    g.globalAlpha = 1
    // teacup and saucer, back left, in the light
    const tc: Pt = [470, 392]
    tone(g, [flat(blobPts(tc[0] + 10, tc[1] + 18, 66, 12, 1, 0.02, 24))], 'rgb(60,40,24)', 0.18, 6)
    L(blobPts(tc[0], tc[1] + 10, 60, 14, 2, 0.02, 30), { seed: 13 })
    L(blobPts(tc[0], tc[1] + 8, 30, 6, 3, 0.02, 20), { width: 0.8, alpha: 0.5, seed: 14 })
    L([...qb([tc[0] - 36, tc[1] - 38], [tc[0] - 34, tc[1] + 8], [tc[0], tc[1] + 8], 10), ...qb([tc[0], tc[1] + 8], [tc[0] + 34, tc[1] + 8], [tc[0] + 36, tc[1] - 38], 10)], { seed: 15 })
    L(blobPts(tc[0], tc[1] - 38, 36, 8, 4, 0.02, 24), { seed: 16 })
    L(blobPts(tc[0], tc[1] - 37, 30, 5.5, 5, 0.02, 20), { width: 0.6, alpha: 0.5, seed: 17 })
    L(qb([tc[0] + 34, tc[1] - 28], [tc[0] + 62, tc[1] - 26], [tc[0] + 30, tc[1] - 6], 10), { seed: 18 })
    tone(g, [flat(blobPts(tc[0], tc[1] - 37, 29, 5, 6, 0.02, 16))], 'rgb(150,100,50)', 0.35, 1)
    hatch(g, [flat([...qb([tc[0] + 4, tc[1] - 34], [tc[0] + 34, tc[1] - 30], [tc[0] + 30, tc[1]], 8), [tc[0] + 4, tc[1] + 6]])], { angle: 1.3, gap: 3.5, width: 0.6, color: IC, alpha: 0.3, seed: 19 })
    // hand mirror lying on the table, back middle
    const mc: Pt = [940, 352]
    tone(g, [flat(blobPts(mc[0] + 6, mc[1] + 8, 52, 15, 7, 0.02, 24))], 'rgb(60,40,24)', 0.2, 5)
    L(blobPts(mc[0], mc[1], 50, 15, 8, 0.02, 30), { seed: 20 })
    L(blobPts(mc[0], mc[1], 42, 11, 9, 0.02, 26), { width: 0.8, alpha: 0.6, seed: 21 })
    L([[mc[0] + 46, mc[1] + 6], [mc[0] + 140, mc[1] + 26]], { width: 1.4, seed: 22 })
    L([[mc[0] + 44, mc[1] + 11], [mc[0] + 138, mc[1] + 32]], { width: 1.4, seed: 23 })
    tone(g, [flat(blobPts(mc[0] - 8, mc[1] - 3, 26, 5, 10, 0.05, 16))], 'rgb(255,250,236)', 0.6, 3)
    // a 1940s magazine 《杂志》 lying at the front right, her name on the cover
    g.save()
    g.translate(-30, -46)
    const mg: Pt[] = [[880, 470], [1078, 452], [1110, 548], [906, 566]]
    tone(g, [flat([[892, 480], [1090, 462], [1122, 558], [918, 576]])], 'rgb(60,40,24)', 0.22, 6)
    tone(g, [flat(mg)], 'rgb(196,200,214)', 0.3, 0.8)
    L([...mg, mg[0]], { width: 1.3, seed: 24 })
    L([[884, 474], [1080, 456]].map(([x, y]) => [x + 2, y + 2] as Pt), { width: 0.7, alpha: 0.5, seed: 25 })
    g.save()
    g.translate(900, 488)
    g.transform(1, -0.09, 0.27, 1, 0, 0)
    g.font = `700 30px ${FONT.kai}`
    g.fillStyle = C.rouge
    g.globalAlpha = 0.85
    g.fillText('杂志', 8, 4)
    g.font = `400 13px ${FONT.zh}`
    g.fillStyle = IC
    g.globalAlpha = 0.75
    g.fillText('张爱玲', 120, 2)
    g.restore()
    L([[922, 504], [1060, 492], [1080, 542], [940, 554], [922, 504]].map(([x, y]) => [x, y] as Pt), { width: 0.8, alpha: 0.6, seed: 26 })
    hatch(g, [flat([[922, 504], [1060, 492], [1080, 542], [940, 554]])], { angle: -0.6, gap: 5, width: 0.5, color: IC, alpha: 0.2, seed: 27 })
    g.restore()
  })
}
function d4Drift() {
  // the low drift of dust: fine grey matter on the tabletop around the flower's root
  return cached('D4:drift', 700, 80, (g) => {
    for (let i = 0; i < 2600; i++) {
      const u = rand(i, 1) * 2 - 1
      const prof = Math.exp(-u * u * 3.2)
      const x = 350 + u * 330
      const y = 70 - rand(i, 2) * prof * 26 - rand(i, 6) * 3
      g.globalAlpha = 0.2 + rand(i, 3) * 0.45
      g.fillStyle = rand(i, 4) < 0.7 ? 'rgb(110,100,92)' : 'rgb(70,58,48)'
      g.beginPath()
      g.arc(x, y, 0.5 + rand(i, 5) * 1.2, 0, TAU)
      g.fill()
    }
  })
}
const sceneD4: Scene = {
  id: 'D4-photo-dust-flower',
  t0: T4,
  t1: T5,
  theme: 'night',
  trans: { kind: 'ink', dur: 1.0 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.1, seed: 7 })
    const [cx, cy, z] = d4Cam(t)
    ctx.save()
    camera(ctx, cx, cy, z)
    // the window's night sky: the moon beyond the panes
    ctx.save()
    ctx.beginPath()
    ctx.rect(122, -110, 406, 358)
    ctx.clip()
    moon(ctx, 420, 40, 30, { glow: 0.7, t })
    ctx.restore()
    // warm lamp light pooling on the table (dusk interior)
    glowAt(ctx, 1150, 300, 900, 'rgba(240,196,140,ALPHA)', 0.16)
    // the still life (static, cached), then the live pen on the table's edges
    ctx.drawImage(d4Still(), -200, -100)
    penStroke(ctx, flat([[-200, TF], [2200, TF - 6]]), 1, chalk(t, { width: 1.8, alpha: 0.5, seed: 8 }))
    // moonlight shaft from the window across the table
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const sg = ctx.createLinearGradient(300, 240, 760, GY)
    sg.addColorStop(0, 'rgba(200,214,240,0.20)')
    sg.addColorStop(1, 'rgba(200,214,240,0.06)')
    ctx.fillStyle = sg
    ctx.filter = 'blur(10px)'
    ctx.fill(pathOf([SHAFT]))
    ctx.restore()
    // the low drift of dust (低到尘埃里): settles from 130 s on
    // — a low drift of tiny characters from her inscription
    const heap = smoothstep(129.6, 136.0, t)
    ctx.save()
    ctx.globalAlpha = heap
    tone(ctx, [flat(blobPts(FX, GY - 4, 300, 10, 4, 0.1, 30))], 'rgb(150,160,186)', 0.12, 8)
    ctx.restore()
    textImage(ctx, {
      key: 'D4-drift', cell: 7, emerge: heap, order: 'random', scatter: 30, color: '#b4bed4', corpus: INSCR, gamma: 1.0, alpha: 0.9, seed: 4,
      draw: (g) => {
        const gr = g.createRadialGradient(FX, GY, 10, FX, GY, 330)
        gr.addColorStop(0, '#fff')
        gr.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = gr
        g.save()
        g.translate(FX, GY)
        g.scale(1, 0.085)
        g.beginPath()
        g.arc(0, 0, 330, Math.PI, TAU)
        g.fill()
        g.restore()
      },
    })
    // dust motes: falling everywhere, glowing where they cross the light
    ctx.save()
    ctx.clip(pathOf([SHAFT]))
    ctx.fillStyle = 'rgb(255,248,226)'
    for (let i = 0; i < 140; i++) {
      const x = 200 + rand(i, 21) * 800 + Math.sin(t * 0.4 + i) * 20
      const y = 240 + ((rand(i, 22) * 300 + t * (6 + rand(i, 23) * 10)) % 300)
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 2 + i)
      ctx.beginPath()
      ctx.arc(x, y, 0.8 + rand(i, 24) * 1.4, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    for (let i = 0; i < 160; i++) {
      const ts = 129.2 + rand(i, 11) * 7.5
      const v = 22 + rand(i, 12) * 40
      const age = t - ts
      if (age < 0) continue
      const x0 = FX - 300 + rand(i, 13) * 600
      const y = 60 + rand(i, 14) * 200 + age * v
      const yy = Math.min(y, GY - rand(i, 15) * 6)
      const x = x0 + Math.sin(age * 0.9 + i) * 14
      ctx.globalAlpha = y >= GY - 6 ? 0.4 : 0.5 * smoothstep(0, 0.6, age)
      ctx.fillStyle = C.lineNight
      ctx.beginPath()
      ctx.arc(x, yy, 0.8 + rand(i, 16) * 1.2, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // the photograph standing in the dust; front, then flipped to its back
    const flip = prog(t, beatTime(249), beatTime(250))
    const sx = Math.cos(flip * Math.PI)
    ctx.save()
    ctx.translate(PH.x, PH.y)
    ctx.rotate(PH.rot)
    // cast shadow on paper
    tone(ctx, [rectP(-PH.w / 2 + 14, -PH.h / 2 + 16, PH.w * Math.abs(sx), PH.h)], 'rgb(2,4,10)', 0.45, 12)
    ctx.scale(Math.max(0.02, Math.abs(sx)), 1)
    const card = rectP(-PH.w / 2, -PH.h / 2, PH.w, PH.h)
    tone(ctx, [card], 'rgb(226,214,192)', 0.94, 0.8)
    if (sx <= 0) tone(ctx, [rectP(-PH.w / 2 + 8, -PH.h / 2 + 8, PH.w - 16, PH.h - 16)], 'rgb(222,206,176)', 0.25, 14)
    if (sx > 0) {
      const inner = rectP(-PH.w / 2 + 16, -PH.h / 2 + 16, PH.w - 32, PH.h - 60)
      wash(ctx, [inner], 'rgb(140,104,72)', { alpha: 0.55, blur: 2 })
      ctx.save()
      ctx.clip(pathOf([inner]))
      eileen(ctx, 'iconic', { x: 0, y: PH.h / 2 - 44, h: 310, t, color: C.ink, progress: 1, fill: 1 })
      ctx.restore()
      penStroke(ctx, inner, 1, ink(t, { width: 1, alpha: 0.6, seed: 90 }))
    } else {
      // the back: her hand
      const bx = PH.w / 2 - 30
      writeVertical(ctx, t, { text: '见了他，她变得很低很低，\n低到尘埃里。', x: bx, y: -PH.h / 2 + 18, size: 22, t0: 129.1, rate: 0.2, perCol: 12, color: C.ink })
      writeVertical(ctx, t, { text: '但她心里是欢喜的，\n从尘埃里开出花来。', x: bx - 2 * (22 * 1.32 * 1.18), y: -PH.h / 2 + 18, size: 22, t0: 135.4, rate: 0.2, perCol: 12, color: C.ink })
    }
    penStroke(ctx, card, 1, ink(t, { width: 1.5, seed: 92 }))
    ctx.restore()
    // the flower out of the dust (135.3): a magnolia rising out of her characters
    const MG: Mag = { x: FX, y: GY, s: 1.25, hs: 1.75 }
    const mg = magGeo(MG)
    const bl = smoothstep(138.0, 142.4, t)
    const pulse = beatPulse(t, 4) * smoothstep(137, 139, t)
    // the flower is the light of the room
    glowAt(ctx, mg.H0[0], mg.H0[1] - 60, 520, 'rgba(255,214,150,ALPHA)', 0.12 + 0.3 * bl + 0.1 * pulse)
    glowAt(ctx, mg.H0[0], mg.H0[1] - 60, 180, 'rgba(255,236,200,ALPHA)', 0.25 * bl + 0.12 * pulse)
    textImage(ctx, {
      key: 'D4-mag-branch', cell: 9, emerge: ease.inOutSine(prog(t, beatTime(262), beatTime(266) + 0.6)), order: 'sweepYUp', scatter: 40,
      color: '#c9d3e6', corpus: INSCR, gamma: 0.9, t, seed: 7, draw: (g) => magMaskBranch(g, MG),
    })
    textImage(ctx, {
      key: 'D4-mag-petals', cell: 9, emerge: ease.inOutSine(prog(t, beatTime(266), 142.0)), order: 'radial', ox: mg.H0[0], oy: mg.H0[1] - 40, scatter: 90,
      color: '#ffe2c4', corpus: INSCR, gamma: 0.75, t, seed: 9, alpha: 1, draw: (g) => magMaskPetals(g, MG),
    })
    for (let i = 0; i < mg.front.length; i++) {
      const k = ease.inOutSine(prog(t, D4_OPEN[i] + 2.6, D4_OPEN[i] + 3.8))
      const p = flat(mg.front[i])
      tone(ctx, [p], 'rgb(214,120,120)', 0.16 * k, 4)
      penStroke(ctx, p, k, chalk(t, { width: 1, alpha: 0.6, color: 'rgb(236,170,160)', seed: 20 + i, taperIn: 16, taperOut: 16 }))
    }
    // a few delicate pen traces over the words
    const tr = ease.inOutSine(prog(t, 139.2, 142.6))
    const pst = chalk(t, { width: 0.9, alpha: 0.5, taperIn: 20, taperOut: 20 })
    penStroke(ctx, flat(mg.branch), ease.inOutSine(prog(t, 135.4, 137.6)), { ...pst, width: 1.2, seed: 1 })
    penStroke(ctx, flat(mg.back[0]), tr, { ...pst, seed: 2 })
    penStroke(ctx, flat(mg.front[2]), tr, { ...pst, seed: 3 })
    penStroke(ctx, flat(mg.front[4]), tr, { ...pst, seed: 4, color: C.rouge })
    penStroke(ctx, flat(mg.bud), tr, { ...pst, seed: 5 })
    // bloom of rouge on the paper behind the flower, opening on the beats
    if (bl > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const r = 90 + 50 * bl + 14 * beatPulse(t, 5)
      const fy = mg.H0[1] - 60
      const g = ctx.createRadialGradient(FX - 17, fy, 10, FX - 17, fy, r * 2.2)
      g.addColorStop(0, `rgba(200,90,90,${0.18 * bl})`)
      g.addColorStop(1, 'rgba(200,90,90,0)')
      ctx.fillStyle = g
      ctx.fillRect(FX - 17 - r * 2.2, fy - r * 2.2, r * 4.4, r * 4.4)
      ctx.restore()
    }
    ctx.restore()
  },
}

// ═════════════════════════════ D5 · the 婚书 ═════════════════════════════
function d5Border(sw: number, sh: number) {
  return cached('D5:border', sw, sh, (g) => {
    const st: PenStyle = { width: 1.6, color: C.gold, alpha: 0.95, wobble: 0.5, nib: false, boil: 0 }
    penStroke(g, rectP(14, 14, sw - 28, sh - 28), 1, { ...st, seed: 1 })
    penStroke(g, rectP(21, 21, sw - 42, sh - 42), 1, { ...st, width: 0.9, seed: 2 })
    // 回纹 square spirals at the corners
    const spiral = (cx: number, cy: number, sx: number, sy: number, seed: number) => {
      const pts: Pt[] = []
      let x = 0, y = 0, len = 30
      const dirs: Pt[] = [[1, 0], [0, 1], [-1, 0], [0, -1]]
      pts.push([cx, cy])
      for (let i = 0; i < 7; i++) {
        const d = dirs[i % 4]
        x += d[0] * len; y += d[1] * len
        pts.push([cx + x * sx, cy + y * sy])
        if (i % 2 === 1) len -= 7
      }
      penStroke(g, flat(pts), 1, { ...st, width: 1.2, seed })
    }
    spiral(28, 28, 1, 1, 3)
    spiral(sw - 28, 28, -1, 1, 4)
    spiral(28, sh - 28, 1, -1, 5)
    spiral(sw - 28, sh - 28, -1, -1, 6)
    // small gold key-pattern ticks along the inner rule
    for (let x = 70; x < sw - 70; x += 22) {
      penStroke(g, flat([[x, 21], [x, 27], [x + 8, 27]]), 1, { ...st, width: 0.7, seed: x })
      penStroke(g, flat([[x, sh - 21], [x, sh - 27], [x + 8, sh - 27]]), 1, { ...st, width: 0.7, seed: x + 1 })
    }
  })
}
function d5Desk() {
  return cached('D5:desk', W, H, (g) => {
    const st: PenStyle = { width: 1.4, color: C.ink, alpha: 0.85, wobble: 0.7, nib: false, boil: 0 }
    const L = (pts: Pt[], o: PenStyle = {}) => penStroke(g, flat(pts), 1, { ...st, ...o })
    // ink stone (砚台), lower left
    tone(g, [rectP(186, 414, 250, 84)], 'rgb(60,40,24)', 0.22, 8)
    const stone: Pt[] = [[180, 404], [410, 398], [420, 476], [186, 484], [180, 404]]
    tone(g, [flat(stone)], 'rgb(70,62,58)', 0.55, 1)
    L(stone, { width: 1.6 })
    L([[196, 414], [398, 409], [404, 466], [200, 472], [196, 414]], { width: 0.9, alpha: 0.6, seed: 3 })
    tone(g, [flat(blobPts(244, 440, 34, 18, 2, 0.05, 20))], 'rgb(18,12,10)', 0.85, 1.5)
    L(blobPts(244, 440, 36, 20, 3, 0.05, 20), { width: 1, seed: 4 })
    hatch(g, [flat([[186, 484], [420, 476], [420, 490], [188, 498]])], { angle: 1.4, gap: 3, width: 0.6, color: C.ink, alpha: 0.6, seed: 5 })
    // ink stick
    L([[450, 470], [560, 444], [566, 458], [456, 484], [450, 470]], { width: 1.2, seed: 6 })
    tone(g, [flat([[450, 470], [560, 444], [566, 458], [456, 484]])], 'rgb(20,14,10)', 0.7, 1)
    // seal-paste box (印泥) and a seal stone, right
    const bc: Pt = [1320, 452]
    tone(g, [flat(blobPts(bc[0] + 8, bc[1] + 22, 54, 14, 7, 0.02, 24))], 'rgb(60,40,24)', 0.2, 6)
    L([[bc[0] - 48, bc[1]], [bc[0] - 48, bc[1] + 18]], { seed: 7 })
    L([[bc[0] + 48, bc[1]], [bc[0] + 48, bc[1] + 18]], { seed: 8 })
    L(qb([bc[0] - 48, bc[1] + 18], [bc[0], bc[1] + 36], [bc[0] + 48, bc[1] + 18], 14), { seed: 9 })
    L(blobPts(bc[0], bc[1], 48, 14, 10, 0.01, 30), { seed: 10 })
    tone(g, [flat(blobPts(bc[0], bc[1] + 1, 38, 10, 11, 0.04, 20))], C.rouge, 0.85, 1)
    hatch(g, [flat([[bc[0] - 48, bc[1]], [bc[0] + 48, bc[1]], [bc[0] + 48, bc[1] + 18], [bc[0], bc[1] + 27], [bc[0] - 48, bc[1] + 18]])], { angle: 1.5, gap: 4, width: 0.6, color: C.ink, alpha: 0.35, seed: 12 })
    const sx = 1412, sy = 466
    tone(g, [rectP(sx - 14, sy - 6, 46, 12)], 'rgb(60,40,24)', 0.25, 4)
    L([[sx - 17, sy], [sx - 17, sy - 70], [sx + 17, sy - 70], [sx + 17, sy]], { seed: 13 })
    L([[sx - 17, sy], [sx + 17, sy]], { seed: 14 })
    L(qb([sx - 17, sy - 70], [sx - 14, sy - 100], [sx, sy - 102], 8).concat(qb([sx, sy - 102], [sx + 14, sy - 100], [sx + 17, sy - 70], 8)), { seed: 15 })
    hatch(g, [rectP(sx + 3, sy - 70, 14, 70)], { angle: 1.4, gap: 3, width: 0.6, color: C.ink, alpha: 0.5, seed: 16 })
    tone(g, [rectP(sx - 16, sy - 4, 32, 4)], C.rouge, 0.8, 0.5)
    // unlit candle on a brass stick, back right
    const cx = 1470
    tone(g, [flat(blobPts(cx + 10, 342, 46, 10, 1, 0.02, 20))], 'rgb(60,40,24)', 0.2, 6)
    L(blobPts(cx, 334, 42, 10, 2, 0.02, 24), { seed: 17 })
    L([[cx - 42, 334], [cx - 40, 344]], { seed: 18 })
    L([[cx + 42, 334], [cx + 40, 344]], { seed: 19 })
    L(qb([cx - 40, 344], [cx, 356], [cx + 40, 344], 10), { seed: 20 })
    L([[cx - 6, 330], [cx - 5, 238]], { seed: 21 })
    L([[cx + 6, 330], [cx + 5, 238]], { seed: 22 })
    L(blobPts(cx, 238, 24, 6, 3, 0.02, 20), { seed: 23 })
    tone(g, [rectP(cx - 6, 238, 12, 92)], C.gold, 0.4, 1)
    const cdl: Pt[] = [[cx - 13, 234], [cx - 13, 104], [cx + 13, 102], [cx + 13, 234]]
    tone(g, [flat(cdl)], C.rouge, 0.8, 1)
    L(cdl, { seed: 24 })
    L(blobPts(cx, 103, 13, 4, 4, 0.02, 14), { width: 1, seed: 25 })
    L([[cx, 102], [cx + 2, 90]], { width: 1.6, seed: 26 })
    L([[cx - 10, 112], [cx - 11, 140]], { width: 0.8, alpha: 0.5, seed: 27 })
  })
}
const sceneD5: Scene = {
  id: 'D5-hunshu',
  t0: T5,
  t1: T6,
  theme: 'paper',
  trans: { kind: 'cut', dur: 0 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.28 })
    const k = ease.inOutSine(prog(lt, 0, 5.4))
    ctx.save()
    camera(ctx, lerp(880, 920, k), lerp(300, 296, k), lerp(1.0, 1.08, k), lerp(0.012, -0.004, k))
    // a slip with 「因为懂得，所以慈悲。」 lies half under the red sheet, upper left
    ctx.save()
    ctx.translate(470, 130)
    ctx.rotate(-0.12)
    const slip = flat([[-48, -24], [50, -22], [52, 268], [-50, 266], [-48, -24]])
    tone(ctx, [rectP(-40, -14, 100, 290)], 'rgb(70,45,26)', 0.2, 8)
    tone(ctx, [slip], 'rgb(246,238,218)', 0.92, 0.8)
    penStroke(ctx, slip, 1, ink(t, { width: 1.1, alpha: 0.6, seed: 5 }))
    hand(ctx, t, '因为懂得，', 14, 10, { size: 25, t0: 143.5, rate: 0.09, color: C.ink, step: 29 })
    hand(ctx, t, '所以慈悲。', -18, 10, { size: 25, t0: 144.0, rate: 0.09, color: C.ink, step: 29 })
    ctx.restore()
    // the red paper, gold-flecked (洒金红纸)
    ctx.save()
    ctx.translate(925, 262)
    ctx.rotate(-0.035)
    const sw = 560, sh = 404
    const edge: Pt[] = []
    const E = 14
    for (let i = 0; i < E; i++) edge.push([lerp(-sw / 2, sw / 2, i / E), -sh / 2 + (rand(i, 2) - 0.5) * 4])
    for (let i = 0; i < E; i++) edge.push([sw / 2 + (rand(i, 3) - 0.5) * 4, lerp(-sh / 2, sh / 2, i / E)])
    for (let i = 0; i < E; i++) edge.push([lerp(sw / 2, -sw / 2, i / E), sh / 2 + (rand(i, 4) - 0.5) * 4])
    for (let i = 0; i <= E; i++) edge.push([-sw / 2 + (rand(i, 5) - 0.5) * 4, lerp(sh / 2, -sh / 2, i / E)])
    const sheet = flat(edge)
    const red = ease.outCubic(prog(t, T5, beatTime(278) + 0.2))
    tone(ctx, [sheet], 'rgb(60,30,20)', 0.3 * red, 12)
    wash(ctx, [sheet], C.rouge, { alpha: 0.92 * red, blur: 1.5 })
    wash(ctx, [sheet], 'rgb(150,30,36)', { alpha: 0.35 * red, blur: 6 })
    for (let i = 0; i < 120; i++) {
      const fx = (rand(i, 31) - 0.5) * (sw - 30), fy = (rand(i, 32) - 0.5) * (sh - 30)
      const r = 0.8 + rand(i, 33) * 3.2
      ctx.save()
      ctx.globalAlpha = (0.35 + rand(i, 34) * 0.5) * red * (0.75 + 0.25 * Math.sin(t * 2 + i))
      ctx.fillStyle = C.gold
      ctx.translate(fx, fy)
      ctx.rotate(rand(i, 35) * 3)
      ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2)
      ctx.restore()
    }
    penStroke(ctx, sheet, prog(lt, 0, 0.7), ink(t, { width: 1.4, alpha: 0.6, seed: 6 }))
    // gold double rule with 回纹 corner motifs
    const orn = prog(t, T5 + 0.2, beatTime(279))
    ctx.save()
    ctx.globalAlpha *= orn
    ctx.drawImage(d5Border(sw, sh), -sw / 2, -sh / 2)
    ctx.restore()
    // the vow, vertical, right to left
    const tx = sw / 2 - 50
    writeVertical(ctx, t, { text: '胡兰成张爱玲签订终身，\n结为夫妇，\n愿使岁月静好，\n现世安稳。', x: tx, y: -sh / 2 + 14, size: 26, t0: 143.75, rate: 0.1, perCol: 11, color: 'rgb(26,14,10)' })
    hand(ctx, t, '炎樱为媒证', tx - 4 * 26 * 1.32 * 1.18 - 34, -sh / 2 + 180, { size: 21, t0: 146.3, rate: 0.12, color: 'rgb(26,14,10)', step: 26 })
    ctx.restore()
    // desk things: ink stone with the brush (lower left), seal-paste box and seal (right), an unlit candle (back right)
    const bp = prog(lt, 0.1, 1.0)
    ctx.save()
    ctx.globalAlpha *= bp
    ctx.drawImage(d5Desk(), 0, 0)
    ctx.restore()
    penDraw(ctx, [flat([[250, 452], [610, 330]]), flat([[254, 463], [614, 341]])], bp, ink(t, { width: 1.8 }))
    const tip: Poly = flat([[250, 452], [206, 478], [188, 488], [210, 466], [254, 463]])
    wash(ctx, [tip], 'rgb(30,20,14)', { alpha: 0.75 * bp, blur: 1.5 })
    ctx.restore()
  },
}

// ═════════════════════════════ D6 · the map: Shanghai → Wuhan → Wenzhou ═════════════════════════════
const G = (lon: number, lat: number): Pt => [(lon - 113) * 170, (32.8 - lat) * 170]
const YANGTZE: Pt[] = [[121.95, 31.45], [121.4, 31.62], [120.9, 31.92], [120.3, 31.95], [119.9, 32.25], [119.4, 32.22], [118.8, 32.08], [118.5, 31.72], [118.3, 31.35], [117.8, 31.0], [117.1, 30.55], [116.4, 29.95], [116.0, 29.74], [115.6, 29.85], [115.2, 30.2], [114.8, 30.45], [114.3, 30.6], [113.9, 30.4], [113.5, 30.1], [112.9, 29.85], [112.4, 29.9]]
const COAST: Pt[] = [[120.85, 32.95], [121.2, 32.4], [121.55, 32.05], [121.95, 31.72], [121.95, 31.3], [121.9, 30.95], [121.45, 30.75], [121.0, 30.6], [120.5, 30.42], [120.2, 30.3], [120.6, 30.15], [121.2, 30.25], [121.7, 29.97], [122.0, 29.6], [121.7, 29.25], [121.95, 28.9], [121.5, 28.6], [121.25, 28.2], [120.95, 27.95], [120.6, 27.5], [120.3, 27.05], [120.0, 26.7]]
const SH = G(121.47, 31.23), WH = G(114.3, 30.6), WZ = G(120.67, 28.0), ZJ = G(120.24, 29.71), HZ = G(120.16, 30.27)
function smoothPath(pts: Pt[], n = 6): Pt[] {
  // Catmull-Rom through points
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const u = j / n, u2 = u * u, u3 = u2 * u
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
      ])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}
const RIVER = smoothPath(YANGTZE.map(([a, b]) => G(a, b)))
const COASTW = smoothPath(COAST.map(([a, b]) => G(a, b)))
// route 1: Shanghai → along the river → Wuhan (offset just south of the river line)
const ROUTE1: Pt[] = smoothPath([SH, G(121.0, 31.62), G(120.3, 31.8), G(119.4, 32.06), G(118.8, 31.92), G(118.2, 31.2), G(117.1, 30.42), G(116.1, 29.62), G(115.2, 30.05), WH], 8)
// route 2: Shanghai → Hangzhou → Zhuji → Wenzhou (his flight, 1945–46)
const ROUTE2: Pt[] = smoothPath([G(121.3, 31.15), HZ, ZJ, G(120.5, 28.9), WZ], 10)
const TRIBS: Pt[][] = [
  [[114.3, 30.6], [113.9, 30.7], [113.6, 30.65], [113.2, 30.9], [112.6, 31.2]], // 汉水
  [[116.2, 29.6], [116.0, 28.9], [115.85, 28.3], [115.5, 27.7], [115.0, 27.1]], // 赣江
  [[120.25, 30.25], [120.0, 30.05], [119.7, 29.8], [119.3, 29.6], [118.7, 29.3]], // 钱塘江
  [[120.15, 30.12], [120.24, 29.75], [120.15, 29.4], [120.05, 29.1]], // 浦阳江 (诸暨)
  [[120.95, 27.98], [120.6, 28.03], [120.2, 28.15], [119.9, 28.4], [119.4, 28.5]], // 瓯江
  [[121.5, 31.38], [121.5, 31.2], [121.35, 31.0], [121.0, 30.92]], // 黄浦江
  [[118.5, 31.72], [118.9, 31.4], [119.2, 31.1]], // 青弋 / small
  [[117.1, 30.55], [116.9, 30.9], [116.6, 31.2]],
]
const CANAL: Pt[] = [[120.16, 30.27], [120.3, 30.7], [120.6, 31.3], [120.3, 31.6], [119.95, 31.8], [119.45, 32.2]]
const HILLS: [number, number, number, number, number][] = [
  [119.0, 120.5, 28.4, 29.5, 46], [115.3, 116.6, 30.65, 31.4, 26], [117.5, 118.8, 29.6, 30.3, 24],
  [117.0, 118.6, 27.3, 28.4, 30], [113.6, 115.0, 28.6, 29.4, 22], [118.6, 119.7, 27.4, 28.2, 18],
]
const LABELS: [string, Pt, number, number][] = [
  ['上海', SH, 18, -20], ['杭州', HZ, -62, 28], ['诸暨', ZJ, 18, 6], ['温州', WZ, 16, 30], ['武汉', WH, -30, -26], ['南京', G(118.8, 32.05), -20, -22],
]
function d6Static() {
  return cached('D6:map', 1950, 1200, (g) => {
    g.translate(150, 80)
    const st: PenStyle = { width: 1.2, color: C.ink, alpha: 0.6, wobble: 0.8, nib: false, boil: 0 }
    const L = (pts: Pt[], o: PenStyle = {}) => penStroke(g, flat(pts), 1, { ...st, ...o })
    // neatline: double frame with an alternating scale border
    L([[-60, -30], [1740, -30], [1740, 1060], [-60, 1060], [-60, -30]], { width: 2, alpha: 0.75 })
    L([[-48, -18], [1728, -18], [1728, 1048], [-48, 1048], [-48, -18]], { width: 0.9 })
    for (let x = -48; x < 1728; x += 60) if (((x + 48) / 60) % 2 === 0) {
      tone(g, [rectP(x, -30, 60, 12)], C.ink, 0.45, 0.5)
      tone(g, [rectP(x, 1048, 60, 12)], C.ink, 0.45, 0.5)
    }
    // graticule + degree labels
    g.font = `italic 400 18px ${FONT.en}`
    g.fillStyle = C.inkSoft
    for (let lon = 114; lon <= 122; lon += 1) {
      const a = G(lon, 33), b = G(lon, 26.6)
      L([[a[0], -18], [b[0], 1048]], { alpha: lon % 2 ? 0.08 : 0.16, width: 0.7, seed: lon })
      if (lon % 2 === 0) { g.globalAlpha = 0.6; g.fillText(`${lon}°`, a[0] + 4, -36); g.globalAlpha = 1 }
    }
    for (let lat = 27; lat <= 32; lat += 1) {
      const a = G(112, lat)
      L([[-48, a[1]], [1728, a[1]]], { alpha: lat % 2 ? 0.08 : 0.16, width: 0.7, seed: lat * 3 })
      if (lat % 2 === 0) { g.globalAlpha = 0.6; g.fillText(`${lat}°`, -100, a[1] + 6); g.globalAlpha = 1 }
    }
    // sea: wave hatching east of the coast, plus offshore contour
    const sea = flat([...COASTW, [1728, 1048], [1728, -18], [COASTW[0][0], -18]])
    hatch(g, [sea], { angle: 0.0, gap: 7, width: 0.7, color: C.ink, alpha: 0.32, seed: 4 })
    L(COASTW, { alpha: 0.85, width: 1.8 })
    L(COASTW.map(([x, y]) => [x + 14, y + 3] as Pt), { alpha: 0.3, width: 0.8, seed: 5 })
    L(COASTW.map(([x, y]) => [x + 30, y + 6] as Pt), { alpha: 0.18, width: 0.7, seed: 6 })
    // islands (舟山)
    for (const [lon, lat, r] of [[122.15, 30.05, 26], [122.3, 29.85, 12], [121.95, 30.25, 9], [121.75, 28.4, 10]] as const) {
      const c = G(lon, lat)
      const b = flat(blobPts(c[0], c[1], r, r * 0.6, lon * 7, 0.25, 16))
      tone(g, [b], 'rgb(232,218,190)', 1, 0.5)
      penStroke(g, b, 1, { ...st, alpha: 0.7, seed: Math.round(lon * 10) })
    }
    // the Yangtze: two banks with a pale wash between
    const bankN = RIVER.map(([x, y]) => [x, y - 4] as Pt), bankS = RIVER.map(([x, y]) => [x + 1, y + 6] as Pt)
    tone(g, [flat([...bankN, ...bankS.slice().reverse()])], 'rgb(150,170,170)', 0.5, 1)
    L(bankN, { width: 1.6, alpha: 0.85, seed: 1 })
    L(bankS, { width: 1.1, alpha: 0.6, seed: 2 })
    // tributaries and the Grand Canal
    TRIBS.forEach((r, i) => L(smoothPath(r.map(([a, b]) => G(a, b)), 6), { width: 1.1, alpha: 0.6, seed: 30 + i }))
    const can = smoothPath(CANAL.map(([a, b]) => G(a, b)), 6)
    for (let i = 0; i + 2 < can.length; i += 3) L(can.slice(i, i + 2), { width: 0.9, alpha: 0.45, seed: 60 + i })
    // lakes
    for (const [lon, lat, r, s] of [[120.2, 31.2, 40, 1], [116.3, 29.1, 46, 2], [114.4, 30.55, 10, 3], [112.9, 29.3, 44, 4], [118.9, 31.6, 14, 5]] as const) {
      const c = G(lon, lat)
      const b = flat(blobPts(c[0], c[1], r, r * 0.7, s, 0.2, 20))
      tone(g, [b], 'rgb(150,170,170)', 0.4, 1)
      hatch(g, [b], { angle: 0.0, gap: 4, width: 0.6, color: C.ink, alpha: 0.35, seed: s })
      penStroke(g, b, 1, { ...st, seed: 10 + s })
    }
    // hills as little hand-drawn peaks with shaded flanks
    HILLS.forEach(([l0, l1, b0, b1, n], hi) => {
      for (let i = 0; i < n; i++) {
        const c = G(lerp(l0, l1, rand(i, hi + 1)), lerp(b0, b1, rand(i, hi + 7)))
        const s = 9 + rand(i, hi + 13) * 8
        L([[c[0] - s, c[1]], [c[0] - s * 0.2, c[1] - s], [c[0] + s, c[1]]], { width: 0.9, alpha: 0.5, seed: hi * 100 + i })
        L([[c[0] - s * 0.1, c[1] - s * 0.8], [c[0] + s * 0.25, c[1] - 1]], { width: 0.5, alpha: 0.35, seed: hi * 100 + i + 50 })
      }
    })
    // cities: double-ring dots and small 楷体 labels
    g.font = `400 26px ${FONT.kai}`
    for (const [name, p, dx, dy] of LABELS) {
      L(blobPts(p[0], p[1], 6, 6, p[0], 0.05, 12), { width: 1.4, alpha: 0.85 })
      tone(g, [flat(blobPts(p[0], p[1], 2.5, 2.5, 1, 0, 8))], C.ink, 0.9, 0)
      g.globalAlpha = 0.85
      g.fillStyle = C.ink
      g.fillText(name, p[0] + dx, p[1] + dy)
    }
    g.globalAlpha = 1
    // compass rose in the sea
    const cr = G(122.55, 28.5)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2
      const len = i % 2 ? 26 : 52
      const tip: Pt = [cr[0] + Math.cos(a) * len, cr[1] + Math.sin(a) * len]
      const l: Pt = [cr[0] + Math.cos(a - 0.6) * 9, cr[1] + Math.sin(a - 0.6) * 9]
      const r: Pt = [cr[0] + Math.cos(a + 0.6) * 9, cr[1] + Math.sin(a + 0.6) * 9]
      tone(g, [flat([cr, l, tip])], C.ink, i % 2 ? 0.3 : 0.75, 0.3)
      L([l, tip, r], { width: 0.9, alpha: 0.8, seed: 200 + i })
    }
    L(blobPts(cr[0], cr[1], 34, 34, 3, 0.01, 30), { width: 0.8, alpha: 0.6, seed: 210 })
    L(blobPts(cr[0], cr[1], 40, 40, 4, 0.01, 30), { width: 0.6, alpha: 0.4, seed: 211 })
    g.font = `400 24px ${FONT.kai}`
    g.fillStyle = C.ink
    g.fillText('北', cr[0] - 12, cr[1] - 62)
    // scale bar
    const sb: Pt = G(118.2, 27.3)
    for (let i = 0; i < 4; i++) tone(g, [rectP(sb[0] + i * 50, sb[1], 50, 8)], C.ink, i % 2 ? 0.1 : 0.6, 0.3)
    L([[sb[0], sb[1]], [sb[0] + 200, sb[1]], [sb[0] + 200, sb[1] + 8], [sb[0], sb[1] + 8], [sb[0], sb[1]]], { width: 0.8 })
    // fold creases (the map was folded in four)
    for (const [a, b] of [[[830, -30], [836, 1060]], [[-60, 500], [1740, 494]]] as [Pt, Pt][]) {
      L([a, b], { width: 3, color: 'rgb(255,248,230)', alpha: 0.35, seed: a[0] + 1 })
      L([[a[0] + 2, a[1] + 2], [b[0] + 2, b[1] + 2]], { width: 0.8, color: 'rgb(90,60,40)', alpha: 0.35, seed: a[0] + 2 })
    }
  })
}
function silhouette(ctx: Ctx, kind: 'man' | 'woman', x: number, y: number, h: number, a: number, t: number) {
  if (a <= 0) return
  const s = h / 100
  const d = kind === 'man'
    ? 'M -9 -100 L 9 -100 L 10 -90 L 18 -88 Q 0 -85 -18 -88 L -10 -90 Z M -6 -87 Q -7 -79 0 -77 Q 7 -79 6 -87 Z M -6 -77 L -15 -73 Q -19 -40 -17 -3 L 17 -3 Q 19 -40 15 -73 L 6 -77 Z'
    : 'M -5 -93 Q -9 -100 0 -101 Q 9 -100 6 -93 Q 5 -86 0 -85 Q -5 -86 -5 -93 Z M -3 -85 L -11 -80 Q -13 -62 -9 -52 Q -12 -30 -7 -2 L 7 -2 Q 11 -30 9 -52 Q 13 -62 11 -80 L 3 -85 Z'
  const polys = pathPolys(d).map((p) => p.map((v, i) => (i & 1 ? y + v * s : x + v * s)))
  ctx.save()
  ctx.globalAlpha *= a
  wash(ctx, polys, kind === 'man' ? 'rgb(40,28,20)' : 'rgb(90,70,60)', { alpha: kind === 'man' ? 0.7 : 0.35, blur: 2 })
  penDraw(ctx, polys, 1, ink(t, { width: 1.2, alpha: kind === 'man' ? 0.8 : 0.5 }))
  ctx.restore()
}
const sceneD6: Scene = {
  id: 'D6-map',
  t0: T6,
  t1: T7,
  theme: 'paper',
  trans: { kind: 'dissolve', dur: 0.5 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.4, stains: 0.9 })
    const a = ease.inOutSine(prog(t, T6 + 0.2, 151.7))
    const b = ease.inOutSine(prog(t, 152.0, 156.6))
    const cx = lerp(lerp(1300, 560, a), 1120, b)
    const cy = lerp(lerp(300, 350, a), 690, b)
    const z = lerp(lerp(1.22, 1.12, a), 1.02, b)
    ctx.save()
    camera(ctx, cx, cy, z, -0.02)
    ctx.drawImage(d6Static(), -150, -80)
    // red pen rings: the departure (上海) first, then each arrival
    const ring = (p: Pt, t0: number, seed: number) => {
      const k = ease.outCubic(prog(t, t0, t0 + 0.45))
      if (k > 0) penStroke(ctx, sketchEllipse(p[0], p[1], 22, 17, seed, 0.15), k, ink(t, { width: 2.2, color: C.rouge, alpha: 0.85, seed }))
    }
    ring(SH, T6 + 0.05, 3)
    ring(WH, 151.2, 4)
    ring(WZ, 154.9, 5)
    // route 1 (that winter, he went to Wuhan): red pen line along the Yangtze, head = his small figure
    const r1 = ease.inOutSine(prog(t, 148.1, 151.3))
    const h1 = penStroke(ctx, flat(ROUTE1), r1, { ...ink(t, { width: 2.6, color: C.rouge, alpha: 0.85, seed: 7 }), taperIn: 30 })
    // route 2 (later, Wenzhou): dashed, drawn
    const r2 = ease.inOutSine(prog(t, 152.2, 155.0))
    if (r2 > 0) {
      const L = ROUTE2.length
      const n = Math.floor(L * r2)
      for (let i = 0; i + 3 < n; i += 6) penStroke(ctx, flat(ROUTE2.slice(i, Math.min(n, i + 4))), 1, ink(t, { width: 2.2, color: C.rouge, alpha: 0.75, seed: 20 + i }))
    }
    // the faceless man at Wuhan, a woman appearing beside him, fading
    const manW = envelope(t, 150.9, 153.4, 0.5, 0.8)
    silhouette(ctx, 'man', WH[0] + 46, WH[1] - 12, 120, manW, t)
    silhouette(ctx, 'woman', WH[0] + 86, WH[1] - 14, 108, envelope(t, 151.9, 153.6, 0.7, 0.9) * 0.8, t)
    const manZ = envelope(t, 154.0, 157.5, 0.5, 0.8)
    silhouette(ctx, 'man', WZ[0] - 60, WZ[1] - 6, 120, manZ, t)
    silhouette(ctx, 'woman', WZ[0] - 100, WZ[1] - 8, 108, envelope(t, 154.6, 157.5, 0.8, 0.8) * 0.75, t)
    void h1
    ctx.restore()
  },
}

// ═════════════════════════════ D7 · Wenzhou 1946, rain; the flower withers ═════════════════════════════
const D7_FALL = [304, 305, 306, 307, 308, 309].map((b) => beatTime(b))
const sceneD7: Scene = {
  id: 'D7-wenzhou-rain',
  t0: T7,
  t1: T8,
  theme: 'night',
  trans: { kind: 'ink', dur: 0.9 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.14, seed: 9 })
    const k = ease.inOutSine(prog(lt, 0, 5.5))
    ctx.save()
    camera(ctx, lerp(950, 1000, k), lerp(330, 320, k), lerp(1.0, 1.05, k))
    // far bank: hills and the island's two pagodas (江心屿), very faint
    const hills: Pt[] = []
    for (let x = -100; x <= 2050; x += 25) hills.push([x, 300 - Math.max(0, Math.sin(x * 0.004 + 1) * 40 + Math.sin(x * 0.011) * 14)])
    penStroke(ctx, flat(hills), 1, chalk(t, { width: 1, alpha: 0.35, seed: 3 }))
    for (const px of [700, 820]) {
      const pts: Poly[] = [flat([[px - 6, 298], [px - 4, 252], [px, 238], [px + 4, 252], [px + 6, 298]])]
      for (let j = 0; j < 5; j++) pts.push(flat([[px - 9 + j, 292 - j * 10], [px + 9 - j, 292 - j * 10]]))
      penDraw(ctx, pts, 1, chalk(t, { width: 0.9, alpha: 0.35 }))
    }
    // the river: wave strokes (黄浪 in her letter — here only indigo)
    for (let i = 0; i < 70; i++) {
      const y = 312 + Math.pow(rand(i, 1), 1.4) * 150
      const x = -80 + rand(i, 2) * 2000 + Math.sin(t * 0.8 + i) * 12
      const L = 20 + (y - 300) * 0.5
      penStroke(ctx, flat([[x, y], [x + L * 0.5, y - 2], [x + L, y]]), 1, chalk(t, { width: 0.9, alpha: 0.32, seed: 100 + i }))
    }
    // the boat at the wharf (right)
    const boat: Poly[] = [
      flat([[1400, 452], [1780, 446], [1750, 478], [1440, 482], [1400, 452]]),
      flat([[1480, 452], [1480, 412], [1660, 410], [1660, 450]]),
      flat([[1500, 412], [1520, 392], [1640, 392], [1660, 410]]),
      flat([[1560, 392], [1560, 360]]),
    ]
    tone(ctx, boat.slice(0, 2), 'rgb(6,8,16)', 0.4)
    penDraw(ctx, boat, prog(lt, 0, 1.2), chalk(t, { width: 1.5 }))
    for (let i = 0; i < 4; i++) {
      const wr = rectP(1495 + i * 40, 422, 22, 16)
      wash(ctx, [wr], 'rgb(200,214,240)', { alpha: 0.2, blur: 2 })
    }
    // the wharf edge (diagonal) and stone slabs
    const edgeY = (x: number) => 600 - (x + 120) * 0.075
    penStroke(ctx, flat([[-120, edgeY(-120)], [2000, edgeY(2000)]]), prog(lt, 0, 0.8), chalk(t, { width: 2.2, seed: 5 }))
    penStroke(ctx, flat([[-120, edgeY(-120) + 12], [2000, edgeY(2000) + 10]]), prog(lt, 0, 0.8), chalk(t, { width: 1, alpha: 0.5, seed: 6 }))
    for (let i = 0; i < 16; i++) {
      const x = -80 + i * 140
      penStroke(ctx, flat([[x, edgeY(x) + 12], [x - 260 + i * 10, 860]]), 1, chalk(t, { width: 0.8, alpha: 0.28, seed: 200 + i }))
    }
    for (let j = 0; j < 4; j++) {
      const yy = 30 + j * j * 40
      penStroke(ctx, flat([[-120, edgeY(-120) + 12 + yy], [2000, edgeY(2000) + 10 + yy * 0.6]]), 1, chalk(t, { width: 0.7, alpha: 0.2, seed: 220 + j }))
    }
    // wet reflections of the boat lights
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
      ctx.globalAlpha = 0.1 * (1 - j / 8)
      ctx.fillStyle = 'rgb(200,214,240)'
      const ww = 14 * (0.6 + 0.5 * Math.sin(t * 5 + i + j))
      ctx.fillRect(1506 + i * 40 - ww / 2, 486 + j * 9, ww, 4)
    }
    ctx.restore()
    // her, under the umbrella, walking toward the boat (away from us)
    const wk = prog(lt, 0, 5.5)
    eileen(ctx, 'walkUmbrella', { x: lerp(1050, 1210, wk), y: lerp(560, 520, wk), h: lerp(300, 262, wk), t, color: C.lineNight, progress: prog(lt, 0.1, 1.2), fill: 1 })
    ctx.restore()
    // foreground: the flower from the dust, withering (我将只是萎谢了)
    ctx.save()
    ctx.translate(-(lerp(950, 1000, k) - 950) * 1.5, 0)
    const w = ease.inOutSine(prog(t, 156.5, 160.2))
    const MG: Mag = { x: 320, y: 760, s: 1.75 }
    const mg = magGeo(MG)
    glowAt(ctx, mg.H0[0], mg.H0[1] - 30, 240, 'rgba(243,217,164,ALPHA)', 0.16 * (1 - w))
    textImage(ctx, {
      key: 'D7-mag-branch', cell: 10, emerge: 1, color: '#c9d3e6', corpus: INSCR, gamma: 0.9, t, seed: 3, alpha: 0.85, draw: (g) => magMaskBranch(g, MG),
    })
    textImage(ctx, {
      key: 'D7-mag-petals', cell: 10, emerge: 1 - 0.92 * w, order: 'sweepYUp', scatter: 150, color: '#f0b4b8', corpus: INSCR, gamma: 0.9, t, seed: 5, draw: (g) => magMaskPetals(g, MG),
    })
    penStroke(ctx, flat(mg.branch), 1, chalk(t, { width: 1.1, alpha: 0.45, seed: 1 }))
    penStroke(ctx, flat(mg.front[2]), 1 - w, chalk(t, { width: 0.9, alpha: 0.5, seed: 2 }))
    // petals falling as characters, one handful per beat, into the rain
    ctx.save()
    ctx.font = `400 17px ${FONT.kai}`
    ctx.fillStyle = '#e2a4a8'
    ctx.textAlign = 'center'
    const ich = [...INSCR]
    D7_FALL.forEach((tb, bi) => {
      const age = t - tb
      if (age < 0 || age > 2.6) return
      for (let i = 0; i < 12; i++) {
        const sx = mg.H0[0] + (rand(i, bi + 1) - 0.5) * 120, sy = mg.H0[1] - rand(i, bi + 2) * 70
        const x = sx + age * (30 + rand(i, bi + 3) * 50) + Math.sin(age * 3 + i) * 14
        const y = sy + age * age * 70 + age * 40
        ctx.globalAlpha = 0.85 * (1 - age / 2.6)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(age * (rand(i, bi + 4) - 0.5) * 3)
        ctx.fillText(ich[(i * 5 + bi * 3) % ich.length], 0, 0)
        ctx.restore()
      }
    })
    ctx.restore()
    ctx.restore()
    // pages beginning to fly in the rain (褶皱的信乘飞雨)
    for (let j = 0; j < 7; j++) {
      const ts = 157.4 + j * 0.42
      const age = t - ts
      if (age < 0) continue
      const x = 1380 + j * 60 - age * 420 - age * age * 40
      const y = 600 - j * 14 - age * 210 + Math.sin(age * 3 + j) * 30
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(age * (1.2 + rand(j, 1)) * (j % 2 ? 1 : -1))
      ctx.scale(Math.cos(age * 2.4 + j), 1)
      const jj = (i: number) => (rand(i, j + 50) - 0.5) * 6
      const pg = flat([[-26 + jj(1), -34 + jj(2)], [2, -31], [26 + jj(3), -34 + jj(4)], [24, 0], [26 + jj(5), 34 + jj(6)], [-2, 31], [-26 + jj(7), 34 + jj(8)], [-24, 0], [-26 + jj(1), -34 + jj(2)]])
      tone(ctx, [pg], 'rgb(226,232,244)', 0.55, 0.8)
      penStroke(ctx, pg, 1, chalk(t, { width: 1.1, seed: 300 + j }))
      penStroke(ctx, flat([[2, -31], [-2, 31]]), 1, chalk(t, { width: 0.6, alpha: 0.5, seed: 340 + j }))
      for (let l = 0; l < 5; l++) penStroke(ctx, flat([[-18, -22 + l * 10], [-6, -21 + l * 10]]), 1, { width: 0.7, color: 'rgb(40,46,70)', alpha: 0.6, nib: false, seed: 320 + j * 5 + l })
      ctx.restore()
    }
    yearMark(ctx, t, { text: '1946', x: 120, y: 150, t0: 156.5, t1: 160.6, size: 70, color: 'rgba(234,228,214,1)' })
    rain(ctx, t, { n: 240, alpha: 0.24, angle: 0.18, len: 40 })
    textRain(ctx, t, { n: 150, speed: 520, angle: 0.18, alpha: 0.45, size: 22, corpus: '我将只是萎谢了' })
  },
}

// ═════════════════════════════ D8 · June 1947, the letter ═════════════════════════════
const LW = 480, LH = 560
function d8Sheet(t: number) {
  const c = cached('D8:sheet', LW + 40, LH + 40, () => undefined)
  const g = c.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, c.width, c.height)
  g.translate(20, 20)
  const sheet = rectP(0, 0, LW, LH)
  tone(g, [sheet], 'rgb(246,238,220)', 1, 0.8)
  tone(g, [rectP(10, 10, LW - 20, LH - 20)], 'rgb(226,210,180)', 0.22, 18)
  // 八行笺: red vertical rules, double border
  const st: PenStyle = { width: 1, color: C.rouge, alpha: 0.6, wobble: 0.5, nib: false, boil: 0 }
  penStroke(g, rectP(22, 30, LW - 44, LH - 60), 1, { ...st, seed: 1, width: 1.4 })
  penStroke(g, rectP(28, 36, LW - 56, LH - 72), 1, { ...st, seed: 2, width: 0.8 })
  const colW = (LW - 56) / 8
  for (let i = 1; i < 8; i++) penStroke(g, flat([[28 + i * colW, 36], [28 + i * colW, LH - 36]]), 1, { ...st, seed: 3 + i })
  // her hand, two columns from the right
  const x1 = 28 + 7.5 * colW, x2 = 28 + 6.5 * colW
  const left = 1 - 0.92 * smoothstep(164.7, 165.3, t)
  hand(g, t, '我已经不喜欢你了。', x1, 66, { size: 34, t0: 161.5, rate: 0.17, color: 'rgb(30,20,14)', step: 40, alpha: left })
  hand(g, t, '你是早已经不喜欢我了的。', x2, 66, { size: 34, t0: 163.2, rate: 0.13, color: 'rgb(30,20,14)', step: 38, alpha: left })
  // rain drops landing on the page (on the beats): grey blooms
  for (let b = 313; b <= 322; b++) {
    const tb = beatTime(b)
    if (t < tb) continue
    const a = clamp((t - tb) / 0.5)
    const x = 40 + rand(b, 1) * (LW - 80), y = 60 + rand(b, 2) * (LH - 120)
    const r = (6 + rand(b, 3) * 10) * (0.6 + 0.4 * a)
    g.save()
    g.globalAlpha = 0.22
    g.filter = 'blur(1.5px)'
    g.fillStyle = 'rgb(120,120,130)'
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
    g.globalAlpha = 0.35
    g.strokeStyle = 'rgb(90,80,80)'
    g.lineWidth = 1
    g.stroke()
    g.restore()
  }
  return c
}
const sceneD8: Scene = {
  id: 'D8-letter',
  t0: T8,
  t1: T9,
  theme: 'paper',
  trans: { kind: 'dissolve', dur: 0.8 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.34 })
    const k = ease.inOutSine(prog(lt, 0, 6.3))
    ctx.save()
    camera(ctx, lerp(960, 990, k), lerp(320, 300, k), lerp(1.02, 1.1, k), lerp(-0.01, 0.01, k))
    // an envelope underneath, bottom-left, and the pen
    ctx.save()
    ctx.translate(620, 420)
    ctx.rotate(0.12)
    const env = rectP(-150, -90, 300, 180)
    tone(ctx, [rectP(-140, -78, 300, 180)], 'rgb(70,45,26)', 0.2, 8)
    wash(ctx, [env], 'rgb(236,224,198)', { alpha: 0.92, blur: 1 })
    penDraw(ctx, [env, flat([[-150, -90], [0, 10], [150, -90]])], 1, ink(t, { width: 1.2, alpha: 0.65 }))
    ctx.restore()
    const sheet = d8Sheet(t)
    const cx = 1010, cy = 272
    const f1 = ease.inOutSine(prog(t, beatTime(319), beatTime(320)))
    const f2 = ease.inOutSine(prog(t, beatTime(320), beatTime(321)))
    const fly = prog(t, beatTime(321), beatTime(321) + 1.6)
    const half = (LW + 40) / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-0.04)
    if (fly <= 0) {
      const shx = -LW / 2 + (LW / 2) * f1, shy = -LH / 2 + (LH / 2) * f2
      tone(ctx, [rectP(shx + 12, shy + 14, LW / 2 - shx, LH / 2 - shy)], 'rgb(60,40,24)', 0.22, 10)
      // fold 1: left half over the right (around the vertical centre line)
      const s1 = Math.cos(f1 * Math.PI)
      if (f2 <= 0) {
        ctx.drawImage(sheet, half, 0, half, LH + 40, 0, -(LH + 40) / 2, half, LH + 40)
        ctx.save()
        if (s1 > 0) {
          ctx.scale(s1, 1)
          ctx.drawImage(sheet, 0, 0, half, LH + 40, -half, -(LH + 40) / 2, half, LH + 40)
        } else {
          ctx.scale(-s1, 1)
          const back = rectP(0, -LH / 2, LW / 2, LH)
          tone(ctx, [back], 'rgb(236,226,204)', 1, 0.6)
          penStroke(ctx, back, 1, ink(t, { width: 1.1, alpha: 0.5, seed: 11 }))
          penStroke(ctx, flat([[0, -LH / 2], [0, LH / 2]]), 1, ink(t, { width: 1.4, alpha: 0.6, seed: 14 }))
        }
        ctx.restore()
      } else {
        // fold 2: the top half comes down over the bottom
        const s2 = Math.cos(f2 * Math.PI)
        const low = rectP(0, 0, LW / 2, LH / 2)
        tone(ctx, [low], 'rgb(236,226,204)', 1, 0.6)
        penStroke(ctx, low, 1, ink(t, { width: 1.1, alpha: 0.5, seed: 12 }))
        ctx.save()
        ctx.scale(1, s2)
        const top = rectP(0, -LH / 2, LW / 2, LH / 2)
        tone(ctx, [top], s2 > 0 ? 'rgb(236,226,204)' : 'rgb(242,233,212)', 1, 0.6)
        penStroke(ctx, top, 1, ink(t, { width: 1.1, alpha: 0.5, seed: 13 }))
        ctx.restore()
      }
      // the pen, following the writing head
      const writing = t < 165.0
      if (writing) {
        const n2c = clamp((t - 163.2) / (0.13 * 12))
        const n1c = clamp((t - 161.5) / (0.17 * 9))
        const colW = (LW - 56) / 8
        const px = t < 163.2 ? -LW / 2 + 28 + 7.5 * colW : -LW / 2 + 28 + 6.5 * colW
        const py = -LH / 2 + 66 + (t < 163.2 ? n1c * 9 * 40 : n2c * 12 * 38)
        const pa = envelope(t, 161.3, 165.0, 0.4, 0.5)
        ctx.save()
        ctx.globalAlpha *= pa
        penDraw(ctx, [flat([[px + 14, py + 8], [px + 230, py + 190]]), flat([[px + 24, py + 2], [px + 240, py + 182]])], 1, ink(t, { width: 1.5 }))
        penStroke(ctx, flat([[px + 4, py + 2], [px + 14, py + 8], [px + 24, py + 2], [px + 4, py + 2]]), 1, ink(t, { width: 1.2, seed: 13 }))
        ctx.restore()
      }
    } else {
      // folded packet carried off by wind and rain, up-left
      const e = ease.inCubic(fly)
      ctx.translate(-e * 1250, -e * 520 + Math.sin(fly * 9) * 20 * fly)
      ctx.rotate(-e * 4.2)
      ctx.scale(1 - e * 0.35, (1 - e * 0.35) * (0.6 + 0.4 * Math.cos(fly * 11)))
      const pk = rectP(0, 0, LW / 2, LH / 2)
      tone(ctx, [rectP(10, 12, LW / 2, LH / 2)], 'rgb(60,40,24)', 0.2 * (1 - e), 8)
      wash(ctx, [pk], 'rgb(238,228,206)', { alpha: 1, blur: 0.6 })
      penDraw(ctx, [pk, flat([[0, LH / 4], [LW / 2, LH / 4 + 4]])], 1, ink(t, { width: 1.2, alpha: 0.6 }))
    }
    ctx.restore()
    // her words lift off the page and go with the wind
    if (t > 164.6) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-0.04)
      ctx.font = `400 34px ${FONT.kai}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgb(30,20,14)'
      const colW = (LW - 56) / 8
      const cols: [string, number, number][] = [['我已经不喜欢你了。', -LW / 2 + 28 + 7.5 * colW, 40], ['你是早已经不喜欢我了的。', -LW / 2 + 28 + 6.5 * colW, 38]]
      cols.forEach(([s, bx, step], c) => {
        ;[...s].forEach((ch, i) => {
          const k = clamp((t - (164.7 + (s.length - i) * 0.07 + c * 0.25)) / 2.4)
          if (k <= 0) return
          const e = 0.15 * k + 0.85 * ease.inCubic(k)
          const x = bx - e * (420 + rand(i, c + 1) * 300) + Math.sin(k * 6 + i) * 10
          const y = -LH / 2 + 66 + i * step - e * (220 + rand(i, c + 5) * 160)
          ctx.save()
          ctx.globalAlpha = 0.9 * (1 - ease.inCubic(k)) * smoothstep(0, 0.15, k)
          ctx.filter = `blur(${k * 3}px)`
          ctx.translate(x, y)
          ctx.rotate(e * (rand(i, c + 9) - 0.5) * 3)
          ctx.fillText(ch, 0, 0)
          ctx.restore()
        })
      })
      ctx.restore()
    }
    ctx.restore()
    // wind and rain on paper (strokes of rain, ink-grey)
    const rn = smoothstep(162.6, 165.6, t)
    if (rn > 0) {
      rain(ctx, t, { n: Math.round(260 * rn), alpha: 0.2, angle: 0.5, len: 46, color: 'rgba(70,76,92,1)', speed: 1700 })
      for (let i = 0; i < 9; i++) {
        const y = 80 + rand(i, 3) * 460
        const ph = ((t * 0.8 + rand(i, 4)) % 1)
        const x = W * 1.1 - ph * W * 1.4
        penStroke(ctx, flat([[x, y], [x - 200, y - 50 + Math.sin(i) * 20], [x - 360, y - 70]]), clamp(ph * 3), ink(t, { width: 0.9, alpha: 0.3 * rn * Math.sin(ph * Math.PI), seed: 600 + i }))
      }
    }
  },
}

// ═════════════════════════════ D9 · 1952, the city un-draws itself ═════════════════════════════
const HZN = 436
const bundX = (u: number) => 60 + 1440 * (1 - Math.pow(1 - u, 1.35))
const bundD = (u: number) => lerp(1.15, 0.62, u)
const bundY = (u: number) => lerp(480, 442, u)
type Bld = { u: number; w: number; h: number; top: string; clock?: boolean; pyramid?: string }
const BUND: Bld[] = [
  { u: 0.02, w: 120, h: 150, top: 'M 46 0 V -18 H 74 V 0 M 50 -18 Q 60 -40 70 -18' }, // 1 Bund (McBain)
  { u: 0.1, w: 110, h: 120, top: 'M 6 0 V -16 H 24 V 0 M 86 0 V -16 H 104 V 0' }, // Shanghai Club
  { u: 0.17, w: 88, h: 132, top: 'M 30 0 V -10 H 58 V 0 M 34 -10 Q 44 -32 54 -10' }, // Union Building
  { u: 0.26, w: 220, h: 128, top: 'M 70 0 V -24 H 150 V 0 M 74 -24 C 76 -78 144 -78 146 -24 M 110 -64 V -82 M 104 -82 H 116' }, // HSBC dome
  { u: 0.4, w: 120, h: 148, top: 'M 34 0 V -80 H 86 V 0 M 40 -80 V -98 H 80 V -80 M 48 -98 V -112 H 72 V -98 M 60 -112 V -132', clock: true }, // Customs House
  { u: 0.5, w: 92, h: 140, top: 'M 4 0 V -8 H 88 V 0' },
  { u: 0.6, w: 132, h: 166, top: 'M 74 0 V -10 H 124 V 0 M 76 -10 L 99 -74 L 122 -10 M 99 -74 V -84', pyramid: 'M 76 -10 L 99 -74 L 122 -10 Z' }, // Sassoon House
  { u: 0.7, w: 122, h: 176, top: 'M 12 0 V -14 H 110 V 0 M 24 -14 V -28 H 98 V -14 M 30 -28 L 61 -50 L 92 -28 M 61 -50 V -58' }, // Bank of China
  { u: 0.79, w: 92, h: 118, top: 'M 30 0 V -6 H 62 V 0' },
  { u: 0.86, w: 84, h: 86, top: 'M 10 0 V -12 H 74 V 0' },
]
function bundGeo(b: Bld) {
  const x0 = bundX(b.u), d = bundD(b.u), yb = bundY(b.u)
  const W0 = b.w * d, top = yb - b.h * d
  const front: Pt[] = [[x0, yb], [x0, top], [x0 + W0, top], [x0 + W0, yb]]
  const sw = 0.22 * W0
  const side: Pt[] = [[x0, top], [x0 - sw, top + (HZN - top) * 0.12], [x0 - sw, yb + (HZN - yb) * 0.12], [x0, yb]]
  const tp = b.top ? pathPolys(b.top).map((p) => p.map((v, i) => (i & 1 ? top + v * d : x0 + v * d))) : []
  const pyr = b.pyramid ? pathPolys(b.pyramid).map((p) => p.map((v, i) => (i & 1 ? top + v * d : x0 + v * d))) : []
  return { x0, d, yb, roof: top, W0, front, side, top: tp, pyr }
}
function shipGeo(): Poly[] {
  // a coastal steamer, side view, waterline y 532
  // drawn at 250..712 × 412..532, placed small mid-river, right of the Customs House
  const P = (d: string) => pathPolys(d).map((p) => p.map((v, i) => (i & 1 ? 486 + (v - 532) * 0.5 : 1010 + (v - 250) * 0.5)))
  return [
    ...P('M 250 532 L 690 526 L 712 498 L 262 504 Q 240 510 250 532 Z'),
    ...P('M 330 504 L 330 478 L 560 475 L 560 501'),
    ...P('M 360 478 L 360 460 L 520 458 L 520 476'),
    ...P('M 440 458 L 446 412 L 474 412 L 478 458'),
    ...P('M 300 502 L 300 440 M 620 499 L 620 446 M 300 440 L 620 446'),
    ...P('M 345 490 H 550 M 372 468 H 508'),
  ]
}
function bundMask(g: Ctx) {
  const path = (pts: number[] | Pt[], close = true) => {
    g.beginPath()
    const a = (pts as any[])[0] instanceof Array ? (pts as Pt[]).flat() : (pts as number[])
    for (let i = 0; i < a.length; i += 2) (i ? g.lineTo(a[i], a[i + 1]) : g.moveTo(a[i], a[i + 1]))
    if (close) g.closePath()
  }
  g.lineJoin = 'round'
  for (let bi = BUND.length - 1; bi >= 0; bi--) {
    const b = BUND[bi], G0 = bundGeo(b)
    path(G0.side); g.fillStyle = '#707070'; g.fill()
    path(G0.front); g.fillStyle = '#a8a8a8'; g.fill()
    for (const p of G0.top) { path(p); g.fillStyle = '#b8b8b8'; g.fill() }
    for (const p of G0.pyr) { path(p); g.fillStyle = '#b0b0b0'; g.fill() }
    g.strokeStyle = '#3a3a3a'
    g.lineWidth = 2
    for (let f = 1; f * 17 * G0.d < b.h * G0.d - 8; f++) {
      const y = G0.yb - f * 17 * G0.d
      g.beginPath(); g.moveTo(G0.x0 + 3, y); g.lineTo(G0.x0 + G0.W0 - 3, y); g.stroke()
    }
    g.strokeStyle = '#fff'
    g.lineWidth = 3
    path(G0.front, false); g.stroke()
    for (const p of G0.top) { path(p, false); g.stroke() }
    path(G0.side, false); g.lineWidth = 2; g.stroke()
  }
  // embankment strip
  g.fillStyle = '#5a5a5a'
  g.beginPath()
  g.moveTo(-10, 500)
  for (let u = 0; u <= 0.95; u += 0.05) g.lineTo(bundX(u), bundY(u) + 16 * bundD(u))
  for (let u = 0.95; u >= 0; u -= 0.05) g.lineTo(bundX(u), bundY(u))
  g.lineTo(-10, 482)
  g.fill()
  // the steamer
  const S = shipGeo()
  path(S[0]); g.fillStyle = '#8a8a8a'; g.fill()
  for (const p of S.slice(1, 4)) { path(p); g.fillStyle = '#6a6a6a'; g.fill() }
  g.strokeStyle = '#fff'
  g.lineWidth = 3
  for (const p of S) { path(p, false); g.stroke() }
}
const D9CH = [...CORPUS.replace(/[，。、；：！？—…“”「」\s]/g, '')]
type CityStroke = { p: Poly; kill: number; w: number }
let D9S: CityStroke[] | null = null
let D9LIT: Poly | null = null
function d9strokes(): CityStroke[] {
  if (D9S) return D9S
  const out: CityStroke[] = []
  const add = (p: Poly, kill: number, w = 1.5) => out.push({ p, kill, w })
  // the Bund frontage in perspective, south → north (near/left → far/right)
  BUND.forEach((b, bi) => {
    const g = bundGeo(b)
    const kb = 169.0 + (1 - g.x0 / 1500) * 2.1
    const K = (j: number) => kb + rand(bi * 31 + j, 7) * 0.35
    add(flat(g.front), K(1), 1.6)
    add(flat(g.side), K(2), 1.2)
    for (const p of g.top) add(p, K(3), 1.3)
    for (let f = 1; f * 17 * g.d < b.h * g.d - 8; f++) {
      const y = g.yb - f * 17 * g.d
      add(flat([[g.x0 + 4 * g.d, y], [g.x0 + (b.w - 4) * g.d, y]]), K(10 + f), 0.6)
    }
    for (let x = 14; x < b.w - 8; x += 22) add(flat([[g.x0 + x * g.d, g.yb - b.h * g.d + 8 * g.d], [g.x0 + x * g.d, g.yb - 6 * g.d]]), K(40 + x), 0.5)
    if (b.clock) add(flat(blobPts(g.x0 + 60 * g.d, g.yb - b.h * g.d - 56 * g.d, 10 * g.d, 10 * g.d, 2, 0.02, 16)), K(80), 1.1)
  })
  // the embankment: water's edge, promenade rail and lamps
  const edge: Pt[] = [[-120, 498]]
  for (let u = 0; u <= 0.95; u += 0.05) edge.push([bundX(u), bundY(u) + 16 * bundD(u)])
  add(flat(edge), 171.2, 1.4)
  for (let u = 0.01; u < 0.93; u += 0.025) {
    const x = bundX(u), y = bundY(u) + 16 * bundD(u), d = bundD(u)
    add(flat([[x, y], [x, y - 9 * d]]), 169.0 + (1 - x / 1500) * 2.1 + 0.2, 0.6)
  }
  add(flat(edge.map(([x, y]) => [x, y - 9 * 0.9] as Pt)), 170.6, 0.8)
  // a steamer moored in the foreground river
  const ship = shipGeo()
  for (const p of ship) add(p, 169.6 + rand(p.length, 3) * 0.6, 1.4)
  // Eddington House, a large ghost in front at left (elevation, rounded corner at right)
  const ax = 1460, aw = 300, atop = 70, abot = 620
  add(flat([[ax, abot], [ax, atop], [ax + aw - 30, atop]]), 168.6, 1.8)
  add(flat(qb([ax + aw - 30, atop], [ax + aw, atop], [ax + aw, atop + 30], 6).concat([[ax + aw, abot]])), 168.4, 1.8)
  for (let n = 0; n < 8; n++) {
    const y = atop + 40 + n * 62
    add(flat([[ax - 6, y], [ax + aw + 6, y]]), 167.9 + rand(n, 4) * 1.4, 1.2)
    add(flat([[ax - 6, y + 6], [ax + aw + 6, y + 6]]), 167.9 + rand(n, 5) * 1.4, 0.8)
    for (let c = 0; c < 5; c++) add(rectP(ax + 14 + c * 56, y + 16, 34, 34), 168.0 + rand(n * 7 + c, 6) * 1.4, 0.7)
  }
  for (let c = 0; c <= 5; c++) add(flat([[ax + 6 + c * 56, atop], [ax + 6 + c * 56, abot]]), 168.2 + rand(c, 7) * 1.2, 1.2)
  D9LIT = rectP(ax + 14 + 1 * 56, atop + 40 + 4 * 62 + 16, 34, 34)
  D9S = out
  return out
}
const sceneD9: Scene = {
  id: 'D9-undraw',
  t0: T9,
  t1: TEND,
  theme: 'night',
  trans: { kind: 'dissolve', dur: 1.0 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.1, seed: 5 })
    const k = ease.inOutSine(prog(lt, 0, 9.5))
    ctx.save()
    camera(ctx, lerp(940, 960, k), lerp(370, 330, k), lerp(1.08, 0.98, k))
    // moon over the river
    const mx = 1240, my = 118
    moon(ctx, mx, my, 40, { glow: 0.8 + 0.2 * smoothstep(171, 175, t), wet: 0.3, t })
    // the river of words: first the Huangpu below the embankment, then (after 171.8) the open sea to the horizon
    const sea = smoothstep(171.4, 173.6, t)
    textPlane(ctx, {
      y0: lerp(505, HZN, sea), y1: 900, rows: 18, t, light: lerp(0.45, 0.95, sea), lightX: mx, speed: 0.6,
      alpha: lerp(0.4, 0.75, sea) * (1 - 0.7 * envelope(t, 170.6, 172.4, 0.5, 0.6)), color: [176, 190, 222],
    })
    // the city made of her words (sweeps away right → left, glyphs scattering)
    const city = 1 - ease.inOutSine(prog(t, 169.0, 171.7))
    textImage(ctx, { key: 'D9-bund', cell: 8, emerge: city, order: 'sweepX', scatter: 220, color: '#c9d3e6', gamma: 1.0, t, seed: 11, alpha: 0.95, draw: bundMask })
    // Sassoon House's green roof
    const sas = bundGeo(BUND[6])
    wash(ctx, sas.pyr, C.jade, { alpha: 0.5 * (1 - prog(t, 169.6, 170.4)), blur: 1.5 })
    // horizon: one long fresh line once the city has gone
    penStroke(ctx, flat([[-300, HZN], [2300, HZN + 2]]), ease.inOutSine(prog(t, 171.0, 172.6)), chalk(t, { width: 1.5, alpha: 0.85, seed: 1 }))
    // the moon's column on the water (grows as the city leaves)
    const col = 0.35 + 0.65 * smoothstep(171.0, 174.5, t)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 26; i++) {
      const y = HZN + 8 + i * 7
      const ww = (60 - i * 1.4) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.9)) * col
      ctx.globalAlpha = 0.28 * col * (1 - i / 28)
      ctx.fillStyle = 'rgb(243,217,164)'
      ctx.fillRect(mx - ww / 2 + Math.sin(i * 2.1 + t) * 8, y, ww, 2.2)
    }
    ctx.restore()
    // the city, lifting away stroke by stroke
    const S = d9strokes()
    S.forEach((s, i) => {
      const u = (t - s.kill) / 1.1
      if (u >= 1) return
      if (u <= 0) {
        penStroke(ctx, s.p, 1, chalk(t, { width: s.w, alpha: s.w > 1 ? 0.7 : 0.4, seed: i }))
        return
      }
      const e = ease.inCubic(u)
      ctx.save()
      ctx.translate(Math.sin(i) * 6 * e, -e * 46)
      penStroke(ctx, s.p, 1 - ease.outCubic(u), chalk(t, { width: s.w, alpha: 0.78 * (1 - e), seed: i }))
      ctx.restore()
      // the line becomes a character, drifting up and away
      if (s.w >= 1.1) {
        const m0 = s.p.length >> 1
        const px = s.p[m0 & ~1], py = s.p[(m0 & ~1) + 1]
        ctx.save()
        ctx.font = `400 ${14 + rand(i, 9) * 8}px ${FONT.kai}`
        ctx.fillStyle = C.lineNight
        ctx.globalAlpha = 0.7 * Math.sin(u * Math.PI)
        ctx.fillText(D9CH[i % D9CH.length], px + (rand(i, 1) - 0.5) * 30 - u * 40, py - u * (60 + rand(i, 3) * 80))
        ctx.restore()
      }
    })
    // her sixth-floor window, the last light, goes out on the beat
    if (D9LIT) {
      const off = 1 - smoothstep(beatTime(327), beatTime(327) + 0.4, t)
      if (off > 0) {
        wash(ctx, [D9LIT], C.moon, { alpha: 0.7 * off, blur: 2 })
        glowAt(ctx, D9LIT[0] + 17, D9LIT[1] + 17, 70, 'rgba(243,217,164,ALPHA)', 0.3 * off)
      }
    }
    ctx.restore()
    yearMark(ctx, t, { text: '1952', x: 120, y: 150, t0: 167.6, t1: 171.4, size: 70, color: 'rgba(234,228,214,1)' })
  },
}

export const scenes: Scene[] = [sceneD1, sceneD2, sceneD3, sceneD4, sceneD5, sceneD6, sceneD7, sceneD8, sceneD9]
