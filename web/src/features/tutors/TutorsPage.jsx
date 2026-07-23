import { useState, useEffect } from 'react'
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
      <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
    </Modal>
  )
}

// ── Razorpay account creation button ──
function RazorpayButton({ tutorId, size = 'sm', isRetry = false }) {
  const createRazorpayAccount = useDataStore((s) => s.createRazorpayAccount)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setCreating(true)
    setError('')
    try {
      await createRazorpayAccount(tutorId)
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-1">
      <button onClick={handleCreate} disabled={creating}
        className={`${size === 'xs' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} font-medium border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50`}>
        {creating ? 'Setting up…' : isRetry ? 'Retry setup' : 'Create RZP Account'}
      </button>
      {error && <p className="text-[11px] text-red-500 mt-1 max-w-[240px]">{error}</p>}
    </div>
  )
}

// ── Status badge ──
function RzpStatusBadge({ status }) {
  if (!status) return null
  let color, icon, label
  if (status === 'activated') {
    color = 'bg-green-100 text-green-700'; icon = '✓'; label = 'Activated'
  } else if (status === 'rejected' || status === 'suspended') {
    color = 'bg-red-100 text-red-700'; icon = '✕'; label = status.charAt(0).toUpperCase() + status.slice(1)
  } else {
    color = 'bg-amber-100 text-amber-700'; icon = '○'; label = status.replace(/_/g, ' ')
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5 ${color}`}>
      {icon} {label}
    </span>
  )
}

// ── Manual RZP status refresh button ──
function RefreshRzpButton() {
  const refreshRzpStatus = useDataStore((s) => s.refreshRzpStatus)
  const [loading, setLoading] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    try {
      const result = await refreshRzpStatus()
      alert(`Checked ${result.checked} pending account${result.checked !== 1 ? 's' : ''}. ${result.updated} status update${result.updated !== 1 ? 's' : ''} applied.`)
    } catch (err) {
      alert('Failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleRefresh} disabled={loading}
      className="px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      {loading ? 'Checking…' : 'Refresh RZP Status'}
    </button>
  )
}

// ── Edit Bank Details modal ──
function EditBankModal({ tutor, open, onClose }) {
  const updateBankDetails = useDataStore((s) => s.updateBankDetails)
  const [holderName, setHolderName] = useState(tutor.accountHolderName || '')
  const [accNumber, setAccNumber] = useState('')
  const [ifsc, setIfsc] = useState(tutor.ifscCode || '')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  if (!open) return null

  async function handleSubmit() {
    setError('')
    setWarning('')
    if (!holderName.trim() || !accNumber.trim() || !ifsc.trim()) {
      return setError('Holder name, account number, and IFSC are required.')
    }
    if (!reason.trim() || reason.trim().length < 3) {
      return setError('Reason for change is required (min 3 chars).')
    }
    setSaving(true)
    try {
      const result = await updateBankDetails(tutor.id, {
        accountHolderName: holderName.trim(),
        accountNumber: accNumber.trim(),
        ifscCode: ifsc.trim().toUpperCase(),
        reason: reason.trim(),
      })
      if (result.warning) {
        alert(result.warning)  // Show warning but still close — DB is already updated
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="sm" zIndex={300} title="Update Bank Details">
      <div className="space-y-3">
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        {warning && <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">{warning}</p>}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Account Holder Name *</label>
          <input value={holderName} onChange={e => setHolderName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="As per bank records" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Account Number *</label>
          <input value={accNumber} onChange={e => setAccNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="New account number" inputMode="numeric" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">IFSC Code *</label>
          <input value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="HDFC0001234" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Reason for change *</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Tutor changed bank" />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <p className="text-[11px] text-amber-700">Old bank details will be archived permanently. {tutor.paymentProductId ? 'Razorpay settlement will be updated automatically.' : ''}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} className="flex-1">Update & Sync</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Bank change history ──
function BankHistory({ tutorId, refreshKey }) {
  const [history, setHistory] = useState([])
  const [loaded, setLoaded] = useState(false)
  const getBankHistory = useDataStore((s) => s.getBankHistory)

  useEffect(() => {
    setLoaded(false)
    getBankHistory(tutorId).then(rows => { setHistory(rows || []); setLoaded(true) }).catch(() => setLoaded(true))
  }, [tutorId, refreshKey])

  if (!loaded) return <p className="text-[11px] text-slate-400">Loading history…</p>
  if (!history.length) return <p className="text-[11px] text-slate-400">No changes yet</p>

  function mask(num) {
    if (!num || num.length <= 4) return num || ''
    return '••••' + num.slice(-4)
  }

  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <div key={h.id || i} className="bg-white border border-slate-100 rounded-lg p-2.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400">{new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="text-[10px] text-slate-400">by {h.changed_by}</span>
          </div>
          <p className="text-[11px] text-slate-600">
            {mask(h.old_account_number)} ({h.old_ifsc_code?.slice(0,4)}) → {mask(h.new_account_number)} ({h.new_ifsc_code?.slice(0,4)})
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Reason: {h.reason}</p>
        </div>
      ))}
    </div>
  )
}

// ── Read-only view modal ──
function TutorViewModal({ tutorId, onClose }) {
  const tutors   = useDataStore((s) => s.tutors)
  const tuitions = useDataStore((s) => s.tuitions)
  const t = tutors.find((t) => t.id === tutorId)
  if (!t) return null

  const total  = tuitions.filter((tu) => tu.tutorId === t.id).length
  const active = tuitions.filter((tu) => tu.tutorId === t.id && tu.active).length
  const bankSet = !!(t.accountHolderName && t.accountNumber && t.ifscCode)

  function Row({ label, value }) {
    return (
      <div className="bg-slate-50 rounded-lg px-4 py-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-sm font-medium text-slate-700">{value || '—'}</div>
      </div>
    )
  }

  return (
    <Modal open onClose={onClose} size="md" zIndex={200}
      title={`Tutor — ${t.name}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Row label="Full Name" value={t.name} />
          <Row label="Phone (Login ID)" value={t.phone} />
          <Row label="Status" value={t.active ? 'Active' : 'Inactive'} />
          <Row label="Students" value={`${active} active / ${total} total`} />
        </div>

        {/* Login credentials */}
        <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Login Credentials</p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-slate-400 text-xs">Username</span>
              <p className="font-mono font-semibold text-slate-700">{t.phone}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Password</span>
              <p className="font-mono font-semibold text-blue-600">
                {t.name.slice(0,4).toLowerCase().replace(/\s/g,'')}@{t.passDigits || '***'}
              </p>
            </div>
          </div>
        </div>

        {/* Bank status */}
        <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bank Details</p>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${bankSet ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
            {bankSet ? 'Bank details on file ✓' : 'No bank details'}
          </span>
          {t.paymentAccountId && (
            <div className="mt-2">
              <p className="text-xs font-mono text-slate-500">Account ID: {t.paymentAccountId}</p>
              {t.paymentAccountStatus && <RzpStatusBadge status={t.paymentAccountStatus} />}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Add/Edit modal — manager only for edit ──
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
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [editBankOpen, setEditBankOpen] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  const [passDigits] = useState(
    existing?.passDigits || Math.floor(100 + Math.random() * 900).toString()
  )
  const pass = name.slice(0,4).toLowerCase().replace(/\s/g,'') + '@' + passDigits
  const bankSet = !!(existing?.accountHolderName && existing?.accountNumber && existing?.ifscCode)

  async function handleSave() {
    setError('')
    if (!name.trim())  { setError('Name is required.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit phone number.'); return }

    const dup = tutors.find((t) => t.phone === phone.trim() && t.id !== tutorId)
    if (dup) { setError(`A tutor with phone ${phone} already exists — ${dup.name}.`); return }

    setSaving(true)
    const payload = {
      name: name.trim(), phone: phone.trim(),
      active: existing?.active ?? true,
      passDigits,
    }
    try {
      if (isEdit) await updateTutor(tutorId, payload)
      else        await addTutor(payload)
      onClose()
    } catch (err) {
      if (err.message?.toLowerCase().includes('unique') || err.message?.toLowerCase().includes('already')) {
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
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name <span className="text-red-500">*</span></label>
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

        {isManager && isEdit && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">Bank & Payment Details</p>

            {bankSet ? (
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Account Holder</p>
                    <p className="text-sm text-slate-700">{existing.accountHolderName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Account Number</p>
                    <p className="text-sm text-slate-700 font-mono">{existing.accountNumber}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">IFSC Code</p>
                    <p className="text-sm text-slate-700 font-mono">{existing.ifscCode}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">PAN Number</p>
                    <p className="text-sm text-slate-700 font-mono">{existing.panNumber}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Email</p>
                    <p className="text-sm text-slate-700">{existing.email}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 uppercase">Payment Account ID</p>
                    <p className="text-sm text-slate-700 font-mono">{existing.paymentAccountId || '—'}</p>
                    {existing.paymentAccountStatus && <RzpStatusBadge status={existing.paymentAccountStatus} />}
                  </div>
                </div>
                <button onClick={() => setEditBankOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">
                  Update Bank Details
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-3">No bank details submitted yet. Tutor must submit from the app.</p>
            )}

            {bankSet && !existing.paymentProductId && (
              <div className="mb-3">
                <RazorpayButton tutorId={existing.id} isRetry={!!existing.paymentAccountId} />
              </div>
            )}

            <p className="text-[10px] text-slate-400 uppercase font-semibold mt-4 mb-2">Bank Change History</p>
            <BankHistory tutorId={existing.id} refreshKey={historyKey} />
          </div>
        )}
      </div>
      {editBankOpen && existing && <EditBankModal tutor={existing} open onClose={() => { setEditBankOpen(false); setHistoryKey(k => k + 1) }} />}
    </Modal>
  )
}

// ── Main TutorsPage ──
export default function TutorsPage() {
  const [search,    setSearch]    = useState('')
  const [editId,    setEditId]    = useState(null)
  const [viewId,    setViewId]    = useState(null)
  const [addOpen,   setAddOpen]   = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toggling,  setToggling]  = useState(false)

  const tutors      = useDataStore((s) => s.tutors)
  const tuitions    = useDataStore((s) => s.tuitions)
  const updateTutor = useDataStore((s) => s.updateTutor)
  const user        = useAuthStore((s) => s.user)
  const isManager   = user?.role === 'manager'
  const canAdd = isManager || user?.role === 'coordinator'

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
          <p className="text-slate-500 text-sm mt-0.5">Manage tutor accounts — {isManager ? 'Admin' : user?.role}</p>
        </div>
        <div className="flex gap-2">
          {isManager && <RefreshRzpButton />}
          {canAdd && <Button onClick={() => setAddOpen(true)}>+ Add Tutor</Button>}
        </div>
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
                        {t.paymentAccountId ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-mono text-slate-700">{t.paymentAccountId}</span>
                            <RzpStatusBadge status={t.paymentAccountStatus} />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${bankSet ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {bankSet ? 'Bank ✓' : 'No bank'}
                        </span>
                        {bankSet && !t.paymentProductId && isManager && (
                          <RazorpayButton tutorId={t.id} size="xs" isRetry={!!t.paymentAccountId} />
                        )}
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
                          {/* Manager → Edit, Others → View */}
                          {isManager
                            ? <button onClick={() => setEditId(t.id)}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">Edit</button>
                            : <button onClick={() => setViewId(t.id)}
                                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">View</button>
                          }
                          {/* Deactivate/Activate — manager only */}
                          {isManager && (
                            <button onClick={() => setConfirmId(t.id)}
                              className={`px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 ${t.active ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
                              {t.active ? 'Deactivate' : 'Activate'}
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

      {/* Inline confirm modal */}
      <ConfirmModal
        open={!!confirmId}
        title={confirmTutor?.active ? 'Deactivate Tutor' : 'Activate Tutor'}
        message={confirmTutor?.active
          ? `Are you sure you want to deactivate ${confirmTutor?.name}? They will no longer be able to log in.`
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
      {viewId  && <TutorViewModal tutorId={viewId} onClose={() => setViewId(null)} />}
    </div>
  )
}
