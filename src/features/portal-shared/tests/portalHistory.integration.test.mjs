import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { sourceRoot, ts } from '../../../shared/tests/sourceHarness.mjs'
import {
  client,
  component,
  httpError,
  nodes,
  textContent,
  settle,
} from './portalHarness.mjs'

const entry = (values = {}) => ({
  id: 35,
  entity_type: 'PortalEvent',
  entity_id: 47,
  action: 'PORTAL_EVENT_UPDATED',
  actor_id: 10,
  actor_name: 'Administradora de prueba',
  created_at: '2026-11-01T15:00:00.000000Z',
  old_values: { title: 'Jornada institucional' },
  new_values: { title: 'Jornada académica' },
  ...values,
})
const historyPage = (data, current = 1, last = 1, total = data.length) => ({
  data,
  links: {
    first: '?page=1',
    last: `?page=${last}`,
    prev: current > 1 ? `?page=${current - 1}` : null,
    next: current < last ? `?page=${current + 1}` : null,
  },
  meta: { current_page: current, last_page: last, per_page: 15, total },
})
function panel(data, resource = 'events', handlers) {
  return component(
    client(handlers ?? { get: () => ({ data: historyPage(data) }) }),
    'features/portal-shared/components/PortalHistory.tsx',
    'PortalHistoryPanel',
    { resource, id: 47 },
  )
}

const resources = [
  [
    'HU39 CA13/CA14',
    'events',
    'PORTAL_EVENT_UPDATED',
    { title: 'Jornada institucional' },
    { title: 'Jornada académica' },
  ],
  [
    'HU41 CA15',
    'news',
    'PORTAL_NEWS_UPDATED',
    { content: 'Texto anterior' },
    { content: 'Texto corregido', has_image: false },
  ],
  [
    'HU43 CA14 sección',
    'information/sections',
    'PORTAL_INFORMATION_DRAFT_UPDATED',
    { draft: { description: 'Información anterior' } },
    {
      draft: { description: 'Información corregida' },
      published: { description: 'Información anterior' },
    },
  ],
  [
    'HU43 CA14 FAQ',
    'information/faqs',
    'PORTAL_INFORMATION_DRAFT_UPDATED',
    { draft: { answer: 'Respuesta anterior' } },
    {
      draft: { answer: 'Respuesta corregida' },
      published: { answer: 'Respuesta anterior' },
    },
  ],
  [
    'HU45 CA16',
    'services',
    'PORTAL_SERVICE_UPDATED',
    { name: 'Servicio inicial' },
    { name: 'Servicio corregido' },
  ],
]

for (const [criterion, resource, action, old_values, new_values] of resources) {
  test(`${criterion}: consulta endpoint exacto y muestra acción, responsable, fecha y valores auditados`, async () => {
    const ui = panel([entry({ action, old_values, new_values })], resource)
    assert.match(textContent(ui.tree), /Cargando contenido/)
    await ui.ready()
    assert.equal(ui.calls.length, 1)
    assert.equal(ui.calls[0].method, 'get')
    assert.equal(ui.calls[0].args[0], `/admin/portal/${resource}/47/history`)
    assert.deepEqual(ui.calls[0].args[1].params, { page: 1, per_page: 15 })
    assert.ok(ui.calls[0].args[1].signal instanceof AbortSignal)
    const text = textContent(ui.tree)
    assert.ok(text.includes(action))
    assert.match(text, /Responsable: Administradora de prueba/)
    const date = nodes(ui.tree, (node) => node.type === 'time')[0]
    assert.equal(date.props.dateTime, '2026-11-01T15:00:00.000000Z')
    assert.match(textContent(date), /11:00/)
    const leaves = (object) =>
      Object.values(object).flatMap((value) =>
        value && typeof value === 'object'
          ? leaves(value)
          : [
              typeof value === 'boolean'
                ? value
                  ? 'Sí'
                  : 'No'
                : String(value),
            ],
      )
    for (const value of [...leaves(old_values), ...leaves(new_values)])
      assert.ok(text.includes(value), value)
    if (resource.startsWith('information/')) {
      assert.equal(nodes(ui.tree, (node) => node.type === 'details').length, 1)
      assert.match(text, /Detalle técnico/)
      assert.equal(
        textContent(nodes(ui.tree, (node) => node.type === 'h3')[0]),
        resource.endsWith('/faqs') ? 'FAQ actualizada' : 'Sección actualizada',
      )
    } else if (resource === 'services') {
      assert.equal(nodes(ui.tree, (node) => node.type === 'details').length, 1)
      assert.match(text, /Detalle técnico/)
      assert.equal(
        textContent(nodes(ui.tree, (node) => node.type === 'h3')[0]),
        'Servicio actualizado',
      )
      assert.equal(
        textContent(nodes(ui.tree, (node) => node.type === 'h4')[0]),
        'Cambios',
      )
      assert.match(text, /Nombre: Servicio inicial → Servicio corregido/)
    } else {
      assert.match(text, /Anterior/)
      assert.match(text, /Nuevo/)
    }
    ui.h.unmount()
  })
}

test('HU42/HU43 muestra resumen humano antes del JSON técnico y conserva la entrada completa', async () => {
  const audit = entry({
    entity_type: 'PortalInformationSection',
    action: 'SECTION_UPDATED',
    actor_id: 20,
    actor_name: null,
    old_values: {
      revision: 1,
      draft: {
        title: 'Objetivos y beneficios',
        description: 'Texto anterior',
        sort_order: 3,
      },
    },
    new_values: {
      revision: 2,
      draft: {
        title: 'Objetivos y beneficios',
        description: 'Texto actualizado',
        sort_order: 2,
      },
    },
  })
  const ui = panel([audit], 'information/sections')
  await ui.ready()
  const text = textContent(ui.tree)
  assert.match(text, /Sección actualizada.*Objetivos y beneficios.*Revisión 2/s)
  assert.match(text, /Descripción: Texto anterior → Texto actualizado/)
  assert.match(text, /Orden: 3 → 2/)
  assert.match(text, /Responsable: Usuario #20/)
  const summaryIndex = text.indexOf('Sección actualizada')
  const detailIndex = text.indexOf('Detalle técnico')
  const jsonIndex = text.indexOf('"entity_type"')
  assert.ok(
    summaryIndex >= 0 && summaryIndex < detailIndex && detailIndex < jsonIndex,
  )
  assert.doesNotMatch(
    text.slice(0, detailIndex),
    /SECTION_UPDATED|old_values|new_values/,
  )
  assert.ok(text.slice(detailIndex).includes('"action": "SECTION_UPDATED"'))
  assert.ok(
    text
      .slice(detailIndex)
      .includes('"entity_type": "PortalInformationSection"'),
  )
  ui.h.unmount()
})

test('HU43 humaniza FAQ y publicación; presenta el cambio de estado sin inventar nombre', async () => {
  const ui = panel(
    [
      entry({
        action: 'FAQ_UPDATED',
        actor_id: null,
        actor_name: null,
        old_values: {
          draft: { question: '¿Qué es EIDA?', answer: 'Respuesta anterior' },
        },
        new_values: {
          revision: 3,
          draft: { question: '¿Qué es EIDA?', answer: 'Respuesta nueva' },
        },
      }),
      entry({
        id: 36,
        action: 'FAQ_PUBLISHED',
        actor_id: null,
        actor_name: null,
        old_values: { is_published: false, revision: 2 },
        new_values: { is_published: true, revision: 3 },
      }),
    ],
    'information/faqs',
  )
  await ui.ready()
  const text = textContent(ui.tree)
  assert.match(
    text,
    /FAQ actualizada.*¿Qué es EIDA?.*Respuesta: Respuesta anterior → Respuesta nueva/s,
  )
  assert.match(
    text,
    /FAQ publicada.*Revisión 3.*Estado: Despublicado → Publicado/s,
  )
  assert.doesNotMatch(text, /Responsable:/)
  assert.match(text, /"action": "FAQ_PUBLISHED"/)
  ui.h.unmount()
})

test('HU39 CA13: modificación y cancelación conservadas se muestran en el orden entregado', async () => {
  const ui = panel([
    entry({
      id: 36,
      action: 'PORTAL_EVENT_STATUS_CHANGED',
      old_values: { status: 'PUBLISHED' },
      new_values: { status: 'CANCELLED' },
    }),
    entry(),
  ])
  await ui.ready()
  const text = textContent(ui.tree)
  assert.match(
    text,
    /PUBLISHED.*CANCELLED.*Jornada institucional.*Jornada académica/s,
  )
  assert.equal(nodes(ui.tree, (node) => node.type === 'h3').length, 2)
  ui.h.unmount()
})

for (const [name, old_values, new_values, oldCount, newCount] of [
  ['solo nuevos al crear', null, { title: 'Creado' }, 0, 1],
  ['solo anteriores', { title: 'Anterior disponible' }, null, 1, 0],
  [
    'claves disjuntas',
    { description: 'Descripción anterior' },
    { title: 'Título nuevo' },
    1,
    1,
  ],
  [
    'null explícito, false, cero y texto vacío',
    { location: null, all_day: false },
    { sort_order: 0, description: '' },
    2,
    2,
  ],
  ['objetos vacíos', {}, {}, 0, 0],
  ['sin snapshots', null, null, 0, 0],
  [
    'objetos anidados sin datos',
    { draft: {}, links: [] },
    { draft: { links: [{}] } },
    0,
    0,
  ],
]) {
  test(`valores parciales: ${name}; no reconstruye claves ni diferencias ausentes`, async () => {
    const ui = panel([entry({ old_values, new_values })])
    await ui.ready()
    const terms = nodes(ui.tree, (node) => node.type === 'dt').map(textContent)
    assert.equal(terms.filter((text) => text === 'Anterior').length, oldCount)
    assert.equal(terms.filter((text) => text === 'Nuevo').length, newCount)
    assert.match(
      textContent(ui.tree),
      /PORTAL_EVENT_UPDATED.*Responsable: Administradora de prueba.*Fecha:/s,
    )
    if (name.startsWith('null explícito'))
      assert.match(textContent(ui.tree), /Sin valor.*No.*0.*Vacío/s)
    ui.h.unmount()
  })
}

test('acción desconocida conserva el valor backend y no inventa responsable/fecha ausentes', async () => {
  const ui = panel([
    entry({
      action: 'FUTURE_PORTAL_OPERATION',
      actor_id: null,
      actor_name: null,
      created_at: null,
      old_values: null,
      new_values: null,
    }),
  ])
  await ui.ready()
  const text = textContent(ui.tree)
  assert.match(text, /FUTURE_PORTAL_OPERATION/)
  assert.doesNotMatch(text, /Responsable:|Fecha:/)
  assert.equal(nodes(ui.tree, (node) => node.type === 'dt').length, 0)
  ui.h.unmount()
})

test('responsable sin nombre utiliza únicamente el ID entregado; fecha no válida se conserva como texto', async () => {
  const ui = panel([entry({ actor_name: null, created_at: 'fecha recibida' })])
  await ui.ready()
  assert.match(
    textContent(ui.tree),
    /Responsable: ID 10.*Fecha: fecha recibida/s,
  )
  ui.h.unmount()
})

test('snapshots anidados y enlaces se presentan como texto escapado, sin JSON crudo ni destinos activos', async () => {
  const markup = '<img src=x onerror=alert(1)>'
  const url = 'javascript:alert(1)'
  const ui = panel([
    entry({
      old_values: null,
      new_values: {
        draft: { title: markup, links: [{ label: 'Enlace antiguo', url }] },
      },
    }),
  ])
  await ui.ready()
  const text = textContent(ui.tree)
  assert.ok(text.includes(markup))
  assert.ok(text.includes(url))
  assert.match(
    text,
    /Borrador.*Título.*Enlaces.*Etiqueta.*Enlace antiguo.*URL/s,
  )
  assert.doesNotMatch(text, /\{"title"/)
  assert.equal(
    nodes(
      ui.tree,
      (node) =>
        ['a', 'img', 'pre'].includes(node.type) ||
        node.props?.dangerouslySetInnerHTML,
    ).length,
    0,
  )
  ui.h.unmount()
})

test('paginación Laravel: usa data/links/meta, solicita una página y cancela la petición anterior', async () => {
  const ui = panel([], 'news', {
    get: (_url, { params }) => ({
      data: historyPage(
        [entry({ id: params.page, action: `PAGE_${params.page}` })],
        params.page,
        3,
        31,
      ),
    }),
  })
  await ui.ready()
  assert.equal(ui.button('Anterior').props.disabled, true)
  assert.match(textContent(ui.tree), /31 registros · Página 1 de 3/)
  const firstSignal = ui.calls[0].args[1].signal
  await ui.click('Siguiente')
  assert.equal(firstSignal.aborted, true)
  assert.equal(ui.calls.length, 2)
  assert.deepEqual(ui.calls[1].args[1].params, { page: 2, per_page: 15 })
  assert.match(textContent(ui.tree), /PAGE_2.*Página 2 de 3/s)
  assert.doesNotMatch(textContent(ui.tree), /PAGE_1/)
  await ui.click('Siguiente')
  assert.equal(ui.button('Siguiente').props.disabled, true)
  await ui.click('Anterior')
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  ui.h.unmount()
  assert.equal(ui.calls.at(-1).args[1].signal.aborted, true)
})

test('links sin siguiente deshabilita avanzar aunque el total del servidor haya cambiado', async () => {
  const ui = panel([], 'events', {
    get: () => ({
      data: {
        ...historyPage([entry()], 1, 3, 31),
        links: { first: '?page=1', last: '?page=3', prev: null, next: null },
      },
    }),
  })
  await ui.ready()
  assert.equal(ui.button('Siguiente').props.disabled, true)
  assert.equal(ui.calls.length, 1)
  ui.h.unmount()
})

test('historial vacío muestra el mensaje exacto, sin fabricar registros', async () => {
  const ui = panel([])
  await ui.ready()
  assert.match(
    textContent(ui.tree),
    /No hay cambios registrados para este contenido\./,
  )
  assert.equal(nodes(ui.tree, (node) => node.type === 'h3').length, 0)
  assert.equal(ui.button('Siguiente').props.disabled, true)
  ui.h.unmount()
})

for (const status of [403, 404, 500]) {
  test(`error ${status} controlado permite reintentar sin cerrar el detalle`, async () => {
    let fail = true
    const ui = panel([], 'services', {
      get: () => {
        if (fail) throw httpError(status)
        return { data: historyPage([entry()]) }
      },
    })
    await ui.ready()
    assert.equal(
      nodes(ui.tree, (node) => node.props?.role === 'alert').length,
      1,
    )
    fail = false
    await ui.click('Reintentar')
    assert.equal(ui.calls.length, 2)
    assert.equal(ui.calls[1].args[1].params.page, 1)
    assert.match(textContent(ui.tree), /Jornada académica/)
    ui.h.unmount()
  })
}

test('respuesta tardía tras cambiar de recurso no reemplaza su historial', async () => {
  let resolveOld
  const ui = panel([], 'events', {
    get: (url) =>
      url.includes('/events/')
        ? new Promise((done) => {
            resolveOld = done
          })
        : { data: historyPage([entry({ action: 'NOTICIA_ACTUAL' })]) },
  })
  ui.props.resource = 'news'
  ui.render()
  await ui.ready()
  resolveOld({ data: historyPage([entry({ action: 'EVENTO_OBSOLETO' })]) })
  await ui.ready()
  assert.match(textContent(ui.tree), /NOTICIA_ACTUAL/)
  assert.doesNotMatch(textContent(ui.tree), /EVENTO_OBSOLETO/)
  ui.h.unmount()
})

test('Ver historial carga bajo demanda y utiliza un panel accesible dentro del detalle', async () => {
  const ui = component(
    client(),
    'features/portal-shared/components/PortalHistory.tsx',
    'PortalHistory',
    { resource: 'events', id: 47 },
  )
  assert.equal(ui.calls.length, 0)
  assert.equal(ui.button('Ver historial').props['aria-expanded'], false)
  await ui.click('Ver historial')
  const button = ui.button('Ocultar historial')
  assert.equal(button.props['aria-expanded'], true)
  assert.ok(
    nodes(ui.tree, (node) => node.props?.id === button.props['aria-controls'])
      .length,
  )
  assert.equal(
    nodes(ui.tree, (node) => node.type?.name === 'PortalHistoryPanel').length,
    1,
  )
  await ui.click('Ocultar historial')
  assert.equal(
    nodes(ui.tree, (node) => node.type?.name === 'PortalHistoryPanel').length,
    0,
  )
  ui.h.unmount()
})

const adminPages = [
  [
    'events',
    'features/portal-calendar/pages/AdminCalendarPage.tsx',
    'AdminCalendarPage',
  ],
  ['news', 'features/portal-news/pages/AdminNewsPage.tsx', 'AdminNewsPage'],
  [
    'information/sections',
    'features/portal-information/pages/AdminInformationPage.tsx',
    'AdminInformationPage',
  ],
  [
    'information/faqs',
    'features/portal-information/pages/AdminInformationPage.tsx',
    'AdminInformationPage',
  ],
  [
    'services',
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  ],
]
for (const [resource, path, name] of adminPages) {
  test(`integración administrativa ${resource}: Gestionar → Ver historial; un fallo mantiene el editor y permite reintentar`, async () => {
    let fail = true
    const c = client(
      {
        get: (url) => {
          if (url.endsWith('/history')) {
            if (fail) throw httpError(500)
            return { data: historyPage([entry()]) }
          }
          if (url.endsWith('-options'))
            return {
              data: {
                data: { icon_keys: ['link'], internal_destinations: [] },
              },
            }
          if (url.endsWith('-categories'))
            return { data: { data: [{ id: 1, name: 'Categoría' }] } }
          if (url.endsWith('/47'))
            return { data: { data: { id: 47, revision: 1 } } }
          return { data: historyPage([]) }
        },
      },
      { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
    )
    const Page = c.h.load(path)[name]
    const expanded = [
      'AdminEventDialog',
      'NewsDialog',
      'InformationDialog',
      'ServiceDialog',
      'PortalHistory',
      'PortalHistoryPanel',
      'PortalFeedback',
    ]
    function expand(node) {
      if (Array.isArray(node)) return node.map(expand)
      if (!node || typeof node !== 'object' || !node.props) return node
      if (expanded.includes(node.type?.name))
        return expand(node.type(node.props))
      return {
        ...node,
        props: { ...node.props, children: expand(node.props.children) },
      }
    }
    let tree
    const render = () => {
      tree = c.h.render(() => expand(Page()))
    }
    const button = (text) =>
      nodes(
        tree,
        (node) => node.type === 'button' && textContent(node) === text,
      )[0]
    render()
    await settle()
    render()
    if (resource === 'information/faqs') {
      const filters = nodes(tree, (node) => node.props?.filters)[0].props
        .filters
      nodes(
        filters,
        (node) => node.type === 'select' && node.props.value === 'sections',
      )[0].props.onChange({ target: { value: 'faqs' } })
      render()
      assert.equal(
        nodes(
          nodes(tree, (node) => node.props?.filters)[0].props.filters,
          (node) => node.type === 'select' && node.props.value === 'faqs',
        ).length,
        1,
      )
    }
    const collection = nodes(
      tree,
      (node) => node.props?.onSelect || node.props?.onViewProfile,
    )[0]
    if (collection.props.onSelect) collection.props.onSelect(47)
    else collection.props.onViewProfile({ id: 47 })
    render()
    await settle()
    render()
    const historyLabel =
      resource === 'services' ? 'Historial' : 'Ver historial'
    assert.ok(button(historyLabel))
    assert.equal(
      c.calls.filter((call) => call.args[0].endsWith('/history')).length,
      0,
    )
    button(historyLabel).props.onClick()
    render()
    await settle()
    render()
    assert.ok(button('Reintentar'))
    const editor = nodes(tree, (node) =>
      [
        'EventForm',
        'NewsEditor',
        'InformationEditor',
        'ServiceEditor',
      ].includes(node.type?.name),
    )[0]
    assert.ok(editor)
    fail = false
    button('Reintentar').props.onClick()
    render()
    await settle()
    render()
    assert.match(textContent(tree), /Jornada académica/)
    assert.ok(nodes(tree, (node) => node.type === editor.type).length)
    const historyCalls = c.calls.filter((call) =>
      call.args[0].endsWith('/history'),
    )
    assert.equal(historyCalls.length, 2)
    assert.ok(
      historyCalls.every(
        (call) => call.args[0] === `/admin/portal/${resource}/47/history`,
      ),
    )
    c.h.unmount()
  })
}

test('páginas públicas y Home no pueden alcanzar el API/componente de historial mediante sus imports', () => {
  const visited = new Set()
  function visit(file) {
    if (visited.has(file)) return
    visited.add(file)
    const source = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      source,
      /PortalHistory|getPortalHistory|\/history/,
      file,
    )
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    for (const node of ast.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
        continue
      const specifier = node.moduleSpecifier?.text
      if (
        !specifier ||
        (!specifier.startsWith('.') && !specifier.startsWith('@/'))
      )
        continue
      const base = specifier.startsWith('@/')
        ? resolve(sourceRoot, specifier.slice(2))
        : resolve(dirname(file), specifier)
      const dependency = ['.ts', '.tsx', '/index.ts', '/index.tsx']
        .map((ext) => base + ext)
        .find(existsSync)
      if (dependency) visit(dependency)
    }
  }
  for (const path of [
    'home/pages/HomePage.tsx',
    'portal-calendar/pages/CalendarPage.tsx',
    'portal-news/pages/NewsPage.tsx',
    'portal-information/pages/InformationPage.tsx',
    'portal-services/pages/ServicesPage.tsx',
  ]) {
    visit(resolve(sourceRoot, 'features', path))
  }
})

test('las cuatro rutas administrativas siguen dentro de ProtectedRoute ADMINISTRADOR', () => {
  const file = resolve(sourceRoot, 'app/router/router.tsx')
  const ast = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let adminBoundary
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const element = node.properties.find(
        (prop) => prop.name?.getText(ast) === 'element',
      )
      if (
        element &&
        /ProtectedRoute allowedRoles=\{\['ADMINISTRADOR'\]\}/.test(
          element.getText(ast),
        )
      )
        adminBoundary = node
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(adminBoundary)
  for (const path of ['events', 'news', 'information', 'services'])
    assert.ok(adminBoundary.getText(ast).includes(`path: 'portal/${path}'`))
})

for (const role of ['DOCENTE', 'ESTUDIANTE', null, 'ADMINISTRADOR']) {
  test(`protección existente: ${role ?? 'anónimo'} ${role === 'ADMINISTRADOR' ? 'accede' : 'no accede'} al área administrativa`, () => {
    const c = client(
      {},
      {
        'react-router': {
          Navigate: 'redirect',
          Outlet: 'outlet',
          useLocation: () => ({ key: 'test' }),
        },
        '@/features/auth/hooks/useAuth': {
          useAuth: () => ({
            isAuthenticated: role !== null,
            sessionError: null,
            user: role ? { roles: [role], must_change_password: false } : null,
          }),
        },
        '@/features/auth/hooks/useSessionRouteVerification': {
          useSessionRouteVerification: () => false,
        },
      },
    )
    const { ProtectedRoute } = c.h.load(
      'features/auth/components/ProtectedRoute.tsx',
    )
    const tree = c.h.render(() =>
      ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] }),
    )
    assert.equal(tree.type, role === 'ADMINISTRADOR' ? 'outlet' : 'redirect')
    assert.equal(c.calls.length, 0)
    c.h.unmount()
  })
}
