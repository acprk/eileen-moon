---
name: bilibili-publish
description: Package a finished film for Bilibili — 16:9 and 4:3-safe covers, CC subtitle files, concise title, description with chapters and quotation/music credits, tags, category, AI-content declaration and music-copyright notes. Use after render-and-master.
---

# Bilibili package

1. **Cover**: `src/lab/cover.ts` (the most recognisable image + title), render with
   `node tools/stills.mjs --mod src/lab/cover.ts --tag coverHi --scale 1.35 5`, crop 1920×1080 for 16:9 and
   check the centred 1440×1080 crop for 4:3 — nothing important may be cut.
2. **Subtitles**: `python3 work/make_srt.py` → upload `subs_zh.srt` (中文简体) and `subs_en.srt` (English); do NOT
   upload the bilingual file (the picture already has burned-in bilingual subtitles); set CC off by default.
3. **Title**: short — film title + subject (e.g. 「一个有月亮的晚上｜张爱玲」); keywords go to tags/description.
4. **Description**: two-line hook, life timeline, chapters (mm:ss from section starts), all quoted works,
   music credit + "非商业二次创作", how it was made (agents · tokens · lines of code · frames).
5. **Declarations**: 自制; tick 「作者声明 → 使用人工智能合成技术」. Commercial songs may be content-ID'd:
   playable as non-commercial fan work, but may be excluded from monetisation.
6. Spec: 1920×804 (2.39:1) = 1080P tier; H.264 High@4.1, ≤ 20 Mbps peak, AAC 320k 48 kHz, −14 LUFS.
