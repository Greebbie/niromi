/**
 * Local command parser — zero token consumption for simple commands.
 * Matches simple Chinese/English patterns and returns tool/skill calls directly.
 */

export interface LocalMatch {
  tool?: string
  skill?: string
  params: Record<string, unknown>
}

interface Pattern {
  regex: RegExp
  tool?: string
  skill?: string
  extract: (match: RegExpMatchArray) => Record<string, unknown>
}

const patterns: Pattern[] = [
  // Open app — Chinese
  {
    regex: /^(?:打开|启动|运行)\s*(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: m[1].trim() }),
  },
  // Open app — English
  {
    regex: /^(?:open|launch|start|run)\s+(.+)$/i,
    tool: 'open_app',
    extract: (m) => ({ name: m[1].trim() }),
  },
  // Delete — Chinese
  {
    regex: /^(?:删除|移除)\s*(.+)$/i,
    tool: 'delete_files',
    extract: (m) => ({ path: m[1].trim() }),
  },
  // Delete — English
  {
    regex: /^(?:delete|remove)\s+(.+)$/i,
    tool: 'delete_files',
    extract: (m) => ({ path: m[1].trim() }),
  },
  // Move — Chinese
  {
    regex: /^(?:移动|搬)\s*(.+?)\s*(?:到|至)\s*(.+)$/i,
    tool: 'move_files',
    extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }),
  },
  // Move — English
  {
    regex: /^move\s+(.+?)\s+to\s+(.+)$/i,
    tool: 'move_files',
    extract: (m) => ({ from: m[1].trim(), to: m[2].trim() }),
  },
  // List files — Chinese
  {
    regex: /^(?:列出|显示|查看)\s*(.+?)\s*(?:的文件|文件|下的|里的)?$/i,
    tool: 'list_files',
    extract: (m) => ({ path: m[1].trim() }),
  },
  // List files — English
  {
    regex: /^(?:list|show|ls)\s+(?:files\s+(?:in|at)\s+)?(.+)$/i,
    tool: 'list_files',
    extract: (m) => ({ path: m[1].trim() }),
  },
  // System info
  {
    regex: /^(?:系统信息|电脑信息|system info|sysinfo)$/i,
    tool: 'get_system_info',
    extract: () => ({}),
  },
  // Clipboard read
  {
    regex: /^(?:读取剪贴板|粘贴板内容|clipboard|paste|read clipboard)$/i,
    tool: 'clipboard_read',
    extract: () => ({}),
  },
  // Reminder — Chinese
  {
    regex: /^(\d+)\s*(?:分钟|min)后?(?:提醒我?|remind)\s*(.+)$/i,
    tool: 'set_reminder',
    extract: (m) => ({ minutes: parseInt(m[1]), message: m[2].trim() }),
  },
  // Reminder — English
  {
    regex: /^remind\s+(?:me\s+)?(?:in\s+)?(\d+)\s*min(?:utes?)?\s+(.+)$/i,
    tool: 'set_reminder',
    extract: (m) => ({ minutes: parseInt(m[1]), message: m[2].trim() }),
  },
  // Web search — Chinese
  {
    regex: /^(?:搜索|搜一下|查一下|查询)\s*(.+)$/i,
    tool: 'web_search',
    extract: (m) => ({ query: m[1].trim() }),
  },
  // Web search — English
  {
    regex: /^(?:search|look up|google)\s+(.+)$/i,
    tool: 'web_search',
    extract: (m) => ({ query: m[1].trim() }),
  },

  // --- New: Screen & Process patterns ---

  // Active window
  {
    regex: /^(?:当前窗口|活动窗口|我在看什么|active window|what's? (?:the )?(?:current|active) window)$/i,
    tool: 'get_active_window',
    extract: () => ({}),
  },
  // Process list
  {
    regex: /^(?:进程列表|运行的程序|running apps|what's running|list processes|process list)$/i,
    tool: 'list_processes',
    extract: () => ({}),
  },
  // Battery
  {
    regex: /^(?:电池|电量|battery)$/i,
    tool: 'get_system_info',
    extract: () => ({}),
  },
  // Disk space
  {
    regex: /^(?:磁盘空间|磁盘|硬盘|disk space|disk usage)$/i,
    tool: 'get_system_info',
    extract: () => ({}),
  },
  // Screenshot
  {
    regex: /^(?:截图|截屏|screenshot|capture screen)$/i,
    tool: 'capture_screenshot',
    extract: () => ({}),
  },
  // Analyze screen (vision)
  {
    regex: /^(?:分析屏幕|看屏幕|analyze screen|what do you see)$/i,
    tool: 'analyze_screen',
    extract: () => ({}),
  },

  // --- Composite Skill patterns ---

  // Organize desktop
  {
    regex: /^(?:整理桌面|收拾桌面|organize desktop|tidy desktop|clean desktop)$/i,
    skill: 'organize_desktop',
    extract: () => ({}),
  },
  // Clean downloads
  {
    regex: /^(?:清理下载|整理下载|clean downloads|organize downloads)$/i,
    skill: 'clean_downloads',
    extract: () => ({}),
  },
  // Daily summary
  {
    regex: /^(?:每日摘要|今日摘要|日报|daily summary|status)$/i,
    skill: 'daily_summary',
    extract: () => ({}),
  },
]

/**
 * Try to match user input against local patterns.
 * Returns a match if found, null if the message should go to AI.
 */
export function parseLocal(input: string): LocalMatch | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex)
    if (match) {
      return {
        tool: pattern.tool,
        skill: pattern.skill,
        params: pattern.extract(match),
      }
    }
  }

  return null
}
