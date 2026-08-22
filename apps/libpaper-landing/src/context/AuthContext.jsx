import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { pb } from '../lib/pocketbase'
import { readSharedToken, writeSharedToken, clearSharedToken } from '../lib/sso'
import { track } from '../lib/analytics'

const AuthContext = createContext({})

// Shape the PocketBase auth store into a session-like object so existing
// consumers (Header, CreditBadge, LandingPage, auth-bridge) keep working.
function sessionFromPb() {
  const token = pb.authStore.token || null
  return {
    access_token: token,
    refresh_token: token, // PocketBase auto-refreshes internally; mirror the token
    expires_at: null,
  }
}

// SSO: adopt the session token from the shared .paperlab.xyz cookie.
// Falls back to a legacy #access_token= hash from pre-cookie links.
async function adoptSession() {
  let token = readSharedToken()
  if (!token) {
    const hashToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token')
    token = hashToken || null
  }
  if (!token) return
  if (pb.authStore.isValid && pb.authStore.token === token) return
  try {
    pb.authStore.save(token, null)
    await pb.collection('users').authRefresh() // validate + get a fresh token
    writeSharedToken(pb.authStore.token)
  } catch {
    pb.authStore.clear()
    clearSharedToken()
  }
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      // 0. If coming back from signOut, force clean state — don't restore cached session
      const justSignedOut = new URLSearchParams(window.location.search).get('signed_out') === '1'
      if (justSignedOut) {
        pb.authStore.clear()
        clearSharedToken()
        if (mounted) {
          setSession(null)
          setUser(null)
          setLoading(false)
        }
        const cleaner = new URL(window.location.href)
        cleaner.searchParams.delete('signed_out')
        history.replaceState({}, '', cleaner.toString())
        return
      }

      // 0b. SSO: adopt the shared cookie (or a legacy hash) session
      await adoptSession()

      // 1. Restore an existing PocketBase session
      if (mounted) {
        if (pb.authStore.isValid) {
          setUser(pb.authStore.model)
          setSession(sessionFromPb())
        }
        setLoading(false)
      }
    }
    init()

    // 2. Sync the shared cookie on auth changes (login/logout in any tab)
    const unsub = pb.authStore.onChange((token, model) => {
      if (!mounted) return
      setUser(model)
      setSession(sessionFromPb())
      setLoading(false)
      if (token) writeSharedToken(token)
      else clearSharedToken()
    })
    // Fire once on mount: restores the shared SSO cookie when localStorage
    // still has a valid session but the cookie was lost (cleared by another
    // tab's signOut, browser cookie eviction, etc.). Without this, SSO to
    // sibling subdomains silently breaks until the next full login.
    if (pb.authStore.isValid && pb.authStore.token) {
      writeSharedToken(pb.authStore.token)
    }

    // 3. Keep the session + shared cookie alive while any tool is open
    const timer = setInterval(async () => {
      if (!pb.authStore.isValid) return
      try {
        await pb.collection('users').authRefresh()
        writeSharedToken(pb.authStore.token)
      } catch {
        pb.authStore.clear()
        clearSharedToken()
      }
    }, 30 * 60 * 1000)

    return () => {
      mounted = false
      unsub?.()
      clearInterval(timer)
    }
  }, [])

  const signIn = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    track('login')
    return { user: authData.record, session: sessionFromPb() }
  }

  const signUp = async (email, password) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    track('signup', { email })
    return signIn(email, password)
  }

  const signOut = async () => {
    pb.authStore.clear()
    clearSharedToken()
    setUser(null)
    setSession(null)
    window.location.href = 'https://lib.paperlab.xyz/?signed_out=1'
  }

  const getToken = useCallback(() => pb.authStore.token || null, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
