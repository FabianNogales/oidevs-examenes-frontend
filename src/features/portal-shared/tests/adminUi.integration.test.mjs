import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

test('administrative badges expose domain labels without changing the input state', () => {
  const h = sourceHarness()
  const { AdminStatusBadge } = h.load(
    'features/portal-shared/AdminStatusBadge.tsx',
  )
  for (const [status, label] of Object.entries({
    PUBLISHED: 'Publicado',
    DRAFT: 'Borrador',
    UNPUBLISHED: 'Despublicado',
    ARCHIVED: 'Archivado',
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    PENDING_CHANGES: 'Cambios pendientes',
  })) {
    const badge = AdminStatusBadge({ status })
    assert.equal(textContent(badge), label)
    assert.equal(badge.props['data-status'], status)
  }
  assert.equal(
    textContent(
      AdminStatusBadge({
        status: 'PENDING_CHANGES',
        children: 'Requiere revisión',
      }),
    ),
    'Requiere revisión',
  )
})

test('collection keeps rows mounted only while a save refresh reloads the same query', async () => {
  const h = sourceHarness({ 'react-router': { Link: 'link' } })
  const { PortalAdminCollection } = h.load(
    'features/portal-shared/PortalAdminCollection.tsx',
  )
  const pending = []
  const requests = []
  const load = (query, signal) =>
    new Promise((resolve) => {
      requests.push(query)
      pending.push({ query, signal, resolve })
    })
  const respond = (names, index = pending.length - 1) => {
    const { query, resolve } = pending[index]
    resolve({
      data: names.map((name, offset) => ({ id: offset + 1, name })),
      meta: { current_page: query.page, last_page: 2, total: 20, per_page: 15 },
    })
  }
  let version = 0
  let resetPageKey = ''
  let tree
  const render = () =>
    (tree = h.render(() =>
      PortalAdminCollection({
        title: 'Contenido',
        columns: [],
        load,
        version,
        resetPageKey,
        onSelect() {},
      }),
    ))
  const table = () => nodes(tree, (node) => node.type?.name === 'DataTable')[0]
  const busy = () =>
    nodes(tree, (node) => node.props?.['aria-busy'] !== undefined)[0].props[
      'aria-busy'
    ]
  const rows = () => table().props.data.map((row) => [row.id, row.item.name])
  const flush = async () => {
    render()
    await settle()
    render()
  }

  render()
  assert.equal(table().props.loading, true, 'first load keeps the loader')
  respond(['Inicial', 'Segundo'])
  await flush()
  assert.deepEqual(rows(), [[1, 'Inicial'], [2, 'Segundo']])
  assert.equal(busy(), false)

  version = 1
  await flush()
  assert.equal(table().props.loading, false, 'save refresh avoids the destructive loader')
  assert.deepEqual(rows(), [[1, 'Inicial'], [2, 'Segundo']], 'same rows and keys stay mounted')
  assert.equal(busy(), true, 'the stale rows are announced as busy')
  assert.equal(table().props.pagination.currentPage, 1)
  respond(['Actualizado', 'Segundo'])
  await flush()
  assert.deepEqual(rows(), [[1, 'Actualizado'], [2, 'Segundo']], 'fresh data replaces the stale rows')
  assert.equal(busy(), false)

  table().props.onSearch('otro')
  await flush()
  assert.equal(table().props.loading, true, 'search shows the loader')
  assert.deepEqual(rows(), [])
  assert.equal(busy(), false)
  respond(['Otro'])
  await flush()

  table().props.onPageChange(2)
  await flush()
  assert.equal(table().props.loading, true, 'pagination shows the loader')
  assert.deepEqual(rows(), [])
  respond(['Página dos'])
  await flush()

  version = 2
  await flush()
  assert.equal(requests.at(-1).page, 1)
  assert.equal(table().props.loading, true, 'a save refresh from page 2 changes the page, so no stale rows')
  assert.deepEqual(rows(), [])
  respond(['Primera'])
  await flush()

  resetPageKey = 'ACTIVE'
  await flush()
  assert.equal(table().props.loading, true, 'filter changes show the loader')
  assert.deepEqual(rows(), [])
  const filterRequest = pending.length - 1
  version = 3
  await flush()
  assert.equal(pending[filterRequest].signal.aborted, true, 'the superseded request is aborted')
  respond(['Obsoleta'], filterRequest)
  await flush()
  assert.equal(table().props.loading, true, 'an obsolete response is ignored')
  assert.deepEqual(rows(), [])
  respond(['Vigente'])
  await flush()
  assert.deepEqual(rows(), [[1, 'Vigente']])
  h.unmount()
})

test('collection opt-in filter slot retains search and resets pagination without remounting', async () => {
  const requests = []
  const h = sourceHarness({
    'react-router': { Link: 'link' },
  })
  const { PortalAdminCollection } = h.load(
    'features/portal-shared/PortalAdminCollection.tsx',
  )
  let resetPageKey = 'DRAFT'
  let tree
  const load = async (query) => {
    requests.push(query)
    return {
      data: [],
      meta: { current_page: query.page, last_page: 3, total: 30, per_page: 15 },
    }
  }
  const filter = { type: 'select', props: { name: 'state' } }
  const render = () =>
    (tree = h.render(() =>
      PortalAdminCollection({
        title: 'Contenido',
        description: 'Descripción',
        columns: [],
        load,
        version: 0,
        resetPageKey,
        filters: filter,
        onSelect() {},
        onCreate() {},
        createLabel: 'Crear contenido',
      }),
    ))
  const table = () => nodes(tree, (node) => node.type?.name === 'DataTable')[0]
  render()
  await settle()
  render()
  assert.equal(table().props.filters, filter)
  assert.match(textContent(tree), /Descripción.*Crear contenido/)
  table().props.onSearch('auditorio')
  render()
  await settle()
  render()
  table().props.onPageChange(2)
  render()
  await settle()
  render()
  assert.equal(requests.at(-1).page, 2)
  resetPageKey = 'PUBLISHED'
  render()
  await settle()
  render()
  assert.equal(requests.at(-1).page, 1)
  assert.equal(requests.at(-1).search, 'auditorio')
  resetPageKey = 'DRAFT'
  render()
  await settle()
  render()
  assert.equal(
    requests.at(-1).page,
    1,
    'returning to the original filter cannot revive page two',
  )
  assert.equal(requests.at(-1).search, 'auditorio')
  h.unmount()
})

test('DataTable groups optional filters without nesting them in the search form', () => {
  const h = sourceHarness({ 'react-router': { useNavigate: () => () => {} } })
  const { DataTable } = h.load('shared/components/DataTable/DataTable.tsx')
  const filter = { type: 'select', props: { name: 'state' } }
  const tree = h.render(() =>
    DataTable({
      columns: [],
      data: [],
      loading: false,
      filters: filter,
      onSearch() {},
    }),
  )
  assert.equal(
    nodes(tree, (node) => node.props?.role === 'group')[0].props.children,
    filter,
  )
  assert.equal(
    nodes(
      nodes(tree, (node) => node.type === 'form')[0],
      (node) => node.type === 'select',
    ).length,
    0,
  )
  h.unmount()
})

test('DataTable opt-in inline layout keeps filters beside the search form', () => {
  const h = sourceHarness({ 'react-router': { useNavigate: () => () => {} } })
  const { DataTable } = h.load('shared/components/DataTable/DataTable.tsx')
  const filter = { type: 'select', props: { name: 'state' } }
  const tree = h.render(() =>
    DataTable({
      columns: [],
      data: [],
      loading: false,
      filters: filter,
      filterLayout: 'inline',
      onSearch() {},
    }),
  )
  const toolbar = nodes(tree, (node) =>
    String(node.props?.className ?? '')
      .split(' ')
      .includes('searchToolbar'),
  )[0]
  assert.ok(toolbar, 'inline toolbar')
  assert.equal(
    nodes(toolbar, (node) => node.props?.role === 'group')[0].props.children,
    filter,
  )
  assert.equal(
    nodes(
      nodes(toolbar, (node) => node.type === 'form')[0],
      (node) => node.type === 'select',
    ).length,
    0,
  )
  h.unmount()
})

test('shared Drawer owns focus, busy dismissal, scroll lock and a footer outside its body', () => {
  const h = sourceHarness()
  const { PortalDialog } = h.load(
    'shared/components/PortalDialog/PortalDialog.tsx',
  )
  const launcher = new h.Element()
  launcher.focus()
  let closed = 0
  let busy = false
  const modal = new h.Element({
    showModal() {
      this.open = true
    },
    close() {
      this.open = false
    },
  })
  const close = new h.Element()
  const render = () =>
    h.render(
      () =>
        PortalDialog({
          title: 'Editor',
          drawer: true,
          busy,
          children: 'Contenido largo',
          footer: 'Guardar',
          onClose: () => closed++,
        }),
      (tree) => {
        tree.props.ref.current = modal
        nodes(tree, (node) => node.type === 'button')[0].props.ref.current =
          close
      },
    )
  let tree = render()
  assert.equal(modal.open, true)
  assert.equal(h.document.activeElement, close)
  assert.equal(h.document.body.style.overflow, 'hidden')
  assert.equal(
    nodes(tree, (node) => node.type === 'footer')[0].props.children,
    'Guardar',
  )
  const cancel = { preventDefault() {}, stopPropagation() {} }
  tree.props.onCancel(cancel)
  assert.equal(closed, 1)
  busy = true
  tree = render()
  tree.props.onCancel(cancel)
  assert.equal(closed, 1)
  h.unmount()
  assert.equal(modal.open, false)
  assert.equal(h.document.activeElement, launcher)
  assert.equal(h.document.body.style.overflow, '')
})

test('shared Drawer handles its own Escape before the native close request and recovers from native closes', () => {
  const h = sourceHarness()
  const { PortalDialog } = h.load(
    'shared/components/PortalDialog/PortalDialog.tsx',
  )
  let closed = 0
  let closeBlocked = false
  const nested = new h.Element({
    open: true,
    calls: [],
    handled: true,
    close() {
      this.open = false
      this.calls.push('close')
    },
    showModal() {
      this.open = true
      this.calls.push('showModal')
    },
    dispatchEvent(event) {
      this.calls.push(`${event.type}:${event.cancelable}`)
      if (this.handled) event.preventDefault()
      return !event.defaultPrevented
    },
  })
  const modal = new h.Element({
    children: [nested],
    showModal() {
      this.open = true
    },
    close() {
      this.open = false
    },
    querySelectorAll: () => [nested],
  })
  const render = () =>
    h.render(
      () =>
        PortalDialog({
          title: 'Editor',
          drawer: true,
          closeBlocked,
          children: 'Contenido',
          onClose: () => closed++,
        }),
      (tree) => {
        tree.props.ref.current = modal
      },
    )
  let tree = render()
  const own = { closest: () => modal }
  const escape = (target, extra = {}) => {
    const event = {
      key: 'Escape',
      target,
      currentTarget: modal,
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
    tree.props.onKeyDown(event)
    return event
  }
  let event = escape(own)
  assert.equal(closed, 1)
  assert.equal(event.prevented, 1, 'Escape never reaches the native close request')
  assert.equal(event.stopped, 1)
  event = escape({ closest: () => nested })
  assert.equal(closed, 1, 'nested native confirmations keep their own Escape')
  assert.equal(event.prevented, 1, 'nested Escape never reaches the grouped close request')
  assert.deepEqual(nested.calls, ['cancel:true'], 'nested dialog receives a cancelable cancel')
  assert.equal(nested.open, true, 'a handled cancel leaves closing to its owner')
  nested.handled = false
  escape({ closest: () => nested })
  assert.deepEqual(nested.calls, ['cancel:true', 'cancel:true', 'close'], 'unhandled cancel keeps the native default')
  nested.open = true
  nested.calls = []
  event = escape({ closest: () => new h.Element() })
  assert.equal(event.prevented, 0, 'dialogs outside the Drawer are ignored')
  escape(own, { key: 'Enter' })
  escape(own, { nativeEvent: { isComposing: true } })
  assert.equal(closed, 1)
  closeBlocked = true
  tree = render()
  event = escape(own)
  assert.equal(event.prevented, 1, 'blocked Escape is still consumed')
  assert.equal(closed, 1)

  modal.open = false
  tree.props.onClose({ target: modal, currentTarget: modal })
  assert.equal(modal.open, true, 'an unexpected native close reopens the Drawer')
  assert.deepEqual(nested.calls, ['close', 'showModal'], 'nested dialogs stay above')
  tree.props.onClose({ target: nested, currentTarget: modal })
  assert.deepEqual(nested.calls, ['close', 'showModal'])
  h.unmount()
  assert.equal(modal.open, false)
  tree.props.onClose({ target: modal, currentTarget: modal })
  assert.equal(modal.open, false, 'an intentional unmount is not reopened')
})

test('native confirmation cancels Escape without closing the underlying modal and restores focus', () => {
  const h = sourceHarness()
  const { ConfirmDialog } = h.load(
    'shared/components/ConfirmDialog/ConfirmDialog.tsx',
  )
  const launcher = new h.Element()
  launcher.focus()
  const cancel = new h.Element({ tag: 'button' })
  const confirm = new h.Element({ tag: 'button' })
  const panel = new h.Element({ children: [cancel, confirm] })
  const modal = new h.Element({
    showModal() {
      this.open = true
    },
    close() {
      this.open = false
    },
  })
  let isOpen = true
  let cancelled = 0
  const render = () =>
    h.render(
      () =>
        ConfirmDialog({
          native: true,
          isOpen,
          title: 'Descartar',
          message: 'Cambios sin guardar',
          onCancel: () => cancelled++,
          onConfirm() {},
        }),
      (tree) => {
        if (!tree) return
        tree.props.ref.current = modal
        nodes(
          tree,
          (node) => node.type === 'div' && node.props.ref,
        )[0].props.ref.current = panel
      },
    )
  const tree = render()
  assert.equal(tree.type, 'dialog')
  assert.equal(tree.props.role, 'alertdialog')
  assert.equal(modal.open, true)
  assert.equal(h.document.activeElement, cancel)
  let prevented = false,
    stopped = false
  tree.props.onCancel({
    preventDefault() {
      prevented = true
    },
    stopPropagation() {
      stopped = true
    },
  })
  assert.equal(cancelled, 1)
  assert.ok(prevented && stopped)
  isOpen = false
  render()
  assert.equal(modal.open, false)
  assert.equal(h.document.activeElement, launcher)
  h.unmount()
  assert.equal(h.listenerCount(), 0)
})
