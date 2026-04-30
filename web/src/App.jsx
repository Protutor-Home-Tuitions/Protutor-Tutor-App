import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/features/auth/LoginPage'
import AppShell from '@/components/layout/AppShell'
import TuitionsPage from '@/features/tuitions/TuitionsPage'
import AttendancePage from '@/features/attendance/AttendancePage'
import TutorsPage from '@/features/tutors/TutorsPage'
import UsersPage from '@/features/users/UsersPage'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/tuitions" replace />} />
        <Route path="tuitions" element={<TuitionsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="tutors" element={<TutorsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  )
}
