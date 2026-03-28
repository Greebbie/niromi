interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  formatValue?: (value: number) => string
}

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (v) => `${Math.round(v)}%`,
}: SliderProps) {
  const displayValue = formatValue(value)

  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-white/60 text-xs">{label}</span>
        <span className="text-white/30 text-xs">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="w-full h-1 rounded-full appearance-none bg-white/30 hover:bg-white/40 accent-blue-400 transition-colors"
      />
    </div>
  )
}
