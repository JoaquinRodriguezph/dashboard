// All the shapes of data the app stores. storage.ts reads and writes these.

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  name: string
  theme: ThemePreference
  hideCompletedGoals: boolean
}
