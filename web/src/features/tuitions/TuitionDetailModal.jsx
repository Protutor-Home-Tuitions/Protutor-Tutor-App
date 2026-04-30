import React, { useState } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import DetailsTab from './tabs/DetailsTab'
import AttendanceTab from './tabs/AttendanceTab'
import PaymentsTab from './tabs/PaymentsTab'
import TuitionFormModal from './TuitionFormModal'
import { fd } from '@/utils/helpers'

class AttErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding:20, color:'#991B1B', background:'#FEF2F2', borderRadius:8, fontSize:13 }}>
        <strong>Error:</strong> {this.state.error.message}
      </div>
    )
    return this.props.children
  }
}

const TABS = [
  { key: 'details',    label: '📋 Details' },
  { key: 'attendance', label: '✅ Attendance' },
  { key: 'payments',   label: '💳 Payments' },
]

export default function TuitionDetailModal({ tuitionId, onClose }) {
  const [activeTab,  setActiveTab]  = useState('details')
  const [editOpen,   setEditOpen]   = useState(false)

  const tuitions       = useDataStore((s) => s.tuitions)
  const tutors         = useDataStore((s) => s.tutors)
  const updateTuition  = useDataStore((s) => s.updateTuition)
  const user           = useAuthStore((s) => s.user)
  const isManager      = user?.role === 'manager'
  const canWrite       = isManager || user?.role === 'coordinator'

  const t     = tuitions.find((t) => t.id === tuitionId)
  const tutor = tutors.find((tu) => tu.id === t?.tutorId)

  if (!t) return null

  async function handleToggle() {
    const action = t.active ? 'Deactivate' : 'Activate'
    if (!window.confirm(`${action} tuition for ${t.studentName}?`)) return
    try {
      await updateTuition(tuitionId, { active: !t.active })
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  }

  return (
    <>
      <Modal open onClose={onClose} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canWrite && <Button variant="secondary" onClick={() => setEditOpen(true)}>✏ Edit</Button>}
            {isManager && (
              <Button variant={t.active ? 'danger' : 'success'} onClick={handleToggle}>
                {t.active ? 'Deactivate Tuition' : 'Activate Tuition'}
              </Button>
            )}
          </>
        }
      >
        {/* Header */}
        <div className="mb-5 pb-4 border-b border-slate-100">
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
                Demo: {fd(t.demo)||'—'} &nbsp;·&nbsp; Start: {fd(t.start)} &nbsp;·&nbsp; {tutor?.name||'—'}
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 flex-shrink-0 ml-4">
              <div>Added by <strong className="text-slate-600">{t.createdBy||'—'}</strong></div>
              <div className="mt-0.5">
                {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'details'    && <DetailsTab tuition={t} tutor={tutor} />}
        {activeTab === 'attendance' && <AttErrorBoundary><AttendanceTab tuitionId={tuitionId} /></AttErrorBoundary>}
        {activeTab === 'payments'   && <PaymentsTab tuitionId={tuitionId} />}
      </Modal>

      {/* Edit modal — rendered outside parent modal via portal */}
      {editOpen && (
        <TuitionFormModal
          tuitionId={tuitionId}
          onClose={() => setEditOpen(false)}
          onSaved={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
