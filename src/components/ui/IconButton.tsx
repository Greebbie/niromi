interface IconButtonProps {
  icon: string
  label: string
  onClick?: () => void
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'subtle'
  disabled?: boolean
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
}

export default function IconButton({
  icon,
  label,
  onClick,
  size = 'sm',
  variant = 'ghost',
  disabled,
  className = '',
}: IconButtonProps) {
  const base = variant === 'ghost'
    ? 'text-white/50 hover:text-white/80 hover:bg-white/10'
    : 'text-white/40 hover:text-white/60'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${SIZE_CLASSES[size]} rounded-md flex items-center justify-center transition-colors ${base} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  )
}
