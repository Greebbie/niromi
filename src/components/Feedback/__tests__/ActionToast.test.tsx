import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActionToast from '../ActionToast'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockRemoveToast = vi.fn()

vi.mock('@/stores/feedbackStore', () => ({
  useFeedbackStore: vi.fn((selector: any) => {
    const state = {
      toasts: [
        {
          id: 'test-1',
          icon: '✓',
          message: 'Test toast',
          type: 'success' as const,
          createdAt: Date.now(),
        },
      ],
      removeToast: mockRemoveToast,
    }
    return selector ? selector(state) : state
  }),
}))

describe('ActionToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders toast message text', () => {
    render(<ActionToast />)
    expect(screen.getByText('Test toast')).toBeInTheDocument()
  })

  it('renders toast icon', () => {
    render(<ActionToast />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders a container div for toasts', () => {
    const { container } = render(<ActionToast />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeDefined()
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('pointer-events-none')
  })

  it('renders multiple toasts when store has many', async () => {
    const { useFeedbackStore } = await import('@/stores/feedbackStore')
    const mockStore = useFeedbackStore as unknown as ReturnType<typeof vi.fn>
    mockStore.mockImplementation((selector: any) => {
      const state = {
        toasts: [
          { id: 't1', icon: '✓', message: 'Toast one', type: 'success' as const, createdAt: Date.now() },
          { id: 't2', icon: '⚠', message: 'Toast two', type: 'warning' as const, createdAt: Date.now() },
        ],
        removeToast: mockRemoveToast,
      }
      return selector ? selector(state) : state
    })

    render(<ActionToast />)
    expect(screen.getByText('Toast one')).toBeInTheDocument()
    expect(screen.getByText('Toast two')).toBeInTheDocument()
  })

  it('renders empty container when no toasts', async () => {
    const { useFeedbackStore } = await import('@/stores/feedbackStore')
    const mockStore = useFeedbackStore as unknown as ReturnType<typeof vi.fn>
    mockStore.mockImplementation((selector: any) => {
      const state = {
        toasts: [],
        removeToast: mockRemoveToast,
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<ActionToast />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.children).toHaveLength(0)
  })

  it('applies success styling class for success type toast', async () => {
    const { useFeedbackStore } = await import('@/stores/feedbackStore')
    const mockStore = useFeedbackStore as unknown as ReturnType<typeof vi.fn>
    mockStore.mockImplementation((selector: any) => {
      const state = {
        toasts: [
          { id: 's1', icon: '✓', message: 'Success msg', type: 'success' as const, createdAt: Date.now() },
        ],
        removeToast: mockRemoveToast,
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<ActionToast />)
    const toastEl = container.querySelector('.border-green-400\\/30')
    expect(toastEl).not.toBeNull()
  })

  it('applies error styling class for error type toast', async () => {
    const { useFeedbackStore } = await import('@/stores/feedbackStore')
    const mockStore = useFeedbackStore as unknown as ReturnType<typeof vi.fn>
    mockStore.mockImplementation((selector: any) => {
      const state = {
        toasts: [
          { id: 'e1', icon: '✗', message: 'Error msg', type: 'error' as const, createdAt: Date.now() },
        ],
        removeToast: mockRemoveToast,
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<ActionToast />)
    const toastEl = container.querySelector('.border-red-400\\/30')
    expect(toastEl).not.toBeNull()
  })
})
