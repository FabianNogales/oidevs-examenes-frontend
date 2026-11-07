import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
  sourceRoot,
  ts,
} from '../../../shared/tests/sourceHarness.mjs'

const { AxiosError } = createRequire(import.meta.url)('axios')
const httpError = (status, data = {}) =>
  new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  })
const category = { id: 73, name: 'Catálogo del servidor' }
const event = {
  id: 47,
  title: 'Actividad institucional',
  description: 'Descripción como texto plano.',
  starts_at: '2026-11-05T09:00:00-04:00',
  ends_at: '2026-11-05T11:00:00-04:00',
  all_day: false,
  location: 'Auditorio',
  category,
  status: 'PUBLISHED',
  published_at: '2026-11-01T10:00:00-04:00',
}
const adminEvent = {
  ...event,
  visibility: 'PUBLIC',
  status: 'DRAFT',
  revision: 7,
  created_by: 10,
  updated_by: 10,
}
const page = (data, current = 1, last = 1, total = data.length) => ({
  data,
  meta: { current_page: current, last_page: last, total, per_page: 15 },
})
const byType = (tree, type) => nodes(tree, (node) => node.type === type)
const find = (tree, type, label) =>
  byType(tree, type).find((node) => textContent(node).trim() === label)
const alerts = (tree) =>
  nodes(tree, (node) => node.props?.role === 'alert').map(textContent)

function client(handlers = {}, overrides = {}) {
  const calls = []
  const httpClient = Object.fromEntries(
    ['get', 'post', 'patch', 'delete'].map((method) => [
      method,
      async (...args) => {
        calls.push({ method, args })
        assert.ok(handlers[method], `Unexpected ${method}: ${args[0]}`)
        return handlers[method](...args)
      },
    ]),
  )
  const h = sourceHarness({
    '@/shared/api/httpClient': { httpClient },
    'react-router': { Link: 'link' },
    ...overrides,
  })
  return {
    h,
    calls,
    api: h.load('features/portal-calendar/api/portalCalendarApi.ts'),
  }
}

function calendar(handlers = {}) {
  const c = client(handlers)
  const { InstitutionalCalendar } = c.h.load(
    'features/portal-calendar/components/InstitutionalCalendar.tsx',
  )
  let tree
  const render = () => {
    tree = c.h.render(() => InstitutionalCalendar({ compact: true }))
    return tree
  }
  render()
  return {
    ...c,
    render,
    get tree() {
      return tree
    },
    async ready() {
      await settle()
      return render()
    },
    click(label) {
      const button = byType(tree, 'button').find(
        (node) =>
          node.props['aria-label'] === label ||
          textContent(node).trim() === label,
      )
      assert.ok(button, label)
      assert.ok(!button.props.disabled)
      button.props.onClick()
      render()
    },
  }
}

function editor(handlers = {}, initial = adminEvent, categories = [category]) {
  const c = client(handlers)
  const saved = []
  const busyStates = []
  const dirtyStates = []
  const handleDirty = (value) => dirtyStates.push(value)
  const { EventForm } = c.h.load(
    'features/portal-calendar/components/EventForm.tsx',
  )
  let tree
  const render = () => {
    tree = c.h.render(() =>
      EventForm({
        initial,
        categories,
        onSaved: (value) => saved.push(value),
        onBusy: (value) => busyStates.push(value),
        onDirty: handleDirty,
      }),
    )
    return tree
  }
  const field = (name) => nodes(tree, (node) => node.props?.name === name)[0]
  render()
  return {
    ...c,
    render,
    saved,
    busyStates,
    dirtyStates,
    field,
    get tree() {
      return tree
    },
    edit(name, value) {
      field(name).props.onChange({ target: { value, checked: value } })
      render()
    },
    async submit() {
      byType(tree, 'form')[0].props.onSubmit({ preventDefault() {} })
      render()
      await settle()
      render()
    },
    async click(label) {
      const button = find(tree, 'button', label)
      assert.ok(button, label)
      assert.ok(!button.props.disabled, label)
      button.props.onClick()
      render()
      await settle()
      render()
    },
  }
}

test('public calendar fetches every server page for the interval without requesting private exams or local status filtering', async () => {
  const c = client({
    get: (_url, { params }) => ({
      data: page([{ ...event, id: params.page }], params.page, 3, 3),
    }),
  })
  const result = await c.api.getPublicEvents({
    from: '2026-11-01',
    to: '2026-11-30',
  })
  assert.deepEqual(
    result.map((item) => item.id),
    [1, 2, 3],
  )
  assert.deepEqual(
    c.calls.map((call) => call.args[0]),
    ['/portal/events', '/portal/events', '/portal/events'],
  )
  assert.deepEqual(
    c.calls.map((call) => call.args[1].params),
    [1, 2, 3].map((number) => ({
      from: '2026-11-01',
      to: '2026-11-30',
      page: number,
      per_page: 100,
    })),
  )
})

test('public calendar renders backend data and month navigation requests correct inclusive date intervals', async () => {
  const ui = calendar({
    get: (url) => ({
      data: url.endsWith('event-categories')
        ? { data: [category] }
        : page([event]),
    }),
  })
  await ui.ready()
  assert.ok(find(ui.tree, 'button', event.title))
  assert.ok(textContent(ui.tree).includes(category.name))
  assert.ok(textContent(ui.tree).includes(event.location))
  assert.equal(find(ui.tree, 'link', 'Ver todos').props.to, '/calendar')
  const dates = ui.h.load('features/portal-calendar/utils/calendarDates.ts')
  const initialMonth = dates.boliviaDate().slice(0, 7)
  assert.deepEqual(
    ui.calls.find((call) => call.args[0] === '/portal/events').args[1].params,
    { ...dates.monthInterval(initialMonth), page: 1, per_page: 100 },
  )
  ui.click('Mes siguiente')
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    ...dates.monthInterval(dates.shiftMonth(initialMonth, 1)),
    page: 1,
    per_page: 100,
  })
  ui.click('Mes anterior')
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    ...dates.monthInterval(initialMonth),
    page: 1,
    per_page: 100,
  })
  ui.h.unmount()
})

test('empty events and empty category catalog are normal states without fake options', async () => {
  const ui = calendar({
    get: (url) => ({
      data: url.endsWith('event-categories') ? { data: [] } : page([]),
    }),
  })
  await ui.ready()
  assert.match(
    textContent(ui.tree),
    /No hay eventos institucionales programados para este periodo/,
  )
  assert.match(textContent(ui.tree), /No hay categorías de eventos disponibles/)
  assert.deepEqual(alerts(ui.tree), [])
  assert.equal(byType(ui.tree, 'select').length, 0)
  assert.ok(byType(ui.tree, 'button').length >= 30)
  ui.h.unmount()
})

test('year navigation preserves category, resets the selected day and requests the new interval', async () => {
  const ui = calendar({
    get: (url) => ({
      data: url.endsWith('event-categories')
        ? { data: [category] }
        : page([event]),
    }),
  })
  await ui.ready()
  const dates = ui.h.load('features/portal-calendar/utils/calendarDates.ts')
  const month = dates.boliviaDate().slice(0, 7)
  byType(ui.tree, 'select')[0].props.onChange({ target: { value: '73' } })
  ui.render()
  await ui.ready()
  const date = `${month}-01`
  const count = dates.eventsOnDay([event], date).length
  ui.click(
    `${date.split('-').reverse().join('/')}: ${count} ${count === 1 ? 'actividad' : 'actividades'}`,
  )
  assert.ok(find(ui.tree, 'button', 'Ver todo el mes'))
  ui.click('Año siguiente')
  await ui.ready()
  assert.equal(find(ui.tree, 'button', 'Ver todo el mes'), undefined)
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    ...dates.monthInterval(dates.shiftMonth(month, 12)),
    category_id: 73,
    page: 1,
    per_page: 100,
  })
  ui.click('Año anterior')
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    ...dates.monthInterval(month),
    category_id: 73,
    page: 1,
    per_page: 100,
  })
  assert.ok(textContent(ui.tree).includes(event.description))
  ui.h.unmount()
})

test('category filtering uses arbitrary IDs from the backend and preserves the interval', async () => {
  const ui = calendar({
    get: (url) => ({
      data: url.endsWith('event-categories')
        ? { data: [category] }
        : page([event]),
    }),
  })
  await ui.ready()
  const before = ui.calls.find((call) => call.args[0] === '/portal/events')
    .args[1].params
  assert.equal(find(ui.tree, 'option', category.name).props.value, 73)
  byType(ui.tree, 'select')[0].props.onChange({ target: { value: '73' } })
  ui.render()
  await ui.ready()
  assert.deepEqual(ui.calls.at(-1).args[1].params, {
    ...before,
    category_id: 73,
  })
  byType(ui.tree, 'select')[0].props.onChange({ target: { value: '' } })
  ui.render()
  await ui.ready()
  assert.equal('category_id' in ui.calls.at(-1).args[1].params, false)
  ui.h.unmount()
})

test('category failure does not hide events and permits retry; event failure permits independent retry', async () => {
  let failCategories = true
  let failEvents = false
  const ui = calendar({
    get: (url) => {
      if (url.endsWith('event-categories')) {
        if (failCategories) throw new Error('Network error')
        return { data: { data: [] } }
      }
      if (failEvents) throw new Error('Network error')
      return { data: page([event]) }
    },
  })
  await ui.ready()
  assert.ok(find(ui.tree, 'button', event.title))
  failCategories = false
  ui.click('Reintentar categorías')
  await ui.ready()
  assert.deepEqual(alerts(ui.tree), [])
  failEvents = true
  ui.click('Mes siguiente')
  await ui.ready()
  assert.equal(alerts(ui.tree).length, 1)
  failEvents = false
  ui.click('Reintentar eventos')
  await ui.ready()
  assert.ok(find(ui.tree, 'button', event.title))
  ui.h.unmount()
})

test('stale month responses cannot overwrite the latest interval', async () => {
  const pending = []
  const ui = calendar({
    get: (url) =>
      url.endsWith('event-categories')
        ? { data: { data: [] } }
        : new Promise((done) => pending.push(done)),
  })
  ui.click('Mes siguiente')
  pending[1]({ data: page([{ ...event, title: 'Mes actual' }]) })
  await ui.ready()
  pending[0]({ data: page([{ ...event, title: 'Mes anterior obsoleto' }]) })
  await ui.ready()
  assert.ok(find(ui.tree, 'button', 'Mes actual'))
  assert.equal(find(ui.tree, 'button', 'Mes anterior obsoleto'), undefined)
  ui.h.unmount()
})

test('event selection opens public detail using the documented detail endpoint', async () => {
  const ui = calendar({
    get: (url) => ({
      data: url.endsWith('event-categories') ? { data: [] } : page([event]),
    }),
  })
  await ui.ready()
  ui.click(event.title)
  const dialog = nodes(
    ui.tree,
    (node) =>
      typeof node.type === 'function' && node.props?.eventId === event.id,
  )[0]
  assert.ok(dialog)
  const c = client({ get: () => ({ data: { data: event } }) })
  const { PublicEventDialog } = c.h.load(
    'features/portal-calendar/components/PublicEventDialog.tsx',
  )
  const render = () => c.h.render(() => PublicEventDialog(dialog.props))
  render()
  await settle()
  const tree = render()
  assert.equal(c.calls[0].args[0], '/portal/events/47')
  const details = nodes(tree, (node) => node.props?.event === event)[0]
  assert.ok(details)
  const { EventDetails } = c.h.load(
    'features/portal-calendar/components/EventDetails.tsx',
  )
  const detailTree = EventDetails({
    event: { ...event, description: '<script>texto</script>\nSegunda línea' },
  })
  assert.ok(textContent(detailTree).includes('<script>texto</script>'))
  assert.equal(
    nodes(detailTree, (node) => node.props?.dangerouslySetInnerHTML).length,
    0,
  )
  c.h.unmount()
  ui.h.unmount()
})

test('public detail 404 stays in its modal and exposes a retry', async () => {
  const c = client({
    get: () => {
      throw httpError(404)
    },
  })
  const { PublicEventDialog } = c.h.load(
    'features/portal-calendar/components/PublicEventDialog.tsx',
  )
  let closed = 0
  const render = () =>
    c.h.render(() =>
      PublicEventDialog({ eventId: 47, onClose: () => closed++ }),
    )
  render()
  await settle()
  const tree = render()
  assert.match(textContent(tree), /no existe o ya no está disponible/)
  assert.ok(find(tree, 'button', 'Reintentar'))
  assert.equal(closed, 0)
  c.h.unmount()
})

function adminPage(categories = [category]) {
  const c = client(
    {
      get: (url, options) => ({
        data: url.endsWith('event-categories')
          ? { data: categories }
          : page([adminEvent], options.params.page, 2, 16),
      }),
    },
    {
      '@/features/auth/hooks/useAuth': { useAuth: () => ({ notify() {} }) },
      '@/shared/components/DataTable/DataTable': { DataTable: 'table' },
      '@/shared/components/Breadcrumbs/Breadcrumbs': {
        Breadcrumbs: 'breadcrumbs',
      },
    },
  )
  const { AdminCalendarPage } = c.h.load(
    'features/portal-calendar/pages/AdminCalendarPage.tsx',
  )
  let tree
  const render = () => {
    tree = c.h.render(() => AdminCalendarPage())
    const expand = (node) => {
      if (Array.isArray(node)) return node.map(expand)
      if (!node || typeof node !== 'object') return node
      if (node.type?.name === 'PageHeader') return expand(node.type(node.props))
      return { ...node, props: { ...node.props, children: expand(node.props?.children) } }
    }
    tree = expand(tree)
    return tree
  }
  render()
  return {
    ...c,
    render,
    get tree() {
      return tree
    },
    async ready() {
      await settle()
      return render()
    },
  }
}

test('administration lists backend events, renders calendar status, paginates and offers management without deletion', async () => {
  const ui = adminPage()
  await ui.ready()
  assert.equal(ui.calls[0].args[0], '/admin/portal/event-categories')
  let table = byType(ui.tree, 'table')[0]
  assert.equal(table.props.data[0].title, adminEvent.title)
  assert.equal(
    table.props.columns
      .find((column) => column.id === 'status')
      .cell(table.props.data[0]).props.children,
    'Borrador',
  )
  assert.equal(table.props.onToggleStatus, undefined)
  table.props.onPageChange(2)
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  table = byType(ui.tree, 'table')[0]
  assert.equal(table.props.pagination.from, 16)
  assert.equal(table.props.pagination.to, 16)
  byType(ui.tree, 'input')
    .find((node) => node.props.name === 'search')
    .props.onChange({ target: { value: 'Auditorio' } })
  ui.render()
  byType(ui.tree, 'form')[0].props.onSubmit({ preventDefault() {} })
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 1)
  assert.equal(ui.calls.at(-1).args[1].params.search, 'Auditorio')
  table.props.onViewProfile(table.props.data[0])
  ui.render()
  assert.ok(nodes(ui.tree, (node) => node.props?.eventId === 47)[0])
  ui.h.unmount()
})

test('successful management preserves the page while retaining the active filters', async () => {
  const ui = adminPage()
  await ui.ready()
  let table = byType(ui.tree, 'table')[0]
  table.props.onPageChange(2)
  ui.render()
  await ui.ready()
  table = byType(ui.tree, 'table')[0]
  table.props.onViewProfile(table.props.data[0])
  ui.render()
  const dialog = nodes(ui.tree, (node) => node.props?.eventId === 47)[0]
  dialog.props.onSaved(adminEvent)
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  assert.equal(nodes(ui.tree, (node) => node.props?.eventId === 47).length, 0)
  ui.h.unmount()
})

test('E1.1 the reload after saving keeps the same query rows mounted with aria-busy; other queries do not', async () => {
  const ui = adminPage()
  await ui.ready()
  const table = () => byType(ui.tree, 'table')[0]
  const busy = () =>
    nodes(ui.tree, (node) => node.props?.['aria-busy'] !== undefined)[0].props[
      'aria-busy'
    ]
  table().props.onPageChange(2)
  ui.render()
  await ui.ready()
  const before = table().props.data
  assert.equal(before.length, 1)
  assert.equal(busy(), false)
  table().props.onViewProfile(before[0])
  ui.render()
  nodes(ui.tree, (node) => node.props?.eventId === 47)[0].props.onSaved(
    adminEvent,
  )
  ui.render()
  assert.equal(table().props.loading, false, 'no destructive loader after saving')
  assert.deepEqual(
    table().props.data.map((row) => row.id),
    before.map((row) => row.id),
    'same rows (and keys) stay mounted during the reload',
  )
  assert.equal(table().props.pagination.currentPage, 2, 'pagination is unchanged')
  assert.equal(busy(), true, 'the stale rows are announced as busy')
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.page, 2)
  assert.equal(table().props.loading, false)
  assert.equal(busy(), false, 'fresh data clears aria-busy')

  nodes(ui.tree, (node) => node.props?.name === 'status')[0].props.onChange({
    target: { value: 'PUBLISHED' },
  })
  ui.render()
  assert.equal(table().props.loading, true, 'a filter change shows the loader')
  assert.deepEqual(table().props.data, [], 'no rows from the previous query')
  assert.equal(busy(), false)
  await ui.ready()
  table().props.onRetry()
  ui.render()
  assert.equal(table().props.loading, true, 'a manual reload is not a save refresh')
  assert.deepEqual(table().props.data, [])
  await ui.ready()
  ui.h.unmount()
})

test('E1.2 the status column uses the shared AdminStatusBadge for DRAFT, PUBLISHED and CANCELLED', async () => {
  const ui = adminPage()
  await ui.ready()
  const table = byType(ui.tree, 'table')[0]
  const statusColumn = table.props.columns.find((column) => column.id === 'status')
  const visibilityColumn = table.props.columns.find(
    (column) => column.id === 'visibility',
  )
  assert.equal(statusColumn.header, 'Estado')
  assert.equal(visibilityColumn.header, 'Visibilidad', 'visibility stays a separate column')
  const { AdminStatusBadge } = sourceHarness().load(
    'features/portal-shared/components/AdminStatusBadge.tsx',
  )
  for (const [eventStatus, label] of [
    ['DRAFT', 'Borrador'],
    ['PUBLISHED', 'Publicado'],
    ['CANCELLED', 'Cancelado'],
  ]) {
    const row = { ...table.props.data[0], eventStatus }
    const cell = statusColumn.cell(row)
    assert.equal(cell.type.name, 'AdminStatusBadge')
    assert.equal(cell.props.status, eventStatus)
    assert.equal(cell.props.children, label, 'calendar keeps its Spanish domain label')
    const rendered = AdminStatusBadge(cell.props)
    assert.equal(rendered.type, 'span', 'plain text badge, not an interactive control')
    assert.equal(rendered.props['data-status'], eventStatus)
    assert.equal(rendered.props.role, undefined, 'no live region per row')
    assert.equal(textContent(rendered), label)
    assert.notEqual(visibilityColumn.cell(row).type?.name, 'AdminStatusBadge')
  }
  ui.h.unmount()
})

test('E1.3 Escape with a pending status confirmation cancels only it, keeps the draft and sends nothing', async () => {
  const ui = editor({}, { ...adminEvent, status: 'DRAFT' })
  const escape = (extra = {}) => {
    const event = {
      key: 'Escape',
      defaultPrevented: false,
      nativeEvent: { isComposing: false },
      prevented: 0,
      stopped: 0,
      preventDefault() {
        this.prevented++
      },
      stopPropagation() {
        this.stopped++
      },
      ...extra,
    }
    ui.tree.props.onKeyDown(event)
    ui.render()
    return event
  }
  const confirmation = () =>
    nodes(
      ui.tree,
      (node) => node.props?.['aria-label'] === 'Confirmar cambio de estado',
    )[0]
  let event = escape()
  assert.equal(event.prevented, 0, 'without a pending confirmation Escape reaches the Drawer')
  assert.equal(event.stopped, 0)
  await ui.click('Publicar')
  assert.ok(confirmation(), 'confirmation opened')
  escape({ key: 'Enter' })
  escape({ nativeEvent: { isComposing: true } })
  assert.ok(confirmation(), 'other keys and IME composition do not cancel it')
  event = escape()
  assert.equal(event.prevented, 1, 'Escape never becomes a Drawer close request')
  assert.equal(event.stopped, 1)
  assert.equal(confirmation(), undefined, 'only the confirmation is cancelled')
  assert.equal(ui.field('title').props.value, adminEvent.title, 'form kept')
  assert.equal(ui.calls.filter((call) => call.method === 'patch').length, 0)
  assert.equal(ui.dirtyStates.at(-1), false, 'a pending confirmation does not make the form dirty')
  ui.h.unmount()
})

test('E1.6 unsaved changes disable status actions with an accessible explanation; saving still works', async () => {
  for (const [state, labels] of [
    ['DRAFT', ['Publicar', 'Cancelar evento']],
    ['PUBLISHED', ['Despublicar', 'Cancelar evento']],
    ['CANCELLED', ['Volver a borrador', 'Publicar']],
  ]) {
    const ui = editor(
      {
        patch: (_url, input) => ({
          data: { data: { ...adminEvent, ...input, status: state, revision: 8 } },
        }),
      },
      { ...adminEvent, status: state },
    )
    const actions = () => labels.map((label) => find(ui.tree, 'button', label))
    const hint = () =>
      nodes(
        ui.tree,
        (node) =>
          textContent(node) ===
          'Guarda o descarta los cambios antes de cambiar el estado',
      ).at(-1)
    assert.ok(actions().every((button) => !button.props.disabled), `${state}: enabled when clean`)
    assert.equal(hint(), undefined)
    assert.ok(actions().every((button) => button.props['aria-describedby'] === undefined))

    ui.edit('title', 'Título en edición')
    assert.equal(ui.dirtyStates.at(-1), true)
    const message = hint()
    assert.ok(message?.props.id, `${state}: explanation rendered with an id`)
    for (const button of actions()) {
      assert.equal(button.props.disabled, true, `${state}: ${textContent(button)} disabled while dirty`)
      assert.equal(button.props['aria-describedby'], message.props.id)
    }
    const submit = byType(ui.tree, 'button').find((node) => node.props.type === 'submit')
    assert.equal(submit.props.disabled, false, `${state}: Guardar cambios stays available`)

    ui.edit('title', adminEvent.title)
    assert.equal(ui.dirtyStates.at(-1), false)
    assert.ok(actions().every((button) => !button.props.disabled), `${state}: enabled again when clean`)
    assert.equal(hint(), undefined)

    ui.edit('title', 'Título guardado')
    await ui.submit()
    const patches = ui.calls.filter((call) => call.method === 'patch')
    assert.equal(patches.length, 1)
    assert.equal(patches[0].args[0], `/admin/portal/events/${adminEvent.id}`, 'content save, never /status')
    assert.equal(patches[0].args[1].title, 'Título guardado')
    assert.equal(ui.saved.length, 1)
    ui.h.unmount()
  }
})

test('F1.1 Drawer status uses AdminStatusBadge and visibility is a separate, outlined/neutral pill in Drawer and table', async () => {
  const statusBadges = (tree) =>
    nodes(tree, (node) => node.type?.name === 'AdminStatusBadge')
  const visibilityPills = (tree) =>
    nodes(tree, (node) => node.props?.['data-visibility'] !== undefined)
  for (const [status, label] of [
    ['DRAFT', 'Borrador'],
    ['PUBLISHED', 'Publicado'],
    ['CANCELLED', 'Cancelado'],
  ]) {
    for (const [visibility, visibilityLabel] of [
      ['PUBLIC', 'Público'],
      ['PRIVATE', 'Privado'],
    ]) {
      const ui = editor({}, { ...adminEvent, status, visibility })
      const [badge] = statusBadges(ui.tree)
      assert.equal(badge.props.status, status)
      assert.equal(badge.props.children, label)
      assert.equal(
        nodes(ui.tree, (node) => node.props?.['data-status'] !== undefined).length,
        0,
        'no calendar-local status badge remains',
      )
      const pills = visibilityPills(ui.tree)
      assert.equal(pills.length, 1)
      assert.equal(pills[0].props['data-visibility'], visibility)
      assert.equal(textContent(pills[0]), visibilityLabel)
      assert.match(
        textContent(ui.tree),
        new RegExp(`Estado: ${label} · Revisión: ${adminEvent.revision}.*Visibilidad: ${visibilityLabel}`, 's'),
      )
      ui.h.unmount()
    }
  }
  const created = editor({}, null)
  assert.deepEqual(
    statusBadges(created.tree).map((node) => [node.props.status, node.props.children]),
    [['DRAFT', 'Borrador']],
  )
  created.h.unmount()

  const page = adminPage()
  await page.ready()
  const table = byType(page.tree, 'table')[0]
  const visibilityColumn = table.props.columns.find((column) => column.id === 'visibility')
  for (const [visibility, visibilityLabel] of [
    ['PUBLIC', 'Público'],
    ['PRIVATE', 'Privado'],
  ]) {
    const cell = visibilityColumn.cell({ ...table.props.data[0], visibility })
    assert.equal(cell.props['data-visibility'], visibility, 'table and Drawer share the marker')
    assert.equal(cell.props.children, visibilityLabel)
    assert.equal(cell.props['data-status'], undefined)
  }
  page.h.unmount()

  const css = readFileSync(
    resolve(sourceRoot, 'features/portal-calendar/pages/portalCalendar.module.css'),
    'utf8',
  )
  assert.doesNotMatch(css, /\.badge\[data-status/, 'unused local status rules removed')
  const publicRule = css.match(/\.badge\[data-visibility='PUBLIC'\]\s*\{([^}]*)\}/)?.[1]
  assert.ok(publicRule, 'Público has its own rule')
  assert.match(publicRule, /box-shadow:\s*inset 0 0 0 1px/, 'outline: a non-color cue')
  assert.doesNotMatch(publicRule, /success|error/, 'no success/error colors for visibility')
  assert.doesNotMatch(css, /data-visibility='PRIVATE'/, 'Privado keeps the neutral base badge')
})

test('F2.2 admin breadcrumb matches the page title and keeps the home link', async () => {
  const ui = adminPage()
  await ui.ready()
  const crumbs = byType(ui.tree, 'breadcrumbs')[0]
  assert.deepEqual(crumbs.props.items, [
    { label: 'Inicio', to: '/' },
    { label: 'Gestión del calendario' },
  ])
  assert.equal(textContent(byType(ui.tree, 'h1')[0]), 'Gestión del calendario')
  ui.h.unmount()
})

test('F2.1 admin calendar page uses the shared content width; the public page is unaffected', () => {
  const css = readFileSync(
    resolve(sourceRoot, 'features/portal-calendar/pages/portalCalendar.module.css'),
    'utf8',
  )
  const rule = css.match(/(?:^|\n)\.page\s*\{([^}]*)\}/)?.[1]
  assert.ok(rule, 'local .page rule')
  assert.match(rule, /max-width:\s*var\(--content-max-width\)/)
  assert.match(rule, /margin-inline:\s*auto/)
  assert.doesNotMatch(rule, /padding/, 'no duplicated padding')
  const admin = readFileSync(
    resolve(sourceRoot, 'features/portal-calendar/pages/AdminCalendarPage.tsx'),
    'utf8',
  )
  const publicPage = readFileSync(
    resolve(sourceRoot, 'features/portal-calendar/pages/CalendarPage.tsx'),
    'utf8',
  )
  assert.match(admin, /<PageContainer>/)
  assert.doesNotMatch(publicPage, /styles\.page\b/, 'public calendar keeps publicPage')
})

test('E1.4 date cell has one container and the mobile action button may wrap inside the card', async () => {
  const ui = adminPage()
  await ui.ready()
  const table = byType(ui.tree, 'table')[0]
  assert.equal(table.props.viewActionLabel, 'Gestionar', 'accessible label unchanged')
  const dateColumn = table.props.columns.find((column) => column.id === 'date')
  const sameDay = {
    ...table.props.data[0],
    all_day: false,
    starts_at: '2026-11-05T09:00:00-04:00',
    ends_at: '2026-11-05T11:00:00-04:00',
  }
  const cell = dateColumn.cell(sameDay)
  assert.equal(cell.type, 'div', 'a single element child keeps date and time together')
  const [time, hours] = [cell.props.children].flat().filter(Boolean)
  assert.equal(time.type, 'time')
  assert.equal(time.props.dateTime, sameDay.starts_at)
  assert.equal(textContent(hours), '09:00 – 11:00')
  const multiDay = dateColumn.cell({
    ...sameDay,
    ends_at: '2026-11-07T11:00:00-04:00',
  })
  assert.equal(typeof multiDay, 'string', 'multi-day label stays plain text')
  ui.h.unmount()

  const css = readFileSync(
    resolve(sourceRoot, 'features/portal-calendar/pages/portalCalendar.module.css'),
    'utf8',
  )
  const mobile = css.slice(css.lastIndexOf('@media (max-width: 600px)'))
  assert.match(
    mobile,
    /\.adminTable td\[data-label='Acciones'\]\s*\{[^}]*white-space:\s*normal/,
  )
  assert.match(
    mobile,
    /\.adminTable td\[data-label='Acciones'\] button\s*\{[^}]*max-width:\s*100%;[^}]*height:\s*auto;[^}]*white-space:\s*normal/,
  )
  assert.doesNotMatch(
    css.slice(0, css.lastIndexOf('@media (max-width: 600px)')),
    /td\[data-label='Acciones'\]/,
    'desktop styles are unchanged',
  )
})

test('server pagination remains readable when concurrent changes shorten the result set', async () => {
  const c = client({ get: () => ({ data: page([], 2, 1, 15) }) })
  const result = await c.api.getAdminEvents({ page: 2 })
  assert.equal(result.meta.last_page, 1)
  assert.deepEqual(result.data, [])
})

test('admin creation is clearly disabled when the backend category catalog is empty', async () => {
  const ui = adminPage([])
  await ui.ready()
  assert.equal(find(ui.tree, 'button', 'Crear evento').props.disabled, true)
  assert.match(textContent(ui.tree), /No hay categorías de eventos disponibles/)
  assert.ok(byType(ui.tree, 'table')[0].props.data.length)
  ui.h.unmount()
})

test('admin state/category filters use server values and reset pagination', async () => {
  const ui = adminPage()
  await ui.ready()
  byType(ui.tree, 'table')[0].props.onPageChange(2)
  ui.render()
  await ui.ready()
  nodes(ui.tree, (node) => node.props?.name === 'status')[0].props.onChange({
    target: { value: 'PUBLISHED' },
  })
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.status, 'PUBLISHED')
  assert.equal(ui.calls.at(-1).args[1].params.page, 1)
  nodes(
    ui.tree,
    (node) => node.props?.name === 'category_id',
  )[0].props.onChange({ target: { value: '73' } })
  ui.render()
  await ui.ready()
  assert.equal(ui.calls.at(-1).args[1].params.category_id, 73)
  ui.h.unmount()
})

test('creation sends documented fields, offset and seconds without a state; backend returns DRAFT', async () => {
  const ui = editor(
    { post: () => ({ data: { data: { ...adminEvent, revision: 1 } } }) },
    null,
  )
  assert.equal(ui.dirtyStates[0], false)
  ui.edit('title', '  Nuevo evento  ')
  assert.equal(ui.dirtyStates.at(-1), true)
  ui.edit('description', 'Contenido institucional')
  ui.edit('starts_at', '2026-11-05')
  ui.edit('starts_at_time', '09:00')
  ui.edit('ends_at', '2026-11-05')
  ui.edit('ends_at_time', '11:00')
  ui.edit('category_id', '73')
  await ui.submit()
  assert.deepEqual(ui.calls[0].args, [
    '/admin/portal/events',
    {
      title: 'Nuevo evento',
      description: 'Contenido institucional',
      starts_at: '2026-11-05T09:00:00-04:00',
      ends_at: '2026-11-05T11:00:00-04:00',
      all_day: false,
      location: null,
      category_id: 73,
      visibility: 'PUBLIC',
    },
  ])
  assert.equal(ui.saved[0].status, 'DRAFT')
  assert.equal(ui.saved[0].revision, 1)
  assert.equal(ui.dirtyStates.at(-1), false)
  ui.h.unmount()
})

test('empty categories and manipulated category IDs cannot create an event', async () => {
  const empty = editor({}, null, [])
  assert.equal(
    find(empty.tree, 'button', 'Guardar borrador').props.disabled,
    true,
  )
  assert.equal(byType(empty.tree, 'fieldset')[0].props.disabled, true)
  await empty.submit()
  assert.equal(empty.calls.length, 0)
  empty.h.unmount()
  const ui = editor({}, null)
  ui.edit('category_id', '999999')
  await ui.submit()
  assert.equal(ui.calls.length, 0)
  assert.match(alerts(ui.tree).join(' '), /Selecciona una categoría disponible/)
  ui.h.unmount()
})

test('editing fetches current admin detail and saves its revision without changing status or internal fields', async () => {
  const c = client({ get: () => ({ data: { data: adminEvent } }) })
  const { AdminEventDialog } = c.h.load(
    'features/portal-calendar/components/AdminEventDialog.tsx',
  )
  const render = () =>
    c.h.render(() =>
      AdminEventDialog({
        eventId: 47,
        categories: [category],
        onClose() {},
        onSaved() {},
      }),
    )
  render()
  await settle()
  const detail = render()
  assert.equal(c.calls[0].args[0], '/admin/portal/events/47')
  assert.ok(nodes(detail, (node) => node.props?.initial?.revision === 7)[0])
  c.h.unmount()
  const ui = editor({
    patch: () => ({ data: { data: { ...adminEvent, revision: 8 } } }),
  })
  ui.edit('title', 'Cambio de título')
  await ui.submit()
  const [url, body] = ui.calls[0].args
  assert.equal(url, '/admin/portal/events/47')
  assert.equal(body.revision, 7)
  assert.equal(body.title, 'Cambio de título')
  for (const key of ['status', 'published_at', 'created_by', 'updated_by'])
    assert.equal(key in body, false)
  assert.equal(ui.saved[0].revision, 8)
  ui.h.unmount()
})

for (const eventId of [null, 47]) {
  test(`${eventId === null ? 'creation' : 'editing'} confirms only real unsaved changes and preserves the form when continuing`, async () => {
    let closed = 0
    const c = client(
      eventId === null ? {} : { get: () => ({ data: { data: adminEvent } }) },
    )
    const { AdminEventDialog } = c.h.load(
      'features/portal-calendar/components/AdminEventDialog.tsx',
    )
    let tree
    const render = () => {
      tree = c.h.render(() =>
        AdminEventDialog({
          eventId,
          categories: [category],
          onClose: () => closed++,
          onSaved() {},
        }),
      )
      return tree
    }
    const form = () => nodes(tree, (node) => node.type?.name === 'EventForm')[0]
    const confirmation = () =>
      nodes(tree, (node) => node.type?.name === 'UnsavedChangesDialog')[0]

    render()
    await settle()
    render()
    assert.equal(confirmation().props.open, false)

    nodes(
      tree,
      (node) => node.type?.name === 'CalendarModal',
    )[0].props.onClose()
    render()
    assert.equal(closed, 1, 'closing an untouched form is immediate')

    form().props.onDirty(true)
    render()
    const sameInitial = form().props.initial
    nodes(
      tree,
      (node) => node.type?.name === 'CalendarModal',
    )[0].props.onClose()
    render()
    assert.equal(closed, 1)
    assert.equal(confirmation().props.open, true)

    confirmation().props.onContinue()
    render()
    assert.equal(confirmation().props.open, false)
    assert.equal(form().props.initial, sameInitial)

    form().props.onCancel()
    render()
    assert.equal(confirmation().props.open, true)
    confirmation().props.onDiscard()
    assert.equal(closed, 2)
    c.h.unmount()
  })
}

test('409 keeps draft/revision, blocks writes, and only explicit reload discards draft before a new submission', async () => {
  let fail = true
  const current = {
    ...adminEvent,
    title: 'Versión actual del servidor',
    revision: 11,
  }
  const ui = editor({
    patch: () => {
      if (fail) throw httpError(409, { current_revision: 99 })
      return { data: { data: { ...current, revision: 12 } } }
    },
    get: () => ({ data: { data: current } }),
  })
  ui.edit('title', 'Mi borrador sin guardar')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Mi borrador sin guardar')
  assert.match(alerts(ui.tree).join(' '), /modificado por otro usuario/)
  assert.match(textContent(ui.tree), /Revisión: 7/)
  assert.equal(find(ui.tree, 'button', 'Guardar cambios').props.disabled, true)
  await ui.submit()
  assert.equal(ui.calls.length, 1, 'No automatic retry or refresh')
  await ui.click('Recargar evento y descartar cambios')
  assert.equal(ui.calls.length, 2)
  assert.equal(ui.calls[1].method, 'get')
  assert.equal(ui.field('title').props.value, current.title)
  assert.match(textContent(ui.tree), /Revisión: 11/)
  assert.deepEqual(ui.saved, [])
  fail = false
  ui.edit('title', 'Cambio revisado')
  await ui.submit()
  assert.equal(ui.calls.at(-1).args[1].revision, 11)
  assert.equal(ui.calls.at(-1).args[1].title, 'Cambio revisado')
  ui.h.unmount()
})

test('failed reload after conflict keeps draft and writes locked', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409)
    },
    get: () => {
      throw new Error('Network error')
    },
  })
  ui.edit('description', 'Texto que debo conservar')
  await ui.submit()
  await ui.click('Recargar evento y descartar cambios')
  assert.equal(ui.field('description').props.value, 'Texto que debo conservar')
  assert.equal(find(ui.tree, 'button', 'Guardar cambios').props.disabled, true)
  assert.match(textContent(ui.tree), /Revisión: 7/)
  assert.deepEqual(ui.saved, [])
  ui.h.unmount()
})

for (const [state, label, next] of [
  ['DRAFT', 'Publicar', 'PUBLISHED'],
  ['PUBLISHED', 'Despublicar', 'DRAFT'],
  ['DRAFT', 'Cancelar evento', 'CANCELLED'],
  ['PUBLISHED', 'Cancelar evento', 'CANCELLED'],
  ['CANCELLED', 'Publicar', 'PUBLISHED'],
  ['CANCELLED', 'Volver a borrador', 'DRAFT'],
]) {
  test(`${state}: ${label} confirms and sends PATCH /status with the current revision`, async () => {
    const ui = editor(
      {
        patch: () => ({
          data: { data: { ...adminEvent, status: next, revision: 8 } },
        }),
      },
      { ...adminEvent, status: state },
    )
    assert.equal(
      find(
        ui.tree,
        'button',
        state === 'PUBLISHED'
          ? 'Publicar'
          : state === 'DRAFT'
            ? 'Despublicar'
            : 'Cancelar evento',
      ),
      undefined,
    )
    await ui.click(label)
    assert.equal(
      ui.calls.length,
      0,
      'State change requires explicit confirmation',
    )
    await ui.click('Confirmar cambio')
    assert.deepEqual(ui.calls[0].args, [
      '/admin/portal/events/47/status',
      { status: next, revision: 7 },
    ])
    assert.equal(ui.saved[0].status, next)
    ui.h.unmount()
  })
}

test('409 on a status change blocks another transition and never adopts current_revision silently', async () => {
  const ui = editor({
    patch: () => {
      throw httpError(409, { current_revision: 55 })
    },
  })
  await ui.click('Publicar')
  await ui.click('Confirmar cambio')
  assert.match(alerts(ui.tree).join(' '), /modificado por otro usuario/)
  assert.equal(find(ui.tree, 'button', 'Confirmar cambio').props.disabled, true)
  assert.equal(ui.calls.length, 1)
  assert.equal(ui.calls[0].args[1].revision, 7)
  ui.h.unmount()
})

test('422 shows specific field validation and preserves all form values', async () => {
  const message = 'El fin debe ser posterior al inicio.'
  const ui = editor({
    patch: () => {
      throw httpError(422, {
        message: 'Validación general.',
        errors: { ends_at: [message], title: ['Revisa el título.'] },
      })
    },
  })
  ui.edit('title', 'Mi título')
  await ui.submit()
  assert.equal(ui.field('title').props.value, 'Mi título')
  assert.equal(ui.field('ends_at').props['aria-invalid'], true)
  assert.ok(textContent(ui.tree).includes(message))
  assert.ok(textContent(ui.tree).includes('Revisa el título.'))
  assert.doesNotMatch(alerts(ui.tree).join(' '), /Validación general/)
  assert.deepEqual(ui.saved, [])
  ui.h.unmount()
})

for (const status of [401, 403, 404, 409, 422, 500]) {
  test(`HTTP ${status} keeps the standard calendar error flow`, () => {
    const { api } = client()
    const failure = api.getCalendarError(
      httpError(status, { message: 'Validación concreta.' }),
    )
    assert.equal(failure.status, status)
    assert.ok(failure.message)
    if (status === 422) assert.equal(failure.message, 'Validación concreta.')
  })
}

test('Bolivia intervals handle leap years, December/January and offsets without shifting civil dates', () => {
  const { h } = client()
  const dates = h.load('features/portal-calendar/utils/calendarDates.ts')
  assert.deepEqual(dates.monthInterval('2028-02'), {
    from: '2028-02-01',
    to: '2028-02-29',
  })
  assert.equal(dates.shiftMonth('2026-12', 1), '2027-01')
  assert.equal(dates.shiftMonth('2027-01', -1), '2026-12')
  assert.equal(
    dates.boliviaDate(new Date('2026-11-01T02:00:00Z')),
    '2026-10-31',
  )
  assert.equal(
    dates.boliviaInput('2026-11-06T02:30:15Z'),
    '2026-11-05T22:30:15',
  )
  assert.equal(
    dates.inputToIso('2026-11-05T22:30', false),
    '2026-11-05T22:30:00-04:00',
  )
  assert.equal(dates.monthDays('2026-11').length % 7, 0)
})

test('all-day and multi-day events overlap months with inclusive start/exclusive end', () => {
  const { h } = client()
  const dates = h.load('features/portal-calendar/utils/calendarDates.ts')
  const spanning = {
    ...event,
    all_day: true,
    starts_at: '2026-10-31T00:00:00-04:00',
    ends_at: '2026-11-03T00:00:00-04:00',
  }
  assert.equal(dates.eventsOnDay([spanning], '2026-10-30').length, 0)
  for (const day of ['2026-10-31', '2026-11-01', '2026-11-02'])
    assert.equal(dates.eventsOnDay([spanning], day).length, 1)
  assert.equal(dates.eventsOnDay([spanning], '2026-11-03').length, 0)
  assert.match(dates.eventDateLabel(spanning), /Día completo/)
  const oneDay = {
    ...spanning,
    starts_at: '2026-11-05T00:00:00-04:00',
    ends_at: '2026-11-06T00:00:00-04:00',
  }
  assert.doesNotMatch(dates.eventDateLabel(oneDay), /6 nov/)
  assert.equal(
    dates.inputToIso('2026-11-06', true),
    '2026-11-06T00:00:00-04:00',
  )
  const timed = {
    ...event,
    starts_at: '2026-11-01T23:00:00-04:00',
    ends_at: '2026-11-02T00:00:00-04:00',
  }
  assert.equal(dates.eventsOnDay([timed], '2026-11-01').length, 1)
  assert.equal(dates.eventsOnDay([timed], '2026-11-02').length, 0)
})

test('all-day form submits midnight endpoints and the explicit exclusive end date', async () => {
  const ui = editor({ post: () => ({ data: { data: adminEvent } }) }, null)
  ui.edit('title', 'Jornada completa')
  ui.edit('description', 'Actividad')
  ui.edit('category_id', '73')
  ui.edit('all_day', true)
  ui.edit('starts_at', '2026-11-05')
  ui.edit('ends_at', '2026-11-06')
  assert.equal(ui.field('starts_at').props.type, 'date')
  assert.match(textContent(ui.tree), /fin exclusivo/)
  await ui.submit()
  assert.equal(ui.calls[0].args[1].starts_at, '2026-11-05T00:00:00-04:00')
  assert.equal(ui.calls[0].args[1].ends_at, '2026-11-06T00:00:00-04:00')
  assert.equal(ui.calls[0].args[1].all_day, true)
  ui.h.unmount()
})

test('calendar UI/API contain no physical deletion or raw HTML injection', () => {
  const root = resolve(sourceRoot, 'features/portal-calendar')
  const sources = readdirSync(root, { recursive: true }).filter((file) =>
    /\.tsx?$/.test(file),
  )
  for (const file of sources) {
    assert.doesNotMatch(
      readFileSync(resolve(root, file), 'utf8'),
      /httpClient\.delete|dangerouslySetInnerHTML|Eliminar evento|Borrar evento/,
    )
  }
})

test('responsive contract uses seven shrinkable calendar columns, bounded dialogs and single-column mobile forms', () => {
  const css =
    readFileSync(
      resolve(sourceRoot, 'features/portal-calendar/pages/portalCalendar.module.css'),
      'utf8',
    ) +
    readFileSync(
      resolve(
        sourceRoot,
        'shared/components/PortalDialog/PortalDialog.module.css',
      ),
      'utf8',
    )
  assert.match(css, /repeat\(7, minmax\(0, 1fr\)\)/)
  assert.match(css, /max-width: calc\(100vw - 32px\)/)
  assert.match(css, /max-height: calc\(100dvh - 32px\)/)
  assert.match(css, /@media \(max-width: 768px\)/)
  assert.match(css, /@media \(max-width: 480px\)/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/)
})

test('public route and admin route integrate without changing the existing authorization boundaries', () => {
  const source = readFileSync(
    resolve(sourceRoot, 'app/router/router.tsx'),
    'utf8',
  )
  const ast = ts.createSourceFile(
    'router.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const routes = []
  function visit(node, parents = []) {
    if (ts.isObjectLiteralExpression(node)) {
      const path = node.properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(ast) === 'path',
      )
      const element = node.properties.find(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(ast) === 'element',
      )
      const next = [
        ...parents,
        element?.initializer.getText(ast) ??
          path?.initializer.getText(ast) ??
          '',
      ]
      if (
        path &&
        ["'calendar'", "'portal/events'"].includes(
          path.initializer.getText(ast),
        )
      )
        routes.push({ path: path.initializer.text, parents })
      ts.forEachChild(node, (child) => visit(child, next))
    } else ts.forEachChild(node, (child) => visit(child, parents))
  }
  visit(ast)
  const publicRoute = routes.find((route) => route.path === 'calendar')
  const adminRoute = routes.find((route) => route.path === 'portal/events')
  assert.ok(publicRoute)
  assert.ok(
    !publicRoute.parents.some((parent) => parent.includes('ProtectedRoute')),
  )
  assert.ok(
    adminRoute.parents.some((parent) =>
      parent.includes("allowedRoles={['ADMINISTRADOR']}"),
    ),
  )
})

test('client validation rejects equal and reversed event times without sending a request', async () => {
  for (const end of ['09:00', '08:00']) {
    const ui = editor({}, adminEvent)
    ui.edit('ends_at_time', end)
    await ui.submit()
    assert.equal(ui.calls.length, 0)
    assert.equal(ui.field('ends_at').props['aria-invalid'], true)
    assert.match(textContent(ui.tree), /El fin debe ser posterior al inicio/)
    ui.h.unmount()
  }
})
