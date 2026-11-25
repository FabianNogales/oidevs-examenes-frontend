import assert from 'node:assert/strict'
import { test } from 'node:test'
import axios from 'axios'
import { sourceHarness, nodes, textContent, settle } from './sourceHarness.mjs'

const examPhotoPaths = [
  '/exams/23/collaborators/31/profile-photo',
  '/exams/23/eligibilities/17/profile-photo',
  '/exams/23/entry-control/students/17/profile-photo',
  '/exams/23/entry-control/students/17/historical-photo',
]

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

test('HU14 image: admin student photos use the configured API and blob responseType; img uses Object URL', async (t) => {
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
  assert.equal(url, '/admin/students/8/historical-photo')
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

for (const photoPath of [
  '/admin/students/8/profile-photo',
  '/admin/students/8/historical-photo',
  '/students/profile/photo',
  ...examPhotoPaths,
])
  test(`${photoPath} keeps its revision through the configured API/proxy`, (t) => {
    for (const prefix of [
      'https://backend.test/api/v1',
      'https://frontend.test/backend/api/v1',
      '/backend/api/v1',
      '/api/v1',
      '',
    ]) {
      const h = setup(t)
      const { useAuthenticatedImage } = h.load(
        'shared/hooks/useAuthenticatedImage.ts',
      )
      const path = `${photoPath}?v=image-version&revision=2`
      h.render(() => useAuthenticatedImage(prefix + path))
      assert.equal(h.calls[0][0], path)
      h.unmount()
    }
  })

test('student photo upload reloads the returned absolute photo URL without expiring a valid session', async (t) => {
  const events = []
  const calls = []
  const h = sourceHarness({
    '@/app/config/env': {
      env: { apiUrl: '/backend/api/v1', backendUrl: '/backend' },
    },
    '@/features/auth/utils/authEvents': {
      emitAuthSessionEvent: (event) => events.push(event),
    },
  })
  t.mock.method(URL, 'createObjectURL', () => 'blob:student-photo')
  t.mock.method(URL, 'revokeObjectURL', () => {})
  const { httpClient } = h.load('shared/api/httpClient.ts')
  httpClient.defaults.adapter = async (config) => {
    calls.push([config.method, config.url])
    const response = { config, headers: {}, status: 200, data: null }
    if (config.url.startsWith('https://backend.test/')) {
      response.status = 401
      throw new axios.AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config,
        null,
        response,
      )
    }
    if (config.method === 'post') {
      assert.equal(config.data.get('photo').name, 'photo.png')
      response.data = {
        data: {
          profile_photo_url:
            'https://backend.test/api/v1/students/profile/photo?v=new-photo',
        },
      }
    } else if (config.url === '/students/profile') {
      response.data = { data: { profile_photo_url: null } }
    } else {
      response.data = new Blob(['updated image'])
    }
    return response
  }
  const { useStudentProfile } = h.load(
    'features/students/hooks/useStudentProfile.ts',
  )
  const { useAuthenticatedImage } = h.load(
    'shared/hooks/useAuthenticatedImage.ts',
  )
  h.render(() => {
    const profile = useStudentProfile()
    const image = useAuthenticatedImage(profile.data?.profile_photo_url)
    return { profile, image }
  })
  await settle()
  const { profile } = h.render()
  assert.equal(
    await profile.updatePhoto(
      new File(['image'], 'photo.png', { type: 'image/png' }),
    ),
    true,
  )
  h.render()
  await settle()
  assert.deepEqual(events, [])
  assert.equal(h.render().image.src, 'blob:student-photo')
  assert.deepEqual(calls, [
    ['get', '/students/profile'],
    ['post', '/students/profile/photo'],
    ['get', '/students/profile/photo?v=new-photo'],
  ])
  h.unmount()
})

for (const photoPath of [
  '/admin/students/1/historical-photo',
  ...examPhotoPaths,
])
  for (const expired of [false, true])
    test(`${photoPath} with the real 401 interceptor: session ${expired ? 'expired' : 'valid'}`, async (t) => {
      const events = []
      const h = sourceHarness({
        '@/app/config/env': {
          env: { apiUrl: '/backend/api/v1', backendUrl: '/backend' },
        },
        '@/features/auth/utils/authEvents': {
          emitAuthSessionEvent: (event) => events.push(event),
        },
      })
      t.mock.method(URL, 'createObjectURL', () => 'blob:admin-photo')
      t.mock.method(URL, 'revokeObjectURL', () => {})
      const { httpClient } = h.load('shared/api/httpClient.ts')
      httpClient.defaults.adapter = async (config) => {
        // A host-only frontend cookie is unavailable to the backend's absolute hostname.
        const authenticated =
          !expired && !config.url.startsWith('https://backend.test/')
        const response = {
          config,
          headers: {},
          status: authenticated ? 200 : 401,
          data: authenticated
            ? new Blob(['image'])
            : { message: 'Unauthenticated.' },
        }
        if (!authenticated)
          throw new axios.AxiosError(
            'Unauthorized',
            'ERR_BAD_REQUEST',
            config,
            null,
            response,
          )
        return response
      }
      const { useAuthenticatedImage } = h.load(
        'shared/hooks/useAuthenticatedImage.ts',
      )
      h.render(() =>
        useAuthenticatedImage(`https://backend.test/api/v1${photoPath}?v=1`),
      )
      await settle()
      assert.deepEqual(events, expired ? [{ reason: 'SESSION_EXPIRED' }] : [])
      assert.equal(h.render().src, expired ? null : 'blob:admin-photo')
      h.unmount()
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

for (const accountStatus of [200, 401, 503])
  test(`BUG06: a photograph 401 verifies the account (${accountStatus}) before ending the session`, async (t) => {
    const events = [], calls = []
    const h = sourceHarness({
      '@/app/config/env': { env: { apiUrl: '/backend/api/v1', backendUrl: '/backend' } },
      '@/features/auth/utils/authEvents': { emitAuthSessionEvent: (event) => events.push(event) },
    })
    t.mock.method(URL, 'createObjectURL', () => 'blob:unused')
    t.mock.method(URL, 'revokeObjectURL', () => {})
    const { httpClient } = h.load('shared/api/httpClient.ts')
    httpClient.defaults.adapter = async (config) => {
      calls.push(config.url)
      const status = config.url === '/me' ? accountStatus : 401
      const response = { config, headers: {}, status, data: status === 200 ? { data: { id: 1 } } : { message: 'Unavailable' } }
      if (status !== 200) throw new axios.AxiosError('Failed', 'ERR_BAD_REQUEST', config, null, response)
      return response
    }
    const { useAuthenticatedImage } = h.load('shared/hooks/useAuthenticatedImage.ts')
    h.render(() => useAuthenticatedImage('/exams/23/eligibilities/17/profile-photo'))
    await settle()
    assert.deepEqual(calls, ['/exams/23/eligibilities/17/profile-photo', '/me'])
    assert.deepEqual(events, accountStatus === 401 ? [{ reason: 'SESSION_EXPIRED' }] : [])
    assert.equal(h.render().failed, true)
    assert.equal(h.render().src, null)
    h.unmount()
  })
