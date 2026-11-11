import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

function setup(exam, cancelExam = async () => {}) {
  const h = sourceHarness({
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
    '@/features/collaborations/components/CollaborationModal': { CollaborationModal: 'Modal' },
    '../api/examCancellationApi': { cancelExam },
    '../hooks/useExamNavigationGuard': { useExamNavigationGuard: () => ({ blocked: false, stay() {} }) },
  })
  const { ExamCancellation } = h.load('features/exams/components/ExamCancellation.tsx')
  let tree = h.render(() => ExamCancellation({ exam, onReload() {} }))
  return {
    render: () => tree = h.render(),
    tree: () => tree,
    button: label => nodes(tree, n => n.type === 'button' && textContent(n) === label)[0],
    close: h.unmount,
  }
}

test('blocked cancellation stays visible with an explanation and cannot open normally', () => {
  for (const exam of [
    { status: 'IN_PROGRESS', can_cancel: false },
    { status: 'ACTIVE', can_cancel: false, cancel_block_reason: 'El examen ya comenzó.' },
    { status: 'SCHEDULED' },
  ]) {
    const t = setup(exam)
    const button = t.button('Cancelar examen')
    assert.equal(button.props.disabled, true)
    assert.ok(button.props['aria-describedby'])
    assert.equal(nodes(t.tree(), n => n.type === 'Modal').length, 0)
    assert.doesNotMatch(textContent(t.tree()), /undefined/)
    t.close()
  }
})

test('cancelled exams do not offer another cancellation', () => {
  const t = setup({ status: 'CANCELLED', can_cancel: false })
  assert.equal(t.button('Cancelar examen'), undefined)
  assert.match(textContent(t.tree()), /está cancelado/)
  t.close()
})

test('permitted cancellation retains confirmation and prevents double submission', async () => {
  let calls = 0, finish
  const t = setup({ id: 10, name: 'Parcial', status: 'SCHEDULED', can_cancel: true }, () => {
    calls++
    return new Promise(resolve => { finish = resolve })
  })
  assert.equal(t.button('Cancelar examen').props.disabled, false)
  t.button('Cancelar examen').props.onClick(); t.render()
  const confirm = t.button('Confirmar cancelación')
  confirm.props.onClick(); confirm.props.onClick()
  assert.equal(calls, 1)
  finish(); await settle()
  t.close()
})
