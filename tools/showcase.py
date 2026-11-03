"""Cut README showcase frames from a rendered film (right-edge lyric rail cropped away).
usage: python3 tools/showcase.py out/film_video.mp4 docs/img
"""
import os, subprocess, sys

SHOTS = [
    (8.0, '01_moon'), (21.5, '02_manuscript'), (30.0, '03_title'), (47.5, '04_mansion_1920'),
    (67.1, '05_locked_room'), (102.6, '06_fuzhou_road'), (142.8, '07_flower_from_dust'), (181.2, '08_ship_1955'),
    (184.9, '09_new_york'), (205.2, '10_rain_window'), (244.4, '11_portrait_1954'), (262.0, '12_pacific'),
]
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for t, name in SHOTS:
    out = os.path.join(dst, f'{name}.jpg')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', src, '-frames:v', '1',
                    '-vf', 'crop=1830:804:0:0,scale=1280:-1', '-q:v', '3', out], check=True)
    print(out)
