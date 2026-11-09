// HU41 D1.1 — news categories (backend 9172f18, docs/PORTAL_CATEGORIES_API.md).
// Every HTTP call is simulated through portalHarness; nothing reaches a backend.
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

const active = [
  { id: 7, name: 'Investigación' },
  { id: 3, name: 'Tecnología' },
]
const options = (data = active, extra = {}) => ({
  data,
  loading: false,
  error: null,
  reload() {},
  ...extra,
})
const stored = {
  id: 42,
  title: 'Noticia guardada',
  summary: 'Resumen',
  content: 'Contenido',
  image_url: null,
  published_at: null,
  status: 'DRAFT',
  revision: 5,
  created_by: 1,
  updated_by: 1,
  published_by: null,
  category: { id: 3, name: 'Tecnología' },
}

function editor(handlers = {}, initial = stored, categories = options()) {
  const saved = []
  const states = []
  const ui = component(
    client(handlers),
    'features/portal-news/NewsEditor.tsx',
    'NewsEditor',
    {
      initial,
      categories,
      onSaved: (value) => saved.push(value),
      onBusy() {},
      onStateChange: (value) => states.push(value),
    },
  )
  return Object.assign(ui, { saved, states })
}
const optionsOf = (ui) =>
  nodes(ui.field('category_id'), (node) => node.type === 'option').map(
    (node) => ({
      value: String(node.props.value),
      label: textContent(node).trim(),
      disabled: !!node.props.disabled,
    }),
  )
const fillText = (ui) => {
  ui.edit('title', 'Nueva noticia')
  ui.edit('summary', 'Resumen nuevo')
  ui.edit('content', 'Contenido nuevo')
}

test('D1.1 admin selector consumes the active catalog endpoint and rejects malformed data', async () => {
  const c = client({ get: () => ({ data: { data: active } }) })
  const api = c.h.load('features/portal-news/newsApi.ts')
  assert.deepEqual(await api.getNewsCategories(true), active)
  assert.equal(c.calls[0].args[0], '/admin/portal/news-categories')
  assert.deepEqual(await api.getNewsCategories(false), active)
  assert.equal(c.calls[1].args[0], '/portal/news-categories')
  for (const body of [null, { data: null }, { data: [{ id: '7', name: 'X' }] }]) {
    const bad = client({ get: () => ({ data: body }) })
    await assert.rejects(
      bad.h.load('features/portal-news/newsApi.ts').getNewsCategories(true),
    )
  }
})

test('D1.1 create selector lists only the provided active categories with dynamic IDs', () => {
  const ui = editor({}, null)
  assert.deepEqual(optionsOf(ui), [
    { value: '', label: 'Selecciona una categoría', disabled: true },
    { value: '7', label: 'Investigación', disabled: false },
    { value: '3', label: 'Tecnología', disabled: false },
  ])
  assert.equal(ui.field('category_id').props.value, '')
  assert.equal(ui.field('category_id').props.required, true)
  ui.h.unmount()
})

test('D1.1 create is blocked while categories are empty, loading or failed', async () => {
  for (const [categories, text] of [
    [options([]), /No hay categorías activas\. Activa o crea/],
    [options(null, { loading: true }), /Cargando categorías/],
    [
      options(null, { error: { message: 'Fallo de categorías' } }),
      /Fallo de categorías/,
    ],
  ]) {
    const ui = editor({}, null, categories)
    await ui.ready()
    fillText(ui)
    assert.match(textContent(ui.tree), text)
    assert.equal(ui.states.at(-1).disabled, true)
    assert.equal(ui.button('Crear borrador').props.disabled, true)
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    ui.h.unmount()
  }
})

test('D1.1 category error offers a retry that reloads the catalog', () => {
  let reloads = 0
  const ui = editor(
    {},
    null,
    options(null, { error: { message: 'Error' }, reload: () => reloads++ }),
  )
  ui.button('Reintentar').props.onClick()
  assert.equal(reloads, 1)
  ui.h.unmount()
})

test('D1.1 create requires a category and sends the selected dynamic ID', async () => {
  const ui = editor(
    { post: () => ({ data: { data: { ...stored, category: active[0] } } }) },
    null,
  )
  fillText(ui)
  await ui.submit()
  assert.equal(ui.calls.length, 0, 'no request without category')
  assert.match(textContent(ui.tree), /Selecciona una categoría activa\./)
  assert.equal(ui.field('category_id').props['aria-invalid'], true)
  ui.edit('category_id', '7')
  assert.doesNotMatch(textContent(ui.tree), /Selecciona una categoría activa\./)
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/news',
    {
      title: 'Nueva noticia',
      summary: 'Resumen nuevo',
      content: 'Contenido nuevo',
      category_id: 7,
    },
  ])
  assert.equal(ui.saved.length, 1)
  ui.h.unmount()
})

test('D1.1 backend 422 on category_id is shown on the field and keeps the draft', async () => {
  const ui = editor(
    {
      post: () => {
        throw httpError(422, {
          message: 'La categoría seleccionada no está activa.',
          errors: { category_id: ['La categoría seleccionada no está activa.'] },
        })
      },
    },
    null,
  )
  fillText(ui)
  ui.edit('category_id', '3')
  await ui.submit()
  assert.match(textContent(ui.tree), /La categoría seleccionada no está activa\./)
  assert.equal(ui.field('category_id').props['aria-invalid'], true)
  assert.equal(ui.field('category_id').props.value, '3')
  assert.equal(ui.field('title').props.value, 'Nueva noticia')
  assert.equal(ui.saved.length, 0)
  ui.h.unmount()
})

test('D1.1 legacy news with category null shows "Sin categoría" and never sends null', async () => {
  const legacy = { ...stored, category: null }
  const ui = editor(
    { patch: () => ({ data: { data: { ...legacy, revision: 6 } } }) },
    legacy,
  )
  assert.match(textContent(ui.tree), /CategoríaSin categoría/)
  assert.equal(ui.field('category_id').props.value, '')
  assert.deepEqual(optionsOf(ui)[0], {
    value: '',
    label: 'Sin categoría',
    disabled: true,
  })
  assert.equal(ui.states.at(-1).disabled, false, 'editing is not blocked')
  // D2 regression: a required <select> on "" blocks the native submit.
  assert.equal(ui.field('category_id').props.required, false)
  ui.edit('title', 'Título corregido')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/news/42',
    {
      title: 'Título corregido',
      summary: 'Resumen',
      content: 'Contenido',
      revision: 5,
    },
  ])
  assert.equal('category_id' in ui.calls[0].args[1], false)
  ui.h.unmount()
})

test('D1.1 legacy news can be assigned an active category', async () => {
  const legacy = { ...stored, category: null }
  const ui = editor(
    {
      patch: () => ({
        data: { data: { ...legacy, category: active[0], revision: 6 } },
      }),
    },
    legacy,
  )
  ui.edit('category_id', '7')
  await ui.submit()
  assert.equal(ui.calls[0].args[1].category_id, 7)
  assert.equal(ui.calls[0].args[1].revision, 5)
  assert.equal(ui.field('category_id').props.value, '7')
  ui.h.unmount()
})

test('D1.1 an inactive current category is kept as a non-selectable historical value', async () => {
  const retired = { ...stored, category: { id: 99, name: 'Antigua' } }
  const ui = editor(
    { patch: () => ({ data: { data: { ...retired, revision: 6 } } }) },
    retired,
  )
  assert.equal(ui.field('category_id').props.value, '99')
  assert.deepEqual(optionsOf(ui), [
    { value: '99', label: 'Antigua (categoría actual)', disabled: true },
    { value: '7', label: 'Investigación', disabled: false },
    { value: '3', label: 'Tecnología', disabled: false },
  ])
  assert.match(textContent(ui.tree), /Antigua \(no disponible para nuevas asignaciones\)/)
  ui.edit('summary', 'Resumen nuevo')
  await ui.submit()
  assert.equal('category_id' in ui.calls[0].args[1], false)
  assert.equal(ui.calls[0].args[1].summary, 'Resumen nuevo')
  ui.h.unmount()
})

test('D1.1 unchanged category is omitted from PATCH; another active one is sent', async () => {
  const ui = editor({
    patch: (_url, body) => ({
      data: {
        data: {
          ...stored,
          revision: 6,
          ...(body.category_id ? { category: active[0] } : {}),
        },
      },
    }),
  })
  ui.edit('title', 'Sin cambio de categoría')
  await ui.submit()
  assert.equal('category_id' in ui.calls[0].args[1], false)
  ui.edit('category_id', '7')
  assert.equal(ui.states.at(-1).disabled, false)
  await ui.submit()
  assert.equal(ui.calls[1].args[1].category_id, 7)
  assert.equal(ui.calls[1].args[1].revision, 6, 'uses the updated revision')
  ui.h.unmount()
})

test('D1.1 category change counts as unsaved and reload restores the server category', async () => {
  const dirty = []
  const c = client({
    patch: () => {
      throw httpError(409, { code: 'REVISION_CONFLICT', current_revision: 9 })
    },
    get: () => ({ data: { data: { ...stored, revision: 9 } } }),
  })
  const ui = component(c, 'features/portal-news/NewsEditor.tsx', 'NewsEditor', {
    initial: stored,
    categories: options(),
    onSaved() {},
    onBusy() {},
    onDirty: (value) => dirty.push(value),
  })
  await ui.ready()
  ui.edit('category_id', '7')
  assert.equal(dirty.at(-1), true)
  await ui.submit()
  assert.equal(ui.field('category_id').props.value, '7', '409 keeps the choice')
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('category_id').props.value, '3')
  assert.match(textContent(ui.tree), /Revisión: 9/)
  ui.h.unmount()
})

test('D1.1 admin list shows category or "Sin categoría" and filters by category_id via backend', async () => {
  const ui = component(
    client(
      {
        get: (url) =>
          url === '/admin/portal/news-categories'
            ? { data: { data: active } }
            : { data: page([]) },
      },
      { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
    ),
    'features/portal-news/AdminNewsPage.tsx',
    'AdminNewsPage',
  )
  await ui.ready()
  const collection = () =>
    nodes(ui.tree, (node) => node.props?.load && node.props?.onSelect)[0]
  const column = collection().props.columns.find((item) => item.id === 'category')
  assert.equal(column.cell({ item: stored }), 'Tecnología')
  assert.equal(column.cell({ item: { ...stored, category: null } }), 'Sin categoría')
  const filter = nodes(
    collection().props.filters,
    (node) => node.props?.name === 'news_category',
  )[0]
  assert.ok(filter, 'category filter')
  assert.deepEqual(
    nodes(filter, (node) => node.type === 'option').map((node) =>
      textContent(node).trim(),
    ),
    ['Todas las categorías', 'Investigación', 'Tecnología'],
  )
  const key = collection().key
  filter.props.onChange({ target: { value: '7' } })
  ui.render()
  assert.equal(collection().key, key, 'collection is not remounted')
  assert.equal(collection().props.resetPageKey, '|7')
  await collection().props.load({ page: 1, search: 'beca' }, undefined)
  assert.deepEqual(ui.calls.at(-1).args[0], '/admin/portal/news')
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    search: 'beca',
    category_id: 7,
  })
  const clear = nodes(
    collection().props.filters,
    (node) => node.type === 'button' && textContent(node).trim() === 'Limpiar filtros',
  )[0]
  clear.props.onClick()
  ui.render()
  await collection().props.load({ page: 1, search: '' }, undefined)
  assert.equal('category_id' in ui.calls.at(-1).args[1].params, false)
  ui.h.unmount()
})

const publicNews = {
  id: 42,
  title: 'Publicada',
  summary: 'Resumen',
  image_url: null,
  published_at: '2026-11-05T02:00:00Z',
  category: { id: 3, name: 'Tecnología' },
}
const publicList = (compact = false) =>
  component(
    client({
      get: (url, config) =>
        url === '/portal/news-categories'
          ? { data: { data: active } }
          : {
              data: page(
                config.params.category_id
                  ? [publicNews]
                  : [publicNews, { ...publicNews, id: 41, title: 'Histórica', category: null }],
              ),
            },
    }),
    'features/portal-news/NewsList.tsx',
    'NewsList',
    { compact },
  )

test('D1.1 public list filters by category_id before paginating and keeps legacy news', async () => {
  const ui = publicList()
  await ui.ready()
  assert.equal(
    nodes(ui.tree, (node) => node.type === 'article').length,
    2,
    'news with category null are listed',
  )
  assert.match(textContent(ui.tree), /Tecnología/)
  ui.edit('category_id', '3')
  await ui.ready()
  const last = ui.calls.at(-1)
  assert.equal(last.args[0], '/portal/news')
  assert.deepEqual(last.args[1].params, {
    page: 1,
    search: '',
    per_page: 12,
    category_id: 3,
  })
  assert.equal(nodes(ui.tree, (node) => node.type === 'article').length, 1)
  ui.edit('category_id', '')
  await ui.ready()
  assert.equal('category_id' in ui.calls.at(-1).args[1].params, false)
  ui.h.unmount()
})

test('D1.1 Home NewsList keeps its behaviour: no category request, filter or label', async () => {
  const ui = publicList(true)
  await ui.ready()
  assert.ok(ui.calls.every((call) => call.args[0] === '/portal/news'))
  assert.deepEqual(ui.calls[0].args[1].params, { page: 1, search: '', per_page: 6 })
  assert.equal(ui.field('category_id'), undefined)
  assert.doesNotMatch(textContent(ui.tree), /Tecnología/)
  ui.h.unmount()
})

test('D1.1 public responses accept category null and reject malformed categories', async () => {
  for (const [category, ok] of [
    [null, true],
    [{ id: 3, name: 'Tecnología' }, true],
    [{ id: 0, name: 'X' }, false],
    [{ id: 3 }, false],
  ]) {
    const c = client({ get: () => ({ data: page([{ ...publicNews, category }]) }) })
    const api = c.h.load('features/portal-news/newsApi.ts')
    if (ok) await api.listNews({ page: 1 })
    else await assert.rejects(api.listNews({ page: 1 }))
  }
})
