
import { useState } from 'react'
import { GraduationCap, Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#CBD9E6] bg-white/95 px-4 backdrop-blur-md md:px-6">

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-[#2F4156] hover:bg-[#CBD9E6]/40 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F4156] text-[#F5EFEB] shadow-md">
          <GraduationCap size={24} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-[#2F4156] sm:text-lg">
            UnivAdmin Pro
          </h1>

          <p className="hidden truncate text-xs text-[#567CBD] sm:block">
            Academic Management & Workflow Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">

        <div className="hidden items-center gap-3 border-l border-[#CBD9E6] pl-4 sm:flex">

          {/* Profile picture */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#CBD9E6] bg-[#CBD9E6]/50 font-bold text-[#2F4156]">
            {user?.image_url ? (
              <img
                src={user.image_url}
                alt={fullName || 'Profile picture'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials || 'U'}</span>
            )}
          </div>

          <div className="hidden text-left lg:block">
            <p className="max-w-40 truncate text-sm font-semibold text-[#2F4156]">
              {fullName || 'University User'}
            </p>

            <p className="max-w-40 truncate text-xs text-[#567CBD]">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-xl border border-[#CBD9E6] bg-[#F5EFEB] px-3 py-2 text-sm font-semibold text-[#2F4156] transition hover:bg-[#CBD9E6]/50 disabled:opacity-60"
        >
          <LogOut size={16} />

          <span className="hidden sm:inline">
            {loggingOut ? 'Signing out...' : 'Logout'}
          </span>
        </button>

      </div>
    </header>
  )
}
