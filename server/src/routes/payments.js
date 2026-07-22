import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireManager } from '../middleware/auth.js'

const router = Router()

// ── Tutor self-service: GET my payments across all my tuitions ──
// MUST be defined before /:enqId — otherwise Express matches 'tutor' as an enqId.
router.get('/tutor/my', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Tutor access only' })
    }
    const tuitions = await prisma.tuition.findMany({
      where: { tutor: { phone: req.user.phone } },
      select: { enqId: true },
    })
    const enqIds = tuitions.map((t) => t.enqId)
    if (!enqIds.length) return res.json([])

    const payments = await prisma.payment.findMany({
      where: { enqId: { in: enqIds } },
      include: { billing: true },
      orderBy: [{ monthKey: 'desc' }, { createdAt: 'desc' }],
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:enqId', requireAuth, async (req, res) => {
  const rows = await prisma.payment.findMany({
    where: { enqId: req.params.enqId },
    orderBy: [{ monthKey: 'desc' }, { createdAt: 'desc' }],
  })
  res.json(rows)
})

// Mark manual payment collected
router.patch('/:id/collect', requireAuth, requireManager, async (req, res) => {
  const { paymentMode, paymentId, collectedAt, manualNotes } = req.body
  const row = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      paymentStatus: 'Success',
      paymentMode,
      paymentId: paymentId || `MANUAL-${paymentMode}-${Date.now()}`,
      collectedAt: new Date(collectedAt),
      manualCollectedBy: req.user.name,
      manualNotes: manualNotes || '',
    },
  })
  res.json(row)
})

// Record manual transfer
router.patch('/:id/transfer', requireAuth, requireManager, async (req, res) => {
  const { transferAmt, transferAmtOriginal, transferAmtOverride,
          transferAmtOverrideReason, utr, transferCreatedAt } = req.body
  const row = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      transferId: `MANUAL-XFER-${req.params.id}`,
      utr,
      transferStatus: 'Completed',
      transferAmt,
      transferAmtOriginal,
      transferAmtOverride: transferAmtOverride ?? null,
      transferAmtOverrideReason: transferAmtOverrideReason || '',
      transferCreatedBy: req.user.name,
      transferCreatedAt: new Date(transferCreatedAt),
    },
  })
  res.json(row)
})

export default router
