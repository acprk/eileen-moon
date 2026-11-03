/**
 * Segment B · 41.471–76.324 s · verse 1 · 1920–1938. Owner: agent B.
 *
 * Language (style update, round 2): images made of her words and light. Main subjects are text-matter
 * (textImage / textPlane / glyph fields); pen lines are sparse chalk traces and accents; the moon is the warm light.
 *
 *   B1 41.471–49.017  1920 · the Markham Road mansion surfaces from characters under the moon; one window lit
 *   B2 49.017–54.265  1924 · dusk: the liner (made of words) leaves the Bund over a river of words; the mother's
 *                      silhouette at the rail; on the pier the child holds the amah's hand
 *   B3 54.265–59.768  the dim room: the father on the opium couch; the lamp's smoke rises as drifting characters
 *                      (《天才梦》) and fills the room; the child small in the lit far doorway; 《天才梦》 vertical
 *   B4 59.768–70.798  1937 · the locked room: the moonlight on the floor is made of 《私语》; she (made of text) sits
 *                      in it; "half a year" = moon phases stepping on the beats, 正-tallies, the patch sweeping
 *   B5 70.798–76.324+ 1938 · dawn: the 石库门 lane; the stone road is a road of words rushing under her as she runs;
 *                      streaks and a burst of characters on the downbeat into the chorus
 */
import { C, FONT, H, W } from '../config'
import { eileen } from '../lib/eileen'
import type { Scene } from '../lib/film'
import { glowAt, moon, nightPaper } from '../lib/ground'
import { TAU, beatIndex, beatPulse, beatTime, clamp, ease, lerp, prog, rand } from '../lib/math'
import { hatch, pathPolys, penDraw, penStroke, sketchEllipse, sketchLine, wash, type PenStyle, type Poly } from '../lib/pen'
import { CORPUS, glyphAtlas, textImage, textPlane } from '../lib/textmatter'
import { cached, type Ctx } from '../lib/texture'
import { writeVertical, yearMark } from '../lib/type'

// ───────────────────────────── helpers ─────────────────────────────

type P = [number, number]
type V3 = [number, number, number]
const flat = (pts: P[]): Poly => {
  const o: number[] = []
  for (const p of pts) o.push(p[0], p[1])
  return o
}
const L = (a: P, b: P, seed: number, over = 4): Poly => sketchLine(a[0], a[1], b[0], b[1], seed, over)
const box = (x: number, y: number, w: number, h: number, seed: number, over = 3): Poly[] => [
  sketchLine(x, y, x + w, y, seed, over), sketchLine(x + w, y, x + w, y + h, seed + 1, over),
  sketchLine(x + w, y + h, x, y + h, seed + 2, over), sketchLine(x, y + h, x, y, seed + 3, over),
]
const ell = (x: number, y: number, rx: number, ry: number, seed: number, lap = 0.08) => sketchEllipse(x, y, rx, ry, seed, lap)
const chalk = (o: PenStyle = {}): PenStyle => ({ color: C.lineNight, boil: 8, ...o })
const pp = (d: string) => pathPolys(d)[0]
const TXT = '#d6deee'
const WARM_TXT = '#ecd9b2'

/** Verbatim sources used as glyph corpora (texture) and in-frame quotes. */
const TIANCAI = '我是一个古怪的女孩，从小被目为天才，除了发展我的天才外别无生存的目标。' // 《天才梦》
const SIYU = '我生在里面的房屋忽然变成生疏的了，像月光底下的，黑影中现出青白的粉墙，片面的，癫狂的。' // 《私语》
const chars = (s: string) => [...s.replace(/[，。、；：！？—…“”「」《》\s]/g, '')]

/** Planar façade: (u,v) in [0,1]² → screen, with perspective foreshortening along u. */
type Face = (u: number, v: number) => P
function face(tl: P, tr: P, br: P, bl: P): Face {
  const r = (br[1] - tr[1]) / (bl[1] - tl[1])
  return (u, v) => {
    const s = (u * r) / (1 - u + u * r)
    const tx = lerp(tl[0], tr[0], s), ty = lerp(tl[1], tr[1], s)
    const bx = lerp(bl[0], br[0], s), by = lerp(bl[1], br[1], s)
    return [lerp(tx, bx, v), lerp(ty, by, v)]
  }
}
const fl = (F: Face, u0: number, v0: number, u1: number, v1: number, seed: number, over = 2) => L(F(u0, v0), F(u1, v1), seed, over)
const fpts = (F: Face, uv: P[]) => flat(uv.map(([u, v]) => F(u, v)))
const fquad = (F: Face, u0: number, v0: number, u1: number, v1: number): P[] => [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)]

/** Pinhole projection (X right, Y down, Z forward) onto a vanishing point. */
const proj = (vx: number, vy: number, f: number, cx = 0) => (X: number, Y: number, Z: number): P => [vx + (f * (X - cx)) / Z, vy + (f * Y) / Z]

/** Camera: scale about (ox,oy) then shift. */
function cam(ctx: Ctx, s: number, dx: number, dy: number, ox = W / 2, oy = H * 0.42) {
  ctx.translate(ox + dx, oy + dy)
  ctx.scale(s, s)
  ctx.translate(-ox, -oy)
}
function pathOf(ctx: Ctx, p: P[]) {
  ctx.moveTo(p[0][0], p[0][1])
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1])
  ctx.closePath()
}
function clipOut(ctx: Ctx, polys: P[][]) {
  ctx.beginPath()
  ctx.rect(-W, -H, 3 * W, 3 * H)
  for (const p of polys) pathOf(ctx, p)
  ctx.clip('evenodd')
}
function clipIn(ctx: Ctx, p: P[]) {
  ctx.beginPath()
  pathOf(ctx, p)
  ctx.clip()
}
function fillPoly(ctx: Ctx, p: P[], color: string) {
  ctx.beginPath()
  pathOf(ctx, p)
  ctx.fillStyle = color
  ctx.fill()
}
/** Cached full-frame layer (pre-camera coordinates). */
const lay = (key: string, fn: (g: Ctx) => void) => cached(`segB:${key}`, W, H, (g) => fn(g))

/** Reveal a cached layer with a ragged sweep. */
function reveal(ctx: Ctx, img: HTMLCanvasElement, p: number, angle = 0.35, alpha = 1) {
  if (p <= 0 || alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  if (p < 1) {
    const R = Math.hypot(W, H) / 2 + 40
    const x = -R + p * 2 * R
    ctx.translate(W / 2, H / 2)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(-R, -R)
    ctx.lineTo(x, -R)
    for (let y = -R, i = 0; y <= R; y += 22, i++) ctx.lineTo(x + (rand(i, 7) - 0.5) * 70, y)
    ctx.lineTo(x, R)
    ctx.lineTo(-R, R)
    ctx.closePath()
    ctx.rotate(-angle)
    ctx.translate(-W / 2, -H / 2)
    ctx.clip()
  }
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

/** Loopy foliage scribble (a stretched coil). */
function scribble(cx: number, cy: number, r: number, seed: number, loops = 6): Poly {
  const out: number[] = []
  const N = loops * 14
  const a0 = rand(seed, 1) * TAU
  for (let i = 0; i <= N; i++) {
    const k = i / N
    const a = a0 + k * loops * TAU
    const rr = r * (0.3 + 0.24 * rand(Math.floor(i / 5), seed))
    out.push(cx + lerp(-r * 0.7, r * 0.7, k) + Math.cos(a) * rr, cy + Math.sin(k * 3.1 + seed) * r * 0.3 + Math.sin(a) * rr * 0.7)
  }
  return out
}
/** Jagged irregular outline. */
function jag(x: number, y: number, rx: number, ry: number, seed: number, n = 22): P[] {
  const pts: P[] = []
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU
    const k = 0.55 + 0.45 * rand(j, seed) + (j % 3 === 0 ? 0.25 * rand(j, seed + 1) : 0)
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k])
  }
  return pts
}

// ── glyph helpers (atlas blits: thousands per frame stay cheap) ──
type Atlas = ReturnType<typeof glyphAtlas>
const atlas = (corpus: string, color: string) => glyphAtlas(corpus, 32, FONT.kai, color)
function blitG(ctx: Ctx, A: Atlas, ch: string, x: number, y: number, size: number, squash = 1) {
  const i = A.index.get(ch)
  if (i === undefined) return
  const d = (A.cell * size) / 32
  ctx.drawImage(A.canvas, (i % A.cols) * A.cell, Math.floor(i / A.cols) * A.cell, A.cell, A.cell, x - d / 2, y - (d * squash) / 2, d, d * squash)
}
/** Characters placed along a polyline every `step` px; alpha(f) with f = 0 at the start … 1 at the end. */
function glyphsAlong(ctx: Ctx, A: Atlas, cs: string[], poly: Poly, step: number, size: (f: number) => number, alpha: (f: number) => number, seed: number) {
  let acc = 0, next = 0, n = 0
  let total = 0
  for (let i = 2; i < poly.length; i += 2) total += Math.hypot(poly[i] - poly[i - 2], poly[i + 1] - poly[i - 1])
  if (total <= 0) return
  const a0 = ctx.globalAlpha
  for (let i = 2; i < poly.length; i += 2) {
    const seg = Math.hypot(poly[i] - poly[i - 2], poly[i + 1] - poly[i - 1])
    while (next <= acc + seg) {
      const k = (next - acc) / (seg || 1)
      const f = next / total
      const a = alpha(f)
      if (a > 0.01) {
        ctx.globalAlpha = a0 * a
        blitG(ctx, A, cs[(n + seed * 7) % cs.length], lerp(poly[i - 2], poly[i], k), lerp(poly[i - 1], poly[i + 1], k), size(f))
      }
      n++
      next += step
    }
    acc += seg
  }
  ctx.globalAlpha = a0
}

function bottomShade(ctx: Ctx, a: number) {
  ctx.save()
  const g = ctx.createLinearGradient(0, H * 0.7, 0, H)
  g.addColorStop(0, 'rgba(10,13,22,0)')
  g.addColorStop(1, `rgba(10,13,22,${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, H * 0.7, W, H * 0.3)
  ctx.restore()
}

/** Standing silhouette (anchor bottom-centre). kind: 0 man (coat), 1 woman (long skirt), 2 woman (short coat). hat: 0 bare, 1 fedora, 2 cloche, 3 bun, 4 boater */
type Person = { x: number; y: number; h: number; kind: number; hat: number; seed: number }
function personPoly(p: Person): P[] {
  const s = p.h / 100
  const w = p.kind === 0 ? 1 : 0.88
  const hem = p.kind === 1 ? -9 : p.kind === 2 ? -30 : -24
  const flare = p.kind === 1 ? 17 : 15
  const raw: P[] = [
    [-3.5, -80], [-11 * w, -78], [-15.5 * w, -73], [-17 * w, -60], [-17.5 * w, -44], [-flare * w, hem], [-7, hem], [-7, 0], [-2, 0], [-1.2, hem + 4],
    [1.2, hem + 4], [2, 0], [7, 0], [7, hem], [flare * w, hem], [17.5 * w, -44], [17 * w, -60], [15.5 * w, -73], [11 * w, -78], [3.5, -80],
  ]
  return raw.map(([u, v]) => [p.x + u * s + (rand(p.seed, Math.round(v)) - 0.5) * s * 0.8, p.y + v * s])
}
/** Moonlit silhouette: dark indigo body, chalk rim drawn by the pen. */
function silhouette(ctx: Ctx, p: Person, prg: number, fillA: number, t: number, rimA = 0.75) {
  const s = p.h / 100
  const body = personPoly(p)
  if (fillA > 0) {
    ctx.save()
    ctx.globalAlpha *= fillA
    ctx.fillStyle = 'rgb(9,12,22)'
    ctx.beginPath()
    pathOf(ctx, body)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(p.x, p.y - 88 * s, 6.6 * s, 8 * s, 0, 0, TAU)
    ctx.fill()
    if (p.hat === 1) { ctx.fillRect(p.x - 12 * s, p.y - 94 * s, 24 * s, 2.6 * s); ctx.fillRect(p.x - 6.8 * s, p.y - 102 * s, 13.6 * s, 9 * s) }
    if (p.hat === 4) { ctx.fillRect(p.x - 11 * s, p.y - 94 * s, 22 * s, 2.2 * s); ctx.fillRect(p.x - 6.5 * s, p.y - 99 * s, 13 * s, 6 * s) }
    if (p.hat === 2) { ctx.beginPath(); ctx.ellipse(p.x, p.y - 89 * s, 10.5 * s, 12.5 * s, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(p.x - 11.5 * s, p.y - 90 * s, 23 * s, 3 * s) }
    if (p.hat === 3) { ctx.beginPath(); ctx.ellipse(p.x, p.y - 94 * s, 4.5 * s, 4 * s, 0, 0, TAU); ctx.fill() }
    ctx.restore()
  }
  // rim: the moonlit side only (upper/right half of the outline)
  const rim = body.slice(13).concat([body[0]])
  const lines: Poly[] = [flat(rim), pp(`M${p.x + 1 * s} ${p.y - 96 * s} C${p.x + 7 * s} ${p.y - 95 * s} ${p.x + 8 * s} ${p.y - 86 * s} ${p.x + 5 * s} ${p.y - 81 * s}`)]
  if (p.hat === 2) lines.push(pp(`M${p.x - 6 * s} ${p.y - 100 * s} C${p.x + 4 * s} ${p.y - 104 * s} ${p.x + 11 * s} ${p.y - 98 * s} ${p.x + 11.5 * s} ${p.y - 88 * s}`))
  if (p.hat === 1 || p.hat === 4) lines.push(L([p.x - 12 * s, p.y - 93 * s], [p.x + 12 * s, p.y - 93 * s], p.seed + 1, 1))
  penDraw(ctx, lines, prg, chalk({ t, width: Math.max(0.8, s * 1.0), alpha: rimA }))
}

// ═════════════════════════════ B1 · 1920 · the mansion ═════════════════════════════

const HF = face([470, 205], [1330, 285], [1330, 505], [470, 560])
const HS = face([352, 236], [470, 205], [470, 560], [352, 534])
const NB = 7
const wallTop = (x: number) => lerp(548, 506, (x + 60) / 2050)
const wallBot = (x: number) => lerp(640, 592, (x + 60) / 2050)
const WALL: P[] = [[-60, wallTop(-60)], [1990, wallTop(1990)], [1990, 900], [-60, 900]]
const TRUNK_L = 'M60 840 C110 670 96 510 146 370 S200 258 222 222'
const TRUNK_R = 'M300 840 C262 676 276 528 268 408 S300 292 352 250'
const TRUNK: P[] = (() => {
  const a = pp(TRUNK_L), b = pp(TRUNK_R)
  const pts: P[] = []
  for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]])
  for (let i = b.length - 2; i >= 0; i -= 2) pts.push([b[i], b[i + 1]])
  return pts
})()
const GLOW_BAY = 2
const PIERS = [560, 1100, 1600]

const B1G = (() => {
  let s = 100
  const outline: Poly[] = []
  const cols: Poly[] = []
  const roof: Poly[] = []
  const detail: Poly[] = []
  const fine: Poly[] = []
  const wins: P[][] = []
  outline.push(fl(HF, 0, 0, 1, 0, s++), fl(HF, 1, 0, 1, 1, s++), fl(HF, 0, 0, 0, 1, s++), fl(HF, 0, 1, 1, 1, s++))
  outline.push(fl(HS, 0, 0, 1, 0, s++), fl(HS, 0, 0, 0, 1, s++), fl(HS, 0, 1, 1, 1, s++))
  for (const v of [0.03, 0.065, 0.465, 0.5]) outline.push(fl(HF, -0.012, v, 1.012, v, s++), fl(HS, -0.02, v, 1, v, s++))
  outline.push(fl(HF, 0, 0.93, 1, 0.93, s++))
  for (let i = 0; i <= NB; i++) {
    const u = i / NB, w = 0.0105
    for (const [va, vb] of [[0.065, 0.465], [0.5, 0.93]]) cols.push(fl(HF, u - w, va + 0.02, u - w, vb - 0.01, s++, 1), fl(HF, u + w, va + 0.02, u + w, vb - 0.01, s++, 1))
    for (const v of [0.085, 0.52]) cols.push(fl(HF, u - w * 1.9, v, u + w * 1.9, v, s++, 1))
  }
  for (let i = 0; i < NB; i++) {
    const a = i / NB + 0.0105, b = (i + 1) / NB - 0.0105, m = (a + b) / 2
    const arch: P[] = []
    for (let k = 0; k <= 18; k++) {
      const th = Math.PI * (1 - k / 18)
      arch.push([m + (Math.cos(th) * (b - a)) / 2, 0.665 - Math.sin(th) * 0.11])
    }
    cols.push(fpts(HF, arch))
    const seg: P[] = []
    for (let k = 0; k <= 12; k++) seg.push([lerp(a, b, k / 12), 0.135 - Math.sin((k / 12) * Math.PI) * 0.035])
    detail.push(fpts(HF, seg))
    detail.push(fl(HF, a, 0.395, b, 0.395, s++, 1), fl(HF, a, 0.405, b, 0.405, s++, 1))
    for (let j = 0; j < 9; j++) {
      const u = lerp(a + 0.006, b - 0.006, j / 8)
      fine.push(fl(HF, u, 0.405, u, 0.462, s++, 0))
    }
    const hw = 0.022
    wins.push(fquad(HF, m - hw, 0.16, m + hw, 0.39))
    detail.push(fl(HF, m - hw, 0.16, m + hw, 0.16, s++, 1), fl(HF, m + hw, 0.16, m + hw, 0.39, s++, 1), fl(HF, m - hw, 0.16, m - hw, 0.39, s++, 1))
    detail.push(fl(HF, m, 0.17, m, 0.39, s++, 1), fl(HF, m - hw, 0.215, m + hw, 0.215, s++, 1))
    for (const side of [-1, 1]) {
      const u0 = m + side * hw, u1 = m + side * (hw + 0.017)
      fine.push(fl(HF, u1, 0.16, u1, 0.39, s++, 1))
      if (i !== GLOW_BAY) for (let k = 0; k < 11; k++) fine.push(fl(HF, u0, 0.172 + k * 0.02, u1, 0.178 + k * 0.02, s++, 0))
    }
    fine.push(fpts(HF, [[m - hw - 0.006, 0.155], [m, 0.12], [m + hw + 0.006, 0.155]]))
    detail.push(fl(HF, m - hw, 0.62, m - hw, 0.925, s++, 1), fl(HF, m + hw, 0.62, m + hw, 0.925, s++, 1), fl(HF, m, 0.63, m, 0.925, s++, 1))
  }
  for (let k = 0; k <= 46; k++) fine.push(fl(HF, k / 46, 0, k / 46, 0.028, s++, 0))
  for (const m of [0.33, 0.7]) for (const [v0, v1] of [[0.15, 0.4], [0.6, 0.88]]) {
    detail.push(fl(HS, m - 0.09, v0, m + 0.09, v0, s++, 1), fl(HS, m + 0.09, v0, m + 0.09, v1, s++, 1), fl(HS, m - 0.09, v0, m - 0.09, v1, s++, 1), fl(HS, m - 0.1, v1, m + 0.1, v1, s++, 1))
  }
  const eL = HS(-0.04, -0.01), eR = HF(1.025, -0.01)
  const rL = HF(0.1, -0.36), rR = HF(0.88, -0.36)
  roof.push(L(eL, HF(-0.02, -0.01), s++), L(HF(-0.02, -0.01), eR, s++, 6), L(rL, rR, s++, 6), L(eL, rL, s++), L(HF(-0.01, -0.01), rL, s++), L(eR, rR, s++))
  const chim: P[][] = []
  for (const [u, w] of [[0.27, 0.03], [0.7, 0.026]]) {
    roof.push(fl(HF, u, -0.2, u, -0.5, s++, 1), fl(HF, u + w, -0.22, u + w, -0.5, s++, 1), fl(HF, u - 0.006, -0.5, u + w + 0.006, -0.5, s++, 1))
    chim.push([HF(u, -0.2), HF(u, -0.5), HF(u + w, -0.5), HF(u + w, -0.22)])
  }
  const dm = 0.5
  fine.push(fpts(HF, [[dm - 0.035, -0.04], [dm - 0.035, -0.17], [dm, -0.25], [dm + 0.035, -0.17], [dm + 0.035, -0.04]]))
  for (let k = 1; k < 14; k++) {
    const v = -0.025 * k
    fine.push(fl(HF, lerp(-0.02, 0.1, k / 14.4), v, lerp(1.025, 0.88, k / 14.4), v, s++, 0))
  }
  const roofPoly: P[] = [eL, HF(-0.02, -0.01), eR, rR, rL]
  return { outline, cols, roof, detail, fine, wins, roofPoly, chim }
})()

const B1TREE = (() => {
  const trunk = [...pathPolys(TRUNK_L), ...pathPolys(TRUNK_R)]
  const boughs = [
    pp('M228 222 C300 150 400 120 520 104 S720 92 860 46'), pp('M214 228 C168 170 120 132 18 104'),
    pp('M300 246 C370 226 446 236 520 276'), pp('M244 218 C250 150 238 80 214 -10'), pp('M262 236 C320 190 340 140 390 60'),
  ]
  const LC: [number, number, number][] = [[40, 110, 48], [120, 64, 56], [212, 30, 58], [320, 70, 52], [430, 88, 46], [560, 70, 44], [690, 64, 48], [820, 34, 44], [16, 190, 40], [500, 236, 34], [270, 120, 44], [380, 18, 46], [610, 16, 40], [170, 160, 36], [740, 110, 32], [930, 18, 34], [80, 30, 40], [470, 30, 36]]
  return { trunk, boughs, LC }
})()

const B1WALL = (() => {
  let s = 900
  const top: Poly[] = [L([-60, wallTop(-60)], [1990, wallTop(1990)], s++, 0), L([-60, wallTop(-60) + 12], [1990, wallTop(1990) + 12], s++, 0)]
  const piers: Poly[] = []
  const rail: Poly[] = []
  for (const x of PIERS) {
    const yt = wallTop(x) - 96
    piers.push(L([x - 24, yt], [x - 24, wallBot(x)], s++, 2), L([x + 24, yt - 1], [x + 24, wallBot(x) - 1], s++, 2))
    piers.push(L([x - 32, yt], [x + 32, yt - 1], s++, 2), L([x - 28, yt - 12], [x + 28, yt - 13], s++, 1), ell(x, yt - 26, 13, 13, s++))
  }
  const spans: [number, number][] = [[-60, PIERS[0] - 26], [PIERS[0] + 26, PIERS[1] - 26], [PIERS[1] + 26, PIERS[2] - 26], [PIERS[2] + 26, 1990]]
  for (const [a, b] of spans) {
    rail.push(L([a, wallTop(a) - 58], [b, wallTop(b) - 58], s++, 0), L([a, wallTop(a) - 16], [b, wallTop(b) - 16], s++, 0))
    for (let x = a + 8; x < b - 4; x += 15) {
      rail.push([x, wallTop(x), x, wallTop(x) - 70])
      rail.push(flat([[x - 3, wallTop(x) - 68], [x, wallTop(x) - 77], [x + 3, wallTop(x) - 68]]))
    }
  }
  return { top, piers, rail }
})()

function b1HouseMask(g: Ctx) {
  clipOut(g, [WALL, TRUNK])
  // planes: façade mid-grey, side face darker (shade), roof textured, window interiors dark
  fillPoly(g, [HF(0, 0), HF(1, 0), HF(1, 1), HF(0, 1)], '#4a4a4a')
  fillPoly(g, [HS(0, 0), HS(1, 0), HS(1, 1), HS(0, 1)], '#262626')
  fillPoly(g, B1G.roofPoly, '#3c3c3c')
  for (const c of B1G.chim) fillPoly(g, c, '#888')
  for (let i = 0; i < NB; i++) {
    const a = i / NB + 0.0105, b = (i + 1) / NB - 0.0105
    fillPoly(g, fquad(HF, a, 0.56, b, 0.93), '#141414') // veranda in shadow
  }
  B1G.wins.forEach((q, i) => fillPoly(g, q, i === GLOW_BAY ? '#fff' : '#0a0a0a'))
  const st = (w: number, c: string): PenStyle => ({ color: c, width: w, nib: false, wobble: 0.6 })
  penDraw(g, B1G.fine, 1, st(2.6, '#bbb'))
  penDraw(g, B1G.detail, 1, st(4, '#eee'))
  penDraw(g, B1G.cols, 1, st(7, '#fff'))
  penDraw(g, B1G.outline, 1, st(7, '#fff'))
  penDraw(g, B1G.roof, 1, st(7, '#fff'))
}
function b1TreeMask(g: Ctx) {
  fillPoly(g, TRUNK, '#707070')
  penDraw(g, B1TREE.trunk, 1, { color: '#fff', width: 5, nib: false })
  penDraw(g, B1TREE.boughs, 1, { color: '#ddd', width: 12, nib: false, taperOut: 80 })
  B1TREE.LC.forEach(([x, y, r], i) => {
    fillPoly(g, jag(x, y, r * 0.95, r * 0.7, 300 + i, 18), '#5c5c5c')
  })
}
function b1Rail() {
  return lay('b1rail', (g) => {
    clipOut(g, [TRUNK])
    penDraw(g, B1WALL.rail, 1, { color: C.lineNight, width: 1.1, alpha: 0.55, nib: false, taperIn: 3, taperOut: 3 })
    // wall courses (sparse) and a few bricks
    for (let r = 0; r < 5; r++) penStroke(g, L([-60, wallTop(-60) + 26 + r * 14], [1990, wallTop(1990) + 26 + r * 14], 950 + r, 0), 1, { color: C.lineNight, width: 0.7, alpha: 0.18, nib: false })
    // background garden tree and shrubs (faint chalk)
    const st: PenStyle = { color: C.lineNight, width: 1.1, alpha: 0.35, nib: false }
    penDraw(g, [pp('M1680 470 C1676 400 1690 350 1684 300 S1650 230 1610 210'), pp('M1700 470 C1704 410 1700 360 1712 310 S1750 240 1790 214')], 1, { ...st, width: 1.6 })
    const cl: [number, number, number][] = [[1610, 210, 50], [1700, 196, 56], [1790, 220, 44], [1650, 268, 40], [1760, 280, 42], [1560, 260, 36]]
    cl.forEach(([x, y, r], i) => penStroke(g, scribble(x, y, r, 700 + i, 6), 1, { ...st, seed: 70 + i }))
    for (let i = 0; i < 9; i++) penStroke(g, scribble(1340 + i * 64 + rand(i, 3) * 30, 470 - rand(i, 4) * 26, 26, 720 + i, 4), 1, { ...st, seed: 90 + i, alpha: 0.28 })
  })
}

function drawB1(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 5 })
  const k = ease.inOutSine(prog(t, 41.471, 50))
  const ox = 700, oy = 280
  // opening pan: A ends on the old house at frame right — start there and glide left (parallax per layer)
  const pan = 560 * (1 - ease.inOutSine(prog(t, 41.471, 45.0)))
  // sky: the moon (narrator) and faint cloud traces
  ctx.save()
  cam(ctx, lerp(1, 1.03, k), lerp(10, -10, k) + pan * 0.35, 0, ox, oy)
  moon(ctx, 1600, 120, 40, { t, glow: 0.9 })
  penDraw(ctx, [pp('M1380 168 C1460 156 1530 170 1620 160 S1760 150 1800 160'), pp('M1450 190 C1520 182 1600 194 1700 186')], prog(t, 42.4, 45), chalk({ width: 1.1, t, alpha: 0.4 }))
  ctx.restore()
  // the house surfaces from characters, bottom → top
  ctx.save()
  cam(ctx, lerp(1.0, 1.075, k), lerp(20, -16, k) + pan, 0, ox, oy)
  textImage(ctx, { key: 'b1house', draw: b1HouseMask, cell: 9, emerge: prog(t, 41.5, 45.8), order: 'sweepYUp', t, scatter: 80, gamma: 1.1, color: '#e8edf7', alpha: 1, seed: 3, sizeByValue: true })
  // one lit window: warm, the only other light (her birth)
  const gq = B1G.wins[GLOW_BAY]
  const gk = ease.outCubic(prog(t, 45.534, 46.6)) * (0.92 + 0.08 * Math.sin(t * 2.3))
  if (gk > 0) {
    const cx = (gq[0][0] + gq[2][0]) / 2, cy = (gq[0][1] + gq[2][1]) / 2
    glowAt(ctx, cx, cy, 220, 'rgba(243,200,130,ALPHA)', 0.5 * gk)
    wash(ctx, [flat(gq)], C.moon, { alpha: 0.85 * gk, blur: 2 })
  }
  // sparse pen traces over the text: the roofline and cornice being drawn
  ctx.save()
  clipOut(ctx, [WALL, TRUNK])
  penDraw(ctx, B1G.roof, prog(t, 42.0, 44.6), chalk({ width: 1.4, t, alpha: 0.6 }))
  penDraw(ctx, B1G.outline.slice(0, 7), prog(t, 42.6, 45.0), chalk({ width: 1.2, t, alpha: 0.5 }))
  ctx.restore()
  // garden wall and iron railings (chalk traces)
  ctx.save()
  clipOut(ctx, [TRUNK])
  reveal(ctx, b1Rail(), prog(t, 43.6, 46.4), 0.0, 1)
  penDraw(ctx, B1WALL.top, prog(t, 42.6, 44.6), chalk({ width: 1.8, t, alpha: 0.85 }))
  penDraw(ctx, B1WALL.piers, prog(t, 43.0, 45.4), chalk({ width: 1.5, t, alpha: 0.8 }))
  ctx.restore()
  ctx.restore()
  // the old tree, foreground, also of characters (dimmer), fastest parallax
  ctx.save()
  cam(ctx, lerp(1.0, 1.11, k), lerp(46, -40, k) + pan * 1.5, 0, ox, oy)
  textImage(ctx, { key: 'b1tree', draw: b1TreeMask, cell: 12, emerge: prog(t, 41.6, 45.2), order: 'sweepYUp', t, scatter: 60, gamma: 1.0, color: '#aab6d0', alpha: 0.9, seed: 9 })
  penDraw(ctx, B1TREE.trunk, prog(t, 41.6, 43.4), chalk({ width: 1.6, t, alpha: 0.55 }))
  ctx.restore()
  bottomShade(ctx, 0.4)
  yearMark(ctx, t, { text: '1920', x: 1396, y: 372, t0: 42.42, t1: 48.6, size: 104, color: 'rgba(234,228,214,1)' })
}

// ═════════════════════════════ B2 · 1924 · the liner ═════════════════════════════

const SX0 = 700, SX1 = 1700
const sq = (x: number) => (x - SX0) / (SX1 - SX0)
const deckY = (x: number) => lerp(334, 296, sq(x)) - 12 * Math.pow(1 - sq(x), 3)
const wlY = (x: number) => lerp(426, 470, sq(x))
const ssc = (x: number) => lerp(0.58, 1, sq(x))
const tierTop = (x: number, n: number) => {
  let y = deckY(x)
  const hs = [44, 36, 30]
  for (let i = 0; i < n; i++) y -= hs[i] * ssc(x)
  return y
}
const TIERS: [number, number][] = [[860, 1600], [940, 1520], [1050, 1400]]
const FUNNELS = [1135, 1300]

const B2G = (() => {
  let s = 2000
  const hull: Poly[] = []
  const sup: Poly[] = []
  const fine: Poly[] = []
  const line = (xa: number, xb: number, fy: (x: number) => number, n = 12): Poly => {
    const o: number[] = []
    for (let i = 0; i <= n; i++) {
      const x = lerp(xa, xb, i / n)
      o.push(x, fy(x))
    }
    return o
  }
  hull.push(line(690, SX1, deckY, 20), line(745, 1672, wlY, 16))
  hull.push(pp(`M690 ${deckY(690)} C700 ${deckY(690) + 30} 722 ${wlY(740) - 30} 745 ${wlY(745)}`))
  hull.push(pp(`M${SX1} ${deckY(SX1)} C1736 350 1716 446 1672 ${wlY(1672)}`))
  fine.push(line(722, 1700, (x) => lerp(deckY(x), wlY(x), 0.66), 14))
  sup.push(line(700, SX1, (x) => deckY(x) - 16 * ssc(x), 20))
  for (let x = 712; x < SX1; x += 13 * ssc(x)) fine.push([x, deckY(x), x, deckY(x) - 16 * ssc(x)])
  for (const fr of [0.24, 0.44]) for (let x = 760; x < 1660; x += 24 * ssc(x)) fine.push(ell(x, lerp(deckY(x), wlY(x), fr), 2.6 * ssc(x), 2.6 * ssc(x), s++, 0.05))
  TIERS.forEach(([xa, xb], n) => {
    sup.push(line(xa, xb, (x) => tierTop(x, n + 1), 10), [xa, tierTop(xa, n), xa, tierTop(xa, n + 1)], [xb, tierTop(xb, n), xb, tierTop(xb, n + 1)])
    for (let x = xa + 6; x < xb - 4; x += 11 * ssc(x)) fine.push([x, lerp(tierTop(x, n), tierTop(x, n + 1), 0.3), x, lerp(tierTop(x, n), tierTop(x, n + 1), 0.62)])
    fine.push(line(xa + 4, xb - 4, (x) => tierTop(x, n + 1) - 9 * ssc(x), 8))
  })
  for (let k = 0; k < 6; k++) {
    const x = 980 + k * 88, w = 56 * ssc(x), y = tierTop(x, 2) - 14 * ssc(x)
    fine.push(pp(`M${x} ${y} Q${x + w / 2} ${y + 12 * ssc(x)} ${x + w} ${y}`), [x, y, x + w, y])
  }
  const funnels: P[][] = []
  for (const x of FUNNELS) {
    const w = 40 * ssc(x), h = 124 * ssc(x), rk = 22 * ssc(x)
    const b0: P = [x, tierTop(x, 3)], b1: P = [x + w, tierTop(x + w, 3)]
    const t0: P = [x + rk, b0[1] - h], t1: P = [x + w + rk, b1[1] - h - 2]
    funnels.push([b0, t0, t1, b1])
    sup.push(L(b0, t0, s++, 1), L(b1, t1, s++, 1), pp(`M${t0[0]} ${t0[1]} Q${(t0[0] + t1[0]) / 2} ${t0[1] - 5} ${t1[0]} ${t1[1]}`))
  }
  const m1b: P = [800, deckY(800)], m1t: P = [790, deckY(800) - 250 * ssc(800)]
  const m2b: P = [1630, deckY(1630)], m2t: P = [1620, deckY(1630) - 270 * ssc(1630)]
  sup.push(L(m1b, m1t, s++, 2), L(m2b, m2t, s++, 2))
  fine.push(L(m1t, [690, deckY(690)], s++, 0), L(m2t, [SX1, deckY(SX1)], s++, 0), pp(`M${m1t[0]} ${m1t[1]} Q${(m1t[0] + m2t[0]) / 2} ${m1t[1] + 30} ${m2t[0]} ${m2t[1]}`))
  const hullPoly: P[] = []
  for (let x = 690; x <= SX1; x += 50) hullPoly.push([x, deckY(x)])
  hullPoly.push([1726, 380], [1672, wlY(1672)])
  for (let x = 1672; x >= 745; x -= 50) hullPoly.push([x, wlY(x)])
  const tierPolys: P[][] = TIERS.map(([xa, xb], n) => {
    const o: P[] = []
    for (let x = xa; x <= xb; x += 40) o.push([x, tierTop(x, n + 1)])
    for (let x = xb; x >= xa; x -= 40) o.push([x, tierTop(x, n)])
    return o
  })
  return { hull, sup, fine, funnels, hullPoly, tierPolys, m1t, m2t }
})()

function b2ShipMask(g: Ctx) {
  fillPoly(g, B2G.hullPoly, '#555')
  const boot: P[] = []
  for (let x = 722; x <= 1700; x += 50) boot.push([x, lerp(deckY(x), wlY(x), 0.66)])
  for (let x = 1672; x >= 745; x -= 50) boot.push([x, wlY(x)])
  fillPoly(g, boot, '#1e1e1e')
  B2G.tierPolys.forEach((p, i) => fillPoly(g, p, ['#a0a0a0', '#b8b8b8', '#d0d0d0'][i]))
  for (const f of B2G.funnels) fillPoly(g, f, '#e8e8e8')
  const st = (w: number, c: string): PenStyle => ({ color: c, width: w, nib: false, wobble: 0.5 })
  penDraw(g, B2G.fine, 1, st(3, '#eee'))
  penDraw(g, B2G.sup, 1, st(5, '#fff'))
  penDraw(g, B2G.hull, 1, st(7, '#fff'))
}

const pierY = (x: number) => 505 + (x + 40) * 0.085
const PIER: P[] = [[-80, pierY(-80)], [2000, pierY(2000)], [2000, 900], [-80, 900]]
const B2PIER = (() => {
  let s = 2600
  const edge: Poly[] = [L([-40, pierY(-40)], [1960, pierY(1960)], s++, 0), L([-40, pierY(-40) + 26], [1960, pierY(1960) + 30], s++, 0)]
  const props: Poly[] = []
  for (const x of [700, 1240, 1640]) {
    const y = pierY(x) + 8, r = 17
    props.push(ell(x, y - 24, r, r * 0.42, s++), L([x - r, y - 24], [x - r * 0.8, y], s++, 1), L([x + r, y - 24], [x + r * 0.8, y], s++, 1), ell(x, y - 29, r * 1.3, r * 0.48, s++))
  }
  props.push(pp(`M700 ${pierY(700) - 18} C740 ${pierY(700) + 10} 790 ${pierY(790) + 2} 830 ${pierY(830) + 10} S900 ${pierY(900) + 60} 950 ${pierY(950) + 80}`))
  props.push(pp(`M1240 ${pierY(1240) - 20} C1290 ${pierY(1240) - 10} 1320 ${pierY(1320) + 30} 1370 ${pierY(1370) + 70}`))
  for (let k = 0; k < 4; k++) props.push(ell(560, pierY(560) + 18, 30 - k * 5, 9 - k * 1.3, s++, 0.15))
  props.push(L([180, pierY(180) - 4], [184, 250], s++, 1), ...box(164, 222, 30, 30, s++, 1), L([160, 222], [179, 204], s++, 0), L([179, 204], [198, 222], s++, 0))
  props.push(...box(1440, pierY(1440) - 74, 88, 66, s++, 2), L([1440, pierY(1440) - 74], [1468, pierY(1440) - 92], s++, 1), L([1528, pierY(1440) - 74], [1556, pierY(1440) - 92], s++, 1), L([1468, pierY(1440) - 92], [1556, pierY(1440) - 92], s++, 1), L([1556, pierY(1440) - 92], [1556, pierY(1440) - 26], s++, 1))
  const planks: Poly[] = []
  for (let k = 0; k < 34; k++) {
    const x = -40 + k * 62
    planks.push(L([x, pierY(x) + 26], [x - 160, 900], s++, 0))
  }
  return { edge, props, planks }
})()

const CROWD: Person[] = [
  { x: 640, y: pierY(640) - 44, h: 96, kind: 1, hat: 2, seed: 2 },
  { x: 676, y: pierY(676) - 52, h: 92, kind: 0, hat: 1, seed: 12 },
  { x: 612, y: pierY(612) - 12, h: 124, kind: 0, hat: 1, seed: 1 },
  { x: 700, y: pierY(700) - 4, h: 132, kind: 0, hat: 4, seed: 3 },
  { x: 752, y: pierY(752) - 30, h: 106, kind: 2, hat: 2, seed: 4 },
  { x: 1004, y: pierY(1004) - 50, h: 90, kind: 1, hat: 3, seed: 6 },
  { x: 1040, y: pierY(1040) - 16, h: 114, kind: 0, hat: 0, seed: 7 },
  { x: 1076, y: pierY(1076) - 36, h: 100, kind: 2, hat: 2, seed: 8 },
  { x: 1330, y: pierY(1330) - 40, h: 96, kind: 1, hat: 2, seed: 10 },
  { x: 1362, y: pierY(1362) - 10, h: 118, kind: 0, hat: 4, seed: 11 },
]

function amahPoly(x: number, y: number, h: number): P[] {
  const s = h / 100
  return ([
    [-5, -82], [-13, -78], [-17, -62], [-19, -40], [-17, -37], [-10, -36], [-11, -2], [-3, 0], [-1, -34], [2, -34],
    [4, 0], [11, -2], [11, -36], [17, -38], [20, -52], [31, -40], [34, -37], [29, -36], [16, -60], [13, -78], [5, -82],
  ] as P[]).map(([u, v]) => [x + u * s, y + v * s])
}

function b2Far() {
  return lay('b2far', (g) => {
    const st: PenStyle = { color: C.lineNight, width: 1.1, alpha: 0.45, nib: false }
    const y0 = 404
    const polys: Poly[] = [L([-40, y0], [1960, y0 - 10], 3, 0)]
    const blocks: [number, number, number][] = [[20, 60, 70], [92, 50, 90], [150, 70, 64], [228, 46, 100], [282, 80, 76], [370, 54, 120], [430, 66, 84], [504, 40, 62], [552, 70, 52]]
    blocks.forEach(([x, w, h], i) => {
      polys.push(...box(x, y0 - h, w, h, 40 + i * 4, 1))
      for (let r = 0; r < Math.floor(h / 16); r++) for (let c = 0; c < Math.floor(w / 12); c++) if (rand(r * 9 + c, i) < 0.35) polys.push(L([x + 5 + c * 12, y0 - h + 8 + r * 16], [x + 5 + c * 12, y0 - h + 14 + r * 16], 200 + i * 50 + r * 7 + c, 0))
    })
    polys.push(pp('M232 304 C232 270 278 270 278 304'), L([255, 272], [255, 258], 9, 0))
    polys.push(...box(388, 236, 26, 48, 11, 1), flat([[384, 236], [401, 200], [418, 236]]), ell(401, 256, 7, 7, 12))
    penDraw(g, polys, 1, st)
    // a few lit windows on the Bund (tiny warm points)
    for (let i = 0; i < 14; i++) {
      const x = 30 + rand(i, 5) * 560, y = 300 + rand(i, 6) * 90
      g.fillStyle = `rgba(243,210,150,${0.25 + rand(i, 7) * 0.35})`
      g.fillRect(x, y, 3, 4)
    }
    penDraw(g, [pp('M1760 404 Q1800 412 1840 402'), flat([[1782, 402], [1786, 340], [1822, 352], [1816, 402]])], 1, { ...st, alpha: 0.35 })
  })
}

function drawB2(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 6, lift: 0.32 })
  const lt = t - 49.017
  const k = ease.inOutSine(prog(t, 49.017, 55))
  const ox = 900, oy = 360
  // dusk sky, the moon rising over the far bank, the Bund in faint chalk
  ctx.save()
  cam(ctx, 1.02, lerp(20, -10, k), 0, ox, oy)
  moon(ctx, 420, 190, 30, { t, glow: 0.8, alpha: prog(t, 49.0, 50.2) })
  reveal(ctx, b2Far(), prog(t, 49.1, 50.8), 0.0)
  ctx.restore()
  // the Huangpu: a river of words, the moon's light column on it
  textPlane(ctx, { y0: 400, y1: H + 40, rows: 22, t, light: 0.75, lightX: 430 + lerp(20, -10, k), speed: 0.5, alpha: 0.85, seed: 5 })
  // the ship (made of words) pulls away to the left
  ctx.save()
  const sk = ease.inOutSine(prog(t, 49.0, 56))
  cam(ctx, lerp(1.17, 1.07, sk), lerp(-40, -230, sk), lerp(4, -6, sk), 1150, 420)
  // smoke: characters drifting aft and up from the funnels
  const A = atlas(CORPUS, '#aeb8cf')
  const cs = chars(CORPUS)
  B2G.funnels.forEach((f, i) => {
    const top: P = [(f[1][0] + f[2][0]) / 2, (f[1][1] + f[2][1]) / 2]
    for (let j = 0; j < 7; j++) {
      const age = lt + j * 0.9 + i * 0.4
      glyphsAlong(ctx, A, cs, smokeTrail(top[0], top[1], i * 10 + j, age), 13, (f2) => 10 + f2 * 14, (f2) => 0.55 * (1 - f2) * clamp(f2 * 8), i * 10 + j)
    }
  })
  textImage(ctx, { key: 'b2ship', draw: b2ShipMask, cell: 8, emerge: prog(t, 49.1, 51.6), order: 'sweepX', t, scatter: 50, gamma: 1.05, color: '#e8edf7', alpha: 1, seed: 4, sizeByValue: true })
  penDraw(ctx, B2G.hull, prog(t, 49.3, 51.0), chalk({ width: 1.3, t, alpha: 0.5 }))
  // the mother at the aft rail: silhouette, cloche hat, a gloved hand on the rail
  const mx0 = 1556
  const mum: Person = { x: mx0, y: deckY(mx0) - 2, h: 62, kind: 1, hat: 2, seed: 77 }
  silhouette(ctx, mum, prog(t, 50.4, 51.6), 0.95 * prog(t, 50.6, 51.6), t, 0.9)
  penStroke(ctx, [mx0 - 30, deckY(mx0 - 30) - 16, mx0 + 34, deckY(mx0 + 34) - 16], prog(t, 50.6, 51.2), chalk({ width: 1.6, t }))
  glowAt(ctx, mx0, deckY(mx0) - 40, 70, 'rgba(243,217,164,ALPHA)', 0.12 * prog(t, 51, 52))
  ctx.restore()
  // the pier (near layer): dark planking over the river, chalk traces, crowd silhouettes
  ctx.save()
  cam(ctx, lerp(1.0, 1.04, k), lerp(-20, 30, k), 0, ox, oy)
  ctx.save()
  clipIn(ctx, PIER)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  nightPaper(ctx, t, { seed: 6, lift: 0.18 })
  ctx.fillStyle = 'rgba(8,10,18,0.3)'
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  penDraw(ctx, B2PIER.planks, prog(t, 49.3, 50.8), chalk({ width: 0.8, t, alpha: 0.22, boil: 0 }))
  penDraw(ctx, B2PIER.edge, prog(t, 49.1, 50.2), chalk({ width: 1.8, t, alpha: 0.85 }))
  penDraw(ctx, B2PIER.props, prog(t, 49.6, 51.6), chalk({ width: 1.3, t, alpha: 0.75 }))
  CROWD.forEach((p, i) => silhouette(ctx, { ...p, x: p.x + Math.sin(t * 1.4 + i * 1.7) * 1.2 }, prog(t, 49.6 + i * 0.08, 50.8 + i * 0.08), 0.9 * prog(t, 49.9 + i * 0.08, 51 + i * 0.08), t, 0.6))
  const wv = Math.sin(t * 7) * 6
  const hb = CROWD[3]
  penStroke(ctx, [hb.x + 12, hb.y - hb.h * 0.74, hb.x + 18, hb.y - hb.h * 0.98, hb.x + 22 + wv * 0.4, hb.y - hb.h * 1.18], prog(t, 51, 51.6), chalk({ width: 1.8, t }))
  penStroke(ctx, [hb.x + 22 + wv * 0.4, hb.y - hb.h * 1.18, hb.x + 36 + wv, hb.y - hb.h * 1.22, hb.x + 42 + wv, hb.y - hb.h * 1.1], prog(t, 51.2, 51.8), chalk({ width: 1.2, t }))
  const pa = CROWD[4]
  penDraw(ctx, [pp(`M${pa.x - 30} ${pa.y - pa.h * 1.05} Q${pa.x} ${pa.y - pa.h * 1.32} ${pa.x + 30} ${pa.y - pa.h * 1.05}`), [pa.x, pa.y - pa.h * 1.2, pa.x + 4, pa.y - pa.h * 0.62]], prog(t, 50.6, 51.6), chalk({ width: 1.2, t, alpha: 0.7 }))
  ctx.restore()
  // foreground: the amah and the four-year-old, holding hands
  ctx.save()
  cam(ctx, lerp(1.0, 1.06, k), lerp(-40, 50, k), 0, ox, oy)
  const ax = 300, ay = 640, ah = 270
  const am = amahPoly(ax, ay, ah)
  ctx.save()
  ctx.globalAlpha = 0.95 * prog(t, 50.0, 51.0)
  fillPoly(ctx, am, 'rgb(8,11,20)')
  ctx.beginPath()
  ctx.ellipse(ax, ay - ah * 0.885, ah * 0.062, ah * 0.075, 0, 0, TAU)
  ctx.ellipse(ax + ah * 0.01, ay - ah * 0.94, ah * 0.035, ah * 0.03, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
  penDraw(ctx, [flat(am.slice(12).concat([am[0]])), ell(ax, ay - ah * 0.885, ah * 0.062, ah * 0.075, 12)], prog(t, 49.5, 50.8), chalk({ width: 1.6, t, alpha: 0.8 }))
  eileen(ctx, 'child', { x: 400, y: 620, h: 132, progress: prog(t, 49.7, 51.2), fill: prog(t, 50.5, 51.5), t, color: C.lineNight })
  ctx.restore()
  bottomShade(ctx, 0.35)
  yearMark(ctx, t, { text: '1924', x: 640, y: 150, t0: 49.46, t1: 54.0, size: 92, color: 'rgba(234,228,214,1)' })
}

function smokeTrail(x0: number, y0: number, i: number, age: number): Poly {
  const out: number[] = []
  const len = Math.min(560, 40 + age * 80)
  const ph = rand(i, 3) * TAU
  for (let s = 0; s <= len; s += 6) {
    const k = s / 560
    const curl = 6 + s * 0.06
    out.push(x0 + s * 0.9 + age * 6 + Math.cos(s * 0.05 + ph + age) * curl, y0 - s * 0.3 - k * k * 40 + Math.sin(s * 0.05 + ph + age) * curl * 0.7)
  }
  return out
}

// ═════════════════════════════ B3 · the opium couch ═════════════════════════════

const p3 = proj(600, 300, 760)
const R3 = { xl: -3.2, xr: 3.0, fl: 1.35, ce: -2.4, zb: 8.5 }
const L3 = (a: V3, b: V3, seed: number, over = 2) => L(p3(...a), p3(...b), seed, over)
const C3 = (pts: V3[]) => flat(pts.map((q) => p3(...q)))
const Q3 = (pts: V3[]): P[] => pts.map((q) => p3(...q))
const LAMP: P = p3(2.5, 0.62, 4.25)
const DOOR3: P[] = [p3(-1.7, -0.95, R3.zb), p3(-0.6, -0.95, R3.zb), p3(-0.6, R3.fl, R3.zb), p3(-1.7, R3.fl, R3.zb)]

const B3G = (() => {
  let s = 3000
  const { xl, xr, fl: F, ce, zb } = R3
  const room: Poly[] = []
  const fine: Poly[] = []
  const couch: Poly[] = []
  room.push(L3([xl, ce, zb], [xr, ce, zb], s++, 4), L3([xl, F, zb], [xr, F, zb], s++, 4), L3([xl, ce, zb], [xl, F, zb], s++, 3), L3([xr, ce, zb], [xr, F, zb], s++, 3))
  for (const [x, y] of [[xl, ce], [xl, F], [xr, F], [xr, ce]] as P[]) room.push(L3([x, y, zb], [x, y, 1.2], s++, 0))
  for (const x of [-1.6, 0, 1.6]) fine.push(L3([x, ce, 1.2], [x, ce, zb], s++, 0))
  for (let x = xl; x <= xr + 0.01; x += 0.62) fine.push(L3([x, F, 1.3], [x, F, zb], s++, 0))
  for (let z = 1.6; z < zb; z += 0.62) fine.push(L3([xl, F, z], [xr, F, z], s++, 0))
  for (const y of [0.3, 1.2]) fine.push(L3([xl, y, zb], [xr, y, zb], s++, 0), L3([xl, y, zb], [xl, y, 1.3], s++, 0), L3([xr, y, zb], [xr, y, 1.4], s++, 0))
  room.push(flat([DOOR3[3], DOOR3[0], DOOR3[1], DOOR3[2]]))
  room.push(C3([[-1.82, F, zb], [-1.82, -1.08, zb], [-0.48, -1.08, zb], [-0.48, F, zb]]))
  room.push(C3([[-0.6, -0.95, zb], [-0.2, -0.95, zb + 0.9], [-0.2, F, zb + 0.9], [-0.6, F, zb]]))
  // scroll painting, clock
  fine.push(C3([[-0.2, -1.7, zb], [0.5, -1.7, zb], [0.5, 0.25, zb], [-0.2, 0.25, zb], [-0.2, -1.7, zb]]))
  { const [cx, cy] = p3(-2.5, -1.3, zb)
    fine.push(ell(cx, cy, 18, 18, s++), ...box(cx - 14, cy + 18, 28, 60, s++, 1), L([cx, cy], [cx + 8, cy - 9], s++, 0), L([cx, cy], [cx - 3, cy + 11], s++, 0)) }
  // window with curtains on the back wall
  const wx0 = 1.25, wx1 = 2.55, wy0 = -1.75, wy1 = -0.2
  room.push(C3([[wx0, wy0, zb], [wx1, wy0, zb], [wx1, wy1, zb], [wx0, wy1, zb], [wx0, wy0, zb]]))
  for (let k = 1; k < 9; k++) fine.push(L3([wx0, lerp(wy0, wy1, k / 9), zb], [wx1, lerp(wy0, wy1, k / 9), zb], s++, 0))
  for (let k = 0; k < 5; k++) {
    fine.push(C3([[wx0 - 0.45 + k * 0.08, -1.98, zb], [wx0 - 0.4 + k * 0.09, -0.6, zb], [wx0 - 0.5 + k * 0.1, 0.5, zb], [wx0 - 0.48 + k * 0.11, 1.33, zb]]))
    fine.push(C3([[wx1 + 0.35 - k * 0.07, -1.98, zb], [wx1 + 0.3 - k * 0.08, -0.6, zb], [wx1 + 0.4 - k * 0.09, 0.5, zb], [wx1 + 0.38 - k * 0.1, 1.33, zb]]))
  }
  // curio cabinet with porcelain (left wall)
  const cz0 = 4.6, cz1 = 6.6, cxF = xl + 0.45
  fine.push(C3([[xl, F, cz0], [cxF, F, cz0], [cxF, -1.35, cz0], [xl, -1.35, cz0]]), C3([[cxF, -1.35, cz0], [cxF, -1.35, cz1]]), L3([cxF, -1.35, cz1], [cxF, F, cz1], s++, 0))
  for (const y of [-0.75, -0.15, 0.45]) fine.push(L3([cxF, y, cz0], [cxF, y, cz1], s++, 0))
  for (let k = 0; k < 6; k++) {
    const z = lerp(cz0 + 0.25, cz1 - 0.2, rand(k, 4)), y = [-0.75, -0.15, 0.45][k % 3]
    const [vx, vy] = p3(cxF - 0.15, y, z)
    const sc = 760 / z
    fine.push(pp(`M${vx - 0.06 * sc} ${vy} C${vx - 0.1 * sc} ${vy - 0.15 * sc} ${vx - 0.03 * sc} ${vy - 0.22 * sc} ${vx - 0.03 * sc} ${vy - 0.3 * sc} L${vx + 0.03 * sc} ${vy - 0.3 * sc} C${vx + 0.03 * sc} ${vy - 0.22 * sc} ${vx + 0.1 * sc} ${vy - 0.15 * sc} ${vx + 0.06 * sc} ${vy}`))
  }
  // the 烟榻
  const X0 = 1.9, X1 = xr, Z0 = 2.9, Z1 = 5.3, T = 0.85
  couch.push(C3([[X0, T, Z0], [X1, T, Z0]]), C3([[X0, T, Z0], [X0, T, Z1]]), C3([[X0, T, Z0], [X0, T + 0.3, Z0], [X1, T + 0.3, Z0]]), C3([[X0, T + 0.3, Z0], [X0, T + 0.3, Z1]]))
  for (const [z, x] of [[Z0, X0], [Z1, X0]] as P[]) {
    const [fx, fy] = p3(x + 0.04, T + 0.3, z), [gx, gy] = p3(x + 0.04, F, z)
    couch.push(pp(`M${fx} ${fy} L${gx} ${gy - 8} Q${gx + 2} ${gy} ${gx + 12} ${gy}`))
  }
  couch.push(C3([[X1 - 0.02, T, Z0 + 0.05], [X1 - 0.02, 0.15, Z0 + 0.05], [X1 - 0.02, 0.15, Z1], [X1 - 0.02, T, Z1]]))
  for (let k = 0; k <= 16; k++) {
    const z = lerp(Z0 + 0.12, Z1 - 0.08, k / 16)
    fine.push(L3([X1 - 0.02, 0.28, z], [X1 - 0.02, T - 0.03, z], s++, 0))
    if (k < 16 && k % 2 === 0) {
      const z2 = lerp(Z0 + 0.12, Z1 - 0.08, (k + 1) / 16)
      couch.push(C3([[X1 - 0.02, 0.5, z], [X1 - 0.02, 0.38, (z + z2) / 2], [X1 - 0.02, 0.5, z2], [X1 - 0.02, 0.62, (z + z2) / 2], [X1 - 0.02, 0.5, z]]))
    }
  }
  for (const z of [Z0 + 0.03, Z1]) couch.push(C3([[X0 + 0.05, T, z], [X0 + 0.05, 0.42, z], [X0 + 0.25, 0.32, z], [X1 - 0.05, 0.3, z], [X1 - 0.05, T, z]]))
  for (let k = 0; k < 9; k++) {
    const z = lerp(Z0 + 0.15, Z1 - 0.15, (k + 0.5) / 9)
    const [a, b] = p3(X0, T + 0.24, z - 0.1), [c, d] = p3(X0, T + 0.24, z + 0.1), [e, f] = p3(X0, T + 0.13, z)
    couch.push(pp(`M${a} ${b} Q${e} ${f} ${c} ${d}`))
  }
  const tz0 = 3.85, tz1 = 4.6, tx0 = 2.15, tx1 = 2.8, TT = 0.62
  couch.push(C3([[tx0, TT, tz0], [tx1, TT, tz0], [tx1, TT, tz1], [tx0, TT, tz1], [tx0, TT, tz0]]), C3([[tx0, TT, tz0], [tx0, T, tz0]]), C3([[tx0, TT, tz1], [tx0, T, tz1]]))
  const lamp: Poly[] = [ell(LAMP[0] + 6, LAMP[1] + 2, 44, 9, s++), ell(LAMP[0], LAMP[1], 12, 4, s++), pp(`M${LAMP[0] - 10} ${LAMP[1]} C${LAMP[0] - 15} ${LAMP[1] - 16} ${LAMP[0] - 6} ${LAMP[1] - 20} ${LAMP[0] - 7} ${LAMP[1] - 34} L${LAMP[0] + 7} ${LAMP[1] - 34} C${LAMP[0] + 6} ${LAMP[1] - 20} ${LAMP[0] + 15} ${LAMP[1] - 16} ${LAMP[0] + 10} ${LAMP[1]}`)]
  { const [bx, by] = p3(2.3, TT, 4.45), [cx, cy] = p3(2.65, TT, 4.0)
    lamp.push(ell(bx, by - 6, 7, 3, s++), L([bx - 7, by - 6], [bx - 7, by + 2], s++, 0), L([bx + 7, by - 6], [bx + 7, by + 2], s++, 0), pp(`M${cx - 9} ${cy} Q${cx - 8} ${cy - 12} ${cx} ${cy - 12} Q${cx + 8} ${cy - 12} ${cx + 9} ${cy}`)) }
  const drape: Poly[] = []
  for (let k = 0; k < 9; k++) drape.push(pp(`M${-20 + k * 18} -20 C${-10 + k * 20} 200 ${-40 + k * 22} 420 ${-30 + k * 24} 820`))
  drape.push(pp('M-30 360 C40 380 120 372 196 350'), ell(180, 360, 16, 22, s++))
  const couchFront = Q3([[X0, T, Z0], [X0, T, Z1], [X0, T + 0.3, Z1], [X0, T + 0.3, Z0]])
  const couchTop = Q3([[X0, T, Z0], [X1, T, Z0], [X1, T, Z1], [X0, T, Z1]])
  const couchBack = Q3([[X1 - 0.02, T, Z0], [X1 - 0.02, 0.15, Z0], [X1 - 0.02, 0.15, Z1], [X1 - 0.02, T, Z1]])
  return { room, fine, couch, lamp, drape, couchFront, couchTop, couchBack }
})()

const FATHER_BODY = 'M1106 414 C1136 418 1168 436 1194 456 C1216 472 1238 482 1250 494 C1262 506 1252 520 1234 522 L1150 524 C1126 520 1104 504 1094 484 C1088 462 1090 430 1106 414 Z'
const FATHER_ARM = 'M1112 432 C1100 428 1090 420 1076 408 C1072 404 1078 398 1084 402 C1096 410 1108 416 1122 420'
const FATHER_HEAD: [number, number, number, number] = [1097, 398, 17, 20]

function b3CouchMask(g: Ctx) {
  fillPoly(g, B3G.couchBack, '#6a6a6a')
  fillPoly(g, B3G.couchTop, '#404040')
  fillPoly(g, B3G.couchFront, '#909090')
  penDraw(g, B3G.couch, 1, { color: '#fff', width: 5, nib: false, wobble: 0.5 })
  // light falls off away from the lamp
  g.globalCompositeOperation = 'source-atop'
  const gr = g.createRadialGradient(LAMP[0], LAMP[1], 60, LAMP[0], LAMP[1], 700)
  gr.addColorStop(0, 'rgba(0,0,0,0)')
  gr.addColorStop(1, 'rgba(0,0,0,0.5)')
  g.fillStyle = gr
  g.fillRect(0, 0, W, H)
}

function smokeStrand(x0: number, y0: number, i: number, age: number, ceil: number): Poly {
  const out: number[] = []
  const len = Math.min(1300, age * 150)
  const dir = rand(i, 41) < 0.75 ? -1 : 1
  const ph = rand(i, 42) * TAU
  const H0 = y0 - ceil - rand(i, 43) * 90
  for (let s = 0; s <= len; s += 5) {
    const rise = Math.min(s, H0)
    const spread = Math.max(0, s - H0)
    const sway = Math.sin(s * 0.03 + ph + age * 0.7) * (4 + Math.min(s, H0) * 0.07)
    const curlR = Math.min(34, spread * 0.08)
    out.push(x0 + sway + dir * (spread + age * 6) + Math.cos(s * 0.05 + ph) * curlR, y0 - rise + Math.sin(s * 0.05 + ph) * curlR * 0.8 + Math.sin(spread * 0.007 + ph) * 34 + spread * 0.05)
  }
  return out
}

function b3Traces() {
  return lay('b3traces', (g) => {
    penDraw(g, B3G.fine, 1, { color: C.lineNight, width: 0.8, alpha: 0.28, nib: false, wobble: 0.5 })
    penDraw(g, B3G.room, 1, { color: C.lineNight, width: 1.2, alpha: 0.42, nib: false })
    // the near-left drape (dark) — foreground frame
  })
}

function drawB3(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 8 })
  // the room is dim: deepen the ground away from the lamp
  ctx.save()
  const gd = ctx.createRadialGradient(LAMP[0], LAMP[1], 60, LAMP[0], LAMP[1], 1400)
  gd.addColorStop(0, 'rgba(10,12,20,0)')
  gd.addColorStop(1, 'rgba(6,8,14,0.55)')
  ctx.fillStyle = gd
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  const k = ease.inOutSine(prog(t, 54.265, 60.2))
  ctx.save()
  cam(ctx, lerp(1.28, 1.0, k), lerp(-140, 0, k), lerp(-30, 0, k), LAMP[0], LAMP[1])
  // far doorway: daylight of another room; the child stands in it, small
  ctx.save()
  ctx.globalAlpha = 0.85 * prog(t, 54.6, 56.0)
  const dg = ctx.createLinearGradient(0, DOOR3[0][1], 0, DOOR3[3][1])
  dg.addColorStop(0, 'rgba(226,222,208,0.7)')
  dg.addColorStop(1, 'rgba(240,232,214,0.95)')
  fillPoly(ctx, DOOR3, '#000')
  ctx.fillStyle = dg
  ctx.beginPath()
  pathOf(ctx, DOOR3)
  ctx.fill()
  ctx.restore()
  glowAt(ctx, (DOOR3[0][0] + DOOR3[1][0]) / 2, (DOOR3[0][1] + DOOR3[3][1]) / 2, 200, 'rgba(220,224,236,ALPHA)', 0.18 * prog(t, 54.6, 56))
  const [cxd, cyd] = p3(-1.12, R3.fl, R3.zb)
  eileen(ctx, 'child', { x: cxd, y: cyd, h: 104, progress: prog(t, 55.4, 57.0), fill: prog(t, 56.2, 57.2), t, color: C.ink })
  reveal(ctx, b3Traces(), prog(t, 54.3, 56.2), 0.15, 1)
  // the couch, made of characters lit by the lamp
  textImage(ctx, { key: 'b3couch', draw: b3CouchMask, cell: 8, emerge: prog(t, 54.3, 56.0), order: 'radial', ox: LAMP[0], oy: LAMP[1], t, scatter: 40, gamma: 1.0, color: WARM_TXT, alpha: 1, seed: 6, sizeByValue: true })
  penDraw(ctx, B3G.lamp, prog(t, 54.4, 55.4), chalk({ width: 1.2, t, color: '#e8d8b8', alpha: 0.85 }))
  // the father: a dark silhouette, the lamp's warm rim on his face side; the long pipe
  const [hx, hy, hrx, hry] = FATHER_HEAD
  ctx.save()
  ctx.globalAlpha = 0.96 * prog(t, 54.5, 55.5)
  ctx.fillStyle = 'rgb(8,10,17)'
  ctx.fill(new Path2D(FATHER_BODY))
  ctx.beginPath()
  ctx.ellipse(hx, hy, hrx, hry, -0.3, 0, TAU)
  ctx.fill()
  ctx.restore()
  const warm = chalk({ color: '#e9c88e', t })
  penStroke(ctx, pp('M1084 392 C1084 380 1096 376 1106 380'), prog(t, 54.8, 55.4), { ...warm, width: 1.6, alpha: 0.8 })
  penStroke(ctx, pp('M1094 484 C1088 462 1090 430 1106 414 C1136 418 1168 436 1194 456'), prog(t, 54.6, 55.6), { ...warm, width: 1.4, alpha: 0.55 })
  penStroke(ctx, pp(FATHER_ARM), prog(t, 54.8, 55.6), { ...warm, width: 1.3, alpha: 0.6 })
  penStroke(ctx, [1084, 404, 985, 378], prog(t, 55.0, 55.6), chalk({ width: 3, t, color: '#cfb98f', taperIn: 2, taperOut: 2 }))
  penStroke(ctx, ell(LAMP[0], LAMP[1] - 46, 7, 5, 77), prog(t, 55.3, 55.8), chalk({ width: 1.4, t, color: '#cfb98f' }))
  // lamp flame
  const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3)
  glowAt(ctx, LAMP[0], LAMP[1] - 16, 240, 'rgba(240,180,100,ALPHA)', 0.42 * fl)
  glowAt(ctx, LAMP[0], LAMP[1] - 16, 22, 'rgba(255,230,170,ALPHA)', 0.95 * fl)
  // smoke: 《天才梦》 characters rising from the lamp, curling and spreading under the ceiling toward the far door
  const A = atlas(TIANCAI, '#c4c9d6')
  const cs = chars(TIANCAI)
  const lt = t - 54.265
  for (let i = 0; i < 30; i++) {
    const born = i * 0.2 - 1.2
    const age = lt - born
    if (age <= 0) continue
    const a = 0.6 * clamp(age / 0.6) * (0.65 + 0.35 * rand(i, 5))
    glyphsAlong(ctx, A, cs, smokeStrand(LAMP[0] + (rand(i, 6) - 0.5) * 6, LAMP[1] - 36, i, age, 40), 15, (f) => 9 + f * 16, (f) => a * (0.35 + 0.65 * (1 - f)) * clamp(f * 20), i)
  }
  ctx.restore()
  // foreground drape (fast parallax), dark with a chalk edge
  ctx.save()
  cam(ctx, lerp(1.1, 1.0, k), lerp(-90, 0, k), 0, 0, 400)
  ctx.save()
  ctx.globalAlpha = 0.9
  fillPoly(ctx, [[-40, -20], [150, -20], [180, 300], [200, 360], [160, 820], [-40, 820]], 'rgb(7,9,16)')
  ctx.restore()
  penDraw(ctx, B3G.drape, prog(t, 54.3, 55.5), chalk({ width: 1.2, t, alpha: 0.35 }))
  ctx.restore()
  bottomShade(ctx, 0.35)
  // 《天才梦》 — vertical, on red manuscript grid (verbatim)
  writeVertical(ctx, t, {
    text: '我是一个古怪的女孩，\n从小被目为天才',
    x: 1780, y: 64, size: 38, t0: 55.3, rate: 0.16, perCol: 10, color: 'rgba(232,236,244,0.92)', grid: null,
  })
}

// ═════════════════════════════ B4 · 1937 · the locked room ═════════════════════════════

const VP4: P = [760, 320]
const BW4 = { x0: 420, y0: 70, x1: 1560, y1: 470 }
const WIN = { x0: 1100, y0: 112, x1: 1430, y1: 410 }
const ext4 = (x: number, y: number, k: number): P => [VP4[0] + (x - VP4[0]) * k, VP4[1] + (y - VP4[1]) * k]
const B4_STEP0 = 65.503

/** Moon cycle c (0 = full) at time t: steady before 65.5, then one step per beat (accelerating). */
function lunar(t: number) {
  if (t < B4_STEP0) return { c: 0.03 + (t - 59.768) * 0.003, k: 0, tween: 0 }
  const i0 = beatIndex(B4_STEP0)
  const i = beatIndex(t)
  const k = i - i0 + 1
  const tween = ease.outCubic(clamp((t - beatTime(i)) / 0.16))
  const cAt = (n: number) => 0.05 + n * 0.21 + n * n * 0.012
  return { c: lerp(cAt(k - 1), cAt(k), tween), k, tween }
}

const MATTRESS: P[] = [[30, 560], [520, 548], [600, 618], [10, 650]]
const B4G = (() => {
  let s = 4000
  const room: Poly[] = []
  const win: Poly[] = []
  const fine: Poly[] = []
  const { x0: bx0, y0: by0, x1: bx1, y1: by1 } = BW4
  room.push(L([bx0, by1], [bx1, by1], s++, 6), L([bx0, by0], [bx0, by1], s++, 3), L([bx1, by0], [bx1, by1], s++, 3), L([bx0, by0], [bx1, by0], s++, 4))
  room.push(L([bx0, by1], ext4(bx0, by1, 3.2), s++), L([bx1, by1], ext4(bx1, by1, 2.6), s++), L([bx0, by0], ext4(bx0, by0, 3), s++), L([bx1, by0], ext4(bx1, by0, 2.6), s++))
  for (let k = 0; k <= 19; k++) {
    const xb = lerp(bx0, bx1, k / 19)
    fine.push(L([xb, by1], ext4(xb, by1, 3.4), s++, 0))
  }
  fine.push(L([bx0, by1 - 16], [bx1, by1 - 16], s++, 0))
  // the locked door: panels, hasp and padlock
  const dx0 = 480, dx1 = 650, dy0 = 196
  room.push(...box(dx0, dy0, dx1 - dx0, by1 - dy0, s++, 3))
  for (const [a, b] of [[dy0 + 20, dy0 + 120], [dy0 + 140, by1 - 20]] as P[]) for (const [c, d] of [[dx0 + 16, (dx0 + dx1) / 2 - 8], [(dx0 + dx1) / 2 + 8, dx1 - 16]] as P[]) fine.push(...box(c, a, d - c, b - a, s++, 0))
  const lkx = dx1 - 18, lky = 330
  room.push(...box(lkx - 30, lky - 5, 42, 10, s++, 1), pp(`M${lkx - 6} ${lky + 8} q0 -14 9 -14 q9 0 9 14`), ...box(lkx - 9, lky + 8, 24, 22, s++, 1))
  room.push(L([600, by0 - 30], [602, 150], s++, 0), pp('M588 150 C584 170 620 170 616 150 Z'), ell(602, 164, 12, 15, s++))
  // window: reveal, frame, sill, bars, 步步锦 lattice
  const { x0, y0, x1, y1 } = WIN
  win.push(...box(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40, s++, 3), ...box(x0, y0, x1 - x0, y1 - y0, s++, 2))
  win.push(L([x0 - 36, y1 + 20], [x1 + 36, y1 + 20], s++, 2), L([x0 - 32, y1 + 32], [x1 + 32, y1 + 32], s++, 2))
  win.push(L([(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], s++, 1))
  const bars: Poly[] = []
  for (let k = 1; k < 8; k++) bars.push(L([lerp(x0, x1, k / 8), y0 - 6], [lerp(x0, x1, k / 8), y1 + 6], s++, 1))
  for (const [a, b] of [[x0, (x0 + x1) / 2], [(x0 + x1) / 2, x1]]) {
    for (let r = 0; r < 3; r++) {
      const ya = lerp(y0, y1, r / 3), yb = lerp(y0, y1, (r + 1) / 3)
      fine.push(L([a, yb], [b, yb], s++, 0))
      const ix = 16, iy = 15
      fine.push(...box(a + ix, ya + iy, b - a - 2 * ix, yb - ya - 2 * iy, s++, 0))
      fine.push(L([a, (ya + yb) / 2], [a + ix, (ya + yb) / 2], s++, 0), L([b - ix, (ya + yb) / 2], [b, (ya + yb) / 2], s++, 0))
      fine.push(L([(a + b) / 2, ya], [(a + b) / 2, ya + iy], s++, 0), L([(a + b) / 2, yb - iy], [(a + b) / 2, yb], s++, 0))
    }
  }
  // peeling plaster, cracks, water stains under the sill
  const peel: Poly[] = []
  const patches: [number, number, number, number][] = [[800, 104, 64, 26], [1510, 330, 34, 60], [740, 440, 38, 16]]
  patches.forEach(([x, y, rx, ry], i) => {
    const pts = jag(x, y, rx, ry, 50 + i)
    peel.push(flat([...pts, pts[0]]))
    for (let r = 0; r < 3; r++) peel.push(L([x - rx * 0.4, y - ry * 0.4 + r * ry * 0.4], [x + rx * 0.4, y - ry * 0.4 + r * ry * 0.4], s++, 0))
  })
  peel.push(pp('M1040 70 C1036 110 1050 140 1042 180 S1030 240 1044 270'), pp('M250 230 C270 250 264 290 288 310 S300 350 320 360'))
  for (let k = 0; k < 9; k++) {
    const x = x0 + 20 + k * 36 + rand(k, 1) * 10
    peel.push(pp(`M${x} ${y1 + 34} C${x - 3} ${y1 + 50} ${x + 4} ${y1 + 62} ${x} ${y1 + 52 + rand(k, 2) * 30}`))
  }
  const bed: Poly[] = []
  bed.push(flat([...MATTRESS, MATTRESS[0]]))
  bed.push(pp('M24 578 C110 560 190 572 270 560 C330 590 410 566 470 576 C520 590 560 584 590 606'))
  bed.push(pp('M44 556 C48 536 110 528 150 540 C160 556 110 566 44 556 Z'))
  for (let k = 0; k < 7; k++) bed.push(pp(`M${70 + k * 70} ${600 + rand(k, 1) * 16} q${20 + rand(k, 2) * 20} -10 ${44 + rand(k, 3) * 20} 2`))
  bed.push(ell(1010, 548, 26, 7, s++), pp('M984 548 Q988 566 1010 568 Q1032 566 1036 548'))
  bed.push(...box(1130, 520, 70, 14, s++, 1), ...box(1136, 506, 62, 14, s++, 1))
  bed.push(...box(1380, 486, 92, 10, s++, 1), L([1388, 496], [1382, 560], s++, 0), L([1464, 496], [1470, 560], s++, 0))
  return { room, win, bars, fine, peel, bed }
})()

function b4Traces() {
  return lay('b4traces', (g) => {
    penDraw(g, B4G.fine, 1, { color: C.lineNight, width: 0.8, alpha: 0.35, nib: false, wobble: 0.5 })
    penDraw(g, B4G.peel, 1, { color: C.lineNight, width: 0.9, alpha: 0.4, nib: false })
    const { x0, y0, x1, y1 } = WIN
    hatch(g, [flat([[x0 - 20, y0 - 20], [x1 + 20, y0 - 20], [x1, y0], [x0, y0]]), flat([[x0 - 20, y0 - 20], [x0, y0], [x0, y1], [x0 - 20, y1 + 20]])], { color: C.lineNight, width: 0.8, alpha: 0.35, angle: 0.9, gap: 4 })
    hatch(g, [flat(MATTRESS)], { color: C.lineNight, width: 0.7, alpha: 0.2, angle: -0.5, gap: 5 })
  })
}

/** The moonlight patch: a field of 《私语》 characters on the floor, cut by the bar shadows, perspective-squashed. */
function moonPatch(ctx: Ctx, q: P[], Lg: number, t: number) {
  const A = atlas(SIYU, '#eef0f6')
  const cs = chars(SIYU)
  const nu = 30, nv = 12, nb = 8
  for (let j = 0; j < nv; j++) {
    const v = (j + 0.5) / nv
    for (let i = 0; i < nu; i++) {
      const u = (i + 0.5) / nu
      const fb = (u * nb) % 1
      if (fb < 0.1 || fb > 0.9) continue // bar shadow
      const x = lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v)
      const y = lerp(q[0][1], q[3][1], v)
      const edge = Math.min(u, 1 - u, v * 1.4, 1 - v) * 6
      const a = Lg * clamp(edge) * (0.55 + 0.45 * Math.sin(t * 1.3 + i * 0.7 + j * 1.1)) * 0.85
      if (a < 0.02) continue
      ctx.globalAlpha = a
      blitG(ctx, A, cs[(i * 7 + j * 13) % cs.length], x, y, lerp(11, 22, v), 0.6)
    }
  }
  ctx.globalAlpha = 1
}

function b4GirlMask(g: Ctx) {
  eileen(g, 'girlWindow', { x: 830, y: 640, h: 330, color: '#fff', dress: '#9a9a9a', fill: 1, weight: 3, boil: 0 })
}

function drawB4(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 7 })
  const k = ease.inOutSine(prog(t, 59.768, 71.5))
  const L4 = lunar(t)
  const cyc = ((L4.c % 1) + 1) % 1
  const night = Math.floor(L4.c * 3.7)
  const mx = L4.k === 0 ? lerp(WIN.x1 - 100, WIN.x1 - 150, prog(t, 59.768, 65.5)) : lerp(WIN.x1 - 70, WIN.x0 + 70, rand(night, 61) * 0.8 + 0.1)
  const my = L4.k === 0 ? lerp(220, 192, prog(t, 59.768, 65.5)) : 170 + rand(night, 62) * 130
  const illum = 0.5 + 0.5 * Math.cos(cyc * TAU)
  const flick = L4.k > 0 ? 1 - 0.35 * (1 - L4.tween) : 1
  ctx.save()
  cam(ctx, lerp(1.0, 1.09, k), lerp(0, 40, k), lerp(0, 10, k), 760, 420)
  // outside: sky + moon + a bare branch, clipped to the opening
  ctx.save()
  clipIn(ctx, [[WIN.x0, WIN.y0], [WIN.x1, WIN.y0], [WIN.x1, WIN.y1], [WIN.x0, WIN.y1]])
  const sky = ctx.createLinearGradient(0, WIN.y0, 0, WIN.y1)
  sky.addColorStop(0, 'rgba(36,48,80,0.9)')
  sky.addColorStop(1, 'rgba(58,72,104,0.9)')
  ctx.fillStyle = sky
  ctx.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0)
  const mIn = prog(t, 59.9, 61.2)
  ctx.save()
  if (cyc > 0.5) {
    ctx.translate(mx, 0)
    ctx.scale(-1, 1)
    ctx.translate(-mx, 0)
  }
  moon(ctx, mx, my, 44, { alpha: mIn, glow: 0.8 + 0.2 * illum, t, phase: cyc <= 0.5 ? cyc * 2 : (1 - cyc) * 2 })
  ctx.restore()
  penDraw(ctx, [pp('M1440 340 C1380 310 1330 320 1280 290 S1200 262 1150 272'), pp('M1330 314 C1320 290 1300 280 1290 260'), pp('M1220 280 C1210 300 1196 306 1180 318')], prog(t, 60.5, 62), chalk({ width: 1.4, t, alpha: 0.55 }))
  ctx.restore()
  // moonlight: faint beam + the patch on the floor made of 《私语》
  const Lg = (0.3 + 0.7 * illum) * mIn * flick
  const shift = (mx - (WIN.x0 + WIN.x1) / 2) * -0.9
  const q: P[] = [[980 + shift, 500], [1300 + shift, 500], [1000 + shift * 1.4, 690], [540 + shift * 1.4, 690]]
  if (Lg > 0.01) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const bg = ctx.createLinearGradient(WIN.x0, WIN.y0, q[3][0], q[3][1])
    bg.addColorStop(0, `rgba(200,206,226,${0.1 * Lg})`)
    bg.addColorStop(1, `rgba(200,206,226,${0.025 * Lg})`)
    ctx.fillStyle = bg
    ctx.beginPath()
    pathOf(ctx, [[WIN.x0, WIN.y0], [WIN.x1, WIN.y0], q[1], q[2], q[3], [WIN.x0, WIN.y1]])
    ctx.fill()
    ctx.fillStyle = `rgba(200,206,226,${0.07 * Lg})`
    ctx.beginPath()
    pathOf(ctx, q)
    ctx.fill()
    ctx.restore()
    moonPatch(ctx, q, Lg * prog(t, 60.0, 61.6), t)
    glowAt(ctx, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, 460, 'rgba(160,175,210,ALPHA)', 0.16 * Lg)
  }
  reveal(ctx, b4Traces(), prog(t, 60.0, 62.4), 0.25, 1)
  penDraw(ctx, B4G.room, prog(t, 59.8, 61.4), chalk({ width: 1.4, t, alpha: 0.6 }))
  penDraw(ctx, B4G.win, prog(t, 59.9, 61.4), chalk({ width: 1.8, t, alpha: 0.9 }))
  penDraw(ctx, B4G.bars, prog(t, 60.6, 61.8), chalk({ width: 2.6, t }))
  penDraw(ctx, B4G.bed, prog(t, 60.4, 62.2), chalk({ width: 1.2, t, alpha: 0.6 }))
  // 正-tally scratched on the wall beside the window: one stroke per beat once the time-lapse starts
  if (L4.k > 0) {
    const n = Math.min(45, Math.floor(L4.k * 1.6 + L4.k * L4.k * 0.22))
    for (let j = 0; j < n; j++) {
      const g = Math.floor(j / 5), st = j % 5
      const gx = 930 + (g % 5) * 28 + rand(g, 2) * 4 + Math.floor(g / 5) * 6, gy = 318 + Math.floor(g / 5) * 28 + rand(g, 3) * 3
      const sz = 9
      const seg: Poly = st === 0 ? [gx - sz, gy - sz, gx + sz, gy - sz] : st === 1 ? [gx, gy - sz, gx, gy + sz] : st === 2 ? [gx, gy, gx + sz * 0.8, gy] : st === 3 ? [gx - sz * 0.6, gy - 1, gx - sz * 0.6, gy + sz] : [gx - sz * 1.05, gy + sz, gx + sz * 1.05, gy + sz]
      penStroke(ctx, seg, j === n - 1 ? ease.outCubic(L4.tween) : 1, chalk({ width: 1.3, t, alpha: 0.7, taperIn: 3, taperOut: 3, seed: j }))
    }
  }
  // her: made of characters, surfacing in the moonlight; a faint pen contour over it
  textImage(ctx, { key: 'b4girl', draw: b4GirlMask, cell: 7, emerge: prog(t, 60.4, 63.4), order: 'sweepYUp', t, scatter: 60, gamma: 1.6, color: '#e4e9f4', alpha: 0.95 * (0.75 + 0.25 * Lg), seed: 12, corpus: SIYU })
  eileen(ctx, 'girlWindow', { x: 830, y: 640, h: 330, progress: prog(t, 62.0, 64.5), fill: 0, t, color: C.lineNight, alpha: 0.45 })
  ctx.restore()
  bottomShade(ctx, 0.5)
  writeVertical(ctx, t, {
    text: '像月光底下的，\n黑影中现出青白的粉墙，\n片面的，癫狂的。',
    x: 372, y: 64, size: 31, t0: 61.3, rate: 0.13, perCol: 11, color: 'rgba(222,230,244,0.95)', grid: null,
  })
}

// ═════════════════════════════ B5 · 1938 · the escape ═════════════════════════════

const VP5: P = [840, 300]
const F5 = 700
const CAMX = -0.8
const pj = proj(VP5[0], VP5[1], F5, CAMX)
const camZ = (t: number) => {
  const u = Math.max(0, t - 70.798)
  return 0.45 * u + 0.075 * u * u * u
}
const LANE = 2.3, FLOOR = 1.6, ROOF = -4.2
const HER0 = { x: pj(0.1, FLOOR, 3.0)[0], y: pj(0.1, FLOOR, 3.0)[1], h: 330 }

function b5GirlMask(g: Ctx) {
  eileen(g, 'lookBack', { x: HER0.x, y: HER0.y, h: HER0.h, color: '#fff', dress: '#a0a0a0', fill: 1, weight: 3, boil: 0 })
}

function drawB5(ctx: Ctx, t: number) {
  const dawn = prog(t, 70.8, 76.3)
  nightPaper(ctx, t, { seed: 9, lift: lerp(0.25, 0.6, dawn) })
  const cz = camZ(t)
  const fi = Math.floor(t * 24)
  const shake = beatPulse(t, 9) * prog(t, 72.4, 76.3) * 3
  ctx.save()
  ctx.translate((rand(fi, 3) - 0.5) * shake, (rand(fi, 4) - 0.5) * shake)
  glowAt(ctx, VP5[0], VP5[1] - 30, 560, 'rgba(236,222,196,ALPHA)', lerp(0.22, 0.45, dawn))
  moon(ctx, VP5[0] + 90, 140, 28, { alpha: lerp(0.95, 0.6, dawn), glow: 0.6, t })
  const pen = (o: PenStyle = {}) => chalk({ t, ...o })
  const zNear = 0.9
  const strokes: { p: Poly; w: number; a: number }[] = []
  const add = (p: Poly, w: number, a: number) => strokes.push({ p, w, a })
  for (const side of [-1, 1]) {
    add(L(pj(side * LANE, FLOOR, zNear), pj(side * LANE, FLOOR, 60), 500 + side, 0), 1.8, 0.8)
    add(L(pj(side * LANE, ROOF, zNear * 1.4), pj(side * LANE, ROOF, 60), 510 + side, 0), 1.6, 0.7)
    add(L(pj(side * LANE, ROOF + 0.3, zNear * 1.4), pj(side * LANE, ROOF + 0.3, 60), 520 + side, 0), 1, 0.4)
  }
  // walls: 石库门 doorways, barred windows, drainpipes, laundry poles — sparse chalk traces streaming past
  for (const side of [-1, 1]) {
    const X = side * LANE
    const g0 = Math.floor((cz + 1) / 4.2)
    for (let g = g0; g < g0 + 12; g++) {
      const Zw = g * 4.2 + (side > 0 ? 2.1 : 0) - cz
      if (Zw < 0.95 || Zw > 48) continue
      const a = clamp((Zw - 0.95) / 0.8) * clamp(1.3 - Zw / 48) * 0.85
      const id = g * 2 + (side > 0 ? 1 : 0)
      const z0 = Zw, z1 = Zw + 1.4
      const q = (Y: number, Z: number) => pj(X, Y, Z)
      const wq = (w: number) => Math.min(w * 1.2, (w * 20) / Zw)
      add(flat([q(FLOOR, z0), q(-0.9, z0), q(-0.9, z1), q(FLOOR, z1)]), wq(2), a)
      add(flat([q(FLOOR, z0 - 0.2), q(-1.2, z0 - 0.2), q(-1.2, z1 + 0.2), q(FLOOR, z1 + 0.2)]), wq(1.6), a * 0.85)
      if (rand(id, 3) < 0.5) add(flat([q(-1.32, z0 - 0.35), q(-1.95, (z0 + z1) / 2), q(-1.32, z1 + 0.35)]), wq(1.6), a * 0.85)
      else add(flat([q(-1.32, z0 - 0.35), q(-1.62, z0 - 0.1), q(-1.78, (z0 + z1) / 2), q(-1.62, z1 + 0.1), q(-1.32, z1 + 0.35)]), wq(1.6), a * 0.85)
      add(L(q(-1.32, z0 - 0.3), q(-1.32, z1 + 0.3), id + 2, 0), wq(1.2), a * 0.7)
      add(L(q(FLOOR, (z0 + z1) / 2), q(-0.9, (z0 + z1) / 2), id, 0), wq(1.2), a * 0.7)
      if (Zw < 16) for (const dz of [-0.16, 0.16]) {
        const [rx, ry] = q(0.25, (z0 + z1) / 2 + dz)
        const rr = (0.07 * F5) / Zw
        add(ell(rx, ry, rr * 0.55, rr, id + (dz > 0 ? 1 : 0)), wq(0.9), a * 0.6)
      }
      const wz0 = Zw + 2.0, wz1 = Zw + 3.0
      add(flat([q(-2.1, wz0), q(-3.2, wz0), q(-3.2, wz1), q(-2.1, wz1), q(-2.1, wz0)]), wq(1.4), a * 0.7)
      for (let b = 1; b < 5; b++) add(L(q(-2.1, lerp(wz0, wz1, b / 5)), q(-3.2, lerp(wz0, wz1, b / 5)), id * 7 + b, 0), wq(0.9), a * 0.5)
      add(L(q(FLOOR, Zw + 3.6), q(ROOF, Zw + 3.6), id + 9, 0), wq(1.2), a * 0.45)
      if (side < 0 && rand(g, 8) < 0.75) {
        const Zp = Zw + 3.1
        if (Zp > 1.2) {
          const A2 = pj(-LANE, -3.3, Zp), B2 = pj(LANE, -3.0, Zp)
          add(L(A2, B2, id + 11, 0), Math.min(1.8, 34 / Zp), a * 0.7)
          const cxm = lerp(A2[0], B2[0], 0.3 + rand(g, 9) * 0.2), cym = lerp(A2[1], B2[1], 0.35) + 2
          const sz = (F5 / Zp) * 0.32
          add(flat([[cxm - sz, cym], [cxm - sz * 1.3, cym + sz * 0.5], [cxm - sz * 0.8, cym + sz * 0.6], [cxm - sz * 0.8, cym + sz * 1.6], [cxm + sz * 0.8, cym + sz * 1.6], [cxm + sz * 0.8, cym + sz * 0.6], [cxm + sz * 1.3, cym + sz * 0.5], [cxm + sz, cym]]), Math.min(1.3, 26 / Zp), a * 0.6)
        }
      }
    }
  }
  const ZA = 42 - cz * 0.15
  add(flat([pj(-LANE, FLOOR, ZA), pj(-LANE, -2.4, ZA), pj(LANE, -2.4, ZA), pj(LANE, FLOOR, ZA)]), 1.1, 0.55)
  add(flat([pj(-LANE, -2.4, ZA), pj(-LANE, -4.6, ZA), pj(LANE, -4.6, ZA), pj(LANE, -2.4, ZA)]), 1, 0.45)
  const rv = prog(t, 70.8, 72.0)
  strokes.forEach((s, i) => penStroke(ctx, s.p, clamp(rv * 1.6 - (i / strokes.length) * 0.6), pen({ width: s.w, alpha: s.a, seed: i % 97, nib: false })))

  // the stone road: a road of words rushing toward the camera
  const A = atlas(CORPUS, '#dfe5f1')
  const cs = chars(CORPUS)
  const rowGap = 0.34
  const r0 = Math.ceil((cz + zNear) / rowGap)
  for (let r = r0; r < r0 + 120; r++) {
    const Z = r * rowGap - cz
    if (Z > 36) break
    const a = clamp((Z - zNear) / 0.5) * clamp(1.15 - Z / 36) * rv
    const n = 13
    for (let j = 0; j < n; j++) {
      const X = lerp(-LANE + 0.12, LANE - 0.12, (j + 0.5 * (r % 2)) / n)
      const [x, y] = pj(X, FLOOR, Z)
      const low = 1 - 0.75 * clamp((y - 560) / 120)
      ctx.globalAlpha = a * low * (0.3 + 0.4 * rand(r * 31 + j, 5))
      blitG(ctx, A, cs[(r * 7 + j * 3) % cs.length], x, y, Math.min(44, (0.26 * F5) / Z), 0.5)
    }
  }
  ctx.globalAlpha = 1

  // the iron gate she came out of, passing out of frame as the camera follows her
  const gateZ = 1.7 - cz
  if (gateZ > 0.3) {
    const gs: Poly[] = []
    const hx0 = -LANE + 0.1, ang = 1.05
    const at = (d: number, Y: number) => pj(hx0 + Math.sin(ang) * d, Y, 1.7 - Math.cos(ang) * d - cz)
    for (let b = 0; b <= 14; b++) {
      const d = (b / 14) * 1.7
      if (1.7 - Math.cos(ang) * d - cz < 0.3) continue
      gs.push(L(at(d, FLOOR), at(d, -1.1), 600 + b, 0))
    }
    for (const Y of [-1.1, -0.9, 1.3]) {
      const o: number[] = []
      for (let b = 0; b <= 14; b++) {
        const d = (b / 14) * 1.7
        if (1.7 - Math.cos(ang) * d - cz < 0.3) continue
        const p = at(d, Y)
        o.push(p[0], p[1])
      }
      if (o.length >= 4) gs.push(o)
    }
    const a = clamp((gateZ - 0.3) / 0.5)
    penDraw(ctx, gs, 1, pen({ width: 2.2, alpha: 0.8 * a }))
    penDraw(ctx, [L(pj(-LANE - 0.25, FLOOR, gateZ), pj(-LANE - 0.25, -2.4, gateZ), 700, 2), L(pj(-LANE + 0.12, FLOOR, gateZ), pj(-LANE + 0.12, -2.4, gateZ), 701, 2), L(pj(-LANE - 0.35, -2.4, gateZ), pj(-LANE + 0.2, -2.4, gateZ), 702, 2)], 1, pen({ width: 2.6, alpha: a }))
  }

  // her: made of characters, running away down the stone road (back view), bobbing on the beat
  const herZ = lerp(3.0, 4.4, ease.inOutSine(prog(t, 70.8, 75.8)))
  const bob = Math.abs(Math.sin(beatPos5(t) * Math.PI)) * 10
  const [hx, hy] = pj(0.1, FLOOR, herZ)
  const hh = (F5 * 1.62) / herZ * (HER0.h / ((F5 * 1.62) / 3.0))
  const sc = hh / HER0.h
  // a pool of shadow behind her so the figure of words reads against the road of words
  ctx.save()
  const sh = ctx.createRadialGradient(hx, hy - hh * 0.5, 10, hx, hy - hh * 0.5, hh * 0.75)
  sh.addColorStop(0, 'rgba(8,10,18,0.75)')
  sh.addColorStop(1, 'rgba(8,10,18,0)')
  ctx.fillStyle = sh
  ctx.fillRect(hx - hh, hy - hh * 1.3, hh * 2, hh * 1.6)
  ctx.restore()
  for (let j = t > 72 ? 1 : 0; j >= 0; j--) {
    ctx.save()
    ctx.translate(hx - j * 7, hy - bob + j * 10)
    ctx.scale(sc * (1 + j * 0.04), sc * (1 + j * 0.04))
    ctx.translate(-HER0.x, -HER0.y)
    textImage(ctx, { key: 'b5girl', draw: b5GirlMask, cell: 7, emerge: prog(t, 70.9, 72.4), order: 'sweepYUp', t, scatter: 50, gamma: 1.1, color: '#f0f3fa', alpha: j === 0 ? 1 : (0.2 / j) * prog(t, 72, 73), seed: 14, sizeByValue: true })
    ctx.restore()
  }
  eileen(ctx, 'lookBack', { x: hx, y: hy - bob, h: hh, progress: prog(t, 71.6, 73.0), fill: 0.45 * prog(t, 72.0, 73.0), t, color: C.lineNight, alpha: 0.8 })

  // rushing lines from the vanishing point, multiplying toward the downbeat
  const rush = prog(t, 73.2, 76.3)
  const nS = Math.floor(rush * rush * 70) + (t > 75.767 ? 40 : 0)
  for (let i = 0; i < nS; i++) {
    const ang = rand(i, 21) * TAU
    if (Math.sin(ang) < -0.85) continue
    const ph = (t * (1.2 + rand(i, 22)) + rand(i, 23)) % 1
    const r0s = 80 + ph * 900, r1 = r0s + 60 + ph * 300 * (1 + beatPulse(t, 8))
    penStroke(ctx, [VP5[0] + Math.cos(ang) * r0s, VP5[1] + Math.sin(ang) * r0s * 0.7, VP5[0] + Math.cos(ang) * r1, VP5[1] + Math.sin(ang) * r1 * 0.7], 1, pen({ width: 1 + ph * 2, alpha: 0.45 * ph, seed: i, taperIn: 20, taperOut: 20, nib: false }))
  }
  // burst on the downbeat into the chorus: ink streaks and characters flung outward
  const bt = t - 76.324
  if (bt > -0.12) {
    const e = ease.outExpo(clamp((bt + 0.12) / 0.5))
    const bx = hx, by = hy - hh * 0.5
    for (let i = 0; i < 40; i++) {
      const ang = rand(i, 31) * TAU
      const R = (160 + rand(i, 32) * 900) * e
      const x0 = bx + Math.cos(ang) * 40, y0 = by + Math.sin(ang) * 30
      penStroke(ctx, [x0, y0, x0 + Math.cos(ang) * R * 0.6, y0 + Math.sin(ang) * R * 0.45, x0 + Math.cos(ang + 0.08) * R, y0 + Math.sin(ang + 0.08) * R * 0.7], 1, pen({ width: 2 + rand(i, 33) * 3, alpha: 0.8, seed: i, taperIn: 4, taperOut: 40 }))
    }
    for (let i = 0; i < 160; i++) {
      const ang = rand(i, 41) * TAU
      const R = (60 + rand(i, 42) * 1100) * e
      ctx.globalAlpha = (1 - e * 0.6) * (0.4 + 0.5 * rand(i, 43))
      blitG(ctx, A, cs[(i * 11) % cs.length], bx + Math.cos(ang) * R, by + Math.sin(ang) * R * 0.66, 14 + rand(i, 44) * 26)
    }
    ctx.globalAlpha = 1
    glowAt(ctx, bx, by, 600 * e + 50, 'rgba(236,228,214,ALPHA)', 0.5 * (1 - e) + 0.1)
  }
  ctx.restore()
  bottomShade(ctx, 0.45)
  yearMark(ctx, t, { text: '1938', x: 1290, y: 236, t0: 71.0, t1: 75.9, size: 112, color: 'rgba(234,228,214,1)' })
}

const beatPos5 = (t: number) => {
  const i = beatIndex(t)
  return i + (t - beatTime(i)) / (beatTime(i + 1) - beatTime(i))
}

// ═════════════════════════════ scenes ═════════════════════════════

/** perf probe: set >1 temporarily to redraw each frame N times (warm caches) and difference the stills timings */
const REP = 1
const rep = (fn: (ctx: Ctx, t: number) => void) => (ctx: Ctx, t: number) => {
  for (let i = 1; i < REP; i++) {
    ctx.save()
    fn(ctx, t)
    ctx.restore()
  }
  fn(ctx, t)
}
export const scenes: Scene[] = [
  { id: 'B1-mansion-1920', t0: 41.471, t1: 49.017, theme: 'night', trans: { kind: 'ink', dur: 1.2 }, draw: rep(drawB1) },
  { id: 'B2-liner-1924', t0: 49.017, t1: 54.265, theme: 'night', trans: { kind: 'ink', dur: 1.0 }, draw: rep(drawB2) },
  { id: 'B3-opium-couch', t0: 54.265, t1: 59.768, theme: 'night', trans: { kind: 'ink', dur: 1.0 }, draw: rep(drawB3) },
  { id: 'B4-locked-room-1937', t0: 59.768, t1: 70.798, theme: 'night', trans: { kind: 'dissolve', dur: 1.0 }, draw: rep(drawB4) },
  { id: 'B5-escape-1938', t0: 70.798, t1: 76.324, theme: 'night', trans: { kind: 'flash', dur: 0.45 }, draw: rep(drawB5) },
]
