import assert from 'node:assert/strict'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'
const exam = {
    id: 4,
    name: 'Primer parcial de Redes',
    subject_name: 'Redes de Computadoras',
  },
  student = {
    id: 7,
    first_names: 'Ana',
    last_names: 'Prueba',
    sis_code: '00123',
    identity_number: '00099',
  },
  second = { ...student, id: 8, first_names: 'Bruno', sis_code: '00124' }
const related = {
  id: 8,
  exam_id: 4,
  student_id: 7,
  type: 'COPYING',
  status: 'REPORTED',
  description: 'Uso de apuntes durante la evaluación.',
}
const meta = { current_page: 1, last_page: 1, per_page: 10, total: 1 }
let saved = null,
  canCreate = true,
  mode = 'ok',
  historyDenied = false
const requests = [],
  checks = []
const moduleSource = `import React from 'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider,Outlet}from'react-router';import'/src/assets/styles/global.css';import'@fontsource/poppins/400.css';import'@fontsource/poppins/500.css';import'@fontsource/poppins/600.css';import'@fontsource/poppins/700.css';import{Header}from'/src/shared/components/Header/Header.tsx';import{Footer}from'/src/shared/components/Footer/Footer.tsx';import{httpClient}from'/src/shared/api/httpClient.ts';import{ExamExpulsionsPage}from'/src/features/expulsions/pages/ExamExpulsionsPage.tsx';import{CreateExpulsionPage}from'/src/features/expulsions/pages/CreateExpulsionPage.tsx';import{ExpulsionDetailPage}from'/src/features/expulsions/pages/ExpulsionDetailPage.tsx';httpClient.defaults.baseURL='/__browser-api';function Layout(){return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:'Docente de prueba',role:'teacher'}}),React.createElement(Outlet),React.createElement(Footer))}const router=createMemoryRouter([{Component:Layout,children:[{path:'/teacher/exams/:examId/expulsions',Component:ExamExpulsionsPage},{path:'/teacher/exams/:examId/expulsions/create',Component:CreateExpulsionPage},{path:'/teacher/exams/:examId/expulsions/:expulsionId',Component:ExpulsionDetailPage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/teacher/exams/4/expulsions']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`
const b = await browserFixture({
  name: 'hu31-browser',
  moduleSource,
  handleRequest: async (req, url, json) => {
    const call = { method: req.method, path: url.pathname }
    requests.push(call)
    if (!url.pathname.startsWith('/exams/4/')) return json(403, {})
    if (url.pathname.endsWith('/entry-control/students'))
      return json(200, {
        exam: { id: 4 },
        data: [student, second].map((s) => ({ ...s, student_id: s.id })),
      })
    if (url.pathname.endsWith('/eligible-infractions')) {
      const id = Number(url.searchParams.get('student_id'))
      return json(200, {
        context: { exam_id: 4, student_id: id },
        data: id === 7 ? [related] : [],
        meta: { ...meta, total: id === 7 ? 1 : 0 },
      })
    }
    if (url.pathname === '/exams/4/students/7/expulsions') {
      if (historyDenied) return json(403, {})
      return json(200, {
        context: { exam_id: 4, student_id: 7 },
        data: [
          {
            exam: { ...exam, id: 5, name: 'Examen anterior' },
            expulsion: { ...saved, id: 6, exam_id: 5, infraction: null },
          },
        ],
        meta,
      })
    }
    if (req.method === 'POST' && url.pathname === '/exams/4/expulsions') {
      const chunks = []
      for await (const c of req) chunks.push(c)
      call.body = JSON.parse(Buffer.concat(chunks).toString())
      if (mode === 'conflict' || saved) return json(409, {})
      if (mode === 'validation')
        return json(422, {
          errors: { reason: ['Motivo rechazado por el servidor de prueba.'] },
        })
      if (mode === 'slow') await pause(1100)
      saved = {
        id: 9,
        exam_id: 4,
        student,
        reason: call.body.reason,
        expelled_at: '2026-11-03T14:00:00Z',
        expelled_by: { id: 2, name: 'Docente responsable' },
        status: 'EXPELLED',
        infraction: call.body.infraction_id ? related : null,
      }
      return json(201, { data: saved })
    }
    if (url.pathname === '/exams/4/expulsions')
      return json(200, {
        exam,
        permissions: { can_create: canCreate },
        data: saved ? [saved] : [],
        meta: { ...meta, total: saved ? 1 : 0 },
      })
    if (url.pathname === '/exams/4/expulsions/9' && saved)
      return json(200, { exam, data: saved })
    return json(404, {})
  },
})
const { wait, evaluate, fill, click, resize, shot } = b
const posts = () => requests.filter((r) => r.method === 'POST')
async function nav(path) {
  await evaluate(`window.__router.navigate(${JSON.stringify(path)})`)
  await pause(120)
}
async function link(text) {
  await wait(
    `[...document.querySelectorAll('a')].some(a=>a.textContent.trim()===${JSON.stringify(text)})`,
  )
  await evaluate(
    `[...document.querySelectorAll('a')].find(a=>a.textContent.trim()===${JSON.stringify(text)}).click()`,
  )
  await pause(100)
}
async function view(name) {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    await evaluate('window.scrollTo(0,0)')
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
    )
    await shot(`${name}-${width}`)
  }
}
async function choose(name = 'Ana') {
  await fill('input[type=search]', name)
  await wait(
    `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('${name} Prueba'))`,
  )
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('${name} Prueba')).click()`,
  )
  await pause(100)
}
try {
  await wait(
    "document.body.innerText.includes('No hay expulsiones registradas')",
  )
  await link('Registrar expulsión')
  await wait("document.querySelector('form')")
  await view('registro')
  await click('Confirmar expulsión')
  assert.equal(posts().length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'FIELDSET')
  await link('Cancelar')
  await wait("document.body.innerText.includes('Expulsiones del examen')")
  assert.equal(posts().length, 0)
  await link('Registrar expulsión')
  await wait("document.querySelector('form')")
  await choose()
  await click('Confirmar expulsión')
  assert.equal(posts().length, 0)
  assert.equal(await evaluate('document.activeElement.tagName'), 'TEXTAREA')
  await wait("document.body.innerText.includes('Vincular #8')")
  await click(
    'Vincular #8 · Copia · ReportadaUso de apuntes durante la evaluación.',
  )
  await click('Cambiar estudiante')
  await choose('Bruno')
  await wait(
    "document.body.innerText.includes('No hay infracciones disponibles')",
  )
  assert.equal(
    await evaluate("document.body.innerText.includes('Quitar asociación')"),
    false,
  )
  await click('Cambiar estudiante')
  await choose()
  await wait("document.body.innerText.includes('Vincular #8')")
  await click(
    'Vincular #8 · Copia · ReportadaUso de apuntes durante la evaluación.',
  )
  await view('registro-seleccionado')
  await fill(
    'textarea',
    'Decisión disciplinaria justificada.',
    'HTMLTextAreaElement',
  )
  await click('Confirmar expulsión')
  assert.equal(posts().length, 0)
  assert.equal(await evaluate('document.activeElement.type'), 'checkbox')
  await evaluate(
    "(()=>{const c=document.querySelector('input[type=checkbox]');if(!c.checked)c.click()})()",
  )
  assert.deepEqual(
    await evaluate(
      "(()=>{const r=document.querySelector('input[type=checkbox]').getBoundingClientRect();return[r.width,r.height]})()",
    ),
    [18, 18],
  )
  mode = 'validation'
  await click('Confirmar expulsión')
  await wait("document.body.innerText.includes('Motivo rechazado')")
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    'Decisión disciplinaria justificada.',
  )
  await fill(
    'textarea',
    'Decisión disciplinaria justificada.',
    'HTMLTextAreaElement',
  )
  await evaluate(
    "(()=>{const c=document.querySelector('input[type=checkbox]');if(!c.checked)c.click()})()",
  )
  mode = 'slow'
  const before = posts().length
  await click('Confirmar expulsión')
  await evaluate("document.querySelector('form').requestSubmit()")
  await nav('/other')
  await wait(
    "document.body.innerText.includes('Espera a que termine la operación')",
  )
  await wait(
    "document.body.innerText.includes('La expulsión fue registrada correctamente')",
  )
  assert.equal(posts().length, before + 1)
  assert.deepEqual(posts().at(-1).body, {
    student_id: 7,
    reason: 'Decisión disciplinaria justificada.',
    infraction_id: 8,
  })
  await view('detalle')
  await click('Consultar historial')
  await wait("document.querySelector('table')")
  assert.equal(
    await evaluate(
      "document.querySelector('table').innerText.includes('Examen anterior')",
    ),
    true,
  )
  await nav('/teacher/exams/4/expulsions')
  await wait("document.querySelector('table')")
  assert.equal(
    await evaluate(
      "document.querySelector('table').innerText.includes('Expulsado')",
    ),
    true,
  )
  await view('listado')
  await nav('/teacher/exams/4/expulsions/create')
  await wait("document.querySelector('form')")
  await choose()
  await fill('textarea', 'No duplicar.', 'HTMLTextAreaElement')
  await evaluate(
    "(()=>{const c=document.querySelector('input[type=checkbox]');if(!c.checked)c.click()})()",
  )
  const duplicates = posts().length
  await click('Confirmar expulsión')
  await wait(
    "document.body.innerText.includes('ya tiene una expulsión vigente')",
  )
  await evaluate("document.querySelector('form').requestSubmit()")
  assert.equal(posts().length, duplicates + 1)
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    'No duplicar.',
  )
  canCreate = false
  historyDenied = true
  await nav('/other')
  await nav('/teacher/exams/4/expulsions/create')
  await wait("document.body.innerText.includes('Solo el docente responsable')")
  assert.equal(await evaluate("document.querySelector('form')===null"), true)
  await nav('/teacher/exams/4/expulsions/9')
  await wait(
    "document.body.innerText.includes('Estado en este examen: Expulsado')",
  )
  await click('Consultar historial')
  await wait(
    "document.body.innerText.includes('Solo el docente responsable autorizado')",
  )
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('Sin expulsiones anteriores disponibles')",
    ),
    false,
  )
  await nav('/teacher/exams/5/expulsions/9')
  await wait(
    "document.body.innerText.includes('Solo el docente responsable autorizado')",
  )
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('Decisión disciplinaria justificada.')",
    ),
    false,
  )
  checks.push(
    'Required student/reason/confirmation; related infraction remains reported; 422 keeps draft; serialized POST and navigation guard; validated detail and server actor/time; EXPELLED table; scoped history; duplicate409 blocks retries; denied create/history and cross-exam reads; no overflow 1440/1024/768/390/320; checkbox18px',
  )
  assert.deepEqual(b.errors, [])
  await b.report({ checks, requests })
  console.log(JSON.stringify({ checks, errors: b.errors, output: b.output }))
} finally {
  await b.close()
}
