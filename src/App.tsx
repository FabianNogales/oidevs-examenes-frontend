import { RouterProvider } from 'react-router'
import { router } from '@/app/router/router'
import { AuthProvider } from '@/features/auth/providers/AuthProvider'

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
