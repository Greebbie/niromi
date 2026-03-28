import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SectionHeader from '../SectionHeader'

describe('SectionHeader', () => {
  it('renders title text', () => {
    render(<SectionHeader title="Settings" />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<SectionHeader icon="⚙️" title="Settings" />)
    expect(screen.getByText('⚙️')).toBeInTheDocument()
  })

  it('does not render icon element when icon not provided', () => {
    const { container } = render(<SectionHeader title="No Icon" />)
    // Only the title h3 should be a child of the flex row, no icon span
    const flexRow = container.querySelector('.flex')
    expect(flexRow?.children.length).toBe(1)
  })

  it('renders description when provided', () => {
    render(<SectionHeader title="Settings" description="Configure your app" />)
    expect(screen.getByText('Configure your app')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(<SectionHeader title="Settings" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })
})
