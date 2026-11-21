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

test('submits a navigation form, handles only trusted Worker messages and cleans up', () => {
  const h = sourceHarness(),
    forms = [],
    messages = []
  const popup = { document: { title: '', body: { textContent: '' } } }
  h.window.open = () => popup
  h.document.createElement = (tag) =>
    tag === 'form'
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
  h.document.body.append = () => {}
  const { prepareBackupDownload, submitBackupDownload } = h.load(
    'features/backups/api/backupDownload.ts',
  )
  const target = prepareBackupDownload()
  const value = ticket(h.now())
  const dispose = submitBackupDownload(value, target, (message) =>
    messages.push(message),
  )
  assert.equal(forms.length, 1)
  assert.equal(forms[0].method, 'POST')
  assert.equal(forms[0].action, value.url)
  assert.equal(forms[0].input.name, 'ticket')
  assert.equal(forms[0].input.value, value.ticket)
  assert.equal(forms[0].removed, true)
  const data = { type: 'eida-backup-download-error', code: 'TICKET_EXPIRED' }
  h.emit('message', 'window', {
    origin: 'https://other.example.invalid',
    source: popup,
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
    source: popup,
    data,
  })
  assert.match(messages[0], /caducó/)
  dispose()
  assert.equal(h.listenerCount(), 0)
})

test('expired ticket and blocked popup fail before form navigation', () => {
  const h = sourceHarness()
  h.window.open = () => null
  const { prepareBackupDownload, submitBackupDownload } = h.load(
    'features/backups/api/backupDownload.ts',
  )
  assert.throws(prepareBackupDownload, /DOWNLOAD_WINDOW_BLOCKED/)
  assert.throws(
    () =>
      submitBackupDownload(
        ticket(h.now() - 120_000),
        { name: 'window', popup: {} },
        () => {},
      ),
    /DOWNLOAD_TICKET_EXPIRED/,
  )
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
  const popup = { close() {} }
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
      prepareBackupDownload: () => ({ popup, name: 'test' }),
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
    /descarga completada|archivo descargado/i,
  )
  h.unmount()
})
