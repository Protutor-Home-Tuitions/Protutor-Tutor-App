import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireManager } from '../middleware/auth.js'

const router = Router()

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
