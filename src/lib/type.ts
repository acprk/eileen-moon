/**
 * Typography: bilingual narration subtitles (reference-film style: Chinese types on character by character,
 * English follows), vertical manuscript writing on 稿纸 grid (楷体, right-to-left columns), year marks and the
 * vertical lyric rail.
 */
import { FONT, H, W } from '../config'
import { clamp, ease, envelope, lerp, prog, rand } from './math'
import type { Ctx } from './texture'

export type Theme = 'night' | 'paper'

export type Cue = {
  t0: number
  t1: number
  zh: string
  en: string
  theme?: Theme
  /** vertical placement: 'low' (default, lower third), 'mid', 'high' */
  pos?: 'low' | 'mid' | 'high'
  /** quotation from her works: 楷体, wrapped in 「」 */
  quote?: boolean
  /** horizontal anchor 0..1 (default 0.5 = centred) */
  x?: number
}

const INK = { night: [234, 228, 214], paper: [42, 29, 20] } as const

function rgba(c: readonly number[], a: number) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

/** Draw one narration cue at time t (no-op outside [t0, t1]). */
export function subtitle(ctx: Ctx, t: number, cue: Cue, themeOverride?: Theme) {
  if (t < cue.t0 || t > cue.t1) return
  const theme = cue.theme ?? themeOverride ?? 'night'
  const col = INK[theme]
  const lt = t - cue.t0
  const out = 1 - ease.inOutSine(prog(t, cue.t1 - 0.7, cue.t1))
  const zhSize = cue.quote ? 38 : 34
  const enSize = cue.quote ? 26 : 25
  const yBase = cue.pos === 'mid' ? H * 0.5 : cue.pos === 'high' ? H * 0.2 : H * 0.84
  const cx = W * (cue.x ?? 0.5)
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const zh = cue.quote ? `「${cue.zh}」` : cue.zh
  ctx.font = `${cue.quote ? 400 : 400} ${zhSize}px ${cue.quote ? FONT.kai : FONT.zh}`
  ;(ctx as any).letterSpacing = cue.quote ? '4px' : '3px'
  const chars = [...zh]
  const widths = chars.map((ch) => ctx.measureText(ch).width + (cue.quote ? 4 : 3))
  const total = widths.reduce((a, b) => a + b, 0)
  let x = cx - total / 2
  const stagger = Math.min(0.07, 1.6 / Math.max(1, chars.length))
  const drift = (1 - out) * -6
  if (theme === 'night') {
    ctx.shadowColor = 'rgba(5,8,16,0.85)'
    ctx.shadowBlur = 10
  } else {
    ctx.shadowColor = 'rgba(250,242,222,0.8)'
    ctx.shadowBlur = 8
  }
  chars.forEach((ch, i) => {
    const k = ease.outCubic(prog(lt, i * stagger, i * stagger + 0.35))
    if (k > 0) {
      ctx.fillStyle = rgba(col, k * out * 0.96)
      ctx.fillText(ch, x, yBase + (1 - k) * 6 + drift)
    }
    x += widths[i]
  })
  // English
  const enStart = chars.length * stagger + 0.25
  const ek = ease.outCubic(prog(lt, enStart, enStart + 0.7))
  if (ek > 0 && cue.en) {
    ctx.font = `italic 400 ${enSize}px ${FONT.en}`
    ;(ctx as any).letterSpacing = '0.5px'
    ctx.textAlign = 'center'
    ctx.fillStyle = rgba(col, ek * out * 0.78)
    ctx.fillText(cue.en, cx, yBase + zhSize * 1.15 + (1 - ek) * 4 + drift)
  }
  ctx.restore()
}

/**
 * Vertical writing (竖排, columns right→left) revealed character by character like a brush landing.
 * Optional 稿纸 grid (red cells). Returns the bounding box.
 */
export function writeVertical(ctx: Ctx, t: number, o: {
  text: string
  /** top-right corner of the block */
  x: number
  y: number
  size?: number
  t0: number
  /** seconds per character */
  rate?: number
  perCol?: number
  color?: string
  grid?: string | null
  alpha?: number
  font?: string
}) {
  const size = o.size ?? 40
  const perCol = o.perCol ?? 12
  const rate = o.rate ?? 0.09
  const cell = size * 1.32
  const colGap = cell * 0.18
  const color = o.color ?? 'rgba(42,29,20,1)'
  const VERT: Record<string, string> = { '…': '︙', '—': '︱', '「': '﹁', '」': '﹂', '『': '﹃', '』': '﹄', '（': '︵', '）': '︶', '《': '︽', '》': '︾', '“': '﹁', '”': '﹂' }
  const chars = [...o.text].map((ch) => VERT[ch] ?? ch)
  const a0 = o.alpha ?? 1
  // lay out, keeping punctuation in the column
  const pos: [number, number][] = []
  let col = 0, row = 0
  for (const ch of chars) {
    if (ch === '\n') { col++; row = 0; pos.push([-1, -1]); continue }
    if (row >= perCol) { col++; row = 0 }
    pos.push([col, row])
    row++
  }
  const ncol = col + 1
  ctx.save()
  ctx.globalAlpha *= a0
  if (o.grid) {
    ctx.strokeStyle = o.grid
    ctx.lineWidth = 1
    const gk = clamp((t - o.t0 + 0.6) / 0.6)
    ctx.globalAlpha *= gk
    for (let c = 0; c < ncol; c++) {
      const cx = o.x - c * (cell + colGap) - cell
      ctx.strokeRect(cx, o.y, cell, cell * perCol)
      for (let r = 1; r < perCol; r++) {
        ctx.beginPath()
        ctx.moveTo(cx, o.y + r * cell)
        ctx.lineTo(cx + cell, o.y + r * cell)
        ctx.stroke()
      }
    }
    ctx.globalAlpha /= gk || 1
  }
  ctx.font = `400 ${size}px ${o.font ?? FONT.kai}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let k = 0
  chars.forEach((ch, i) => {
    const [c, r] = pos[i]
    if (c < 0) return
    const st = o.t0 + k * rate
    k++
    const p = prog(t, st, st + 0.32)
    if (p <= 0) return
    const cx = o.x - c * (cell + colGap) - cell / 2
    const cy = o.y + r * cell + cell / 2
    const isPunct = /[，。、；：！？…—「」『』,.]/.test(ch)
    ctx.save()
    ctx.translate(cx + (isPunct ? cell * 0.28 : 0), cy - (isPunct ? cell * 0.28 : 0))
    const s = lerp(1.08, 1, ease.outCubic(p))
    ctx.scale(s, s)
    ctx.rotate((rand(i, 5) - 0.5) * 0.03)
    // ink bleed halo while landing
    if (p < 1) {
      ctx.globalAlpha *= 1
      ctx.filter = `blur(${(1 - p) * 3}px)`
    }
    ctx.fillStyle = color
    ctx.globalAlpha *= ease.outCubic(p)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.restore()
  return { w: ncol * (cell + colGap), h: perCol * cell }
}

/** Large thin year numerals, tracking out as they fade. */
export function yearMark(ctx: Ctx, t: number, o: { text: string; x: number; y: number; t0: number; t1: number; size?: number; color?: string; align?: CanvasTextAlign }) {
  const a = envelope(t, o.t0, o.t1, 0.5, 0.8)
  if (a <= 0) return
  ctx.save()
  ctx.font = `400 ${o.size ?? 120}px ${FONT.en}`
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  ;(ctx as any).letterSpacing = `${lerp(6, 18, prog(t, o.t0, o.t1))}px`
  ctx.fillStyle = o.color ?? 'rgba(234,228,214,1)'
  ctx.globalAlpha *= a * 0.9
  ctx.fillText(o.text, o.x, o.y)
  ctx.restore()
}

export type LyricLine = { t0: number; t1: number; text: string }

/** Vertical lyric rail at the right margin: the current sung line in small 楷体, revealed per character. */
export function lyricRail(ctx: Ctx, t: number, lines: LyricLine[], theme: Theme, alpha = 1) {
  const L = lines.find((l) => t >= l.t0 - 0.2 && t <= l.t1 + 0.6)
  if (!L) return
  const chars = [...L.text]
  const size = 21
  const step = size * 1.25
  const x = W - 46
  const y0 = 64
  const out = 1 - prog(t, L.t1, L.t1 + 0.6)
  const dur = Math.max(0.5, (L.t1 - L.t0) * 0.85)
  ctx.save()
  ctx.font = `400 ${size}px ${FONT.kai}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const col = theme === 'night' ? [226, 214, 190] : [70, 50, 34]
  let row = 0
  chars.forEach((ch, i) => {
    if (ch === ' ') { row += 0.6; return }
    const k = prog(t, L.t0 + (i / chars.length) * dur, L.t0 + (i / chars.length) * dur + 0.25)
    if (k > 0) {
      ctx.fillStyle = rgba(col, 0.62 * k * out * alpha)
      ctx.fillText(ch, x, y0 + row * step)
    }
    row++
  })
  // thin hairline beside the rail
  ctx.strokeStyle = rgba(col, 0.18 * out * alpha)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - 20, y0 - 10)
  ctx.lineTo(x - 20, y0 - 10 + Math.min(row, 22) * step * clamp((t - L.t0) / 0.6))
  ctx.stroke()
  ctx.restore()
}
