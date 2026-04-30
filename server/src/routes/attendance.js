import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireCanWrite } from '../middleware/auth.js'

const router = Router()
const prisma  = new PrismaClient()

router.get('/:enqId', requireAuth, async (req, res) => {
  const rows = await prisma.attendance.findMany({
    where: { enqId: req.params.enqId },
    orderBy: { date: 'desc' },
  })
  res.json(rows)
})

router.post('/', requireAuth, requireCanWrite, async (req, res) => {
  const row = await prisma.attendance.create({
    data: { ...req.body, markedBy: req.user.name },
  })
  res.status(201).json(row)
})

router.patch('/:id', requireAuth, requireCanWrite, async (req, res) => {
  const row = await prisma.attendance.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(row)
})

router.delete('/:id', requireAuth, requireCanWrite, async (req, res) => {
  await prisma.attendance.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
