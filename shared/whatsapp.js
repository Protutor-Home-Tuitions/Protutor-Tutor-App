import { fmtStartDate } from './dateUtils.js'

/**
 * Build parent WhatsApp message and open in WhatsApp.
 */
export function buildParentWAMessage({ tuition, tutor, senderName }) {
  const startDate = fmtStartDate(tuition.start)
  const days      = tuition.days.join(', ')

  return [
    `Dear ${tuition.parentName || tuition.studentName},`,
    '',
    `${tutor?.name || 'Your tutor'} has been assigned to start classes for your child from ${startDate}.`,
    '',
    '*Class Details*',
    `• ${days} days/week, ${tuition.duration} hours/day`,
    `• Fee: ₹${tuition.feeParent}/${tuition.feeType}`,
    '',
    '*Payment Policy*',
    'All payments must be made only to ProTutor via the official payment link.',
    '⚠️Direct payment to the tutor is not permitted. Any such payment may lead to cancellation of services and discontinuation of support from ProTutor.',
    '',
    '*Payment Process*',
    '• This is a post-payment model (month-end)(offline only)',
    '• Tutor will maintain attendance records',
    '• Based on attendance, ProTutor will share the payment link at month-end (30th/31st)',
    '',
    '*Fee Calculation Method*',
    '• Payable Fee(Hour & Session basis) = (Per hour/session fee) × (Actual hours/session conducted)',
    '• Payable Fee(month basis) = (Monthly fee/Total working days) × (Actual no.of classes conducted)',
    '• Total working days = Number of weekdays (Monday to Friday) in the month',
    '',
    'Note',
    '• Tutors will not ask for any advance payment.',
    '',
    'Regards,',
    senderName || 'ProTutor Team',
    'ProTutor',
  ].join('\n')
}

export function buildTutorWAMessage({ tuition, tutor, senderName }) {
  const startDate = fmtStartDate(tuition.start)
  const days      = tuition.days.join(', ')

  return [
    `Dear ${tutor.name},`,
    `Regarding ${tuition.parentName || tuition.studentName} client – ${tuition.parentPhone || ''}`,
    `As discussed, the classes have started from ${startDate} for ${tuition.studentName}.`,
    'Final Class Plan & Fee Structure',
    `• Weekly ${days} days, ${tuition.duration} hours/day`,
    `• Fee: ₹${tuition.feeTutor}/${tuition.feeType} (Offline class)`,
    'Deduction & Payment Terms',
    `• ProTutor fee: ₹${tuition.commission || '—'} (2 weeks fee)`,
    '• Remaining amount will be paid to you after deduction every month',
    '• Billing cycle: Month-end (30th/31st)',
    '• Payment will be collected by ProTutor and released to you after deduction on the next day',
    'Attendance & Payment Process (Important)',
    '• Mark attendance daily without fail for timely payment',
    '• Login: https://attendance.protutor.in',
    '• Username & password shared via 9626080470 (check chat)',
    '• At month-end, verify and submit final attendance in the app',
    '• Update your bank account details in the app (if not already done)',
    'Important Guidelines',
    'Kindly confirm once the first class is completed',
    'Maintain attendance regularly in the system',
    'Inform us if classes are paused/cancelled within 3 months',
    'Any direct payment from parent without consent is a policy violation and will affect future opportunities',
    'Future tuition opportunities depend on performance and feedback',
    '',
    '*Fee Calculation Method*',
    '• Payable Fee(Hour & Session basis) = (Per hour/session fee) × (Actual hours/session conducted)',
    '• Payable Fee(month basis) = (Monthly fee/Total working days) × (Actual no.of classes conducted)',
    '• Total working days = Number of weekdays (Monday to Friday) in the month',
    'For any support or queries, please contact our team.',
    'Regards,',
    senderName || 'ProTutor Team',
    'ProTutor',
  ].join('\n')
}

export function openWhatsApp(phone, message) {
  const url = `https://api.whatsapp.com/send/?phone=91${phone}&text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
