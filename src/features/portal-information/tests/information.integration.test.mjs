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

const old = {
  title: 'Sección aprobada',
  description: 'Versión pública anterior',
  links: [],
  sort_order: 2,
}
const section = {
  id: 144,
  key: 'about',
  revision: 7,
  is_published: true,
  has_unpublished_changes: false,
  draft: old,
  published: old,
  published_at: '2026-11-05T10:00:00-04:00',
  created_by: null,
  updated_by: 1,
}
const faq = {
  ...section,
  id: 88,
  key: undefined,
  is_published: false,
  has_unpublished_changes: true,
  draft: {
    question: 'Pregunta de prueba',
    answer: 'Respuesta guardada',
    sort_order: 0,
  },
  published: null,
}
function editor(handlers = {}, initial = section, kind = 'sections') {
  const c = client(handlers)
  const saved = []
  const ui = component(
    c,
    'features/portal-information/components/InformationEditor.tsx',
    'InformationEditor',
    { kind, initial, onSaved: () => saved.push(true), onBusy() {} },
  )
  return {
    ...ui,
    get tree() {
      return ui.tree
    },
    saved,
  }
}

test('HU42 renders public sections and FAQ without an index or synthesized content', async () => {
  const ui = component(
    client({
      get: () => ({
        data: {
          data: {
            sections: [{ ...old, id: 144, key: 'about' }],
            faqs: [{ id: 88, ...faq.draft }],
          },
        },
      }),
    }),
    'features/portal-information/pages/InformationPage.tsx',
    'InformationPage',
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/portal/information')
  assert.ok(textContent(ui.tree).includes(old.description))
  assert.equal(nodes(ui.tree, (node) => node.type === 'details').length, 1)
  assert.ok(textContent(ui.tree).includes(faq.draft.question))
  assert.equal(
    nodes(ui.tree, (node) => node.type === 'nav').length,
    0,
    'the public information page must not render a side index',
  )
  assert.deepEqual(
    nodes(ui.tree, (node) => node.type === 'a').map((node) => node.props.href),
    [],
    'section anchors are unnecessary without index navigation',
  )
  assert.deepEqual(
    nodes(ui.tree, (node) => node.type === 'h2').map((node) =>
      textContent(node),
    ),
    ['Sección aprobada', 'Preguntas frecuentes'],
  )
  assert.equal(nodes(ui.tree, (node) => node.type === 'summary').length, 1)
  assert.deepEqual(
    nodes(ui.tree, (node) => node.type === 'details').map((node) =>
      textContent(node),
    ),
    [faq.draft.question + faq.draft.answer],
  )
  assert.ok(!textContent(ui.tree).includes('Orientaciones para docentes'))
  ui.h.unmount()
})

test('HU42 unpublished sections and empty FAQ produce only compact empty states', async () => {
  const ui = component(
    client({ get: () => ({ data: { data: { sections: [], faqs: [] } } }) }),
    'features/portal-information/pages/InformationPage.tsx',
    'InformationPage',
  )
  await ui.ready()
  assert.match(
    textContent(ui.tree),
    /No hay información institucional publicada/,
  )
  assert.doesNotMatch(textContent(ui.tree), /Preguntas frecuentes/)
  assert.equal(nodes(ui.tree, (node) => node.type === 'details').length, 0)
  ui.h.unmount()
})

test('HU43 administration consults existing sections and does not offer section creation or seed fixed IDs', async () => {
  const c = client(
    { get: () => ({ data: page([section]) }) },
    { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
  )
  const ui = component(
    c,
    'features/portal-information/pages/AdminInformationPage.tsx',
    'AdminInformationPage',
  )
  const collection = nodes(
    ui.tree,
    (node) => node.props?.title === 'Gestión de información y FAQ',
  )[0]
  assert.equal(
    collection.props.description,
    'Administra las secciones institucionales y las preguntas frecuentes del portal.',
  )
  assert.ok(collection.props.className)
  assert.equal(collection.props.searchLayout, 'wide')
  assert.equal(collection.props.onCreate, undefined)
  const filters = nodes(collection.props.children, (node) =>
    String(node.props?.className).includes('informationFilters'),
  )[0]
  assert.ok(filters)
  assert.equal(nodes(filters, (node) => node.type === 'select').length, 2)
  const result = await collection.props.load(
    { page: 1, per_page: 15 },
    new AbortController().signal,
  )
  assert.equal(c.calls[0].args[0], '/admin/portal/information/sections')
  assert.equal(result.data[0].id, 144)
  assert.equal(c.calls.filter((call) => call.method === 'post').length, 0)
  ui.h.unmount()
})

test('HU43 saving a section changes only draft; public snapshot and pending changes are displayed separately', async () => {
  const changed = {
    ...section,
    revision: 8,
    has_unpublished_changes: true,
    draft: { ...old, description: 'Nuevo borrador' },
  }
  const ui = editor({ patch: () => ({ data: { data: changed } }) })
  ui.edit('description', 'Nuevo borrador')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/information/sections/144',
    { ...old, description: 'Nuevo borrador', revision: 7 },
  ])
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.field('description').props.value, 'Nuevo borrador')
  assert.ok(textContent(ui.tree).includes(old.description))
  assert.match(
    textContent(ui.tree),
    /Hay cambios guardados pendientes de publicar/,
  )
  assert.equal(ui.saved.length, 1)
  ui.h.unmount()
})

test('HU43 editor distingue versión publicada y borrador y mantiene las acciones agrupadas', () => {
  const ui = editor()
  assert.match(textContent(ui.tree), /Versión publicada/)
  assert.match(textContent(ui.tree), /Sin cambios pendientes\./)
  const save = ui.button('Guardar borrador')
  const form = nodes(ui.tree, (node) => node.type === 'form')[0]
  assert.equal(save.props.type, 'submit')
  assert.equal(save.props.form, form.props.id)
  const actions = nodes(ui.tree, (node) =>
    String(node.props?.className).includes('editorActions'),
  )[0]
  assert.ok(actions)
  assert.match(
    textContent(actions),
    /Guardar borrador.*Publicar cambios.*Despublicar/s,
  )
  assert.equal(ui.button('Guardar borrador').props.disabled, false)
  assert.equal(ui.button('Publicar cambios').props.disabled, false)
  ui.h.unmount()
})

test('HU43 save never publishes and only explicit publish updates the public version', async () => {
  let record = structuredClone(section)
  const c = client({
    patch: (_url, input) => {
      const { revision, ...draft } = input
      record = {
        ...record,
        draft,
        revision: revision + 1,
        has_unpublished_changes: true,
      }
      return { data: { data: record } }
    },
    post: () => {
      record = {
        ...record,
        revision: record.revision + 1,
        published: record.draft,
        has_unpublished_changes: false,
      }
      return { data: { data: record } }
    },
    get: () => ({
      data: {
        data: {
          sections: [{ id: record.id, key: record.key, ...record.published }],
          faqs: [],
        },
      },
    }),
  })
  const api = c.h.load('features/portal-information/api/informationApi.ts')
  const ui = component(
    c,
    'features/portal-information/components/InformationEditor.tsx',
    'InformationEditor',
    { kind: 'sections', initial: section, onSaved() {}, onBusy() {} },
  )
  ui.edit('description', 'Borrador nuevo')
  await ui.submit()
  assert.equal(
    (await api.getInformation()).sections[0].description,
    old.description,
  )
  assert.equal(c.calls.filter((call) => call.method === 'post').length, 0)
  await ui.click('Publicar cambios')
  await ui.click('Confirmar operación')
  assert.equal(
    (await api.getInformation()).sections[0].description,
    'Borrador nuevo',
  )
  assert.deepEqual(c.calls.find((call) => call.method === 'post').args, [
    '/admin/portal/information/sections/144/publish',
    { revision: 8 },
  ])
  assert.match(textContent(ui.tree), /Sin cambios pendientes\./)
  ui.h.unmount()
})

test('HU43 unpublish preserves snapshot and distinguishes visibility from has_unpublished_changes', async () => {
  const ui = editor({
    post: () => ({
      data: { data: { ...section, is_published: false, revision: 8 } },
    }),
  })
  await ui.click('Despublicar')
  await ui.click('Confirmar operación')
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/information/sections/144/unpublish',
    { revision: 7 },
  ])
  assert.match(textContent(ui.tree), /Visibilidad: Despublicado/)
  assert.match(textContent(ui.tree), /fuera del portal/)
  assert.ok(textContent(ui.tree).includes(old.description))
  assert.equal(ui.button('Despublicar'), undefined)
  assert.ok(ui.button('Publicar'))
  ui.h.unmount()
})

test('HU43 FAQ creation sends no section fields and does not publish automatically', async () => {
  const ui = editor({ post: () => ({ data: { data: faq } }) }, null, 'faqs')
  ui.edit('question', 'Pregunta de prueba')
  ui.edit('answer', 'Respuesta guardada')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/information/faqs',
    faq.draft,
  ])
  assert.equal(ui.field('title'), undefined)
  assert.equal(ui.saved.length, 1)
  assert.match(textContent(ui.tree), /Despublicado/)
  ui.h.unmount()
})

for (const published of [false, true]) {
  test(`HU43 FAQ ${published ? 'unpublish' : 'publish'} uses its own endpoint and revision`, async () => {
    const ui = editor(
      {
        post: () => ({
          data: { data: { ...faq, revision: 8, is_published: !published } },
        }),
      },
      { ...faq, is_published: published },
      'faqs',
    )
    await ui.click(published ? 'Despublicar' : 'Publicar')
    await ui.click('Confirmar operación')
    assert.deepEqual(ui.calls[0].args, [
      `/admin/portal/information/faqs/88/${published ? 'unpublish' : 'publish'}`,
      { revision: 7 },
    ])
    ui.h.unmount()
  })
}

test('HU43 editing an existing FAQ sends only its draft fields and revision', async () => {
  const current = {
    ...faq,
    draft: { ...faq.draft, answer: 'Respuesta revisada' },
    revision: 8,
  }
  const ui = editor({ patch: () => ({ data: { data: current } }) }, faq, 'faqs')
  ui.edit('answer', 'Respuesta revisada')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/information/faqs/88',
    { ...current.draft, revision: 7 },
  ])
  assert.equal(ui.field('title'), undefined)
  assert.equal(ui.field('answer').props.value, 'Respuesta revisada')
  ui.h.unmount()
})

test('HU43 empty administrative FAQ list remains empty without seed requests', async () => {
  const c = client({ get: () => ({ data: page([]) }) })
  const api = c.h.load('features/portal-information/api/informationApi.ts')
  const result = await api.listInformation('faqs', { page: 1 })
  assert.deepEqual(result.data, [])
  assert.equal(c.calls.length, 1)
  assert.equal(c.calls[0].args[0], '/admin/portal/information/faqs')
})

test('HU43 409 preserves section draft and blocks publication until explicit reload', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409, { current_revision: 99 })
    },
    get: () => ({ data: { data: { ...section, revision: 8 } } }),
  })
  ui.edit('title', 'Título local')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Título local')
  assert.equal(ui.button('Guardar borrador').props.disabled, true)
  assert.equal(ui.button('Publicar cambios').props.disabled, true)
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('title').props.value, old.title)
  assert.match(textContent(ui.tree), /Revisión: 8/)
  ui.h.unmount()
})

test('HU43 422 displays link validation and preserves the draft', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(422, {
        errors: { 'links.0.url': ['El enlace no está permitido.'] },
      })
    },
  })
  ui.edit('title', 'Texto local')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Texto local')
  assert.match(textContent(ui.tree), /El enlace no está permitido/)
  ui.h.unmount()
})
