import { create } from 'zustand'
import { api } from '@/lib/api'

export const useDataStore = create((set, get) => ({
  tutors: [], tuitions: [], attendance: {}, billings: {},
  payments: {}, attCompletions: {}, adminUsers: [], waClicks: {},
  loading: false, error: null,

  bootstrap: async () => {
    set({ loading: true, error: null })
    try {
      // Fetch tutors and tuitions in parallel — these always work
      const [tutors, tuitions] = await Promise.all([
        api.getTutors(),
        api.getTuitions(),
      ])
      set({ tutors, tuitions, loading: false })

      // Users — only for managers, fetch separately so it doesn't block
      api.getUsers()
        .then((adminUsers) => set({ adminUsers }))
        .catch(() => {}) // non-managers get 403, that's fine
    } catch (err) {
      console.error('Bootstrap error:', err)
      set({ error: err.message, loading: false })
    }
  },

  fetchTuitionDetail: async (enqId) => {
    try {
      const [attendance, billings, payments, completions] = await Promise.all([
        api.getAttendance(enqId),
        api.getBillings(enqId),
        api.getPayments(enqId),
        api.getAttCompletions(enqId).catch(() => []),
      ])
      const compMap = {}
      completions.forEach((c) => { compMap[`${c.enqId}_${c.monthKey}`] = c })
      set((s) => ({
        attendance:     { ...s.attendance,     [enqId]: attendance },
        billings:       { ...s.billings,       [enqId]: billings },
        payments:       { ...s.payments,       [enqId]: payments },
        attCompletions: { ...s.attCompletions, ...compMap },
      }))
    } catch (err) {
      console.error('fetchTuitionDetail error:', err)
    }
  },

  addTuition: async (data) => {
    const tuition = await api.createTuition(data)
    set((s) => ({ tuitions: [tuition, ...s.tuitions] }))
    return tuition
  },

  updateTuition: async (id, data) => {
    const tuition = await api.updateTuition(id, data)
    set((s) => ({ tuitions: s.tuitions.map((t) => (t.id === id ? tuition : t)) }))
    return tuition
  },

  addTutor: async (data) => {
    const tutor = await api.createTutor(data)
    set((s) => ({ tutors: [...s.tutors, tutor] }))
    return tutor
  },

  updateTutor: async (id, data) => {
    const tutor = await api.updateTutor(id, data)
    set((s) => ({ tutors: s.tutors.map((t) => (t.id === id ? tutor : t)) }))
    return tutor
  },

  addBilling: async (data) => {
    const billing = await api.createBilling(data)
    const enqId = data.enqId
    set((s) => ({ billings: { ...s.billings, [enqId]: [...(s.billings[enqId] || []), billing] } }))
    const payments = await api.getPayments(enqId)
    set((s) => ({ payments: { ...s.payments, [enqId]: payments } }))
    return billing
  },

  voidBilling: async (id, enqId, voidReason) => {
    const billing = await api.voidBilling(id, { voidReason })
    set((s) => ({ billings: { ...s.billings, [enqId]: s.billings[enqId]?.map((b) => (b.id === id ? billing : b)) || [] } }))
    const payments = await api.getPayments(enqId)
    set((s) => ({ payments: { ...s.payments, [enqId]: payments } }))
  },

  markManualPayment: async (paymentId, enqId, data) => {
    const payment = await api.markCollected(paymentId, data)
    set((s) => ({ payments: { ...s.payments, [enqId]: s.payments[enqId]?.map((p) => (p.id === paymentId ? payment : p)) || [] } }))
  },

  recordManualTransfer: async (paymentId, enqId, data) => {
    const payment = await api.recordTransfer(paymentId, data)
    set((s) => ({ payments: { ...s.payments, [enqId]: s.payments[enqId]?.map((p) => (p.id === paymentId ? payment : p)) || [] } }))
  },

  incrementWAClick: (key) =>
    set((s) => ({ waClicks: { ...s.waClicks, [key]: (s.waClicks[key] || 0) + 1 } })),

  addAdminUser: async (data) => {
    const user = await api.createUser(data)
    set((s) => ({ adminUsers: [...s.adminUsers, user] }))
    return user
  },

  updateAdminUser: async (id, data) => {
    const user = await api.updateUser(id, data)
    set((s) => ({ adminUsers: s.adminUsers.map((u) => (u.id === id ? user : u)) }))
    return user
  },

  getAttendanceFor: (enqId) => get().attendance[enqId] || [],
  getBillingsFor:   (enqId) => get().billings[enqId]   || [],
  getPaymentsFor:   (enqId) => get().payments[enqId]   || [],
}))
