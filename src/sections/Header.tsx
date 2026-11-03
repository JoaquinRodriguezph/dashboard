import { Dices, LoaderCircle, Monitor, Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import { useExposure } from '../lib/exposure/ExposureContext'
import { useNow } from '../lib/useNow'
import { useSettings } from '../lib/settings'
import type { ThemePreference } from '../types'
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

  // With the photo background on, the buttons get a frosted backing so they stay
  // visible on any photo, and a re-roll button appears.
  const { settings: exposure, photos, status, reroll } = useExposure()
  const photoBackground = exposure.enabled && photos.length > 0
  const generating = status === 'generating'
  const iconButton = `inline-flex items-center justify-center rounded-full p-2.5 text-muted transition duration-150 hover:bg-surface-hover hover:text-fg active:scale-90 disabled:opacity-60 motion-reduce:transition-none ${
    photoBackground ? 'bg-surface/70 backdrop-blur-xl' : ''
  }`

  return (
    <header>
      <div className="flex items-start justify-between gap-4 py-6 sm:py-10">
        <div>
          <p className="text-sm">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">
            {greetingFor(now.getHours())}
            {name && `, ${name}`}
          </h1>
          <SundayGoalChip />
        </div>
        <div className="flex shrink-0 gap-1">
          {photoBackground && (
            <button
              type="button"
              onClick={reroll}
              disabled={generating}
              className={iconButton}
              aria-label={generating ? 'Developing double exposure…' : 'Re-roll background photo'}
              title="Re-roll background"
            >
              {generating ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" /> : <Dices size={20} />}
            </button>
          )}
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
