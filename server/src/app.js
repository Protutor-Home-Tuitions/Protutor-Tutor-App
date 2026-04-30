import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes      from './routes/auth.js'
import tutorRoutes     from './routes/tutors.js'
import tuitionRoutes   from './routes/tuitions.js'
import attendanceRoutes from './routes/attendance.js'
import billingRoutes   from './routes/billing.js'
import paymentRoutes   from './routes/payments.js'
import userRoutes      from './routes/users.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middleware ──
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`ProTutor API running on http://localhost:${PORT}`)
})
