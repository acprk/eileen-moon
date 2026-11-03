#!/usr/bin/env node
/** Bundle every scene module and collect exported WRITING_SFX spans → work/writing_sfx.json */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const segs = fs.readdirSync(path.join(root, 'src/scenes')).filter((f) => /^seg[A-Z]\.ts$/.test(f))
const entry = path.join(root, '.entries', 'sfx_entry.ts')
fs.mkdirSync(path.dirname(entry), { recursive: true })
fs.writeFileSync(entry, segs.map((f, i) => `import * as S${i} from '../src/scenes/${f.replace('.ts', '')}'`).join('\n') +
  `\nexport const ALL = [${segs.map((_, i) => `(S${i} as any).WRITING_SFX ?? []`).join(', ')}].flat()\n`)
const out = path.join(root, '.entries', 'sfx_entry.mjs')
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', loader: { '.json': 'json' } })
const mod = await import(out)
const spans = mod.ALL.sort((a, b) => a[0] - b[0])
fs.writeFileSync(path.join(root, 'work', 'writing_sfx.json'), JSON.stringify(spans))
console.log(spans.length, 'spans', spans.length ? `${spans[0][0]}…${spans[spans.length - 1][1]}` : '')
