interface SectionHeaderProps {
  icon?: string
  title: string
  description?: string
}

export default function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-sm">{icon}</span>}
        <h3 className="text-xs font-medium text-white/90">{title}</h3>
      </div>
      {description && (
        <p className="text-[0.625rem] text-white/40 mt-0.5 leading-tight">
          {description}
        </p>
      )}
    </div>
  )
}
