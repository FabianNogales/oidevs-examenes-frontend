// Node20: node --experimental-websocket src/features/entry-annulments/tests/entryAnnulment.browser.mjs
// No backend or database: real React components, controlled HTTP responses.
import assert from 'node:assert/strict'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'

const student = {
  student_id: 7,
  first_names: 'Ana',
  last_names: 'Prueba',
  sis_code: '00123',
  identity_number: '12345',
  historical_photo_url: null,
  profile_photo_url: null,
}
const original = {
  student,
  permissions: { can_annul: true },
  entry: {
    id: 9,
    exam_id: 4,
    student_id: 7,
    room_id: 2,
    status: 'VALID',
    entered_at: '2026-11-03T14:00:00Z',
    verification_method: 'QR',
    verified_by: 3,
    verified_by_name: 'Colaborador original',
    annulment: null,
  },
}
const exam = {
  id: 4,
  name: 'Parcial HU28',
  subject_name: 'Taller de Software',
  exam_date: '2026-11-03',
  start_time: '10:00:00',
  duration_minutes: 90,
  evaluation_type: 'partial',
  status: 'SCHEDULED',
  entry_available: true,
  entry_unavailable_reason: null,
  entry_opens_at: null,
  entry_closes_at: null,
  server_time: '2026-11-03T14:10:00Z',
  room: { id: 2, code: 'A-1', name: 'Aula de prueba' },
}
let record = structuredClone(original),
  permission = true,
  behavior = 'ok',
  historyFails = false
const requests = [],
  checks = []
const moduleSource = `import React from 'react';import {createRoot} from 'react-dom/client';import {createMemoryRouter,RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';import '@fontsource/poppins/600.css';

import {httpClient} from '/src/shared/api/httpClient.ts';import {EntryControlPage} from '/src/features/exams/pages/EntryControlPage.tsx';
httpClient.defaults.baseURL='/__browser-api';httpClient.defaults.headers.common.Authorization='Bearer hu28-fixture';
const router=createMemoryRouter([{path:'/control/:examId',Component:EntryControlPage},{path:'/other',element:React.createElement('p',null,'Otra página')}],{initialEntries:['/control/4?from=teacher']});window.__router=router;
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement('header',{style:{position:'sticky',top:0,zIndex:50,height:100,background:'#EAF3FF'}},'Encabezado de prueba'),React.createElement(RouterProvider,{router})));`

const browser = await browserFixture({
  name: 'hu28-browser',
  moduleSource,
  handleRequest: async (req, url, json) => {
    const call = { method: req.method, path: url.pathname }
    requests.push(call)
    if (req.headers.authorization !== 'Bearer hu28-fixture')
      return json(401, {})
    const registered = record.entry.status === 'VALID'
    if (
      req.method === 'GET' &&
      url.pathname.endsWith('/entry-control/students')
    ) {
      const item = {
        ...student,
        student_status: 'ACTIVE',
        enrollment_status: 'ACTIVE',
        eligibility_status: 'ELIGIBLE',
        reason_code: null,
        reason: null,
        observations: null,
        assigned_room_id: 2,
        controlled_room_id: 2,
        room_status: 'MATCH',
        entry_status: registered ? 'REGISTERED' : 'PENDING',
        entry: registered ? record.entry : null,
        meets_entry_conditions: !registered,
        blockers: registered
          ? [{ code: 'ALREADY_REGISTERED', message: 'Ingreso existente.' }]
          : [],
      }
      return json(200, {
        exam,
        permissions: { can_annul_entries: permission },
        summary: {
          total_students: 1,
          registered: registered ? 1 : 0,
          pending: registered ? 0 : 1,
          not_applicable: 0,
        },
        filter_counts: {
          all: 1,
          registered: registered ? 1 : 0,
          pending: registered ? 0 : 1,
          incidents: 0,
        },
        data: [item],
        meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
      })
    }
    if (
      req.method === 'GET' &&
      url.pathname === '/exams/4/entry-control/entries'
    )
      return historyFails
        ? json(500, {})
        : json(200, {
            data: [record],
            meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
          })
    if (
      req.method === 'POST' &&
      url.pathname === '/exams/4/entry-control/entries/9/annulment'
    ) {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      call.body = JSON.parse(Buffer.concat(chunks).toString())
      if (behavior === 'validation')
        return json(422, {
          errors: { reason: ['Motivo rechazado por el servidor de prueba.'] },
        })
      if (behavior === 'forbidden') return json(403, {})
      if (behavior === 'conflict') return json(409, {})
      if (behavior === 'slow') await pause(1200)
      record = {
        ...record,
        permissions: { can_annul: false },
        entry: {
          ...record.entry,
          status: 'ANNULLED',
          annulment: {
            reason: call.body.reason,
            annulled_at: '2026-11-03T14:10:00Z',
            annulled_by: { id: 2, name: 'Docente responsable' },
          },
        },
      }
      // Simulate a committed operation whose success response was lost.
      return behavior === 'uncertain'
        ? json(500, {})
        : json(200, { data: record })
    }
    return json(404, {})
  },
})

const { evaluate, wait, resize, shot, click, fill, send } = browser
const posts = () => requests.filter((r) => r.method === 'POST')
const hasAnnul = `[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.textContent.trim()==='Anular ingreso')`
async function openHistory() {
  await wait("document.body.innerText.includes('Gestionar ingresos')")
  await click('Gestionar ingresos')
  await wait("document.querySelector('[role=dialog] table')")
}
async function openConfirmation() {
  await click('Anular ingreso')
  await wait("document.querySelector('textarea')")
}
async function remount() {
  await evaluate("window.__router.navigate('/other')")
  await pause(80)
  await evaluate("window.__router.navigate('/control/4?from=teacher')")
  await wait("document.querySelector('h1')?.textContent==='Control de ingreso'")
  await pause(350)
}

try {
  await openHistory()
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
    )
    await shot('historial-' + width)
  }
  await fill('[role=dialog] input[type=search]', 'Ana')
  await pause(400)
  await openConfirmation()
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    const geometry = await evaluate(
      `(()=>{const d=document.querySelector('[role=dialog]'),c=d.querySelector('input[type=checkbox]').getBoundingClientRect(),b=d.querySelector('[aria-label="Cerrar modal"]').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,checkbox:[c.width,c.height],close:b.top>=0&&b.bottom<=innerHeight&&!!document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)?.closest('[role=dialog]')}})()`,
    )
    assert.equal(geometry.overflow, false)
    assert.deepEqual(geometry.checkbox, [18, 18])
    assert.equal(geometry.close, true)
    await shot('confirmacion-' + width)
  }
  await click('Confirmar anulación')
  assert.equal(posts().length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'TEXTAREA')
  await evaluate("document.querySelector('button[type=submit]').focus()")
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
  })
  assert.equal(
    await evaluate("document.activeElement.getAttribute('aria-label')"),
    'Cerrar modal',
  )
  await fill('textarea', 'Registro equivocado.', 'HTMLTextAreaElement')
  await click('Conservar ingreso')
  await wait("document.querySelector('[role=dialog] table')")
  assert.equal(posts().length, 0)
  assert.equal(record.entry.status, 'VALID')
  assert.equal(
    await evaluate(
      "document.querySelector('[role=dialog] input[type=search]').value",
    ),
    'Ana',
  )
  checks.push(
    'Desktop/tablet/mobile 1440/1024/768/390/320px: no horizontal overflow, compact checkbox, accessible close; cancel retains original attendance and search',
  )
  await openConfirmation()
  await fill('textarea', '  Registro equivocado.  ', 'HTMLTextAreaElement')
  await evaluate("document.querySelector('input[type=checkbox]').click()")
  behavior = 'validation'
  await click('Confirmar anulación')
  await wait("document.body.innerText.includes('Motivo rechazado')")
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    '  Registro equivocado.  ',
  )
  assert.equal(await evaluate('document.activeElement.tagName'), 'TEXTAREA')
  behavior = 'slow'
  const before = posts().length
  await click('Confirmar anulación')
  await evaluate("document.querySelector('form').requestSubmit()")
  await evaluate("window.__router.navigate('/other')")
  await wait(
    "document.body.innerText.includes('Espera a que termine la anulación')",
  )
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  })
  assert.equal(
    await evaluate(
      "document.querySelector('[role=dialog]')?.getAttribute('aria-busy')",
    ),
    'true',
  )
  await wait("document.body.innerText.includes('Ingreso #9 anulado')")
  await wait("document.querySelector('[role=dialog] table')")
  await wait(
    "document.querySelector('[aria-label=\"Resumen de estudiantes del examen\"]').innerText.includes('0 de 1 registrados')",
  )
  assert.equal(posts().length, before + 1)
  assert.deepEqual(posts().at(-1).body, { reason: 'Registro equivocado.' })
  assert.equal(await evaluate(hasAnnul), false)
  assert.equal(record.entry.entered_at, original.entry.entered_at)
  await evaluate(
    "[...document.querySelectorAll('[role=dialog] details')].filter(d=>d.getClientRects().length).forEach(d=>d.open=true)",
  )
  await shot('anulado-mobile')
  await resize(1440)
  await shot('anulado-desktop')
  checks.push(
    '422 preserves reason/focus; keyboard focus trapped; double submit sends one POST; Escape/navigation blocked while busy; original retained, annulment audit displayed and server summary refreshed',
  )
  for (const failure of ['forbidden', 'conflict', 'uncertain']) {
    record = structuredClone(original)
    behavior = failure
    await remount()
    await openHistory()
    await openConfirmation()
    await fill('textarea', 'Registro equivocado.', 'HTMLTextAreaElement')
    await evaluate("document.querySelector('input[type=checkbox]').click()")
    const before = posts().length
    await click('Confirmar anulación')
    await wait("document.body.innerText.includes('Vuelve al historial')")
    assert.equal(
      await evaluate("document.querySelector('button[type=submit]').disabled"),
      true,
    )
    await evaluate("document.querySelector('form').requestSubmit()")
    assert.equal(posts().length, before + 1)
    await click('Volver al historial')
    await wait("document.querySelector('[role=dialog] table')")
    if (failure === 'uncertain') assert.equal(await evaluate(hasAnnul), false)
    else assert.equal(record.entry.status, 'VALID')
  }
  checks.push(
    '403/409/uncertain committed response do not fabricate success or retry; returning refreshes history and counters',
  )
  behavior = 'ok'
  record = structuredClone(original)
  delete record.permissions
  await remount()
  await openHistory()
  assert.equal(await evaluate(hasAnnul), false)
  historyFails = true
  await click('Actualizar historial')
  await wait(
    "document.body.innerText.includes('No se pudo consultar el historial')",
  )
  assert.equal(
    await evaluate("document.body.innerText.includes('Aún no hay ingresos')"),
    false,
  )
  historyFails = false
  await click('Reintentar')
  await wait("document.querySelector('[role=dialog] table')")
  permission = false
  await remount()
  assert.equal(
    await evaluate("document.body.innerText.includes('Gestionar ingresos')"),
    false,
  )
  checks.push(
    'Legacy history stays read-only; history error is not empty state; missing server management permission hides access',
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
