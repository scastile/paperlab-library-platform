// Shared single-sign-on cookie across *.paperlab.xyz subdomains.
// The PocketBase auth token is mirrored into a cookie scoped to the parent
// domain, so any PaperLab tool picks up the same session. Reading the cookie
// from a sibling subdomain is how SSO works; clearing it logs out everywhere.

const COOKIE_NAME = 'pb_sso'
const COOKIE_DOMAIN = '.paperlab.xyz'
const MAX_AGE = 60 * 60 * 24 * 14 // 14 days

export function readSharedToken() {
  const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

export function writeSharedToken(token) {
  if (!token) return
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)};domain=${COOKIE_DOMAIN};path=/;max-age=${MAX_AGE};SameSite=Lax;Secure`
}

export function clearSharedToken() {
  document.cookie = `${COOKIE_NAME}=;domain=${COOKIE_DOMAIN};path=/;max-age=0;SameSite=Lax;Secure`
}
