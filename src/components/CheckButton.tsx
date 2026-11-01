import { Check } from 'lucide-react'

interface CheckButtonProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** A round checkbox. Uses role="checkbox" so screen readers treat it like one. */
export function CheckButton({ checked, onChange, label }: CheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex size-9 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={`flex size-5.5 items-center justify-center rounded-full border-2 transition-colors ${
          checked ? 'border-accent bg-accent text-accent-fg' : 'border-line group-hover:border-accent'
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  )
}
