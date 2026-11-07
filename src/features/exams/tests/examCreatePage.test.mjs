import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sourceHarness, nodes, textContent, settle } from '../../../shared/tests/sourceHarness.mjs'

const subject = { courseOfferingId: 7, name: 'Redes', code: 'RED', academicManagement: '2/2026', canManage: true }
async function setup(subjects = [subject], id = '7') {
  const navigations = [], writes = []
  const h = sourceHarness({
    'react-router': { useParams: () => ({ courseOfferingId: id }), useLocation: () => ({ search: '?period=2%2F2026' }), useNavigate: () => (...args) => navigations.push(args) },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
    '@/shared/components/Breadcrumbs/Breadcrumbs': { Breadcrumbs: 'Breadcrumbs' },
    '@/features/subjects/api/teacherSubjectsApi': { getTeacherSubjects: async () => subjects },
    '../components/CreateExamForm': { CreateExamForm: 'CreateExamForm' },
    '../api/teacherExamsApi': { createExam: async (...args) => { writes.push(args); return { id: 42 } } },
    '../api/examDetailsApi': { parseExamId: value => /^[1-9]\d*$/.test(value) ? Number(value) : null },
  })
  const { TeacherExamCreatePage } = h.load('features/exams/pages/TeacherExamCreatePage.tsx')
  const content = TeacherExamCreatePage()
  let tree = h.render(() => content.type(content.props))
  await settle()
  tree = h.render()
  return { h, tree, navigations, writes, form: nodes(tree, n => n.type === 'CreateExamForm')[0] }
}

test('creation uses the assigned offering and opens the newly returned exam detail', async () => {
  const t = await setup()
  assert.equal(t.form.props.subject, subject)
  const payload = { name: 'Final' }
  const id = await t.form.props.onSubmit(payload, subject)
  assert.deepEqual(t.writes, [[7, payload]])
  assert.deepEqual(t.navigations, [], 'no navigation before successful creation')
  t.form.props.onCreated(id)
  assert.deepEqual(t.navigations, [['/teacher/exams/42', { replace: true }]])
  t.h.unmount()
})

test('cancel returns to the selected period, and invalid/unassigned/inactive offerings cannot create', async () => {
  const t = await setup()
  t.form.props.onCancel()
  assert.deepEqual(t.navigations, [['/teacher/subjects?period=2%2F2026']])
  t.h.unmount()
  for (const [subjects, id] of [[[], '7'], [[{ ...subject, canManage: false }], '7'], [[subject], 'invalid']]) {
    const blocked = await setup(subjects, id)
    assert.equal(blocked.form, undefined)
    assert.equal(blocked.writes.length, 0)
    assert.ok(textContent(blocked.tree).length > 0)
    blocked.h.unmount()
  }
})
