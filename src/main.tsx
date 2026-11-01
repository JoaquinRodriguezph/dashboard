import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Globals } from '@react-spring/web'
import './index.css'
import App from './App'
import { SettingsProvider } from './lib/settings'

// Respect "reduce motion" from the very first frame. App keeps this in sync
// if the setting changes while the page is open.
Globals.assign({ skipAnimation: window.matchMedia('(prefers-reduced-motion: reduce)').matches })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
