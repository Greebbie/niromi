<div align="center">

<img src="niromi.png" width="120" />

# Niromi

**你的桌面 AI 伙伴和数字员工**

住在屏幕角落，看得见、记得住、能动手 — 可视化、零门槛的桌面 Agent。

[English](README.md) | **中文**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)

</div>

---

## 为什么选 Niromi？

市面上有很多能操作电脑的 AI agent。大部分是全自主的 — 你给个目标，它自己决定怎么做，一轮轮调 LLM，（希望能）搞定。它们很强，但是面向开发者、烧 token、偶尔会跑偏。

Niromi 一样强 — 但更懂事。

该做的直接做，该问的先问你。**有能力自主，但选择听你的。** 像一个特别靠谱的帮手 — 有你家钥匙，但不会趁你不在翻你抽屉。

### 跟自主 Agent 的区别

| 自主 Agent | Niromi |
|---|---|
| 给目标，它自己干 | 一样能干 — 但重要的事先问你 |
| Agent 自己选工具 | Niromi 建议工具，你说行才用 |
| 每句话都过 LLM | 简单命令本地跑，零 token |
| 给完权限随便跑 | 每个工具独立权限控制 |
| 住在终端/聊天窗口 | 住在屏幕上，有角色、有表情 |
| 记对话历史 | 记住**你这个人**的结构化信息 |
| 费用自己算 | 费用提前告知，内置显示 |
| 命令行安装 + 配置 | 双击安装 + 填 key |

---

## 五大核心场景

1. **微信值守** — 帮你盯微信，按规则自动回复，敏感内容自动屏蔽
2. **开发看守** — 盯 Claude Code / 终端 / 浏览器，完成/报错时通知你
3. **快速命令** — "打开 Chrome"、"去 GitHub"、"计算 123*456"，零 token 即说即做
4. **Skill 生态** — 教会 Niromi 新能力（量化盯盘、自动化办公等）
5. **可视化小白化** — QuickActions 一键配置，角色情绪跟随场景变化

右键角色 → "快捷操作" 即可一键开启。监控默认 5 分钟查一次，token 极省。

---

## 功能

### 操作电脑

- **文件** — 创建、移动、复制、删除、搜索、整理
- **应用** — 打开任意应用
- **命令行** — 执行命令（需确认）
- **剪贴板** — 读取和写入
- **系统** — 磁盘、电池、网络、进程
- **搜索** — Bing 搜索（国内可用）
- **屏幕** — 截图 + OCR + 视觉分析

权限分级：低风险直接做，中风险展示计划，高风险明确警告。

### 分层视觉

OCR 优先，只在需要时才调 AI：

| 层级 | 内容 | 费用 |
|------|------|------|
| **0** | 读窗口标题（系统 API） | 免费 |
| **1** | OCR 文字提取（Tesseract.js 本地） | 免费 |
| **2** | 压缩截图发 AI Vision | ~200 tokens |

3 种提取策略自动匹配窗口类型：聊天类 / 终端类 / 通用类。

### 多模型路由

不同任务可用不同 AI — 对话用强模型，监控用便宜模型，视觉用支持图的模型。

设置 → AI → 任务路由，每种任务独立配置。

### 结构化记忆

不是存对话历史，是记住**你这个人**：

- **Identity** — 名字、语言、位置、职业
- **Preferences** — 常用工具、工作习惯
- **Episodes** — 最近做了什么（注入最近 3-5 条）
- **Facts** — 从对话中提取的知识，FTS5 全文搜索

全部存在本地 SQLite，压缩注入 < 50 tokens。数据不离开你的电脑。

### 角色是活的

```
情绪: { curiosity, focus, joy, concern } — 连续浮点值 0.0 到 1.0
衰减: 指数衰减 (×0.95 每 500ms) — 开心一会儿，然后慢慢平静
空闲: CSS 呼吸动画、随机眨眼、打哈欠、眼球跟踪鼠标
```

---

## 快速开始

```bash
git clone https://github.com/user/niromi.git
cd niromi
npm install
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

Niromi 出现在屏幕角落。点击它，填 API Key，开始聊天。

---

## 支持的 AI

| 服务 | 适合场景 |
|------|---------|
| **Claude**（推荐） | 工具调用最强 |
| **OpenAI** | GPT-4o / 4o-mini |
| **DeepSeek** | 便宜好用 |
| **Ollama** | 免费本地运行 |
| **vLLM** | 自建模型 |
| **通义千问** | 中文模型 |
| **Minimax** | 国内替代 |

每种任务可独立配置不同模型 — 对话、视觉、监控、记忆各用最合适的。

---

## 省钱

```
"打开 Chrome"     → 本地正则匹配 → 零 token
"现在几点"        → 本地匹配     → 零 token
"计算 123*456"    → 本地计算     → 零 token
"帮我整理文件"    → 需要 AI      → ~1000 tokens
```

| | 自主 Agent | Niromi |
|---|---|---|
| 简单命令 | 1-3 次 API, ~2000 tokens | 0 次 API, 0 tokens |
| 月均费用 (30次/天) | ~$100-180 | Claude ¥19 / DeepSeek ¥1.5 / Ollama 免费 |

---

## 路线图

- [x] 桌面角色 + 连续情绪系统
- [x] AI 对话 + 流式响应
- [x] 文件操作 + 系统工具 (15+ 工具)
- [x] 7 个 AI 服务商支持
- [x] 多模型路由（每种任务独立配置）
- [x] 本地命令解析器（60+ 模式，模糊匹配）
- [x] 三层记忆 + SQLite + FTS5 全文搜索
- [x] 视觉系统（OCR → LLM Vision，3 种策略）
- [x] 管理面板（权限、监控、自动回复、日志）
- [x] 快捷操作面板（一键配置场景）
- [x] 看守预设（Claude Code / 网页 / 编译）
- [x] 语音交互（Whisper STT + Web Speech TTS）
- [x] 125 个单元测试
- [ ] 技能商店 + 社区技能
- [ ] 角色皮肤 + 社区角色
- [ ] MCP 协议支持
- [ ] 定时任务调度
- [ ] 云端记忆同步 (Pro)

---

## 贡献

欢迎贡献！请先阅读 `CLAUDE.md` 了解开发规范和设计理念。

```bash
npm run dev      # 启动开发服务器 + Electron
npm test         # 运行 Vitest 测试
npm run build    # 生产构建
```

---

## License

MIT

<div align="center">

**Niromi 看得见你。Niromi 帮得了你。Niromi 记得住你。**

</div>
