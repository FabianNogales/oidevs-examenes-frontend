import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Real component source rendered with React SSR and the real react-router (MemoryRouter).
// CSS Modules are replaced by a proxy that returns the class key, so markup shows which class applies.
// This verifies markup and semantics, not browser layout.
const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter } = require('react-router')
const srcRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const uiRoot = fileURLToPath(new URL('../', import.meta.url))

const cache = new Map()
// `source` lets a test render another revision of a file (e.g. a reference markup) with the same dependencies.
function load(filename, source) {
  const key = source === undefined ? filename : `${filename}#${source.length}`
  if (cache.has(key)) return cache.get(key).exports
  const module = { exports: {} }
  cache.set(key, module)
  const output = ts.transpileModule(source ?? readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const localRequire = (specifier) => {
    if (specifier.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? resolve(srcRoot, specifier.slice(2)) : resolve(dirname(filename), specifier)
      const found = ['.tsx', '.ts'].map((ext) => base + ext).find(existsSync)
      assert.ok(found, `cannot resolve ${specifier} from ${filename}`)
      return load(found)
    }
    return require(specifier)
  }
  new Function('exports', 'require', 'module', output)(module.exports, localRequire, module)
  return module.exports
}

const { PageContainer } = load(resolve(uiRoot, 'PageContainer/PageContainer.tsx'))
const { PageHeader } = load(resolve(uiRoot, 'PageHeader/PageHeader.tsx'))
const render = (element) => renderToStaticMarkup(React.createElement(MemoryRouter, null, element))
const count = (html, pattern) => (html.match(pattern) ?? []).length

test('PageContainer renders a div by default and a labelled section, never main', () => {
  const plain = render(React.createElement(PageContainer, null, React.createElement('p', null, 'Contenido')))
  assert.equal(plain, '<div class="container"><p>Contenido</p></div>')

  const labelled = render(React.createElement(PageContainer, { labelledBy: 'rooms-title' }, 'x'))
  assert.equal(labelled, '<section class="container" aria-labelledby="rooms-title">x</section>')

  for (const html of [plain, labelled]) assert.doesNotMatch(html, /<main\b|role="main"/)
})

test('PageContainer width variants and extra className', () => {
  assert.match(render(React.createElement(PageContainer, { width: 'default' }, 'x')), /^<div class="container">/)
  assert.match(render(React.createElement(PageContainer, { width: 'narrow' }, 'x')), /^<div class="container narrow">/)
  assert.match(render(React.createElement(PageContainer, { width: 'narrow', className: 'extra' }, 'x')), /^<div class="container narrow extra">/)
})

test('PageHeader minimal: one h1, no optional parts and no focus attributes', () => {
  const html = render(React.createElement(PageHeader, { title: 'Gestión de aulas' }))
  assert.equal(count(html, /<h1\b/g), 1)
  assert.match(html, /<h1 class="title">Gestión de aulas<\/h1>/)
  assert.doesNotMatch(html, /tabindex|<nav\b|class="actions"|class="eyebrow"|class="description"|<main\b/)
})

test('PageHeader full: titleId, tabIndex=-1, eyebrow, description, breadcrumbs and actions', () => {
  const html = render(React.createElement(PageHeader, {
    title: 'Gestión de aulas',
    titleId: 'rooms-title',
    focusableTitle: true,
    eyebrow: 'Administrador',
    description: 'Administra las aulas disponibles.',
    breadcrumbs: [{ label: 'Inicio', to: '/admin' }, { label: 'Aulas' }],
    actions: React.createElement('button', { type: 'button' }, '+ Registrar aula'),
  }))
  assert.equal(count(html, /<h1\b/g), 1)
  assert.match(html, /<h1 id="rooms-title" tabindex="-1" class="title">Gestión de aulas<\/h1>/)
  assert.match(html, /<p class="eyebrow">Administrador<\/p>/)
  assert.match(html, /<p class="description">Administra las aulas disponibles\.<\/p>/)
  assert.match(html, /<nav aria-label="Ruta de navegación"[^>]*><ol><li><a href="\/admin"[^>]*>Inicio<\/a><\/li><li[^>]*><span aria-current="page">Aulas<\/span><\/li><\/ol><\/nav>/)
  assert.match(html, /<div class="actions"><button type="button">\+ Registrar aula<\/button><\/div>/)
  // Breadcrumbs come before the header, and only one header element is rendered.
  assert.ok(html.indexOf('<nav') < html.indexOf('<header'))
  assert.equal(count(html, /<header\b/g), 1)
  assert.doesNotMatch(html, /<main\b/)
})

test('PageHeader omits empty breadcrumbs and actions and rejects an empty title', () => {
  const html = render(React.createElement(PageHeader, { title: 'Carreras', breadcrumbs: [], actions: null }))
  assert.doesNotMatch(html, /<nav\b|class="actions"/)
  assert.throws(() => render(React.createElement(PageHeader, { title: '   ' })), /non-empty title/)
})

test('PageContainer and PageHeader CSS use tokens and canonical breakpoints only', () => {
  const css = (name) => readFileSync(resolve(uiRoot, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const container = css('PageContainer/PageContainer.module.css')
  const header = css('PageHeader/PageHeader.module.css')
  for (const source of [container, header]) {
    for (const [, value] of source.matchAll(/@media[^{]*?(\d+)px/g)) assert.ok(['480', '640', '768', '1024'].includes(value), `breakpoint ${value}px`)
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, 'no literal colours')
    assert.doesNotMatch(source, /font-size:\s*[\d.]+px/, 'no px font sizes')
    assert.doesNotMatch(source, /:global|!important/)
  }
  assert.match(container, /\.container \{[^}]*box-sizing: border-box;[^}]*max-width: var\(--content-max-width\);[^}]*padding: var\(--space-8\) var\(--content-gutter\);/)
  assert.match(container, /\.narrow \{\s*max-width: 960px;\s*\}/)
  assert.match(container, /@media \(max-width: 640px\) \{\s*\.container \{\s*padding-block: var\(--space-5\);/)
  assert.doesNotMatch(container, /background|box-shadow|border(-radius)?:/, 'PageContainer is not a card')
  assert.match(header, /\.title \{[^}]*font-size: var\(--font-size-3xl\);[^}]*font-weight: var\(--font-weight-bold\);/)
  assert.match(header, /\.description \{[^}]*font-size: var\(--font-size-md\);/)
  assert.match(header, /\.header \{[^}]*margin-bottom: var\(--space-6\);/)
  const mobile = /@media \(max-width: 640px\) \{([\s\S]*)\}\s*$/.exec(header)[1]
  assert.match(mobile, /\.title \{\s*font-size: var\(--font-size-2xl\);/)
  assert.match(mobile, /\.description \{\s*font-size: var\(--font-size-sm\);/)
  assert.match(mobile, /\.actions \{\s*flex-direction: column;/)
})

// Only screens explicitly migrated in DS2.1 may consume the layout primitives.
const authorizedConsumers = [
  'features/academic-terms/pages/AdminAcademicTermsPage.tsx',
  'features/collaborations/pages/CollaboratorPage.tsx',
  'features/collaborations/pages/ExamCollaboratorsPage.tsx',
  'features/course-offerings/pages/AdminCourseOfferingsPage.tsx',
  'features/course-offerings/pages/ImportCourseOfferingsPage.tsx',
  'features/eligibility-automation/pages/AdminEligibilityPoliciesPage.tsx',
  'features/exams/pages/TeacherExamDetailPage.tsx',
  'features/exams/pages/TeacherExamsPage.tsx',
  'features/portal-calendar/pages/AdminCalendarPage.tsx',
  'features/portal-calendar/pages/CalendarPage.tsx',
  'features/portal-information/pages/AdminInformationPage.tsx',
  'features/portal-information/pages/InformationPage.tsx',
  'features/portal-news/pages/AdminNewsPage.tsx',
  'features/portal-news/pages/NewsPage.tsx',
  'features/portal-services/pages/AdminServicesPage.tsx',
  'features/portal-services/pages/ServicesPage.tsx',
  'features/portal-shared/components/PortalAdminCollection.tsx',
  'features/rooms/pages/AdminRoomsPage.tsx',
  'features/rooms/pages/ImportRoomsPage.tsx',
  'features/students/pages/AdminManageStudentsPage.tsx',
  'features/students/pages/ImportStudentsPage.tsx',
  'features/students/pages/ImportSubjectStudentsPage.tsx',
  'features/students/pages/StudentProfilePage.tsx',
  'features/students/pages/StudentQrPage.tsx',
  'features/students/pages/TeacherStudentsPage.tsx',
  'features/students/pages/TeacherSubjectStudentsPage.tsx',
  'features/subjects/pages/AdminSubjectsPage.tsx',
  'features/subjects/pages/ImportSubjectsPage.tsx',
  'features/subjects/pages/TeacherSubjectsPage.tsx',
  'features/teachers/pages/AdminTeachersPage.tsx',
  'features/users/pages/AdminManageUsersPage.tsx',
  'features/users/pages/AdminNotFoundPage.tsx',
  'features/users/pages/AdminReadPage.tsx',
  'features/users/pages/AdminUserHistoryPage.tsx',
  'features/users/pages/AdminUserRolesPage.tsx',
]
// Files that keep a legacy <h1> path for consumers not yet migrated.
const legacyHeading = ['features/users/pages/AdminReadPage.tsx', 'features/portal-shared/components/PortalAdminCollection.tsx']
// Public and teacher pages render the page's only <main> landmark themselves (AppLayout has none).
const ownsMain = [
  'features/collaborations/pages/CollaboratorPage.tsx',
  'features/collaborations/pages/ExamCollaboratorsPage.tsx',
  'features/exams/pages/TeacherExamDetailPage.tsx',
  'features/exams/pages/TeacherExamsPage.tsx',
  'features/portal-calendar/pages/CalendarPage.tsx',
  'features/portal-information/pages/InformationPage.tsx',
  'features/portal-news/pages/NewsPage.tsx',
  'features/portal-services/pages/ServicesPage.tsx',
  'features/students/pages/ImportSubjectStudentsPage.tsx',
  'features/students/pages/TeacherStudentsPage.tsx',
  'features/students/pages/TeacherSubjectStudentsPage.tsx',
  'features/subjects/pages/TeacherSubjectsPage.tsx',
]
// Portal administration pages get their PageHeader through PortalAdminCollection headerVariant="page".
const portalAdmin = [
  'features/portal-information/pages/AdminInformationPage.tsx',
  'features/portal-news/pages/AdminNewsPage.tsx',
  'features/portal-services/pages/AdminServicesPage.tsx',
]

test('PageHeader and PageContainer are consumed only by the authorized DS2.1 screens', () => {
  const { readdirSync } = require('node:fs')
  const consumers = readdirSync(srcRoot, { recursive: true })
    .map((file) => String(file).replaceAll('\\', '/'))
    .filter((file) => /\.(tsx|ts)$/.test(file) && !file.startsWith('shared/components/ui/'))
    .filter((file) => /components\/ui\/Page(Header|Container)/.test(readFileSync(resolve(srcRoot, file), 'utf8')))
    .sort()
  assert.deepEqual(consumers, authorizedConsumers)
  for (const file of consumers) {
    const source = readFileSync(resolve(srcRoot, file), 'utf8')
    assert.equal((source.match(/<main\b/g) ?? []).length, ownsMain.includes(file) ? 1 : 0, `${file}: <main> landmarks`)
    const headers = (source.match(/<PageHeader\b/g) ?? []).length
    if (portalAdmin.includes(file)) {
      assert.equal(headers, 0, `${file}: header comes from PortalAdminCollection`)
      assert.equal((source.match(/headerVariant="page"/g) ?? []).length, 1, `${file}: headerVariant="page"`)
    } else assert.equal(headers, 1, `${file}: one PageHeader`)
    if (!legacyHeading.includes(file)) assert.doesNotMatch(source, /<h1\b/, `${file}: the h1 comes from PageHeader`)
  }
})

// Reference: SSR markup of PortalAdminCollection at e4f5bbd (before headerVariant existed), for the two
// default (legacy) shapes. No screen uses the legacy header after DS2.1g, but it stays the default. Regenerate only if the legacy header is changed on purpose:
// render `git show e4f5bbd:src/features/portal-shared/components/PortalAdminCollection.tsx` with these same props.
const legacyCollectionMarkup = {
  withDescription: '253b602a77b1aec6c47b69aec17910daecf96953850b19142d1ab468c6eac6a9',
  withoutDescription: '7e1bf9ede548997d68a13df9f30067babf27ca83b6eceabae1aa1a0fcd2084bb',
}
const collectionProps = (description) => ({
  title: 'Gestión de servicios',
  ...(description ? { description: 'Administra los servicios del portal.' } : {}),
  load: () => new Promise(() => {}),
  columns: [{ key: 'title', header: 'Título', render: (row) => row.item.title }],
  version: 0,
  onSelect: () => {},
  onCreate: () => {},
  createLabel: 'Crear servicio',
})
const sha256 = (text) => require('node:crypto').createHash('sha256').update(text).digest('hex')

test('PortalAdminCollection legacy default header markup is unchanged since e4f5bbd', () => {
  const { PortalAdminCollection } = load(resolve(srcRoot, 'features/portal-shared/components/PortalAdminCollection.tsx'))
  for (const [key, description] of [['withDescription', true], ['withoutDescription', false]]) {
    const html = render(React.createElement(PortalAdminCollection, collectionProps(description)))
    assert.equal(sha256(html), legacyCollectionMarkup[key], `${key}: default markup changed`)
    assert.match(html, /<header class="toolbar">/)
    assert.equal(count(html, /<h1\b/g), 1)
  }
})

test('PortalAdminCollection headerVariant="page" renders PageHeader with the same title, crumbs and action', () => {
  const { PortalAdminCollection } = load(resolve(srcRoot, 'features/portal-shared/components/PortalAdminCollection.tsx'))
  const html = render(React.createElement(PortalAdminCollection, { ...collectionProps(true), headerVariant: 'page' }))
  assert.equal(count(html, /<h1\b/g), 1)
  assert.match(html, /<h1 class="title">Gestión de servicios<\/h1>/)
  assert.match(html, /<p class="description">Administra los servicios del portal\.<\/p>/)
  assert.match(html, /<a href="\/"[^>]*>Inicio<\/a>/)
  assert.match(html, /<div class="actions"><button type="button" class="primary">Crear servicio<\/button><\/div>/)
  assert.doesNotMatch(html, /class="toolbar"|<main\b/)
  assert.match(html, /^<div class="page">/, 'PageHeader stays inside the .page wrapper')
})
