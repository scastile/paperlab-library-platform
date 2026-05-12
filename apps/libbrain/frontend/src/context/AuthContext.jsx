import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('libbrain_token'))
  const [loading, setLoading] = useState(false)

  const signIn = async (password) => {
    const res = await fetch('/api/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Invalid password')
    }
    const data = await res.json()
    localStorage.setItem('libbrain_token', data.token)
    setToken(data.token)
    setUser({ user_id: data.user_id })
    return data
  }

  const signOut = () => {
    localStorage.removeItem('libbrain_token')
    setToken(null)
    setUser(null)
  }

  const getToken = useCallback(() => token, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
