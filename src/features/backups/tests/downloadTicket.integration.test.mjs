import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  settle,
  textContent,
} from '../../../shared/tests/sourceHarness.mjs'

const uuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ticket = (now) => ({
  method: 'POST',
  url: 'https://worker.example.invalid/download',
  ticket: 'header.payload.signature',
  expires_at: new Date(now + 60_000).toISOString(),
  filename: `eida-${uuid}.dump`,
})

test('requests a CSRF-protected POST ticket and keeps the dump out of the HTTP client', async () => {
  const calls = []
  const client = {
    async get(url) {
      calls.push(['get', url])
      return {}
    },
    async post(url, body) {
      calls.push(['post', url, body])
      return { data: { data: ticket(Date.now()) } }
    },
  }
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: client,
      backendHttpClient: client,
    },
  })
  const { downloadBackup } = h.load('features/backups/api/backupsApi.ts')
  const result = await downloadBackup(uuid)
  assert.deepEqual(
    calls.map((call) => call.slice(0, 2)),
    [
      ['get', '/sanctum/csrf-cookie'],
      ['post', `/admin/backups/${uuid}/download-ticket`],
    ],
  )
  assert.equal(result.method, 'POST')
  assert.ok(!calls.some((call) => call[1].includes('googleapis.com')))
})

test('posts once to a hidden iframe without opening a tab and accepts only trusted errors', () => {
  const h = sourceHarness(),
    forms = [],
    messages = []
  const frame = {
    contentWindow: {},
    isConnected: false,
    remove() {
      this.removed = true
      this.isConnected = false
    },
  }
  h.window.open = () => assert.fail('must not open another tab')
  h.document.createElement = (tag) =>
    tag === 'iframe'
      ? frame
      : tag === 'form'
        ? {
            append(input) {
              this.input = input
            },
            submit() {
              forms.push(this)
            },
            remove() {
              this.removed = true
            },
          }
        : {}
  h.document.body.append = (element) => {
    if (element === frame) frame.isConnected = true
  }
  const { prepareBackupDownload, submitBackupDownload } = h.load(
    'features/backups/api/backupDownload.ts',
  )
  const target = prepareBackupDownload()
  assert.equal(frame.hidden, true)
  assert.equal(frame.name, target.name)
  assert.equal(frame.isConnected, true)
  const value = ticket(h.now())
  const dispose = submitBackupDownload(value, target, (message) =>
    messages.push(message),
  )
  assert.equal(forms.length, 1)
  assert.equal(forms[0].method, 'POST')
  assert.equal(forms[0].action, value.url)
  assert.equal(forms[0].target, frame.name)
  assert.equal(forms[0].input.name, 'ticket')
  assert.equal(forms[0].input.value, value.ticket)
  assert.equal(forms[0].removed, true)
  assert.throws(
    () => submitBackupDownload(value, target, () => {}),
    /DOWNLOAD_TARGET_UNAVAILABLE/,
  )
  assert.equal(forms.length, 1)
  const data = { type: 'eida-backup-download-error', code: 'TICKET_EXPIRED' }
  h.emit('message', 'window', {
    origin: 'https://other.example.invalid',
    source: frame.contentWindow,
    data,
  })
  h.emit('message', 'window', {
    origin: 'https://worker.example.invalid',
    source: {},
    data,
  })
  assert.equal(messages.length, 0)
  h.emit('message', 'window', {
    origin: 'https://worker.example.invalid',
    source: frame.contentWindow,
    data,
  })
  assert.match(messages[0], /caducó/)
  assert.equal(frame.removed, true)
  dispose()
  assert.equal(h.listenerCount(), 0)
})

test('expired tickets and detached iframes fail before form navigation', () => {
  const h = sourceHarness()
  const { submitBackupDownload } = h.load(
    'features/backups/api/backupDownload.ts',
  )
  const target = {
    name: 'download-frame',
    frame: { isConnected: true, contentWindow: {} },
    submitted: false,
  }
  assert.throws(
    () => submitBackupDownload(ticket(h.now() - 120_000), target, () => {}),
    /DOWNLOAD_TICKET_EXPIRED/,
  )
  target.frame.isConnected = false
  assert.throws(
    () => submitBackupDownload(ticket(h.now()), target, () => {}),
    /DOWNLOAD_TARGET_UNAVAILABLE/,
  )
})

test('feedback cleanup does not remove an iframe carrying a large download', () => {
  const h = sourceHarness()
  const frame = {
    isConnected: true,
    contentWindow: {},
    remove: () => assert.fail('must not interrupt an active download'),
  }
  h.document.createElement = (tag) =>
    tag === 'form' ? { append() {}, submit() {}, remove() {} } : {}
  h.document.body.append = () => {}
  const { submitBackupDownload } = h.load(
    'features/backups/api/backupDownload.ts',
  )
  const dispose = submitBackupDownload(
    ticket(h.now()),
    { name: 'download-frame', frame, submitted: false },
    () => {},
  )
  h.advance(120_000)
  dispose()
  assert.equal(h.listenerCount(), 0)
  assert.equal(frame.isConnected, true)
})

test('the existing page prevents double ticket requests and preserves its table and loading state', async () => {
  const row = {
    id: uuid,
    requester: 'Administrador',
    type: 'MANUAL_FULL',
    state: 'AVAILABLE',
    filename: `eida-${uuid}.dump`,
    bytes: 80_000_000,
    sha256: 'a'.repeat(64),
    requested_at: '2026-11-21T12:00:00Z',
  }
  let finish
  const posts = [],
    submissions = []
  const frame = { remove() {} }
  const client = {
    async get(url) {
      return url === '/sanctum/csrf-cookie'
        ? {}
        : {
            data: {
              data: [row],
              meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
              summary: {
                total: 1,
                recorded_bytes: row.bytes,
                last_available_at: row.requested_at,
                enabled: true,
                active: false,
              },
            },
          }
    },
    post(url) {
      posts.push(url)
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  }
  const h = sourceHarness({
    '@/shared/api/httpClient': {
      httpClient: client,
      backendHttpClient: client,
    },
    '@/shared/components/ui/PageContainer/PageContainer': {
      PageContainer: 'container',
    },
    '@/shared/components/DataTable/DataTable': { DataTable: 'table' },
    '@/shared/components/ui/Button/Button': { Button: 'button' },
    '@/shared/components/ui/Toast/Toast': { Alert: 'alert' },
    '@/shared/components/ui/Badge/Badge': { Badge: 'badge' },
    '@/shared/components/PortalDialog/PortalDialog': { PortalDialog: 'dialog' },
    '../api/backupDownload': {
      prepareBackupDownload: () => ({ frame, name: 'test', submitted: false }),
      submitBackupDownload: (value) => {
        submissions.push(value)
        return () => {}
      },
    },
  })
  const { AdminBackupsPage } = h.load(
    'features/backups/pages/AdminBackupsPage.tsx',
  )
  h.render(AdminBackupsPage)
  await settle()
  let tree = h.render()
  const table = nodes(tree, (node) => node.type === 'table')[0]
  const action = table.props.columns
    .find((column) => column.id === 'actions')
    .cell(row)
  action.props.onClick()
  action.props.onClick()
  await settle()
  assert.equal(posts.length, 1)
  finish({ data: { data: ticket(Date.now()) } })
  await settle()
  tree = h.render()
  assert.equal(submissions.length, 1)
  assert.equal(
    nodes(tree, (node) => node.type === 'table')[0].props.data[0].id,
    uuid,
  )
  assert.doesNotMatch(
    textContent(tree),
    /descarga completada|archivo descargado|otra ventana/i,
  )
  const secondAction = nodes(tree, (node) => node.type === 'table')[0]
    .props.columns.find((column) => column.id === 'actions')
    .cell(row)
  secondAction.props.onClick()
  await settle()
  assert.equal(posts.length, 2)
  finish({
    data: { data: { ...ticket(Date.now()), ticket: 'header.fresh.signature' } },
  })
  await settle()
  assert.equal(submissions.length, 2)
  assert.notEqual(submissions[0].ticket, submissions[1].ticket)
  h.unmount()
})
