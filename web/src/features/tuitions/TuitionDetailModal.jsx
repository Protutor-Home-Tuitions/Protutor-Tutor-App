/**
 * TuitionDetailModal — large modal with Details / Attendance / Payments tabs.
 * Migrated from admin_1.html showTuitionDetail().
 */
import { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import DetailsTab from './tabs/DetailsTab'
import AttendanceTab from './tabs/AttendanceTab'
import PaymentsTab from './tabs/PaymentsTab'
import { fd } from 'protutor-shared'

const TABS = [
  { key: 'details',    label: '📋 Details' },
  { key: 'attendance', label: '✅ Attendance' },
  { key: 'payments',   label: '💳 Payments' },
]

export default function TuitionDetailModal({ tuitionId, onClose }) {
  const [activeTab, setActiveTab] = useState('details')

  const tuitions = useDataStore((s) => s.tuitions)
  const tutors   = useDataStore((s) => s.tutors)
  const { isManager, canWrite } = useAuthStore()

  const t     = tuitions.find((t) => t.id === tuitionId)
  const tutor = tutors.find((tu) => tu.id === t?.tutorId)

  if (!t) return null

  const feeCompany = t.feeParent - t.feeTutor

  const header = (
    <div className="flex items-start justify-between w-full">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-lg text-slate-800">{t.parentName || t.studentName}</span>
          {t.enqId && <span className="tag-id">{t.enqId}</span>}
          <Badge variant={t.active ? 'green' : 'red'}>{t.active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="text-sm text-slate-500 mt-1">Student: {t.studentName}</div>
        <div className="text-sm text-slate-500 mt-0.5">
          {t.days?.length} days/week · {t.duration}hr/day · ₹{t.feeParent}/{t.feeType}
        </div>
        <div className="text-sm text-slate-400 mt-0.5">
          Demo: {fd(t.demo) || '—'} &nbsp;·&nbsp; Start: {fd(t.start)} &nbsp;·&nbsp; {tutor?.name || '—'}
        </div>
      </div>
      {/* Added by — top right */}
      <div className="text-right text-xs text-slate-400 flex-shrink-0 ml-4">
        <div>Added by <strong className="text-slate-600">{t.createdBy || '—'}</strong></div>
        <div className="mt-0.5">
          {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </div>
      </div>
    </div>
  )

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {canWrite() && (
        <Button variant="secondary" onClick={() => {/* TODO edit */}}>✏ Edit</Button>
      )}
      {isManager() && (
        <Button
          variant={t.active ? 'danger' : 'success'}
          onClick={() => {/* TODO toggle */}}
        >
          {t.active ? 'Deactivate Tuition' : 'Activate Tuition'}
        </Button>
      )}
    </>
  )

  return (
    <Modal open onClose={onClose} size="xl" footer={footer}>
      {/* Custom header inside body since we need full width */}
      <div className="mb-5 pb-4 border-b border-slate-100">
        {header}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details'    && <DetailsTab tuition={t} tutor={tutor} />}
      {activeTab === 'attendance' && <AttendanceTab tuitionId={tuitionId} />}
      {activeTab === 'payments'   && <PaymentsTab tuitionId={tuitionId} />}
    </Modal>
  )
}
