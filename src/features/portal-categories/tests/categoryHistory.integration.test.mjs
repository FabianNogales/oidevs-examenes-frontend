// HU39/HU41 D1.3 — category history (backend 9172f18, PortalCategoryController::history).
// Fixtures mirror the verified backend shape: actions PORTAL_CATEGORY_CREATED,
// PORTAL_CATEGORY_UPDATED, PORTAL_CATEGORY_STATUS_CHANGED; old/new values are
// {id, name, is_active, revision} with old_values null on creation.
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

const PATHS = {
  event: '/admin/portal/event-categories/manage',
  news: '/admin/portal/news-categories/manage',
}
const ENTITY = { event: 'PortalEventCategory', news: 'PortalNewsCategory' }
const snapshot = (name, active, revision) => ({
  id: 5,
  name,
  is_active: active,
  revision,
})
const entries = (catalog) => [
  {
    id: 30,
    entity_type: ENTITY[catalog],
    entity_id: 5,
    action: 'PORTAL_CATEGORY_STATUS_CHANGED',
    actor_id: 7,
    actor_name: 'Ana Pérez',
    created_at: '2026-11-09T14:30:00+00:00',
    old_values: snapshot('Actividad académica', true, 2),
    new_values: snapshot('Actividad académica', false, 3),
  },
  {
    id: 21,
    entity_type: ENTITY[catalog],
    entity_id: 5,
    action: 'PORTAL_CATEGORY_UPDATED',
    actor_id: 7,
    actor_name: 'Ana Pérez',
    created_at: '2026-11-09T13:00:00+00:00',
    old_values: snapshot('Académico', true, 1),
    new_values: snapshot('Actividad académica', true, 2),
  },
  {
    id: 12,
    entity_type: ENTITY[catalog],
    entity_id: 5,
    action: 'PORTAL_CATEGORY_CREATED',
    actor_id: 8,
    actor_name: null,
    created_at: '2026-11-08T10:00:00+00:00',
    old_values: null,
    new_values: snapshot('Académico', true, 1),
  },
]

function panel(catalog, get, id = 5) {
  return component(
    client({ get }),
    'features/portal-categories/CategoryHistory.tsx',
    'CategoryHistoryPanel',
    { catalog, id },
  )
}
const items = (ui) =>
  nodes(ui.tree, (node) => node.type === 'li' && node.props.className)
const itemText = (ui) => items(ui).map((node) => textContent(node))

for (const catalog of ['event', 'news']) {
  test(`D1.3 ${catalog}: history uses its own endpoint and presents action, actor, local date and changes`, async () => {
    const ui = panel(catalog, () => ({ data: page(entries(catalog)) }))
    await ui.ready()
    assert.deepEqual(ui.calls[0].args[0], `${PATHS[catalog]}/5/history`)
    assert.deepEqual(ui.calls[0].args[1].params, { page: 1, per_page: 10 })
    const [status, rename, created] = itemText(ui)
    assert.match(status, /^Categoría desactivada/)
    assert.match(status, /Responsable: Ana Pérez/)
    assert.match(status, /Estado: Activa → Inactiva/)
    assert.doesNotMatch(status, /Nombre:/, 'unchanged fields are not listed')
    assert.match(rename, /^Nombre actualizado/)
    assert.match(rename, /Nombre: Académico → Actividad académica/)
    assert.doesNotMatch(rename, /Estado:/)
    assert.match(created, /^Categoría creada/)
    assert.match(created, /Valores iniciales/)
    assert.match(created, /Nombre: Académico/)
    assert.match(created, /Estado: Activa/)
    assert.match(created, /Responsable: No disponible/)
    const times = nodes(ui.tree, (node) => node.type === 'time')
    assert.equal(times[0].props.dateTime, '2026-11-09T14:30:00+00:00')
    // Local (America/La_Paz) date, not the raw ISO string.
    assert.equal(
      textContent(times[0]),
      new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date('2026-11-09T14:30:00+00:00')),
    )
    const text = textContent(ui.tree)
    assert.doesNotMatch(
      text,
      /PORTAL_CATEGORY|PortalEventCategory|PortalNewsCategory|revision|Revisión|true|false|\{|#7|ID /,
    )
    ui.h.unmount()
  })

  test(`D1.3 ${catalog}: activation and unknown data are shown without inventing values`, async () => {
    const ui = panel(catalog, () => ({
      data: page([
        {
          ...entries(catalog)[0],
          id: 40,
          old_values: snapshot('Actividad académica', false, 3),
          new_values: snapshot('Actividad académica', true, 4),
        },
        {
          ...entries(catalog)[0],
          id: 41,
          action: 'PORTAL_CATEGORY_SOMETHING_NEW',
          created_at: 'fecha-no-valida',
          old_values: { extra: 'x' },
          new_values: { extra: 'y' },
        },
      ]),
    }))
    await ui.ready()
    const [activated, unknown] = itemText(ui)
    assert.match(activated, /^Categoría activada/)
    assert.match(activated, /Estado: Inactiva → Activa/)
    assert.match(unknown, /^Cambio registrado/)
    assert.match(unknown, /Fecha: No disponible/)
    assert.doesNotMatch(unknown, /SOMETHING|extra|fecha-no-valida|Cambios/)
    ui.h.unmount()
  })

  test(`D1.3 ${catalog}: history paginates through the backend meta`, async () => {
    const ui = panel(catalog, (_url, { params }) => ({
      data: page(
        params.page === 1 ? entries(catalog).slice(0, 2) : entries(catalog).slice(2),
        params.page,
        2,
        3,
      ),
    }))
    await ui.ready()
    assert.equal(items(ui).length, 2)
    assert.match(textContent(ui.tree), /3 registros · Página 1 de 2/)
    await ui.click('Siguiente')
    assert.equal(ui.calls.at(-1).args[1].params.page, 2)
    assert.deepEqual(itemText(ui).map((text) => text.split('Responsable')[0]), [
      'Categoría creada',
    ])
    assert.equal(ui.button('Siguiente').props.disabled, true)
    await ui.click('Anterior')
    assert.equal(ui.calls.at(-1).args[1].params.page, 1)
    ui.h.unmount()
  })

  test(`D1.3 ${catalog}: single page hides the pager; empty history is informative`, async () => {
    const ui = panel(catalog, () => ({ data: page([]) }))
    await ui.ready()
    assert.match(textContent(ui.tree), /No hay cambios registrados para esta categoría\./)
    assert.equal(ui.button('Siguiente'), undefined)
    ui.h.unmount()
  })

  test(`D1.3 ${catalog}: loading, controlled errors and retry`, async () => {
    for (const [status, text] of [
      [401, /sesión ha caducado/],
      [403, /No tienes permisos/],
      [404, /no existe o ya no está disponible/],
      [500, /No se pudo completar la operación/],
    ]) {
      let fail = true
      const ui = panel(catalog, () => {
        if (fail) throw httpError(status, { message: 'raw backend detail' })
        return { data: page(entries(catalog)) }
      })
      assert.match(textContent(ui.tree), /Cargando/)
      await ui.ready()
      assert.match(textContent(ui.tree), text)
      assert.doesNotMatch(textContent(ui.tree), /raw backend detail/)
      fail = false
      await ui.click('Reintentar')
      assert.equal(items(ui).length, 3)
      ui.h.unmount()
    }
  })

  test(`D1.3 ${catalog}: malformed history is rejected with controlled feedback`, async () => {
    for (const body of [
      null,
      { data: [] },
      page([{ ...entries(catalog)[0], old_values: 'texto' }]),
      page([{ ...entries(catalog)[0], id: '30' }]),
    ]) {
      const ui = panel(catalog, () => ({ data: body }))
      await ui.ready()
      assert.equal(items(ui).length, 0)
      assert.equal(nodes(ui.tree, (node) => node.props?.role === 'alert').length, 1)
      ui.h.unmount()
    }
  })
}

test('D1.3 catalogs are isolated: same ID requests and shows each catalog only', async () => {
  const seen = []
  for (const catalog of ['event', 'news']) {
    const ui = panel(catalog, (url) => {
      seen.push(url)
      return {
        data: page([
          {
            ...entries(catalog)[1],
            new_values: snapshot(catalog === 'event' ? 'Feria' : 'Boletín', true, 2),
          },
        ]),
      }
    })
    await ui.ready()
    assert.match(
      textContent(ui.tree),
      catalog === 'event' ? /Académico → Feria/ : /Académico → Boletín/,
    )
    ui.h.unmount()
  }
  assert.deepEqual(seen, [
    '/admin/portal/event-categories/manage/5/history',
    '/admin/portal/news-categories/manage/5/history',
  ])
})

test('D1.3 "Ver historial" toggles the panel for the selected category and catalog', async () => {
  const ui = component(
    client({ get: () => ({ data: page([]) }) }),
    'features/portal-categories/CategoryHistory.tsx',
    'CategoryHistory',
    { catalog: 'news', id: 9 },
  )
  const toggle = () =>
    nodes(ui.tree, (node) => node.type === 'button' && node.props['aria-controls'])[0]
  assert.equal(textContent(toggle()), 'Ver historial')
  assert.equal(toggle().props['aria-expanded'], false)
  assert.equal(nodes(ui.tree, (node) => node.type?.name === 'CategoryHistoryPanel').length, 0)
  toggle().props.onClick()
  ui.render()
  assert.equal(textContent(toggle()), 'Ocultar historial')
  assert.equal(toggle().props['aria-expanded'], true)
  const panelNode = nodes(ui.tree, (node) => node.type?.name === 'CategoryHistoryPanel')[0]
  assert.deepEqual(
    { catalog: panelNode.props.catalog, id: panelNode.props.id },
    { catalog: 'news', id: 9 },
  )
  assert.equal(ui.calls.length, 0, 'the panel loads only when it is mounted')
  ui.h.unmount()
})

test('D1.3 the management Drawer shows history only for existing categories and refreshes it after saves', async () => {
  const category = { id: 5, name: 'Académico', is_active: true, revision: 1 }
  const c = client({ get: () => ({ data: page([category]) }) }, {
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
  })
  const { AdminCategoriesPage } = c.h.load(
    'features/portal-categories/AdminCategoriesPage.tsx',
  )
  // Page and Drawer render in one pass so both keep their hook state.
  let pageTree, drawerTree
  const render = () =>
    c.h.render(() => {
      pageTree = AdminCategoriesPage({ catalog: 'event' })
      const dialog = nodes(pageTree, (node) => node.type?.name === 'CategoryDialog')[0]
      drawerTree = dialog ? dialog.type(dialog.props) : null
      return pageTree
    })
  render()
  const collection = () =>
    nodes(pageTree, (node) => node.props?.load && node.props?.onSelect)[0]
  const history = () =>
    nodes(drawerTree, (node) => node.type?.name === 'CategoryHistory')
  collection().props.onCreate()
  render()
  assert.equal(history().length, 0, 'no history while creating')
  await collection().props.load({ page: 1, search: '' }, undefined)
  collection().props.onSelect(5)
  render()
  assert.equal(history().length, 1)
  assert.deepEqual(
    { catalog: history()[0].props.catalog, id: history()[0].props.id },
    { catalog: 'event', id: 5 },
  )
  const firstKey = history()[0].key
  nodes(drawerTree, (node) => node.type?.name === 'CategoryEditor')[0].props.onSaved(
    { ...category, revision: 2 },
    'renamed',
  )
  render()
  assert.notEqual(history()[0].key, firstKey, 'history remounts after a save')
  c.h.unmount()
})
