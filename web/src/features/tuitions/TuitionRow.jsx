/**
 * TuitionRow — one row in the tuitions table.
 * Migrated from admin_1.html renderTuitions() tr template.
 */
import { useDataStore } from '@/store/dataStore'
import { fd, daysAgo, fmtMonthKey } from '@/utils/helpers'
import Badge from '@/components/ui/Badge'
import { WAParentButton, WATutorButton } from './components/WAButton'
import StatusDots from './components/StatusDots'

const WARN_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export default function TuitionRow({ tuition: t, prevMonth, onView, onEdit, onToggle }) {
  const tutors     = useDataStore((s) => s.tutors)
  const attendance = useDataStore((s) => s.attendance[t.enqId] || [])

  const tutor    = tutors.find((tu) => tu.id === t.tutorId)

  // Start date format: "5 Nov"
  const startFmt = t.start
    ? `${parseInt(t.start.split('-')[2])} ${new Date(t.start + 'T00:00:00').toLocaleString('en-IN', { month: 'short' })}`
    : '—'

  // Last attendance — non-demo, most recent
  const today   = new Date()
  const tAtt    = attendance
    .filter((a) => !a.isDemo)
    .sort((a, b) => b.date.localeCompare(a.date))
  const lastAtt = tAtt[0] || null

  function LastAttCell() {
    if (!lastAtt) return <span className="text-xs text-slate-400">Never</span>
    const lastDate = new Date(lastAtt.date + 'T00:00:00')
    const diffDays = Math.floor((today - lastDate) / 86400000)
    const lastFmt  = `${String(lastDate.getDate()).padStart(2, '0')} ${lastDate.toLocaleString('en-IN', { month: 'short' })}`
    const isLate   = diffDays > 5 && t.active

    return (
      <div className={`flex items-center gap-1.5 ${isLate ? 'text-red-700' : 'text-slate-600'}`}>
        {isLate && WARN_ICON}
        <div>
          <div className={`text-xs font-semibold ${isLate ? 'text-red-700' : ''}`}>{lastFmt}</div>
          <div className={`text-xs ${isLate ? 'text-red-500' : 'text-slate-400'}`}>
            {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`}
          </div>
        </div>
      </div>
    )
  }

  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100"
      onClick={() => onView(t.id)}
    >
      {/* Col 1: EnqID + WA Parent */}
      <td className="px-4 py-3">
        {t.enqId
          ? <span className="tag-id">{t.enqId}</span>
          : <span className="text-slate-400">—</span>}
        <div className="mt-1.5">
          <WAParentButton tuition={t} />
        </div>
      </td>

      {/* Col 2: Start date */}
      <td className="px-4 py-3 whitespace-nowrap font-medium text-sm">{startFmt}</td>

      {/* Col 3: Parent + Student */}
      <td className="px-4 py-3">
        <div className="font-semibold text-sm">{t.parentName || t.studentName}</div>
        <div className="text-xs text-slate-500 mt-0.5">Student: {t.studentName}</div>
        {t.parentPhone && <div className="text-xs text-slate-400">{t.parentPhone}</div>}
      </td>

      {/* Col 4: Standard + Board */}
      <td className="px-4 py-3 text-xs text-slate-600">{t.standard} · {t.board}</td>

      {/* Col 5: Schedule */}
      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
        {t.days?.join(', ')}<br />
        <span className="text-slate-400">{t.duration}hr/day</span>
      </td>

      {/* Col 6: Tutor + WA Tutor */}
      <td className="px-4 py-3 text-sm">
        {tutor ? (
          <>
            <div className="font-medium">{tutor.name}</div>
            <div className="text-xs text-slate-400">{tutor.phone}</div>
            <div className="mt-1.5">
              <WATutorButton tuition={t} />
            </div>
          </>
        ) : <span className="text-slate-400">—</span>}
      </td>

      {/* Col 7: Fee */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="font-semibold text-sm">₹{t.feeParent}<span className="text-xs text-slate-400 font-normal">/{t.feeType}</span></div>
        <div className="text-xs mt-0.5" style={{ color: t.repeatPayment ? 'var(--success)' : 'var(--text3)' }}>
          {t.repeatPayment ? '↻ Repeat' : 'No repeat'}
        </div>
      </td>

      {/* Col 8: Last Attendance */}
      <td className="px-4 py-3">
        <LastAttCell />
      </td>

      {/* Col 9: Active + Comm */}
      <td className="px-4 py-3">
        <Badge variant={t.active ? 'green' : 'red'}>
          {t.active ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      {/* Col 10: Status dots */}
      <td className="px-4 py-3" style={{ minWidth: 140 }}>
        <StatusDots tuition={t} prevMonth={prevMonth} />
      </td>

      {/* Col 11: Actions */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          tuition={t}
          onView={() => onView(t.id)}
          onEdit={() => onEdit(t.id)}
          onToggle={() => onToggle(t.id, t.active ? 'deactivate' : 'activate')}
        />
      </td>
    </tr>
  )
}

function ActionMenu({ tuition, onView, onEdit, onToggle }) {
  return (
    <div className="relative group">
      <button
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          e.currentTarget.nextSibling.classList.toggle('hidden')
        }}
      >
        Actions
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className="hidden absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-32 overflow-hidden">
        <button onClick={onView} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100">View</button>
        <button onClick={onEdit} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100">Edit</button>
        <button
          onClick={onToggle}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50"
          style={{ color: tuition.active ? '#DC2626' : '#15803D' }}
        >
          {tuition.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  )
}
