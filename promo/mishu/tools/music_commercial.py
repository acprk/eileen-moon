"""Score + sound design for 米麦 MIME TECH 商业版 (commercial.js), 60 s, 120 BPM. Built on ../../tools/synth.py.

Same rules as the bazaar commercial: one soft sound per element, silence otherwise, drums drop when the product
starts (14 s), staged settlement (charge → burst → reveal → coins into the balance).
usage: python3 -I music_commercial.py <out.wav>
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from synth import Mix  # noqa: E402

m = Mix(61.0, seed=31)
B = 0.5
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
ROOT = [45, 41, 48, 43]
chord = lambda t: int(((t - 14.0) // 2.0) % 4) if t >= 14 else 0

for a, b, notes, g in [(0.6, 7.8, [57, 64, 69, 72, 76], 0.32), (8.0, 13.8, [45, 52, 57, 60], 0.22)] + \
        [(14.0 + 2 * k, 16.0 + 2 * k, CH[k % 4], 0.2) for k in range(10)] + [(40.0 + 2 * k, 42.0 + 2 * k, CH[k % 4], 0.2) for k in range(3)] + \
        [(46.0, 53.6, [45, 57, 64, 69, 72], 0.3), (54.0, 60.4, [45, 57, 64, 69, 71, 76], 0.34)]:
    i0, i1, l, r = m.pad(notes, a, b)
    l = m.filt(l, 120, 2400); r = m.filt(r, 120, 2400)
    m.L[i0:i1] += (l + r) * 0.5 * g; m.SIDE[i0:i1] += (l - r) * 0.5 * g * 1.2; m.REV[i0:i1] += (l + r) * 0.5 * g * 0.5

# WHY 0–8: glint, one note per exhibit, a warm chord on 都是你的资产
m.both(0.05, m.riser(0.8, 0.12, 600), 1, 0.6)
for i, t0 in enumerate([0.8, 1.8, 2.8, 3.8]):
    m.both(t0, m.pluck([69, 72, 76, 79][i], 0.6), 0.2, 0.35); m.add(m.L, t0, m.kick(0.5))
    m.both(t0 + 0.05, m.bell(88, 0.6), 0.05, 0.2)                    # frame glint
m.both(4.8, m.bell(76, 2.4), 0.22, 0.5); m.both(4.85, m.bell(81, 2.4), 0.14, 0.5)
# PAIN 8–14: heartbeat, a sound per copy
for k in range(6):
    m.add(m.L, 8.0 + k, m.kick(0.55)); m.add(m.L, 8.25 + k, m.kick(0.3))
for i in range(26):
    m.add(m.L, 8.9 + i * 0.12, m.noise(0.08, 600, 3000, 0.02), 0.06)
m.both(10.6, m.pluck(45, 0.8), 0.25, 0.3)
m.both(13.2, m.whoosh(0.8), 0.25, 0.2)
m.both(14.0, m.bell(72, 1.6), 0.18, 0.5); m.both(14.2, m.pop(700), 0.2, 0.15)
# FIX 14–34: groove; a sound for every state and click
groove = lambda t: 14.0 <= t < 34.0 or 40.0 <= t < 46.0
kicks = [k * B for k in range(28, 92) if groove(k * B)]
for k in kicks:
    m.add(m.L, k, m.kick(0.9))
for k in range(28, 92):
    t = k * B + 0.25
    if groove(t):
        m.add(m.L, t, m.hat(k % 4 == 3), 0.16)
t = 14.5
while t < 46:
    if groove(t):
        c = m.clap(); m.add(m.L, t, c, 0.26); m.add(m.REV, t, c, 0.3)
    t += 1.0
duck = np.ones(m.N)
for k in kicks:
    i = m.idx(k); j = min(m.N, i + int(0.3 * m.SR)); tt = np.arange(j - i) / m.SR
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.7 * np.exp(-tt / 0.09))
bass = np.zeros(m.N); t = 14.0
while t < 46:
    if groove(t):
        n = int(m.SR * B / 2); tt = np.arange(n) / m.SR; r = ROOT[chord(t)]
        m.add(bass, t, m.saw(m.mtof(r - 12), tt, 8) * m.env(n, 0.004, 0.15) + 0.6 * np.sin(2 * np.pi * m.mtof(r - 12) * tt) * m.env(n, 0.004, 0.2), 0.5)
    t += B / 2
m.L += m.filt(bass, 30, 900) * duck * 0.85
arp = np.zeros(m.N); t = 14.0; s = 0
while t < 46:
    if groove(t):
        ch = CH[chord(t)]; m.add(arp, t, m.pluck(ch[[0, 2, 1, 3, 2, 1, 3, 2][s % 8]] + 12, 0.3), 0.1)
    t += B / 2; s += 1
m.L += arp * (0.6 + 0.4 * duck); m.REV += arp * 0.4
m.add(m.L, 14.0, m.impact(0.55)); m.add(m.REV, 14.0, m.impact(0.35))
for i, t0 in enumerate([15.6, 17.2, 18.8, 20.4, 22.4, 24.6, 26.8, 30.2, 31.8, 33.6]):
    m.both(t0, m.pop(700 + 60 * (i % 5)), 0.16, 0.12)
for t0 in [15.0, 23.5, 28.6]:
    m.both(t0, m.click(), 0.3, 0.1)
for k in range(11):
    m.add(m.L, 15.9 + k * 0.1, m.tick(), 0.12)                       # scanning
for k in range(12):
    m.add(m.L, 17.2 + k * 0.08, m.blip(1800 + 120 * k, 0.04), 0.04)  # encrypting
m.both(17.9, m.thunk(), 0.3, 0.1); m.both(17.95, m.blip(1320), 0.12, 0.08)   # locked
m.both(18.9, m.bell(81, 1.2), 0.12, 0.3)                             # your key
m.both(20.8, m.blip(2200), 0.12, 0.06); m.both(21.2, m.blip(2640), 0.12, 0.06)   # licence toggles
m.both(22.5, m.blip(1760), 0.12, 0.08)                               # request arrives
for k, dm in enumerate([0, 4, 7]):
    m.both(23.55 + k * 0.06, m.bell(76 + dm, 0.8), 0.12, 0.2)        # your yes
m.both(24.6, m.riser(1.6, 0.12, 400), 1, 0.3)                        # controlled generation
m.both(26.3, m.blip(2640), 0.14, 0.1)                                # delivered
m.add(m.L, 27.6, m.whoosh(0.6), 0.14)                                # swipe
m.both(28.6, m.noise(0.25, 200, 1500, 0.06), 0.3, 0.1); m.both(28.62, m.pluck(45, 0.5), 0.2, 0.2)   # revoked
m.both(30.2, m.bell(79, 1.6), 0.16, 0.4)                             # ownership never moves
for k in range(4):
    m.both(32.0 + k * 0.4, m.blip(1760 + 220 * k, 0.06), 0.1, 0.08)  # ledger blocks
# GET 34–46: charge → burst → reveal → coins into the balance
m.both(34.0, m.riser(1.5, 0.35, 160), 1, 0.4)
for k in range(12):
    m.add(m.L, 34.0 + k * 0.12, m.blip(800 + k * 120, 0.05), 0.05 + k * 0.006)
m.add(m.L, 35.5, m.impact(1.0)); m.add(m.REV, 35.5, m.impact(0.8))
m.both(35.5, m.noise(1.6, 3000, None, 0.5), 0.12, 0.3)
for i in range(8):
    m.both(35.55 + i * 0.05, m.coin(2200 + 250 * (i % 4)), 0.12, 0.1)
m.both(36.0, m.pop(600), 0.25, 0.2)
for k in range(12):
    m.add(m.L, 36.2 + k * 0.1, m.tick(), 0.16)
m.both(37.3, m.blip(2640), 0.12, 0.08)
for i in range(10):
    m.both(37.6 + i * 0.2 + 0.55, m.coin(2400 + 120 * i), 0.2, 0.1); m.add(m.L, 37.6 + i * 0.2 + 0.56, m.blip(3300, 0.04), 0.05)
m.both(39.85, m.kaching(), 0.34, 0.16)
for k, n in enumerate([69, 73, 76, 81]):
    m.both(39.9 + k * 0.03, m.bell(n, 1.6), 0.1, 0.3)
m.add(m.L, 40.0, m.impact(0.5))
for at in [42.0, 43.5, 45.0]:
    m.both(at, m.pop(800), 0.2, 0.15)
    for k in range(4):
        m.both(at + 0.5 + k * 0.12, m.coin(2500 + 150 * k), 0.16, 0.08)
    m.both(at + 1.0, m.kaching(), 0.18, 0.1)
# VALUE 46–54: the curve grows, a soft coin on each ledger point
m.add(m.L, 46.0, m.impact(0.5)); m.add(m.L, 45.7, m.whoosh(0.7), 0.2)
for k in range(1, 15):
    m.both(46.4 + (k / 15) * 6.2, m.coin(2300 + 120 * (k % 6)), 0.09, 0.08)
m.add(m.L, 52.2, m.riser(1.8, 0.2))
# LOGO 54–60
m.add(m.L, 53.4, m.whoosh(0.8), 0.18)
m.both(54.2, m.noise(0.9, 4000, None, 0.3), 0.1, 0.4)
m.add(m.L, 54.6, m.impact(0.8)); m.add(m.REV, 54.6, m.impact(0.6))
m.both(55.8, m.bell(81, 2.4), 0.16, 0.5); m.both(56.1, m.bell(76, 2.4), 0.12, 0.5)
pk = m.master(sys.argv[1], lufs_window=(14, 54), target_rms_db=-12.5)
print('wrote', sys.argv[1], 'peak', pk)
