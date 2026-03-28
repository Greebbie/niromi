import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockElectronAPI } from '@/test/helpers'
import { skillRegistry } from '../registry'
import { toolRegistry } from '@/core/tools/registry'

// Mock wechat-delegate to prevent its complex imports
vi.mock('../wechat-delegate', () => ({
  registerWeChatDelegateSkill: vi.fn(),
}))

// Mock the dynamic import of loader
vi.mock('../loader', () => ({
  initMarketplaceSkills: vi.fn().mockResolvedValue(undefined),
}))

// Mock memory store for daily_summary
vi.mock('@/core/memory/store', () => ({
  memoryStore: {
    getEpisodes: vi.fn(() => []),
  },
}))

// Import the registration function
import { registerBuiltinSkills } from '../builtins'

// Import tools to register them (side-effect imports)
import '@/core/tools/files'
import '@/core/tools/apps'
import '@/core/tools/shell'
import '@/core/tools/clipboard'
import '@/core/tools/system'
import '@/core/tools/reminder'
import '@/core/tools/search'
import '@/core/tools/screen'
import '@/core/tools/automation'

describe('registerBuiltinSkills', () => {
  let mockAPI: ReturnType<typeof createMockElectronAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockElectronAPI()
    ;(window as any).electronAPI = mockAPI

    // Clear skill registry before each test
    ;(skillRegistry as any).skills.clear()

    // Register builtins fresh
    registerBuiltinSkills()
  })

  // ─── Tool-derived skill registration ────────────────────────────

  it('creates skills from tools that have entries in toolNameMap', () => {
    const allSkills = skillRegistry.getAll()
    // There should be at least the tool-derived skills + composite skills
    expect(allSkills.length).toBeGreaterThanOrEqual(10)
  })

  it('registers open_app as a skill with correct properties', () => {
    const skill = skillRegistry.get('open_app')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('打开应用')
    expect(skill!.nameEn).toBe('Open App')
    expect(skill!.category).toBe('apps')
    expect(skill!.tool).toBe('open_app')
    expect(skill!.keywords).toContain('打开')
    expect(skill!.keywords).toContain('open')
  })

  it('registers run_shell as a skill with correct properties', () => {
    const skill = skillRegistry.get('run_shell')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('运行命令')
    expect(skill!.nameEn).toBe('Run Command')
    expect(skill!.category).toBe('system')
    expect(skill!.tool).toBe('run_shell')
  })

  it('registers set_reminder as a skill with alarm icon', () => {
    const skill = skillRegistry.get('set_reminder')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('设置提醒')
    expect(skill!.nameEn).toBe('Set Reminder')
    expect(skill!.icon).toBe('\u23F0')
    expect(skill!.category).toBe('system')
  })

  it('registers list_files skill with files category', () => {
    const skill = skillRegistry.get('list_files')
    expect(skill).toBeDefined()
    expect(skill!.category).toBe('files')
    expect(skill!.keywords).toContain('文件')
    expect(skill!.keywords).toContain('files')
  })

  it('registers web_search skill with search category', () => {
    const skill = skillRegistry.get('web_search')
    expect(skill).toBeDefined()
    expect(skill!.category).toBe('search')
    expect(skill!.keywords).toContain('搜索')
  })

  it('assigns icon from toolIconMap for each tool-derived skill', () => {
    const openApp = skillRegistry.get('open_app')
    expect(openApp!.icon).toBe('\uD83D\uDE80') // rocket

    const listFiles = skillRegistry.get('list_files')
    expect(listFiles!.icon).toBe('\uD83D\uDCC2') // open folder
  })

  // ─── Composite skills ───────────────────────────────────────────

  it('registers organize_desktop composite skill', () => {
    const skill = skillRegistry.get('organize_desktop')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('整理桌面')
    expect(skill!.nameEn).toBe('Organize Desktop')
    expect(skill!.icon).toBe('\uD83E\uDDF9')
    expect(skill!.category).toBe('files')
    expect(skill!.aiInvocable).toBe(true)
    expect(skill!.keywords).toContain('organize')
    expect(skill!.keywords).toContain('desktop')
    expect(skill!.execute).toBeTypeOf('function')
  })

  it('registers clean_downloads composite skill', () => {
    const skill = skillRegistry.get('clean_downloads')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('清理下载')
    expect(skill!.nameEn).toBe('Clean Downloads')
    expect(skill!.icon).toBe('\uD83D\uDDD1\uFE0F')
    expect(skill!.category).toBe('files')
    expect(skill!.aiInvocable).toBe(true)
    expect(skill!.keywords).toContain('clean')
    expect(skill!.keywords).toContain('downloads')
  })

  it('registers daily_summary composite skill', () => {
    const skill = skillRegistry.get('daily_summary')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('每日摘要')
    expect(skill!.nameEn).toBe('Daily Summary')
    expect(skill!.icon).toBe('\uD83D\uDCCB')
    expect(skill!.category).toBe('system')
    expect(skill!.aiInvocable).toBe(true)
    expect(skill!.keywords).toContain('summary')
  })

  // ─── Showcase skills ────────────────────────────────────────────

  it('registers quick_note skill', () => {
    const skill = skillRegistry.get('quick_note')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('快速笔记')
    expect(skill!.nameEn).toBe('Quick Note')
    expect(skill!.category).toBe('create')
    expect(skill!.keywords).toContain('note')
  })

  it('registers clipboard_history skill', () => {
    const skill = skillRegistry.get('clipboard_history')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('剪贴板历史')
    expect(skill!.nameEn).toBe('Clipboard History')
    expect(skill!.category).toBe('system')
  })

  it('registers screen_reader skill with aiInvocable', () => {
    const skill = skillRegistry.get('screen_reader')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('屏幕阅读')
    expect(skill!.nameEn).toBe('Screen Reader')
    expect(skill!.aiInvocable).toBe(true)
  })

  // ─── Non-tool utility skills ────────────────────────────────────

  it('registers clear_chat skill', () => {
    const skill = skillRegistry.get('clear_chat')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('清空聊天')
    expect(skill!.nameEn).toBe('Clear Chat')
    expect(skill!.category).toBe('system')
    expect(skill!.execute).toBeTypeOf('function')
  })

  it('registers help skill', () => {
    const skill = skillRegistry.get('help')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('帮助')
    expect(skill!.nameEn).toBe('Help')
    expect(skill!.icon).toBe('\u2753')
    expect(skill!.category).toBe('system')
    expect(skill!.execute).toBeTypeOf('function')
  })

  // ─── Category correctness ──────────────────────────────────────

  it('has file-related skills in files category', () => {
    const fileSkills = skillRegistry.getByCategory('files')
    const fileIds = fileSkills.map((s) => s.id)
    expect(fileIds).toContain('list_files')
    expect(fileIds).toContain('read_file')
    expect(fileIds).toContain('organize_desktop')
    expect(fileIds).toContain('clean_downloads')
  })

  it('has system skills in system category', () => {
    const systemSkills = skillRegistry.getByCategory('system')
    const systemIds = systemSkills.map((s) => s.id)
    expect(systemIds).toContain('run_shell')
    expect(systemIds).toContain('set_reminder')
    expect(systemIds).toContain('daily_summary')
    expect(systemIds).toContain('clear_chat')
    expect(systemIds).toContain('help')
  })
})
