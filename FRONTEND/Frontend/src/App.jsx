import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ChatView from './views/ChatView'
import DashboardView from './views/DashboardView'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/chat" element={<ChatView />} />
        <Route path="/dashboard" element={<DashboardView />} />
      </Route>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="/login" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
