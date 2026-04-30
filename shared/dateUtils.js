import { MN_FULL, MN_SHORT } from './constants.js'

/** Format date string 'YYYY-MM-DD' → 'DD/Mon/YY' */
export function fd(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${MN_SHORT[parseInt(m) - 1]}/${y.slice(2)}`
}

/** Format 'YYYY-MM' → 'Nov 24' */
export function fmtMonthKey(monthKey) {
  if (!monthKey) return '—'
  const [y, m] = monthKey.split('-')
  return `${MN_SHORT[parseInt(m) - 1]} ${y.slice(2)}`
}

/** Format 'YYYY-MM' → 'November 2024' */
export function fmtMonthKeyFull(monthKey) {
  if (!monthKey) return '—'
  const [y, m] = monthKey.split('-')
  return `${MN_FULL[parseInt(m) - 1]} ${y}`
}

/** Format date string for WhatsApp messages: '2026-01-10' → '10 January' */
export function fmtStartDate(dateStr) {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d)} ${MN_FULL[parseInt(m) - 1]}`
}

/** Get current month key 'YYYY-MM' */
export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Format ISO timestamp to 'DD/MM/YY · HH:MM AM/PM' */
export function fmtTimestamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} · ${time}`
}

/** Days ago from today */
export function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime()
  return Math.floor(diff / 86400000)
}
