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

const latest = {
  id: 42,
  title: 'Publicación reciente de prueba',
  summary: 'Resumen devuelto por el servidor.',
  image_url: 'https://backend.example/api/v1/portal/news/42/image?version=2',
  published_at: '2026-11-02T10:30:00-04:00',
}
const older = {
  ...latest,
  id: 41,
  title: 'Publicación anterior de prueba',
  image_url: null,
  published_at: '2026-10-30T09:00:00-04:00',
}
const setupList = (get, compact = false) =>
  component(client({ get }), 'features/portal-news/components/NewsList.tsx', 'NewsList', {
    compact,
  })
const articles = (tree) => nodes(tree, (node) => node.type === 'article')
const detail = (get) =>
  component(
    client(
      { get },
      {
        'react-router': { Link: 'link', useParams: () => ({ newsId: '42' }) },
      },
    ),
    'features/portal-news/pages/NewsPage.tsx',
    'NewsDetailPage',
  )

test('HU40 Home presents backend publications, summary/date/image and Ver todas in server date order', async () => {
  const ui = setupList(() => ({ data: page([latest, older]) }), true)
  await ui.ready()
  assert.deepEqual(ui.calls[0].args[1].params, {
    page: 1,
    search: '',
    per_page: 6,
  })
  assert.equal(ui.calls[0].args[0], '/portal/news')
  assert.deepEqual(
    articles(ui.tree).map((article) =>
      textContent(nodes(article, (n) => n.type === 'h3')[0]),
    ),
    [latest.title, older.title],
  )
  const times = nodes(ui.tree, (node) => node.type === 'time')
  assert.equal(times[0].props.dateTime, latest.published_at)
  assert.match(textContent(ui.tree), /Resumen devuelto por el servidor/)
  assert.match(textContent(ui.tree), /Más recientes primero/)
  assert.equal(
    nodes(
      ui.tree,
      (node) => node.type === 'link' && textContent(node) === 'Ver todas',
    )[0].props.to,
    '/news',
  )
  assert.deepEqual(
    nodes(ui.tree, (node) => node.props?.url).map((node) => node.props.url),
    [latest.image_url],
  )
  assert.equal(nodes(ui.tree, (node) => node.type === 'form').length, 0)
  ui.h.unmount()
})

for (const status of ['DRAFT', 'ARCHIVED']) {
  test(`HU40 Home rejects an unexpected ${status} record without exposing its title or image`, async () => {
    const ui = setupList(
      () => ({
        data: page([{ ...latest, status, title: 'Contenido reservado' }]),
      }),
      true,
    )
    await ui.ready()
    assert.doesNotMatch(textContent(ui.tree), /Contenido reservado/)
    assert.equal(articles(ui.tree).length, 0)
    assert.equal(nodes(ui.tree, (node) => node.props?.url).length, 0)
    assert.equal(
      nodes(ui.tree, (node) => node.props?.role === 'alert').length,
      1,
    )
    assert.ok(ui.button('Reintentar'))
    ui.h.unmount()
  })
  test(`HU40 detail rejects an unexpected ${status} response even when it retains a publication date`, async () => {
    const ui = detail(() => ({
      data: { data: { ...latest, status, content: 'Contenido reservado' } },
    }))
    await ui.ready()
    assert.doesNotMatch(textContent(ui.tree), /Contenido reservado/)
    assert.equal(articles(ui.tree).length, 0)
    ui.h.unmount()
  })
}

test('HU40 accepts the public resource without status and a defensive explicit PUBLISHED status', async () => {
  for (const value of [latest, { ...latest, status: 'PUBLISHED' }]) {
    const ui = setupList(() => ({ data: page([value]) }))
    await ui.ready()
    assert.equal(articles(ui.tree).length, 1)
    ui.h.unmount()
  }
})

test('HU40 public list omits search controls and keeps the backend publication order', async () => {
  const ui = setupList((_url, { params }) => ({
    data: page(params.page === 1 ? [latest] : [older], params.page, 2, 13),
  }))
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 1,
    per_page: 12,
    search: '',
  })
  assert.equal(nodes(ui.tree, (n) => n.type === 'form').length, 0)
  assert.equal(nodes(ui.tree, (n) => n.type === 'input').length, 0)
  assert.doesNotMatch(textContent(ui.tree), /Buscar noticias|Buscar/)
  assert.ok(textContent(ui.tree).includes(latest.title))
  assert.ok(textContent(ui.tree).includes('Más recientes primero'))
  await ui.click('Siguiente')
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  assert.equal(ui.calls.at(-1).args[1].params.search, '')
  assert.equal(articles(ui.tree).length, 1)
  assert.ok(textContent(ui.tree).includes(older.title))
  ui.h.unmount()
})

test('HU40 pagination preserves the server order without a search filter', async () => {
  const ui = setupList((_url, { params }) => ({
    data: page(params.page === 1 ? [latest] : [older], params.page, 2, 13),
  }))
  await ui.ready()
  await ui.click('Siguiente')
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    page: 2,
    per_page: 12,
    search: '',
  })
  assert.equal(articles(ui.tree).length, 1)
  assert.ok(textContent(ui.tree).includes(older.title))
  assert.equal(ui.button('Siguiente').props.disabled, true)
  await ui.click('Anterior')
  assert.equal(ui.calls.at(-1).args[1].params.page, 1)
  assert.ok(textContent(ui.tree).includes(latest.title))
  ui.h.unmount()
})

for (const compact of [false, true]) {
  test(`HU40 empty ${compact ? 'Home' : 'list'} stays informative without fabricated cards`, async () => {
    const ui = setupList(() => ({ data: page([]) }), compact)
    await ui.ready()
    assert.match(
      textContent(ui.tree),
      /No hay noticias publicadas para esta consulta/,
    )
    assert.equal(articles(ui.tree).length, 0)
    assert.equal(nodes(ui.tree, (n) => n.props?.role === 'alert').length, 0)
    ui.h.unmount()
  })
}

test('HU40 public list error retries without navigating to administrative routes', async () => {
  let fail = true
  const ui = setupList(() => {
    if (fail) throw httpError(500)
    return { data: page([latest]) }
  })
  await ui.ready()
  assert.equal(articles(ui.tree).length, 0)
  assert.ok(ui.button('Reintentar'))
  fail = false
  await ui.click('Reintentar')
  assert.equal(articles(ui.tree).length, 1)
  assert.ok(ui.calls.every((call) => call.args[0] === '/portal/news'))
  ui.h.unmount()
})

test('HU40 404 for a non-public detail exposes no content and preserves back/retry actions', async () => {
  const ui = detail(() => {
    throw httpError(404)
  })
  await ui.ready()
  assert.match(textContent(ui.tree), /no existe o ya no está disponible/)
  assert.equal(articles(ui.tree).length, 0)
  assert.ok(
    nodes(ui.tree, (n) => n.type === 'link' && n.props.to === '/news').length,
  )
  await ui.click('Reintentar')
  assert.equal(ui.calls.length, 2)
  assert.ok(ui.calls.every((call) => call.args[0] === '/portal/news/42'))
  ui.h.unmount()
})

test('HU40 detail renders the full escaped content and uses only the backend image URL', async () => {
  const content = `Primera línea\n<script>texto, sin ejecución</script>\n${'contenido '.repeat(400)}`
  const ui = detail(() => ({ data: { data: { ...latest, content } } }))
  await ui.ready()
  assert.ok(textContent(ui.tree).includes(content))
  assert.equal(
    nodes(ui.tree, (n) => n.props?.url)[0].props.url,
    latest.image_url,
  )
  assert.equal(
    nodes(ui.tree, (n) => n.props?.dangerouslySetInnerHTML).length,
    0,
  )
  assert.equal(
    nodes(ui.tree, (n) => n.type === 'time')[0].props.dateTime,
    latest.published_at,
  )
  ui.h.unmount()
})

test('HU40 image absence and failed downloads preserve readable news without fabricated routes', () => {
  const ui = component(
    client(),
    'features/portal-news/components/NewsImage.tsx',
    'NewsImage',
    { url: null, title: latest.title },
  )
  assert.equal(ui.tree, null)
  ui.props.url = latest.image_url
  ui.render()
  assert.equal(ui.tree.props.src, latest.image_url)
  ui.tree.props.onError()
  ui.render()
  assert.match(textContent(ui.tree), /Imagen no disponible/)
  ui.props.url = latest.image_url + '&version=3'
  ui.render()
  assert.equal(ui.tree.props.src, ui.props.url)
  ui.h.unmount()
})

for (const value of [
  null,
  { data: [] },
  { ...page([latest]), meta: { current_page: 0 } },
  page([{ ...latest, published_at: null }]),
]) {
  test(`HU40 malformed public response produces controlled feedback: ${JSON.stringify(value).slice(0, 65)}`, async () => {
    const ui = setupList(() => ({ data: value }))
    await ui.ready()
    assert.equal(articles(ui.tree).length, 0)
    assert.equal(nodes(ui.tree, (n) => n.props?.role === 'alert').length, 1)
    ui.h.unmount()
  })
}
