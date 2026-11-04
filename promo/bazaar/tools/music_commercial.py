"""Score + sound design for 米麦集市 商业版 (commercial.js), 60 s, 120 BPM. Built on ../../tools/synth.py.

Rules from the references: one soft sound for every element that appears and silence otherwise; drums drop on the
switch into the product (15 s); the settlement is staged charge → burst → reveal → coins into the balance.
usage: python3 -I music_commercial.py <out.wav>
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from synth import Mix  # noqa: E402

m = Mix(61.0, seed=29)
B = 0.5
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]   # Am – F – C – G
ROOT = [45, 41, 48, 43]
chord = lambda t: int(((t - 15.0) // 2.0) % 4) if t >= 15 else 0

# ── pads: warm and sparse in WHY, cold drone in PAIN, full under the product, wide at the end
for a, b, notes, g in [(0.6, 7.8, [57, 64, 69, 72, 76], 0.32), (8.0, 14.0, [45, 52, 57, 60], 0.22)] + \
        [(15.0 + 2 * k, 17.0 + 2 * k, CH[k % 4], 0.2) for k in range(10)] + [(40.0 + 2 * k, 42.0 + 2 * k, CH[k % 4], 0.2) for k in range(7)] + \
        [(54.0, 60.4, [45, 57, 64, 69, 71, 76], 0.34)]:
    i0, i1, l, r = m.pad(notes, a, b)
    l = m.filt(l, 120, 2400); r = m.filt(r, 120, 2400)
    m.L[i0:i1] += (l + r) * 0.5 * g; m.SIDE[i0:i1] += (l - r) * 0.5 * g * 1.2; m.REV[i0:i1] += (l + r) * 0.5 * g * 0.5

# ── 0–8 WHY: glint, then one soft sound per word line and per morph
m.both(0.05, m.riser(0.8, 0.12, 600), 1, 0.6)
m.both(0.8, m.bell(81, 2.0), 0.18, 0.4)
for i, t0 in enumerate([0.8, 1.8, 2.8, 3.8]):
    m.both(t0, m.pluck([69, 72, 76, 79][i], 0.6), 0.2, 0.35)
    m.add(m.L, t0, m.kick(0.5))
m.both(4.8, m.bell(76, 2.4), 0.22, 0.5); m.both(4.85, m.bell(81, 2.4), 0.14, 0.5)
for i in range(4):
    m.both(4.9 + i * 0.5, m.coin(2400 + 200 * i), 0.14, 0.12)       # the price pill flips through prices
# ── 8–14 PAIN: heartbeat, a copy sound per ghost, the dull ¥0
for k in range(12):
    m.add(m.L, 8.0 + k, m.kick(0.55)); m.add(m.L, 8.25 + k, m.kick(0.3))
for i in range(26):
    m.add(m.L, 8.9 + i * 0.12, m.noise(0.08, 600, 3000, 0.02), 0.06)
m.both(11.4, m.pluck(45, 0.8), 0.25, 0.3)
m.both(13.2, m.whoosh(0.8), 0.25, 0.2)                              # copies collapse back
m.both(14.0, m.bell(72, 1.6), 0.18, 0.5)                            # 现在，有了米麦集市
m.both(14.2, m.pop(700), 0.2, 0.15)
m.add(m.L, 14.4, m.riser(0.6, 0.25))
# ── 15–34: groove drops; every state change and every click has its own small sound
groove = lambda t: 15.0 <= t < 34.0 or 40.0 <= t < 54.0
kicks = [k * B for k in range(30, 108) if groove(k * B)]
for k in kicks:
    m.add(m.L, k, m.kick(0.9))
for k in range(30, 108):
    t = k * B + 0.25
    if groove(t):
        m.add(m.L, t, m.hat(k % 4 == 3), 0.16)
t = 15.5
while t < 54:
    if groove(t):
        c = m.clap(); m.add(m.L, t, c, 0.26); m.add(m.REV, t, c, 0.3)
    t += 1.0
duck = np.ones(m.N)
for k in kicks:
    i = m.idx(k); j = min(m.N, i + int(0.3 * m.SR)); tt = np.arange(j - i) / m.SR
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.7 * np.exp(-tt / 0.09))
bass = np.zeros(m.N); t = 15.0
while t < 54:
    if groove(t):
        n = int(m.SR * B / 2); tt = np.arange(n) / m.SR; r = ROOT[chord(t)]
        m.add(bass, t, m.saw(m.mtof(r - 12), tt, 8) * m.env(n, 0.004, 0.15) + 0.6 * np.sin(2 * np.pi * m.mtof(r - 12) * tt) * m.env(n, 0.004, 0.2), 0.5)
    t += B / 2
m.L += m.filt(bass, 30, 900) * duck * 0.85
arp = np.zeros(m.N); t = 15.0; s = 0
while t < 54:
    if groove(t):
        ch = CH[chord(t)]; m.add(arp, t, m.pluck(ch[[0, 2, 1, 3, 2, 1, 3, 2][s % 8]] + 12, 0.3), 0.1)
    t += B / 2; s += 1
m.L += arp * (0.6 + 0.4 * duck); m.REV += arp * 0.4
m.add(m.L, 15.0, m.impact(0.55)); m.add(m.REV, 15.0, m.impact(0.35))
STATES = [16.5, 18.0, 19.5, 21.0, 23.0, 24.0, 24.6, 26.0, 27.85, 29.0, 30.5, 32.0, 33.6]
for i, t0 in enumerate(STATES):
    m.both(t0, m.pop(700 + 60 * (i % 5)), 0.16, 0.12)
for t0 in [16.0, 18.6, 21.6, 23.5, 24.0, 27.6, 28.9, 31.4]:
    m.both(t0, m.click(), 0.3, 0.1)
for k in range(7):
    m.add(m.L, 16.7 + k * 0.14, m.tick(), 0.3)                       # typing the shop name
for i in range(4):
    m.both(19.8 + i * 0.3 + 0.35, m.thunk(), 0.22, 0.08)             # files land
for k in range(10):
    m.add(m.L, 21.6 + k * 0.1, m.tick(), 0.18)                       # price slider ratchet
m.both(23.2, m.blip(2200), 0.12, 0.06); m.both(23.5, m.blip(2640), 0.12, 0.06)   # toggles
m.both(24.15, m.coin(2700), 0.2, 0.1)                                # listed
m.add(m.L, 24.4, m.whoosh(0.6), 0.18)                                # pull back to the market
for k in range(14):
    m.add(m.L, 24.6 + k * 0.035, m.tick(), 0.08)                     # cards fill in
m.add(m.L, 26.3, m.tick(), 0.3); m.add(m.L, 26.5, m.tick(), 0.3)    # search typing
m.both(26.7, m.blip(1760), 0.12, 0.08)
m.add(m.L, 27.8, m.whoosh(0.5), 0.16)
m.both(29.35, m.thunk(), 0.3, 0.1); m.both(29.4, m.blip(1320), 0.1, 0.06)   # escrow locks
for k, dm in enumerate([0, 4, 7]):
    m.both(31.45 + k * 0.06, m.bell(76 + dm, 0.8), 0.12, 0.2)        # your yes
m.both(33.0, m.blip(2640), 0.14, 0.1)                                # delivered
# ── 34–40 SETTLEMENT: charge → burst → reveal → coins into the balance
m.both(34.0, m.riser(1.5, 0.35, 160), 1, 0.4)
for k in range(12):
    m.add(m.L, 34.0 + k * 0.12, m.blip(800 + k * 120, 0.05), 0.05 + k * 0.006)
m.add(m.L, 35.5, m.impact(1.0)); m.add(m.REV, 35.5, m.impact(0.8))
m.both(35.5, m.noise(1.6, 3000, None, 0.5), 0.12, 0.3)               # shimmer
for i in range(8):
    m.both(35.55 + i * 0.05, m.coin(2200 + 250 * (i % 4)), 0.12, 0.1)
m.both(36.0, m.pop(600), 0.25, 0.2)                                  # the income card
for k in range(12):
    m.add(m.L, 36.2 + k * 0.1, m.tick(), 0.16)                       # number rolls
m.both(37.3, m.blip(2640), 0.12, 0.08)                               # ▲ 到账
for i in range(10):
    m.both(37.6 + i * 0.2 + 0.55, m.coin(2400 + 120 * i), 0.2, 0.1)  # each coin lands in the balance
    m.add(m.L, 37.6 + i * 0.2 + 0.56, m.blip(3300, 0.04), 0.05)
m.both(39.85, m.kaching(), 0.34, 0.16)
for k, n in enumerate([69, 73, 76, 81]):
    m.both(39.9 + k * 0.03, m.bell(n, 1.6), 0.1, 0.3)                # resolve
m.add(m.L, 40.0, m.impact(0.5))
# ── 40–46: more orders
for at in [42.0, 43.5, 45.0]:
    m.both(at, m.pop(800), 0.2, 0.15)
    for k in range(4):
        m.both(at + 0.5 + k * 0.12, m.coin(2500 + 150 * k), 0.16, 0.08)
    m.both(at + 1.0, m.kaching(), 0.18, 0.1)
# ── 46–54: everyone can open a shop
m.add(m.L, 46.0, m.impact(0.5)); m.add(m.L, 45.7, m.whoosh(0.7), 0.2)
for k in range(21):
    m.add(m.L, 46.2 + k * 0.05, m.tick(), 0.06)
for k in range(14):
    m.both(47.3 + k * 0.45, m.coin(2300 + 180 * (k % 5)), 0.08, 0.06)
m.add(m.L, 52.4, m.riser(1.6, 0.2))
# ── 54–60: logo
m.add(m.L, 53.4, m.whoosh(0.8), 0.18)
m.both(54.2, m.noise(0.9, 4000, None, 0.3), 0.1, 0.4)                # the line of light
m.add(m.L, 54.6, m.impact(0.8)); m.add(m.REV, 54.6, m.impact(0.6))
m.both(55.8, m.bell(81, 2.4), 0.16, 0.5)                             # sweep over the logo
m.both(56.1, m.bell(76, 2.4), 0.12, 0.5)
pk = m.master(sys.argv[1], lufs_window=(15, 54), target_rms_db=-12.5)
print('wrote', sys.argv[1], 'peak', pk)
