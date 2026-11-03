/**
 * OWNER: agent B1 (backgrounds & texture).
 * Procedural material library: deterministic noise fields, aged-paper grounds and the per-frame finishing pass.
 * Everything expensive (noise, fibres, stains, burnt edges) is generated ONCE into cached offscreen canvases;
 * per-frame work is a handful of drawImage / gradient fills, so frames can render out of order.
 *
 * Inspiration: 宣纸 fibre + 絮 (flocculent clouds of fibre), 古籍 foxing (霉斑) and water tide-lines, PV 权御天下
 * orange parchment grounds with heavy mottling and a dark grunge rim.
 */
import { H, W } from '../config'
import { TAU, clamp, fract, lerp } from './math'
export type Ctx = CanvasRenderingContext2D

// ───────────────────────────────────────── cache + noise ─────────────────────────────────────────

const cache = new Map<string, HTMLCanvasElement>()

/** Offscreen canvas built once by `draw` and reused for the lifetime of the page. */
export function cached(key: string, w: number, h: number, draw: (g: Ctx, w: number, h: number) => void) {
  let c = cache.get(key)
  if (c) return c
  c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  cache.set(key, c)
  return c
}

/** Integer hash → [0,1). Better distributed than the sin-hash for dense noise lattices. */
export function hash2(x: number, y: number, s = 0) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1013, 1442695041)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  n ^= n >>> 16
  return (n >>> 0) / 4294967296
}

/** Seeded PRNG stream (mulberry32) for build-time scatter. */
export function prng(seed: number) {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function vnoise(x: number, y: number, px: number, py: number, s: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const x0 = ((ix % px) + px) % px
  const y0 = ((iy % py) + py) % py
  const x1 = (x0 + 1) % px
  const y1 = (y0 + 1) % py
  const a = hash2(x0, y0, s)
  const b = hash2(x1, y0, s)
  const c = hash2(x0, y1, s)
  const d = hash2(x1, y1, s)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/**
 * Tileable fBm field (w×h floats in 0..1). `cells` = lattice cells across the width at octave 0.
 * mode 'billow' gives puffy smoke, 'ridge' gives crack/vein-like lines.
 */
export function fbmField(w: number, h: number, cells: number, oct: number, seed: number, mode: 'fbm' | 'billow' | 'ridge' = 'fbm', gain = 0.5) {
  const f = new Float32Array(w * h)
  let norm = 0
  for (let o = 0, a = 1; o < oct; o++, a *= gain) norm += a
  const cy0 = Math.max(1, Math.round((cells * h) / w))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      let a = 1
      for (let o = 0; o < oct; o++) {
        const px = cells << o
        const py = cy0 << o
        let n = vnoise((x / w) * px, (y / h) * py, px, py, seed + o * 17)
        if (mode === 'billow') n = Math.abs(n * 2 - 1)
        else if (mode === 'ridge') n = 1 - Math.abs(n * 2 - 1)
        v += n * a
        a *= gain
      }
      f[y * w + x] = v / norm
    }
  }
  return f
}

export const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a))
  return k * k * (3 - 2 * k)
}

/** Paint a field into a canvas through a colour function returning [r,g,b,a(0..1)]. */
export function fieldCanvas(key: string, w: number, h: number, field: () => Float32Array, color: (v: number, x: number, y: number) => [number, number, number, number]) {
  return cached(key, w, h, (g) => {
    const f = field()
    const img = g.createImageData(w, h)
    const d = img.data
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        const [r, gg, b, a] = color(f[i], x, y)
        d[i * 4] = r
        d[i * 4 + 1] = gg
        d[i * 4 + 2] = b
        d[i * 4 + 3] = a * 255
      }
    }
    g.putImageData(img, 0, 0)
  })
}

/** 256² grain tile: mixed light/dark specks, alpha ≤ amp. Four variants for frame-to-frame flicker. */
export function grainTile(i: number) {
  return cached(`grain:${i}`, 256, 256, (g) => {
    const img = g.createImageData(256, 256)
    const d = img.data
    const r = prng(901 + i * 31)
    for (let p = 0; p < 256 * 256; p++) {
      const v = r()
      const light = v > 0.5
      const k = Math.abs(v - 0.5) * 2
      const c = light ? 255 : 0
      d[p * 4] = c
      d[p * 4 + 1] = light ? 240 : 0
      d[p * 4 + 2] = light ? 210 : 0
      d[p * 4 + 3] = Math.pow(k, 2.6) * 255 * 0.4
    }
    g.putImageData(img, 0, 0)
  })
}

// ───────────────────────────────────────── paper ─────────────────────────────────────────

export type Tone = 'warm' | 'ash' | 'red' | 'indigo'
type RGB = [number, number, number]
const TONES: Record<Tone, { dark: RGB; base: RGB; light: RGB; fox: RGB; fibreD: RGB; fibreL: RGB; char: RGB }> = {
  // aged parchment / PV map orange
  warm: { dark: [176, 94, 34], base: [226, 152, 72], light: [246, 200, 128], fox: [128, 56, 16], fibreD: [120, 60, 20], fibreL: [255, 230, 180], char: [34, 16, 8] },
  // pale 宣纸
  ash: { dark: [196, 176, 140], base: [226, 212, 182], light: [242, 234, 214], fox: [150, 105, 55], fibreD: [140, 115, 80], fibreL: [255, 250, 235], char: [40, 26, 16] },
  // red-dyed paper (battle cards)
  red: { dark: [96, 14, 16], base: [146, 28, 28], light: [184, 58, 40], fox: [52, 6, 8], fibreD: [70, 10, 10], fibreL: [230, 120, 90], char: [24, 6, 6] },
  // indigo-dyed paper (night)
  indigo: { dark: [24, 30, 54], base: [40, 52, 86], light: [66, 82, 120], fox: [14, 16, 32], fibreD: [16, 20, 40], fibreL: [130, 150, 190], char: [8, 8, 16] },
}
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const css = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

/** Paper fibres: many short curved strokes plus a few long ones. */
function fibres(g: Ctx, w: number, h: number, n: number, seed: number, dark: RGB, light: RGB, amp = 1) {
  const r = prng(seed)
  g.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const long = r() < 0.08
    const x = r() * w
    const y = r() * h
    const a = r() * TAU
    const l = long ? 60 + r() * 160 : 6 + r() * 34
    const bend = (r() - 0.5) * l * 0.6
    const isLight = r() < 0.45
    g.strokeStyle = css(isLight ? light : dark, (long ? 0.05 : 0.04 + r() * 0.1) * amp)
    g.lineWidth = 0.5 + r() * (long ? 0.8 : 1.2)
    g.beginPath()
    g.moveTo(x, y)
    const mx = x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend
    const my = y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend
    g.quadraticCurveTo(mx, my, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
}

/** Base sheet: two-scale mottling, flocculent fibre clouds, fibres and grain. Full-res, cached per tone. */
export function paperBase(tone: Tone) {
  return cached(`paper:${tone}`, W, H, (g) => {
    const T = TONES[tone]
    // 1. large mottling (480×270, upscaled smooth)
    const lo = fieldCanvas(`paperLo:${tone}`, 480, 270, () => {
      const a = fbmField(480, 270, 5, 5, 11)
      const b = fbmField(480, 270, 2, 3, 23)
      for (let i = 0; i < a.length; i++) a[i] = a[i] * 0.62 + b[i] * 0.38
      return a
    }, (v) => {
      const k = smooth(0.28, 0.72, v)
      const c = k < 0.5 ? mix(T.dark, T.base, k * 2) : mix(T.base, T.light, (k - 0.5) * 2)
      return [c[0], c[1], c[2], 1]
    })
    g.imageSmoothingQuality = 'high'
    g.drawImage(lo, 0, 0, W, H)
    // 2. flocculent fibre clouds (絮) at mid scale
    const mid = fieldCanvas(`paperMid:${tone}`, 960, 540, () => fbmField(960, 540, 48, 3, 37), (v) => {
      if (v > 0.5) return [T.fibreD[0], T.fibreD[1], T.fibreD[2], smooth(0.5, 0.8, v) * 0.22]
      return [T.fibreL[0], T.fibreL[1], T.fibreL[2], smooth(0.5, 0.22, v) * 0.16]
    })
    g.drawImage(mid, 0, 0, W, H)
    // 3. fibres
    fibres(g, W, H, 2600, 77, T.fibreD, T.fibreL)
    // 4. fine grain
    const pat = g.createPattern(grainTile(0), 'repeat')!
    g.globalAlpha = tone === 'ash' ? 0.2 : 0.28
    g.fillStyle = pat
    g.fillRect(0, 0, W, H)
    g.globalAlpha = 1
  })
}

/** Irregular blob path (noise-perturbed ellipse). */
function blob(g: Ctx, x: number, y: number, rx: number, ry: number, seed: number, wob = 0.25) {
  g.beginPath()
  const n = 48
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU
    const k = 1 + wob * (vnoise(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 997, 997, seed) - 0.5) * 2 + wob * 0.5 * (vnoise(Math.cos(a) * 5 + 9, Math.sin(a) * 5 + 9, 997, 997, seed + 1) - 0.5)
    const px = x + Math.cos(a) * rx * k
    const py = y + Math.sin(a) * ry * k
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
}

/** Foxing spots and water tide-lines, transparent sheet (cached per tone). */
export function paperStains(tone: Tone) {
  return cached(`stains:${tone}`, W, H, (g) => {
    const T = TONES[tone]
    const r = prng(tone.length * 13 + 5)
    // water stains with tide-lines
    for (let i = 0; i < 7; i++) {
      const x = r() * W
      const y = r() * H
      const rx = 90 + r() * 260
      const ry = rx * (0.6 + r() * 0.5)
      g.filter = 'blur(6px)'
      blob(g, x, y, rx, ry, 50 + i)
      g.fillStyle = css(T.fox, 0.07)
      g.fill()
      g.filter = 'blur(1.5px)'
      g.strokeStyle = css(T.fox, 0.22)
      g.lineWidth = 2.5
      g.stroke()
      blob(g, x + rx * 0.08, y - ry * 0.05, rx * 0.8, ry * 0.78, 80 + i)
      g.strokeStyle = css(T.fox, 0.12)
      g.lineWidth = 1.5
      g.stroke()
    }
    g.filter = 'none'
    // foxing: clusters of soft brown dots
    for (let i = 0; i < 90; i++) {
      const x = r() * W
      const y = r() * H
      const big = r() < 0.15
      const R = big ? 14 + r() * 26 : 2 + r() * 8
      const k = 2 + Math.floor(r() * 5)
      for (let j = 0; j < k; j++) {
        const px = x + (r() - 0.5) * R * 1.6
        const py = y + (r() - 0.5) * R * 1.6
        const rr = R * (0.3 + r() * 0.7)
        const gr = g.createRadialGradient(px, py, 0, px, py, rr)
        const a = big ? 0.12 + r() * 0.1 : 0.25 + r() * 0.3
        gr.addColorStop(0, css(T.fox, a))
        gr.addColorStop(0.7, css(T.fox, a * 0.5))
        gr.addColorStop(1, css(T.fox, 0))
        g.fillStyle = gr
        g.fillRect(px - rr, py - rr, rr * 2, rr * 2)
      }
    }
    // tiny ink specks
    for (let i = 0; i < 160; i++) {
      g.fillStyle = css(T.char, 0.15 + r() * 0.35)
      g.beginPath()
      g.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, TAU)
      g.fill()
    }
  })
}

/** Burnt / grunge edge: charred rim, a scorched brown band and a thin ember line between them. */
export function burnEdge(tone: Tone) {
  return cached(`burn:${tone}`, W, H, (g) => {
    const T = TONES[tone]
    const w = 960
    const h = 540
    const c = fieldCanvas(`burnLo:${tone}`, w, h, () => fbmField(w, h, 8, 5, 61), (v, x, y) => {
      // rounded-corner distance so the corners burn deeper
      const dx = Math.min(x, w - 1 - x)
      const dy = Math.min(y, h - 1 - y)
      const R = 90
      const d = dx < R && dy < R ? R - Math.hypot(R - dx, R - dy) : Math.min(dx, dy)
      const q = d / 70 + (v - 0.5) * 1.5
      if (q < 0.22) return [T.char[0], T.char[1], T.char[2], 0.96 * smooth(0.3, 0.05, q) + 0.04]
      if (q < 0.3) {
        const k = 1 - Math.abs(q - 0.26) / 0.04
        return [lerp(T.char[0], 190, k), lerp(T.char[1], 80, k), lerp(T.char[2], 24, k), 0.85]
      }
      const s = Math.pow(1 - smooth(0.3, 1.25, q), 1.8)
      return [T.fox[0] * 0.8, T.fox[1] * 0.7, T.fox[2] * 0.6, s * 0.6]
    })
    g.imageSmoothingQuality = 'high'
    g.drawImage(c, 0, 0, W, H)
  })
}

/**
 * Full-frame aged paper ground: mottled base, fibres, foxing and tide stains, burnt rim.
 * tone: 'warm' parchment (default), 'ash' xuan paper, 'red' and 'indigo' dyed papers.
 */
export function parchment(ctx: Ctx, t: number, o: { tone?: Tone; burn?: number; stains?: number } = {}) {
  const tone = o.tone ?? 'warm'
  ctx.save()
  ctx.drawImage(paperBase(tone), 0, 0, W, H)
  const st = o.stains ?? 0.8
  if (st > 0) {
    ctx.globalAlpha = clamp(st)
    ctx.drawImage(paperStains(tone), 0, 0, W, H)
  }
  // slow lamp-light breathing so a static ground still feels alive
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'soft-light'
  const lx = W * (0.45 + 0.08 * Math.sin(t * 0.21))
  const ly = H * (0.42 + 0.06 * Math.cos(t * 0.17))
  const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.7)
  gr.addColorStop(0, 'rgba(255,236,200,0.4)')
  gr.addColorStop(0.6, 'rgba(160,110,70,0.1)')
  gr.addColorStop(1, 'rgba(70,30,10,0.32)')
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
  const b = o.burn ?? 0.55
  if (b > 0) {
    ctx.globalAlpha = clamp(b)
    ctx.drawImage(burnEdge(tone), 0, 0, W, H)
  }
  ctx.restore()
}

// ───────────────────────────────────────── finishing pass ─────────────────────────────────────────

function fibreOverlay() {
  return cached('finish:fibre', W, H, (g) => {
    fibres(g, W, H, 1800, 313, [70, 45, 20], [250, 232, 196], 1.2)
    const r = prng(77)
    for (let i = 0; i < 4; i++) {
      const x = r() * W
      const y = r() * H
      const rx = 160 + r() * 260
      g.filter = 'blur(2px)'
      blob(g, x, y, rx, rx * 0.7, 300 + i)
      g.strokeStyle = 'rgba(110,70,30,0.10)'
      g.lineWidth = 3
      g.stroke()
    }
    g.filter = 'none'
  })
}

/**
 * Final overlay for every frame: paper fibre, subtle stains, film grain, warm vignette and an occasional
 * gold-foil sheen sweep. ≈2–4 ms at 1080p (three drawImage/pattern fills + two gradients).
 */
export function finishTexture(ctx: Ctx, t: number, o: { paper?: number; grain?: number; vignette?: number; sheen?: number } = {}) {
  ctx.save()
  const paper = o.paper ?? 0.6
  if (paper > 0) {
    ctx.globalAlpha = clamp(paper)
    ctx.drawImage(fibreOverlay(), 0, 0, W, H)
  }
  const grain = o.grain ?? 0.7
  if (grain > 0) {
    // 8 Hz: in step with the line boil, and gentler on the uploader's re-encode than per-frame noise
    const f = Math.floor(t * 8)
    const pat = ctx.createPattern(grainTile(f & 3), 'repeat')!
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, (f * 97) % 256, (f * 61) % 256]))
    ctx.globalAlpha = clamp(grain) * 0.6
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, W, H)
  }
  const v = o.vignette ?? 0.55
  if (v > 0) {
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'multiply'
    const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H / 2, H * 1.05)
    g.addColorStop(0, 'rgb(255,255,255)')
    g.addColorStop(0.6, `rgb(${255 - 40 * v | 0},${255 - 60 * v | 0},${255 - 80 * v | 0})`)
    g.addColorStop(1, `rgb(${255 - 150 * v | 0},${255 - 185 * v | 0},${255 - 205 * v | 0})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
  }
  const sh = o.sheen ?? 0.5
  if (sh > 0) {
    // one sweep every 7 s, lasting ~1.6 s
    const ph = fract(t / 7 + 0.35)
    const p = ph / 0.23
    if (p < 1) {
      const x = lerp(-W * 0.4, W * 1.4, p)
      const g = ctx.createLinearGradient(x - 260, 0, x + 260, H * 0.35)
      const a = sh * 0.22 * Math.sin(p * Math.PI)
      g.addColorStop(0, 'rgba(232,198,106,0)')
      g.addColorStop(0.45, `rgba(232,198,106,${a})`)
      g.addColorStop(0.5, `rgba(255,240,200,${a * 1.4})`)
      g.addColorStop(0.55, `rgba(232,198,106,${a})`)
      g.addColorStop(1, 'rgba(232,198,106,0)')
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }
  ctx.restore()
}
