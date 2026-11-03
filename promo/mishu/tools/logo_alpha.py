"""Convert the MIME TECH logo to a straight-alpha PNG for the film.

The supplied webp already carries alpha (transparent pixels are black RGB), so we keep that alpha.
If the source has no alpha (white background), key the white matte out instead.

usage: python3 -I logo_alpha.py <in.webp|png> <out.png>
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src)
if img.mode in ("RGBA", "LA") or "transparency" in img.info:
    img.convert("RGBA").save(dst)
else:
    im = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
    ink = 1.0 - im.min(axis=2)
    a = np.clip((ink - 0.04) / 0.62, 0.0, 1.0)
    safe = np.maximum(a, 1e-4)[..., None]
    fg = np.clip((im - (1.0 - a)[..., None]) / safe, 0.0, 1.0)
    out = np.concatenate([fg, a[..., None]], axis=2)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(dst)
print(dst)
