import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ALL_CITIES } from '@/utils/helpers'

const DURATIONS = ['0.5','1','1.5','2','2.5','3']

function TutorFormModal({ tutorId, onClose }) {
  const tutors     = useDataStore((s) => s.tutors)
  const addTutor   = useDataStore((s) => s.addTutor)
  const updateTutor = useDataStore((s) => s.updateTutor)
  const user       = useAuthStore((s) => s.user)
  const isManager  = user?.role === 'manager'

  const existing = tutorId ? tutors.find((t) => t.id === tutorId) : null
  const isEdit   = !!existing

  const [name,    setName]    = useState(existing?.name    || '')
  const [phone,   setPhone]   = useState(existing?.phone   || '')
  const [bankEdit, setBankEdit] = useState(!isEdit)

  // Bank fields
  const [accHolder, setAccHolder] = useState(existing?.accountHolderName || '')
  const [accNumber, setAccNumber] = useState(existing?.accountNumber     || '')
  const [ifsc,      setIfsc]      = useState(existing?.ifscCode          || '')
  const [pan,       setPan]       = useState(existing?.panNumber         || '')
  const [email,     setEmail]     = useState(existing?.email             || '')
  const [payAccId,  setPayAccId]  = useState(existing?.paymentAccountId  || '')

  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!name.trim())  { setError('Name is required'); return }
    if (!phone.trim()) { setError('Phone is required'); return }

    setSaving(true)
    const payload = {
      name: name.trim(), phone: phone.trim(), active: existing?.active ?? true,
      passDigits: passDigits,
      ...(isManager ? {
        accountHolderName: accHolder, accountNumber: accNumber,
        ifscCode: ifsc.toUpperCase(), panNumber: pan.toUpperCase(),
        email, paymentAccountId: payAccId,
      } : {}),
    }
    try {
      if (isEdit) await updateTutor(tutorId, payload)
      else        await addTutor(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Login credentials preview
  const [passDigits] = useState(
    existing?.passDigits || Math.floor(100 + Math.random() * 900).toString()
  )
  const uname = phone.slice(-4) + name.slice(0,3).toLowerCase().replace(/\s/g,'')
  const pass  = name.slice(0,4).toLowerCase().replace(/\s/g,'') + '@' + passDigits

  return (
    <Modal open onClose={onClose} size="md" zIndex={200}
      title={isEdit ? `Edit Tutor — ${existing?.name}` : 'Add Tutor'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={handleSave} loading={saving}>{isEdit ? 'Save Changes' : 'Add Tutor'}</Button></>}>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tutor full name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone <span className="text-red-500">*</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" maxLength={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Login preview */}
        <div className="px-4 py-3 bg-slate-50 rounded-lg text-xs text-slate-500">
          Login: <span className="font-mono text-slate-700">{uname}</span> &nbsp;·&nbsp; Password: <span className="font-mono text-slate-700">{pass}</span>
        </div>

        {/* Bank section — manager only */}
        {isManager && (
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bank & Payment Details</p>
              {isEdit && (
                <button onClick={() => setBankEdit(!bankEdit)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${bankEdit ? 'text-red-600 border-red-200 bg-red-50' : 'text-orange-600 border-orange-200 bg-orange-50'}`}>
                  {bankEdit ? '🔒 Lock' : '✏️ Edit'}
                </button>
              )}
            </div>
            <div className={`space-y-3 ${!bankEdit ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Holder</label>
                  <input value={accHolder} onChange={(e) => setAccHolder(e.target.value)} placeholder="Name as per bank"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Number</label>
                  <input value={accNumber} onChange={(e) => setAccNumber(e.target.value.replace(/\D/g,''))} placeholder="Account number"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">IFSC Code</label>
                  <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">PAN Number</label>
                  <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="e.g. ABCDE1234F"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Account ID</label>
                  <input value={payAccId} onChange={(e) => setPayAccId(e.target.value)} placeholder="Razorpay account ID"
                    readOnly={!bankEdit} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function TutorsPage() {
  const [search,   setSearch]   = useState('')
  const [editId,   setEditId]   = useState(null)
  const [addOpen,  setAddOpen]  = useState(false)

  const tutors        = useDataStore((s) => s.tutors)
  const tuitions      = useDataStore((s) => s.tuitions)
  const updateTutor   = useDataStore((s) => s.updateTutor)
  const user          = useAuthStore((s) => s.user)
  const isManager     = user?.role === 'manager'
  const canWrite      = isManager || user?.role === 'coordinator'

  const filtered = tutors.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.phone.includes(q)
  })

  async function handleToggle(tutorId, active) {
    if (!window.confirm(`${active ? 'Deactivate' : 'Activate'} this tutor?`)) return
    try { await updateTutor(tutorId, { active: !active }) }
    catch (err) { alert('Failed: ' + err.message) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tutors</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage tutor accounts — {user?.role === 'manager' ? 'Admin' : user?.role}</p>
        </div>
        {canWrite && <Button onClick={() => setAddOpen(true)}>+ Add Tutor</Button>}
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Search tutors..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-slate-700">All Tutors</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{filtered.length} tutor{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Name','Phone','Account ID · Bank','Students','Status','Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0
              ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No tutors found</td></tr>
              : filtered.map((t) => {
                  const total  = tuitions.filter((tu) => tu.tutorId === t.id).length
                  const active = tuitions.filter((tu) => tu.tutorId === t.id && tu.active).length
                  const bankSet = !!(t.accountHolderName && t.accountNumber && t.ifscCode)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-sm">{t.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.phone}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-slate-700">{t.paymentAccountId || <span className="text-slate-300">—</span>}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${bankSet ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {bankSet ? 'Bank ✓' : 'No bank'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold block mb-1">{active} active</span>
                        <span className="text-xs text-slate-400">{total} total</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={t.active ? 'green' : 'red'}>{t.active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditId(t.id)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">Edit</button>
                          <button onClick={() => handleToggle(t.id, t.active)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">
                            {t.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>

      {addOpen && <TutorFormModal onClose={() => setAddOpen(false)} />}
      {editId  && <TutorFormModal tutorId={editId} onClose={() => setEditId(null)} />}
    </div>
  )
}
