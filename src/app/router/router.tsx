import { createBrowserRouter, Navigate } from 'react-router'
import { AuthenticatedEntryRoute } from '@/features/auth/components/AuthenticatedEntryRoute'
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
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { AppLayout } from '@/layouts/AppLayout/AppLayout'
import { StudentLayout } from '@/layouts/StudentLayout/StudentLayout'

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
              {
                path: 'admin',
                element: <HomePage />,
              },
              {
                path: 'docente',
                element: <HomePage />,
              },
              {
                path: 'estudiante',
                element: <Navigate to="/students/qr" replace />,
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
