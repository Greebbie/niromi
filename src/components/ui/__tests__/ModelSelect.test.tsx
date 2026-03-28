import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModelSelect from '../ModelSelect'

vi.mock('@/stores/configStore', () => ({
  // AIProviderType is only used as a type import, no runtime needed
}))

vi.mock('@/core/ai/models', () => ({
  MODEL_PRESETS: {
    claude: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Best value' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fast & cheap' },
    ],
    openai: [],
  } as Record<string, Array<{ id: string; label: string; description?: string }>>,
}))

describe('ModelSelect', () => {
  const defaultProps = {
    provider: 'claude' as any,
    value: 'claude-sonnet-4-20250514',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders current model label', () => {
    render(<ModelSelect {...defaultProps} />)
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument()
  })

  it('shows dropdown on click', async () => {
    const user = userEvent.setup()
    render(<ModelSelect {...defaultProps} />)

    // Dropdown not visible initially
    expect(screen.queryByText('Claude Haiku 4.5')).not.toBeInTheDocument()

    // Click trigger button
    await user.click(screen.getByRole('button', { name: /Claude Sonnet 4/ }))

    // Dropdown visible with both presets
    expect(screen.getByText('Claude Haiku 4.5')).toBeInTheDocument()
  })

  it('selects preset model and calls onChange', async () => {
    const user = userEvent.setup()
    render(<ModelSelect {...defaultProps} />)

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /Claude Sonnet 4/ }))

    // Click Haiku option
    await user.click(screen.getByText('Claude Haiku 4.5'))

    expect(defaultProps.onChange).toHaveBeenCalledWith('claude-haiku-4-5-20251001')
  })

  it('shows custom input mode', async () => {
    const user = userEvent.setup()
    render(<ModelSelect {...defaultProps} />)

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /Claude Sonnet 4/ }))

    // Click custom model button
    await user.click(screen.getByText(/自定义 model/))

    // Custom input should appear
    expect(screen.getByPlaceholderText('model-name...')).toBeInTheDocument()
  })

  it('submits custom model', async () => {
    const user = userEvent.setup()
    render(<ModelSelect {...defaultProps} />)

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /Claude Sonnet 4/ }))

    // Enter custom mode
    await user.click(screen.getByText(/自定义 model/))

    // Type custom model name and submit
    const input = screen.getByPlaceholderText('model-name...')
    await user.type(input, 'my-custom-model')
    await user.click(screen.getByText('OK'))

    expect(defaultProps.onChange).toHaveBeenCalledWith('my-custom-model')
  })
})
