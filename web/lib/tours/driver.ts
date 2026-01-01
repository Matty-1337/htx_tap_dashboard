/**
 * Driver.js tour launcher - Section-aware micro-tours
 */
'use client'

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { ClientKey, TourSection, TourStep } from './types'
import { getTourSteps } from './index'

let driverInstance: ReturnType<typeof driver> | null = null
let tourQueue: Array<{ clientKey: ClientKey; section: TourSection }> = []
let isChaining = false

function createTourSteps(clientKey: ClientKey, section: TourSection) {
  // Get steps for this section and client
  const allSteps = getTourSteps(clientKey, section)

  // Filter steps to only those with existing DOM elements
  const validSteps = allSteps.filter((step) => {
    const element = document.querySelector(step.element)
    return element !== null
  })

  if (validSteps.length === 0) {
    return []
  }

  // Convert TourStep format to Driver.js format
  return validSteps.map((step) => ({
    element: step.element,
    popover: {
      title: step.popover.title,
      description: step.popover.description,
      side: step.popover.side || 'bottom',
      align: step.popover.align || 'start',
    },
  }))
}

function startNextTourInQueue() {
  if (tourQueue.length === 0) {
    isChaining = false
    return
  }

  const { clientKey, section } = tourQueue.shift()!
  const driverSteps = createTourSteps(clientKey, section)

  if (driverSteps.length === 0) {
    // Skip empty tours and continue to next
    startNextTourInQueue()
    return
  }

  // Create Driver instance with premium settings
  driverInstance = driver({
    showProgress: true,
    allowClose: true,
    allowKeyboardControl: true, // ESC closes
    animate: true,
    smoothScroll: true,
    steps: driverSteps,
    onDestroyStarted: () => {
      if (driverInstance) {
        driverInstance.destroy()
        driverInstance = null
      }
      // Continue to next tour in queue if chaining
      if (isChaining) {
        // Small delay to allow cleanup
        setTimeout(() => {
          startNextTourInQueue()
        }, 300)
      }
    },
  })

  // Start the tour
  driverInstance.drive()
}

export function startTour({ clientKey, section }: { clientKey: ClientKey; section: TourSection }) {
  // Clean up any existing tour
  if (driverInstance) {
    driverInstance.destroy()
    driverInstance = null
  }

  // Clear any existing queue
  tourQueue = []
  isChaining = false

  const driverSteps = createTourSteps(clientKey, section)

  if (driverSteps.length === 0) {
    console.info(`[Tour] No valid steps found for section: ${section}`)
    return
  }

  // Create Driver instance with premium settings
  driverInstance = driver({
    showProgress: true,
    allowClose: true,
    allowKeyboardControl: true, // ESC closes
    animate: true,
    smoothScroll: true,
    steps: driverSteps,
    onDestroyStarted: () => {
      if (driverInstance) {
        driverInstance.destroy()
        driverInstance = null
      }
    },
  })

  // Start the tour
  driverInstance.drive()
}

export function startFullWalkthrough(clientKey: ClientKey) {
  // Clean up any existing tour
  if (driverInstance) {
    driverInstance.destroy()
    driverInstance = null
  }

  // Build tour queue in order: Overview, Waste, Team, Menu, Rail
  tourQueue = [
    { clientKey, section: 'overview' },
    { clientKey, section: 'waste' },
    { clientKey, section: 'team' },
    { clientKey, section: 'menu' },
    { clientKey, section: 'rail' },
  ]

  isChaining = true
  startNextTourInQueue()
}

export function stopTour() {
  if (driverInstance) {
    driverInstance.destroy()
    driverInstance = null
  }
}
