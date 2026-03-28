import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CostBadge from '../CostBadge'

let mockCostState = {
  lastMessageCost: 0.005,
  sessionCost: 0.012,
  dailyCost: 0.05,
  monthlyCost: 1.23,
}

let mockProvider = 'claude'
let mockModel = 'claude-sonnet-4-20250514'

vi.mock('@/stores/costStore', () => ({
  useCostStore: vi.fn(() => mockCostState),
}))

vi.mock('@/stores/configStore', () => ({
  useConfigStore: vi.fn((selector: any) => {
    const state = {
      provider: mockProvider,
      model: mockModel,
      language: 'en' as const,
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('@/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'cost.free': 'Free',
        'cost.freeLocal': 'Free (local)',
        'cost.lastMessage': 'Last message',
        'cost.session': 'Session',
        'cost.today': 'Today',
        'cost.month': 'Month',
      }
      return map[key] ?? key
    },
    lang: 'en',
  }),
}))

describe('CostBadge', () => {
  beforeEach(() => {
    mockCostState = {
      lastMessageCost: 0.005,
      sessionCost: 0.012,
      dailyCost: 0.05,
      monthlyCost: 1.23,
    }
    mockProvider = 'claude'
    mockModel = 'claude-sonnet-4-20250514'
  })

  it('renders cost information when session has costs', () => {
    render(<CostBadge />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button.textContent).toContain('~$0.005')
    expect(button.textContent).toContain('~$0.012')
  })

  it('returns null when sessionCost is 0 and provider is not free', () => {
    mockCostState = { lastMessageCost: null as any, sessionCost: 0, dailyCost: 0, monthlyCost: 0 }
    mockProvider = 'claude'
    const { container } = render(<CostBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "Free" for ollama provider', () => {
    mockProvider = 'ollama'
    mockCostState = { lastMessageCost: null as any, sessionCost: 0, dailyCost: 0, monthlyCost: 0 }
    render(<CostBadge />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('shows "Free" for vllm provider', () => {
    mockProvider = 'vllm'
    mockCostState = { lastMessageCost: null as any, sessionCost: 0, dailyCost: 0, monthlyCost: 0 }
    render(<CostBadge />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('opens detail panel on button click', () => {
    render(<CostBadge />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText('Last message')).toBeInTheDocument()
    expect(screen.getByText('Session')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
  })

  it('shows provider and model in detail panel', () => {
    render(<CostBadge />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/claude/)).toBeInTheDocument()
  })

  it('shows "Free (local)" in detail panel for ollama', () => {
    mockProvider = 'ollama'
    mockCostState = { lastMessageCost: null as any, sessionCost: 0, dailyCost: 0, monthlyCost: 0 }
    render(<CostBadge />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Free (local)')).toBeInTheDocument()
  })

  it('formats very small costs as <$0.001', () => {
    mockCostState = {
      lastMessageCost: 0.0001,
      sessionCost: 0.0002,
      dailyCost: 0,
      monthlyCost: 0,
    }
    render(<CostBadge />)
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('<$0.001')
  })
})
