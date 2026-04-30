import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma  = new PrismaClient()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password required' })
    }

    const user = await prisma.adminUser.findFirst({
      where: {
        OR: [{ phone }, { email: phone }],
        status: 'active',
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Phase 1: plain text comparison (matches seed data)
    // Phase 2: swap to bcrypt.compare(password, user.password)
    const valid = password === user.password
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const { password: _pw, ...safeUser } = user
    const token = jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' })
  try {
    const user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
