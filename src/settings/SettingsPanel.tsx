import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { IconButton } from '../components/IconButton'
import { downloadBackup, parseBackupFile } from '../lib/backup'
import { useSettings } from '../lib/settings'
import { importAll } from '../storage'
import type { ThemePreference } from '../types'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

/**
 * Uses the browser's built-in <dialog> element: it traps focus, closes on
 * Escape, and dims the page behind it without any extra code.
 */
export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (open) setMessage(null)
  }, [open])

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again still triggers onChange
    if (!file) return

    const result = await parseBackupFile(file)
    if (!result.ok) {
      setMessage({ tone: 'error', text: `Nothing was changed. ${result.error}` })
      return
    }

    const { data, exportedAt } = result.backup
    const when = exportedAt ? new Date(exportedAt).toLocaleString() : 'an unknown date'
    const summary =
      `${data.dailies.length} dailies, ${data.goals.length} goals, ` +
      `${data.affirmations.length} affirmations, ${data.weeklyGoals.length} weekly goals`
    const confirmed = window.confirm(
      `Replace ALL current data with this backup from ${when}?\n\n${summary}\n\nTip: export your current data first if you might want it back.`,
    )
    if (!confirmed) return

    await importAll(data)
    window.location.reload() // simplest way to make every section reload its data
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()} // click on the backdrop
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-bg p-0 text-fg shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <IconButton label="Close settings" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Your name</span>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              placeholder="Used in the greeting"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none placeholder:text-muted focus:border-accent sm:text-sm"
            />
          </label>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Theme</legend>
            <div className="flex rounded-xl bg-surface p-1">
              {THEMES.map((t) => (
                <label
                  key={t.id}
                  className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                    settings.theme === t.id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.id}
                    checked={settings.theme === t.id}
                    onChange={() => updateSettings({ theme: t.id })}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <h3 className="mb-1.5 text-sm font-medium">Backup</h3>
            <p className="mb-2 text-sm text-muted">
              Your data is saved in this browser only. Export a backup now and then, or to move to another device.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadBackup()}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <Download size={16} /> Export data
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <Upload size={16} /> Import data
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
            </div>
            {message && (
              <p role="alert" className={`mt-2 text-sm ${message.tone === 'error' ? 'text-danger' : 'text-accent'}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
