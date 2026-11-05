import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, settle } from './sourceHarness.mjs'

function expand(node) {
  if (Array.isArray(node)) return node.map(expand)
  if (!node || typeof node !== 'object' || !node.props) return node
  if (['AuthenticatedImage', 'IdentityPhoto', 'EntryStudentPhotos'].includes(node.type?.name))
    return expand(node.type(node.props))
  return { ...node, props: { ...node.props, children: expand(node.props.children) } }
}

function setup(t) {
  const calls = [], revoked = []
  let next = 0
  t.mock.method(URL, 'createObjectURL', () => `blob:private-${++next}`)
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url))
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient: { get: async (url, config) => {
      calls.push({ url, config })
      return { data: new Blob(['binary'], { type: 'image/png' }) }
    } } },
  })
  return { ...h, calls, revoked }
}

test('student profile fetches the private binary URL through the authenticated client and displays only a blob', async t => {
  const h = setup(t)
  const { StudentProfilePhoto } = h.load('features/students/components/StudentProfilePhoto.tsx')
  const props = { photoUrl: 'https://api.test/api/v1/students/profile/photo?v=first', updating: false, error: null, onUpdate: async () => true }
  let tree = h.render(() => expand(StudentProfilePhoto(props)))
  assert.equal(nodes(tree, n => n.type === 'img').length, 0)
  assert.equal(h.calls[0].url, props.photoUrl)
  assert.equal(h.calls[0].config.responseType, 'blob')
  await settle()
  tree = h.render()
  assert.equal(nodes(tree, n => n.type === 'img')[0].props.src, 'blob:private-1')
  props.photoUrl = 'https://api.test/api/v1/students/profile/photo?v=second'
  tree = h.render()
  assert.equal(nodes(tree, n => n.type === 'img').length, 0)
  assert.deepEqual(h.revoked, ['blob:private-1'])
  await settle()
  tree = h.render()
  assert.equal(nodes(tree, n => n.type === 'img')[0].props.src, 'blob:private-2')
  h.unmount()
  assert.deepEqual(h.revoked, ['blob:private-1', 'blob:private-2'])
})

test('HU13/HU14 request both student photos as authenticated blobs without assigning private URLs to img', async t => {
  const h = setup(t)
  const { EntryStudentPhotos } = h.load('features/exams/components/EntryQrStudentIdentity.tsx')
  const student = { student_id: 1, first_names: 'Ana', last_names: 'Prueba', sis_code: '00123',
    historical_photo_url: 'https://api.test/api/v1/exams/2/entry-control/students/1/historical-photo',
    profile_photo_url: 'https://api.test/api/v1/exams/2/entry-control/students/1/profile-photo?v=uuid' }
  let tree = h.render(() => expand(EntryStudentPhotos({ student })))
  assert.equal(nodes(tree, n => n.type === 'img').length, 0)
  assert.deepEqual(h.calls.map(c => c.url), [student.historical_photo_url, student.profile_photo_url])
  assert.ok(h.calls.every(c => c.config.responseType === 'blob'))
  await settle()
  tree = h.render()
  assert.deepEqual(nodes(tree, n => n.type === 'img').map(n => n.props.src), ['blob:private-1', 'blob:private-2'])
  h.unmount()
  assert.deepEqual(h.revoked, ['blob:private-1', 'blob:private-2'])
})
