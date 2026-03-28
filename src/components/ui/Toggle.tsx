import { motion } from 'framer-motion'

interface ToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  size?: 'sm' | 'md'
  color?: 'blue' | 'green' | 'yellow'
  disabled?: boolean
}

const COLORS = {
  blue: 'rgba(59, 130, 246, 0.6)',
  green: 'rgba(74, 222, 128, 0.6)',
  yellow: 'rgba(250, 204, 21, 0.6)',
}

const SIZES = {
  sm: { track: 'w-7 h-3.5', thumb: 'w-2.5 h-2.5', onX: 14, offX: 2 },
  md: { track: 'w-9 h-5', thumb: 'w-3.5 h-3.5', onX: 18, offX: 3 },
}

export default function Toggle({ value, onChange, size = 'sm', color = 'blue', disabled }: ToggleProps) {
  const s = SIZES[size]

  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`relative ${s.track} rounded-full transition-colors shrink-0 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: value ? COLORS[color] : 'rgba(255, 255, 255, 0.15)' }}
      role="switch"
      aria-checked={value}
    >
      <motion.div
        className={`absolute top-0.5 ${s.thumb} rounded-full bg-white shadow-sm`}
        animate={{ left: value ? s.onX : s.offX }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
