/**
 * Segment F · 211.603–252.331 s · her characters (instrumental climax) · 《对照记》 1994 (hum) · September 1995 (drop).
 *
 *  F1a 211.603  《红玫瑰与白玫瑰》 a rouge rose blooms on the beat, then dries into a smear of mosquito blood on a wall
 *  F1b 216.340  the white rose: moonlight on the floor before a bed (床前明月光) — the rose drawn in the light
 *  F1c 220.566  《半生缘》 曼桢 and 世钧 across a small table under a swinging lamp; he recedes as she stays
 *  F1d 224.258  《更衣记》 empty garments on a pole, one era per beat, older ones receding into the distance
 *  F1e 228.461  《对照记》 time accelerates: clock hands, tear-off calendar years, moon phases, flying 稿纸, streaks
 *  F2a 233.175  the album: deckle-edged photographs laid one per bar, a glassine leaf turning
 *  F2b 239.003  the 1954 portrait, large, the moon behind the print
 *  F3  245.249  an almost empty room in Los Angeles; time stops at the drop (247.83); the room fades to the moon
 */
import { C, FONT, H, W } from '../config'
import { glowAt, moon, nightPaper, oldPaper } from '../lib/ground'
import { TAU, beatIndex, beatPulse, beatTime, clamp, ease, envelope, fract, lerp, prog, rand } from '../lib/math'
import type { Scene } from '../lib/film'
import { hatch, pathPolys, penDraw, penStroke, sketchEllipse, sketchLine, wash, type Poly } from '../lib/pen'
import { writeVertical } from '../lib/type'
import { eileen, type EileenPose } from '../lib/eileen'
import { cached, type Ctx } from '../lib/texture'
import { glyphAtlas, textImage } from '../lib/textmatter'

const ROSE_CORPUS = '娶了红玫瑰久而久之红的变了墙上的一抹蚊子血红玫瑰与白玫瑰'
const MOON_CORPUS = '白的还是床前明月光白玫瑰床前明月光'

// ───────────────────────────── timing (beat grid) ─────────────────────────────
const T = {
  rose: 211.603,
  white: 216.34,
  ban: 220.566,
  yi: 224.258,
  dui: 228.461,
  album: 233.175,
  portrait: 239.003,
  room: 245.249,
  drop: 247.827,
  end: 252.331,
}

// ───────────────────────────── local helpers ─────────────────────────────
const P = (d: string) => pathPolys(d)

/** rotate (about origin) → squash y → scale → translate. */
function xf(polys: Poly[], tx: number, ty: number, s = 1, rot = 0, squash = 1): Poly[] {
  const c = Math.cos(rot), sn = Math.sin(rot)
  return polys.map((p) => {
    const o: Poly = []
    for (let i = 0; i < p.length; i += 2) {
      const x = p[i] * c - p[i + 1] * sn
      const y = (p[i] * sn + p[i + 1] * c) * squash
      o.push(tx + x * s, ty + y * s)
    }
    return o
  })
}

/** Catmull-Rom through points → polyline. */
function cr(pts: number[][], seg = 10): Poly {
  const out: Poly = []
  const n = pts.length
  if (n === 2) return [pts[0][0], pts[0][1], pts[1][0], pts[1][1]]
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)]
    for (let k = i === 0 ? 0 : 1; k <= seg; k++) {
      const u = k / seg, u2 = u * u, u3 = u2 * u
      for (let d = 0; d < 2; d++) out.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3))
    }
  }
  return out
}

/** Closed polygon from points. */
const poly = (...pts: number[][]): Poly => [...pts.flat(), pts[0][0], pts[0][1]]

/** Irregular blob outline. */
function blobPoly(cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.18, n = 44): Poly {
  const o: Poly = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU
    const k = 1 + wob * (Math.sin(a * 2 + seed) * 0.5 + Math.sin(a * 3 + seed * 2.3) * 0.3 + (rand(i % n, seed) - 0.5) * 0.4)
    o.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k)
  }
  return o
}

/** Progress that advances one chunk per beat from t0 over n beats (each chunk snaps in over `snap` s). */
function beatSteps(t: number, t0: number, n: number, snap = 0.3) {
  const i0 = beatIndex(t0 + 0.02)
  const i = beatIndex(t)
  const k = i - i0
  if (k < 0) return 0
  if (k >= n) return 1
  return (k + ease.outCubic(clamp((t - beatTime(i)) / snap))) / n
}

/** Camera: zoom s about (fx, fy), then offset and roll. */
function camera(ctx: Ctx, s: number, fx: number, fy: number, dx = 0, dy = 0, rot = 0) {
  ctx.translate(fx + dx, fy + dy)
  ctx.rotate(rot)
  ctx.scale(s, s)
  ctx.translate(-fx, -fy)
}

type RGB = [number, number, number]
const mixRGB = (a: RGB, b: RGB, k: number) => `rgb(${lerp(a[0], b[0], k) | 0},${lerp(a[1], b[1], k) | 0},${lerp(a[2], b[2], k) | 0})`

/** Small vertical book title at the top-right (screen fixed). */
function bookTitle(ctx: Ctx, t: number, text: string, t0: number, t1: number, night: boolean) {
  const a = envelope(t, t0, t1, 0.25, 0.35)
  if (a <= 0) return
  writeVertical(ctx, t, { text, x: 1800, y: 60, size: 25, t0, rate: 0.04, perCol: 14, color: night ? C.lineNight : C.inkSoft, grid: null, alpha: 0.78 * a })
}

/**
 * Night grading for the memory (paper) shots: the frame sinks into indigo darkness except for warm lamp pools.
 * Pools: x, y, radius, strength (0..1). Drawn with multiply over everything already on the canvas, plus a faint
 * warm screen bloom at each pool's centre.
 */
function darkRoom(ctx: Ctx, pools: { x: number; y: number; r: number; k: number; sy?: number }[], depth = 1) {
  const L = cached('F:darkLayer', W, H, () => undefined)
  const g = L.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.fillStyle = `rgb(${lerp(255, 30, depth) | 0},${lerp(255, 38, depth) | 0},${lerp(255, 66, depth) | 0})`
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'lighter'
  for (const p of pools) {
    g.save()
    g.translate(p.x, p.y); g.scale(1, p.sy ?? 0.72)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, p.r)
    gr.addColorStop(0, `rgba(235,214,184,${p.k})`)
    gr.addColorStop(0.45, `rgba(200,170,140,${p.k * 0.6})`)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
    g.restore()
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(L, 0, 0)
  ctx.restore()
  for (const p of pools) glowAt(ctx, p.x, p.y, p.r * 0.5, 'rgba(255,214,150,ALPHA)', 0.07 * p.k)
}

const ink = (o: Record<string, unknown> = {}) => ({ width: 2.2, color: C.ink, boil: 8, ...o })
const chalk = (o: Record<string, unknown> = {}) => ({ width: 2, color: C.lineNight, boil: 8, ...o })

// ───────────────────────────── F1a · red rose → mosquito blood ─────────────────────────────
const ROSE_HEAD = P([
  'M -6 -10 C -2 -22 18 -18 16 -4 C 14 10 -10 14 -16 0 C -22 -18 4 -34 26 -22 C 44 -10 36 20 10 28 C -18 36 -40 14 -36 -10',
  'M -44 -30 C -30 -58 20 -64 44 -40',
  'M -40 -24 C -70 -20 -84 20 -60 48 C -40 70 0 72 24 60',
  'M 30 -36 C 64 -40 82 -6 72 26 C 64 52 40 66 14 66',
  'M -58 -40 C -100 -36 -118 16 -96 56 C -76 92 -20 104 20 92',
  'M 54 -50 C 100 -52 120 0 104 42 C 92 74 60 92 26 96',
  'M -96 56 C -60 120 60 124 104 42',
  'M -20 -50 C -8 -46 4 -48 12 -54',
  'M -58 -40 C -40 -70 30 -78 54 -50',
].join(' '))
const ROSE_STEM = P([
  'M 4 112 C 14 200 -6 300 -60 430',
  'M 0 108 C -30 116 -52 104 -64 88',
  'M 10 110 C 40 122 62 112 74 96',
  'M -14 250 C -60 230 -110 240 -140 272 C -100 292 -50 288 -14 250',
  'M -14 252 C -60 258 -100 266 -134 271',
  'M 6 190 C 40 160 90 160 122 176 C 90 206 40 210 6 190',
  'M 6 190 C 50 184 90 180 118 177',
  'M -30 350 L -46 344 L -28 336',
].join(' '))
const ROSE_HEAD_REGION = [blobPoly(0, 18, 112, 96, 3, 0.12)]
const ROSE_LEAVES = P('M -14 250 C -60 230 -110 240 -140 272 C -100 292 -50 288 -14 250 Z M 6 190 C 40 160 90 160 122 176 C 90 206 40 210 6 190 Z')
const ROSE_INNER = [blobPoly(-4, 6, 40, 34, 9, 0.15)]
const PETAL = P('M 0 0 C 14 -10 34 -6 38 8 C 30 22 10 22 0 0 Z')

/** Whitewashed plaster wall with a faint old wallpaper lattice (cached, static). */
function plasterWall() {
  return cached('F:wallA', W, H, (g) => {
    hatch(g, [poly([-20, 56], [1348, 58], [1340, 820], [-20, 820])], { angle: 0.8, gap: 46, cross: true, color: 'rgb(120,86,52)', alpha: 0.13, width: 1, wobble: 1.4, seed: 3 })
    hatch(g, [poly([1352, 58], [1940, 18], [1940, 820], [1344, 820])], { angle: 1.52, gap: 7, color: 'rgb(90,60,36)', alpha: 0.12, width: 1, seed: 5 })
    for (let i = 0; i < 90; i++) {
      const x = rand(i, 31) * 1330, y = 70 + rand(i, 32) * 700
      g.fillStyle = `rgba(120,86,52,${0.08 + rand(i, 33) * 0.1})`
      g.beginPath(); g.arc(x, y, 1 + rand(i, 34) * 2.4, 0, TAU); g.fill()
    }
  })
}

function drawRedRose(ctx: Ctx, t: number) {
  oldPaper(ctx, t, { sepia: 0.2 })
  ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * prog(t, 213.5, 214.6); ctx.drawImage(plasterWall(), 0, 0); ctx.restore()
  const rx = 720, ry = 262, rs = 1.35
  const sm: [number, number] = [742, 296] // the smear
  const dry = ease.inOutCubic(prog(t, 213.716, 215.6))
  const push = 0.05 * ease.inOutSine(prog(t, T.rose, 214.2)) + 0.32 * ease.inOutCubic(prog(t, 214.0, 216.6))
  ctx.save()
  camera(ctx, 1 + push + 0.012 * beatPulse(t, 8), sm[0], sm[1], lerp(40, 0, prog(t, T.rose, 216.6)), lerp(10, -30, prog(t, T.rose, 216.6)))

  // the wall: revealed as the rose dries
  const wp = beatSteps(t, 213.716, 3)
  const wst = ink({ width: 1.6, color: C.inkSoft, alpha: 0.75, t })
  penDraw(ctx, [sketchLine(1352, -30, 1342, 700, 11), sketchLine(-40, 40, 1350, 58, 12), sketchLine(1350, 58, 1900, 20, 13)], wp, wst)
  if (wp > 0) {
    wash(ctx, [poly([1480, 140], [1720, 156], [1718, 430], [1482, 418])], 'rgb(252,244,226)', { alpha: 0.5 * wp, blur: 6 })
    penDraw(ctx, [sketchLine(1480, 140, 1720, 156, 21, 2), sketchLine(1482, 418, 1718, 430, 22, 2)], wp, { ...wst, alpha: 0.18, width: 1 })
    penDraw(ctx, P('M 1594 102 L 1602 112 M 1590 110 C 1596 106 1604 108 1606 114'), wp, { ...wst, width: 2.2 })
    penDraw(ctx, P('M 800 336 C 818 366 806 392 830 424 M 812 378 L 848 390 M 640 150 C 652 170 648 186 666 200'), wp, { ...wst, width: 1, alpha: 0.4 })
  }

  // rouge wash: blooms on 212.672, then contracts into the smear and darkens
  const bloom = ease.outCubic(prog(t, 212.672, 213.45))
  if (dry < 1) {
    ctx.save()
    const k = lerp(1, 0.08, dry)
    ctx.translate(sm[0], sm[1]); ctx.scale(k, k); ctx.translate(-sm[0], -sm[1])
    const col = mixRGB([179, 52, 58], [112, 36, 32], dry)
    if (bloom > 0) {
      wash(ctx, xf(ROSE_HEAD_REGION, rx, ry, rs * lerp(0.6, 1, bloom)), col, { alpha: (0.16 + 0.08 * beatPulse(t, 6)) * bloom * (1 + dry * 1.5), blur: 8 })
      wash(ctx, xf([blobPoly(0, 10, 58, 50, 7, 0.2)], rx, ry, rs * bloom), col, { alpha: 0.2 * bloom, blur: 3 })
    }
    // the rose itself is made of her sentence
    textImage(ctx, {
      key: 'F:roseText', corpus: ROSE_CORPUS, cell: 13, color: 'rgb(168,22,34)', emerge: beatSteps(t, T.rose, 3, 0.45), order: 'radial', ox: rx, oy: ry + 20, scatter: 70, t, gamma: 0.7, alpha: 1 - dry * 0.3, seed: 3,
      draw: (g) => {
        g.fillStyle = '#c4c4c4'; fillPoly(g, xf(ROSE_HEAD_REGION, rx, ry, rs)[0]); g.fill()
        penDraw(g, xf(ROSE_HEAD, rx, ry, rs), 1, { width: 5, color: '#fff', boil: 0, wobble: 0.6 })
      },
    })
    ctx.restore()
  }
  // the rose lines, wilting as they fade
  const la = 1 - 0.92 * dry
  if (la > 0.01) {
    const droop = dry * 0.32
    const head = xf(ROSE_HEAD, 0, 0, 1, droop)
    const hp = beatSteps(t, T.rose, 3)
    const sp2 = beatSteps(t, 212.672, 2)
    wash(ctx, xf(ROSE_LEAVES, rx, ry, rs), C.jade, { alpha: 0.4 * sp2 * la, blur: 2 })
    hatch(ctx, xf(xf(ROSE_INNER, 0, 0, 1, droop), rx, ry, rs), { angle: -0.7, gap: 5, progress: hp, color: 'rgb(90,20,24)', alpha: 0.4 * la, width: 1, t, boil: 8 })
    hatch(ctx, xf(xf([blobPoly(10, 70, 90, 26, 4, 0.1)], 0, 0, 1, droop), rx, ry, rs), { angle: 0.4, gap: 6, progress: hp, color: C.ink, alpha: 0.28 * la, width: 1, t, boil: 8 })
    penDraw(ctx, xf(head, rx, ry, rs * (1 - 0.1 * dry)), hp, ink({ width: 1.3, alpha: 0.55 * la, t }))
    penDraw(ctx, xf(ROSE_STEM, rx, ry, rs), sp2, ink({ width: 2.3, alpha: la, t, seed: 4 }))
  }
  // petals letting go as it dries
  for (let k = 0; k < 3; k++) {
    const u = prog(t, 213.9 + k * 0.45, 215.9 + k * 0.4)
    if (u <= 0 || u >= 1) continue
    const px = rx + (k - 1) * 80 + Math.sin(u * 5 + k) * 40, py = ry + 60 + u * 520
    const pa = (1 - u) * 0.9
    const pp = xf(PETAL, px, py, 1.2, u * 4 + k)
    wash(ctx, pp, mixRGB([179, 52, 58], [120, 50, 40], u), { alpha: 0.6 * pa, blur: 1 })
    penDraw(ctx, pp, 1, ink({ width: 1.2, alpha: 0.6 * pa, t }))
  }
  // the smear and the mosquito
  const sp = ease.outCubic(prog(t, 214.6, 215.4))
  if (sp > 0) {
    const smear = cr([[728, 290], [740, 282], [754, 286], [776, 300], [796, 316], [799, 323], [788, 321], [764, 310], [746, 302], [732, 298], [728, 290]], 6)
    wash(ctx, [smear], 'rgb(116,32,28)', { alpha: 0.8 * sp, blur: 1.1 })
    wash(ctx, [blobPoly(741, 291, 9, 7, 4, 0.2)], 'rgb(80,22,20)', { alpha: 0.7 * sp, blur: 0.8 })
    const mq = ink({ width: 0.9, color: 'rgb(40,24,18)', boil: 0, alpha: 0.85, taperIn: 2, taperOut: 3 })
    penDraw(ctx, [[736, 289, 746, 293], [738, 290, 730, 280, 724, 279], [741, 291, 738, 279, 734, 274], [744, 293, 752, 284, 758, 283], [743, 292, 748, 302, 746, 309], [739, 291, 732, 300, 727, 303]], prog(t, 215.0, 215.6), mq)
  }
  ctx.restore()
  // a lamp somewhere above-left: one warm pool on the wall, the rest of the room in indigo
  darkRoom(ctx, [{ x: 720, y: 300, r: lerp(760, 640, prog(t, 214, 216.3)), k: 1 }, { x: 1600, y: 280, r: 360, k: 0.45 * prog(t, 213.7, 214.6) }])
  bookTitle(ctx, t, '《红玫瑰与白玫瑰》', 211.9, 220.4, true)
}

// ───────────────────────────── F1b · white rose · moonlight before the bed ─────────────────────────────
const BED = P([
  'M 1092 362 L 1094 222 M 1470 358 L 1468 218',
  'M 1092 222 C 1200 198 1360 196 1468 218',
  'M 1094 258 C 1200 244 1360 242 1466 256',
  'M 1090 362 L 1470 358 L 1590 500 L 1010 512 Z',
  'M 1010 512 L 1012 546 L 1588 534 L 1590 500',
  'M 1022 546 L 1024 592 M 1578 534 L 1576 582',
  'M 1130 374 C 1180 352 1360 352 1420 370 C 1440 386 1420 402 1400 406 C 1300 414 1200 414 1140 406 C 1116 398 1114 382 1130 374',
  'M 1040 452 C 1200 438 1400 436 1560 448 M 1038 454 C 1030 482 1024 500 1018 514',
].join(' '))
const BED_SPINDLES: Poly[] = Array.from({ length: 7 }, (_, i) => {
  const x = 1140 + i * 46
  return sketchLine(x, 250 - 6 * Math.sin((i / 6) * Math.PI), x + 1, 362, 40 + i, 0)
})

function drawWhiteRose(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { lift: 0.12 })
  const lt = t - T.white
  ctx.save()
  camera(ctx, 1 + 0.07 * ease.inOutSine(prog(t, T.white, 220.7)) + 0.01 * beatPulse(t, 8), 800, 470, lerp(30, -20, prog(t, T.white, 220.7)), 0, -0.012 + 0.012 * prog(t, T.white, 220.7))
  // moon in the window
  const ma = ease.inOutSine(prog(t, T.white, 216.95))
  moon(ctx, 470, 150, 44, { alpha: ma, glow: ma * (0.85 + 0.15 * beatPulse(t, 5)), t })
  // window
  const wp = beatSteps(t, T.white, 1, 0.45)
  const st = chalk({ t, width: 1.5, alpha: 0.8 })
  penDraw(ctx, [sketchLine(250, 70, 562, 66, 1), sketchLine(560, 66, 564, 382, 2), sketchLine(562, 382, 248, 384, 3), sketchLine(250, 384, 252, 70, 4),
    sketchLine(405, 70, 407, 382, 5, 0), sketchLine(252, 214, 562, 210, 6, 0), sketchLine(236, 398, 578, 394, 7, 10)], wp, st)
  // curtain gathered at the window's side
  const folds: Poly[] = []
  for (let k = 0; k < 7; k++) {
    const x0 = 120 + k * 18
    folds.push(cr([[x0, 52], [x0 + 26 - k * 2, 200], [x0 + 70 - k * 6, 296], [x0 - 4 + k * 3, 380], [x0 - 18 + k * 4, 470]]))
  }
  for (let k = 0; k < 4; k++) folds.push(cr([[582 + k * 14, 50], [574 + k * 10, 200], [588 + k * 12, 320], [580 + k * 14, 470]]))
  if (wp > 0) {
    wash(ctx, [poly([110, 52], [250, 52], [196, 296], [250, 470], [96, 470])], 'rgb(150,166,200)', { alpha: 0.18 * wp, blur: 6 })
    hatch(ctx, [poly([110, 52], [250, 52], [196, 296], [250, 470], [96, 470])], { angle: 1.4, gap: 6, progress: wp, color: C.lineNight, alpha: 0.18, width: 1, t, boil: 8 })
  }
  penDraw(ctx, [...folds, sketchLine(90, 50, 660, 44, 9, 4), cr([[150, 300], [196, 290], [236, 300]])], wp, { ...st, width: 1.3, alpha: 0.6 })
  // floor line, floorboards, bed
  const fp = beatSteps(t, 216.851, 1)
  penDraw(ctx, [sketchLine(-40, 474, 1880, 452, 8)], fp, { ...st, width: 1.4, alpha: 0.55 })
  const boards: Poly[] = []
  for (let i = -7; i <= 9; i++) {
    const xf0 = 880 + i * 110, yf = 470 - (xf0 / 1920) * 22
    const k = (700 - yf) / (yf - 160)
    boards.push(sketchLine(xf0, yf, xf0 + (xf0 - 880) * k, 700, 200 + i, 0))
  }
  penDraw(ctx, boards, fp, { ...st, width: 1, alpha: 0.2 })
  // plank joints, staggered
  const joints: Poly[] = []
  for (let i = 0; i < boards.length - 1; i++) {
    const a = boards[i], b = boards[i + 1]
    for (const u of [0.25 + rand(i, 61) * 0.2, 0.62 + rand(i, 62) * 0.25]) {
      const ai = Math.floor(u * (a.length / 2 - 1)) * 2, bi = Math.floor(u * (b.length / 2 - 1)) * 2
      joints.push([a[ai], a[ai + 1], b[bi], b[bi + 1]])
    }
  }
  penDraw(ctx, joints, fp, { ...st, width: 0.9, alpha: 0.16, taperIn: 2, taperOut: 2 })
  // a vanity with an oval mirror (the moon caught in it), a comb, a bottle
  const vp = beatSteps(t, 217.408, 1)
  if (vp > 0) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(1712, 296, 46, 64, 0, 0, TAU); ctx.clip()
    wash(ctx, [blobPoly(1712, 296, 46, 64, 1, 0.01)], 'rgb(120,136,170)', { alpha: 0.3 * vp, blur: 4 })
    moon(ctx, 1694, 270, 9, { alpha: 0.7 * vp * ma, glow: 0.4, t })
    ctx.restore()
    penDraw(ctx, [sketchEllipse(1712, 296, 46, 64, 86, 0.05), sketchEllipse(1712, 296, 54, 72, 87, 0.05), sketchLine(1712, 368, 1712, 392, 88, 0),
      poly([1626, 392], [1794, 392], [1804, 410], [1636, 412]), sketchLine(1636, 412, 1638, 548, 81, 0), sketchLine(1804, 410, 1802, 540, 82, 0), sketchLine(1638, 452, 1802, 448, 83, 0), sketchLine(1720, 412, 1720, 450, 89, 0),
      sketchEllipse(1700, 431, 4, 3, 90), sketchEllipse(1762, 430, 4, 3, 91),
      cr([[1660, 364], [1658, 380], [1664, 392]]), cr([[1676, 364], [1678, 380], [1672, 392]]), sketchEllipse(1668, 362, 8, 3, 85), poly([1744, 386], [1784, 384], [1786, 390], [1746, 392])], vp, { ...st, width: 1.4, alpha: 0.75 })
  }
  const bp = beatSteps(t, 216.851, 3)
  if (bp > 0) {
    hatch(ctx, [poly([1012, 548], [1588, 536], [1640, 600], [980, 608])], { angle: -0.15, gap: 9, progress: bp, color: C.lineNight, alpha: 0.18, width: 1, t, boil: 8 })
    hatch(ctx, [poly([1040, 452], [1560, 448], [1590, 500], [1010, 512])], { angle: 0.35, gap: 8, progress: bp, color: C.lineNight, alpha: 0.22, width: 1, t, boil: 8 })
    penDraw(ctx, [...BED, ...BED_SPINDLES, cr([[1120, 470], [1180, 480], [1250, 474]]), cr([[1380, 466], [1440, 478], [1500, 470]]),
      cr([[1060, 456], [1110, 486], [1150, 508]]), cr([[1300, 452], [1330, 480], [1350, 506]]), cr([[1470, 452], [1520, 478], [1560, 500]])], bp, { ...st, width: 1.9 })
  }
  // 蚊帐: a mosquito net hung from a canopy frame, tied back at the near-left corner
  const np = beatSteps(t, 217.942, 2)
  if (np > 0) {
    const net: Poly[] = [poly([1086, 112], [1474, 108], [1606, 180], [1000, 188])]
    for (let k = 0; k <= 12; k++) {
      const u = k / 12
      const tx = lerp(1000, 1606, u), ty = lerp(188, 180, u)
      if (u < 0.3) net.push(cr([[tx, ty], [lerp(tx, 1018, 0.5), 260], [1020 + u * 20, 320], [1010 + u * 30, 420], [1004 + u * 40, 512]]))
      else net.push(cr([[tx, ty], [tx + Math.sin(k * 1.7) * 6, 320], [tx + Math.sin(k * 2.3) * 8, 430], [tx + 4 * Math.sin(k), 506]]))
    }
    for (let k = 1; k <= 6; k++) net.push(cr([[lerp(1086, 1000, k / 7), lerp(112, 188, k / 7)], [lerp(1086, 1010, k / 7), lerp(260, 300, k / 7)], [lerp(1100, 1012, k / 7), lerp(420, 512, k / 7)]]))
    net.push(sketchEllipse(1022, 322, 12, 6, 720), cr([[1022, 328], [1016, 350], [1026, 370]]))
    const netReg = [poly([1000, 188], [1606, 180], [1600, 506], [1004, 512])]
    wash(ctx, netReg, 'rgb(220,228,246)', { alpha: 0.1 * np, blur: 8, edge: 0.3 })
    hatch(ctx, netReg, { angle: 1.52, gap: 6, progress: np, color: C.lineNight, alpha: 0.07, width: 0.8, wobble: 0.4, t, boil: 4 })
    penDraw(ctx, net, np, { ...st, width: 1.1, alpha: 0.5 })
  }
  // moonlight before the bed
  const lp = ease.outCubic(prog(t, 218.477, 219.1))
  const patch = [poly([540, 500], [900, 492], [1010, 600], [640, 608])]
  if (lp > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    // light shaft from the window
    const g = ctx.createLinearGradient(400, 230, 800, 560)
    g.addColorStop(0, `rgba(190,205,235,${0.0})`)
    g.addColorStop(0.5, `rgba(190,205,235,${0.07 * lp})`)
    g.addColorStop(1, `rgba(220,228,245,${0.12 * lp})`)
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(252, 384); ctx.lineTo(562, 382); ctx.lineTo(1010, 600); ctx.lineTo(640, 608); ctx.lineTo(540, 500); ctx.closePath(); ctx.fill()
    ctx.restore()
    wash(ctx, patch, 'rgb(214,224,244)', { alpha: (0.3 + 0.08 * beatPulse(t, 5)) * lp, blur: 12, edge: 0.2 })
    wash(ctx, [poly([600, 516], [880, 508], [960, 584], [680, 592])], 'rgb(236,240,252)', { alpha: 0.22 * lp, blur: 18, edge: 0 })
    glowAt(ctx, 780, 550, 340, 'rgba(200,214,246,ALPHA)', 0.22 * lp)
    // the light itself is made of the words 床前明月光
    textImage(ctx, {
      key: 'F:moonPatch', corpus: MOON_CORPUS, cell: 15, color: 'rgb(232,238,252)', emerge: ease.inOutSine(prog(t, 218.477, 219.6)), order: 'sweepX', scatter: 40, t, gamma: 1.1, alpha: 0.95, seed: 5,
      draw: (g) => {
        const gr = g.createLinearGradient(540, 500, 1010, 600)
        gr.addColorStop(0, '#cfcfcf'); gr.addColorStop(1, '#888')
        g.fillStyle = gr; fillPoly(g, patch[0]); g.fill()
        g.strokeStyle = '#000'; g.lineWidth = 9
        g.beginPath(); g.moveTo(720, 497); g.lineTo(826, 604); g.moveTo(590, 552); g.lineTo(955, 545); g.stroke()
        // a faint spill of words up the bed's foot
        g.fillStyle = '#444'; fillPoly(g, poly([1010, 512], [1100, 508], [1100, 590], [1012, 592])); g.fill()
      },
    })
    penDraw(ctx, [patch[0]], lp, { ...st, width: 1, alpha: 0.3 })
  }
  // the white rose, lying in the light
  const rp = beatSteps(t, 218.987, 2)
  if (rp > 0) {
    const rose = [...xf(ROSE_HEAD, 0, 0, 1, -0.2), ...xf(ROSE_STEM, 0, 0, 1, -0.2)]
    const RS = 0.5
    const placed = xf(rose, 790, 536, RS, -1.15, 0.62)
    glowAt(ctx, 790, 540, 180, 'rgba(240,236,220,ALPHA)', 0.3 * rp)
    wash(ctx, xf(xf(ROSE_HEAD_REGION, 0, 0, 1, -0.2), 790, 536, RS, -1.15, 0.62), 'rgb(246,242,230)', { alpha: 0.5 * rp, blur: 3 })
    wash(ctx, xf(xf(ROSE_LEAVES, 0, 0, 1, -0.2), 790, 536, RS, -1.15, 0.62), 'rgb(170,196,186)', { alpha: 0.35 * rp, blur: 2 })
    hatch(ctx, xf(xf(ROSE_INNER, 0, 0, 1, -0.2), 790, 536, RS, -1.15, 0.62), { angle: -0.6, gap: 3.5, progress: rp, color: 'rgb(150,160,190)', alpha: 0.55, width: 0.8, t, boil: 8 })
    hatch(ctx, xf(xf([blobPoly(10, 70, 90, 26, 4, 0.1)], 0, 0, 1, -0.2), 790, 536, RS, -1.15, 0.62), { angle: 0.4, gap: 4, progress: rp, color: 'rgb(150,160,190)', alpha: 0.45, width: 0.8, t, boil: 8 })
    penDraw(ctx, placed, rp, { ...st, color: 'rgb(250,248,240)', width: 1.6 })
  }
  ctx.restore()
  void lt
}

// ───────────────────────────── F1c · 半生缘 ─────────────────────────────
const SHIJUN = P([
  'M -28 -4 C -32 -34 -8 -46 14 -42 C 32 -38 36 -18 30 2',
  'M -8 -42 C -2 -30 10 -24 28 -18',
  'M 28 0 C 34 2 34 12 28 14',
  'M -12 30 L -12 46 M 12 30 L 12 46',
  'M -14 44 L 0 66 L 14 44',
  'M -14 44 C -44 48 -76 58 -88 84 L -96 150',
  'M 14 44 C 44 48 76 58 88 84 L 96 150',
  'M -12 48 L -26 92 L -2 124 M 12 48 L 26 92 L 2 124',
  'M -88 92 C -96 130 -84 162 -40 176 L -10 180',
  'M 88 92 C 96 130 84 162 40 176 L 10 180',
  'M -16 172 C -8 164 8 164 16 172 C 12 186 -12 186 -16 172',
].join(' '))
const SHIJUN_HEAD = [sketchEllipse(0, 0, 28, 34, 5)]
const SHIJUN_CHAIR = P('M -112 34 L -114 150 M 112 34 L 114 150 M -112 34 C -40 22 40 22 112 34')
const MANZHEN = P([
  'M -30 -10 C -34 -40 -10 -52 12 -46 C 34 -40 40 -14 34 8',
  'M 34 8 C 36 22 30 36 18 44',
  'M -32 -6 C -36 14 -30 34 -14 46',
  'M -24 36 C -34 40 -36 56 -22 62 C -6 66 4 56 0 44',
  'M -10 52 C -8 66 -12 76 -18 86 M 16 46 C 18 62 22 72 30 82',
  'M -20 72 C -2 78 18 78 32 70 M -20 72 L -18 88 M 32 70 L 32 84',
  'M -18 88 C -48 92 -76 104 -84 132 C -88 170 -70 206 -72 236 C -74 262 -84 282 -88 300',
  'M 32 84 C 60 88 82 100 88 128 C 90 170 74 206 76 234 C 78 262 86 282 90 300',
  'M -72 238 C -30 246 36 246 76 236',
  'M 90 132 C 104 170 118 200 130 222 M 80 168 C 92 194 102 214 112 232',
  'M 84 170 C 96 168 108 164 118 156',
  'M 130 222 C 180 220 230 214 280 208 M 112 232 C 170 236 230 230 278 226',
  'M 278 208 C 298 206 310 216 302 226 C 294 232 284 230 278 226',
].join(' '))
const MANZHEN_HAIR = P('M -32 -6 C -36 -42 -8 -54 14 -48 C 38 -42 42 -14 36 10 C 30 30 12 46 -6 48 C -26 46 -36 30 -32 -6 Z')
const MANZHEN_BODY = P('M -18 88 C -48 92 -76 104 -84 132 C -88 170 -70 206 -72 236 C -74 262 -84 282 -88 300 L 90 300 C 86 282 78 262 76 234 C 74 206 90 170 88 128 C 82 100 60 88 32 84 Z')
const LETTER = '我要你知道，在这个世界上总有一个人是等着你的，不管在什么时候，不管在什么地方，反正你知道，总有这么个人。'

/** 曼桢's letter on a ruled 信笺, written on the beats (in-frame quotation, 《半生缘》). */
function drawLetter(ctx: Ctx, t: number) {
  const ap = ease.outCubic(prog(t, T.ban, T.ban + 0.35))
  if (ap <= 0) return
  ctx.save()
  ctx.translate(1625, 250); ctx.rotate(0.03 - 0.01 * prog(t, T.ban, T.yi)); ctx.translate(-1625, -250)
  ctx.globalAlpha *= ap
  const sheet = poly([1528, 30], [1722, 34], [1720, 470], [1530, 466])
  ctx.save(); ctx.filter = 'blur(6px)'; ctx.fillStyle = 'rgba(70,44,22,0.25)'; ctx.translate(6, 8); fillPoly(ctx, sheet); ctx.fill(); ctx.restore()
  wash(ctx, [sheet], 'rgb(246,236,214)', { alpha: 0.95, blur: 1, edge: 0.2 })
  ctx.strokeStyle = 'rgba(179,52,58,0.45)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let c = 0; c <= 5; c++) { const x = 1704 - c * 34.3; ctx.moveTo(x, 48); ctx.lineTo(x, 454) }
  ctx.moveTo(1540, 48); ctx.lineTo(1710, 48); ctx.moveTo(1540, 454); ctx.lineTo(1710, 454)
  ctx.stroke()
  penDraw(ctx, [sheet, sketchLine(1532, 250, 1720, 252, 5, 0)], 1, { width: 1.1, color: C.inkSoft, alpha: 0.55, boil: 8, t, nib: false })
  writeVertical(ctx, t, { text: LETTER, x: 1702, y: 52, size: 22, t0: 220.75, rate: 0.058, perCol: 14, color: 'rgb(36,26,20)', grid: null, alpha: 0.92 })
  ctx.restore()
}
const CUP = P('M -22 0 C -20 20 -12 28 0 28 C 12 28 20 20 22 0 M 22 6 C 34 4 34 18 20 18')

function drawBanshengyuan(ctx: Ctx, t: number) {
  oldPaper(ctx, t, { sepia: 0.38 })
  const st = ink({ t })
  const away = ease.inOutSine(prog(t, 221.6, 224.6))
  ctx.save()
  camera(ctx, 1 + 0.05 * ease.inOutSine(prog(t, T.ban, 224.6)) + 0.01 * beatPulse(t, 8), 560, 300, lerp(-20, 10, prog(t, T.ban, 224.6)))
  // back wall: chair rail and panels
  const bw = beatSteps(t, T.ban, 1, 0.45)
  penDraw(ctx, [sketchLine(-20, 300, 1840, 270, 51), sketchLine(1440, -20, 1438, 274, 52), sketchLine(760, -20, 764, 290, 54), sketchLine(-20, 318, 1840, 288, 55, 0)], bw, { ...st, width: 1.3, color: C.inkSoft, alpha: 0.45 })
  if (bw > 0) {
    ctx.save(); ctx.globalAlpha *= bw
    ctx.drawImage(cached('F:banWall', W, H, (g) => hatch(g, [poly([-20, -20], [1840, -20], [1840, 270], [-20, 300])], { angle: 1.56, gap: 14, color: C.inkSoft, alpha: 0.1, width: 1, seed: 7 })), 0, 0)
    ctx.restore()
    // a lattice window behind her, the street dark beyond
    const win = poly([140, 40], [420, 44], [420, 270], [140, 274])
    wash(ctx, [win], 'rgb(62,58,68)', { alpha: 0.5 * bw, blur: 3 })
    // outside: a roofline under snow, and snow falling
    ctx.save(); fillPoly(ctx, win); ctx.clip()
    penDraw(ctx, P('M 130 200 L 190 168 L 250 196 L 300 180 L 360 204 L 430 186'), bw, { ...st, color: 'rgb(236,232,222)', width: 2.4, alpha: 0.75 })
    wash(ctx, P('M 130 200 L 190 168 L 250 196 L 300 180 L 360 204 L 430 186 L 430 280 L 130 280 Z'), 'rgb(40,36,44)', { alpha: 0.5 * bw, blur: 2 })
    ctx.fillStyle = 'rgba(244,240,232,0.85)'
    for (let k = 0; k < 46; k++) {
      const sx = 140 + ((rand(k, 71) * 300 + Math.sin(t * 0.9 + k) * 8) % 290)
      const sy = 40 + ((rand(k, 72) * 240 + t * (22 + rand(k, 73) * 26)) % 240)
      ctx.globalAlpha = bw * (0.5 + rand(k, 74) * 0.5)
      ctx.beginPath(); ctx.arc(sx, sy, 1.2 + rand(k, 75) * 2, 0, TAU); ctx.fill()
    }
    ctx.restore()
    penDraw(ctx, [win, sketchLine(280, 42, 280, 272, 56, 0), sketchLine(140, 156, 420, 156, 57, 0), sketchLine(126, 284, 434, 280, 58, 4), sketchLine(132, 34, 428, 38, 59, 4)], bw, { ...st, width: 1.6, alpha: 0.7 })
    // a 水牌 menu board: dishes on red paper strips
    const mb = poly([618, 58], [796, 56], [798, 252], [620, 254])
    wash(ctx, [mb], 'rgb(120,82,50)', { alpha: 0.45 * bw, blur: 2 })
    const dishes = ['阳春面', '菜肉馄饨', '排骨年糕', '鸡鸭血汤']
    dishes.forEach((d, k) => {
      const x = 774 - k * 42
      wash(ctx, [poly([x - 16, 74], [x + 16, 74], [x + 16, 238], [x - 16, 238])], C.rouge, { alpha: 0.5 * bw, blur: 1, edge: 0.3 })
      writeVertical(ctx, t, { text: d, x: x + 12, y: 80, size: 18, t0: T.ban + 0.1 + k * 0.08, rate: 0.03, perCol: 6, color: 'rgb(30,20,14)', grid: null, alpha: 0.85 })
    })
    penDraw(ctx, [mb, sketchLine(612, 52, 804, 50, 60, 3), sketchLine(704, 20, 706, 52, 61, 0)], bw, { ...st, width: 1.6, alpha: 0.75 })
    // a coat rack: his overcoat and hat
    penDraw(ctx, [sketchLine(1462, 40, 1466, 400, 65, 0), sketchLine(1440, 60, 1486, 58, 66, 0), cr([[1440, 60], [1430, 70], [1434, 82]]), cr([[1486, 58], [1496, 68], [1492, 80]])], bw, { ...st, width: 2, alpha: 0.8 })
    const coat = P('M 1488 76 C 1470 80 1450 96 1446 130 C 1440 190 1436 250 1428 330 L 1500 334 C 1500 260 1506 190 1504 130 C 1502 100 1498 84 1488 76 Z')
    wash(ctx, coat, 'rgb(70,62,58)', { alpha: 0.45 * bw, blur: 2 })
    hatch(ctx, coat, { angle: 1.3, gap: 7, progress: bw, color: C.ink, alpha: 0.25, width: 0.9, t, boil: 6 })
    penDraw(ctx, [...coat, ...P('M 1474 96 L 1486 150 L 1470 210 M 1440 30 C 1442 12 1458 6 1466 6 C 1478 6 1490 14 1492 30 M 1428 32 C 1450 38 1480 38 1504 32')], bw, { ...st, width: 1.6 })
    wash(ctx, P('M 1440 30 C 1442 12 1458 6 1466 6 C 1478 6 1490 14 1492 30 Z'), 'rgb(60,48,40)', { alpha: 0.5 * bw, blur: 1.5 })
  }
  drawLetter(ctx, t)
  // the lamp (sways)
  const sw = 0.04 * Math.sin(t * 2.2)
  ctx.save()
  ctx.translate(1010, -10); ctx.rotate(sw); ctx.translate(-1010, 10)
  const lampP = beatSteps(t, T.ban, 1, 0.4)
  const lightP = ease.outCubic(prog(t, 221.1, 221.6))
  if (lightP > 0) {
    wash(ctx, [poly([958, 166], [1062, 166], [1290, 440], [760, 470])], C.gold, { alpha: (0.2 + 0.06 * beatPulse(t, 5)) * lightP, blur: 14 })
    glowAt(ctx, 1010, 175, 90, 'rgba(255,226,170,ALPHA)', 0.5 * lightP)
  }
  penDraw(ctx, P('M 1010 -10 L 1010 120 M 996 120 L 1024 120 C 1030 136 1048 148 1066 166 L 954 166 C 972 148 990 136 996 120 M 1000 166 C 1002 178 1018 178 1020 166'), lampP, { ...st, width: 2 })
  ctx.restore()

  // 世钧, across the table — drifting away
  const sjP = beatSteps(t, 221.1, 2)
  ctx.save()
  const fx = 1200, fy = 360
  ctx.translate(fx + 26 * away, fy - 6 * away); ctx.scale(1 - 0.08 * away, 1 - 0.08 * away); ctx.translate(-fx, -fy)
  if (sjP > 0) {
    penDraw(ctx, xf(SHIJUN_CHAIR, 1236, 246, 0.85), sjP, { ...st, color: C.inkSoft, width: 1.8, alpha: 0.6 })
    wash(ctx, xf([poly([-14, 44], [-88, 84], [-96, 150], [96, 150], [88, 84], [14, 44])], 1236, 246, 0.85), 'rgb(80,70,64)', { alpha: 0.28 * sjP, blur: 4 })
    wash(ctx, xf([blobPoly(0, -18, 30, 24, 2, 0.1)], 1236, 246, 0.85), C.ink, { alpha: 0.4 * sjP, blur: 2 })
    hatch(ctx, xf([blobPoly(0, 12, 22, 16, 6, 0.1)], 1236, 246, 0.85), { angle: -0.6, gap: 5, progress: sjP, color: C.inkSoft, alpha: 0.5, width: 0.9 })
    textImage(ctx, {
      key: 'F:shijun', corpus: '沈世钧我们回不去了半生缘', cell: 8, color: 'rgb(40,30,26)', emerge: sjP, order: 'sweepY', scatter: 40, t, gamma: 0.9, alpha: 0.9, seed: 13,
      draw: (m) => {
        m.fillStyle = '#909090'; fillPoly(m, xf([poly([-14, 44], [-88, 84], [-96, 150], [96, 150], [88, 84], [14, 44])], 1236, 246, 0.85)[0]); m.fill()
        m.fillStyle = '#d0d0d0'; fillPoly(m, xf([blobPoly(0, -18, 30, 24, 2, 0.1)], 1236, 246, 0.85)[0]); m.fill()
        penDraw(m, [...xf(SHIJUN_HEAD, 1236, 246, 0.85), ...xf(SHIJUN, 1236, 246, 0.85)], 1, { width: 3.4, color: '#fff', boil: 0 })
      },
    })
    penDraw(ctx, [...xf(SHIJUN_HEAD, 1236, 246, 0.85), ...xf(SHIJUN, 1236, 246, 0.85)], sjP, { ...st, width: 1.3, alpha: 0.6 })
  }
  ctx.restore()
  // table
  const tp = beatSteps(t, T.ban, 2)
  const top = poly([770, 400], [1390, 372], [1510, 470], [840, 512])
  if (tp > 0) {
    wash(ctx, [top], 'rgb(150,104,64)', { alpha: 0.32 * tp, blur: 3 })
    hatch(ctx, [top], { angle: -0.05, gap: 14, progress: tp, color: 'rgb(90,60,36)', alpha: 0.22, width: 1, t, boil: 6 })
    // teapot between them
    wash(ctx, P('M 1076 432 C 1066 400 1086 380 1110 380 C 1134 380 1154 400 1144 432 Z'), 'rgb(240,232,214)', { alpha: 0.6 * tp, blur: 1.5 })
    penDraw(ctx, P('M 1076 432 C 1066 400 1086 380 1110 380 C 1134 380 1154 400 1144 432 Z M 1092 380 C 1096 370 1124 370 1128 380 M 1110 368 L 1110 362 M 1144 410 C 1162 404 1170 392 1178 384 M 1072 400 C 1056 398 1052 418 1070 424'), tp, { ...st, width: 1.7 })
    // steam from the teapot's spout and lid
    for (let k = 0; k < 3; k++) {
      const ph = t * 1.3 + k * 2.1
      const bx = k === 0 ? 1180 : 1108 + k * 6, by = k === 0 ? 380 : 366
      penStroke(ctx, cr([[bx, by], [bx - 8 + 7 * Math.sin(ph), by - 30], [bx + 4 + 9 * Math.sin(ph * 0.8), by - 62], [bx - 6 + 10 * Math.sin(ph * 1.1), by - 96]]), tp, { ...st, width: 1.2, alpha: 0.35 + 0.1 * Math.sin(ph) })
    }
    penDraw(ctx, [top, sketchLine(840, 512, 842, 534, 61, 2), sketchLine(1510, 470, 1508, 492, 62, 2), sketchLine(842, 534, 1508, 492, 63, 2), sketchLine(1498, 492, 1502, 610, 64, 2)], tp, { ...st, width: 2.1 })
  }
  // cups — one still steaming
  const cp = beatSteps(t, 223.19, 1, 0.4)
  if (cp > 0) {
    for (const [cx, cy, s] of [[960, 452, 1], [1236, 420, 0.86]] as const) {
      penDraw(ctx, [sketchEllipse(cx, cy, 22 * s, 7 * s, cx), sketchEllipse(cx, cy + 28 * s, 34 * s, 9 * s, cx + 1), ...xf(CUP, cx, cy, s)], cp, { ...st, width: 1.6 })
    }
    const sp = clamp(prog(t, 223.4, 224.2))
    penStroke(ctx, cr([[1236, 410], [1228 + 6 * Math.sin(t * 3), 380], [1242, 350], [1234 + 6 * Math.sin(t * 2.4), 320]]), sp, { ...st, width: 1.1, alpha: 0.45 })
  }
  // 曼桢, foreground, her back to us
  const mzP = beatSteps(t, 222.145, 2)
  if (mzP > 0) {
    const mx = 500, my = 232, ms = 1.25
    wash(ctx, xf(MANZHEN_BODY, mx, my, ms), C.jade, { alpha: 0.16 * mzP, blur: 6 })
    // she surfaces out of the novel's words
    textImage(ctx, {
      key: 'F:manzhen', corpus: '顾曼桢我要你知道总有一个人是等着你的半生缘', cell: 10, color: 'rgb(34,52,42)', emerge: mzP, order: 'sweepYUp', scatter: 60, t, gamma: 0.85, alpha: 0.95, seed: 12,
      draw: (m) => {
        m.fillStyle = '#9a9a9a'; fillPoly(m, xf(MANZHEN_BODY, mx, my, ms)[0]); m.fill()
        m.fillStyle = '#e0e0e0'; fillPoly(m, xf(MANZHEN_HAIR, mx, my, ms)[0]); m.fill()
        penDraw(m, xf(MANZHEN, mx, my, ms), 1, { width: 4, color: '#fff', boil: 0 })
      },
    })
    penDraw(ctx, xf(MANZHEN, mx, my, ms), mzP, { ...st, width: 1.4, alpha: 0.6 })
    // her chair back, nearest to us
    penDraw(ctx, [cr([[330, 528], [450, 512], [570, 512], [680, 524]]), sketchLine(352, 528, 356, 700, 71), sketchLine(660, 524, 656, 700, 72)], mzP, { ...st, width: 3, alpha: 0.85 })
  }
  ctx.restore()
  // a dim winter room: the lamp's pool over the table, a little light on the letter and the snowy window
  const lampK = ease.outCubic(prog(t, T.ban, 221.4))
  darkRoom(ctx, [{ x: 1000, y: 360, r: 820, k: 0.35 + 0.65 * lampK }, { x: 1625, y: 250, r: 300, k: 0.6 }, { x: 280, y: 160, r: 280, k: 0.3 }, { x: 560, y: 380, r: 520, k: 0.7 * lampK }])
  bookTitle(ctx, t, '《半生缘》', 220.7, 224.6, true)
}

// ───────────────────────────── F1d · 更衣记: empty garments ─────────────────────────────
type Garment = {
  label: string
  nw: number; ch: number; cf: number
  span: number; cT: number; cB: number; ax: number; ay: number
  side: number[][]; hx: number; hem: number; hc: number
  trim: number; slit?: number; print?: boolean
  skirt?: { bot: number; wTop: number; wBot: number; pleats: number; panel?: boolean }
  color: string; wash: number
  /** embroidery motifs [x, y, radius] in garment coords, and thread colour */
  emb?: number[][]; embColor?: string
  /** draw a contrasting piping line along the 襟 */
  pipe?: boolean
}
const GARMENTS: Garment[] = [
  { label: '清末', nw: 24, ch: 10, cf: 0, span: 250, cT: 34, cB: 190, ax: 128, ay: 176, side: [[138, 250]], hx: 162, hem: 330, hc: 4, trim: 16,
    skirt: { bot: 600, wTop: 150, wBot: 180, pleats: 9, panel: true }, color: C.jade, wash: 0.5,
    emb: [[-118, 322, 7], [-58, 324, 7], [0, 325, 7], [58, 324, 7], [118, 322, 7], [-242, 80, 6], [-242, 140, 6], [242, 80, 6], [242, 140, 6], [-50, 60, 9], [70, 150, 11], [-90, 230, 10], [0, 520, 13], [-30, 470, 8], [30, 470, 8]], embColor: 'rgb(204,170,96)' },
  { label: '民初', nw: 20, ch: 52, cf: 14, span: 220, cT: 28, cB: 118, ax: 104, ay: 112, side: [[98, 200]], hx: 118, hem: 296, hc: 26, trim: 6,
    skirt: { bot: 590, wTop: 112, wBot: 150, pleats: 12 }, color: C.gold, wash: 0.45, pipe: true,
    emb: [[-86, 270, 8], [86, 270, 8], [-200, 90, 6], [200, 90, 6], [0, -26, 6]], embColor: C.rouge },
  { label: '一九二〇年代', nw: 18, ch: 30, cf: 0, span: 196, cT: 36, cB: 150, ax: 92, ay: 66, side: [[90, 190]], hx: 104, hem: 248, hc: 30, trim: 0,
    skirt: { bot: 482, wTop: 100, wBot: 142, pleats: 0 }, color: 'rgb(118,138,160)', wash: 0.45, pipe: true, embColor: 'rgb(236,230,214)' },
  { label: '二十年代末', nw: 18, ch: 34, cf: 0, span: 176, cT: 32, cB: 104, ax: 92, ay: 84, side: [[100, 220], [112, 400]], hx: 120, hem: 568, hc: 0, trim: 7, slit: 470,
    color: 'rgb(96,110,100)', wash: 0.42 },
  { label: '三十年代', nw: 16, ch: 44, cf: 0, span: 236, cT: 30, cB: 62, ax: 80, ay: 70, side: [[66, 206], [88, 286], [80, 470]], hx: 74, hem: 586, hc: 0, trim: 3, slit: 400, print: true,
    color: 'rgb(84,96,128)', wash: 0.42, pipe: true, embColor: 'rgb(236,226,204)' },
  { label: '四十年代', nw: 16, ch: 36, cf: 0, span: 104, cT: 22, cB: 70, ax: 76, ay: 64, side: [[64, 196], [86, 270]], hx: 78, hem: 476, hc: 0, trim: 3, slit: 380,
    color: C.rouge, wash: 0.55, pipe: true, embColor: 'rgb(244,232,210)' },
]
const HANG = [0, -60, 50, -40, 36, -12]
const GARMENT_CORPUS = '我们各人住在各人的衣服里更衣记'
const TEXT_TINT = ['rgb(156,212,182)', 'rgb(240,206,128)', 'rgb(176,202,236)', 'rgb(186,208,190)', 'rgb(178,190,240)', 'rgb(250,128,124)']
const mirror = (p: Poly): Poly => p.map((v, i) => (i & 1 ? v : -v))
const garmentCache = new Map<number, { lines: Poly[]; region: Poly; skirtRegion: Poly | null; pole: number; piping: Poly | null }>()
function garmentPolys(i: number) {
  const hit = garmentCache.get(i)
  if (hit) return hit
  const g = GARMENTS[i]
  const topR = cr([[g.nw, 0], [g.span * 0.5, g.cT * 0.55 + 3], [g.span, g.cT]])
  const cuffR: Poly = [g.span, g.cT, g.span + 2, g.cB]
  const underR = cr([[g.span, g.cB], [lerp(g.span, g.ax, 0.55), lerp(g.cB, g.ay, 0.72)], [g.ax, g.ay], ...g.side, [g.hx, g.hem]])
  const hemR = cr([[g.hx, g.hem], [g.hx * 0.5, g.hem + g.hc * 0.8], [0, g.hem + g.hc]])
  const lines: Poly[] = []
  // skirt first (behind)
  let skirtRegion: Poly | null = null
  if (g.skirt) {
    const s = g.skirt
    const sideR = cr([[s.wTop, g.hem - 4], [lerp(s.wTop, s.wBot, 0.5) + 4, (g.hem + s.bot) / 2], [s.wBot, s.bot]])
    const bot = cr([[-s.wBot, s.bot], [0, s.bot + 8], [s.wBot, s.bot]])
    lines.push(sideR, mirror(sideR), bot)
    for (let k = 1; k < s.pleats; k++) {
      const u = k / s.pleats
      if (s.panel && Math.abs(u - 0.5) < 0.2) continue
      lines.push(sketchLine(lerp(-s.wTop, s.wTop, u), g.hem + g.hc + 6, lerp(-s.wBot, s.wBot, u), s.bot + 6 * Math.sin(u * Math.PI), 300 + k, 0))
    }
    if (s.panel) lines.push(sketchLine(-s.wTop * 0.4, g.hem + 6, -s.wBot * 0.4, s.bot + 6, 391, 0), sketchLine(s.wTop * 0.4, g.hem + 6, s.wBot * 0.4, s.bot + 6, 392, 0), cr([[-s.wBot * 0.4, s.bot - 30], [0, s.bot - 24], [s.wBot * 0.4, s.bot - 30]]))
    skirtRegion = poly([s.wTop, g.hem], [s.wBot, s.bot], [0, s.bot + 8], [-s.wBot, s.bot], [-s.wTop, g.hem])
  }
  lines.push(topR, cuffR, underR, hemR, mirror(topR), mirror(cuffR), mirror(underR), mirror(hemR))
  // collar
  lines.push([-g.nw, 2, -g.nw - g.cf, -g.ch], cr([[-g.nw - g.cf, -g.ch], [0, -g.ch - 5], [g.nw + g.cf, -g.ch]]), [g.nw, 2, g.nw + g.cf, -g.ch], cr([[-g.nw, 2], [0, 6], [g.nw, 2]]))
  // 大襟 (opens to the wearer's right = viewer's left)
  const jin = [[0, 6], [-g.nw - 16, 20], [-g.ax * 0.8, g.ay * 0.48], [-g.ax + 4, g.ay + 6]]
  lines.push(cr(jin))
  if (g.trim > 6) {
    lines.push(cr(jin.map(([x, y]) => [x - g.trim * 0.3, y + g.trim])))
    lines.push(cr([[-g.hx + 4, g.hem - g.trim], [0, g.hem + g.hc - g.trim], [g.hx - 4, g.hem - g.trim]]))
    lines.push([g.span - g.trim, g.cT + 2, g.span - g.trim + 2, g.cB - 2], [-g.span + g.trim, g.cT + 2, -g.span + g.trim - 2, g.cB - 2])
    // wide rolled sleeve edges: a second band
    if (g.trim > 12) lines.push([g.span - g.trim * 2.2, g.cT + 4, g.span - g.trim * 2.2 + 2, g.cB - 6], [-g.span + g.trim * 2.2, g.cT + 4, -g.span + g.trim * 2.2 - 2, g.cB - 6],
      cr([[-g.hx + 6, g.hem - g.trim * 2.2], [0, g.hem + g.hc - g.trim * 2.2], [g.hx - 6, g.hem - g.trim * 2.2]]))
  }
  const piping = g.pipe ? cr(jin.map(([x, y]) => [x - 3, y + 5])) : null
  // 盘扣
  for (const [x, y] of [[0, -g.ch * 0.5], [-g.nw - 16, 20], [-g.ax * 0.8, g.ay * 0.48]]) lines.push([x - 9, y, x + 9, y + 1])
  // slit
  if (g.slit) {
    const sx = g.hx - 6
    lines.push([sx, g.hem - 2, sx - 4, g.slit], [-sx, g.hem - 2, -sx + 4, g.slit])
  }
  const region = poly(...chunk([...topR, ...cuffR, ...underR, ...hemR]), ...chunk(mirror([...topR, ...cuffR, ...underR, ...hemR])).reverse())
  const pole = g.cT * 0.5 + 10
  const out = { lines, region, skirtRegion, pole, piping }
  garmentCache.set(i, out)
  return out
}
function chunk(p: Poly): number[][] {
  const o: number[][] = []
  for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]])
  return o
}

function drawGarment(ctx: Ctx, t: number, i: number, x: number, y: number, s: number, progress: number, alpha: number, flick: number) {
  const g = GARMENTS[i]
  const gp = garmentPolys(i)
  const fill = clamp(progress * 1.6 - 0.4) * 0.18
  // the garment is made of her sentence (mask authored at its front position, then carried into depth)
  {
    const s0 = 0.86, x0 = 600, y0 = 348 + HANG[i] * s0 - 300 * s0
    ctx.save()
    ctx.translate(x, y); ctx.scale(s / s0, s / s0); ctx.translate(-x0, -y0)
    textImage(ctx, {
      key: `F:garment${i}`, corpus: GARMENT_CORPUS, cell: 12, color: TEXT_TINT[i], emerge: progress, order: 'sweepY', scatter: 80, t, gamma: 0.9, alpha: alpha * (1 + 0.25 * flick), seed: i + 1,
      draw: (m) => {
        if (gp.skirtRegion) { m.fillStyle = '#909090'; fillPoly(m, xf([gp.skirtRegion], x0, y0, s0)[0]); m.fill() }
        m.fillStyle = '#b4b4b4'; fillPoly(m, xf([gp.region], x0, y0, s0)[0]); m.fill()
        penDraw(m, xf(gp.lines, x0, y0, s0), 1, { width: 3.6, color: '#fff', boil: 0, wobble: 0.5 })
        for (const [ex, ey, r] of g.emb ?? []) penDraw(m, xf(flowerPolys(r), x0 + ex * s0, y0 + ey * s0, s0), 1, { width: 2.2, color: '#fff', boil: 0 })
      },
    })
    ctx.restore()
  }
  // its shadow on the wall behind
  if (fill > 0) wash(ctx, xf(gp.skirtRegion ? [gp.region, gp.skirtRegion] : [gp.region], x + 26 * s, y + 18 * s, s), 'rgb(90,62,38)', { alpha: 0.13 * fill * alpha, blur: 10, edge: 0 })
  if (gp.skirtRegion && fill > 0) wash(ctx, xf([gp.skirtRegion], x, y, s), 'rgb(52,40,34)', { alpha: 0.42 * fill * alpha, blur: 3 })
  if (fill > 0) wash(ctx, xf([gp.region], x, y, s), g.color, { alpha: g.wash * fill * alpha, blur: 3 })
  if (g.print && fill > 0) {
    ctx.save()
    const reg = xf([gp.region], x, y, s)[0]
    ctx.beginPath(); ctx.moveTo(reg[0], reg[1]); for (let k = 2; k < reg.length; k += 2) ctx.lineTo(reg[k], reg[k + 1]); ctx.closePath(); ctx.clip()
    for (let k = 0; k < 70; k++) {
      const px = x + (rand(k, 81) - 0.5) * 2 * g.span * s, py = y + rand(k, 82) * g.hem * s
      penStroke(ctx, sketchEllipse(px, py, 4 * s + 1, 3.4 * s + 1, k, 0.1), fill, { width: 1.1, color: 'rgb(236,226,204)', alpha: 0.7 * alpha, boil: 8, t, nib: false })
    }
    ctx.restore()
  }
  // the bamboo pole through the sleeves, hung from the ceiling on one cord and hook
  const py = y + gp.pole * s
  penDraw(ctx, [sketchLine(x - (g.span + 46) * s, py, x + (g.span + 46) * s, py + 2, 500 + i, 0), sketchLine(x, py - 4, x + 2, -40, 510 + i, 0),
    cr([[x, py - 4], [x - 9 * s, py - 16 * s], [x, py - 28 * s], [x + 2, py - 40 * s]])],
    clamp(progress * 2), { width: 2.2 * s + 0.6, color: 'rgb(200,166,118)', alpha: alpha * 0.7, boil: 8, t })
  for (const sx of [-1, 1]) penStroke(ctx, sketchEllipse(x + sx * (g.span + 46) * s, py + 1, 4 * s + 1, 4 * s + 1, 530 + i), clamp(progress * 2), { width: 1.4 * s + 0.5, color: 'rgb(200,166,118)', alpha: alpha * 0.7, boil: 8, t, nib: false })
  penDraw(ctx, xf(gp.lines, x, y, s), progress, { width: (1.3 + 0.8 * flick) * s + 0.3, color: C.lineNight, alpha: alpha * 0.45, boil: 12, t, seed: i + 1 })
  // embroidery on the near garment: flowers in the 镶滚 bands, piping along the 襟
  if (fill > 0 && s > 0.45) {
    const emb = { width: 1.1 * s + 0.3, color: g.embColor ?? C.rouge, alpha: 0.85 * alpha * fill, boil: 8, t, nib: false, taperIn: 3, taperOut: 3 }
    for (const [ex, ey, r] of g.emb ?? []) penDraw(ctx, xf(flowerPolys(r), x + ex * s, y + ey * s, s), fill, { ...emb, seed: ex + ey })
    if (gp.piping) penDraw(ctx, xf([gp.piping], x, y, s), fill, { ...emb, width: 1.6 * s + 0.3, color: g.embColor ?? 'rgb(240,226,200)' })
  }
}

const flowerCache = new Map<number, Poly[]>()
/** A small embroidered flower: five petals and two leaves, radius r. */
function flowerPolys(r: number): Poly[] {
  const hit = flowerCache.get(r)
  if (hit) return hit
  const o: Poly[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU
    o.push(sketchEllipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.28, k + r, 0.05, a))
  }
  o.push(sketchEllipse(0, 0, r * 0.18, r * 0.18, 9))
  o.push(cr([[r * 0.8, r * 0.5], [r * 1.4, r * 0.9], [r * 1.9, r * 0.7]]), cr([[-r * 0.8, r * 0.5], [-r * 1.3, r * 1.0], [-r * 1.9, r * 0.8]]))
  flowerCache.set(r, o)
  return o
}

function drawGengyiji(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { lift: 0.06 })
  // a warm pool where the newest garment hangs, as in a darkened shop window
  glowAt(ctx, 600, 330, 560, 'rgba(240,200,140,ALPHA)', 0.3 + 0.1 * beatPulse(t, 6))
  glowAt(ctx, 1300, 300, 600, 'rgba(160,180,230,ALPHA)', 0.08)
  const i0 = beatIndex(T.yi + 0.02)
  const j = Math.min(5, beatIndex(t) - i0)
  const jj = beatIndex(t) - i0
  const f = jj > 5 ? 1 : ease.outCubic(clamp((t - beatTime(i0 + Math.max(0, j))) / 0.28))
  ctx.save()
  camera(ctx, 1 + 0.06 * ease.inOutSine(prog(t, T.yi, 228.6)), 700, 300, lerp(30, -30, prog(t, T.yi, 228.6)))
  // a long room receding to the right: floor line and boards (cached)
  ctx.drawImage(cached('F:yiFloorN', W, H, (g) => {
    const st = { width: 1.2, color: C.lineNight, alpha: 0.3, boil: 0 }
    penStroke(g, sketchLine(-40, 660, 1880, 470, 1, 0), 1, st)
    for (let i = 0; i < 16; i++) {
      const x0 = -200 + i * 150, y0 = 660 - (x0 + 40) * 0.099
      penStroke(g, sketchLine(x0, y0, x0 - (1700 - x0) * 0.45, 820, 10 + i, 0), 1, { ...st, alpha: 0.14, width: 1 })
    }
    hatch(g, [poly([-40, 660], [1880, 470], [1880, 830], [-40, 830])], { angle: -0.1, gap: 16, color: C.lineNight, alpha: 0.06, width: 1, seed: 3 })
  }), 0, 0)
  const flick = beatPulse(t, 9)
  for (let k = 0; k <= j; k++) {
    const age = k === j ? 0 : j - k - 1 + f
    if (age > 4.5) continue
    const s = 0.86 * Math.pow(0.62, age)
    const d = 1 - Math.pow(0.62, age)
    const x = 600 + 1120 * d
    const y = lerp(348, 230, d) + HANG[k] * s - 300 * s
    const a = Math.pow(0.5, age) * (k === j ? 1 : 0.95)
    const pr = k === j ? (jj > 5 ? 1 : ease.outCubic(clamp((t - beatTime(i0 + k)) / 0.42))) : 1
    drawGarment(ctx, t, k, x, y, s, pr, a, k === j ? flick : 0)
  }
  ctx.restore()
  // era label for the garment in front
  const g = GARMENTS[Math.max(0, j)]
  const lt0 = beatTime(i0 + Math.max(0, j))
  writeVertical(ctx, t, { text: '我们各人住在\n各人的衣服里。', x: 200, y: 96, size: 38, t0: 224.62, rate: 0.17, perCol: 7, color: C.lineNight, grid: null, alpha: 0.5 })
  writeVertical(ctx, t, { text: g.label, x: 600 - g.span * 0.86 - 50, y: 150, size: 26, t0: lt0 + 0.05, rate: 0.04, perCol: 8, color: C.moon, grid: null, alpha: 0.8 * (1 - prog(t, lt0 + (jj > 5 ? 4 : 0.5), lt0 + (jj > 5 ? 4.3 : 0.52))) })
  bookTitle(ctx, t, '《更衣记》', 224.4, 228.6, true)
}

// ───────────────────────────── F1e · 对照记: time accelerates ─────────────────────────────
const YEARS = ['1920', '1930', '1938', '1939', '1943', '1944', '1947', '1952', '1955', '1956', '1967', '1972', '1994']
const QUOTE_DZ = [...'然后时间加速越来越快繁弦急管转入急管哀弦']
const VORTEX_CORPUS = '然后时间加速越来越快繁弦急管转入急管哀弦一九二〇一九三八一九四三一九五二一九五五一九七二一九九四对照记'
const FLIPS = [228.995, 229.506, 230.017, 230.551, 231.085, 231.352, 231.619, 231.886, 232.153, 232.41, 232.664, 232.92]
const revs = (t: number) => 0.18 * (Math.exp(Math.max(0, t - T.dui) * 1.0) - 1)
const revRate = (t: number) => 0.18 * Math.exp(Math.max(0, t - T.dui) * 1.0)

function calendarPage(ctx: Ctx, t: number, x: number, y: number, rot: number, year: string, alpha: number, seed: number) {
  const w = 230, h = 280
  ctx.save()
  ctx.translate(x, y); ctx.rotate(rot)
  ctx.globalAlpha *= alpha
  wash(ctx, [poly([-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h])], 'rgb(226,214,190)', { alpha: 0.92, blur: 1.2, edge: 0.2 })
  wash(ctx, [poly([-w / 2, 0], [w / 2, 0], [w / 2, 46], [-w / 2, 46])], C.rouge, { alpha: 0.75, blur: 1.2 })
  penDraw(ctx, [poly([-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h])], 1, { width: 1.6, color: C.ink, boil: 12, t, seed })
  ctx.font = `400 92px ${FONT.en}`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(42,29,20,0.9)'
  ctx.fillText(year, 0, h * 0.58)
  ctx.restore()
}

function drawDuizhaoji(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { lift: 0.08 })
  const lt = Math.max(0, t - T.dui)
  const a = prog(t, T.dui, T.album)
  const cx = 620, cy = 310, R = 205
  const R0 = revs(t)
  const shake = a * a * a
  ctx.save()
  camera(ctx, 1 + 0.07 * a * a + 0.018 * beatPulse(t, 9), cx, cy, 8 * shake * Math.sin(t * 41), 6 * shake * Math.cos(t * 37), 0.04 * shake * Math.sin(t * 9))
  const st = chalk({ t, boil: lerp(8, 24, a) })
  // moon phases on a tilted orbit — back half
  const moons = Array.from({ length: 9 }, (_, i) => {
    const ang = (i / 9) * TAU + R0 * 0.35 * TAU
    const z = Math.sin(ang)
    const mx = cx + Math.cos(ang) * 480, my = cy + z * 110 - Math.cos(ang) * 60
    return { i, z, mx, my, ph: fract(i / 9 + R0 * 0.12) }
  })
  const mApp = ease.outCubic(prog(t, T.dui, 229.3))
  const drawMoons = (front: boolean) => {
    for (const m of moons) {
      if ((m.z > 0) !== front) continue
      const r = 13 + 6 * m.z
      const ph = Math.abs(m.ph * 2 - 1) // 1 → new … 0 → full
      moon(ctx, m.mx, m.my, r, { alpha: mApp * (0.55 + 0.35 * (m.z + 1) / 2), glow: 0.5, phase: ph * 0.95, t })
    }
  }
  drawMoons(false)
  // a vortex of her words and years, pulled into the clock faster and faster
  {
    const A = glyphAtlas(VORTEX_CORPUS, 32, FONT.kai, '#dfe5f2')
    const chars = [...VORTEX_CORPUS]
    const va = ease.outCubic(prog(t, T.dui, 229.5))
    for (let i = 0; i < 520; i++) {
      const f0 = fract(rand(i, 21) + lt * (0.08 + 0.5 * a * a) * (0.6 + rand(i, 22)))
      const r = lerp(760, 40, f0)
      const ang = rand(i, 23) * TAU + R0 * TAU * (0.15 + 60 / (r + 40)) + f0 * 4
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.42 - Math.cos(ang) * r * 0.08
      const sz = (12 + 22 * (r / 760)) * (0.7 + rand(i, 24) * 0.6)
      const al = va * (0.15 + 0.6 * Math.sin(Math.PI * f0)) * (0.5 + 0.5 * a)
      const ci = A.index.get(chars[i % chars.length])
      if (ci === undefined || al <= 0.01) continue
      ctx.globalAlpha = al
      const d = A.cell * (sz / 32)
      ctx.drawImage(A.canvas, (ci % A.cols) * A.cell, Math.floor(ci / A.cols) * A.cell, A.cell, A.cell, x - d / 2, y - d / 2, d, d)
    }
    ctx.globalAlpha = 1
  }
  // clock face
  const cp = beatSteps(t, T.dui, 1, 0.45)
  const ticks: Poly[] = Array.from({ length: 12 }, (_, k) => {
    const an = (k / 12) * TAU
    const r0 = k % 3 === 0 ? R - 34 : R - 22
    return [cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, cx + Math.cos(an) * (R - 8), cy + Math.sin(an) * (R - 8)]
  })
  penDraw(ctx, [sketchEllipse(cx, cy, R, R, 3, 0.06), sketchEllipse(cx, cy, R + 14, R + 14, 4, 0.05), ...ticks], cp, { ...st, width: 2.2 })
  // hands with motion fan
  if (cp > 0.5) {
    const w = revRate(t) / 24 // revolutions per frame
    const ghosts = Math.min(28, 1 + Math.floor(w * 40))
    for (let g = ghosts - 1; g >= 0; g--) {
      const back = (g / Math.max(1, ghosts)) * Math.min(0.95, w)
      const am = (R0 - back) * TAU - Math.PI / 2
      const ah = ((R0 - back) / 12) * TAU - Math.PI / 2 + 1.2
      const ga = g === 0 ? 1 : 0.32 * (1 - g / ghosts)
      penStroke(ctx, [cx, cy, cx + Math.cos(am) * (R - 40), cy + Math.sin(am) * (R - 40)], 1, { width: 3, color: C.lineNight, alpha: ga, boil: 0, wobble: 0.6, nib: false })
      penStroke(ctx, [cx, cy, cx + Math.cos(ah) * (R - 90), cy + Math.sin(ah) * (R - 90)], 1, { width: 4.5, color: C.lineNight, alpha: ga, boil: 0, wobble: 0.6, nib: false })
    }
    ctx.fillStyle = C.lineNight
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill()
  }
  drawMoons(true)
  // tear-off calendar: years
  const padX = 1330, padY = 130
  const flipped = FLIPS.filter((f) => t >= f).length
  const calP = beatSteps(t, T.dui, 1, 0.3)
  if (calP > 0) {
    // the pad's thickness
    penDraw(ctx, [sketchLine(padX - 115, padY + 284, padX + 115, padY + 286, 91, 0), sketchLine(padX - 113, padY + 290, padX + 117, padY + 292, 92, 0)], calP, { ...st, width: 1.4, alpha: 0.6 })
    calendarPage(ctx, t, padX, padY, 0.03, YEARS[Math.min(YEARS.length - 1, flipped)], calP, 7)
  }
  for (let k = 0; k < flipped; k++) {
    const dt = t - FLIPS[k]
    if (dt > 1.5) continue
    const fx = padX - 700 * dt * (1 + 0.3 * rand(k, 3)) - 120 * dt * dt
    const fy = padY - 260 * dt + 520 * dt * dt
    calendarPage(ctx, t, fx, fy, 0.03 - dt * (2.2 + rand(k, 4) * 2), YEARS[k], (1 - dt / 1.5), 30 + k)
  }
  // flying 稿纸 sheets, more and faster
  const N = 30
  for (let j = 0; j < N; j++) {
    const s0 = T.dui + 4.6 * Math.sqrt(j / N)
    const dur = 1.7 - 1.1 * (j / N)
    const u = (t - s0) / dur
    if (u <= 0 || u >= 1) continue
    const z = 0.5 + rand(j, 5) * 0.8
    const x = lerp(W + 160, -260, u) + (rand(j, 6) - 0.5) * 200
    const y = 60 + rand(j, 7) * 480 + Math.sin(u * 5 + j) * 30
    const sw = 70 * z, sh = 92 * z
    ctx.save()
    ctx.translate(x, y); ctx.rotate(u * (3 + rand(j, 8) * 5) * (rand(j, 9) < 0.5 ? -1 : 1))
    wash(ctx, [poly([-sw / 2, -sh / 2], [sw / 2, -sh / 2], [sw / 2, sh / 2], [-sw / 2, sh / 2])], 'rgb(220,210,188)', { alpha: 0.75, blur: 1, edge: 0.1 })
    ctx.strokeStyle = 'rgba(179,52,58,0.55)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    for (let c = 1; c < 5; c++) { ctx.moveTo(-sw / 2 + (c * sw) / 5, -sh / 2 + 4); ctx.lineTo(-sw / 2 + (c * sw) / 5, sh / 2 - 4) }
    for (let r = 1; r < 6; r++) { ctx.moveTo(-sw / 2 + 3, -sh / 2 + (r * sh) / 6); ctx.lineTo(sw / 2 - 3, -sh / 2 + (r * sh) / 6) }
    ctx.stroke()
    ctx.font = `400 ${Math.round(sh * 0.5)}px ${FONT.kai}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(36,26,20,0.85)'
    ctx.fillText(QUOTE_DZ[j % QUOTE_DZ.length], 0, 2)
    penStroke(ctx, poly([-sw / 2, -sh / 2], [sw / 2, -sh / 2], [sw / 2, sh / 2], [-sw / 2, sh / 2]), 1, { width: 1.1, color: C.ink, alpha: 0.7, boil: 12, t, seed: j, nib: false })
    ctx.restore()
  }
  // the edge of chaos: streaks rushing out of the clock
  const ch = prog(t, 231.3, T.album)
  if (ch > 0) {
    ctx.save()
    ctx.lineCap = 'round'
    for (let i = 0; i < 160; i++) {
      const an = rand(i, 11) * TAU
      const sp = 0.6 + rand(i, 12) * 1.4
      const d = fract(rand(i, 13) + lt * sp * (0.4 + ch * 1.6))
      const r0 = 120 + d * 1300
      const L = (30 + 260 * ch) * (0.4 + d)
      ctx.strokeStyle = `rgba(201,211,230,${0.5 * ch * (1 - d * 0.6)})`
      ctx.lineWidth = 0.6 + rand(i, 14) * 1.6
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0 * 0.7)
      ctx.lineTo(cx + Math.cos(an) * (r0 + L), cy + Math.sin(an) * (r0 + L) * 0.7)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
  // final half-beat: everything bleaches into a hum
  const wo = prog(t, 232.85, T.album + 0.1)
  if (wo > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(200,206,220,${0.5 * wo * wo})`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  bookTitle(ctx, t, '《对照记》', 228.6, 233.3, true)
}

// ───────────────────────────── photographs ─────────────────────────────
/** Deckled border outline for a w×h print, centred at origin. */
function deckle(w: number, h: number, seed: number): Poly {
  const o: Poly = []
  const step = 7
  const edge = (x0: number, y0: number, x1: number, y1: number, k: number) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(L / step))
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L
    for (let i = 0; i < n; i++) {
      const u = i / n
      const d = (i % 2 ? 1.6 : -1.2) + (rand(i + k * 300, seed) - 0.5) * 2.2
      o.push(lerp(x0, x1, u) + nx * d, lerp(y0, y1, u) + ny * d)
    }
  }
  edge(-w / 2, -h / 2, w / 2, -h / 2, 0); edge(w / 2, -h / 2, w / 2, h / 2, 1); edge(w / 2, h / 2, -w / 2, h / 2, 2); edge(-w / 2, h / 2, -w / 2, -h / 2, 3)
  o.push(o[0], o[1])
  return o
}
function fillPoly(ctx: Ctx, p: Poly) {
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath()
}

/** A print: shadow, white deckled border, sepia image area with `inner` drawn clipped, mounting corners. */
function photo(ctx: Ctx, t: number, o: { x: number; y: number; w: number; h: number; rot: number; appear: number; margin?: number; corners?: boolean; tape?: boolean; seed: number; night?: boolean; mono?: boolean; sheen?: number }, inner: (iw: number, ih: number) => void) {
  if (o.appear <= 0) return
  const k = ease.outCubic(clamp(o.appear))
  const m = o.margin ?? 14
  ctx.save()
  ctx.translate(o.x, o.y - (1 - k) * 24)
  ctx.rotate(o.rot + (1 - k) * 0.06)
  const sc = lerp(1.05, 1, k)
  ctx.scale(sc, sc)
  ctx.globalAlpha *= k
  const border = deckle(o.w, o.h, o.seed)
  // shadow
  ctx.save()
  ctx.filter = 'blur(9px)'
  ctx.fillStyle = o.night ? 'rgba(0,0,0,0.55)' : 'rgba(60,38,20,0.32)'
  ctx.translate(8, 12)
  fillPoly(ctx, border); ctx.fill()
  ctx.restore()
  // border paper
  ctx.fillStyle = o.mono ? 'rgb(242,241,236)' : 'rgb(240,232,214)'
  fillPoly(ctx, border); ctx.fill()
  // image
  const iw = o.w - 2 * m, ih = o.h - 2 * m
  ctx.save()
  ctx.beginPath(); ctx.rect(-iw / 2, -ih / 2, iw, ih); ctx.clip()
  const g = ctx.createLinearGradient(0, -ih / 2, 0, ih / 2)
  if (o.mono) { g.addColorStop(0, 'rgb(176,178,180)'); g.addColorStop(1, 'rgb(122,124,128)') } else { g.addColorStop(0, 'rgb(186,158,120)'); g.addColorStop(1, 'rgb(150,120,88)') }
  ctx.fillStyle = g
  ctx.fillRect(-iw / 2, -ih / 2, iw, ih)
  ctx.save(); ctx.translate(-iw / 2, -ih / 2); inner(iw, ih); ctx.restore()
  // photographic vignette
  const v = ctx.createRadialGradient(0, -ih * 0.05, Math.min(iw, ih) * 0.25, 0, 0, Math.max(iw, ih) * 0.75)
  if (o.mono) { v.addColorStop(0, 'rgba(250,250,252,0.10)'); v.addColorStop(1, 'rgba(20,22,26,0.5)') } else { v.addColorStop(0, 'rgba(255,240,210,0.10)'); v.addColorStop(1, 'rgba(60,38,22,0.45)') }
  ctx.fillStyle = v
  ctx.fillRect(-iw / 2, -ih / 2, iw, ih)
  if (o.mono) {
    // silver sheen: a slow diagonal glint across the gelatin surface
    const sx = lerp(-iw * 1.2, iw * 1.2, o.sheen ?? 0.5)
    const sg = ctx.createLinearGradient(sx - 120, -ih / 2, sx + 120, ih / 2)
    sg.addColorStop(0, 'rgba(235,240,250,0)'); sg.addColorStop(0.5, 'rgba(235,240,250,0.13)'); sg.addColorStop(1, 'rgba(235,240,250,0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = sg
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
  penStroke(ctx, poly([-iw / 2, -ih / 2], [iw / 2, -ih / 2], [iw / 2, ih / 2], [-iw / 2, ih / 2]), 1, { width: 0.8, color: o.mono ? 'rgb(60,62,66)' : 'rgb(90,64,40)', alpha: 0.5, boil: 0, nib: false })
  penStroke(ctx, border, 1, { width: 1, color: o.night ? 'rgb(120,110,96)' : C.inkSoft, alpha: 0.6, boil: 0, wobble: 0.3, nib: false })
  if (o.corners) {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = (sx * o.w) / 2, cy = (sy * o.h) / 2
      wash(ctx, [poly([cx + sx * 6, cy + sy * 6], [cx - sx * 34, cy + sy * 6], [cx + sx * 6, cy - sy * 34])], 'rgb(46,32,24)', { alpha: 0.85, blur: 0.8, edge: 0.3 })
    }
  }
  if (o.tape) {
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.translate((sx * o.w) / 2 - sx * 6, -o.h / 2 + 4)
      ctx.rotate(sx * 0.72 + (rand(o.seed, sx + 3) - 0.5) * 0.2)
      const tp = poly([-46, -13], [46, -12], [47, 13], [-45, 14])
      wash(ctx, [tp], 'rgb(236,214,160)', { alpha: 0.55, blur: 1, edge: 0.5 })
      penDraw(ctx, [[-46, -13, -43, -6, -47, 0, -44, 7, -45, 14], [46, -12, 49, -5, 45, 1, 48, 8, 47, 13]], 1, { width: 0.9, color: 'rgb(120,96,60)', alpha: 0.6, boil: 0, nib: false })
      ctx.restore()
    }
  }
  ctx.restore()
}

// ───────────────────────────── F2a · the album ─────────────────────────────
const SEPIA = 'rgb(52,34,22)'
type PhotoSpec = { x: number; y: number; w: number; h: number; rot: number; at: number; pose: EileenPose; scene: string; fig: [number, number, number]; cap: string }

/** The open album, drawn once (offset +100,+60 inside the canvas so the camera can pan). */
function albumBase() {
  return cached('F:album', W + 200, H + 120, (g) => {
    g.translate(100, 60)
    const L = poly([140, 40], [955, 52], [948, 700], [128, 690])
    const Rp = poly([965, 52], [1785, 38], [1800, 690], [972, 700])
    // cloth cover peeking out around the pages
    wash(g, [poly([96, 14], [1830, 6], [1846, 730], [84, 726])], 'rgb(88,58,40)', { alpha: 0.75, blur: 3, edge: 0.4 })
    hatch(g, [poly([96, 14], [1830, 6], [1846, 730], [84, 726])], { angle: 0.78, gap: 7, cross: true, color: 'rgb(40,24,16)', alpha: 0.22, width: 0.8, wobble: 0.4 })
    wash(g, [L, Rp], 'rgb(244,236,216)', { alpha: 0.96, blur: 2, edge: 0.15 })
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(130,96,60,${0.06 + rand(i, 41) * 0.12})`
      g.beginPath(); g.arc(140 + rand(i, 42) * 1650, 50 + rand(i, 43) * 640, 0.6 + rand(i, 44) * 1.8, 0, TAU); g.fill()
    }
    // gutter shadow
    const gg = g.createLinearGradient(880, 0, 1040, 0)
    gg.addColorStop(0, 'rgba(90,60,36,0)'); gg.addColorStop(0.5, 'rgba(90,60,36,0.28)'); gg.addColorStop(1, 'rgba(90,60,36,0)')
    g.fillStyle = gg; g.fillRect(880, 46, 160, 656)
    hatch(g, [poly([915, 52], [1005, 52], [1005, 700], [915, 700])], { angle: 1.5, gap: 6, color: C.inkSoft, alpha: 0.16, width: 1 })
    const alb = { width: 1.5, color: C.inkSoft, alpha: 0.7, boil: 0 }
    penDraw(g, [L, Rp, sketchLine(960, 46, 962, 702, 3, 0), sketchLine(132, 46, 120, 696, 4), sketchLine(124, 50, 112, 700, 5), sketchLine(1792, 42, 1808, 694, 6), sketchLine(1800, 46, 1816, 698, 7), sketchLine(136, 694, 950, 704, 8), sketchLine(970, 704, 1802, 694, 9)], 1, alb)
    // a loose leaf of glassine and the book's title on the flyleaf corner
    g.font = `400 30px ${FONT.kai}`
    g.fillStyle = 'rgba(70,50,34,0.55)'
    g.textAlign = 'left'
    g.fillText('对照记', 176, 96)
  })
}

const ALBUM: PhotoSpec[] = [
  { cap: '一九二四', x: 360, y: 300, w: 230, h: 300, rot: -0.07, at: T.album, pose: 'child', scene: 'M 0 228 L 230 222 M 150 230 L 152 120 L 196 118 L 198 230 M 150 160 L 198 158', fig: [0.42, 0.93, 0.72] },
  { cap: '一九三七', x: 720, y: 236, w: 280, h: 220, rot: 0.05, at: 234.243, pose: 'girlWindow', scene: 'M 160 10 L 270 10 L 270 120 L 160 122 Z M 215 10 L 215 121 M 160 66 L 270 65 M 0 190 L 280 186', fig: [0.38, 0.92, 0.78] },
  { cap: '一九四四', x: 1110, y: 330, w: 240, h: 330, rot: -0.035, at: 235.288, pose: 'youngStand', scene: 'M 30 0 L 32 300 M 30 40 C 80 30 140 30 190 42 L 192 300 M 0 296 L 240 290', fig: [0.5, 0.95, 0.86] },
  { cap: '一九五五', x: 1480, y: 262, w: 250, h: 300, rot: 0.07, at: 236.356, pose: 'shipRail', scene: 'M 0 120 C 80 116 160 118 250 114 M 0 200 L 250 186 M 0 230 L 250 214 M 40 200 L 40 300 M 120 196 L 120 300 M 200 190 L 200 300', fig: [0.5, 0.97, 0.8] },
]

function drawAlbum(ctx: Ctx, t: number) {
  oldPaper(ctx, t, { sepia: 0.42, stains: 0.4 })
  const u = prog(t, T.album, T.portrait + 1)
  ctx.save()
  camera(ctx, 1.02 + 0.04 * ease.inOutSine(u), 960, 340, lerp(150, -150, ease.inOutSine(u)), lerp(10, -10, u), -0.03)
  // the album (static, cached): two pages, gutter, page stacks, cloth spine
  ctx.globalAlpha = ease.outCubic(prog(t, T.album - 0.3, T.album + 0.5))
  ctx.drawImage(albumBase(), -100, -60)
  ctx.globalAlpha = 1
  // the prints
  ALBUM.forEach((p, i) => {
    const ap = prog(t, p.at, p.at + 0.45)
    const dp = ease.inOutSine(prog(t, p.at + 0.2, p.at + 1.9))
    const fl = prog(t, p.at + 1.2, p.at + 2.2)
    photo(ctx, t, { x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rot, appear: ap, corners: i % 2 === 0, tape: i % 2 === 1, seed: 20 + i }, (iw, ih) => {
      penDraw(ctx, P(p.scene), dp, { width: 1.1, color: SEPIA, alpha: 0.35, boil: 4, t })
      // she surfaces out of her own words, then the drawn trace settles over them
      textImage(ctx, {
        key: `F:albumFig${i}`, cell: 7, color: 'rgb(48,30,18)', emerge: ease.inOutSine(prog(t, p.at + 0.15, p.at + 1.6)), order: 'sweepYUp', scatter: 30, t, gamma: 1.5, alpha: 0.95, seed: 40 + i,
        draw: (m) => {
          eileen(m, p.pose, { x: iw * p.fig[0], y: ih * p.fig[1], h: ih * p.fig[2], color: '#fff', dress: '#8a8a8a', fill: 1, weight: 3, boil: 0 })
          penDraw(m, P(p.scene), 1, { width: 3, color: '#777', boil: 0 })
        },
      })
      eileen(ctx, p.pose, { x: iw * p.fig[0], y: ih * p.fig[1], h: ih * p.fig[2], progress: dp, fill: fl * 0.5, t, color: SEPIA, dress: 'rgb(96,70,50)', boil: 4, weight: 0.7, alpha: 0.55 })
    })
    // pencilled caption under the print
    const ca = prog(t, p.at + 0.9, p.at + 1.6)
    if (ca > 0) {
      ctx.save()
      ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.6)
      ctx.font = `400 26px ${FONT.kai}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(70,52,38,${0.75 * ca})`
      const chars = [...p.cap]
      const n = Math.ceil(chars.length * ca)
      ctx.fillText(chars.slice(0, n).join(''), 0, p.h / 2 + 34)
      ctx.restore()
    }
  })
  // a glassine interleaf turning over the spread
  const tp = ease.inOutSine(prog(t, 237.424, 238.95))
  if (tp > 0 && tp < 1) {
    const xe = lerp(1790, 130, tp)
    const bow = 40 * Math.sin(Math.PI * tp)
    const leaf = cr([[962, 48], [lerp(962, xe, 0.5), 40 - bow], [xe, 46 - bow * 0.6]]).concat(cr([[xe, 696 + bow * 0.6], [lerp(962, xe, 0.5), 704 + bow], [962, 700]]))
    leaf.push(962, 48)
    ctx.save()
    ctx.globalAlpha *= 0.85
    wash(ctx, [leaf], 'rgb(252,249,240)', { alpha: 0.62, blur: 2, edge: 0.6 })
    hatch(ctx, [leaf], { angle: 1.45, gap: 22, color: 'rgb(255,255,255)', alpha: 0.35, width: 2, t, boil: 4 })
    penStroke(ctx, leaf, 1, { width: 1.3, color: C.inkSoft, alpha: 0.6, boil: 4, t, nib: false })
    ctx.restore()
  }
  ctx.restore()
  // the album lies open under a desk lamp on a dark table; the pool drifts with the page we are reading
  const lx = lerp(560, 1260, ease.inOutSine(prog(t, T.album, T.portrait)))
  darkRoom(ctx, [{ x: lx, y: 250, r: 1100, k: 1, sy: 0.6 }, { x: lx + 300, y: 300, r: 600, k: 0.4 }], 0.85)
}

// ───────────────────────────── F2b · the portrait ─────────────────────────────
function drawPortrait(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { lift: 0.1 })
  const u = prog(t, T.portrait, T.room + 1.2)
  ctx.save()
  // other prints from the album, adrift in the dark (behind, slower)
  ctx.save()
  camera(ctx, 1 + 0.03 * u, 960, 400, lerp(40, -40, u))
  const bg = prog(t, T.portrait + 0.4, T.portrait + 2)
  photo(ctx, t, { x: 1420, y: 470, w: 200, h: 250, rot: 0.16, appear: bg * 0.55, seed: 91, night: true }, (iw, ih) => {
    eileen(ctx, 'shipRail', { x: iw * 0.5, y: ih * 0.97, h: ih * 0.8, t, color: SEPIA, dress: 'rgb(96,70,50)', boil: 0, weight: 0.8 })
  })
  photo(ctx, t, { x: 210, y: 150, w: 210, h: 170, rot: -0.2, appear: bg * 0.45, seed: 92, night: true }, (iw, ih) => {
    eileen(ctx, 'child', { x: iw * 0.4, y: ih * 0.95, h: ih * 0.75, t, color: SEPIA, dress: 'rgb(96,70,50)', boil: 0, weight: 0.8 })
  })
  ctx.restore()
  // slow push toward her face; zoom about the print's lower edge so the border never sinks into the subtitles
  const push = ease.inOutSine(prog(t, T.portrait + 0.6, T.room + 1.2))
  camera(ctx, 1 + 0.12 * push, 740, 590, lerp(-24, 16, u), 0)
  const ma = ease.inOutSine(prog(t, T.portrait, 240.6))
  moon(ctx, 1110, 170, 84, { alpha: ma, glow: ma, t })
  // stroke by stroke over ~2 bars, then the silver tones come up
  const dp = ease.inOutSine(prog(t, T.portrait + 0.3, 243.1))
  const fl = ease.inOutSine(prog(t, 242.5, 244.2))
  photo(ctx, t, { x: 760, y: 304, w: 470, h: 572, rot: -0.025, appear: prog(t, T.portrait - 0.2, T.portrait + 0.6), margin: 20, tape: true, seed: 77, night: true, mono: true, sheen: prog(t, 242.6, 245.6) }, (iw, ih) => {
    // studio light falling from the moon's side
    const g = ctx.createRadialGradient(iw * 0.72, ih * 0.15, 10, iw * 0.6, ih * 0.3, iw)
    g.addColorStop(0, `rgba(246,246,244,${0.12 + 0.25 * fl})`); g.addColorStop(1, 'rgba(246,246,244,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, iw, ih)
    eileen(ctx, 'iconic', { x: iw * 0.5, y: ih + 6, h: 530, progress: dp, fill: fl, t, color: 'rgb(28,29,32)', dress: 'rgb(70,72,76)', boil: 6, mono: true } as Parameters<typeof eileen>[2])
  })
  // moon glow spilling over the print's edge
  if (ma > 0) glowAt(ctx, 1090, 180, 260, 'rgba(243,217,164,ALPHA)', 0.16 * ma)
  ctx.restore()
}

// ───────────────────────────── F3 · Los Angeles, September 1995 ─────────────────────────────
const ROOM_WALLS: Poly[] = [sketchLine(1180, -20, 1184, 500, 1, 0), sketchLine(1184, 500, -40, 610, 2, 0), sketchLine(1184, 500, 1840, 584, 3, 0), sketchLine(1180, 22, -40, -70, 4, 0), sketchLine(1180, 22, 1840, -36, 5, 0)]
const ROOM_WINDOW: Poly[] = [poly([360, 100], [720, 126], [720, 424], [360, 440]), sketchLine(540, 113, 540, 432, 6, 0), sketchLine(360, 270, 720, 274, 7, 0), sketchLine(346, 454, 734, 436, 8, 6)]
const ROOM_COT: Poly[] = [
  poly([1252, 452], [1662, 494], [1642, 560], [1216, 514]),
  cr([[1226, 506], [1430, 532], [1636, 552]]),
  sketchLine(1240, 516, 1300, 596, 11, 0), sketchLine(1300, 518, 1240, 598, 12, 0),
  sketchLine(1560, 552, 1620, 600, 13, 0), sketchLine(1620, 556, 1560, 604, 14, 0),
  cr([[1268, 466], [1300, 452], [1352, 458], [1368, 476], [1330, 488], [1280, 484], [1268, 466]]),
  cr([[1470, 480], [1560, 486], [1650, 500]]), cr([[1452, 530], [1540, 540], [1630, 552]]), sketchLine(1470, 480, 1452, 530, 15, 0),
]
const ROOM_BOX: Poly[] = [
  poly([1030, 456], [1140, 456], [1140, 534], [1030, 534]), poly([1030, 456], [1062, 438], [1170, 438], [1140, 456]), sketchLine(1140, 534, 1170, 512, 21, 0), sketchLine(1170, 438, 1170, 512, 22, 0),
  sketchEllipse(1096, 446, 22, 6, 23), cr([[1096, 444], [1102, 400], [1120, 362], [1100, 338], [1074, 344]]),
  P('M 1060 330 L 1100 350 L 1074 380 L 1044 352 Z')[0],
]
const ROOM_PAPERS: Poly[] = [poly([880, 566], [972, 556], [990, 586], [896, 598]), poly([960, 592], [1040, 578], [1066, 604], [984, 612])]
const winAt = (u: number, v: number): [number, number] => [lerp(360, 720, v), lerp(lerp(100, 126, v), lerp(440, 424, v), u)]
const ROOM_BLINDS: Poly[] = (() => {
  const o: Poly[] = []
  for (let i = 1; i <= 15; i++) {
    const u = (i / 15) * 0.6
    const a = winAt(u, 0), b = winAt(u, 1)
    o.push(sketchLine(a[0] + 4, a[1], b[0] - 4, b[1], 600 + i, 0))
  }
  const a = winAt(0.62, 0), b = winAt(0.62, 1)
  o.push(sketchLine(a[0], a[1], b[0], b[1], 620, 2), sketchLine(a[0], a[1] + 5, b[0], b[1] + 5, 621, 2))
  o.push(sketchLine(450, 105, 452, 330, 622, 0), sketchLine(452, 330, 448, 360, 623, 0), sketchEllipse(448, 364, 3, 5, 624))
  return o
})()
const ROOM_BOXES: Poly[] = [
  poly([780, 446], [930, 446], [930, 552], [780, 552]), poly([780, 446], [806, 432], [956, 432], [930, 446]), sketchLine(930, 552, 956, 536, 31, 0), sketchLine(956, 432, 956, 536, 32, 0),
  sketchLine(780, 476, 930, 476, 33, 0), sketchLine(855, 446, 855, 476, 34, 0),
  poly([800, 380], [910, 384], [912, 446], [800, 446]), poly([800, 380], [820, 370], [930, 372], [910, 384]), sketchLine(930, 372, 932, 436, 35, 0),
  // a paper grocery bag, folded over
  poly([1690, 520], [1760, 516], [1770, 600], [1694, 604]), cr([[1690, 520], [1706, 508], [1726, 514], [1744, 504], [1760, 516]]), sketchLine(1706, 540, 1750, 538, 36, 0),
]

/** LA room wallpaper (faint stripes + sprigs), cached. */
function roomPaper() {
  return cached('F:roomPaper', W, H, (g) => {
    const L = [poly([-40, -70], [1180, 22], [1184, 500], [-40, 610])]
    const R = [poly([1180, 22], [1840, -36], [1840, 584], [1184, 500])]
    hatch(g, L, { angle: 1.62, gap: 26, color: C.lineNight, alpha: 0.07, width: 1.2, wobble: 0.6, seed: 2 })
    hatch(g, R, { angle: 1.5, gap: 22, color: C.lineNight, alpha: 0.06, width: 1.2, wobble: 0.6, seed: 4 })
    for (let i = 0; i < 160; i++) {
      const x = rand(i, 51) * 1820, y = rand(i, 52) * 560
      g.strokeStyle = `rgba(201,211,230,${0.05 + rand(i, 53) * 0.05})`
      g.lineWidth = 1
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - 6, x + 2, y - 12); g.moveTo(x + 2, y - 6); g.lineTo(x + 7, y - 9); g.stroke()
    }
    // the corner's shadow
    const gr = g.createLinearGradient(1060, 0, 1180, 0)
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.22)')
    g.fillStyle = gr; g.fillRect(1060, 0, 124, 520)
  })
}

function drawRoom(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { lift: 0.05 })
  const tf = Math.min(t, T.drop) // time stops at the drop
  const fade = 1 - 0.85 * ease.inOutSine(prog(t, 249.8, T.end))
  ctx.save()
  camera(ctx, 1 + 0.05 * ease.outCubic(prog(tf, T.room, T.drop)), 900, 330, lerp(30, 0, prog(tf, T.room, T.drop)))
  const st = { width: 1.6, color: C.lineNight, boil: t < T.drop ? 5 : 0, t: tf, alpha: 0.7 * fade, wobble: 1 }
  // moon through the window — it stays
  const ma = ease.inOutSine(prog(t, 245.6, 247.2))
  ctx.save()
  fillPoly(ctx, ROOM_WINDOW[0]); ctx.clip()
  moon(ctx, 610, 222, 38, { alpha: ma, glow: ma * 0.9, t: tf })
  ctx.restore()
  glowAt(ctx, 600, 240, 380, 'rgba(243,217,164,ALPHA)', 0.06 * ma)
  const wpP = ease.inOutSine(prog(t, T.room, 246.8))
  ctx.save(); ctx.globalAlpha = wpP * fade; ctx.drawImage(roomPaper(), 0, 0); ctx.restore()
  penDraw(ctx, ROOM_WALLS, ease.inOutSine(prog(t, T.room, 246.5)), { ...st, alpha: 0.5 * fade })
  penDraw(ctx, ROOM_WINDOW, ease.inOutSine(prog(t, 245.6, 246.9)), st)
  penDraw(ctx, ROOM_BLINDS, ease.inOutSine(prog(t, 245.9, 247.0)), { ...st, width: 1.2, alpha: 0.55 * fade })
  // moonlight on the floor, barred by the blinds
  const lp = ease.inOutSine(prog(t, 246.4, 247.6))
  if (lp > 0) {
    const near = [[660, 614], [980, 598]], far = [[520, 556], [800, 534]]
    const at = (u: number, v: number) => [lerp(lerp(near[0][0], near[1][0], v), lerp(far[0][0], far[1][0], v), u), lerp(lerp(near[0][1], near[1][1], v), lerp(far[0][1], far[1][1], v), u)]
    const bands: Poly[] = []
    bands.push(poly(at(0, 0), at(0, 1), at(0.38, 1), at(0.38, 0)))
    for (let k = 0; k < 7; k++) {
      const u0 = 0.42 + k * 0.083, u1 = u0 + 0.05
      bands.push(poly(at(u0, 0), at(u0, 1), at(u1, 1), at(u1, 0)))
    }
    wash(ctx, bands, 'rgb(200,212,236)', { alpha: 0.08 * lp * (0.4 + 0.6 * fade), blur: 6, edge: 0 })
    // the barred moonlight on the floor is written: 一个有月亮的晚上
    textImage(ctx, {
      key: 'F:laFloor', corpus: '三十年前的上海一个有月亮的晚上', cell: 13, color: 'rgb(222,230,248)', emerge: lp, order: 'sweepX', scatter: 30, t: tf, gamma: 1.2, alpha: 0.9 * (0.45 + 0.55 * fade), seed: 9,
      draw: (m) => { m.fillStyle = '#bbb'; for (const b of bands) { fillPoly(m, b); m.fill() } },
    })
  }
  penDraw(ctx, ROOM_COT, ease.inOutSine(prog(t, 246.1, 247.4)), st)
  const cotP = ease.inOutSine(prog(t, 246.4, 247.5))
  if (cotP > 0) hatch(ctx, [poly([1470, 480], [1650, 500], [1630, 552], [1452, 530])], { angle: 0.3, gap: 7, progress: cotP, color: C.lineNight, alpha: 0.3 * fade, width: 1, t: tf, boil: st.boil })
  penDraw(ctx, ROOM_BOXES, ease.inOutSine(prog(t, 246.3, 247.4)), { ...st, alpha: 0.6 * fade })
  // the lamp left on
  const on = ease.outCubic(prog(t, 247.2, 247.8))
  if (on > 0) {
    glowAt(ctx, 1072, 372, 300, 'rgba(196,214,250,ALPHA)', 0.22 * on)
    wash(ctx, [poly([1044, 356], [1076, 384], [1180, 540], [960, 560])], 'rgb(200,214,244)', { alpha: 0.1 * on * fade, blur: 12 })
  }
  penDraw(ctx, ROOM_BOX, ease.inOutSine(prog(t, 246.6, 247.6)), st)
  penDraw(ctx, ROOM_PAPERS, ease.inOutSine(prog(t, 247.0, 247.7)), { ...st, alpha: 0.5 * fade })
  ctx.restore()
}

// ───────────────────────────── scenes ─────────────────────────────
export const scenes: Scene[] = [
  { id: 'F1a-red-rose', t0: T.rose, t1: T.white, theme: 'night',trans: { kind: 'flash', dur: 0.35 }, draw: (ctx, t) => drawRedRose(ctx, t) },
  { id: 'F1b-white-rose', t0: T.white, t1: T.ban, theme: 'night', draw: (ctx, t) => drawWhiteRose(ctx, t) },
  { id: 'F1c-banshengyuan', t0: T.ban, t1: T.yi, theme: 'night',draw: (ctx, t) => drawBanshengyuan(ctx, t) },
  { id: 'F1d-gengyiji', t0: T.yi, t1: T.dui, theme: 'night',draw: (ctx, t) => drawGengyiji(ctx, t) },
  { id: 'F1e-time', t0: T.dui, t1: T.album, theme: 'night', draw: (ctx, t) => drawDuizhaoji(ctx, t) },
  { id: 'F2a-album', t0: T.album, t1: T.portrait, theme: 'night',trans: { kind: 'dissolve', dur: 0.7 }, draw: (ctx, t) => drawAlbum(ctx, t) },
  { id: 'F2b-portrait', t0: T.portrait, t1: T.room, theme: 'night', trans: { kind: 'dissolve', dur: 1.0 }, draw: (ctx, t) => drawPortrait(ctx, t) },
  { id: 'F3-room', t0: T.room, t1: T.end, theme: 'night', trans: { kind: 'dissolve', dur: 1.4 }, draw: (ctx, t) => drawRoom(ctx, t) },
]
void H
