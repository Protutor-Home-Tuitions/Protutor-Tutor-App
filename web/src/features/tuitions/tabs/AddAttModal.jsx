/**
 * AddAttModal.jsx — Add or Edit an attendance record.
 * Migrated from admin_1.html openAttModal() + saveAtt()
 *
 * Rules enforced:
 *  - Date required
 *  - Duration required
 *  - Only one attendance per day per tuition (admin + tutor combined)
 */
import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { fd } from '@/utils/helpers'
import { api } from '@/lib/api'

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','15','30','45']
const DURATIONS = [
  { value: '1',   label: '1 hr' },
  { value: '1.5', label: '1.5 hr' },
  { value: '2',   label: '2 hr' },
  { value: '2.5', label: '2.5 hr' },
  { value: '3',   label: '3+ hr' },
]

export default function AddAttModal({ tuitionId, existingRecord, allAtt, onClose, defaultMonth, onSaved }) {
  const tuitions   = useDataStore((s) => s.tuitions)
  const fetchDetail = useDataStore((s) => s.fetchTuitionDetail)
  const user        = useAuthStore((s) => s.user)

  const t      = tuitions.find((t) => t.id === tuitionId)
  const enqId  = t?.enqId
  const isEdit = !!existingRecord

  // Parse existing time "4:00 PM" into parts
  const parseTime = (timeStr) => {
    const match = timeStr?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    return match
      ? { h: String(parseInt(match[1])), m: match[2], ap: match[3].toUpperCase() }
      : { h: '4', m: '00', ap: 'PM' }
  }
  const timeParts = parseTime(existingRecord?.time)

  const [date,    setDate]    = useState(existingRecord?.date || new Date().toISOString().slice(0, 10))
  const [hour,    setHour]    = useState(timeParts.h)
  const [minute,  setMinute]  = useState(timeParts.m)
  const [ampm,    setAmpm]    = useState(timeParts.ap)
  const [dur,     setDur]     = useState(existingRecord?.dur || '1.5')
  const [subj,    setSubj]    = useState(existingRecord?.subj || (t?.subjects?.[0] || ''))
  const [topic,   setTopic]   = useState(existingRecord?.topic || '')
  const [isDemo,  setIsDemo]  = useState(existingRecord?.isDemo || false)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    setError('')
    if (!date) { setError('Date is required.'); return }
    if (!dur)  { setError('Duration is required.'); return }

    // One attendance per day rule
    const existing = allAtt.find((a) => a.date === date && a.id !== existingRecord?.id)
    if (existing) {
      setError(`Attendance already marked for ${fd(date)}. Only one entry per day allowed.`)
      return
    }

    setSaving(true)
    const time = `${hour}:${minute} ${ampm}`
    const monthKey = date.slice(0, 7)
    const payload = {
      enqId, date, time, dur, subj, topic,
      isDemo, byAdmin: true,
      monthKey,
      markedAt: new Date().toISOString(),
      markedBy: user?.name || 'Admin',
    }

    try {
      if (isEdit) {
        await api.updateAttendance(existingRecord.id, payload)
      } else {
        payload.id = crypto.randomUUID()
        payload.tutorId = t?.tutorId || null
        await api.createAttendance(payload)
      }
      // Refresh attendance data for this tuition
      await fetchDetail(enqId)
      onSaved?.(monthKey)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      zIndex={200}
      title={isEdit ? 'Edit Attendance' : 'Add Attendance'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Attendance</Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Date */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Date <span className="text-red-500">*</span>
        </label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Time */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time</label>
        <div className="flex gap-2">
          <select value={hour} onChange={(e) => setHour(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={minute} onChange={(e) => setMinute(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={ampm} onChange={(e) => setAmpm(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Duration <span className="text-red-500">*</span>
        </label>
        <select value={dur} onChange={(e) => setDur(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Select</option>
          {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {/* Subject + Topic */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Subject <span className="text-xs text-slate-400 normal-case font-normal">optional</span>
          </label>
          <input type="text" value={subj} onChange={(e) => setSubj(e.target.value)}
            placeholder="e.g. Mathematics"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Topic <span className="text-xs text-slate-400 normal-case font-normal">optional</span>
          </label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Quadratic Equations"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Demo class toggle */}
      <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <input type="checkbox" id="att-is-demo" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-blue-600 flex-shrink-0" />
        <label htmlFor="att-is-demo" className="text-sm font-medium text-slate-700 cursor-pointer">
          Mark as Demo Class{' '}
          <span className="text-xs text-slate-500 font-normal">(excluded from class & hour count)</span>
        </label>
      </div>
    </Modal>
  )
}
