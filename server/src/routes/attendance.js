import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite } from '../middleware/auth.js'

const router = Router()

// GET /api/attendance/completions/:enqId  — MUST be before /:enqId
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

// POST /api/attendance
router.post('/', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const row = await prisma.attendance.create({
      data: { ...req.body, markedBy: req.user.name },
    })
    res.status(201).json(row)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/attendance/:id
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

// DELETE /api/attendance/:id
router.delete('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    await prisma.attendance.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
