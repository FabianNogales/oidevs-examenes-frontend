import { createBrowserRouter } from 'react-router'
import { HomePage } from '@/features/home/pages/HomePage'
import { TeacherStudentsPage } from '@/features/students/pages/TeacherStudentsPage'
import { TeacherSubjectStudentsPage } from '@/features/students/pages/TeacherSubjectStudentsPage'
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
        path: 'teacher/students',
        element: <TeacherStudentsPage />,
      },
      {
        path: 'teacher/students/:courseOfferingId',
        element: <TeacherSubjectStudentsPage />,
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
