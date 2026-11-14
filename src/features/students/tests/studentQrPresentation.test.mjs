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
  let auth = { user: { id: 1 }, isLoggingOut: false }
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
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
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
  const render = () => h.render(() => {
    const session = StudentQrPage()
    return session.type(session.props)
  })
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
    qr,
    root: () => StudentQrPage(),
    setAuth: (value) => { auth = value },
    render: () => (tree = render()),
    selectTab,
    retryCount: () => retryCount,
    tree: () => tree,
  }
}

test('the QR page remounts on account change and is hidden during logout', () => {
  const page = setup()
  const first = page.root()
  page.setAuth({ user: { id: 2 }, isLoggingOut: false })
  const second = page.root()
  assert.equal(first.type, second.type)
  assert.equal(first.key, '1')
  assert.equal(second.key, '2')
  page.setAuth({ user: { id: 2 }, isLoggingOut: true })
  assert.equal(page.root(), null)
  page.setAuth({ user: null, isLoggingOut: false })
  assert.equal(page.root(), null)
  page.h.unmount()
})

test('each exam card has one QR action and passes the selected exam ID', () => {
  const h = sourceHarness()
  const { StudentExamCard } = h.load('features/students/components/StudentExamCard.tsx')
  const selected = []
  for (const exam of exams) {
    const tree = h.render(() => StudentExamCard({
      exam,
      selected: false,
      onSelect: (...args) => selected.push(args),
    }))
    const buttons = nodes(tree, (node) => node.type === 'button')
    assert.equal(buttons.length, 1)
    assert.equal(textContent(buttons[0]), 'Ver mi QR')
    assert.equal(buttons[0].props.disabled, exam.qr_status !== 'AVAILABLE')
    if (!buttons[0].props.disabled) buttons[0].props.onClick()
  }
  assert.deepEqual(selected, [[1]])
  h.unmount()
})

test('the card presents the supplied v3 SVG unchanged and preserves both download options', () => {
  const h = sourceHarness()
  const { StudentQrCard } = h.load('features/students/components/StudentQrCard.tsx')
  const image = 'data:image/svg+xml;base64,PHN2Zy8+'
  const token = ['e30', Buffer.from(JSON.stringify({ v: 3, exp: 1893459600 })).toString('base64url'), 'example'].join('.')
  const tree = h.render(() => StudentQrCard({
    qr: { ...exams[0], token, qr_code_base64: image },
    studentName: 'Estudiante de prueba', onRetry() {},
  }))
  const img = nodes(tree, (node) => node.type === 'img')[0]
  assert.equal(img.props.src, image)
  assert.equal(img.props.width, 480)
  const svg = nodes(tree, (node) => node.type === 'a')[0]
  assert.equal(svg.props.href, image)
  assert.match(svg.props.download, /\.svg$/)
  assert.match(textContent(tree), /Descargar PNG/)
  assert.match(textContent(tree), /Estudiante de prueba/)
  h.unmount()
})

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
  // U2: the page heading comes from PageHeader (not expanded by this shallow harness).
  const header = nodes(page.tree(), (node) => node.props?.titleId === 'student-exams-title')
  assert.equal(header.length, 1)
  assert.equal(header[0].props.title, 'Mis exámenes')
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
