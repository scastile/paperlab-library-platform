/**
 * Auth Bridge — Pass Supabase session to other PaperLab products via URL fragment.
 * Fragment is never sent to server and is stripped immediately after hydration.
 */

export function buildProductUrl(baseUrl, session) {
  if (!session?.access_token || !session?.refresh_token) return baseUrl
  const url = new URL(baseUrl)
  url.hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: String(session.expires_at || ''),
  }).toString()
  return url.toString()
}

export function getGatewayLoginUrl(redirectUrl) {
  const url = new URL('https://lib.paperlab.xyz/')
  url.searchParams.set('redirect', redirectUrl)
  return url.toString()
}
