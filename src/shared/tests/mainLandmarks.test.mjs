import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { nodes, sourceHarness, sourceRoot } from './sourceHarness.mjs'

// AdminLayout renders the page's <main>; AppLayout does not. Pages shared by both layouts must not nest a
// second <main> under AdminLayout (D6: found on /admin and /admin/exam-reports with the real backend).

// Expands function components until host elements remain (shallow harness renders one level).
function expand(element) {
  if (Array.isArray(element)) return element.map(expand)
  if (!element || typeof element !== 'object' || !element.props) return element
  if (typeof element.type === 'function') return expand(element.type(element.props))
  return { ...element, props: { ...element.props, children: expand(element.props.children) } }
}
const mains = (tree) => nodes(tree, (node) => node.type === 'main')

test('HomePage owns <main> on public and teacher routes but not when embedded in AdminLayout', () => {
  const h = sourceHarness({
    '@/assets/images/eida-logo.svg': { __esModule: true, default: 'eida-logo.svg' },
    '@/assets/images/logo-home.png': { __esModule: true, default: 'logo-home.png' },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ user: { id: 1, roles: ['ADMINISTRADOR'] } }) },
    '@/features/home/components/TeacherUpcomingExamsSection': { TeacherUpcomingExamsSection: 'upcoming' },
    '@/features/portal-calendar/components/InstitutionalCalendar': { InstitutionalCalendar: 'calendar' },
    '@/features/portal-news/components/NewsList': { NewsList: 'news' },
  })
  const { HomePage } = h.load('features/home/pages/HomePage.tsx')
  const standalone = h.render(() => HomePage({}))
  assert.equal(mains(standalone).length, 1)
  const embedded = h.render(() => HomePage({ embedded: true }))
  assert.equal(mains(embedded).length, 0)
  // Both variants keep the class that HomePage.module.css styles (it used to target the bare element).
  assert.equal(standalone.props.children.props.className, 'content')
  assert.equal(embedded.props.children.props.className, 'content')
  assert.equal(embedded.props.children.type, 'div')
  assert.equal(nodes(embedded, (node) => node.type === 'h1').length, 1)
})

test('the AdminLayout index route renders the embedded HomePage', () => {
  const router = readFileSync(`${sourceRoot}app/router/router.tsx`, 'utf8')
  const admin = router.slice(router.indexOf('element: <AdminLayout />'))
  assert.match(admin.slice(0, 200), /index: true,\s*element: <HomePage embedded \/>/)
})

test('exam reports own <main> for teachers only; the admin variant relies on AdminLayout', () => {
  const h = sourceHarness({
    'react-router': { useNavigate: () => () => {}, useParams: () => ({}) },
    '@/shared/components/Breadcrumbs/Breadcrumbs': { Breadcrumbs: 'breadcrumbs' },
    '@/features/incidents/components/ExamIncidentNavigation': { ExamIncidentNavigation: 'exam-navigation' },
    '@/features/infractions/hooks/useInfractionResource': { useInfractionResource: () => ({ loading: true }) },
    '@/features/infractions/utils/infractionValidation': { positiveId: (value) => Number.isInteger(value) && value > 0 },
    '../api/examReportsApi': { getReportCatalog: async () => ({}) },
    '../components/ReportExamCatalog': { ReportExamCatalog: 'catalog' },
    '../components/ReportWorkspace': { ReportWorkspace: 'workspace' },
  })
  const { AdminExamReportsPage, TeacherExamReportsPage } = h.load('features/exam-reports/pages/ExamReportsPage.tsx')
  const admin = h.render(() => expand(AdminExamReportsPage()))
  assert.equal(mains(admin).length, 0)
  assert.equal(admin.type, 'div')
  assert.equal(nodes(admin, (node) => node.type === 'h1').length, 1)
  const teacher = h.render(() => expand(TeacherExamReportsPage()))
  assert.equal(mains(teacher).length, 1)
  assert.equal(teacher.type, 'main')
})
