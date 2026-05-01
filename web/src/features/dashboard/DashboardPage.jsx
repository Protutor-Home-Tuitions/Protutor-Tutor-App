import { useMemo } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { daysAgo } from '@/utils/helpers'

function StatCard({ label, value, sub, iconBg, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  )
}

export default function DashboardPage() {
  const tuitions = useDataStore((s) => s.tuitions)
  const tutors   = useDataStore((s) => s.tutors)
  const attMap   = useDataStore((s) => s.attendance)
  const user     = useAuthStore((s) => s.user)

  const cityAllowed = (city) => {
    if (!user) return false
    if (user.role === 'manager') return true
    if (!user.cities?.length) return true
    return user.cities.includes(city)
  }

  const myTuitions   = tuitions.filter((t) => cityAllowed(t.city || ''))
  const activeTuitions = myTuitions.filter((t) => t.active)
  const activeTutors   = tutors.filter((t) => t.active)

  // Recent activity — last 7 days attendance across all tuitions
  const allAtt = useMemo(() => Object.values(attMap).flat(), [attMap])
  const recentAtt = allAtt.filter((a) => (daysAgo(a.date) || 99) <= 7 && !a.isDemo)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  // Tuitions with no attendance in last 7 days (active only)
  const attEnqIds = new Set(allAtt.filter((a) => (daysAgo(a.date) || 99) <= 7).map((a) => a.enqId))
  const noRecentAtt = activeTuitions.filter((t) => !attEnqIds.has(t.enqId) && t.start)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tutors" value={tutors.length}
          sub={`${activeTutors.length} active`}
          iconBg="#EBF1FF"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        />
        <StatCard label="Total Tuitions" value={myTuitions.length}
          sub={`${activeTuitions.length} active`}
          iconBg="#DCFCE7"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round"><path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13"/><path d="M4 19h16"/></svg>}
        />
        <StatCard label="Classes This Week" value={recentAtt.length}
          sub="Last 7 days"
          iconBg="#FEF3C7"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/></svg>}
        />
        <StatCard label="No Recent Att" value={noRecentAtt.length}
          sub="Active tuitions, no att 7d"
          iconBg="#FEE2E2"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-700">Recent Attendance</div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Last 7 days</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAtt.length === 0
              ? <div className="px-5 py-8 text-center text-slate-400 text-sm">No attendance in last 7 days</div>
              : recentAtt.map((a) => {
                  const t = tuitions.find((t) => t.enqId === a.enqId)
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-700">{t?.studentName || a.enqId}</div>
                        <div className="text-xs text-slate-400">{a.subj} · {a.markedBy}</div>
                      </div>
                      <div className="text-xs text-slate-400 text-right">
                        <div>{a.date}</div>
                        <div>{a.dur}hr</div>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>

        {/* No Recent Attendance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-700">Attendance Needed</div>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{noRecentAtt.length} tuitions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {noRecentAtt.length === 0
              ? <div className="px-5 py-8 text-center text-slate-400 text-sm">All tuitions have recent attendance ✓</div>
              : noRecentAtt.slice(0, 8).map((t) => {
                  const tutor = tutors.find((tu) => tu.id === t.tutorId)
                  return (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-700">{t.studentName}</div>
                        <div className="text-xs text-slate-400">{tutor?.name || '—'} · {t.enqId}</div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No att 7d</span>
                    </div>
                  )
                })}
          </div>
        </div>
      </div>
    </div>
  )
}
