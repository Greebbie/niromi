<div align="center">

<img src="niromi.png" width="120" />

# Niromi

**Your AI Desktop Companion & Digital Employee**

A living companion on your screen that sees, remembers, and acts — your visual, zero-barrier desktop agent.

**English** | [中文](README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)

</div>

---

## Why Niromi?

There are plenty of AI agents that can operate your computer. Most of them are fully autonomous — you give a goal, they decide how to get there, run a loop of LLM calls, and (hopefully) figure it out. They're powerful, but they're built for developers, burn through tokens, and can feel unpredictable when they go off-script.

Niromi is just as capable — but more thoughtful about it.

It's an AI companion that lives on your desktop, has a visible presence, remembers who you are, and **knows when to act and when to ask.** Simple things it handles instantly. Complex things it shows you a plan first. Dangerous things it asks before touching. It has the full ability to manage your computer — it just has the good sense not to do things behind your back.

### The core philosophy

| Fully Autonomous Agents | Niromi |
|---|---|
| You set a goal, agent figures out the rest | Niromi can figure it out too — but checks with you on the important parts |
| Agent picks which tools to use | Niromi suggests tools, you say yes or pick a different one |
| Runs in a loop until done (or stuck) | Simple things: instant. Complex things: step-by-step with your OK |
| Every message hits the LLM | Simple commands run locally — zero tokens, instant |
| Permission = "here's my credentials, go" | Permission = fine-grained, per-tool, per-action |
| Lives in a terminal or chat window | Lives on your screen as a character you can see and interact with |
| Remembers conversation history | Remembers structured facts about *you* as a person |
| Cost is your problem | Cost is shown before every expensive action |
| Install via CLI + config | Double-click installer, fill one API key |

This isn't about being less capable — Niromi can do everything an autonomous agent can. The difference is **judgment**. Like a capable friend who has the keys to your apartment but still knocks before rearranging your furniture.

### What makes it feel different

**It's alive.** Niromi isn't an icon in your taskbar. It's a character on your screen that breathes, blinks, follows your cursor, and reacts emotionally to what's happening. Its emotions are continuous values that decay over time — not hard switches between states.

**It's cheap.** Niromi has a local command parser that handles simple instructions at **zero token cost**. Only ambiguous or complex requests actually hit the AI. Typical monthly cost: ~$2.70 on Claude Sonnet, ~$0.20 on DeepSeek, $0 on Ollama.

**It's yours.** All memory is stored locally in SQLite on your machine. Your data never leaves your machine.

**Multi-model routing.** Different tasks can use different AI models — use a cheap model for monitoring, a powerful one for chat, a vision-capable one for screen analysis. Each task (chat, vision, monitoring, memory) can be independently configured.

**It watches while you sleep.** Delegate tasks when you step away. Brief it like a responsible colleague — it follows your rules, pauses on anything unexpected.

---

## 5 Core Scenarios

1. **WeChat Auto-Reply** — Monitor WeChat, auto-reply by rules, block sensitive content. Strict permission control: you set the rules, Niromi executes.
2. **Dev Watch** — Watch Claude Code / terminals / browsers. Detect completion, errors, or prompts — notify you or run the next queued command.
3. **Quick Commands** — "Open Chrome", "Go to GitHub", "Calculate 123*456" — zero-token local parsing, fuzzy matching, instant execution.
4. **Skill Ecosystem** — Teach Niromi new abilities (quantitative trading, office automation, etc.). Compatible with OpenClaw SKILL.md format.
5. **Visual & Zero-Barrier** — QuickActions one-click setup, StatusPill real-time status, ActionToast instant feedback, character emotions follow scenarios.

---

## Features

### It Does Things

Niromi can operate your computer through tool calling:

- **Files** — create, move, copy, delete, search, organize
- **Apps** — open any application
- **Shell** — execute commands (with your confirmation)
- **Clipboard** — read and write
- **System** — disk, battery, network, processes
- **Web search** — Bing integration (China-compatible)
- **Screen** — screenshot + OCR + vision analysis

Every action goes through a permission system: low-risk runs directly, medium-risk shows plan, high-risk requires explicit confirmation.

### It Sees Your Screen

Layered vision with OCR-first strategy — pay only when you need AI:

| Layer | What | Cost |
|-------|------|------|
| **0** | Window title via OS API | Free |
| **1** | OCR text extraction (Tesseract.js, local) | Free |
| **2** | Compressed screenshot sent to AI Vision | ~200 tokens |

Three extraction strategies auto-matched by window type: **chat** (WeChat, Discord), **terminal** (cmd, PowerShell), **generic** (browser, any app). Monitoring polls conservatively (default: every 5 minutes).

### It Remembers You

Three-layer structured memory (not chat history):

- **Identity** — name, language, location, occupation
- **Preferences** — favorite tools, work habits
- **Episodes** — recent actions (3-5 injected per conversation)
- **Facts** — knowledge extracted from conversations, searchable via FTS5

All stored locally in SQLite. Compressed injection: under 50 tokens.

---

## Quick Start

```bash
git clone https://github.com/user/niromi.git
cd niromi
npm install
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

Niromi appears in the corner of your screen. Click it, fill your API key, start talking.

---

## Supported AI Providers

| Provider | Best For |
|----------|----------|
| **Claude** (recommended) | Best tool calling, most capable |
| **OpenAI** | GPT-4o / 4o-mini |
| **DeepSeek** | Cheap & great quality |
| **Ollama** | Free, runs 100% locally |
| **vLLM** | Self-hosted models |
| **Qwen** | Chinese language models |
| **Minimax** | Chinese market alternative |

Each task (chat, vision, monitoring, memory) can use a different provider.

---

## How It Saves Tokens

```
"Open Chrome"          → local regex match → zero tokens
"What time is it?"     → local match       → zero tokens
"Calculate 123*456"    → local eval        → zero tokens
"Organize my files"    → AI needed         → ~1000 tokens
```

| | Typical Autonomous Agent | Niromi |
|---|---|---|
| Simple command | 1-3 API calls, ~2000 tokens | 0 API calls, 0 tokens |
| Monthly cost (30 uses/day) | ~$100-180 | ~$2.70 (Claude) / ~$0.20 (DeepSeek) / $0 (Ollama) |

---

## Architecture

```
Electron Main Process (thin OS shell)
├── IPC handlers (files, shell, clipboard, system)
├── Vision (OCR → LLM Vision layered extraction)
├── Memory DB (SQLite + FTS5 full-text search)
├── Monitor (active window polling + change detection)
└── Automation (SendKeys, window focusing)

React Renderer
├── Character — continuous emotion system + CSS animations
├── Chat — streaming messages + tool call cards
├── AI Core — 7-provider abstraction + multi-model routing
├── Tools — registry with permissions + audit logging
├── Parser — local regex engine (60+ patterns, fuzzy matching)
├── Memory — 3-layer store + FTS5 fact search
├── Skills — extensible plugin registry + watch presets
├── Feedback — ActionToast + StatusPill
└── QuickActions — one-click scenario setup
```

---

## Roadmap

- [x] Desktop character with continuous emotion system
- [x] Chat with streaming AI responses
- [x] File operations + system tools (15+ tools)
- [x] Multi-provider AI support (7 providers)
- [x] Multi-model routing (different AI per task)
- [x] Local command parser (60+ patterns, fuzzy matching)
- [x] Three-layer memory with SQLite + FTS5
- [x] Vision system (OCR → LLM Vision, 3 extraction strategies)
- [x] Admin panel (permissions, monitoring, auto-reply, audit logs)
- [x] QuickActions panel (one-click scenario setup)
- [x] Watch presets (Claude Code, Web Page, Build/Download)
- [x] Voice interaction (Whisper STT + Web Speech TTS)
- [x] 125 unit tests
- [ ] Skill marketplace + community skills
- [ ] Character skins + community character packs
- [ ] MCP protocol support
- [ ] Task scheduling (cron-style)
- [ ] Cloud memory sync (Pro)

---

## Contributing

Contributions welcome! Please read `CLAUDE.md` for development conventions and design philosophy.

```bash
npm run dev      # Start dev server + Electron
npm test         # Run Vitest tests
npm run build    # Production build
```

---

## License

MIT

<div align="center">

**Niromi sees you. Niromi helps you. Niromi remembers you.**

</div>
