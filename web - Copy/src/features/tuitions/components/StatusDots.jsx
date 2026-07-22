/**
 * StatusDots — shows Att / Bill / Pay / Xfer / Flow pills for previous month.
 * Exact visual match to admin_1.html checkboxCol logic.
 */
import { useDataStore } from '@/store/dataStore'
import { buildCommissionChain, isFlowComplete, isBillingEligible } from '@/utils/helpers'
import { fmtMonthKey } from '@/utils/helpers'

function Dot({ done, label }) {
  const bg  = done === true ? '#1A56DB' : done === 'na' ? '#F1F5F9' : '#E2E8F0'
  const col = done === true ? 'white'   : done === 'na' ? '#94A3B8' : '#64748B'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{ background: bg, color: col, fontSize: 10 }}
    >
      {done === true && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {label}
    </span>
  )
}

export default function StatusDots({ tuition, prevMonth }) {
  const billingsMap    = useDataStore((s) => s.billings)
  const paymentsMap    = useDataStore((s) => s.payments)
  const attCompletions = useDataStore((s) => s.attCompletions)

  const enqId   = tuition.enqId
  const billings = billingsMap[enqId] || []
  const payments = paymentsMap[enqId] || []

  // Prev month data
  const attSubmitted = !!attCompletions[`${enqId}_${prevMonth}`]
  const billing      = billings.find((b) => b.monthKey === prevMonth && b.status !== 'voided')
  const billingDone  = !!billing
  const payRow       = payments.filter((p) => p.monthKey === prevMonth && p.paymentStatus !== 'Voided').slice(-1)[0]
  const payPaid      = payRow?.paymentStatus === 'Success'

  // Transfer status — pass maps to shared functions
  const chain     = buildCommissionChain(enqId, billings, { [enqId]: payments })
  const monthCalc = chain.find((m) => m.monthKey === prevMonth)
  const transferred = !!(payRow?.transferId)
  const xferNA      = monthCalc ? monthCalc.effectiveXfer <= 0 : false

  // Eligibility
  const pendingComm = Math.max(0,
    (chain.length ? chain[chain.length - 1].commCap : tuition.commission || 0) -
    chain.filter((m) => m.flowComplete).reduce((s, m) => s + m.commAbsorbed, 0)
  )
  const eligible     = isBillingEligible(tuition, pendingComm)
  const flowComplete = billingDone ? isFlowComplete(enqId, prevMonth, billings, { [enqId]: payments }) : false

  return (
    <div>
      {/* Eligible pill */}
      <div className="mb-1.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold"
          style={{
            fontSize: 10,
            background: eligible ? '#1A56DB' : '#F1F5F9',
            color: eligible ? 'white' : '#94A3B8',
          }}
        >
          {eligible ? (
            <>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              Eligible
            </>
          ) : (
            <>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
              Not eligible
            </>
          )}
        </span>
      </div>

      {/* Status dots */}
      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>
        {fmtMonthKey(prevMonth)}
      </div>
      <div className="flex flex-wrap gap-1">
        <Dot done={attSubmitted} label="Att" />
        <Dot done={billingDone} label="Bill" />
        <Dot done={!billingDone ? 'na' : payPaid ? true : false} label="Pay" />
        <Dot
          done={
            !billingDone || !payPaid ? 'na' :
            transferred ? true :
            xferNA ? 'na' :
            false
          }
          label="Xfer"
        />
        {/* Flow pill */}
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold"
          style={{
            fontSize: 10,
            background: flowComplete ? '#1A56DB' : '#E2E8F0',
            color: flowComplete ? 'white' : '#64748B',
          }}
        >
          {flowComplete && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          OK
        </span>
      </div>
    </div>
  )
}
