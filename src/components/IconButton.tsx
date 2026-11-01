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
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition duration-150 hover:bg-surface-hover active:scale-90 active:bg-line/70 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none motion-reduce:active:scale-100 ${toneClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
