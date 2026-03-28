import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CodeBlock from '../CodeBlock'

const mockWriteText = vi.fn().mockResolvedValue(undefined)

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  it('renders code content', () => {
    render(<CodeBlock>{'const x = 1'}</CodeBlock>)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('shows language badge when language is provided', () => {
    render(<CodeBlock language="typescript">{'const x: number = 1'}</CodeBlock>)
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('does not show language badge when language is not provided', () => {
    const { container } = render(<CodeBlock>{'hello'}</CodeBlock>)
    // The language span should be empty (just a <span />)
    const badges = container.querySelectorAll('.uppercase.tracking-wider')
    expect(badges.length).toBe(0)
  })

  it('renders code in a pre > code element with mono font', () => {
    const { container } = render(<CodeBlock>{'some code'}</CodeBlock>)
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
    expect(codeEl?.className).toContain('font-mono')
    const preEl = container.querySelector('pre')
    expect(preEl).toBeInTheDocument()
  })

  it('has a copy button that copies code to clipboard', () => {
    render(<CodeBlock language="js">{'alert("hi")'}</CodeBlock>)
    const copyBtn = screen.getByRole('button', { name: 'Copy code' })
    expect(copyBtn).toBeInTheDocument()
    fireEvent.click(copyBtn)
    expect(mockWriteText).toHaveBeenCalledWith('alert("hi")')
  })

  it('copy button shows "Copied!" after clicking', () => {
    render(<CodeBlock language="py">{'print("hello")'}</CodeBlock>)
    const copyBtn = screen.getByRole('button', { name: 'Copy code' })
    fireEvent.click(copyBtn)
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('has dark background styling', () => {
    const { container } = render(<CodeBlock>{'code'}</CodeBlock>)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('bg-black/40')
  })
})
