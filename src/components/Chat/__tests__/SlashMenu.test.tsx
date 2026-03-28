import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SlashMenu from '../SlashMenu'
import type { SkillDefinition } from '@/core/skills/registry'

const mockSkills: SkillDefinition[] = [
  {
    id: 'open-app',
    name: '打开应用',
    nameEn: 'Open App',
    icon: '🚀',
    category: 'apps',
    description: 'Open an application',
    keywords: ['open', 'app', 'launch'],
  },
  {
    id: 'search-web',
    name: '搜索',
    nameEn: 'Web Search',
    icon: '🔍',
    category: 'search',
    description: 'Search the web',
    keywords: ['search', 'web', 'bing'],
  },
  {
    id: 'list-files',
    name: '列出文件',
    nameEn: 'List Files',
    icon: '📁',
    category: 'files',
    description: 'List directory files',
    keywords: ['list', 'files', 'dir'],
  },
]

vi.mock('@/core/skills/registry', () => ({
  skillRegistry: {
    search: vi.fn((query: string) => {
      if (!query.trim()) return mockSkills
      const q = query.toLowerCase()
      return mockSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q))
      )
    }),
  },
}))

vi.mock('@/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'slash.noMatch': 'No matching commands',
      }
      return map[key] ?? key
    },
    lang: 'en',
  }),
}))

describe('SlashMenu', () => {
  const onSelect = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all skills when filter is empty', () => {
    render(<SlashMenu filter="" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('打开应用')).toBeInTheDocument()
    expect(screen.getByText('搜索')).toBeInTheDocument()
    expect(screen.getByText('列出文件')).toBeInTheDocument()
  })

  it('renders all skills when filter is just a slash', () => {
    render(<SlashMenu filter="/" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('打开应用')).toBeInTheDocument()
    expect(screen.getByText('搜索')).toBeInTheDocument()
  })

  it('filters skills by query string', () => {
    render(<SlashMenu filter="/search" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('搜索')).toBeInTheDocument()
    expect(screen.queryByText('打开应用')).not.toBeInTheDocument()
  })

  it('shows no-match message when query has no results', () => {
    render(<SlashMenu filter="/zzzzzzz" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('No matching commands')).toBeInTheDocument()
  })

  it('calls onSelect when a skill button is clicked', () => {
    render(<SlashMenu filter="" onSelect={onSelect} onClose={onClose} />)
    fireEvent.click(screen.getByText('打开应用'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'open-app' })
    )
  })

  it('displays skill icons', () => {
    render(<SlashMenu filter="" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('🚀')).toBeInTheDocument()
    expect(screen.getByText('🔍')).toBeInTheDocument()
    expect(screen.getByText('📁')).toBeInTheDocument()
  })

  it('displays skill descriptions', () => {
    render(<SlashMenu filter="" onSelect={onSelect} onClose={onClose} />)
    expect(screen.getByText('Open an application')).toBeInTheDocument()
    expect(screen.getByText('Search the web')).toBeInTheDocument()
  })

  it('strips leading slash from filter before searching', async () => {
    const mod = await import('@/core/skills/registry')
    render(<SlashMenu filter="/open" onSelect={onSelect} onClose={onClose} />)
    expect(mod.skillRegistry.search).toHaveBeenCalledWith('open')
  })
})
