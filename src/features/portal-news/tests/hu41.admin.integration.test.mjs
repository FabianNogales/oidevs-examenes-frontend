import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  client,
  component,
  httpError,
  page,
  nodes,
  textContent,
} from '../../portal-shared/tests/portalHarness.mjs'

const draft = {
  id: 42,
  title: 'Prueba administrativa',
  summary: 'Resumen de prueba',
  content: 'Contenido completo',
  image_url: null,
  published_at: null,
  status: 'DRAFT',
  revision: 1,
  created_by: 11,
  updated_by: 12,
  published_by: null,
}
function editor(handlers, initial = draft) {
  const saved = []
  const ui = component(
    client(handlers),
    'features/portal-news/NewsEditor.tsx',
    'NewsEditor',
    {
      initial,
      onSaved: (value) => saved.push(value),
      onBusy() {},
    },
  )
  return { ui, saved }
}

test('HU41 editor reports the saved backend resource so the new draft can open its history', async () => {
  const { ui, saved } = editor(
    { post: () => ({ data: { data: draft } }) },
    null,
  )
  ui.edit('title', draft.title)
  ui.edit('summary', draft.summary)
  ui.edit('content', draft.content)
  await ui.submit()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, 42)
  assert.equal(saved[0].status, 'DRAFT')
  assert.equal(ui.calls[0].args[0], '/admin/portal/news')
  assert.equal('status' in ui.calls[0].args[1], false)
  assert.equal(saved[0].image_url, null)
  ui.h.unmount()
})

test('HU41 metadata shows returned actor IDs/publication date and omits absent creation/update timestamps', () => {
  const { ui } = editor(
    {},
    {
      ...draft,
      status: 'PUBLISHED',
      published_by: 13,
      published_at: '2026-11-02T10:00:00-04:00',
    },
  )
  const text = textContent(ui.tree)
  for (const value of [
    'ID 11',
    'ID 12',
    'ID 13',
    'Fecha de publicación',
    'Estado: Publicado',
  ])
    assert.ok(text.includes(value), value)
  assert.doesNotMatch(text, /Fecha de creación|Fecha de actualización/)
  ui.h.unmount()
})

test('HU41 metadata presents optional timestamps only when the backend supplies them', () => {
  const { ui } = editor(
    {},
    {
      ...draft,
      created_at: '2026-11-01T10:00:00-04:00',
      updated_at: '2026-11-02T11:00:00-04:00',
    },
  )
  assert.match(textContent(ui.tree), /Fecha de creación/)
  assert.match(textContent(ui.tree), /Fecha de actualización/)
  assert.match(textContent(ui.tree), /Sin publicar/)
  assert.doesNotMatch(textContent(ui.tree), /Publicada por/)
  ui.h.unmount()
})

test('HU41 a rejected status mutation never changes state or notifies success', async () => {
  const { ui, saved } = editor({
    patch: () => {
      throw httpError(422, { errors: { status: ['Transición rechazada.'] } })
    },
  })
  await ui.click('Publicar')
  await ui.click('Confirmar operación')
  assert.match(textContent(ui.tree), /Estado: Borrador/)
  assert.match(textContent(ui.tree), /Transición rechazada/)
  assert.equal(saved.length, 0)
  ui.h.unmount()
})

for (const operation of ['status', 'image']) {
  test(`HU41 409 on ${operation} preserves draft and revision and blocks all writes until explicit reload`, async () => {
    const { ui, saved } = editor({
      patch: () => {
        throw httpError(409, { current_revision: 90 })
      },
      post: () => {
        throw httpError(409, { current_revision: 90 })
      },
      get: () => ({
        data: { data: { ...draft, revision: 2, title: 'Servidor actual' } },
      }),
    })
    ui.edit('title', 'Texto local conservado')
    if (operation === 'status') {
      await ui.click('Publicar')
      await ui.click('Confirmar operación')
    } else {
      ui.field('image').props.onChange({
        target: {
          files: [new File(['png'], 'prueba.png', { type: 'image/png' })],
        },
      })
      ui.render()
      await ui.click('Subir imagen')
    }
    assert.equal(ui.field('title').props.value, 'Texto local conservado')
    assert.match(textContent(ui.tree), /Revisión: 1/)
    assert.equal(ui.button('Guardar noticia').props.disabled, true)
    await ui.submit()
    assert.equal(ui.calls.length, 1)
    assert.equal(saved.length, 0)
    await ui.click('Recargar y descartar cambios')
    assert.equal(ui.field('title').props.value, 'Servidor actual')
    assert.match(textContent(ui.tree), /Revisión: 2/)
    ui.h.unmount()
  })
}

test('HU41 failed reload after 409 retains local text and the write lock', async () => {
  const { ui } = editor({
    patch: () => {
      throw httpError(409)
    },
    get: () => {
      throw httpError(500)
    },
  })
  ui.edit('content', 'Contenido local')
  await ui.submit()
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('content').props.value, 'Contenido local')
  assert.equal(ui.button('Guardar noticia').props.disabled, true)
  assert.equal(ui.calls.length, 2)
  ui.h.unmount()
})

test('HU41 double submit while creating only creates one draft', async () => {
  let resolve
  const { ui, saved } = editor(
    {
      post: () =>
        new Promise((done) => {
          resolve = done
        }),
    },
    null,
  )
  await ui.submit()
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  resolve({ data: { data: draft } })
  await ui.ready()
  assert.equal(saved.length, 1)
  ui.h.unmount()
})

test('HU41 state filter no longer remounts the collection or drops the search', () => {
  const ui = component(
    client(
      {},
      { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
    ),
    'features/portal-news/AdminNewsPage.tsx',
    'AdminNewsPage',
  )
  const collection = () =>
    nodes(ui.tree, (node) => node.props?.load && node.props?.onSelect)[0]
  const initialKey = collection().key
  nodes(ui.tree, (node) => node.type === 'select')[0].props.onChange({
    target: { value: 'ARCHIVED' },
  })
  ui.render()
  assert.equal(collection().key, initialKey)
  assert.equal(collection().props.resetPageKey, 'ARCHIVED')
  ui.h.unmount()
})

test('HU41 collection combines retained search, new state and first-page reset; default consumers retain their behavior', async () => {
  const calls = []
  const props = {
    title: 'Noticias',
    columns: [],
    version: 0,
    resetPageKey: 'DRAFT',
    onSelect() {},
    load: async (query) => {
      calls.push(query)
      return page([draft], query.page, 3, 31)
    },
  }
  const ui = component(
    client(),
    'features/portal-shared/PortalAdminCollection.tsx',
    'PortalAdminCollection',
    props,
  )
  const table = () =>
    nodes(
      ui.tree,
      (node) => node.props?.onSearch && node.props?.onPageChange,
    )[0]
  await ui.ready()
  table().props.onSearch('Texto literal %_')
  ui.render()
  await ui.ready()
  table().props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.equal(calls.at(-1).page, 2)
  props.resetPageKey = 'ARCHIVED'
  ui.render()
  await ui.ready()
  assert.deepEqual(calls.at(-1), {
    search: 'Texto literal %_',
    page: 1,
    per_page: 15,
  })
  table().props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.equal(calls.at(-1).page, 2)
  props.version++
  ui.render()
  await ui.ready()
  assert.deepEqual(calls.at(-1), {
    search: 'Texto literal %_',
    page: 1,
    per_page: 15,
  })
  ui.h.unmount()

  const unchanged = component(
    client(),
    'features/portal-shared/PortalAdminCollection.tsx',
    'PortalAdminCollection',
    { ...props, resetPageKey: undefined },
  )
  await unchanged.ready()
  nodes(
    unchanged.tree,
    (node) => node.props?.onPageChange,
  )[0].props.onPageChange(2)
  unchanged.render()
  await unchanged.ready()
  assert.equal(calls.at(-1).page, 2)
  unchanged.h.unmount()
})

for (const [role, collaborations] of [
  ['DOCENTE', true],
  ['ESTUDIANTE', true],
  ['COLABORADOR', true],
  [null, false],
  ['ADMINISTRADOR', false],
]) {
  test(`HU41 only ADMINISTRADOR receives the administrative route and navigation: ${role ?? 'visitor'}`, () => {
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
    assert.equal(
      c.h.render(() => ProtectedRoute({ allowedRoles: ['ADMINISTRADOR'] }))
        .type,
      role === 'ADMINISTRADOR' ? 'outlet' : 'redirect',
    )
    const { getHeaderNavigation } = c.h.load(
      'shared/components/Header/headerNavigation.config.ts',
    )
    const items = getHeaderNavigation(
      role === 'ADMINISTRADOR'
        ? 'admin'
        : role === 'DOCENTE'
          ? 'teacher'
          : role === 'ESTUDIANTE'
            ? 'student'
            : null,
      collaborations,
    )
    assert.equal(
      items
        .flatMap((item) => [
          item.to,
          ...(item.children ?? []).map((child) => child.to),
        ])
        .includes('/admin/portal/news'),
      role === 'ADMINISTRADOR',
    )
    c.h.unmount()
  })
}
