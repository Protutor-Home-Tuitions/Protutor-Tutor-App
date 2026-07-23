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

// ── Razorpay API helper ──
function rzpHeaders() {
  const key = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
  }
}

async function rzpCall(method, path, headers, body) {
  const res = await fetch(`https://api.razorpay.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// ── Admin: Create Razorpay linked account for a tutor ──
// 4-step flow per Razorpay Route V2 docs:
//   Step 1: POST /v2/accounts                              → create linked account
//   Step 2: POST /v2/accounts/:id/stakeholders             → create stakeholder (PAN/KYC)
//   Step 3: POST /v2/accounts/:id/products                 → request "route" product
//   Step 4: PATCH /v2/accounts/:id/products/:pid           → attach bank settlement details
// Each step is persisted to DB immediately. If any step fails, admin can retry —
// the route skips already-completed steps and resumes from where it stopped.
router.post('/:id/create-razorpay-account', requireAuth, requireManager, async (req, res) => {
  try {
    const tutor = await prisma.tutor.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    // Validate prerequisites
    if (!tutor.email || !tutor.email.includes('@')) {
      return res.status(400).json({ error: 'Tutor email is required. Ask tutor to submit bank details first.' })
    }
    const bankSet = !!(tutor.accountHolderName && tutor.accountNumber && tutor.ifscCode && tutor.panNumber)
    if (!bankSet) {
      return res.status(400).json({ error: 'Complete bank details (holder name, account number, IFSC, PAN) required.' })
    }

    const headers = rzpHeaders()
    if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured on server.' })

    let accountId     = tutor.paymentAccountId
    let stakeholderId = tutor.paymentStakeholderId
    let productId     = tutor.paymentProductId

    // ── Step 1: Create Linked Account ──
    if (!accountId) {
      const r = await rzpCall('POST', '/v2/accounts', headers, {
        email: tutor.email,
        phone: tutor.phone,
        type: 'route',
        reference_id: `tutor_${tutor.id}`,
        legal_business_name: tutor.name,
        business_type: 'individual',
        contact_name: tutor.name,
        profile: {
          category: 'education',
          subcategory: 'coaching',
          addresses: {
            registered: {
              street1: '715-A, Spencer Plaza',
              street2: 'Anna Salai',
              city: 'Chennai',
              state: 'TAMIL NADU',
              postal_code: '600002',
              country: 'IN',
            },
          },
        },
        legal_info: {
          pan: tutor.panNumber,
        },
      })
      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        return res.status(r.status).json({ error: `Step 1 (Create Account): ${msg}` })
      }
      accountId = r.data.id
      if (!accountId) return res.status(500).json({ error: 'Razorpay returned no account ID' })
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentAccountId: accountId, paymentAccountStatus: r.data.status || 'created' },
      })
    }

    // ── Step 2: Create Stakeholder (PAN for KYC) ──
    if (!stakeholderId) {
      const r = await rzpCall('POST', `/v2/accounts/${accountId}/stakeholders`, headers, {
        name: tutor.name,
        email: tutor.email,
        kyc: {
          pan: tutor.panNumber,
        },
      })
      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        return res.status(r.status).json({ error: `Step 2 (Create Stakeholder): ${msg}` })
      }
      stakeholderId = r.data.id
      if (!stakeholderId) return res.status(500).json({ error: 'Razorpay returned no stakeholder ID' })
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentStakeholderId: stakeholderId },
      })
    }

    // ── Step 3: Request Product Configuration ──
    if (!productId) {
      const r = await rzpCall('POST', `/v2/accounts/${accountId}/products`, headers, {
        product_name: 'route',
        tnc_accepted: true,
      })
      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        return res.status(r.status).json({ error: `Step 3 (Request Product): ${msg}` })
      }
      productId = r.data.id ||
        (r.data.requirements?.[0]?.resolution_url?.match(/products\/(acc_prd_\w+)/)?.[1]) || ''
      if (!productId) {
        console.error('Razorpay product response (no id found):', JSON.stringify(r.data))
        return res.status(500).json({ error: 'Razorpay returned no product ID' })
      }
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentProductId: productId },
      })
    }

    // ── Step 4: Update Product Config with bank settlement details ──
    const r = await rzpCall('PATCH', `/v2/accounts/${accountId}/products/${productId}`, headers, {
      settlements: {
        account_number: tutor.accountNumber,
        ifsc_code: tutor.ifscCode,
        beneficiary_name: tutor.accountHolderName,
      },
      tnc_accepted: true,
    })
    if (!r.ok) {
      const msg = r.data?.error?.description || JSON.stringify(r.data)
      return res.status(r.status).json({ error: `Step 4 (Attach Bank): ${msg}` })
    }

    // Re-fetch and return updated tutor
    const updated = await prisma.tutor.findUnique({ where: { id: tutor.id } })
    res.json(updated)
  } catch (err) {
    console.error('Create Razorpay account error:', err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// ── Cron: refresh Razorpay account status for all pending tutors ──
// Called by Supabase pg_cron every hour. Protected by CRON_SECRET header.
router.get('/refresh-rzp-status', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const headers = rzpHeaders()
  if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured' })

  try {
    const pending = await prisma.tutor.findMany({
      where: {
        paymentAccountId: { not: '' },
        paymentAccountStatus: { notIn: ['activated', 'rejected', 'suspended'] },
      },
      select: { id: true, paymentAccountId: true, paymentAccountStatus: true },
    })

    if (!pending.length) return res.json({ checked: 0, updated: 0 })

    const BATCH = 10
    let updated = 0
    for (let i = 0; i < pending.length; i += BATCH) {
      const results = await Promise.all(pending.slice(i, i + BATCH).map(async (t) => {
        try {
          const r = await rzpCall('GET', `/v2/accounts/${t.paymentAccountId}`, headers)
          if (!r.ok) return false
          const newStatus = r.data.status || t.paymentAccountStatus
          if (newStatus !== t.paymentAccountStatus) {
            await prisma.tutor.update({
              where: { id: t.id },
              data: { paymentAccountStatus: newStatus },
            })
            return true
          }
          return false
        } catch { return false }
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
