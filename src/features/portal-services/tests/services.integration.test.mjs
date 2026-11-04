import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceRoot } from '../../../shared/tests/sourceHarness.mjs'
import {
  client,
  component,
  httpError,
  page,
  nodes,
  textContent,
} from '../../portal-shared/tests/portalHarness.mjs'

const category = { id: 73, name: 'Categoría del servidor' }
const options = {
  icon_keys: ['calendar', 'nueva_clave_backend'],
  destination_types: ['INTERNAL', 'EXTERNAL'],
  internal_destinations: [
    { path: '/students/qr', label: 'Mis exámenes', requires_auth: true },
  ],
}
const service = {
  id: 42,
  name: 'Servicio del servidor',
  description: 'Descripción institucional',
  icon_key: 'calendar',
  category,
  destination_type: 'EXTERNAL',
  destination: 'https://www.umss.edu.bo/servicios/',
  requires_auth: false,
  sort_order: 0,
}
const admin = {
  ...service,
  status: 'INACTIVE',
  revision: 7,
  created_by: 1,
  updated_by: 1,
}
const auth = (authenticated = false) => ({
  '@/features/auth/hooks/useAuth': {
    useAuth: () => ({
      isAuthenticated: authenticated,
      isLoading: false,
      notify() {},
    }),
  },
})
function editor(
  handlers = {},
  initial = admin,
  catalogs = { categories: [category], options },
) {
  const c = client(handlers, auth())
  const saved = []
  const ui = component(
    c,
    'features/portal-services/ServiceEditor.tsx',
    'ServiceEditor',
    { initial, ...catalogs, onSaved: () => saved.push(true), onBusy() {} },
  )
  return {
    ...ui,
    get tree() {
      return ui.tree
    },
    saved,
  }
}

test('HU44 services and categories come solely from public API without requesting inactive status', async () => {
  const ui = component(
    client(
      {
        get: (url) => ({
          data: url.endsWith('service-categories')
            ? { data: [category] }
            : page([service], 1, 2, 16),
        }),
      },
      auth(),
    ),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/portal/service-categories')
  assert.equal(ui.calls[1].args[0], '/portal/services')
  assert.equal('status' in ui.calls[1].args[1].params, false)
  assert.ok(textContent(ui.tree).includes(service.name))
  assert.ok(!textContent(ui.tree).includes('Servicio inactivo ausente'))
  const select = nodes(ui.tree, (node) => node.type === 'select')[0]
  select.props.onChange({ target: { value: '73' } })
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.category_id, 73)
  const pager = nodes(ui.tree, (node) => node.props?.meta)[0]
  pager.props.onPage(2)
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  ui.h.unmount()
})

test('HU44 empty categories/services are normal states without local fixtures', async () => {
  const ui = component(
    client(
      {
        get: (url) => ({
          data: url.endsWith('service-categories') ? { data: [] } : page([]),
        }),
      },
      auth(),
    ),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  assert.match(textContent(ui.tree), /No hay servicios disponibles/)
  assert.match(
    textContent(ui.tree),
    /No hay categorías de servicios disponibles/,
  )
  assert.equal(nodes(ui.tree, (node) => node.props?.role === 'alert').length, 0)
  ui.h.unmount()
})

test('HU44 service detail uses the public detail endpoint', async () => {
  const ui = component(
    client(
      { get: () => ({ data: { data: service } }) },
      {
        ...auth(),
        'react-router': {
          Link: 'link',
          useParams: () => ({ serviceId: '42' }),
        },
      },
    ),
    'features/portal-services/ServicesPage.tsx',
    'ServiceDetailPage',
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/portal/services/42')
  assert.ok(textContent(ui.tree).includes(service.description))
  ui.h.unmount()
})

for (const [type, destination, expected] of [
  ['INTERNAL', '/students/qr', 'link'],
  ['EXTERNAL', 'https://www.umss.edu.bo/servicios/', 'a'],
]) {
  test(`HU44 ${type} uses backend destination verbatim with correct navigation`, () => {
    const ui = component(
      client({}, auth(true)),
      'features/portal-services/ServiceCard.tsx',
      'ServiceDestination',
      { service: { ...service, destination_type: type, destination } },
    )
    assert.equal(ui.tree.type, expected)
    assert.equal(
      ui.tree.props[type === 'INTERNAL' ? 'to' : 'href'],
      destination,
    )
    if (type === 'EXTERNAL')
      assert.equal(ui.tree.props.rel, 'noopener noreferrer')
    ui.h.unmount()
  })
}

test('HU44 requires_auth guides unauthenticated users to existing login without granting permissions', () => {
  const ui = component(
    client({}, auth(false)),
    'features/portal-services/ServiceCard.tsx',
    'ServiceDestination',
    { service: { ...service, requires_auth: true } },
  )
  assert.equal(ui.tree.props.to, '/login')
  assert.match(textContent(ui.tree), /Iniciar sesión/)
  ui.h.unmount()
  const logged = component(
    client({}, auth(true)),
    'features/portal-services/ServiceCard.tsx',
    'ServiceDestination',
    {
      service: {
        ...service,
        destination_type: 'INTERNAL',
        destination: '/students/qr',
        requires_auth: true,
      },
    },
  )
  assert.equal(logged.tree.props.to, '/students/qr')
  logged.h.unmount()
})

test('HU45 service-options is the sole source of icons and internal destinations, including new server keys', async () => {
  const c = client({ get: () => ({ data: { data: options } }) })
  const api = c.h.load('features/portal-services/servicesApi.ts')
  assert.deepEqual(await api.serviceOptions(), options)
  assert.equal(c.calls[0].args[0], '/admin/portal/service-options')
  const ui = editor()
  const keys = nodes(
    ui.field('icon_key'),
    (node) => node.type === 'option',
  ).map((node) => node.props.value)
  assert.deepEqual(keys, ['', 'calendar', 'nueva_clave_backend'])
  ui.edit('icon_key', 'nueva_clave_backend')
  assert.equal(ui.button('Guardar servicio').props.disabled, false)
  ui.h.unmount()
})

test('HU45 creating a service sends no state and backend INACTIVE requires explicit activation', async () => {
  const ui = editor(
    { post: () => ({ data: { data: { ...admin, revision: 1 } } }) },
    null,
  )
  ui.edit('name', service.name)
  ui.edit('description', service.description)
  ui.edit('category_id', '73')
  ui.edit('icon_key', 'calendar')
  ui.edit('destination_type', 'EXTERNAL')
  ui.edit('destination', service.destination)
  await ui.submit()
  const [url, body] = ui.calls[0].args
  assert.equal(url, '/admin/portal/services')
  assert.deepEqual(body, {
    name: service.name,
    description: service.description,
    category_id: 73,
    icon_key: 'calendar',
    destination_type: 'EXTERNAL',
    destination: service.destination,
    requires_auth: false,
    sort_order: 0,
  })
  assert.match(textContent(ui.tree), /Estado: Inactivo/)
  assert.ok(ui.button('Activar'))
  ui.h.unmount()
})

test('HU45 no categories disables both admin creation and an empty creation form', async () => {
  const c = client(
    {
      get: (url) => ({
        data: { data: url.endsWith('service-options') ? options : [] },
      }),
    },
    auth(true),
  )
  const ui = component(
    c,
    'features/portal-services/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  await ui.ready()
  const collection = nodes(
    ui.tree,
    (node) => node.props?.title === 'Gestión de servicios',
  )[0]
  assert.equal(collection.props.createDisabled, true)
  assert.match(
    textContent(ui.tree),
    /No hay categorías de servicios disponibles/,
  )
  ui.h.unmount()
  const form = editor({}, null, { options, categories: [] })
  assert.equal(form.button('Crear servicio inactivo').props.disabled, true)
  await form.submit()
  assert.equal(form.calls.length, 0)
  form.h.unmount()
})

test('HU45 empty internal options disable INTERNAL; manipulated paths/icons/categories never get sent', async () => {
  const ui = editor({}, null, {
    categories: [category],
    options: { ...options, internal_destinations: [] },
  })
  const internal = nodes(
    ui.field('destination_type'),
    (node) => node.type === 'option' && node.props.value === 'INTERNAL',
  )[0]
  assert.equal(internal.props.disabled, true)
  ui.edit('name', 'Prueba')
  ui.edit('description', 'Prueba')
  ui.edit('category_id', '73')
  ui.edit('icon_key', 'calendar')
  ui.edit('destination_type', 'INTERNAL')
  ui.edit('destination', '/ruta-arbitraria')
  await ui.submit()
  assert.equal(ui.calls.length, 0)
  ui.edit('destination_type', 'EXTERNAL')
  ui.edit('destination', 'https://www.umss.edu.bo/')
  ui.edit('icon_key', 'icono-inventado')
  await ui.submit()
  assert.equal(ui.calls.length, 0)
  ui.edit('icon_key', 'calendar')
  ui.edit('category_id', '999')
  await ui.submit()
  assert.equal(ui.calls.length, 0)
  ui.h.unmount()
})

test('HU45 selecting an internal option takes its path and authentication requirement from backend', () => {
  const ui = editor()
  ui.edit('destination_type', 'INTERNAL')
  ui.edit('destination', '/students/qr')
  assert.equal(ui.field('requires_auth').props.checked, true)
  assert.equal(ui.field('requires_auth').props.disabled, true)
  assert.equal(ui.field('destination').type, 'select')
  ui.h.unmount()
})

for (const current of ['ACTIVE', 'INACTIVE']) {
  test(`HU45 ${current === 'ACTIVE' ? 'deactivation' : 'activation'} confirms status and current revision`, async () => {
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const ui = editor(
      {
        patch: () => ({
          data: { data: { ...admin, status: next, revision: 8 } },
        }),
      },
      { ...admin, status: current },
    )
    await ui.click(current === 'ACTIVE' ? 'Desactivar' : 'Activar')
    assert.equal(ui.calls.length, 0)
    await ui.click('Confirmar operación')
    assert.deepEqual(ui.calls[0].args, [
      '/admin/portal/services/42/status',
      { status: next, revision: 7 },
    ])
    ui.h.unmount()
  })
}

test('HU45 retired destinations/categories do not prevent deactivation', async () => {
  const ui = editor(
    { patch: () => ({ data: { data: admin } }) },
    {
      ...admin,
      status: 'ACTIVE',
      destination_type: 'INTERNAL',
      destination: '/destino-retirado',
    },
    { options: { ...options, internal_destinations: [] }, categories: [] },
  )
  assert.equal(ui.button('Guardar servicio').props.disabled, true)
  await ui.click('Desactivar')
  await ui.click('Confirmar operación')
  assert.equal(ui.calls[0].args[1].status, 'INACTIVE')
  ui.h.unmount()
})

test('HU45 editing sends current revision without state or responsible fields', async () => {
  const ui = editor({
    patch: () => ({ data: { data: { ...admin, revision: 8 } } }),
  })
  ui.edit('name', 'Nombre nuevo')
  await ui.submit()
  assert.equal(ui.calls[0].args[0], '/admin/portal/services/42')
  assert.equal(ui.calls[0].args[1].revision, 7)
  assert.equal(ui.calls[0].args[1].name, 'Nombre nuevo')
  assert.equal('status' in ui.calls[0].args[1], false)
  ui.h.unmount()
})

test('HU45 409 preserves draft and blocks writes until explicit reload', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409, { current_revision: 88 })
    },
    get: () => ({ data: { data: { ...admin, revision: 8 } } }),
  })
  ui.edit('name', 'Borrador local')
  await ui.submit()
  assert.equal(ui.field('name').props.value, 'Borrador local')
  assert.equal(ui.button('Guardar servicio').props.disabled, true)
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('name').props.value, service.name)
  assert.match(textContent(ui.tree), /Revisión: 8/)
  ui.h.unmount()
})

test('HU45 422 keeps backend destination validation visible', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(422, {
        errors: { destination: ['La URL debe usar HTTPS.'] },
      })
    },
  })
  ui.edit('destination', 'http://example.test')
  await ui.submit()
  assert.equal(ui.field('destination').props.value, 'http://example.test')
  assert.match(textContent(ui.tree), /La URL debe usar HTTPS/)
  ui.h.unmount()
})

test('HU45 internal route inventory documents actual Dev_Erick routes and is not imported as runtime options', () => {
  const doc = readFileSync(
    resolve(sourceRoot, '../docs/HU44_HU45_RUTAS_FRONTEND.md'),
    'utf8',
  )
  for (const path of [
    '/students/qr',
    '/teacher/exams',
    '/admin/portal/events',
    '/collaborator',
  ])
    assert.ok(doc.includes(path))
  assert.match(doc, /internal_destinations.*vacío/s)
  assert.doesNotMatch(
    readFileSync(
      resolve(sourceRoot, 'features/portal-services/ServiceEditor.tsx'),
      'utf8',
    ),
    /\/students\/qr|\/teacher\/exams|\/estudiante\/examenes/,
  )
})

test('HU45 services have no physical deletion or local list of allowed icon choices', () => {
  const root = resolve(sourceRoot, 'features/portal-services')
  for (const file of readdirSync(root).filter((file) => /\.tsx?$/.test(file))) {
    assert.doesNotMatch(
      readFileSync(resolve(root, file), 'utf8'),
      /httpClient\.delete|Object\.keys\(geometry\)|dangerouslySetInnerHTML/,
    )
  }
})

test('shared admin pagination continues after a mutation refresh with backend page sizes', async () => {
  const c = client({
    get: (_url, { params }) => ({ data: page([admin], params.page, 3, 31) }),
  })
  const api = c.h.load('features/portal-services/servicesApi.ts')
  const props = {
    title: 'Servicios',
    columns: [],
    version: 0,
    onSelect() {},
    load: (query, signal) => api.listAdminServices(query, signal),
  }
  const ui = component(
    c,
    'features/portal-shared/PortalAdminCollection.tsx',
    'PortalAdminCollection',
    props,
  )
  await ui.ready()
  let table = nodes(ui.tree, (node) => node.props?.onPageChange)[0]
  table.props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.equal(c.calls.at(-1).args[1].params.page, 2)
  props.version = 1
  ui.render()
  await ui.ready()
  assert.equal(c.calls.at(-1).args[1].params.page, 1)
  table = nodes(ui.tree, (node) => node.props?.onPageChange)[0]
  table.props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.equal(c.calls.at(-1).args[1].params.page, 2)
  table = nodes(ui.tree, (node) => node.props?.onPageChange)[0]
  assert.equal(table.props.pagination.from, 16)
  assert.equal(table.props.pagination.to, 16)
  ui.h.unmount()
})
