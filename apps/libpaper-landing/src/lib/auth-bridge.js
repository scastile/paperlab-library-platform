/**
 * Auth Bridge — SSO is cookie-based (shared .paperlab.xyz cookie), so product
 * URLs are plain; each tool adopts the shared session on load. These helpers
 * are kept for backward compatibility with the landing's redirect flow.
 */

export function buildProductUrl(baseUrl) {
  return baseUrl
}

export function getGatewayLoginUrl(redirectUrl) {
  const url = new URL('https://lib.paperlab.xyz/')
  url.searchParams.set('redirect', redirectUrl)
  return url.toString()
}
