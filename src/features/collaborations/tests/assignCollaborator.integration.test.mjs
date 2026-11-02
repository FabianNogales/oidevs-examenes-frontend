import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  sourceHarness, nodes, textContent, settle, sourceRoot, ts,
} from '../../../shared/tests/sourceHarness.mjs'

const { AxiosError } = createRequire(import.meta.url)('axios')
const httpError = (status, data) =>
  new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, { status, data })
const candidate = (id, role = 'DOCENTE') => ({
  id, display_name: `Persona ${id}`, identity_number: `00${id}`,
  email: `persona${id}@example.test`, roles: [role],
})
const first = candidate(51)
const second = candidate(5, 'ADMINISTRADOR')
const response = (data = [first, second], page = 1, lastPage = 1, total = data.length) => ({
  data, meta: { current_page: page, per_page: 10, last_page: lastPage, total },
})
const find = (tree, type, label) => nodes(tree, (node) =>
  node.type === type && (label === undefined || textContent(node).trim() === label))[0]

function client(handlers = {}, overrides = {}) {
  const calls = []
  const httpClient = Object.fromEntries(['get', 'post', 'delete'].map((method) => [method, async (...args) => {
    calls.push({ method, args })
    assert.ok(handlers[method], `Unexpected ${method} ${args[0]}`)
    return handlers[method](...args)
  }]))
  const h = sourceHarness({ '@/shared/api/httpClient': { httpClient }, ...overrides })
  return { h, calls, api: h.load('features/collaborations/api/collaborationsApi.ts') }
}

// Runs actual modal, modal shell, API and error helpers with only HTTP replaced.
// Hooks/events are simulated by the repository harness; this is not a browser test.
function modal(handlers = {}, assignedUserIds = []) {
  const c = client(handlers)
  const { AssignCollaboratorModal } = c.h.load('features/collaborations/components/AssignCollaboratorModal.tsx')
  let tree
  let closes = 0
  const props = {
    examId: 17, assignedUserIds, onClose: () => closes++,
    onAssign: (userId) => c.api.assignExamCollaborator(17, userId),
  }
  const ui = {
    ...c,
    get tree() { return tree },
    get closes() { return closes },
    render() {
      tree = c.h.render(() => {
        const content = AssignCollaboratorModal(props)
        const shell = nodes(content, (node) => node.props?.title === 'Asignar colaborador')[0]
        return shell.type(shell.props)
      })
      return tree
    },
    input: () => nodes(tree, (node) => node.type === 'input' && node.props.type === 'search')[0],
    radios: () => nodes(tree, (node) => node.type === 'input' && node.props.type === 'radio'),
    alerts: () => nodes(tree, (node) => node.props?.role === 'alert').map(textContent),
    button: (label) => find(tree, 'button', label),
    click(label) {
      const button = ui.button(label)
      assert.ok(button, label)
      assert.ok(!button.props.disabled, `${label} is enabled`)
      button.props.onClick()
      ui.render()
    },
    edit(query) {
      ui.input().props.onChange({ target: { value: query } })
      ui.render()
    },
    async search(query) {
      if (query !== undefined) ui.edit(query)
      find(tree, 'form').props.onSubmit({ preventDefault() {} })
      ui.render()
      await settle()
      ui.render()
    },
    select(id) {
      const radio = ui.radios().find((node) => node.props['aria-label'] === `Seleccionar a Persona ${id}`)
      assert.ok(radio)
      assert.ok(!radio.props.disabled)
      radio.props.onChange()
      ui.render()
    },
    async assign() {
      ui.click('Confirmar asignación')
      await settle()
      ui.render()
    },
  }
  ui.render()
  return ui
}

test('HU15 has no local role hierarchy, ranks or comparisons in candidate lookup/assignment', () => {
  for (const path of ['components/AssignCollaboratorModal.tsx', 'api/collaborationsApi.ts']) {
    const source = readFileSync(resolve(sourceRoot, 'features/collaborations', path), 'utf8')
    assert.doesNotMatch(source, /useAuth|hierarch|jerarqu|role(?:Rank|Level|Weight|Priority)|nivelRol/i)
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function visit(node) {
      if (ts.isBinaryExpression(node)) {
        assert.doesNotMatch(node.getText(file), /['"](?:ADMINISTRADOR|DOCENTE|ESTUDIANTE)['"]/,
          'Role names must not be compared locally')
      }
      if (ts.isPropertyAssignment(node) && /^(ADMINISTRADOR|DOCENTE|ESTUDIANTE)$/.test(node.name.getText(file))) {
        assert.ok(ts.isStringLiteral(node.initializer), 'Role labels are informational strings, never ranks or a matrix')
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
})

test('initial and edited search do not fetch users; explicit lookup shows loading and sends exam/search/page', async () => {
  let complete
  const ui = modal({ get: () => new Promise((done) => { complete = done }) })
  assert.equal(ui.calls.length, 0)
  assert.match(textContent(ui.tree), /Busca un usuario/)
  ui.edit('  Persona  ')
  assert.equal(ui.calls.length, 0)
  find(ui.tree, 'form').props.onSubmit({ preventDefault() {} })
  ui.render()
  assert.match(textContent(ui.tree), /Buscando usuarios/)
  assert.equal(ui.radios().length, 0)
  assert.equal(ui.calls[0].args[0], '/users')
  assert.deepEqual(ui.calls[0].args[1].params, { exam_id: 17, search: 'Persona', page: 1, per_page: 10 })
  complete({ data: response() })
  await settle()
  ui.render()
  assert.equal(ui.radios().length, 2)
  ui.h.unmount()
})

test('renders exactly backend candidates with their information and selectable informational roles', async () => {
  const candidates = [first, second, candidate(99, 'ESTUDIANTE'), candidate(2, 'NUEVO_ROL')]
  const ui = modal({ get: () => ({ data: response(candidates) }) })
  await ui.search('Coincidencia del servidor')
  assert.deepEqual(ui.radios().map((node) => node.props['aria-label']),
    candidates.map((user) => `Seleccionar a ${user.display_name}`))
  for (const user of candidates) {
    assert.ok(textContent(ui.tree).includes(user.display_name))
    assert.ok(textContent(ui.tree).includes(user.email))
    assert.ok(textContent(ui.tree).includes(user.identity_number))
    ui.select(user.id)
    assert.equal(ui.button('Confirmar asignación').props.disabled, false)
  }
  assert.match(textContent(ui.tree), /Administrador|Docente|Estudiante/)
  assert.ok(textContent(ui.tree).includes('NUEVO_ROL'))
  ui.h.unmount()
})

test('a candidate absent from the next backend response is not rendered or selected', async () => {
  let data = [first, second]
  const ui = modal({ get: () => ({ data: response(data) }) })
  await ui.search('Persona')
  ui.select(second.id)
  data = [first]
  await ui.search()
  assert.equal(ui.radios().length, 1)
  assert.equal(find(ui.tree, 'strong', second.display_name), undefined)
  assert.equal(ui.button('Confirmar asignación').props.disabled, true)
  ui.h.unmount()
})

test('pagination consumes server pages, preserves search and clears selection with correct boundaries', async () => {
  const ui = modal({ get: (_url, { params }) => ({
    data: response(params.page === 1 ? [first] : [second], params.page, 2, 11),
  }) })
  await ui.search('Persona')
  assert.equal(ui.button('Anterior').props.disabled, true)
  ui.select(first.id)
  ui.click('Siguiente')
  await settle()
  ui.render()
  assert.deepEqual(ui.calls.at(-1).args[1].params, { exam_id: 17, search: 'Persona', page: 2, per_page: 10 })
  assert.equal(ui.button('Siguiente').props.disabled, true)
  assert.equal(ui.button('Confirmar asignación').props.disabled, true)
  assert.match(textContent(ui.tree), /11 usuarios · Página 2 de 2/)
  assert.ok(!textContent(ui.tree).includes(first.display_name))
  ui.click('Anterior')
  await settle()
  ui.render()
  assert.ok(textContent(ui.tree).includes(first.display_name))
  assert.equal(ui.input().props.value, 'Persona')
  ui.h.unmount()
})

test('empty response is compact and does not infer missing permissions', async () => {
  const ui = modal({ get: () => ({ data: response([]) }) })
  await ui.search('Sin coincidencias')
  assert.match(textContent(ui.tree), /No se encontraron usuarios elegibles/)
  assert.doesNotMatch(textContent(ui.tree), /No tienes permiso/i)
  assert.equal(ui.radios().length, 0)
  ui.h.unmount()
})

test('lookup failure leaves the dialog open with the query and allows explicit retry', async () => {
  let fail = true
  const ui = modal({ get: () => {
    if (fail) throw new Error('Network error')
    return { data: response() }
  } })
  await ui.search('Persona')
  assert.equal(ui.closes, 0)
  assert.equal(nodes(ui.tree, (node) => node.props?.role === 'dialog').length, 1)
  assert.equal(ui.input().props.value, 'Persona')
  assert.deepEqual(ui.alerts(), ['No se pudieron consultar los usuarios.Reintentar búsqueda'])
  fail = false
  ui.click('Reintentar búsqueda')
  await settle()
  ui.render()
  assert.equal(ui.radios().length, 2)
  assert.equal(ui.calls.length, 2)
  ui.h.unmount()
})

const hierarchyMessage = 'No puedes asignar como colaborador a un usuario con un rol superior al tuyo.'
for (const [name, status, body, expected] of [
  ['hierarchy field error', 422, { message: 'Validación general.', errors: { user_id: [hierarchyMessage, 'Otro error.'] } }, hierarchyMessage],
  ['hierarchy message fallback', 422, { message: hierarchyMessage }, hierarchyMessage],
  ['self assignment', 422, { message: 'Validación general.', errors: { user_id: ['No puedes asignarte a ti mismo.'] } }, 'No puedes asignarte a ti mismo.'],
  ['ineligible candidate', 422, { message: 'El usuario seleccionado no es elegible.' }, 'El usuario seleccionado no es elegible.'],
  ['duplicate/reactivation validation', 422, { errors: { user_id: ['La asignación existente no puede reactivarse.'] } }, 'La asignación existente no puede reactivarse.'],
  ['message before unrelated fields', 422, { message: 'Revisa esta asignación.', errors: { exam_id: ['Otro error de examen.'], search: ['Otro error de búsqueda.'] } }, 'Revisa esta asignación.'],
  ['empty field errors', 422, { message: 'Selecciona otro usuario.', errors: { user_id: [] } }, 'Selecciona otro usuario.'],
  ['duplicate conflict', 409, { message: 'Este usuario ya es colaborador.' }, 'Este usuario ya es colaborador.'],
]) {
  test(`${name}: inline server error retains dialog, query, page and results and permits another selection`, async () => {
    const ui = modal({
      get: () => ({ data: response([first, second], 2, 2, 12) }),
      post: () => { throw httpError(status, body) },
    })
    await ui.search('Persona')
    ui.select(first.id)
    await ui.assign()
    const dialog = nodes(ui.tree, (node) => node.props?.role === 'dialog')[0]
    assert.ok(dialog)
    assert.deepEqual(nodes(dialog, (node) => node.props?.role === 'alert').map(textContent), [expected])
    assert.equal(ui.closes, 0)
    assert.equal(ui.input().props.value, 'Persona')
    assert.match(textContent(ui.tree), /Página 2 de 2/)
    assert.equal(ui.radios().length, 2)
    assert.ok(ui.radios().every((node) => !node.props.checked))
    assert.equal(ui.calls.filter((call) => call.method === 'get').length, 1, 'No automatic lookup discards results')
    ui.select(second.id)
    assert.deepEqual(ui.alerts(), [])
    assert.equal(ui.button('Confirmar asignación').props.disabled, false)
    await ui.search('Otro criterio')
    assert.equal(ui.calls.at(-1).args[1].params.search, 'Otro criterio')
    assert.equal(ui.calls.at(-1).args[1].params.page, 1)
    assert.deepEqual(ui.alerts(), [])
    ui.h.unmount()
  })
}

test('after a 422 another candidate can be assigned; busy state prevents duplicate POSTs', async () => {
  let complete
  const ui = modal({
    get: () => ({ data: response() }),
    post: (_url, body) => {
      if (body.user_id === first.id) throw httpError(422, { errors: { user_id: [hierarchyMessage] } })
      return new Promise((done) => { complete = done })
    },
  })
  await ui.search('Persona')
  ui.select(first.id)
  await ui.assign()
  ui.select(second.id)
  const confirm = ui.button('Confirmar asignación')
  confirm.props.onClick()
  confirm.props.onClick()
  ui.render()
  assert.equal(ui.button('Asignando…').props.disabled, true)
  assert.equal(ui.input().props.disabled, true)
  assert.equal(ui.button('Cancelar').props.disabled, true)
  assert.deepEqual(ui.calls.filter((call) => call.method === 'post').map((call) => call.args), [
    ['/exams/17/collaborators', { user_id: first.id }],
    ['/exams/17/collaborators', { user_id: second.id }],
  ])
  complete({ status: 201 })
  await settle()
  ui.render()
  assert.deepEqual(ui.alerts(), [])
  assert.equal(ui.button('Confirmar asignación').props.disabled, false)
  ui.h.unmount()
})

test('existing assigned users cannot produce a duplicate POST', async () => {
  const ui = modal({ get: () => ({ data: response() }) }, [first.id])
  await ui.search('Persona')
  const radio = ui.radios()[0]
  assert.equal(radio.props.disabled, true)
  radio.props.onChange() // Bypass HTML to exercise the submission guard.
  ui.render()
  ui.button('Confirmar asignación').props.onClick()
  await settle()
  assert.equal(ui.calls.filter((call) => call.method === 'post').length, 0)
  ui.h.unmount()
})

for (const fail of [false, true]) {
  test(`assignment page ${fail ? 'failure preserves modal and list' : 'success closes/clears modal and reloads collaborators'}`, async () => {
    const notices = []
    let reloads = 0
    let assigned = false
    const collaborator = { ...first, user_id: first.id, assigned_at: '2026-10-30', assigned_by: 1, assigned_by_name: 'Responsable' }
    const user = { id: 1, roles: ['DOCENTE'] }
    const originalUser = structuredClone(user)
    const c = client({
      get: () => ({ data: { data: assigned ? [collaborator] : [] } }),
      post: () => {
        if (fail) throw httpError(422, { message: hierarchyMessage })
        assigned = true
        return { status: 201 }
      },
    }, {
      'react-router': { Link: 'link', useParams: () => ({ examId: '17' }) },
      '@/features/auth/hooks/useAuth': { useAuth: () => ({ user, notify: (...args) => notices.push(args) }) },
      '@/features/exams/hooks/useExamDetail': { useExamDetail: () => ({ exam: { id: 17, name: 'Examen' } }) },
      '../hooks/useMyCollaborations': { useMyCollaborations: () => ({ reload: () => reloads++ }) },
      '@/shared/components/Breadcrumbs/Breadcrumbs': { Breadcrumbs: 'breadcrumbs' },
      '../components/AssignCollaboratorModal': { AssignCollaboratorModal: 'assignment' },
      '../components/CollaborationExamCard': { CollaborationExamCard: 'exam' },
      '../components/CollaboratorsTable': { CollaboratorsTable: 'collaborators' },
    })
    const { ExamCollaboratorsPage } = c.h.load('features/collaborations/pages/ExamCollaboratorsPage.tsx')
    const render = () => c.h.render(() => {
      const page = ExamCollaboratorsPage()
      return page.type(page.props)
    })
    let tree = render()
    await settle()
    tree = render()
    find(tree, 'button', '+ Asignar colaborador').props.onClick()
    tree = render()
    const assign = find(tree, 'assignment').props.onAssign(first.id)
    if (fail) await assert.rejects(assign)
    else await assign
    tree = render()
    await settle()
    tree = render()
    assert.deepEqual(user, originalUser, 'Assignment never changes permanent roles')
    assert.equal(c.calls.filter((call) => call.method === 'post').length, 1)
    assert.equal(reloads, fail ? 0 : 1)
    assert.equal(notices.length, fail ? 0 : 1)
    if (fail) {
      assert.ok(find(tree, 'assignment'))
      assert.deepEqual(find(tree, 'collaborators').props.collaborators, [])
    } else {
      assert.equal(find(tree, 'assignment'), undefined)
      assert.deepEqual(find(tree, 'collaborators').props.collaborators.map((item) => item.user_id), [first.id])
      assert.equal(c.calls.filter((call) => call.method === 'get').length, 2)
      find(tree, 'button', '+ Asignar colaborador').props.onClick()
      tree = render()
      assert.deepEqual(find(tree, 'assignment').props.assignedUserIds, [first.id])
    }
    c.h.unmount()
  })
}

test('existing error consumers keep their default field precedence and server failure fallback', () => {
  const { api } = client()
  const failure = httpError(422, { message: 'Validación general.', errors: { exam_id: ['Revisa el examen.'] } })
  assert.equal(api.getCollaborationError(failure, 'Error anterior.'), 'Revisa el examen.')
  assert.equal(api.getCollaborationError(httpError(500, { message: 'Internal exception' }), 'Error anterior.'), 'Error anterior.')
})

test('HU16 collaborator view still renders only temporary authorizations from its existing API', async () => {
  const collaborations = [{ exam_id: 42, exam_name: 'Examen autorizado' }]
  const c = client({ get: () => ({ data: { data: collaborations } }) })
  const serverCollaborations = await c.api.getMyCollaborations()
  assert.equal(c.calls[0].args[0], '/me/collaborations')
  const state = { collaborations: serverCollaborations, reload() {} }
  const h = sourceHarness({
    'react-router': { Link: 'link' },
    '../hooks/useMyCollaborations': { useMyCollaborations: () => state },
    '../components/CollaborationExamCard': { CollaborationExamCard: 'exam' },
  })
  const { CollaboratorPage } = h.load('features/collaborations/pages/CollaboratorPage.tsx')
  const tree = h.render(() => CollaboratorPage())
  assert.equal(find(tree, 'exam').props.exam.exam_id, 42)
  assert.equal(find(tree, 'exam').props.asSupport, true)
  assert.equal(find(tree, 'link').props.to, '/exams/42/entry-control?from=collaborator')
  assert.equal(find(tree, 'button', '+ Asignar colaborador'), undefined)
  h.unmount()
})
