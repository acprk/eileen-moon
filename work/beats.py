"""Beat grid + energy curve of the song → work/beats.json (copy to src/data/beats.json).
usage: python3 work/beats.py [public/audio/song.wav]"""
import json, os, sys
import numpy as np, librosa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "public", "audio", "song.wav")
y, sr = librosa.load(SRC, sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
onset = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time")
rms = librosa.feature.rms(y=y, hop_length=2205)[0]  # 0.1 s hops
db = 20 * np.log10(rms + 1e-6)
print("tempo", tempo, "nbeats", len(beats), "dur", len(y) / sr)
print("first beats", np.round(beats[:24], 2))
ib = np.diff(beats); print("median IBI", np.median(ib))
for t in range(0, int(len(y) / sr), 4):
    seg = db[t * 10:(t + 4) * 10]
    print(f"{t:4d}s {seg.mean():6.1f} dB " + "#" * int(max(0, seg.mean() + 40)))
json.dump({"tempo": float(np.atleast_1d(tempo)[0]), "dur": len(y) / sr,
           "beats": [round(float(b), 3) for b in beats],
           "onsets": [round(float(o), 3) for o in onset],
           "rms_db_100ms": [round(float(v), 1) for v in db]},
          open(os.path.join(ROOT, "work", "beats.json"), "w"))
