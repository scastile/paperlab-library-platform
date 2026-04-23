import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const subscriptionRef = { current: null }

    const init = async () => {
      // 1. Try hash hydration first (from auth bridge)
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (!error && mounted) {
          setSession(data.session)
          setUser(data.session?.user ?? null)
          setLoading(false)
        }
        history.replaceState(null, '', window.location.pathname + window.location.search)
      } else {
        // 2. Otherwise check existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }

      // 3. Subscribe to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })
      subscriptionRef.current = subscription
    }

    init()

    return () => {
      mounted = false
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    window.location.href = 'https://lib.paperlab.xyz/?signed_out=1'
  }

  const getToken = useCallback(() => session?.access_token || null, [session])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
