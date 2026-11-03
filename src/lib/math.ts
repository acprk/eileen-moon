import beatsData from '../data/beats.json'

export const TAU = Math.PI * 2
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 0→1 as t goes a→b, clamped. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const fract = (v: number) => v - Math.floor(v)
export const smoothstep = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a))
  return k * k * (3 - 2 * k)
}
/** Fade in over [a, a+fi], hold, fade out over [b-fo, b]. */
export const envelope = (t: number, a: number, b: number, fi = 0.6, fo = 0.6) =>
  Math.min(smoothstep(a, a + fi, t), 1 - smoothstep(b - fo, b, t))

export function rand(i: number, s = 0) {
  const x = Math.sin(i * 127.1 + s * 311.7 + 74.7) * 43758.5453
  return x - Math.floor(x)
}

export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
}

/** Impulse that is 1 at t0 and decays after it. */
export const hit = (t: number, t0: number, decay = 6) => (t < t0 ? 0 : Math.exp(-(t - t0) * decay))

// ───────────── beat grid (librosa, 117.45 BPM, IBI ≈ 0.511 s) ─────────────

export const BEATS: number[] = beatsData.beats
export const BPM = beatsData.tempo
export const IBI = 60 / BPM

/** Index of the last beat at or before t (−1 before the first beat). */
export function beatIndex(t: number) {
  let lo = 0
  let hi = BEATS.length - 1
  if (t < BEATS[0]) return -1
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1
    if (BEATS[m] <= t) lo = m
    else hi = m - 1
  }
  return lo
}
/** Time of beat i (extrapolated beyond the tracked range). */
export function beatTime(i: number) {
  if (i < 0) return BEATS[0] + i * IBI
  if (i >= BEATS.length) return BEATS[BEATS.length - 1] + (i - BEATS.length + 1) * IBI
  return BEATS[i]
}
export function nearestBeat(t: number) {
  const i = beatIndex(t)
  const a = beatTime(i)
  const b = beatTime(i + 1)
  return t - a < b - t ? a : b
}
/** 1 on every beat (or every `every` beats), exponential decay in between. */
export function beatPulse(t: number, decay = 7, every = 1) {
  const i = beatIndex(t)
  if (i < 0) return 0
  const k = i - (((i % every) + every) % every)
  return Math.exp(-(t - beatTime(k)) * decay)
}
/** Continuous beat position (e.g. 80.5 = halfway between beat 80 and 81). */
export function beatPos(t: number) {
  const i = beatIndex(t)
  const a = beatTime(i)
  const b = beatTime(i + 1)
  return i + (t - a) / (b - a)
}
