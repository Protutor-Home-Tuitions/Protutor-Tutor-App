import { useState, useEffect, useMemo } from 'react'
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { calcMonthFee, MN_FULL, fd, currentMonthKey } from '@/utils/helpers'
import AddAttModal from './AddAttModal'

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildMonthList(startDate, attendance) {
  const monthSet = new Set()
  if (startDate) {
    const now = new Date()
    let cur = new Date(startDate.slice(0,7) + '-01')
    while (cur <= now) {
      monthSet.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`)
      cur.setMonth(cur.getMonth()+1)
    }
  }
  attendance.forEach((a) => {
    const [y,m] = a.date.split('-')
    monthSet.add(`${y}-${m}`)
  })
  return [...monthSet].sort((a,b) => b.localeCompare(a))
}

export default function AttendanceTab({ tuitionId, tutorId }) {
  const [activeMonth,  setActiveMonth]  = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingAtt,   setEditingAtt]   = useState(null)

  const tuitions       = useDataStore((s) => s.tuitions)
  const tutors         = useDataStore((s) => s.tutors)
  const attMap         = useDataStore((s) => s.attendance)
  const billingsMap    = useDataStore((s) => s.billings)
  const attCompletions = useDataStore((s) => s.attCompletions)
  const fetchDetail    = useDataStore((s) => s.fetchTuitionDetail)

  const user          = useAuthStore((s) => s.user)
  // Fallback to localStorage in case Zustand hasn't hydrated yet
  const effectiveUser = user || (() => { try { return JSON.parse(localStorage.getItem('protutor-auth'))?.state?.user } catch { return null } })()
  const isManager     = effectiveUser?.role === 'manager'
  const isCoordinator = effectiveUser?.role === 'coordinator'
  const canWrite      = isManager || isCoordinator

  const t      = tuitions.find((t) => t.id === tuitionId)
  const enqId  = t?.enqId
  const tutor  = tutors.find((tu) => tu.id === t?.tutorId)
  const allAtt   = attMap[enqId]   || []
  const billings = billingsMap[enqId] || []

  useEffect(() => {
    if (enqId) fetchDetail(enqId)
  }, [enqId])

  const months   = useMemo(() => buildMonthList(t?.start, allAtt), [t?.start, allAtt])
  const monthKey = (activeMonth && months.includes(activeMonth)) ? activeMonth : (months[0] || null)

  const monthAtt     = monthKey ? allAtt.filter((a) => a.date.startsWith(monthKey) && !a.isDemo) : []
  const viewRows     = monthKey ? [...allAtt.filter((a) => a.date.startsWith(monthKey))].sort((a,b) => b.date.localeCompare(a.date)) : []
  const totalClasses = monthAtt.length
  const totalHours   = parseFloat(monthAtt.reduce((s,a) => s + parseFloat(a.dur||0), 0).toFixed(1))
  const monthFee     = t && monthKey ? calcMonthFee(t, monthKey, monthAtt) : null

  const thisMonth    = currentMonthKey()
  const attComp      = monthKey ? attCompletions[`${enqId}_${monthKey}`] : null
  const attSubmitted = !!attComp
  const activeBill   = monthKey ? billings.find((b) => b.monthKey === monthKey && b.status !== 'voided') : null
  const newerBill    = monthKey ? billings.find((b) => b.monthKey > monthKey && b.status !== 'voided') : null

  if (!t) return <div className="p-4 text-slate-400 text-sm">Tuition not found.</div>

  return (
    <div>
      {/* DEBUG - remove after fix */}
      <div style={{fontSize:11,color:'red',marginBottom:8}}>
        user: {effectiveUser?.name} | role: {effectiveUser?.role} | canWrite: {String(canWrite)}
      </div>

      {/* Month pills + Add button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Select Month</p>
        {canWrite && (
          <button onClick={(e) => { e.stopPropagation(); setEditingAtt(null); setAddModalOpen(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">
            + Add Attendance
          </button>
        )}
      </div>

      {/* Month pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth:'thin' }}>
        {months.length === 0
          ? <span className="text-sm text-slate-400">No months yet</span>
          : months.map((mk) => {
              const [y,m] = mk.split('-')
              const lbl   = MN_FULL[parseInt(m)-1].slice(0,3) + ' ' + y.slice(2)
              const cnt   = allAtt.filter((a) => a.date.startsWith(mk) && !a.isDemo).length
              const active = mk === monthKey
              return (
                <button key={mk} onClick={() => setActiveMonth(mk)}
                  className="flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-all"
                  style={{ fontWeight: active ? 600 : 400, border: `1.5px solid ${active ? '#1A56DB' : '#E2E8F0'}`, background: active ? '#1A56DB' : 'white', color: active ? 'white' : '#475569' }}>
                  {lbl}
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: active ? 'rgba(255,255,255,0.28)' : '#F1F5F9', color: active ? 'white' : '#64748B' }}>
                    {cnt}
                  </span>
                </button>
              )
            })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background:'#EFF6FF' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'#1A56DB' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/></svg>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color:'#1A56DB' }}>{totalClasses}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color:'#3B6FBF' }}>Total Classes</div>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background:'#F0FDF4', border:'1.5px solid #BBF7D0' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'#16A34A' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color:'#15803D' }}>{totalHours}hr</div>
            <div className="text-xs font-medium mt-0.5" style={{ color:'#166534' }}>Total Duration</div>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background:'#FDF4FF', border:'1.5px solid #E9D5FF' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:'#9333EA' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color:'#7E22CE' }}>{monthFee !== null ? `₹${monthFee.toLocaleString('en-IN')}` : '—'}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color:'#6B21A8' }}>Amount · Fee (P)</div>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm font-semibold text-slate-700">
          Attendance Records <span className="font-normal text-slate-400">({viewRows.length} total)</span>
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF */}
          <button onClick={(e) => { e.stopPropagation(); downloadPDF(t, tutor, allAtt, monthKey) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </button>

          {/* Att submitted badge */}
          {attSubmitted && attComp && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 whitespace-nowrap">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              Att submitted · {new Date(attComp.completedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})} · {attComp.completedBy}
            </div>
          )}

          {/* Billing button */}
          {monthKey && monthKey <= thisMonth && (
            activeBill
              ? activeBill.zeroBill
                ? <div className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg">₹0 — No Classes</div>
                : <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Billing Created
                  </div>
              : canWrite
                ? newerBill
                  ? <span className="text-xs text-slate-400 italic">Locked — newer bill exists</span>
                  : !attSubmitted
                    ? <span className="text-xs text-slate-400 italic">Awaiting att submission</span>
                    : <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
                        Create Billing
                      </button>
                : null
          )}
        </div>
      </div>

      {/* Attendance table */}
      {viewRows.length === 0
        ? <div className="text-center py-10 text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">No attendance recorded for this period.</div>
        : <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="grid bg-slate-50 border-b border-slate-200"
              style={{ gridTemplateColumns:'100px 75px 90px 110px 1fr 140px 100px 1fr 36px' }}>
              {['Date','Time','Duration','Subject','Topic','Marked On','Marked By','Parent Comment',''].map((h) => (
                <div key={h} className="px-3 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {viewRows.map((a, i) => {
              const dow  = DOW[new Date(a.date+'T00:00:00').getDay()]
              const mt   = a.markedAt ? new Date(a.markedAt) : null
              const md   = mt ? `${String(mt.getDate()).padStart(2,'0')}/${String(mt.getMonth()+1).padStart(2,'0')}/${String(mt.getFullYear()).slice(2)}` : null
              const mtime = mt ? mt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : null
              const durMismatch = !a.isDemo && t?.duration && String(a.dur) !== String(t.duration)
              const rowBg = a.isDemo ? '#FEFCE8' : i % 2 !== 0 ? '#FAFBFC' : 'white'
              return (
                <div key={a.id} className="grid border-b border-slate-100 items-center"
                  style={{ gridTemplateColumns:'100px 75px 90px 110px 1fr 140px 100px 1fr 36px', background:rowBg }}>
                  <div className="px-3 py-2.5">
                    <div className="text-sm font-semibold">{fd(a.date)}</div>
                    <div className="text-xs text-slate-400">{dow}</div>
                    {a.isDemo && <span className="mt-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold inline-block">DEMO</span>}
                  </div>
                  <div className="px-3 py-2.5 text-sm text-slate-600">{a.time}</div>
                  <div className="px-3 py-2.5 flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${durMismatch ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{a.dur}hr</span>
                  </div>
                  <div className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">{a.subj||'—'}</span></div>
                  <div className="px-3 py-2.5 text-sm text-slate-600">{a.topic||'—'}</div>
                  <div className="px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
                    {md ? <>{md}<br/><span className="text-slate-400">{mtime}</span></> : '—'}
                  </div>
                  <div className="px-3 py-2.5 text-xs text-slate-600">{a.markedBy||'—'}</div>
                  <div className="px-3 py-2.5 text-xs">{a.parentComment ? <span className="text-blue-600">{a.parentComment}</span> : <span className="text-slate-300">—</span>}</div>
                  <div className="px-2 py-2.5">
                    {canWrite && (
                      <button onClick={(e) => { e.stopPropagation(); setEditingAtt(a); setAddModalOpen(true) }}
                        className="p-1 text-slate-400 hover:text-blue-600" title="Edit">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Add/Edit modal */}
      {addModalOpen && (
        <AddAttModal
          tuitionId={tuitionId}
          tutorId={tutorId ?? t?.tutorId ?? null}
          existingRecord={editingAtt}
          allAtt={allAtt}
          onClose={() => { setAddModalOpen(false); setEditingAtt(null) }}
          defaultMonth={monthKey}
          onSaved={(mk) => setActiveMonth(mk)}
        />
      )}
    </div>
  )
}

function downloadPDF(t, tutor, allAtt, monthKey) {
  if (!t) return
  const monthAtt   = monthKey ? allAtt.filter((a) => a.date.startsWith(monthKey)) : allAtt
  const nonDemo    = monthAtt.filter((a) => !a.isDemo)
  const totalHours = parseFloat(nonDemo.reduce((s,a) => s+parseFloat(a.dur||0),0).toFixed(1))
  const monthFee   = calcMonthFee(t, monthKey, nonDemo)
  const [y,m]      = monthKey ? monthKey.split('-') : ['','']
  const monthLabel = m ? MN_FULL[parseInt(m)-1]+' '+y : 'All'
  const rows = [...monthAtt].sort((a,b) => b.date.localeCompare(a.date)).map((a) => {
    const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(a.date+'T00:00:00').getDay()]
    const mt  = a.markedAt ? new Date(a.markedAt) : null
    const ms  = mt ? `${String(mt.getDate()).padStart(2,'0')}/${String(mt.getMonth()+1).padStart(2,'0')}/${String(mt.getFullYear()).slice(2)} ${mt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}` : '—'
    return `<tr style="${a.isDemo?'background:#fefce8;':''}"><td>${fd(a.date)}<br><small>${dow}</small>${a.isDemo?'<br><span style="font-size:9px;background:#fef9c3;color:#ca8a04;padding:1px 4px;border-radius:3px;font-weight:700">DEMO</span>':''}</td><td>${a.time}</td><td>${a.dur}hr</td><td>${a.subj||'—'}</td><td>${a.topic||'—'}</td><td style="font-size:11px">${ms}</td></tr>`
  }).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attendance — ${t.parentName||t.studentName} — ${monthLabel}</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;margin:30px}h2{font-size:18px;margin-bottom:4px}.meta{font-size:12px;color:#475569;margin-bottom:16px;line-height:1.8}.stats{display:flex;gap:20px;margin-bottom:16px}.stat{background:#f7f9ff;border:1px solid #dbeafe;border-radius:8px;padding:10px 18px;text-align:center}.stat-val{font-size:20px;font-weight:700;color:#1A56DB}.stat-lbl{font-size:11px;color:#64748B}table{width:100%;border-collapse:collapse}th{background:#1A56DB;color:white;padding:8px 10px;font-size:11px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;vertical-align:top}tr:nth-child(even){background:#F7F9FF}</style></head>
  <body><h2>${t.parentName||t.studentName} — ${t.studentName}</h2>
  <div class="meta">Enquiry: ${t.enqId} | Tutor: ${tutor?.name||'—'} | Month: ${monthLabel}<br>Subjects: ${t.subjects?.join(', ')} | Days: ${t.days?.join(', ')} | ${t.duration}hr/day</div>
  <div class="stats"><div class="stat"><div class="stat-val">${nonDemo.length}</div><div class="stat-lbl">Classes</div></div><div class="stat"><div class="stat-val">${totalHours}hr</div><div class="stat-lbl">Hours</div></div><div class="stat"><div class="stat-val">${monthFee!==null?'₹'+monthFee.toLocaleString('en-IN'):'—'}</div><div class="stat-lbl">Fee (Parent)</div></div></div>
  <table><thead><tr><th>Date</th><th>Time</th><th>Duration</th><th>Subject</th><th>Topic</th><th>Marked On</th></tr></thead><tbody>${rows}</tbody></table>
  <p style="margin-top:20px;font-size:11px;color:#94A3B8">Generated by ProTutor Admin · ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</p>
  </body></html>`
  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 500)
}
