import { createBrowserRouter, Navigate } from 'react-router'
import { AuthenticatedEntryRoute } from '@/features/auth/components/AuthenticatedEntryRoute'
import { AdminRoute } from '@/features/auth/components/AdminRoute'
import { AuthEventHandler } from '@/features/auth/components/AuthEventHandler'
import { FirstAccessRoute } from '@/features/auth/components/FirstAccessRoute'
import { GuestRoute } from '@/features/auth/components/GuestRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { AUTH_ROUTES } from '@/features/auth/utils/authRoutes'
import { ChangeInitialPasswordPage } from '@/features/auth/pages/ChangeInitialPasswordPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { TeacherStudentsPage } from '@/features/students/pages/TeacherStudentsPage'
import { TeacherSubjectStudentsPage } from '@/features/students/pages/TeacherSubjectStudentsPage'
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { ImportStudentsPage } from '@/features/students/pages/ImportStudentsPage'
import { TeacherSubjectsPage } from '@/features/subjects/pages/TeacherSubjectsPage'
import { TeacherExamsPage } from '@/features/exams/pages/TeacherExamsPage'
import { AppLayout } from '@/layouts/AppLayout/AppLayout'
import { StudentLayout } from '@/layouts/StudentLayout/StudentLayout'
import { StudentProfilePage } from '@/features/students/pages/StudentProfilePage'
import { RoleRoute } from '@/features/auth/components/RoleRoute'
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout'
import { AdminModulePage } from '@/features/admin/pages/AdminModulePage'
import { AdminNotFoundPage } from '@/features/admin/pages/AdminNotFoundPage'
import { AdminTeachersPage } from '@/features/admin/pages/AdminTeachersPage'

export const router = createBrowserRouter([
  {
    element: <AuthEventHandler />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            element: <ProtectedRoute />,
            children: [
              {
                path: AUTH_ROUTES.fallbackHome,
                element: <AuthenticatedEntryRoute />,
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['ADMINISTRADOR']} />,
            children: [
              {
              element: (
                <RoleRoute
                  allowedRoles={['ADMINISTRADOR']}
                />
              ),
              children: [
                {
                  path: 'admin',
                  element: <AdminLayout />,
                  children: [
                    {
                      index: true,
                      element: <HomePage />,
                    },
                    {
                      path: 'teachers',
                      element: <AdminTeachersPage />,
                    },
                    {
                      path: 'students/import',
                      element: <ImportStudentsPage />,
                    },
                    {
                    path: '*',
                    element: <AdminNotFoundPage />,
                    },
                  ],
                },
              ],
            },
              {
                element: <AdminRoute />,
                children: [
                  {
                    path: 'admin/students/import',
                    element: <ImportStudentsPage />,
                  },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['DOCENTE']} />,
            children: [
              {
                path: 'docente',
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
                path: 'teacher/exams',
                element: <TeacherExamsPage />,
              },
              {
                path: 'teacher/students/:courseOfferingId',
                element: <TeacherSubjectStudentsPage />,
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['ESTUDIANTE']} />,
            children: [
              {
                path: 'estudiante',
                element: <Navigate to="/" replace />,
              },
              {
                path: 'students',
                element: <StudentLayout />,
                children: [
                  {
                    path: 'profile',
                    element: <StudentProfilePage />,
                  },
                  {
                    path: 'qr',
                    element: <StudentQrPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <FirstAccessRoute />,
        children: [
          {
            path: AUTH_ROUTES.changeInitialPassword,
            element: <ChangeInitialPasswordPage />,
          },
        ],
      },
      {
        element: <GuestRoute />,
        children: [
          {
            path: AUTH_ROUTES.login,
            element: <LoginPage />,
          },
          {
            path: AUTH_ROUTES.forgotPassword,
            element: <ForgotPasswordPage />,
          },
          {
            path: AUTH_ROUTES.resetPassword,
            element: <ResetPasswordPage />,
          },
          {
            path: `${AUTH_ROUTES.resetPassword}/:token`,
            element: <ResetPasswordPage />,
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])
