import { useState, useMemo, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { fd } from '@/utils/helpers'

export default function AttendancePage() {
  const [tutorFilter,   setTutorFilter]   = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [dateFilter,    setDateFilter]    = useState('')

  const tuitions    = useDataStore((s) => s.tuitions)
  const tutors      = useDataStore((s) => s.tutors)
  const attMap      = useDataStore((s) => s.attendance)
  const fetchDetail = useDataStore((s) => s.fetchTuitionDetail)
  const user        = useAuthStore((s) => s.user)

  const cityAllowed = (city) => {
    if (!user) return false
    if (user.role === 'manager') return true
    if (!user.cities?.length) return true
    return user.cities.includes(city)
  }

  // Fetch attendance for all accessible tuitions
  useEffect(() => {
    tuitions.filter((t) => cityAllowed(t.city || '')).forEach((t) => {
      if (!attMap[t.enqId]) fetchDetail(t.enqId)
    })
  }, [tuitions.length])

  const allowedEnqIds = useMemo(() => new Set(
    tuitions.filter((t) => cityAllowed(t.city || '')).map((t) => t.enqId)
  ), [tuitions, user])

  // Flatten all attendance
  const allAtt = useMemo(() =>
    Object.values(attMap).flat().filter((a) => allowedEnqIds.has(a.enqId))
  , [attMap, allowedEnqIds])

  // Apply filters
  const filtered = useMemo(() => {
    let rows = allAtt
    if (tutorFilter)   rows = rows.filter((a) => String(a.tutorId) === tutorFilter)
    if (studentFilter) rows = rows.filter((a) => a.enqId === studentFilter)
    if (dateFilter)    rows = rows.filter((a) => a.date === dateFilter)
    return [...rows].sort((a, b) => b.date.localeCompare(a.date))
  }, [allAtt, tutorFilter, studentFilter, dateFilter])

  function clearFilters() { setTutorFilter(''); setStudentFilter(''); setDateFilter('') }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Attendance Log</h1>
        <p className="text-slate-500 text-sm mt-0.5">All attendance records — {user?.role === 'manager' ? 'Admin' : user?.role}</p>
      </div>

      {/* Filters — matching original layout */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <select value={tutorFilter} onChange={(e) => setTutorFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" style={{ width: 180 }}>
          <option value="">All Tutors</option>
          {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" style={{ width: 180 }}>
          <option value="">All Students</option>
          {tuitions.filter((t) => cityAllowed(t.city||'')).map((t) => (
            <option key={t.enqId} value={t.enqId}>{t.studentName}</option>
          ))}
        </select>

        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ width: 160 }} />

        <button onClick={clearFilters}
          className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
          Clear filters
        </button>

        <div className="ml-auto">
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table — matches original columns exactly */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <span className="font-semibold text-slate-700">Attendance Log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date','Student','Marked By','Enquiry ID','Start Time','Duration','Subject','Topic','Parent Comment'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">No attendance records found</td></tr>
              ) : filtered.map((a) => {
                const t = tuitions.find((t) => t.enqId === a.enqId)
                return (
                  <tr key={a.id} className={`hover:bg-slate-50 ${a.isDemo ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{fd(a.date)}</div>
                      {a.isDemo && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">DEMO</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{t?.studentName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.markedBy || '—'}</td>
                    <td className="px-4 py-3"><span className="tag-id">{a.enqId}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.time}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{a.dur}hr</span></td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">{a.subj || '—'}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.topic || '—'}</td>
                    <td className="px-4 py-3 text-sm">{a.parentComment ? <span className="text-blue-600">{a.parentComment}</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
