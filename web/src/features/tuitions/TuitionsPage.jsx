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

const MN_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatStartDate(dateStr) {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  return `${MN_SHORT[parseInt(m)-1]}-${String(parseInt(d)).padStart(2,'0')}`
}

function exportToCSV(rows, tutors) {
  const headers = [
    'Start Date','Tuition Status','Enq ID','Student Name','Parent Name',
    'Mobile Number','Standard & Board','Tutor Name','Tutor Number',
    'No. of Days','Duration','Fee (Parent)','Parent Fee Type','Repeat','Fee (Tutor)',
    'Tutor Fee Type','Fee (Company)','One-Time Fee'
  ]

  const csvRows = rows.map((t) => {
    const tutor = tutors.find((tu) => tu.id === t.tutorId)
    const status = t.status || (t.active ? 'active' : 'inactive')
    return [
      formatStartDate(t.start),
      status.charAt(0).toUpperCase() + status.slice(1),
      t.enqId || '',
      t.studentName || '',
      t.parentName || '',
      t.parentPhone || '',
      `${t.standard || ''} ${t.board || ''}`.trim(),
      tutor?.name || '',
      tutor?.phone || '',
      t.days?.length || '',
      t.duration ? `${t.duration}hr` : '',
      t.feeParent || '',
      t.parentFeeType || t.feeType || '',
      t.repeatPayment ? 'Yes' : 'No',
      t.feeTutor || '',
      t.tutorFeeType || t.feeType || '',
      t.feeCompany || '',
      t.commission || '',
    ]
  })

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`
  const content = [
    headers.map(escape).join(','),
    ...csvRows.map((r) => r.map(escape).join(','))
  ].join('\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tuitions-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const HEADERS = ['Enquiry','Start','Parent / Student','Std · Board','Schedule','Tutor','Fee / Type','Last Att','Status','Prev Month','Actions']

export default function TuitionsPage() {
  const tuitions       = useDataStore((s) => s.tuitions)
  const tutors         = useDataStore((s) => s.tutors)
  const updateTuition  = useDataStore((s) => s.updateTuition)
  const user           = useAuthStore((s) => s.user)
  const isManager      = user?.role === 'manager'
  const isCoordinator  = user?.role === 'coordinator'
  const canWrite       = isManager || isCoordinator

  // Smart city default — auto-select if only 1 city assigned
  const defaultCity = (!user || user.role === 'manager' || !user.cities?.length || user.cities.length > 1)
    ? '' : user.cities[0]

  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('active')      // default: active only
  const [cityFilter,    setCityFilter]    = useState(defaultCity)   // default: assigned city if single
  const [lastAttFilter, setLastAttFilter] = useState('')            // '' | '3days' | '7days' | 'never'
  const [detailId,      setDetailId]      = useState(null)
  const [editId,        setEditId]        = useState(null)
  const [addOpen,       setAddOpen]       = useState(false)
  const [openMenuId,    setOpenMenuId]    = useState(null)
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [toggling,      setToggling]      = useState(false)

  const cityAllowed = (city) => {
    if (!user) return false
    if (user.role === 'manager') return true
    if (!user.cities?.length) return true
    return user.cities.includes(city)
  }

  const prevMonth = getPrevMonth()

  const filtered = useMemo(() => {
    const today = new Date()
    return [...tuitions]
      .sort((a, b) => (b.start || '').localeCompare(a.start || ''))
      .filter((t) => {
        // City access control
        if (!cityAllowed(t.city || '')) return false

        // Status filter — uses status field with fallback
        const tStatus = t.status || (t.active ? 'active' : 'inactive')
        if (filter === 'active'   && tStatus !== 'active')   return false
        if (filter === 'idle'     && tStatus !== 'idle')     return false
        if (filter === 'inactive' && tStatus !== 'inactive') return false

        // City filter
        if (cityFilter && t.city !== cityFilter) return false

        // Last attendance filter
        if (lastAttFilter) {
          const lastDate  = t.lastAttDate ? new Date(t.lastAttDate + 'T00:00:00') : null
          const diffDays  = lastDate ? Math.floor((today - lastDate) / 86400000) : Infinity
          if (lastAttFilter === '3days' && diffDays < 3)  return false
          if (lastAttFilter === '7days' && diffDays < 7)  return false
          if (lastAttFilter === 'never' && lastDate)      return false
        }

        // Search
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
      })
  }, [tuitions, search, filter, cityFilter, lastAttFilter, user])

  function handleToggle(tuitionId, action) {
    const t = tuitions.find((t) => t.id === tuitionId)
    if (!t) return
    setConfirmToggle({ tuitionId, action, studentName: t.studentName })
  }

  async function handleToggleConfirm() {
    if (!confirmToggle) return
    setToggling(true)
    try {
      const { action, tuitionId } = confirmToggle
      const payload = action === 'activate'   ? { active: true,  status: 'active' }
                    : action === 'idle'        ? { active: true,  status: 'idle' }
                    :                            { active: false, status: 'inactive' }
      await updateTuition(tuitionId, payload)
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
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => exportToCSV(filtered, tutors)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 bg-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          )}
          {canWrite && (
            <Button onClick={() => setAddOpen(true)}>+ Add Tuition</Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="text" placeholder="Search student, parent, phone, ID..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />

        {/* Status filter */}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* City filter */}
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All Cities</option>
          {ALL_CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* Last attendance filter */}
        <select value={lastAttFilter} onChange={(e) => setLastAttFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All Last Att</option>
          <option value="3days">3+ days ago</option>
          <option value="7days">7+ days ago</option>
          <option value="never">Never marked</option>
        </select>

        {/* Clear filters — reset to defaults */}
        {(search || filter !== 'active' || cityFilter !== defaultCity || lastAttFilter) && (
          <button
            onClick={() => { setSearch(''); setFilter('active'); setCityFilter(defaultCity); setLastAttFilter('') }}
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

      {/* Inline confirm modal for activate/deactivate/idle */}
      {confirmToggle && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setConfirmToggle(null)}>
          <div style={{ background:'white', borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:12, marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center',
              background: confirmToggle.action === 'deactivate' ? '#FEE2E2' : confirmToggle.action === 'idle' ? '#FEF3C7' : '#DCFCE7' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"
                stroke={confirmToggle.action === 'deactivate' ? '#DC2626' : confirmToggle.action === 'idle' ? '#D97706' : '#16A34A'}>
                {confirmToggle.action === 'deactivate'
                  ? <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
                  : confirmToggle.action === 'idle'
                  ? <><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></>
                  : <><circle cx="12" cy="12" r="10"/><path d="M9 11l3 3L22 4"/></>}
              </svg>
            </div>
            <p style={{ fontSize:16, fontWeight:700, color:'#0F172A', marginBottom:6 }}>
              {{activate:'Activate', idle:'Set Idle', deactivate:'Deactivate'}[confirmToggle.action]} Tuition?
            </p>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, marginBottom:20 }}>
              {{
                activate:   `This will activate the tuition for ${confirmToggle.studentName}.`,
                idle:       `This will set the tuition for ${confirmToggle.studentName} to Idle. Attendance can still be marked but billing will be disabled.`,
                deactivate: `This will deactivate the tuition for ${confirmToggle.studentName}. Attendance can no longer be marked.`,
              }[confirmToggle.action]}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmToggle(null)} disabled={toggling}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'1.5px solid #E2E8F0', background:'white', color:'#475569', fontSize:14, fontWeight:500, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleToggleConfirm} disabled={toggling}
                style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', fontSize:14, fontWeight:600, cursor:'pointer', opacity: toggling ? 0.7 : 1,
                  background: confirmToggle.action === 'deactivate' ? '#DC2626' : confirmToggle.action === 'idle' ? '#D97706' : '#16A34A', color:'white' }}>
                {toggling ? 'Updating…' : {activate:'Activate', idle:'Set Idle', deactivate:'Deactivate'}[confirmToggle.action]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
