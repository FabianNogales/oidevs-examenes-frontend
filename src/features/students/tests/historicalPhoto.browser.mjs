// Run from the frontend root. Uses Chrome and a temporary authenticated HTTP fixture.
// Does not contact or mutate the development backend.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'

const root = process.cwd(),
  browserProfile = await createBrowserProfile('hu14-integration'),
  profile = browserProfile.dir,
  evidence = join(root, '.validation.local', 'historicalPhoto')
await mkdir(evidence, { recursive: true })
const png = await readFile(join(root, 'src/assets/images/logo-home.png'))
const file = join(profile, 'institutional.png'),
  largeFile = join(profile, 'too-large.png'),
  invalidFile = join(profile, 'invalid.txt')
await writeFile(file, png)
await writeFile(largeFile, Buffer.alloc(5 * 1024 * 1024 + 1))
await writeFile(invalidFile, 'not an image')
const requests = [],
  errors = [],
  checks = []
let origin,
  vite,
  chrome,
  ws,
  behavior = 'ok'
let student = {
  id: 8,
  sis_code: '00123',
  first_names: 'Ana',
  last_names: 'Demo',
  identity_number: '123456',
  email: 'ana@example.test',
  status: 'ACTIVE',
  career: null,
  historical_photo_url: null,
  historical_photo_revision: 0,
  profile_photo_url: '/admin/students/8/profile-photo',
}
// Arqmoc ad44491: both entry photos are private binaries fetched through the authenticated client.
const snapshot = () => ({
  ...student,
  historical_photo_url: student.historical_photo_revision
    ? origin + '/__hu14-api/admin/students/8/historical-photo'
    : null,
  profile_photo_url: origin + '/__hu14-api' + student.profile_photo_url,
})
const field = (body, name) =>
  body
    .split('name="' + name + '"')[1]
    ?.split('\r\n\r\n')[1]
    ?.split('\r\n--')[0]
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  const demo =
    () => `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {getAdminStudent} from '/src/features/students/api/adminStudentsApi.ts';
import {StudentHistoricalPhotoSection} from '/src/features/students/components/StudentHistoricalPhotoSection.tsx';
import {EntryQrStudentIdentity} from '/src/features/exams/components/EntryQrStudentIdentity.tsx';
httpClient.defaults.baseURL='/__hu14-api';httpClient.defaults.headers.common.Authorization='Bearer hu14-browser-fixture';
window.__objectUrls={created:[],revoked:[]};
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);window.__objectUrls.created.push(url);return url};
URL.revokeObjectURL=url=>{window.__objectUrls.revoked.push(url);return revoke(url)};
const root=createRoot(document.getElementById('root'));window.__unmount=()=>root.unmount();
function Demo({initial}){const [student,setStudent]=useState(initial);window.__qaStudent=student;return React.createElement('main',{style:{maxWidth:1050,margin:'16px auto',padding:16}},
React.createElement('h1',null,'Prueba HU14 — respuestas HTTP controladas'),
React.createElement(StudentHistoricalPhotoSection,{student,onUpdated:setStudent}),
React.createElement('section',{'aria-label':'Identidad de ingreso'},React.createElement(EntryQrStudentIdentity,{student:{...student,student_id:8}})))}
getAdminStudent('8').then(initial=>root.render(React.createElement(Demo,{initial})));`
  vite = await createServer({
    root,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'hu14-http-qa',
        resolveId(id) {
          if (id === '/__hu14-demo.js') return '\0hu14-demo'
        },
        load(id) {
          if (id === '\0hu14-demo') return demo()
        },
        configureServer(server) {
          server.middlewares.use('/__hu14-api', async (req, res) => {
            const url = new URL(req.url, 'http://fixture.test'),
              authorized =
                req.headers.authorization === 'Bearer hu14-browser-fixture'
            const record = {
              method: req.method,
              path: url.pathname,
              authenticated: authorized,
            }
            requests.push(record)
            const json = (status, data) => {
              res.statusCode = status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
            }
            if (!authorized)
              return json(401, { message: 'Fixture requires authentication' })
            if (req.method === 'GET' && url.pathname === '/admin/students/8')
              return json(200, { data: snapshot() })
            if (
              req.method === 'GET' &&
              (url.pathname.endsWith('/historical-photo') ||
                url.pathname === student.profile_photo_url)
            ) {
              res.setHeader('Content-Type', 'image/png')
              res.setHeader('Cache-Control', 'private, no-store')
              res.end(png)
              return
            }
            if (req.method === 'POST') {
              const chunks = []
              for await (const chunk of req) chunks.push(chunk)
              const body = Buffer.concat(chunks).toString('utf8')
              Object.assign(record, {
                revision: field(body, 'revision'),
                reason: field(body, 'reason'),
                multipart: req.headers['content-type'].startsWith(
                  'multipart/form-data; boundary=',
                ),
                hasPhoto: body.includes(
                  'name="photo"; filename="institutional.png"',
                ),
              })
              if (behavior === 'conflict') {
                behavior = 'ok'
                student.historical_photo_revision++
                record.status = 409
                return json(409, {
                  code: 'HISTORICAL_PHOTO_CONFLICT',
                  current_revision: student.historical_photo_revision,
                  message:
                    'La fotografía institucional cambió. Recarga el estudiante.',
                })
              }
              if (behavior === 'invalid') {
                behavior = 'ok'
                record.status = 422
                return json(422, {
                  message: 'Datos inválidos.',
                  errors: {
                    photo: ['Contenido rechazado por backend.'],
                    reason: ['Motivo rechazado por backend.'],
                  },
                })
              }
              assert.equal(
                Number(record.revision),
                student.historical_photo_revision,
              )
              assert.ok(record.multipart && record.hasPhoto)
              if (url.pathname.endsWith('/corrections'))
                assert.ok(record.reason)
              else assert.equal(record.reason, undefined)
              student.historical_photo_revision++
              record.status = url.pathname.endsWith('/corrections') ? 200 : 201
              return json(record.status, { data: snapshot() })
            }
            json(404, { message: 'Not found in fixture' })
          })
          server.middlewares.use('/__hu14', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__hu14',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__hu14-demo.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`
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
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const p = pending.get(message.id)
      pending.delete(message.id)
      message.error
        ? p.reject(new Error(message.error.message))
        : p.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      try {
        if (await evaluate(`Boolean(${expression})`)) return
      } catch {}
      await pause(100)
    }
    throw new Error(
      `Timeout ${expression}: ${await evaluate('document.body?.innerText')}`,
    )
  }
  const click = async (label) => {
    await evaluate(
      `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Unavailable button');b.click()})()`,
    )
    await pause(50)
  }
  const choose = async (path) => {
    const { root: document } = await send('DOM.getDocument')
    const { nodeId } = await send('DOM.querySelector', {
      nodeId: document.nodeId,
      selector: 'input[type=file]',
    })
    await send('DOM.setFileInputFiles', { nodeId, files: [path] })
    await pause(50)
  }
  const reason = async (value) => {
    await evaluate(
      `(()=>{const el=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    )
    await pause(50)
  }
  const screenshot = async (name) => {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(shot.data, 'base64'),
    )
  }
  const pass = (label) => {
    checks.push(label)
    console.log('PASS ' + label)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: origin + '/__hu14' })
  await wait("document.body.innerText.includes('Revisión actual: 0')")
  assert.ok(
    await evaluate(
      "document.body.innerText.includes('Sin fotografía histórica')",
    ),
  )
  await screenshot('admin-empty')
  pass('initial institutional placeholder and revision 0')
  await click('Cargar fotografía institucional')
  await choose(file)
  await click('Revisar carga')
  assert.equal(requests.filter((r) => r.method === 'POST').length, 0)
  await wait("document.querySelector('[role=alertdialog]')")
  await screenshot('admin-confirmation')
  await click('Confirmar carga')
  await wait(
    'window.__qaStudent.historical_photo_revision===1 && [...document.querySelectorAll(\'img[src^="blob:"]\')].filter(x=>x.complete&&x.naturalWidth>0).length===3',
  )
  assert.equal(requests.find((r) => r.method === 'POST').revision, '0')
  assert.equal(
    await evaluate('window.__qaStudent.profile_photo_url'),
    snapshot().profile_photo_url,
  )
  pass(
    'multipart first upload with revision 0; authenticated blob images decoded; profile unchanged',
  )
  await click('Corregir fotografía institucional')
  await choose(file)
  await click('Revisar corrección')
  assert.ok(
    await evaluate(
      "document.body.innerText.includes('Indica el motivo de la corrección.')",
    ),
  )
  assert.equal(requests.filter((r) => r.method === 'POST').length, 1)
  await reason('Correccion institucional')
  await click('Revisar corrección')
  await click('Confirmar corrección')
  await wait('window.__qaStudent.historical_photo_revision===2')
  assert.equal(
    requests.filter((r) => r.method === 'POST')[1].path,
    '/admin/students/8/historical-photo/corrections',
  )
  assert.equal(requests.filter((r) => r.method === 'POST')[1].revision, '1')
  pass(
    'correction requires reason and uses corrections endpoint/current revision',
  )
  behavior = 'conflict'
  await click('Corregir fotografía institucional')
  await choose(file)
  await reason('Motivo conservado')
  await click('Revisar corrección')
  await click('Confirmar corrección')
  await wait(
    "document.body.innerText.includes('Recarga el detalle del estudiante')",
  )
  assert.equal(
    await evaluate('window.__qaStudent.historical_photo_revision'),
    2,
  )
  assert.equal(
    await evaluate('document.querySelector("textarea").value'),
    'Motivo conservado',
  )
  await screenshot('admin-conflict')
  const getCount = requests.filter((r) => r.path === '/admin/students/8').length
  await click('Recargar detalle')
  await wait('window.__qaStudent.historical_photo_revision===3')
  assert.equal(
    requests.filter((r) => r.path === '/admin/students/8').length,
    getCount + 1,
  )
  pass(
    '409 preserves reviewed state; explicit reload fetches current detail/revision',
  )
  await click('Corregir fotografía institucional')
  await choose(largeFile)
  await reason('Motivo')
  await click('Revisar corrección')
  assert.ok(
    await evaluate(
      "document.body.innerText.includes('La fotografía no debe superar 5 MB.')",
    ),
  )
  await choose(invalidFile)
  await click('Revisar corrección')
  assert.ok(
    await evaluate(
      "document.body.innerText.includes('Selecciona un archivo JPEG, PNG o WebP.')",
    ),
  )
  pass('invalid MIME and >5 MiB blocked in browser before POST')
  behavior = 'invalid'
  await choose(file)
  await click('Revisar corrección')
  await click('Confirmar corrección')
  await wait(
    "document.body.innerText.includes('Contenido rechazado por backend.') && document.body.innerText.includes('Motivo rechazado por backend.')",
  )
  assert.equal(
    await evaluate('window.__qaStudent.historical_photo_revision'),
    3,
  )
  await screenshot('admin-validation')
  pass('422 displays field errors and preserves revision')
  await click('Cancelar')
  await wait(
    '[...document.querySelectorAll(\'img[src^="blob:"]\')].filter(x=>x.complete&&x.naturalWidth>0).length===3',
  )
  for (const width of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(100)
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    const identity = await evaluate(
      "(()=>{const e=document.querySelector('[aria-label=\"Identidad de ingreso\"]');return {text:e.innerText,images:[...e.querySelectorAll('img')].map(i=>({src:i.src,alt:i.alt}))}})()",
    )
    assert.equal(identity.images.length, 2)
    assert.ok(identity.images[0].src.startsWith('blob:'))
    assert.ok(identity.images[1].src.startsWith('blob:'))
    assert.notEqual(identity.images[1].src, identity.images[0].src)
    assert.deepEqual(
      identity.images.map((image) => image.alt),
      ['Foto histórica de Ana Demo', 'Foto actual de Ana Demo'],
    )
    for (const text of ['Ana Demo', 'SIS: 00123', 'CI: 123456'])
      assert.ok(identity.text.includes(text))
    await screenshot('photos-' + width)
    pass(
      width +
        'px: separate historical/current photos, name/SIS/CI, no overflow',
    )
  }
  const created = await evaluate('window.__objectUrls.created.length')
  await evaluate('window.__unmount()')
  await pause(100)
  const revoked = await evaluate('window.__objectUrls.revoked.length')
  assert.equal(created, revoked)
  assert.ok(requests.every((r) => r.authenticated))
  assert.ok(
    requests.some(
      (r) => r.method === 'GET' && r.path === student.profile_photo_url,
    ),
    'current photo requested through the authenticated client',
  )
  assert.deepEqual(errors, [])
  pass(
    'all private requests authenticated; all ' +
      created +
      ' Object URLs revoked; no runtime errors',
  )
  await writeFile(
    join(evidence, 'result.json'),
    JSON.stringify(
      {
        source:
          'Chrome; real components and HTTP client; temporary HTTP fixture, no development backend writes',
        checks,
        requests,
        created,
        revoked,
        errors,
      },
      null,
      2,
    ),
  )
  console.log('Evidence: ' + evidence)
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await Promise.race([vite?.close(), pause(2000)])
}
// Exit after `finally` has cleaned up: a lingering dev-server handle must not keep the run alive.
process.exit(process.exitCode ?? 0)
