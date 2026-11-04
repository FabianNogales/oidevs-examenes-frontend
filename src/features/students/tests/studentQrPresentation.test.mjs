import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent } from '../../../shared/tests/sourceHarness.mjs'

const exams = [
  { exam_id: 1, subject: 'Matemática', exam_title: 'Parcial 1', scheduled_at: '2026-10-30 10:00:00', qr_status: 'AVAILABLE' },
  { exam_id: 2, subject: 'Física', exam_title: 'Parcial 2', scheduled_at: '2026-11-02 10:00:00', qr_status: 'UPCOMING' },
  { exam_id: 3, subject: 'Química', exam_title: 'Final', scheduled_at: '2026-09-10 10:00:00', qr_status: 'FINISHED' },
]

function setup(initialExams = exams) {
  let retryCount = 0
  const list = { data: initialExams, loading: false, error: null, retry() { retryCount++ } }
  const qr = {
    examId: null,
    loading: false,
    error: null,
    data: null,
    select() {},
    clear() {},
    retry() {},
  }
  const h = sourceHarness({
    '@/features/students/hooks/useStudentExams': {
      useStudentExams: () => list,
    },
    '@/features/students/hooks/useStudentQr': {
      useStudentQr: () => qr,
    },
    '@/features/students/components/StudentExamCard': {
      StudentExamCard: 'student-exam-card',
    },
    '@/features/students/components/StudentQrCard': {
      StudentQrCard: 'student-qr-card',
    },
    '@/features/students/components/StudentQrIcon': {
      StudentQrIcon: 'student-qr-icon',
    },
  })
  const { StudentQrPage } = h.load('features/students/pages/StudentQrPage.tsx')
  const render = () => h.render(() => StudentQrPage())
  let tree = render()
  const selectTab = (name) => {
    const tab = nodes(tree, (node) => node.props?.role === 'tab').find(
      (node) => textContent(node).startsWith(name),
    )
    assert.ok(tab, `Missing ${name} tab`)
    tab.props.onClick()
    tree = render()
  }
  return {
    h,
    list,
    render: () => (tree = render()),
    selectTab,
    retryCount: () => retryCount,
    tree: () => tree,
  }
}

test('student exams: Vigentes is selected initially and only its cards render', () => {
  const page = setup()
  const tabs = nodes(page.tree(), (node) => node.props?.role === 'tab')
  assert.equal(tabs.length, 2)
  assert.match(textContent(tabs[0]), /^Vigentes \(2\)$/)
  assert.equal(tabs[0].props['aria-selected'], true)
  assert.match(textContent(tabs[1]), /^Historial \(1\)$/)
  assert.equal(tabs[1].props['aria-selected'], false)

  const cards = nodes(page.tree(), (node) => node.type === 'student-exam-card')
  assert.deepEqual(cards.map((card) => card.props.exam.exam_id), [1, 2])
  assert.equal(nodes(page.tree(), (node) => node.props?.role === 'tabpanel').length, 1)
  page.h.unmount()
})

test('student exams: switching tabs only changes the rendered group and keeps the header', () => {
  const page = setup()
  page.selectTab('Historial')

  const tabs = nodes(page.tree(), (node) => node.props?.role === 'tab')
  assert.equal(tabs[0].props['aria-selected'], false)
  assert.equal(tabs[1].props['aria-selected'], true)
  assert.match(textContent(tabs[1]), /^Historial \(1\)$/)
  assert.deepEqual(
    nodes(page.tree(), (node) => node.type === 'student-exam-card').map(
      (card) => card.props.exam.exam_id,
    ),
    [3],
  )
  assert.match(textContent(nodes(page.tree(), (node) => node.type === 'h1')[0]), /Mis exámenes/)
  assert.equal(page.retryCount(), 0, 'Switching tabs does not request fresh data')

  page.selectTab('Vigentes')
  assert.deepEqual(
    nodes(page.tree(), (node) => node.type === 'student-exam-card').map(
      (card) => card.props.exam.exam_id,
    ),
    [1, 2],
  )
  page.h.unmount()
})

test('student exams: refresh keeps the selected tab and empty tabs show compact messages', () => {
  const page = setup()
  page.selectTab('Historial')
  const update = nodes(
    page.tree(),
    (node) => node.type === 'button' && textContent(node).includes('Actualizar exámenes'),
  )[0]
  update.props.onClick()
  assert.equal(page.retryCount(), 1)
  assert.equal(
    nodes(page.render(), (node) => node.props?.role === 'tab')[1].props[
      'aria-selected'
    ],
    true,
  )

  page.list.data = []
  let tree = page.render()
  assert.match(textContent(tree), /No tienes exámenes anteriores\./)
  page.selectTab('Vigentes')
  tree = page.tree()
  assert.match(textContent(tree), /No tienes exámenes vigentes\./)
  page.h.unmount()
})
