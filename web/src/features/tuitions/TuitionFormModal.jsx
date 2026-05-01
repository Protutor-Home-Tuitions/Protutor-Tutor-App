/**
 * TuitionFormModal — Add or Edit a tuition.
 * Migrated from admin_1.html addTuition/updateTuition forms.
 */
import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { ALL_CITIES, BOARDS, DAYS_OF_WEEK } from '@/utils/helpers'

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Social','Science','Hindi','Tamil','Computer Science','Economics','Accountancy']
const FEE_TYPES = ['Monthly','Session','Hourly']
const STANDARDS = ['LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
const DURATIONS = ['0.5','1','1.5','2','2.5','3']

export default function TuitionFormModal({ tuitionId, onClose, onSaved }) {
  const tuitions = useDataStore((s) => s.tuitions)
  const tutors   = useDataStore((s) => s.tutors)
  const addTuition    = useDataStore((s) => s.addTuition)
  const updateTuition = useDataStore((s) => s.updateTuition)
  const user = useAuthStore((s) => s.user)

  const existing = tuitionId ? tuitions.find((t) => t.id === tuitionId) : null
  const isEdit   = !!existing

  const [studentName,  setStudentName]  = useState(existing?.studentName  || '')
  const [parentName,   setParentName]   = useState(existing?.parentName   || '')
  const [parentPhone,  setParentPhone]  = useState(existing?.parentPhone  || '')
  const [standard,     setStandard]     = useState(existing?.standard     || '10th')
  const [board,        setBoard]        = useState(existing?.board        || 'CBSE')
  const [city,         setCity]         = useState(existing?.city         || 'Chennai')
  const [subjects,     setSubjects]     = useState(existing?.subjects     || [])
  const [days,         setDays]         = useState(existing?.days         || [])
  const [duration,     setDuration]     = useState(existing?.duration     || '1')
  const [feeParent,    setFeeParent]    = useState(existing?.feeParent    || '')
  const [feeTutor,     setFeeTutor]     = useState(existing?.feeTutor     || '')
  const [commission,   setCommission]   = useState(existing?.commission   || '')
  const [feeType,      setFeeType]      = useState(existing?.feeType      || 'Monthly')
  const [repeatPayment,setRepeatPayment]= useState(existing?.repeatPayment|| false)
  const [tutorId,      setTutorId]      = useState(existing?.tutorId      || '')
  const [demo,         setDemo]         = useState(existing?.demo         || '')
  const [start,        setStart]        = useState(existing?.start        || '')
  const [enqId, setEnqId] = useState(existing?.enqId || '')
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)

  function toggleSubject(s) {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }
  function toggleDay(d) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  async function handleSave() {
    setError('')
    if (!studentName.trim()) { setError('Student name is required.'); return }
    if (!parentPhone.trim()) { setError('Parent phone is required.'); return }
    if (!feeParent)          { setError('Fee (Parent) is required.'); return }
    if (!feeTutor)           { setError('Fee (Tutor) is required.'); return }
    if (days.length === 0)   { setError('Select at least one day.'); return }

    // Check duplicate enqId
    const dupEnq = tuitions.find((t) => t.enqId?.toLowerCase() === enqId.toLowerCase() && t.id !== tuitionId)
    if (dupEnq) { setError('Enquiry ID already exists. Please use a different one.'); return }

    setSaving(true)
    const payload = {
      enqId: enqId.toUpperCase(),
      studentName: studentName.trim(),
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      standard, board, city,
      subjects, days, duration,
      feeParent: parseInt(feeParent),
      feeTutor: parseInt(feeTutor),
      feeCompany: parseInt(feeParent) - parseInt(feeTutor),
      commission: commission ? parseInt(commission) : 0,
      feeType, repeatPayment,
      tutorId: tutorId ? parseInt(tutorId) : null,
      demo: demo || null,
      start: start || null,
      active: existing?.active ?? true,
    }

    try {
      if (isEdit) {
        await updateTuition(tuitionId, { ...payload, lastEditedBy: user?.name })
      } else {
        await addTuition({ ...payload, createdBy: user?.name || 'Admin' })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save tuition.')
    } finally {
      setSaving(false)
    }
  }

  const activeTutors = tutors.filter((t) => t.active)

  return (
    <Modal open onClose={onClose} size="lg" zIndex={200}
      title={isEdit ? `Edit Tuition — ${existing?.studentName}` : 'Add Tuition'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Tuition'}
          </Button>
        </>
      }
    >
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="space-y-5">
        {/* Enquiry ID */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Enquiry ID <span className="text-red-500">*</span>
              <span className="text-slate-300 font-normal normal-case ml-1">e.g. CHN-2601-103</span>
            </label>
            <input
              value={enqId}
              onChange={(e) => {
                // Match original formatEnqId: 3 letters - 4 numbers - 3 numbers
                let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')
                let out = ''
                if (v.length > 0) out += v.slice(0,3)
                if (v.length > 3) out += '-' + v.slice(3,7)
                if (v.length > 7) out += '-' + v.slice(7,10)
                setEnqId(out)
              }}
              placeholder="CHN-2601-103"
              maxLength={12}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
              style={{ letterSpacing: '1px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {ALL_CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Student */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">Student Details</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Student Name <span className="text-red-500">*</span></label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Parent Name</label>
              <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Parent full name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Parent Phone <span className="text-red-500">*</span></label>
              <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="10-digit number" maxLength={10}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Standard</label>
              <select value={standard} onChange={(e) => setStandard(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {STANDARDS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Board</label>
              <select value={board} onChange={(e) => setBoard(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {BOARDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tutor</label>
              <select value={tutorId} onChange={(e) => setTutorId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Unassigned</option>
                {activeTutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSubject(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ background: subjects.includes(s) ? '#1A56DB' : 'white', color: subjects.includes(s) ? 'white' : '#475569', borderColor: subjects.includes(s) ? '#1A56DB' : '#E2E8F0' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">Class Schedule</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Days <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                    style={{ background: days.includes(d) ? '#1A56DB' : 'white', color: days.includes(d) ? 'white' : '#475569', borderColor: days.includes(d) ? '#1A56DB' : '#E2E8F0' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration (hr/day)</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {DURATIONS.map((d) => <option key={d} value={d}>{d} hr</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Demo Date</label>
              <input type="date" value={demo} onChange={(e) => setDemo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Fee */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">Fee Details</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fee Type</label>
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {FEE_TYPES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fee (Parent) ₹ <span className="text-red-500">*</span></label>
              <input type="number" value={feeParent} onChange={(e) => setFeeParent(e.target.value)} placeholder="e.g. 4000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fee (Tutor) ₹ <span className="text-red-500">*</span></label>
              <input type="number" value={feeTutor} onChange={(e) => setFeeTutor(e.target.value)} placeholder="e.g. 3000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Commission ₹</label>
              <input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="e.g. 1500"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 flex items-center gap-3 mt-1">
              <input type="checkbox" id="repeat-payment" checked={repeatPayment} onChange={(e) => setRepeatPayment(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer" />
              <label htmlFor="repeat-payment" className="text-sm font-medium text-slate-700 cursor-pointer">
                Repeat every cycle
                <span className="text-xs text-slate-400 font-normal ml-1">(enables ongoing billing)</span>
              </label>
            </div>
          </div>
          {feeParent && feeTutor && (
            <div className="mt-3 px-4 py-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-slate-600">Fee to Company: </span>
              <strong className="text-blue-700">₹{parseInt(feeParent||0) - parseInt(feeTutor||0)}</strong>
              <span className="text-slate-400 text-xs ml-2">({feeType})</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
