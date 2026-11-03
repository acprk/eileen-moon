/**
 * Text as material (the reference film's language): images made of her words.
 *
 * - textImage   : a shape (any drawing into a mask) rendered as a field of characters whose density/brightness
 *                 follows the mask; glyphs EMERGE over time (fly in from scatter, fade up) in random / radial /
 *                 sweep order. Use it for figures, buildings, the moon, a ship… "人物从文字里逐渐浮现".
 * - textPlane   : a perspective plane of words (sea, floor, street) scrolling, with an optional light column.
 * - textRain    : falling characters (rain, snow, ash, pages).
 * - floatLines  : her sentences surfacing and dissolving in space (opening moon, memories).
 *
 * All glyphs come from a cached atlas, so tens of thousands of characters per frame stay cheap.
 */
import { FONT, H, W } from '../config'
import { TAU, clamp, ease, lerp, prog, rand, smoothstep } from './math'
import { cached, type Ctx } from './texture'

/** Verbatim lines + titles + names — the default corpus. */
export const CORPUS = [
  '三十年前的上海，一个有月亮的晚上', '生命是一袭华美的袍，爬满了蚤子', '见了他，她变得很低很低，低到尘埃里',
  '但她心里是欢喜的，从尘埃里开出花来', '于千万人之中遇见你所要遇见的人', '噢，你也在这里吗', '因为懂得，所以慈悲',
  '出名要趁早呀', '我们回不去了', '我们各人住在各人的衣服里', '愿使岁月静好，现世安稳', '我将只是萎谢了',
  '倾城之恋', '金锁记', '半生缘', '红玫瑰与白玫瑰', '小团圆', '传奇', '流言', '秧歌', '怨女', '色，戒', '对照记', '海上花',
  '白流苏', '范柳原', '曹七巧', '顾曼桢', '沈世钧', '葛薇龙', '王娇蕊', '佟振保', '茉莉香片', '心经', '封锁', '琉璃瓦',
].join('')

// ───────────────────────────── glyph atlas ─────────────────────────────

type Atlas = { canvas: HTMLCanvasElement; index: Map<string, number>; cell: number; cols: number }
const atlases = new Map<string, Atlas>()

/** White glyphs on transparent, one cell each, for every distinct char of `corpus`. */
export function glyphAtlas(corpus: string, size = 32, font: string = FONT.kai, color = '#ffffff'): Atlas {
  const key = `${font}|${size}|${color}|${corpus}`
  const hit = atlases.get(key)
  if (hit) return hit
  const chars = [...new Set([...corpus].filter((c) => !/\s/.test(c)))]
  const cell = Math.ceil(size * 1.25)
  const cols = 32
  const rows = Math.ceil(chars.length / cols)
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell
  canvas.height = rows * cell
  const g = canvas.getContext('2d')!
  g.font = `400 ${size}px ${font}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = color
  const index = new Map<string, number>()
  chars.forEach((c, i) => {
    index.set(c, i)
    g.fillText(c, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2)
  })
  const a = { canvas, index, cell, cols }
  atlases.set(key, a)
  return a
}

function blit(ctx: Ctx, A: Atlas, ch: string, x: number, y: number, s: number) {
  const i = A.index.get(ch)
  if (i === undefined) return
  const sx = (i % A.cols) * A.cell, sy = Math.floor(i / A.cols) * A.cell
  const d = A.cell * s
  ctx.drawImage(A.canvas, sx, sy, A.cell, A.cell, x - d / 2, y - d / 2, d, d)
}

// ───────────────────────────── masks ─────────────────────────────

/**
 * A full-frame mask canvas (W×H), drawn once by `draw` (paint white where the image is; grey = partial).
 * Anything works: penDraw with thick white lines, filled paths, eileen(..., {color:'#fff', dress:'#fff', fill:1}),
 * ctx.fillText of a big character, radial gradients for the moon…
 */
export function mask(key: string, draw: (g: Ctx) => void) {
  return cached(`mask:${key}`, W, H, (g) => {
    g.fillStyle = '#fff'
    g.strokeStyle = '#fff'
    draw(g)
  })
}

const sampleCache = new Map<string, Float32Array>()
function samples(key: string, m: HTMLCanvasElement, cell: number) {
  const k = `${key}|${cell}`
  const hit = sampleCache.get(k)
  if (hit) return hit
  const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell)
  // downsample with smoothing, then read
  const c = document.createElement('canvas')
  c.width = nx
  c.height = ny
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(m, 0, 0, nx, ny)
  const d = g.getImageData(0, 0, nx, ny).data
  const out = new Float32Array(nx * ny)
  for (let i = 0; i < nx * ny; i++) out[i] = ((d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765) * (d[i * 4 + 3] / 255)
  sampleCache.set(k, out)
  return out
}

export type TextImageOpts = {
  /** mask key + drawer (see `mask`) */
  key: string
  draw: (g: Ctx) => void
  corpus?: string
  /** grid cell in px (glyph pitch). 10–16 for figures, 18–28 for big forms */
  cell?: number
  /** glyph colour */
  color?: string
  font?: string
  /** 0..1 how much of the image has surfaced */
  emerge?: number
  order?: 'random' | 'radial' | 'sweepX' | 'sweepY' | 'sweepYUp'
  /** origin for radial order (px) */
  ox?: number
  oy?: number
  /** fly-in distance (px) for glyphs still arriving */
  scatter?: number
  /** mask threshold below which no glyph is drawn */
  thr?: number
  alpha?: number
  /** time for gentle shimmer (0 = static) */
  t?: number
  seed?: number
  /** brightness of a glyph = v^gamma */
  gamma?: number
  /** mask-faithful sizing: glyphs shrink where the mask is grey */
  sizeByValue?: boolean
}

/** Draw a mask as a field of characters. */
export function textImage(ctx: Ctx, o: TextImageOpts) {
  const em = o.emerge ?? 1
  if (em <= 0) return
  const cell = o.cell ?? 14
  const m = mask(o.key, o.draw)
  const S = samples(o.key, m, cell)
  const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell)
  const corpus = [...(o.corpus ?? CORPUS).replace(/[，。、；：！？—…“”「」\s]/g, '')]
  const A = glyphAtlas(o.corpus ?? CORPUS, Math.max(16, Math.round(cell * 1.6)), o.font ?? FONT.kai, o.color ?? '#e9e2d2')
  const thr = o.thr ?? 0.08
  const seed = o.seed ?? 1
  const t = o.t ?? 0
  const sc = o.scatter ?? 60
  const order = o.order ?? 'random'
  const ox = o.ox ?? W / 2, oy = o.oy ?? H / 2
  const maxR = Math.hypot(W, H) * 0.6
  const gamma = o.gamma ?? 0.8
  ctx.save()
  const a0 = o.alpha ?? 1
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = S[j * nx + i]
    if (v < thr) continue
    const x = (i + 0.5) * cell, y = (j + 0.5) * cell
    const r = rand(i * 7919 + j, seed)
    let key = r
    if (order === 'radial') key = Math.hypot(x - ox, y - oy) / maxR * 0.85 + r * 0.15
    else if (order === 'sweepX') key = (x / W) * 0.85 + r * 0.15
    else if (order === 'sweepY') key = (y / H) * 0.85 + r * 0.15
    else if (order === 'sweepYUp') key = (1 - y / H) * 0.85 + r * 0.15
    const k = clamp((em * 1.2 - key) / 0.2)
    if (k <= 0) continue
    const e = ease.outCubic(k)
    const ang = rand(i + j * 131, seed + 5) * TAU
    const px = x + Math.cos(ang) * sc * (1 - e)
    const py = y + Math.sin(ang) * sc * (1 - e)
    const shimmer = t ? 0.85 + 0.15 * Math.sin(t * 1.7 + r * 40) : 1
    ctx.globalAlpha = a0 * e * Math.pow(clamp(v), gamma) * shimmer
    const ch = corpus[(i * 3 + j * 17 + seed * 11) % corpus.length]
    const s = (o.sizeByValue ? lerp(0.55, 1, clamp(v)) : 1) / 1.6
    blit(ctx, A, ch, px, py, s * (cell * 1.6) / (A.cell / 1.25) * 1)
  }
  ctx.restore()
}

// ───────────────────────────── plane of words ─────────────────────────────

export type PlaneOpts = {
  /** horizon y and bottom y */
  y0: number
  y1?: number
  rows?: number
  words?: string[]
  color?: [number, number, number]
  /** warm light column centred at lightX (px), 0 = none */
  light?: number
  lightX?: number
  speed?: number
  alpha?: number
  t: number
  seed?: number
}

const DEFAULT_WORDS = ['倾城之恋', '金锁记', '半生缘', '传奇', '流言', '小团圆', '白流苏', '曹七巧', '顾曼桢', '沈世钧', '红玫瑰', '白玫瑰', '封锁', '心经', '秧歌', '怨女', '对照记', '茉莉香片', '第一炉香', '琉璃瓦', '海上花', '色，戒']

/** Perspective plane of words (sea, street, floor). Rows recede to the horizon y0. */
export function textPlane(ctx: Ctx, o: PlaneOpts) {
  const rows = o.rows ?? 28
  const words = o.words ?? DEFAULT_WORDS
  const [cr, cg, cb] = o.color ?? [186, 200, 232]
  const y1 = o.y1 ?? H + 30
  const light = o.light ?? 0
  const lx = o.lightX ?? W / 2
  const seed = o.seed ?? 3
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  for (let k = 0; k < rows; k++) {
    const z = Math.pow((k + 1) / rows, 1.7)
    const y = o.y0 + 4 + (y1 - o.y0) * z
    const size = 6 + 30 * z
    const sq = 0.4 + 0.4 * z
    const dir = k % 2 ? 1 : -1
    const sp = (o.speed ?? 1) * (5 + 18 * z) * dir
    ctx.font = `400 ${size}px ${FONT.kai}`
    const gap = size * 1.5
    let x = -((((rand(k, seed) * 800 + o.t * sp) % 800) + 800) % 800)
    let wi = Math.floor(rand(k, seed + 1) * words.length)
    ctx.save()
    ctx.translate(0, y)
    ctx.scale(1, sq)
    while (x < W + 40) {
      const w = words[wi % words.length]
      const wl = ctx.measureText(w).width
      const cx = x + wl / 2
      const col = light ? Math.pow(Math.max(0, 1 - Math.abs(cx - lx) / (30 + 220 * z)), 1.3) * light : 0
      const swell = 0.5 + 0.5 * Math.sin(cx * (0.004 / (0.3 + z)) - o.t * 0.7 + k * 0.9)
      const a = ((0.12 + 0.4 * Math.pow(z, 0.8)) * (0.35 + 0.9 * swell) + col * 0.85) * (o.alpha ?? 1)
      ctx.fillStyle = `rgba(${lerp(cr, 255, col) | 0},${lerp(cg, 222, col) | 0},${lerp(cb, 160, col) | 0},${a})`
      ctx.fillText(w, x, Math.sin(o.t * 0.9 + k * 0.7 + x * 0.006) * 3 / sq)
      x += wl + gap
      wi += 7
    }
    ctx.restore()
  }
  ctx.restore()
}

// ───────────────────────────── falling characters ─────────────────────────────

export function textRain(ctx: Ctx, t: number, o: { corpus?: string; n?: number; speed?: number; angle?: number; color?: string; alpha?: number; size?: number; seed?: number; x0?: number; x1?: number } = {}) {
  const chars = [...(o.corpus ?? CORPUS).replace(/[，。、；：！？—…“”「」\s]/g, '')]
  const n = o.n ?? 160
  const sp = o.speed ?? 260
  const ang = o.angle ?? 0.12
  const size = o.size ?? 20
  const A = glyphAtlas(o.corpus ?? CORPUS, 32, FONT.kai, o.color ?? '#d6deee')
  const x0 = o.x0 ?? -100, x1 = o.x1 ?? W + 100
  ctx.save()
  for (let i = 0; i < n; i++) {
    const z = 0.35 + rand(i, 2) * 0.65
    const span = H + 120
    const y = ((rand(i, 3) * span + t * sp * z) % span) - 60
    const x = lerp(x0, x1, rand(i, 1)) + y * Math.tan(ang)
    ctx.globalAlpha = (o.alpha ?? 0.5) * z * smoothstep(-60, 40, y)
    blit(ctx, A, chars[(i * 13 + Math.floor(t * 0.5 + rand(i, 4) * 10)) % chars.length], x, y, (size * z) / 32)
  }
  ctx.restore()
}

// ───────────────────────────── surfacing sentences ─────────────────────────────

export type FloatLine = { text: string; x: number; y: number; t0: number; t1: number; size?: number; vertical?: boolean; drift?: number; alpha?: number }

/** Her sentences surfacing character by character (blur → sharp), drifting, then dissolving. */
export function floatLines(ctx: Ctx, t: number, lines: FloatLine[], color = '201,211,230') {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const L of lines) {
    if (t < L.t0 || t > L.t1 + 1.2) continue
    const size = L.size ?? 24
    ctx.font = `400 ${size}px ${FONT.kai}`
    const chars = [...L.text]
    const step = size * 1.3
    const dx = (t - L.t0) * (L.drift ?? -6)
    const out = 1 - prog(t, L.t1, L.t1 + 1.2)
    chars.forEach((ch, i) => {
      const st = L.t0 + i * 0.08
      const k = ease.outCubic(prog(t, st, st + 0.9))
      if (k <= 0) return
      const edge = Math.min(1, (i + 1) / 3, (chars.length - i) / 3)
      const x = L.vertical ? L.x + dx : L.x + i * step + dx
      const y = L.vertical ? L.y + i * step : L.y + Math.sin(i * 0.5 + t * 0.4) * 2
      // dissolve: characters drift apart and upward as they fade
      const sp = (1 - out) * 14
      ctx.globalAlpha = (L.alpha ?? 0.5) * k * out * (0.6 + 0.4 * edge)
      ctx.filter = k < 1 ? `blur(${(1 - k) * 4}px)` : 'none'
      ctx.fillStyle = `rgba(${color},1)`
      ctx.fillText(ch, x + (rand(i, 3) - 0.5) * sp, y - sp * rand(i, 4))
    })
  }
  ctx.filter = 'none'
  ctx.restore()
}
