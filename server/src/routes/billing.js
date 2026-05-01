import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()

// GET /api/billing/:enqId
router.get('/:enqId', requireAuth, async (req, res) => {
  try {
    const billings = await prisma.billing.findMany({
      where: { enqId: req.params.enqId },
      orderBy: { monthKey: 'desc' },
    })
    res.json(billings)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/billing — create billing with frozen snapshot
router.post('/', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const { enqId, monthKey, snapshot, zeroBill, zeroBillReason } = req.body

    // Guard: no active billing for this month
    const existing = await prisma.billing.findFirst({
      where: { enqId, monthKey, status: 'active' },
    })
    if (existing) {
      return res.status(409).json({ error: 'Billing already exists for this month' })
    }

    // Guard: no newer active billing
    const newer = await prisma.billing.findFirst({
      where: { enqId, monthKey: { gt: monthKey }, status: 'active' },
    })
    if (newer) {
      return res.status(409).json({ error: 'Cannot create billing — newer month billing exists' })
    }

    // Guard: attendance must be submitted
    if (!zeroBill) {
      const submitted = await prisma.attCompletion.findUnique({
        where: { enqId_monthKey: { enqId, monthKey } },
      })
      if (!submitted) {
        return res.status(409).json({ error: 'Attendance not submitted by tutor yet' })
      }
    }

    const billing = await prisma.billing.create({
      data: {
        enqId, monthKey,
        createdBy: req.user.name,
        status: 'active',
        zeroBill: !!zeroBill,
        zeroBillReason: zeroBillReason || '',
        snapStudentName: snapshot.studentName,
        snapFeeParent: snapshot.feeParent,
        snapFeeTutor: snapshot.feeTutor,
        snapFeeType: snapshot.feeType,
        snapCommission: snapshot.commission,
        snapDays: snapshot.days,
        snapDuration: snapshot.duration,
        snapSubjects: snapshot.subjects,
        snapClasses: snapshot.classes,
        snapHours: snapshot.hours,
        snapAmountP: snapshot.amountP,
        snapAmountT: snapshot.amountT,
        snapFeeC: snapshot.feeC,
        snapCountLabel: snapshot.countLabel,
        snapCalcStr: snapshot.calcStr,
      },
    })

    // Create initial payment row
    await prisma.payment.create({
      data: {
        enqId, monthKey,
        billingId: billing.id,
        paymentStatus: zeroBill ? 'Success' : 'Pending',
        paymentMode: zeroBill ? 'Zero-Bill' : '',
        manualCollectedBy: zeroBill ? req.user.name : '',
        collectedAt: zeroBill ? new Date() : null,
        transferStatus: zeroBill ? 'NA' : '',
      },
    })

    res.status(201).json(billing)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/billing/:id/void — void a billing
router.patch('/:id/void', requireAuth, requireManager, async (req, res) => {
  try {
    const { voidReason } = req.body
    if (!voidReason?.trim()) {
      return res.status(400).json({ error: 'Void reason required' })
    }

    const billing = await prisma.billing.findUnique({ where: { id: req.params.id } })
    if (!billing) return res.status(404).json({ error: 'Billing not found' })

    // Check payment not collected
    const payment = await prisma.payment.findFirst({
      where: { billingId: billing.id, paymentStatus: 'Success' },
    })
    if (payment) {
      return res.status(409).json({ error: 'Cannot void — payment already collected' })
    }

    const updated = await prisma.billing.update({
      where: { id: req.params.id },
      data: {
        status: 'voided',
        voidedBy: req.user.name,
        voidedAt: new Date(),
        voidReason,
      },
    })

    // Void the payment row too
    await prisma.payment.updateMany({
      where: { billingId: billing.id },
      data: { paymentStatus: 'Voided' },
    })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
