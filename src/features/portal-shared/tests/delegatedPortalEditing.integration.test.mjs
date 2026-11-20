import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceRoot } from '../../../shared/tests/sourceHarness.mjs'
import { client, component, nodes, textContent, page } from './portalHarness.mjs'

const news = { id: 41, title: 'Noticia', summary: 'Resumen', content: 'Contenido',
  status: 'PUBLISHED', revision: 3, image_url: null, category: null,
  published_at: '2026-11-05T10:00:00Z', created_by: 1, updated_by: 1 }
const category = { id: 1, name: 'Institucional' }
const event = { id: 42, title: 'Evento', description: 'Descripción',
  starts_at: '2027-03-05T13:00:00Z', ends_at: '2027-03-05T15:00:00Z',
  all_day: false, location: 'Auditorio', category, visibility: 'PUBLIC',
  status: 'PUBLISHED', revision: 3, published_at: '2026-11-05T10:00:00Z' }
const draft = { title: 'Información', description: 'Descripción', links: [], sort_order: 0 }
const information = { id: 43, key: 'about', draft, published: draft,
  is_published: true, has_unpublished_changes: false, revision: 3 }
const service = { id: 44, name: 'WebSISS', description: 'Servicio',
  url: 'https://websiss.umss.edu.bo/', icon: 'academic', display_order: 0,
  status: 'ACTIVE', revision: 3 }

const user = (permissions = [], roles = ['Comunicaciones']) => ({
  id: 30, status: 'ACTIVE', must_change_password: false, roles, permissions,
})
function setup(permissions = [], handlers = {}, roles) {
  const auth = { user: user(permissions, roles), notify() {} }
  const c = client(handlers, {
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/shared/components/DataTable/DataTable': { DataTable: 'table' },
    'react-router': { Link: 'link', Navigate: 'Navigate', Outlet: 'Outlet' },
  })
  return { ...c, auth }
}
function editor(path, name, initial, extra = {}) {
  const saved = []
  const c = setup([], { patch: (_path, input) => ({
    data: { data: { ...initial, ...input, revision: initial.revision + 1 } },
  }) })
  const ui = component(c, path, name, { initial, canManage: false,
    onSaved: (item) => saved.push(item), onBusy() {}, onDirty() {}, onStateChange() {},
    ...extra })
  return { ui, saved }
}
const find = (tree, name) => nodes(tree, (node) => node.type?.name === name)[0]

test('section guards deny direct URLs independently; administrator keeps AdminLayout', () => {
  const c = setup(['portal.news.update'])
  const { PortalRoute } = c.h.load('features/portal-shared/components/PortalRoute.tsx')
  const { PORTAL_SECTIONS, getPortalAccess } = c.h.load('features/portal-shared/utils/portalAccess.ts')
  assert.equal(PortalRoute({ section: 'news' }).type, 'main')
  for (const section of PORTAL_SECTIONS.filter((item) => item.key !== 'news')) {
    assert.equal(PortalRoute({ section: section.key }).props.to, '/')
  }
  c.auth.user.permissions = []
  assert.equal(PortalRoute({ section: 'news' }).props.to, '/')
  c.auth.user = user([], ['ADMINISTRADOR'])
  for (const section of PORTAL_SECTIONS) {
    assert.equal(PortalRoute({ section: section.key }).type.name, 'AdminLayout')
  }
  c.auth.user.must_change_password = true
  assert.equal(getPortalAccess(c.auth.user, 'news').canEdit, false)
  c.auth.user = user(['portal.news.update'])
  c.auth.user.status = 'INACTIVE'
  assert.equal(getPortalAccess(c.auth.user, 'news').canEdit, false)
})

test('router delegates only the five portal screens and leaves categories under administrator protection', () => {
  const source = readFileSync(resolve(sourceRoot, 'app/router/router.tsx'), 'utf8')
  const protectedStart = source.indexOf("allowedRoles={['ADMINISTRADOR']}")
  for (const key of ['news', 'events', 'sections', 'faqs', 'services']) {
    assert.ok(source.indexOf('<PortalRoute section="' + key + '"') < protectedStart)
  }
  assert.ok(source.indexOf("path: 'portal/news/categories'") > protectedStart)
  assert.ok(source.indexOf("path: 'portal/events/categories'") > protectedStart)
  assert.match(source, /path: 'admin\/portal\/information\/faqs'/)
})

test('delegated news editor submits only content and revision, with live-public warning and no reserved actions', async () => {
  const { ui, saved } = editor('features/portal-news/components/NewsEditor.tsx', 'NewsEditor', news, {
    categories: { data: [], loading: false, error: null, reload() {} },
  })
  assert.match(textContent(ui.tree), /contenido público inmediatamente/)
  for (const label of ['Publicar', 'Despublicar', 'Archivar', 'Subir imagen', 'Eliminar imagen']) {
    assert.equal(ui.button(label), undefined)
  }
  assert.equal(ui.field('category_id'), undefined)
  assert.equal(ui.field('image'), undefined)
  ui.edit('title', 'Título corregido')
  await ui.submit()
  assert.deepEqual(ui.calls[0], { method: 'patch', args: ['/admin/portal/news/41',
    { title: 'Título corregido', summary: news.summary, content: news.content, revision: 3 }] })
  assert.equal(saved[0].status, 'PUBLISHED')
  ui.h.unmount()
})

test('delegated draft news saves without any call to publish or status', async () => {
  const { ui, saved } = editor('features/portal-news/components/NewsEditor.tsx', 'NewsEditor',
    { ...news, status: 'DRAFT', published_at: null }, {
      categories: { data: [], loading: false, error: null, reload() {} },
    })
  ui.edit('content', 'Borrador corregido')
  await ui.submit()
  assert.equal(saved[0].status, 'DRAFT')
  assert.equal(saved[0].published_at, null)
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.calls[0].method, 'patch')
  ui.h.unmount()
})

for (const visibility of ['PUBLIC', 'PRIVATE']) {
  test('delegated calendar ' + visibility + ' omits visibility and does not offer status controls', async () => {
    const { ui } = editor('features/portal-calendar/components/EventForm.tsx', 'EventForm',
      { ...event, visibility }, { categories: [category] })
    assert.equal(ui.field('visibility'), undefined)
    for (const label of ['Publicar', 'Despublicar', 'Cancelar evento']) assert.equal(ui.button(label), undefined)
    assert.equal(textContent(ui.tree).includes('Los cambios serán públicos al guardar.'), visibility === 'PUBLIC')
    ui.edit('title', 'Evento corregido')
    await ui.submit()
    assert.equal(ui.calls.length, 1)
    const { args } = ui.calls[0]
    assert.equal(args[0], '/admin/portal/events/42')
    assert.equal(args[1].revision, 3)
    assert.equal(args[1].title, 'Evento corregido')
    assert.equal('visibility' in args[1], false)
    assert.equal('status' in args[1], false)
    assert.equal('category_id' in args[1], false, 'unchanged category stays omitted')
    ui.h.unmount()
  })
}

for (const kind of ['sections', 'faqs']) {
  test('delegated ' + kind + ' editor warns about public save and hides publishing', async () => {
    const initial = kind === 'sections' ? information : { ...information, key: undefined,
      draft: { question: 'Pregunta', answer: 'Respuesta', sort_order: 0 },
      published: { question: 'Pregunta', answer: 'Respuesta', sort_order: 0 } }
    const { ui } = editor('features/portal-information/components/InformationEditor.tsx',
      'InformationEditor', initial, { kind })
    assert.match(textContent(ui.tree), /inmediatamente en el portal público/)
    assert.equal(ui.button('Guardar cambios').props.disabled, false)
    assert.equal(ui.button('Publicar cambios'), undefined)
    assert.equal(ui.button('Publicar'), undefined)
    assert.equal(ui.button('Despublicar'), undefined)
    ui.edit(kind === 'sections' ? 'description' : 'answer', 'Texto corregido')
    await ui.submit()
    assert.equal(ui.calls[0].args[0], '/admin/portal/information/' + kind + '/43')
    assert.equal('is_published' in ui.calls[0].args[1], false)
    assert.equal('published' in ui.calls[0].args[1], false)
    ui.h.unmount()
  })
}

test('delegated unpublished information keeps draft warning and does not offer publication', () => {
  const { ui } = editor('features/portal-information/components/InformationEditor.tsx',
    'InformationEditor', { ...information, is_published: false, published: null }, { kind: 'sections' })
  assert.match(textContent(ui.tree), /conserva el borrador sin publicarlo/)
  assert.equal(ui.button('Guardar borrador').props.disabled, false)
  assert.equal(ui.button('Publicar'), undefined)
  ui.h.unmount()
})

test('delegated service editor saves text without activation, access or visibility fields', async () => {
  const { ui } = editor('features/portal-services/components/ServiceEditor.tsx',
    'ServiceEditor', service, { formId: 'service-edit' })
  assert.equal(ui.button('Desactivar'), undefined)
  assert.equal(ui.button('Activar'), undefined)
  ui.edit('description', 'Servicio corregido')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, ['/admin/portal/services/44', { description: 'Servicio corregido', revision: 3 }])
  ui.h.unmount()
})

test('delegated collections reuse existing dialogs, hide creation and do not request news categories', async () => {
  for (const [feature, pageName, record, key] of [
    ['portal-news', 'AdminNewsPage', news, 'portal.news.update'],
    ['portal-services', 'AdminServicesPage', service, 'portal.services.update'],
    ['portal-information', 'AdminInformationPage', information, 'portal.information.sections.update'],
  ]) {
    const c = setup([key], { get: () => ({ data: page([record]) }) })
    const ui = component(c, 'features/' + feature + '/pages/' + pageName + '.tsx', pageName)
    await ui.ready()
    const collection = find(ui.tree, 'PortalAdminCollection')
    assert.equal(collection.props.onCreate, undefined)
    collection.props.onSelect(record.id)
    ui.render()
    const dialog = nodes(ui.tree, (node) => ['NewsDialog', 'ServiceDialog', 'InformationDialog'].includes(node.type?.name))[0]
    assert.equal(dialog.props.canManage, false)
    if (feature === 'portal-news') {
      assert.equal(ui.calls.length, 0, 'no category endpoint is needed to edit news text')
      assert.doesNotMatch(textContent(ui.tree), /Gestionar categorías/)
    }
    ui.h.unmount()
  }
})

test('information/FAQ selector contains only authorized types, even when the page receives a different initial kind', async () => {
  const c = setup(['portal.information.faqs.update'], { get: () => ({ data: page([]) }) })
  const ui = component(c, 'features/portal-information/pages/AdminInformationPage.tsx',
    'AdminInformationPage', { initialKind: 'faqs' })
  const collection = find(ui.tree, 'PortalAdminCollection')
  const selector = nodes(collection.props.filters, (node) => node.type?.name === 'Dropdown')[0]
  assert.deepEqual(selector.props.options.map((option) => option.value), ['faqs'])
  assert.equal(collection.props.onCreate, undefined)
  selector.props.onChange('sections')
  ui.render()
  assert.equal(find(ui.tree, 'PortalAdminCollection').props.resetPageKey, 'faqs-')
  await collection.props.load({ page: 1, per_page: 15 }, new AbortController().signal)
  assert.equal(ui.calls.at(-1).args[0], '/admin/portal/information/faqs')
  ui.h.unmount()
})

test('delegated calendar keeps the existing table and categories dependency without create or category-management buttons', async () => {
  const c = setup(['portal.events.update'], { get: (path) => ({
    data: path.endsWith('event-categories') ? { data: [category] } : page([event]),
  }) })
  const ui = component(c, 'features/portal-calendar/pages/AdminCalendarPage.tsx', 'AdminCalendarPage')
  await ui.ready()
  assert.equal(find(ui.tree, 'PageHeader').props.actions, undefined)
  assert.doesNotMatch(textContent(ui.tree), /Gestionar categorías/)
  const table = nodes(ui.tree, (node) => node.type === 'table')[0]
  table.props.onViewProfile(event)
  ui.render()
  assert.equal(find(ui.tree, 'AdminEventDialog').props.canManage, false)
  assert.ok(ui.calls.some((call) => call.args[0] === '/admin/portal/event-categories'))
  ui.h.unmount()
})

test('administrator collections keep creation and category controls without explicit portal permissions', async () => {
  for (const [feature, pageName] of [['portal-news', 'AdminNewsPage'], ['portal-services', 'AdminServicesPage']]) {
    const c = setup([], { get: () => ({ data: { data: [] } }) }, ['ADMINISTRADOR'])
    const ui = component(c, 'features/' + feature + '/pages/' + pageName + '.tsx', pageName)
    assert.equal(typeof find(ui.tree, 'PortalAdminCollection').props.onCreate, 'function')
    ui.h.unmount()
  }
})

