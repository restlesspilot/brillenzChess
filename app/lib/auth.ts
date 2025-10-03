'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { config } from './config'

interface User {
  id: string
  username: string
  email: string
  rating: number
  avatar?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (credentials: { usernameOrEmail: string; password: string }) => Promise<void>
  register: (data: { username: string; email: string; password: string }) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = config.API_BASE

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('chess_token')
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        localStorage.removeItem('chess_token')
        setToken(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('chess_token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: { usernameOrEmail: string; password: string }) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    const { user: userData, token: authToken } = data
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('chess_token', authToken)
  }

  const register = async (registerData: { username: string; email: string; password: string }) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    const { user: userData, token: authToken } = data
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('chess_token', authToken)
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('chess_token')
    }
  }

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}