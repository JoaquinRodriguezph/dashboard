import { CalendarDays, X } from 'lucide-react'
import { useToday } from '../lib/useToday'
import { dueLabel, quickDates } from '../lib/todos'

interface DateFieldProps {
  value: string // "YYYY-MM-DD" or ""
  onChange: (value: string) => void
  label: string
}

/**
 * Optional due date: the browser's own date input (a native calendar on Android,
 * Chrome's date popup on laptops) plus one-tap chips for the common choices.
 */
export function DateField({ value, onChange, label }: DateFieldProps) {
  const today = useToday()
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition duration-150 active:scale-95 motion-reduce:transition-none ${
      active ? 'border-accent bg-accent-soft text-fg' : 'border-line text-muted hover:border-accent/50 hover:text-fg'
    }`

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="relative flex items-center">
        <CalendarDays size={15} className="pointer-events-none absolute left-2.5 text-muted" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="rounded-lg border border-line bg-surface py-1.5 pr-2 pl-8 text-base outline-none focus:border-accent sm:text-sm"
        />
      </label>
      {quickDates(today).map((q) => (
        <button key={q.label} type="button" onClick={() => onChange(q.value)} className={chip(value === q.value)}>
          {q.label}
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange('')} className={`${chip(false)} inline-flex items-center gap-1`}>
          <X size={12} /> No date
        </button>
      )}
      {value && <span className="text-xs text-muted">Due: {dueLabel(value, today)}</span>}
    </div>
  )
}
