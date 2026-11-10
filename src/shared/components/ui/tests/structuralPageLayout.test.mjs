import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nodes, sourceHarness } from '../../../tests/sourceHarness.mjs'

test('Importar estudiantes conserva el encabezado y breadcrumbs compartidos en cada paso', () => {
  const h = sourceHarness({
    'react-router': { useLocation: () => ({ key: 'qa' }) },
    '@/features/students/components/StudentImportPanel': { StudentImportPanel: function StudentImportPanel() { return null } },
  })
  const { ImportStudentsPage } = h.load('features/students/pages/ImportStudentsPage.tsx')
  let tree = h.render(ImportStudentsPage)
  assert.equal(tree.type.name, 'PageContainer')
  const panel = nodes(tree, node => node.type?.name === 'StudentImportPanel')[0]
  for (const [step, title, crumb] of [
    ['select', 'Importar estudiantes', 'Importar estudiantes'],
    ['preview', 'Vista previa de la última importación', 'Vista previa'],
    ['success', 'Resultado de importación', 'Resultado de importación'],
    ['unknown', 'Resultado de importación no confirmado', 'Resultado no confirmado'],
  ]) {
    panel.props.onStepChange(step)
    tree = h.render()
    const headers = nodes(tree, node => node.type?.name === 'PageHeader')
    assert.equal(headers.length, 1)
    assert.equal(headers[0].props.title, title)
    assert.deepEqual(headers[0].props.breadcrumbs, [
      { label: 'Inicio', to: '/' },
      { label: 'Estudiantes', to: '/admin/students/manage' },
      { label: crumb },
    ])
    assert.equal(nodes(headers[0].type(headers[0].props), node => node.type === 'h2').length, 1)
    assert.equal(nodes(tree, node => node.type === 'main').length, 0)
  }
  h.unmount()
})
