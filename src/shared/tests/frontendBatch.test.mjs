import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, sourceRoot, compile, ts } from './sourceHarness.mjs'

function profileHarness() {
  const h = sourceHarness({ '../components/EntityProfileLayout': { EntityInfoGrid: 'grid' } })
  return { h, Profile: h.load('features/admin/profile/tabs/ProfileOverviewTab.tsx').ProfileOverviewTab }
}

test('029: missing/whitespace institutional fields never invent real personal or academic data', () => {
  const { h, Profile } = profileHarness()
  const cards = h.render(() => Profile({ entity: { role: 'TEACHER', status: 'ACTIVE',
    first_names: ' ', last_names: '', email: '', institutional_code: ' ', identity_number: ' ', career_name: ' ' } })).props.cards
  assert.equal(cards.find((card) => card.id === 'career').value, 'Información no disponible')
  for (const id of ['first_names', 'last_names', 'sis', 'ci', 'email']) {
    assert.equal(cards.find((card) => card.id === id).value, 'No registrado')
  }
})

test('029: real institutional values are preserved', () => {
  const { h, Profile } = profileHarness()
  const cards = h.render(() => Profile({ entity: { role: 'STUDENT', status: 'ACTIVE', first_names: 'Ana',
    last_names: 'Ejemplo', institutional_code: '00123', identity_number: '00456', email: 'ejemplo@example.test', career_name: 'Carrera real' } })).props.cards
  assert.equal(cards.find((card) => card.id === 'sis').value, '00123')
  assert.equal(cards.find((card) => card.id === 'career').value, 'Carrera real')
})

test('029: teacher API mapping does not fabricate a department', () => {
  const filename = resolve(sourceRoot, 'features/admin/pages/AdminTeacherDetailPage.tsx')
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const map = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'mapTeacherToUnifiedProfile')
  assert.ok(map)
  const mapper = new Function(compile(map.getText(source)) + '\nreturn mapTeacherToUnifiedProfile')()
  const actual = mapper({ id: 1, first_names: 'Ana', status: 'ACTIVE' })
  assert.equal(actual.career_name, undefined)
})

function tableHarness() {
  const h = sourceHarness({ 'react-router': { useNavigate: () => () => {} } })
  return { h, Table: h.load('shared/components/DataTable/DataTable.tsx').DataTable,
    Row: h.load('shared/components/DataTable/DataTableRow.tsx').DataTableRow }
}
const tableProps = { columns: [{ id: 'status', header: 'Estado', accessorKey: 'status' }],
  data: [{ id: 1, status: 'ACTIVE' }], loading: false }

test('030: current ten-record page contract and explicit server ranges remain coherent', () => {
  const { h, Table } = tableHarness()
  const pagination = { currentPage: 3, lastPage: 3, total: 21 }
  let tree = h.render(() => Table({ ...tableProps, pagination }))
  assert.match(textContent(tree), /Mostrando 21 a 21 de 21/)
  tree = h.render(() => Table({ ...tableProps, pagination: { ...pagination, from: 9, to: 9 } }))
  assert.match(textContent(tree), /Mostrando 9 a 9 de 21/)
})

test('030: loading/error/empty states are exclusive; pagination respects current boundaries', () => {
  const { h, Table } = tableHarness()
  let tree = h.render(() => Table({ ...tableProps, loading: true, error: 'Error anterior' }))
  assert.equal(nodes(tree, (node) => node.type === 'table').length, 0)
  assert.equal(nodes(tree, (node) => node.props?.role === 'alert').length, 0)
  tree = h.render(() => Table({ ...tableProps, error: 'Falló la carga' }))
  assert.equal(nodes(tree, (node) => node.props?.role === 'alert').length, 1)
  tree = h.render(() => Table({ ...tableProps, data: [] }))
  assert.match(textContent(tree), /No se encontraron registros/)
  const pages = []
  tree = h.render(() => Table({ ...tableProps, pagination: { currentPage: 1, lastPage: 2, total: 11 }, onPageChange: (page) => pages.push(page) }))
  const buttons = nodes(tree, (node) => node.type === 'button')
  assert.equal(buttons[0].props.disabled, true)
  buttons[0].props.onClick(); buttons[1].props.onClick()
  assert.deepEqual(pages, [2])
})

test('030: binary status actions preserve current behavior without expanding HU21', () => {
  const { h, Row } = tableHarness()
  const toggled = []
  for (const [status, label] of [['ACTIVE', 'Desactivar'], ['INACTIVE', 'Activar']]) {
    const item = { id: 1, status }
    const tree = h.render(() => Row({ ...tableProps, item, onToggleStatus: (entry) => toggled.push(entry.status) }))
    const button = nodes(tree, (node) => node.type === 'button')[0]
    assert.equal(textContent(button), label)
    button.props.onClick()
  }
  assert.deepEqual(toggled, ['ACTIVE', 'INACTIVE'])
})

test('031: table column headers remain explicit for assistive technology', () => {
  const { h, Table } = tableHarness()
  const tree = h.render(() => Table({ ...tableProps, onViewProfile: () => {} }))
  assert.ok(nodes(tree, (node) => node.type === 'th').every((node) => node.props.scope === 'col'))
})

test('031: focus cycles through select/textarea and excludes hidden, disabled and negative-tabindex controls', () => {
  const h = sourceHarness()
  const { trapDialogFocus } = h.load('shared/utils/trapDialogFocus.ts')
  const button = new h.Element({ tag: 'button' })
  const select = new h.Element({ tag: 'select' })
  const textarea = new h.Element({ tag: 'textarea' })
  const ignored = [new h.Element({ tag: 'input', tabIndex: -1 }), new h.Element({ tag: 'input', hidden: true }),
    new h.Element({ tag: 'button', disabled: true }), new h.Element({ tag: 'input', type: 'hidden' }),
    new h.Element({ tag: 'button', invisible: true })]
  const dialog = new h.Element({ tabIndex: -1, children: [...ignored, button, select, textarea, ...ignored] })
  let prevented = 0
  const event = { key: 'Tab', currentTarget: dialog, preventDefault: () => prevented++ }
  textarea.focus(); trapDialogFocus(event)
  assert.equal(h.document.activeElement, button)
  button.focus(); trapDialogFocus({ ...event, shiftKey: true })
  assert.equal(h.document.activeElement, textarea)
  select.focus(); trapDialogFocus(event)
  assert.equal(h.document.activeElement, select)
  assert.equal(prevented, 2)
  dialog.children = ignored
  trapDialogFocus(event)
  assert.equal(h.document.activeElement, dialog)
})

test('031: confirmation focuses Cancel, traps Tab, restores focus and keeps busy Escape protection', () => {
  const h = sourceHarness()
  const { ConfirmDialog } = h.load('features/admin/components/ConfirmDialog.tsx')
  const trigger = new h.Element(); trigger.focus()
  const cancel = new h.Element({ tag: 'button' })
  const confirm = new h.Element({ tag: 'button' })
  const dialog = new h.Element({ tabIndex: -1, children: [cancel, confirm] })
  let closed = 0
  let busy = false
  const render = () => ConfirmDialog({ isOpen: true, title: 'Confirmar', message: 'Mensaje', loading: busy,
    onConfirm: () => {}, onCancel: () => closed++ })
  const attach = (tree) => { nodes(tree, (node) => node.props?.role === 'alertdialog')[0].props.ref.current = dialog }
  let tree = h.render(render, attach)
  assert.equal(h.document.activeElement, cancel)
  assert.equal(h.document.body.style.overflow, 'hidden')
  const content = nodes(tree, (node) => node.props?.role === 'alertdialog')[0]
  assert.ok(content.props['aria-describedby'])
  confirm.focus(); content.props.onKeyDown({ key: 'Tab', currentTarget: dialog, preventDefault() {} })
  assert.equal(h.document.activeElement, cancel)
  h.emit('keydown', 'window', { key: 'Escape', stopImmediatePropagation() {} })
  assert.equal(closed, 1)
  busy = true; tree = h.render(render, attach)
  assert.equal(h.document.activeElement, dialog)
  h.emit('keydown', 'window', { key: 'Escape', stopImmediatePropagation() {} })
  assert.equal(closed, 1)
  assert.ok(nodes(tree, (node) => node.type === 'button').every((node) => node.props.disabled))
  h.unmount()
  assert.equal(h.document.activeElement, trigger)
  assert.equal(h.document.body.style.overflow, '')
  assert.equal(h.listenerCount(), 0)
})

test('031: shared HU12/collaboration modal delegates Tab and retains busy dismissal protection', () => {
  const h = sourceHarness()
  const { CollaborationModal } = h.load('features/collaborations/components/CollaborationModal.tsx')
  let closed = 0
  const dialog = new h.Element({ tabIndex: -1, children: [new h.Element({ tag: 'select' })] })
  const tree = h.render(() => CollaborationModal({ title: 'HU12', children: null, busy: true, onClose: () => closed++ }),
    (node) => { nodes(node, (entry) => entry.props?.role === 'dialog')[0].props.ref.current = dialog })
  const content = nodes(tree, (node) => node.props?.role === 'dialog')[0]
  content.props.onKeyDown({ key: 'Tab', currentTarget: dialog, preventDefault() {} })
  assert.equal(h.document.activeElement, dialog.children[0])
  content.props.onKeyDown({ key: 'Escape', stopPropagation() {} })
  assert.equal(closed, 0)
  h.unmount()
})
