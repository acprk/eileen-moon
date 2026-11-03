/**
 * Segment C · 76.324–110.573 s · 1939–1944 (chorus 1 + interlude). Owner: agent C.
 *
 *   C1  76.324– 80.504  k0–k8    1939 Hong Kong: HKU Main Building, the Peak, the harbour, built up beat by beat
 *   C2  80.504– 90.349  k8–k27   《天才梦》: manuscript + a gorgeous robe on a 衣桁; washes bloom on beats; fleas
 *   C3  90.349– 96.340  k27–k38  winter 1941: Hong Kong falls — searchlights, tracers, the city fractures on bars
 *   C4  96.340–100.542  k38–k46  《倾城之恋》: the broken wall, two silhouettes, a city of lines tilting over
 *   C5a 100.542–104.536 k46–k54  1943 Shanghai, 福州路 newsstand: eight titles stamp in, one per beat
 *   C5b 104.536–110.573 k54–k66  1944 《传奇》 sells out in four beats; she stands in her own bold clothes
 *
 * k = beat index relative to the chorus downbeat 76.324 (k66 = 110.573, the segment's last downbeat).
 */
import { C, FONT, H, W } from '../config'
import { glowAt, moon, nightPaper, oldPaper } from '../lib/ground'
import { TAU, beatIndex, beatPulse, beatTime, clamp, ease, hit, lerp, prog, rand } from '../lib/math'
import { glyphAtlas, textImage, textPlane, textRain } from '../lib/textmatter'
import type { Scene } from '../lib/film'
import { hatch, pathPolys, penDraw, penStroke, sketchEllipse, sketchLine, wash, type PenStyle, type Poly } from '../lib/pen'
import { eileen } from '../lib/eileen'
import { writeVertical, yearMark } from '../lib/type'
import { cached, paperBase, paperStains, type Ctx } from '../lib/texture'

// ───────────────────────────── beat grid ─────────────────────────────
const K0 = beatIndex(76.33)
const bt = (k: number) => beatTime(K0 + k)
/** eased 0→1 starting exactly on beat k */
const on = (t: number, k: number, dur = 0.45) => ease.outCubic(prog(t, bt(k), bt(k) + dur))
const kick = (t: number, k: number, decay = 7) => hit(t, bt(k), decay)
const kicks = (t: number, ks: number[], decay = 7) => ks.reduce((m, k) => Math.max(m, kick(t, k, decay)), 0)
/** beat position relative to k0 (continuous) */
const kpos = (t: number) => {
  const i = beatIndex(t)
  return i - K0 + (t - beatTime(i)) / (beatTime(i + 1) - beatTime(i))
}

// ───────────────────────────── styles & geometry ─────────────────────────────
const ink = (t: number, o: PenStyle = {}): PenStyle => ({ width: 2.2, color: C.ink, boil: 8, t, ...o })
const chalk = (t: number, o: PenStyle = {}): PenStyle => ({ width: 1.9, color: C.lineNight, boil: 8, t, alpha: 0.9, ...o })
const still = (o: PenStyle = {}): PenStyle => ({ width: 1.3, color: C.ink, boil: 0, nib: false, wobble: 0.7, ...o })

const rectP = (x: number, y: number, w: number, h: number): Poly => [x, y, x + w, y, x + w, y + h, x, y + h, x, y]
const seg = (x0: number, y0: number, x1: number, y1: number): Poly => [x0, y0, x1, y1]
function mapP(polys: Poly[], f: (x: number, y: number) => [number, number]): Poly[] {
  return polys.map((p) => {
    const o: Poly = []
    for (let i = 0; i < p.length; i += 2) {
      const [a, b] = f(p[i], p[i + 1])
      o.push(a, b)
    }
    return o
  })
}
/** SVG path / polys in local units → screen: scale s, rotate rot, translate (x, y). */
function local(d: string | Poly[], x: number, y: number, s: number, rot = 0, flip = false): Poly[] {
  const polys = typeof d === 'string' ? pathPolys(d) : d
  const c = Math.cos(rot), sn = Math.sin(rot)
  return mapP(polys, (px, py) => {
    const qx = (flip ? -px : px) * s, qy = py * s
    return [x + qx * c - qy * sn, y + qx * sn + qy * c]
  })
}
function pathOf(polys: Poly[], closed = true) {
  const p = new Path2D()
  for (const q of polys) {
    p.moveTo(q[0], q[1])
    for (let i = 2; i < q.length; i += 2) p.lineTo(q[i], q[i + 1])
    if (closed) p.closePath()
  }
  return p
}
function inPoly(p: Poly, x: number, y: number) {
  let c = false
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
/** Sub-polyline between arc-length fractions a..b. */
function subPoly(p: Poly, a: number, b: number): Poly {
  let L = 0
  const acc = [0]
  for (let i = 2; i < p.length; i += 2) acc.push((L += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1])))
  const A = clamp(a) * L, B = clamp(b) * L
  const out: Poly = []
  for (let k = 0; k < acc.length; k++) {
    const s = acc[k]
    if (s >= A && s <= B) out.push(p[k * 2], p[k * 2 + 1])
  }
  return out
}

/** Full-frame offscreen layer drawn once (static detail, no boil). */
const layer = (key: string, draw: (g: Ctx) => void) => cached(`segC:${key}`, W, H, (g) => draw(g))
/** Cached hatching in world coords (hatch is expensive: draw once, fade in with alpha). */
type HatchOpts = Parameters<typeof hatch>[2]
function hatchL(key: string, region: Poly[], o: HatchOpts, m?: DOMMatrix) {
  return layer(`h:${key}`, (g) => {
    if (m) g.setTransform(m)
    hatch(g, region, { ...o, boil: 0, progress: 1 })
  })
}
function drawL(ctx: Ctx, img: CanvasImageSource, a: number) {
  if (a <= 0) return
  ctx.save()
  ctx.globalAlpha *= clamp(a)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}
/** Reused per-frame scratch canvas (cleared on each use). */
function scratch(key: string) {
  const c = cached(`segC:scr:${key}`, W, H, () => undefined)
  const g = c.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.filter = 'none'
  g.clearRect(0, 0, W, H)
  return { c, g }
}
/** Reveal a cached layer: radial from (x, y), or a sweep. */
function reveal(ctx: Ctx, img: CanvasImageSource, p: number, o: { x?: number; y?: number; mode?: 'radial' | 'lr' | 'rl' | 'bt'; alpha?: number } = {}) {
  if (p <= 0) return
  ctx.save()
  if (p < 1) {
    ctx.beginPath()
    const m = o.mode ?? 'radial'
    if (m === 'lr') ctx.rect(-50, -50, (W + 100) * p, H + 100)
    else if (m === 'rl') ctx.rect(W + 50 - (W + 100) * p, -50, (W + 100) * p, H + 100)
    else if (m === 'bt') ctx.rect(-50, H + 50 - (H + 100) * p, W + 100, (H + 100) * p)
    else ctx.arc(o.x ?? W / 2, o.y ?? H / 2, p * Math.hypot(W, H), 0, TAU)
    ctx.clip()
  }
  ctx.globalAlpha *= o.alpha ?? 1
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

/** Camera matrix: focus point (fx, fy) at screen centre, scale s, roll rot. */
type Cam = { fx: number; fy: number; s: number; rot?: number; dx?: number; dy?: number }
function camM(c: Cam, depth = 1) {
  const fx = W / 2 + (c.fx - W / 2) * depth, fy = H / 2 + (c.fy - H / 2) * depth
  const s = 1 + (c.s - 1) * depth
  return new DOMMatrix()
    .translate(W / 2 + (c.dx ?? 0) * depth, H / 2 + (c.dy ?? 0) * depth)
    .rotate(((c.rot ?? 0) * depth * 180) / Math.PI)
    .scale(s)
    .translate(-fx, -fy)
}
function setCam(ctx: Ctx, base: DOMMatrix, c: Cam, depth = 1) {
  ctx.setTransform(base.multiply(camM(c, depth)))
}

// ───────────────────────────── 3-D projector (for architecture) ─────────────────────────────
type V3 = [number, number, number]
function projector(p: V3, tg: V3, f: number, cx: number, cy: number) {
  const yaw = Math.atan2(tg[0] - p[0], tg[2] - p[2])
  const pitch = Math.atan2(tg[1] - p[1], Math.hypot(tg[0] - p[0], tg[2] - p[2]))
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  return (q: V3): [number, number] => {
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2]
    const x1 = dx * cyw - dz * syw
    const z1 = dx * syw + dz * cyw
    const y2 = dy * cp - z1 * sp
    const z2 = Math.max(0.5, dy * sp + z1 * cp)
    return [cx + (f * x1) / z2, cy - (f * y2) / z2]
  }
}

// ───────────────────────────── small drawn props ─────────────────────────────
function palm(x: number, y: number, h: number, lean: number, seed: number): Poly[] {
  const out: Poly[] = []
  const tx = x + lean * h, ty = y - h
  const trunk: Poly = []
  for (let i = 0; i <= 16; i++) {
    const s = i / 16
    trunk.push(lerp(x, tx, s) + Math.sin(s * Math.PI) * h * 0.06 * (lean > 0 ? -1 : 1), lerp(y, ty, s))
  }
  out.push(trunk, trunk.map((v, i) => (i & 1 ? v : v + 7 * (1 - (i / trunk.length) * 0.6))))
  // trunk rings
  for (let i = 1; i < 14; i++) {
    const s = i / 14
    const cx = lerp(x, tx, s) + Math.sin(s * Math.PI) * h * 0.06 * (lean > 0 ? -1 : 1), cy = lerp(y, ty, s)
    out.push(seg(cx - 2, cy, cx + 9, cy - 2))
  }
  const n = 9
  for (let k = 0; k < n; k++) {
    const a = -Math.PI + ((k + 0.5) / n) * Math.PI + (rand(k, seed) - 0.5) * 0.4
    const L = h * (0.42 + rand(k, seed + 1) * 0.16)
    const droop = 0.55 + rand(k, seed + 2) * 0.4
    const fr: Poly = []
    const pts: [number, number][] = []
    for (let i = 0; i <= 14; i++) {
      const s = i / 14
      const px = tx + Math.cos(a) * L * s, py = ty + Math.sin(a) * L * s * 0.7 + droop * L * s * s * 0.6
      fr.push(px, py)
      pts.push([px, py])
    }
    out.push(fr)
    for (let i = 3; i < 14; i += 1) {
      const [px, py] = pts[i]
      const [qx, qy] = pts[i - 1]
      const dx = px - qx, dy = py - qy, dl = Math.hypot(dx, dy) || 1
      const ll = L * 0.16 * (1 - i / 18)
      out.push(seg(px, py, px + (dx / dl) * ll * 0.5 - (dy / dl) * ll * 0.3, py + (dy / dl) * ll * 0.5 + ll * 0.75))
      out.push(seg(px, py, px + (dx / dl) * ll * 0.5 + (dy / dl) * ll * 0.3, py + (dy / dl) * ll * 0.5 + ll * 0.75))
    }
  }
  return out
}

/** Chinese junk with three batten sails (local units, ~100 wide). */
function junk(x: number, y: number, s: number): Poly[] {
  const d: string[] = [
    'M -48 0 C -30 10 30 10 52 -8 L 46 -12 C 20 -4 -20 -4 -44 -8 Z',
    'M -14 -6 L -14 -70', 'M 14 -6 L 16 -56', 'M -36 -8 L -38 -40',
    'M -14 -70 C -2 -66 8 -60 10 -50 L 6 -14 L -14 -14',
    'M 16 -56 C 26 -52 34 -46 36 -38 L 32 -14 L 16 -14',
    'M -38 -40 C -30 -38 -24 -34 -22 -28 L -24 -12 L -38 -12',
    'M -14 -60 L 9 -56', 'M -14 -50 L 9 -46', 'M -14 -40 L 8 -36', 'M -14 -30 L 7 -26', 'M -14 -22 L 7 -19',
    'M 16 -46 L 34 -42', 'M 16 -36 L 33 -32', 'M 16 -26 L 32 -23',
    'M -38 -32 L -23 -29', 'M -38 -24 L -24 -21',
  ]
  return local(d.join(' '), x, y, s)
}
function ferry(x: number, y: number, s: number): Poly[] {
  return local('M -60 0 C -40 8 40 8 62 -2 L 58 -10 L -58 -10 Z M -44 -10 L -44 -22 L 40 -22 L 40 -10 M -40 -22 L -36 -30 L 30 -30 L 34 -22 M -4 -30 L -4 -44 L 6 -44 L 6 -30 M -36 -16 L 34 -16 M -30 -22 L -30 -10 M -16 -22 L -16 -10 M -2 -22 L -2 -10 M 12 -22 L 12 -10 M 26 -22 L 26 -10', x, y, s)
}
function gull(x: number, y: number, s: number, ph: number): Poly[] {
  const f = Math.sin(ph) * 5
  return local(`M -12 ${f} C -8 ${-4 + f * 0.3} -3 -4 0 0 C 3 -4 8 ${-4 + f * 0.3} 12 ${f}`, x, y, s)
}

// ═════════════════════════════ C1 · 1939 Hong Kong ═════════════════════════════

const HKU = (() => {
  const pr = projector([-10, 5, -60], [50, 7, 0], 940, 880, 400)
  const P = (pts: V3[]): Poly => pts.flatMap((q) => pr(q))
  const L = (a: V3, b: V3): Poly => P([a, b])
  const NB = 11, X0 = 7, X1 = 77, BW = (X1 - X0) / NB
  const arch = (xa: number, xb: number, yb: number, ys: number, z = 0): V3[] => {
    const r = (xb - xa) / 2, xc = (xa + xb) / 2
    const pts: V3[] = [[xa, yb, z], [xa, ys, z]]
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI
      pts.push([xc + r * Math.cos(a), ys + r * Math.sin(a), z])
    }
    pts.push([xb, ys, z], [xb, yb, z])
    return pts
  }
  const tower = (x: number) => x >= 38 && x <= 46
  // frame (k1)
  const frame: Poly[] = [
    L([0, 0, -1.2], [84, 0, -1.2]),
    L([7, 7.4, 0], [77, 7.4, 0]), L([7, 7.9, 0], [77, 7.9, 0]),
    L([0, 14.2, 0], [84, 14.2, 0]), L([0, 15, 0], [84, 15, 0]), L([0, 16.4, 0], [38, 16.4, 0]), L([46, 16.4, 0], [84, 16.4, 0]),
    // pavilions (project 1.2 forward)
    P([[0, 0, -1.2], [0, 18, -1.2], [7, 18, -1.2], [7, 0, -1.2]]),
    P([[77, 0, -1.2], [77, 18, -1.2], [84, 18, -1.2], [84, 0, -1.2]]),
    P([[-0.4, 18, -1.6], [3.5, 21.2, 2], [7.4, 18, -1.6]]), P([[76.6, 18, -1.6], [80.5, 21.2, 2], [84.4, 18, -1.6]]),
    L([-0.4, 18, -1.6], [7.4, 18, -1.6]), L([76.6, 18, -1.6], [84.4, 18, -1.6]),
    // near side face of the left pavilion and the main block
    L([0, 0, -1.2], [0, 0, 16]), L([0, 18, -1.2], [0, 18, 16]), L([0, 0, 16], [0, 18, 16]),
    L([-0.4, 18, -1.6], [-0.4, 18, 16.4]), L([3.5, 21.2, 2], [3.5, 21.2, 12]),
  ]
  const arches0: Poly[] = [], arches1: Poly[] = []
  const open0: Poly[] = [], open1: Poly[] = []
  for (let i = 0; i < NB; i++) {
    const xa = X0 + i * BW + 0.6, xb = X0 + (i + 1) * BW - 0.6
    const a0 = arch(xa, xb, 0, 4.4)
    arches0.push(P(a0))
    open0.push(P(a0))
    const a1 = arch(xa, xb, 7.9, 11.4)
    arches1.push(P(a1))
    open1.push(P(a1))
  }
  // tower (k4)
  const tw: Poly[] = [
    P([[38, 16.4, -1], [38, 28, -1], [46, 28, -1], [46, 16.4, -1]]),
    L([38, 16.4, -1], [38, 16.4, 6]), L([38, 28, -1], [38, 28, 6]), L([38, 28, 6], [38, 16.4, 6]),
    P([[37.4, 28, -1.6], [46.6, 28, -1.6], [46.6, 29, -1.6], [37.4, 29, -1.6], [37.4, 28, -1.6]]),
    P([[39.4, 29, -0.4], [39.4, 32.4, -0.4], [44.6, 32.4, -0.4], [44.6, 29, -0.4]]),
    P(Array.from({ length: 17 }, (_, i): V3 => {
      const a = Math.PI - (i / 16) * Math.PI
      return [42 + 2.9 * Math.cos(a), 32.4 + 3.2 * Math.sin(a) ** 0.8, -0.4]
    })),
    L([42, 35.6, -0.4], [42, 38, -0.4]),
    P(Array.from({ length: 33 }, (_, i): V3 => [42 + 2.3 * Math.cos((i / 32) * TAU), 24.4 + 2.3 * Math.sin((i / 32) * TAU), -1.05])),
    L([42, 24.4, -1.05], [42, 26.0, -1.05]), L([42, 24.4, -1.05], [43.1, 24.0, -1.05]),
  ]
  // steps + terrace (k5)
  const steps: Poly[] = []
  for (let i = 0; i < 6; i++) {
    const z = -1.2 - i * 1.1, y = -i * 0.42
    steps.push(L([37 - i * 0.6, y, z], [47 + i * 0.6, y, z]))
  }
  steps.push(L([37, 0, -1.2], [33.4, -2.5, -7.8]), L([47, 0, -1.2], [50.6, -2.5, -7.8]))
  const terrace: Poly[] = [L([-14, -2.5, -9], [96, -2.5, -9]), L([-14, -1.3, -9.2], [96, -1.3, -9.2])]
  for (let x = -14; x <= 96; x += 4) terrace.push(L([x, -2.5, -9.1], [x, -1.0, -9.1]))
  // silhouette quads for occluding the hills
  const sil: Poly[] = [
    P([[0, -2.6, -1.2], [84, -2.6, -1.2], [84, 18, -1.2], [0, 18, -1.2]]),
    P([[-0.4, 18, -1.6], [3.5, 21.2, 2], [7.4, 18, -1.6]]), P([[76.6, 18, -1.6], [80.5, 21.2, 2], [84.4, 18, -1.6]]),
    P([[0, -2.6, -1.2], [0, -2.6, 16], [0, 18, 16], [0, 18, -1.2]]), P([[-0.4, 18, -1.6], [-0.4, 18, 16.4], [3.5, 21.2, 12], [3.5, 21.2, 2]]),
    P([[38, 16, -1], [46, 16, -1], [46, 29, -1.6], [38, 29, -1.6]]), P([[38, 16, -1], [38, 16, 6], [38, 29, 6], [38, 29, -1]]),
    P([[39.4, 29, -0.4], [44.6, 29, -0.4], [44.6, 33, -0.4], [42, 36, -0.4], [39.4, 33, -0.4]]),
  ]
  const far = pr([84, 0, -1.2]), near = pr([0, 0, -1.2]), towerTop = pr([42, 38, -0.4]), stepFoot = pr([42, -2.5, -8])
  const terraceR = pr([96, -2.5, -9])
  const HZ = pr([400, 5, 3000])[1]

  // static detail: rustication, balusters, dentils, windows, keystones, recess shading
  function detail(g: Ctx) {
    const st = still({ width: 1.1, alpha: 0.85 })
    const D: Poly[] = []
    for (let i = 0; i <= NB; i++) {
      const xc = X0 + i * BW
      for (let y = 0.8; y < 7.2; y += 0.8) D.push(L([xc - 0.6, y, 0], [xc + 0.6, y, 0]))
    }
    for (const px of [0, 77]) {
      for (let y = 0.8; y < 7.2; y += 0.8) D.push(L([px, y, -1.2], [px + 7, y, -1.2]))
      D.push(L([px, 7.4, -1.2], [px + 7, 7.4, -1.2]), L([px, 14.2, -1.2], [px + 7, 14.2, -1.2]), L([px, 15, -1.2], [px + 7, 15, -1.2]))
      for (const wx of [1.4, 4.2]) {
        D.push(P(arch(px + wx, px + wx + 1.5, 9.2, 12.2, -1.2)), L([px + wx - 0.2, 9.0, -1.2], [px + wx + 1.7, 9.0, -1.2]))
        D.push(P([[px + wx, 2, -1.2], [px + wx, 5.4, -1.2], [px + wx + 1.5, 5.4, -1.2], [px + wx + 1.5, 2, -1.2], [px + wx, 2, -1.2]]))
        D.push(L([px + wx + 0.75, 2, -1.2], [px + wx + 0.75, 5.4, -1.2]), L([px + wx, 3.7, -1.2], [px + wx + 1.5, 3.7, -1.2]))
        D.push(P([[px + wx - 0.3, 5.6, -1.2], [px + wx + 0.75, 6.4, -1.2], [px + wx + 1.8, 5.6, -1.2]]))
      }
      for (let y = 15.4; y < 18; y += 0.7) D.push(L([px, y, -1.2], [px + 7, y, -1.2]))
    }
    for (let i = 0; i < NB; i++) {
      const xa = X0 + i * BW + 0.6, xb = X0 + (i + 1) * BW - 0.6, xc = (xa + xb) / 2
      D.push(P([[xc - 0.35, 7.0, 0], [xc - 0.25, 6.4, 0], [xc + 0.25, 6.4, 0], [xc + 0.35, 7.0, 0]]))
      D.push(P([[xc - 0.35, 14.0, 0], [xc - 0.25, 13.4, 0], [xc + 0.25, 13.4, 0], [xc + 0.35, 14.0, 0]]))
      D.push(L([xa, 9.1, 0], [xb, 9.1, 0]))
      for (let x = xa + 0.3; x < xb; x += 0.42) D.push(L([x, 7.9, 0], [x, 9.1, 0]))
      // inner back wall doors glimpsed through the arcade
      D.push(P([[xc - 0.8, 0, 3], [xc - 0.8, 3.2, 3], [xc + 0.8, 3.2, 3], [xc + 0.8, 0, 3]]))
      D.push(P([[xc - 0.7, 8.4, 3], [xc - 0.7, 11.2, 3], [xc + 0.7, 11.2, 3], [xc + 0.7, 8.4, 3]]))
    }
    for (let x = 0.2; x < 84; x += 0.5) if (!tower(x)) D.push(L([x, 14.2, 0], [x, 14.6, 0]))
    for (let x = 0.4; x < 84; x += 0.6) if (!tower(x) && (x < 0 || x > 7) && x < 77) D.push(L([x, 15.1, 0], [x, 16.3, 0]))
    // tower windows & clock ticks
    for (const wx of [39.2, 43.4]) D.push(P(arch(wx, wx + 1.4, 17.2, 20.2, -1)))
    D.push(L([38, 21.6, -1], [46, 21.6, -1]), L([38, 22, -1], [46, 22, -1]))
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      D.push(L([42 + 1.9 * Math.cos(a), 24.4 + 1.9 * Math.sin(a), -1.05], [42 + 2.2 * Math.cos(a), 24.4 + 2.2 * Math.sin(a), -1.05]))
    }
    for (let x = 39.9; x < 44.6; x += 0.9) D.push(L([x, 29, -0.4], [x, 32.4, -0.4]))
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.15 + 0.7 * (i / 8))
      D.push(L([42 + 2.9 * Math.cos(a) * 0.9, 32.6, -0.4], [42 + 0.3 * Math.cos(a), 35.4, -0.4]))
    }
    // side face courses
    for (let y = 0.8; y < 18; y += 0.8) D.push(L([0, y, -1.2], [0, y, 16]))
    penDraw(g, D, 1, st, 0)
    // shade: arcade recesses + side face
    g.save()
    g.globalAlpha = 0.85
    wash(g, open0, C.inkSoft, { alpha: 0.42, blur: 2 })
    wash(g, open1, C.inkSoft, { alpha: 0.3, blur: 2 })
    g.restore()
    hatch(g, [P([[0, 0, -1.2], [0, 0, 16], [0, 18, 16], [0, 18, -1.2]])], { angle: 1.25, gap: 6, color: C.ink, alpha: 0.4, width: 0.9, boil: 0 })
    hatch(g, [P([[38, 16.4, -1], [38, 16.4, 6], [38, 28, 6], [38, 28, -1]])], { angle: 1.25, gap: 5, color: C.ink, alpha: 0.4, width: 0.9, boil: 0 })
    for (const op of open0) hatch(g, [op], { angle: -0.9, gap: 5, color: C.ink, alpha: 0.35, width: 0.8, boil: 0 })
  }
  return { pr, P, frame, arches0, arches1, tw, steps, terrace, sil, far, near, towerTop, stepFoot, terraceR, HZ, detail }
})()

function hkHills(): Poly[] {
  const f = HKU.far, n = HKU.near
  return [
    // the Peak behind the university, falling to the harbour
    [n[0] - 400, 150, n[0] - 120, 96, n[0] + 160, 70, n[0] + 420, 92, n[0] + 640, 140, f[0] - 40, 190, f[0] + 120, 240, f[0] + 260, 262],
    [n[0] - 300, 230, n[0] + 20, 200, n[0] + 300, 182, n[0] + 560, 200, f[0], 250],
  ]
}
function kowloon(): Poly[] {
  const x0 = HKU.far[0] + 120, z = HKU.HZ
  return [
    [x0, z - 4, x0 + 120, z - 16, x0 + 210, z - 34, x0 + 260, z - 52, x0 + 300, z - 44, x0 + 380, z - 30, x0 + 520, z - 22, x0 + 700, z - 12],
    [x0 + 30, z + 2, W - 60, z + 2],
  ]
}

const sceneC1: Scene = {
  id: 'C1-hongkong-1939',
  t0: bt(0),
  t1: bt(8),
  theme: 'paper',
  trans: { kind: 'flash', dur: 0.35 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.28 })
    const base = ctx.getTransform()
    const T = ease.inOutSine(clamp(lt / 4.6))
    const cam: Cam = { fx: lerp(860, 940, T), fy: lerp(330, 318, T), s: lerp(1.06, 1.12, T) }
    const st = ink(t)
    // ── background: the Peak (occluded by the building), Kowloon, harbour ──
    {
      const { c, g } = scratch('c1hills')
      g.setTransform(camM(cam, 0.45))
      penDraw(g, hkHills(), on(t, 0, 0.9), { ...st, width: 2.0, alpha: 0.75 })
      drawL(g, hatchL('c1hill', [[...hkHills()[0], HKU.far[0] + 260, 330, HKU.near[0] - 400, 330]], { angle: -0.6, gap: 9, color: C.ink, alpha: 0.18, width: 0.9 }), on(t, 2, 1.2))
      g.setTransform(camM(cam, 1))
      g.globalCompositeOperation = 'destination-out'
      g.fillStyle = '#000'
      for (const q of HKU.sil) g.fill(pathOf([q]))
      ctx.setTransform(base)
      ctx.drawImage(c, 0, 0)
    }
    setCam(ctx, base, cam, 0.5)
    const hx = HKU.far[0]
    penDraw(ctx, kowloon(), on(t, 0, 0.8), { ...st, width: 1.5, alpha: 0.6 })
    // harbour water
    const z = HKU.HZ
    const waterR: Poly = [hx + 60, z + 2, W + 100, z + 2, W + 100, z + 200, hx + 120, z + 200]
    // the harbour: a sea of her words, with the afternoon light lying on it
    ctx.save()
    ctx.clip(pathOf([waterR]))
    ctx.globalAlpha *= on(t, 1, 1.2)
    textPlane(ctx, { y0: z + 2, y1: z + 300, rows: 18, t, color: [50, 36, 24], light: 0.6, lightX: hx + 470, speed: 0.6, alpha: 1.6, words: ['天才梦', '生命是一袭华美的袍', '香港', '浅水湾', '半山', '我充满了生命的欢悦', '一九三九'] })
    ctx.restore()
    // boats drift across on the harbour
    penDraw(ctx, junk(hx + 560 - (t - bt(0)) * 6, z + 150, 0.95), on(t, 6, 0.6), { ...st, width: 1.6 })
    penDraw(ctx, junk(hx + 220, z + 30, 0.42), on(t, 7, 0.5), { ...st, width: 1.1, alpha: 0.7 })
    for (let i = 0; i < 4; i++) {
      const gx = hx + 300 + i * 70 + (t - bt(0)) * (18 + i * 4), gy = 150 + i * 22 + Math.sin(t * 2 + i) * 6
      penDraw(ctx, gull(gx, gy, 0.9 - i * 0.12, t * 9 + i), on(t, 5 + (i % 2), 0.3), { ...st, width: 1.3, boil: 0 })
    }
    // ── the Main Building ──
    setCam(ctx, base, cam, 1)
    // the building surfaces out of characters; the line drawing stays only as a faint trace
    textImage(ctx, {
      key: 'c1hku', cell: 9, color: '#2a1d14', corpus: '天才梦生命是一袭华美的袍我充满了生命的欢悦香港大学一九三九', emerge: prog(t, bt(1), bt(5)), order: 'sweepX', t, scatter: 50, gamma: 1.1, alpha: 0.95, seed: 11,
      draw: (g) => {
        g.fillStyle = '#8c8c8c'
        for (const q of HKU.sil) g.fill(pathOf([q]))
        g.fillStyle = '#3a3a3a'
        for (const q of [...HKU.arches0, ...HKU.arches1]) g.fill(pathOf([q]))
        g.lineWidth = 4
        for (const q of [...HKU.arches0, ...HKU.arches1, ...HKU.tw]) g.stroke(pathOf([q], false))
        g.lineWidth = 3
        for (const q of HKU.frame) g.stroke(pathOf([q], false))
      },
    })
    reveal(ctx, layer('c1detail', HKU.detail), prog(t, bt(2), bt(5)), { x: HKU.near[0], y: 420, alpha: 0.35 })
    penDraw(ctx, HKU.frame, on(t, 1, 0.55), { ...st, width: 1.6, alpha: 0.45 })
    penDraw(ctx, HKU.arches0, on(t, 2, 0.5), { ...st, width: 1.4, alpha: 0.4 })
    penDraw(ctx, HKU.arches1, on(t, 3, 0.5), { ...st, width: 1.4, alpha: 0.4 })
    penDraw(ctx, HKU.tw, on(t, 4, 0.55), { ...st, width: 1.5, alpha: 0.45 })
    penDraw(ctx, HKU.steps, on(t, 5, 0.4), { ...st, width: 1.7 })
    penDraw(ctx, HKU.terrace, on(t, 5, 0.6), { ...st, width: 1.5 })
    wash(ctx, [[HKU.near[0] - 30, HKU.towerTop[1] + 40, HKU.far[0] + 40, HKU.towerTop[1] + 120, HKU.far[0] + 40, HKU.far[1] + 10, HKU.near[0] - 30, HKU.near[1] + 10]], C.gold, { alpha: 0.13 * on(t, 7, 0.8), blur: 14 })
    // ── foreground: a stone balustrade over the harbour where she stands; palms; a lamp post ──
    setCam(ctx, base, cam, 1.3)
    {
      const bx0 = HKU.far[0] - 40, bx1 = W + 80
      const yTop = (x: number) => lerp(536, 552, (x - bx0) / (bx1 - bx0))
      const bal: Poly[] = [seg(bx0, yTop(bx0), bx1, yTop(bx1)), seg(bx0, yTop(bx0) + 10, bx1, yTop(bx1) + 10), seg(bx0, yTop(bx0) + 58, bx1, yTop(bx1) + 58), seg(bx0, yTop(bx0) + 66, bx1, yTop(bx1) + 66)]
      for (let x = bx0 + 10; x < bx1; x += 15) {
        const y = yTop(x) + 12
        bal.push([x - 3, y, x - 5, y + 14, x - 2, y + 26, x - 4, y + 44], [x + 3, y, x + 5, y + 14, x + 2, y + 26, x + 4, y + 44])
      }
      for (let x = bx0; x < bx1; x += 150) bal.push(rectP(x - 9, yTop(x) - 6, 18, 74))
      penDraw(ctx, bal, on(t, 5, 0.6), { ...st, width: 1.5 })
      drawL(ctx, hatchL('c1bal', [[bx0, yTop(bx0) + 66, bx1, yTop(bx1) + 66, bx1, 700, bx0, 700]], { angle: 0.25, gap: 7, color: C.ink, alpha: 0.25, width: 0.9 }), on(t, 6, 0.6))
      const lx = bx0 + 70
      penDraw(ctx, local('M 0 0 L 0 -250 M -6 0 L -6 -250 M -16 0 L 10 0 L 6 -14 L -12 -14 Z M -26 -250 C -18 -262 6 -262 20 -250 M -3 -250 L -3 -272 M -12 -272 L 6 -272 L 10 -292 L -16 -292 Z M -14 -292 C -10 -302 4 -302 8 -292 M -3 -302 L -3 -310 M -24 -40 C -14 -36 4 -36 14 -40 M -12 -282 L 8 -282', lx, yTop(lx) + 70, 1), on(t, 6, 0.5), { ...st, width: 1.9 })
      // her: a student of nineteen at the balustrade, looking out over the harbour
      eileen(ctx, 'youngStand', { x: bx0 + 300, y: 612, h: 205, progress: on(t, 7, 0.6), fill: on(t, 7, 1.2), t, flip: true })
    }
    setCam(ctx, base, cam, 1.6)
    // lawn and the path toward the steps
    penDraw(ctx, [[-40, 690, 300, 600, 620, 560], [180, 700, 480, 610, 700, 566], ...Array.from({ length: 22 }, (_, i): Poly => {
      const x = 40 + rand(i, 31) * 700, y = 600 + rand(i, 32) * 60
      return seg(x, y, x + 3 - rand(i, 33) * 6, y - 8 - rand(i, 34) * 10)
    })], on(t, 4, 0.6), { ...st, width: 1.4, alpha: 0.75 })
    penDraw(ctx, palm(120, 640, 470, 0.1, 3), on(t, 5, 0.6), { ...st, width: 2.4 })
    penDraw(ctx, palm(250, 660, 330, -0.18, 7), on(t, 5, 0.7), { ...st, width: 2.0, alpha: 0.85 })
    ctx.setTransform(base)
    yearMark(ctx, t, { text: '1939', x: W - 130, y: 150, t0: bt(1), t1: bt(8) + 0.6, size: 112, color: 'rgba(42,29,20,1)', align: 'right' })
  },
}

// ═════════════════════════════ C2 · 《天才梦》 the robe ═════════════════════════════

const ROBE_OUT = 'M -30 36 C -120 44 -250 58 -388 70 L -396 205 C -300 214 -170 228 -96 262 C -84 330 -74 380 -82 430 C -92 520 -110 640 -124 770 C -60 778 60 778 124 770 C 110 640 92 520 82 430 C 74 380 84 330 96 262 C 170 228 300 214 396 205 L 388 70 C 250 58 120 44 30 36 C 16 46 -16 46 -30 36 Z'
const ROBE_COLLAR = 'M -30 36 C -33 18 -30 6 -22 2 C -10 -2 10 -2 22 2 C 30 6 33 18 30 36 M -3 -1 L -3 42 M -28 12 C -10 8 10 8 28 12'
const ROBE_PANEL = 'M -2 42 C 30 58 66 66 84 110 C 94 140 98 200 96 262'
const ROBE_BANDS = 'M -366 66 L -372 207 M 366 66 L 372 207 M -350 66 L -356 208 M 350 66 L 356 208 M -120 738 C -60 747 60 747 120 738 M -122 752 C -60 761 60 761 122 752'
const ROBE_FOLDS = 'M -250 64 C -246 120 -240 170 -232 218 M -170 54 C -166 110 -160 180 -150 232 M 250 64 C 246 120 240 170 232 218 M 160 52 C 158 120 150 180 140 236 M -40 300 C -48 420 -60 560 -70 740 M 30 320 C 36 460 44 600 54 740 M -60 120 C -50 160 -40 200 -36 240'
const FROGS: [number, number, number][] = [[14, 18, 0], [40, 58, 0.4], [74, 90, 0.9], [92, 170, 1.4], [96, 236, 1.5], [88, 320, 1.6], [84, 400, 1.6]]
const RACK = 'M -470 40 L 470 40 M -470 52 L 470 52 M -470 40 C -492 36 -508 22 -502 6 C -496 -6 -480 -2 -484 10 M 470 40 C 492 36 508 22 502 6 C 496 -6 480 -2 484 10 M -470 52 L -470 40 M 470 52 L 470 40 M -436 52 L -436 760 M -420 52 L -420 760 M 436 52 L 436 760 M 420 52 L 420 760 M -470 760 L -386 760 L -392 746 L -464 746 Z M 386 760 L 470 760 L 464 746 L 392 746 Z M -420 560 L 420 560 M -420 572 L 420 572 M -420 90 C -400 100 -400 120 -420 130 M 420 90 C 400 100 400 120 420 130'
const TASSEL = 'M -500 14 L -500 60 M -506 60 L -494 60 L -492 86 L -508 86 Z M -504 86 L -506 120 M -500 86 L -500 124 M -496 86 L -494 120'

function rosette(cx: number, cy: number, R: number, seed: number): Poly[] {
  const out: Poly[] = []
  for (let k = 0; k < 3; k++) {
    const r0 = R * (1 - k * 0.3)
    const p: Poly = []
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * TAU + k * 0.4 + seed
      const r = r0 * (1 + 0.14 * Math.sin(a * 5 + k) + 0.05 * Math.sin(a * 11))
      p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86)
    }
    out.push(p)
  }
  const sp: Poly = []
  for (let i = 0; i <= 30; i++) {
    const a = i * 0.45
    const r = R * 0.02 + i * R * 0.007
    sp.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  out.push(sp)
  return out
}
function leaf(x: number, y: number, L: number, a: number): Poly[] {
  const tx = x + Math.cos(a) * L, ty = y + Math.sin(a) * L
  const nx = -Math.sin(a) * L * 0.28, ny = Math.cos(a) * L * 0.28
  return pathPolys(`M ${x} ${y} Q ${(x + tx) / 2 + nx} ${(y + ty) / 2 + ny} ${tx} ${ty} Q ${(x + tx) / 2 - nx} ${(y + ty) / 2 - ny} ${x} ${y} M ${x} ${y} L ${tx * 0.8 + x * 0.2} ${ty * 0.8 + y * 0.2}`, 3)
}
function blossom(cx: number, cy: number, r: number): Poly[] {
  const out: Poly[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2
    out.push(sketchEllipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.75, r * 0.75, i + cx, 0.05))
  }
  out.push(sketchEllipse(cx, cy, r * 0.3, r * 0.3, cy, 0.1))
  return out
}
function cloudScroll(cx: number, cy: number, s: number, flip: boolean): Poly[] {
  const p: Poly = []
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.24
    const r = (2 + a * 3.2) * s
    p.push(cx + (flip ? -1 : 1) * Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  const tail: Poly = [p[p.length - 2], p[p.length - 1], p[p.length - 2] + (flip ? 40 : -40) * s, p[p.length - 1] + 8 * s]
  return [p, tail]
}
function frog(x: number, y: number, a: number): Poly[] {
  const c = Math.cos(a), s = Math.sin(a)
  const P = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c]
  const loop = (u0: number): Poly => {
    const o: Poly = []
    for (let i = 0; i <= 20; i++) {
      const th = (i / 20) * TAU
      const [px, py] = P(u0 + Math.cos(th) * 9, Math.sin(th) * 3.6)
      o.push(px, py)
    }
    return o
  }
  return [loop(-10), loop(10), sketchEllipse(x, y, 3.4, 3.4, x, 0.1)]
}
const EMB = (() => {
  const peony = [...rosette(-34, 610, 40, 0.3), ...rosette(28, 668, 26, 1.1), ...rosette(-62, 690, 18, 2.2)]
  const leaves = [...leaf(-60, 640, 48, 2.3), ...leaf(-8, 640, 44, 0.6), ...leaf(10, 690, 38, 2.6), ...leaf(-40, 570, 40, -2.0), ...leaf(40, 640, 36, -0.4)]
  const branch = pathPolys('M -30 600 C -20 520 10 460 34 380 M 10 470 C 30 456 44 450 60 452 M 0 520 C -20 506 -36 500 -50 504', 3)
  const blossoms = [...blossom(36, 372, 7), ...blossom(60, 450, 6), ...blossom(-52, 502, 6), ...blossom(12, 430, 5)]
  const sleeveL = [...cloudScroll(-300, 140, 1.4, false), ...cloudScroll(-220, 170, 1.0, true), ...blossom(-150, 120, 8), ...blossom(-330, 110, 6)]
  const sleeveR = [...cloudScroll(300, 140, 1.4, true), ...cloudScroll(214, 168, 1.0, false), ...blossom(150, 118, 8), ...blossom(330, 112, 6)]
  return { flowers: [...peony], leaves: [...leaves, ...branch], blossoms, sleeves: [...sleeveL, ...sleeveR], peonyRegion: [rosette(-34, 610, 40, 0.3)[0], rosette(28, 668, 26, 1.1)[0], rosette(-62, 690, 18, 2.2)[0]] }
})()

type Flea = { x: number; y: number; ta: number; sz: number }
let FLEAS: Flea[] | null = null
function fleas(): Flea[] {
  if (FLEAS) return FLEAS
  const poly = pathPolys(ROBE_OUT)[0]
  const out: Flea[] = []
  for (let i = 0; out.length < 300 && i < 8000; i++) {
    const x = -400 + rand(i, 51) * 800, y = 40 + rand(i, 52) * 740
    if (!inPoly(poly, x, y)) continue
    const n = out.length
    // they come up from the hem and in from the cuffs
    const order = Math.min((780 - y) / 740, (400 - Math.abs(x)) / 300 + 0.25)
    out.push({ x, y, ta: bt(20) + clamp(order * 0.8 + rand(n, 53) * 0.3) * (bt(27) - bt(20) - 0.3), sz: 0.7 + rand(n, 54) ** 2 * 1.4 })
  }
  FLEAS = out
  return out
}
function drawFleas(ctx: Ctx, t: number) {
  const bi = kpos(t)
  ctx.save()
  ctx.fillStyle = 'rgba(28,18,12,0.92)'
  ctx.strokeStyle = 'rgba(28,18,12,0.7)'
  ctx.lineWidth = 0.9
  fleas().forEach((f, i) => {
    if (t < f.ta) return
    const age = t - f.ta
    // random walk: a hop on every beat since it landed
    const k0 = Math.ceil(kpos(f.ta))
    let x = f.x, y = f.y
    const kNow = Math.floor(bi)
    for (let k = k0; k <= kNow; k++) {
      if (rand(i, k * 7) < 0.45) continue
      const dx = (rand(i, k * 3) - 0.5) * 22, dy = (rand(i, k * 5) - 0.6) * 18
      const fr = k === kNow ? clamp((bi - k) / 0.25) : 1
      x += dx * fr
      y += dy * fr - (k === kNow ? Math.sin(fr * Math.PI) * 10 : 0)
    }
    const s = f.sz * Math.min(1, age / 0.15 + 0.3)
    ctx.beginPath()
    ctx.ellipse(x, y, 2.4 * s, 1.7 * s, rand(i, 9) * TAU, 0, TAU)
    ctx.fill()
    if (f.sz > 1.5) {
      ctx.beginPath()
      for (let l = -1; l <= 1; l++) {
        ctx.moveTo(x - 1.5 * s, y + l * 1.2 * s)
        ctx.lineTo(x - 5 * s, y + l * 2.4 * s + 2)
        ctx.moveTo(x + 1.5 * s, y + l * 1.2 * s)
        ctx.lineTo(x + 5 * s, y + l * 2.4 * s + 2)
      }
      ctx.stroke()
    }
  })
  ctx.restore()
}

const TIANCAI = '在没有人与人交接的场合，我充满了生命的欢悦。可是我一天不能克服这种咬啮性的小烦恼，生命是一袭华美的袍，爬满了蚤子。'

/**
 * Her hand on plain paper: vertical columns that wander a little, characters of uneven size and weight, ink
 * pooling where the nib rested (a soft dark bloom under some strokes), each character landing wet then drying.
 */
function handWrite(ctx: Ctx, t: number, o: { text: string; x: number; y: number; size: number; t0: number; rate: number; perCol: number; seed: number }) {
  const chars = [...o.text]
  const step = o.size * 1.18
  const colW = o.size * 1.42
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let col = 0, row = 0
  chars.forEach((ch, i) => {
    if (row >= o.perCol) { col++; row = 0 }
    const st = o.t0 + i * o.rate
    const p = prog(t, st, st + 0.35)
    const r = row++
    if (p <= 0) return
    const punct = /[，。、！？]/.test(ch)
    const lean = Math.sin(col * 1.7 + o.seed) * 4 + r * (rand(col, o.seed) - 0.5) * 1.4
    const x = o.x - col * colW + lean + (rand(i, o.seed + 1) - 0.5) * 3 + (punct ? o.size * 0.3 : 0)
    const y = o.y + r * step + (rand(i, o.seed + 2) - 0.5) * 4 - (punct ? o.size * 0.3 : 0)
    const sz = o.size * (0.9 + rand(i, o.seed + 3) * 0.2) * (punct ? 0.9 : 1)
    const wet = 1 - ease.outCubic(prog(t, st + 0.2, st + 1.4))
    // pooled ink where the nib rested
    if (!punct && rand(i, o.seed + 4) < 0.35) {
      const px = x + (rand(i, o.seed + 5) - 0.5) * sz * 0.5, py = y + (rand(i, o.seed + 6) - 0.2) * sz * 0.4
      const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 0.18)
      g.addColorStop(0, `rgba(30,18,10,${(0.35 + 0.25 * wet) * p})`)
      g.addColorStop(1, 'rgba(30,18,10,0)')
      ctx.fillStyle = g
      ctx.fillRect(px - sz * 0.2, py - sz * 0.2, sz * 0.4, sz * 0.4)
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rand(i, o.seed + 7) - 0.5) * 0.08)
    ctx.font = `${rand(i, o.seed + 8) < 0.3 ? 700 : 400} ${sz}px ${FONT.kai}`
    // a faint bleed halo while wet
    if (wet > 0.02) {
      ctx.globalAlpha = p * 0.25 * wet
      ctx.filter = 'blur(1.6px)'
      ctx.fillStyle = 'rgb(40,24,14)'
      ctx.fillText(ch, 0.6, 0.8)
      ctx.filter = 'none'
    }
    ctx.globalAlpha = p * (0.78 + 0.2 * rand(i, o.seed + 9))
    ctx.fillStyle = wet > 0.3 ? 'rgb(24,14,8)' : C.ink
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.restore()
}

function windowLattice(g: Ctx) {
  // a faint 冰裂纹 lattice window, frame-within-frame on the right wall
  const x0 = 1500, y0 = 70, w = 300, h = 360
  const st = still({ width: 1.2, alpha: 0.55 })
  const L: Poly[] = [rectP(x0, y0, w, h), rectP(x0 + 12, y0 + 12, w - 24, h - 24)]
  for (let i = 0; i < 26; i++) {
    const ax = x0 + 12 + rand(i, 61) * (w - 24), ay = y0 + 12 + rand(i, 62) * (h - 24)
    const a = rand(i, 63) * Math.PI
    const l = 40 + rand(i, 64) * 70
    L.push(seg(clamp(ax - Math.cos(a) * l, x0 + 12, x0 + w - 12), clamp(ay - Math.sin(a) * l, y0 + 12, y0 + h - 12), clamp(ax + Math.cos(a) * l, x0 + 12, x0 + w - 12), clamp(ay + Math.sin(a) * l, y0 + 12, y0 + h - 12)))
  }
  penDraw(g, L, 1, st, 0)
  hatch(g, [rectP(x0 - 30, y0 + h + 6, w + 60, 10)], { angle: 0.2, gap: 4, color: C.ink, alpha: 0.35, width: 0.8, boil: 0 })
}

const sceneC2: Scene = {
  id: 'C2-robe',
  t0: bt(8),
  t1: bt(27),
  theme: 'paper',
  trans: { kind: 'cut', dur: 0 },
  draw(ctx, t, lt) {
    oldPaper(ctx, t, { sepia: 0.22 })
    const base = ctx.getTransform()
    const wide = t >= bt(16)
    const T = wide ? ease.inOutSine(prog(t, bt(16), bt(27) + 0.5)) : ease.inOutSine(prog(t, bt(8), bt(16)))
    const cam: Cam = wide ? { fx: lerp(950, 990, T), fy: lerp(372, 360, T), s: lerp(1.0, 1.06, T) } : { fx: lerp(760, 880, T), fy: lerp(300, 280, T), s: lerp(1.24, 1.2, T) }
    const st = ink(t)
    // window on the far wall (slow parallax)
    setCam(ctx, base, cam, 0.6)
    reveal(ctx, layer('c2win', windowLattice), prog(t, bt(12), bt(15)), { mode: 'bt', alpha: 0.75 })
    // manuscript: 稿纸 sheet with the passage written in her order
    setCam(ctx, base, cam, 0.85)
    ctx.save()
    ctx.translate(185, 70)
    ctx.rotate(-0.035)
    const sheetP = rectP(0, 0, 360, 520)
    wash(ctx, [rectP(8, 10, 360, 520)], C.inkSoft, { alpha: 0.18, blur: 10 })
    ctx.save()
    ctx.fillStyle = 'rgba(244,234,212,0.95)'
    ctx.fill(pathOf([sheetP]))
    ctx.restore()
    penDraw(ctx, [sheetP], on(t, 8, 0.4), { ...st, width: 1.4, alpha: 0.7 })
    handWrite(ctx, t, { text: '天才梦', x: 318, y: 34, size: 34, t0: bt(8) + 0.1, rate: 0.2, perCol: 11, seed: 3 })
    handWrite(ctx, t, { text: TIANCAI, x: 266, y: 40, size: 29, t0: bt(9), rate: (bt(25) - bt(9)) / [...TIANCAI].length, perCol: 11, seed: 7 })
    // her fountain pen resting across the corner of the sheet
    penDraw(ctx, local('M 0 0 L 150 -54 L 156 -46 L 6 8 Z M 150 -54 L 178 -66 L 160 -44 M 40 -10 L 46 4', 30, 548, 1), on(t, 10, 0.5), { ...st, width: 1.6 })
    ctx.restore()
    // the robe on its rack
    setCam(ctx, base, cam, 1)
    const S = 0.68
    const sway = Math.sin(t * 0.9) * 0.012
    const rx = 1150, ry = 58
    const M = new DOMMatrix().translate(rx, ry).rotate((sway * 180) / Math.PI).scale(S)
    const cur = ctx.getTransform()
    // rack, occluded by the robe silhouette
    {
      const { c, g } = scratch('c2rack')
      g.setTransform(base.multiply(camM(cam, 1)).multiply(new DOMMatrix().translate(rx, ry).scale(S)))
      penPath(g, RACK, on(t, 8, 0.9), { ...st, width: 2.6 / S })
      penPath(g, TASSEL, on(t, 15, 0.4), { ...st, width: 1.6 / S })
      g.setTransform(base.multiply(camM(cam, 1)))
      drawL(g, hatchL('c2rack', [rectP(-436, 52, 16, 708), rectP(420, 52, 16, 708), rectP(-470, 40, 940, 12)], { angle: 1.3, gap: 4 / S, color: C.ink, alpha: 0.45, width: 0.9 / S }, new DOMMatrix().translate(rx, ry).scale(S)), on(t, 12, 0.8))
      g.setTransform(base.multiply(camM(cam, 1)).multiply(new DOMMatrix().translate(rx, ry).scale(S)))
      wash(g, [rectP(-436, 52, 16, 708), rectP(420, 52, 16, 708), rectP(-470, 40, 940, 12)], 'rgb(120,70,40)', { alpha: 0.4 * on(t, 17, 0.8), blur: 2 })
      g.setTransform(base.multiply(camM(cam, 1)).multiply(M))
      g.globalCompositeOperation = 'destination-out'
      g.fillStyle = '#000'
      g.globalAlpha = on(t, 10, 0.6)
      g.fill(pathOf(pathPolys(ROBE_OUT)))
      g.fill(pathOf(pathPolys('M -30 36 C -33 18 -30 6 -22 2 C -10 -2 10 -2 22 2 C 30 6 33 18 30 36 Z')))
      ctx.setTransform(base)
      ctx.drawImage(c, 0, 0)
    }
    ctx.setTransform(cur.multiply(M))
    const outline = pathPolys(ROBE_OUT)
    const collarR = pathPolys('M -30 36 C -33 18 -30 6 -22 2 C -10 -2 10 -2 22 2 C 30 6 33 18 30 36 Z')
    // paper body so the robe reads as cloth, then colour that blooms on beats
    ctx.save()
    ctx.globalAlpha = on(t, 10, 0.6) * 0.9
    ctx.fillStyle = 'rgba(240,228,204,1)'
    ctx.fill(pathOf(outline))
    ctx.restore()
    const dull = 1 - 0.3 * prog(t, bt(22), bt(27))
    const bloom = (k: number, region: Poly[], col: string, a: number, cx: number, cy: number) => {
      const p = on(t, k, 0.7)
      if (p <= 0) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, 40 + p * 900, 0, TAU)
      ctx.clip()
      wash(ctx, region, col, { alpha: a * dull * (1 + 0.25 * kick(t, k, 5)), blur: 4 })
      ctx.restore()
    }
    bloom(16, outline, C.rouge, 0.3, 0, 300)
    bloom(18, [...EMB.peonyRegion], C.gold, 0.8, -30, 640)
    bloom(19, [...collarR, ...pathPolys('M -366 66 L -388 70 L -396 205 L -372 207 Z M 366 66 L 388 70 L 396 205 L 372 207 Z M -122 752 C -60 761 60 761 122 752 L 124 770 C 60 778 -60 778 -124 770 Z')], C.jade, 0.75, 0, 40)
    bloom(20, EMB.sleeves.slice(0, 2).concat(EMB.sleeves.slice(9, 11)), C.gold, 0.5, 0, 140)
    // the robe's cloth is woven of the sentence itself
    {
      const robeM = ctx.getTransform()
      ctx.setTransform(robeM.multiply(new DOMMatrix().translate(-500, -20)))
      textImage(ctx, {
        key: 'c2robe2', corpus: TIANCAI, cell: 12, color: '#5a1418', emerge: prog(t, bt(12), bt(18)), order: 'sweepY', scatter: 40, alpha: 1.0 * (1 - 0.25 * prog(t, bt(22), bt(27))), gamma: 1.1, seed: 2,
        draw: (g) => {
          g.translate(500, 20)
          g.fillStyle = '#a8a8a8'
          g.fill(pathOf(pathPolys(ROBE_OUT)))
          g.fill(pathOf(pathPolys('M -30 36 C -33 18 -30 6 -22 2 C -10 -2 10 -2 22 2 C 30 6 33 18 30 36 Z')))
          g.lineWidth = 12
          g.stroke(pathOf(pathPolys(ROBE_OUT)))
          // the 大襟, bands and the embroidered flowers read brighter in the weave
          g.lineWidth = 8
          g.stroke(pathOf(pathPolys(ROBE_PANEL), false))
          g.lineWidth = 6
          g.stroke(pathOf(pathPolys(ROBE_BANDS), false))
          g.fillStyle = '#fff'
          for (const p of EMB.peonyRegion) g.fill(pathOf([p]))
        },
      })
      ctx.setTransform(robeM)
    }
    // shading of the folds
    {
      const img = cached('segC:robeHatch', 1000, 900, (g) => {
        g.translate(500, 60)
        const regs = pathPolys('M -388 150 L -396 205 C -300 214 -170 228 -96 262 L -110 200 C -200 190 -300 170 -388 150 Z M 388 150 L 396 205 C 300 214 170 228 96 262 L 110 200 C 200 190 300 170 388 150 Z M 60 430 C 80 520 96 640 112 760 L 60 760 C 50 640 40 520 36 430 Z')
        for (const r of regs) hatch(g, [r], { angle: 0.95, gap: 5 / S, color: C.ink, alpha: 0.4, width: 1 / S, boil: 0 })
      })
      ctx.save()
      ctx.globalAlpha *= on(t, 17, 0.8)
      ctx.drawImage(img, -500, -60)
      ctx.restore()
    }
    const w = 2.4 / S
    // the pen outline recedes to a trace once the woven characters carry the form
    const trace = lerp(1, 0.42, on(t, 17, 1.2))
    penDraw(ctx, outline, on(t, 8, 1.2), { ...st, width: w * 0.8, wobble: 1.4, alpha: trace })
    penPath(ctx, ROBE_COLLAR, on(t, 9, 0.5), { ...st, width: w * 0.75, alpha: trace })
    penPath(ctx, ROBE_PANEL, on(t, 11, 0.5), { ...st, width: w * 0.7, alpha: trace })
    penPath(ctx, ROBE_BANDS, on(t, 11, 0.7), { ...st, width: w * 0.5, alpha: trace * 0.8 })
    penPath(ctx, ROBE_FOLDS, on(t, 13, 0.8), { ...st, width: w * 0.4, alpha: 0.45 * trace })
    FROGS.forEach(([fx, fy, a], i) => penDraw(ctx, frog(fx, fy, a), prog(t, bt(12) + i * 0.07, bt(12) + i * 0.07 + 0.3), { ...st, width: w * 0.6 }))
    penDraw(ctx, EMB.flowers, on(t, 14, 0.8), { ...st, width: w * 0.45, alpha: 0.75 * trace })
    penDraw(ctx, EMB.leaves, on(t, 14, 0.9), { ...st, width: w * 0.4, alpha: 0.7 * trace })
    penDraw(ctx, EMB.blossoms, on(t, 15, 0.6), { ...st, width: w * 0.35, alpha: 0.7 * trace })
    penDraw(ctx, EMB.sleeves, on(t, 15, 0.7), { ...st, width: w * 0.4, alpha: 0.7 * trace })
    drawFleas(ctx, t)
    ctx.setTransform(base)
  },
}

/** penPath with explicit polys cache via pathPolys (local helper to keep the call sites short). */
function penPath(ctx: Ctx, d: string, p: number, s: PenStyle) {
  return penDraw(ctx, pathPolys(d), p, s)
}

// ═════════════════════════════ C3 · winter 1941, Hong Kong falls ═════════════════════════════

type Bld = { x: number; w: number; h: number; kind: number }
const SKY: Bld[] = (() => {
  const out: Bld[] = []
  let x = 60
  let i = 0
  while (x < W - 120) {
    const w = 26 + rand(i, 81) * 58
    const centre = Math.exp(-(((x - 900) / 420) ** 2))
    const h = 26 + rand(i, 82) * 60 + centre * (60 + rand(i, 83) * 90)
    out.push({ x, w, h, kind: Math.floor(rand(i, 84) * 4) })
    x += w + (rand(i, 85) < 0.2 ? 10 : -4)
    i++
  }
  return out
})()
const SKY_BASE = 470
function skylinePolys(): Poly[] {
  return SKY.map((b) => {
    const y = SKY_BASE - b.h
    if (b.kind === 0) return [b.x, SKY_BASE, b.x, y + 10, b.x + b.w * 0.5, y - 6, b.x + b.w, y + 10, b.x + b.w, SKY_BASE]
    if (b.kind === 1) return [b.x, SKY_BASE, b.x, y, b.x + b.w * 0.3, y, b.x + b.w * 0.3, y - 14, b.x + b.w * 0.6, y - 14, b.x + b.w * 0.6, y, b.x + b.w, y, b.x + b.w, SKY_BASE]
    return [b.x, SKY_BASE, b.x, y, b.x + b.w, y, b.x + b.w, SKY_BASE]
  })
}
const PEAK: Poly[] = [
  [-40, 360, 180, 300, 420, 250, 640, 210, 820, 196, 980, 214, 1180, 262, 1420, 300, 1640, 330, W + 40, 352],
  [140, 400, 380, 352, 600, 320, 780, 300, 1000, 318, 1240, 352, 1500, 380],
]
function c3detail(g: Ctx) {
  const st = still({ color: C.lineNight, width: 1, alpha: 0.7 })
  const D: Poly[] = []
  SKY.forEach((b, i) => {
    const y = SKY_BASE - b.h
    // windows (blacked-out), verandah arcades on the colonial blocks, roof clutter
    for (let wy = y + 10; wy < SKY_BASE - 16; wy += 11) for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 8) if (rand(i * 31 + wx, wy) < 0.7) D.push(seg(wx, wy, wx + 3.5, wy))
    if (b.kind === 2) for (let ax = b.x + 4; ax < b.x + b.w - 8; ax += 10) D.push([ax, SKY_BASE, ax, SKY_BASE - 10, ax + 4, SKY_BASE - 14, ax + 8, SKY_BASE - 10, ax + 8, SKY_BASE])
    if (b.kind === 3) D.push(seg(b.x + b.w * 0.7, y, b.x + b.w * 0.7, y - 22), seg(b.x + b.w * 0.7, y - 22, b.x + b.w * 0.7 + 10, y - 18))
    D.push(seg(b.x, y + 6, b.x + b.w, y + 6))
  })
  // houses dotted on the Peak + contour hatching
  for (let i = 0; i < 40; i++) {
    const x = 200 + rand(i, 91) * 1300
    const yr = 260 + Math.abs(x - 820) * 0.1 + rand(i, 92) * 100
    D.push(rectP(x, yr, 8, 5))
  }
  for (let i = 0; i < 70; i++) {
    const x = rand(i, 93) * W, y = 300 + rand(i, 94) * 150
    D.push(seg(x, y, x + 30 + rand(i, 95) * 40, y + 8))
  }
  penDraw(g, D, 1, st, 0)
  // harbour ships at anchor (silhouettes)
  const ships: Poly[] = [
    ...local('M -90 0 L 90 0 L 100 -10 L -96 -10 Z M -40 -10 L -40 -26 L 20 -26 L 20 -10 M -10 -26 L -10 -40 L 2 -40 L 2 -26 M 40 -10 L 40 -34 M -70 -10 L -70 -30', 520, 520, 0.9),
    ...local('M -70 0 L 74 0 L 80 -8 L -76 -8 Z M -20 -8 L -20 -22 L 30 -22 L 30 -8 M 0 -22 L 0 -36', 1320, 540, 0.8),
  ]
  penDraw(g, ships, 1, { ...st, alpha: 0.8, width: 1.4 }, 0)
}
const CRACKS: { x: number; k: number }[] = [
  { x: 380, k: 28 }, { x: 1140, k: 30 }, { x: 760, k: 32 }, { x: 1520, k: 34 }, { x: 980, k: 36 },
]
function crackPoly(j: number): Poly {
  const p: Poly = []
  const x0 = CRACKS[j].x
  for (let y = 120, i = 0; y <= 700; y += 36, i++) p.push(x0 + (rand(i, j * 13 + 1) - 0.5) * 70 + (y - 400) * (j % 2 ? 0.12 : -0.1), y)
  return p
}

const sceneC3: Scene = {
  id: 'C3-fall-1941',
  t0: bt(27),
  t1: bt(38),
  theme: 'night',
  trans: { kind: 'burn', dur: 0.45 },
  draw(ctx, t, lt) {
    const fire = ease.inOutSine(prog(t, bt(31), bt(37)))
    nightPaper(ctx, t, { lift: 0.08 })
    const base = ctx.getTransform()
    const down = kicks(t, [28, 32, 36], 6)
    const bi = beatIndex(t)
    const sh = down * 11
    const cam: Cam = { fx: W / 2 + (rand(bi, 1) - 0.5) * sh, fy: H / 2 - 10 + (rand(bi, 2) - 0.5) * sh, s: lerp(1.0, 1.07, prog(t, bt(27), bt(38) + 0.5)), rot: (rand(bi, 3) - 0.5) * 0.012 * down }
    // red-gold sky over the hills ("越过群山追斜阳")
    setCam(ctx, base, cam, 0.3)
    if (fire > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const g = ctx.createLinearGradient(0, 120, 0, SKY_BASE)
      g.addColorStop(0, 'rgba(120,40,30,0)')
      g.addColorStop(0.6, `rgba(150,62,34,${0.32 * fire})`)
      g.addColorStop(1, `rgba(214,128,60,${0.5 * fire})`)
      ctx.fillStyle = g
      ctx.fillRect(-100, 0, W + 200, SKY_BASE + 20)
      ctx.restore()
    }
    moon(ctx, 300, 130, 38, { glow: 0.7, alpha: 0.85, t, wet: 0.4 * fire })
    // searchlights
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 4; i++) {
      const bx = 360 + i * 380 + rand(i, 5) * 80, by = SKY_BASE - 20
      const a = -Math.PI / 2 + 0.6 * Math.sin(t * (0.5 + i * 0.13) + i * 1.9)
      const L = 1000, sp = 0.035
      const g = ctx.createLinearGradient(bx, by, bx + Math.cos(a) * L, by + Math.sin(a) * L)
      g.addColorStop(0, 'rgba(200,214,250,0.30)')
      g.addColorStop(1, 'rgba(200,214,250,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(a - sp) * L, by + Math.sin(a - sp) * L)
      ctx.lineTo(bx + Math.cos(a + sp) * L, by + Math.sin(a + sp) * L)
      ctx.closePath()
      ctx.fill()
      penStroke(ctx, [bx, by, bx + Math.cos(a - sp) * 620, by + Math.sin(a - sp) * 620], on(t, 27 + i, 0.4), chalk(t, { width: 1, alpha: 0.28 }))
    }
    ctx.restore()
    // smoke drifting (soft ink), partly over the moon
    ctx.save()
    ctx.filter = 'blur(16px)'
    for (let i = 0; i < 7; i++) {
      const sx = 200 + i * 240 + (t - bt(27)) * (10 + i * 3), sy = 260 - i * 18 - (t - bt(27)) * 8
      ctx.fillStyle = `rgba(8,10,16,${0.35 + 0.25 * fire})`
      ctx.beginPath()
      ctx.ellipse(sx, sy, 160 + i * 20, 46 + rand(i, 7) * 30, -0.15, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    // tracers ("午夜流星")
    setCam(ctx, base, cam, 0.7)
    for (let k = 27; k <= 38; k++) {
      for (let m = 0; m < 2; m++) {
        const t0 = bt(k) + m * 0.25
        const p = prog(t, t0, t0 + 0.9)
        if (p <= 0 || p >= 1) continue
        const sx = 160 + rand(k * 2 + m, 11) * 1500, sy = SKY_BASE - 10
        const ex = sx + (rand(k * 2 + m, 12) - 0.5) * 900, ey = 40 + rand(k * 2 + m, 13) * 160
        const cx = (sx + ex) / 2 + (rand(k * 2 + m, 14) - 0.5) * 300, cy = Math.min(sy, ey) - 80
        const curve: Poly = []
        for (let i = 0; i <= 40; i++) {
          const u = i / 40
          curve.push((1 - u) * (1 - u) * sx + 2 * u * (1 - u) * cx + u * u * ex, (1 - u) * (1 - u) * sy + 2 * u * (1 - u) * cy + u * u * ey)
        }
        const head = ease.outCubic(p)
        const sub = subPoly(curve, head - 0.22, head)
        if (sub.length >= 4) {
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          penStroke(ctx, sub, 1, { width: 6, color: 'rgb(214,140,70)', alpha: 0.25 * (1 - p), boil: 0, taperIn: 60, taperOut: 4, nib: false })
          penStroke(ctx, sub, 1, { width: 2.2, color: 'rgb(250,226,180)', alpha: 0.95 * (1 - p * 0.7), boil: 0, taperIn: 60, taperOut: 3, nib: false })
          ctx.restore()
        }
      }
    }
    // the city on a scratch layer, then broken along cracks that open on the bar downbeats
    const { c, g } = scratch('c3city')
    g.setTransform(camM(cam, 1))
    penDraw(g, PEAK, on(t, 27, 0.6), chalk(t, { width: 2.2, alpha: 0.75 }))
    // the city itself is made of words
    textImage(g, {
      key: 'c3city', cell: 10, color: '#c9d3e6', emerge: prog(t, bt(27), bt(29)), order: 'sweepX', t, scatter: 50, gamma: 1.4, alpha: 0.9, seed: 7,
      draw: (m) => {
        m.fillStyle = '#707070'
        for (const p of skylinePolys()) m.fill(pathOf([p]))
        m.lineWidth = 3
        for (const p of skylinePolys()) m.stroke(pathOf([p]))
      },
    })
    reveal(g, layer('c3detail', c3detail), on(t, 28, 0.6), { x: 900, y: 470, alpha: 0.45 })
    penDraw(g, skylinePolys(), on(t, 27, 0.9), chalk(t, { width: 1.5, alpha: 0.55 }))
    penDraw(g, [seg(-60, SKY_BASE, W + 60, SKY_BASE)], on(t, 27, 0.3), chalk(t, { width: 2.4 }))
    // fires along the waterfront
    if (fire > 0) for (let i = 0; i < 5; i++) glowAt(g, 300 + i * 330 + rand(i, 17) * 80, SKY_BASE - 20, 240 + 80 * Math.sin(t * 3 + i), 'rgba(224,110,48,ALPHA)', 0.45 * fire)
    // explosions on bar downbeats
    const EXP: [number, number, number][] = [[28, 640, 400], [32, 1220, 380], [36, 900, 360], [30, 300, 420], [34, 1560, 430]]
    for (const [k, ex, ey] of EXP) {
      const e = kick(t, k, 3.5)
      if (e <= 0.02) continue
      const big = k % 4 === 0 ? 1 : 0.55
      glowAt(g, ex, ey, 300 * big, 'rgba(255,190,120,ALPHA)', 0.7 * e)
      const rays: Poly[] = []
      for (let r = 0; r < 16; r++) {
        const a = (r / 16) * TAU + rand(r, k)
        const r0 = 20 + (1 - e) * 60 * big, r1 = r0 + 60 * big * (0.5 + rand(r, k + 1))
        rays.push(seg(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * 0.7, ex + Math.cos(a) * r1, ey + Math.sin(a) * r1 * 0.7))
      }
      penDraw(g, rays, 1, { width: 1.6, color: 'rgb(250,220,180)', alpha: e, boil: 12, t, nib: false }, 0)
    }
    // compose: regions between active cracks slide apart
    ctx.setTransform(base)
    const active = CRACKS.map((cr, j) => ({ j, x: cr.x, k: cr.k, p: on(t, cr.k, 0.2) })).filter((c) => c.p > 0).sort((a, b) => a.x - b.x)
    const hy = camM(cam, 1).transformPoint(new DOMPoint(0, SKY_BASE)).y
    const regs: { left: Poly; right: Poly; dx: number; dy: number }[] = []
    let accX = 0, accY = 0
    const edges: Poly[] = [[-200, -200, -200, H + 200], ...active.map((a) => crackPoly(a.j)), [W + 200, -200, W + 200, H + 200]]
    for (let r = 0; r < edges.length - 1; r++) {
      if (r > 0) {
        const a = active[r - 1]
        const amp = a.p
        accX += ((rand(a.j, 21) - 0.5) * 14 + 6 * (a.j % 2 ? 1 : -1)) * amp + kick(t, a.k, 8) * 16 * (a.j % 2 ? 1 : -1)
        accY += (4 + rand(a.j, 22) * 8) * (a.j % 2 ? -1 : 1) * amp + kick(t, a.k, 8) * 10
      }
      regs.push({ left: edges[r], right: edges[r + 1], dx: accX, dy: accY })
    }
    for (const rg of regs) {
      ctx.save()
      ctx.beginPath()
      const L = rg.left, R = rg.right
      ctx.moveTo(L[0], -300)
      for (let i = 0; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1])
      ctx.lineTo(L[L.length - 2], H + 300)
      ctx.lineTo(R[R.length - 2], H + 300)
      for (let i = R.length - 2; i >= 0; i -= 2) ctx.lineTo(R[i], R[i + 1])
      ctx.lineTo(R[0], -300)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(c, rg.dx, rg.dy)
      // water reflection of this piece
      ctx.save()
      ctx.beginPath()
      ctx.rect(-100, hy + rg.dy + 2, W + 200, H)
      ctx.clip()
      ctx.globalAlpha = 0.24
      ctx.translate(rg.dx, hy + rg.dy)
      ctx.scale(1, -0.55)
      ctx.translate(0, -hy)
      ctx.drawImage(c, 0, 0)
      ctx.restore()
      ctx.restore()
    }
    // crack lines themselves, glowing faintly with the fires
    setCam(ctx, base, cam, 1)
    for (const a of active) {
      const cp = crackPoly(a.j)
      penStroke(ctx, cp, a.p, chalk(t, { width: 2.2, alpha: 0.85 }))
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      penStroke(ctx, cp, a.p, { width: 8, color: 'rgb(200,100,50)', alpha: 0.25 * (0.4 + fire), boil: 0, nib: false })
      ctx.restore()
    }
    // water ripples
    const rip: Poly[] = []
    for (let i = 0; i < 60; i++) {
      const y = SKY_BASE + 12 + (i / 60) ** 1.3 * 130
      const x = rand(i, 41) * W + Math.sin(t * 1.5 + i) * 6
      rip.push(seg(x, y, x + 20 + (y - SKY_BASE) * 0.5 * rand(i, 42), y))
    }
    penDraw(ctx, rip, on(t, 28, 0.8), chalk(t, { width: 1.1, alpha: 0.4 }))
    // Kowloon pier railing in the foreground
    setCam(ctx, base, cam, 1.5)
    const rail: Poly[] = [seg(-40, 548, 760, 582), seg(-40, 568, 760, 600)]
    for (let x = 0; x <= 740; x += 74) rail.push(seg(x, 540 + x * 0.043, x, 640))
    rail.push(...local('M -16 0 L -16 -26 C -16 -36 16 -36 16 -26 L 16 0', 900, 640, 1), ...local('M -16 0 L -16 -26 C -16 -36 16 -36 16 -26 L 16 0', 1040, 646, 0.9))
    penDraw(ctx, rail, on(t, 29, 0.5), chalk(t, { width: 2.6 }))
    ctx.setTransform(base)
    // flash on downbeats
    if (down > 0.01) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = `rgba(255,224,182,${0.3 * kicks(t, [28, 32, 36], 10)})`
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }
    yearMark(ctx, t, { text: '1941', x: W - 130, y: 150, t0: bt(27) + 0.1, t1: bt(38) + 0.4, size: 112, align: 'right' })
  },
}

// ═════════════════════════════ C4 · 《倾城之恋》 ═════════════════════════════

const HORIZON = 440
type Tower = { x: number; w: number; h: number; dir: number; amax: number; k: number }
const CITY4: Tower[] = (() => {
  const out: Tower[] = []
  let x = 930
  let i = 0
  while (x < 1790) {
    const w = 38 + rand(i, 101) * 52
    const h = 60 + rand(i, 102) * 150
    out.push({ x, w, h, dir: rand(i, 103) < 0.55 ? -1 : 1, amax: 0.12 + rand(i, 104) * 0.4, k: 39 + ((i * 3) % 8) })
    x += w - 6 + rand(i, 105) * 14
    i++
  }
  return out
})()
const WALL = { xn: -80, xf: 860, tn: 215, tf: 392, bn: 610, bf: 462 }
function wallTop(u: number) {
  const base = lerp(WALL.tn, WALL.tf, u)
  let dip = 0
  if (u > 0.26 && u < 0.42) dip = Math.sin(((u - 0.26) / 0.16) * Math.PI) * 78 + rand(Math.floor(u * 60), 3) * 14
  return base + dip + (rand(Math.floor(u * 90), 7) - 0.5) * 6
}
function wallOutline(): Poly {
  const p: Poly = []
  for (let i = 0; i <= 90; i++) {
    const u = i / 90
    p.push(lerp(WALL.xn, WALL.xf, u), wallTop(u))
  }
  p.push(WALL.xf, WALL.bf, WALL.xn, WALL.bn)
  p.push(p[0], p[1])
  return p
}
function c4wall(g: Ctx) {
  const outline = wallOutline()
  const st = still({ color: C.lineNight, width: 1, alpha: 0.5 })
  g.save()
  g.fillStyle = 'rgba(24,30,46,0.94)'
  g.fill(pathOf([outline]))
  g.clip(pathOf([outline]))
  // moonlit patch where the two of them stand
  const gr = g.createRadialGradient(560, 420, 10, 560, 420, 340)
  gr.addColorStop(0, 'rgba(150,166,204,0.34)')
  gr.addColorStop(1, 'rgba(150,166,204,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, W, H)
  const r = 5.64
  const D: Poly[] = []
  const rows = 22
  for (let v = 1; v < rows; v++) {
    const yN = lerp(WALL.tn - 80, WALL.bn, v / rows), yF = lerp(WALL.tf - 14, WALL.bf, v / rows)
    D.push(seg(WALL.xn, yN, WALL.xf, yF))
    for (let k = 0; k < 46; k++) {
      const w = (k + (v % 2) * 0.5) / 46
      const z = 1 + w * (r - 1)
      const u = (1 - 1 / z) / (1 - 1 / r)
      const x = lerp(WALL.xn, WALL.xf, u)
      const y0 = lerp(yN, yF, u), y1 = lerp(lerp(WALL.tn - 80, WALL.bn, (v + 1) / rows), lerp(WALL.tf - 14, WALL.bf, (v + 1) / rows), u)
      D.push(seg(x, y0, x, y1))
    }
  }
  penDraw(g, D, 1, st, 0)
  hatch(g, [outline], { angle: -1.2, gap: 6, color: 'rgb(6,8,14)', alpha: 0.45, width: 1, boil: 0 })
  // cracks and a creeper
  const ivy: Poly[] = [
    ...pathPolys('M 120 610 C 140 520 110 460 150 380 C 170 340 160 300 190 270 M 150 470 C 120 450 100 440 80 446 M 160 380 C 190 370 210 350 214 330'),
    ...pathPolys('M 300 300 L 320 340 L 310 380 L 334 420 M 680 360 L 690 400 L 676 430'),
  ]
  penDraw(g, ivy, 1, { ...st, alpha: 0.7, width: 1.3 }, 0)
  for (let i = 0; i < 40; i++) {
    const s = rand(i, 111)
    const x = lerp(120, 200, rand(i, 112)) + (1 - s) * 20, y = lerp(270, 600, s)
    penDraw(g, leaf(x, y, 9 + rand(i, 113) * 6, rand(i, 114) * TAU), 1, { ...st, alpha: 0.65, width: 1 }, 0)
  }
  g.restore()
}
/** 白流苏 (qipao) and 范柳原 (suit, leaning on the wall) — silhouettes only. */
const LIUSU = 'M -3 -84 C -8 -83 -10 -80 -10 -76 C -11 -70 -9 -64 -7 -58 C -6 -54 -8 -48 -9 -42 C -10 -32 -9 -20 -7 -8 C -7 -4 -6 -1 -5 0 L -1 0 L -1 -4 L 2 -4 L 3 0 L 6 0 C 6 -6 7 -14 7 -24 C 8 -34 8 -42 6 -50 C 5 -55 7 -60 8 -66 C 9 -72 8 -79 5 -83 C 3 -84 0 -84 -3 -84 Z M -3 -84 C -6 -88 -7 -95 -3 -99 C 1 -101 6 -100 8 -96 C 10 -92 8 -88 4 -86 C 2 -85 -1 -84 -3 -84 Z M -9 -78 C -14 -72 -16 -64 -17 -57 L -14 -56 C -13 -62 -11 -68 -8 -72 Z'
const LIUYUAN = 'M -10 -81 C -13 -76 -13 -66 -12 -56 C -12 -50 -11 -46 -11 -42 L -9 -40 C -8 -28 -7 -14 -7 0 L -1 0 L 0 -34 L 2 0 L 8 0 C 8 -14 9 -28 10 -40 L 12 -42 C 12 -48 12 -54 12 -58 C 13 -68 12 -76 9 -81 C 4 -84 -5 -84 -10 -81 Z M -3 -83 C -6 -87 -6 -95 -1 -98 C 4 -99 7 -95 6 -90 C 6 -86 3 -84 -3 -83 Z M 10 -77 C 16 -67 17 -55 12 -45 L 10 -49 C 13 -57 12 -66 8 -73 Z M -11 -76 C -16 -66 -16 -54 -11 -46 L -9 -50 C -12 -58 -12 -66 -9 -74 Z'

const BUQIYU = '在这不可理喻的世界里，谁知道什么是因，什么是果？'
const FALLCH = [...'一个大都市倾覆了']

function drawTower(g: Ctx, b: Tower, t: number, j: number) {
  const a = b.dir * b.amax * ease.inOutSine(prog(t, bt(b.k), bt(b.k) + 4.2))
  const sink = 26 * ease.inCubic(prog(t, bt(b.k) + 0.6, bt(b.k) + 4.4))
  const px = b.dir > 0 ? b.x + b.w : b.x
  g.save()
  g.translate(px, HORIZON + sink)
  g.rotate(a)
  g.translate(-px, -HORIZON)
  const y = HORIZON - b.h
  const polys: Poly[] = [[b.x, HORIZON, b.x, y, b.x + b.w, y, b.x + b.w, HORIZON]]
  if (j % 3 === 0) polys.push([b.x + b.w * 0.2, y, b.x + b.w * 0.5, y - 18, b.x + b.w * 0.8, y])
  if (j % 3 === 1) polys.push(seg(b.x + b.w * 0.5, y, b.x + b.w * 0.5, y - 26))
  polys.push(seg(b.x, y + 8, b.x + b.w, y + 8))
  penDraw(g, polys, on(t, 38, 0.8), chalk(t, { width: 1.7, alpha: 0.85 }))
  // the towers are written full of the city's words
  g.fillStyle = 'rgba(201,211,230,0.62)'
  g.font = `400 11px ${FONT.kai}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const words = [...'一个大都市倾覆了成千上万的人死去成千上万的人痛苦着香港浅水湾']
  let n = j * 5
  for (let wy = y + 16; wy < HORIZON - 4; wy += 13) for (let wx = b.x + 7; wx < b.x + b.w - 5; wx += 12) if (rand(j * 97 + wx, wy) < 0.82) g.fillText(words[n++ % words.length], wx, wy)
  g.restore()
  return a
}

const sceneC4: Scene = {
  id: 'C4-qingcheng',
  t0: bt(38),
  t1: bt(46),
  theme: 'night',
  trans: { kind: 'dissolve', dur: 0.7 },
  draw(ctx, t, lt) {
    nightPaper(ctx, t, { lift: 0.12, seed: 7 })
    const base = ctx.getTransform()
    const T = ease.inOutSine(prog(t, bt(38), bt(46) + 0.4))
    const cam: Cam = { fx: lerp(880, 820, T), fy: lerp(390, 410, T), s: lerp(1.0, 1.08, T) }
    // moon and its path on the sea
    setCam(ctx, base, cam, 0.35)
    moon(ctx, 1190, 140, 48, { glow: 0.9, t, alpha: ease.inOutSine(prog(t, bt(38) + 0.5, bt(39) + 0.4)) })
    setCam(ctx, base, cam, 0.6)
    {
      // the sea at 浅水湾: a plane of her words, the moon's path lying on it
      ctx.save()
      ctx.beginPath()
      ctx.rect(560, HORIZON + 1, W + 200, 190)
      ctx.clip()
      ctx.globalAlpha *= on(t, 38, 0.9)
      textPlane(ctx, { y0: HORIZON, y1: 640, rows: 18, t, light: 0.9, lightX: 1190, speed: 0.5, words: ['倾城之恋', '白流苏', '范柳原', '浅水湾', '这堵墙', '地老天荒', '一个大都市倾覆了', '香港', '胡琴咿咿哑哑'] })
      ctx.restore()
      penDraw(ctx, [seg(600, HORIZON, W + 40, HORIZON)], on(t, 38, 0.4), chalk(t, { width: 1.6, alpha: 0.7 }))
    }
    // the city across the water, tilting over in slow motion; its reflection below
    {
      const { c, g } = scratch('c4city')
      g.setTransform(camM(cam, 0.6))
      CITY4.forEach((b, j) => drawTower(g, b, t, j))
      ctx.setTransform(base)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, camM(cam, 0.6).transformPoint(new DOMPoint(0, HORIZON)).y)
      ctx.clip()
      ctx.drawImage(c, 0, 0)
      ctx.restore()
      const hy = camM(cam, 0.6).transformPoint(new DOMPoint(0, HORIZON)).y
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, hy, W, H)
      ctx.clip()
      ctx.globalAlpha = 0.2
      ctx.translate(0, hy * 2)
      ctx.scale(1, -1)
      ctx.drawImage(c, 0, 0)
      ctx.restore()
    }
    // characters peel off the falling towers and drift down into the sea
    setCam(ctx, base, cam, 0.6)
    ctx.save()
    ctx.font = `400 22px ${FONT.kai}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    CITY4.forEach((b, j) => {
      for (let m = 0; m < 3; m++) {
        const tr = bt(b.k) + 1.2 + m * 0.9
        const age = t - tr
        if (age < 0) continue
        const x0 = b.x + b.w * (0.2 + 0.3 * m), y0 = HORIZON - b.h * (0.6 + 0.12 * m)
        const x = x0 + b.dir * age * (14 + m * 6), y = y0 + age * 26 + age * age * 6
        if (y > HORIZON + 30) continue
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(b.dir * age * 0.4)
        ctx.fillStyle = `rgba(201,211,230,${0.6 * clamp(age / 0.3) * clamp((HORIZON + 30 - y) / 60)})`
        ctx.fillText(FALLCH[(j * 3 + m) % FALLCH.length], 0, 0)
        ctx.restore()
      }
    })
    ctx.restore()
    // the quote, vertical, in the night sky between the wall and the city
    setCam(ctx, base, cam, 0.5)
    writeVertical(ctx, t, { text: BUQIYU, x: 880, y: 64, size: 27, t0: bt(39), rate: 0.11, perCol: 8, color: 'rgba(214,222,238,0.92)', font: FONT.kai })
    // the wall and the two of them
    setCam(ctx, base, cam, 1)
    reveal(ctx, layer('c4wall', c4wall), on(t, 38, 0.9), { mode: 'lr' })
    penDraw(ctx, [wallOutline()], on(t, 38, 0.8), chalk(t, { width: 2.4 }))
    // ground, rubble and grass
    const ground: Poly[] = [seg(-60, 616, 900, 520), seg(860, 470, 1000, 470)]
    for (let i = 0; i < 18; i++) {
      const x = 40 + rand(i, 131) * 820, y = lerp(610, 522, (x + 60) / 960) + 4
      ground.push(seg(x, y, x - 4 + rand(i, 132) * 8, y - 10 - rand(i, 133) * 12))
    }
    for (let i = 0; i < 6; i++) ground.push(sketchEllipse(300 + i * 26 + rand(i, 134) * 20, 586 - i * 3, 9, 5, i + 40, 0.1))
    penDraw(ctx, ground, on(t, 39, 0.6), chalk(t, { width: 1.5, alpha: 0.7 }))
    const close = ease.inOutSine(prog(t, bt(40), bt(46)))
    const figs: [string, number, number, number, boolean][] = [[LIUYUAN, 506 + close * 6, 2.75, -0.06, false], [LIUSU, 572 - close * 10, 2.45, 0.04, false]]
    for (const [d, x, s, rot, fl] of figs) {
      const polys = local(d, x, 600, s, rot, fl)
      ctx.save()
      ctx.globalAlpha *= on(t, 40, 0.8)
      ctx.fillStyle = 'rgba(8,10,18,0.96)'
      ctx.fill(pathOf(polys))
      ctx.restore()
      penDraw(ctx, polys, on(t, 40, 0.8), chalk(t, { width: 1.5, alpha: 0.8 }))
    }
    // the title, set like a chapter heading in the night sky
    setCam(ctx, base, cam, 0.3)
    {
      const a = ease.inOutSine(prog(t, bt(39), bt(40) + 0.3))
      if (a > 0) {
        ctx.save()
        ctx.globalAlpha *= a
        ctx.shadowColor = 'rgba(160,180,230,0.55)'
        ctx.shadowBlur = 18
        ctx.fillStyle = 'rgba(232,236,246,0.95)'
        ctx.textBaseline = 'alphabetic'
        ctx.textAlign = 'left'
        ctx.font = `400 60px ${FONT.kai}`
        ;(ctx as any).letterSpacing = `${lerp(22, 14, a)}px`
        ctx.fillText('《倾城之恋》', 96, 132)
        ctx.shadowBlur = 0
        ;(ctx as any).letterSpacing = '2px'
        ctx.font = `italic 400 22px ${FONT.en}`
        ctx.fillStyle = 'rgba(214,222,238,0.75)'
        ctx.fillText('Love in a Fallen City  ·  1943', 104, 172)
        ctx.restore()
        penStroke(ctx, [100, 150, 430, 148], a, chalk(t, { width: 1.2, alpha: 0.55 }))
      }
    }
    ctx.setTransform(base)
  },
}

// ═════════════════════════════ C5a · 1943 Shanghai, the titles ═════════════════════════════

type Mag = { title: string; mag: string; col: string; icon: string }
const MAGS: Mag[] = [
  { title: '沉香屑·第一炉香', mag: '紫罗兰', col: '#6e4a6e', icon: 'censer' },
  { title: '沉香屑·第二炉香', mag: '紫罗兰', col: '#6e4a6e', icon: 'smoke' },
  { title: '茉莉香片', mag: '杂志', col: C.jade, icon: 'cup' },
  { title: '心经', mag: '万象', col: C.gold, icon: 'moon' },
  { title: '倾城之恋', mag: '杂志', col: C.jade, icon: 'wall' },
  { title: '琉璃瓦', mag: '万象', col: C.gold, icon: 'tiles' },
  { title: '金锁记', mag: '杂志', col: C.jade, icon: 'lock' },
  { title: '封锁', mag: '天地', col: C.inkSoft, icon: 'tram' },
]

// 1944 works (stories, then essays) — the second wave of her name
const T1944A = ['红玫瑰与白玫瑰', '花凋', '年青的时候', '等']
const T1944B = ['留情', '鸿鸾禧', '连环套', '殷宝滟送花楼会', '桂花蒸　阿小悲秋', '更衣记', '公寓生活记趣', '童言无忌', '私语', '烬余录', '流言']
const STREET_TEXT = [...MAGS.map((m) => m.title), ...T1944A, ...T1944B, '传奇'].join('').replace(/[·\s　]/g, '')
const INKG = '#2a1d14'
const btf = (k: number) => {
  const i = Math.floor(k)
  return lerp(bt(i), bt(i + 1), k - i)
}
type Atlas = ReturnType<typeof glyphAtlas>
function blitG(ctx: Ctx, A: Atlas, ch: string, x: number, y: number, size: number, sx = 1) {
  const i = A.index.get(ch)
  if (i === undefined) return
  const cx = (i % A.cols) * A.cell, cy = Math.floor(i / A.cols) * A.cell
  const d = size * 1.25
  ctx.drawImage(A.canvas, cx, cy, A.cell, A.cell, x - (d * sx) / 2, y - d / 2, d * sx, d)
}

// ── 福州路 of words: a one-point dolly between walls made of her titles ──
const SVX = 980, SVY = 300, SF = 820, SWALL = 8.2, SEYE = 4, SPEED = 3.2
const camZ = (t: number) => SPEED * (t - bt(46))
type SignC = { title: string; mag?: string; col: string; k: number; side: number }
const SIGNS: SignC[] = [
  ...MAGS.map((m, i): SignC => ({ title: m.title, mag: m.mag, col: m.col, k: 46 + i, side: i % 2 ? 1 : -1 })),
  ...T1944A.map((s, i): SignC => ({ title: s, col: [C.rouge, C.gold, C.jade, '#6e4a6e'][i], k: 54 + i * 0.5, side: i % 2 ? -1 : 1 })),
]
const SIGN_D = 12.5
type Ped = { kind: string; X: number; Z: number; v: number }
const PEDS: Ped[] = Array.from({ length: 16 }, (_, i) => ({ kind: ['gown', 'qipao', 'student'][i % 3], X: (rand(i, 201) - 0.5) * 11, Z: 7 + i * 3.6 + rand(i, 202) * 2, v: (rand(i, 203) - 0.3) * 1.4 }))
const pedPts = new Map<string, [number, number][]>()
function personPoints(kind: string) {
  const hit = pedPts.get(kind)
  if (hit) return hit
  const polys = pathPolys(PEOPLE[kind]).filter((p) => p.length > 8)
  const out: [number, number][] = []
  for (let v = -100; v <= 0; v += 5.5) for (let u = -16; u <= 16; u += 5.5) if (polys.some((p) => inPoly(p, u, v))) out.push([u, v])
  pedPts.set(kind, out)
  return out
}

function drawStreet(ctx: Ctx, t: number) {
  const cz = camZ(t)
  const A = glyphAtlas(STREET_TEXT, 40, FONT.kai, INKG)
  const chars = [...STREET_TEXT]
  const N = chars.length
  // ground: rows of titles receding
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const titles = [...MAGS.map((m) => m.title), ...T1944A, ...T1944B]
  for (let Z = Math.ceil(cz + 1.6); Z < cz + 60; Z++) {
    const d = Z - cz, sc = SF / d
    const fade = clamp((60 - d) / 30) * clamp((d - 1.6) / 2)
    ctx.globalAlpha = 0.45 * fade * clamp((620 - (SVY + SEYE * sc)) / 90)
    if (ctx.globalAlpha <= 0) continue
    ctx.fillStyle = INKG
    ctx.font = `400 ${Math.max(2, 0.62 * sc)}px ${FONT.kai}`
    ctx.save()
    ctx.translate(SVX, SVY + SEYE * sc)
    ctx.scale(1, 0.32)
    const w = titles[((Z % titles.length) + titles.length) % titles.length]
    ctx.fillText(`${w}　　${titles[(((Z + 5) % titles.length) + titles.length) % titles.length]}`, 0, 0)
    ctx.restore()
  }
  ctx.restore()
  // walls: every block is a facade written in her titles, windows left as gaps
  ctx.save()
  for (const side of [-1, 1]) {
    for (let Z = Math.ceil(cz + 1.8); Z < cz + 62; Z++) {
      const d = Z - cz, sc = SF / d
      const fade = clamp((62 - d) / 28) * clamp((d - 1.8) / 2.5)
      if (fade <= 0) continue
      const blk = Math.floor(Z / 7) * 2 + (side > 0 ? 1 : 0)
      const top = 6 + rand(blk, 191) * 10
      const x = SVX + side * SWALL * sc
      for (let Y = -SEYE + 0.5, r = 0; Y < top; Y += 1, r++) {
        if (r > 1 && r % 3 === 1 && ((Z % 7) + 7) % 7 % 3 !== 0) continue
        ctx.globalAlpha = fade * (0.32 + 0.5 * rand(Z * 13 + r, side + 9)) * clamp((680 - (SVY - Y * sc)) / 110)
        blitG(ctx, A, chars[(((Z * 3 + r * 37 + (side > 0 ? 11 : 0)) % N) + N) % N], x, SVY - Y * sc, 0.82 * sc, 0.5)
      }
    }
  }
  ctx.restore()
  // pedestrians made of words (drawn far → near)
  const peds = PEDS.map((p) => ({ ...p, z: p.Z + p.v * (t - bt(46)) })).filter((p) => p.z - cz > 2.2 && p.z - cz < 55).sort((a, b) => b.z - a.z)
  ctx.save()
  for (const p of peds) {
    const d = p.z - cz, sc = SF / d
    const fade = clamp((55 - d) / 20) * clamp((d - 2.2) / 2)
    const pts = personPoints(p.kind)
    const k = 3.3 / 100
    const sway = Math.sin(t * 5 + p.X) * 0.04
    pts.forEach(([u, v], i) => {
      ctx.globalAlpha = fade * (0.55 + 0.35 * rand(i, p.X * 7))
      const X = p.X + u * k + sway * (v / -100), Y = -SEYE - v * k
      blitG(ctx, A, chars[(i * 7 + Math.floor(p.Z) * 3) % N], SVX + X * sc, SVY - Y * sc, 0.2 * sc)
    })
  }
  ctx.restore()
}
function drawStreetTraces(ctx: Ctx, t: number) {
  // sparse pen traces: roof lines and the wall feet
  const cz = camZ(t)
  const P = (X: number, Y: number, Z: number): [number, number] => {
    const d = Math.max(0.8, Z - cz), sc = SF / d
    return [SVX + X * sc, SVY - Y * sc]
  }
  const L: Poly[] = []
  for (const side of [-1, 1]) {
    const z0 = Math.max(cz + 2.5, 0)
    L.push([...P(side * SWALL, -SEYE, z0), ...P(side * SWALL, -SEYE, cz + 62)])
    for (let b = Math.floor(z0 / 7); b * 7 < cz + 60; b++) {
      const blk = b * 2 + (side > 0 ? 1 : 0)
      const top = 6 + rand(blk, 191) * 10 + 0.4
      const za = Math.max(b * 7, z0), zb = (b + 1) * 7
      L.push([...P(side * SWALL, top, za), ...P(side * SWALL, top, zb)])
      if (b * 7 >= z0) L.push([...P(side * SWALL, top, b * 7), ...P(side * SWALL, -SEYE, b * 7)])
    }
  }
  penDraw(ctx, L, 1, ink(t, { width: 1.5, alpha: 0.55 }), 0)
}
function drawSign(ctx: Ctx, t: number, s: SignC) {
  const tb = btf(s.k)
  const p = prog(t, tb - 0.12, tb)
  if (p <= 0) return
  const Zs = camZ(tb) + SIGN_D
  const d = Zs - camZ(t)
  if (d < 1.2) return
  const sc = SF / d
  const n = [...s.title].length
  const cs = Math.min(0.72, 5 / n)
  const top = 3.3, bw = 1.2
  const bh = n * cs * 1.12 + (s.mag ? 1.3 : 0.6)
  const X = s.side * (SWALL - 1.2)
  const x = SVX + X * sc, y0 = SVY - top * sc
  const e = ease.outCubic(p)
  const pop = lerp(1.6, 1, e)
  const fade = clamp((d - 3) / 3)
  // bracket from the wall
  penDraw(ctx, [[SVX + s.side * SWALL * sc, y0 + 0.3 * sc, x, y0 + 0.3 * sc], [SVX + s.side * SWALL * sc, y0 + 1.2 * sc, x + s.side * -0.2 * sc, y0 + 0.3 * sc]], 1, ink(t, { width: Math.max(1, 0.06 * sc), alpha: fade * e }), 0)
  ctx.save()
  ctx.translate(x, y0 + (bh * sc) / 2)
  ctx.scale(pop, pop)
  ctx.globalAlpha *= e * fade
  const r = rectP((-bw / 2) * sc, (-bh / 2) * sc, bw * sc, bh * sc)
  ctx.fillStyle = s.col
  ctx.globalAlpha *= 0.86
  ctx.fill(pathOf([r]))
  ctx.globalAlpha /= 0.86
  penDraw(ctx, [r], 1, ink(t, { width: Math.max(1.2, 0.05 * sc) }), 0)
  ctx.fillStyle = 'rgba(248,240,222,0.96)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let yy = (-bh / 2 + 0.4) * sc
  if (s.mag) {
    ctx.font = `400 ${0.36 * sc}px ${FONT.zh}`
    ctx.fillText(`《${s.mag}》`, 0, yy + 0.1 * sc)
    yy += 0.9 * sc
  }
  ctx.font = `700 ${cs * sc}px ${FONT.zh}`
  for (const ch of s.title) {
    const c = ch === '·' ? '・' : ch
    ctx.fillText(c, 0, yy + cs * 0.56 * sc)
    yy += cs * 1.12 * sc
  }
  ctx.restore()
  // impact ticks on the beat
  const land = hit(t, tb, 9)
  if (land > 0.05) {
    const dl: Poly[] = []
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4
      const r0 = (bh * sc) / 2 + 10 + (1 - land) * 30
      dl.push(seg(x + Math.cos(a) * r0 * 0.5, y0 + (bh * sc) / 2 + Math.sin(a) * r0, x + Math.cos(a) * (r0 + 18) * 0.5, y0 + (bh * sc) / 2 + Math.sin(a) * (r0 + 18)))
    }
    penDraw(ctx, dl, 1, ink(t, { width: 1.4, alpha: land }), 0)
  }
}

const sceneC5a: Scene = {
  id: 'C5a-fuzhou-road',
  t0: bt(46),
  t1: bt(56),
  theme: 'paper',
  trans: { kind: 'whiteout', dur: 0.4 },
  draw(ctx, t) {
    oldPaper(ctx, t, { sepia: 0.3 })
    const base = ctx.getTransform()
    const ks = SIGNS.reduce((m, s) => Math.max(m, hit(t, btf(s.k), 14)), 0)
    const bi = beatIndex(t)
    const cam: Cam = { fx: W / 2 + (rand(bi, 4) - 0.5) * ks * 6, fy: H / 2 + (rand(bi, 5) - 0.5) * ks * 6, s: 1 + 0.015 * ks, rot: Math.sin(t * 0.4) * 0.008 }
    setCam(ctx, base, cam, 1)
    // the light at the end of the street
    glowAt(ctx, SVX, SVY, 420, 'rgba(255,232,190,ALPHA)', 0.55)
    ctx.save()
    ctx.globalAlpha *= ease.inOutSine(prog(t, bt(46), bt(47)))
    drawStreet(ctx, t)
    drawStreetTraces(ctx, t)
    ctx.restore()
    const live = SIGNS.filter((s) => t >= btf(s.k) - 0.12).sort((a, b) => btf(b.k) - btf(a.k))
    for (const s of live) drawSign(ctx, t, s)
    ctx.setTransform(base)
    yearMark(ctx, t, { text: '1943', x: W - 130, y: 110, t0: bt(46) + 0.1, t1: bt(54), size: 80, color: 'rgba(42,29,20,1)', align: 'right' })
    yearMark(ctx, t, { text: '1944', x: W - 130, y: 110, t0: bt(54), t1: bt(56) + 0.4, size: 80, color: 'rgba(42,29,20,1)', align: 'right' })
  },
}

// ═════════════════════════════ C5b · 1944 《传奇》: 洛阳纸贵 ═════════════════════════════

const PEACOCK = 'rgb(28,98,112)'
/** readers made of her words, in three depths (back small & faint → front large & cropped) */
const CROWD: [string, number, number, number][][] = [
  [['gown', 420, 440, 210], ['qipao', 520, 452, 200], ['student', 640, 436, 214], ['gown', 905, 446, 222], ['qipao', 1010, 438, 196], ['student', 1120, 452, 218], ['gown', 1250, 442, 206], ['qipao', 1330, 450, 200]],
  [['qipao', 470, 556, 318], ['gown', 590, 548, 336], ['student', 1000, 560, 330], ['qipao', 1150, 552, 312], ['gown', 1260, 566, 340]],
  [['gown', 150, 990, 640], ['qipao', 1280, 1010, 600]],
]
function crowdMask(tier: number) {
  return (g: Ctx) => {
    for (const [kind, x, y, h] of CROWD[tier]) {
      const polys = local(PEOPLE[kind], x, y, h / 100, (rand(x, 151) - 0.5) * 0.06)
      g.fillStyle = '#a0a0a0'
      g.fill(pathOf(polys.slice(0, 2)))
      g.lineWidth = 6
      g.strokeStyle = '#fff'
      g.stroke(pathOf(polys))
    }
    // fade toward the subtitle zone
    g.globalCompositeOperation = 'destination-out'
    const gr = g.createLinearGradient(0, 560, 0, 700)
    gr.addColorStop(0, 'rgba(0,0,0,0)')
    gr.addColorStop(1, 'rgba(0,0,0,0.85)')
    g.fillStyle = gr
    g.fillRect(0, 560, W, H - 560)
    g.globalCompositeOperation = 'source-over'
  }
}
/** textImage, but once fully surfaced it is drawn once into a cached layer and reused */
function wordCrowd(ctx: Ctx, t: number, o: Parameters<typeof textImage>[1]) {
  if ((o.emerge ?? 1) < 1) return textImage(ctx, { ...o, t: 0 })
  ctx.drawImage(layer(`wc:${o.key}`, (g) => textImage(g, { ...o, emerge: 1, t: 0 })), 0, 0)
  void t
}
/** a faint ink shadow under each word-figure so the silhouettes read */
function crowdShade(tier: number) {
  return layer(`c5shade${tier}`, (g) => {
    g.filter = 'blur(4px)'
    g.fillStyle = 'rgb(60,40,26)'
    for (const [kind, x, y, h] of CROWD[tier]) g.fill(pathOf(local(PEOPLE[kind], x, y, h / 100, (rand(x, 151) - 0.5) * 0.06).slice(0, 2)))
    g.filter = 'none'
    g.globalCompositeOperation = 'destination-out'
    const gr = g.createLinearGradient(0, 560, 0, 700)
    gr.addColorStop(0, 'rgba(0,0,0,0)')
    gr.addColorStop(1, 'rgba(0,0,0,0.9)')
    g.fillStyle = gr
    g.fillRect(0, 560, W, H - 560)
  })
}
const CROWD_TEXT =[...T1944A, ...T1944B, '传奇', ...MAGS.map((m) => m.title)].join('')
const PEOPLE: Record<string, string> = {
  gown: 'M -7 -81 C -12 -78 -13 -70 -12 -55 C -12 -35 -13 -15 -14 -2 L 14 -2 C 13 -15 12 -35 12 -55 C 13 -70 12 -78 7 -81 Z M -6 -84 C -7 -90 -5 -95 0 -95 C 5 -95 7 -90 6 -84 C 4 -81 -4 -81 -6 -84 Z M -11 -92 L 11 -92 M -6 -92 C -6 -100 6 -100 6 -92',
  qipao: 'M -5 -83 C -10 -80 -10 -70 -8 -60 C -6 -50 -9 -40 -9 -25 C -8 -12 -6 -4 -5 -1 L 5 -1 C 6 -4 8 -12 9 -25 C 9 -40 6 -50 8 -60 C 10 -70 10 -80 5 -83 Z M -5 -86 C -7 -93 -4 -98 0 -98 C 5 -98 7 -93 5 -86 C 3 -83 -3 -83 -5 -86 Z',
  student: 'M -8 -80 C -12 -76 -12 -60 -11 -48 L 11 -48 C 12 -60 12 -76 8 -80 Z M -9 -48 L -8 -1 L -2 -1 L 0 -40 L 2 -1 L 8 -1 L 9 -48 M -5 -83 C -6 -90 -4 -94 0 -94 C 4 -94 6 -90 5 -83 C 3 -80 -3 -80 -5 -83 Z M -7 -91 L 7 -91 L 8 -88 L -7 -88',
}
function c5shelves(g: Ctx) {
  const st = still({ width: 1.1, alpha: 0.75 })
  const D: Poly[] = []
  // back wall shelves full of spines
  for (let r = 0; r < 4; r++) {
    const y = 70 + r * 92
    D.push(seg(80, y + 86, 1820, y + 86), seg(80, y + 92, 1820, y + 92))
    let x = 90
    let i = r * 400
    while (x < 1800) {
      const w = 6 + rand(i, 141) * 12, h = 50 + rand(i, 142) * 34
      if (rand(i, 143) < 0.06) {
        D.push(seg(x, y + 86, x + h * 0.6, y + 86 - h * 0.8))
        x += h * 0.6
      } else D.push(rectP(x, y + 86 - h, w, h))
      x += w + 1
      i++
    }
  }
  D.push(seg(80, 60, 80, 470), seg(1820, 60, 1820, 470))
  penDraw(g, D, 1, st, 0)
  hatch(g, [rectP(80, 60, 1740, 400)], { angle: 1.45, gap: 9, color: C.ink, alpha: 0.12, width: 0.8, boil: 0 })
}
/** the first edition: one even peacock blue, black characters (her own design) */
function drawBook(ctx: Ctx, x: number, y: number, s: number, rot: number, t: number, main: boolean) {
  const w = 230 * s, h = 320 * s, th = 24 * s
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const front = rectP(-w / 2, -h / 2, w, h)
  // page block (right) and bottom edge, then the spine (left)
  const pages: Poly = [w / 2, -h / 2 + 3 * s, w / 2 + th, -h / 2 + th * 0.6, w / 2 + th, h / 2 + th * 0.6 - 3 * s, w / 2, h / 2 - 2 * s, w / 2, -h / 2 + 3 * s]
  const bottom: Poly = [-w / 2 + 3 * s, h / 2, w / 2, h / 2, w / 2 + th, h / 2 + th * 0.6, -w / 2 + th + 3 * s, h / 2 + th * 0.6, -w / 2 + 3 * s, h / 2]
  const spine: Poly = [-w / 2, -h / 2, -w / 2 - th * 0.55, -h / 2 + th * 0.35, -w / 2 - th * 0.55, h / 2 + th * 0.35, -w / 2, h / 2, -w / 2, -h / 2]
  ctx.fillStyle = 'rgb(232,220,194)'
  ctx.fill(pathOf([pages]))
  ctx.fill(pathOf([bottom]))
  ctx.strokeStyle = 'rgba(70,50,30,0.55)'
  ctx.lineWidth = 0.7
  ctx.beginPath()
  for (let i = 1; i < 26; i++) {
    const f = i / 26
    ctx.moveTo(w / 2 + th * f, -h / 2 + th * 0.6 * f + 2)
    ctx.lineTo(w / 2 + th * f, h / 2 + th * 0.6 * f - 2)
    ctx.moveTo(-w / 2 + 4 * s + th * f, h / 2 + th * 0.6 * f)
    ctx.lineTo(w / 2 + th * f - 2, h / 2 + th * 0.6 * f)
  }
  ctx.stroke()
  ctx.fillStyle = 'rgb(18,72,84)'
  ctx.fill(pathOf([spine]))
  // the cover board: one even peacock blue, printed on rough paper, rubbed at the edges
  ctx.save()
  ctx.clip(pathOf([front]))
  ctx.fillStyle = PEACOCK
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.75
  ctx.drawImage(paperBase('ash'), 300 + x * 0.3, 100, w * 1.2, h * 1.2, -w / 2, -h / 2, w, h)
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.35
  ctx.drawImage(paperStains('ash'), 600, 200, w * 1.5, h * 1.5, -w / 2, -h / 2, w, h)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.filter = `blur(${3 * s}px)`
  ctx.strokeStyle = 'rgba(214,226,214,0.35)'
  ctx.lineWidth = 9 * s
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.filter = 'none'
  ctx.strokeStyle = 'rgba(200,220,210,0.18)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  for (let i = 0; i < 14; i++) {
    const sx = (rand(i, 221) - 0.5) * w, sy = (rand(i, 222) - 0.5) * h, l = 6 + rand(i, 223) * 22
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + l, sy + (rand(i, 224) - 0.5) * 4)
  }
  ctx.stroke()
  ctx.restore()
  hatch(ctx, [spine], { angle: 1.4, gap: 2.6 * s, color: 'rgb(6,30,36)', alpha: 0.5, width: 0.7, boil: 0 })
  penDraw(ctx, [front, pages, bottom, spine], 1, still({ width: main ? 1.8 : 1.3, alpha: 0.85 }), 0)
  // letterpress title: black, heavy, slightly uneven ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const title = (fs: number, cx: number, cy: number, gap: number) => {
    ctx.font = `900 ${fs}px ${FONT.zh}`
    for (const [dx, dy, a] of [[0.8, 0.6, 0.25], [0, 0, 0.92]] as [number, number, number][]) {
      ctx.fillStyle = `rgba(6,8,8,${a})`
      ctx.fillText('传', cx + dx, cy + dy)
      ctx.fillText('奇', cx + dx, cy + gap + dy)
    }
  }
  title(76 * s, w * 0.12, -h * 0.22, 88 * s)
  ctx.font = `400 ${19 * s}px ${FONT.zh}`
  ctx.fillStyle = 'rgba(6,8,8,0.85)'
  ;['张', '爱', '玲', '著'].forEach((ch, i) => ctx.fillText(ch, -w * 0.28, h * 0.08 + i * 22 * s))
  // spine title
  ctx.save()
  ctx.translate(-w / 2 - th * 0.28, -h * 0.25)
  ctx.font = `700 ${12 * s}px ${FONT.zh}`
  ctx.fillStyle = 'rgba(6,8,8,0.9)'
  ctx.fillText('传', 0, 0)
  ctx.fillText('奇', 0, 14 * s)
  ctx.restore()
  void t
  ctx.restore()
}
const CHUMING = '呵，出名要趁早呀！来得太晚的话，快乐也不那么痛快。'
const BOOK = { x: 790, y: 360 }

const sceneC5b: Scene = {
  id: 'C5b-chuanqi-1944',
  t0: bt(56),
  t1: bt(66),
  theme: 'paper',
  trans: { kind: 'cut', dur: 0 },
  draw(ctx, t) {
    oldPaper(ctx, t, { sepia: 0.26 })
    const base = ctx.getTransform()
    const out = ease.inOutCubic(prog(t, bt(58) - 0.3, bt(58) + 0.6))
    const T = prog(t, bt(58), bt(66) + 0.4)
    const cam: Cam = { fx: lerp(BOOK.x, lerp(950, 985, T), out), fy: lerp(BOOK.y + 20, lerp(372, 362, T), out), s: lerp(1.45, lerp(1.0, 1.05, T), out) }
    // faint shelves: a trace of the bookshop
    setCam(ctx, base, cam, 0.5)
    reveal(ctx, layer('c5shelves', c5shelves), 1, { alpha: 0.18 })
    // her words falling like paper through the shop
    textRain(ctx, t, { corpus: CROWD_TEXT, n: 70, speed: 70, angle: 0.18, color: INKG, alpha: 0.28, size: 18, seed: 9 })
    // readers made of words, three depths
    setCam(ctx, base, cam, 0.7)
    drawL(ctx, crowdShade(0), 0.1 * prog(t, bt(56), bt(58)))
    wordCrowd(ctx, t, { key: 'c5crowd0', draw: crowdMask(0), corpus: CROWD_TEXT, cell: 9, color: INKG, emerge: prog(t, bt(56), bt(58)), order: 'radial', ox: BOOK.x, oy: BOOK.y, alpha: 0.62, gamma: 1.0, seed: 3 })
    setCam(ctx, base, cam, 0.85)
    drawL(ctx, crowdShade(1), 0.15 * prog(t, bt(56), bt(58) + 0.4))
    wordCrowd(ctx, t, { key: 'c5crowd1', draw: crowdMask(1), corpus: CROWD_TEXT, cell: 11, color: INKG, emerge: prog(t, bt(56) + 0.2, bt(58) + 0.4), order: 'radial', ox: BOOK.x, oy: BOOK.y, alpha: 0.9, gamma: 1.0, seed: 4 })
    // the book: stamps in on the cut, two more copies behind it (drawn once, then placed)
    setCam(ctx, base, cam, 1)
    const bp = prog(t, bt(56) - 0.1, bt(56) + 0.12)
    const pop = lerp(1.5, 1, ease.outCubic(bp)) * (1 + 0.025 * beatPulse(t, 8))
    ctx.save()
    ctx.globalAlpha *= clamp(bp * 1.5)
    ctx.translate(BOOK.x, BOOK.y)
    ctx.scale(pop, pop)
    ctx.translate(-BOOK.x, -BOOK.y)
    ctx.drawImage(layer('c5books', (g) => {
      drawBook(g, BOOK.x + 60, BOOK.y + 30, 0.92, 0.1, 0, false)
      drawBook(g, BOOK.x - 50, BOOK.y + 40, 0.92, -0.16, 0, false)
      drawBook(g, BOOK.x, BOOK.y, 1.0, -0.05, 0, true)
    }), 0, 0)
    ctx.restore()
    // pages fly out on every beat, each carrying one of her 1944 titles to a reader
    PAGE_TITLES.forEach((title, n) => {
      const k = 56 + n
      const u = prog(t, bt(k), bt(k) + 1.7)
      if (u <= 0 || u >= 1) return
      const side = n % 2 ? 1 : -1
      const tx = BOOK.x + side * (220 + rand(n, 211) * 380), ty = 150 + rand(n, 212) * 200
      const cx = (BOOK.x + tx) / 2 + side * 40, cy = 40 - rand(n, 213) * 60
      const e = ease.outCubic(u)
      const px = (1 - e) * (1 - e) * BOOK.x + 2 * e * (1 - e) * cx + e * e * tx
      const py = (1 - e) * (1 - e) * (BOOK.y - 120) + 2 * e * (1 - e) * cy + e * e * ty
      const sc = u < 0.25 ? lerp(0.6, 1.5, ease.outCubic(u / 0.25)) : lerp(1.5, 0.55, ease.inOutSine((u - 0.25) / 0.75))
      const chars = [...title.replace('　', '')]
      const fs = 17 * sc, ph = chars.length * fs * 1.12 + 26 * sc, pw = 54 * sc
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(side * (0.25 * e + 0.08 * Math.sin(t * 6 + n)))
      ctx.globalAlpha *= clamp(u / 0.06) * (1 - prog(u, 0.75, 1))
      ctx.fillStyle = 'rgba(246,238,218,0.97)'
      ctx.fill(pathOf([rectP(-pw / 2, -ph / 2, pw, ph)]))
      penDraw(ctx, [rectP(-pw / 2, -ph / 2, pw, ph)], 1, ink(t, { width: 1.3, boil: 0 }), 0)
      ctx.fillStyle = INKG
      ctx.font = `400 ${fs}px ${FONT.kai}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      chars.forEach((ch, i) => ctx.fillText(ch, 0, -ph / 2 + 13 * sc + fs * 0.56 + i * fs * 1.12))
      ctx.restore()
    })
    // front readers, cropped by the frame (closest, made of words too)
    setCam(ctx, base, cam, 1.25)
    drawL(ctx, crowdShade(2), 0.14 * prog(t, bt(57), bt(59)))
    wordCrowd(ctx, t, { key: 'c5crowd2', draw: crowdMask(2), corpus: CROWD_TEXT, cell: 14, color: INKG, emerge: prog(t, bt(57), bt(59)), order: 'sweepX', alpha: 0.75, gamma: 1.0, seed: 5 })
    // her sentence, written into the wall of the shop
    setCam(ctx, base, cam, 0.6)
    writeVertical(ctx, t, { text: CHUMING, x: 330, y: 46, size: 32, t0: 107.75, rate: 0.085, perCol: 9, color: C.ink, grid: null })
    // her: surfacing out of words, then her own line
    setCam(ctx, base, cam, 1.2)
    wordCrowd(ctx, t, {
      key: 'c5her2', cell: 10, color: '#8a1f26', emerge: prog(t, bt(58), bt(61)), order: 'sweepYUp', scatter: 90, gamma: 1.3, seed: 6,
      draw: (g) => eileen(g, 'youngStand', { x: 1480, y: 640, h: 540, color: '#fff', dress: '#888', fill: 1, weight: 3.5, boil: 0 }),
    })
    // (her line drawing is expensive: drawn live while it appears, then reused from a cache)
    const herOpts = { x: 1480, y: 640, h: 540, dress: C.rouge, alpha: 0.8 }
    if (t < bt(61) + 0.6) eileen(ctx, 'youngStand', { ...herOpts, progress: prog(t, bt(60), bt(61)), fill: 0.35 * on(t, 60, 1.0), t })
    else ctx.drawImage(layer('c5herLine', (g) => eileen(g, 'youngStand', { ...herOpts, progress: 1, fill: 0.35, boil: 0 })), 0, 0)
    ctx.setTransform(base)
    yearMark(ctx, t, { text: '1944', x: W - 130, y: 120, t0: bt(56) + 0.1, t1: bt(66) + 0.3, size: 90, color: 'rgba(42,29,20,1)', align: 'right' })
  },
}
const PAGE_TITLES = T1944B

void sketchLine

export const scenes: Scene[] = [sceneC1, sceneC2, sceneC3, sceneC4, sceneC5a, sceneC5b]
