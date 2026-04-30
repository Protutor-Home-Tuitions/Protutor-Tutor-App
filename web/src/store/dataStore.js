/**
 * dataStore.js
 *
 * Single Zustand store holding ALL application data.
 * Phase 1: local in-memory (same as admin_1.html globals).
 * Phase 2: replace set() calls with API calls (React Query).
 *
 * Data shape is identical to the HTML file — same field names,
 * same seed data — so business logic functions work unchanged.
 */
import { create } from 'zustand'
import { SEED_TUTORS, SEED_TUITIONS, SEED_ATTENDANCE,
         SEED_BILLINGS, SEED_PAYMENTS, SEED_ATT_COMPLETIONS,
         SEED_ADMIN_USERS } from '@/data/seed'

export const useDataStore = create((set, get) => ({
  // ── Raw data ──
  tutors:          SEED_TUTORS,
  tuitions:        SEED_TUITIONS,
  attendance:      SEED_ATTENDANCE,
  billings:        SEED_BILLINGS,
  payments:        SEED_PAYMENTS,         // { [enqId]: [...paymentRows] }
  attCompletions:  SEED_ATT_COMPLETIONS,  // { "ENQ-001_2024-11": {...} }
  adminUsers:      SEED_ADMIN_USERS,
  waClicks:        {},                    // { "p_tuitionId": count, "t_tuitionId": count }

  // ── Tutor actions ──
  addTutor: (tutor) =>
    set((s) => ({ tutors: [...s.tutors, tutor] })),

  updateTutor: (id, updates) =>
    set((s) => ({
      tutors: s.tutors.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  // ── Tuition actions ──
  addTuition: (tuition) =>
    set((s) => ({ tuitions: [...s.tuitions, tuition] })),

  updateTuition: (id, updates) =>
    set((s) => ({
      tuitions: s.tuitions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  // ── Attendance actions ──
  addAttendance: (record) =>
    set((s) => ({ attendance: [...s.attendance, record] })),

  updateAttendance: (id, updates) =>
    set((s) => ({
      attendance: s.attendance.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  deleteAttendance: (id) =>
    set((s) => ({ attendance: s.attendance.filter((a) => a.id !== id) })),

  // ── Billing actions ──
  addBilling: (billing) =>
    set((s) => ({ billings: [...s.billings, billing] })),

  voidBilling: (id, voidedBy, voidReason) =>
    set((s) => ({
      billings: s.billings.map((b) =>
        b.id === id
          ? { ...b, status: 'voided', voidedBy, voidedAt: new Date().toISOString(), voidReason }
          : b
      ),
    })),

  // ── Payment actions ──
  initPayments: (enqId) =>
    set((s) => ({
      payments: { ...s.payments, [enqId]: s.payments[enqId] || [] },
    })),

  addPaymentRow: (enqId, row) =>
    set((s) => ({
      payments: {
        ...s.payments,
        [enqId]: [...(s.payments[enqId] || []), row],
      },
    })),

  updatePaymentRow: (enqId, monthKey, updates) =>
    set((s) => {
      const rows = s.payments[enqId] || []
      return {
        payments: {
          ...s.payments,
          [enqId]: rows.map((p) =>
            p.monthKey === monthKey && p.paymentStatus !== 'Voided'
              ? { ...p, ...updates }
              : p
          ),
        },
      }
    }),

  voidPaymentRow: (enqId, monthKey) =>
    set((s) => {
      const rows = s.payments[enqId] || []
      return {
        payments: {
          ...s.payments,
          [enqId]: rows.map((p) =>
            p.monthKey === monthKey ? { ...p, paymentStatus: 'Voided' } : p
          ),
        },
      }
    }),

  // ── Att completions ──
  setAttCompletion: (enqId, monthKey, data) =>
    set((s) => ({
      attCompletions: {
        ...s.attCompletions,
        [`${enqId}_${monthKey}`]: data,
      },
    })),

  // ── WhatsApp click tracking ──
  incrementWAClick: (key) =>
    set((s) => ({
      waClicks: { ...s.waClicks, [key]: (s.waClicks[key] || 0) + 1 },
    })),

  // ── Admin users ──
  addAdminUser: (user) =>
    set((s) => ({ adminUsers: [...s.adminUsers, user] })),

  updateAdminUser: (id, updates) =>
    set((s) => ({
      adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    })),
}))
