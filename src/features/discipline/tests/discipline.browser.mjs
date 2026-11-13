// Isolated browser fixture: no development database or live backend is contacted.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'vite'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
  trackBrowser,
} from '../../../shared/tests/browserProfile.mjs'
const profile = await createBrowserProfile('discipline-unified')
const output = join(
  process.cwd(),
  '.validation.local',
  `discipline-${randomUUID()}`,
)
await mkdir(output, { recursive: true })
const pause = (ms) => new Promise((done) => setTimeout(done, ms)),
  errors = [],
  requests = []
let vite, chrome, ws, saved
const context = {
  exam: { id: 4, name: 'Primer parcial', subject_name: 'Redes' },
  permissions: {
    can_create: true,
    can_manage: true,
    can_expel: true,
    can_export: true,
  },
}
const record = {
  id: 9,
  exam_id: 4,
  kind: 'INCIDENT',
  source_type: 'INCIDENT',
  source_id: 2,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  observations: null,
  status: 'PENDING',
  student: {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '123',
    identity_number: '99',
  },
  reported_by: { id: 2, name: 'Docente responsable' },
  occurred_at: '2026-11-02T14:00:00Z',
  measure: null,
  measure_applied: false,
  permissions: { can_expel: true, can_update: false },
}
const demo = `import React from 'react';import {createRoot} from 'react-dom/client';import {createMemoryRouter,RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {DisciplineWorkspace} from '/src/features/discipline/DisciplineWorkspace.tsx';
import {CaseDetailPage} from '/src/features/discipline/CaseDetailPage.tsx';
import {IncidentControlDialog} from '/src/features/incidents/components/IncidentControlDialog.tsx';
httpClient.defaults.baseURL='/__hu27-api';
function Control(){return React.createElement(IncidentControlDialog,{examId:4,mode:{context:{student:${JSON.stringify(record.student)}}},onClose:()=>window.__closed=true})}
const router=createMemoryRouter([{path:'/cases',Component:()=>React.createElement(DisciplineWorkspace,{examId:4})},{path:'/exams/:examId/cases/:caseId',Component:CaseDetailPage},{path:'/control',Component:Control}],{initialEntries:['/control']});window.__hu27Router=router;
createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`
try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'discipline-fixture',
        resolveId(id) {
          if (id === '/__demo.js') return '\0demo'
        },
        load(id) {
          if (id === '\0demo') return demo
        },
        configureServer(server) {
          server.middlewares.use('/__hu27-api', async (req, res) => {
            const url = new URL(req.url, 'http://fixture'),
              send = (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              }
            requests.push({ method: req.method, path: url.pathname })
            if (req.method === 'POST') {
              const chunks = []
              for await (const c of req) chunks.push(c)
              const body = JSON.parse(Buffer.concat(chunks))
              requests.at(-1).body = body
              if (url.pathname.endsWith('/expulsion'))
                saved = {
                  ...saved,
                  measure_applied: true,
                  measure: {
                    reason: body.reason,
                    expelled_at: record.occurred_at,
                    expelled_by: { name: 'Docente' },
                  },
                  permissions: { can_expel: false, can_update: false },
                }
              else saved = { ...record, ...body, student: record.student }
              return send({ ...context, data: saved })
            }
            if (
              url.pathname.endsWith('/9') ||
              url.pathname.endsWith('/resolve')
            )
              return send({ ...context, data: saved ?? record })
            return send({
              ...context,
              data: [saved ?? record],
              meta: { current_page: 1, last_page: 1, total: 1, per_page: 15 },
            })
          })
          server.middlewares.use('/__hu27', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__hu27',
                '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__demo.js"></script>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  chrome = spawn(
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile.dir}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  trackBrowser(profile, chrome)
  let port
  for (let i = 0; i < 100; i++) {
    try {
      port = Number(
        (await readFile(join(profile.dir, 'DevToolsActivePort'), 'utf8')).split(
          '\n',
        )[0],
      )
      break
    } catch {
      await pause(100)
    }
  }
  assert.ok(port, 'Chrome did not start')
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  ws = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((done, fail) => {
    ws.addEventListener('open', done, { once: true })
    ws.addEventListener('error', fail, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const call = pending.get(message.id)
      pending.delete(message.id)
      if (call)
        message.error
          ? call.reject(Error(message.error.message))
          : call.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails)
      throw Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 120; i++) {
      try {
        if (await evaluate(`Boolean(${expression})`)) return
      } catch {}
      await pause(100)
    }
    throw Error(
      `Timeout ${expression}: ${await evaluate('document.body.innerText')}`,
    )
  }
  const click = async (label) => {
    await evaluate(
      `(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button||button.disabled)throw Error('Unavailable button');button.click()})()`,
    )
    await pause(50)
  }
  const fill = async (selector, value, tag = 'HTMLInputElement') => {
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${tag}.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await pause(50)
  }
  const navigate = async (path) => {
    await evaluate(`window.__hu27Router.navigate(${JSON.stringify(path)})`)
    await pause(100)
  }
  const shot = async (name) => {
    const image = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(
      join(output, name + '.png'),
      Buffer.from(image.data, 'base64'),
    )
  }
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', {
    url: `http://127.0.0.1:${vite.httpServer.address().port}/__hu27`,
  })

  await wait("document.querySelector('form select')")
  await click('Registrar caso')
  assert.equal(requests.filter((r) => r.method === 'POST').length, 0)
  await fill('form select', 'INCIDENT:IDENTIFICATION', 'HTMLSelectElement')
  await fill('textarea', 'Documento ilegible.', 'HTMLTextAreaElement')
  await click('Registrar caso')
  await wait("document.body.innerText.includes('Caso #9 registrado')")
  assert.equal(
    await evaluate(
      "document.querySelector('dialog').getAttribute('aria-busy')",
    ),
    'false',
  )
  assert.ok(requests.find((r) => r.method === 'POST').body.request_key)
  await click('Expulsar del examen')
  await fill(
    'dialog:last-of-type textarea',
    'Motivo justificado.',
    'HTMLTextAreaElement',
  )
  await evaluate(
    "document.querySelector('dialog:last-of-type input[type=checkbox]').click()",
  )
  await click('Confirmar expulsión')
  await wait("document.body.innerText.includes('Motivo justificado.')")
  assert.equal(requests.filter((r) => r.method === 'POST').length, 2)
  await navigate('/cases')
  await wait("document.body.innerText.includes('Ver caso')")
  await shot('lista-desktop')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await shot('lista-mobile')
  assert.ok(
    await evaluate(
      'document.documentElement.scrollWidth <= window.innerWidth + 1',
    ),
  )
  await navigate('/control')
  await wait("document.querySelector('form select')")
  await shot('registro-mobile')
  assert.ok(
    await evaluate(
      'document.documentElement.scrollWidth <= window.innerWidth + 1',
    ),
  )
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify(
      {
        passed: [
          'required fields',
          'shared registration',
          'idempotency key',
          'modal busy released',
          'expulsion on same case',
          'single list',
          'desktop and mobile without horizontal overflow',
        ],
        output,
      },
      null,
      2,
    ),
  )
} finally {
  ws?.close()
  chrome?.kill()
  await vite?.close()
  await cleanupBrowserProfile(profile)
}
