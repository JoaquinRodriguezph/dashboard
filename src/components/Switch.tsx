import type { ReactNode } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  /** Smaller explanation under the label. */
  hint?: ReactNode
  disabled?: boolean
}

/**
 * An on/off switch. It's a real checkbox (role="switch") hidden visually, so
 * keyboard, screen readers and clicking the label all work for free.
 */
export function Switch({ checked, onChange, label, hint, disabled }: SwitchProps) {
  return (
    <label className={`flex items-center justify-between gap-3 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  )
}
