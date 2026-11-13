// HU39/HU41 D1.2 — category management (backend 9172f18, docs/PORTAL_CATEGORIES_API.md).
// Every HTTP call is simulated through portalHarness; nothing reaches a backend.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  client,
  component,
  httpError,
  nodes,
  page,
  textContent,
} from '../../portal-shared/tests/portalHarness.mjs'

const CATALOGS = {
  event: {
    path: '/admin/portal/event-categories/manage',
    title: 'Categorías del calendario',
    back: '/admin/portal/events',
    page: 'AdminEventCategoriesPage',
    message: /nuevos eventos/,
  },
  news: {
    path: '/admin/portal/news-categories/manage',
    title: 'Categorías de noticias',
    back: '/admin/portal/news',
    page: 'AdminNewsCategoriesPage',
    message: /nuevas noticias/,
  },
}
const academic = { id: 5, name: 'Académico', is_active: true, revision: 3 }
const retired = { id: 9, name: 'Antigua', is_active: false, revision: 2 }
const auth = {
  '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
}

function editor(catalog, handlers = {}, initial = academic) {
  const saved = []
  const states = []
  const dirty = []
  const ui = component(
    client(handlers),
    'features/portal-categories/CategoryEditor.tsx',
    'CategoryEditor',
    {
      catalog,
      initial,
      formId: 'category-form',
      onSaved: (category, kind) => saved.push({ category, kind }),
      onBusy() {},
      onDirty: (value) => dirty.push(value),
      onStateChange: (value) => states.push(value),
    },
  )
  return Object.assign(ui, { saved, states, dirty })
}
const confirmDialog = (ui) =>
  nodes(ui.tree, (node) => node.type?.name === 'ConfirmDialog')[0]
const badgeActive = (ui) =>
  nodes(ui.tree, (node) => node.type?.name === 'CategoryStatusBadge')[0].props
    .active

function adminPage(catalog, get, notices = []) {
  const ui = component(
    client(
      { get },
      {
        '@/features/auth/hooks/useAuth': {
          useAuth: () => ({ notify: (...args) => notices.push(args) }),
        },
      },
    ),
    'features/portal-categories/AdminCategoriesPage.tsx',
    'AdminCategoriesPage',
    { catalog },
  )
  const collection = () =>
    nodes(ui.tree, (node) => node.props?.load && node.props?.onSelect)[0]
  return Object.assign(ui, { collection, notices })
}

for (const [catalog, spec] of Object.entries(CATALOGS)) {
  test(`D1.2 ${catalog}: listing uses its own endpoint with search, state filter and pagination`, async () => {
    const ui = adminPage(catalog, (_url, { params }) => ({
      data: page([academic, retired], params.page, 3, 31),
    }))
    const collection = ui.collection()
    assert.equal(collection.props.title, spec.title)
    assert.equal(collection.props.createLabel, 'Crear categoría')
    assert.equal(collection.props.searchPlaceholder, 'Buscar por nombre')
    const result = await collection.props.load(
      { page: 2, search: 'aca', per_page: 15 },
      undefined,
    )
    assert.equal(result.meta.current_page, 2)
    assert.deepEqual(ui.calls.at(-1).args[0], spec.path)
    assert.deepEqual(ui.calls.at(-1).args[1].params, {
      page: 2,
      search: 'aca',
      per_page: 15,
    })
    const filter = nodes(
      collection.props.filters,
      (node) => node.props?.name === 'category_state',
    )[0]
    assert.deepEqual(
      nodes(filter, (node) => node.type === 'option').map((node) =>
        textContent(node).trim(),
      ),
      ['Todas', 'Activas', 'Inactivas'],
    )
    for (const [value, expected] of [
      ['active', true],
      ['inactive', false],
    ]) {
      nodes(ui.collection().props.filters, (node) => node.type === 'select')[0]
        .props.onChange({ target: { value } })
      ui.render()
      assert.equal(ui.collection().props.resetPageKey, value)
      await ui.collection().props.load({ page: 1, search: '' }, undefined)
      assert.equal(ui.calls.at(-1).args[1].params.is_active, expected)
    }
    nodes(ui.collection().props.filters, (node) => node.type === 'select')[0]
      .props.onChange({ target: { value: '' } })
    ui.render()
    await ui.collection().props.load({ page: 1, search: '' }, undefined)
    assert.equal('is_active' in ui.calls.at(-1).args[1].params, false)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: rows show name and state without internal IDs or revisions`, async () => {
    const ui = adminPage(catalog, () => ({ data: page([academic, retired]) }))
    const columns = ui.collection().props.columns
    assert.deepEqual(columns.map((column) => column.header), ['Nombre', 'Estado'])
    const render = (item) =>
      columns.map((column) => {
        const cell = column.cell({ item })
        if (typeof cell === 'string') return cell
        const badge = nodes(cell, (node) => node.type?.name === 'CategoryStatusBadge')[0]
        return badge.props.active ? 'Activa' : 'Inactiva'
      })
    assert.deepEqual(render(academic), ['Académico', 'Activa'])
    assert.deepEqual(render(retired), ['Antigua', 'Inactiva'])
    const link = nodes(ui.collection().props.children, (node) => node.type === 'link')[0]
    assert.equal(link.props.to, spec.back)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: Gestionar opens the listed resource and saves refresh the list`, async () => {
    const ui = adminPage(catalog, () => ({ data: page([academic, retired]) }))
    await ui.collection().props.load({ page: 1, search: '' }, undefined)
    ui.collection().props.onSelect(retired.id)
    ui.render()
    const dialog = () => nodes(ui.tree, (node) => node.type?.name === 'CategoryDialog')[0]
    assert.deepEqual(dialog().props.category, retired)
    assert.equal(dialog().props.catalog, catalog)
    const version = ui.collection().props.version
    dialog().props.onSaved({ ...retired, is_active: true, revision: 3 }, 'activated')
    ui.render()
    assert.equal(ui.collection().props.version, version + 1)
    assert.deepEqual(ui.notices.at(-1), ['success', 'La categoría fue activada.'])
    dialog().props.onClose()
    ui.render()
    assert.equal(dialog(), undefined)
    ui.collection().props.onCreate()
    ui.render()
    assert.equal(dialog().props.category, null)
    const created = { id: 12, name: 'Nueva', is_active: true, revision: 1 }
    dialog().props.onSaved(created, 'created')
    ui.render()
    assert.deepEqual(dialog().props.category, created, 'reopens in edit mode')
    assert.deepEqual(ui.notices.at(-1), ['success', 'La categoría fue creada.'])
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: malformed listing produces a controlled error`, async () => {
    for (const body of [
      null,
      { data: [], meta: { current_page: 0 } },
      page([{ id: 5, name: 'X', is_active: 'yes', revision: 1 }]),
    ]) {
      const c = client({ get: () => ({ data: body }) })
      const api = c.h.load('features/portal-categories/categoriesApi.ts')
      await assert.rejects(api.listManagedCategories(catalog, { page: 1 }))
    }
  })

  test(`D1.2 ${catalog}: create trims the name, requires it and sends no state`, async () => {
    const ui = editor(
      catalog,
      {
        post: (_url, body) => ({
          data: { data: { id: 12, name: body.name, is_active: true, revision: 1 } },
        }),
      },
      null,
    )
    assert.match(textContent(ui.tree), /se creará como activa/)
    assert.equal(ui.field('name').props.maxLength, 100)
    assert.equal(ui.states.at(-1).label, 'Crear categoría')
    ui.edit('name', '   ')
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    assert.match(textContent(ui.tree), /El nombre es obligatorio\./)
    ui.edit('name', '  Investigación  ')
    assert.doesNotMatch(textContent(ui.tree), /El nombre es obligatorio\./)
    await ui.submit()
    assert.deepEqual(ui.calls[0].args, [spec.path, { name: 'Investigación' }])
    assert.equal(ui.saved[0].kind, 'created')
    assert.equal(ui.saved[0].category.is_active, true)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: rename uses the real revision and the updated one afterwards`, async () => {
    let revision = academic.revision
    const ui = editor(catalog, {
      patch: (_url, body) => ({
        data: { data: { ...academic, name: body.name, revision: ++revision } },
      }),
    })
    assert.equal(ui.states.at(-1).disabled, true, 'unchanged name cannot be saved')
    ui.edit('name', 'Académico 2026')
    assert.equal(ui.states.at(-1).disabled, false)
    await ui.submit()
    assert.deepEqual(ui.calls[0].args, [
      `${spec.path}/5`,
      { name: 'Académico 2026', revision: 3 },
    ])
    ui.edit('name', 'Académico 2027')
    await ui.submit()
    assert.equal(ui.calls[1].args[1].revision, 4)
    assert.deepEqual(ui.saved.map((item) => item.kind), ['renamed', 'renamed'])
    assert.doesNotMatch(textContent(ui.tree), /Revisión|ID 5/)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: unchanged or whitespace-only names send no request (revision unchanged)`, async () => {
    const ui = editor(catalog, { patch: () => assert.fail('no request expected') })
    await ui.submit()
    ui.edit('name', '  Académico  ')
    assert.equal(ui.dirty.at(-1), false)
    assert.equal(ui.states.at(-1).disabled, true)
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: deactivation requires confirmation and uses the revision`, async () => {
    const ui = editor(catalog, {
      patch: () => ({ data: { data: { ...academic, is_active: false, revision: 4 } } }),
    })
    assert.equal(badgeActive(ui), true)
    await ui.click('Desactivar')
    assert.equal(ui.calls.length, 0, 'nothing is sent before confirming')
    assert.equal(confirmDialog(ui).props.isOpen, true)
    assert.match(confirmDialog(ui).props.message, spec.message)
    assert.equal(ui.states.at(-1).confirming, true)
    confirmDialog(ui).props.onCancel()
    ui.render()
    assert.equal(confirmDialog(ui).props.isOpen, false)
    assert.equal(ui.calls.length, 0)
    await ui.click('Desactivar')
    confirmDialog(ui).props.onConfirm()
    await ui.ready()
    assert.deepEqual(ui.calls[0].args, [
      `${spec.path}/5/status`,
      { is_active: false, revision: 3 },
    ])
    assert.equal(badgeActive(ui), false)
    assert.ok(ui.button('Activar'))
    assert.equal(ui.saved.at(-1).kind, 'deactivated')
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: activation is direct and keeps an unsaved name draft`, async () => {
    const ui = editor(
      catalog,
      {
        // A no-op on the backend keeps the revision; the UI just adopts the resource.
        patch: () => ({ data: { data: { ...retired, is_active: true, revision: 3 } } }),
      },
      retired,
    )
    ui.edit('name', 'Antigua renombrada')
    await ui.click('Activar')
    assert.deepEqual(ui.calls[0].args, [
      `${spec.path}/9/status`,
      { is_active: true, revision: 2 },
    ])
    assert.equal(ui.field('name').props.value, 'Antigua renombrada')
    assert.equal(ui.dirty.at(-1), true)
    assert.equal(ui.saved.at(-1).kind, 'activated')
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: 409 REVISION_CONFLICT keeps the draft, blocks writes and reloads only on request`, async () => {
    const ui = editor(catalog, {
      patch: () => {
        throw httpError(409, {
          code: 'REVISION_CONFLICT',
          message: 'Conflicto',
          current_revision: 6,
        })
      },
      get: (_url, { params }) => ({
        data: page(
          params.page === 1
            ? [retired]
            : [{ ...academic, name: 'Académico servidor', revision: 6 }],
          params.page,
          2,
          2,
        ),
      }),
    })
    ui.edit('name', 'Mi borrador')
    await ui.submit()
    assert.equal(ui.field('name').props.value, 'Mi borrador')
    assert.match(textContent(ui.tree), /modificado por otro usuario/)
    assert.equal(ui.states.at(-1).disabled, true)
    assert.equal(ui.button('Desactivar').props.disabled, true)
    await ui.submit()
    assert.equal(ui.calls.length, 1, 'no automatic retry or overwrite')
    await ui.click('Recargar y descartar cambios')
    assert.deepEqual(
      ui.calls.slice(1).map((call) => [call.args[0], call.args[1].params]),
      [
        [spec.path, { page: 1, per_page: 100 }],
        [spec.path, { page: 2, per_page: 100 }],
      ],
    )
    assert.equal(ui.field('name').props.value, 'Académico servidor')
    assert.equal(ui.button('Desactivar').props.disabled, false)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: 422 shows the backend name error and keeps the draft`, async () => {
    const ui = editor(catalog, {
      patch: () => {
        throw httpError(422, {
          message: 'Ya existe una categoría con ese nombre.',
          errors: { name: ['Ya existe una categoría con ese nombre.'] },
        })
      },
    })
    ui.edit('name', 'tecnología')
    await ui.submit()
    assert.match(textContent(ui.tree), /Ya existe una categoría con ese nombre\./)
    assert.equal(ui.field('name').props['aria-invalid'], true)
    assert.equal(ui.field('name').props.value, 'tecnología')
    assert.equal(ui.saved.length, 0)
    ui.edit('name', 'Tecnología aplicada')
    assert.equal(ui.field('name').props['aria-invalid'], false)
    ui.h.unmount()
  })

  test(`D1.2 ${catalog}: 401, 403 and 404 show controlled messages without saving`, async () => {
    for (const [status, text] of [
      [401, /sesión ha caducado/],
      [403, /No tienes permisos/],
      [404, /no existe o ya no está disponible/],
    ]) {
      const ui = editor(catalog, {
        patch: () => {
          throw httpError(status, { message: 'raw' })
        },
      })
      ui.edit('name', 'Otro nombre')
      await ui.submit()
      assert.match(textContent(ui.tree), text)
      assert.doesNotMatch(textContent(ui.tree), /raw|\{/)
      assert.equal(ui.saved.length, 0)
      ui.h.unmount()
    }
  })
}

test('D1.2 status badge uses feminine labels on the shared AdminStatusBadge', () => {
  const ui = component(
    client(),
    'features/portal-categories/CategoryEditor.tsx',
    'CategoryStatusBadge',
    { active: true },
  )
  assert.equal(ui.tree.props.status, 'ACTIVE')
  assert.equal(textContent(ui.tree), 'Activa')
  ui.props.active = false
  ui.render()
  assert.equal(ui.tree.props.status, 'INACTIVE')
  assert.equal(textContent(ui.tree), 'Inactiva')
  ui.h.unmount()
})

test('D1.2 the two catalog routes keep independent data and state', async () => {
  const c = client({ get: () => ({ data: page([academic]) }) }, auth)
  const module = c.h.load('features/portal-categories/AdminCategoriesPage.tsx')
  for (const [catalog, spec] of Object.entries(CATALOGS)) {
    const tree = c.h.render(() => module[spec.page]())
    assert.equal(tree.props.catalog, catalog)
    assert.equal(tree.key, catalog, 'distinct key: no state carried between catalogs')
  }
  c.h.unmount()
})

test('D1.2 every CSS module class referenced by the new screens exists', async () => {
  const { readFile } = await import('node:fs/promises')
  const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
  // Local module of the new feature: every referenced class must exist.
  const sheet = await read('../categories.module.css')
  for (const source of ['../AdminCategoriesPage.tsx', '../CategoryEditor.tsx']) {
    const code = await read(source)
    for (const [, key] of code.matchAll(/\bcategoryStyles\.([A-Za-z_]\w*)/g))
      assert.match(sheet, new RegExp(`\\.${key}\\b`), `${source}: ${key}`)
  }
  // Classes added for the "Gestionar categorías" links. Shared classes that
  // resolve through @import are covered by shared/tests/cssContracts.test.mjs.
  assert.match(await read('../../portal-news/pages/adminNews.module.css'), /\.categoriesLink\b/)
  assert.match(await read('../../portal-calendar/pages/portalCalendar.module.css'), /\.categoriesLink\b/)
})

test('D1.2 admin routes exist for both catalogs without touching the Contenidos menu', async () => {
  const { readFile } = await import('node:fs/promises')
  const router = await readFile(new URL('../../../app/router/router.tsx', import.meta.url), 'utf8')
  assert.match(router, /path: 'portal\/events\/categories'[\s\S]*?AdminEventCategoriesPage/)
  assert.match(router, /path: 'portal\/news\/categories'[\s\S]*?AdminNewsCategoriesPage/)
  const header = await readFile(
    new URL('../../../shared/components/Header/headerNavigation.config.ts', import.meta.url),
    'utf8',
  ).catch(() => '')
  assert.doesNotMatch(header, /categories/)
})

test('D1.2 news and calendar admin pages link to their category management', async () => {
  const news = component(
    client({ get: () => ({ data: { data: [] } }) }, auth),
    'features/portal-news/pages/AdminNewsPage.tsx',
    'AdminNewsPage',
  )
  const newsCollection = nodes(news.tree, (node) => node.props?.load && node.props?.onSelect)[0]
  const newsLink = nodes(newsCollection.props.children, (node) => node.type === 'link')[0]
  assert.equal(newsLink.props.to, '/admin/portal/news/categories')
  assert.equal(textContent(newsLink), 'Gestionar categorías')
  news.h.unmount()
  const calendar = component(
    client(
      {
        get: (url, { params } = {}) => ({
          data: url.endsWith('event-categories')
            ? { data: [] }
            : page([], params?.page ?? 1),
        }),
      },
      { ...auth, '@/shared/components/DataTable/DataTable': { DataTable: 'table' } },
    ),
    'features/portal-calendar/pages/AdminCalendarPage.tsx',
    'AdminCalendarPage',
  )
  const calendarLink = nodes(
    calendar.tree,
    (node) => node.type === 'link' && node.props.to === '/admin/portal/events/categories',
  )[0]
  assert.ok(calendarLink)
  assert.equal(textContent(calendarLink), 'Gestionar categorías')
  calendar.h.unmount()
})
