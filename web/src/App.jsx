import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage      from '@/features/auth/LoginPage'
import AppShell       from '@/components/layout/AppShell'
import DashboardPage  from '@/features/dashboard/DashboardPage'
import TuitionsPage   from '@/features/tuitions/TuitionsPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import TutorsPage     from '@/features/tutors/TutorsPage'
import UsersPage      from '@/features/users/UsersPage'
import ParentsPage    from '@/features/parents/ParentsPage'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index                element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="tuitions"     element={<TuitionsPage />} />
        <Route path="attendance"   element={<AttendancePage />} />
        <Route path="tutors"       element={<TutorsPage />} />
        <Route path="users"        element={<UsersPage />} />
        <Route path="parents"      element={<ParentsPage />} />
      </Route>
    </Routes>
  )
}
