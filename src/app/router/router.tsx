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
import { TeacherStudentsPage } from '@/features/students/pages/TeacherStudentsPage'
import { TeacherSubjectStudentsPage } from '@/features/students/pages/TeacherSubjectStudentsPage'
import { ImportSubjectStudentsPage } from '@/features/students/pages/ImportSubjectStudentsPage'
import { StudentQrPage } from '@/features/students/pages/StudentQrPage'
import { ImportStudentsPage } from '@/features/students/pages/ImportStudentsPage'
import { TeacherSubjectsPage } from '@/features/subjects/pages/TeacherSubjectsPage'
import { TeacherExamsPage } from '@/features/exams/pages/TeacherExamsPage'
import { TeacherExamDetailPage } from '@/features/exams/pages/TeacherExamDetailPage'
import { TeacherExamEditPage } from '@/features/exams/pages/TeacherExamEditPage'
import { TeacherExamCreatePage } from '@/features/exams/pages/TeacherExamCreatePage'
import { ExamEligibilitiesPage } from '@/features/eligibilities/pages/ExamEligibilitiesPage'
import { ExamCollaboratorsPage } from '@/features/collaborations/pages/ExamCollaboratorsPage'
import { CollaboratorPage } from '@/features/collaborations/pages/CollaboratorPage'
import { EntryControlPage } from '@/features/exams/pages/EntryControlPage'
import { OfflineEntryPage } from '@/features/offline-entry/pages/OfflineEntryPage'
import { OfflineHomePage } from '@/features/offline-entry/pages/OfflineHomePage'
import { TeacherDistributionPage } from '@/features/offline-entry/pages/TeacherDistributionPage'
import { AppLayout } from '@/layouts/AppLayout/AppLayout'
import { StudentLayout } from '@/layouts/StudentLayout/StudentLayout'
import { StudentProfilePage } from '@/features/students/pages/StudentProfilePage'
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout'
import { AdminNotFoundPage } from '@/features/admin/pages/AdminNotFoundPage'
import { AdminTeachersPage } from '@/features/admin/pages/AdminTeachersPage'
import { AdminManageStudentsPage } from '@/features/admin/pages/AdminManageStudentsPage'
import { AdminStudentDetailPage } from '@/features/admin/pages/AdminStudentDetailPage'
import { AdminTeacherDetailPage } from '@/features/admin/pages/AdminTeacherDetailPage'
import { AdminManageUsersPage } from '@/features/admin/pages/AdminManageUsersPage'

export const router = createBrowserRouter([
  {
    element: <AuthEventHandler />,
    children: [
      // These routes have a narrowly scoped local continuity gate; online routes retain ProtectedRoute.
      { path: '/offline', element: <OfflineHomePage /> },
      { path: '/exams/:examId/offline', element: <OfflineEntryPage /> },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: 'calendar',
            lazy: async () => {
              const { CalendarPage } = await import('@/features/portal-calendar/pages/CalendarPage')
              return { Component: CalendarPage }
            },
          },
          {
            path: 'news',
            lazy: async () => {
              const { NewsPage } = await import('@/features/portal-news/NewsPage')
              return { Component: NewsPage }
            },
          },
          {
            path: 'news/:newsId',
            lazy: async () => {
              const { NewsDetailPage } = await import('@/features/portal-news/NewsPage')
              return { Component: NewsDetailPage }
            },
          },
          {
            path: 'information',
            lazy: async () => {
              const { InformationPage } = await import('@/features/portal-information/InformationPage')
              return { Component: InformationPage }
            },
          },
          {
            path: 'services',
            lazy: async () => {
              const { ServicesPage } = await import('@/features/portal-services/ServicesPage')
              return { Component: ServicesPage }
            },
          },
          {
            path: 'services/:serviceId',
            lazy: async () => {
              const { ServiceDetailPage } = await import('@/features/portal-services/ServicesPage')
              return { Component: ServiceDetailPage }
            },
          },
          {
            element: <ProtectedRoute />,
            children: [
              {
                path: AUTH_ROUTES.fallbackHome,
                element: <AuthenticatedEntryRoute />,
              },
              {
                path: 'collaborator',
                element: <CollaboratorPage />,
              },
              {
                path: 'exams/:examId/entry-control',
                element: <EntryControlPage />,
              },
              {
                path: 'exams/:examId/incidents',
                lazy: async () => {
                  const { ExamIncidentsPage } = await import('@/features/incidents/pages/ExamIncidentsPage')
                  return { Component: ExamIncidentsPage }
                },
              },
              {
                path: 'exams/:examId/incidents/create',
                lazy: async () => {
                  const { CreateIncidentPage } = await import('@/features/incidents/pages/CreateIncidentPage')
                  return { Component: CreateIncidentPage }
                },
              },
              {
                path: 'exams/:examId/incidents/:incidentId',
                lazy: async () => {
                  const { IncidentDetailPage } = await import('@/features/incidents/pages/IncidentDetailPage')
                  return { Component: IncidentDetailPage }
                },
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['ADMINISTRADOR']} />,
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
                    path: 'users/manage',
                    element: <AdminManageUsersPage />,
                  },
                  {
                    path: 'portal/events',
                    lazy: async () => {
                      const { AdminCalendarPage } = await import('@/features/portal-calendar/pages/AdminCalendarPage')
                      return { Component: AdminCalendarPage }
                    },
                  },
                  {
                    path: 'portal/news',
                    lazy: async () => {
                      const { AdminNewsPage } = await import('@/features/portal-news/AdminNewsPage')
                      return { Component: AdminNewsPage }
                    },
                  },
                  {
                    path: 'portal/information',
                    lazy: async () => {
                      const { AdminInformationPage } = await import('@/features/portal-information/AdminInformationPage')
                      return { Component: AdminInformationPage }
                    },
                  },
                  {
                    path: 'portal/services',
                    lazy: async () => {
                      const { AdminServicesPage } = await import('@/features/portal-services/AdminServicesPage')
                      return { Component: AdminServicesPage }
                    },
                  },
                  {
                    path: 'eligibility-policies',
                    lazy: async () => {
                      const { AdminEligibilityPoliciesPage } =
                        await import('@/features/eligibility-automation/pages/AdminEligibilityPoliciesPage')
                      return { Component: AdminEligibilityPoliciesPage }
                    },
                  },
                  {
                    path: 'users/roles',
                    element: <AdminManageUsersPage />,
                  },
                  {
                    path: 'audit-logs',
                    lazy: async () => {
                      const { AdminReadPage } =
                        await import('@/features/admin/pages/AdminReadPage')
                      return {
                        Component: () => <AdminReadPage kind="audit-logs" />,
                      }
                    },
                  },
                  {
                    path: 'exam-reports',
                    lazy: async () => {
                      const { AdminExamReportsPage } = await import('@/features/exam-reports/pages/ExamReportsPage')
                      return { Component: AdminExamReportsPage }
                    },
                  },
                  {
                    path: 'incidents',
                    lazy: async () => {
                      const { AdminIncidentsPage } = await import('@/features/incidents/pages/AdminIncidentsPage')
                      return { Component: AdminIncidentsPage }
                    },
                  },
                  {
                    path: 'incidents/:examId/:incidentId',
                    lazy: async () => {
                      const { IncidentDetailPage } = await import('@/features/incidents/pages/IncidentDetailPage')
                      return { Component: IncidentDetailPage }
                    },
                  },
                  {
                    path: 'careers',
                    lazy: async () => {
                      const { AdminReadPage } =
                        await import('@/features/admin/pages/AdminReadPage')
                      return {
                        Component: () => <AdminReadPage kind="careers" />,
                      }
                    },
                  },
                  {
                    path: 'users/history',
                    element: <AdminManageUsersPage />,
                  },
                  {
                    path: 'users/:userId/roles',
                    lazy: async () => {
                      const { AdminUserRolesPage } =
                        await import('@/features/admin/pages/AdminUserRolesPage')
                      return { Component: AdminUserRolesPage }
                    },
                  },
                  {
                    path: 'teachers',
                    element: <AdminTeachersPage />,
                  },
                  {
                    path: 'teachers/assignments',
                    lazy: async () => {
                      const { AdminCourseOfferingsPage } =
                        await import('@/features/course-offerings/pages/AdminCourseOfferingsPage')
                      return { Component: AdminCourseOfferingsPage }
                    },
                  },
                  {
                    path: 'teachers/assignments/import',
                    lazy: async () => {
                      const { ImportCourseOfferingsPage } =
                        await import('@/features/course-offerings/pages/ImportCourseOfferingsPage')
                      return { Component: ImportCourseOfferingsPage }
                    },
                  },
                  {
                    path: 'teachers/:teacherId',
                    element: <AdminTeacherDetailPage />,
                  },
                  {
                    path: 'students/manage',
                    element: <AdminManageStudentsPage />,
                  },
                  {
                    path: 'students/import',
                    element: <ImportStudentsPage />,
                  },
                  {
                    path: 'students/:studentId',
                    element: <AdminStudentDetailPage />,
                  },
                  {
                    path: 'subjects',
                    lazy: async () => {
                      const { AdminSubjectsPage } =
                        await import('@/features/subjects/pages/AdminSubjectsPage')
                      return { Component: AdminSubjectsPage }
                    },
                  },
                  {
                    path: 'academic-terms',
                    lazy: async () => {
                      const { AdminAcademicTermsPage } =
                        await import('@/features/academic-terms/pages/AdminAcademicTermsPage')
                      return { Component: AdminAcademicTermsPage }
                    },
                  },
                  {
                    path: 'subjects/import',
                    lazy: async () => {
                      const { ImportSubjectsPage } =
                        await import('@/features/subjects/pages/ImportSubjectsPage')
                      return { Component: ImportSubjectsPage }
                    },
                  },
                  {
                    path: 'rooms',
                    lazy: async () => {
                      const { AdminRoomsPage } =
                        await import('@/features/rooms/pages/AdminRoomsPage')
                      return { Component: AdminRoomsPage }
                    },
                  },
                  {
                    path: 'rooms/import',
                    lazy: async () => {
                      const { ImportRoomsPage } =
                        await import('@/features/rooms/pages/ImportRoomsPage')
                      return { Component: ImportRoomsPage }
                    },
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
                path: 'teacher/subjects/:courseOfferingId/exams/create',
                element: <TeacherExamCreatePage />,
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
                path: 'teacher/exams/:examId',
                element: <TeacherExamDetailPage />,
              },
              {
                path: 'teacher/exams/:examId/edit',
                element: <TeacherExamEditPage />,
              },
              {
                path: 'teacher/exam-reports',
                lazy: async () => {
                  const { TeacherExamReportsPage } = await import('@/features/exam-reports/pages/ExamReportsPage')
                  return { Component: TeacherExamReportsPage }
                },
              },
              {
                path: 'teacher/exams/:examId/reports',
                lazy: async () => {
                  const { TeacherExamReportsPage } = await import('@/features/exam-reports/pages/ExamReportsPage')
                  return { Component: TeacherExamReportsPage }
                },
              },
              {
                path: 'teacher/exams/:examId/attendance',
                lazy: async () => {
                  const { AttendancePage } = await import('@/features/attendance/pages/AttendancePage')
                  return { Component: AttendancePage }
                },
              },
              {
                path: 'teacher/exams/:examId/expulsions',
                lazy: async () => {
                  const { ExamExpulsionsPage } =
                    await import('@/features/expulsions/pages/ExamExpulsionsPage')
                  return { Component: ExamExpulsionsPage }
                },
              },
              {
                path: 'teacher/exams/:examId/expulsions/create',
                lazy: async () => {
                  const { CreateExpulsionPage } =
                    await import('@/features/expulsions/pages/CreateExpulsionPage')
                  return { Component: CreateExpulsionPage }
                },
              },
              {
                path: 'teacher/exams/:examId/expulsions/:expulsionId',
                lazy: async () => {
                  const { ExpulsionDetailPage } =
                    await import('@/features/expulsions/pages/ExpulsionDetailPage')
                  return { Component: ExpulsionDetailPage }
                },
              },
              {
                path: 'teacher/exams/:examId/infractions',
                lazy: async () => {
                  const { ExamInfractionsPage } = await import('@/features/infractions/pages/ExamInfractionsPage')
                  return { Component: ExamInfractionsPage }
                },
              },
              {
                path: 'teacher/exams/:examId/infractions/create',
                lazy: async () => {
                  const { CreateInfractionPage } = await import('@/features/infractions/pages/CreateInfractionPage')
                  return { Component: CreateInfractionPage }
                },
              },
              {
                path: 'teacher/exams/:examId/infractions/:infractionId',
                lazy: async () => {
                  const { InfractionDetailPage } = await import('@/features/infractions/pages/InfractionDetailPage')
                  return { Component: InfractionDetailPage }
                },
              },
              {
                path: 'teacher/exams/:examId/collaborators',
                element: <ExamCollaboratorsPage />,
              },
              {
                path: 'teacher/exams/:examId/offline/assignments',
                element: <TeacherDistributionPage />,
              },
              {
                path: 'teacher/exams/:examId/eligibilities',
                element: <ExamEligibilitiesPage />,
              },
              {
                path: 'teacher/exams/:examId/eligibilities/automatic',
                lazy: async () => {
                  const { EligibilityAutomationPage } =
                    await import('@/features/eligibility-automation/pages/EligibilityAutomationPage')
                  return { Component: EligibilityAutomationPage }
                },
              },
              {
                path: 'teacher/students/:courseOfferingId',
                element: <TeacherSubjectStudentsPage />,
              },
              {
                path: 'teacher/students/:courseOfferingId/import',
                element: <ImportSubjectStudentsPage />,
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
