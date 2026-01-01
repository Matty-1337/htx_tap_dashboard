/**
 * Helper function to get authentication codes with dev/prod safety
 * 
 * In development: Falls back to "1234" if env var is missing
 * In production: Requires env var, throws error if missing
 */

const DEV_DEFAULT_CODE = '1234'
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

export function getLoginCode(envVarName: string): { code: string; source: 'env' | 'dev-default' } {
  const envCode = process.env[envVarName]
  
  if (envCode) {
    return { code: envCode, source: 'env' }
  }
  
  if (isProduction) {
    throw new Error(`Production configuration missing: ${envVarName}. Set it in Vercel env vars.`)
  }
  
  // Dev: use default
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUTH] Dev login code source for ${envVarName}: dev-default`)
  }
  
  return { code: DEV_DEFAULT_CODE, source: 'dev-default' }
}

/**
 * Get client login code by client ID
 */
export function getClientLoginCode(clientId: string): { code: string; source: 'env' | 'dev-default' } {
  const envVarName = `LOGIN_CODE_${clientId.toUpperCase()}`
  return getLoginCode(envVarName)
}

/**
 * Get admin access code
 */
export function getAdminAccessCode(): { code: string; source: 'env' | 'dev-default' } {
  return getLoginCode('ADMIN_ACCESS_CODE')
}

/**
 * Get dev password hint message (only in dev)
 */
export function getDevPasswordHint(): string | null {
  if (isProduction) {
    return null
  }
  return 'Local dev password is: 1234'
}
