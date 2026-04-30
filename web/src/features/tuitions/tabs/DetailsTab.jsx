import Badge from '@/components/ui/Badge'
import { fd } from '@/utils/helpers'

function VCell({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-4 py-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-700">{value || '—'}</div>
    </div>
  )
}

export default function DetailsTab({ tuition: t, tutor }) {
  const feeCompany = t.feeParent - t.feeTutor

  return (
    <div className="space-y-4">
      {/* Student & Parent */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Student Details</p>
        <div className="grid grid-cols-3 gap-3">
          <VCell label="Student Name"  value={t.studentName} />
          <VCell label="Standard"      value={t.standard} />
          <VCell label="Board"         value={t.board} />
          <VCell label="Parent Name"   value={t.parentName} />
          <VCell label="Parent Phone"  value={t.parentPhone} />
          <VCell label="City"          value={t.city} />
        </div>
      </div>

      {/* Class details */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Class Details</p>
        <div className="grid grid-cols-3 gap-3">
          <VCell label="Subjects"       value={t.subjects?.join(', ')} />
          <VCell label="Days"           value={t.days?.join(', ')} />
          <VCell label="Duration"       value={`${t.duration} hr/day`} />
          <VCell label="Demo Date"      value={fd(t.demo)} />
          <VCell label="Start Date"     value={fd(t.start)} />
          <VCell label="Tutor"          value={tutor ? `${tutor.name} · ${tutor.phone}` : '—'} />
        </div>
      </div>

      {/* Fee details */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Fee Details</p>
        <div className="grid grid-cols-3 gap-3">
          <VCell label="Fee (Parent)"   value={`₹${t.feeParent}/${t.feeType}`} />
          <VCell label="Fee (Tutor)"    value={`₹${t.feeTutor}/${t.feeType}`} />
          <VCell label="Fee (Company)"  value={`₹${feeCompany}/${t.feeType}`} />
          <VCell label="Commission"     value={t.commission ? `₹${t.commission}` : '—'} />
          <VCell label="Repeat"         value={t.repeatPayment ? '↻ Yes — Repeat' : 'No'} />
          <VCell label="Fee Type"       value={t.feeType} />
        </div>
      </div>

      {/* Audit */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Record Info</p>
        <div className="grid grid-cols-3 gap-3">
          <VCell label="Created By"   value={t.createdBy} />
          <VCell label="Created At"   value={t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
          <VCell label="Tuition UUID" value={<span className="font-mono text-xs text-slate-400 break-all">{t.id}</span>} />
        </div>
      </div>
    </div>
  )
}
