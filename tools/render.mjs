#!/usr/bin/env node
/**
 * Render the film (or a time range) to MP4 with audio.
 *   node tools/render.mjs --out out/film.mp4                      # whole film
 *   node tools/render.mjs --from 76 --to 110 --scale 0.5 --out out/C_preview.mp4
 * Options: --conc N (default 8), --crf N (default 16)
 */
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const a = process.argv.slice(2)
const opt = (k, d) => {
  const i = a.indexOf(`--${k}`)
  return i >= 0 ? a[i + 1] : d
}
const out = path.resolve(root, opt('out', 'out/film.mp4'))
const scale = parseFloat(opt('scale', '1'))
const conc = parseInt(opt('conc', '8'), 10)
const crf = parseInt(opt('crf', '16'), 10)
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public'), onProgress: () => undefined })
const composition = await selectComposition({ serveUrl, id: 'Film', inputProps: { offset: 0, audio: true }, browserExecutable: '/usr/bin/google-chrome' })
const last = composition.durationInFrames - 1
const f0 = Math.max(0, Math.round(parseFloat(opt('from', '0')) * 24))
const f1 = Math.min(last, Math.round(parseFloat(opt('to', String(last / 24))) * 24))
const t0 = Date.now()
let lastLog = 0
await renderMedia({
  composition, serveUrl, codec: 'h264', outputLocation: out, inputProps: { offset: 0, audio: true },
  frameRange: [f0, f1], scale, concurrency: conc, crf, pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '320k',
  muted: a.includes('--muted'),
  browserExecutable: '/usr/bin/google-chrome', timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => {
    const now = Date.now()
    if (now - lastLog > 15000) {
      lastLog = now
      console.log(`${(progress * 100).toFixed(1)}%  ${((now - t0) / 1000).toFixed(0)} s`)
    }
  },
})
console.log(`done ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
