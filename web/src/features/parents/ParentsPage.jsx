import { useState, useMemo } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Badge from '@/components/ui/Badge'

function parentLoginPass(name, digits) {
  return name.slice(0,4).toLowerCase().replace(/\s/g,'') + '@' + digits
}

export default function ParentsPage() {
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState('active')
  const [showPassId,  setShowPassId]  = useState(null)

  const tuitions = useDataStore((s) => s.tuitions)
  const user     = useAuthStore((s) => s.user)
  const isManager     = user?.role === 'manager'
  const isCoordinator = user?.role === 'coordinator'

  // Parents data — in original this is a separate `parents` array with passDigits
  // We derive from tuitions but also support a standalone parents store in future
  // For now: unique by parentPhone, passDigits derived from phone last 3 digits
  const parents = useMemo(() => {
    const map = {}
    tuitions.forEach((t) => {
      if (!t.parentPhone) return
      if (!map[t.parentPhone]) {
        map[t.parentPhone] = {
          id: 'p_' + t.parentPhone,
          parentName: t.parentName || t.studentName,
          parentPhone: t.parentPhone,
          passDigits: t.parentPhone.slice(-3),
          status: 'active',
          createdBy: t.createdBy || 'Admin',
          createdAt: t.createdAt || '',
          tuitions: [],
        }
      }
      map[t.parentPhone].tuitions.push(t)
    })
    return Object.values(map)
  }, [tuitions])

  const filtered = parents.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return p.parentName?.toLowerCase().includes(q) || p.parentPhone?.includes(q)
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Parents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Parent login accounts — Admin</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search name, phone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Parents</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{filtered.length} parent{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Parent Name','Phone (Username)','Password','Students','Status','Created','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0
              ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No parents found</td></tr>
              : filtered.map((p) => {
                  const active = p.tuitions.filter((t) => t.active).length
                  const pass   = parentLoginPass(p.parentName, p.passDigits)
                  const createdFmt = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'
                  const showing = showPassId === p.id
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-sm">{p.parentName}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{p.parentPhone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs px-2 py-1 rounded"
                            style={{ background: showing ? '#EBF1FF' : '#F1F5F9', color: showing ? '#1A56DB' : '#475569', fontFamily: 'monospace' }}>
                            {showing ? pass : '••••••••'}
                          </code>
                          <button onClick={() => setShowPassId(showing ? null : p.id)}
                            className="text-slate-400 hover:text-slate-600">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{active} active</span>
                        <span className="text-xs text-slate-400 ml-1">{p.tuitions.length} total</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === 'active' ? 'green' : 'red'}>{p.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div>{createdFmt}</div>
                        <div className="text-slate-400">{p.createdBy}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {(isManager || isCoordinator) && (
                            <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                              onClick={() => alert('Reset password — connect to API')}>
                              Reset Pass
                            </button>
                          )}
                          {isManager && (
                            <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                              onClick={() => alert('Toggle status — connect to API')}>
                              {p.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
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
  )
}
