import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'

const backup = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  requester: 'Administrador real',
  type: 'MANUAL_FULL',
  state: 'QUEUED',
  filename: 'eida-test.dump',
  bytes: null,
  sha256: null,
  postgres_version: null,
  requested_at: '2026-11-21T12:00:00Z',
  started_at: null,
  completed_at: null,
  verified_at: null,
  error_code: null,
}
const page = (active = false, enabled = true) => ({
  data: [backup],
  meta: { current_page: 1, last_page: 2, total: 12, from: 1, to: 10 },
  summary: {
    total: 12,
    recorded_bytes: 1000,
    last_available_at: null,
    active,
    enabled,
  },
})
const failure = (status) => ({
  isAxiosError: true,
  response: { status, data: { message: 'secret-marker' } },
})

function harness() {
  const calls = []
  let handler = async (method, url) =>
    url === '/sanctum/csrf-cookie'
      ? { data: {} }
      : method === 'post'
        ? { status: 202, data: { data: backup } }
        : { data: page() }
  const client = Object.fromEntries(
    ['get', 'post'].map((method) => [
      method,
      (...args) => {
        calls.push([method, ...args])
        return handler(method, ...args)
      },
    ]),
  )
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: client,
      backendHttpClient: client,
    },
    '@/shared/components/ui/PageContainer/PageContainer': {
      PageContainer: 'container',
    },
    '@/shared/components/DataTable/DataTable': { DataTable: 'table' },
    '@/shared/components/PortalDialog/PortalDialog': { PortalDialog: 'dialog' },
    '@/shared/components/ui/Toast/Toast': { Alert: 'alert' },
    '@/shared/components/ui/Badge/Badge': { Badge: 'badge' },
    '@/shared/components/ui/Button/Button': { Button: 'button' },
  })
  return Object.assign(h, {
    calls,
    setHandler: (value) => {
      handler = value
    },
  })
}
const table = (tree) => nodes(tree, (node) => node.type === 'table')[0]
const generate = (tree) =>
  nodes(tree.props.actions, (node) => node.props?.id === 'generate-backup')[0]
const confirm = (tree) => {
  const dialog = nodes(tree, (node) => node.type === 'dialog')[0]
  return (
    dialog &&
    nodes(
      dialog.props.footer,
      (node) =>
        node.type === 'button' && textContent(node).includes('Confirmar'),
    )[0]
  )
}

test('loads actual history, uses global indicators and requests the selected page', async () => {
  const h = harness(),
    { AdminBackupsPage } = h.load('features/backups/pages/AdminBackupsPage.tsx')
  h.render(AdminBackupsPage)
  await settle()
  let tree = h.render()
  assert.equal(table(tree).props.data[0].id, backup.id)
  assert.equal(table(tree).props.pagination.total, 12)
  assert.equal(generate(tree).props.disabled, false)
  table(tree).props.onPageChange(2)
  h.render()
  await settle()
  tree = h.render()
  assert.equal(h.calls.at(-1)[2].params.page, 2)
  h.unmount()
})

test('requires confirmation and prevents double dispatch while preserving real QUEUED state', async () => {
  const h = harness(),
    { AdminBackupsPage } = h.load('features/backups/pages/AdminBackupsPage.tsx')
  h.render(AdminBackupsPage)
  await settle()
  let tree = h.render()
  generate(tree).props.onClick()
  tree = h.render()
  assert.equal(h.calls.filter(([method]) => method === 'post').length, 0)
  let finish
  h.setHandler(async (method, url) =>
    url === '/sanctum/csrf-cookie'
      ? { data: {} }
      : method === 'post'
        ? new Promise((resolve) => {
            finish = resolve
          })
        : { data: page(true) },
  )
  confirm(tree).props.onClick()
  confirm(tree).props.onClick()
  await settle()
  assert.equal(h.calls.filter(([method]) => method === 'post').length, 1)
  assert.equal(h.calls.at(-2)[1], '/sanctum/csrf-cookie')
  finish({ status: 202, data: { data: backup } })
  await settle()
  h.render()
  await settle()
  tree = h.render()
  const notice = nodes(
    tree,
    (node) => node.type === 'alert' && node.props.tone === 'info',
  )[0]
  assert.match(textContent(notice), /En espera/)
  assert.doesNotMatch(
    textContent(notice),
    /respaldo generado|respaldo disponible/i,
  )
  assert.equal(generate(tree).props.disabled, true)
  h.unmount()
})

for (const status of [401, 403, 409, 422, 429, 500, 503])
  test(`HTTP ${status} never produces false success or exposes server content`, async () => {
    const h = harness(),
      { AdminBackupsPage } = h.load(
        'features/backups/pages/AdminBackupsPage.tsx',
      )
    h.render(AdminBackupsPage)
    await settle()
    let tree = h.render()
    generate(tree).props.onClick()
    tree = h.render()
    h.setHandler(async (method, url) =>
      url === '/sanctum/csrf-cookie'
        ? { data: {} }
        : method === 'post'
          ? Promise.reject(failure(status))
          : { data: page() },
    )
    confirm(tree).props.onClick()
    await settle()
    h.render()
    await settle()
    tree = h.render()
    const alert = nodes(
      tree,
      (node) => node.type === 'alert' && node.props.tone === 'danger',
    )[0]
    assert.ok(alert)
    assert.doesNotMatch(
      textContent(tree),
      /secret-marker|Estado de la solicitud/,
    )
    h.unmount()
  })

test('polls an active job every 15 seconds, pauses hidden tabs and stops after completion', async () => {
  const h = harness(),
    { AdminBackupsPage } = h.load('features/backups/pages/AdminBackupsPage.tsx')
  let active = true
  h.setHandler(async () => ({ data: page(active) }))
  h.render(AdminBackupsPage)
  await settle()
  h.render()
  h.advance(14_999)
  await settle()
  assert.equal(h.calls.length, 1)
  h.advance(1)
  await settle()
  h.render()
  assert.equal(h.calls.length, 2)
  h.document.visibilityState = 'hidden'
  h.emit('visibilitychange', 'document')
  h.advance(60_000)
  await settle()
  assert.equal(h.calls.length, 2)
  active = false
  h.document.visibilityState = 'visible'
  h.emit('visibilitychange', 'document')
  await settle()
  h.render()
  h.advance(60_000)
  await settle()
  assert.equal(h.calls.length, 3)
  h.unmount()
  assert.equal(h.listenerCount(), 0)
})

test('disabled configuration blocks generation and only AVAILABLE rows offer download', async () => {
  const h = harness(),
    { AdminBackupsPage } = h.load('features/backups/pages/AdminBackupsPage.tsx')
  h.setHandler(async () => ({ data: page(false, false) }))
  h.render(AdminBackupsPage)
  await settle()
  const tree = h.render()
  assert.equal(generate(tree).props.disabled, true)
  const action = table(tree).props.columns.find(
    (column) => column.id === 'actions',
  )
  assert.equal(action.cell(backup), '—')
  assert.equal(action.cell({ ...backup, state: 'FAILED' }), '—')
  assert.match(
    textContent(action.cell({ ...backup, state: 'AVAILABLE' })),
    /Descargar/,
  )
  h.unmount()
})
