/**
 * seed.cjs — CommonJS version for Prisma seeding compatibility
 * Run with: npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ProTutor database...')

  await prisma.payment.deleteMany()
  await prisma.billing.deleteMany()
  await prisma.attCompletion.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.tuition.deleteMany()
  await prisma.tutor.deleteMany()
  await prisma.adminUser.deleteMany()
  console.log('✓ Cleared existing data')

  await prisma.adminUser.create({
    data: {
      id: 1, name: 'Admin', phone: '9042120201',
      email: '9042120201', password: 'provig@201',
      role: 'manager', cities: [], status: 'active',
    },
  })
  console.log('✓ Admin users seeded')

  await prisma.tutor.createMany({
    data: [
      { id: 1, name: 'Rajesh Kumar', phone: '9876543210', active: true, passDigits: '987', paymentAccountId: 'acc_RajeshRazor001', accountHolderName: 'Rajesh Kumar', accountNumber: '1234567890001', ifscCode: 'HDFC0001234', ifscVerified: true, panNumber: 'ABCDE1234F', email: 'rajesh.kumar@email.com' },
      { id: 2, name: 'Priya Menon', phone: '9123456789', active: true, passDigits: '912', paymentAccountId: '', accountHolderName: 'Priya Menon', accountNumber: '9876543210002', ifscCode: 'SBIN0056789', ifscVerified: true, panNumber: 'FGHIJ5678K', email: 'priya.menon@email.com' },
      { id: 3, name: 'Arun Nair', phone: '9845001234', active: true, passDigits: '451', paymentAccountId: '', accountHolderName: '', accountNumber: '', ifscCode: '', ifscVerified: false, panNumber: '', email: '' },
      { id: 4, name: 'Suresh Babu', phone: '9988776655', active: false, passDigits: '655', paymentAccountId: '', accountHolderName: '', accountNumber: '', ifscCode: '', ifscVerified: false, panNumber: '', email: '' },
    ],
  })
  console.log('✓ Tutors seeded')

  await prisma.tuition.createMany({
    data: [
      { id: 't-uuid-001-arjun-sharma-cbse-10', enqId: 'ENQ-001', studentName: 'Arjun Sharma', parentName: 'Ramesh Sharma', parentPhone: '9001110001', standard: '10th', board: 'CBSE', city: 'Chennai', subjects: ['Mathematics','Physics'], days: ['Mon','Wed','Fri'], duration: '1.5', feeTutor: 3000, feeParent: 4000, feeCompany: 1000, commission: 1500, feeType: 'Monthly', repeatPayment: true, tutorId: 1, demo: '2024-11-01', start: '2024-11-05', active: true, createdBy: 'Admin', createdAt: new Date('2024-11-01T09:00:00') },
      { id: 't-uuid-002-sneha-iyer-cbse-8', enqId: 'ENQ-002', studentName: 'Sneha Iyer', parentName: 'Kavitha Iyer', parentPhone: '9002220002', standard: '8th', board: 'CBSE', city: 'Chennai', subjects: ['Mathematics'], days: ['Tue','Thu'], duration: '1', feeTutor: 2500, feeParent: 3500, feeCompany: 1000, commission: 1250, feeType: 'Monthly', repeatPayment: true, tutorId: 2, demo: '2025-01-10', start: '2025-01-15', active: true, createdBy: 'Admin', createdAt: new Date('2025-01-10T09:00:00') },
      { id: 't-uuid-003-vikram-reddy-cbse-12', enqId: 'ENQ-003', studentName: 'Vikram Reddy', parentName: 'Suresh Reddy', parentPhone: '9003330003', standard: '12th', board: 'CBSE', city: 'Bangalore', subjects: ['Physics','Chemistry','Mathematics'], days: ['Mon','Tue','Wed','Thu','Fri'], duration: '2', feeTutor: 5000, feeParent: 6000, feeCompany: 1000, commission: 2500, feeType: 'Monthly', repeatPayment: true, tutorId: 1, demo: '2025-03-01', start: '2025-03-05', active: true, createdBy: 'Coordinator', createdAt: new Date('2025-03-01T09:00:00') },
      { id: 't-uuid-004-priya-das-state-6', enqId: 'ENQ-004', studentName: 'Priya Das', parentName: 'Arun Das', parentPhone: '9004440004', standard: '6th', board: 'State', city: 'Chennai', subjects: ['Mathematics','Science'], days: ['Mon','Wed'], duration: '1', feeTutor: 2000, feeParent: 3000, feeCompany: 1000, commission: 1000, feeType: 'Monthly', repeatPayment: true, tutorId: 3, demo: '2025-09-01', start: '2025-09-05', active: true, createdBy: 'Admin', createdAt: new Date('2025-09-01T09:00:00') },
      { id: 't-uuid-005-kiran-mehta-icse-9', enqId: 'ENQ-005', studentName: 'Kiran Mehta', parentName: 'Sunil Mehta', parentPhone: '9005550005', standard: '9th', board: 'ICSE', city: 'Mumbai', subjects: ['Mathematics','Science','English'], days: ['Tue','Fri'], duration: '1.5', feeTutor: 2500, feeParent: 3500, feeCompany: 1000, commission: 1250, feeType: 'Session', repeatPayment: false, tutorId: 2, demo: '2025-11-01', start: '2025-11-05', active: true, createdBy: 'Coordinator', createdAt: new Date('2025-11-01T09:00:00') },
      { id: 't-uuid-006-rohit-pillai-cbse-7', enqId: 'ENQ-006', studentName: 'Rohit Pillai', parentName: 'Rajan Pillai', parentPhone: '9006660006', standard: '7th', board: 'CBSE', city: 'Bangalore', subjects: ['Social','English'], days: ['Wed','Fri'], duration: '1', feeTutor: 2200, feeParent: 3200, feeCompany: 1000, commission: 1100, feeType: 'Monthly', repeatPayment: false, tutorId: 1, demo: '2025-04-01', start: '2025-04-05', active: false, createdBy: 'Admin', createdAt: new Date('2025-04-01T09:00:00') },
      { id: 't-uuid-007-meera-nair-cbse-11', enqId: 'ENQ-007', studentName: 'Meera Nair', parentName: 'Sunil Nair', parentPhone: '9007770007', standard: '11th', board: 'CBSE', city: 'Chennai', subjects: ['Physics','Chemistry'], days: ['Mon','Wed','Fri'], duration: '1.5', feeTutor: 3500, feeParent: 4500, feeCompany: 1000, commission: 2500, feeType: 'Monthly', repeatPayment: true, tutorId: 2, demo: '2026-01-05', start: '2026-01-10', active: true, createdBy: 'Admin', createdAt: new Date('2026-01-05T09:00:00') },
      { id: 't-uuid-008-aryan-das-icse-8', enqId: 'ENQ-008', studentName: 'Aryan Das', parentName: 'Kavitha Das', parentPhone: '9008880008', standard: '8th', board: 'ICSE', city: 'Chennai', subjects: ['Mathematics','Science'], days: ['Tue','Thu','Sat'], duration: '1', feeTutor: 2000, feeParent: 3000, feeCompany: 1000, commission: 1000, feeType: 'Monthly', repeatPayment: true, tutorId: 1, demo: '2025-12-20', start: '2026-01-05', active: true, createdBy: 'Coordinator', createdAt: new Date('2025-12-20T09:00:00') },
    ],
  })
  console.log('✓ Tuitions seeded')

  await prisma.attendance.createMany({
    data: [
      { id: 'att-uuid-a001', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-06', time: '4:00 PM', dur: '1.5', subj: 'Mathematics', topic: 'Algebra basics', markedAt: new Date('2024-11-06T16:05:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-a002', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-08', time: '4:00 PM', dur: '1.5', subj: 'Mathematics', topic: 'Linear equations', markedAt: new Date('2024-11-08T16:10:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-a003', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-11', time: '4:00 PM', dur: '1.5', subj: 'Physics', topic: 'Newton laws', markedAt: new Date('2024-11-11T16:08:00'), byAdmin: false, isDemo: false, parentComment: 'Good class', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-a004', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-13', time: '4:00 PM', dur: '1.5', subj: 'Mathematics', topic: 'Quadratic equations', markedAt: new Date('2024-11-13T16:12:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-a005', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-15', time: '4:00 PM', dur: '1.5', subj: 'Physics', topic: 'Motion', markedAt: new Date('2024-11-15T16:07:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-a006', enqId: 'ENQ-001', tutorId: 1, date: '2024-11-18', time: '4:00 PM', dur: '1.5', subj: 'Mathematics', topic: 'Polynomials', markedAt: new Date('2024-11-18T16:09:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2024-11' },
      { id: 'att-uuid-b001', enqId: 'ENQ-007', tutorId: 2, date: '2026-01-12', time: '5:00 PM', dur: '1.5', subj: 'Physics', topic: 'Electrostatics', markedAt: new Date('2026-01-12T17:10:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Priya Menon', monthKey: '2026-01' },
      { id: 'att-uuid-b002', enqId: 'ENQ-007', tutorId: 2, date: '2026-01-14', time: '5:00 PM', dur: '1.5', subj: 'Chemistry', topic: 'Periodic table', markedAt: new Date('2026-01-14T17:12:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Priya Menon', monthKey: '2026-01' },
      { id: 'att-uuid-c001', enqId: 'ENQ-008', tutorId: 1, date: '2026-01-07', time: '4:30 PM', dur: '1', subj: 'Mathematics', topic: 'Algebra', markedAt: new Date('2026-01-07T16:35:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2026-01' },
      { id: 'att-uuid-c002', enqId: 'ENQ-008', tutorId: 1, date: '2026-01-09', time: '4:30 PM', dur: '1', subj: 'Science', topic: 'Light', markedAt: new Date('2026-01-09T16:38:00'), byAdmin: false, isDemo: false, parentComment: '', markedBy: 'Rajesh Kumar', monthKey: '2026-01' },
    ],
  })
  console.log('✓ Attendance seeded')

  await prisma.attCompletion.createMany({
    data: [
      { enqId: 'ENQ-001', monthKey: '2024-11', completedAt: new Date('2024-11-30T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-001', monthKey: '2024-12', completedAt: new Date('2024-12-31T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-001', monthKey: '2025-01', completedAt: new Date('2025-01-31T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-001', monthKey: '2025-02', completedAt: new Date('2025-02-28T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-001', monthKey: '2025-03', completedAt: new Date('2025-03-31T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-001', monthKey: '2026-01', completedAt: new Date('2026-01-31T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-007', monthKey: '2026-01', completedAt: new Date('2026-01-31T20:05:00'), completedBy: 'Priya Menon', tutorPhone: '9123456789' },
      { enqId: 'ENQ-007', monthKey: '2026-02', completedAt: new Date('2026-02-28T20:05:00'), completedBy: 'Priya Menon', tutorPhone: '9123456789' },
      { enqId: 'ENQ-007', monthKey: '2026-03', completedAt: new Date('2026-03-31T20:05:00'), completedBy: 'Admin', tutorPhone: '9123456789' },
      { enqId: 'ENQ-008', monthKey: '2026-01', completedAt: new Date('2026-01-31T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
      { enqId: 'ENQ-008', monthKey: '2026-02', completedAt: new Date('2026-02-28T20:05:00'), completedBy: 'Rajesh Kumar', tutorPhone: '9876543210' },
    ],
  })
  console.log('✓ Att completions seeded')

  // Billings one by one (need IDs for payment FK)
  await prisma.billing.create({ data: { id: 'bill-uuid-001-202411', enqId: 'ENQ-001', monthKey: '2024-11', createdBy: 'Admin', status: 'active', snapStudentName: 'Arjun Sharma', snapFeeParent: 4000, snapFeeTutor: 3000, snapFeeType: 'Monthly', snapCommission: 1500, snapDays: ['Mon','Wed','Fri'], snapDuration: '1.5', snapSubjects: ['Mathematics','Physics'], snapClasses: 6, snapHours: 9, snapAmountP: 1142, snapAmountT: 857, snapFeeC: 285, snapCountLabel: '6 classes', snapCalcStr: '6 classes × ₹4000 ÷ 21 working days = ₹1142' }})
  await prisma.billing.create({ data: { id: 'bill-uuid-007-202601-v', enqId: 'ENQ-007', monthKey: '2026-01', createdBy: 'Admin', status: 'voided', voidedBy: 'Admin', voidedAt: new Date('2026-02-03T09:00:00'), voidReason: 'Wrong attendance count', snapStudentName: 'Meera Nair', snapFeeParent: 4500, snapFeeTutor: 3500, snapFeeType: 'Monthly', snapCommission: 1800, snapDays: ['Mon','Wed','Fri'], snapDuration: '1.5', snapSubjects: ['Physics','Chemistry'], snapClasses: 8, snapHours: 12, snapAmountP: 1928, snapAmountT: 1333, snapFeeC: 595, snapCountLabel: '8 classes', snapCalcStr: '8 classes × ₹4500 ÷ 21 working days = ₹1928' }})
  await prisma.billing.create({ data: { id: 'bill-uuid-007-202601', enqId: 'ENQ-007', monthKey: '2026-01', createdBy: 'Admin', status: 'active', snapStudentName: 'Meera Nair', snapFeeParent: 4500, snapFeeTutor: 3500, snapFeeType: 'Monthly', snapCommission: 1800, snapDays: ['Mon','Wed','Fri'], snapDuration: '1.5', snapSubjects: ['Physics','Chemistry'], snapClasses: 6, snapHours: 9, snapAmountP: 1285, snapAmountT: 1000, snapFeeC: 285, snapCountLabel: '6 classes', snapCalcStr: '6 classes × ₹4500 ÷ 21 working days = ₹1285' }})
  await prisma.billing.create({ data: { id: 'bill-uuid-007-202603', enqId: 'ENQ-007', monthKey: '2026-03', createdBy: 'Admin', status: 'active', zeroBill: true, zeroBillReason: 'Student hospitalised', snapStudentName: 'Meera Nair', snapFeeParent: 4500, snapFeeTutor: 3500, snapFeeType: 'Monthly', snapCommission: 2500, snapDays: ['Mon','Wed','Fri'], snapDuration: '1.5', snapSubjects: ['Physics','Chemistry'], snapClasses: 0, snapHours: 0, snapAmountP: 0, snapAmountT: 0, snapFeeC: 0, snapCountLabel: '0 classes', snapCalcStr: '0 classes — no fee this month' }})
  await prisma.billing.create({ data: { id: 'bill-uuid-008-202601', enqId: 'ENQ-008', monthKey: '2026-01', createdBy: 'Admin', status: 'active', snapStudentName: 'Aryan Das', snapFeeParent: 3000, snapFeeTutor: 2000, snapFeeType: 'Monthly', snapCommission: 1000, snapDays: ['Tue','Thu','Sat'], snapDuration: '1', snapSubjects: ['Mathematics','Science'], snapClasses: 5, snapHours: 5, snapAmountP: 714, snapAmountT: 476, snapFeeC: 238, snapCountLabel: '5 classes', snapCalcStr: '5 classes × ₹3000 ÷ 21 working days = ₹714' }})
  console.log('✓ Billings seeded')

  await prisma.payment.createMany({
    data: [
      { enqId: 'ENQ-001', monthKey: '2024-11', billingId: 'bill-uuid-001-202411', paymentLink: 'https://pay.protutor.in/p/ENQ001-2411', paymentId: 'PAY-24110101', paymentStatus: 'Success', paymentMode: '', manualCollectedBy: '', collectedAt: new Date('2024-12-02T10:00:00'), transferId: 'TRF-ENQ001-NOV24', utr: 'HDFC2411001', transferStatus: 'Settled', snapAccountId: 'acc_RajeshRazor001', transferCreatedBy: 'Admin', transferCreatedAt: new Date('2024-12-03T10:00:00') },
      { enqId: 'ENQ-007', monthKey: '2026-01', paymentLink: 'https://pay.protutor.in/p/T007-2601-old', paymentId: '', paymentStatus: 'Voided', paymentMode: '', manualCollectedBy: '', voidedAt: new Date('2026-02-03T09:00:00'), voidedBy: 'Admin' },
      { enqId: 'ENQ-007', monthKey: '2026-01', billingId: 'bill-uuid-007-202601', paymentLink: 'https://pay.protutor.in/p/T007-2601', paymentId: 'PAY-26010701', paymentStatus: 'Success', paymentMode: '', manualCollectedBy: '', collectedAt: new Date('2026-02-05T11:00:00') },
      { enqId: 'ENQ-007', monthKey: '2026-03', billingId: 'bill-uuid-007-202603', paymentLink: '', paymentId: 'ZERO-BILL-007-202603', paymentStatus: 'Success', paymentMode: 'Zero-Bill', manualCollectedBy: 'Admin', collectedAt: new Date('2026-04-01T10:00:00'), transferStatus: 'NA' },
      { enqId: 'ENQ-008', monthKey: '2026-01', billingId: 'bill-uuid-008-202601', paymentLink: 'https://pay.protutor.in/p/T008-2601', paymentId: 'MANUAL-GPay-9008880008-20260205', paymentStatus: 'Success', paymentMode: 'GPay', manualCollectedBy: 'Admin', collectedAt: new Date('2026-02-05T00:00:00'), transferId: 'MANUAL-XFER-008-JAN26', utr: 'HDFC2601008', transferStatus: 'Completed', snapAccountId: 'acc_RajeshRazor001', transferAmtOverride: 0, transferAmtOverrideReason: 'Comm absorbing', transferCreatedBy: 'Admin', transferCreatedAt: new Date('2026-02-06T10:00:00') },
      { enqId: 'ENQ-008', monthKey: '2026-02', paymentLink: 'https://pay.protutor.in/p/T008-2602', paymentId: '', paymentStatus: 'Pending', paymentMode: '', manualCollectedBy: '' },
    ],
  })
  console.log('✓ Payments seeded')

  console.log('\n✅ Database seeded successfully!')
  console.log('   Login: 9042120201 / provig@201')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
