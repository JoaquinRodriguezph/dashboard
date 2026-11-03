import type { ComponentType } from 'react'
import { Affirmations } from './Affirmations'
import { Dailies } from './Dailies'
import { Goals } from './Goals'
import { Ideas } from './Ideas'
import { Todo } from './Todo'
import { WeeklyGoal } from './WeeklyGoal'

// ─────────────────────────────────────────────────────────────────────────────
// The section registry. App.tsx renders these.
// To add a new section: create a component in this folder, then add one line here.
//
//   Laptop (≥1024px): two rows of columns ("areas").
//     main row:    left (1)  │  center (1.7, widest)  │  right (1)
//     bottom row:  bottomLeft (1)  │  bottomRight (1)
//   Sections in the same area stack in the order they're listed here.
//   Phone/tablet: ONE column, sorted by `mobileOrder` (lowest first).
// ─────────────────────────────────────────────────────────────────────────────

export type SectionArea = 'left' | 'center' | 'right' | 'bottomLeft' | 'bottomRight'

export interface SectionConfig {
  id: string
  component: ComponentType
  area: SectionArea
  mobileOrder: number
}

/** The laptop rows. Class names are written out in full so Tailwind can see them. */
export const ROWS: { id: string; areas: SectionArea[]; gridClass: string }[] = [
  { id: 'main', areas: ['left', 'center', 'right'], gridClass: 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)]' },
  { id: 'bottom', areas: ['bottomLeft', 'bottomRight'], gridClass: 'lg:grid-cols-2' },
]

export const SECTIONS: SectionConfig[] = [
  { id: 'dailies', component: Dailies, area: 'center', mobileOrder: 1 },
  { id: 'todo', component: Todo, area: 'right', mobileOrder: 2 },
  { id: 'affirmations', component: Affirmations, area: 'left', mobileOrder: 3 },
  { id: 'weekly-goal', component: WeeklyGoal, area: 'left', mobileOrder: 4 },
  { id: 'goals', component: Goals, area: 'bottomLeft', mobileOrder: 5 },
  { id: 'ideas', component: Ideas, area: 'bottomRight', mobileOrder: 6 },
]
