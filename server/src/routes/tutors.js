import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  try {
    res.json(await prisma.tutor.findMany({ orderBy: { name: 'asc' } }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCanWrite, async (req, res) => {
  try {
    const tutor = await prisma.tutor.create({ data: req.body })
    res.status(201).json(tutor)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Phone number already exists.' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', requireAuth, requireManager, async (req, res) => {
  const tutor = await prisma.tutor.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
  })
  res.json(tutor)
})

export default router
