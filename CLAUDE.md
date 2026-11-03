# CLAUDE.md

This repo is a procedural hand-drawn film + the multi-agent workflow that made it.

- Start with skill `biopic-film` and agent `film-director`; every agent reads `BRIEF.md` first.
- Shared libs (`src/lib/*`, `src/data/*`, `src/config.ts`, `BRIEF.md`) are owned by the director; artists own
  one scene/figure file each.
- Preview with `tools/stills.mjs --mod <file> --sheet …` and READ the images; never trust reports alone.
- Never commit copyrighted audio, lyrics text, reference footage or rendered films (see NOTICE.md).
- Shell: one simple command per Bash call; no `python -c` / `node -e` / heredocs / `sed -i`; edit with Edit/Write.
