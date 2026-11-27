import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
} from '../../../shared/tests/sourceHarness.mjs'

function setup(overrides = {}) {
  const navigation = [],
    calls = []
  const auth = {
    user: {
      id: 1,
      roles: ['ESTUDIANTE'],
      status: 'ACTIVE',
      must_change_password: false,
      must_upload_historical_photo: true,
      ...overrides,
    },
    isAuthenticated: true,
    isLoading: false,
    sessionError: null,
    notify() {},
    refreshUser: async () => auth.user,
  }
  const location = { pathname: '/configuracion-inicial/fotografia' }
  let upload = async () => {
    auth.user.must_upload_historical_photo = false
  }
  const h = sourceHarness({
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '@/features/auth/hooks/useSessionRouteVerification': {
      useSessionRouteVerification: () => false,
    },
    '@/features/auth/api/authApi': {
      registerHistoricalPhoto: async (file) => {
        calls.push(file)
        await upload()
      },
    },
    '@/shared/components/ui': {
      Button: 'Button',
      Heading: 'Heading',
      Text: 'Text',
    },
    '@/features/collaborations/components/CollaborationsProvider': {
      CollaborationsProvider: 'CollaborationsProvider',
    },
    '@/features/collaborations/hooks/useMyCollaborations': {
      useMyCollaborations: () => ({ collaborations: [] }),
    },
    '@/shared/components/Header/Header': { Header: 'Header' },
    '@/shared/components/Footer/Footer': { Footer: 'Footer' },
    '@/shared/components/Snackbar': { Snackbar: 'Snackbar' },
    'react-router': {
      Navigate: 'Navigate',
      Outlet: 'Outlet',
      useLocation: () => location,
      useNavigate:
        () =>
        (...args) =>
          navigation.push(args),
    },
  })
  return Object.assign(h, {
    auth,
    location,
    calls,
    navigation,
    setUpload: (handler) => {
      upload = handler
    },
  })
}

test('password takes priority; direct URLs, guest routes and reloaded sessions route to pending photo', () => {
  const h = setup()
  const { getHomeRouteForUser } = h.load('features/auth/utils/authRoutes.ts')
  const { ProtectedRoute } = h.load(
    'features/auth/components/ProtectedRoute.tsx',
  )
  const { RoleRoute } = h.load('features/auth/components/RoleRoute.tsx')
  const { GuestRoute } = h.load('features/auth/components/GuestRoute.tsx')
  const { FirstAccessRoute } = h.load(
    'features/auth/components/FirstAccessRoute.tsx',
  )
  assert.equal(ProtectedRoute({}).props.to, '/configuracion-inicial/fotografia')
  assert.equal(
    RoleRoute({ allowedRoles: ['ESTUDIANTE'] }).props.to,
    '/configuracion-inicial/fotografia',
  )
  assert.equal(GuestRoute().props.to, '/configuracion-inicial/fotografia')
  assert.equal(FirstAccessRoute().type, 'Outlet')
  h.location.pathname = '/cambiar-contrasena-inicial'
  assert.equal(FirstAccessRoute().props.to, '/configuracion-inicial/fotografia')
  h.auth.user.must_change_password = true
  assert.equal(getHomeRouteForUser(h.auth.user), '/cambiar-contrasena-inicial')
  h.location.pathname = '/configuracion-inicial/fotografia'
  assert.equal(FirstAccessRoute().props.to, '/cambiar-contrasena-inicial')
  h.auth.user.must_change_password = false
  h.auth.user.must_upload_historical_photo = false
  assert.equal(FirstAccessRoute().props.to, '/')
  assert.equal(ProtectedRoute({}).type, 'Outlet')
})

test('photo form validates, previews replacements, reports API errors and continues only after refreshed completion', async () => {
  const h = setup()
  const { InitialHistoricalPhotoForm } = h.load(
    'features/auth/components/InitialHistoricalPhotoForm.tsx',
  )
  let tree = h.render(InitialHistoricalPhotoForm)
  const input = () => nodes(tree, (n) => n.type === 'input')[0]
  const submit = () =>
    nodes(tree, (n) => n.type === 'form')[0].props.onSubmit({
      preventDefault() {},
    })
  await submit()
  tree = h.render()
  assert.match(textContent(tree), /Selecciona una fotografía/)
  input().props.onChange({
    target: {
      files: [new File(['bad'], 'bad.svg', { type: 'image/svg+xml' })],
    },
  })
  tree = h.render()
  assert.match(textContent(tree), /JPEG, PNG o WebP/)
  const first = new File(['first'], 'first.png', { type: 'image/png' })
  input().props.onChange({ target: { files: [first] } })
  tree = h.render()
  tree = h.render()
  const oldPreview = nodes(tree, (n) => n.type === 'img')[0].props.src
  const second = new File(['second'], 'second.jpg', { type: 'image/jpeg' })
  input().props.onChange({ target: { files: [second] } })
  tree = h.render()
  tree = h.render()
  assert.notEqual(nodes(tree, (n) => n.type === 'img')[0].props.src, oldPreview)
  h.setUpload(async () => {
    throw {
      isAxiosError: true,
      response: {
        status: 422,
        data: { errors: { photo: ['Contenido inválido.'] } },
      },
    }
  })
  await submit()
  tree = h.render()
  assert.match(textContent(tree), /Contenido inválido/)
  assert.deepEqual(h.navigation, [])
  let release
  h.setUpload(
    () =>
      new Promise((done) => {
        release = () => {
          h.auth.user.must_upload_historical_photo = false
          done()
        }
      }),
  )
  const pending = submit()
  tree = h.render()
  assert.equal(input().props.disabled, true)
  await submit()
  assert.equal(h.calls.length, 2)
  release()
  await pending
  assert.equal(h.calls.at(-1), second)
  assert.deepEqual(h.navigation, [['/', { replace: true }]])
  h.unmount()
})

test('pending students cannot bypass setup by opening the public home with their session', () => {
  const h = setup()
  const { AppLayout } = h.load('layouts/AppLayout/AppLayout.tsx')
  const renderContent = () => {
    const content = AppLayout().props.children
    return content.type(content.props)
  }
  assert.equal(
    h.render(renderContent).props.to,
    '/configuracion-inicial/fotografia',
  )
  h.auth.user.must_change_password = true
  assert.equal(h.render(renderContent).props.to, '/cambiar-contrasena-inicial')
  h.auth.user.must_upload_historical_photo = false
  h.auth.user.must_change_password = false
  assert.equal(h.render(renderContent).type, 'div')
})

test('CSV accepts optional photo columns without weakening other headers', async () => {
  const h = setup()
  const { validateStudentImportCsv } = h.load(
    'features/students/utils/csvValidation.ts',
  )
  const base = 'sis_code,identity_number,first_names,last_names,email,career'
  for (const suffix of [
    '',
    ',profile_photo',
    ',historical_photo',
    ',profile_photo,historical_photo',
  ]) {
    assert.equal(
      (
        await validateStudentImportCsv(
          new File([base + suffix + '\n'], 'students.csv', {
            type: 'text/csv',
          }),
        )
      ).isValid,
      true,
    )
  }
  for (const header of [
    base.replace('email,career', 'career,email'),
    base + ',unknown',
    base + ',historical_photo,profile_photo',
  ]) {
    assert.equal(
      (
        await validateStudentImportCsv(
          new File([header], 'students.csv', { type: 'text/csv' }),
        )
      ).isValid,
      false,
    )
  }
})

test('CSV downloadable template, guide and preview keep both photo fields optional', async () => {
  const h = setup()
  const { downloadStudentCsvTemplate } = h.load(
    'features/students/utils/csvTemplate.ts',
  )
  const { validateStudentImportCsv } = h.load(
    'features/students/utils/csvValidation.ts',
  )
  const { ImportColumnsGuide } = h.load(
    'features/students/components/ImportColumnsGuide.tsx',
  )
  const { StudentImportPreviewTable } = h.load(
    'features/students/components/StudentImportPreviewTable.tsx',
  )
  const createUrl = URL.createObjectURL
  const revokeUrl = URL.revokeObjectURL
  const link = {
    click() {
      this.clicked = true
    },
  }
  let blob
  try {
    h.document.createElement = () => link
    URL.createObjectURL = (value) => {
      blob = value
      return 'blob:template-test'
    }
    URL.revokeObjectURL = () => {}
    downloadStudentCsvTemplate()
    assert.equal(link.clicked, true)
    assert.equal(link.download, 'plantilla_estudiantes.csv')
    const template = await blob.text()
    assert.match(template, /career,profile_photo,historical_photo\r\n$/)
    assert.equal(
      (
        await validateStudentImportCsv(
          new File([template], link.download, { type: 'text/csv' }),
        )
      ).isValid,
      true,
    )
  } finally {
    URL.createObjectURL = createUrl
    URL.revokeObjectURL = revokeUrl
  }
  const guide = textContent(h.render(ImportColumnsGuide))
  assert.match(guide, /Foto de perfil \(opcional\)/)
  assert.match(guide, /Foto histórica \(opcional\)/)
  const preview = h.render(() =>
    StudentImportPreviewTable({
      rows: [
        {
          row: 2,
          valid: true,
          errors: [],
          data: {
            sis_code: '001',
            identity_number: '123',
            first_names: 'Ana',
            last_names: 'Prueba',
            email: 'ana@umss.edu.bo',
            career: 'Sistemas',
            profile_photo: '',
            historical_photo: '',
          },
        },
      ],
    }),
  )
  assert.equal((textContent(preview).match(/Sin foto/g) ?? []).length, 2)
})
