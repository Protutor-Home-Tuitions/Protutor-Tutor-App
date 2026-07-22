import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    ]
  },
  {
    label: 'Management',
    items: [
      { to: '/tutors',   label: 'Tutors',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
      { to: '/tuitions', label: 'Tuitions',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13"/><path d="M4 19h16"/></svg> },
      { to: '/users',    label: 'Users',     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/><path d="M16 11l2 2 4-4"/></svg>, managerOnly: true },
      { to: '/parents',  label: 'Parents',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    ]
  },
  {
    label: 'Records',
    items: [
      { to: '/attendance', label: 'Attendance Log', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
    ]
  },
]

export default function AppShell() {
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const isManager = user?.role === 'manager'

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  // Get current time
  const now  = new Date()
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col flex-shrink-0 h-full bg-white border-r border-slate-200" style={{ width: 220 }}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: '#1A56DB' }}>PT</div>
          <div>
            <div className="font-bold text-slate-800 text-sm">ProTutor</div>
            <div className="text-slate-400 text-xs">{user?.role === 'manager' ? 'Admin' : user?.role} · protutor.in</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-3">
              <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {section.label}
              </div>
              {section.items.map((item) => {
                if (item.managerOnly && !isManager) return null
                return (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`
                    }
                  >
                    <span className="opacity-70">{item.icon}</span>
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: '#1A56DB' }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">{user?.name}</div>
              <div className="text-xs text-slate-400 capitalize">{ROLE_LABEL[user?.role] || user?.role}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full text-left text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div id="page-header">
            <div className="font-bold text-slate-800 text-base" id="page-title">Dashboard</div>
            <div className="text-slate-400 text-xs" id="page-sub">Welcome back, {user?.name}</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{time}</span>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            <span>Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const ROLE_LABEL = { manager: 'Manager (Admin)', coordinator: 'Coordinator', support: 'Support' }
