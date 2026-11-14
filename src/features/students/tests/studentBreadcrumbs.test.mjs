import assert from 'node:assert/strict'
import test from 'node:test'
import { sourceHarness, nodes } from '../../../shared/tests/sourceHarness.mjs'

test('student pages pass their real routes to the shared PageHeader breadcrumbs in loading state', () => {
  const h = sourceHarness({
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ user: { id: 1 } }) },
    '@/shared/api/httpClient': { httpClient: {} },
    '@/features/students/hooks/useStudentProfile': { useStudentProfile: () => ({ loading: true }) },
    '@/features/students/hooks/useStudentExams': { useStudentExams: () => ({ data: [], loading: true }) },
    '@/features/students/hooks/useStudentQr': { useStudentQr: () => ({ data: null }) },
  })
  const { PageHeader } = h.load('shared/components/ui/PageHeader/PageHeader.tsx')
  for (const [name, title, path] of [
    ['StudentProfilePage', 'Mi perfil', '/students/profile'],
    ['StudentQrPage', 'Mis exámenes', '/students/qr'],
  ]) {
    const page = h.load(`features/students/pages/${name}.tsx`)[name]
    const tree = h.render(name === 'StudentQrPage' ? () => {
      const session = page()
      return session.type(session.props)
    } : page)
    const headers = nodes(tree, (node) => node.type === PageHeader)
    assert.equal(headers.length, 1)
    assert.equal(headers[0].props.title, title)
    assert.deepEqual(headers[0].props.breadcrumbs, [
      { label: 'Inicio', to: '/' }, { label: title, to: path },
    ])
    assert.equal(nodes(tree, (node) => node.type === 'main' || node.type === 'h1').length, 0,
      'StudentLayout supplies main and PageHeader supplies h1')
    h.unmount()
  }
})
