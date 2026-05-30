import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite } from '../middleware/auth.js'

const router = Router()

// ── WATI helper ──
async function sendWatiTemplate(phone, templateName, parameters) {
  const endpoint = process.env.WATI_ENDPOINT
  const token    = process.env.WATI_TOKEN
  if (!endpoint || !token) return

  // Validate phone — must be 10 digits
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 10) return
  const waPhone = digits.startsWith('91') ? digits : `91${digits.slice(-10)}`

  try {
    const res = await fetch(`${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${waPhone}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_name: templateName, broadcast_name: templateName, parameters }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`WATI failed for ${waPhone}: ${res.status} ${body}`)
    }
  } catch (err) {
    console.error('WATI network error:', err.message)
  }
}

// Check if WATI should fire for attendance
async function maybeNotifyAttendance(row, tuition, tutor) {
  // Rule 3: only if marked by tutor (byAdmin is false or null, NOT true)
  if (row.byAdmin === true) return

  // Rule 1: tuition must be active or idle
  const status = tuition.status || (tuition.active ? 'active' : 'inactive')
  if (status !== 'active' && status !== 'idle') return

  // Rule 2: if idle, start date must be within 6 months
  if (status === 'idle' && tuition.start) {
    const startDate  = new Date(tuition.start + 'T00:00:00')
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (startDate < sixMonthsAgo) return
  }

  // Format date: DD Mon YYYY
  const [y, m, d] = row.date.split('-')
  const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const classDate = `${parseInt(d)} ${MN[parseInt(m)-1]} ${y}`

  const params = [
    { name: 'student_name', value: tuition.studentName || '' },
    { name: 'tutor_name',   value: tutor?.name || row.markedBy || '' },
    { name: 'class_date',   value: classDate },
    { name: 'class_time',   value: row.time || '' },
    { name: 'duration',     value: `${row.dur}hr` },
    { name: 'subject',      value: row.subj || '' },
    { name: 'topic',        value: row.topic && row.topic.trim() ? row.topic.trim() : 'NA' },
  ]

  // Send to parent
  if (tuition.parentPhone) {
    await sendWatiTemplate(tuition.parentPhone, 'utility_attendance_marked', params)
  }

  // Send to tutor
  if (tutor?.phone) {
    await sendWatiTemplate(tutor.phone, 'utility_attendance_marked', params)
  }
}

// GET /api/attendance/completions — all completions (for dashboard Att pill)
router.get('/completions', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.attCompletion.findMany({
      orderBy: { completedAt: 'desc' },
    })
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

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

// POST /api/attendance/complete — MUST be before /:enqId
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

    const { enqId, date, time, dur, subj, topic, isDemo, byAdmin,
            monthKey, markedAt, parentComment, tutorId } = req.body

    const row = await prisma.attendance.create({
      data: {
        enqId, date, time, dur, subj, topic,
        isDemo: isDemo ?? false,
        byAdmin: byAdmin ?? false,
        monthKey,
        markedAt: markedAt ? new Date(markedAt) : new Date(),
        markedBy: req.user.name,
        parentComment: parentComment || '',
        tutorId: tutorId ? parseInt(tutorId) : null,
      },
    })

    res.status(201).json(row)

    // Fire WATI async immediately — fetch tuition+tutor in parallel
    if (!isDemo) {
      setImmediate(async () => {
        try {
          const [tuition, tutorByPhone] = await Promise.all([
            prisma.tuition.findUnique({ where: { enqId } }),
            req.user.role === 'tutor' && req.user.phone
              ? prisma.tutor.findUnique({ where: { phone: req.user.phone } })
              : null,
          ])
          const tutor = tutorByPhone ||
            (tutorId ? await prisma.tutor.findUnique({ where: { id: parseInt(tutorId) } }) : null) ||
            (tuition?.tutorId ? await prisma.tutor.findUnique({ where: { id: tuition.tutorId } }) : null)
          if (tuition) await maybeNotifyAttendance(row, tuition, tutor)
        } catch (err) {
          console.error('WATI notify error:', err.message)
        }
      })
    }
  } catch (err) {
    console.error('attendance POST error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
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
