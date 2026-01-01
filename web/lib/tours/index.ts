/**
 * Tour registry - Central entry point for tour system
 */
import { ClientKey, TourSection, TourStep } from './types'
import { stepsFor as melroseSteps } from './melrose'
import { stepsFor as fancySteps } from './fancy'
import { stepsFor as bestregardSteps } from './bestregard'

export function getTourSteps(clientKey: ClientKey, section: TourSection): TourStep[] {
  switch (clientKey) {
    case 'melrose':
      return melroseSteps(section)
    case 'fancy':
      return fancySteps(section)
    case 'bestregard':
      return bestregardSteps(section)
    default:
      // Default to melrose tone if unknown
      return melroseSteps(section)
  }
}

export type { TourSection, ClientKey, TourStep }
