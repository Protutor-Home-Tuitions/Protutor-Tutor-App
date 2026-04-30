/**
 * feeCalc.js
 * Pure functions for fee and billing amount calculation.
 * No side effects — identical logic to admin_1.html calcMonthFee.
 */

/**
 * Count weekdays (Mon–Fri) in a given month.
 * @param {number} year
 * @param {number} month - 1-indexed
 */
export function countWeekdaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow >= 1 && dow <= 5) count++
  }
  return count
}

/**
 * Calculate the billed amount for a month.
 * @param {object} tuition - tuition record with feeParent, feeType
 * @param {string} monthKey - 'YYYY-MM'
 * @param {array}  nonDemoAtt - attendance records for the month (non-demo only)
 * @returns {number|null} - floor amount in rupees, or null if no data
 */
export function calcMonthFee(tuition, monthKey, nonDemoAtt) {
  if (!tuition || !monthKey || !nonDemoAtt?.length) return null

  const feeParent = tuition.feeParent || 0
  const classes   = nonDemoAtt.length
  const hours     = nonDemoAtt.reduce((s, a) => s + parseFloat(a.dur || 0), 0)

  if (tuition.feeType === 'Session') {
    return Math.floor(feeParent * classes)
  }

  if (tuition.feeType === 'Hourly') {
    return Math.floor(feeParent * hours)
  }

  // Monthly: (fee / total weekdays in month) × classes conducted
  const [y, m] = monthKey.split('-').map(Number)
  const weekdays = countWeekdaysInMonth(y, m)
  return Math.floor((feeParent * classes) / weekdays)
}

/**
 * Derive tutor amount from parent amount using fee ratio.
 */
export function calcTutorAmount(tuition, amountP) {
  if (!tuition || !amountP || !tuition.feeParent) return 0
  return Math.floor(amountP * (tuition.feeTutor / tuition.feeParent))
}

/**
 * Build the calc string shown in billing snapshot.
 */
export function buildCalcStr(tuition, monthKey, nonDemoAtt) {
  const classes = nonDemoAtt?.length || 0
  const hours   = parseFloat(
    (nonDemoAtt || []).reduce((s, a) => s + parseFloat(a.dur || 0), 0).toFixed(1)
  )
  const feeParent = tuition?.feeParent || 0

  if (tuition?.feeType === 'Session') {
    return `${classes} classes × ₹${feeParent} = ₹${Math.floor(feeParent * classes)}`
  }
  if (tuition?.feeType === 'Hourly') {
    return `${hours} hrs × ₹${feeParent} = ₹${Math.floor(feeParent * hours)}`
  }
  const [y, m] = (monthKey || '2024-01').split('-').map(Number)
  const weekdays = countWeekdaysInMonth(y, m)
  return `${classes} classes × ₹${feeParent} ÷ ${weekdays} working days = ₹${Math.floor((feeParent * classes) / weekdays)}`
}

/**
 * Check if a tuition is eligible for billing.
 * Ineligible only when: commission fully absorbed AND repeatPayment is false.
 */
export function isBillingEligible(tuition, pendingComm) {
  if (!tuition) return false
  if (pendingComm > 0) return true       // commission still pending → eligible
  if (tuition.repeatPayment) return true // repeat enabled → always eligible
  return false                           // comm cleared + no repeat → ineligible
}
