/**
 * Resolve subdomain from hostname
 * Returns the client/admin subdomain or null if not a recognized subdomain
 */

export type Subdomain = 'melrose' | 'fancy' | 'bestregard' | 'admin'

/**
 * Extract subdomain from hostname
 * @param host - Full hostname (e.g., "melrose.htxtap.com" or "melrose.htxtap.com:3000")
 * @returns Subdomain if recognized, null otherwise
 */
export function resolveSubdomain(host: string): Subdomain | null {
  if (!host) return null

  // Remove port if present (e.g., "melrose.htxtap.com:3000" -> "melrose.htxtap.com")
  const hostname = host.split(':')[0].toLowerCase()

  // Check if it's a subdomain of htxtap.com
  if (!hostname.endsWith('.htxtap.com') || hostname === 'htxtap.com') {
    return null
  }

  // Extract subdomain (first label before .htxtap.com)
  const parts = hostname.split('.')
  if (parts.length < 2) return null

  // For "melrose.htxtap.com", parts = ["melrose", "htxtap", "com"]
  // We want the first part
  const subdomain = parts[0]

  // Validate against known subdomains
  if (subdomain === 'melrose' || subdomain === 'fancy' || subdomain === 'bestregard' || subdomain === 'admin') {
    return subdomain as Subdomain
  }

  return null
}
