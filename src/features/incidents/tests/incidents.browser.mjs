// Real components and HTTP fixture in headless Chrome; never contacts the backend.
// Node20: node --experimental-websocket src/features/incidents/tests/incidents.browser.mjs
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const profile = await mkdtemp(join(tmpdir(), 'eida-hu27-'))
const output = resolve('../tmp/hu27-browser')
await mkdir(output, { recursive: true })
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const requests = [],
  errors = [],
  checks = []
let vite,
  chrome,
  ws,
  behavior = 'ok',
  permitted = true,
  saved = null
const fixture = {
  id: 9,
  exam_id: 4,
  type: 'IDENTIFICATION',
  description: 'Documento ilegible.',
  origin: 'MANUAL',
  status: 'REPORTED',
  student: null,
  reported_by: { id: 2, name: 'Docente de prueba' },
  created_at: '2026-11-02T14:00:00Z',
}
const demo = `import React from 'react';import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';import '@fontsource/poppins/600.css';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {CreateIncidentPage} from '/src/features/incidents/pages/CreateIncidentPage.tsx';
import {IncidentDetailPage} from '/src/features/incidents/pages/IncidentDetailPage.tsx';
import {ExamIncidentsPage} from '/src/features/incidents/pages/ExamIncidentsPage.tsx';
httpClient.defaults.baseURL='/__hu27-api';httpClient.defaults.headers.common.Authorization='Bearer hu27-fixture';
const router=createMemoryRouter([
{path:'/exams/:examId/incidents/create',Component:CreateIncidentPage},
{path:'/exams/:examId/incidents/:incidentId',Component:IncidentDetailPage},
{path:'/exams/:examId/incidents',Component:ExamIncidentsPage}],{initialEntries:['/exams/4/incidents/create?from=teacher']});
window.__hu27Router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`

try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'hu27-browser-fixture',
        resolveId(id) {
          if (id === '/__hu27-demo.js') return '\0hu27-demo'
        },
        load(id) {
          if (id === '\0hu27-demo') return demo
        },
        configureServer(server) {
          server.middlewares.use('/__hu27-api', async (req, res) => {
            const url = new URL(req.url, 'http://fixture.test')
            requests.push({ method: req.method, path: url.pathname })
            const json = (status, data) => {
              res.statusCode = status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
            }
            if (req.headers.authorization !== 'Bearer hu27-fixture')
              return json(401, {})
            if (
              req.method === 'POST' &&
              url.pathname === '/exams/4/incidents'
            ) {
              const chunks = []
              for await (const chunk of req) chunks.push(chunk)
              const body = JSON.parse(Buffer.concat(chunks).toString())
              requests.at(-1).body = body
              if (behavior === 'validation')
                return json(422, {
                  errors: {
                    description: [
                      'Descripción rechazada por el servidor de prueba.',
                    ],
                  },
                })
              if (behavior === 'slow') await pause(800)
              saved = { ...fixture, ...body, student: null }
              delete saved.student_id
              return json(201, { data: saved })
            }
            if (req.method === 'GET' && url.pathname === '/exams/4/incidents/9')
              return behavior === 'forbidden'
                ? json(403, {})
                : json(200, { data: saved ?? fixture })
            if (req.method === 'GET' && url.pathname === '/exams/4/incidents')
              return json(200, {
                exam: {
                  id: 4,
                  name: 'Parcial HU27',
                  subject_name: 'Taller de Software',
                },
                permissions: { can_create: permitted },
                data: saved ? [saved] : [],
                meta: {
                  current_page: 1,
                  last_page: 1,
                  total: saved ? 1 : 0,
                  per_page: 10,
                },
              })
            if (
              req.method === 'GET' &&
              url.pathname === '/exams/4/entry-control/students'
            )
              return json(200, { exam: { id: 4 }, data: [] })
            return json(404, {})
          })
          server.middlewares.use('/__hu27', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__hu27',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HU27 — HTTP controlado</title><div id="root"></div><script type="module" src="/__hu27-demo.js"></script></html>',
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
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  let port
  for (let i = 0; i < 100; i++) {
    try {
      port = Number(
        (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
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
  await wait("document.querySelector('form')")
  assert.equal(
    await evaluate("document.querySelectorAll('select option').length"),
    6,
  )
  await click('Registrar incidencia')
  assert.equal(requests.filter((r) => r.method === 'POST').length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'SELECT')
  checks.push(
    'Empty required fields prevent POST and focus the invalid category',
  )
  await fill('select', 'IDENTIFICATION', 'HTMLSelectElement')
  await fill('textarea', 'Documento ilegible.', 'HTMLTextAreaElement')
  behavior = 'validation'
  await click('Registrar incidencia')
  await wait("document.body.innerText.includes('Descripción rechazada')")
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    'Documento ilegible.',
  )
  assert.equal(await evaluate('document.activeElement.tagName'), 'TEXTAREA')
  checks.push(
    'HTTP422 retains draft, displays server validation and focuses the field',
  )
  await shot('formulario-desktop')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  assert.equal(
    await evaluate('document.documentElement.scrollWidth<=innerWidth'),
    true,
  )
  await shot('formulario-mobile')
  behavior = 'slow'
  const before = requests.filter((r) => r.method === 'POST').length
  await click('Registrar incidencia')
  await evaluate("document.querySelector('form').requestSubmit()")
  await evaluate("window.__hu27Router.navigate('/exams/4/incidents')")
  await wait("document.body.innerText.includes('Espera a que termine')")
  await wait(
    "document.querySelector('h1')?.textContent==='Detalle de incidencia'",
  )
  await wait("document.querySelector('article')")
  assert.equal(requests.filter((r) => r.method === 'POST').length, before + 1)
  const sent = requests.filter((r) => r.method === 'POST').at(-1).body
  assert.deepEqual(sent, {
    type: 'IDENTIFICATION',
    description: 'Documento ilegible.',
    student_id: null,
  })
  assert.equal(
    await evaluate('document.documentElement.scrollWidth<=innerWidth'),
    true,
  )
  await shot('detalle-mobile')
  checks.push(
    'One POST during double submit; navigation blocked until confirmation; saved detail loaded; mobile has no horizontal overflow',
  )
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await shot('detalle-desktop')
  await navigate('/exams/4/incidents/create')
  await wait("document.querySelector('form')")
  permitted = false
  await navigate('/exams/4/incidents')
  await wait("document.querySelector('table')")
  await navigate('/exams/4/incidents/create')
  await wait(
    "document.body.innerText.includes('No tienes autorización vigente')",
  )
  assert.equal(await evaluate("document.querySelector('form')===null"), true)
  checks.push('Server can_create=false never mounts the creation form')
  behavior = 'forbidden'
  await navigate('/exams/4/incidents/9')
  await wait(
    "document.body.innerText.includes('No tienes autorización vigente')",
  )
  assert.equal(await evaluate("document.querySelector('article')===null"), true)
  checks.push('HTTP403 detail contains no prior evidence')
  assert.deepEqual(errors, [])
  await writeFile(
    join(output, 'resultados.json'),
    JSON.stringify({ fixtureOnly: true, checks, requests, errors }, null, 2),
  )
  console.log(JSON.stringify({ checks, errors, output }, null, 2))
} finally {
  ws?.close()
  chrome?.kill()
  await vite?.close()
}
