// Render the promo with headless Chromium.
//   node tools/render.mjs --stills 1,3,5.5 --out sheet.jpg [--cols 3]   contact sheet of chosen times
//   node tools/render.mjs --video out.mp4 [--from 0 --to 60] [--workers 4] [--audio music.wav]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');  // promo/
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/${args.page || 'mishu/index.html'}`;

const browser = await playwright.chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(URL_);
  await page.evaluate(() => boot());
  return page;
}
// --blur N: motion blur by averaging N sub-frames spread over a 180° shutter (half a frame), running mean on a canvas
const BLUR = Math.max(1, Number(args.blur || 1));
// --fn / --canvas: which draw function to call and which canvas to capture (e.g. renderV + v for the 9:16 compositor)
const FN = String(args.fn || 'render'), CANVAS = String(args.canvas || 'c');
const grab = (page, t, q = 0.95) => page.evaluate(([t, q, n, fps, fn, id]) => {
  const cv = document.getElementById(id), draw = window[fn];
  if (n <= 1) { draw(t); return cv.toDataURL('image/jpeg', q); }
  const acc = window.__acc || (window.__acc = Object.assign(document.createElement('canvas'), { width: cv.width, height: cv.height }));
  const a = acc.getContext('2d');
  for (let i = 0; i < n; i++) {
    draw(t + (i / n) * (0.5 / fps));
    a.globalAlpha = 1 / (i + 1); a.drawImage(cv, 0, 0);
  }
  a.globalAlpha = 1;
  return acc.toDataURL('image/jpeg', q);
}, [t, q, BLUR, 30, FN, CANVAS]);

if (args.stills) {
  const times = String(args.stills).split(',').map(Number);
  const cols = Number(args.cols || 3), scale = Number(args.scale || 0.5);
  const page = await newPage();
  const shots = [];
  for (const t of times) shots.push(await grab(page, t));
  const sheet = await page.evaluate(async ([shots, times, cols, scale, nolabel]) => {
    const first = new Image(); first.src = shots[0]; await first.decode();
    const w = first.width * scale, h = first.height * scale, rows = Math.ceil(shots.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = h * rows;
    const x = c.getContext('2d');
    for (let i = 0; i < shots.length; i++) {
      const im = new Image(); im.src = shots[i]; await im.decode();
      x.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h);
      if (nolabel) continue; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect((i % cols) * w, Math.floor(i / cols) * h, 90, 30);
      x.fillStyle = '#ff0'; x.font = '20px monospace'; x.fillText(times[i].toFixed(2), (i % cols) * w + 8, Math.floor(i / cols) * h + 22);
    }
    return c.toDataURL('image/jpeg', 0.9);
  }, [shots, times, cols, scale, !!args.nolabel]);
  fs.writeFileSync(args.out || 'sheet.jpg', Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('wrote', args.out || 'sheet.jpg');
}

if (args.video) {
  const FPS = 30, from = Number(args.from || 0), to = Number(args.to || 60);
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  const workers = Number(args.workers || 4);
  const ff = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (args.audio) ff.push('-ss', String(from), '-t', String(to - from), '-i', args.audio);
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart');
  if (args.audio) ff.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  ff.push(args.video);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const pages = await Promise.all(Array.from({ length: workers }, newPage));
  const done = new Map(); let next = n0, written = n0; const t0 = Date.now();
  const flush = async () => {
    while (done.has(written)) {
      const buf = done.get(written); done.delete(written);
      if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
      written++;
      if (written % 150 === 0) console.log(`frame ${written}/${n1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  };
  await Promise.all(pages.map(async (page) => {
    while (next < n1) {
      const f = next++;
      const url = await grab(page, f / FPS, 0.96);
      done.set(f, Buffer.from(url.split(',')[1], 'base64'));
      await flush();
    }
  }));
  await flush();
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  console.log('wrote', args.video);
}
await browser.close();
server.close();
