import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const record = {
  student: {
    student_id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '123',
  },
  permissions: { can_annul: true },
  entry: {
    id: 9,
    exam_id: 4,
    student_id: 7,
    room_id: 2,
    status: 'VALID',
    entered_at: '2026-11-03T14:00:00Z',
    verification_method: 'QR',
    verified_by: 3,
    verified_by_name: 'Colaborador original',
  },
}
const annulled = {
  ...record,
  entry: {
    ...record.entry,
    status: 'ANNULLED',
    annulment: {
      reason: 'Registro equivocado.',
      annulled_at: '2026-11-03T14:05:00Z',
      annulled_by: { id: 2, name: 'Docente responsable' },
    },
  },
}

function setup() {
  const calls = []
  let data = [record]
  let changes = 0
  const h = sourceHarness({
    '@/shared/hooks/useAuthenticatedImage': {
      useAuthenticatedImage: () => ({
        src: null,
        loading: false,
        failed: false,
      }),
    },
    '@/features/collaborations/components/CollaborationModal': {
      CollaborationModal: 'modal',
    },
    '@/features/entry-annulments/components/AnnulEntryConfirmation': {
      AnnulEntryConfirmation: 'confirmation',
    },
    '../api/entryQrApi': {
      getEntryHistory: async (...args) => {
        calls.push(args)
        return {
          data,
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: data.length,
          },
        }
      },
    },
    '../api/entryControlApi': {
      getEntryControlErrorMessage: () => 'No se pudo consultar el historial.',
    },
  })
  const { EntryHistoryModal } = h.load(
    'features/exams/components/EntryHistoryModal.tsx',
  )
  h.render(() =>
    EntryHistoryModal({
      examId: 4,
      onClose() {},
      onEntriesChanged() {
        changes++
      },
    }),
  )
  return {
    h,
    calls,
    setData: (value) => {
      data = value
    },
    changes: () => changes,
    load: async () => {
      h.render()
      h.advance(300)
      await settle()
      return h.render()
    },
    select: () => {
      const list = nodes(
        h.render(),
        (n) => n.type?.name === 'EntryHistoryRecords',
      )[0]
      list.props.onAnnul(record)
      return h.render()
    },
  }
}

test('HU28 successful annulment refreshes actual history and notifies parent once without deleting the original record', async () => {
  const ui = setup()
  await ui.load()
  const tree = ui.select()
  const confirm = nodes(tree, (n) => n.type === 'confirmation')[0]
  ui.setData([annulled])
  confirm.props.onAnnulled(annulled)
  assert.equal(ui.changes(), 1)
  let current = ui.h.render()
  assert.match(textContent(current), /Ingreso #9 anulado/)
  assert.equal(
    nodes(current, (n) => n.type?.name === 'EntryHistoryRecords').length,
    0,
    'No optimistic list while reloading',
  )
  current = await ui.load()
  const list = nodes(current, (n) => n.type?.name === 'EntryHistoryRecords')[0]
  assert.equal(list.props.records[0].entry.entered_at, record.entry.entered_at)
  assert.equal(list.props.records[0].entry.status, 'ANNULLED')
  assert.equal(ui.calls.length, 2)
  ui.h.unmount()
})

test('HU28 closing confirmation conserves the selected entry and retains the history search', async () => {
  const ui = setup()
  let tree = await ui.load()
  nodes(tree, (n) => n.type === 'input')[0].props.onChange({
    target: { value: 'Ana' },
  })
  ui.h.render()
  await ui.load()
  tree = ui.select()
  nodes(tree, (n) => n.type === 'confirmation')[0].props.onCancel()
  tree = await ui.load()
  assert.equal(nodes(tree, (n) => n.type === 'input')[0].props.value, 'Ana')
  assert.equal(
    nodes(tree, (n) => n.type?.name === 'EntryHistoryRecords')[0].props
      .records[0].entry.status,
    'VALID',
  )
  assert.equal(ui.calls.at(-1)[1].search, 'Ana')
  ui.h.unmount()
})

test('HU28 busy confirmation cannot be dismissed by the modal close handler', async () => {
  const ui = setup()
  await ui.load()
  let tree = ui.select()
  nodes(tree, (n) => n.type === 'confirmation')[0].props.onBusyChange(true)
  tree = ui.h.render()
  const modal = nodes(tree, (n) => n.type === 'modal')[0]
  assert.equal(modal.props.busy, true)
  modal.props.onClose()
  tree = ui.h.render()
  assert.equal(nodes(tree, (n) => n.type === 'confirmation').length, 1)
  assert.equal(ui.calls.length, 1)
  ui.h.unmount()
})

test('HU28 desktop/mobile history never offers annulment for legacy, annulled or denied records', () => {
  const h = sourceHarness({
    '@/shared/hooks/useAuthenticatedImage': {
      useAuthenticatedImage: () => ({
        src: null,
        loading: false,
        failed: false,
      }),
    },
  })
  const { EntryHistoryRecords } = h.load(
    'features/exams/components/EntryHistoryRecords.tsx',
  )
  const selected = []
  for (const item of [
    { ...record, permissions: undefined },
    { ...record, permissions: { can_annul: false } },
    annulled,
  ]) {
    const tree = EntryHistoryRecords({
      records: [item],
      onAnnul: (item) => selected.push(item),
    })
    assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
  }
  const tree = EntryHistoryRecords({
    records: [record],
    onAnnul: (item) => selected.push(item),
  })
  const buttons = nodes(tree, (n) => n.type === 'button')
  assert.equal(
    buttons.length,
    2,
    'Desktop and mobile share the same permission check',
  )
  buttons[0].props.onClick()
  assert.equal(selected[0], record)
})

test('HU28 annulled evidence retains the server reason, author and time without an editable attendance', () => {
  const h = sourceHarness()
  const { EntryAnnulmentEvidence } = h.load(
    'features/entry-annulments/components/EntryAnnulmentEvidence.tsx',
  )
  const tree = EntryAnnulmentEvidence({ record: annulled })
  assert.match(textContent(tree), /Registro equivocado/)
  assert.match(textContent(tree), /Docente responsable/)
  assert.equal(
    nodes(tree, (n) => ['input', 'button', 'textarea'].includes(n.type)).length,
    0,
  )
  assert.equal(EntryAnnulmentEvidence({ record }), null)
})
