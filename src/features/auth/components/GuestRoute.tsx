import { Navigate, Outlet } from 'react-router'
import { SessionLoading } from '@/features/auth/components/SessionLoading'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <SessionLoading />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
