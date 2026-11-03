# 米麦 MIME TECH · 密数科技 — 产品使用说明宣传片（60 s）

> 密码保护资产 · 数学生长价值
> Cryptography protects assets · Mathematics grows value

一支 60 秒、1920×1080、30 fps 的商业演示片。内容依据 [acprk/mishu-platform](https://github.com/acprk/mishu-platform)：
演员把脸、声音、虚拟形象加密登记到平台，买家购买的只是**使用权**，**每次使用都要演员本人在手机上签名同意**，密钥始终在演员手中，可随时撤销或冻结；每次使用写入透明账本，收益自动回流演员。

画面全部由代码绘制（Canvas 2D），没有用 AI 生图，也没有任何第三方素材。版式参照用户提供的参考片（左右图文卡片 + 编号章节），每章换一种动效风格：

| 时间 | 段落 | 风格 | 演示内容 |
|---|---|---|---|
| 0–6 s | 片头 | 点阵汇聚 + Logo 扫光 | 密数科技 logo、「米麦 · MIME TECH」、口号 |
| 6–9 s | 卡点 | 动态文字（kinetic type） | 一张脸 / 一段声音 / 一个虚拟形象 / 都是你的资产 |
| 9–19 s | 01 肖像确权 | 扁平矢量 | 本地扫描 → 加密成密文块 → 平台只存密文；私钥留在演员手里；featureCommit / Ed25519 / 账本 |
| 19–29 s | 02 加密市场 | 等轴 2.5D | 加密资产城市，选中「林夏 · 面部肖像」，许可卡（使用权 · ¥2,000/次 · 版税 10%），申请使用 → 推送演员手机 |
| 29–39 s | 03 逐次授权 | 弥散渐变玻璃拟态 | 手机收到申请 → 核对条款 → 签名同意 → 桌面端受控生成（证明 / 释放 / 解密 / 生成 / 擦除） |
| 39–49 s | 04 密钥在手 | 赛博 HUD | 根密钥环、三份许可实时监控，一键撤销（停止交付）、续期 |
| 49–55 s | 05 数学生长价值 | 数据可视化 | LICENSE_USE 叶子 → Merkle 根 → 收益曲线自动结算 |
| 55–60 s | 片尾 | Logo + 口号 | 米麦 · MIME TECH，附「部分能力为原型模拟实现」说明 |

人名「林夏」和公司名「星河影业 / 青禾广告 / 北辰游戏」都是虚构的演示数据。平台 README 写明 TEE、KYC、支付目前是模拟实现，所以片尾加了一行小字说明。

## 制作

```bash
# 1) logo：保留原图 alpha，输出 assets/logo.png
python3 -I tools/logo_alpha.py <logo.webp> assets/logo.png
# 2) 原创配乐（numpy 合成，120 BPM，所有卡点都对齐画面事件）
python3 -I tools/music.py music.wav
# 3) 看片：抽帧拼成联系表（按 CLAUDE.md 的要求：一定要读图）
node tools/render.mjs --stills 3,12,22,33,44,52,57 --out sheet.jpg
# 4) 成片：4 个 Chromium 页面并行逐帧渲染 → x264 High@4.1 + AAC
node tools/render.mjs --video mime_promo.mp4 --audio music.wav --workers 4
```

实时预览：用任意静态服务器打开本目录下的 `index.html?play`。

- `film.js`：整片的时间线，`render(t)` 是关于时间 t（秒）的纯函数；各章节的 stage 函数各管一张卡片。
- `fonts/`：Noto Sans SC、Inter、JetBrains Mono（均为 SIL OFL 1.1，取自 Fontsource）。
- 渲染出的视频和音频不入库（见仓库根目录 NOTICE.md）。
