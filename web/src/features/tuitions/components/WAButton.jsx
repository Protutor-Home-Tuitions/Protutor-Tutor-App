/**
 * WAButton — WhatsApp icon button with click counter.
 * Builds the message and opens WhatsApp in a new tab.
 */
import { useDataStore } from '@/store/dataStore'
import { useAuthStore } from '@/store/authStore'
import { buildParentWAMessage, buildTutorWAMessage, openWhatsApp } from 'protutor-shared'

const WA_ICON = (color) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M11.99 2C6.476 2 2 6.476 2 11.99c0 1.93.544 3.732 1.487 5.261L2 22l4.878-1.468A9.94 9.94 0 0011.99 22C17.504 22 22 17.524 22 12.01 22 6.496 17.504 2 11.99 2zm0 18.18c-1.706 0-3.295-.49-4.64-1.334l-.332-.197-3.468 1.043 1.051-3.397-.217-.35A8.14 8.14 0 013.82 12.01c0-4.512 3.67-8.18 8.17-8.18 4.5 0 8.17 3.668 8.17 8.168 0 4.502-3.67 8.17-8.17 8.17z" />
  </svg>
)

export function WAParentButton({ tuition }) {
  const tutors          = useDataStore((s) => s.tutors)
  const waClicks        = useDataStore((s) => s.waClicks)
  const incrementWAClick = useDataStore((s) => s.incrementWAClick)
  const user            = useAuthStore((s) => s.user)

  const key    = `p_${tuition.id}`
  const count  = waClicks[key] || 0
  const tutor  = tutors.find((tu) => tu.id === tuition.tutorId)

  function handleClick(e) {
    e.stopPropagation()
    const msg = buildParentWAMessage({ tuition, tutor, senderName: user?.name })
    openWhatsApp(tuition.parentPhone, msg)
    incrementWAClick(key)
  }

  return (
    <button
      onClick={handleClick}
      title="WhatsApp Parent"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border-none"
      style={{ background: '#DCFCE7', color: '#15803D' }}
    >
      {WA_ICON('#15803D')}
      WA {count > 0 && <span className="text-green-800">({count})</span>}
    </button>
  )
}

export function WATutorButton({ tuition }) {
  const tutors          = useDataStore((s) => s.tutors)
  const waClicks        = useDataStore((s) => s.waClicks)
  const incrementWAClick = useDataStore((s) => s.incrementWAClick)
  const user            = useAuthStore((s) => s.user)

  const tutor = tutors.find((tu) => tu.id === tuition.tutorId)
  if (!tutor) return null

  const key   = `t_${tuition.id}`
  const count = waClicks[key] || 0

  function handleClick(e) {
    e.stopPropagation()
    const msg = buildTutorWAMessage({ tuition, tutor, senderName: user?.name })
    openWhatsApp(tutor.phone, msg)
    incrementWAClick(key)
  }

  return (
    <button
      onClick={handleClick}
      title="WhatsApp Tutor"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border-none"
      style={{ background: '#F5F3FF', color: '#7C3AED' }}
    >
      {WA_ICON('#7C3AED')}
      WA {count > 0 && <span style={{ color: '#6D28D9' }}>({count})</span>}
    </button>
  )
}
