import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { BookOpen } from 'lucide-react'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter } = require('react-router')
const srcRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const uiRoot = fileURLToPath(new URL('../', import.meta.url))

const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText
  const localRequire = (specifier) => {
    if (specifier.endsWith('.module.css')) {
      return {
        __esModule: true,
        default: new Proxy({}, { get: (_target, key) => String(key) }),
      }
    }
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/')
        ? resolve(srcRoot, specifier.slice(2))
        : resolve(dirname(filename), specifier)
      const candidates = [
        base,
        `${base}.tsx`,
        `${base}.ts`,
        resolve(base, 'index.ts'),
        resolve(base, 'index.tsx'),
      ]
      const found = candidates.find(
        (candidate) =>
          existsSync(candidate) &&
          ! candidate.endsWith('/') &&
          readFileSync_safe(candidate) !== null,
      )
      assert.ok(found, `cannot resolve ${specifier} from ${filename}`)
      return load(found)
    }
    return require(specifier)
  }
  new Function('exports', 'require', 'module', output)(
    module.exports,
    localRequire,
    module,
  )
  return module.exports
}

function readFileSync_safe(p) {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

const h = React.createElement
const render = (element, initialEntries = ['/']) =>
  renderToStaticMarkup(h(MemoryRouter, { initialEntries }, element))

test('All global UI CSS modules strictly follow Semi-Flat Design 2.0 tokens without literal colors, px font sizes, or restricted DS1.4 tokens', () => {
  const cssFiles = readdirSync(uiRoot, { recursive: true })
    .map((f) => String(f).replaceAll('\\', '/'))
    .filter((f) => f.endsWith('.module.css') && f !== 'Button/Button.module.css')

  assert.ok(cssFiles.length >= 16, `expected >= 16 UI CSS modules, found ${cssFiles.length}`)

  for (const relativeFile of cssFiles) {
    const css = readFileSync(resolve(uiRoot, relativeFile), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    assert.doesNotMatch(
      css,
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
      `${relativeFile}: no literal hex/rgb/hsl colors allowed`,
    )
    assert.doesNotMatch(
      css,
      /font-size:\s*[\d.]+px/,
      `${relativeFile}: no px font sizes allowed`,
    )
    assert.doesNotMatch(
      css,
      /:global|!important|--(status|control-height|z-)/,
      `${relativeFile}: no :global, !important, or restricted DS1.4 tokens allowed`,
    )
  }
})

test('Atoms: Label, Icon, Badge, Avatar, Spinner, Input/TextField, Checkbox, Radio, Switch, Select, Heading, Text, Link', () => {
  const { Label } = load(resolve(uiRoot, 'Label/Label.tsx'))
  const { Icon } = load(resolve(uiRoot, 'Icon/Icon.tsx'))
  const { Badge } = load(resolve(uiRoot, 'Badge/Badge.tsx'))
  const { Avatar, computeInitials } = load(resolve(uiRoot, 'Avatar/Avatar.tsx'))
  const { Spinner } = load(resolve(uiRoot, 'Spinner/Spinner.tsx'))
  const { Input, TextField } = load(resolve(uiRoot, 'Input/Input.tsx'))
  const { Checkbox } = load(resolve(uiRoot, 'Checkbox/Checkbox.tsx'))
  const { Radio } = load(resolve(uiRoot, 'Radio/Radio.tsx'))
  const { Switch } = load(resolve(uiRoot, 'Switch/Switch.tsx'))
  const { Select } = load(resolve(uiRoot, 'Select/Select.tsx'))
  const { Heading, Text, Link } = load(resolve(uiRoot, 'Typography/Typography.tsx'))

  // Label
  const labelHtml = render(h(Label, { htmlFor: 'email', required: true }, 'Correo'))
  assert.match(labelHtml, /<label for="email"[^>]*>Correo<span[^>]*aria-hidden="true">\*<\/span><\/label>/)

  // Icon (decorative vs semantic)
  const decorativeIcon = render(h(Icon, { icon: BookOpen, size: 'sm' }))
  assert.match(decorativeIcon, /aria-hidden="true"/)
  const semanticIcon = render(h(Icon, { icon: BookOpen, label: 'Materia' }))
  assert.match(semanticIcon, /role="img"/)
  assert.match(semanticIcon, /aria-label="Materia"/)

  // Badge
  for (const tone of ['neutral', 'info', 'accent', 'success', 'warning', 'danger']) {
    const badgeHtml = render(h(Badge, { tone }, tone))
    assert.match(badgeHtml, new RegExp(`class="badge ${tone} md"`))
  }

  // Avatar & initials
  assert.equal(computeInitials('Rodrigo Perez'), 'RP')
  assert.equal(computeInitials('Admin'), 'AD')
  const avatarFallback = render(h(Avatar, { name: 'Rodrigo Perez' }))
  assert.match(avatarFallback, /aria-label="Rodrigo Perez"/)
  assert.match(avatarFallback, />RP<\/span>/)
  const avatarImg = render(h(Avatar, { src: '/avatar.png', alt: 'Foto de perfil' }))
  assert.match(avatarImg, /<img src="\/avatar\.png" alt="Foto de perfil"/)

  // Spinner
  assert.match(render(h(Spinner, null)), /aria-hidden="true"/)
  assert.match(render(h(Spinner, { label: 'Cargando datos' })), /role="status" aria-label="Cargando datos"/)

  // Input / TextField
  assert.equal(Input, TextField)
  const fieldInput = render(
    h(Input, {
      id: 'user-age',
      type: 'number',
      label: 'Edad',
      hint: 'Mayor de 18',
      error: 'Edad inválida',
      value: '17',
      onChange: () => {},
    }),
  )
  assert.match(fieldInput, /for="user-age"/)
  assert.match(fieldInput, /type="number"/)
  assert.match(fieldInput, /aria-invalid="true"/)
  assert.match(fieldInput, /aria-describedby="user-age-hint user-age-error"/)

  // Checkbox, Radio, Switch, Select
  const checkboxHtml = render(h(Checkbox, { id: 'terms', label: 'Acepto términos', invalid: true }))
  assert.match(checkboxHtml, /type="checkbox"/)
  assert.match(checkboxHtml, /aria-invalid="true"/)
  assert.match(checkboxHtml, />Acepto términos<\/span>/)

  const radioHtml = render(h(Radio, { id: 'opt-a', name: 'opt', label: 'Opción A' }))
  assert.match(radioHtml, /type="radio"/)
  assert.match(radioHtml, />Opción A<\/span>/)

  const switchHtml = render(h(Switch, { id: 'notif', label: 'Notificaciones', defaultChecked: true }))
  assert.match(switchHtml, /role="switch"/)
  assert.match(switchHtml, /checked=""/)

  const selectHtml = render(h(Select, { id: 'role', defaultValue: 'admin' }, h('option', { value: 'admin' }, 'Admin')))
  assert.match(selectHtml, /<select id="role"/)

  // Heading, Text, Link
  const headingHtml = render(h(Heading, { level: 3, size: 'h1' }, 'Título semántico H3 con vista H1'))
  assert.match(headingHtml, /^<h3 class="heading size-h1 tone-primary">/)

  const textHtml = render(h(Text, { as: 'span', variant: 'small' }, 'Nota al pie'))
  assert.match(textHtml, /^<span class="text variant-small tone-secondary">Nota al pie<\/span>$/)

  const internalLink = render(h(Link, { to: '/admin/rooms' }, 'Ir a aulas'))
  assert.match(internalLink, /href="\/admin\/rooms"/)
  assert.match(internalLink, /data-external="false"/)

  const externalLink = render(h(Link, { href: 'https://umss.edu.bo' }, 'Portal UMSS'))
  assert.match(externalLink, /target="_blank"/)
  assert.match(externalLink, /rel="noopener noreferrer"/)
  assert.match(externalLink, /data-external="true"/)
})

test('Molecules: FormField, SearchBar, Card, Tabs, Accordion, Breadcrumb, Pagination, Tooltip', () => {
  const { FormField } = load(resolve(uiRoot, 'FormField/FormField.tsx'))
  const { TextInput } = load(resolve(uiRoot, 'Field/TextInput.tsx'))
  const { SearchBar } = load(resolve(uiRoot, 'SearchBar/SearchBar.tsx'))
  const {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
  } = load(resolve(uiRoot, 'Card/Card.tsx'))
  const { Tabs } = load(resolve(uiRoot, 'Tabs/Tabs.tsx'))
  const { Accordion } = load(resolve(uiRoot, 'Accordion/Accordion.tsx'))
  const { Breadcrumb } = load(resolve(uiRoot, 'Breadcrumb/Breadcrumb.tsx'))
  const { Pagination, getPaginationRange } = load(
    resolve(uiRoot, 'Pagination/Pagination.tsx'),
  )
  const { Tooltip } = load(resolve(uiRoot, 'Tooltip/Tooltip.tsx'))

  // FormField with direct element child
  const formFieldHtml = render(
    h(
      FormField,
      {
        label: 'Código de materia',
        htmlFor: 'subj-code',
        hint: 'Formato SIS-000',
        error: 'Campo requerido',
        required: true,
      },
      h(TextInput, { name: 'code' }),
    ),
  )
  assert.match(formFieldHtml, /id="subj-code"/)
  assert.match(formFieldHtml, /aria-describedby="subj-code-hint subj-code-error"/)
  assert.match(formFieldHtml, /aria-invalid="true"/)

  // SearchBar
  const searchHtml = render(
    h(SearchBar, {
      defaultValue: 'redes',
      placeholder: 'Buscar materia',
      onSubmit: () => {},
    }),
  )
  assert.match(searchHtml, /role="search"/)
  assert.match(searchHtml, /value="redes"/)
  assert.match(searchHtml, />Buscar<\/button>/)
  assert.match(searchHtml, />Limpiar<\/span><\/button>/)

  // Card composition
  const cardHtml = render(
    h(
      Card,
      { interactive: true },
      h(
        CardHeader,
        null,
        h(CardTitle, null, 'Título de tarjeta'),
        h(CardDescription, null, 'Descripción breve'),
      ),
      h(CardContent, null, h('p', null, 'Cuerpo')),
      h(CardFooter, null, h('span', null, 'Pie')),
    ),
  )
  assert.match(cardHtml, /class="card padding-md interactive"/)
  assert.match(cardHtml, /<h3 class="title">Título de tarjeta<\/h3>/)
  assert.match(cardHtml, /<footer class="footer"><span>Pie<\/span><\/footer>/)

  // Tabs
  const tabsHtml = render(
    h(Tabs, {
      defaultValue: 'tab-2',
      items: [
        { id: 'tab-1', label: 'General', content: h('p', null, 'Panel 1') },
        { id: 'tab-2', label: 'Avanzado', content: h('p', null, 'Panel 2') },
      ],
    }),
  )
  assert.match(tabsHtml, /role="tablist"/)
  assert.match(tabsHtml, /role="tab"[^>]*aria-selected="true"[^>]*><span>Avanzado<\/span><\/button>/)
  assert.match(tabsHtml, /role="tabpanel"[^>]*><p>Panel 2<\/p><\/div>/)

  // Accordion
  const accHtml = render(
    h(Accordion, {
      defaultValue: ['sec-1'],
      items: [
        { id: 'sec-1', title: 'Sección 1', content: h('p', null, 'Detalle 1') },
        { id: 'sec-2', title: 'Sección 2', content: h('p', null, 'Detalle 2') },
      ],
    }),
  )
  assert.match(accHtml, /aria-expanded="true"/)
  assert.match(accHtml, /role="region"[^>]*><p>Detalle 1<\/p><\/div>/)
  assert.doesNotMatch(accHtml, /Detalle 2/)

  // Breadcrumb
  const crumbHtml = render(
    h(Breadcrumb, {
      items: [{ label: 'Inicio', to: '/' }, { label: 'Exámenes' }],
    }),
  )
  assert.match(crumbHtml, /aria-label="Ruta de navegación"/)
  assert.match(crumbHtml, /aria-current="page">Exámenes<\/span>/)

  // Pagination
  assert.deepEqual(getPaginationRange(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  const pageHtml = render(
    h(Pagination, {
      defaultPage: 2,
      totalPages: 5,
      summary: 'Mostrando 11-20 de 50',
    }),
  )
  assert.match(pageHtml, /aria-label="Paginación"/)
  assert.match(pageHtml, /aria-current="page" aria-label="Página 2"/)

  // Tooltip
  const tooltipHtml = render(
    h(
      Tooltip,
      { content: 'Información auxiliar' },
      h('button', { type: 'button' }, 'Ayuda'),
    ),
  )
  assert.match(tooltipHtml, /<button type="button">Ayuda<\/button>/)
})

test('Organisms & Templates & Utilities: Sidebar, Modal, Alert/Banner/Toast, Table, PageLayout/DashboardLayout/AuthLayout, Grid/Stack/Container, States, ThemeProvider, Hooks', () => {
  const { Sidebar, isSidebarItemActive } = load(
    resolve(uiRoot, 'Sidebar/Sidebar.tsx'),
  )
  const { Modal } = load(resolve(uiRoot, 'Modal/Modal.tsx'))
  const { Alert, Banner, toast, getActiveToasts, dismissToast } = load(
    resolve(uiRoot, 'Toast/Toast.tsx'),
  )
  const { Table } = load(resolve(uiRoot, 'Table/Table.tsx'))
  const {
    PageLayout,
    DashboardLayout,
    AuthLayout,
    Grid,
    Stack,
    Container,
  } = load(resolve(uiRoot, 'Layout/index.ts'))
  const {
    LoadingState,
    EmptyState,
    ErrorState,
    ErrorBoundary,
  } = load(resolve(uiRoot, 'States/States.tsx'))
  const { ThemeProvider } = load(
    resolve(uiRoot, 'ThemeProvider/ThemeProvider.tsx'),
  )
  const hooks = load(resolve(srcRoot, 'shared/hooks/index.ts'))

  // Sidebar
  assert.equal(
    isSidebarItemActive({ id: 'rooms', label: 'Aulas', to: '/admin/rooms' }, '/admin/rooms/import'),
    true,
  )
  const sidebarHtml = render(
    h(Sidebar, {
      items: [
        { id: 'home', label: 'Inicio', to: '/admin', exact: true },
        { id: 'rooms', label: 'Aulas', to: '/admin/rooms', badge: '12' },
      ],
    }),
    ['/admin/rooms'],
  )
  assert.match(sidebarHtml, /aria-current="page"[^>]*class="navLink navLinkActive"/)

  // Modal (SSR without portal)
  const modalHtml = render(
    h(
      Modal,
      {
        isOpen: true,
        usePortal: false,
        title: 'Confirmar eliminación',
        description: 'Esta acción no se puede deshacer.',
        onClose: () => {},
        onConfirm: () => {},
      },
      h('p', null, '¿Deseas continuar?'),
    ),
  )
  assert.match(modalHtml, /role="dialog"/)
  assert.match(modalHtml, /aria-modal="true"/)
  assert.match(modalHtml, />Confirmar eliminación<\/h2>/)
  assert.match(modalHtml, />Cancelar<\/button>/)
  assert.match(modalHtml, />Confirmar<\/button>/)

  // Alert, Banner & imperative toast queue
  const dangerAlert = render(
    h(Alert, { tone: 'danger', title: 'Error de red' }, 'Revisa tu conexión.'),
  )
  assert.match(dangerAlert, /role="alert"/)
  const infoBanner = render(
    h(Banner, { tone: 'info', title: 'Mantenimiento' }, 'Programado a las 22:00.'),
  )
  assert.match(infoBanner, /role="status"/)

  dismissToast()
  const toastId = toast.success('Guardado correctamente')
  assert.equal(getActiveToasts().length, 1)
  assert.equal(getActiveToasts()[0].id, toastId)
  assert.equal(getActiveToasts()[0].tone, 'success')
  dismissToast(toastId)
  assert.equal(getActiveToasts().length, 0)

  // Table with sorting
  const tableHtml = render(
    h(Table, {
      columns: [
        {
          id: 'code',
          header: 'Código',
          sortable: true,
          sortValue: (r) => r.code,
          render: (r) => r.code,
        },
        { id: 'name', header: 'Nombre', render: (r) => r.name },
      ],
      data: [
        { code: 'SIS-202', name: 'Redes' },
        { code: 'SIS-101', name: 'Algoritmos' },
      ],
      defaultSort: { columnId: 'code', direction: 'asc' },
      getRowKey: (r) => r.code,
    }),
  )
  assert.match(tableHtml, /aria-sort="ascending"/)
  assert.ok(tableHtml.indexOf('SIS-101') < tableHtml.indexOf('SIS-202'))

  // PageLayout, DashboardLayout, AuthLayout, Grid, Stack, Container
  const layoutHtml = render(
    h(
      DashboardLayout,
      {
        header: h('header', null, 'Top'),
        sidebar: h('aside', null, 'Side'),
        footer: h('footer', null, 'Foot'),
      },
      h(
        Container,
        null,
        h(
          Grid,
          { columns: 3, gap: '4' },
          h(Stack, { gap: '2' }, h('span', null, 'Item')),
        ),
      ),
    ),
  )
  assert.match(layoutHtml, /<main id="main-content"/)
  assert.match(layoutHtml, /class="grid cols-3 gap-4 align-stretch"/)

  const authHtml = render(
    h(
      AuthLayout,
      { aside: h('div', null, 'Info institucional') },
      h('form', null, 'Login'),
    ),
  )
  assert.match(authHtml, /<aside class="authAside"><div>Info institucional<\/div><\/aside>/)

  // States & ErrorBoundary
  assert.match(render(h(LoadingState, { title: 'Cargando…' })), /role="status"/)
  assert.match(render(h(EmptyState, { title: 'Sin exámenes' })), />Sin exámenes<\/h3>/)
  assert.match(
    render(h(ErrorState, { title: 'Fallo', onRetry: () => {} })),
    /role="alert"[\s\S]*>Reintentar<\/button>/,
  )
  assert.match(
    render(h(ErrorBoundary, null, h('p', null, 'Contenido seguro'))),
    /<p>Contenido seguro<\/p>/,
  )

  // ThemeProvider & Hooks exports
  assert.match(
    render(h(ThemeProvider, { defaultTheme: 'light' }, h('span', null, 'App'))),
    /<span>App<\/span>/,
  )
  for (const hookName of [
    'useId',
    'useControllableState',
    'useMediaQuery',
    'useClickOutside',
    'useDebounce',
  ]) {
    assert.equal(typeof hooks[hookName], 'function', `${hookName} is exported`)
  }
})
