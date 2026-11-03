/**
 * Compositor: picks the active scene(s) at time t, runs transitions, then the global layers —
 * narration subtitles, lyric rail, grain/vignette and the opening/closing fades.
 */
import { DUR, GRAIN_SCALE, H, W } from '../config'
import { CUES } from '../data/script'
import { LYRICS } from '../data/lyrics'
import { clamp, ease, prog, smoothstep } from './math'
import { cached, fbmField, finishTexture, type Ctx } from './texture'
import { lyricRail, subtitle, type Theme } from './type'

export type TransKind = 'cut' | 'dissolve' | 'ink' | 'flash' | 'burn' | 'whiteout'
export type Scene = {
  id: string
  /** global start/end seconds; the scene may be asked to draw up to (next.t0 + next.trans.dur) */
  t0: number
  t1: number
  theme: Theme
  /** transition INTO this scene from the previous one */
  trans?: { kind: TransKind; dur: number }
  /** t = global seconds, lt = t - t0 */
  draw: (ctx: Ctx, t: number, lt: number) => void
  /** hide global subtitles / lyric rail for this scene */
  noSubs?: boolean
  noLyrics?: boolean
  /** finishing pass strength overrides */
  grain?: number
  vignette?: number
}

let SCENES: Scene[] = []
export function registerScenes(s: Scene[]) {
  SCENES = [...s].sort((a, b) => a.t0 - b.t0)
}
export function sceneAt(t: number) {
  let i = SCENES.findIndex((s) => t >= s.t0 && t < s.t1)
  if (i < 0) i = t < (SCENES[0]?.t0 ?? 0) ? 0 : SCENES.length - 1
  return i
}

function layer(name: string) {
  return cached(`layer:${name}`, W, H, () => undefined)
}

const MW = 480, MH = 201
function noiseField() {
  const key = 'trans:noise'
  const g = (noiseField as any)[key] as Float32Array | undefined
  if (g) return g
  const f = fbmField(MW, MH, 6, 5, 211, 'fbm', 0.55)
  ;(noiseField as any)[key] = f
  return f
}

/** Ink-bleed mask: 1 where the new scene has soaked through. `p` 0..1. */
function inkMask(p: number, ember: boolean) {
  const c = cached('trans:mask', MW, MH, () => undefined)
  const g = c.getContext('2d')!
  const img = g.createImageData(MW, MH)
  const d = img.data
  const f = noiseField()
  // bias by distance from centre so it blooms outward like ink dropped on paper
  const thr = p * 1.35 - 0.15
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x
    const dx = (x - MW / 2) / (MW / 2), dy = (y - MH / 2) / (MH / 2)
    const v = f[i] * 0.65 + Math.hypot(dx, dy * 0.8) * 0.35
    const a = smoothstep(thr + 0.03, thr - 0.03, v)
    d[i * 4 + 3] = a * 255
    if (ember) {
      const e = Math.max(0, 1 - Math.abs(v - thr) / 0.025)
      d[i * 4] = 255; d[i * 4 + 1] = 150 + 80 * e; d[i * 4 + 2] = 60
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

function drawScene(ctx: Ctx, s: Scene, t: number) {
  ctx.save()
  s.draw(ctx, t, t - s.t0)
  ctx.restore()
}

export function renderFilm(ctx: Ctx, t: number) {
  if (!SCENES.length) return
  const i = sceneAt(t)
  const cur = SCENES[i]
  const prev = SCENES[i - 1]
  const tr = cur.trans
  const inTrans = prev && tr && tr.kind !== 'cut' && t < cur.t0 + tr.dur
  if (!inTrans) {
    drawScene(ctx, cur, t)
  } else {
    const p = ease.inOutSine(prog(t, cur.t0, cur.t0 + tr!.dur))
    drawScene(ctx, prev, t)
    const B = layer('B')
    const b = B.getContext('2d')!
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.globalAlpha = 1
    b.globalCompositeOperation = 'source-over'
    b.clearRect(0, 0, W, H)
    drawScene(b, cur, t)
    if (tr!.kind === 'dissolve' || tr!.kind === 'flash' || tr!.kind === 'whiteout') {
      ctx.save()
      ctx.globalAlpha = p
      ctx.drawImage(B, 0, 0)
      ctx.restore()
      if (tr!.kind !== 'dissolve') {
        const k = Math.sin(p * Math.PI)
        ctx.save()
        ctx.globalCompositeOperation = tr!.kind === 'flash' ? 'screen' : 'source-over'
        ctx.fillStyle = tr!.kind === 'flash' ? `rgba(255,236,200,${k * 0.85})` : `rgba(246,240,226,${k})`
        ctx.fillRect(0, 0, W, H)
        ctx.restore()
      }
    } else {
      const m = inkMask(p, tr!.kind === 'burn')
      b.save()
      b.globalCompositeOperation = 'destination-in'
      b.imageSmoothingQuality = 'high'
      b.drawImage(m, 0, 0, W, H)
      b.restore()
      ctx.drawImage(B, 0, 0)
      if (tr!.kind === 'burn') {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = Math.sin(p * Math.PI) * 0.6
        ctx.filter = 'blur(6px)'
        ctx.drawImage(m, 0, 0, W, H)
        ctx.restore()
      }
    }
  }
  const theme = cur.theme
  ctx.save()
  finishTexture(ctx, t, { paper: theme === 'paper' ? 0.35 : 0.12, grain: (cur.grain ?? (theme === 'paper' ? 0.55 : 0.7)) * GRAIN_SCALE, vignette: cur.vignette ?? 0.45, sheen: 0 })
  ctx.restore()
  if (!cur.noSubs) for (const c of CUES) subtitle(ctx, t, c, theme)
  if (!cur.noLyrics) lyricRail(ctx, t, LYRICS, theme)
  // global fades
  const fin = 1 - smoothstep(0, 2.2, t)
  const fout = smoothstep(DUR - 3, DUR - 0.2, t)
  const k = clamp(Math.max(fin, fout))
  if (k > 0) {
    ctx.fillStyle = `rgba(6,8,12,${k})`
    ctx.fillRect(0, 0, W, H)
  }
}
