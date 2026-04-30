import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorised' })
  }
  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireManager(req, res, next) {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Manager access required' })
  }
  next()
}

export function requireCanWrite(req, res, next) {
  if (!['manager', 'coordinator'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Write access required' })
  }
  next()
}
