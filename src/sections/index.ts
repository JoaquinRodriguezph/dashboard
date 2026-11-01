import type { ComponentType } from 'react'
import { Affirmations } from './Affirmations'
import { Dailies } from './Dailies'
import { Goals } from './Goals'
import { WeeklyGoal } from './WeeklyGoal'

// ─────────────────────────────────────────────────────────────────────────────
// The section registry. App.tsx renders these.
// To add a new section: create a component in this folder, then add one line here.
//
//   Laptop (≥1024px): three columns. Sections in the same column stack in the
//                     order they're listed here.
//                       left (1)  │  center (1.7, widest)  │  right (1)
//   Phone/tablet:     one column, sorted by `mobileOrder` (lowest first).
// ─────────────────────────────────────────────────────────────────────────────

export type SectionColumn = 'left' | 'center' | 'right'

export interface SectionConfig {
  id: string
  component: ComponentType
  column: SectionColumn
  mobileOrder: number
}

export const COLUMNS: SectionColumn[] = ['left', 'center', 'right']

export const SECTIONS: SectionConfig[] = [
  { id: 'dailies', component: Dailies, column: 'center', mobileOrder: 1 },
  { id: 'affirmations', component: Affirmations, column: 'left', mobileOrder: 4 },
  { id: 'weekly-goal', component: WeeklyGoal, column: 'left', mobileOrder: 2 },
  { id: 'goals', component: Goals, column: 'right', mobileOrder: 3 },
]
