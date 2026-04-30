import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()
const prisma  = new PrismaClient()

router.get('/', requireAuth, async (_req, res) => {
  res.json(await prisma.tutor.findMany({ orderBy: { name: 'asc' } }))
})

router.post('/', requireAuth, requireManager, async (req, res) => {
  const tutor = await prisma.tutor.create({ data: req.body })
  res.status(201).json(tutor)
})

router.patch('/:id', requireAuth, requireManager, async (req, res) => {
  const tutor = await prisma.tutor.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
  })
  res.json(tutor)
})

export default router
