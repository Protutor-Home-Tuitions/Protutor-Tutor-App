import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireManager } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, requireManager, async (_req, res) => {
  const users = await prisma.adminUser.findMany({
    select: { id:true, name:true, phone:true, email:true, role:true, cities:true, status:true, createdAt:true },
  })
  res.json(users)
})

router.post('/', requireAuth, requireManager, async (req, res) => {
  const user = await prisma.adminUser.create({ data: req.body })
  const { password: _pw, ...safe } = user
  res.status(201).json(safe)
})

router.patch('/:id', requireAuth, requireManager, async (req, res) => {
  const user = await prisma.adminUser.update({
    where: { id: parseInt(req.params.id) },
    data: req.body,
    select: { id:true, name:true, phone:true, email:true, role:true, cities:true, status:true },
  })
  res.json(user)
})

export default router
