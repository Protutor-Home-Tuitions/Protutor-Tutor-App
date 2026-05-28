import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()

// GET /api/tuitions
router.get('/', requireAuth, async (req, res) => {
  try {
    const { city } = req.query
    const where = {}
    if (req.user.role !== 'manager' && req.user.cities?.length) {
      where.city = { in: req.user.cities }
    }
    if (city) where.city = city
    const tuitions = await prisma.tuition.findMany({
      where, include: { tutor: true }, orderBy: { createdAt: 'desc' },
    })
    res.json(tuitions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/tuitions/my — MUST be before /:id
router.get('/my', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Tutor access only' })
    }
    const tuitions = await prisma.tuition.findMany({
      where: { tutor: { phone: req.user.phone } },
      include: { tutor: true },
      orderBy: { start: 'desc' },
    })
    res.json(tuitions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/tuitions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const tuition = await prisma.tuition.findUnique({
      where: { id: req.params.id },
      include: { tutor: true, billings: true, attendance: true },
    })
    if (!tuition) return res.status(404).json({ error: 'Not found' })
    res.json(tuition)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/tuitions
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!['manager', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const tuition = await prisma.tuition.create({
      data: { ...req.body, createdBy: req.user.name, createdAt: new Date() },
    })
    res.status(201).json(tuition)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/tuitions/:id — manager + coordinator (edit), manager only for deactivate/idle handled in frontend
router.patch('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const body = { ...req.body }
    // Sync active boolean with status string
    if (body.status === 'inactive') body.active = false
    else if (body.status === 'active' || body.status === 'idle') body.active = true
    if (body.active === false && !body.status) body.status = 'inactive'
    if (body.active === true && !body.status) body.status = 'active'
    const tuition = await prisma.tuition.update({
      where: { id: req.params.id },
      data: { ...body, lastEditedBy: req.user.name, lastEditedAt: new Date() },
    })
    res.json(tuition)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
