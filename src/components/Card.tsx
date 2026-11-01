import type { ReactNode } from 'react'

interface CardProps {
  title: string
  /** Small text next to the title, e.g. "3/5 done". */
  meta?: ReactNode
  /** Buttons shown at the top right. */
  actions?: ReactNode
  /** Extra classes, e.g. for highlighting. */
  className?: string
  children: ReactNode
}

/** The box every section lives in. */
export function Card({ title, meta, actions, className = '', children }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm backdrop-blur-md sm:p-5 ${className}`}
      aria-label={title}
    >
      <div className="mb-3 flex min-h-9 items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {meta && <span className="text-sm text-muted">{meta}</span>}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {children}
    </section>
  )
}
