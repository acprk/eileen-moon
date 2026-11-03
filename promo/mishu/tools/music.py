"""Original score for the 米麦 MIME TECH promo, synthesised from scratch with numpy (no samples, no third-party audio).

120 BPM (beat = 0.5 s), A minor. Every hit is placed on the film's events (see film.js).
usage: python3 -I music.py <out.wav>
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = 61.0
N = int(SR * DUR)
BEAT = 0.5
rs = np.random.default_rng(11)

L = np.zeros(N)   # dry bus (mono, widened at the end)
REV = np.zeros(N)  # reverb send
SIDE = np.zeros(N)  # stereo-only content (pad widening)


def idx(t):
    return int(round(t * SR))


def add(buf, t, sig, gain=1.0):
    i = idx(t)
    if i >= N:
        return
    j = min(N, i + len(sig))
    if i < 0:
        sig = sig[-i:]
        i = 0
        j = min(N, len(sig))
    buf[i:j] += sig[: j - i] * gain


def env_ad(n, a, d):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ── chords (bar = 2 s): Am9 – Fmaj7 – C(add9) – G6
CHORDS = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 60, 62, 64], [55, 59, 62, 64, 67]]
ROOTS = [45, 41, 48, 43]


def chord_at(t):
    return int(((t - 11.0) // 2.0) % 4) if t >= 11 else 0


# ── kick
def kick(gain=1.0, length=0.42):
    n = int(SR * length)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.16)
    s += 0.25 * fft_filter(rs.standard_normal(n), 2000, None) * np.exp(-t / 0.004)
    return np.tanh(s * 1.6) * gain


def noise_hit(length, lo, hi, decay, gain=1.0):
    n = int(SR * length)
    s = fft_filter(rs.standard_normal(n), lo, hi)
    s /= np.max(np.abs(s)) + 1e-9
    return s * env_ad(n, 0.001, decay) * gain


def pluck(m, length=0.32, gain=1.0, bright=1.0):
    n = int(SR * length)
    t = np.arange(n) / SR
    f = mtof(m)
    s = np.zeros(n)
    for k in range(1, 7):
        s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (6 + k * 6 / bright))
    return s * env_ad(n, 0.002, 0.18) * gain


def saw(f, t, harm=10):
    s = np.zeros_like(t)
    for k in range(1, harm + 1):
        s += np.sin(2 * np.pi * f * k * t) / k
    return s


def impact(gain=1.0):
    n = int(SR * 2.2)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t / 0.08)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    s += 0.5 * noise_hit(2.2, 200, 6000, 0.35)
    return np.tanh(s * 1.4) * gain


def riser(length, gain=1.0):
    n = int(SR * length)
    t = np.arange(n) / SR
    u = t / length
    s = rs.standard_normal(n)
    lo = fft_filter(s, 300, 1200)
    hi = fft_filter(s, 2500, 9000)
    out = (lo * (1 - u) + hi * u) * u ** 2
    # rising tone
    f = 200 * 2 ** (u * 3)
    out += 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 2
    return out / (np.max(np.abs(out)) + 1e-9) * gain


def whoosh(length=0.6, gain=1.0):
    n = int(SR * length)
    t = np.arange(n) / SR
    u = t / length
    s = fft_filter(rs.standard_normal(n), 400, 5000)
    s /= np.max(np.abs(s)) + 1e-9
    return s * np.sin(np.pi * u) ** 2 * gain


def blip(f, length=0.09, gain=1.0):
    n = int(SR * length)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env_ad(n, 0.002, 0.03) * gain


# ── pad (whole film), additive detuned saws, slow attack
t_all = np.arange(N) / SR
pad = np.zeros(N)
padR = np.zeros(N)
segs = [(0.0, 11.0, [57, 60, 64, 71, 76])] + [(11.0 + 2 * b, 13.0 + 2 * b, CHORDS[b % 4]) for b in range(21)] + [(53.0, 61.0, [45, 57, 64, 67, 71, 76])]
for a, b, notes in segs:
    i0, i1 = idx(a), min(N, idx(b + 0.4))
    tt = t_all[i0:i1] - a
    e = np.minimum(1, tt / 0.25) * np.minimum(1, np.maximum(0, (b + 0.4 - a) - tt) / 0.4)
    for m in notes:
        f = mtof(m)
        pad[i0:i1] += saw(f * 0.998, tt, 6) * e / len(notes)
        padR[i0:i1] += saw(f * 1.003, tt, 6) * e / len(notes)
pad = fft_filter(pad, 120, 2400)
padR = fft_filter(padR, 120, 2400)
pv = np.interp(t_all, [0, 2, 6, 11, 37, 38, 46, 53, 55, 61], [0.0, 0.55, 0.62, 0.32, 0.32, 0.5, 0.36, 0.7, 0.6, 0.0])

# film timeline (see film.js): chapters (start, end, authored length) — stage time lt maps to a + lt*(b-a)/len
CH = {1: (11, 19.5, 10), 2: (19.5, 28, 10), 3: (28, 37, 10), 4: (37, 46, 10), 5: (46, 53, 6)}
def T(ch, lt):
    a, b, ln = CH[ch]
    return a + lt * (b - a) / ln
CUTS = [11, 19.5, 28, 37, 46, 53]
HUD = (37.0, 41.0)
END = 53.0
L += (pad + padR) * 0.5 * pv * 0.5
SIDE += (pad - padR) * 0.5 * pv * 0.6
REV += (pad + padR) * 0.5 * pv * 0.25

# ── drums & bass
groove = lambda t: (11.0 <= t < HUD[0]) or (HUD[1] <= t < END)
in_hud = lambda t: HUD[0] <= t < HUD[1]
kicks = []
t = 6.0
while t < END - 1e-6:
    hook_beat = 6.0 <= t < 10.75
    if groove(t) or hook_beat or (in_hud(t) and abs((t - HUD[0]) % 2.0) < 1e-6):
        kicks.append(t)
    t += BEAT
for k in kicks:
    add(L, k, kick(0.95 if k >= 11 else 0.8))
# exhibition hits: one per exhibit + the finale
for t0 in [6.0, 7.0, 8.0, 9.0, 10.0]:
    add(L, t0, kick(1.0))
    add(L, t0, noise_hit(0.5, 1500, 12000, 0.12), 0.35)
    add(REV, t0, noise_hit(0.5, 1500, 12000, 0.12), 0.4)

t = 6.25
while t < END:
    if groove(t) or in_hud(t) or 6.0 <= t < 10.75:
        open_ = (int((t - 6.25) / BEAT) % 4 == 3)
        add(L, t, noise_hit(0.25 if open_ else 0.06, 7000, None, 0.07 if open_ else 0.018), (0.22 if t < 46 else 0.28) * (0.6 if t < 11 else 1))
    t += BEAT
# 16th shaker in the last chorus
t = 46.0
while t < END:
    add(L, t, noise_hit(0.04, 9000, None, 0.012), 0.08)
    t += BEAT / 2
# claps on 2 & 4
t = 11.5
while t < END:
    if groove(t):
        c = noise_hit(0.3, 900, 6000, 0.09) + 0.5 * np.roll(noise_hit(0.3, 900, 6000, 0.05), int(0.012 * SR))
        add(L, t, c, 0.32)
        add(REV, t, c, 0.35)
    t += 1.0

# sidechain envelope
duck = np.ones(N)
for k in kicks:
    i = idx(k)
    n = int(0.3 * SR)
    j = min(N, i + n)
    tt = np.arange(j - i) / SR
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.75 * np.exp(-tt / 0.09))

bass = np.zeros(N)
t = 11.0
while t < END:
    if groove(t) or in_hud(t):
        r = ROOTS[chord_at(t)]
        oct_ = 12 if int((t - 11) / (BEAT / 2)) % 4 == 3 else 0
        n = int(SR * BEAT / 2)
        tt = np.arange(n) / SR
        s = saw(mtof(r - 12 + oct_), tt, 8) * env_ad(n, 0.004, 0.16)
        s += 0.6 * np.sin(2 * np.pi * mtof(r - 12) * tt) * env_ad(n, 0.004, 0.2)
        add(bass, t, s, 0.25 if in_hud(t) else 0.5)
    t += BEAT / 2
# exhibition: sub pulse under the hook
t = 6.0
while t < 10.75:
    n = int(SR * BEAT); tt = np.arange(n) / SR
    add(bass, t, np.sin(2 * np.pi * mtof(33) * tt) * env_ad(n, 0.004, 0.25), 0.5)
    t += BEAT
bass = fft_filter(bass, 30, 900)
L += bass * duck * 0.9

# ── arpeggio 16ths, from chapter 02
arp = np.zeros(N)
t = 19.5
step = 0
pattern = [0, 2, 1, 3, 4, 3, 1, 2]
while t < END:
    ch = CHORDS[chord_at(t)]
    m = ch[pattern[step % 8] % len(ch)] + (12 if (t >= 46 and step % 8 in (3, 4)) else 0)
    g = 0.08 if in_hud(t) else (0.2 if t >= 46 else 0.16)
    add(arp, t, pluck(m, 0.3, 1.0, 1.6 if t >= 46 else 1.0), g)
    t += BEAT / 2
    step += 1
# exhibition: a bright motif on each exhibit
for t0, m in [(6.0, 69), (7.0, 72), (8.0, 76), (9.0, 79), (10.0, 81)]:
    for k, dm in enumerate([0, 7, 12]):
        add(arp, t0 + k * 0.125, pluck(m + dm, 0.5, 1.0, 1.4), 0.16)
L += arp * (0.6 + 0.4 * duck)
REV += arp * 0.5

# HUD ticks (chapter 04)
t = 37.0
while t < 46.0:
    add(L, t, blip(2400, 0.03), 0.05)
    t += BEAT / 2

# ── FX
add(L, 0.2, riser(1.8, 0.10))
add(L, 1.7, impact(0.75)); add(REV, 1.7, impact(0.5))
add(L, 3.5, riser(2.5, 0.22))
add(REV, 3.5, riser(2.5, 0.2))
add(L, 5.2, riser(0.8, 0.25))
add(L, 6.0, impact(0.6)); add(REV, 6.0, impact(0.4))
for c in CUTS:
    add(L, c - 0.45, whoosh(0.6, 0.3))
    add(REV, c - 0.45, whoosh(0.6, 0.2))
add(L, 11.0, impact(0.55)); add(REV, 11.0, impact(0.4))
add(L, 44.0, riser(2.0, 0.25)); add(REV, 44.0, riser(2.0, 0.2))
add(L, 46.0, impact(0.6)); add(REV, 46.0, noise_hit(2.5, 3000, None, 0.9), 0.25)
add(L, END, impact(0.95)); add(REV, END, impact(0.8))
# UI events, placed on the film's stage times
ui = [(T(1, 1.2), 1320), (T(1, 4.6), 1760), (T(1, 6.0), 1980), (T(1, 7.3), 2640),
      (T(2, 3.0), 1760), (T(2, 6.2), 2200), (T(2, 6.8), 3300), (T(2, 8.2), 2640),
      (T(3, 1.0), 1760), (T(3, 1.05), 2640), (T(3, 2.4), 1320), (T(3, 4.45), 2200), (T(3, 5.6), 2640), (T(3, 5.75), 3520),
      (T(4, 1.4), 1320), (T(4, 1.65), 1480), (T(4, 1.9), 1760), (T(4, 6.3), 2200), (T(4, 6.8), 2640)]
ui += [(T(5, 0.2 + k * 0.24), 2640 + 220 * (k % 4)) for k in range(8)]
ui += [(6.2, 2640), (7.2, 2640), (8.2, 2640), (9.2, 2640), (10.25, 3300)]
for t0, f in ui:
    add(L, t0, blip(f, 0.1), 0.16)
    add(REV, t0, blip(f, 0.1), 0.12)
# coins (chapter 03 payout)
for k in range(5):
    add(L, T(3, 7.7) + k * 0.06, blip(3960 + k * 300, 0.12), 0.12)
# revoke glitch (chapter 04)
TR = T(4, 5.0)
gl = np.zeros(int(0.5 * SR))
for k in range(10):
    s = int(k * 0.045 * SR)
    seg = noise_hit(0.03, 300 + 400 * (k % 3), 4000, 0.01) * (1 - k / 10)
    gl[s:s + len(seg)] += seg[: len(gl) - s]
add(L, TR, gl, 0.5)
n = int(1.2 * SR)
tt = np.arange(n) / SR
add(L, TR, np.sin(2 * np.pi * np.cumsum(600 * 2 ** (-tt * 4)) / SR) * np.exp(-tt / 0.4), 0.25)

# ── reverb (convolution with decaying stereo noise)
ir_n = int(2.4 * SR)
tt = np.arange(ir_n) / SR
irL = rs.standard_normal(ir_n) * np.exp(-tt / 0.55)
irR = rs.standard_normal(ir_n) * np.exp(-tt / 0.55)
irL = fft_filter(irL, 200, 7000); irR = fft_filter(irR, 200, 7000)
irL /= np.sqrt(np.sum(irL ** 2)); irR /= np.sqrt(np.sum(irR ** 2))
M = 1 << int(np.ceil(np.log2(N + ir_n)))
RF = np.fft.rfft(REV, M)
wetL = np.fft.irfft(RF * np.fft.rfft(irL, M), M)[:N]
wetR = np.fft.irfft(RF * np.fft.rfft(irR, M), M)[:N]

outL = L + SIDE + wetL * 0.5
outR = L - SIDE + wetR * 0.5
# fades
fade = np.interp(t_all, [0, 0.05, 59.0, 60.6, 61], [0, 1, 1, 0, 0])
outL *= fade; outR *= fade
# master: gentle glue + loudness to ~ -14 LUFS (approx. via RMS) and true-peak safety
st = np.stack([outL, outR], 1)
rms = np.sqrt(np.mean(st[idx(11):idx(53)] ** 2))
st *= 10 ** (-13.2 / 20) / (rms + 1e-9)
st = np.tanh(st * 1.15) / 1.15
peak = np.max(np.abs(st))
if peak > 0.94:
    st *= 0.94 / peak
pcm = (st * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1], 'peak', float(np.max(np.abs(st))))
