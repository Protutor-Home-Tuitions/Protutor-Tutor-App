import { useState, useMemo, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { fd, MN_FULL } from '@/utils/helpers'

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function AttendancePage() {
  const [search,        setSearch]        = useState('')
  const [monthFilter,   setMonthFilter]   = useState(currentMonthKey())
  const [studentFilter, setStudentFilter] = useState('')

  const tuitions    = useDataStore((s) => s.tuitions)
  const attMap      = useDataStore((s) => s.attendance)
  const fetchDetail = useDataStore((s) => s.fetchTuitionDetail)
  const user = useAuthStore((s) => s.user)
  const cityAllowed = (city) => {
    if (!user) return false
    if (user.role === 'manager') return true
    if (!user.cities?.length) return true
    return user.cities.includes(city)
  }

  useEffect(() => {
    tuitions.filter((t) => cityAllowed(t.city || '')).forEach((t) => {
      if (!attMap[t.enqId]) fetchDetail(t.enqId)
    })
  }, [tuitions.length])

  const allowedEnqIds = useMemo(() => new Set(
    tuitions.filter((t) => cityAllowed(t.city || '')).map((t) => t.enqId)
  ), [tuitions])

  const allAtt = useMemo(() =>
    Object.values(attMap).flat().filter((a) => allowedEnqIds.has(a.enqId))
  , [attMap, allowedEnqIds])

  const allMonths = useMemo(() => {
    const set = new Set(allAtt.map((a) => a.date.slice(0, 7)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [allAtt])

  const filtered = useMemo(() => {
    let rows = allAtt
    if (monthFilter) rows = rows.filter((a) => a.date.startsWith(monthFilter))
    if (studentFilter) rows = rows.filter((a) => a.enqId === studentFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((a) => {
        const t = tuitions.find((t) => t.enqId === a.enqId)
        return t?.studentName?.toLowerCase().includes(q) || t?.parentName?.toLowerCase().includes(q) ||
          a.enqId?.toLowerCase().includes(q) || a.subj?.toLowerCase().includes(q) || a.markedBy?.toLowerCase().includes(q)
      })
    }
    return [...rows].sort((a, b) => b.date.localeCompare(a.date))
  }, [allAtt, monthFilter, studentFilter, search])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} records</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="text" placeholder="Search student, subject, marked by..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All Months</option>
          {allMonths.map((mk) => {
            const [y, m] = mk.split('-')
            return <option key={mk} value={mk}>{MN_FULL[parseInt(m)-1].slice(0,3)} {y}</option>
          })}
        </select>
        <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All Students</option>
          {tuitions.filter((t) => cityAllowed(t.city||'')).map((t) => (
            <option key={t.enqId} value={t.enqId}>{t.studentName} ({t.enqId})</option>
          ))}
        </select>
        {(search || monthFilter !== currentMonthKey() || studentFilter) && (
          <button onClick={() => { setSearch(''); setMonthFilter(currentMonthKey()); setStudentFilter('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline">Clear filters</button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date','Student','Marked By','Enquiry ID','Start Time','Duration','Subject','Topic','Parent Comment'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap"
                    style={{ fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.4px' }}>{h}</th>
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
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">{a.subj||'—'}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.topic||'—'}</td>
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
