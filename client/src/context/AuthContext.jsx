
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load the complete profile, including image_url
  const loadProfile = async () => {
    const response = await api.get('/profile')
    const profile = response.data.profile

    setUser(profile)
    return profile
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        await loadProfile()
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const login = async (credentials) => {
    await api.post('/auth/login', credentials)

    const profile = await loadProfile()
    return profile
  }

  const register = async (userData) => {
    await api.post('/auth/register', userData)

    const profile = await loadProfile()
    return profile
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  // Update user information across the application
  const updateUser = (updatedData) => {
    setUser((previousUser) => ({
      ...previousUser,
      ...updatedData,
    }))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
