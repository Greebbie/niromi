interface FormFieldProps {
  label: string
  children: React.ReactNode
  hint?: string
  error?: string
}

export default function FormField({ label, children, hint, error }: FormFieldProps) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-white/60 mb-1">{label}</label>
      {children}
      {hint && !error && (
        <p className="text-[0.625rem] text-white/40 mt-1 leading-tight">{hint}</p>
      )}
      {error && (
        <p className="text-[0.625rem] text-red-400 mt-1 leading-tight" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
