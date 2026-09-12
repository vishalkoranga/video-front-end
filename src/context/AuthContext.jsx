import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .getCurrentUser()
      .then(({ data }) => {
        setUser(data.data)
        localStorage.setItem('user', JSON.stringify(data.data))
      })
      .catch(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.loginUser(credentials)
    const { user: loggedInUser, accessToken, refreshToken } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logoutUser()
    } catch {
      // Even if the network call fails, clear the local session.
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.getCurrentUser()
    setUser(data.data)
    localStorage.setItem('user', JSON.stringify(data.data))
    return data.data
  }, [])

  const updateUserLocal = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, updateUserLocal }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
