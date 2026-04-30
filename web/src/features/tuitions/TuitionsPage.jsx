import { useState, useMemo } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import TuitionRow from './TuitionRow'
import TuitionDetailModal from './TuitionDetailModal'
import TuitionFormModal from './TuitionFormModal'
import Button from '@/components/ui/Button'
import { ALL_CITIES } from '@/utils/helpers'

function getPrevMonth() {
  const now = new Date()
  if (now.getMonth() === 0) return `${now.getFullYear()-1}-12`
  return `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`
}

const HEADERS = ['Enquiry','Start','Parent / Student','Std · Board','Schedule','Tutor','Fee / Type','Last Att','Status','Prev Month','Actions']

export default function TuitionsPage() {
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('all')
  const [cityFilter,    setCityFilter]    = useState('')
  const [detailId,      setDetailId]      = useState(null)
  const [editId,        setEditId]        = useState(null)   // tuition UUID being edited
  const [addOpen,       setAddOpen]       = useState(false)  // add tuition modal

  const tuitions       = useDataStore((s) => s.tuitions)
  const updateTuition  = useDataStore((s) => s.updateTuition)
  const user           = useAuthStore((s) => s.user)
  const isManager      = user?.role === 'manager'
  const isCoordinator  = user?.role === 'coordinator'
  const canWrite       = isManager || isCoordinator

  const cityAllowed = (city) => {
    if (!user) return false
    if (user.role === 'manager') return true
    if (!user.cities?.length) return true
    return user.cities.includes(city)
  }

  const prevMonth = getPrevMonth()

  const filtered = useMemo(() => tuitions.filter((t) => {
    if (!cityAllowed(t.city || '')) return false
    if (filter === 'active'   && !t.active) return false
    if (filter === 'inactive' &&  t.active) return false
    if (cityFilter && t.city !== cityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.studentName?.toLowerCase().includes(q) ||
        t.parentName?.toLowerCase().includes(q)  ||
        t.parentPhone?.includes(q)               ||
        t.enqId?.toLowerCase().includes(q)
      )
    }
    return true
  }), [tuitions, search, filter, cityFilter, user])

  async function handleToggle(tuitionId, action) {
    const t = tuitions.find((t) => t.id === tuitionId)
    if (!t) return
    if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Activate'} tuition for ${t.studentName}?`)) return
    try {
      await updateTuition(tuitionId, { active: action === 'activate' })
    } catch (err) {
      alert('Failed to update tuition: ' + err.message)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tuitions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} tuitions</p>
        </div>
        {canWrite && (
          <Button onClick={() => setAddOpen(true)}>+ Add Tuition</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="text" placeholder="Search student, parent, phone, ID..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All Cities</option>
          {ALL_CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(search || filter !== 'all' || cityFilter) && (
          <button onClick={() => { setSearch(''); setFilter('all'); setCityFilter('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap"
                    style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.4px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={HEADERS.length} className="px-4 py-16 text-center text-slate-400 text-sm">No tuitions found</td></tr>
              ) : filtered.map((t) => (
                <TuitionRow key={t.id} tuition={t} prevMonth={prevMonth}
                  onView={(id) => setDetailId(id)}
                  onEdit={(id) => setEditId(id)}
                  onToggle={handleToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detailId && (
        <TuitionDetailModal tuitionId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Add tuition modal */}
      {addOpen && (
        <TuitionFormModal
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      )}

      {/* Edit tuition modal */}
      {editId && (
        <TuitionFormModal
          tuitionId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => setEditId(null)}
        />
      )}
    </div>
  )
}
