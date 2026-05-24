import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite, requireManager } from '../middleware/auth.js'

const router = Router()

// ── WATI WhatsApp helper ──
async function sendWatiTemplate(phone, templateName, parameters) {
  const endpoint = process.env.WATI_ENDPOINT
  const token    = process.env.WATI_TOKEN
  if (!endpoint || !token) throw new Error('WATI not configured')

  // WATI expects Indian numbers with country code, no +
  const waPhone = phone.startsWith('91') ? phone : `91${phone}`

  const res = await fetch(
    `${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${waPhone}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: templateName,
        parameters,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WATI API error: ${err}`)
  }
  return res.json()
}

router.get('/', requireAuth, async (_req, res) => {
  try {
    res.json(await prisma.tutor.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!['manager', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
      const tutor = await prisma.tutor.create({ data: req.body })

      // Send WATI WhatsApp message to tutor
      try {
        const tutorPass = tutor.name.slice(0,4).toLowerCase().replace(/\s/g,'') + '@' + tutor.passDigits
        await sendWatiTemplate(tutor.phone, 'utility_tutor_login', [
          { name: 'Tutor_name', value: tutor.name },
          { name: 'user_id',    value: tutor.phone },
          { name: 'password',   value: tutorPass },
        ])
      } catch (watiErr) {
        // Don't fail tutor creation if WATI fails — just log
        console.error('WATI error:', watiErr.message)
      }

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
