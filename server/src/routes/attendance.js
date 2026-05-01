import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite } from '../middleware/auth.js'

const router = Router()

// GET /api/attendance/completions/:enqId — MUST be before /:enqId
router.get('/completions/:enqId', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.attCompletion.findMany({
      where: { enqId: req.params.enqId },
    })
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/attendance/complete — tutor submits month — MUST be before /:enqId
router.post('/complete', requireAuth, async (req, res) => {
  try {
    const allowed = ['manager', 'coordinator', 'tutor'].includes(req.user.role)
    if (!allowed) return res.status(403).json({ error: 'Access denied' })

    const { enqId, monthKey } = req.body
    if (!enqId || !monthKey) return res.status(400).json({ error: 'enqId and monthKey required' })

    const existing = await prisma.attCompletion.findUnique({
      where: { enqId_monthKey: { enqId, monthKey } },
    })
    if (existing) return res.status(409).json({ error: 'Already submitted' })

    const completion = await prisma.attCompletion.create({
      data: {
        enqId, monthKey,
        completedAt: new Date(),
        completedBy: req.user.name || 'Tutor',
        tutorPhone: req.user.phone || '',
      },
    })
    res.status(201).json(completion)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/attendance/:enqId
router.get('/:enqId', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.attendance.findMany({
      where: { enqId: req.params.enqId },
      orderBy: { date: 'desc' },
    })
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/attendance — admin, coordinator, or tutor
router.post('/', requireAuth, async (req, res) => {
  try {
    const allowed = ['manager', 'coordinator', 'tutor'].includes(req.user.role)
    if (!allowed) return res.status(403).json({ error: 'Access denied' })
    const row = await prisma.attendance.create({
      data: { ...req.body, markedBy: req.user.name },
    })
    res.status(201).json(row)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/attendance/:id — admin/coordinator only
router.patch('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const row = await prisma.attendance.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/attendance/:id — admin/coordinator only
router.delete('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    await prisma.attendance.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
