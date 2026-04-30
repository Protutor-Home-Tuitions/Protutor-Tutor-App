/**
 * TuitionsPage.jsx
 * Main tuitions dashboard — migrated from admin_1.html renderTuitions().
 * Components will be split in subsequent steps:
 *   TuitionTable → TuitionRow → TuitionDetailModal → AttendanceTab → PaymentsTab
 */
import { useState, useMemo } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { calcPendingComm, isBillingEligible } from 'protutor-shared'
import { fd, daysAgo, currentMonthKey } from 'protutor-shared'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export default function TuitionsPage() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all') // all | active | inactive
  const [cityFilter, setCityFilter] = useState('')

  const tuitions      = useDataStore((s) => s.tuitions)
  const tutors        = useDataStore((s) => s.tutors)
  const billings      = useDataStore((s) => s.billings)
  const payments      = useDataStore((s) => s.payments)
  const attCompletions = useDataStore((s) => s.attCompletions)

  const { user, isManager, cityAllowed } = useAuthStore()

  const filtered = useMemo(() => {
    return tuitions.filter((t) => {
      if (!cityAllowed(t.city || '')) return false
      if (filter === 'active' && !t.active) return false
      if (filter === 'inactive' && t.active) return false
      if (cityFilter && t.city !== cityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.studentName?.toLowerCase().includes(q) ||
          t.parentName?.toLowerCase().includes(q) ||
          t.parentPhone?.includes(q) ||
          t.enqId?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [tuitions, search, filter, cityFilter, user])

  const prevMonth = (() => {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tuitions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} tuitions</p>
        </div>
        {isManager() && (
          <Button onClick={() => {/* openAddModal */}}>
            + Add Tuition
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Search student, parent, phone, enquiry ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Cities</option>
          {['Bangalore', 'Chennai', 'Mumbai', 'Others'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Enquiry / Start', 'Student / Parent', 'Schedule', 'Subject', 'Tutor', 'Fee / Type', 'Start Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const tutor       = tutors.find((tu) => tu.id === t.tutorId)
                const pendingComm = calcPendingComm(t.enqId, t, billings, payments)
                const eligible    = isBillingEligible(t, pendingComm)
                const age         = daysAgo(t.start)

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {/* open detail modal */}}
                  >
                    {/* Col 1: EnqID + date */}
                    <td className="px-4 py-3">
                      <span className="tag-id">{t.enqId}</span>
                      <div className="text-xs text-slate-400 mt-1">{fd(t.start)}</div>
                    </td>

                    {/* Col 2: Student + parent */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{t.parentName || t.studentName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Student: {t.studentName}</div>
                      {t.parentPhone && (
                        <div className="text-xs text-slate-400">{t.parentPhone}</div>
                      )}
                    </td>

                    {/* Col 3: Schedule */}
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {t.days?.join(', ')}<br />
                      <span className="text-xs text-slate-400">{t.duration}hr/day</span>
                    </td>

                    {/* Col 4: Subjects */}
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{t.subjects?.join(', ')}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.standard} · {t.board}</div>
                    </td>

                    {/* Col 5: Tutor */}
                    <td className="px-4 py-3 text-sm">
                      {tutor ? (
                        <>
                          <div className="font-medium">{tutor.name}</div>
                          <div className="text-xs text-slate-400">{tutor.phone}</div>
                        </>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Col 6: Fee */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-sm">₹{t.feeParent}/{t.feeType}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {t.repeatPayment ? '↻ Repeat' : 'No repeat'}
                      </div>
                    </td>

                    {/* Col 7: Start + age */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">{fd(t.start)}</div>
                      {age !== null && (
                        <div className="text-xs text-slate-400">{age}d ago</div>
                      )}
                    </td>

                    {/* Col 8: Status */}
                    <td className="px-4 py-3">
                      <Badge variant={t.active ? 'green' : 'gray'}>
                        {t.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="text-xs mt-1">
                        {pendingComm > 0 ? (
                          <span className="text-orange-600 font-medium">Comm: ₹{pendingComm}</span>
                        ) : (
                          <span className="text-green-600">Comm: Cleared</span>
                        )}
                      </div>
                    </td>
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
