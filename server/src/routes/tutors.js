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

// ── Masking helpers (server-side, tutor self-service only) ──
// Admin routes (GET /, PATCH /:id) return full unmasked data — used for payouts.
function maskAccountNumber(num) {
  if (!num || typeof num !== 'string') return ''
  if (num.length <= 4) return num
  return '••••' + num.slice(-4)
}

function maskPan(pan) {
  if (!pan || typeof pan !== 'string') return ''
  if (pan.length < 5) return pan
  return pan.slice(0, 3) + '•••••' + pan.slice(-1)
}

// Return tutor object with sensitive fields masked (for tutor self-service).
// If tutor has existing bank data but no bankSubmittedAt, return a synthetic
// bankSubmittedAt (= tutor.createdAt) so the frontend treats them as "locked".
function maskTutorForSelf(tutor) {
  if (!tutor) return tutor
  const hasBankData = !!(tutor.accountNumber || tutor.panNumber)
  return {
    ...tutor,
    accountNumber:   maskAccountNumber(tutor.accountNumber),
    panNumber:       maskPan(tutor.panNumber),
    bankSubmittedAt: tutor.bankSubmittedAt || (hasBankData ? tutor.createdAt : null),
    // ifscCode intentionally unmasked (public routing info)
  }
}

router.get('/', requireAuth, async (_req, res) => {
  try {
    res.json(await prisma.tutor.findMany({ orderBy: { id: 'desc' } }))
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

// ── Tutor self-service: GET own profile (masked) ──
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Tutor access only' })
    }
    const tutor = await prisma.tutor.findUnique({ where: { id: req.user.id } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })
    res.json(maskTutorForSelf(tutor))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Tutor self-service: submit bank details (one-time, locked after) ──
router.post('/bank-details', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Tutor access only' })
    }

    const tutor = await prisma.tutor.findUnique({ where: { id: req.user.id } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    // Locked if bankSubmittedAt is set (submitted via app)
    // OR if any bank field already exists (seeded by admin) — Option C
    const hasExistingData = !!(tutor.accountNumber || tutor.panNumber)
    if (tutor.bankSubmittedAt || hasExistingData) {
      return res.status(409).json({
        error: 'Bank details already exist. Contact contact@protutor.in to update.',
      })
    }

    const { accountHolderName, accountNumber, ifscCode, panNumber, email } = req.body || {}

    // Validation (mirrors frontend)
    if (!accountHolderName || !accountNumber || !ifscCode || !panNumber || !email) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    if (!/^[A-Za-z\s]+$/.test(accountHolderName)) {
      return res.status(400).json({ error: 'Account holder name must contain only letters and spaces' })
    }
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 9–18 digits' })
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifscCode).toUpperCase())) {
      return res.status(400).json({ error: 'Invalid IFSC code format' })
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(panNumber).toUpperCase())) {
      return res.status(400).json({ error: 'Invalid PAN number format' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const updated = await prisma.tutor.update({
      where: { id: req.user.id },
      data: {
        accountHolderName: accountHolderName.trim(),
        accountNumber:     accountNumber.trim(),
        ifscCode:          ifscCode.trim().toUpperCase(),
        panNumber:         panNumber.trim().toUpperCase(),
        email:             email.trim().toLowerCase(),
        bankSubmittedAt:   new Date(),
      },
    })

    // Return masked response — tutor never receives full account/PAN over the wire
    res.json(maskTutorForSelf(updated))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Razorpay helper ──
function rzpHeaders() {
  const key = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
  }
}

// ── Admin: create Razorpay linked account for a tutor ──
router.post('/:id/create-razorpay-account', requireAuth, requireManager, async (req, res) => {
  try {
    const tutor = await prisma.tutor.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    if (tutor.paymentAccountId) {
      return res.status(409).json({ error: `Razorpay account already exists: ${tutor.paymentAccountId}` })
    }

    // Require full bank details AND email (fabricated emails cause Razorpay activation failure)
    if (!tutor.email || !tutor.email.includes('@')) {
      return res.status(400).json({ error: 'Tutor email is required. Ask tutor to submit bank details form first.' })
    }
    const bankSet = !!(tutor.accountHolderName && tutor.accountNumber && tutor.ifscCode && tutor.panNumber)
    if (!bankSet) {
      return res.status(400).json({ error: 'Complete bank details (account holder, number, IFSC, PAN) required before creating Razorpay account.' })
    }

    const headers = rzpHeaders()
    if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured on server.' })

    const payload = {
      email: tutor.email,
      phone: tutor.phone,
      type: 'route',
      reference_id: `tutor_${tutor.id}`,
      legal_business_name: tutor.name,
      business_type: 'individual',
      contact_name: tutor.name,
      dashboard_access: 1,
      customer_refunds: 0,
      profile: {
        category: 'education',
        subcategory: 'tutoring',
      },
      bank_account: {
        ifsc_code: tutor.ifscCode,
        beneficiary_name: tutor.accountHolderName,
        account_number: tutor.accountNumber,
      },
      legal_info: {
        pan: tutor.panNumber,
      },
    }

    const rzpRes = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const rzpData = await rzpRes.json()

    if (!rzpRes.ok) {
      const errMsg = rzpData?.error?.description || rzpData?.message || JSON.stringify(rzpData)
      console.error('Razorpay account creation failed for tutor', tutor.id, ':', errMsg)
      return res.status(rzpRes.status).json({ error: `Razorpay: ${errMsg}` })
    }

    const updated = await prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        paymentAccountId:     rzpData.id || '',
        paymentAccountStatus: rzpData.status || 'created',
      },
    })

    res.json(updated)
  } catch (err) {
    console.error('Create Razorpay account error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// ── Cron: refresh Razorpay account status for all pending tutors ──
// Called by Supabase pg_cron every hour. Protected by CRON_SECRET header.
// Processes accounts in parallel batches of 10 to stay within Vercel timeout.
router.get('/refresh-rzp-status', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const headers = rzpHeaders()
  if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured' })

  try {
    // Only accounts that are neither activated nor terminal (rejected/suspended)
    const pending = await prisma.tutor.findMany({
      where: {
        paymentAccountId:     { not: '' },
        paymentAccountStatus: { notIn: ['activated', 'rejected', 'suspended'] },
      },
      select: { id: true, paymentAccountId: true, paymentAccountStatus: true },
    })

    if (!pending.length) return res.json({ checked: 0, updated: 0 })

    // Process in parallel batches of 10 (Razorpay handles bursts fine)
    const BATCH_SIZE = 10
    let updated = 0

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(async (tutor) => {
        try {
          const rzpRes = await fetch(
            `https://api.razorpay.com/v2/accounts/${tutor.paymentAccountId}`,
            { method: 'GET', headers }
          )
          if (!rzpRes.ok) return null
          const rzpData = await rzpRes.json()
          const newStatus = rzpData.status || tutor.paymentAccountStatus
          if (newStatus !== tutor.paymentAccountStatus) {
            await prisma.tutor.update({
              where: { id: tutor.id },
              data: { paymentAccountStatus: newStatus },
            })
            return true
          }
          return false
        } catch (err) {
          console.error(`RZP status check failed for tutor ${tutor.id}:`, err.message)
          return null
        }
      }))
      updated += results.filter(Boolean).length
    }

    res.json({ checked: pending.length, updated })
  } catch (err) {
    console.error('Refresh RZP status error:', err)
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
