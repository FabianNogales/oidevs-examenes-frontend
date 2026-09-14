import { Outlet } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Header } from '@/shared/components/Header/Header'

export function AppLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  return (
    <>
      <Header user={user} />

      <Outlet />
    </>
  )
}