"""Export narration cues (src/data/script.ts) as Bilibili CC subtitles: zh.srt, en.srt and a bilingual srt.

usage: python3 work/make_srt.py   -> output/subs_zh.srt, output/subs_en.srt, output/subs_bilingual.srt
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'src', 'data', 'script.ts'), encoding='utf-8').read()
pat = re.compile(r"\{\s*t0:\s*([\d.]+),\s*t1:\s*([\d.]+),\s*zh:\s*'((?:[^'\\]|\\.)*)',\s*en:\s*'((?:[^'\\]|\\.)*)'(.*?)\}")
cues = []
for m in pat.finditer(src):
    t0, t1, zh, en, rest = float(m[1]), float(m[2]), m[3], m[4], m[5]
    quote = 'quote: true' in rest
    zh = zh.replace("\\'", "'")
    en = en.replace("\\'", "'")
    if quote:
        zh = f'「{zh}」'
    cues.append((t0, t1, zh, en))
cues.sort()


def ts(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'


os.makedirs(os.path.join(ROOT, 'output'), exist_ok=True)
for name, fn in [('zh', lambda c: c[2]), ('en', lambda c: c[3]), ('bilingual', lambda c: c[2] + '\n' + c[3])]:
    with open(os.path.join(ROOT, 'output', f'subs_{name}.srt'), 'w', encoding='utf-8') as f:
        for i, c in enumerate(cues, 1):
            f.write(f'{i}\n{ts(c[0])} --> {ts(c[1])}\n{fn(c)}\n\n')
print(len(cues), 'cues')
