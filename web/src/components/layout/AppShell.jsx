import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { to: '/tuitions',   label: 'Tuitions',   icon: '📋' },
  { to: '/attendance', label: 'Attendance',  icon: '✅' },
  { to: '/tutors',     label: 'Tutors',      icon: '👨‍🏫' },
  { to: '/users',      label: 'Users',       icon: '👥', managerOnly: true },
]

export default function AppShell() {
  const { user, logout, isManager } = useAuthStore()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        style={{ background: 'var(--sidebar)', width: 220 }}
        className="flex flex-col flex-shrink-0 h-full"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-white font-bold text-lg tracking-tight">ProTutor</div>
          <div className="text-white/40 text-xs mt-0.5">Admin Panel</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            if (item.managerOnly && !isManager()) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-white/80 text-sm font-medium">{user?.name}</div>
          <div className="text-white/40 text-xs mt-0.5 capitalize">{user?.role}</div>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}
