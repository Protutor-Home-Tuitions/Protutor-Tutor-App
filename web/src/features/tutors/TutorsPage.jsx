import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

// ── Inline confirm modal ──
function ConfirmModal({ open, title, message, confirmLabel, confirmVariant = 'danger', onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <Modal open onClose={onCancel} size="sm" zIndex={300}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-slate-600 text-sm">{message}</p>
    </Modal>
  )
}

// ── Tutor Add/Edit modal ──
function TutorFormModal({ tutorId, onClose }) {
  const tutors      = useDataStore((s) => s.tutors)
  const addTutor    = useDataStore((s) => s.addTutor)
  const updateTutor = useDataStore((s) => s.updateTutor)
  const user        = useAuthStore((s) => s.user)
  const isManager   = user?.role === 'manager'

  const existing = tutorId ? tutors.find((t) => t.id === tutorId) : null
  const isEdit   = !!existing

  const [name,     setName]     = useState(existing?.name    || '')
  const [phone,    setPhone]    = useState(existing?.phone   || '')
  const [bankEdit, setBankEdit] = useState(!isEdit)
  const [accHolder,setAccHolder]= useState(existing?.accountHolderName || '')
  const [accNumber,setAccNumber]= useState(existing?.accountNumber     || '')
  const [ifsc,     setIfsc]     = useState(existing?.ifscCode          || '')
  const [pan,      setPan]      = useState(existing?.panNumber         || '')
  const [email,    setEmail]    = useState(existing?.email             || '')
  const [payAccId, setPayAccId] = useState(existing?.paymentAccountId  || '')
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const [passDigits] = useState(
    existing?.passDigits || Math.floor(100 + Math.random() * 900).toString()
  )
  const pass = name.slice(0,4).toLowerCase().replace(/\s/g,'') + '@' + passDigits

  async function handleSave() {
    setError('')
    if (!name.trim())  { setError('Name is required.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit phone number.'); return }

    // Duplicate phone check
    const dup = tutors.find((t) => t.phone === phone.trim() && t.id !== tutorId)
    if (dup) { setError(`A tutor with phone ${phone} already exists — ${dup.name}.`); return }

    setSaving(true)
    const payload = {
      name: name.trim(), phone: phone.trim(),
      active: existing?.active ?? true,
      passDigits,
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
      // Handle DB-level duplicate phone error
      if (err.message?.toLowerCase().includes('unique') || err.message?.toLowerCase().includes('duplicate') || err.message?.toLowerCase().includes('already')) {
        setError(`Phone number ${phone} is already registered to another tutor.`)
      } else {
        setError(err.message || 'Failed to save. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md" zIndex={200}
      title={isEdit ? `Edit Tutor — ${existing?.name}` : 'Add Tutor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Save Changes' : 'Add Tutor'}</Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Name + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tutor full name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Phone <span className="text-red-500">*</span>
              <span className="text-slate-300 font-normal normal-case ml-1">(login ID)</span>
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,''))}
              placeholder="10-digit number" maxLength={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Login credentials preview */}
        <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Login Credentials</p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Username (Phone)</span>
              <p className="font-mono font-semibold text-slate-700">{phone || '—'}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Password</span>
              <p className="font-mono font-semibold text-blue-600">{name ? pass : '—'}</p>
            </div>
          </div>
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
            <div className={`space-y-3 ${!bankEdit ? 'opacity-50 pointer-events-none' : ''}`}>
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

// ── Main TutorsPage ──
export default function TutorsPage() {
  const [search,    setSearch]    = useState('')
  const [editId,    setEditId]    = useState(null)
  const [addOpen,   setAddOpen]   = useState(false)
  const [confirmId, setConfirmId] = useState(null) // tutor being toggled
  const [toggling,  setToggling]  = useState(false)

  const tutors      = useDataStore((s) => s.tutors)
  const tuitions    = useDataStore((s) => s.tuitions)
  const updateTutor = useDataStore((s) => s.updateTutor)
  const user        = useAuthStore((s) => s.user)
  const isManager   = user?.role === 'manager'
  const canWrite    = isManager || user?.role === 'coordinator'

  const filtered = tutors.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.phone.includes(q)
  })

  const confirmTutor = tutors.find((t) => t.id === confirmId)

  async function handleToggleConfirm() {
    if (!confirmTutor) return
    setToggling(true)
    try {
      await updateTutor(confirmTutor.id, { active: !confirmTutor.active })
      setConfirmId(null)
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setToggling(false)
    }
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
                  const total   = tuitions.filter((tu) => tu.tutorId === t.id).length
                  const active  = tuitions.filter((tu) => tu.tutorId === t.id && tu.active).length
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
                          <button onClick={() => setConfirmId(t.id)}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 ${t.active ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
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

      {/* Inline confirm modal */}
      <ConfirmModal
        open={!!confirmId}
        title={confirmTutor?.active ? 'Deactivate Tutor' : 'Activate Tutor'}
        message={
          confirmTutor?.active
            ? `Are you sure you want to deactivate ${confirmTutor?.name}? They will no longer be able to log in to the tutor app.`
            : `Are you sure you want to activate ${confirmTutor?.name}? They will be able to log in to the tutor app.`
        }
        confirmLabel={confirmTutor?.active ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmTutor?.active ? 'danger' : 'success'}
        onConfirm={handleToggleConfirm}
        onCancel={() => setConfirmId(null)}
        loading={toggling}
      />

      {addOpen && <TutorFormModal onClose={() => setAddOpen(false)} />}
      {editId  && <TutorFormModal tutorId={editId} onClose={() => setEditId(null)} />}
    </div>
  )
}
