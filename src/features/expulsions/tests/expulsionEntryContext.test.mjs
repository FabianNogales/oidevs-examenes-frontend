import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes } from '../../../shared/tests/sourceHarness.mjs'
const student = {
  student_id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  eligibility_status: 'ELIGIBLE',
  entry_status: 'REGISTERED',
  is_expelled: true,
}
test('HU31 entry table shows expulsion separately while preserving eligibility, attendance and existing actions', () => {
  const h = sourceHarness()
  const { EntryControlTable } = h.load(
    'features/exams/components/EntryControlTable.tsx',
  )
  let selected
  const tree = h.render(() =>
    EntryControlTable({
      items: [student],
      meta: null,
      loading: false,
      error: null,
      onView: (id) => {
        selected = id
      },
    }),
  )
  const badges = nodes(tree, (n) => n.type?.name === 'EntryConditionBadge').map(
    (n) => n.props.label,
  )
  assert.deepEqual(badges, [
    'Expulsado de este examen',
    'Habilitado',
    'Registrado',
  ])
  nodes(
    tree,
    (n) => n.type === 'button' && typeof n.props.onClick === 'function',
  )[0].props.onClick()
  assert.equal(selected, 7)
  h.unmount()
})
test('HU31 entry table never infers expulsion from missing flags, truthy strings or another status', () => {
  for (const flag of [undefined, false, 'true']) {
    const h = sourceHarness()
    const { EntryControlTable } = h.load(
      'features/exams/components/EntryControlTable.tsx',
    )
    const tree = h.render(() =>
      EntryControlTable({
        items: [{ ...student, is_expelled: flag }],
        meta: null,
        loading: false,
        error: null,
        onView: () => {},
      }),
    )
    assert.equal(
      nodes(
        tree,
        (n) =>
          n.type?.name === 'EntryConditionBadge' &&
          n.props.label === 'Expulsado de este examen',
      ).length,
      0,
    )
    h.unmount()
  }
})
test('HU31 out-of-window conflict has its own message and never pretends a duplicate', async () => {
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        post: async () => {
          throw {
            isAxiosError: true,
            response: {
              status: 409,
              data: { code: 'EXPULSION_EXAM_NOT_IN_PROGRESS' },
            },
          }
        },
      },
    },
  })
  const { createExpulsion } = h.load('features/expulsions/api/expulsionsApi.ts')
  await assert.rejects(
    createExpulsion(4, {
      student_id: 7,
      reason: 'Motivo.',
      infraction_id: null,
      confirmed: true,
    }),
    (e) =>
      e.status === 409 &&
      e.message.includes('estado y horario') &&
      !e.message.includes('ya tiene'),
  )
  h.unmount()
})
