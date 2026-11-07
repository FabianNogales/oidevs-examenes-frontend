// Opt-in browser test against real Laravel + disposable PostgreSQL, never development data.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'
const dir = new URL('../../../../../tmp/sprint3-integration/', import.meta.url)
const f = JSON.parse(await readFile(new URL('fixture.json', dir), 'utf8'))
const database = JSON.parse(
  await readFile(new URL('database.json', dir), 'utf8'),
).database
assert.match(
  JSON.parse(await readFile(new URL('database.json', dir), 'utf8')).database,
  /^sprint3_test_[a-f0-9]{12}$/,
)
const requests = [],
  checks = [],
  exam = f.exam_id
// Seed data and clock come from PostgreSQL. No mocked API payloads or bearer-token injection.
const moduleSource = `import React from'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider,Outlet}from'react-router';import'/src/assets/styles/global.css';import'@fontsource/poppins/400.css';import'@fontsource/poppins/500.css';import'@fontsource/poppins/600.css';import'@fontsource/poppins/700.css';import{Header}from'/src/shared/components/Header/Header.tsx';import{Footer}from'/src/shared/components/Footer/Footer.tsx';import{httpClient,backendHttpClient}from'/src/shared/api/httpClient.ts';import{login,getCurrentUser}from'/src/features/auth/api/authApi.ts';import{ExamIncidentsPage}from'/src/features/incidents/pages/ExamIncidentsPage.tsx';import{CreateIncidentPage}from'/src/features/incidents/pages/CreateIncidentPage.tsx';import{IncidentDetailPage}from'/src/features/incidents/pages/IncidentDetailPage.tsx';import{ExamInfractionsPage}from'/src/features/infractions/pages/ExamInfractionsPage.tsx';import{CreateInfractionPage}from'/src/features/infractions/pages/CreateInfractionPage.tsx';import{InfractionDetailPage}from'/src/features/infractions/pages/InfractionDetailPage.tsx';import{ExamExpulsionsPage}from'/src/features/expulsions/pages/ExamExpulsionsPage.tsx';import{CreateExpulsionPage}from'/src/features/expulsions/pages/CreateExpulsionPage.tsx';import{ExpulsionDetailPage}from'/src/features/expulsions/pages/ExpulsionDetailPage.tsx';import{EntryControlPage}from'/src/features/exams/pages/EntryControlPage.tsx';
httpClient.defaults.baseURL='/__browser-api/api/v1';backendHttpClient.defaults.baseURL='/__browser-api';
window.__api=httpClient;window.__login=async(identifier)=>{await login({identifier,password:'IntegrationDemo1'});return getCurrentUser()};
async function start(){const user=await window.__login('integration.owner@umss.edu.bo');window.__user=user;function Layout(){return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:user.display_name,role:'teacher'}}),React.createElement(Outlet),React.createElement(Footer))}const router=createMemoryRouter([{Component:Layout,children:[{path:'/exams/:examId/incidents',Component:ExamIncidentsPage},{path:'/exams/:examId/incidents/create',Component:CreateIncidentPage},{path:'/exams/:examId/incidents/:incidentId',Component:IncidentDetailPage},{path:'/teacher/exams/:examId/infractions',Component:ExamInfractionsPage},{path:'/teacher/exams/:examId/infractions/create',Component:CreateInfractionPage},{path:'/teacher/exams/:examId/infractions/:infractionId',Component:InfractionDetailPage},{path:'/teacher/exams/:examId/expulsions',Component:ExamExpulsionsPage},{path:'/teacher/exams/:examId/expulsions/create',Component:CreateExpulsionPage},{path:'/teacher/exams/:examId/expulsions/:expulsionId',Component:ExpulsionDetailPage},{path:'/control/:examId',Component:EntryControlPage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/exams/${exam}/incidents?from=teacher']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));}start().catch(e=>{window.__startError=e.response?.data??e.message;document.body.innerText='Error de integración: '+JSON.stringify(window.__startError)});`
const browser = await browserFixture({
  name: 'sprint3-real-browser',
  moduleSource,
  handleRequest: async (req, url, _json, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const headers = { Accept: req.headers.accept ?? 'application/json' }
    for (const key of [
      'content-type',
      'cookie',
      'x-xsrf-token',
      'origin',
      'referer',
    ])
      if (req.headers[key]) headers[key] = req.headers[key]
    const r = await fetch(`http://127.0.0.1:8053${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : Buffer.concat(chunks),
      redirect: 'manual',
    })
    assert.equal(
      r.headers.get('x-eida-qa-database'),
      database,
      'Expected isolated integration backend',
    )
    requests.push({ method: req.method, path: url.pathname, status: r.status })
    res.statusCode = r.status
    for (const key of ['content-type', 'content-disposition', 'location'])
      if (r.headers.get(key)) res.setHeader(key, r.headers.get(key))
    if (r.headers.getSetCookie().length)
      res.setHeader('set-cookie', r.headers.getSetCookie())
    res.end(Buffer.from(await r.arrayBuffer()))
  },
})
const { wait, evaluate, fill, click: rawClick, resize, shot } = browser
async function click(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.getClientRects().length && !b.disabled && b.textContent.trim()===${JSON.stringify(label)})`,
  )
  await rawClick(label)
}
async function nav(path) {
  await evaluate(`window.__router.navigate(${JSON.stringify(path)})`)
  await pause(150)
}
async function link(text) {
  await wait(
    `[...document.querySelectorAll('a')].some(a=>a.textContent.trim()===${JSON.stringify(text)})`,
  )
  await evaluate(
    `[...document.querySelectorAll('a')].find(a=>a.textContent.trim()===${JSON.stringify(text)}).click()`,
  )
  await pause(150)
}
async function choose(name) {
  await fill('input[type=search]', name)
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('${name} Prueba'))`,
  )
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('${name} Prueba')).click()`,
  )
  await pause(150)
}
async function shotBoth(name) {
  for (const width of [1440, 390]) {
    await resize(width)
    await evaluate('window.scrollTo(0,0)')
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
    )
    await shot(`${name}-${width}`)
  }
}
try {
  await wait('window.__router || window.__startError')
  assert.equal(await evaluate('window.__startError??null'), null)
  assert.equal(await evaluate('window.__user.id'), f.owner_id)
  checks.push('Cookie login + CSRF + /me on real Laravel, no mock auth')
  await link('Registrar incidencia')
  await wait("document.querySelector('form')")
  await fill('select', 'ENVIRONMENT', 'HTMLSelectElement')
  await fill(
    'textarea',
    'Incidencia guardada desde interfaz real.',
    'HTMLTextAreaElement',
  )
  await click('Registrar incidencia')
  await wait(
    "document.body.innerText.includes('Incidencia guardada desde interfaz real.') && !document.querySelector('form')",
  )
  await shotBoth('hu27-detalle')
  await nav(`/exams/${exam}/incidents?from=teacher`)
  await wait("document.querySelector('table')")
  await shotBoth('hu29-consulta')
  const exports = await evaluate(
    `(async()=>{const{exportIncidentReport}=await import('/src/features/incidents/api/incidentExportApi.ts');const q={search:'',type:'ENVIRONMENT',status:'',date_from:'',date_to:'',page:1};const csv=await exportIncidentReport(${exam},q,'csv'),pdf=await exportIncidentReport(${exam},q,'pdf');return{csv:await csv.text(),pdf:await pdf.slice(0,5).text()}})()`,
  )
  assert.ok(exports.csv.includes('Incidencia guardada desde interfaz real.'))
  assert.equal(exports.pdf, '%PDF-')
  checks.push(
    'HU27 page creation and persistent detail; HU29 shared table, filters and valid CSV/PDF via real client',
  )
  await nav(`/teacher/exams/${exam}/infractions/create`)
  await wait("document.querySelector('form')")
  await choose('Bruno')
  await fill('select', 'CHEATING', 'HTMLSelectElement')
  await fill(
    'textarea',
    'Infracción registrada desde interfaz real.',
    'HTMLTextAreaElement',
  )
  await click('Registrar infracción')
  await wait(
    "document.body.innerText.includes('Infracción registrada. Consulta su estado')",
  )
  const infractionId = await evaluate(
    'Number(window.__router.state.location.pathname.split("/").at(-1))',
  )
  await click('Actualizar estado')
  await fill('select', 'CONFIRMED', 'HTMLSelectElement')
  await fill(
    'textarea',
    'Decisión justificada desde interfaz real.',
    'HTMLTextAreaElement',
  )
  await evaluate("document.querySelector('input[type=checkbox]').click()")
  await click('Confirmar cambio de estado')
  await wait(
    "document.body.innerText.includes('El servidor confirmó el estado: Confirmada')",
  )
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Consultar antecedentes')",
  )
  await click('Consultar antecedentes')
  await wait("document.querySelector('table')")
  await shotBoth('hu30-confirmada')
  checks.push(
    'HU30 scoped student picker, reported creation, confirmed state, conserved observations, revision, audit and antecedents',
  )
  await nav(`/teacher/exams/${exam}/expulsions/create`)
  await wait("document.querySelector('form')")
  await choose('Bruno')
  await wait(`document.body.innerText.includes('Vincular #${infractionId}')`)
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Vincular #${infractionId}')).click()`,
  )
  await fill(
    'textarea',
    'Expulsión decidida desde interfaz real.',
    'HTMLTextAreaElement',
  )
  await evaluate("document.querySelector('input[type=checkbox]').click()")
  await click('Confirmar expulsión')
  await wait(
    "document.body.innerText.includes('La expulsión fue registrada correctamente')",
  )
  await click('Consultar historial')
  await wait("document.querySelector('table')")
  await shotBoth('hu31-detalle')
  checks.push(
    'HU31 optional linked infraction, explicit confirmation, EXPELLED condition, actor/time and real history',
  )
  await nav(`/control/${exam}?from=teacher`)
  await wait("document.querySelector('table')")
  await wait("document.body.innerText.includes('Expulsado de este examen')")
  const entryResponse = await evaluate(
    `(async()=>{const r=await window.__api.post('/exams/${exam}/entry-control/students/${f.student_ids[0]}/entries',{room_id:${f.room_id}});return r.status})()`,
  )
  assert.equal(entryResponse, 201)
  await nav('/other')
  await nav(`/control/${exam}?from=teacher`)
  await wait("document.querySelector('table')")
  await click('Gestionar ingresos')
  await wait("document.querySelector('[role=dialog] table')")
  await evaluate(
    "[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Anular ingreso').click()",
  )
  await wait("document.querySelector('textarea')")
  await fill(
    'textarea',
    'Anulación justificada desde interfaz real.',
    'HTMLTextAreaElement',
  )
  await evaluate("document.querySelector('input[type=checkbox]').click()")
  await click('Confirmar anulación')
  await wait(
    "document.body.innerText.includes('anulado. Se conserva su evidencia original.')",
  )
  await shotBoth('hu28-anulado')
  checks.push(
    'HU28 real entry/annulment, original history retained and refreshed indicators; HU31 informational badges coexist with attendance',
  )
  await nav('/other')
  await evaluate(
    "(async()=>{const {logout}=await import('/src/features/auth/api/authApi.ts');await logout();return window.__login('integration.collaborator@umss.edu.bo')})()",
  )
  await nav(`/teacher/exams/${exam}/infractions/create`)
  await wait("document.body.innerText.includes('No tienes autorización')")
  assert.equal(await evaluate("document.querySelector('form')===null"), true)
  await nav(`/teacher/exams/${exam}/expulsions/create`)
  await wait(
    "document.body.innerText.includes('Solo el docente responsable autorizado')",
  )
  assert.equal(await evaluate("document.querySelector('form')===null"), true)
  checks.push('Real cookie collaborator cannot register infractions/expulsions')
  assert.deepEqual(browser.errors, [])
  await browser.report({
    fixtureOnly: false,
    realBackend: true,
    checks,
    requests,
  })
  console.log(
    JSON.stringify({ checks, errors: browser.errors, output: browser.output }),
  )
} finally {
  await browser.close()
}
