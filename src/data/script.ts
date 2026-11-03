/**
 * Narration — the narrator is the moon she wrote about (《金锁记》: 三十年前的上海，一个有月亮的晚上…).
 * All times are global seconds in the song. Quotations from her works are marked `quote: true` and must stay
 * verbatim. Facts were checked against standard biographies; see SCRIPT.md for sources and notes.
 *
 * Segments (each owned by one scene file):
 *   A  0.00 –  41.47  prologue · title                      (intro)
 *   B 41.47 –  76.32  1920–1938 childhood, the locked room   (verse 1)
 *   C 76.32 – 110.57  1939–1943 Hong Kong, war, fame         (chorus 1 + interlude)
 *   D 110.57 – 176.87 1944–1952 常德公寓, 胡兰成, the letter (verse 2 + pre-chorus + interlude)
 *   E 176.87 – 211.60 1955–1990s America, Los Angeles       (chorus 2 + post-chorus)
 *   F 211.60 – 252.33 her characters · 1994 · 1995          (instrumental climax, hum, drop)
 *   G 252.33 – 300.40 the Pacific · the last moon · credits (outro)
 */
import type { Cue } from '../lib/type'

export const SEGMENTS = {
  A: [0, 41.471],
  B: [41.471, 76.324],
  C: [76.324, 110.573],
  D: [110.573, 176.866],
  E: [176.866, 211.603],
  F: [211.603, 252.331],
  G: [252.331, 300.4],
} as const

export const CUES: Cue[] = [
  // A — prologue
  { t0: 4.2, t1: 8.8, zh: '我是一个月亮。', en: 'I am a moon.' },
  { t0: 9.4, t1: 14.2, zh: '她写过我很多次。', en: 'She wrote me, many times.' },
  { t0: 14.6, t1: 23.2, zh: '三十年前的上海，一个有月亮的晚上……', en: 'Shanghai, thirty years ago. A night with a moon…', quote: true },
  { t0: 33.4, t1: 40.8, zh: '她一生都在写我。今晚，换我来写她。', en: 'All her life she wrote about me. Tonight, I write about her.' },

  // B — 1920–1938
  { t0: 42.0, t1: 47.6, zh: '一九二〇年九月三十日，上海，麦根路。', en: 'September 30, 1920. Markham Road, Shanghai.' },
  { t0: 49.0, t1: 54.3, zh: '四岁那年，母亲坐上轮船，去了英国。', en: 'When she was four, her mother took a ship to England.' },
  { t0: 54.6, t1: 59.6, zh: '父亲留在烟榻上。她留在那座老房子里。', en: 'Her father stayed on his opium couch. She stayed in the old house.' },
  { t0: 60.2, t1: 65.4, zh: '十七岁，她和继母起了冲突，被父亲关了起来。', en: 'At seventeen, after a fight with her stepmother, her father locked her up.' },
  { t0: 65.8, t1: 70.5, zh: '我在窗外，陪了她半年。', en: 'I kept her company outside the window, for half a year.' },
  { t0: 70.9, t1: 76.0, zh: '一九三八年初，她逃了出来，再没有回去。', en: 'Early in 1938 she escaped, and never went back.' },

  // C — 1939–1943
  { t0: 76.6, t1: 80.3, zh: '一九三九年，香港。', en: '1939. Hong Kong.' },
  { t0: 80.6, t1: 84.4, zh: '十九岁的她写下：', en: 'At nineteen, she wrote:' },
  { t0: 84.7, t1: 90.0, zh: '生命是一袭华美的袍，爬满了蚤子。', en: 'Life is a gorgeous robe, crawling with fleas.', quote: true },
  { t0: 90.3, t1: 96.0, zh: '一九四一年冬，香港沦陷。', en: 'Winter, 1941. Hong Kong fell.' },
  { t0: 96.6, t1: 100.3, zh: '也许就因为要成全她，一个大都市倾覆了。', en: 'Perhaps it was to fulfil her that a great city fell.', quote: true },
  { t0: 100.6, t1: 104.6, zh: '一九四三年，上海。二十三岁的她，一年之间红遍全城。', en: '1943, Shanghai. At twenty-three, within a year the whole city was reading her.' },
  { t0: 104.9, t1: 107.6, zh: '一九四四年，小说集《传奇》出版，一时洛阳纸贵。', en: '1944: her stories were collected as Romances, and all Shanghai wanted a copy.' },
  { t0: 107.9, t1: 110.5, zh: '出名要趁早呀！', en: 'Fame must come early!', quote: true },

  // D — 1944–1952
  { t0: 110.9, t1: 114.6, zh: '常德路，爱丁顿公寓，六楼。', en: 'Eddington House, Changde Road. The sixth floor.' },
  { t0: 115.0, t1: 120.6, zh: '我是非得听见电车响才睡得着觉的。', en: 'I cannot fall asleep unless I hear the trams.', quote: true },
  { t0: 121.1, t1: 126.6, zh: '一九四四年二月，一个叫胡兰成的男人，从门缝里塞进一张字条。', en: 'February 1944. A man named Hu Lancheng slipped a note under her door.' },
  { t0: 127.8, t1: 134.8, zh: '见了他，她变得很低很低，低到尘埃里。', en: 'Before him she grew low, very low — low as the dust.', quote: true },
  { t0: 135.3, t1: 142.9, zh: '但她心里是欢喜的，从尘埃里开出花来。', en: 'Yet her heart was glad, and out of the dust a flower bloomed.', quote: true },
  { t0: 143.4, t1: 147.6, zh: '婚书上写：愿使岁月静好，现世安稳。', en: 'Their vow read: may the years be quiet, the world at peace.' },
  { t0: 147.9, t1: 151.6, zh: '那年冬天，他去了武汉。', en: 'That winter, he left for Wuhan.' },
  { t0: 151.9, t1: 156.2, zh: '后来是温州。后来，是别的女人。', en: 'Then Wenzhou. Then, other women.' },
  { t0: 156.5, t1: 160.7, zh: '我将只是萎谢了。', en: 'I shall simply wither.', quote: true },
  { t0: 161.2, t1: 166.6, zh: '一九四七年六月，她写信给他：我已经不喜欢你了。', en: 'June 1947. She wrote to him: I no longer like you.' },
  { t0: 167.2, t1: 171.4, zh: '一九五二年，她离开上海。', en: 'In 1952, she left Shanghai.' },
  { t0: 171.8, t1: 176.5, zh: '从此再也没有回来。', en: 'She never came back.' },

  // E — 1955–1990s
  { t0: 177.0, t1: 181.3, zh: '一九五五年秋，克利夫兰总统号，太平洋。', en: 'Autumn 1955. The SS President Cleveland. The Pacific.' },
  { t0: 181.6, t1: 185.6, zh: '她三十五岁。在美国，没有人知道她是谁。', en: 'She was thirty-five. In America, no one knew who she was.' },
  { t0: 185.9, t1: 190.1, zh: '一九五六年，她嫁给了作家赖雅。', en: 'In 1956 she married the writer Ferdinand Reyher.' },
  { t0: 190.4, t1: 194.0, zh: '十一年后，他病逝。', en: 'Eleven years later, he died.' },
  { t0: 194.3, t1: 198.2, zh: '一九七二年，她搬到洛杉矶，从此闭门不出。', en: 'In 1972 she moved to Los Angeles, and shut her door.' },
  { t0: 198.5, t1: 206.3, zh: '雨声潺潺，像住在溪边。宁愿天天下雨，以为你是因为下雨不来。', en: 'Rain murmured, as if I lived by a stream. Let it rain every day — so I could think it was the rain that kept you away.', quote: true },
  { t0: 206.7, t1: 211.4, zh: '她一次次搬家，一封封写信，一遍遍改着旧稿。', en: 'She moved, and moved again; wrote letter after letter; rewrote the old pages, over and over.' },

  // F — climax · 1994 · 1995
  { t0: 212.0, t1: 216.2, zh: '娶了红玫瑰，久而久之，红的变了墙上的一抹蚊子血，', en: 'Marry the red rose, and in time she is a smear of mosquito blood on the wall,', quote: true },
  { t0: 216.5, t1: 220.2, zh: '白的还是“床前明月光”。', en: 'while the white one is still “moonlight before the bed.”', quote: true },
  { t0: 220.6, t1: 224.2, zh: '世钧，我们回不去了。', en: 'Shijun — we can never go back.', quote: true },
  { t0: 224.6, t1: 228.2, zh: '我们各人住在各人的衣服里。', en: 'Each of us lives inside our own clothes.', quote: true },
  { t0: 228.6, t1: 232.9, zh: '然后时间加速，越来越快，繁弦急管转入急管哀弦……', en: 'Then time sped up, faster and faster; gay strings and pipes turned to mournful ones…', quote: true },
  { t0: 233.4, t1: 238.6, zh: '一九九四年，她出版了最后一本书，《对照记》。', en: 'In 1994 she published her last book, an album of her old photographs.' },
  { t0: 239.0, t1: 244.9, zh: '照片里的她仰着下巴，像在看我。', en: 'In the photograph her chin is raised, as if she were looking at me.' },
  { t0: 245.6, t1: 251.8, zh: '一九九五年九月，洛杉矶。人们发现她时，她已离开多日。', en: 'September 1995, Los Angeles. When they found her, she had been gone for days.' },

  // G — outro
  { t0: 252.6, t1: 258.9, zh: '九月三十日，她七十五岁生日那天，骨灰撒进了太平洋。', en: 'On September 30, her seventy-fifth birthday, her ashes were scattered over the Pacific.' },
  { t0: 259.4, t1: 264.8, zh: '那一晚，我照在海上。', en: 'That night, I shone upon the sea.' },
  { t0: 265.2, t1: 270.0, zh: '三十年前的月亮早已沉下去，三十年前的人也死了，', en: 'The moon of thirty years ago has long since set, the people of thirty years ago are dead,', quote: true },
  { t0: 270.4, t1: 276.6, zh: '然而三十年前的故事还没完——完不了。', en: 'but the story of thirty years ago is not over — it can never be over.', quote: true },
]
