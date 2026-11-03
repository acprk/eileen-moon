/** 2.39:1 scope frame, 24 fps, whole song (赵雷《程艾影》, 300.44 s). */
export const W = 1920
export const H = 804
export const FPS = 24
/** Film ends before the song's instrumental tail (user: length close to the reference film, 4:32). */
export const DUR = 285.5
/**
 * Film-grain multiplier. Bilibili re-encodes uploads; heavy per-frame grain turns into blocky mush and steals
 * bitrate from the fine text glyphs, so the upload master uses a lighter grain.
 */
export const GRAIN_SCALE = 0.45
/** music fades out over the last few seconds */
export const MUSIC_FADE = 4.5
export const AUDIO_FILE = 'audio/song.wav'

/** House palette. Night = indigo ink; day/memory = old paper with sepia ink; the moon is the only warm light. */
export const C = {
  night0: '#0f1420',
  night1: '#1b2233',
  night2: '#2a3449',
  lineNight: '#c9d3e6', // chalky pale-blue pen line on night paper
  paper: '#e8dcc2',
  paper2: '#d9c7a3',
  ink: '#2a1d14', // sepia-black pen
  inkSoft: '#5a4330',
  moon: '#f3d9a4',
  moonCore: '#fff3d6',
  rouge: '#b3343a', // 红玫瑰 / 旗袍 / 稿纸格
  jade: '#6f8f7d',
  gold: '#c9a25a',
} as const

export const FONT = {
  zh: '"Noto Serif CJK SC"',
  kai: '"AR PL UKai CN"',
  en: '"EB Garamond"',
} as const
