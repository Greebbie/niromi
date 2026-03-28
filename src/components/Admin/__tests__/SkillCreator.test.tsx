import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SkillCreator from '../SkillCreator'

vi.mock('@/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'zh',
  }),
}))

vi.mock('@/core/skills/loader', () => ({
  createLocalSkill: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/stores/feedbackStore', () => ({
  useFeedbackStore: (selector: (s: any) => any) =>
    selector({
      addToast: vi.fn(),
    }),
}))

// Import after mocks
import { createLocalSkill } from '@/core/skills/loader'

describe('SkillCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<SkillCreator />)

    // Title
    expect(screen.getByText('skillCreator.title')).toBeInTheDocument()

    // Check placeholders for inputs (more reliable than label text with regex)
    expect(screen.getByPlaceholderText('skillCreator.namePlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('skillCreator.nameEnPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('skillCreator.iconPlaceholder')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('skillCreator.descriptionPlaceholder')).toBeInTheDocument()

    // AI invocable toggle
    expect(screen.getByText('skillCreator.aiInvocable')).toBeInTheDocument()

    // Interpreter select
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeInTheDocument()

    // Script textarea exists
    const textareas = document.querySelectorAll('textarea')
    expect(textareas.length).toBe(1)

    // Submit button
    expect(screen.getByText('skillCreator.create')).toBeInTheDocument()
  })

  it('renders interpreter select with options', () => {
    render(<SkillCreator />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('node')

    // Check all options
    const options = select.querySelectorAll('option')
    const values = Array.from(options).map(o => o.value)
    expect(values).toContain('node')
    expect(values).toContain('python')
    expect(values).toContain('powershell')
    expect(values).toContain('bash')
  })

  it('validates required fields on submit', async () => {
    render(<SkillCreator />)

    // Click create with empty fields
    fireEvent.click(screen.getByText('skillCreator.create'))

    // Should show error messages
    await waitFor(() => {
      expect(screen.getByText('skillCreator.nameRequired')).toBeInTheDocument()
      expect(screen.getByText('skillCreator.descriptionRequired')).toBeInTheDocument()
      expect(screen.getByText('skillCreator.scriptRequired')).toBeInTheDocument()
    })

    // createLocalSkill should not be called
    expect(createLocalSkill).not.toHaveBeenCalled()
  })

  it('calls createLocalSkill with correct config on valid submit', async () => {
    const onCreated = vi.fn()
    render(<SkillCreator onCreated={onCreated} />)

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText('skillCreator.namePlaceholder')
    const descInput = screen.getByPlaceholderText('skillCreator.descriptionPlaceholder')
    const textareas = document.querySelectorAll('textarea')

    fireEvent.change(nameInput, { target: { value: 'My Weather Skill' } })
    fireEvent.change(descInput, { target: { value: 'Check the weather' } })
    fireEvent.change(textareas[0], { target: { value: 'console.log("weather")' } })

    // Submit
    fireEvent.click(screen.getByText('skillCreator.create'))

    await waitFor(() => {
      expect(createLocalSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'my-weather-skill',
          name: 'My Weather Skill',
          description: 'Check the weather',
          script: 'console.log("weather")',
          interpreter: 'node',
          aiInvocable: true,
        })
      )
    })

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
    })
  })

  it('shows only name validation error when only name is missing', async () => {
    render(<SkillCreator />)

    // Fill description and script but not name
    const descInput = screen.getByPlaceholderText('skillCreator.descriptionPlaceholder')
    fireEvent.change(descInput, { target: { value: 'Some description' } })

    const textareas = document.querySelectorAll('textarea')
    fireEvent.change(textareas[0], { target: { value: 'some script' } })

    fireEvent.click(screen.getByText('skillCreator.create'))

    await waitFor(() => {
      expect(screen.getByText('skillCreator.nameRequired')).toBeInTheDocument()
    })

    // Other errors should not show
    expect(screen.queryByText('skillCreator.descriptionRequired')).not.toBeInTheDocument()
    expect(screen.queryByText('skillCreator.scriptRequired')).not.toBeInTheDocument()
  })

  it('uses name as nameEn when nameEn is empty', async () => {
    render(<SkillCreator />)

    const nameInput = screen.getByPlaceholderText('skillCreator.namePlaceholder')
    const descInput = screen.getByPlaceholderText('skillCreator.descriptionPlaceholder')
    const textareas = document.querySelectorAll('textarea')

    fireEvent.change(nameInput, { target: { value: 'Test Skill' } })
    fireEvent.change(descInput, { target: { value: 'A description' } })
    fireEvent.change(textareas[0], { target: { value: 'code here' } })

    fireEvent.click(screen.getByText('skillCreator.create'))

    await waitFor(() => {
      expect(createLocalSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          nameEn: 'Test Skill',
        })
      )
    })
  })
})
