import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ALL_CITIES, ROLE_LABELS } from '@/utils/helpers'

const ROLES = ['manager','coordinator','support']
const ROLE_COLORS = { manager:'blue', coordinator:'green', support:'yellow' }

function UserFormModal({ userId, onClose }) {
  const adminUsers   = useDataStore((s) => s.adminUsers)
  const addAdminUser = useDataStore((s) => s.addAdminUser)
  const updateAdminUser = useDataStore((s) => s.updateAdminUser)

  const existing = userId ? adminUsers.find((u) => u.id === userId) : null
  const isEdit   = !!existing

  const [name,     setName]     = useState(existing?.name     || '')
  const [phone,    setPhone]    = useState(existing?.phone    || '')
  const [email,    setEmail]    = useState(existing?.email    || '')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState(existing?.role     || 'coordinator')
  const [status,   setStatus]   = useState(existing?.status   || 'active')
  const [cities,   setCities]   = useState(existing?.cities   || [])
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  function toggleCity(c) {
    setCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  async function handleSave() {
    setError('')
    if (!name.trim())  { setError('Name is required'); return }
    if (!phone.trim()) { setError('Phone is required'); return }
    if (!isEdit && !password) { setError('Password is required for new users'); return }

    setSaving(true)
    const payload = {
      name: name.trim(), phone: phone.trim(),
      email: email.trim() || phone.trim(),
      role, status, cities,
      ...(password ? { password } : {}),
    }
    try {
      if (isEdit) await updateAdminUser(userId, payload)
      else        await addAdminUser(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md" zIndex={200}
      title={isEdit ? `Edit User — ${existing?.name}` : 'Add User'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave} loading={saving}>{isEdit ? 'Save Changes' : 'Add User'}</Button></>}>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone <span className="text-red-500">*</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" maxLength={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email / Username</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email or phone"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password {!isEdit && <span className="text-red-500">*</span>}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Set password'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Assigned Cities <span className="text-slate-300 font-normal normal-case">(leave empty = all cities)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {ALL_CITIES.map((c) => (
              <button key={c} type="button" onClick={() => toggleCity(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ background: cities.includes(c) ? '#1A56DB' : 'white', color: cities.includes(c) ? 'white' : '#475569', borderColor: cities.includes(c) ? '#1A56DB' : '#E2E8F0' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function UsersPage() {
  const [search,  setSearch]  = useState('')
  const [editId,  setEditId]  = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const adminUsers = useDataStore((s) => s.adminUsers)
  const user       = useAuthStore((s) => s.user)

  const filtered = adminUsers.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q)
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users & Coordinators</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage team access — Admin</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Add User</Button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Users & Coordinators</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Name','Phone','Email (Username)','Role','Assigned Cities','Status','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0
              ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No users found</td></tr>
              : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-sm">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_COLORS[u.role] || 'gray'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {u.cities?.length ? u.cities.join(', ') : <span className="text-slate-400">All cities</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditId(u.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">Edit</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {addOpen && <UserFormModal onClose={() => setAddOpen(false)} />}
      {editId  && <UserFormModal userId={editId} onClose={() => setEditId(null)} />}
    </div>
  )
}
