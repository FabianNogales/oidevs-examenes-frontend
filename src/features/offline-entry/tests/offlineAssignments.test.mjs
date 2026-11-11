import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
import { distributionFixture } from './offlineFixtures.mjs'

function setup(initial = null, prepare = async () => distributionFixture()) {
  let preparations = 0
  const harness = sourceHarness({
    '../api/offlineApi': {
      getOfflineAssignments: async () => {
        if (initial) return initial
        throw { status: 404 }
      },
      prepareOfflineAssignments: async (...args) => {
        preparations++
        return prepare(...args)
      },
      offlineError: (error) => error.message ?? 'No se pudo preparar.',
    },
    '@/features/auth/utils/apiErrors': {
      getRequestStatus: (error) => error.status,
    },
    '@/features/collaborations/api/collaborationsApi': {
      getExamCollaborators: async () => [],
    },
    '@/features/exams/api/entryControlApi': {
      getEntryControlStudents: async () => ({ summary: { total_students: 1 } }),
    },
  })
  const { useOfflineAssignments } = harness.load(
    'features/offline-entry/hooks/useOfflineAssignments.ts',
  )
  return {
    harness,
    render: () => harness.render(() => useOfflineAssignments(42, true)),
    preparations: () => preparations,
  }
}
test('HU35: missing preparation has real empty state and owner fallback count, then prepares once', async () => {
  const item = setup()
  item.render()
  await settle()
  let state = item.render()
  assert.equal(state.distribution, null)
  assert.equal(state.counts.collaborators, 0)
  assert.equal(state.counts.students, 1)
  assert.equal(await state.prepare(), true)
  state = item.render()
  assert.equal(state.distribution.lists[0].responsible_id, 7)
  assert.equal(await state.prepare(), false)
  assert.equal(item.preparations(), 1)
})
test('HU35: previously prepared distribution is consulted without another POST', async () => {
  const item = setup(distributionFixture())
  item.render()
  await settle()
  const state = item.render()
  assert.equal(state.distribution.version, 1)
  assert.equal(await state.prepare(), false)
  assert.equal(item.preparations(), 0)
})
test('HU35: backend failure keeps unprepared state and surfaces its error', async () => {
  const item = setup(null, async () => {
    throw new Error('La distribución está congelada en versión 1.')
  })
  item.render()
  await settle()
  assert.equal(await item.render().prepare(), false)
  const state = item.render()
  assert.equal(state.distribution, null)
  assert.match(state.error, /congelada/)
})
test('HU35: assignment cards render the actual owner, range and count and select the list for the student view', () => {
  const harness = sourceHarness({})
  const { OfflineAssignmentCards } = harness.load(
    'features/offline-entry/components/OfflineAssignmentCards.tsx',
  )
  // Arqmoc 7f9c0ec: the cards delegate to TeacherDistributionPage (?listId=) instead of opening a modal.
  const selected = []
  const distribution = distributionFixture()
  const tree = harness.render(() =>
    OfflineAssignmentCards({ distribution, onSelectList: (id) => selected.push(id) }),
  )
  assert.match(textContent(tree), /Ana Pérez/)
  assert.match(textContent(tree), /García — García/)
  assert.match(textContent(tree), /1 estudiante(?!s)/, 'singular count (OfflineAssignmentCards pluralizes)')
  nodes(
    tree,
    (node) =>
      node.type === 'button' && textContent(node) === 'Consultar estudiantes',
  )[0].props.onClick()
  assert.deepEqual(selected, [distribution.lists[0].list_id])
})
