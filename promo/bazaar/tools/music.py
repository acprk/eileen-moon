"""Original score + sound design for 米麦集市 MIME BAZAAR (60 s), synthesised with numpy — no samples.

120 BPM, C major / A minor, marimba-like plucks for the market, coins and cash-register ka-chings on every sale.
Event times follow bazaar.js. usage: python3 -I music.py <out.wav>
"""
import sys
import wave
import numpy as np

SR = 48000
DUR = 61.0
N = int(SR * DUR)
BEAT = 0.5
rs = np.random.default_rng(23)
L = np.zeros(N); REV = np.zeros(N); SIDE = np.zeros(N)
t_all = np.arange(N) / SR


def idx(t):
    return int(round(t * SR))


def add(buf, t, sig, gain=1.0):
    i = idx(t)
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def saw(f, t, harm=8):
    s = np.zeros_like(t)
    for k in range(1, harm + 1):
        s += np.sin(2 * np.pi * f * k * t) / k
    return s


def kick(gain=1.0):
    n = int(SR * 0.4); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
    s += 0.2 * fft_filter(rs.standard_normal(n), 2000, None) * np.exp(-t / 0.004)
    return np.tanh(s * 1.6) * gain


def noise_hit(length, lo, hi, decay, gain=1.0):
    n = int(SR * length); s = fft_filter(rs.standard_normal(n), lo, hi)
    s /= np.max(np.abs(s)) + 1e-9
    return s * env_ad(n, 0.001, decay) * gain


def marimba(m, length=0.45, gain=1.0):
    n = int(SR * length); t = np.arange(n) / SR; f = mtof(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.04) + 0.15 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.01)
    return s * env_ad(n, 0.001, 0.3) * gain


def pluck(m, length=0.3, gain=1.0):
    n = int(SR * length); t = np.arange(n) / SR; f = mtof(m); s = np.zeros(n)
    for k in range(1, 6):
        s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (7 + k * 7))
    return s * env_ad(n, 0.002, 0.18) * gain


def impact(gain=1.0):
    n = int(SR * 2.0); t = np.arange(n) / SR
    f = 40 + 60 * np.exp(-t / 0.08)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.6) + 0.5 * noise_hit(2.0, 200, 6000, 0.3)
    return np.tanh(s * 1.4) * gain


def riser(length, gain=1.0):
    n = int(SR * length); t = np.arange(n) / SR; u = t / length; s = rs.standard_normal(n)
    out = (fft_filter(s, 300, 1200) * (1 - u) + fft_filter(s, 2500, 9000) * u) * u ** 2
    out += 0.25 * np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 3)) / SR) * u ** 2
    return out / (np.max(np.abs(out)) + 1e-9) * gain


def whoosh(length=0.6, gain=1.0):
    n = int(SR * length); u = np.arange(n) / n
    s = fft_filter(rs.standard_normal(n), 400, 5000); s /= np.max(np.abs(s)) + 1e-9
    return s * np.sin(np.pi * u) ** 2 * gain


def blip(f, length=0.09, gain=1.0):
    n = int(SR * length); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env_ad(n, 0.002, 0.03) * gain


def tick(gain=1.0):   # keyboard / UI tick
    return noise_hit(0.03, 2500, 9000, 0.006, gain)


def thunk(gain=1.0):  # a box landing on a wooden shelf
    n = int(SR * 0.3); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(180 * np.exp(-t / 0.05) + 70) / SR) * np.exp(-t / 0.07) + 0.4 * noise_hit(0.3, 300, 2500, 0.02)
    return np.tanh(s * 1.5) * gain


def snip(gain=1.0):   # scissors through the ribbon
    s = noise_hit(0.12, 3000, None, 0.02) + 0.6 * np.roll(noise_hit(0.12, 4000, None, 0.015), int(0.045 * SR))
    return s * gain


def coin_clink(f0=2600.0, gain=1.0):
    n = int(SR * 0.6); t = np.arange(n) / SR; s = np.zeros(n)
    for r, a, d in [(1.0, 1.0, 0.22), (1.62, 0.7, 0.16), (2.31, 0.5, 0.12), (2.97, 0.35, 0.09), (3.63, 0.25, 0.07)]:
        s += a * np.sin(2 * np.pi * f0 * r * t + r) * np.exp(-t / d)
    s += 0.6 * fft_filter(rs.standard_normal(n), 3000, None) * np.exp(-t / 0.003)
    b = int(0.075 * SR); s[b:] += 0.45 * s[: n - b] * np.exp(-t[: n - b] / 0.1)
    return s / (np.max(np.abs(s)) + 1e-9) * gain


def kaching(gain=1.0):
    n = int(SR * 1.4); t = np.arange(n) / SR; s = np.zeros(n)
    s += 0.8 * fft_filter(rs.standard_normal(n), 1200, 5000) * np.exp(-t / 0.012)
    d = int(0.06 * SR); bell = np.zeros(n)
    for f, a, dc in [(1568, 1.0, 0.7), (3136, 0.55, 0.45), (4699, 0.3, 0.3), (2093, 0.45, 0.6)]:
        bell += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dc)
    s[d:] += 0.7 * bell[: n - d]
    th = 0.6 * np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.08)
    s[int(0.02 * SR):] += th[: n - int(0.02 * SR)]
    return s / (np.max(np.abs(s)) + 1e-9) * gain


def money(t0, kind='coin', g=1.0, f0=2600.0):
    s = coin_clink(f0) if kind == 'coin' else kaching()
    add(L, t0, s, (0.22 if kind == 'coin' else 0.34) * g)
    add(REV, t0, s, (0.10 if kind == 'coin' else 0.16) * g)


def ui(t0, f, g=1.0):
    add(L, t0, blip(f, 0.1), 0.15 * g); add(REV, t0, blip(f, 0.1), 0.1 * g)


# ── harmony: C – Am – F – G (bar = 2 s), from 9 s
CHORDS = [[60, 64, 67, 72, 76], [57, 60, 64, 69, 72], [53, 57, 60, 65, 69], [55, 59, 62, 67, 71]]
ROOTS = [48, 45, 41, 43]
chord_at = lambda t: int(((t - 9.0) // 2.0) % 4) if t >= 9 else 0

# pad
pad = np.zeros(N); padR = np.zeros(N)
segs = [(0.0, 9.0, [60, 64, 67, 71, 74])] + [(9.0 + 2 * b, 11.0 + 2 * b, CHORDS[b % 4]) for b in range(22)] + [(53.0, 61.0, [48, 60, 64, 67, 71, 76])]
for a, b, notes in segs:
    i0, i1 = idx(a), min(N, idx(b + 0.4)); tt = t_all[i0:i1] - a
    e = np.minimum(1, tt / 0.25) * np.minimum(1, np.maximum(0, (b + 0.4 - a) - tt) / 0.4)
    for m in notes:
        pad[i0:i1] += saw(mtof(m) * 0.998, tt, 6) * e / len(notes)
        padR[i0:i1] += saw(mtof(m) * 1.003, tt, 6) * e / len(notes)
pad = fft_filter(pad, 120, 2600); padR = fft_filter(padR, 120, 2600)
pv = np.interp(t_all, [0, 2, 5, 9, 46, 47, 54, 56, 61], [0.0, 0.5, 0.6, 0.28, 0.28, 0.38, 0.6, 0.55, 0.0])
L += (pad + padR) * 0.5 * pv * 0.5; SIDE += (pad - padR) * 0.5 * pv * 0.6; REV += (pad + padR) * 0.5 * pv * 0.25

# groove 5–54 (light during the colour plates), drums
groove = lambda t: 9.0 <= t < 54.0
kicks = [k * BEAT for k in range(10, 108) if (5.0 <= k * BEAT < 7.5) or groove(k * BEAT)]
for k in kicks:
    add(L, k, kick(0.95 if k >= 9 else 0.8))
for k in range(19, 108):
    t = k * BEAT + 0.25
    if groove(t):
        open_ = k % 4 == 3
        add(L, t, noise_hit(0.22 if open_ else 0.05, 7000, None, 0.06 if open_ else 0.016), 0.2)
t = 9.5
while t < 54.0:   # claps on 2 & 4
    c = noise_hit(0.3, 900, 6000, 0.09) + 0.5 * np.roll(noise_hit(0.3, 900, 6000, 0.05), int(0.012 * SR))
    add(L, t, c, 0.3); add(REV, t, c, 0.35); t += 1.0
t = 27.0
while t < 54.0:   # shaker in the busier half
    add(L, t, noise_hit(0.04, 9000, None, 0.012), 0.07); t += BEAT / 2
duck = np.ones(N)
for k in kicks:
    i = idx(k); j = min(N, i + int(0.3 * SR)); tt = np.arange(j - i) / SR
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.7 * np.exp(-tt / 0.09))
bass = np.zeros(N); t = 9.0
while t < 54.0:
    r = ROOTS[chord_at(t)]; n = int(SR * BEAT / 2); tt = np.arange(n) / SR
    oct_ = 12 if int((t - 9) / (BEAT / 2)) % 4 == 3 else 0
    add(bass, t, saw(mtof(r - 12 + oct_), tt, 8) * env_ad(n, 0.004, 0.15) + 0.6 * np.sin(2 * np.pi * mtof(r - 12) * tt) * env_ad(n, 0.004, 0.2), 0.5)
    t += BEAT / 2
L += fft_filter(bass, 30, 900) * duck * 0.9
# marimba arpeggio from 18 s, brighter from 27 s
arp = np.zeros(N); t = 18.0; step = 0; pat = [0, 2, 4, 2, 1, 3, 4, 3]
while t < 54.0:
    ch = CHORDS[chord_at(t)]; m = ch[pat[step % 8] % len(ch)] + (12 if t >= 27 and step % 8 in (2, 6) else 0)
    add(arp, t, marimba(m, 0.4), 0.15 if t < 27 else 0.18); t += BEAT / 2; step += 1
L += arp * (0.6 + 0.4 * duck); REV += arp * 0.45

# ── 0–5: the bazaar lights up — one marimba note per ring of shops
for d in range(9):
    t0 = 0.5 + d * 0.32
    m = [60, 62, 64, 67, 69, 72, 74, 76, 79][d]
    add(L, t0, marimba(m, 0.6), 0.22); add(REV, t0, marimba(m, 0.6), 0.25)
add(L, 0.2, riser(1.8, 0.08))
money(0.5, 'coin', 0.8, 2800)                    # 开张！
add(L, 2.2, impact(0.6)); add(REV, 2.2, impact(0.4))
add(L, 3.0, riser(2.0, 0.22)); add(REV, 3.0, riser(2.0, 0.18))
for t0 in [3.2, 3.6, 4.1, 4.5]:                  # first trades across the market
    money(t0, 'coin', 0.45, 2400 + 300 * (t0 % 1))
# ── 5–9: colour plates
for i, t0 in enumerate([5.0, 5.5, 6.0, 6.5, 7.0]):
    add(L, t0, kick(1.0)); add(L, t0, noise_hit(0.5, 1500, 12000, 0.12), 0.32); add(REV, t0, noise_hit(0.5, 1500, 12000, 0.12), 0.35)
    for k, dm in enumerate([0, 7, 12]):
        add(L, t0 + k * 0.08, marimba([67, 69, 72, 74, 76][i] + dm, 0.5), 0.16)
        add(REV, t0 + k * 0.08, marimba([67, 69, 72, 74, 76][i] + dm, 0.5), 0.12)
    money(t0 + 0.12, 'coin', 0.75, 2400 + 160 * i)
add(L, 7.5, impact(0.8)); add(REV, 7.5, impact(0.6)); add(L, 7.45, whoosh(0.5, 0.3))
money(7.65, 'kaching', 1.0)
for c in [5, 9, 18, 27, 37, 46, 54]:
    add(L, c - 0.45, whoosh(0.6, 0.28)); add(REV, c - 0.45, whoosh(0.6, 0.18))
add(L, 9.0, impact(0.5)); add(REV, 9.0, impact(0.35))

# ── 9–18: open a shop
for k in range(7):                               # typing the shop name
    add(L, 9.8 + k * 0.16, tick(0.35))
ui(11.6, 1760)                                   # avatar picked
for k in range(3):                               # categories toggled
    ui(12.5 + k * 0.25, 2200 + k * 200, 0.8)
ui(11.0, 1320, 0.7)                              # sign bulbs start
for k in range(8):
    add(L, 10.8 + k * 0.1, blip(3000 + k * 120, 0.05), 0.05)
add(L, 15.3, tick(0.6)); ui(15.4, 2640)           # 一键开店
add(L, 15.6, snip(0.45))                          # ribbon cut
add(L, 15.62, noise_hit(0.6, 2000, None, 0.15), 0.25)   # confetti pop
add(L, 15.6, impact(0.6)); add(REV, 15.6, impact(0.4))
money(15.75, 'kaching', 1.1)
ui(16.2, 2960)                                    # pin drops on the map
for i in range(3):
    add(L, 16.5 + i * 0.15, thunk(0.3))
# ── 18–27: list your assets
for i in range(6):
    land = 18.0 + 0.9 + i * 0.95
    add(L, land - 0.6, whoosh(0.55, 0.16))
    add(L, land, thunk(0.4)); add(REV, land, thunk(0.2))
    money(land + 0.05, 'coin', 0.55, 2600 + 150 * i)
    ui(land + 0.08, 2640, 0.7)
    for k in range(4):                            # price slider ticks
        add(L, land - 0.5 + k * 0.1, tick(0.15))
# ── 27–37: browse & buy
add(L, 27.2, whoosh(1.0, 0.18)); add(L, 29.4, whoosh(0.9, 0.2))
for k in range(2):
    add(L, 29.8 + k * 0.2, tick(0.4))
ui(30.2, 2200)
add(L, 31.6, whoosh(0.8, 0.26)); add(REV, 31.6, whoosh(0.8, 0.15))   # swoop to the shop
ui(32.5, 1760); ui(33.55, 2640); add(L, 33.5, tick(0.5))               # product sheet, buy
add(L, 34.3, tick(0.5)); ui(34.4, 2960)                                # pay
add(L, 34.5, whoosh(0.7, 0.2))                                         # coin flies
money(35.2, 'kaching', 1.2)
for k in range(5):
    money(35.25 + k * 0.07, 'coin', 0.6, 2300 + 240 * k)
for t0 in np.arange(35.6, 37.0, 0.23):                                  # the whole market trading
    money(float(t0), 'coin', 0.4, 2200 + 400 * ((t0 * 7) % 1))
# ── 37–46: safe trade
for k, at in enumerate([0.6, 1.8, 3.4, 4.8, 6.2]):
    add(L, 37 + at - 0.55, whoosh(0.5, 0.18)); ui(37 + at, 1760 + k * 220)
add(L, 37.9, whoosh(0.9, 0.18)); money(38.8, 'coin', 0.9, 2500)        # coin into escrow
add(L, 38.85, thunk(0.45))                                              # the vault locks
for k, dm in enumerate([0, 4, 7]):
    ui(40.4 + k * 0.06, mtof(76 + dm), 0.9)                             # owner says yes
add(L, 40.8, whoosh(1.0, 0.2))                                          # key delivered
add(L, 42.4, whoosh(0.8, 0.2))
money(43.2, 'kaching', 1.2)
for k in range(5):
    money(43.3 + k * 0.08, 'coin', 0.6, 2400 + 200 * k)
add(L, 44.2, whoosh(1.0, 0.22))                                         # pull back
# ── 46–54: everyone owns a shop
add(L, 46.0, impact(0.7)); add(REV, 46.0, noise_hit(2.5, 3000, None, 0.9), 0.25)
for i in range(9):
    ui(46.6 + i * 0.1, 1760 + i * 110, 0.6)
    for k in range(4):
        t0 = 46.0 + (k * 1.8 - i * 0.43) % 1.8 + k * 1.8
        if 46.8 < t0 < 53.8:
            money(t0, 'coin', 0.32, 2300 + 160 * i)
for k in range(40):                                                     # counters ticking
    add(L, 47.2 + k * 0.12, tick(0.08))
add(L, 52.0, riser(2.0, 0.22)); add(REV, 52.0, riser(2.0, 0.15))
# ── 54–60: outro
add(L, 54.0, impact(0.95)); add(REV, 54.0, impact(0.8)); money(54.1, 'kaching', 1.0)
for k, m in enumerate([72, 76, 79, 84]):
    add(L, 55.0 + k * 0.25, marimba(m, 1.2), 0.18); add(REV, 55.0 + k * 0.25, marimba(m, 1.2), 0.3)

# ── reverb + master
ir_n = int(2.4 * SR); tt = np.arange(ir_n) / SR
irL = fft_filter(rs.standard_normal(ir_n) * np.exp(-tt / 0.55), 200, 7000); irR = fft_filter(rs.standard_normal(ir_n) * np.exp(-tt / 0.55), 200, 7000)
irL /= np.sqrt(np.sum(irL ** 2)); irR /= np.sqrt(np.sum(irR ** 2))
M = 1 << int(np.ceil(np.log2(N + ir_n))); RF = np.fft.rfft(REV, M)
wetL = np.fft.irfft(RF * np.fft.rfft(irL, M), M)[:N]; wetR = np.fft.irfft(RF * np.fft.rfft(irR, M), M)[:N]
outL = L + SIDE + wetL * 0.5; outR = L - SIDE + wetR * 0.5
fade = np.interp(t_all, [0, 0.05, 59.0, 60.6, 61], [0, 1, 1, 0, 0])
st = np.stack([outL * fade, outR * fade], 1)
rms = np.sqrt(np.mean(st[idx(9):idx(54)] ** 2))
st *= 10 ** (-13.2 / 20) / (rms + 1e-9)
st = np.tanh(st * 1.15) / 1.15
peak = np.max(np.abs(st))
if peak > 0.94:
    st *= 0.94 / peak
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[1], 'peak', float(np.max(np.abs(st))))
