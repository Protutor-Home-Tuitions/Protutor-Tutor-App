export const MN_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MN_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const ALL_CITIES = ['Bangalore', 'Chennai', 'Mumbai', 'Hyderabad', 'Pune', 'Others']
export const ROLE_LABELS = { manager: 'Manager (Admin)', coordinator: 'Coordinator', support: 'Support' }
export const BOARDS = ['CBSE', 'ICSE', 'State', 'IB', 'IGCSE']
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function fd(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${MN_SHORT[parseInt(m) - 1]}/${y.slice(2)}`
}
export function fmtMonthKey(mk) {
  if (!mk) return '—'
  const [y, m] = mk.split('-')
  return `${MN_SHORT[parseInt(m)-1]} ${y.slice(2)}`
}
export function fmtStartDate(dateStr) {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d)} ${MN_FULL[parseInt(m)-1]}`
}
export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}
export function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr+'T00:00:00').getTime()) / 86400000)
}
export function countWeekdaysInMonth(year, month) {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month-1, d).getDay()
    if (dow >= 1 && dow <= 5) count++
  }
  return count
}

// ─────────────────────────────────────────────────────────────
// FEE CALCULATION ENGINE
// Supports 4 cases based on parentFeeType + tutorFeeType:
//   Case 1: Monthly / Monthly   — calendar or fixed working hours
//   Case 2: Hourly|Session / Hourly|Session (same type)
//   Case 3: Hourly|Session / Monthly
//   Case 4: Hourly|Session / Hourly|Session (different types)
// ─────────────────────────────────────────────────────────────

/**
 * Count how many days in a month match the tuition schedule.
 * e.g. tuition has ['Mon','Wed','Fri'] — counts only Mon/Wed/Fri in that month.
 */
export function countScheduledDaysInMonth(year, month, scheduledDays) {
  if (!scheduledDays?.length) return 0
  const DOW_MAP = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }
  const targetDows = scheduledDays.map((d) => DOW_MAP[d]).filter((d) => d !== undefined)
  if (!targetDows.length) return 0
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (targetDows.includes(dow)) count++
  }
  return count
}

/**
 * Get working hours for a tuition in a given month.
 * Case 1 calendar: count actual scheduled days in calendar month × duration
 * Case 1 fixed:    days/week × duration × 4
 * Case 3 tutor:    always days/week × duration × 4 (never calendar)
 * Returns 0 if data missing (guard against division by zero upstream).
 */
export function getWorkingHours(tuition, monthKey, forceFixed = false) {
  const dur      = parseFloat(tuition?.duration || 0)
  const daysArr  = tuition?.days || []
  const daysPerWeek = daysArr.length
  if (!dur || !daysPerWeek) return 0

  const useFixed = forceFixed || tuition?.calcMode === 'fixed'

  if (useFixed) {
    return parseFloat((daysPerWeek * dur * 4).toFixed(4))
  }

  // Calendar mode — count actual scheduled days in that month
  if (!monthKey) return 0
  const [y, m] = monthKey.split('-').map(Number)
  const scheduledDays = countScheduledDaysInMonth(y, m, daysArr)
  return parseFloat((scheduledDays * dur).toFixed(4))
}

/**
 * Get effective hourly rate for a fee amount.
 * Returns number with 2 decimal precision.
 * Returns null if calculation not possible.
 */
export function calcEffHourly(fee, feeType, tuition, monthKey, forceFixed = false) {
  if (!fee || !feeType) return null
  const f = parseFloat(fee)
  if (!f) return null

  if (feeType === 'Hourly') {
    return parseFloat(f.toFixed(2))
  }

  if (feeType === 'Session') {
    const dur = parseFloat(tuition?.duration || 0)
    if (!dur) return null
    return parseFloat((f / dur).toFixed(2))
  }

  if (feeType === 'Monthly') {
    const workingHrs = getWorkingHours(tuition, monthKey, forceFixed)
    if (!workingHrs) return null
    return parseFloat((f / workingHrs).toFixed(2))
  }

  return null
}

/**
 * Calculate parent amount for a given month's attendance.
 * Returns rounded integer or null if no attendance.
 */
export function calcParentAmount(tuition, monthKey, nonDemoAtt) {
  if (!tuition || !monthKey || !nonDemoAtt?.length) return null

  const feeType = tuition.parentFeeType || tuition.feeType
  const fee     = parseFloat(tuition.feeParent || 0)
  if (!fee || !feeType) return null

  const actualHours = nonDemoAtt.reduce((s, a) => s + parseFloat(a.dur || 0), 0)
  if (!actualHours) return 0

  const effHourly = calcEffHourly(fee, feeType, tuition, monthKey, false)
  if (effHourly === null) return null

  return Math.round(effHourly * actualHours)
}

/**
 * Calculate tutor amount for a given month's attendance.
 * For tutor Monthly: always uses fixed formula (days/week × dur × 4), not calendar.
 * Returns rounded integer or null if no attendance.
 */
export function calcTutorAmount(tuition, monthKey, nonDemoAtt) {
  if (!tuition || !monthKey || !nonDemoAtt?.length) return null

  const feeType = tuition.tutorFeeType || tuition.feeType
  const fee     = parseFloat(tuition.feeTutor || 0)
  if (!fee || !feeType) return null

  const actualHours = nonDemoAtt.reduce((s, a) => s + parseFloat(a.dur || 0), 0)
  if (!actualHours) return 0

  // Case 1 (both Monthly): tutor uses calcMode (calendar or fixed) — same as parent
  // Case 3 (parent Hourly/Session, tutor Monthly): always fixed (days/wk × dur × 4)
  const parentType = tuition.parentFeeType || tuition.feeType
  const bothMonthly = parentType === 'Monthly' && feeType === 'Monthly'
  const forceFixed = feeType === 'Monthly' && !bothMonthly
  const effHourly  = calcEffHourly(fee, feeType, tuition, monthKey, forceFixed)
  if (effHourly === null) return null

  return Math.round(effHourly * actualHours)
}

/**
 * Calculate company fee = parent amount - tutor amount.
 * Returns null if either amount is null.
 */
export function calcCompanyFee(tuition, monthKey, nonDemoAtt) {
  const p = calcParentAmount(tuition, monthKey, nonDemoAtt)
  const t = calcTutorAmount(tuition, monthKey, nonDemoAtt)
  if (p === null || t === null) return null
  return p - t
}

/**
 * Estimate company fee at tuition-creation time (no attendance yet).
 * Used in the form and tuition display.
 */
export function estimateCompanyFee(tuition) {
  const pFeeType = tuition.parentFeeType || tuition.feeType
  const tFeeType = tuition.tutorFeeType  || tuition.feeType
  const feeP     = parseFloat(tuition.feeParent || 0)
  const feeT     = parseFloat(tuition.feeTutor  || 0)
  const dur      = parseFloat(tuition.duration  || 0)
  const daysPerWeek = (tuition.days || []).length

  if (!feeP || !feeT || !dur || !daysPerWeek) return null

  const workingHrsFixed = daysPerWeek * dur * 4 // always fixed for estimate

  // Effective hourly estimates
  let pEff, tEff

  if (pFeeType === 'Monthly')      pEff = feeP / workingHrsFixed
  else if (pFeeType === 'Hourly')  pEff = feeP
  else if (pFeeType === 'Session') pEff = feeP / dur
  else return null

  if (tFeeType === 'Monthly')      tEff = feeT / workingHrsFixed
  else if (tFeeType === 'Hourly')  tEff = feeT
  else if (tFeeType === 'Session') tEff = feeT / dur
  else return null

  const estimatedP = Math.round(pEff * workingHrsFixed)
  const estimatedT = Math.round(tEff * workingHrsFixed)
  return estimatedP - estimatedT
}

export function calcMonthFee(tuition, monthKey, nonDemoAtt) {
  // Backward-compatible wrapper — returns parent amount
  return calcParentAmount(tuition, monthKey, nonDemoAtt)
}
export function isBillingEligible(tuition, pendingComm) {
  if (!tuition) return false
  // Idle tuitions are NOT eligible for billing
  const status = tuition.status || (tuition.active ? 'active' : 'inactive')
  if (status === 'idle' || status === 'inactive') return false
  return pendingComm > 0 || tuition.repeatPayment
}
export function buildCommissionChain(enqId, billings, paymentsObj) {
  const pData = paymentsObj[enqId] || []
  const active = billings.filter(b => b.enqId===enqId && b.status!=='voided').sort((a,b) => a.monthKey.localeCompare(b.monthKey))
  let absorbed = 0
  return active.map(bill => {
    const commCap = Math.floor(bill.snapCommission ?? bill.snapshot?.commission ?? 0)
    const amountT = Math.floor(bill.snapAmountT ?? bill.snapshot?.amountT ?? 0)
    const amountP = Math.floor(bill.snapAmountP ?? bill.snapshot?.amountP ?? 0)
    const remaining = Math.max(0, commCap - absorbed)
    const commAbsorbed = Math.min(amountT, remaining)
    const tutorXfer = amountT - commAbsorbed
    const payRow = pData.filter(p => p.monthKey===bill.monthKey && p.paymentStatus!=='Voided').slice(-1)[0]
    const effectiveXfer = payRow?.transferAmtOverride != null ? payRow.transferAmtOverride : tutorXfer
    const paid = payRow?.paymentStatus === 'Success'
    const xferDone = effectiveXfer <= 0 || !!(payRow?.utr && ['Created','Settled','Completed','Initiated'].includes(payRow.transferStatus))
    const flowComplete = bill.zeroBill ? true : paid && xferDone
    if (flowComplete) absorbed += commAbsorbed
    return { monthKey: bill.monthKey, commCap, amountT, amountP, commAbsorbed, tutorXfer, effectiveXfer, flowComplete, zeroBill: !!bill.zeroBill }
  })
}
export function calcPendingComm(enqId, tuition, billings, paymentsObj) {
  const chain = buildCommissionChain(enqId, billings, paymentsObj)
  if (!chain.length) return Math.floor(tuition?.commission || 0)
  const latestCap = chain[chain.length-1].commCap
  const totalAbsorbed = chain.filter(m => m.flowComplete).reduce((s,m) => s+m.commAbsorbed, 0)
  return Math.max(0, latestCap - totalAbsorbed)
}
export function isFlowComplete(enqId, monthKey, billings, paymentsObj) {
  const bill = billings.find(b => b.enqId===enqId && b.monthKey===monthKey && b.status!=='voided')
  if (!bill) return false
  if (bill.zeroBill) return true
  return buildCommissionChain(enqId, billings, paymentsObj).find(m => m.monthKey===monthKey)?.flowComplete || false
}
export function buildTutorWAMessage({ tuition, tutor, senderName }) {
  const startDate = fmtStartDate(tuition.start)
  const daysCount = tuition.days?.length || 0

  return [
    `Dear ${tutor?.name || 'Tutor'},`,
    `Regarding ${tuition.parentName || tuition.studentName} client – ${tuition.parentPhone || ''}`,
    `As discussed, the classes have started from ${startDate} for ${tuition.studentName}.`,
    '',
    '*Final Class Plan & Fee Structure*',
    `• Weekly ${daysCount} days, ${tuition.duration} hours/day`,
    `• Fee: ₹${tuition.feeTutor}/${tuition.tutorFeeType || tuition.feeType} (Offline class)`,
    '',
    '*Deduction & Payment Terms*',
    `• ProTutor's fee: ₹${tuition.commission || '—'} (2 weeks fee)`,
    '• Remaining amount will be paid to you after deduction.',
    '• Billing cycle: Month-end (30th/31st)',
    '• Payment will be collected by ProTutor and released to you after deduction on the next day.',
    '• Payments will be *handled by ProTutor everymonth*',
    '',
    '*Attendance & Payment Process (Important)*',
    '• Mark attendance daily without fail for timely payment',
    '• Login: https://attendance.protutor.co.in',
    '• Username & password shared via 9626080470 (check whatsapp)',
    '• At month-end, verify and submit final attendance in the app',
    '• Update your bank account details in the app (if not already done)',
    '',
    '*Important Guidelines*',
    'Kindly confirm once the first class is completed',
    'Maintain attendance regularly in the system',
    'Inform us if classes are paused/cancelled within 3 months',
    'Any direct payment from parent without consent is a policy violation and will affect future opportunities',
    'Future tuition opportunities depend on performance and feedback',
    '',
    '*Fee Calculation Method*',
    '• Payable Fee(Hour & Session basis) = (Per hour/session fee) × (Actual hours/session conducted)',
    '• Payable Fee(month basis) = (Monthly fee/Total working days) × (Actual no.of classes conducted)',
    '• Total working days = Number of weekdays (Monday to Friday) in the month',
    '',
    'For any support or queries, please contact our team.',
    '',
    'Regards,',
    senderName || 'ProTutor Team',
    'ProTutor',
  ].join('\n')
}

export function buildParentWAMessage({ tuition, tutor, senderName }) {
  const startDate = fmtStartDate(tuition.start)
  const daysCount = tuition.days?.length || 0

  return [
    `Dear ${tuition.parentName || tuition.studentName},`,
    `${tutor?.name || 'Your tutor'} has been assigned to start classes for your child from ${startDate}.`,
    '',
    '*Class Details*',
    `• ${daysCount} days/week, ${tuition.duration} hours/day`,
    `• Fee: ₹${tuition.feeParent}/${tuition.parentFeeType || tuition.feeType}`,
    '',
    '*Payment Policy*',
    'All payments must be made only to ProTutor via the official payment link.',
    '⚠️Direct payment to the tutor is not permitted. Any such payment may lead to cancellation of services and discontinuation of support from ProTutor.',
    '',
    '*Payment Process*',
    '• This is a post-payment model (month-end)(offline only)',
    '• Tutor will maintain attendance records and notified to you when attendance is marked.',
    '• Based on attendance, ProTutor will share the payment link at month-end (30th/31st)',
    '',
    '*Fee Calculation Method*',
    '• Payable Fee(Hour & Session basis) = (Per hour/session fee) × (Actual hours/session conducted)',
    '• Payable Fee(month basis) = (Monthly fee/Total working days) × (Actual no.of classes conducted)',
    '• Total working days = Number of weekdays (Monday to Friday) in the month',
    '',
    'Note',
    '• Tutors will not ask for any advance payment.',
    '',
    'Regards,',
    senderName || 'ProTutor Team',
    'ProTutor',
  ].join('\n')
}
export function openWhatsApp(phone, message) {
  window.open(`https://api.whatsapp.com/send/?phone=91${phone}&text=${encodeURIComponent(message)}`,'_blank')
}
