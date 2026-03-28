/**
 * All pattern arrays organized by category.
 * Concatenated in the EXACT original order for match priority preservation.
 */
import type { Pattern } from '../types'
import { isKnownApp, KNOWN_APPS } from '../data/known-apps'
import { resolveWebsite } from '../data/known-websites'

// ── Open Website (CN + EN) ──────────────────────────────────────────
const webPatterns: Pattern[] = [
  {
    regex: /^(?:打开|启动|运行|上|去|看)\s*(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: resolveWebsite(m[1].trim())! }),
    guard: (m) => resolveWebsite(m[1].trim()) !== null,
  },
  {
    regex: /^(?:open|launch|start|go to|visit)\s+(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: resolveWebsite(m[1].trim())! }),
    guard: (m) => resolveWebsite(m[1].trim()) !== null,
  },
]

// ── Open App (CN + EN, known apps only) ─────────────────────────────
const appPatterns: Pattern[] = [
  {
    regex: /^(?:打开|启动|运行)\s*(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: m[1].trim() }),
    guard: (m) => isKnownApp(m[1]),
  },
  {
    regex: /^(?:open|launch|start|run)\s+(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: m[1].trim() }),
    guard: (m) => isKnownApp(m[1]),
  },
]

// ── File Operations ─────────────────────────────────────────────────
const filePatterns: Pattern[] = [
  { regex: /^(?:删除|移除)\s*(.+)$/i, tool: 'delete_files', extract: (m) => ({ path: m[1].trim() }) },
  { regex: /^(?:delete|remove)\s+(.+)$/i, tool: 'delete_files', extract: (m) => ({ path: m[1].trim() }) },
  { regex: /^(?:移动|搬)\s*(.+?)\s*(?:到|至)\s*(.+)$/i, tool: 'move_files', extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }) },
  { regex: /^move\s+(.+?)\s+to\s+(.+)$/i, tool: 'move_files', extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }) },
  { regex: /^(?:复制|拷贝)\s*(.+?)\s*(?:到|至|to)\s*(.+)$/i, tool: 'copy_files', extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }) },
  { regex: /^copy\s+(.+?)\s+to\s+(.+)$/i, tool: 'copy_files', extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }) },
  { regex: /^(?:创建文件夹|新建文件夹|创建目录|新建目录)\s*(.+)$/i, tool: 'create_directory', extract: (m) => ({ path: m[1].trim() }) },
  { regex: /^(?:mkdir|create folder|create directory|new folder)\s+(.+)$/i, tool: 'create_directory', extract: (m) => ({ path: m[1].trim() }) },
  { regex: /^(?:写入|写)\s+(.+?)\s+(?:内容|content)\s+(.+)$/i, tool: 'write_file', extract: (m) => ({ path: m[1].trim(), content: m[2].trim() }) },
  { regex: /^write\s+(.+?)\s+content\s+(.+)$/i, tool: 'write_file', extract: (m) => ({ path: m[1].trim(), content: m[2].trim() }) },
  { regex: /^(?:列出|显示|查看)\s*(.+?)\s*(?:的文件|文件|下的|里的)$/i, tool: 'list_files', extract: (m) => ({ path: m[1].trim() }) },
  {
    regex: /^(?:列出|显示|查看)\s*(.+?)\s*$/i,
    tool: 'list_files',
    extract: (m) => ({ path: m[1].trim() }),
    guard: (m) => /[/\\:]|桌面|下载|文档|Desktop|Downloads|Documents/.test(m[1]),
  },
  { regex: /^(?:list|show|ls)\s+(?:files\s+(?:in|at)\s+)?(.+)$/i, tool: 'list_files', extract: (m) => ({ path: m[1].trim() }) },
]

// ── System Info & Clipboard & Time ──────────────────────────────────
const systemInfoPatterns: Pattern[] = [
  { regex: /^(?:系统信息|电脑信息|system info|sysinfo)$/i, tool: 'get_system_info', extract: () => ({}) },
  { regex: /^(?:读取剪贴板|粘贴板内容|clipboard|paste|read clipboard)$/i, tool: 'clipboard_read', extract: () => ({}) },
  { regex: /^(?:现在几点|几点了|什么时间|what time|current time|now|时间)$/i, extract: () => ({}), direct: () => new Date().toLocaleString() },
]

// ── Reminders ───────────────────────────────────────────────────────
const reminderPatterns: Pattern[] = [
  { regex: /^(\d+)\s*(?:分钟|min)后?(?:提醒我?|remind)\s*(.+)$/i, tool: 'set_reminder', extract: (m) => ({ minutes: parseInt(m[1]), message: m[2].trim() }) },
  { regex: /^remind\s+(?:me\s+)?(?:in\s+)?(\d+)\s*min(?:utes?)?\s+(.+)$/i, tool: 'set_reminder', extract: (m) => ({ minutes: parseInt(m[1]), message: m[2].trim() }) },
  { regex: /^(\d+)\s*(?:小时|hour)后?(?:提醒我?)\s*(.+)$/i, tool: 'set_reminder', extract: (m) => ({ minutes: parseInt(m[1]) * 60, message: m[2].trim() }) },
  { regex: /^remind\s+(?:me\s+)?(?:in\s+)?(\d+)\s*hours?\s+(.+)$/i, tool: 'set_reminder', extract: (m) => ({ minutes: parseInt(m[1]) * 60, message: m[2].trim() }) },
]

// ── Search & Real-time Queries ──────────────────────────────────────
const searchPatterns: Pattern[] = [
  { regex: /^(.{1,20}?)(?:的|什么|啥)?(?:天气|气温|温度)(?:怎么样|如何|预报)?[？?]?$/i, tool: 'web_search', extract: (m) => ({ query: m[0].replace(/[？?]$/, '').trim() }) },
  { regex: /^(?:天气|今天天气|明天天气|后天天气)(?:怎么样|如何|预报)?[？?]?$/i, tool: 'web_search', extract: (m) => ({ query: m[0].replace(/[？?]$/, '').trim() }) },
  { regex: /^(.{1,20}?)(?:的)?(?:新闻|最新消息|热搜)[？?]?$/i, tool: 'web_search', extract: (m) => ({ query: m[0].replace(/[？?]$/, '').trim() }) },
  { regex: /^(.{1,20}?)(?:多少钱|价格|股价|汇率)[？?]?$/i, tool: 'web_search', extract: (m) => ({ query: m[0].replace(/[？?]$/, '').trim() }) },
  { regex: /^(?:搜索|搜一下|搜一搜|查一下|查一查|查询|搜)\s*(.+)$/i, tool: 'web_search', extract: (m) => ({ query: m[1].trim() }) },
  {
    regex: /^查\s*(.+)$/i,
    tool: 'web_search',
    extract: (m) => ({ query: m[1].trim() }),
    guard: (m) => !/文件|文件夹|目录|桌面|下载|文档|看/.test(m[1]),
  },
  { regex: /^(?:search|look up|google)\s+(.+)$/i, tool: 'web_search', extract: (m) => ({ query: m[1].trim() }) },
]

// ── System Controls (volume, lock, shutdown, minimize, calculator) ──
const systemControlPatterns: Pattern[] = [
  {
    regex: /^(?:静音|mute|取消静音|unmute)$/i,
    tool: 'run_shell',
    extract: () => ({
      command: process.platform === 'win32'
        ? `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"`
        : `osascript -e "set volume with output muted"`,
    }),
    direct: (m) => /静音|^mute$/i.test(m[0]) ? '已静音' : '已取消静音',
  },
  {
    regex: /^(?:调高音量|音量加|volume up|louder)$/i,
    tool: 'run_shell',
    extract: () => ({
      command: process.platform === 'win32'
        ? `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"`
        : `osascript -e "set volume output volume ((output volume of (get volume settings)) + 10)"`,
    }),
    direct: () => '已调高音量',
  },
  {
    regex: /^(?:调低音量|音量减|volume down|quieter)$/i,
    tool: 'run_shell',
    extract: () => ({
      command: process.platform === 'win32'
        ? `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"`
        : `osascript -e "set volume output volume ((output volume of (get volume settings)) - 10)"`,
    }),
    direct: () => '已调低音量',
  },
  {
    regex: /^(?:锁屏|锁定屏幕|lock screen|lock)$/i,
    tool: 'run_shell',
    extract: () => ({ command: process.platform === 'win32' ? 'rundll32.exe user32.dll,LockWorkStation' : 'pmset displaysleepnow' }),
    direct: () => '正在锁屏...',
  },
  {
    regex: /^(?:关机|shutdown|shut down)$/i,
    tool: 'run_shell',
    extract: () => ({ command: process.platform === 'win32' ? 'shutdown /s /t 60' : 'sudo shutdown -h +1' }),
    direct: () => '将在 60 秒后关机（可用 shutdown /a 取消）',
  },
  {
    regex: /^(?:重启|restart|reboot)$/i,
    tool: 'run_shell',
    extract: () => ({ command: process.platform === 'win32' ? 'shutdown /r /t 60' : 'sudo shutdown -r +1' }),
    direct: () => '将在 60 秒后重启（可用 shutdown /a 取消）',
  },
  {
    regex: /^(?:最小化|minimize)$/i,
    extract: () => ({}),
    direct: () => { window.electronAPI?.minimizeWindow(); return '已最小化' },
  },
  {
    regex: /^(?:计算|算一下|calc(?:ulate)?)\s*(.+)$/i,
    extract: (m) => ({ expression: m[1].trim() }),
    direct: (m) => {
      const expr = m[1].trim()
      if (!/^[\d+\-*/().%\s]+$/.test(expr)) return '只支持数字计算哦~'
      try {
        const result = new Function(`"use strict"; return (${expr})`)()
        return typeof result === 'number' && isFinite(result) ? `${expr} = ${result}` : '计算出错了~'
      } catch { return '表达式有误~' }
    },
  },
]

// ── Screen & Process ────────────────────────────────────────────────
const screenPatterns: Pattern[] = [
  { regex: /^(?:当前窗口|活动窗口|我在看什么|active window|what's? (?:the )?(?:current|active) window)$/i, tool: 'get_active_window', extract: () => ({}) },
  { regex: /^(?:进程列表|运行的程序|running apps|what's running|list processes|process list)$/i, tool: 'list_processes', extract: () => ({}) },
  { regex: /^(?:电池|电量|battery)$/i, tool: 'get_system_info', extract: () => ({}) },
  { regex: /^(?:磁盘空间|磁盘|硬盘|disk space|disk usage)$/i, tool: 'get_system_info', extract: () => ({}) },
  { regex: /^(?:截图|截屏|screenshot|capture screen)$/i, tool: 'capture_screenshot', extract: () => ({}) },
  { regex: /^(?:分析屏幕|看屏幕|看看屏幕|看一下屏幕|屏幕上有什么|我的屏幕有什么|看看我的屏幕|屏幕上是什么|你看到了什么|屏幕有什么|帮我看屏幕|帮我看看屏幕|analyze screen|what do you see|what's on (?:my )?screen|describe (?:my )?screen|look at (?:my )?screen)$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^你(?:看得见|能看到|能看见|看得到).*(?:屏幕|桌面)[吗嘛？?]*$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^(?:帮我)?看看(?:我的?)?屏幕上.*$/i, tool: 'describe_screen', extract: () => ({}) },
  {
    regex: /^(?:看看?|帮我看看?|分析|look at|check|show me)\s*(?:我的)?(.+?)(?:窗口|的窗口|window)?$/i,
    tool: 'describe_window',
    extract: (m) => ({ window_name: m[1].trim() }),
    guard: (m) => {
      const name = m[1].trim().toLowerCase()
      if (/屏幕|桌面|screen|desktop/.test(name)) return false
      return KNOWN_APPS.has(name) || name.length <= 10
    },
  },
  { regex: /^(?:你)?(?:看看|看一下|看一眼|帮我看|帮我看看)[？?]?$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^(?:你)?(?:看到|能看到|能看见|看得到|看得见)(?:什么|了什么|啥)[？?]?$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^(?:我的)?屏幕(?:上)?(?:有什么|是什么|显示什么|在显示什么|内容|怎么了)[？?]?$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^can you see (?:my )?(?:screen|desktop)[?]?$/i, tool: 'describe_screen', extract: () => ({}) },
  { regex: /^what(?:'s| is) on (?:my )?(?:screen|desktop)[?]?$/i, tool: 'describe_screen', extract: () => ({}) },
]

// ── Navigation Shortcuts ────────────────────────────────────────────
const navigationPatterns: Pattern[] = [
  { regex: /^(?:打开下载|下载文件夹|open downloads)$/i, tool: 'open_app', extract: () => ({ name: 'Downloads' }) },
  { regex: /^(?:打开文档|文档文件夹|open documents)$/i, tool: 'open_app', extract: () => ({ name: 'Documents' }) },
  { regex: /^(?:打开桌面|桌面文件夹|open desktop)$/i, tool: 'open_app', extract: () => ({ name: 'Desktop' }) },
]

// ── Skill Shortcuts ─────────────────────────────────────────────────
const skillPatterns: Pattern[] = [
  { regex: /^(?:\/note|记一下|笔记)\s+(.+)/i, skill: 'quick_note', extract: (m) => ({ content: m[1].trim() }) },
  { regex: /^(?:\/notes|查笔记|看笔记)$/i, skill: 'quick_note_search', extract: () => ({}) },
  { regex: /^(?:\/clipboard|剪贴板历史)$/i, skill: 'clipboard_history', extract: () => ({}) },
  { regex: /^(?:\/看屏幕|看一下屏幕|read.?screen)$/i, skill: 'screen_reader', extract: () => ({}) },
  // Skill creation — opens the admin panel to create skill wizard
  {
    regex: /^(?:\/create-skill|\/新建技能|创建技能|新建技能|创建一个技能|我要加个技能|添加技能|create skill|add skill|new skill)$/i,
    extract: () => ({}),
    direct: () => '请在控制中心 → 技能 → 创建技能 中配置你的新技能~',
  },
]

// ── Automation ──────────────────────────────────────────────────────
const automationPatterns: Pattern[] = [
  {
    regex: /^(?:回复|回|在|给)\s*(.+?)(?:说|发|回复|发送)\s+(.+)$/i,
    tool: 'send_message_to_app',
    extract: (m) => ({ app: m[1].trim(), message: m[2].trim() }),
    guard: (m) => isKnownApp(m[1].trim()),
  },
  {
    regex: /^(?:send|reply|type)\s+(.+?)\s+(?:to|in)\s+(.+)$/i,
    tool: 'send_message_to_app',
    extract: (m) => ({ app: m[2].trim(), message: m[1].trim() }),
    guard: (m) => isKnownApp(m[2].trim()),
  },
]

// ── Help & Composite Skills ─────────────────────────────────────────
const compositePatterns: Pattern[] = [
  { regex: /^(?:帮助|能做什么|你能干什么|help|what can you do)$/i, skill: 'help', extract: () => ({}) },
  { regex: /^(?:整理桌面|收拾桌面|organize desktop|tidy desktop|clean desktop)$/i, skill: 'organize_desktop', extract: () => ({}) },
  { regex: /^(?:清理下载|整理下载|clean downloads|organize downloads)$/i, skill: 'clean_downloads', extract: () => ({}) },
  { regex: /^(?:每日摘要|今日摘要|日报|daily summary|status)$/i, skill: 'daily_summary', extract: () => ({}) },
]

/** All patterns in original match-priority order */
export const allPatterns: Pattern[] = [
  ...webPatterns,
  ...appPatterns,
  ...filePatterns,
  ...systemInfoPatterns,
  ...reminderPatterns,
  ...searchPatterns,
  ...systemControlPatterns,
  ...screenPatterns,
  ...navigationPatterns,
  ...skillPatterns,
  ...automationPatterns,
  ...compositePatterns,
]
