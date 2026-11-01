import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: screen readers announce it, and it shows as a tooltip. */
  label: string
  tone?: 'default' | 'danger'
  children: ReactNode
}

/** A small round button containing just an icon. Big enough to tap on a phone. */
export function IconButton({ label, tone = 'default', className = '', children, ...rest }: IconButtonProps) {
  const toneClass = tone === 'danger' ? 'hover:text-danger' : 'hover:text-fg'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-30 ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
