// Node20: node --experimental-websocket src/features/infractions/tests/infractions.browser.mjs
// Real UI, isolated HTTP fixture. No real backend/database mutations.
import assert from 'node:assert/strict'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'
import { exam, student, record, created, meta } from './infractionFixtures.mjs'

let saved = null,
  canCreate = true,
  readOnly = false,
  historyDenied = false,
  createMode = 'ok',
  changeMode = 'ok'
const requests = [],
  checks = []
const moduleSource = `import React from 'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider,Outlet}from'react-router';
import'/src/assets/styles/global.css';import'@fontsource/poppins/400.css';import'@fontsource/poppins/500.css';import'@fontsource/poppins/600.css';import'@fontsource/poppins/700.css';
import{Header}from'/src/shared/components/Header/Header.tsx';import{Footer}from'/src/shared/components/Footer/Footer.tsx';import{httpClient}from'/src/shared/api/httpClient.ts';import{ExamInfractionsPage}from'/src/features/infractions/pages/ExamInfractionsPage.tsx';import{CreateInfractionPage}from'/src/features/infractions/pages/CreateInfractionPage.tsx';import{InfractionDetailPage}from'/src/features/infractions/pages/InfractionDetailPage.tsx';
httpClient.defaults.baseURL='/__browser-api';httpClient.defaults.headers.common.Authorization='Bearer hu30-fixture';
function Layout(){return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:'Docente de prueba',role:'teacher'}}),React.createElement(Outlet),React.createElement(Footer))}
const router=createMemoryRouter([{Component:Layout,children:[{path:'/teacher/exams/:examId/infractions',Component:ExamInfractionsPage},{path:'/teacher/exams/:examId/infractions/create',Component:CreateInfractionPage},{path:'/teacher/exams/:examId/infractions/:infractionId',Component:InfractionDetailPage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/teacher/exams/4/infractions']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`
const browser = await browserFixture({
  name: 'hu30-browser',
  moduleSource,
  handleRequest: async (req, url, json) => {
    const call = { method: req.method, path: url.pathname }
    requests.push(call)
    if (req.headers.authorization !== 'Bearer hu30-fixture')
      return json(401, {})
    if (!url.pathname.startsWith('/exams/4/')) return json(403, {})
    if (url.pathname.endsWith('/entry-control/students'))
      return json(200, {
        exam: { id: 4 },
        data: [{ student_id: student.id, ...student }],
      })
    if (url.pathname === '/exams/4/students/7/infractions') {
      if (historyDenied) return json(403, {})
      return json(200, {
        context: { exam_id: 4, student_id: 7 },
        data: [
          {
            exam: { ...exam, id: 5, name: 'Examen anterior' },
            infraction: {
              ...record,
              id: 8,
              exam_id: 5,
              status: 'RESOLVED',
              permissions: { can_update: false, allowed_statuses: [] },
            },
          },
        ],
        meta,
      })
    }
    if (req.method === 'POST' && url.pathname === '/exams/4/infractions') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      call.body = JSON.parse(Buffer.concat(chunks).toString())
      if (!canCreate || createMode === 'forbidden') return json(403, {})
      if (createMode === 'validation')
        return json(422, {
          errors: {
            description: ['Descripción rechazada por el servidor de prueba.'],
          },
        })
      if (createMode === 'slow') await pause(1200)
      saved = {
        exam,
        data: {
          ...record,
          type: call.body.type,
          description: call.body.description,
          observations: call.body.observations,
        },
        history: [created],
      }
      return createMode === 'uncertain'
        ? json(500, {})
        : json(201, { data: saved.data })
    }
    if (
      req.method === 'PATCH' &&
      url.pathname === '/exams/4/infractions/9/status'
    ) {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      call.body = JSON.parse(Buffer.concat(chunks).toString())
      if (readOnly) return json(403, {})
      if (
        changeMode === 'conflict' ||
        call.body.expected_updated_at !== saved.data.updated_at
      )
        return json(409, {})
      if (changeMode === 'slow') await pause(1200)
      const timestamp =
        saved.history.length === 1
          ? '2026-11-03T14:10:00Z'
          : '2026-11-03T14:20:00Z'
      saved = {
        ...saved,
        data: {
          ...saved.data,
          status: call.body.status,
          updated_at: timestamp,
          permissions: {
            can_update: call.body.status !== 'RESOLVED',
            allowed_statuses:
              call.body.status === 'CONFIRMED' ? ['RESOLVED'] : [],
          },
        },
        history: [
          ...saved.history,
          {
            id: saved.history.length + 1,
            action: 'STATUS_CHANGED',
            from_status: saved.data.status,
            to_status: call.body.status,
            reason: call.body.reason,
            performed_by: record.reported_by,
            performed_at: timestamp,
          },
        ],
      }
      return json(200, saved)
    }
    if (url.pathname === '/exams/4/infractions')
      return json(200, {
        exam,
        data: saved
          ? [
              {
                ...saved.data,
                ...(readOnly
                  ? { permissions: { can_update: false, allowed_statuses: [] } }
                  : {}),
              },
            ]
          : [],
        meta: { ...meta, total: saved ? 1 : 0 },
        permissions: { can_create: canCreate },
      })
    if (url.pathname === '/exams/4/infractions/9' && saved)
      return json(200, {
        ...saved,
        data: {
          ...saved.data,
          ...(readOnly
            ? { permissions: { can_update: false, allowed_statuses: [] } }
            : {}),
        },
      })
    return json(404, {})
  },
})
const { wait, evaluate, click, fill, resize, shot } = browser
const writes = () =>
  requests.filter((r) => ['POST', 'PATCH'].includes(r.method))
const patches = () => requests.filter((r) => r.method === 'PATCH')
async function link(label) {
  await evaluate(
    `[...document.querySelectorAll('a')].find(a=>a.textContent===${JSON.stringify(label)}).click()`,
  )
  await pause(100)
}
async function navigate(path) {
  await evaluate(`window.__router.navigate(${JSON.stringify(path)})`)
  await pause(100)
}
async function viewport(name) {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    await evaluate('window.scrollTo(0,0)')
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
    )
    await shot(name + '-' + width)
  }
}
async function statusPayload(
  target = 'CONFIRMED',
  reason = 'Se revisó la evidencia.',
) {
  await fill('select', target, 'HTMLSelectElement')
  await fill('textarea', reason, 'HTMLTextAreaElement')
  await evaluate("document.querySelector('input[type=checkbox]').click()")
}
try {
  await wait(
    "document.body.innerText.includes('No hay infracciones registradas')",
  )
  await link('Registrar infracción')
  await wait("document.querySelector('form')")
  await viewport('registro')
  await click('Registrar infracción')
  assert.equal(writes().length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'FIELDSET')
  await fill('input[type=search]', 'Ana')
  await wait(
    'document.querySelector(\'[aria-label="Resultados de estudiantes"] button\')',
  )
  await evaluate(
    'document.querySelector(\'[aria-label="Resultados de estudiantes"] button\').click()',
  )
  await fill('select', 'COPYING', 'HTMLSelectElement')
  await fill('textarea', record.description, 'HTMLTextAreaElement')
  await fill(
    'textarea[id$="-observations"]',
    record.observations,
    'HTMLTextAreaElement',
  )
  createMode = 'validation'
  await click('Registrar infracción')
  await wait("document.body.innerText.includes('Descripción rechazada')")
  assert.equal(await evaluate('document.activeElement.tagName'), 'TEXTAREA')
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    record.description,
  )
  createMode = 'slow'
  const before = writes().length
  await click('Registrar infracción')
  await evaluate("document.querySelector('form').requestSubmit()")
  await navigate('/other')
  await wait(
    "document.body.innerText.includes('Espera a que termine la operación')",
  )
  await wait('document.querySelector(\'article[aria-label="Infracción 9"]\')')
  assert.equal(writes().length, before + 1)
  assert.deepEqual(writes().at(-1).body, {
    student_id: 7,
    type: 'COPYING',
    description: record.description,
    observations: record.observations,
  })
  assert.equal(saved.data.status, 'REPORTED')
  assert.equal(
    await evaluate(
      "document.querySelector('article').innerText.includes('no constituye una infracción confirmada')",
    ),
    true,
  )
  await viewport('detalle')
  await click('Consultar antecedentes')
  await wait("document.querySelector('table')")
  assert.equal(
    await evaluate(
      "document.querySelector('table').innerText.includes('Examen anterior')",
    ),
    true,
  )
  checks.push(
    'Create: required student/type/description, scoped student picker, optional observations, 422 draft/focus, double submit serialized, navigation guarded, confirmed receipt opens reported detail',
  )
  await click('Actualizar estado')
  await wait("document.querySelector('form')")
  await viewport('seguimiento')
  assert.deepEqual(
    await evaluate(
      "(()=>{const r=document.querySelector('input[type=checkbox]').getBoundingClientRect();return[r.width,r.height]})()",
    ),
    [18, 18],
  )
  await click('Confirmar cambio de estado')
  assert.equal(patches().length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'SELECT')
  await fill('select', 'CONFIRMED', 'HTMLSelectElement')
  await fill('textarea', 'Se revisó la evidencia.', 'HTMLTextAreaElement')
  await click('Confirmar cambio de estado')
  assert.equal(patches().length, 0)
  assert.equal(await evaluate('document.activeElement.type'), 'checkbox')
  await click('Cancelar cambio')
  await wait("!document.querySelector('form')")
  assert.equal(saved.data.status, 'REPORTED')
  await click('Actualizar estado')
  await statusPayload()
  changeMode = 'conflict'
  await click('Confirmar cambio de estado')
  await wait(
    "document.body.innerText.includes('Consulta el detalle actualizado')",
  )
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    'Se revisó la evidencia.',
  )
  const rejected = patches().length
  await evaluate("document.querySelector('form').requestSubmit()")
  assert.equal(patches().length, rejected)
  await click('Consultar detalle actualizado')
  await wait("!document.querySelector('form')")
  await click('Actualizar estado')
  await statusPayload()
  changeMode = 'slow'
  const updates = patches().length
  await click('Confirmar cambio de estado')
  await evaluate("document.querySelector('form').requestSubmit()")
  await navigate('/other')
  await wait(
    "document.body.innerText.includes('Espera a que termine la operación')",
  )
  await wait(
    "document.body.innerText.includes('El servidor confirmó el estado: Confirmada')",
  )
  await wait(
    "document.querySelector('[aria-label=\"Historial de seguimiento\"]').innerText.includes('Se revisó la evidencia.')",
  )
  assert.equal(patches().length, updates + 1)
  assert.equal(saved.data.reported_by.id, record.reported_by.id)
  assert.equal(saved.data.occurred_at, record.occurred_at)
  await click('Actualizar estado')
  await wait("document.querySelector('form')")
  assert.deepEqual(
    await evaluate(
      "[...document.querySelector('select').options].map(o=>o.value)",
    ),
    ['', 'RESOLVED'],
  )
  await statusPayload('RESOLVED', 'Se concluyó la revisión.')
  changeMode = 'ok'
  await click('Confirmar cambio de estado')
  await wait(
    "document.body.innerText.includes('El servidor confirmó el estado: Resuelta')",
  )
  assert.equal(saved.history.length, 3)
  assert.equal(saved.data.status, 'RESOLVED')
  await resize(1440)
  await shot('resuelta-desktop')
  await resize(390)
  await shot('resuelta-mobile')
  checks.push(
    'Detail: preserved facts/author/time, authorized antecedents, explicit status decision, cancel without write, 409 retains reason and blocks retry, confirmed/resolved audit and allowed transitions only',
  )
  readOnly = true
  historyDenied = true
  canCreate = false
  await navigate('/other')
  await navigate('/teacher/exams/4/infractions/9')
  await wait("document.querySelector('article')")
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].some(b=>b.textContent==='Actualizar estado')",
    ),
    false,
  )
  await click('Consultar antecedentes')
  await wait("document.body.innerText.includes('No tienes autorización')")
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('No hay antecedentes disponibles')",
    ),
    false,
  )
  await navigate('/teacher/exams/4/infractions/create')
  await wait("document.body.innerText.includes('Solo el docente responsable')")
  assert.equal(await evaluate("document.querySelector('form')===null"), true)
  await navigate('/teacher/exams/5/infractions/9')
  await wait("document.body.innerText.includes('No tienes autorización')")
  assert.equal(await evaluate("document.querySelector('article')===null"), true)
  checks.push(
    'Permissions: no unauthorized creation/state controls; denied history is not empty; another exam never shows previous evidence; 1440/1024/768/390/320px have no horizontal overflow',
  )
  assert.deepEqual(browser.errors, [])
  await browser.report({ checks, requests })
  console.log(
    JSON.stringify(
      { checks, errors: browser.errors, output: browser.output },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
