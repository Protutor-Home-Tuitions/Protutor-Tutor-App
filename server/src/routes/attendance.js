import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireCanWrite } from '../middleware/auth.js'

const router = Router()

// ── WATI helper ──
async function sendWatiTemplate(phone, templateName, parameters) {
  const endpoint = process.env.WATI_ENDPOINT
  const token    = process.env.WATI_TOKEN
  if (!endpoint || !token) return

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

// ── Check if WATI should fire for attendance ──
async function maybeNotifyAttendance(row, tuition, tutor) {
  if (row.byAdmin === true) return

  const status = tuition.status || (tuition.active ? 'active' : 'inactive')
  if (status !== 'active' && status !== 'idle') return

  if (status === 'idle' && tuition.start) {
    const startDate    = new Date(tuition.start + 'T00:00:00')
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (startDate < sixMonthsAgo) return
  }

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

  if (tuition.parentPhone) {
    await sendWatiTemplate(tuition.parentPhone, 'utility_attendance_marked', params)
  }
  if (tutor?.phone) {
    await sendWatiTemplate(tutor.phone, 'utility_attendance_marked', params)
  }
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATION QUEUE PROCESSOR — called by pg_cron every 2 min
// ══════════════════════════════════════════════════════════════
router.post('/notifications/process', async (req, res) => {
  // Authenticate — only pg_cron should call this
  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Pick up pending rows (max 10 per run to avoid timeout)
    const pending = await prisma.$queryRaw`
      UPDATE notification_queue
      SET status = 'processing'
      WHERE id IN (
        SELECT id FROM notification_queue
        WHERE status = 'pending' AND retry_count < 3
        ORDER BY created_at ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `

    let sent = 0
    let failed = 0

    for (const item of pending) {
      try {
        // Fetch attendance record
        const row = await prisma.attendance.findUnique({ where: { id: item.attendance_id } })
        if (!row) {
          await prisma.$executeRaw`
            UPDATE notification_queue SET status = 'failed', error = 'Attendance record not found', processed_at = NOW()
            WHERE id = ${item.id}::uuid
          `
          failed++
          continue
        }

        // Fetch tuition
        const tuition = await prisma.tuition.findFirst({ where: { enqId: item.enq_id } })
        if (!tuition) {
          await prisma.$executeRaw`
            UPDATE notification_queue SET status = 'failed', error = 'Tuition not found', processed_at = NOW()
            WHERE id = ${item.id}::uuid
          `
          failed++
          continue
        }

        // Fetch tutor — try multiple lookups
        const tutor = row.tutorId
          ? await prisma.tutor.findUnique({ where: { id: row.tutorId } })
          : tuition.tutorId
            ? await prisma.tutor.findUnique({ where: { id: tuition.tutorId } })
            : null

        // Send WATI
        await maybeNotifyAttendance(row, tuition, tutor)

        // Mark as sent
        await prisma.$executeRaw`
          UPDATE notification_queue SET status = 'sent', processed_at = NOW()
          WHERE id = ${item.id}::uuid
        `
        sent++
      } catch (err) {
        // Retry — put back to pending with incremented retry count
        await prisma.$executeRaw`
          UPDATE notification_queue
          SET status = 'pending', retry_count = retry_count + 1, error = ${err.message}
          WHERE id = ${item.id}::uuid
        `
        failed++
      }
    }

    // Cleanup 1: Reset stuck 'processing' rows older than 10 minutes back to 'pending'
    // Handles case where API crashed mid-processing
    await prisma.$executeRaw`
      UPDATE notification_queue
      SET status = 'pending', retry_count = retry_count + 1
      WHERE status = 'processing' AND created_at < NOW() - INTERVAL '10 minutes'
    `

    // Cleanup 2: Delete sent records older than 7 days
    await prisma.$executeRaw`
      DELETE FROM notification_queue WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days'
    `

    res.json({ processed: pending.length, sent, failed })
  } catch (err) {
    console.error('Notification processor error:', err)
    res.status(500).json({ error: err.message })
  }
})

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

    // Response sent immediately — fast for the user
    // lastAttDate → handled by DB trigger (100% reliable)
    // WATI notification → handled by notification_queue + pg_cron (100% reliable)
    res.status(201).json(row)
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
    // lastAttDate handled by DB trigger
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/attendance/:id — admin/coordinator only
router.delete('/:id', requireAuth, requireCanWrite, async (req, res) => {
  try {
    await prisma.attendance.delete({ where: { id: req.params.id } })
    // lastAttDate handled by DB trigger
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
