import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from './sourceHarness.mjs'

function setup(
  t,
  handler = async () => ({
    data: new Blob(['private image'], { type: 'image/png' }),
  }),
) {
  const calls = [],
    created = [],
    revoked = []
  t.mock.method(URL, 'createObjectURL', (blob) => {
    const url = `blob:authenticated-${created.length + 1}`
    created.push({ blob, url })
    return url
  })
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url))
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: (...args) => {
          calls.push(args)
          return handler(...args)
        },
      },
    },
  })
  return { ...h, calls, created, revoked }
}

test('HU14 image: authenticated client receives the exact backend URL and blob responseType; img uses Object URL', async (t) => {
  const h = setup(t)
  const { AuthenticatedImage } = h.load(
    'shared/components/AuthenticatedImage/AuthenticatedImage.tsx',
  )
  const props = {
    url: 'https://api.test/api/v1/admin/students/8/historical-photo',
    revision: 2,
    alt: 'Histórica de Ana',
    placeholder: 'Sin fotografía histórica',
  }
  let tree = h.render(() => AuthenticatedImage(props))
  assert.equal(
    nodes(tree, (node) => node.type === 'img').length,
    0,
    'Do not assign private URL directly to img',
  )
  assert.match(textContent(tree), /Cargando fotografía/)
  await settle()
  tree = h.render()
  const [url, config] = h.calls[0]
  assert.equal(url, props.url, 'No file route construction or tokens in URLs')
  assert.equal(config.responseType, 'blob')
  assert.equal(
    config.headers,
    undefined,
    'Preserve client authentication and JSON error negotiation defaults',
  )
  assert.ok(config.signal instanceof AbortSignal)
  assert.equal(tree.type, 'img')
  assert.equal(tree.props.src, 'blob:authenticated-1')
  assert.equal(tree.props.alt, props.alt)
  assert.ok(h.created[0].blob instanceof Blob)
  tree.props.onError()
  tree = h.render()
  assert.equal(nodes(tree, (node) => node.type === 'img').length, 0)
  assert.match(textContent(tree), /Sin fotografía histórica/)
  assert.match(textContent(tree), /No se pudo cargar/)
  h.unmount()
  assert.deepEqual(h.revoked, ['blob:authenticated-1'])
})

test('HU14 image: null produces only its placeholder without HTTP or Object URL', (t) => {
  const h = setup(t)
  const { AuthenticatedImage } = h.load(
    'shared/components/AuthenticatedImage/AuthenticatedImage.tsx',
  )
  const tree = h.render(() =>
    AuthenticatedImage({
      url: null,
      alt: 'Histórica',
      placeholder: 'Sin fotografía histórica',
    }),
  )
  assert.equal(h.calls.length, 0)
  assert.equal(h.created.length, 0)
  assert.equal(nodes(tree, (node) => node.type === 'img').length, 0)
  assert.equal(textContent(tree), 'Sin fotografía histórica')
  h.unmount()
})

test('HU14 image: changing URL or revision revokes the old Object URL and hides previous image immediately', async (t) => {
  const h = setup(t)
  const { useAuthenticatedImage } = h.load(
    'shared/hooks/useAuthenticatedImage.ts',
  )
  let url = 'https://api.test/private/first',
    revision = 1
  h.render(() => useAuthenticatedImage(url, revision))
  await settle()
  assert.equal(h.render().src, 'blob:authenticated-1')
  revision = 2
  assert.equal(h.render().src, null)
  assert.deepEqual(h.revoked, ['blob:authenticated-1'])
  assert.equal(h.calls[0][1].signal.aborted, true)
  await settle()
  assert.equal(h.render().src, 'blob:authenticated-2')
  assert.equal(
    h.calls[1][0],
    url,
    'Revision changes reload same server URL without constructing another URL',
  )
  url = 'https://api.test/private/second'
  assert.equal(h.render().src, null)
  await settle()
  assert.equal(h.render().src, 'blob:authenticated-3')
  url = null
  assert.equal(h.render().src, null)
  assert.equal(h.calls.length, 3)
  h.unmount()
  assert.deepEqual(h.revoked, [
    'blob:authenticated-1',
    'blob:authenticated-2',
    'blob:authenticated-3',
  ])
})

test('HU14 image: cancelled late responses cannot create leaked Object URLs or replace current image', async (t) => {
  const replies = []
  const h = setup(t, () => new Promise((resolve) => replies.push(resolve)))
  const { useAuthenticatedImage } = h.load(
    'shared/hooks/useAuthenticatedImage.ts',
  )
  let url = 'https://api.test/private/first'
  h.render(() => useAuthenticatedImage(url))
  url = 'https://api.test/private/second'
  h.render()
  replies[0]({ data: new Blob(['old']) })
  await settle()
  assert.equal(h.created.length, 0)
  replies[1]({ data: new Blob(['new']) })
  await settle()
  assert.equal(h.render().src, 'blob:authenticated-1')
  h.unmount()
  assert.deepEqual(h.revoked, ['blob:authenticated-1'])
})

test('HU14 image: unmount aborts a pending request and ignores its subsequent response', async (t) => {
  let reply
  const h = setup(
    t,
    () =>
      new Promise((resolve) => {
        reply = resolve
      }),
  )
  const { useAuthenticatedImage } = h.load(
    'shared/hooks/useAuthenticatedImage.ts',
  )
  h.render(() => useAuthenticatedImage('https://api.test/private/photo'))
  h.unmount()
  assert.equal(h.calls[0][1].signal.aborted, true)
  reply({ data: new Blob(['old']) })
  await settle()
  assert.equal(h.created.length, 0)
  assert.deepEqual(h.revoked, [])
})

for (const status of [401, 403, 404])
  test(`HU14 image: HTTP ${status} leaves its own placeholder and never falls back to profile`, async (t) => {
    const h = setup(t, async () => {
      throw { isAxiosError: true, response: { status } }
    })
    const { AuthenticatedImage } = h.load(
      'shared/components/AuthenticatedImage/AuthenticatedImage.tsx',
    )
    h.render(() =>
      AuthenticatedImage({
        url: 'https://api.test/private/photo',
        alt: 'Histórica',
        placeholder: 'Sin fotografía histórica',
      }),
    )
    await settle()
    const tree = h.render()
    assert.equal(h.calls.length, 1)
    assert.equal(h.created.length, 0)
    assert.equal(nodes(tree, (node) => node.type === 'img').length, 0)
    assert.match(textContent(tree), /Sin fotografía histórica/)
    assert.match(textContent(tree), /No se pudo cargar/)
    h.unmount()
  })
