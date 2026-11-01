import { useEffect } from 'react'
import type { ThemePreference } from '../types'

const darkQuery = '(prefers-color-scheme: dark)'

/**
 * Adds or removes the `dark` class on <html> to match the preference.
 * In "system" mode it also listens for OS theme changes while the app is open.
 */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const apply = () => {
      const dark = preference === 'dark' || (preference === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (preference !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])
}
