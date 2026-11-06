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
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

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
function editor(handlers = {}, initial = section, kind = 'sections', props = {}) {
  const c = client(handlers)
  const saved = []
  const dirtyStates = []
  const stateChanges = []
  const ui = component(
    c,
    'features/portal-information/InformationEditor.tsx',
    'InformationEditor',
    {
      kind,
      initial,
      onSaved: (value) => saved.push(value),
      onBusy() {},
      onDirty: (value) => dirtyStates.push(value),
      onStateChange: (value) => stateChanges.push(value),
      ...props,
    },
  )
  return {
    ...ui,
    get tree() {
      return ui.tree
    },
    saved,
    dirtyStates,
    stateChanges,
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
    'features/portal-information/InformationPage.tsx',
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
    'features/portal-information/InformationPage.tsx',
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

test('F2.2 administration labels: search text and FAQ-only "Crear pregunta frecuente"', () => {
  const c = client(
    { get: () => ({ data: page([section]) }) },
    { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
  )
  const ui = component(
    c,
    'features/portal-information/AdminInformationPage.tsx',
    'AdminInformationPage',
  )
  const collection = () =>
    nodes(
      ui.tree,
      (node) => node.props?.title === 'Gestión de información y FAQ',
    )[0]
  assert.equal(collection().props.searchPlaceholder, 'Buscar información')
  assert.equal(collection().props.onCreate, undefined, 'sections still offer no creation')
  nodes(collection().props.filters, (node) => node.type === 'select')[0].props.onChange({
    target: { value: 'faqs' },
  })
  ui.render()
  assert.equal(typeof collection().props.onCreate, 'function', 'FAQ creation kept')
  assert.equal(collection().props.createLabel, 'Crear pregunta frecuente')
  assert.equal(collection().props.searchPlaceholder, 'Buscar información')
  ui.h.unmount()
})

test('F2.3 "Limpiar filtros" resets only Visibilidad and keeps the Secciones/FAQ view', () => {
  const c = client(
    { get: () => ({ data: page([section]) }) },
    { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
  )
  const ui = component(
    c,
    'features/portal-information/AdminInformationPage.tsx',
    'AdminInformationPage',
  )
  const collection = () =>
    nodes(
      ui.tree,
      (node) => node.props?.title === 'Gestión de información y FAQ',
    )[0]
  const selects = () =>
    nodes(collection().props.filters, (node) => node.type === 'select')
  const clear = () =>
    nodes(
      collection().props.filters,
      (node) => node.type === 'button' && textContent(node) === 'Limpiar filtros',
    )[0]
  assert.equal(clear(), undefined, 'no button without an active filter')
  selects()[0].props.onChange({ target: { value: 'faqs' } })
  ui.render()
  assert.equal(clear(), undefined, 'the view selector is not a filter')
  for (const view of ['faqs', 'sections']) {
    selects()[0].props.onChange({ target: { value: view } })
    ui.render()
    selects()[1].props.onChange({ target: { value: '0' } })
    ui.render()
    assert.equal(collection().props.resetPageKey, `${view}-0`)
    assert.ok(clear(), `${view}: button shown with Visibilidad active`)
    clear().props.onClick()
    ui.render()
    assert.equal(collection().props.resetPageKey, `${view}-`, `${view}: Visibilidad reset → page 1`)
    assert.equal(selects()[0].props.value, view, `${view}: view kept`)
    assert.equal(selects()[1].props.value, '')
    assert.equal(clear(), undefined)
    assert.equal(collection().key, null, 'the collection is not remounted')
    assert.equal(
      typeof collection().props.onCreate,
      view === 'faqs' ? 'function' : 'undefined',
      'creation only for FAQ',
    )
  }
  ui.h.unmount()
})

test('HU43 administration consults existing sections and does not offer section creation or seed fixed IDs', async () => {
  const c = client(
    { get: () => ({ data: page([section]) }) },
    { '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) } },
  )
  const ui = component(
    c,
    'features/portal-information/AdminInformationPage.tsx',
    'AdminInformationPage',
  )
  const collection = () =>
    nodes(
      ui.tree,
      (node) => node.props?.title === 'Gestión de información y FAQ',
    )[0]
  assert.equal(
    collection().props.description,
    'Administra las secciones institucionales y las preguntas frecuentes del portal.',
  )
  assert.ok(collection().props.className)
  assert.equal(collection().props.searchLayout, 'wide')
  assert.equal(collection().props.filterLayout, 'below')
  assert.equal(collection().props.resetPageKey, 'sections-')
  assert.equal(collection().props.onCreate, undefined)
  const filters = () =>
    nodes(collection().props.filters, (node) => node.type === 'select')
  assert.equal(filters().length, 2)
  const visibility = collection().props.columns[1].cell({ item: section })
  const unpublished = collection().props.columns[1].cell({
    item: { ...section, is_published: false },
  })
  const pending = collection().props.columns[2].cell({
    item: { ...section, has_unpublished_changes: true },
  })
  assert.equal(visibility.type.name, 'AdminStatusBadge')
  assert.equal(visibility.props.status, 'PUBLISHED')
  assert.equal(unpublished.props.status, 'UNPUBLISHED')
  assert.equal(pending.type.name, 'AdminStatusBadge')
  assert.equal(pending.props.status, 'PENDING_CHANGES')
  const result = await collection().props.load(
    { page: 1, per_page: 15 },
    new AbortController().signal,
  )
  assert.equal(c.calls[0].args[0], '/admin/portal/information/sections')
  assert.equal(result.data[0].id, 144)
  assert.equal(c.calls.filter((call) => call.method === 'post').length, 0)
  filters()[0].props.onChange({ target: { value: 'faqs' } })
  ui.render()
  assert.equal(collection().key, null, 'filter changes must not remount the list')
  assert.equal(collection().props.resetPageKey, 'faqs-')
  assert.equal(typeof collection().props.onCreate, 'function')
  filters()[1].props.onChange({ target: { value: '0' } })
  ui.render()
  assert.equal(collection().props.resetPageKey, 'faqs-0')
  await collection().props.load(
    { page: 1, per_page: 15, search: 'becas' },
    new AbortController().signal,
  )
  assert.deepEqual(c.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 15,
    search: 'becas',
    is_published: 0,
  })
  ui.h.unmount()
})

test('HU43 information Drawer protects dirty close and native Escape preserves the editor', () => {
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient: {} },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
    '@/features/portal-shared/usePortalResource': {
      usePortalResource: () => ({ data: section, loading: false, error: null }),
    },
  })
  const { AdminInformationPage } = h.load(
    'features/portal-information/AdminInformationPage.tsx',
  )
  let pageTree, dialogTree
  const render = () =>
    h.render(() => {
      pageTree = AdminInformationPage()
      const dialog = nodes(
        pageTree,
        (node) => node.type?.name === 'InformationDialog',
      )[0]
      dialogTree = dialog ? dialog.type(dialog.props) : null
      return pageTree
    })
  const collection = () =>
    nodes(pageTree, (node) => node.type?.name === 'PortalAdminCollection')[0]
  const drawer = () =>
    nodes(dialogTree, (node) => node.type?.name === 'PortalModal')[0]
  const editorNode = () =>
    nodes(dialogTree, (node) => node.type?.name === 'InformationEditor')[0]
  const confirmation = () => {
    const node = nodes(
      dialogTree,
      (candidate) => candidate.type?.name === 'UnsavedInformationDialog',
    )[0]
    return node.type(node.props)
  }
  render()
  collection().props.onSelect(section.id)
  render()
  assert.equal(drawer().props.drawer, true)
  assert.ok(drawer().props.footer)
  const formId = editorNode().props.formId
  const cancel = () =>
    nodes(
      drawer().props.footer,
      (node) => node.type === 'button' && textContent(node) === 'Cancelar',
    )[0]
  assert.equal(cancel().props.onClick, drawer().props.onClose)
  editorNode().props.onDirty(true)
  render()
  cancel().props.onClick()
  render()
  assert.equal(drawer().props.closeBlocked, true)
  assert.equal(confirmation().props.native, true)
  const confirmHarness = sourceHarness()
  const { ConfirmDialog } = confirmHarness.load(
    'shared/components/ConfirmDialog/ConfirmDialog.tsx',
  )
  const alert = confirmHarness.render(() => ConfirmDialog(confirmation().props))
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
  render()
  assert.ok(prevented && stopped)
  assert.ok(drawer(), 'Escape closes only the confirmation')
  assert.equal(drawer().props.closeBlocked, false)
  assert.equal(editorNode().props.formId, formId)
  editorNode().props.onDirty(false)
  render()
  drawer().props.onClose()
  render()
  assert.equal(dialogTree, null, 'clean Drawer closes directly')
  collection().props.onSelect(section.id)
  render()
  editorNode().props.onDirty(true)
  render()
  drawer().props.onClose()
  render()
  confirmation().props.onConfirm()
  render()
  assert.equal(dialogTree, null, 'discard closes the Drawer and confirmation')
  confirmHarness.unmount()
  h.unmount()
})

test('HU43 created FAQ keeps its Drawer session, adopts its ID and refreshes its history', () => {
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient: {} },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
    '@/features/portal-shared/usePortalResource': {
      usePortalResource: () => ({ data: null, loading: false, error: null }),
    },
  })
  const { AdminInformationPage } = h.load(
    'features/portal-information/AdminInformationPage.tsx',
  )
  let pageTree, dialogTree
  const render = () =>
    h.render(() => {
      pageTree = AdminInformationPage()
      const current = dialogNode()
      dialogTree = current ? current.type(current.props) : null
      return pageTree
    })
  const collection = () =>
    nodes(pageTree, (node) => node.type?.name === 'PortalAdminCollection')[0]
  const dialogNode = () =>
    nodes(pageTree, (node) => node.type?.name === 'InformationDialog')[0]
  const editorNode = () =>
    nodes(dialogTree, (node) => node.type?.name === 'InformationEditor')[0]
  const history = () =>
    nodes(dialogTree, (node) => node.type?.name === 'PortalHistory')[0]
  render()
  nodes(collection().props.filters, (node) => node.type === 'select')[0]
    .props.onChange({ target: { value: 'faqs' } })
  render()
  collection().props.onCreate()
  render()
  const sessionKey = dialogNode().key
  const formId = editorNode().props.formId
  assert.equal(sessionKey, 'faqs-new')
  assert.equal(history(), undefined)
  editorNode().props.onSaved(faq)
  render()
  assert.equal(dialogNode().key, sessionKey, 'adopting the ID must not remount the Drawer')
  assert.equal(dialogNode().props.id, faq.id)
  assert.equal(editorNode().props.formId, formId)
  assert.equal(history().props.id, faq.id)
  assert.equal(history().key, `${faq.id}-1`)
  editorNode().props.onSaved({ ...faq, revision: 4 })
  render()
  assert.equal(history().key, `${faq.id}-2`, 'every mutation refreshes history')
  nodes(dialogTree, (node) => node.type?.name === 'PortalModal')[0].props.onClose()
  render()
  collection().props.onSelect(99)
  render()
  assert.equal(dialogNode().key, 'faqs-99')
  assert.notEqual(dialogNode().key, sessionKey, 'another selection gets a fresh history session')
  h.unmount()
})

test('HU43 dirty state covers fields, links and pending publication without false positives', async () => {
  const ui = editor()
  await ui.ready()
  assert.equal(ui.dirtyStates.at(-1), false)
  ui.edit('title', 'Cambio local')
  assert.equal(ui.dirtyStates.at(-1), true)
  ui.edit('title', old.title)
  assert.equal(ui.dirtyStates.at(-1), false)
  ui.edit('sort_order', 3)
  assert.equal(ui.dirtyStates.at(-1), true)
  ui.edit('sort_order', old.sort_order)
  assert.equal(ui.dirtyStates.at(-1), false)
  await ui.click('Agregar enlace')
  assert.equal(ui.dirtyStates.at(-1), true)
  await ui.click('Quitar enlace')
  assert.equal(ui.dirtyStates.at(-1), false)
  await ui.click('Publicar cambios')
  assert.equal(ui.dirtyStates.at(-1), true)
  await ui.click('Volver')
  assert.equal(ui.dirtyStates.at(-1), false)
  ui.h.unmount()
})

test('HU43 external Drawer footer owns submit state without duplicating save', async () => {
  const ui = editor({}, section, 'sections', { formId: 'information-form' })
  await ui.ready()
  assert.equal(nodes(ui.tree, (node) => node.type === 'form')[0].props.id, 'information-form')
  assert.equal(ui.button('Guardar borrador'), undefined)
  assert.deepEqual(ui.stateChanges.at(-1), {
    label: 'Guardar borrador',
    disabled: false,
  })
  await ui.click('Publicar cambios')
  assert.equal(ui.stateChanges.at(-1).disabled, true)
  await ui.click('Volver')
  assert.equal(ui.stateChanges.at(-1).disabled, false)
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
  assert.equal(ui.dirtyStates.at(-1), false, 'saved draft is the new baseline')
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
  const api = c.h.load('features/portal-information/informationApi.ts')
  const ui = component(
    c,
    'features/portal-information/InformationEditor.tsx',
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

test('F1.1 editor shows visibility with the shared badge and keeps the revision text', () => {
  for (const [is_published, status, label] of [
    [true, 'PUBLISHED', 'Publicado'],
    [false, 'UNPUBLISHED', 'Despublicado'],
  ]) {
    const ui = editor({}, { ...section, is_published })
    const badges = nodes(
      ui.tree,
      (node) => node.props?.['data-status'] === status,
    )
    assert.equal(badges.length, 1, `${status}: one visibility badge`)
    assert.equal(textContent(badges[0]), label)
    assert.equal(badges[0].props.role, undefined, 'not a live region')
    assert.match(
      textContent(ui.tree),
      new RegExp(`Visibilidad: ${label} · Revisión: ${section.revision}`),
    )
    ui.h.unmount()
  }
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
  assert.equal(ui.saved[0].id, faq.id)
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
  const api = c.h.load('features/portal-information/informationApi.ts')
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
  assert.equal(ui.dirtyStates.at(-1), true)
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
