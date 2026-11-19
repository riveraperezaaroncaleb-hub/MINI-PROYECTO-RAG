import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ChatView from './views/ChatView'
import DashboardView from './views/DashboardView'
import LoginView from './views/LoginView'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/chat" element={<ChatView />} />

          <Route element={<ProtectedRoute roles={['RRHH']} />}>
            <Route path="/dashboard" element={<DashboardView />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
