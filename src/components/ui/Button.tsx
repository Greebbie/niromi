interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'bg-transparent text-white/60 hover:text-white/80 hover:bg-white/10 border-none',
  danger: 'bg-red-500/80 text-white hover:bg-red-500 border-none',
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-4 py-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variantClass = VARIANT_CLASSES[variant]
  const sizeClass = SIZE_CLASSES[size]

  return (
    <button
      className={`btn-interactive rounded-[var(--radius-md)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
