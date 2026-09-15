import { Outlet, useNavigate } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Header } from '@/shared/components/Header/Header'

export function AppLayout() {
  const navigate = useNavigate()
  const {
    user,
    isLoading,
    isLoggingOut,
    logout,
  } = useAuth()

  if (isLoading) {
    return null
  }

  return (
    <>
      <Header
        user={user}
        isLoggingOut={isLoggingOut}
        onLogout={async () => {
          await logout()
          navigate('/', { replace: true })
        }}
      />

      <Outlet />
    </>
  )
}