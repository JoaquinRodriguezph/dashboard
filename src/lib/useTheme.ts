import { useEffect, useState } from 'react'
import type { ThemePreference } from '../types'

const darkQuery = '(prefers-color-scheme: dark)'

/**
 * Adds or removes the `dark` class on <html> to match the preference.
 * In "system" mode it also listens for OS theme changes while the app is open.
 * Returns whether dark mode is currently active (the 3D scene uses this).
 */
export function useTheme(preference: ThemePreference): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const apply = () => {
      const dark = preference === 'dark' || (preference === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      setIsDark(dark)
    }
    apply()
    if (preference !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])

  return isDark
}
