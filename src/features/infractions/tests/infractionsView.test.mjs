import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
import { exam, record, meta } from './infractionFixtures.mjs'

test('HU30 list uses the shared table with infraction states, not catalog ACTIVE/INACTIVE', async () => {
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: async () => ({
          data: {
            exam,
            data: [record],
            meta,
            permissions: { can_create: true },
          },
        }),
      },
    },
    '@/shared/components/DataTable/DataTable': { DataTable: 'data-table' },
    'react-router': {
      Link: 'link',
      NavLink: 'nav-link',
      useParams: () => ({ examId: '4' }),
      useSearchParams: () => [new URLSearchParams(), () => {}],
    },
  })
  const { InfractionRecords } = h.load(
    'features/infractions/pages/ExamInfractionsPage.tsx',
  )
  h.render(() => InfractionRecords({ examId: 4, embedded: true }))
  await settle()
  const table = nodes(h.render(), (n) => n.type === 'data-table')[0]
  assert.equal('status' in table.props.data[0], false)
  assert.equal(
    table.props.columns
      .find((c) => c.id === 'infraction_status')
      .cell(table.props.data[0]),
    'Reportada',
  )
  assert.equal(table.props.pagination.total, 1)
  h.unmount()
})

test('HU30 resources abort prior exam requests and never display late evidence from another scope', async () => {
  const pending = [],
    calls = []
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: (...args) => {
          calls.push(args)
          return new Promise((resolve) => pending.push(resolve))
        },
      },
    },
  })
  const { useInfractions } = h.load(
    'features/infractions/hooks/useInfractions.ts',
  )
  let id = 4
  h.render(() => useInfractions(id))
  id = 5
  h.render()
  assert.equal(calls[0][1].signal.aborted, true)
  pending[0]({
    data: { exam, data: [record], meta, permissions: { can_create: true } },
  })
  await settle()
  assert.equal(h.render().data, null)
  pending[1]({
    data: {
      exam: { ...exam, id: 5 },
      data: [],
      meta: { ...meta, total: 0 },
      permissions: { can_create: false },
    },
  })
  await settle()
  assert.equal(h.render().data.exam.id, 5)
  h.unmount()
})

test('HU30 errors stay separate from a successful empty exam', async () => {
  for (const denied of [false, true]) {
    const h = sourceHarness({
      '@/shared/api/httpClient': {
        httpClient: {
          get: async () => {
            if (denied) throw { isAxiosError: true, response: { status: 403 } }
            return {
              data: {
                exam,
                data: [],
                meta: { ...meta, total: 0 },
                permissions: { can_create: false },
              },
            }
          },
        },
      },
    })
    const { useInfractions } = h.load(
      'features/infractions/hooks/useInfractions.ts',
    )
    h.render(() => useInfractions(4))
    await settle()
    const state = h.render()
    assert.equal(state.loading, false)
    assert.equal(!!state.error, denied)
    if (!denied) assert.deepEqual(state.data.data, [])
    h.unmount()
  }
})
