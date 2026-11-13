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
  // U3.4c: the admin root is PageContainer's labelled <section> (never a <main> inside AdminLayout).
  assert.equal(admin.type, 'section')
  assert.equal(admin.props['aria-labelledby'], 'exam-reports-title')
  assert.equal(nodes(admin, (node) => node.type === 'h2').length, 1)
  const teacher = h.render(() => expand(TeacherExamReportsPage()))
  assert.equal(mains(teacher).length, 1)
  assert.equal(teacher.type, 'main')
})

test('admin entity profiles (students, teachers) rely on AdminLayout for <main>: the profile area is a labelled section (R1)', () => {
  const h = sourceHarness({})
  const { EntityProfileLayout } = h.load('features/users/profile/components/EntityProfileLayout.tsx')
  const tree = expand(EntityProfileLayout({
    initials: 'QA',
    fullName: 'Estudiante QA',
    role: 'STUDENT',
    isActive: true,
    options: [{ id: 'overview', label: 'Resumen', icon: 'user' }],
    activeOptionId: 'overview',
    onOptionChange: () => {},
    onBack: () => {},
    children: 'contenido',
  }))
  assert.equal(mains(tree).length, 0, 'AdminLayout already renders the page <main>')
  const headings = nodes(tree, (node) => node.type === 'h1')
  assert.equal(headings.length, 1)
  assert.ok(headings[0].props.id, 'the entity name h1 has an id')
  const regions = nodes(tree, (node) => node.type === 'section' && node.props['aria-labelledby'] === headings[0].props.id)
  assert.equal(regions.length, 1, 'the profile area is labelled by the entity name')
  assert.match(String(regions[0].props.className), /mainArea/)
})

test('DS5-F4: the assignments empty state follows the page h1 with an h2 that keeps the former h3 look', () => {
  const panel = readFileSync(`${sourceRoot}/features/course-offerings/components/CourseOfferingsPanel.tsx`, 'utf8')
  assert.doesNotMatch(panel, /<h3\b/, 'no h1→h3 jump under the page h1')
  assert.match(panel, /<h2 className=\{styles\.stateTitle\}>\s*No hay asignaciones para esta consulta\s*<\/h2>/)
  const css = readFileSync(`${sourceRoot}/features/course-offerings/pages/AdminCourseOfferingsPage.module.css`, 'utf8')
  // Must beat the imported `.state h2` (lg, margin 0) and match the old h3: xl size and 20px block margins.
  assert.match(css, /\.state \.stateTitle \{\s*margin: var\(--space-5\) 0;\s*font-size: var\(--font-size-xl\);\s*\}/)
})
