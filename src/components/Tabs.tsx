interface Tab<T extends string> {
  id: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onChange: (id: T) => void
  label: string
}

/** A segmented control for switching between views. */
export function Tabs<T extends string>({ tabs, active, onChange, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-xl bg-bg/70 p-1">
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
