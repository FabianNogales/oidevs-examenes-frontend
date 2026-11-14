import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness } from '../../../shared/tests/sourceHarness.mjs'

test('the portal requests the existing student endpoint with explicit version 3', async () => {
  const calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient: {
      async get(path, options) { calls.push({ path, options }); return { data: {} } },
    } },
  })
  const { getStudentExamQr } = h.load('features/students/api/studentQrApi.ts')
  const { signal } = new AbortController()
  await getStudentExamQr(42, signal)
  assert.deepEqual(calls, [
    { path: '/students/exams/42/qr', options: { params: { version: 3 }, signal } },
  ])
})

test('student QR errors distinguish denied access and disabled v3', () => {
  const h = sourceHarness()
  const { getStudentQrError } = h.load('features/students/api/studentQrError.ts')
  const error = (status, data) => ({ isAxiosError: true, response: { status, data } })
  assert.match(getStudentQrError(error(401, {}), 'qr').message, /sesión/)
  assert.equal(getStudentQrError(error(403, { message: 'Acceso denegado' }), 'qr').status, 403)
  assert.match(getStudentQrError(error(503, { code: 'QR_V3_UNAVAILABLE' }), 'qr').message, /no está disponible/)
})
