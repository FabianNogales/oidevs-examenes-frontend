import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const original = {
  id: '8',
  institutional_code: '00123',
  first_names: 'Ana',
  last_names: 'Demo',
  identity_number: '123',
  email: 'ana@umss.edu.bo',
  status: 'ACTIVE',
  career: null,
  historical_photo_url: null,
  historical_photo_revision: 0,
  profile_photo_url: '/profile-original.jpg',
}
const apiDetail = (student) => ({
  ...student,
  id: Number(student.id),
  sis_code: student.institutional_code,
})
const image = (type = 'image/jpeg', size = 32) =>
  new File([new Uint8Array(size)], 'institutional.' + type.split('/')[1], {
    type,
  })
const failure = (status, data) => ({
  isAxiosError: true,
  response: { status, data },
})

function setup(student = original) {
  const calls = [],
    updates = []
  let getHandler = async () => ({ data: { data: apiDetail(student) } })
  let postHandler = async () => ({
    data: {
      data: apiDetail({
        ...student,
        historical_photo_url: 'https://api.test/private/photo',
        historical_photo_revision: student.historical_photo_revision + 1,
      }),
    },
  })
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: {
        get: (...args) => {
          calls.push(['get', ...args])
          return getHandler(...args)
        },
        post: (...args) => {
          calls.push(['post', ...args])
          return postHandler(...args)
        },
      },
    },
    '@/shared/components/AuthenticatedImage/AuthenticatedImage': {
      AuthenticatedImage: 'authenticated-image',
    },
    './ConfirmDialog': { ConfirmDialog: 'confirmation' },
  })
  const { StudentHistoricalPhotoSection } = h.load(
    'features/admin/components/StudentHistoricalPhotoSection.tsx',
  )
  const props = {
    student,
    onUpdated: (updated) => {
      updates.push(updated)
      props.student = updated
    },
  }
  let tree
  const render = () =>
    (tree = h.render(() => StudentHistoricalPhotoSection(props)))
  const button = (label) =>
    nodes(
      tree,
      (node) => node.type === 'button' && textContent(node).trim() === label,
    )[0]
  const click = (label) => {
    const b = button(label)
    assert.ok(b, label)
    assert.ok(!b.props.disabled)
    b.props.onClick()
    return render()
  }
  const fileInput = () =>
    nodes(
      tree,
      (node) => node.type === 'input' && node.props.type === 'file',
    )[0]
  const choose = (photo) => {
    fileInput().props.onChange({ target: { files: photo ? [photo] : [] } })
    return render()
  }
  const reason = (value) => {
    nodes(tree, (node) => node.type === 'textarea')[0].props.onChange({
      target: { value },
    })
    return render()
  }
  const submit = () => {
    nodes(tree, (node) => node.type === 'form')[0].props.onSubmit({
      preventDefault() {},
    })
    return render()
  }
  const confirmation = () =>
    nodes(tree, (node) => node.type === 'confirmation')[0]
  const confirm = async () => {
    confirmation().props.onConfirm()
    render()
    await settle()
    return render()
  }
  render()
  return {
    ...h,
    calls,
    updates,
    props,
    render,
    click,
    choose,
    reason,
    submit,
    confirm,
    confirmation,
    fileInput,
    button,
    tree: () => tree,
    setPost: (handler) => {
      postHandler = handler
    },
    setGet: (handler) => {
      getHandler = handler
    },
  }
}

test('HU14 admin: independent historical placeholder, current revision and explicit first-load action', () => {
  const ui = setup()
  const photo = nodes(
    ui.tree(),
    (node) => node.type === 'authenticated-image',
  )[0]
  assert.equal(photo.props.url, null)
  assert.equal(photo.props.revision, 0)
  assert.match(textContent(photo.props.placeholder), /Sin fotografía histórica/)
  assert.match(textContent(ui.tree()), /Revisión actual: 0/)
  assert.ok(ui.button('Cargar fotografía institucional'))
  assert.equal(ui.button('Corregir fotografía institucional'), undefined)
  assert.equal(ui.calls.length, 0, 'No automatic upload or copy from profile')
  ui.unmount()
})

for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
  test(`HU14 first upload: ${type}, explicit confirmation, multipart revision 0, profile unchanged`, async () => {
    const ui = setup()
    ui.click('Cargar fotografía institucional')
    const file = image(type)
    ui.choose(file)
    ui.submit()
    assert.equal(ui.calls.length, 0, 'Preparing confirmation does not upload')
    assert.equal(ui.confirmation().props.isOpen, true)
    assert.match(ui.confirmation().props.message, /Revisión: 0/)
    assert.match(ui.confirmation().props.message, /institutional/)
    await ui.confirm()
    const [method, path, form, config] = ui.calls[0]
    assert.equal(method, 'post')
    assert.equal(path, '/admin/students/8/historical-photo')
    assert.ok(form instanceof FormData)
    assert.equal(form.get('photo').type, type)
    assert.equal(form.get('revision'), '0')
    assert.deepEqual([...form.keys()], ['photo', 'revision'])
    assert.ok(config.signal instanceof AbortSignal)
    assert.equal(
      config.headers,
      undefined,
      'Browser supplies the multipart boundary',
    )
    assert.equal(ui.updates[0].id, '8', 'students.id, normalized from API')
    assert.equal(ui.updates[0].profile_photo_url, original.profile_photo_url)
    assert.equal(ui.updates[0].historical_photo_revision, 1)
    assert.match(textContent(ui.tree()), /guardada correctamente/)
    assert.ok(ui.button('Corregir fotografía institucional'))
    ui.unmount()
  })
}

for (const [name, file, expected] of [
  [
    'too large',
    image('image/jpeg', 5 * 1024 * 1024 + 1),
    /no debe superar 5 MB/,
  ],
  ['invalid MIME', image('image/svg+xml'), /JPEG, PNG o WebP/],
  ['missing file', null, /Selecciona una fotografía/],
]) {
  test(`HU14 UI validation: ${name} prevents confirmation and HTTP request`, () => {
    const ui = setup()
    ui.click('Cargar fotografía institucional')
    ui.choose(file)
    ui.submit()
    assert.equal(ui.confirmation().props.isOpen, false)
    assert.equal(ui.calls.length, 0)
    assert.match(textContent(ui.tree()), expected)
    assert.equal(ui.fileInput().props['aria-invalid'], true)
    ui.unmount()
  })
}

test('HU14 accepts exactly 5 MiB and requires an actual server revision', () => {
  const h = sourceHarness()
  const { validateHistoricalPhoto } = h.load(
    'features/admin/utils/historicalPhotoValidation.ts',
  )
  assert.deepEqual(
    validateHistoricalPhoto(image('image/png', 5 * 1024 * 1024), 0, false, ''),
    {},
  )
  for (const revision of [undefined, -1, 0.5, 2])
    assert.ok(validateHistoricalPhoto(image(), revision, false, '').revision)
})

test('HU14 correction: reason mandatory and <= 500 characters; current revision goes to corrections endpoint', async () => {
  const ui = setup({
    ...original,
    historical_photo_url: 'https://api.test/private/photo',
    historical_photo_revision: 7,
  })
  ui.click('Corregir fotografía institucional')
  ui.choose(image())
  ui.reason('   ')
  ui.submit()
  assert.equal(ui.calls.length, 0)
  assert.equal(ui.confirmation().props.isOpen, false)
  assert.match(textContent(ui.tree()), /motivo de la corrección/)
  ui.reason('x'.repeat(501))
  ui.submit()
  assert.match(textContent(ui.tree()), /500 caracteres/)
  ui.reason('  Referencia institucional incorrecta  ')
  ui.submit()
  await ui.confirm()
  const [, path, form] = ui.calls[0]
  assert.equal(path, '/admin/students/8/historical-photo/corrections')
  assert.equal(form.get('revision'), '7')
  assert.equal(form.get('reason'), 'Referencia institucional incorrecta')
  assert.deepEqual([...form.keys()], ['photo', 'revision', 'reason'])
  assert.equal(ui.updates[0].historical_photo_revision, 8)
  assert.equal(ui.updates[0].profile_photo_url, original.profile_photo_url)
  const photo = nodes(
    ui.tree(),
    (node) => node.type === 'authenticated-image',
  )[0]
  assert.equal(photo.props.revision, 8, 'Same URL must fetch its new revision')
  ui.unmount()
})

for (const code of [
  'HISTORICAL_PHOTO_CONFLICT',
  'HISTORICAL_PHOTO_EXISTS',
  'HISTORICAL_PHOTO_MISSING',
]) {
  test(`HU14 HTTP 409 ${code}: preserves state and requires explicit detail reload before retry`, async () => {
    const previous = {
      ...original,
      historical_photo_url: 'https://api.test/private/photo',
      historical_photo_revision: 3,
    }
    const ui = setup(previous)
    ui.setPost(async () => {
      throw failure(409, {
        code,
        current_revision: 4,
        message: 'La fotografía institucional cambió.',
      })
    })
    ui.click('Corregir fotografía institucional')
    ui.choose(image())
    ui.reason('Motivo revisado')
    ui.submit()
    await ui.confirm()
    assert.equal(ui.updates.length, 0)
    assert.equal(ui.props.student, previous)
    assert.equal(
      ui.props.student.historical_photo_revision,
      3,
      'Do not adopt current_revision silently',
    )
    assert.equal(
      nodes(ui.tree(), (node) => node.type === 'textarea')[0].props.value,
      'Motivo revisado',
    )
    assert.equal(ui.calls.length, 1, 'No automatic GET or retry')
    assert.match(textContent(ui.tree()), /Recarga el detalle/)
    assert.equal(ui.button('Revisar corrección').props.disabled, true)
    ui.submit()
    assert.equal(ui.calls.length, 1)
    ui.setGet(async () => ({
      data: { data: apiDetail({ ...previous, historical_photo_revision: 4 }) },
    }))
    ui.click('Recargar detalle')
    await settle()
    ui.render()
    assert.equal(ui.calls[1][0], 'get')
    assert.equal(ui.calls[1][1], '/admin/students/8')
    assert.equal(ui.props.student.historical_photo_revision, 4)
    ui.click('Corregir fotografía institucional')
    ui.choose(image())
    ui.reason('Motivo posterior a recarga')
    ui.submit()
    assert.equal(ui.confirmation().props.isOpen, true)
    assert.match(ui.confirmation().props.message, /Revisión: 4/)
    ui.unmount()
  })
}

test('HU14 HTTP 422: photo, revision and reason errors are presented without success or data changes', async () => {
  const ui = setup({
    ...original,
    historical_photo_url: 'https://api.test/photo',
    historical_photo_revision: 2,
  })
  ui.setPost(async () => {
    throw failure(422, {
      message: 'Datos inválidos.',
      errors: {
        photo: ['El contenido no es una imagen.'],
        revision: ['Revisión inválida.'],
        reason: ['Motivo inválido.'],
      },
    })
  })
  ui.click('Corregir fotografía institucional')
  ui.choose(image())
  ui.reason('Motivo')
  ui.submit()
  await ui.confirm()
  for (const message of [
    'Datos inválidos.',
    'El contenido no es una imagen.',
    'Revisión inválida.',
    'Motivo inválido.',
  ])
    assert.ok(textContent(ui.tree()).includes(message))
  assert.equal(ui.fileInput().props['aria-invalid'], true)
  assert.equal(
    nodes(ui.tree(), (node) => node.type === 'textarea')[0].props[
      'aria-invalid'
    ],
    true,
  )
  assert.equal(ui.updates.length, 0)
  assert.equal(ui.props.student.profile_photo_url, original.profile_photo_url)
  assert.equal(ui.props.student.historical_photo_revision, 2)
  ui.unmount()
})

test('HU14 confirmation freezes revision and prevents duplicate requests; unmount aborts upload', async () => {
  const ui = setup({
    ...original,
    historical_photo_url: 'https://api.test/photo',
    historical_photo_revision: 2,
  })
  let finish
  ui.setPost(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  ui.click('Corregir fotografía institucional')
  ui.choose(image())
  ui.reason('Motivo')
  ui.submit()
  ui.props.student = { ...ui.props.student, historical_photo_revision: 3 }
  ui.render()
  ui.confirmation().props.onConfirm()
  ui.confirmation().props.onConfirm()
  ui.render()
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.calls[0][2].get('revision'), '2')
  const signal = ui.calls[0][3].signal
  ui.unmount()
  assert.equal(signal.aborted, true)
  finish({ data: { data: apiDetail(original) } })
  await settle()
  assert.equal(ui.updates.length, 0)
})

test('HU14 institutional administration remains behind the existing AdminRoute', () => {
  for (const [roles, allowed] of [
    [['ADMINISTRADOR'], true],
    [['DOCENTE'], false],
    [['ESTUDIANTE'], false],
  ]) {
    const h = sourceHarness({
      '@/features/auth/hooks/useAuth': {
        useAuth: () => ({
          isAuthenticated: true,
          isLoading: false,
          user: { roles },
        }),
      },
      'react-router': { Outlet: 'admin-content', Navigate: 'redirect' },
    })
    const { AdminRoute } = h.load('features/auth/components/AdminRoute.tsx')
    const tree = h.render(AdminRoute)
    assert.equal(tree.type, allowed ? 'admin-content' : 'redirect')
    h.unmount()
  }
})
