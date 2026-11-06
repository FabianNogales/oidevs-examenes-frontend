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

const news = {
  id: 42,
  title: 'Noticia del servidor',
  summary: 'Resumen institucional',
  content: 'Texto completo\n<script>texto</script>',
  image_url: null,
  published_at: '2026-11-05T02:00:00Z',
}
const admin = {
  ...news,
  status: 'DRAFT',
  revision: 7,
  created_by: 1,
  updated_by: 1,
  published_by: null,
}
function editor(handlers = {}, initial = admin, props = {}) {
  const c = client(handlers)
  const saved = []
  const dirtyStates = []
  const stateChanges = []
  const ui = component(c, 'features/portal-news/NewsEditor.tsx', 'NewsEditor', {
    initial,
    onSaved: () => saved.push(true),
    onBusy() {},
    onDirty: (value) => dirtyStates.push(value),
    onStateChange: (value) => stateChanges.push(value),
    ...props,
  })
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

async function confirmUnpublish(ui) {
  const confirmation = nodes(
    ui.tree,
    (node) =>
      node.type === 'section' &&
      node.props['aria-labelledby'] === 'news-action-confirmation-title',
  )[0]
  const action = nodes(
    confirmation,
    (node) =>
      node.type === 'button' && textContent(node).trim() === 'Despublicar',
  )[0]
  assert.ok(action)
  action.props.onClick()
  ui.render()
  await ui.ready()
}

test('HU40 public list consumes backend news and pagination without search controls', async () => {
  const ui = component(
    client({ get: () => ({ data: page([news], 1, 2, 16) }) }),
    'features/portal-news/NewsPage.tsx',
    'NewsList',
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/portal/news')
  assert.equal(ui.calls[0].args[1].params.status, undefined)
  assert.match(textContent(ui.tree), /Noticia del servidor/)
  assert.match(textContent(ui.tree), /Más recientes primero/)
  assert.equal(nodes(ui.tree, (node) => node.type === 'form').length, 0)
  assert.equal(nodes(ui.tree, (node) => node.type === 'input').length, 0)
  assert.doesNotMatch(textContent(ui.tree), /Buscar noticias|Buscar/)
  assert.ok(
    nodes(
      ui.tree,
      (node) => node.type === 'link' && node.props.to === '/news/42',
    ).length,
  )
  const pager = nodes(ui.tree, (node) => node.props?.meta)[0]
  pager.props.onPage(2)
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  assert.equal(ui.calls.at(-1).args[1].params.search, '')
  ui.h.unmount()
})

test('HU40 Home requests six news and handles empty public news without fixtures', async () => {
  const ui = component(
    client({ get: () => ({ data: page([]) }) }),
    'features/portal-news/NewsPage.tsx',
    'NewsList',
    { compact: true },
  )
  await ui.ready()
  assert.equal(ui.calls[0].args[1].params.per_page, 6)
  assert.match(textContent(ui.tree), /No hay noticias publicadas/)
  ui.h.unmount()
})

test('HU40 detail obtains content from detail API and renders it as text', async () => {
  const c = client(
    { get: () => ({ data: { data: news } }) },
    { 'react-router': { Link: 'link', useParams: () => ({ newsId: '42' }) } },
  )
  const ui = component(c, 'features/portal-news/NewsPage.tsx', 'NewsDetailPage')
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/portal/news/42')
  assert.ok(textContent(ui.tree).includes(news.content))
  assert.equal(
    nodes(ui.tree, (node) => node.props?.dangerouslySetInnerHTML).length,
    0,
  )
  ui.h.unmount()
})

test('HU40 image_url is used verbatim; absent image renders no fabricated URL', () => {
  const ui = component(
    client(),
    'features/portal-news/NewsImage.tsx',
    'NewsImage',
    { url: 'https://backend.example/private/image?id=42', title: news.title },
  )
  assert.equal(ui.tree.props.src, ui.props.url)
  ui.props.url = null
  ui.render()
  assert.equal(ui.tree, null)
  ui.h.unmount()
})

test('HU41 administrative preview fetches authenticated blob and revokes Object URLs on replacement/unmount', async () => {
  const c = client({
    get: () => ({ data: new Blob(['imagen'], { type: 'image/png' }) }),
  })
  const ui = component(
    c,
    'features/portal-news/NewsImage.tsx',
    'AuthenticatedNewsImage',
    {
      url: 'https://backend.example/api/v1/admin/portal/news/42/image',
      title: news.title,
      revision: 7,
    },
  )
  await ui.ready()
  const first = ui.tree.props.src
  assert.match(first, /^blob:/)
  assert.equal(await (await fetch(first)).text(), 'imagen')
  assert.equal(ui.calls[0].args[0], ui.props.url)
  assert.equal(ui.calls[0].args[1].responseType, 'blob')
  ui.props.revision = 8
  ui.render()
  await ui.ready()
  await assert.rejects(fetch(first))
  const second = ui.tree.props.src
  assert.notEqual(first, second)
  ui.h.unmount()
  await assert.rejects(fetch(second))
})

test('HU41 creating news sends only text fields and retains backend DRAFT', async () => {
  const ui = editor(
    { post: () => ({ data: { data: { ...admin, revision: 1 } } }) },
    null,
  )
  ui.edit('title', 'Nuevo título')
  ui.edit('summary', 'Resumen')
  ui.edit('content', 'Texto')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/news',
    { title: 'Nuevo título', summary: 'Resumen', content: 'Texto' },
  ])
  assert.match(textContent(ui.tree), /Borrador/)
  assert.equal(ui.saved.length, 1)
  ui.h.unmount()
})

test('HU41 editing sends current revision and preserves publication warning', async () => {
  const ui = editor(
    {
      patch: () => ({
        data: { data: { ...admin, status: 'PUBLISHED', revision: 8 } },
      }),
    },
    { ...admin, status: 'PUBLISHED' },
  )
  ui.edit('summary', 'Resumen corregido')
  await ui.submit()
  assert.equal(ui.calls[0].args[0], '/admin/portal/news/42')
  assert.equal(ui.calls[0].args[1].revision, 7)
  assert.equal(ui.calls[0].args[1].summary, 'Resumen corregido')
  assert.match(textContent(ui.tree), /público inmediatamente/)
  ui.h.unmount()
})

for (const [state, action, next] of [
  ['DRAFT', 'Publicar', 'PUBLISHED'],
  ['PUBLISHED', 'Despublicar', 'DRAFT'],
  ['PUBLISHED', 'Archivar', 'ARCHIVED'],
  ['ARCHIVED', 'Publicar', 'PUBLISHED'],
]) {
  test(`HU41 ${action} ${state} uses status endpoint and revision after confirmation`, async () => {
    const updated = { ...admin, status: next, revision: 8 }
    const ui = editor(
      {
        patch: () => ({ data: { data: updated } }),
      },
      { ...admin, status: state },
    )
    await ui.click(action)
    assert.equal(ui.calls.length, 0)
    const confirmationAction =
      action === 'Despublicar' ? 'Despublicar' : 'Confirmar operación'
    if (action === 'Despublicar') {
      const text = textContent(ui.tree)
      assert.match(text, /¿Cambiar la noticia a borrador\?/)
      assert.match(text, /La noticia dejará de mostrarse públicamente\./)
      assert.equal(ui.button('Cancelar')?.type, 'button')
      assert.doesNotMatch(text, /Confirmar operación|Volver/)
    }
    if (action === 'Despublicar') await confirmUnpublish(ui)
    else await ui.click(confirmationAction)
    assert.deepEqual(ui.calls[0].args, [
      '/admin/portal/news/42/status',
      { status: next, revision: 7 },
    ])
    const updatedLabel =
      next === 'DRAFT'
        ? 'Borrador'
        : next === 'PUBLISHED'
          ? 'Publicado'
          : 'Archivado'
    assert.ok(textContent(ui.tree).includes(`Estado: ${updatedLabel}`))
    ui.h.unmount()
  })
}

test('HU41 unpublish confirmation can be canceled without changing state or calling the API', async () => {
  const ui = editor({}, { ...admin, status: 'PUBLISHED' })
  await ui.click('Despublicar')
  assert.match(
    textContent(ui.tree),
    /La noticia dejará de mostrarse públicamente\./,
  )
  await ui.click('Cancelar')
  assert.equal(ui.calls.length, 0)
  assert.match(textContent(ui.tree), /Estado: Publicado/)
  assert.equal(
    nodes(
      ui.tree,
      (node) =>
        node.type === 'section' &&
        node.props['aria-labelledby'] === 'news-action-confirmation-title',
    ).length,
    0,
  )
  ui.h.unmount()
})

test('HU41 upload and image deletion send current revision without deleting the news', async () => {
  const c = client({
    post: () => ({ data: { data: admin } }),
    delete: () => ({ data: { data: admin } }),
  })
  const api = c.h.load('features/portal-news/newsApi.ts')
  const file = new File(['png'], 'foto.png', { type: 'image/png' })
  await api.uploadNewsImage(42, file, 7)
  assert.equal(c.calls[0].args[0], '/admin/portal/news/42/image')
  assert.equal(c.calls[0].args[1].get('revision'), '7')
  assert.equal(c.calls[0].args[1].get('image').name, 'foto.png')
  await api.removeNewsImage(42, 8)
  assert.deepEqual(c.calls[1].args, [
    '/admin/portal/news/42/image',
    { data: { revision: 8 } },
  ])
})

test('HU41 image UI uses updated revision and preserves unsaved text during upload/removal', async () => {
  const imageUrl = 'https://backend.example/api/v1/admin/portal/news/42/image'
  const ui = editor({
    post: () => ({
      data: { data: { ...admin, image_url: imageUrl, revision: 8 } },
    }),
    delete: () => ({ data: { data: { ...admin, revision: 9 } } }),
  })
  ui.edit('title', 'Cambios de texto sin guardar')
  ui.field('image').props.onChange({
    target: { files: [new File(['png'], 'foto.png', { type: 'image/png' })] },
  })
  ui.render()
  await ui.click('Subir imagen')
  assert.equal(ui.calls[0].args[1].get('revision'), '7')
  assert.equal(ui.field('title').props.value, 'Cambios de texto sin guardar')
  await ui.click('Eliminar imagen')
  assert.equal(ui.calls.length, 1)
  await ui.click('Confirmar operación')
  assert.deepEqual(ui.calls[1].args, [
    '/admin/portal/news/42/image',
    { data: { revision: 8 } },
  ])
  assert.equal(ui.field('title').props.value, 'Cambios de texto sin guardar')
  ui.h.unmount()
})

test('HU41 409 keeps text and old revision until explicit reload without retry', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409, { current_revision: 99 })
    },
    get: () => ({
      data: { data: { ...admin, title: 'Servidor actual', revision: 8 } },
    }),
  })
  ui.edit('title', 'Mi borrador')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Mi borrador')
  assert.equal(ui.button('Guardar noticia').props.disabled, true)
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  await ui.click('Recargar y descartar cambios')
  assert.equal(ui.field('title').props.value, 'Servidor actual')
  assert.equal(ui.calls.length, 2)
  assert.match(textContent(ui.tree), /Revisión: 8/)
  ui.h.unmount()
})

test('HU41 422 shows field errors while preserving draft', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(422, {
        message: 'General',
        errors: {
          title: ['Título inválido.'],
          content: ['Revisa el contenido.'],
        },
      })
    },
  })
  ui.edit('title', 'Borrador')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Borrador')
  assert.ok(textContent(ui.tree).includes('Título inválido.'))
  assert.ok(textContent(ui.tree).includes('Revisa el contenido.'))
  assert.equal(ui.saved.length, 0)
  ui.h.unmount()
})

test('HU41 dirty state detects text, selected images and pending actions without false positives', async () => {
  const ui = editor({}, admin)
  await ui.ready()
  assert.equal(ui.dirtyStates.at(-1), false, 'initial snapshot is clean')
  ui.edit('title', 'Cambio local')
  assert.equal(ui.dirtyStates.at(-1), true)
  ui.edit('title', admin.title)
  assert.equal(ui.dirtyStates.at(-1), false, 'restoring the baseline is clean')
  ui.field('image').props.onChange({
    target: { files: [new File(['png'], 'foto.png', { type: 'image/png' })] },
  })
  ui.render()
  assert.equal(ui.dirtyStates.at(-1), true, 'selected image is unsaved')
  ui.field('image').props.onChange({ target: { files: [] } })
  ui.render()
  assert.equal(ui.dirtyStates.at(-1), false, 'clearing the file is clean')
  await ui.click('Publicar')
  assert.equal(ui.dirtyStates.at(-1), true, 'pending status change is unsaved')
  await ui.click('Cancelar')
  assert.equal(ui.dirtyStates.at(-1), false, 'canceling the action is clean')
  ui.h.unmount()
})

test('HU41 dirty state clears only after text or persisted image/status operations', async () => {
  const ui = editor(
    {
      patch: () => ({ data: { data: { ...admin, revision: 8 } } }),
      post: () => ({
        data: { data: { ...admin, revision: 8, image_url: 'image-url' } },
      }),
    },
    admin,
  )
  await ui.ready()
  ui.edit('summary', 'Resumen modificado')
  assert.equal(ui.dirtyStates.at(-1), true)
  await ui.submit()
  assert.equal(ui.dirtyStates.at(-1), false, 'save resets the text baseline')
  await ui.click('Publicar')
  await ui.click('Confirmar operación')
  assert.equal(ui.dirtyStates.at(-1), false, 'persisted status is not dirty')
  ui.field('image').props.onChange({
    target: { files: [new File(['png'], 'foto.png', { type: 'image/png' })] },
  })
  ui.render()
  assert.equal(ui.dirtyStates.at(-1), true)
  await ui.click('Subir imagen')
  assert.equal(ui.dirtyStates.at(-1), false, 'persisted image is not dirty')
  ui.h.unmount()
})

for (const operation of ['text', 'status']) {
  test(`HU41 saving ${operation} preserves a selected image until upload`, async () => {
    let persisted = { ...admin }
    const ui = editor({
      patch: (_url, body) => {
        persisted = { ...persisted, ...body, revision: 8 }
        return { data: { data: persisted } }
      },
      post: () => ({
        data: { data: { ...persisted, revision: 9, image_url: 'image-url' } },
      }),
    })
    const file = new File(['png'], 'pendiente.png', { type: 'image/png' })
    const inputKey = ui.field('image').key
    ui.field('image').props.onChange({ target: { files: [file] } })
    ui.render()
    if (operation === 'text') {
      ui.edit('title', 'Título guardado')
      await ui.submit()
    } else {
      await ui.click('Publicar')
      await ui.click('Confirmar operación')
    }
    assert.equal(ui.dirtyStates.at(-1), true, 'selected image is still unsaved')
    assert.equal(ui.field('image').key, inputKey, 'persisting other data must not reset the file input')
    assert.equal(ui.button('Subir imagen').props.disabled, false)
    await ui.click('Subir imagen')
    assert.equal(ui.calls.at(-1).args[1].get('image').name, file.name)
    assert.equal(ui.calls.at(-1).args[1].get('revision'), '8')
    assert.equal(ui.dirtyStates.at(-1), false)
    assert.notEqual(ui.field('image').key, inputKey, 'successful upload clears the file input')
    ui.h.unmount()
  })
}

test('HU41 footer state exposes safe labels and disables submission while an action is pending', async () => {
  const create = editor({}, null)
  await create.ready()
  assert.deepEqual(create.stateChanges.at(-1), {
    label: 'Crear borrador',
    disabled: false,
  })
  create.h.unmount()
  const ui = editor({}, admin)
  await ui.ready()
  assert.deepEqual(ui.stateChanges.at(-1), {
    label: 'Guardar noticia',
    disabled: false,
  })
  await ui.click('Publicar')
  assert.equal(ui.stateChanges.at(-1).disabled, true)
  await ui.click('Cancelar')
  assert.equal(ui.stateChanges.at(-1).disabled, false)
  ui.h.unmount()
})

test('HU41 external drawer footer keeps the form submit contract without duplicating actions', async () => {
  const ui = editor({}, admin, { formId: 'news-editor-form' })
  await ui.ready()
  assert.equal(
    nodes(ui.tree, (node) => node.type === 'form')[0].props.id,
    'news-editor-form',
  )
  assert.equal(ui.button('Guardar noticia'), undefined)
  ui.h.unmount()
})
