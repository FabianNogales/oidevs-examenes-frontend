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

const service = {
  id: 42,
  name: 'WebSISS',
  description: 'Acceso al sistema de información estudiantil de la UMSS.',
  icon: 'academic',
  url: 'https://websiss.umss.edu.bo/',
  display_order: 1,
}
const admin = {
  ...service,
  status: 'INACTIVE',
  revision: 7,
  needs_review: false,
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
function editor(handlers = {}, initial = admin) {
  const c = client(handlers, auth())
  const saved = []
  const ui = component(
    c,
    'features/portal-services/ServiceEditor.tsx',
    'ServiceEditor',
    { initial, onSaved: () => saved.push(true), onBusy() {} },
  )
  return {
    ...ui,
    get tree() {
      return ui.tree
    },
    saved,
  }
}

test('HU44 lists only active public services and preserves the backend order', async () => {
  const second = { ...service, id: 43, name: 'Calendario', display_order: 2 }
  const ui = component(
    client(
      { get: () => ({ data: page([service, second], 1, 2, 14) }) },
      auth(),
    ),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.calls[0].args[0], '/portal/services')
  assert.deepEqual(ui.calls[0].args[1].params, {
    page: 1,
    per_page: 12,
  })
  const rendered = textContent(ui.tree)
  assert.ok(rendered.indexOf(service.name) < rendered.indexOf(second.name))
  assert.doesNotMatch(rendered, /categor[ií]a/i)
  assert.doesNotMatch(rendered, /Buscar servicios|Buscar/)
  assert.match(rendered, /servicios y plataformas oficiales/)
  assert.doesNotMatch(rendered, /\b(academic|calendar|book|info|link|users)\b/)
  assert.equal(nodes(ui.tree, (node) => node.props?.meta).length, 1)
  ui.h.unmount()
})

test('HU44 public access opens the exact external URL in a safe new tab', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/ServiceCard.tsx',
    'ServiceDestination',
    { service, horizontal: true },
  )
  assert.equal(ui.tree.type, 'a')
  assert.equal(ui.tree.props.href, service.url)
  assert.equal(ui.tree.props.target, '_blank')
  assert.equal(ui.tree.props.rel, 'noopener noreferrer')
  assert.equal(textContent(ui.tree).trim(), 'Abrir servicio')
  ui.h.unmount()
})

test('HU44 horizontal service card renders its icon, details, domain and detail link', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/ServiceCard.tsx',
    'ServiceCard',
    { service, horizontal: true },
  )
  assert.match(ui.tree.props.className, /serviceCardHorizontal/)
  assert.match(textContent(ui.tree), new RegExp(service.name))
  assert.match(
    textContent(ui.tree),
    /Acceso al sistema de información estudiantil/,
  )
  assert.doesNotMatch(
    textContent(ui.tree),
    /\b(academic|calendar|book|info|link|users)\b/,
  )
  assert.match(textContent(ui.tree), /websiss\.umss\.edu\.bo/)
  const detail = nodes(
    ui.tree,
    (node) =>
      node.type === 'link' && node.props?.to === `/services/${service.id}`,
  )[0]
  assert.ok(detail)
  const source = readFileSync(
    resolve(sourceRoot, 'features/portal-services/ServiceCard.tsx'),
    'utf8',
  )
  assert.match(
    source,
    /<svg[\s\S]*?aria-hidden="true"[\s\S]*?focusable="false"/,
  )
  assert.match(source, /new URL\(service\.url\)\.hostname/)
  ui.h.unmount()
})

test('HU44 single-page catalogue shows cards without pagination', async () => {
  const ui = component(
    client({ get: () => ({ data: page([service]) }) }, auth()),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  assert.match(textContent(ui.tree), /WebSISS/)
  assert.equal(nodes(ui.tree, (node) => node.props?.meta).length, 0)
  assert.doesNotMatch(
    textContent(ui.tree),
    /registros|Página|Anterior|Siguiente/,
  )
  ui.h.unmount()
})

test('HU44 empty catalogue has one clean state and no pager', async () => {
  const ui = component(
    client({ get: () => ({ data: page([]) }) }, auth()),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  const statuses = nodes(ui.tree, (node) => node.props?.role === 'status')
  assert.equal(statuses.length, 1)
  assert.equal(
    textContent(statuses[0]),
    'No hay servicios disponibles actualmente.',
  )
  assert.doesNotMatch(
    textContent(ui.tree),
    /Buscar|0 registros|Página 1 de 1|servicios y plataformas oficiales/,
  )
  assert.equal(nodes(ui.tree, (node) => node.props?.meta).length, 0)
  ui.h.unmount()
})

test('HU44 public request failures show a controlled message without server detail', async () => {
  const ui = component(
    client(
      {
        get: () => {
          throw httpError(500, { message: 'SQL internal detail' })
        },
      },
      auth(),
    ),
    'features/portal-services/ServicesPage.tsx',
    'ServicesPage',
  )
  await ui.ready()
  assert.match(
    textContent(ui.tree),
    /No fue posible cargar los servicios institucionales\. Intenta nuevamente\./,
  )
  assert.doesNotMatch(textContent(ui.tree), /SQL internal detail|stack trace/i)
  ui.h.unmount()
})

test('HU44 public detail still uses its endpoint', async () => {
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

test('HU45 admin list sends empty search and status filters to the new endpoint', async () => {
  const c = client({
    get: (_url, { params }) => ({ data: page([admin], params.page) }),
  })
  const api = c.h.load('features/portal-services/servicesApi.ts')
  await api.listAdminServices({ page: 1, per_page: 15, search: '', status: '' })
  assert.equal(c.calls[0].args[0], '/admin/portal/services')
  assert.deepEqual(c.calls[0].args[1].params, {
    page: 1,
    per_page: 15,
    search: '',
    status: '',
  })
  c.calls.length = 0
  await api.listAdminServices({
    page: 2,
    search: 'WebSISS',
    status: 'ACTIVE',
  })
  assert.deepEqual(c.calls[0].args[1].params, {
    page: 2,
    search: 'WebSISS',
    status: 'ACTIVE',
  })
})

test('HU45 creates an inactive service with a hidden link icon and final contract fields', async () => {
  const ui = editor({ post: () => ({ data: { data: admin } }) }, null)
  ui.edit('name', service.name)
  ui.edit('description', service.description)
  ui.edit('url', service.url)
  ui.edit('display_order', 1)
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/services',
    {
      name: service.name,
      description: service.description,
      icon: 'link',
      url: service.url,
      display_order: 1,
    },
  ])
  assert.match(textContent(ui.tree), /Estado: Inactivo/)
  assert.ok(ui.button('Activar'))
  ui.h.unmount()
})

test('HU45 admin editor does not show an icon selector or icon choices', () => {
  const ui = editor()
  assert.equal(nodes(ui.tree, (node) => node.props?.name === 'icon').length, 0)
  assert.doesNotMatch(
    textContent(ui.tree),
    /Académico|Calendario|Libro|Información|Enlace|Usuarios/,
  )
  ui.h.unmount()
})

test('HU45 edit sends only changed values and the current revision', async () => {
  const ui = editor({
    patch: () => ({ data: { data: { ...admin, revision: 8 } } }),
  })
  ui.edit('description', 'Descripción actualizada')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/services/42',
    { description: 'Descripción actualizada', revision: 7 },
  ])
  ui.h.unmount()
})

test('HU45 edit preserves an existing icon and defaults a missing icon to link', async () => {
  const withIcon = editor({
    patch: () => ({ data: { data: { ...admin, revision: 8 } } }),
  })
  withIcon.edit('description', 'Descripción modificada')
  await withIcon.submit()
  assert.deepEqual(withIcon.calls[0].args[1], {
    description: 'Descripción modificada',
    revision: 7,
  })
  withIcon.h.unmount()

  const withoutIcon = editor(
    {
      patch: () => ({
        data: { data: { ...admin, icon: 'link', revision: 8 } },
      }),
    },
    { ...admin, icon: undefined },
  )
  assert.equal(withoutIcon.button('Guardar servicio').props.disabled, false)
  await withoutIcon.submit()
  assert.deepEqual(withoutIcon.calls[0].args[1], {
    icon: 'link',
    revision: 7,
  })
  withoutIcon.h.unmount()
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
    assert.match(
      textContent(ui.tree),
      current === 'ACTIVE'
        ? /¿Desactivar este servicio\?.*dejará de mostrarse públicamente\./s
        : /¿Activar este servicio\?.*disponible en el catálogo público\./s,
    )
    const confirmation =
      current === 'ACTIVE' ? 'Confirmar desactivación' : 'Confirmar activación'
    await ui.click(confirmation)
    assert.deepEqual(ui.calls[0].args, [
      '/admin/portal/services/42/status',
      { status: next, revision: 7 },
    ])
    ui.h.unmount()
  })
}

test('HU45 409 preserves the draft and allows an explicit reload', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409, { code: 'REVISION_CONFLICT' })
    },
    get: () => ({ data: { data: { ...admin, revision: 8 } } }),
  })
  ui.edit('name', 'Borrador local')
  await ui.submit()
  assert.equal(ui.field('name').props.value, 'Borrador local')
  assert.match(textContent(ui.tree), /modificado por otro usuario/)
  assert.equal(ui.button('Guardar servicio').props.disabled, true)
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('name').props.value, service.name)
  ui.h.unmount()
})

test('HU45 URL validation errors remain visible and preserve the entered URL', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(422, {
        errors: { url: ['La URL debe usar HTTPS y un dominio institucional.'] },
      })
    },
  })
  ui.edit('url', 'http://example.com')
  await ui.submit()
  assert.equal(ui.field('url').props.value, 'http://example.com')
  assert.match(textContent(ui.tree), /La URL debe usar HTTPS/)
  ui.h.unmount()
})

test('HU45 legacy migrated services expose review status and readable validation issues', () => {
  const ui = editor(
    {},
    {
      ...admin,
      needs_review: true,
      validation_issues: {
        url: ['El dominio no está autorizado.'],
        icon: 'Icono no válido.',
      },
    },
  )
  assert.match(textContent(ui.tree), /servicio migrado necesita revisión/)
  assert.match(
    textContent(ui.tree),
    /URL institucional: El dominio no está autorizado/,
  )
  assert.match(textContent(ui.tree), /Icono: Icono no válido/)
  ui.h.unmount()
})

test('HU45 status changes can be cancelled without a request', async () => {
  const ui = editor({}, { ...admin, status: 'ACTIVE' })
  await ui.click('Desactivar')
  await ui.click('Cancelar')
  assert.equal(ui.calls.length, 0)
  assert.ok(ui.button('Desactivar'))
  ui.h.unmount()
})

test('HU45 history is available with humanized fields and a secondary technical detail', async () => {
  const entry = {
    id: 1,
    entity_type: 'service',
    entity_id: 42,
    action: 'PORTAL_SERVICE_UPDATED',
    actor_id: 5,
    actor_name: 'Administradora',
    created_at: '2025-01-01T10:00:00Z',
    old_values: { name: 'Servicio previo', url: 'https://old.umss.edu.bo/' },
    new_values: { name: 'WebSISS', url: service.url, revision: 8 },
  }
  const ui = component(
    client({
      get: () => ({
        data: {
          ...page([entry]),
          links: { first: null, last: null, prev: null, next: null },
        },
      }),
    }),
    'features/portal-shared/PortalHistory.tsx',
    'PortalHistoryPanel',
    { resource: 'services', id: 42 },
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/admin/portal/services/42/history')
  assert.match(textContent(ui.tree), /Servicio actualizado/)
  assert.match(textContent(ui.tree), /Administradora/)
  assert.match(textContent(ui.tree), /URL institucional/)
  assert.match(textContent(ui.tree), /Detalle técnico/)
  ui.h.unmount()
})

test('HU45 uses backend pagination values after list updates', async () => {
  const c = client({
    get: (_url, { params }) => ({ data: page([admin], params.page, 3, 31) }),
  })
  const api = c.h.load('features/portal-services/servicesApi.ts')
  const props = {
    title: 'Gestión de servicios',
    columns: [],
    version: 0,
    onSelect() {},
    load: (query, signal) =>
      api.listAdminServices({ ...query, status: '' }, signal),
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
  table = nodes(ui.tree, (node) => node.props?.onPageChange)[0]
  assert.equal(table.props.pagination.from, 16)
  assert.equal(table.props.pagination.to, 16)
  ui.h.unmount()
})

test('HU44 and HU45 contain no functional dependency on the retired service model', () => {
  const root = resolve(sourceRoot, 'features/portal-services')
  for (const file of readdirSync(root).filter((file) =>
    /\.(tsx?|mjs)$/.test(file),
  )) {
    const contents = readFileSync(resolve(root, file), 'utf8')
    assert.doesNotMatch(
      contents,
      /service-options|service-categories|category_id|destination_type|requires_auth|icon_key|sort_order|internal_destinations/,
    )
    assert.doesNotMatch(contents, /httpClient\.delete|dangerouslySetInnerHTML/)
  }
})

test('HU44 and HU45 routes continue using public and admin service endpoints', () => {
  const source = readFileSync(
    resolve(sourceRoot, 'features/portal-services/servicesApi.ts'),
    'utf8',
  )
  assert.match(source, /\/portal\/services/)
  assert.match(source, /\/admin\/portal\/services/)
  assert.match(source, /\/status/)
  assert.match(source, /revision/)
})

test('HU44 public catalogue uses horizontal cards and keeps responsive keyboard access', () => {
  const styles = readFileSync(
    resolve(sourceRoot, 'features/portal-shared/portalShared.module.css'),
    'utf8',
  )
  assert.match(
    styles,
    /\.serviceCards\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;[^}]*flex-direction:\s*column/s,
  )
  assert.match(
    styles,
    /\.serviceCardHorizontal\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*grid-template-columns:\s*52px\s+minmax\(0,\s*1fr\)\s+auto/s,
  )
  assert.match(
    styles,
    /@media \(max-width: 600px\)\s*\{[\s\S]*?\.serviceCardHorizontal\s*\{[^}]*grid-template-columns:\s*40px\s+minmax\(0,\s*1fr\)[\s\S]*?\.serviceCardHorizontal \.serviceAction\s*\{[^}]*justify-self:\s*end/,
  )
  assert.match(styles, /\.serviceAction:focus-visible\s*\{/)
  assert.match(styles, /\.servicesPage\s*\{[^}]*background:\s*#eff6fc/s)
})
