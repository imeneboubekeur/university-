
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'

import Header from './Header'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { user } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const userRole = user?.role
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5EFEB]">
      {/* Desktop sidebar: only one */}
      <div className="hidden lg:block">
        <Sidebar userRole={userRole} />
      </div>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative z-10 h-full shadow-xl">
            <Sidebar
              userRole={userRole}
              mobile
              onClose={() => setMobileSidebarOpen(false)}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main application area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        {/* Mobile menu button */}
        <div className="border-b border-[#E7E3DF] bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <Menu size={18} />
            Menu
          </button>
        </div>

        {/* Page content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
  <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-7 lg:px-9 xl:px-10">
    <Outlet />
  </div>
</main>
      </div>
    </div>
  )
}
