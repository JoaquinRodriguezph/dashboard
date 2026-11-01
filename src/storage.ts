// ─────────────────────────────────────────────────────────────────────────────
// storage.ts — the ONLY file that knows where data lives.
//
// Every function is async (returns a Promise) even though localStorage is
// synchronous. That way, when this is swapped for Supabase (which is async
// because it talks over the network), no UI code has to change.
// ─────────────────────────────────────────────────────────────────────────────

import type { Settings } from './types'

const PREFIX = 'dash.v1.'

const KEYS = {
  settings: 'settings',
} as const

/** Read a JSON value, falling back if it's missing or corrupted. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

// ── Settings ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'system',
  hideCompletedGoals: false,
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  write(KEYS.settings, settings)
  // A plain local copy of the theme, read by the tiny script in index.html
  // before React loads (to avoid a white flash). Keep this even with Supabase.
  try {
    localStorage.setItem('dash.themeCache', settings.theme)
  } catch {
    /* storage full or blocked; not critical */
  }
}
