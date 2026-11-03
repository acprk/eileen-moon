/**
 * Segment A · 0–41.471 s · prologue and title (owner: AG).
 *
 *  A1  0.00–14.28  night: a pen draws the moon's circle, it fills with warm light; her moon-sentences drift as cloud
 *  A2 14.28–23.80  稿纸: the 《金锁记》 opening written vertically; at 「泪珠」 a red-yellow drop falls and blooms
 *  A3 23.80–33.18  title — the drop's wet halo becomes the moon; title strokes land one character per beat
 *  A4 33.18–41.47  Shanghai under the moon: the Bund's Customs House far off, 石库门 roofs, wires; tilt down to one
 *                  old house whose window holds the moon (segment B opens on the Markham Road house)
 */
import { C, FONT, H, W } from '../config'
import { glowAt, moon, nightPaper, oldPaper } from '../lib/ground'
import { TAU, beatTime, clamp, ease, lerp, prog, rand, smoothstep } from '../lib/math'
import type { Scene } from '../lib/film'
import { hatch, penDraw, penStroke, sketchEllipse, sketchLine, wash, type Poly } from '../lib/pen'
import { cached, type Ctx } from '../lib/texture'
import { floatLines, textImage, type FloatLine } from '../lib/textmatter'
import { eileen } from '../lib/eileen'

const T_A2 = beatTime(27) // 14.28
const T_A3 = beatTime(46) // 23.80 — energy rises
const T_A4 = beatTime(64) // 33.18
const T_B = 41.471

/** camera: scale s about (cx, cy), then offset */
function cam(ctx: Ctx, s: number, cx: number, cy: number, dx = 0, dy = 0) {
  ctx.translate(cx + dx, cy + dy)
  ctx.scale(s, s)
  ctx.translate(-cx, -cy)
}

/** a noisy closed ring (watercolour blob outline) */
function blobPoly(x: number, y: number, r: number, seed: number, wob = 0.18): Poly {
  const out: Poly = []
  const N = 64
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU
    const k = 1 + wob * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 5 + seed * 2.3) * 0.3 + (rand(i % N, seed) - 0.5) * 0.4)
    out.push(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.92)
  }
  return out
}

// ───────────────────────────── A1 · the moon is drawn ─────────────────────────────

/**
 * Her sentences surfacing around the moon and dissolving — all verbatim from script.ts / SCRIPT.md.
 * Three depths: far (small, faint, slow), mid, near (larger, brighter, faster drift); a few written vertically.
 */
const MOON_LINES: FloatLine[] = [
  // far
  { text: '三十年前的上海，一个有月亮的晚上', x: 250, y: 92, t0: 0.9, t1: 6.2, size: 17, alpha: 0.32, drift: -4 },
  { text: '于千万人之中遇见你所要遇见的人', x: 1300, y: 520, t0: 1.6, t1: 7.0, size: 16, alpha: 0.28, drift: -5 },
  { text: '我是非得听见电车响才睡得着觉的。', x: 120, y: 470, t0: 3.0, t1: 8.6, size: 17, alpha: 0.3, drift: -4 },
  { text: '因为懂得，所以慈悲。', x: 1540, y: 70, t0: 4.6, t1: 10.2, size: 18, alpha: 0.32, drift: -3, vertical: true },
  { text: '先看见海的图画，后看见海；先读到爱情小说，后知道爱。', x: 640, y: 40, t0: 8.8, t1: 14.6, size: 16, alpha: 0.26, drift: -5 },
  { text: '噢，你也在这里吗？', x: 92, y: 120, t0: 10.0, t1: 15.0, size: 18, alpha: 0.3, drift: 2, vertical: true },
  // mid
  { text: '像月光底下的，黑影中现出青白的粉墙，片面的，癫狂的。', x: 160, y: 196, t0: 5.4, t1: 12.4, size: 25, alpha: 0.5, drift: -7 },
  { text: '生命是一袭华美的袍，爬满了蚤子。', x: 330, y: 560, t0: 2.2, t1: 7.4, size: 23, alpha: 0.42, drift: -6 },
  { text: '我们各人住在各人的衣服里。', x: 1330, y: 470, t0: 6.6, t1: 12.0, size: 22, alpha: 0.42, drift: -8 },
  { text: '在这不可理喻的世界里，谁知道什么是因，什么是果？', x: 260, y: 380, t0: 9.8, t1: 14.8, size: 21, alpha: 0.4, drift: -6 },
  { text: '三十年前的月亮早已沉下去', x: 1700, y: 150, t0: 8.0, t1: 14.6, size: 24, alpha: 0.46, drift: -3, vertical: true },
  // near
  { text: '白的还是“床前明月光”', x: 1220, y: 586, t0: 7.6, t1: 13.0, size: 31, alpha: 0.6, drift: -12 },
  { text: '铜钱大的一个红黄的湿晕，像朵云轩信笺上落了一滴泪珠', x: 120, y: 300, t0: 11.0, t1: 15.2, size: 27, alpha: 0.52, drift: -10 },
]

function moonLines(ctx: Ctx, t: number) {
  floatLines(ctx, t, MOON_LINES, '206,216,236')
}

function cloudStrokes(ctx: Ctx, t: number, mx: number, my: number, p: number, alpha = 0.5) {
  const dx = (t - 7) * -6
  const cloud: Poly[] = [
    [mx - 300 + dx, my + 92, mx - 150 + dx, my + 70, mx + 30 + dx, my + 100, mx + 210 + dx, my + 82, mx + 360 + dx, my + 98],
    [mx - 190 + dx * 1.3, my + 124, mx - 40 + dx * 1.3, my + 112, mx + 110 + dx * 1.3, my + 132, mx + 280 + dx * 1.3, my + 120],
    [mx + 40 + dx * 0.7, my - 120, mx + 170 + dx * 0.7, my - 134, mx + 330 + dx * 0.7, my - 118],
    [mx - 420 + dx * 0.5, my - 60, mx - 300 + dx * 0.5, my - 72, mx - 170 + dx * 0.5, my - 62],
  ]
  penDraw(ctx, cloud, p, { width: 1.3, color: C.lineNight, alpha, boil: 8, t, wobble: 2, seed: 4 })
}

function drawA1(ctx: Ctx, t: number) {
  nightPaper(ctx, t)
  const mx = W * 0.6, my = H * 0.36, r = 72
  const s = lerp(1, 1.12, ease.inOutSine(prog(t, 0, 15.5)))
  ctx.save()
  cam(ctx, s, mx, my, 0, lerp(10, -6, prog(t, 0, 15)))
  moonLines(ctx, t)
  const fill = ease.inOutSine(prog(t, 5.9, 9.6))
  // pencilled construction cross where the compass sits
  const pre = prog(t, 1.2, 2.4) * (1 - fill)
  if (pre > 0) {
    penDraw(ctx, [sketchLine(mx - 14, my, mx + 14, my, 3, 2), sketchLine(mx, my - 14, mx, my + 14, 4, 2)], prog(t, 1.2, 2.2), {
      width: 0.9, color: C.lineNight, alpha: 0.45 * pre, boil: 8, t, nib: false,
    })
  }
  // light wells up from the centre of the drawn circle, like ink soaking outward
  if (fill > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(mx, my, r * Math.min(1.02, fill * 1.5), 0, TAU)
    ctx.clip()
    moon(ctx, mx, my, r, { alpha: 0.8 + 0.2 * fill, glow: 0, t })
    ctx.restore()
    moon(ctx, mx, my, r, { alpha: smoothstep(0.55, 1, fill), glow: fill * (0.85 + 0.15 * Math.sin(t * 0.8)), t })
  }
  // the pen circle: drawn, then a second, lighter pass; it stays as the moon's rim
  const ring = ease.inOutSine(prog(t, 2.4, 6.0))
  penStroke(ctx, sketchEllipse(mx, my, r + 2, r + 2, 3, 0.1), ring, {
    width: 2.4, color: C.lineNight, wobble: 1.4, boil: 8, t, alpha: lerp(0.9, 0.35, fill),
  })
  penStroke(ctx, sketchEllipse(mx + 1, my - 1, r + 5, r + 4, 9, 0.05), ease.inOutSine(prog(t, 4.6, 6.6)), {
    width: 1.1, color: C.lineNight, wobble: 2, boil: 8, t, alpha: 0.4 * (1 - fill * 0.6), nib: false,
  })
  cloudStrokes(ctx, t, mx, my, prog(t, 7.2, 11.5))
  ctx.restore()
}

// ───────────────────────────── A2 · 稿纸 ─────────────────────────────

const OPENING = '三十年前的上海，一个有月亮的晚上……我们也许没赶上看见三十年前的月亮。年轻的人想着三十年前的月亮该是铜钱大的一个红黄的湿晕，像朵云轩信笺上落了一滴泪珠，陈旧而迷糊。'
/**
 * Handwriting on plain paper (no grid): vertical columns, uneven pitch and column spacing, ink fading between dips,
 * one word crossed out and corrected (光 → 湿), an ink blot. Each glyph has its own pen timing.
 */
type Glyph = { ch: string; x: number; y: number; size: number; rot: number; st: number; dur: number; ink: number; punct: boolean; strikeSt?: number }
const VERT: Record<string, string> = { '…': '︙' }
const HAND = (() => {
  const out: Glyph[] = []
  let t = 14.55
  let x = 1452, y = 120, col = 0, n = 0
  const colTop = (c: number) => 62 + (rand(c, 41) - 0.5) * 22
  const newCol = (pause: number) => {
    col++
    x -= 62 + (rand(col, 44) - 0.5) * 14
    y = colTop(col)
    t += pause
  }
  const add = (raw: string, pause = 0) => {
    const ch = VERT[raw] ?? raw
    const punct = /[，。︙；]/.test(ch)
    const size = punct ? 30 : 33 + (rand(n, 42) - 0.5) * 5
    const pitch = punct ? 26 : size * 1.06 + (rand(n, 43) - 0.5) * 7
    if (y + pitch > 592) newCol(0.07)
    const dur = punct ? 0.05 : 0.074
    out.push({
      ch, x: x + (rand(n, 45) - 0.5) * 6 + (punct ? 11 : 0), y: y + pitch / 2 - (punct ? 7 : 0), size,
      rot: (rand(n, 46) - 0.5) * 0.1, st: t, dur, ink: 1 - ((n % 23) / 23) * 0.4, punct,
    })
    n++
    y += pitch
    t += dur + 0.012 + pause
  }
  for (const c of '金锁记') add(c)
  newCol(0.3)
  y += 70 // paragraph indent
  const chars = [...OPENING]
  let struck = false
  for (const c of chars) {
    if (c === '湿' && !struck) {
      // writes 光, stops, crosses it out, writes the right word below
      add('光')
      out[out.length - 1].strikeSt = t + 0.05
      t += 0.34
      struck = true
    }
    add(c, c === '，' ? 0.1 : c === '。' ? 0.18 : 0)
  }
  return out
})()
const HAND_END = HAND[HAND.length - 1].st + HAND[HAND.length - 1].dur
/** the moment the pen finishes 珠 */
const T_TEAR = (() => {
  const g = HAND.find((h) => h.ch === '珠')!
  return g.st + g.dur
})()
/** pen-writing spans for the scratch SFX (global seconds) */
export const WRITING_SFX: [number, number][] = (() => {
  const spans: [number, number][] = HAND.map((g) => [+g.st.toFixed(3), +(g.st + g.dur).toFixed(3)] as [number, number])
  for (const g of HAND) if (g.strikeSt) spans.push([+g.strikeSt.toFixed(3), +(g.strikeSt + 0.28).toFixed(3)])
  return spans.sort((a, b) => a[0] - b[0])
})()
const DROP = { x: 430, y: 150 }
const BLOT = { x: 1436, y: 292, t: HAND[2].st + 0.35 }

const tri = (u: number) => { const f = u - Math.floor(u); return f < 0.5 ? f * 2 : 2 - f * 2 }

function drawHand(ctx: Ctx, t: number) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const g of HAND) {
    const p = prog(t, g.st, g.st + g.dur)
    if (p <= 0) break
    ctx.save()
    ctx.translate(g.x, g.y)
    ctx.rotate(g.rot)
    if (p < 1) {
      ctx.beginPath()
      ctx.rect(-g.size, -g.size * 0.62, g.size * 2, g.size * 1.24 * p + 1)
      ctx.clip()
    }
    ctx.font = `400 ${g.size}px ${FONT.kai}`
    ctx.fillStyle = `rgba(42,29,20,${0.6 + 0.36 * g.ink})`
    ctx.fillText(g.ch, 0, 0)
    // ink spreading into the fibres
    ctx.globalAlpha = 0.16 * g.ink
    ctx.fillText(g.ch, 0.7, 0.6)
    ctx.restore()
    if (!g.punct) {
      // ink pooled where the nib first touched
      ctx.fillStyle = `rgba(30,20,12,${0.3 * g.ink})`
      ctx.beginPath()
      ctx.arc(g.x - g.size * 0.24, g.y - g.size * 0.3, 1.4 + 1.3 * g.ink, 0, TAU)
      ctx.fill()
    }
    if (g.strikeSt) {
      const sp = prog(t, g.strikeSt, g.strikeSt + 0.28)
      if (sp > 0) {
        const s = g.size * 0.5
        penStroke(ctx, [g.x - s, g.y - s * 0.9, g.x + s, g.y - s * 0.5, g.x - s, g.y - s * 0.05, g.x + s, g.y + s * 0.35, g.x - s * 0.8, g.y + s * 0.8, g.x + s * 0.9, g.y + s], sp, {
          width: 2.6, color: C.ink, alpha: 0.85, wobble: 1, taperIn: 3, taperOut: 6, nib: false,
        })
      }
    }
  }
  // an ink blot, where the pen rested after the title
  const b = ease.outCubic(prog(t, BLOT.t, BLOT.t + 0.6))
  if (b > 0) {
    const bp = blobPoly(BLOT.x, BLOT.y, 3 + 8 * b, 4, 0.07)
    ctx.fillStyle = 'rgba(36,24,15,0.72)'
    ctx.beginPath()
    ctx.moveTo(bp[0], bp[1])
    for (let i = 2; i < bp.length; i += 2) ctx.lineTo(bp[i], bp[i + 1])
    ctx.closePath()
    ctx.fill()
    // a thin tail where the drop ran
    ctx.beginPath()
    ctx.ellipse(BLOT.x + 9 * b, BLOT.y + 12 * b, 2.2 * b, 4.5 * b, -0.6, 0, TAU)
    ctx.fill()
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(42,29,20,${0.5 * b})`
      ctx.beginPath()
      ctx.arc(BLOT.x + (rand(i, 51) - 0.5) * 50 * b, BLOT.y + (rand(i, 52) - 0.5) * 40 * b, 0.8 + rand(i, 53) * 1.8, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** where the nib is at time t (and how visible the pen is) */
function penTip(t: number): [number, number, number] {
  const first = HAND[0]
  const tipOf = (g: Glyph, p: number): [number, number] => [g.x + (tri(p * 3.5) - 0.5) * g.size * 0.55, g.y - g.size * 0.45 + g.size * 0.9 * p]
  if (t < first.st) {
    const u = ease.outCubic(prog(t, first.st - 0.8, first.st))
    const [x, y] = tipOf(first, 0)
    return [x + (1 - u) * 160, y - (1 - u) * 200, u]
  }
  if (t > HAND_END) {
    const last = HAND[HAND.length - 1]
    const u = ease.inOutSine(prog(t, HAND_END, HAND_END + 0.9))
    const [x, y] = tipOf(last, 1)
    return [x + u * 120, y - u * 220, 1 - u]
  }
  for (let i = 0; i < HAND.length; i++) {
    const g = HAND[i]
    const nx = HAND[i + 1]
    if (t >= g.st && t < g.st + g.dur) return [...tipOf(g, (t - g.st) / g.dur), 1]
    if (g.strikeSt && t >= g.strikeSt && t < g.strikeSt + 0.28) {
      const u = (t - g.strikeSt) / 0.28
      return [g.x + (tri(u * 2.5) - 0.5) * g.size, g.y - g.size * 0.45 + g.size * 0.95 * u, 1]
    }
    if (nx && t >= g.st + g.dur && t < nx.st) {
      const [ax, ay] = tipOf(g, 1)
      const [bx, by] = tipOf(nx, 0)
      const u = ease.inOutSine((t - g.st - g.dur) / (nx.st - g.st - g.dur))
      return [lerp(ax, bx, u), lerp(ay, by, u) - Math.sin(u * Math.PI) * 10, 1]
    }
  }
  return [0, 0, 0]
}

/** a 1940s fountain pen: the barrel off to the upper right, its shadow, the metal nib */
function drawPen(ctx: Ctx, t: number) {
  const [x, y, a] = penTip(t)
  if (a <= 0) return
  ctx.save()
  ctx.globalAlpha *= a
  // soft shadow on the paper (two wide faint strokes instead of a blur filter)
  ctx.save()
  ctx.lineCap = 'round'
  for (const [w, al] of [[22, 0.07], [12, 0.1]] as const) {
    ctx.strokeStyle = `rgba(70,45,20,${al})`
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x + 26, y + 6)
    ctx.lineTo(x + 150, y - 128)
    ctx.stroke()
  }
  ctx.restore()
  // section (grip), barrel, and a clip ring — a short fountain pen held at 45°
  penStroke(ctx, [x + 12, y - 20, x + 40, y - 54], 1, { width: 9, color: '#1c130d', alpha: 0.95, taperIn: 4, taperOut: 0, wobble: 0.2, pressure: 0, nib: false })
  penStroke(ctx, [x + 38, y - 52, x + 100, y - 124, x + 150, y - 182], 1, { width: 14, color: '#2b1c13', alpha: 0.93, taperIn: 0, taperOut: 4, wobble: 0.3, pressure: 0.03, nib: false })
  penStroke(ctx, [x + 46, y - 64, x + 140, y - 174], 1, { width: 2, color: '#a08466', alpha: 0.55, wobble: 0.3, nib: false })
  penStroke(ctx, [x + 32, y - 58, x + 46, y - 46], 1, { width: 2.2, color: '#b49a6c', alpha: 0.85, nib: false, taperIn: 1, taperOut: 1 })
  ctx.fillStyle = 'rgba(150,126,90,0.95)'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 8, y - 13)
  ctx.lineTo(x + 21, y - 27)
  ctx.lineTo(x + 11, y - 32)
  ctx.lineTo(x + 3, y - 16)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,28,18,0.8)'
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + 1, y - 2)
  ctx.lineTo(x + 12, y - 22)
  ctx.stroke()
  ctx.restore()
  void t
}

/** masks for what surfaces from the page: a 1940s lane, a woman, the moon */
function laneMask(g: Ctx) {
  const row = (xa: number, ta: number, ba: number, xb: number, tb: number, bb: number, n: number, seed: number) => {
    g.fillStyle = '#383838'
    g.beginPath()
    g.moveTo(xa, ta); g.lineTo(xb, tb); g.lineTo(xb, bb); g.lineTo(xa, ba); g.closePath()
    g.fill()
    g.lineCap = 'round'
    for (let i = 0; i <= n; i++) {
      const u = 1 - Math.pow(1 - i / n, 1.6)
      const xx = lerp(xa, xb, u), tt = lerp(ta, tb, u), bb2 = lerp(ba, bb, u)
      const w = lerp(11, 4, u)
      g.lineWidth = w
      g.strokeStyle = '#fff'
      g.beginPath(); g.moveTo(xx, tt - 18 * (1 - u)); g.lineTo(xx, bb2); g.stroke()
      if (i < n) {
        const u2 = 1 - Math.pow(1 - (i + 1) / n, 1.6)
        const x2 = lerp(xa, xb, u2)
        const t2 = lerp(ta, tb, u2), b2 = lerp(ba, bb, u2)
        const hh = bb2 - tt
        // gable bump (观音兜) on the roofline
        g.beginPath(); g.moveTo(xx, tt); g.quadraticCurveTo(xx + (x2 - xx) * 0.15, tt - hh * 0.12, xx + (x2 - xx) * 0.3, tt - hh * 0.02); g.stroke()
        // window (dark) and the 石库门 doorway (dark, white frame)
        g.fillStyle = '#000'
        const wx = lerp(xx, x2, 0.25), ww = (x2 - xx) * 0.3
        g.fillRect(wx, lerp(tt, t2, 0.25) + hh * 0.16, ww, hh * 0.18)
        const dx = lerp(xx, x2, 0.6), dw = (x2 - xx) * 0.26, dt = lerp(tt, t2, 0.6) + hh * 0.52
        g.fillRect(dx, dt, dw, lerp(bb2, b2, 0.6) - dt)
        g.lineWidth = w * 0.8
        g.strokeRect(dx - w, dt - w, dw + 2 * w, lerp(bb2, b2, 0.6) - dt + w)
        g.beginPath(); g.moveTo(dx - w * 2, dt - w); g.lineTo(dx + dw / 2, dt - hh * 0.08); g.lineTo(dx + dw + w * 2, dt - w); g.stroke()
        void seed
      }
    }
    g.lineWidth = 10
    g.beginPath(); g.moveTo(xa, ta); g.lineTo(xb, tb); g.stroke()
  }
  row(-20, 96, 700, 640, 300, 452, 7, 1)
  row(930, 200, 620, 765, 302, 456, 3, 2)
  // overhead wires and a lamp
  g.strokeStyle = '#ddd'
  g.lineWidth = 1.6
  for (const [a, b, c] of [[40, 250, 70], [60, 300, 90]] as const) {
    g.beginPath(); g.moveTo(0, a); g.quadraticCurveTo(500, b, 1000, c + 120); g.stroke()
  }
  g.lineWidth = 3
  g.beginPath(); g.moveTo(560, 660); g.lineTo(560, 360); g.lineTo(580, 350); g.stroke()
  g.fillStyle = '#fff'
  g.beginPath(); g.arc(582, 362, 8, 0, TAU); g.fill()
}

function moonMask(g: Ctx) {
  const gr = g.createRadialGradient(DROP.x - 12, DROP.y - 12, 6, DROP.x, DROP.y, 66)
  gr.addColorStop(0, '#fff')
  gr.addColorStop(0.8, '#bbb')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.beginPath(); g.arc(DROP.x, DROP.y, 66, 0, TAU); g.fill()
  g.lineWidth = 4
  g.beginPath(); g.arc(DROP.x, DROP.y, 60, 0, TAU); g.stroke()
}

function womanMask(g: Ctx) {
  eileen(g, 'youngStand', { x: 690, y: 690, h: 500, color: '#fff', dress: '#777', fill: 1, weight: 3.5, boil: 0 })
}

/** textImage, but once fully surfaced it is drawn from a cached layer */
function surf(ctx: Ctx, o: Parameters<typeof textImage>[1]) {
  if ((o.emerge ?? 1) < 1) return textImage(ctx, o)
  const c = cached(`surf:${o.key}`, W, H, (g) => textImage(g, { ...o, emerge: 1, t: 0 }))
  ctx.drawImage(c, 0, 0)
}

function surfacing(ctx: Ctx, t: number) {
  const corpus = OPENING
  surf(ctx, { key: 'A2-lane', draw: laneMask, corpus, cell: 10, emerge: prog(t, 15.0, 19.6), order: 'random', color: '#4a3524', alpha: 0.88, gamma: 1.0, scatter: 30, seed: 3 })
  surf(ctx, { key: 'A2-woman', draw: womanMask, corpus, cell: 10, emerge: prog(t, 16.4, 21.2), order: 'sweepYUp', color: '#2a1d14', alpha: 1, gamma: 1.2, scatter: 50, seed: 5 })
  surf(ctx, { key: 'A2-moon', draw: moonMask, corpus, cell: 10, emerge: prog(t, 18.4, 21.6), order: 'radial', ox: DROP.x, oy: DROP.y, color: '#6a4224', alpha: 0.95, gamma: 1.0, scatter: 40, seed: 7 })
}

function drawA2(ctx: Ctx, t: number) {
  oldPaper(ctx, t, { sepia: 0.1, stains: 0.4 })
  const s = lerp(1.0, 1.06, ease.inOutSine(prog(t, T_A2, T_A3 + 1.5)))
  ctx.save()
  cam(ctx, s, 900, 330, lerp(24, -16, prog(t, T_A2, T_A3 + 1.5)), 0)
  surfacing(ctx, t)
  // the tear: a red-yellow wet halo soaking into the paper
  const land = T_TEAR + 0.25
  const bloom = ease.outCubic(prog(t, land, T_A3 + 1.2))
  if (bloom > 0) {
    const R = lerp(6, 128, bloom)
    wash(ctx, [blobPoly(DROP.x, DROP.y, R * 1.3, 7, 0.16)], 'rgb(214,150,86)', { alpha: 0.2, blur: 16, edge: 1.4 })
    wash(ctx, [blobPoly(DROP.x + 2, DROP.y - 1, R * 0.85, 3, 0.12)], 'rgb(206,118,70)', { alpha: 0.2, blur: 10, edge: 1.6 })
    wash(ctx, [blobPoly(DROP.x - 3, DROP.y - 3, R * 0.45, 5, 0.1)], 'rgb(232,178,104)', { alpha: 0.26, blur: 9, edge: 0.5 })
  }
  drawHand(ctx, t)
  // the falling drop
  const fall = prog(t, T_TEAR - 0.35, land)
  if (fall > 0 && fall < 1) {
    const y = lerp(-30, DROP.y, ease.inCubic(fall))
    ctx.save()
    ctx.translate(DROP.x, y)
    ctx.scale(1, 1.25 + fall * 0.4)
    const g = ctx.createRadialGradient(-2, -2, 0, 0, 0, 7)
    g.addColorStop(0, 'rgba(250,210,140,0.95)')
    g.addColorStop(1, 'rgba(200,100,58,0.9)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, -10)
    ctx.quadraticCurveTo(6, -1, 5.5, 3)
    ctx.arc(0, 3, 5.5, 0, Math.PI)
    ctx.quadraticCurveTo(-6, -1, 0, -10)
    ctx.fill()
    ctx.restore()
  }
  const sp = prog(t, land, land + 0.6)
  if (sp > 0 && sp < 1) {
    penStroke(ctx, sketchEllipse(DROP.x, DROP.y, 10 + sp * 40, 7 + sp * 26, 12, 0.02), 1, {
      width: 1.2, color: 'rgb(170,80,50)', alpha: (1 - sp) * 0.6, nib: false,
    })
  }
  drawPen(ctx, t)
  ctx.restore()
}

// ───────────────────────────── A3 · title ─────────────────────────────

const TITLE = '一个有月亮的晚上'
const TITLE_Y = 432
const TITLE_SIZE = 90
const TITLE_TRACK = 26
const MOON_A3 = { x: 960, y: 222, r: 44 }

/** outline drawn (dash reveal per contour), then filled */
export function strokeRevealText(ctx: Ctx, text: string, x: number, y: number, pStroke: number, pFill: number, color: [number, number, number], lw = 1.1, L = 520) {
  if (pStroke <= 0) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (pFill > 0) {
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.95 * pFill})`
    ctx.fillText(text, x, y)
  }
  ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.9 * (1 - pFill * 0.7)})`
  ctx.lineWidth = lw
  ctx.setLineDash([Math.max(0.01, pStroke * L), L * 2])
  ctx.strokeText(text, x, y)
  ctx.restore()
}

/** The title card (also used by segG for the reprise). `beats`: stroke start per character. */
export function titleCard(ctx: Ctx, t: number, o: { beats: number[]; fade: number; dates: string }) {
  const col: [number, number, number] = [236, 228, 210]
  ctx.save()
  ctx.globalAlpha *= o.fade
  ctx.font = `300 ${TITLE_SIZE}px ${FONT.zh}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const chars = [...TITLE]
  const widths = chars.map((c) => ctx.measureText(c).width + TITLE_TRACK)
  const total = widths.reduce((a, b) => a + b, 0) - TITLE_TRACK
  let x = W / 2 - total / 2
  const jit = Math.floor(t * 8)
  chars.forEach((ch, i) => {
    const b = o.beats[i]
    const pS = ease.inOutSine(prog(t, b - 0.05, b + 1.1))
    const pF = ease.inOutSine(prog(t, b + 0.9, b + 2.4))
    const jx = (rand(jit, i) - 0.5) * 0.6 * (1 - pF), jy = (rand(jit, i + 50) - 0.5) * 0.6 * (1 - pF)
    strokeRevealText(ctx, ch, x + jx, TITLE_Y + jy, pS, pF, col)
    x += widths[i]
  })
  const last = o.beats[o.beats.length - 1]
  const e = ease.outCubic(prog(t, last + 0.9, last + 2.4))
  if (e > 0) {
    ctx.font = `italic 400 34px ${FONT.en}`
    ;(ctx as any).letterSpacing = '7px'
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.82 * e})`
    ctx.fillText('A Night with a Moon', W / 2, TITLE_Y + 70 + (1 - e) * 6)
  }
  const rp = ease.inOutSine(prog(t, last + 1.6, last + 3.0))
  penStroke(ctx, sketchLine(W / 2 - 110, TITLE_Y + 104, W / 2 + 110, TITLE_Y + 104, 21, 3), rp, {
    width: 1.1, color: C.lineNight, alpha: 0.55, boil: 8, t, nib: false,
  })
  const n = ease.outCubic(prog(t, last + 2.2, last + 3.6))
  if (n > 0) {
    ctx.font = `400 23px ${FONT.zh}`
    ;(ctx as any).letterSpacing = '6px'
    ctx.textAlign = 'right'
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.75 * n})`
    ctx.fillText('张爱玲', W / 2 - 22, TITLE_Y + 146)
    ctx.font = `400 23px ${FONT.en}`
    ;(ctx as any).letterSpacing = '3px'
    ctx.textAlign = 'left'
    ctx.fillText(o.dates, W / 2 + 2, TITLE_Y + 146)
    ctx.font = `italic 400 21px ${FONT.en}`
    ;(ctx as any).letterSpacing = '2px'
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.55 * n})`
    ctx.fillText('Eileen Chang', W / 2, TITLE_Y + 176)
  }
  ctx.restore()
}

export const TITLE_MOON = MOON_A3
const TITLE_BEATS = Array.from({ length: 8 }, (_, i) => beatTime(47 + i))

function drawA3(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 5 })
  const s = lerp(1.0, 1.045, ease.inOutSine(prog(t, T_A3, T_A4 + 1)))
  ctx.save()
  cam(ctx, s, W / 2, 380)
  // the drop's halo rises and becomes the moon
  const rise = ease.inOutCubic(prog(t, T_A3, T_A3 + 3.2))
  const mx = lerp(DROP.x, MOON_A3.x, rise), my = lerp(DROP.y, MOON_A3.y, rise)
  const r = lerp(30, MOON_A3.r, rise)
  const wet = lerp(1, 0.35, ease.inOutSine(prog(t, T_A3 + 1, T_A3 + 6)))
  moon(ctx, mx, my, r, { wet, glow: 0.9, t })
  penStroke(ctx, sketchEllipse(mx, my, r + 3, r + 3, 3, 0.1), 1, { width: 1.3, color: C.lineNight, wobble: 1.2, boil: 8, t, alpha: 0.28 * rise })
  const dx = (t - T_A3) * -9
  penDraw(ctx, [
    [mx - 330 + dx, my + 62, mx - 190 + dx, my + 50, mx - 20 + dx, my + 68, mx + 140 + dx, my + 56],
    [mx + 120 - dx * 0.6, my + 30, mx + 260 - dx * 0.6, my + 22, mx + 420 - dx * 0.6, my + 36],
  ], prog(t, T_A3 + 2.5, T_A3 + 6), { width: 1.1, color: C.lineNight, alpha: 0.32, boil: 8, t, wobble: 2, seed: 8 })
  const fade = 1 - ease.inOutSine(prog(t, T_A4 - 0.9, T_A4 + 0.6))
  titleCard(ctx, t, { beats: TITLE_BEATS, fade, dates: '1920 — 1995' })
  ctx.restore()
}

// ───────────────────────────── A4 · Shanghai under the moon ─────────────────────────────

type House = { fill: Poly; lines: Poly[]; shade: Poly[]; clip: Poly[]; z: number; rev: number; layer: number }
let REV = 0

const rectP = (x: number, y: number, w: number, h: number): Poly => [x, y, x + w, y, x + w, y + h, x, y + h, x, y]

/**
 * One 石库门 row receding in perspective (dir ±1): wall, pitched tiled roof, 观音兜 gable, dormers (老虎窗),
 * chimneys, 晒台 terraces with laundry, two-leaf windows, stone door frames with pediments, bamboo poles.
 */
function lanRow(seed: number, x0: number, y0: number, unitW: number, wallH: number, n: number, shrink: number, rise: number, layer: number, dir = 1): House[] {
  const out: House[] = []
  let x = x0, k = 1, base = y0
  for (let i = 0; i < n; i++) {
    const w = unitW * k * (0.86 + rand(i, seed + 9) * 0.3)
    const h = wallH * k * (0.9 + rand(i, seed + 8) * 0.28)
    const left = dir > 0 ? x : x - w
    const top = base - h
    const rh = h * 0.4
    const ox = w * 0.1 * dir
    const lines: Poly[] = []
    const shade: Poly[] = []
    const clip: Poly[] = []
    lines.push([left, base, left, top, left + w, top, left + w, base])
    const roof: Poly = [left - 4 * k, top, left + w + 4 * k, top, left + w + ox, top - rh, left + ox, top - rh, left - 4 * k, top]
    lines.push(roof)
    shade.push(roof)
    // shadow under the eave
    shade.push(rectP(left, top, w, h * 0.12))
    // 观音兜 gable at the far end of the unit
    const gx = dir > 0 ? left + 2 * k : left + w - 2 * k
    const gs = dir > 0 ? 1 : -1
    const gw = Math.abs(w * 0.1)
    const gable: Poly = [gx, top, gx + gs * gw * 0.3, top - rh * 0.6, gx + gs * gw * 0.2, top - rh * 1.15, gx + gs * gw * 0.6, top - rh * 1.42, gx + gs * gw * 1.25, top - rh * 1.5, gx + gs * gw * 1.6, top - rh * 1.2, gx + gs * gw * 1.4, top - rh * 0.9]
    lines.push(gable)
    // tile courses + a few individual tiles along the eave
    for (let j = 1; j < 4; j++) {
      const f = j / 4
      lines.push(sketchLine(left + ox * f + 6 * k, top - rh * f, left + w + ox * f - 6 * k, top - rh * f, seed * 100 + i * 10 + j, 2))
    }
    for (let j = 0; j < 7; j++) {
      const tx = left + w * (0.08 + j * 0.13)
      lines.push([tx, top - 1, tx + ox * 0.22, top - rh * 0.22])
    }
    const terrace = rand(i, seed + 5) < 0.22
    if (terrace) {
      // 晒台: a flat terrace with balustrade and a line of washing
      const tx = left + w * 0.45, tw = w * 0.5, ty = top - rh * 0.55
      lines.push([tx, top - 2, tx, ty, tx + tw, ty, tx + tw, top - 2])
      for (let j = 1; j < 6; j++) lines.push([tx + (tw * j) / 6, ty, tx + (tw * j) / 6, ty + rh * 0.3])
      lines.push(sketchLine(tx - tw * 0.2, ty - rh * 0.5, tx + tw * 1.1, ty - rh * 0.6, seed + i * 3, 2))
      for (let j = 0; j < 3; j++) {
        const cx = tx + tw * (0.05 + j * 0.33), cy = ty - rh * 0.52 - j * rh * 0.03
        lines.push([cx, cy, cx + 1, cy + rh * 0.42, cx + tw * 0.18, cy + rh * 0.4, cx + tw * 0.17, cy])
      }
      clip.push(rectP(tx - tw * 0.25, ty - rh * 0.7, tw * 1.4, rh * 0.75))
    } else if (rand(i, seed + 1) < 0.6) {
      const dx = left + w * (0.3 + rand(i, seed + 2) * 0.3), dw = w * 0.2, dh = rh * 0.55, db = top - rh * 0.2
      lines.push([dx, db, dx, db - dh, dx + dw, db - dh, dx + dw, db])
      lines.push([dx - 4 * k, db - dh, dx + dw / 2, db - dh * 1.5, dx + dw + 4 * k, db - dh])
      lines.push([dx + dw * 0.22, db - dh * 0.2, dx + dw * 0.22, db - dh * 0.8, dx + dw * 0.78, db - dh * 0.8, dx + dw * 0.78, db - dh * 0.2])
      lines.push([dx + dw * 0.5, db - dh * 0.8, dx + dw * 0.5, db - dh * 0.2])
    }
    // chimney on the back slope
    if (rand(i, seed + 6) < 0.45) {
      const cx = left + w * (0.15 + rand(i, seed + 7) * 0.6) + ox * 0.8, cw = w * 0.07, ch = rh * 0.9
      const cb = top - rh * 0.75
      lines.push([cx, cb, cx, cb - ch, cx + cw, cb - ch, cx + cw, cb])
      lines.push([cx - cw * 0.3, cb - ch, cx + cw * 1.3, cb - ch])
      shade.push(rectP(cx, cb - ch, cw, ch))
      clip.push(rectP(cx - cw, cb - ch - 3, cw * 3, ch + 3))
    }
    // upstairs: two windows with leaves
    for (let q = 0; q < 2; q++) {
      const wx = left + w * (0.12 + q * 0.42), ww = w * 0.28, wy = top + h * 0.18, wh = h * 0.24
      lines.push([wx, wy + wh, wx, wy, wx + ww, wy, wx + ww, wy + wh, wx, wy + wh])
      lines.push([wx + ww / 2, wy + 2, wx + ww / 2, wy + wh - 2])
      lines.push([wx - 3 * k, wy + wh + 3 * k, wx + ww + 3 * k, wy + wh + 3 * k])
    }
    // string course
    lines.push(sketchLine(left, top + h * 0.5, left + w, top + h * 0.5, seed + i * 7, 1))
    // stone door frame (石库门) with a pediment, and the two black leaves
    const dx2 = left + w * 0.36, dw2 = w * 0.28, dt = top + h * 0.6
    lines.push([dx2, base, dx2, dt, dx2 + dw2, dt, dx2 + dw2, base])
    lines.push([dx2 - 6 * k, dt - 2, dx2 + dw2 / 2, dt - h * 0.11, dx2 + dw2 + 6 * k, dt - 2])
    lines.push([dx2 - 6 * k, dt - 2, dx2 + dw2 + 6 * k, dt - 2])
    lines.push([dx2 + dw2 / 2, dt + 3, dx2 + dw2 / 2, base - 2])
    shade.push(rectP(dx2 + 2, dt + 3, dw2 - 4, base - dt - 4))
    // bamboo laundry pole poking out of a window
    if (rand(i, seed + 3) < 0.45) {
      const py = top + h * 0.16
      const px0 = left + w * 0.5, px1 = px0 - dir * w * 0.85
      lines.push(sketchLine(px0, py + 10 * k, px1, py - 6 * k, seed + i, 2))
      for (let j = 0; j < 2; j++) {
        const cl = lerp(px0, px1, 0.3 + j * 0.35), cy = lerp(py + 10 * k, py - 6 * k, 0.3 + j * 0.35)
        lines.push([cl, cy, cl + 2 * k, cy + 20 * k, cl + 14 * k, cy + 19 * k, cl + 13 * k, cy - 1])
      }
      clip.push(rectP(Math.min(px0, px1) - 4, py - 12 * k, Math.abs(px1 - px0) + 8, 40 * k))
    }
    const gTop = top - rh * 1.55
    const fill: Poly = [left - 4 * k, base + 2, left - 4 * k, top, left + ox + (dir > 0 ? 0 : 0), top - rh, gx + gs * gw * 1.25, gTop, left + w + ox, top - rh, left + w + 4 * k, top, left + w + 4 * k, base + 2]
    clip.push(fill)
    out.push({ fill, lines, shade, clip, z: base, rev: REV++, layer })
    x += dir * w
    k *= shrink
    base -= rise * k
  }
  return out
}

/** The old mansion (the Markham Road house of segment B): hipped roof, chimneys, arched windows, balcony. */
function mansion(x: number, base: number) {
  const w = 430, h = 250
  const top = base - h
  const lines: Poly[] = []
  const shade: Poly[] = []
  lines.push([x, base, x, top, x + w, top, x + w, base])
  const roof: Poly = [x - 18, top, x + 60, top - 110, x + w - 60, top - 110, x + w + 18, top, x - 18, top]
  lines.push(roof)
  shade.push(roof)
  for (let j = 1; j < 5; j++) lines.push(sketchLine(x - 18 + j * 15.6, top - j * 22, x + w + 18 - j * 15.6, top - j * 22, 70 + j, 2))
  // chimneys
  lines.push([x + w - 120, top - 92, x + w - 120, top - 168, x + w - 84, top - 168, x + w - 84, top - 92])
  lines.push([x + w - 128, top - 168, x + w - 76, top - 168])
  lines.push([x + 96, top - 100, x + 96, top - 150, x + 122, top - 150, x + 122, top - 100])
  lines.push([x + 90, top - 150, x + 128, top - 150])
  shade.push(rectP(x + w - 120, top - 168, 36, 76), rectP(x + 96, top - 150, 26, 50))
  lines.push(sketchLine(x - 10, top + 14, x + w + 10, top + 14, 61, 3))
  lines.push(sketchLine(x - 6, top + h * 0.5, x + w + 6, top + h * 0.5, 62, 3))
  shade.push(rectP(x, top, w, 14))
  let win: [number, number, number, number] = [0, 0, 0, 0]
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const wx = x + 34 + c * 102, wy = top + 34 + r * h * 0.5, ww = 52, wh = r === 0 ? 74 : 80
    if (r === 1 && c === 1) {
      lines.push([wx - 6, base, wx - 6, wy - 6, wx + ww / 2, wy - 26, wx + ww + 6, wy - 6, wx + ww + 6, base])
      lines.push([wx + ww / 2, wy, wx + ww / 2, base])
      for (let s = 0; s < 3; s++) lines.push([wx - 20 - s * 8, base - s * 6, wx + ww + 20 + s * 8, base - s * 6])
      continue
    }
    lines.push([wx, wy + wh, wx, wy + 10, wx + ww / 2, wy - 6, wx + ww, wy + 10, wx + ww, wy + wh, wx, wy + wh])
    lines.push([wx + ww / 2, wy - 2, wx + ww / 2, wy + wh])
    lines.push([wx, wy + wh * 0.45, wx + ww, wy + wh * 0.45])
    lines.push([wx - 5, wy + wh + 4, wx + ww + 5, wy + wh + 4])
    if (r === 0 && c === 2) win = [wx, wy - 6, ww, wh + 6]
    // shutters
    if (!(r === 0 && c === 2)) {
      lines.push([wx - 16, wy + 6, wx - 16, wy + wh, wx - 3, wy + wh, wx - 3, wy + 4])
      lines.push([wx + ww + 3, wy + 4, wx + ww + 3, wy + wh, wx + ww + 16, wy + wh, wx + ww + 16, wy + 6])
    }
  }
  for (let i = 0; i <= 10; i++) lines.push([x + 120 + i * 20, top + h * 0.5 - 2, x + 120 + i * 20, top + h * 0.5 - 30])
  lines.push(sketchLine(x + 112, top + h * 0.5 - 30, x + 328, top + h * 0.5 - 30, 64, 3))
  // a garden wall and a tree in front
  lines.push(sketchLine(x - 120, base + 30, x + w + 120, base + 30, 65, 4))
  lines.push(sketchLine(x - 120, base + 6, x + w + 120, base + 6, 66, 4))
  const fill: Poly = [x - 18, base + 32, x - 18, top, x + 60, top - 110, x + 96, top - 110, x + 96, top - 152, x + 122, top - 152, x + 122, top - 110, x + w - 120, top - 110, x + w - 120, top - 170, x + w - 84, top - 170, x + w - 84, top - 110, x + w - 60, top - 110, x + w + 18, top, x + w + 18, base + 32]
  const house: House = { fill, lines, shade, clip: [fill, rectP(x - 125, base, w + 250, 34)], z: base - 40, rev: REV++, layer: 2 }
  return { house, win }
}

/** The Bund, far off: the Customs House clock tower (1927) and the domed HSBC building (1923), with neighbours. */
function bund(x: number, base: number): House {
  const lines: Poly[] = []
  const shade: Poly[] = []
  const blocks: [number, number, number][] = [[-120, 70, 44], [-60, 56, 60], [0, 150, 52], [150, 90, 70], [240, 70, 50], [310, 60, 64], [370, 90, 46]]
  for (const [bx, bw, bh] of blocks) {
    lines.push([x + bx, base, x + bx, base - bh, x + bx + bw, base - bh, x + bx + bw, base])
    for (let r = 0; r < Math.floor(bh / 12); r++) lines.push(sketchLine(x + bx + 4, base - 8 - r * 12, x + bx + bw - 4, base - 8 - r * 12, bx + r, 1))
  }
  // HSBC: dome on a drum over the central block
  const hx = x + 75
  lines.push([hx - 26, base - 52, hx - 26, base - 70, hx + 26, base - 70, hx + 26, base - 52])
  lines.push([hx - 24, base - 70, hx - 22, base - 86, hx - 12, base - 98, hx, base - 101, hx + 12, base - 98, hx + 22, base - 86, hx + 24, base - 70])
  lines.push([hx, base - 101, hx, base - 110])
  // Customs House: block + stepped clock tower with a clock face and a small spire
  const cx = x + 185
  lines.push([cx - 18, base - 90, cx - 18, base - 150, cx + 18, base - 150, cx + 18, base - 90])
  lines.push(sketchEllipse(cx, base - 132, 9, 9, 31, 0.05))
  lines.push([cx, base - 132, cx, base - 139], [cx, base - 132, cx + 5, base - 130])
  lines.push([cx - 14, base - 150, cx - 14, base - 170, cx + 14, base - 170, cx + 14, base - 150])
  lines.push([cx - 9, base - 170, cx - 9, base - 184, cx + 9, base - 184, cx + 9, base - 170])
  lines.push([cx - 5, base - 184, cx, base - 204, cx + 5, base - 184])
  for (let c = 0; c < 5; c++) lines.push([cx - 30 + c * 15, base - 4, cx - 30 + c * 15, base - 60])
  shade.push(rectP(cx - 18, base - 150, 8, 60))
  const fill: Poly = [x - 120, base + 2, x - 120, base - 44, x - 60, base - 60, x - 26 + 75 - 75, base - 52, hx - 26, base - 70, hx, base - 110, hx + 26, base - 70, x + 150, base - 90, cx - 18, base - 90, cx, base - 204, cx + 18, base - 90, x + 240, base - 70, x + 310, base - 64, x + 370, base - 90, x + 416, base - 90, x + 416, base + 2]
  return { fill, lines, shade, clip: [rectP(x - 130, base - 210, 560, 214)], z: base, rev: REV++, layer: 0 }
}

const CITY = (() => {
  REV = 0
  const L0: House[] = [bund(160, 600), ...lanRow(11, 760, 640, 70, 52, 14, 0.96, 6, 0), ...lanRow(12, 2000, 655, 74, 54, 10, 0.96, 6, 0, -1)]
  const L1: House[] = [
    ...lanRow(3, -80, 760, 120, 92, 11, 0.93, 14, 1),
    ...lanRow(4, 2060, 790, 130, 100, 9, 0.93, 16, 1, -1),
  ]
  const m = mansion(1180, 1000)
  const L2: House[] = [
    ...lanRow(5, 1000, 905, 175, 140, 6, 0.92, 26, 2, -1),
    m.house,
    ...lanRow(7, -160, 1100, 250, 196, 6, 0.93, 44, 2),
    ...lanRow(8, 2120, 1140, 230, 190, 2, 0.95, 40, 2, -1),
  ]
  return { layers: [L0, L1, L2], win: m.win }
})()

const LAYER = {
  alpha: [0.38, 0.6, 0.9],
  fill: ['rgba(26,33,54,0.94)', 'rgba(19,25,42,0.96)', 'rgba(13,17,29,0.98)'],
  width: [0.8, 1.0, 1.4],
  t: [[0.0, 3.8], [0.8, 5.2], [1.8, 6.6]] as [number, number][],
}
const CW = 2600, CH = 1000, CX = -300, CY = 300

function drawHouse(g: Ctx, h: House, L: number, p: number, t: number) {
  g.save()
  g.globalAlpha *= Math.min(1, p * 3)
  fillPoly(g, h.fill, LAYER.fill[L])
  g.restore()
  if (L > 0) for (const [j, s] of h.shade.entries()) {
    hatch(g, [s], { angle: -0.5 - j * 0.3, gap: 5 + L, progress: p, width: 0.7, color: C.lineNight, alpha: 0.2 * LAYER.alpha[L], boil: 8, t, seed: h.rev * 7 + j })
  }
  penDraw(g, h.lines, p, { width: LAYER.width[L], color: C.lineNight, alpha: LAYER.alpha[L], boil: 8, t, wobble: 1, seed: h.rev })
}

/** the whole layer, finished, in one of three boil variants (world coords offset by CX, CY) */
function layerCache(L: number, v: number) {
  return cached(`A4:L${L}:v${v}`, CW, CH, (g) => {
    g.translate(-CX, -CY)
    const hs = [...CITY.layers[L]].sort((a, b) => a.z - b.z)
    for (const h of hs) drawHouse(g, h, L, 1, v / 8 + 0.01)
  })
}

function fillPoly(ctx: Ctx, p: Poly, color: string) {
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

/** telegraph pole and sagging wires in the foreground */
function wires(ctx: Ctx, t: number, p: number) {
  const polys: Poly[] = [
    [270, 1240, 264, 820, 260, 640],
    [220, 690, 318, 682],
    [228, 724, 308, 718],
  ]
  const ends: [number, number, number, number][] = [[224, 690, -300, 610], [224, 690, 1980, 560], [310, 684, 1980, 600], [230, 724, 1980, 640], [304, 718, 1700, 700]]
  for (const [x0, y0, x1, y1] of ends) {
    const sag = 60 + Math.abs(x1 - x0) * 0.03
    const pts: Poly = []
    for (let i = 0; i <= 40; i++) {
      const u = i / 40
      pts.push(lerp(x0, x1, u), lerp(y0, y1, u) + sag * 4 * u * (1 - u) + Math.sin(t * 0.8 + u * 3) * 1.5 * u * (1 - u))
    }
    polys.push(pts)
  }
  penDraw(ctx, polys, p, { width: 1.1, color: C.lineNight, alpha: 0.4, boil: 8, t, wobble: 0.6, seed: 900 })
}

function drawA4(ctx: Ctx, t: number) {
  nightPaper(ctx, t, { seed: 5 })
  const lt = t - T_A4
  const tilt = ease.inOutSine(prog(lt, 0, 8.6))
  const camY = lerp(-120, 330, tilt)
  const s = lerp(1.0, 1.1, tilt)
  const mx = lerp(MOON_A3.x, 1240, tilt), my = lerp(MOON_A3.y, 120, tilt)
  moon(ctx, mx, my, lerp(MOON_A3.r, 40, tilt), { wet: 0.35 * (1 - tilt), glow: 0.95, t })
  // drifting cloud strokes high in the sky
  const cdx = lt * -10
  penDraw(ctx, [
    [mx - 420 + cdx, my + 50, mx - 260 + cdx, my + 38, mx - 80 + cdx, my + 56, mx + 90 + cdx, my + 44],
    [mx + 80 + cdx * 0.6, my - 30, mx + 240 + cdx * 0.6, my - 44, mx + 400 + cdx * 0.6, my - 30],
  ], 1, { width: 1.1, color: C.lineNight, alpha: 0.3, boil: 8, t, wobble: 2, seed: 8 })
  ctx.save()
  ctx.translate(1300, 402)
  ctx.scale(s, s)
  ctx.translate(-1300, -402 - camY)
  const v = Math.floor(t * 8) % 3
  for (let L = 0; L < 3; L++) {
    const [a, b] = LAYER.t[L]
    const p = prog(lt, a, b)
    const hs = CITY.layers[L]
    const n = hs.length
    const order = [...hs].sort((x, y) => x.rev - y.rev)
    const hp = (h: House) => clamp(p * (n + 3) - order.indexOf(h) * 1.0, 0, 1)
    if (p > 0) {
      // houses still being drawn: live pen
      const live = [...hs].filter((h) => { const q = hp(h); return q > 0 && q < 1 }).sort((x, y) => x.z - y.z)
      for (const h of live) drawHouse(ctx, h, L, hp(h), t)
      // finished houses: from the layer cache, clipped to their shapes
      const done = hs.filter((h) => hp(h) >= 1)
      if (done.length) {
        ctx.save()
        ctx.beginPath()
        for (const h of done) for (const c of h.clip) {
          ctx.moveTo(c[0], c[1])
          for (let i = 2; i < c.length; i += 2) ctx.lineTo(c[i], c[i + 1])
          ctx.closePath()
        }
        ctx.clip()
        ctx.drawImage(layerCache(L, v), CX, CY)
        ctx.restore()
      }
    }
    // mist between layers
    if (L < 2) {
      const yMist = L === 0 ? 660 : 800
      const g = ctx.createLinearGradient(0, yMist - 110, 0, yMist + 40)
      g.addColorStop(0, 'rgba(70,86,120,0)')
      g.addColorStop(1, 'rgba(70,86,120,0.2)')
      ctx.fillStyle = g
      ctx.fillRect(-300, yMist - 110, W + 600, 150)
    }
  }
  // one window of the old house holds the moon
  const [wx, wy, ww, wh] = CITY.win
  const wl = ease.inOutSine(prog(lt, 5.4, 8.0))
  if (wl > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy + wh)
    ctx.lineTo(wx, wy + 16)
    ctx.lineTo(wx + ww / 2, wy)
    ctx.lineTo(wx + ww, wy + 16)
    ctx.lineTo(wx + ww, wy + wh)
    ctx.closePath()
    ctx.fillStyle = `rgba(232,204,156,${0.24 * wl})`
    ctx.fill()
    ctx.restore()
    glowAt(ctx, wx + ww / 2, wy + wh / 2, 130, 'rgba(240,210,160,ALPHA)', 0.13 * wl)
  }
  wires(ctx, t, prog(lt, 2.6, 6.2))
  ctx.restore()
  // the near street sinks into shadow, so the narration reads cleanly
  const sh = ctx.createLinearGradient(0, H * 0.62, 0, H)
  sh.addColorStop(0, 'rgba(10,13,22,0)')
  sh.addColorStop(0.45, `rgba(10,13,22,${0.5 * tilt})`)
  sh.addColorStop(1, `rgba(10,13,22,${0.72 * tilt})`)
  ctx.fillStyle = sh
  ctx.fillRect(0, H * 0.62, W, H * 0.38)
}

export const scenes: Scene[] = [
  { id: 'A1-moon', t0: 0, t1: T_A2, theme: 'night', draw: (ctx, t) => drawA1(ctx, t) },
  { id: 'A2-manuscript', t0: T_A2, t1: T_A3, theme: 'paper', trans: { kind: 'ink', dur: 1.4 }, draw: (ctx, t) => drawA2(ctx, t) },
  { id: 'A3-title', t0: T_A3, t1: T_A4, theme: 'night', trans: { kind: 'ink', dur: 1.1 }, draw: (ctx, t) => drawA3(ctx, t) },
  { id: 'A4-lanes', t0: T_A4, t1: T_B, theme: 'night', trans: { kind: 'dissolve', dur: 1.2 }, draw: (ctx, t) => drawA4(ctx, t) },
]
