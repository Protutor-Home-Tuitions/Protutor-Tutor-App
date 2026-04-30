import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()
const prisma  = new PrismaClient()

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
      where,
      include: { tutor: true },
      orderBy: { createdAt: 'desc' },
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
router.post('/', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const data = req.body
    const tuition = await prisma.tuition.create({
      data: {
        ...data,
        createdBy: req.user.name,
        createdAt: new Date(),
      },
    })
    res.status(201).json(tuition)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/tuitions/:id
router.patch('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const tuition = await prisma.tuition.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        lastEditedBy: req.user.name,
        lastEditedAt: new Date(),
      },
    })
    res.json(tuition)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
