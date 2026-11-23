
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5EFEB]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#CBD9E6] border-t-[#567CBD] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-[#567CBD]">
            Loading your account...
          </p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
