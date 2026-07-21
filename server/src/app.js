import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes       from './routes/auth.js'
import tutorRoutes      from './routes/tutors.js'
import tuitionRoutes    from './routes/tuitions.js'
import attendanceRoutes from './routes/attendance.js'
import billingRoutes    from './routes/billing.js'
import paymentRoutes    from './routes/payments.js'
import userRoutes       from './routes/users.js'
dotenv.config()

const app  = express()
const PORT = process.env.PORT || 4000

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://panel.protutor.co.in',
  'https://attendance.protutor.co.in',
  'https://parent.protutor.co.in',    // reserved for future parent app
  process.env.FRONTEND_URL,
].filter(Boolean)

// ═══════════════════════════════════════════════════════════════
// LAYER 1: Cache prevention — MUST be first middleware
// Prevents Vercel Edge / browsers from caching CORS responses
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

// ═══════════════════════════════════════════════════════════════
// LAYER 2: Explicit CORS headers — reflected per origin
// Works even when Vercel serves timeout error responses
// ═══════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-cron-secret')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  // Handle preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  next()
})

// ═══════════════════════════════════════════════════════════════
// LAYER 3: cors() middleware — safety net for edge cases
// ═══════════════════════════════════════════════════════════════
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(null, false)
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-cron-secret'],
}))

app.use(express.json())

// ── Request logger ──
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// ── Routes ──
app.use('/api/auth',       authRoutes)
app.use('/api/tutors',     tutorRoutes)
app.use('/api/tuitions',   tuitionRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/billing',    billingRoutes)
app.use('/api/payments',   paymentRoutes)
app.use('/api/users',      userRoutes)

// ── Health check ──
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

// ── Global error handler — keeps CORS headers on error responses ──
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.status(500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`✅ ProTutor API running on http://localhost:${PORT}`)
})
