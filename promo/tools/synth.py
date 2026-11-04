"""Shared numpy synth for the promo films: instruments, UI / money sound effects, reverb and mastering.

Usage from a score script (run with python3 -I):
    import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
    from synth import Mix
    m = Mix(61.0); m.add(m.L, 1.0, m.kick()); ...; m.master('out.wav', lufs_window=(9, 54))
"""
import wave
import numpy as np


class Mix:
    def __init__(self, dur, sr=48000, seed=7):
        self.SR = sr
        self.N = int(sr * dur)
        self.rs = np.random.default_rng(seed)
        self.L = np.zeros(self.N)     # dry (mono, centre)
        self.REV = np.zeros(self.N)   # reverb send
        self.SIDE = np.zeros(self.N)  # stereo width (L-R difference)
        self.t = np.arange(self.N) / sr

    # ── plumbing
    def idx(self, t):
        return int(round(t * self.SR))

    def add(self, buf, t, sig, gain=1.0):
        i = self.idx(t)
        if i >= self.N:
            return
        if i < 0:
            sig = sig[-i:]; i = 0
        j = min(self.N, i + len(sig))
        buf[i:j] += sig[: j - i] * gain

    def both(self, t, sig, dry=1.0, wet=0.4):
        self.add(self.L, t, sig, dry); self.add(self.REV, t, sig, wet)

    def env(self, n, a, d):
        t = np.arange(n) / self.SR
        return np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)

    def filt(self, x, lo=None, hi=None):
        X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / self.SR); m = np.ones_like(f)
        if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
        if hi: m *= 1 / (1 + (f / hi) ** 4)
        return np.fft.irfft(X * m, len(x))

    def noise(self, length, lo, hi, decay, gain=1.0):
        n = int(self.SR * length); s = self.filt(self.rs.standard_normal(n), lo, hi)
        return s / (np.max(np.abs(s)) + 1e-9) * self.env(n, 0.001, decay) * gain

    @staticmethod
    def mtof(m):
        return 440.0 * 2 ** ((m - 69) / 12)

    def saw(self, f, t, harm=8):
        s = np.zeros_like(t)
        for k in range(1, harm + 1):
            s += np.sin(2 * np.pi * f * k * t) / k
        return s

    # ── instruments
    def kick(self, gain=1.0):
        n = int(self.SR * 0.42); t = np.arange(n) / self.SR
        s = np.sin(2 * np.pi * np.cumsum(46 + 110 * np.exp(-t / 0.032)) / self.SR) * np.exp(-t / 0.16)
        s += 0.2 * self.filt(self.rs.standard_normal(n), 2000, None) * np.exp(-t / 0.004)
        return np.tanh(s * 1.6) * gain

    def clap(self):
        return self.noise(0.3, 900, 6000, 0.09) + 0.5 * np.roll(self.noise(0.3, 900, 6000, 0.05), int(0.012 * self.SR))

    def hat(self, open_=False):
        return self.noise(0.22 if open_ else 0.05, 7000, None, 0.06 if open_ else 0.016)

    def pluck(self, m, length=0.35, bright=1.0):
        n = int(self.SR * length); t = np.arange(n) / self.SR; f = self.mtof(m); s = np.zeros(n)
        for k in range(1, 6):
            s += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (6 + k * 6 / bright))
        return s * self.env(n, 0.002, 0.2)

    def bell(self, m, length=1.4):
        n = int(self.SR * length); t = np.arange(n) / self.SR; f = self.mtof(m)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.1)
        return s * self.env(n, 0.002, 0.8)

    def pad(self, notes, a, b, wide=0.6):
        """detuned saw pad, low-passed, added to L/SIDE/REV between a and b (seconds)."""
        i0, i1 = self.idx(a), min(self.N, self.idx(b + 0.4)); tt = self.t[i0:i1] - a
        e = np.minimum(1, tt / 0.4) * np.minimum(1, np.maximum(0, (b + 0.4 - a) - tt) / 0.5)
        l = np.zeros(i1 - i0); r = np.zeros(i1 - i0)
        for m in notes:
            l += self.saw(self.mtof(m) * 0.998, tt, 6) * e / len(notes)
            r += self.saw(self.mtof(m) * 1.003, tt, 6) * e / len(notes)
        return i0, i1, l, r

    def impact(self, gain=1.0):
        n = int(self.SR * 2.2); t = np.arange(n) / self.SR
        s = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.09)) / self.SR) * np.exp(-t / 0.7) + 0.45 * self.noise(2.2, 200, 6000, 0.35)
        return np.tanh(s * 1.4) * gain

    def riser(self, length, gain=1.0, f0=200):
        n = int(self.SR * length); t = np.arange(n) / self.SR; u = t / length; s = self.rs.standard_normal(n)
        out = (self.filt(s, 300, 1200) * (1 - u) + self.filt(s, 2500, 9000) * u) * u ** 2
        out += 0.3 * np.sin(2 * np.pi * np.cumsum(f0 * 2 ** (u * 3)) / self.SR) * u ** 2
        return out / (np.max(np.abs(out)) + 1e-9) * gain

    def whoosh(self, length=0.6, gain=1.0):
        n = int(self.SR * length); u = np.arange(n) / n
        s = self.filt(self.rs.standard_normal(n), 400, 5000)
        return s / (np.max(np.abs(s)) + 1e-9) * np.sin(np.pi * u) ** 2 * gain

    # ── UI / money
    def blip(self, f, length=0.09):
        n = int(self.SR * length); t = np.arange(n) / self.SR
        return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * self.env(n, 0.002, 0.03)

    def tick(self):
        return self.noise(0.03, 2500, 9000, 0.006)

    def click(self):  # a soft UI press
        b = 0.5 * self.blip(1800, 0.05)
        b[: int(self.SR * 0.04)] += 0.7 * self.noise(0.04, 1500, 7000, 0.008)
        return b

    def pop(self, f=900):  # an element appearing
        n = int(self.SR * 0.12); t = np.arange(n) / self.SR
        return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-t / 0.02))) / self.SR) * self.env(n, 0.002, 0.04)

    def thunk(self):
        n = int(self.SR * 0.3); t = np.arange(n) / self.SR
        s = np.sin(2 * np.pi * np.cumsum(180 * np.exp(-t / 0.05) + 70) / self.SR) * np.exp(-t / 0.07) + 0.4 * self.noise(0.3, 300, 2500, 0.02)
        return np.tanh(s * 1.5)

    def coin(self, f0=2600.0):
        n = int(self.SR * 0.6); t = np.arange(n) / self.SR; s = np.zeros(n)
        for r, a, d in [(1.0, 1.0, 0.22), (1.62, 0.7, 0.16), (2.31, 0.5, 0.12), (2.97, 0.35, 0.09), (3.63, 0.25, 0.07)]:
            s += a * np.sin(2 * np.pi * f0 * r * t + r) * np.exp(-t / d)
        s += 0.6 * self.filt(self.rs.standard_normal(n), 3000, None) * np.exp(-t / 0.003)
        b = int(0.075 * self.SR); s[b:] += 0.45 * s[: n - b] * np.exp(-t[: n - b] / 0.1)
        return s / (np.max(np.abs(s)) + 1e-9)

    def kaching(self):
        n = int(self.SR * 1.4); t = np.arange(n) / self.SR; s = np.zeros(n)
        s += 0.8 * self.filt(self.rs.standard_normal(n), 1200, 5000) * np.exp(-t / 0.012)
        d = int(0.06 * self.SR); bl = np.zeros(n)
        for f, a, dc in [(1568, 1.0, 0.7), (3136, 0.55, 0.45), (4699, 0.3, 0.3), (2093, 0.45, 0.6)]:
            bl += a * np.sin(2 * np.pi * f * t) * np.exp(-t / dc)
        s[d:] += 0.7 * bl[: n - d]
        th = 0.6 * np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t / 0.03)) / self.SR) * np.exp(-t / 0.08)
        s[int(0.02 * self.SR):] += th[: n - int(0.02 * self.SR)]
        return s / (np.max(np.abs(s)) + 1e-9)

    # ── output
    def master(self, path, lufs_window, target_rms_db=-13.2, peak=0.79, fade=(59.0, 60.6)):
        """reverb, fade, loudness (≈ -14 LUFS via RMS on the busy window), soft clip, sample-peak ceiling."""
        SR, N = self.SR, self.N
        ir_n = int(2.4 * SR); tt = np.arange(ir_n) / SR
        irL = self.filt(self.rs.standard_normal(ir_n) * np.exp(-tt / 0.55), 200, 7000)
        irR = self.filt(self.rs.standard_normal(ir_n) * np.exp(-tt / 0.55), 200, 7000)
        irL /= np.sqrt(np.sum(irL ** 2)); irR /= np.sqrt(np.sum(irR ** 2))
        M = 1 << int(np.ceil(np.log2(N + ir_n))); RF = np.fft.rfft(self.REV, M)
        wl = np.fft.irfft(RF * np.fft.rfft(irL, M), M)[:N]; wr = np.fft.irfft(RF * np.fft.rfft(irR, M), M)[:N]
        f = np.interp(self.t, [0, 0.05, fade[0], fade[1], N / SR], [0, 1, 1, 0, 0])
        st = np.stack([(self.L + self.SIDE + wl * 0.5) * f, (self.L - self.SIDE + wr * 0.5) * f], 1)
        a, b = lufs_window
        st *= 10 ** (target_rms_db / 20) / (np.sqrt(np.mean(st[self.idx(a):self.idx(b)] ** 2)) + 1e-9)
        st = np.tanh(st * 1.15) / 1.15
        pk = np.max(np.abs(st))
        if pk > peak:
            st *= peak / pk
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((st * 32767).astype('<i2').tobytes())
        return float(np.max(np.abs(st)))
