import { useContext } from 'react'

import { AuthContext } from '@/app/providers/AuthProvider'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider',
    )
  }

  return context
}