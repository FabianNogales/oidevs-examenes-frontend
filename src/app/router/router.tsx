import { createBrowserRouter, Navigate } from 'react-router'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { AppLayout } from '@/layouts/AppLayout/AppLayout'
import { StudentLayout } from '@/layouts/StudentLayout/StudentLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'students',
        element: <StudentLayout />,
        children: [
          {
            path: 'qr',
            element: <StudentQrPage />,
          },
        ],
      },
    ],
  },
])
