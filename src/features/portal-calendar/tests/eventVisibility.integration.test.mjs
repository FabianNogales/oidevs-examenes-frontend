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

const category = { id: 73, name: 'Institucional' }
const publicEvent = {
  id: 47,
  title: 'Jornada institucional',
  description: 'Contenido institucional',
  starts_at: '2026-11-05T09:00:00-04:00',
  ends_at: '2026-11-05T11:00:00-04:00',
  all_day: false,
  location: 'Auditorio',
  category,
  status: 'PUBLISHED',
  published_at: '2026-11-01T10:00:00-04:00',
}
const adminEvent = {
  ...publicEvent,
  visibility: 'PRIVATE',
  revision: 7,
  created_by: 10,
  updated_by: 10,
}
const confirmLabel = 'Confirmar cambio de visibilidad'
function editor(initial = adminEvent, handlers = {}) {
  const saved = []
  const c = client(handlers)
  const ui = component(
    c,
    'features/portal-calendar/components/EventForm.tsx',
    'EventForm',
    {
      initial,
      categories: [category],
      onSaved: (event) => saved.push(event),
      onBusy() {},
    },
  )
  ui.saved = saved
  ui.api = c.h.load('features/portal-calendar/api/portalCalendarApi.ts')
  return ui
}
function adminList(visibility = 'PRIVATE') {
  return component(
    client(
      {
        get: (url, { params }) => ({
          data: url.endsWith('event-categories')
            ? { data: [category] }
            : page([{ ...adminEvent, visibility }], params.page, 3, 31),
        }),
      },
      {
        '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
        '@/shared/components/DataTable/DataTable': { DataTable: 'table' },
      },
    ),
    'features/portal-calendar/pages/AdminCalendarPage.tsx',
    'AdminCalendarPage',
  )
}
const table = (ui) => nodes(ui.tree, (node) => node.type === 'table')[0]
const warning = (ui) =>
  nodes(
    ui.tree,
    (node) => node.props?.['aria-label'] === 'Confirmar cambio de visibilidad',
  )[0]

for (const visibility of ['PUBLIC', 'PRIVATE']) {
  test(`HU39 creación ${visibility}: envía la selección explícita y conserva DRAFT`, async () => {
    const ui = editor(null, {
      post: (_url, input) => ({
        data: {
          data: { ...adminEvent, ...input, status: 'DRAFT', revision: 1 },
        },
      }),
    })
    assert.equal(ui.field('visibility').props.value, 'PUBLIC')
    assert.deepEqual(
      nodes(ui.field('visibility'), (node) => node.type === 'option').map(
        (node) => [node.props.value, textContent(node)],
      ),
      [
        ['PUBLIC', 'Público'],
        ['PRIVATE', 'Privado — solo administradores'],
      ],
    )
    ui.edit('visibility', visibility)
    ui.edit('title', 'Actividad')
    ui.edit('description', 'Descripción')
    ui.edit('starts_at', '2026-11-05')
    ui.edit('starts_at_time', '09:00')
    ui.edit('ends_at', '2026-11-05')
    ui.edit('ends_at_time', '11:00')
    ui.edit('category_id', '73')
    await ui.submit()
    assert.equal(ui.calls.length, 1)
    assert.equal(ui.calls[0].method, 'post')
    assert.equal(ui.calls[0].args[0], '/admin/portal/events')
    assert.equal(ui.calls[0].args[1].visibility, visibility)
    assert.equal('status' in ui.calls[0].args[1], false)
    assert.equal(ui.saved[0].status, 'DRAFT')
    assert.equal(warning(ui), undefined)
    ui.h.unmount()
  })

  test(`HU39 edición conserva ${visibility} y revision; detalle y selector distinguen estado/visibilidad`, async () => {
    const initial = { ...adminEvent, visibility }
    const ui = editor(initial, {
      patch: () => ({ data: { data: { ...initial, revision: 8 } } }),
    })
    assert.equal(ui.field('visibility').props.value, visibility)
    assert.match(
      textContent(ui.tree),
      visibility === 'PRIVATE'
        ? /Visibilidad: Privado/
        : /Visibilidad: Público/,
    )
    assert.match(textContent(ui.tree), /Estado: Publicado/)
    if (visibility === 'PRIVATE')
      assert.doesNotMatch(
        textContent(ui.tree),
        /Los cambios serán públicos al guardar/,
      )
    ui.edit('title', 'Título revisado')
    await ui.submit()
    assert.equal(ui.calls[0].args[1].visibility, visibility)
    assert.equal(ui.calls[0].args[1].revision, 7)
    assert.equal('status' in ui.calls[0].args[1], false)
    assert.equal(warning(ui), undefined)
    ui.h.unmount()
  })

  test(`HU39 listado muestra ${visibility} en columna independiente del estado`, async () => {
    const ui = adminList(visibility)
    await ui.ready()
    const { data, columns } = table(ui).props
    const visibilityColumn = columns.find(
      (column) => column.id === 'visibility',
    )
    assert.equal(visibilityColumn.header, 'Visibilidad')
    assert.equal(
      visibilityColumn.cell(data[0]).props.children,
      visibility === 'PUBLIC' ? 'Público' : 'Privado',
    )
    assert.equal(
      columns.find((column) => column.id === 'status').cell(data[0]).props
        .children,
      'Publicado',
    )
    ui.h.unmount()
  })

  test(`HU39 filtro ${visibility}: server-side, reinicia página y conserva búsqueda/estado/categoría`, async () => {
    const ui = adminList()
    await ui.ready()
    ui.edit('search', 'Jornada')
    nodes(ui.tree, (node) => node.type === 'form')[0].props.onSubmit({
      preventDefault() {},
    })
    ui.render()
    await ui.ready()
    ui.edit('status', 'PUBLISHED')
    await ui.ready()
    ui.edit('category_id', '73')
    await ui.ready()
    table(ui).props.onPageChange(2)
    ui.render()
    await ui.ready()
    ui.edit('visibility', visibility)
    await ui.ready()
    assert.equal(ui.calls.at(-1).args[0], '/admin/portal/events')
    assert.deepEqual(ui.calls.at(-1).args[1].params, {
      page: 1,
      per_page: 15,
      search: 'Jornada',
      status: 'PUBLISHED',
      category_id: 73,
      visibility,
    })
    // Rows remain exactly as delivered by the server, including unexpected visibility.
    assert.equal(table(ui).props.data[0].visibility, 'PRIVATE')
    table(ui).props.onPageChange(2)
    ui.render()
    await ui.ready()
    assert.equal(ui.calls.at(-1).args[1].params.page, 2)
    assert.equal(ui.calls.at(-1).args[1].params.visibility, visibility)
    ui.edit('visibility', '')
    await ui.ready()
    assert.equal(ui.calls.at(-1).args[1].params.page, 1)
    assert.equal('visibility' in ui.calls.at(-1).args[1].params, false)
    ui.h.unmount()
  })
}

test('HU39 filtro de visibilidad se combina con fechas en el adaptador administrativo', async () => {
  const c = client({ get: () => ({ data: page([]) }) })
  const api = c.h.load('features/portal-calendar/api/portalCalendarApi.ts')
  const query = {
    visibility: 'PRIVATE',
    status: 'PUBLISHED',
    search: 'Jornada',
    category_id: 73,
    from: '2026-11-01',
    to: '2026-11-30',
    page: 2,
    per_page: 15,
  }
  await api.getAdminEvents(query)
  assert.deepEqual(c.calls[0].args[1].params, query)
})

for (const [from, to, message] of [
  [
    'PRIVATE',
    'PUBLIC',
    /Público aparecerá inmediatamente en el calendario institucional/,
  ],
  [
    'PUBLIC',
    'PRIVATE',
    /Privado dejará de aparecer inmediatamente en el calendario institucional/,
  ],
]) {
  test(`HU39 PUBLISHED ${from} → ${to}: bloquea PATCH hasta confirmar el aviso explícito`, async () => {
    const initial = { ...adminEvent, visibility: from }
    const ui = editor(initial, {
      patch: (_url, input) => ({
        data: { data: { ...initial, ...input, revision: 8 } },
      }),
    })
    ui.edit('visibility', to)
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    assert.match(textContent(warning(ui)), message)
    assert.equal(
      nodes(ui.tree, (node) => node.type === 'fieldset')[0].props.disabled,
      true,
    )
    assert.equal(ui.button('Guardar cambios').props.disabled, true)
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    await ui.click(confirmLabel)
    assert.equal(ui.calls.length, 1)
    assert.equal(ui.calls[0].method, 'patch')
    assert.equal(ui.calls[0].args[0], '/admin/portal/events/47')
    assert.equal(ui.calls[0].args[1].visibility, to)
    assert.equal(ui.calls[0].args[1].revision, 7)
    assert.equal('status' in ui.calls[0].args[1], false)
    assert.equal(ui.saved[0].status, 'PUBLISHED')
    assert.equal(ui.saved[0].visibility, to)
    ui.h.unmount()
  })

  test(`HU39 cancelar aviso ${from} → ${to} conserva formulario sin modificar backend`, async () => {
    const ui = editor({ ...adminEvent, visibility: from })
    ui.edit('title', 'Título sin guardar')
    ui.edit('visibility', to)
    await ui.submit()
    await ui.click('Volver')
    assert.equal(warning(ui), undefined)
    assert.equal(ui.field('title').props.value, 'Título sin guardar')
    assert.equal(ui.field('visibility').props.value, to)
    assert.equal(ui.calls.length, 0)
    assert.equal(ui.saved.length, 0)
    await ui.submit()
    assert.ok(warning(ui))
    assert.equal(ui.calls.length, 0)
    ui.h.unmount()
  })
}

for (const status of ['DRAFT', 'CANCELLED']) {
  for (const [from, to] of [
    ['PRIVATE', 'PUBLIC'],
    ['PUBLIC', 'PRIVATE'],
  ]) {
    test(`HU39 ${status} ${from} → ${to}: guarda normalmente sin publicar ni advertir exposición inmediata`, async () => {
      const initial = { ...adminEvent, status, visibility: from }
      const ui = editor(initial, {
        patch: (_url, input) => ({
          data: { data: { ...initial, ...input, revision: 8 } },
        }),
      })
      ui.edit('visibility', to)
      await ui.submit()
      assert.equal(warning(ui), undefined)
      assert.doesNotMatch(
        textContent(ui.tree),
        /aparecerá inmediatamente|estará visible en el calendario público/,
      )
      assert.equal(ui.calls.length, 1)
      assert.equal(ui.calls[0].args[1].visibility, to)
      assert.equal('status' in ui.calls[0].args[1], false)
      assert.equal(ui.saved[0].status, status)
      ui.h.unmount()
    })
  }
}

test('HU39 publicar DRAFT+PRIVATE conserva PRIVATE y no promete exposición pública', async () => {
  const ui = editor(
    { ...adminEvent, status: 'DRAFT' },
    { patch: () => ({ data: { data: { ...adminEvent, revision: 8 } } }) },
  )
  await ui.click('Publicar')
  assert.match(
    textContent(ui.tree),
    /seguirá siendo privado y solo podrá consultarse en administración/,
  )
  assert.doesNotMatch(
    textContent(ui.tree),
    /estará visible en el calendario público/,
  )
  assert.equal(ui.calls.length, 0)
  await ui.click('Confirmar cambio')
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/events/47/status',
    { status: 'PUBLISHED', revision: 7 },
  ])
  assert.equal(ui.saved[0].visibility, 'PRIVATE')
  ui.h.unmount()
})

test('HU38 consulta pública posterior al cambio PUBLISHED/PUBLIC → PRIVATE respeta listado vacío y detalle 404 del servidor', async () => {
  let serverEvent = { ...adminEvent, visibility: 'PUBLIC' }
  const ui = editor(serverEvent, {
    patch: (_url, input) => {
      serverEvent = { ...serverEvent, ...input, revision: 8 }
      return { data: { data: serverEvent } }
    },
    get: (url) => {
      if (url === '/portal/events')
        return {
          data: page(serverEvent.visibility === 'PUBLIC' ? [publicEvent] : []),
        }
      throw httpError(404)
    },
  })
  assert.equal(
    (await ui.api.getPublicEvents({ from: '2026-11-01', to: '2026-11-30' }))
      .length,
    1,
  )
  ui.edit('visibility', 'PRIVATE')
  await ui.submit()
  assert.equal(serverEvent.visibility, 'PUBLIC')
  await ui.click(confirmLabel)
  assert.deepEqual(
    await ui.api.getPublicEvents({ from: '2026-11-01', to: '2026-11-30' }),
    [],
  )
  await assert.rejects(
    ui.api.getPublicEvent(47),
    (error) => error.response.status === 404,
  )
  for (const call of ui.calls.filter(
    (call) => call.method === 'get' && call.args[0] === '/portal/events',
  )) {
    assert.equal('visibility' in call.args[1].params, false)
    assert.equal('status' in call.args[1].params, false)
  }
  ui.h.unmount()
})

for (const status of ['DRAFT', 'PUBLISHED', 'CANCELLED']) {
  for (const visibility of ['PUBLIC', 'PRIVATE']) {
    test(`HU38 matriz ${status}+${visibility}: consume únicamente la respuesta pública mockeada`, async () => {
      // The server owns this rule; frontend receives no visibility field.
      const response =
        status === 'PUBLISHED' && visibility === 'PUBLIC'
          ? [{ ...publicEvent, status }]
          : []
      const c = client({
        get: (url) => ({
          data: url.endsWith('event-categories')
            ? { data: [category] }
            : page(response),
        }),
      })
      const ui = component(
        c,
        'features/portal-calendar/components/InstitutionalCalendar.tsx',
        'InstitutionalCalendar',
        { compact: false },
      )
      await ui.ready()
      const returnedButtons = nodes(
        ui.tree,
        (node) =>
          node.type === 'button' &&
          textContent(node).includes(publicEvent.title),
      )
      assert.equal(returnedButtons.length > 0, response.length > 0)
      assert.equal(
        nodes(ui.tree, (node) => node.props?.name === 'visibility').length,
        0,
      )
      assert.doesNotMatch(textContent(ui.tree), /Visibilidad:/)
      for (const call of c.calls.filter(
        (call) => call.args[0] === '/portal/events',
      )) {
        assert.equal('visibility' in call.args[1].params, false)
        assert.equal('status' in call.args[1].params, false)
      }
      ui.h.unmount()
    })
  }
}

test('HU38 detalle privado 404 conserva el modal y su reintento existente', async () => {
  let closed = false
  const ui = component(
    client({
      get: () => {
        throw httpError(404)
      },
    }),
    'features/portal-calendar/components/PublicEventDialog.tsx',
    'PublicEventDialog',
    {
      eventId: 47,
      onClose: () => {
        closed = true
      },
    },
  )
  await ui.ready()
  assert.match(textContent(ui.tree), /no existe o ya no está disponible/)
  assert.ok(ui.button('Reintentar'))
  assert.equal(closed, false)
  assert.equal(ui.calls[0].args[0], '/portal/events/47')
  ui.h.unmount()
})

test('HU39 409 en visibilidad conserva cambios/revisión y bloquea reintento hasta recarga explícita', async () => {
  let fail = true
  const current = { ...adminEvent, revision: 11, visibility: 'PRIVATE' }
  const ui = editor(adminEvent, {
    patch: () => {
      if (fail) throw httpError(409, { current_revision: 99 })
      return {
        data: { data: { ...current, visibility: 'PUBLIC', revision: 12 } },
      }
    },
    get: () => ({ data: { data: current } }),
  })
  ui.edit('title', 'Cambios locales')
  ui.edit('visibility', 'PUBLIC')
  await ui.submit()
  await ui.click(confirmLabel)
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.field('visibility').props.value, 'PUBLIC')
  assert.equal(ui.field('title').props.value, 'Cambios locales')
  assert.match(textContent(ui.tree), /Revisión: 7/)
  assert.match(textContent(ui.tree), /Visibilidad: Privado/)
  assert.match(textContent(ui.tree), /modificado por otro usuario/)
  assert.equal(ui.button(confirmLabel).props.disabled, true)
  assert.equal(ui.saved.length, 0)
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  await ui.click('Recargar evento y descartar cambios')
  assert.equal(ui.field('visibility').props.value, 'PRIVATE')
  assert.match(textContent(ui.tree), /Revisión: 11/)
  assert.equal(warning(ui), undefined)
  fail = false
  ui.edit('visibility', 'PUBLIC')
  await ui.submit()
  await ui.click(confirmLabel)
  assert.equal(ui.calls.at(-1).args[1].revision, 11)
  assert.equal(ui.saved[0].visibility, 'PUBLIC')
  ui.h.unmount()
})

test('HU39 422 de visibility mantiene selección y muestra validación en el selector', async () => {
  const ui = editor(
    { ...adminEvent, status: 'DRAFT' },
    {
      patch: () => {
        throw httpError(422, {
          errors: { visibility: ['La visibilidad no está permitida.'] },
        })
      },
    },
  )
  ui.edit('visibility', 'PUBLIC')
  await ui.submit()
  assert.equal(ui.field('visibility').props.value, 'PUBLIC')
  assert.equal(ui.field('visibility').props['aria-invalid'], true)
  assert.match(textContent(ui.tree), /La visibilidad no está permitida/)
  ui.h.unmount()
})

test('HU39 historial existente presenta visibility recibido sin reconstruir snapshots antiguos', async () => {
  const entries = [
    {
      id: 35,
      entity_type: 'PortalEvent',
      entity_id: 47,
      action: 'PORTAL_EVENT_UPDATED',
      actor_id: 10,
      actor_name: 'Administradora',
      created_at: '2026-11-01T15:00:00Z',
      old_values: { visibility: 'PRIVATE' },
      new_values: { visibility: 'PUBLIC' },
    },
    {
      id: 34,
      entity_type: 'PortalEvent',
      entity_id: 47,
      action: 'PORTAL_EVENT_UPDATED',
      actor_id: 10,
      actor_name: 'Administradora',
      created_at: '2026-11-01T14:00:00Z',
      old_values: { title: 'Antes' },
      new_values: { title: 'Después' },
    },
  ]
  const ui = component(
    client({
      get: () => ({
        data: {
          ...page(entries),
          links: { first: '?page=1', last: '?page=1', prev: null, next: null },
        },
      }),
    }),
    'features/portal-shared/components/PortalHistory.tsx',
    'PortalHistoryPanel',
    { resource: 'events', id: 47 },
  )
  await ui.ready()
  assert.match(textContent(ui.tree), /VisibilidadAnteriorPRIVATENuevoPUBLIC/)
  assert.equal(
    nodes(
      ui.tree,
      (node) => node.type === 'h4' && textContent(node) === 'Visibilidad',
    ).length,
    1,
  )
  assert.equal(ui.calls[0].args[0], '/admin/portal/events/47/history')
  ui.h.unmount()
})
