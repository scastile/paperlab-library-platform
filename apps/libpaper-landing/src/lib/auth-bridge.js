/**
 * Auth Bridge — pass the PocketBase session token to other PaperLab products
 * via URL fragment. Fragment is never sent to the server and is stripped
 * immediately after hydration.
 */

export function buildProductUrl(baseUrl, session) {
  const token = session?.access_token
  if (!token) return baseUrl
  const url = new URL(baseUrl)
  url.hash = new URLSearchParams({
    access_token: token,
  }).toString()
  return url.toString()
}

export function getGatewayLoginUrl(redirectUrl) {
  const url = new URL('https://lib.paperlab.xyz/')
  url.searchParams.set('redirect', redirectUrl)
  return url.toString()
}
