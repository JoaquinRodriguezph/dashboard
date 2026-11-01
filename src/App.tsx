import { useSettings } from './lib/settings'
import { useTheme } from './lib/useTheme'
import { Header } from './sections/Header'

export default function App() {
  const { settings, loaded } = useSettings()
  useTheme(settings.theme)

  // Settings come from storage asynchronously; wait one tick so the greeting
  // doesn't flash without your name.
  if (!loaded) return null

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <Header onOpenSettings={() => {}} />
      <main className="grid gap-4 md:grid-cols-2">
        <p className="text-muted">Sections coming soon.</p>
      </main>
    </div>
  )
}
