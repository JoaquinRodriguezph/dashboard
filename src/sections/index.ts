import type { ComponentType } from 'react'
import { Dailies } from './Dailies'

// ─────────────────────────────────────────────────────────────────────────────
// The section registry. App.tsx renders these in order.
// To add a new section: create a component in this folder, then add one line here.
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionConfig {
  id: string
  component: ComponentType
  /** "full" spans the whole width on large screens; "half" takes one column. */
  width: 'full' | 'half'
}

export const SECTIONS: SectionConfig[] = [
  { id: 'dailies', component: Dailies, width: 'half' },
]
