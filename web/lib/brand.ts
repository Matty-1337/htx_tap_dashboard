/**
 * Brand theme utilities for multi-tenant theming
 */

export type ClientId = 'melrose' | 'fancy' | 'bestregard'

/**
 * Normalize client ID to canonical form
 * Accepts various formats and normalizes to lowercase canonical form
 */
export function normalizeClientId(raw: string): ClientId | null {
  if (!raw) return null

  const normalized = raw.toLowerCase().trim()

  // Direct matches
  if (normalized === 'melrose') return 'melrose'
  if (normalized === 'fancy') return 'fancy'
  if (normalized === 'bestregard' || normalized === 'bestregards' || normalized === 'best regards') {
    return 'bestregard'
  }

  return null
}

/**
 * Get the theme attribute value for a client ID
 * Returns the theme name for CSS data attribute binding
 */
export function getClientThemeAttr(clientId: string): string {
  const normalized = normalizeClientId(clientId)
  return normalized || 'default'
}
