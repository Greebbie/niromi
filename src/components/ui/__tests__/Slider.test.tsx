import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Slider from '../Slider'

describe('Slider', () => {
  it('renders label and formatted value', () => {
    render(<Slider label="Volume" value={50} onChange={() => {}} />)
    expect(screen.getByText('Volume')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('uses custom formatValue function', () => {
    render(
      <Slider
        label="Temperature"
        value={0.7}
        min={0}
        max={1}
        step={0.1}
        onChange={() => {}}
        formatValue={(v) => v.toFixed(1)}
      />
    )
    expect(screen.getByText('0.7')).toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    render(<Slider label="Brightness" value={75} min={0} max={100} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-label', 'Brightness')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
    expect(slider).toHaveAttribute('aria-valuenow', '75')
  })

  it('calls onChange with parsed value', () => {
    const handleChange = vi.fn()
    render(<Slider label="Volume" value={50} onChange={handleChange} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '80' } })

    expect(handleChange).toHaveBeenCalledWith(80)
  })

  it('respects min, max, step props', () => {
    render(<Slider label="Custom" value={5} min={1} max={10} step={0.5} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '10')
    expect(slider).toHaveAttribute('step', '0.5')
  })
})
