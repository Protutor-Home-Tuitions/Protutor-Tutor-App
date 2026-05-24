import { useState, useMemo, useEffect } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
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
  const [editId,        setEditId]        = useState(null)
  const [addOpen,       setAddOpen]       = useState(false)
  const [openMenuId,    setOpenMenuId]    = useState(null)
  const [confirmToggle, setConfirmToggle] = useState(null) // { tuitionId, action, studentName }
  const [toggling,      setToggling]      = useState(false)

  const tuitions       = useDataStore((s) => s.tuitions)
  const updateTuition  = useDataStore((s) => s.updateTuition)
  const attendance     = useDataStore((s) => s.attendance)
  const user           = useAuthStore((s) => s.user)
  const isManager      = user?.role === 'manager'
  const isCoordinator  = user?.role === 'coordinator'
  const canWrite       = isManager || isCoordinator

  // Fetch attendance only (lightweight) for all tuitions to populate Last Att column
  useEffect(() => {
    const toFetch = tuitions.filter((t) => t.enqId && attendance[t.enqId] === undefined)
    if (!toFetch.length) return

    async function fetchAttOnly() {
      for (let i = 0; i < toFetch.length; i += 8) {
        const batch = toFetch.slice(i, i + 8)
        await Promise.allSettled(
          batch.map(async (t) => {
            try {
              const rows = await api.getAttendance(t.enqId)
              useDataStore.setState((s) => ({
                attendance: { ...s.attendance, [t.enqId]: rows }
              }))
            } catch { /* silent */ }
          })
        )
      }
    }
    fetchAttOnly()
  }, [tuitions.length])

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

  function handleToggle(tuitionId, action) {
    const t = tuitions.find((t) => t.id === tuitionId)
    if (!t) return
    setConfirmToggle({ tuitionId, action, studentName: t.studentName })
  }

  async function handleToggleConfirm() {
    if (!confirmToggle) return
    setToggling(true)
    try {
      await updateTuition(confirmToggle.tuitionId, { active: confirmToggle.action === 'activate' })
      setConfirmToggle(null)
    } catch (err) {
      alert('Failed to update tuition: ' + err.message)
    } finally {
      setToggling(false)
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
                  isManager={isManager}
                  openMenuId={openMenuId}
                  onToggleMenu={setOpenMenuId}
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

      {/* Inline confirm modal for activate/deactivate */}
      {confirmToggle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setConfirmToggle(null)}>
          <div style={{ background:'white', borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:12, background: confirmToggle.action === 'deactivate' ? '#FEE2E2' : '#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={confirmToggle.action === 'deactivate' ? '#DC2626' : '#16A34A'} strokeWidth="2.2" strokeLinecap="round">
                {confirmToggle.action === 'deactivate'
                  ? <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
                  : <><circle cx="12" cy="12" r="10"/><path d="M9 11l3 3L22 4"/></>
                }
              </svg>
            </div>
            <p style={{ fontSize:16, fontWeight:700, color:'#0F172A', marginBottom:6 }}>
              {confirmToggle.action === 'deactivate' ? 'Deactivate' : 'Activate'} Tuition?
            </p>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, marginBottom:20 }}>
              {confirmToggle.action === 'deactivate'
                ? `This will deactivate the tuition for ${confirmToggle.studentName}. Attendance can no longer be marked.`
                : `This will activate the tuition for ${confirmToggle.studentName}.`
              }
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmToggle(null)} disabled={toggling}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1.5px solid #E2E8F0', background:'white', color:'#475569', fontSize:14, fontWeight:500, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleToggleConfirm} disabled={toggling}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', background: confirmToggle.action === 'deactivate' ? '#DC2626' : '#16A34A', color:'white', fontSize:14, fontWeight:600, cursor:'pointer', opacity: toggling ? 0.7 : 1 }}>
                {toggling ? 'Updating…' : confirmToggle.action === 'deactivate' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
