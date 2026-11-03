---
name: narration-script
description: Write the bilingual narration of a biographical film as timed cues (src/data/script.ts) with a narrator who has a point of view, verbatim quotations placed on lyric/section beats, and a sourced fact table (SCRIPT.md). Use in Phase 0 and when the user asks for more quotations or a different emphasis.
---

# Narration

## Voice
Pick a narrator that belongs to the subject's own work and has a reason to watch her whole life. Here: the
moon of 《金锁记》 ("我是一个月亮。她写过我很多次。… 今晚，换我来写她。"), which also gives the film its single
warm light and its ending ("三十年前的月亮早已沉下去… 完不了。").

## Cue format
`{ t0, t1, zh, en, quote?, pos?, theme?, x? }` — global seconds. Chinese types on character by character,
English follows. 2.5–7 s per cue; leave ≥ 0.3 s gaps; start on lyric-line or section boundaries.

## Placement rules
- Map life chapters to song sections (childhood = verse 1, fame = chorus 1 + interlude, love = verse 2 +
  pre-chorus, exile = chorus 2, her characters = instrumental climax, death = the drop, sea = outro).
- Put the most famous lines where the song's own words rhyme with them (e.g. "低到尘埃里" under the lyric about
  dust and flowers).
- Facts in narration are short and checkable ("一九四四年二月…从门缝里塞进一张字条").
- Quotations: verbatim, with the source in SCRIPT.md; in-frame quotations (written into the picture) are listed
  separately. Correct common misquotes (华美, not 华丽).
- Avoid words the user dislikes (here: "售完/售罄" was replaced by "一时洛阳纸贵").

Export Bilibili CC subtitles with `python3 work/make_srt.py`.
