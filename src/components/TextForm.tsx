import { useState, type FormEvent } from 'react'

export interface TextField {
  name: string
  placeholder: string
  initial?: string
  required?: boolean
  /** "url" shows the URL keyboard on phones. (Validation is up to `validate`.) */
  type?: 'text' | 'url'
  /** Return an error message to block saving, or null if the value is fine. */
  validate?: (value: string) => string | null
}

interface TextFormProps {
  fields: TextField[]
  submitLabel: string
  onSubmit: (values: Record<string, string>) => void
  onCancel?: () => void
  /** Empty the inputs after saving, so another item can be added straight away. */
  clearOnSubmit?: boolean
}

/**
 * A small form with one or more text inputs and Save/Cancel buttons.
 * Used for adding and editing items in every section.
 * Enter submits; Escape cancels.
 */
export function TextForm({ fields, submitLabel, onSubmit, onCancel, clearOnSubmit }: TextFormProps) {
  const initialValues = () => Object.fromEntries(fields.map((f) => [f.name, f.initial ?? '']))
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const canSubmit = fields.every((f) => !f.required || values[f.name].trim() !== '')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]))
    const found: Record<string, string> = {}
    for (const f of fields) {
      const error = f.validate?.(trimmed[f.name])
      if (error) found[f.name] = error
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(trimmed)
    if (clearOnSubmit) setValues(initialValues())
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => e.key === 'Escape' && onCancel?.()}
      className="flex flex-col gap-2 rounded-xl border border-line bg-bg/60 p-2"
    >
      {fields.map((f, i) => (
        <div key={f.name}>
          <input
            type="text"
            inputMode={f.type === 'url' ? 'url' : undefined}
            autoCapitalize={f.type === 'url' ? 'none' : undefined}
            value={values[f.name]}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            placeholder={f.placeholder}
            aria-label={f.placeholder}
            aria-invalid={!!errors[f.name]}
            autoFocus={i === 0}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-accent aria-invalid:border-danger sm:text-sm"
          />
          {errors[f.name] && <p className="mt-1 px-1 text-xs text-danger">{errors[f.name]}</p>}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-fg">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
