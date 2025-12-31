/**
 * Tour system types
 */

export type TourSection = 'overview' | 'waste' | 'team' | 'menu' | 'rail'

export type ClientKey = 'melrose' | 'fancy' | 'bestregard'

export type TourStep = {
  element: string // CSS selector (data-tour attribute)
  popover: {
    title: string
    description: string
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
  }
}
