import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ roles }) {
  const { sesion } = useAuth()

  if (!sesion) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(sesion.usuario.rol)) {
    return <Navigate to="/chat" replace />
  }

  return <Outlet />
}
