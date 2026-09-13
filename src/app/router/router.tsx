import { createBrowserRouter } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { TeacherSubjectsPage } from '@/features/subjects/pages/TeacherSubjectsPage'
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
        path: 'teacher/subjects',
        element: <TeacherSubjectsPage />,
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
