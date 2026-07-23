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
function rzpHeaders(idempotencyKey) {
  const key = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) return null
  const h = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64'),
  }
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey
  return h
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

// ── Audit log (append-only — never update or delete rows) ──
async function logEvent(tutorId, eventType, step, status, razorpayId, errorMessage, actedBy) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO payout_events (tutor_id, event_type, step, status, razorpay_id, error_message, acted_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      tutorId, eventType, step, status, razorpayId || '', errorMessage || '', actedBy || ''
    )
  } catch (e) {
    console.error('Audit log write failed:', e.message)
  }
}

// ── Admin: Create Razorpay linked account (4-step flow) ──
// Step 1: POST /v2/accounts                    → create linked account
// Step 2: POST /v2/accounts/:id/stakeholders   → create stakeholder (KYC)
// Step 3: POST /v2/accounts/:id/products       → request "route" product
// Step 4: PATCH /v2/accounts/:id/products/:pid → attach bank settlement details
// Each step persisted to DB. On retry, skips completed steps.
router.post('/:id/create-razorpay-account', requireAuth, requireManager, async (req, res) => {
  // ── Kill switch ──
  if (process.env.PAYOUTS_ENABLED === 'false') {
    return res.status(503).json({ error: 'Payouts are temporarily disabled.' })
  }

  try {
    const tutor = await prisma.tutor.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    if (!tutor.email || !tutor.email.includes('@')) {
      return res.status(400).json({ error: 'Tutor email required. Ask tutor to submit bank details first.' })
    }
    const bankSet = !!(tutor.accountHolderName && tutor.accountNumber && tutor.ifscCode && tutor.panNumber)
    if (!bankSet) {
      return res.status(400).json({ error: 'Complete bank details required (holder name, account, IFSC, PAN).' })
    }

    // Already fully configured — block duplicate
    if (tutor.paymentAccountId && tutor.paymentStakeholderId && tutor.paymentProductId) {
      return res.status(409).json({ error: 'Razorpay account already fully configured.' })
    }

    let accountId     = tutor.paymentAccountId
    let stakeholderId = tutor.paymentStakeholderId
    let productId     = tutor.paymentProductId

    // ── Step 1: Create Linked Account ──
    if (!accountId) {
      const headers = rzpHeaders()
      if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured.' })

      await logEvent(tutor.id, 'rzp_create', 'step1_start', 'in_progress', '', '', req.user.name)

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
      })

      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        await logEvent(tutor.id, 'rzp_create', 'step1_fail', 'error', '', msg, req.user.name)
        return res.status(r.status).json({ error: `Step 1 (Create Account): ${msg}` })
      }
      accountId = r.data.id
      if (!accountId) {
        await logEvent(tutor.id, 'rzp_create', 'step1_fail', 'error', '', 'No account ID returned', req.user.name)
        return res.status(500).json({ error: 'Razorpay returned no account ID' })
      }
      // Verify reference_id matches (safety check against mapping errors)
      if (r.data.reference_id && r.data.reference_id !== `tutor_${tutor.id}`) {
        await logEvent(tutor.id, 'rzp_create', 'step1_fail', 'error', accountId, 'reference_id mismatch: ' + r.data.reference_id, req.user.name)
        return res.status(500).json({ error: 'Reference ID mismatch — possible mapping error. Contact developer.' })
      }
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentAccountId: accountId, paymentAccountStatus: r.data.status || 'created' },
      })
      await logEvent(tutor.id, 'rzp_create', 'step1_done', r.data.status || 'created', accountId, '', req.user.name)
    }

    // ── Step 2: Create Stakeholder ──
    if (!stakeholderId) {
      const headers = rzpHeaders()
      if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured.' })

      await logEvent(tutor.id, 'rzp_create', 'step2_start', 'in_progress', accountId, '', req.user.name)

      const r = await rzpCall('POST', `/v2/accounts/${accountId}/stakeholders`, headers, {
        name: tutor.name,
        email: tutor.email,
        kyc: { pan: tutor.panNumber },
      })
      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        await logEvent(tutor.id, 'rzp_create', 'step2_fail', 'error', accountId, msg, req.user.name)
        return res.status(r.status).json({ error: `Step 2 (Create Stakeholder): ${msg}` })
      }
      stakeholderId = r.data.id
      if (!stakeholderId) {
        await logEvent(tutor.id, 'rzp_create', 'step2_fail', 'error', accountId, 'No stakeholder ID returned', req.user.name)
        return res.status(500).json({ error: 'Razorpay returned no stakeholder ID' })
      }
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentStakeholderId: stakeholderId },
      })
      await logEvent(tutor.id, 'rzp_create', 'step2_done', 'success', stakeholderId, '', req.user.name)
    }

    // ── Step 3: Request Product Configuration ──
    if (!productId) {
      const headers = rzpHeaders()
      if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured.' })

      await logEvent(tutor.id, 'rzp_create', 'step3_start', 'in_progress', accountId, '', req.user.name)

      const r = await rzpCall('POST', `/v2/accounts/${accountId}/products`, headers, {
        product_name: 'route',
        tnc_accepted: true,
      })
      if (!r.ok) {
        const msg = r.data?.error?.description || JSON.stringify(r.data)
        await logEvent(tutor.id, 'rzp_create', 'step3_fail', 'error', accountId, msg, req.user.name)
        return res.status(r.status).json({ error: `Step 3 (Request Product): ${msg}` })
      }
      productId = r.data.id ||
        (r.data.requirements?.[0]?.resolution_url?.match(/products\/(acc_prd_\w+)/)?.[1]) || ''
      if (!productId) {
        await logEvent(tutor.id, 'rzp_create', 'step3_fail', 'error', accountId, 'No product ID in response', req.user.name)
        return res.status(500).json({ error: 'Razorpay returned no product ID' })
      }
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { paymentProductId: productId },
      })
      await logEvent(tutor.id, 'rzp_create', 'step3_done', 'success', productId, '', req.user.name)
    }

    // ── Step 4: Attach bank settlement details ──
    {
      const headers = rzpHeaders() // PATCH is idempotent, no idempotency key needed
      if (!headers) return res.status(500).json({ error: 'Razorpay credentials not configured.' })

      await logEvent(tutor.id, 'rzp_create', 'step4_start', 'in_progress', productId, '', req.user.name)

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
        await logEvent(tutor.id, 'rzp_create', 'step4_fail', 'error', productId, msg, req.user.name)
        return res.status(r.status).json({ error: `Step 4 (Attach Bank): ${msg}` })
      }
      await logEvent(tutor.id, 'rzp_create', 'step4_done', 'success', productId, '', req.user.name)
    }

    await logEvent(tutor.id, 'rzp_create', 'complete', 'success', accountId, '', req.user.name)

    const updated = await prisma.tutor.findUnique({ where: { id: tutor.id } })
    res.json(updated)
  } catch (err) {
    console.error('Create RZP account error for tutor', req.params.id, ':', err.message)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// ── Cron: refresh Razorpay account status for pending tutors ──
router.get('/refresh-rzp-status', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  await refreshRzpStatus(res, 'cron')
})

// ── Admin: manually refresh Razorpay status (bypass cron) ──
router.post('/refresh-rzp-status-manual', requireAuth, requireManager, async (req, res) => {
  await refreshRzpStatus(res, req.user.name || 'admin')
})

// Shared status refresh logic
async function refreshRzpStatus(res, actor) {
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
            await logEvent(t.id, 'rzp_status_refresh', actor, newStatus, t.paymentAccountId, '', actor)
            return true
          }
          return false
        } catch { return false }
      }))
      updated += results.filter(Boolean).length
    }
    res.json({ checked: pending.length, updated })
  } catch (err) {
    console.error('Refresh RZP status error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}

// ── Admin: update tutor's bank details + sync to Razorpay ──
// Archives old details to bank_details_history, updates DB, patches Razorpay settlement.
router.patch('/:id/update-bank-details', requireAuth, requireManager, async (req, res) => {
  if (process.env.PAYOUTS_ENABLED === 'false') {
    return res.status(503).json({ error: 'Payouts are temporarily disabled.' })
  }

  try {
    const tutor = await prisma.tutor.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' })

    const { accountHolderName, accountNumber, ifscCode, panNumber, email, reason } = req.body || {}

    if (!accountHolderName || !accountNumber || !ifscCode) {
      return res.status(400).json({ error: 'Account holder name, account number, and IFSC are required.' })
    }
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Reason for change is required.' })
    }

    // Validate formats (same as tutor submission)
    if (!/^[A-Za-z\s]+$/.test(accountHolderName)) {
      return res.status(400).json({ error: 'Account holder name must contain only letters and spaces.' })
    }
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 9–18 digits.' })
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifscCode).toUpperCase())) {
      return res.status(400).json({ error: 'Invalid IFSC code format.' })
    }

    // 1. Archive old details to history table
    await prisma.$executeRawUnsafe(
      `INSERT INTO bank_details_history (tutor_id, old_account_holder_name, old_account_number, old_ifsc_code, old_pan_number, old_email, new_account_holder_name, new_account_number, new_ifsc_code, new_pan_number, new_email, reason, changed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      tutor.id,
      tutor.accountHolderName || '', tutor.accountNumber || '', tutor.ifscCode || '', tutor.panNumber || '', tutor.email || '',
      accountHolderName.trim(), accountNumber.trim(), ifscCode.trim().toUpperCase(), (panNumber || tutor.panNumber || '').trim().toUpperCase(), (email || tutor.email || '').trim().toLowerCase(),
      reason.trim(), req.user.name || 'admin'
    )

    // 2. Update tutor record in DB
    const updateData = {
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
    }
    if (panNumber) updateData.panNumber = panNumber.trim().toUpperCase()
    if (email) updateData.email = email.trim().toLowerCase()

    await prisma.tutor.update({ where: { id: tutor.id }, data: updateData })

    // 3. Sync to Razorpay (only if account is fully configured)
    if (tutor.paymentAccountId && tutor.paymentProductId) {
      const headers = rzpHeaders()
      if (headers) {
        await logEvent(tutor.id, 'bank_update', 'rzp_sync_start', 'in_progress', tutor.paymentProductId, '', req.user.name)

        const r = await rzpCall('PATCH', `/v2/accounts/${tutor.paymentAccountId}/products/${tutor.paymentProductId}`, headers, {
          settlements: {
            account_number: accountNumber.trim(),
            ifsc_code: ifscCode.trim().toUpperCase(),
            beneficiary_name: accountHolderName.trim(),
          },
          tnc_accepted: true,
        })

        if (!r.ok) {
          const msg = r.data?.error?.description || JSON.stringify(r.data)
          await logEvent(tutor.id, 'bank_update', 'rzp_sync_fail', 'error', tutor.paymentProductId, msg, req.user.name)
          // DB is already updated — warn admin that Razorpay sync failed
          return res.status(200).json({
            warning: `Bank details saved in DB but Razorpay sync failed: ${msg}. Retry or update manually in Razorpay dashboard.`,
            tutor: await prisma.tutor.findUnique({ where: { id: tutor.id } }),
          })
        }
        // Reset status to 'created' — cron will re-check on next hourly run
        await prisma.tutor.update({
          where: { id: tutor.id },
          data: { paymentAccountStatus: 'created' },
        })
        await logEvent(tutor.id, 'bank_update', 'rzp_sync_done', 'success', tutor.paymentProductId, '', req.user.name)
      }
    }

    await logEvent(tutor.id, 'bank_update', 'complete', 'success', tutor.paymentAccountId || '', '', req.user.name)

    const updated = await prisma.tutor.findUnique({ where: { id: tutor.id } })
    res.json(updated)
  } catch (err) {
    console.error('Update bank details error for tutor', req.params.id, ':', err.message)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// ── Admin: fetch bank change history for a tutor ──
router.get('/:id/bank-history', requireAuth, requireManager, async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM bank_details_history WHERE tutor_id = $1 ORDER BY created_at DESC LIMIT 50`,
      parseInt(req.params.id)
    )
    res.json(rows)
  } catch (err) {
    console.error('Fetch bank history error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Admin: update tutor (restricted fields — payment fields blocked) ──
const TUTOR_SAFE_FIELDS = new Set([
  'name', 'phone', 'active', 'passDigits',
])
// Bank fields (accountHolderName, accountNumber, ifscCode, panNumber, email)
// can ONLY be changed via /update-bank-details which archives old values.
// Payment fields (paymentAccountId, paymentAccountStatus, etc.)
// can ONLY be set by the 4-step Razorpay flow.

router.patch('/:id', requireAuth, requireManager, async (req, res) => {
  // Filter out any payment-mapping fields
  const safeData = {}
  for (const [key, value] of Object.entries(req.body)) {
    if (TUTOR_SAFE_FIELDS.has(key)) {
      safeData[key] = value
    }
  }
  if (Object.keys(safeData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' })
  }
  const tutor = await prisma.tutor.update({
    where: { id: parseInt(req.params.id) },
    data: safeData,
  })
  res.json(tutor)
})

export default router
