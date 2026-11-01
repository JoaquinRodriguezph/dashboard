import { Monitor, Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import { useExposure } from '../lib/exposure/ExposureContext'
import { useNow } from '../lib/useNow'
import { useSettings } from '../lib/settings'
import type { ThemePreference } from '../types'
import { ExposureBanner } from './ExposureBanner'
import { SundayGoalChip } from './SundayGoalChip'

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }

function greetingFor(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface HeaderProps {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  const now = useNow() // ticks every minute so the greeting and date stay current
  const { settings, updateSettings } = useSettings()
  const ThemeIcon = THEME_ICON[settings.theme]
  const name = settings.name.trim()

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // With photos, the header becomes a banner: the double exposure sits behind
  // the greeting. Without, it's the plain header from before.
  const { settings: exposure, photos } = useExposure()
  const banner = exposure.enabled && photos.length > 0
  const iconButton = `rounded-full p-2.5 text-muted transition duration-150 hover:bg-surface-hover hover:text-fg active:scale-90 motion-reduce:transition-none ${
    banner ? 'bg-surface/60 backdrop-blur-md' : ''
  }`

  return (
    <header className={banner ? 'relative my-4 overflow-hidden rounded-3xl border border-line shadow-sm sm:my-6' : ''}>
      {banner && <ExposureBanner />}
      <div
        className={`relative flex items-start justify-between gap-4 ${
          banner ? 'min-h-36 px-5 pt-5 pb-14 sm:min-h-52 sm:px-8 sm:py-9' : 'py-6 sm:py-10'
        }`}
      >
        <div>
          <p className="text-sm text-muted">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">
            {greetingFor(now.getHours())}
            {name && `, ${name}`}
          </h1>
          <SundayGoalChip />
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => updateSettings({ theme: NEXT_THEME[settings.theme] })}
            className={iconButton}
            aria-label={`Theme: ${settings.theme}. Click to change.`}
            title={`Theme: ${settings.theme}`}
          >
            <ThemeIcon size={20} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className={iconButton}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
