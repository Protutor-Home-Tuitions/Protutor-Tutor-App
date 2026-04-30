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

// ── CORS — allow React dev server ──
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
}))

app.use(express.json())

// ── Request logger (dev only) ──
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

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`✅ ProTutor API running on http://localhost:${PORT}`)
})
