// Browser UI with controlled HTTP only. No backend/database changes.
import assert from 'node:assert/strict'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'
import {
  exam,
  catalog,
  report,
  row,
  entry,
  pending,
  incident,
  infraction,
  expulsion,
} from './reportFixtures.mjs'
let mode = 'teacher',
  downloadMode = 'ok',
  classification = 'PENDING',
  denied = false,
  serial = 0
const snapshots = new Map(),
  requests = [],
  checks = []
const other = {
  ...exam,
  id: 5,
  name: 'Final de Bases de Datos',
  subject: { id: 5, code: 'BD-01', name: 'Bases de Datos' },
  academic_term: { id: 6, name: '1/2026' },
}
const moduleSource = `import React from'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider,Outlet,useLocation}from'react-router';import'/src/assets/styles/global.css';import'@fontsource/poppins/400.css';import'@fontsource/poppins/500.css';import'@fontsource/poppins/600.css';import'@fontsource/poppins/700.css';import{Header}from'/src/shared/components/Header/Header.tsx';import{Footer}from'/src/shared/components/Footer/Footer.tsx';import{httpClient}from'/src/shared/api/httpClient.ts';import{TeacherExamReportsPage,AdminExamReportsPage}from'/src/features/exam-reports/pages/ExamReportsPage.tsx';httpClient.defaults.baseURL='/__browser-api';window.__downloads=[];const createURL=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__downloads.push({type:blob.type,size:blob.size});return createURL(blob)};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__lastDownloadName=this.download;return}return click.call(this)};function Layout(){const location=useLocation();const admin=location.pathname.startsWith('/admin');return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:admin?'Administrador de prueba':'Docente de prueba',role:admin?'admin':'teacher'}}),React.createElement(Outlet),React.createElement(Footer))}const router=createMemoryRouter([{Component:Layout,children:[{path:'/teacher/exam-reports',Component:TeacherExamReportsPage},{path:'/teacher/exams/:examId/reports',Component:TeacherExamReportsPage},{path:'/admin/exam-reports',Component:AdminExamReportsPage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/teacher/exam-reports']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`
const b = await browserFixture({
  name: 'hu33-browser',
  moduleSource,
  handleRequest: async (req, url, json, res) => {
    requests.push({ method: req.method, path: url.pathname, query: url.search })
    if (denied) return json(403, {})
    if (url.pathname === '/exam-reports/catalog') {
      const id = Number(url.searchParams.get('exam_id')),
        subject = Number(url.searchParams.get('subject_id')),
        term = Number(url.searchParams.get('academic_term_id')),
        search = (url.searchParams.get('search') ?? '').toLowerCase()
      if (id && id !== exam.id && (mode !== 'admin' || id !== other.id))
        return json(403, {})
      const exams = (mode === 'admin' ? [exam, other] : [exam]).filter(
        (e) =>
          (!id || e.id === id) &&
          (!subject || e.subject.id === subject) &&
          (!term || e.academic_term.id === term) &&
          e.name.toLowerCase().includes(search),
      )
      return json(200, {
        ...catalog,
        data: exams,
        filters: {
          subjects:
            mode === 'admin' ? [exam.subject, other.subject] : [exam.subject],
          academic_terms:
            mode === 'admin'
              ? [exam.academic_term, other.academic_term]
              : [exam.academic_term],
        },
        meta: { ...catalog.meta, total: exams.length },
      })
    }
    const match = url.pathname.match(
      /^\/exams\/(\d+)\/reports\/(ENROLLED|ATTENDANCE|PENDING_ABSENT|INCIDENTS|DISCIPLINARY)(\/export)?$/,
    )
    if (!match) return json(404, {})
    const id = Number(match[1]),
      kind = match[2],
      exporting = !!match[3],
      selected = id === exam.id ? exam : other
    if (id !== exam.id && (mode !== 'admin' || id !== other.id))
      return json(403, {})
    const reportId = url.searchParams.get('report_id')
    if (exporting) {
      const snapshot = snapshots.get(reportId)
      if (!snapshot) return json(410, {})
      if (downloadMode === 'expired') return json(410, {})
      if (downloadMode === 'slow') await pause(1200)
      const format = url.searchParams.get('format')
      res.statusCode = 200
      res.setHeader(
        'content-type',
        format === 'pdf' ? 'application/pdf' : 'text/csv',
      )
      res.setHeader(
        'x-report-id',
        downloadMode === 'mismatch' ? 'other-snapshot' : reportId,
      )
      res.setHeader('x-report-generated-at', snapshot.report.generated_at)
      res.end(format === 'pdf' ? '%PDF-1.4\n%%EOF' : 'SIS,Nombre\n00123,Ana')
      return
    }
    let snapshot = reportId ? snapshots.get(reportId) : null
    if (reportId && !snapshot) return json(410, {})
    if (!snapshot) {
      let records =
        kind === 'ENROLLED'
          ? Array.from({ length: 12 }, (_, i) => ({
              ...row,
              source_id: i + 7,
              student: {
                ...row.student,
                id: i + 7,
                first_names: i === 0 ? 'Ana' : `Estudiante ${i + 1}`,
                sis_code: `001${23 + i}`,
              },
            }))
          : kind === 'ATTENDANCE'
            ? [
                entry,
                {
                  ...entry,
                  source_id: 10,
                  student: {
                    ...entry.student,
                    id: 8,
                    first_names: 'Bruno',
                    sis_code: '00124',
                  },
                  method: 'MANUAL',
                },
              ]
            : kind === 'PENDING_ABSENT'
              ? [
                  classification === 'ABSENT'
                    ? { ...pending, record_type: 'ABSENT', state: 'ABSENT' }
                    : pending,
                ]
              : kind === 'INCIDENTS'
                ? [incident]
                : [infraction, expulsion]
      const dateFrom = url.searchParams.get('date_from'),
        dateTo = url.searchParams.get('date_to')
      if (
        (dateFrom && dateFrom > '2026-11-03') ||
        (dateTo && dateTo < '2026-11-03')
      )
        records = []
      records = records.map((r) => ({ ...r, exam_id: id }))
      snapshot = report(kind, records, {
        id: `snapshot-${++serial}`,
        filters: {
          exam_id: id,
          subject_id: selected.subject.id,
          academic_term_id: selected.academic_term.id,
          date_from: dateFrom,
          date_to: dateTo,
        },
        total_participants: 12,
        ...(kind === 'PENDING_ABSENT'
          ? { pending_classification: classification }
          : {}),
      })
      snapshot.exam = {
        ...selected,
        ...(kind === 'PENDING_ABSENT' && classification === 'ABSENT'
          ? { status: 'FINISHED' }
          : {}),
      }
      snapshots.set(snapshot.report.id, snapshot)
    }
    const page = Number(url.searchParams.get('page') ?? 1)
    return json(200, {
      ...snapshot,
      data: snapshot.data.slice((page - 1) * 10, page * 10),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(snapshot.data.length / 10)),
        per_page: 10,
        total: snapshot.data.length,
      },
    })
  },
})
const { wait, evaluate, fill, resize, shot } = b
async function click(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&!b.disabled&&b.textContent.trim()===${JSON.stringify(label)})`,
  )
  await b.click(label)
}
async function nav(path) {
  await evaluate(`window.__router.navigate(${JSON.stringify(path)})`)
  await pause(100)
}
async function views(name) {
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
const resultSelector = '[aria-label="Reporte generado"]'
async function generate(kind) {
  await fill('select', kind, 'HTMLSelectElement')
  await click('Generar reporte')
  await wait(`document.querySelector('${resultSelector}')`)
}
try {
  await wait(
    "document.querySelector('table')?.innerText.includes('Primer parcial')",
  )
  await views('catalogo-docente')
  await click('Seleccionar examen')
  await wait("document.querySelector('form')")
  await click('Generar reporte')
  await wait(`document.querySelector('${resultSelector}')`)
  await views('inscritos')
  const firstId = await evaluate(
    "[...document.querySelectorAll('[aria-label=\"Reporte generado\"] p')].find(p=>p.innerText.includes('Generado:')).textContent",
  )
  await click('Siguiente')
  await wait(
    "document.querySelector('table')?.innerText.includes('Estudiante 12')",
  )
  assert.equal(
    await evaluate(
      `document.querySelector('${resultSelector}').innerText.includes('12 registros en este reporte')`,
    ),
    true,
  )
  assert.ok(requests.at(-1).query.includes('report_id=snapshot-1'))
  await click('Exportar CSV')
  await wait('window.__downloads.length===1')
  assert.ok(requests.at(-1).query.includes('report_id=snapshot-1'))
  assert.equal(requests.at(-1).query.includes('page='), false)
  await click('Exportar PDF')
  await wait('window.__downloads.length===2')
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('[aria-label=\"Reporte generado\"] p')].find(p=>p.innerText.includes('Generado:')).textContent",
    ),
    firstId,
  )
  checks.push(
    'Teacher catalog, 12 official participants/records, stable snapshot across pages and CSV/PDF export of all filtered records rather than visible page',
  )
  await generate('ATTENDANCE')
  await wait("document.querySelector('table')?.innerText.includes('Manual')")
  assert.ok(
    await evaluate("document.querySelector('table').innerText.includes('QR')"),
  )
  await views('asistencia')
  await generate('PENDING_ABSENT')
  assert.ok(
    await evaluate(
      `document.querySelector('${resultSelector}').innerText.includes('todavía no se clasifican como ausentes')`,
    ),
  )
  classification = 'ABSENT'
  await click('Generar reporte')
  await wait(
    `document.querySelector('${resultSelector}')?.innerText.includes('Ausentes según la finalización')`,
  )
  await generate('INCIDENTS')
  assert.ok(
    await evaluate(
      "document.querySelector('table').innerText.includes('Rechazo automático')",
    ),
  )
  await generate('DISCIPLINARY')
  assert.ok(
    await evaluate(
      "document.querySelector('table').innerText.includes('Copia')&&document.querySelector('table').innerText.includes('Expulsión')",
    ),
  )
  await views('disciplinario')
  checks.push(
    'QR/manual dates and actors; server pending versus absent; automatic wrong-exam incidence; reported infraction and linked expulsion remain separate readonly records',
  )
  await fill('input[type=date]', '2026-11-04')
  await fill('input[type=date]:last-of-type', '2026-11-04')
  await click('Generar reporte')
  await wait(
    `document.querySelector('${resultSelector}')?.innerText.includes('El reporte no tiene registros')`,
  )
  assert.equal(
    await evaluate(
      "document.querySelector('table')?.innerText.includes('Ana')??false",
    ),
    false,
  )
  await fill('input[type=date]', '2026-11-05')
  await evaluate(
    "(()=>{const es=document.querySelectorAll('input[type=date]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(es[1],'2026-11-04');es[1].dispatchEvent(new Event('input',{bubbles:true}));es[1].dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  const beforeInvalid = requests.length
  await click('Generar reporte')
  await wait(
    "document.body.innerText.includes('La fecha final debe ser igual o posterior')",
  )
  assert.equal(requests.length, beforeInvalid)
  await nav('/other')
  await nav('/teacher/exams/4/reports')
  await wait("document.querySelector('form')")
  await click('Generar reporte')
  await wait(`document.querySelector('${resultSelector}')`)
  downloadMode = 'mismatch'
  const downloads = await evaluate('window.__downloads.length')
  await click('Exportar PDF')
  await wait(
    "document.body.innerText.includes('No se descargó ningún archivo')",
  )
  assert.equal(await evaluate('window.__downloads.length'), downloads)
  downloadMode = 'slow'
  await click('Exportar CSV')
  await fill('select', 'ATTENDANCE', 'HTMLSelectElement')
  await pause(1400)
  assert.equal(await evaluate('window.__downloads.length'), downloads)
  assert.equal(
    await evaluate(`document.querySelector('${resultSelector}')===null`),
    true,
  )
  downloadMode = 'ok'
  await click('Generar reporte')
  await wait(`document.querySelector('${resultSelector}')`)
  downloadMode = 'expired'
  await click('Exportar PDF')
  await wait("document.body.innerText.includes('El reporte venció')")
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].find(b=>b.textContent==='Exportar CSV').disabled",
    ),
    true,
  )
  checks.push(
    'Date validation and empty reports; changing filters invalidates old report/downloads; wrong snapshot headers and expired report never trigger a file',
  )
  mode = 'admin'
  downloadMode = 'ok'
  await nav('/admin/exam-reports')
  await wait(
    "document.querySelector('table')?.innerText.includes('Bases de Datos')",
  )
  await views('catalogo-admin')
  await fill('select', '5', 'HTMLSelectElement')
  await evaluate(
    "(()=>{const s=document.querySelectorAll('select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'6');s.dispatchEvent(new Event('change',{bubbles:true}))})()",
  )
  await click('Buscar')
  await wait(
    "document.querySelector('table')?.innerText.includes('Final de Bases')&&!document.querySelector('table')?.innerText.includes('Primer parcial')",
  )
  await click('Seleccionar examen')
  await wait("document.querySelector('form')")
  await click('Generar reporte')
  await wait(
    `document.querySelector('${resultSelector}')?.innerText.includes('Final de Bases de Datos')`,
  )
  assert.equal(
    await evaluate(
      'document.querySelector(\'[aria-label="Secciones del examen"]\')===null',
    ),
    true,
  )
  mode = 'teacher'
  await nav('/teacher/exams/99/reports')
  await wait("document.body.innerText.includes('No tienes permiso')")
  assert.equal(
    await evaluate(`document.querySelector('${resultSelector}')===null`),
    true,
  )
  denied = true
  await nav('/teacher/exam-reports')
  await wait("document.body.innerText.includes('No tienes permiso')")
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('No hay exámenes para estos filtros')",
    ),
    false,
  )
  checks.push(
    'Admin filters authorized exams by subject/period without teacher actions; other exam/denied catalog never show previous data or a fake empty result; no overflow320-1440px',
  )
  assert.deepEqual(b.errors, [])
  assert.ok(requests.every((r) => r.method === 'GET'))
  await b.report({ checks, requests })
  console.log(JSON.stringify({ checks, errors: b.errors, output: b.output }))
} finally {
  await b.close()
}
