/**
 * api.js — central fetch wrapper for all API calls.
 * Reads token from localStorage, adds Authorization header.
 * Phase 3: all data comes from here instead of seed.js
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getToken() {
  return localStorage.getItem('protutor_token')
}

async function request(method, path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),

  // Auth
  login:  (phone, password) => request('POST', '/auth/login', { phone, password }),

  // Tuitions
  getTuitions:   ()         => request('GET',   '/tuitions'),
  createTuition: (data)     => request('POST',  '/tuitions', data),
  updateTuition: (id, data) => request('PATCH', `/tuitions/${id}`, data),

  // Tutors
  getTutors:   ()         => request('GET',   '/tutors'),
  createTutor: (data)     => request('POST',  '/tutors', data),
  updateTutor: (id, data) => request('PATCH', `/tutors/${id}`, data),

  // Attendance
  getAttendance:   (enqId) => request('GET',    `/attendance/${enqId}`),
  createAttendance:(data)  => request('POST',   '/attendance', data),
  updateAttendance:(id, data) => request('PATCH', `/attendance/${id}`, data),
  deleteAttendance:(id)    => request('DELETE', `/attendance/${id}`),

  // Att completions
  getAttCompletions: (enqId) => request('GET', `/attendance/completions/${enqId}`),

  // Billings
  getBillings:   (enqId)     => request('GET',   `/billing/${enqId}`),
  createBilling: (data)      => request('POST',  '/billing', data),
  voidBilling:   (id, data)  => request('PATCH', `/billing/${id}/void`, data),

  // Payments
  getPayments:     (enqId)      => request('GET',   `/payments/${enqId}`),
  markCollected:   (id, data)   => request('PATCH', `/payments/${id}/collect`, data),
  recordTransfer:  (id, data)   => request('PATCH', `/payments/${id}/transfer`, data),

  // Users
  getUsers:    ()         => request('GET',   '/users'),
  createUser:  (data)     => request('POST',  '/users', data),
  updateUser:  (id, data) => request('PATCH', `/users/${id}`, data),
}
