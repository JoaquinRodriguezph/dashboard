import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Settings } from '../types'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../storage'

// Settings are needed in several places (header, goals, settings panel), so
// they're shared through React context instead of being passed down as props.

interface SettingsContextValue {
  settings: Settings
  loaded: boolean
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void saveSettings(next)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
