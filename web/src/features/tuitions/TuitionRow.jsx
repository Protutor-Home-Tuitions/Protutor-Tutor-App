/**
 * TuitionRow — one row in the tuitions table.
 */
import { useState, useEffect } from 'react'
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

// Derive status — fallback to active boolean for legacy records
function getStatus(t) {
  if (t.status) return t.status
  return t.active ? 'active' : 'inactive'
}

export default function TuitionRow({ tuition: t, prevMonth, onView, onEdit, onToggle, isManager, openMenuId, onToggleMenu }) {
  const tutors     = useDataStore((s) => s.tutors)
  const attendance = useDataStore((s) => s.attendance[t.enqId] || [])
  const status     = getStatus(t)

  const tutor = tutors.find((tu) => tu.id === t.tutorId)

  const startFmt = t.start
    ? `${parseInt(t.start.split('-')[2])} ${new Date(t.start + 'T00:00:00').toLocaleString('en-IN', { month: 'short' })}`
    : '—'

  const today  = new Date()
  const tAtt   = attendance.filter((a) => !a.isDemo).sort((a, b) => b.date.localeCompare(a.date))
  const lastAtt = tAtt[0] || null
  const isActiveOrIdle = status === 'active' || status === 'idle'

  function LastAttCell() {
    if (!lastAtt) {
      return (
        <div className={`flex items-center gap-1.5 ${isActiveOrIdle ? 'text-red-700' : 'text-slate-400'}`}>
          {isActiveOrIdle && WARN_ICON}
          <span className="text-xs font-semibold">Never</span>
        </div>
      )
    }
    const lastDate = new Date(lastAtt.date + 'T00:00:00')
    const diffDays = Math.floor((today - lastDate) / 86400000)
    const lastFmt  = `${String(lastDate.getDate()).padStart(2, '0')} ${lastDate.toLocaleString('en-IN', { month: 'short' })}`
    const isLate   = diffDays > 4 && isActiveOrIdle

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

  // Status badge
  function StatusBadge() {
    if (status === 'idle') return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FEF3C7', color: '#92400E' }}>
        ⏸ Idle
      </span>
    )
    return <Badge variant={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>
  }

  return (
    <tr className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100" onClick={() => onView(t.id)}>
      <td className="px-4 py-3">
        {t.enqId ? <span className="tag-id">{t.enqId}</span> : <span className="text-slate-400">—</span>}
        <div className="mt-1.5"><WAParentButton tuition={t} /></div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-medium text-sm">{startFmt}</td>
      <td className="px-4 py-3">
        <div className="font-semibold text-sm">{t.parentName || t.studentName}</div>
        <div className="text-xs text-slate-500 mt-0.5">Student: {t.studentName}</div>
        {t.parentPhone && <div className="text-xs text-slate-400">{t.parentPhone}</div>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">{t.standard} · {t.board}</td>
      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
        {t.days?.join(', ')}<br />
        <span className="text-slate-400">{t.duration}hr/day</span>
      </td>
      <td className="px-4 py-3 text-sm">
        {tutor ? (
          <>
            <div className="font-medium">{tutor.name}</div>
            <div className="text-xs text-slate-400">{tutor.phone}</div>
            <div className="mt-1.5"><WATutorButton tuition={t} /></div>
          </>
        ) : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="font-semibold text-sm">₹{t.feeParent}<span className="text-xs text-slate-400 font-normal">/{t.feeType}</span></div>
        <div className="text-xs mt-0.5" style={{ color: t.repeatPayment ? 'var(--success)' : 'var(--text3)' }}>
          {t.repeatPayment ? '↻ Repeat' : 'No repeat'}
        </div>
      </td>
      <td className="px-4 py-3"><LastAttCell /></td>
      <td className="px-4 py-3"><StatusBadge /></td>
      <td className="px-4 py-3" style={{ minWidth: 140 }}>
        <StatusDots tuition={t} prevMonth={prevMonth} />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          tuition={t}
          status={status}
          isManager={isManager}
          open={openMenuId === t.id}
          onToggleOpen={(id) => onToggleMenu(id === openMenuId ? null : id)}
          onView={() => onView(t.id)}
          onEdit={() => onEdit(t.id)}
          onToggle={onToggle}
        />
      </td>
    </tr>
  )
}

function ActionMenu({ tuition, status, onView, onEdit, onToggle, isManager, open, onToggleOpen }) {
  useEffect(() => {
    if (!open) return
    function handleClick() { onToggleOpen(null) }
    const timer = setTimeout(() => { document.addEventListener('click', handleClick) }, 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick) }
  }, [open])

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
        onClick={(e) => { e.stopPropagation(); onToggleOpen(tuition.id) }}
      >
        Actions
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-36 overflow-hidden">
          <button onClick={() => { onToggleOpen(null); onView() }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100">View</button>
          {isManager && <>
            <button onClick={() => { onToggleOpen(null); onEdit() }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100">Edit</button>
            {status !== 'active' && (
              <button onClick={() => { onToggleOpen(null); onToggle(tuition.id, 'activate') }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100" style={{ color: '#15803D' }}>
                Activate
              </button>
            )}
            {status !== 'idle' && (
              <button onClick={() => { onToggleOpen(null); onToggle(tuition.id, 'idle') }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100" style={{ color: '#92400E' }}>
                Set Idle
              </button>
            )}
            {status !== 'inactive' && (
              <button onClick={() => { onToggleOpen(null); onToggle(tuition.id, 'deactivate') }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50" style={{ color: '#DC2626' }}>
                Deactivate
              </button>
            )}
          </>}
        </div>
      )}
    </div>
  )
}
