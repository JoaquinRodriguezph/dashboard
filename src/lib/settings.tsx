import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { DevicePrefs, Settings } from '../types'
import {
  DEFAULT_DEVICE_PREFS,
  DEFAULT_SETTINGS,
  getDevicePrefs,
  getSettings,
  initStorage,
  saveDevicePrefs,
  saveSettings,
} from '../storage'

// Settings are needed in several places (header, goals, settings panel), so
// they're shared through React context instead of being passed down as props.
// Device preferences (collapsed sections, To-Do view) ride along: they're
// loaded at the same time, so the page never flashes the wrong layout.

interface SettingsContextValue {
  settings: Settings
  loaded: boolean
  updateSettings: (patch: Partial<Settings>) => void
  devicePrefs: DevicePrefs
  updateDevicePrefs: (update: (prev: DevicePrefs) => DevicePrefs) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [devicePrefs, setDevicePrefs] = useState<DevicePrefs>(DEFAULT_DEVICE_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Upgrade any old saved data first. App shows nothing until `loaded`,
    // so every section reads already-migrated data.
    initStorage()
      .then(() => Promise.all([getSettings(), getDevicePrefs()]))
      .then(([s, prefs]) => {
        setSettings(s)
        setDevicePrefs(prefs)
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

  const updateDevicePrefs = useCallback((update: (prev: DevicePrefs) => DevicePrefs) => {
    setDevicePrefs((prev) => {
      const next = update(prev)
      void saveDevicePrefs(next)
      return next
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings, devicePrefs, updateDevicePrefs }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

/** Whether a section is open on this device, and a function to open/close it. Remembered per device. */
export function useCollapsible(section: 'todo' | 'ideas' | 'goals'): [open: boolean, toggle: () => void] {
  const { devicePrefs, updateDevicePrefs } = useSettings()
  const toggle = useCallback(
    () => updateDevicePrefs((p) => ({ ...p, collapsed: { ...p.collapsed, [section]: !p.collapsed[section] } })),
    [section, updateDevicePrefs],
  )
  return [!devicePrefs.collapsed[section], toggle]
}
