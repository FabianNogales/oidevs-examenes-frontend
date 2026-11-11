import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceHarness, sourceRoot } from '../../../shared/tests/sourceHarness.mjs'
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
  const dirtyStates = []
  const editorStates = []
  const ui = component(
    c,
    'features/portal-services/components/ServiceEditor.tsx',
    'ServiceEditor',
    {
      formId: 'service-form',
      initial,
      onSaved: () => saved.push(true),
      onBusy() {},
      onDirty: (value) => dirtyStates.push(value),
      onStateChange: (state) => editorStates.push(state),
    },
  )
  return {
    ...ui,
    get tree() {
      return ui.tree
    },
    saved,
    dirtyStates,
    editorStates,
    confirmation: () =>
      nodes(ui.tree, (node) => node.type?.name === 'ConfirmDialog')[0],
  }
}

test('HU44 lists only active public services and preserves the backend order', async () => {
  const second = { ...service, id: 43, name: 'Calendario', display_order: 2 }
  const ui = component(
    client(
      { get: () => ({ data: page([service, second], 1, 2, 14) }) },
      auth(),
    ),
    'features/portal-services/pages/ServicesPage.tsx',
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
    'features/portal-services/components/ServiceCard.tsx',
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
    'features/portal-services/components/ServiceCard.tsx',
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
    resolve(sourceRoot, 'features/portal-services/components/ServiceCard.tsx'),
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
    'features/portal-services/pages/ServicesPage.tsx',
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
    'features/portal-services/pages/ServicesPage.tsx',
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
    'features/portal-services/pages/ServicesPage.tsx',
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
    'features/portal-services/pages/ServicesPage.tsx',
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
  const api = c.h.load('features/portal-services/api/servicesApi.ts')
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

test('D3 admin services table renders the shared status badge for ACTIVE and INACTIVE', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  const collection = nodes(
    ui.tree,
    (node) => node.props?.title === 'Gestión de servicios',
  )[0]
  const stateColumn = collection.props.columns.find(
    (column) => column.id === 'state',
  )
  for (const [status, label] of [
    ['ACTIVE', 'Activo'],
    ['INACTIVE', 'Inactivo'],
  ]) {
    const cell = stateColumn.cell({ item: { ...admin, status } })
    assert.equal(cell.type.name, 'AdminStatusBadge')
    assert.equal(cell.props.status, status)
    assert.equal(cell.props.children, undefined, `${label} uses the shared label`)
  }
  ui.h.unmount()
})

test('D4.5 admin services filter lives in the collection filter slot and review text is not a live region', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  const collection = () =>
    nodes(ui.tree, (node) => node.props?.title === 'Gestión de servicios')[0]
  const selects = (tree) =>
    nodes(tree, (node) => node.type === 'select')
  assert.equal(collection().props.filterLayout, 'inline')
  assert.equal(collection().props.children, undefined, 'no filter rendered as children')
  const [select] = selects(collection().props.filters)
  assert.ok(select, 'Estado select is passed through filters')
  assert.match(textContent(collection().props.filters), /^Estado/)
  assert.deepEqual(
    nodes(select, (node) => node.type === 'option').map((option) => [
      option.props.value,
      textContent(option),
    ]),
    [
      ['', 'Todos'],
      ['ACTIVE', 'Activos'],
      ['INACTIVE', 'Inactivos'],
    ],
  )
  assert.equal(collection().props.resetPageKey, '')
  select.props.onChange({ target: { value: 'INACTIVE' } })
  ui.render()
  assert.equal(collection().props.resetPageKey, 'INACTIVE')
  assert.equal(selects(collection().props.filters)[0].props.value, 'INACTIVE')

  const nameColumn = collection().props.columns.find((column) => column.id === 'name')
  const review = nameColumn.cell({ item: { ...admin, needs_review: true } })
  assert.match(textContent(review), /Requiere revisión/)
  assert.equal(nodes(review, (node) => node.props?.role === 'status').length, 0)
  assert.equal(
    nodes(review, (node) => node.props?.role !== undefined).length,
    0,
    'review text has no live-region role',
  )
  const clean = nameColumn.cell({ item: admin })
  assert.doesNotMatch(textContent(clean), /Requiere revisión/)
  ui.h.unmount()
})

test('F2.1 admin services page uses the shared content width like News and Information', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  const collection = nodes(
    ui.tree,
    (node) => node.props?.title === 'Gestión de servicios',
  )[0]
  assert.ok(collection.props.className, 'a local page class is passed to the collection')
  // F2.2 visible texts.
  assert.equal(collection.props.description, 'Administra los servicios y enlaces institucionales.')
  assert.equal(collection.props.createLabel, 'Crear servicio')
  assert.equal(collection.props.searchPlaceholder, 'Buscar servicios')
  assert.equal(typeof collection.props.onCreate, 'function')
  ui.h.unmount()
  const css = readFileSync(
    resolve(sourceRoot, 'features/portal-services/pages/adminServices.module.css'),
    'utf8',
  )
  // DS2.1g: the shared content width (--content-max-width) now comes from PageContainer, and the
  // collection uses the shared PageHeader; the local class only cancels width/padding inherited from .page.
  const source = readFileSync(resolve(sourceRoot, 'features/portal-services/pages/AdminServicesPage.tsx'), 'utf8')
  assert.match(source, /<PageContainer>\s*<PortalAdminCollection\s+headerVariant="page"/)
  const rule = css.match(/\.servicesAdminPage\.servicesAdminPage\s*\{([^}]*)\}/)?.[1]
  assert.ok(rule)
  assert.match(rule, /max-width:\s*none/)
  assert.match(rule, /margin-inline:\s*0/)
  assert.match(rule, /padding:\s*0/, 'no duplicated padding')
})

test('F2.3 inline Estado filter and "Limpiar filtros" reset only the status through resetPageKey', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  const collection = () =>
    nodes(ui.tree, (node) => node.props?.title === 'Gestión de servicios')[0]
  const filters = () => collection().props.filters
  const clear = () =>
    nodes(
      filters(),
      (node) => node.type === 'button' && textContent(node) === 'Limpiar filtros',
    )[0]
  const label = nodes(filters(), (node) => node.type === 'label')[0]
  assert.match(label.props.className, /\S+\s+\S+/, 'shared field plus local inline class')
  assert.equal(clear(), undefined, 'no button while Estado is "Todos"')
  const firstCollection = collection()
  nodes(filters(), (node) => node.type === 'select')[0].props.onChange({
    target: { value: 'INACTIVE' },
  })
  ui.render()
  assert.equal(collection().props.resetPageKey, 'INACTIVE')
  assert.ok(clear(), 'button shown with an active status')
  assert.equal(clear().props.type, 'button', 'never submits the search form')
  clear().props.onClick()
  ui.render()
  assert.equal(collection().props.resetPageKey, '', 'status reset → page 1 via resetPageKey')
  assert.equal(nodes(filters(), (node) => node.type === 'select')[0].props.value, '')
  assert.equal(clear(), undefined)
  assert.equal(collection().key, firstCollection.key, 'the collection is not remounted')
  assert.equal(collection().key, null)
  ui.h.unmount()
  const css = readFileSync(
    resolve(sourceRoot, 'features/portal-services/pages/adminServices.module.css'),
    'utf8',
  )
  assert.match(css, /\.servicesAdminPage \.statusFilter\s*\{[^}]*flex-direction:\s*row/)
  assert.match(css, /\.servicesAdminPage \.statusFilter select\s*\{[^}]*min-height:\s*44px/)
  assert.match(css, /\.servicesAdminPage \.clearFilters\s*\{[^}]*min-height:\s*44px/)
})

test('D4.7 service name cell renders one container so the mobile card grid keeps it in a single column', () => {
  const ui = component(
    client({}, auth()),
    'features/portal-services/pages/AdminServicesPage.tsx',
    'AdminServicesPage',
  )
  const nameColumn = nodes(
    ui.tree,
    (node) => node.props?.title === 'Gestión de servicios',
  )[0].props.columns.find((column) => column.id === 'name')
  for (const needs_review of [true, false]) {
    const cell = nameColumn.cell({ item: { ...admin, needs_review } })
    assert.equal(cell.type, 'div', 'a single element child of the table cell')
    const children = [cell.props.children].flat().filter(Boolean)
    assert.deepEqual(
      children.map((child) => [child.type, textContent(child)]),
      [
        ['strong', service.name],
        ['p', service.description],
        ...(needs_review ? [['strong', 'Requiere revisión']] : []),
      ],
      'content and order are preserved',
    )
  }
  ui.h.unmount()
})

test('D3 service editor shows Estado with the shared badge only for existing services', () => {
  for (const status of ['ACTIVE', 'INACTIVE']) {
    const ui = editor({}, { ...admin, status })
    const badges = nodes(
      ui.tree,
      (node) => node.props?.['data-status'] === status,
    )
    assert.equal(badges.length, 1)
    assert.match(
      textContent(ui.tree),
      status === 'ACTIVE' ? /Estado: Activo/ : /Estado: Inactivo/,
    )
    ui.h.unmount()
  }
  const created = editor({}, null)
  assert.equal(
    nodes(created.tree, (node) => node.props?.['data-status']).length,
    0,
  )
  assert.match(textContent(created.tree), /El servicio se creará inactivo/)
  created.h.unmount()
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
  assert.equal(withoutIcon.editorStates.at(-1)?.disabled, false)
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
    const dialog = ui.confirmation()
    assert.equal(dialog.props.isOpen, true)
    assert.equal(
      dialog.props.title,
      current === 'ACTIVE'
        ? '¿Desactivar este servicio?'
        : '¿Activar este servicio?',
    )
    assert.match(
      dialog.props.message,
      current === 'ACTIVE'
        ? /dejará de mostrarse públicamente\./
        : /disponible en el catálogo público\./,
    )
    const isPending = current === 'ACTIVE'
    assert.equal(
      dialog.props.confirmLabel,
      isPending ? 'Confirmar desactivación' : 'Confirmar activación',
    )
    assert.equal(dialog.props.variant, isPending ? 'danger' : 'success')
    assert.equal(
      ui.editorStates.at(-1)?.pending,
      true,
      'pending action is reported upstream',
    )
    await ui.ready()
    dialog.props.onConfirm()
    ui.render()
    await ui.ready()
    assert.deepEqual(ui.calls[0].args, [
      '/admin/portal/services/42/status',
      { status: next, revision: 7 },
    ])
    assert.equal(ui.confirmation().props.isOpen, false)
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
  assert.equal(ui.editorStates.at(-1)?.disabled, true)
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
  ui.confirmation().props.onCancel()
  ui.render()
  assert.equal(ui.calls.length, 0)
  assert.ok(ui.button('Desactivar'))
  assert.equal(ui.confirmation().props.isOpen, false)
  assert.equal(ui.editorStates.at(-1)?.pending, false)
  assert.equal(ui.dirtyStates.at(-1), false, 'canceling the action is clean')
  ui.h.unmount()
})

test('HU45 dirty state tracks the draft and pending actions without false positives', async () => {
  const ui = editor()
  assert.equal(ui.dirtyStates.at(-1), false, 'initial snapshot is clean')
  ui.edit('description', 'Cambio sin guardar')
  assert.equal(ui.dirtyStates.at(-1), true, 'edited draft is unsaved')
  ui.edit('description', admin.description)
  assert.equal(ui.dirtyStates.at(-1), false, 'restoring the baseline is clean')
  ui.edit('name', 'Otro nombre')
  await ui.click('Activar')
  assert.equal(ui.dirtyStates.at(-1), true, 'pending action is unsaved')
  ui.confirmation().props.onCancel()
  ui.render()
  assert.equal(ui.field('name').props.value, 'Otro nombre')
  assert.equal(ui.dirtyStates.at(-1), true, 'draft is still unsaved')
  ui.edit('name', admin.name)
  assert.equal(ui.dirtyStates.at(-1), false)
  ui.h.unmount()
})

test('HU45 dirty state clears after saving or reloading', async () => {
  const ui = editor(
    {
      patch: () => ({ data: { data: { ...admin, icon: 'link', revision: 8 } } }),
    },
    { ...admin, icon: undefined },
  )
  assert.equal(ui.dirtyStates.at(-1), true, 'missing icon default is unsaved')
  await ui.submit()
  assert.equal(ui.dirtyStates.at(-1), false, 'persisted change is not dirty')
  const conflicted = editor({
    patch: () => {
      throw httpError(409, { code: 'REVISION_CONFLICT' })
    },
    get: () => ({ data: { data: admin } }),
  })
  conflicted.edit('url', 'https://otro.umss.edu.bo/')
  await conflicted.submit()
  assert.equal(conflicted.dirtyStates.at(-1), true)
  await conflicted.click('Recargar y descartar cambios')
  assert.equal(conflicted.dirtyStates.at(-1), false)
  ui.h.unmount()
  conflicted.h.unmount()
})

test('HU45 service Escape confirmation uses the native top layer and preserves the editor until discard', () => {
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient: {} },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
    '@/features/portal-shared/hooks/usePortalResource': {
      usePortalResource: () => ({ data: admin, loading: false, error: null }),
    },
  })
  const { AdminServicesPage } = h.load(
    'features/portal-services/pages/AdminServicesPage.tsx',
  )
  let pageTree, drawerTree
  const render = () =>
    h.render(() => {
      pageTree = AdminServicesPage()
      const dialog = nodes(
        pageTree,
        (node) => node.type?.name === 'ServiceDialog',
      )[0]
      drawerTree = dialog ? dialog.type(dialog.props) : null
      return pageTree
    })
  render()
  const drawer = () =>
    nodes(drawerTree, (node) => node.type?.name === 'PortalModal')[0]
  const editorNode = () =>
    nodes(drawerTree, (node) => node.type?.name === 'ServiceEditor')[0]
  const confirmation = () =>
    nodes(drawerTree, (node) => node.type?.name === 'ConfirmDialog')[0]
  const portal = sourceHarness()
  const { PortalDialog } = portal.load(
    'shared/components/PortalDialog/PortalDialog.tsx',
  )
  const escapeDrawer = () => {
    portal
      .render(() => PortalDialog(drawer().props))
      .props.onCancel({ preventDefault() {}, stopPropagation() {} })
    render()
  }
  const confirmHarness = sourceHarness()
  const { ConfirmDialog } = confirmHarness.load(
    'shared/components/ConfirmDialog/ConfirmDialog.tsx',
  )
  const confirmModal = new confirmHarness.Element({
    showModal() {
      this.open = true
    },
    close() {
      this.open = false
    },
  })
  const confirmationTree = () =>
    confirmHarness.render(
      () => ConfirmDialog(confirmation().props),
      (tree) => {
        if (tree?.props.ref) tree.props.ref.current = confirmModal
      },
    )

  nodes(pageTree, (node) => node.type?.name === 'PortalAdminCollection')[0]
    .props.onSelect(admin.id)
  render()
  const ui = component(
    client(),
    'features/portal-services/components/ServiceEditor.tsx',
    'ServiceEditor',
    editorNode().props,
  )
  const formId = editorNode().props.formId
  escapeDrawer()
  assert.equal(drawerTree, null, 'clean Drawer closes directly')

  nodes(pageTree, (node) => node.type?.name === 'PortalAdminCollection')[0]
    .props.onSelect(admin.id)
  render()
  ui.edit('url', 'http://ejemplo.com')
  render()
  escapeDrawer()
  assert.equal(confirmation().props.isOpen, true)
  assert.equal(drawer().props.closeBlocked, true)
  const alert = confirmationTree()
  assert.equal(alert.type, 'dialog', 'confirmation must own the native Escape cancel event')
  assert.equal(alert.props.role, 'alertdialog')
  assert.equal(confirmModal.open, true)
  assert.equal(confirmHarness.listenerCount(), 0, 'native confirmation needs no global Escape listener')
  let prevented = false
  let stopped = false
  alert.props.onCancel({
    preventDefault() {
      prevented = true
    },
    stopPropagation() {
      stopped = true
    },
  })
  assert.ok(prevented && stopped, 'cancel must neither close natively nor propagate to the Drawer')
  render()
  confirmationTree()
  assert.equal(confirmModal.open, false)
  assert.equal(confirmation().props.isOpen, false)
  assert.equal(drawer().props.closeBlocked, false)
  assert.equal(editorNode().props.formId, formId)
  assert.equal(ui.field('url').props.value, 'http://ejemplo.com')

  escapeDrawer()
  const continueButton = nodes(
    confirmationTree(),
    (node) => node.type === 'button' && textContent(node) === 'Seguir editando',
  )[0]
  continueButton.props.onClick()
  render()
  confirmationTree()
  assert.equal(confirmation().props.isOpen, false)
  assert.notEqual(drawerTree, null, 'editing continues with retained data')
  assert.equal(editorNode().props.formId, formId)
  assert.equal(ui.field('url').props.value, 'http://ejemplo.com')

  editorNode().props.onStateChange({
    label: 'Guardar servicio',
    disabled: true,
    pending: true,
  })
  render()
  assert.equal(drawer().props.closeBlocked, true, 'pending action blocks the Drawer')
  escapeDrawer()
  assert.notEqual(drawerTree, null, 'Escape over the status confirmation keeps the Drawer')
  editorNode().props.onStateChange({
    label: 'Guardar servicio',
    disabled: true,
    pending: false,
  })
  render()
  escapeDrawer()
  assert.equal(
    confirmation().props.isOpen,
    true,
    'still-dirty draft reopens the unsaved confirmation',
  )
  confirmation().props.onConfirm()
  render()
  assert.equal(drawerTree, null)

  nodes(pageTree, (node) => node.type?.name === 'PortalAdminCollection')[0]
    .props.onSelect(admin.id)
  render()
  editorNode().props.onDirty(true)
  render()
  escapeDrawer()
  const discardButton = nodes(
    confirmationTree(),
    (node) => node.type === 'button' && textContent(node) === 'Descartar cambios',
  )[0]
  discardButton.props.onClick()
  render()
  assert.equal(drawerTree, null, 'discard unmounts the Drawer and its confirmation')
  confirmHarness.unmount()
  portal.unmount()
  ui.h.unmount()
  h.unmount()
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
    'features/portal-shared/components/PortalHistory.tsx',
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
  const api = c.h.load('features/portal-services/api/servicesApi.ts')
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
    'features/portal-shared/components/PortalAdminCollection.tsx',
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

test('HU45 admin filters reset to page 1 while preserving the active search', async () => {
  const c = client({
    get: (_url, { params }) => ({ data: page([admin], params.page, 3, 31) }),
  })
  const api = c.h.load('features/portal-services/api/servicesApi.ts')
  const props = {
    title: 'Gestión de servicios',
    columns: [],
    version: 0,
    resetPageKey: '',
    onSelect() {},
    load: (query, signal) =>
      api.listAdminServices(
        { ...query, status: props.resetPageKey ?? '' },
        signal,
      ),
  }
  const ui = component(
    c,
    'features/portal-shared/components/PortalAdminCollection.tsx',
    'PortalAdminCollection',
    props,
  )
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 15,
    search: '',
    status: '',
  })

  const dataTable = nodes(ui.tree, (node) => node.props?.onSearch)[0]
  dataTable.props.onSearch('WebSISS')
  ui.render()
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 15,
    search: 'WebSISS',
    status: '',
  })

  props.resetPageKey = 'ACTIVE'
  ui.render()
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 15,
    search: 'WebSISS',
    status: 'ACTIVE',
  })

  let pager = nodes(ui.tree, (node) => node.props?.onPageChange)[0]
  pager.props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 2,
    per_page: 15,
    search: 'WebSISS',
    status: 'ACTIVE',
  })

  props.resetPageKey = 'INACTIVE'
  ui.render()
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 15,
    search: 'WebSISS',
    status: 'INACTIVE',
  })
  ui.h.unmount()

  const pageSource = readFileSync(
    resolve(sourceRoot, 'features/portal-services/pages/AdminServicesPage.tsx'),
    'utf8',
  )
  assert.match(pageSource, /resetPageKey=\{status\}/)
  assert.doesNotMatch(pageSource, /key=\{status\}/)
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
    resolve(sourceRoot, 'features/portal-services/api/servicesApi.ts'),
    'utf8',
  )
  assert.match(source, /\/portal\/services/)
  assert.match(source, /\/admin\/portal\/services/)
  assert.match(source, /\/status/)
  assert.match(source, /revision/)
})

test('HU44 public catalogue uses horizontal cards and keeps responsive keyboard access', () => {
  const styles = readFileSync(
    resolve(sourceRoot, 'features/portal-shared/components/portalShared.module.css'),
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
