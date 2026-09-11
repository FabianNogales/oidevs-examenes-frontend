import { createBrowserRouter } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { StudentLayout } from '@/layouts/StudentLayout/StudentLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/students',
    element: <StudentLayout />,
    children: [
      {
        path: 'qr',
        element: <StudentQrPage />,
      },
    ],
  },
])
