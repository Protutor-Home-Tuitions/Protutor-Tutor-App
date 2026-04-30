/**
 * commission.js
 * Snapshot-based commission absorption chain.
 *
 * Rules:
 * - Each billing's snapshot.commission is the total cap AT THAT BILLING's creation time.
 * - Chain runs chronologically through flow-complete months only.
 * - Changing t.commission on the tuition only affects NEW billings (not old snapshots).
 * - ₹0 bills absorb nothing.
 */

/**
 * Get the active (non-voided) payment row for a given month.
 */
function getActivePaymentRow(payments, enqId, monthKey) {
  const rows = payments[enqId] || []
  return rows
    .filter((p) => p.monthKey === monthKey && p.paymentStatus !== 'Voided')
    .slice(-1)[0] || null
}

/**
 * Check if a single billing month's flow is complete.
 * A month is flow-complete when:
 *   - paymentStatus === 'Success' AND
 *   - either transferAmt === 0 OR (utr exists AND transferStatus is settled)
 */
function isSingleMonthFlowComplete(bill, payRow, calcXfer) {
  if (!payRow || payRow.paymentStatus !== 'Success') return false
  if (bill?.zeroBill) return true

  const effectiveXfer =
    payRow.transferAmtOverride != null ? payRow.transferAmtOverride : calcXfer

  if (effectiveXfer <= 0) return true
  return !!(
    payRow.utr &&
    ['Created', 'Settled', 'Completed', 'Initiated'].includes(payRow.transferStatus)
  )
}

/**
 * Build the full commission chain for a tuition.
 * Returns an array of month objects with calculated amounts.
 *
 * @param {string}   enqId
 * @param {array}    billings    - all billings array
 * @param {object}   payments    - payments object { [enqId]: [...] }
 * @returns {array}  monthCalcs  - [{ monthKey, commCap, amountT, commAbsorbed, tutorXfer, effectiveXfer, flowComplete }]
 */
export function buildCommissionChain(enqId, billings, payments) {
  const activeBillings = billings
    .filter((b) => b.enqId === enqId && b.status !== 'voided')
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))

  let alreadyAbsorbed = 0
  const chain = []

  for (const bill of activeBillings) {
    const snap     = bill.snapshot
    const commCap  = Math.floor(snap.commission || 0)
    const amountT  = Math.floor(snap.amountT || 0)
    const remaining   = Math.max(0, commCap - alreadyAbsorbed)
    const commAbsorbed = Math.min(amountT, remaining)
    const tutorXfer   = amountT - commAbsorbed

    const payRow = getActivePaymentRow(payments, enqId, bill.monthKey)
    const effectiveXfer =
      payRow?.transferAmtOverride != null ? payRow.transferAmtOverride : tutorXfer

    const flowComplete = isSingleMonthFlowComplete(bill, payRow, tutorXfer)

    if (flowComplete) alreadyAbsorbed += commAbsorbed

    chain.push({
      monthKey:      bill.monthKey,
      commCap,
      amountT,
      amountP:       Math.floor(snap.amountP || 0),
      commAbsorbed,
      tutorXfer,
      effectiveXfer,
      flowComplete,
      zeroBill:      !!bill.zeroBill,
    })
  }

  return chain
}

/**
 * Calculate pending commission for a tuition.
 * Returns the remaining commission not yet absorbed.
 */
export function calcPendingComm(enqId, tuition, billings, payments) {
  const chain = buildCommissionChain(enqId, billings, payments)
  if (!chain.length) return Math.floor(tuition?.commission || 0)

  const latestCap = chain[chain.length - 1].commCap
  const totalAbsorbed = chain
    .filter((m) => m.flowComplete)
    .reduce((s, m) => s + m.commAbsorbed, 0)

  return Math.max(0, latestCap - totalAbsorbed)
}

/**
 * Check if the payment flow for a specific month is complete.
 */
export function isFlowComplete(enqId, monthKey, billings, payments) {
  const activeBill = billings.find(
    (b) => b.enqId === enqId && b.monthKey === monthKey && b.status !== 'voided'
  )
  if (!activeBill) return false
  if (activeBill.zeroBill) return true

  const chain = buildCommissionChain(enqId, billings, payments)
  const month = chain.find((m) => m.monthKey === monthKey)
  return month?.flowComplete || false
}
