#!/usr/bin/env node
/**
 * Fast stills: bundle once, open one browser, render many frames.
 *
 *   node tools/stills.mjs --mod src/scenes/segB.ts --tag B 42 45.5 50      # times in global seconds
 *   node tools/stills.mjs --tag full 10 20 30                               # whole film (all segments)
 *   node tools/stills.mjs --mod src/lab/figH1.ts --tag H1 0 1 2 --scale 0.5
 *
 * --mod <file> : a module exporting `scenes: Scene[]`; only those scenes are registered (isolates other
 *                agents' work-in-progress). Omit to use src/scenes/index.ts (ALL_SCENES).
 * --sheet      : also write stills/<tag>_sheet.jpg (all frames tiled, 2 per row) for one-shot review.
 * Output: stills/<tag>_<t>.png
 */
import { bundle } from '@remotion/bundler'
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)
let mod = null, tag = 'still', scale = 1, sheet = false
const times = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--mod') mod = args[++i]
  else if (a === '--tag') tag = args[++i]
  else if (a === '--scale') scale = parseFloat(args[++i])
  else if (a === '--sheet') sheet = true
  else times.push(parseFloat(a))
}
if (!times.length) { console.error('no times'); process.exit(1) }

const entDir = path.join(root, '.entries')
fs.mkdirSync(entDir, { recursive: true })
const key = (mod ? mod.replace(/[^A-Za-z0-9]/g, '_') : 'all') + '_' + process.pid
const entry = path.join(entDir, `${key}.tsx`)
const modImport = mod ? path.relative(entDir, path.resolve(root, mod)).replace(/\.tsx?$/, '') : '../src/scenes'
const sceneExpr = mod ? 'M.scenes' : 'M.ALL_SCENES'
fs.writeFileSync(entry, `import { Composition, registerRoot } from 'remotion'
import { DUR, FPS, H, W } from '../src/config'
import { makeFilm } from '../src/Film'
import * as M from '${modImport.startsWith('.') ? modImport : './' + modImport}'
const Film = makeFilm(${sceneExpr})
registerRoot(() => <Composition id="Film" component={Film} width={W} height={H} fps={FPS} durationInFrames={Math.round(DUR * FPS)} defaultProps={{ offset: 0, audio: false }} />)
`)
const serveUrl = await bundle({ entryPoint: entry, publicDir: path.join(root, 'public'), onProgress: () => undefined })
const browser = await openBrowser('chrome', { browserExecutable: '/usr/bin/google-chrome' })
const composition = await selectComposition({ serveUrl, id: 'Film', puppeteerInstance: browser, inputProps: { offset: 0, audio: false } })
fs.mkdirSync(path.join(root, 'stills'), { recursive: true })
const outs = []
for (const t of times) {
  const out = path.join(root, 'stills', `${tag}_${t}.png`)
  const t0 = Date.now()
  await renderStill({ composition, serveUrl, output: out, frame: Math.round(t * 24), puppeteerInstance: browser, scale, inputProps: { offset: 0, audio: false }, timeoutInMilliseconds: 120000 })
  console.log(`${out}  (${Date.now() - t0} ms)`)
  outs.push(out)
}
await browser.close({ silent: true })
fs.rmSync(entry, { force: true })
if (sheet && outs.length) {
  const sheetOut = path.join(root, 'stills', `${tag}_sheet.jpg`)
  const n = outs.length
  const rows = Math.ceil(n / 2)
  const inputs = outs.flatMap((o) => ['-i', o])
  const filt = outs.map((_, i) => `[${i}:v]scale=960:-1,drawtext=text='${times[i]}s':x=10:y=10:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.5[v${i}]`).join(';')
  const pads = n % 2 ? `;color=black:s=960x402:d=1[pad]` : ''
  const ins = outs.map((_, i) => `[v${i}]`).join('') + (n % 2 ? '[pad]' : '')
  const layout = Array.from({ length: rows * 2 }, (_, i) => `${(i % 2) * 960}_${Math.floor(i / 2)}*402`.replace(/(\d+)\*402/, (m, r) => String(r * 402))).join('|')
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${filt}${pads};${ins}xstack=inputs=${rows * 2}:layout=${layout}`, '-frames:v', '1', '-q:v', '3', sheetOut])
  console.log(sheetOut)
}
process.exit(0)
