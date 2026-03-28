import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormField from '../FormField'

describe('FormField', () => {
  it('renders label text', () => {
    render(
      <FormField label="Username">
        <input type="text" />
      </FormField>
    )
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('renders children input', () => {
    render(
      <FormField label="Email">
        <input type="email" placeholder="test@example.com" />
      </FormField>
    )
    expect(screen.getByPlaceholderText('test@example.com')).toBeInTheDocument()
  })

  it('shows hint text when provided', () => {
    render(
      <FormField label="Name" hint="Enter your full name">
        <input type="text" />
      </FormField>
    )
    expect(screen.getByText('Enter your full name')).toBeInTheDocument()
  })

  it('shows error text when provided', () => {
    render(
      <FormField label="Name" error="Name is required">
        <input type="text" />
      </FormField>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required')
  })

  it('hides hint when error is present', () => {
    render(
      <FormField label="Name" hint="Enter your name" error="Required">
        <input type="text" />
      </FormField>
    )
    expect(screen.queryByText('Enter your name')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})
