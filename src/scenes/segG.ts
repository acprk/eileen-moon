/**
 * Segment G · 252.331–300.4 s · the Pacific · the last moon · credits (owner: AG).
 *
 *  G1+G2 252.33–277.0  the Pacific at night, a sea woven of her titles and her characters' names; ashes drift down
 *                      onto the water (252.6 / 255.6 / 259.2, with the sung lines); from 265.2 the moon sets into the
 *                      sea, its reflection thins — at 「完不了」 a warm thread stays on the water and the names in it
 *                      keep their light
 *  G3    277.0–284.0   title reprise; above it only the pen circle of the first shot, empty
 *  G4    284.0–300.4   end credits, reference style; the circle shrinks to a tiny moon that stays to the end
 */
import { C, DUR, FONT, H, W } from '../config'
import { LINES_OF_CODE } from '../data/credits'
import { moon, nightPaper } from '../lib/ground'
import { TAU, clamp, ease, lerp, prog, rand, smoothstep } from '../lib/math'
import type { Scene } from '../lib/film'
import { penDraw, penStroke, sketchEllipse, type Poly } from '../lib/pen'
import { cached, type Ctx } from '../lib/texture'
import { floatLines, type FloatLine } from '../lib/textmatter'
import { strokeRevealText } from './segA'

const T0 = 252.331
const T_SET0 = 265.2
const T_SET1 = 274.4
const T_CARD = 276.6 // title reprise + credits over the dark sea
const T_END = DUR // 285.5; global fade from 282.5

const HZ = 336 // horizon
const MOON_X = 900

// ───────────────────────────── the sea of words ─────────────────────────────

const WORDS = [
  '白流苏', '金锁记', '曹七巧', '倾城之恋', '范柳原', '半生缘', '顾曼桢', '沈世钧', '红玫瑰与白玫瑰', '佟振保', '王娇蕊', '孟烟鹂',
  '小团圆', '盛九莉', '第一炉香', '葛薇龙', '姜长安', '封锁', '传奇', '流言', '秧歌', '怨女', '色，戒', '王佳芝', '十八春',
  '顾曼璐', '茉莉香片', '心经', '琉璃瓦', '天才梦', '私语', '更衣记', '对照记', '赤地之恋', '海上花', '公寓生活记趣',
  'The Golden Cangue', 'Love in a Fallen City', 'The Rice-Sprout Song', 'The Rouge of the North', 'Lust, Caution', 'Little Reunions',
]
const isLatin = (w: string) => /^[A-Za-z]/.test(w)

/** widths at 100 px (cached once) */
let WIDTHS: number[] | null = null
function widths(ctx: Ctx) {
  if (WIDTHS) return WIDTHS
  ctx.save()
  WIDTHS = WORDS.map((w) => {
    ctx.font = isLatin(w) ? `italic 400 100px ${FONT.en}` : `400 100px ${FONT.kai}`
    return ctx.measureText(w).width
  })
  ctx.restore()
  return WIDTHS
}

const ROWS = 36
/** strides coprime with WORDS.length (42) so every row walks the whole list in its own order */
const STRIDES = [1, 5, 11, 13, 17, 19, 23, 25, 29, 31, 37, 41]

/** column of moonlight on the water: half-width at depth z (0 horizon … 1 front) */
function columnHalf(z: number) {
  return 34 + 230 * z
}

/**
 * Draws the text-sea into `g`. `warm` (0..1) tints the glyphs lying in the moon's column.
 */
function seaText(g: Ctx, t: number, ws: number[], reach: number) {
  g.textBaseline = 'alphabetic'
  g.textAlign = 'left'
  for (let k = 0; k < ROWS; k++) {
    const z = Math.pow((k + 1) / ROWS, 1.75)
    const y = HZ + 6 + (H + 40 - HZ) * z
    const size = 6 + 34 * z
    const sq = 0.38 + 0.4 * z // foreshortening
    const a = 0.16 + 0.42 * Math.pow(z, 0.8)
    const dir = k % 2 ? 1 : -1
    const speed = (6 + 20 * z) * dir
    const gap = size * 1.6
    let i = Math.floor(rand(k, 3) * WORDS.length)
    // each row is an endless ribbon: one pass through WORDS is exactly one period P
    let P = 0
    for (let q = 0; q < WORDS.length; q++) P += ws[q] * (size / 100) * (isLatin(WORDS[q]) ? 0.9 : 1) + gap
    const off = (((rand(k, 4) * P + t * speed) % P) + P) % P
    let x = -off
    g.save()
    g.translate(0, y)
    g.scale(1, sq)
    while (x < W + 40) {
      const wi = (i * STRIDES[k % STRIDES.length]) % WORDS.length
      const w = WORDS[wi]
      const wl = ws[wi] * (size / 100) * (isLatin(w) ? 0.9 : 1)
      if (x + wl > -20) {
        const bob = (Math.sin(t * 0.9 + k * 0.7 + x * 0.006) * 4 + Math.sin(t * 0.5 - x * 0.0021 + k)) * (0.4 + z) / sq
        // fade near the right edge (lyric rail) and the far left
        const ex = smoothstep(W - 40, W - 150, x + wl * 0.5) * smoothstep(-40, 120, x)
        // the reflection column brightens glyphs; the far end only reaches as deep as the moon is high
        const dx = Math.abs(x + wl * 0.5 - MOON_X) / columnHalf(z)
        const col = Math.pow(Math.max(0, 1 - dx), 1.3) * reach
        // swells: rolling bands of light across the water
        const cx = x + wl * 0.5
        const swell = 0.5 + 0.5 * Math.sin(cx * (0.0045 / (0.3 + z)) - t * 0.7 + k * 0.9) * Math.sin(cx * 0.0011 + t * 0.21 + k * 0.37)
        const sub = y > H * 0.74 ? 0.32 : 1
        g.font = isLatin(w) ? `italic 400 ${size * 0.9}px ${FONT.en}` : `400 ${size}px ${FONT.kai}`
        g.fillStyle = `rgba(${lerp(186, 255, col) | 0},${lerp(200, 220, col) | 0},${lerp(232, 160, col) | 0},${(a * (0.3 + 0.95 * swell) + col * 0.85) * ex * sub})`
        g.fillText(w, x, bob)
      }
      x += wl + gap
      i++
    }
    g.restore()
  }
}

/** layered wave strokes drawn with the pen between rows of words */
function waveLines(ctx: Ctx, t: number, alpha: number) {
  const polys: Poly[] = []
  for (let j = 0; j < 14; j++) {
    const z = Math.pow((j + 0.6) / 14, 1.6)
    const y = HZ + 3 + (H - HZ) * z
    if (y > H * 0.8) continue
    const amp = 1.5 + 6 * z
    const wl = 60 + 260 * z
    const x0 = rand(j, 7) * 600 - 200
    const len = 300 + 900 * rand(j, 8)
    const p: Poly = []
    for (let x = x0; x < x0 + len; x += 8) p.push(x - (t * (4 + 18 * z)) % wl, y + Math.sin((x / wl) * TAU + t * 0.8 + j) * amp)
    polys.push(p)
  }
  penDraw(ctx, polys, 1, { width: 1.0, color: C.lineNight, alpha, boil: 6, t, wobble: 0.8, seed: 31 }, 0)
}

// ───────────────────────────── ashes ─────────────────────────────

const GUSTS = [252.6, 255.6, 259.2]
const ASH_PER = 18

function ashes(ctx: Ctx, t: number) {
  ctx.save()
  for (let gI = 0; gI < GUSTS.length; gI++) for (let i = 0; i < ASH_PER; i++) {
    const id = gI * 100 + i
    const tr = GUSTS[gI] + rand(id, 1) * 2.6
    const dur = 5.2 + rand(id, 2) * 2.4
    const u = (t - tr) / dur
    if (u < 0) continue
    // landing point on the water (depth) and a drifting path from the upper left
    const zl = 0.08 + rand(id, 3) * 0.55
    const yl = HZ + 6 + (H - HZ) * zl
    const xl = MOON_X - 520 + rand(id, 4) * 1000
    const x0 = xl - 260 - rand(id, 5) * 260, y0 = -30 - rand(id, 6) * 120
    const s = 1.25 + zl * 2.8
    if (u < 1) {
      const e = ease.inOutSine(u)
      const x = lerp(x0, xl, e) + Math.sin(t * 1.3 + id) * 14 * (1 - u)
      const y = lerp(y0, yl, u)
      const rot = t * (0.8 + rand(id, 7)) + id
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.scale(s, s * (0.5 + 0.5 * Math.abs(Math.sin(rot * 1.7))))
      ctx.fillStyle = `rgba(206,200,190,${0.5 * smoothstep(0, 0.08, u)})`
      ctx.shadowColor = 'rgba(206,200,190,0.5)'
      ctx.shadowBlur = 4
      // a curled, torn flake: five uneven points
      ctx.globalAlpha *= 1 - smoothstep(0.85, 1, u) * 0.6
      ctx.beginPath()
      for (let q = 0; q < 5; q++) {
        const ang = (q / 5) * TAU + rand(id, 20 + q) * 0.8
        const rr = 0.8 + rand(id, 30 + q) * 1.8
        if (q === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
        else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else {
      // touching the water: a ring widens and the flake is gone
      const r = (t - tr - dur) / 1.6
      if (r < 1) {
        penStroke(ctx, sketchEllipse(xl, yl, (3 + r * 22) * s, (1 + r * 5) * s, id, 0.04), 1, {
          width: 0.9, color: 'rgb(220,214,204)', alpha: 0.5 * (1 - r), nib: false, taperIn: 4, taperOut: 4,
        })
      }
    }
  }
  ctx.restore()
}

// ───────────────────────────── G1/G2 · the Pacific ─────────────────────────────

/** her sentences surfacing in the sky over the Pacific (verbatim, SCRIPT.md) */
const SKY_LINES: FloatLine[] = [
  { text: '像我们这样生长在都市文化中的人，总是先看见海的图画，后看见海；', x: 120, y: 64, t0: 253.2, t1: 260.4, size: 19, alpha: 0.36, drift: -5 },
  { text: '先读到爱情小说，后知道爱。', x: 1180, y: 250, t0: 255.4, t1: 262.0, size: 22, alpha: 0.4, drift: -6 },
  { text: '于千万人之中遇见你所要遇见的人', x: 150, y: 214, t0: 258.6, t1: 265.4, size: 20, alpha: 0.34, drift: -4 },
  { text: '因为懂得，所以慈悲。', x: 1580, y: 40, t0: 260.2, t1: 268.0, size: 21, alpha: 0.38, drift: -3, vertical: true },
  { text: '我要你知道，在这个世界上总有一个人是等着你的', x: 1080, y: 120, t0: 262.6, t1: 269.6, size: 19, alpha: 0.34, drift: -5 },
  { text: '生命是一袭华美的袍，爬满了蚤子。', x: 200, y: 130, t0: 266.0, t1: 272.6, size: 20, alpha: 0.32, drift: -4 },]

function moonY(t: number) {
  const set = ease.inOutSine(prog(t, T_SET0, T_SET1))
  return lerp(150, HZ + 58, set)
}

function drawSea(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 7, lift: 0.12 })
  const lt = t - T0
  const s = lerp(1.0, 1.07, ease.inOutSine(prog(t, T0, T_CARD)))
  // after the moon has set the camera tilts up into the empty sky, which holds the title and credits
  const tilt = ease.inOutSine(prog(t, T_CARD - 1.2, T_CARD + 2.0))
  ctx.save()
  ctx.translate(0, tilt * 290)
  ctx.translate(MOON_X, HZ)
  ctx.scale(s, s)
  ctx.translate(-MOON_X, -HZ + lerp(10, -6, prog(t, T0, T_CARD)))
  const my = moonY(t)
  const r = 50
  const above = clamp((HZ - (my - r)) / (2 * r)) // fraction of disc above the horizon
  // sky: a faint haze along the horizon, warmer while the moon touches it
  const touch = smoothstep(HZ - 160, HZ - 20, my) * (1 - smoothstep(HZ + 20, HZ + 58, my))
  const hz = ctx.createLinearGradient(0, HZ - 120, 0, HZ + 30)
  hz.addColorStop(0, 'rgba(90,110,150,0)')
  hz.addColorStop(0.85, 'rgba(90,110,150,0.16)')
  hz.addColorStop(1, 'rgba(90,110,150,0)')
  ctx.fillStyle = hz
  ctx.fillRect(-100, HZ - 120, W + 200, 150)
  // clouds
  const cdx = lt * -7
  penDraw(ctx, [
    [MOON_X - 520 + cdx, 196, MOON_X - 330 + cdx, 182, MOON_X - 120 + cdx, 200, MOON_X + 60 + cdx, 190],
    [MOON_X + 220 + cdx * 0.6, 98, MOON_X + 400 + cdx * 0.6, 86, MOON_X + 620 + cdx * 0.6, 100],
    [MOON_X + 330 + cdx * 0.8, 250, MOON_X + 520 + cdx * 0.8, 240, MOON_X + 760 + cdx * 0.8, 254],
  ], prog(lt, 0.4, 4), { width: 1.1, color: C.lineNight, alpha: 0.3, boil: 8, t, wobble: 2, seed: 41 })
  floatLines(ctx, t, SKY_LINES, '206,216,236')
  // the moon, clipped by the horizon
  if (above > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(-200, -200, W + 400, HZ + 200)
    ctx.clip()
    moon(ctx, MOON_X, my, r, { glow: 0.9, t })
    penStroke(ctx, sketchEllipse(MOON_X, my, r + 3, r + 3, 3, 0.1), 1, { width: 1.3, color: C.lineNight, wobble: 1.2, boil: 8, t, alpha: 0.25 })
    ctx.restore()
  }
  if (touch > 0) {
    const g = ctx.createRadialGradient(MOON_X, HZ, 0, MOON_X, HZ, 420)
    g.addColorStop(0, `rgba(240,190,120,${0.28 * touch})`)
    g.addColorStop(1, 'rgba(240,190,120,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.translate(MOON_X, HZ)
    ctx.scale(1, 0.22)
    ctx.translate(-MOON_X, -HZ)
    ctx.fillStyle = g
    ctx.fillRect(MOON_X - 420, HZ - 420, 840, 840)
    ctx.restore()
  }
  // sea body: slightly darker than the sky
  const sb = ctx.createLinearGradient(0, HZ, 0, H)
  sb.addColorStop(0, 'rgba(8,11,20,0.12)')
  sb.addColorStop(1, 'rgba(8,11,20,0.5)')
  ctx.fillStyle = sb
  ctx.fillRect(-200, HZ, W + 400, H - HZ + 200)
  // reflection reach: full while the moon is high, thinning as it sets; a remnant lingers (完不了)
  const setP = prog(t, T_SET0, T_SET1)
  const linger = 0.3 * smoothstep(T_SET1 - 1.5, T_SET1 + 1, t)
  const glowK = Math.max(1 - setP, linger * 2.2)
  const reach = glowK
  // the words, drawn into a layer (so the moonlight tints only glyphs)
  const L = cached('G:sea', W, H, () => undefined)
  const g = L.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, W, H)
  seaText(g, t, widths(g), reach)
  ctx.drawImage(L, 0, 0)
  waveLines(ctx, t, 0.36)
  // glints: short warm dashes on the water inside the column
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const fl = Math.floor(t * 5)
  for (let i = 0; i < 110; i++) {
    const z = Math.pow(rand(i, 11), 1.4)
    const y = HZ + 4 + (H * 0.8 - HZ) * z
    const hw = columnHalf(z) * 0.8
    const x = MOON_X + (rand(i, 12) * 2 - 1) * hw * (0.3 + 0.7 * rand(i, 13))
    const on = 0.4 + 0.6 * rand(fl + i * 7, 14)
    const len = (4 + 18 * z) * (0.5 + rand(i, 15))
    ctx.strokeStyle = `rgba(248,214,160,${0.45 * on * glowK * (1 - Math.abs(x - MOON_X) / (hw + 1)) })`
    ctx.lineWidth = 0.8 + 1.4 * z
    ctx.beginPath()
    ctx.moveTo(x - len / 2, y)
    ctx.lineTo(x + len / 2, y)
    ctx.stroke()
  }
  // after the moon has gone: one warm thread stays along the horizon
  if (linger > 0) {
    const th = ctx.createLinearGradient(MOON_X - 300, 0, MOON_X + 300, 0)
    th.addColorStop(0, 'rgba(240,196,130,0)')
    th.addColorStop(0.5, `rgba(240,196,130,${2.4 * linger})`)
    th.addColorStop(1, 'rgba(240,196,130,0)')
    ctx.fillStyle = th
    ctx.fillRect(MOON_X - 300, HZ - 1.5, 600, 3)
    const gl = ctx.createRadialGradient(MOON_X, HZ, 0, MOON_X, HZ, 260)
    gl.addColorStop(0, `rgba(240,190,120,${0.5 * linger})`)
    gl.addColorStop(1, 'rgba(240,190,120,0)')
    ctx.translate(MOON_X, HZ)
    ctx.scale(1, 0.18)
    ctx.translate(-MOON_X, -HZ)
    ctx.fillStyle = gl
    ctx.fillRect(MOON_X - 260, HZ - 260, 520, 520)
  }
  ctx.restore()
  // horizon line, drawn with the pen
  penStroke(ctx, [-60, HZ + 1, W * 0.5, HZ - 1, W + 60, HZ + 1], prog(lt, 0, 2.2), { width: 1.1, color: C.lineNight, alpha: 0.4, boil: 6, t, wobble: 0.6, nib: false })
  ashes(ctx, t)
  ctx.restore()
}

// ───────────────────────────── G3 · title reprise ─────────────────────────────

function emptyCircle(ctx: Ctx, t: number, x: number, y: number, r: number, p: number, alpha: number) {
  penStroke(ctx, sketchEllipse(x, y, r + 2, r + 2, 3, 0.1), p, { width: 1.8, color: C.lineNight, wobble: 1.2, boil: 8, t, alpha })
  penStroke(ctx, sketchEllipse(x + 1, y - 1, r + 4, r + 3, 9, 0.05), clamp(p * 1.3 - 0.3), { width: 0.9, color: C.lineNight, wobble: 1.6, boil: 8, t, alpha: alpha * 0.45, nib: false })
}

/**
 * The last card, over the dark sea after the tilt: the empty pen circle of the first shot (a tiny moon kindles in it),
 * the title, then every credit at once in small type — the global fade begins at 282.5.
 */
type Credit = { zh: string[]; en: string }
const N = LINES_OF_CODE.toLocaleString('en-US')
const CREDITS: Credit[] = [
  { zh: ['音乐　赵雷《程艾影》(2022)'], en: 'Music: Zhao Lei, “Cheng Aiying”' },
  {
    zh: ['引文　张爱玲《金锁记》《天才梦》《私语》《倾城之恋》《〈传奇〉再版的话》《公寓生活记趣》《爱》', '《红玫瑰与白玫瑰》《半生缘》《更衣记》《童言无忌》《忆胡适之》《小团圆》《对照记》；胡兰成《今生今世》'],
    en: 'Quotations: Eileen Chang — The Golden Cangue, Love in a Fallen City, Red Rose, White Rose, Half a Lifelong Romance, Little Reunions, and essays; Hu Lancheng, This Life, This World',
  },
  { zh: ['提问　一位张爱玲的读者'], en: 'Asked by a reader of Eileen Chang' },
  { zh: ['编剧 · 导演 · 美术 · 手绘 · 渲染　Claude Opus 5.5'], en: 'Written · Directed · Designed · Drawn · Rendered by Claude Opus 5.5' },
  { zh: [`0 台摄影机 · 0 张 AI 生图 · ${N} 行代码`], en: `0 cameras · 0 AI-generated images · ${N} lines of code` },
]

const CARD_TITLE = '一个有月亮的晚上'

function finalCard(ctx: Ctx, t: number) {
  if (t < T_CARD - 0.2) return
  const col: [number, number, number] = [236, 228, 210]
  // the circle of the first shot, drawn again — empty; later a tiny moon kindles inside
  const cx = W / 2, cy = 74 - (t - T_CARD) * 0.6, r = 19
  const p = ease.inOutSine(prog(t, T_CARD, T_CARD + 1.6))
  const kindle = ease.inOutSine(prog(t, T_CARD + 3.2, T_CARD + 5.4))
  moon(ctx, cx, cy, r * 0.62, { alpha: kindle, glow: kindle * 0.45, t })
  emptyCircle(ctx, t, cx, cy, r, p, 0.7)
  // title, outline then fill, a character every 0.2 s
  ctx.save()
  ctx.font = `300 60px ${FONT.zh}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const chars = [...CARD_TITLE]
  const track = 18
  const ws = chars.map((c) => ctx.measureText(c).width + track)
  let x = W / 2 - (ws.reduce((a, b) => a + b, 0) - track) / 2
  chars.forEach((ch, i) => {
    const b = T_CARD + 0.5 + i * 0.2
    strokeRevealText(ctx, ch, x, 168, ease.inOutSine(prog(t, b, b + 0.9)), ease.inOutSine(prog(t, b + 0.6, b + 1.8)), col, 1, 360)
    x += ws[i]
  })
  const e = ease.outCubic(prog(t, T_CARD + 2.2, T_CARD + 3.2))
  if (e > 0) {
    ctx.textAlign = 'center'
    ctx.font = `italic 400 25px ${FONT.en}`
    ;(ctx as any).letterSpacing = '5px'
    ctx.fillStyle = `rgba(${col},${0.8 * e})`
    ctx.fillText('A Night with a Moon', W / 2, 212)
    ctx.font = `400 18px ${FONT.zh}`
    ;(ctx as any).letterSpacing = '4px'
    ctx.fillStyle = `rgba(${col},${0.72 * e})`
    ctx.fillText('张爱玲　1920.9.30 — 1995.9　Eileen Chang', W / 2, 246)
  }
  // credits: all together, each pair a breath after the last
  ctx.textAlign = 'center'
  let y = 300
  CREDITS.forEach((c, i) => {
    const a = ease.outCubic(prog(t, T_CARD + 3.0 + i * 0.22, T_CARD + 4.0 + i * 0.22))
    ctx.font = `400 16px ${FONT.zh}`
    ;(ctx as any).letterSpacing = '3px'
    ctx.fillStyle = `rgba(${col},${0.88 * a})`
    c.zh.forEach((line) => { ctx.fillText(line, W / 2, y + (1 - a) * 4); y += 22 })
    ctx.font = `400 15px ${FONT.en}`
    ;(ctx as any).letterSpacing = '1px'
    ctx.fillStyle = `rgba(${col},${0.62 * a})`
    ctx.fillText(c.en, W / 2, y + (1 - a) * 4)
    y += 34
  })
  ctx.restore()
}

export const scenes: Scene[] = [
  { id: 'G-pacific', t0: T0, t1: T_END, theme: 'night', trans: { kind: 'dissolve', dur: 1.2 }, draw: (ctx, t) => { drawSea(ctx, t); finalCard(ctx, t) } },
]
