// Node20: node --experimental-websocket src/features/incidents/tests/incidentConsultation.browser.mjs
// Actual pages/header/table/downloads, local HTTP only; no backend mutations.
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'

const types = [
  'IDENTIFICATION',
  'WRONG_EXAM',
  'ENVIRONMENT',
  'INELIGIBILITY',
  'SUSPECTED_IMPERSONATION',
]
const records = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  exam_id: 4,
  type: types[index % types.length],
  description: `Situación de prueba ${index + 1}.`,
  origin: index % 2 ? 'AUTOMATIC' : 'MANUAL',
  status: index < 2 ? 'REPORTED' : index % 2 ? 'RESOLVED' : 'OPEN',
  student:
    index === 2
      ? null
      : {
          id: index < 2 ? 7 : index + 10,
          first_names: index < 2 ? 'Ana' : 'Estudiante',
          last_names: index < 2 ? 'Prueba' : `Número ${index + 1}`,
          sis_code: index < 2 ? '00123' : String(1000 + index),
          identity_number: index < 2 ? '00099' : String(2000 + index),
        },
  reported_by: { id: 2, name: 'Docente responsable' },
  created_at: index < 2 ? '2026-11-03T02:00:00Z' : '2026-11-03T15:00:00Z',
}))
const secondExam = records
  .slice(0, 3)
  .map((item) => ({ ...item, id: item.id + 100, exam_id: 5 }))
const requests = [],
  checks = []
let role = 'teacher',
  canExport = true,
  listFailure = false,
  exportFailure = '',
  delay = 0
const downloadDir = await mkdtemp(join(tmpdir(), 'eida-hu29-downloads-'))
const moduleSource = `import React from 'react';import {createRoot} from 'react-dom/client';import {createMemoryRouter,RouterProvider,Outlet} from 'react-router';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';import '@fontsource/poppins/500.css';import '@fontsource/poppins/600.css';import '@fontsource/poppins/700.css';
import '/src/features/exams/components/CreateExamModal.module.css';
import {Header} from '/src/shared/components/Header/Header.tsx';import {Footer} from '/src/shared/components/Footer/Footer.tsx';
import {httpClient} from '/src/shared/api/httpClient.ts';import {ExamIncidentsPage} from '/src/features/incidents/pages/ExamIncidentsPage.tsx';import {IncidentDetailPage} from '/src/features/incidents/pages/IncidentDetailPage.tsx';import {AdminIncidentsPage} from '/src/features/incidents/pages/AdminIncidentsPage.tsx';
httpClient.defaults.baseURL='/__browser-api';httpClient.defaults.headers.common.Authorization='Bearer hu29-fixture';
function Layout(){const[role,setRole]=React.useState('teacher');window.__setRole=setRole;return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:'Usuario de prueba',role}}),React.createElement(Outlet),React.createElement(Footer))}
const router=createMemoryRouter([{Component:Layout,children:[{path:'/exams/:examId/incidents',Component:ExamIncidentsPage},{path:'/exams/:examId/incidents/:incidentId',Component:IncidentDetailPage},{path:'/admin/incidents',Component:AdminIncidentsPage},{path:'/admin/incidents/:examId/:incidentId',Component:IncidentDetailPage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/exams/4/incidents?from=teacher']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`

function filtered(examId, params) {
  const search = (params.get('search') ?? '').trim().toLowerCase()
  return (examId === 4 ? records : secondExam)
    .filter((item) => {
      const date = new Date(Date.parse(item.created_at) - 4 * 3600000)
        .toISOString()
        .slice(0, 10)
      const identity = item.student
        ? [
            item.student.first_names,
            item.student.last_names,
            item.student.sis_code,
            item.student.identity_number,
          ]
            .join(' ')
            .toLowerCase()
        : ''
      return (
        (!search ||
          identity.includes(search) ||
          String(item.id) === search.replace(/^#/, '')) &&
        (!params.get('type') || item.type === params.get('type')) &&
        (!params.get('status') || item.status === params.get('status')) &&
        (!params.get('date_from') || date >= params.get('date_from')) &&
        (!params.get('date_to') || date <= params.get('date_to'))
      )
    })
    .sort((a, b) => b.id - a.id)
}

const browser = await browserFixture({
  name: 'hu29-browser',
  moduleSource,
  handleRequest: async (req, url, json, res) => {
    requests.push({
      method: req.method,
      path: url.pathname,
      params: Object.fromEntries(url.searchParams),
    })
    if (req.headers.authorization !== 'Bearer hu29-fixture')
      return json(401, {})
    if (url.pathname === '/admin/incidents/exams') {
      if (role !== 'admin') return json(403, {})
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      const data = [
        {
          id: 4,
          name: 'Primer parcial',
          subject_name: 'Redes',
          exam_date: '2026-11-03',
        },
        {
          id: 5,
          name: 'Segundo parcial',
          subject_name: 'Bases de Datos',
          exam_date: '2026-11-04',
        },
      ].filter((item) =>
        `${item.name} ${item.subject_name}`.toLowerCase().includes(search),
      )
      return json(200, {
        data,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: data.length,
        },
      })
    }
    const match = url.pathname.match(
      /^\/exams\/(\d+)\/incidents(?:\/(\d+|export))?$/,
    )
    if (!match) return json(404, {})
    const examId = Number(match[1])
    if ((role !== 'admin' && examId !== 4) || ![4, 5].includes(examId))
      return json(403, {})
    if (match[2] === 'export') {
      if (!canExport || exportFailure === 'forbidden') return json(403, {})
      if (exportFailure === 'json')
        return json(200, { message: 'Esto no es un reporte' })
      const rows = filtered(examId, url.searchParams)
      const pdf = url.searchParams.get('format') === 'pdf'
      res.setHeader(
        'Content-Type',
        pdf ? 'application/pdf' : 'text/csv;charset=utf-8',
      )
      res.end(
        pdf
          ? '%PDF-1.4\n%fixture\n%%EOF'
          : 'id,tipo,descripcion\n' +
              rows
                .map((item) => `${item.id},${item.type},${item.description}`)
                .join('\n'),
      )
      return
    }
    if (match[2]) {
      const item = (examId === 4 ? records : secondExam).find(
        (item) => item.id === Number(match[2]),
      )
      return item ? json(200, { data: item }) : json(404, {})
    }
    if (delay) await pause(delay)
    if (listFailure) return json(500, {})
    const result = filtered(examId, url.searchParams)
    const page = Number(url.searchParams.get('page') ?? 1)
    return json(200, {
      exam: {
        id: examId,
        name: examId === 4 ? 'Primer parcial' : 'Segundo parcial',
        subject_name: examId === 4 ? 'Redes' : 'Bases de Datos',
      },
      permissions: { can_create: role === 'teacher', can_export: canExport },
      data: result.slice((page - 1) * 10, page * 10),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(result.length / 10)),
        per_page: 10,
        total: result.length,
      },
      summary: {
        total: result.length,
        by_type: Object.fromEntries(
          types.map((type) => [
            type,
            result.filter((item) => item.type === type).length,
          ]),
        ),
      },
      filters: {
        statuses: [
          { value: 'REPORTED', label: 'Reportada' },
          { value: 'OPEN', label: 'Abierta' },
          { value: 'RESOLVED', label: 'Resuelta' },
        ],
      },
    })
  },
})
const { evaluate, wait, click, fill, resize, shot, send } = browser
async function navigate(path) {
  await evaluate(`window.__router.navigate(${JSON.stringify(path)})`)
  await pause(100)
}
async function ready() {
  await wait(
    "document.querySelector('table') || document.body.innerText.includes('No hay incidencias')",
  )
}
async function files(count) {
  for (let i = 0; i < 100; i++) {
    const names = (await readdir(downloadDir)).filter((name) =>
      /\.(csv|pdf)$/.test(name),
    )
    if (names.length >= count) return names
    await pause(100)
  }
  throw Error('No se descargó el archivo esperado')
}
async function assertViewport() {
  assert.equal(
    await evaluate('document.documentElement.scrollWidth<=innerWidth'),
    true,
  )
  assert.equal(
    await evaluate(
      '[...document.querySelectorAll(\'form[aria-label="Filtros de incidencias"] input,form[aria-label="Filtros de incidencias"] select\')].every(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().right<=innerWidth)',
    ),
    true,
  )
}

try {
  await send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  })
  await ready()
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    await assertViewport()
    await shot('docente-' + width)
  }
  await resize(1440)
  assert.equal(
    await evaluate("document.querySelectorAll('tbody tr').length"),
    10,
  )
  assert.equal(
    await evaluate(
      "document.querySelector('[aria-label=\"Resumen de la consulta\"]').innerText.includes('12 incidencias')",
    ),
    true,
  )
  await click('Siguiente')
  await ready()
  assert.equal(
    await evaluate("document.querySelectorAll('tbody tr').length"),
    2,
  )
  await fill('input[name=search]', '00123')
  const before = requests.length
  await pause(350)
  assert.equal(
    requests.length,
    before,
    'Typing alone must not apply query filters',
  )
  await click('Buscar')
  await ready()
  await wait("document.querySelectorAll('tbody tr').length===2")
  assert.equal(
    await evaluate("window.__router.state.location.search.includes('page=')"),
    false,
  )
  await click('Ver detalle')
  await wait("document.querySelector('article')")
  assert.equal(
    await evaluate(
      "document.querySelector('article').innerText.includes('Evento automático')",
    ),
    true,
  )
  await evaluate(
    "[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a incidencias').click()",
  )
  await ready()
  assert.equal(
    await evaluate("document.querySelector('input[name=search]').value"),
    '00123',
  )
  for (const search of ['00099', 'Ana Prueba', '#2']) {
    await fill('input[name=search]', search)
    await click('Buscar')
    await ready()
    assert.equal(
      await evaluate("document.querySelectorAll('tbody tr').length"),
      search === '#2' ? 1 : 2,
    )
  }
  await fill('input[name=search]', 'Ana')
  await fill('select[name=type]', 'WRONG_EXAM', 'HTMLSelectElement')
  await fill('select[name=status]', 'REPORTED', 'HTMLSelectElement')
  await fill('input[name=date_from]', '2026-11-02')
  await fill('input[name=date_to]', '2026-11-02')
  await click('Buscar')
  await ready()
  assert.equal(
    await evaluate("document.querySelectorAll('tbody tr').length"),
    1,
  )
  const filteredUrl = await evaluate('window.__router.state.location.search')
  const previousRequests = requests.length
  await fill('input[name=date_to]', '2026-11-01')
  await click('Buscar')
  assert.equal(requests.length, previousRequests)
  assert.equal(await evaluate('document.activeElement.name'), 'date_to')
  await fill('input[name=date_to]', '2026-11-02')
  await click('Buscar')
  await ready()
  await click('Exportar CSV')
  await files(1)
  const csvFile = (await readdir(downloadDir)).find((name) =>
    name.endsWith('.csv'),
  )
  const csv = await readFile(join(downloadDir, csvFile), 'utf8')
  assert.match(csv, /2,WRONG_EXAM/)
  assert.doesNotMatch(csv, /3,ENVIRONMENT/)
  const exported = requests.filter((r) => r.path.endsWith('/export')).at(-1)
  assert.equal(exported.params.page, undefined)
  assert.equal(exported.params.date_to, '2026-11-02')
  await click('Exportar PDF')
  await files(2)
  assert.equal(
    (
      await readFile(join(downloadDir, 'incidencias-examen-4.pdf'), 'utf8')
    ).startsWith('%PDF-'),
    true,
  )
  assert.equal(
    await evaluate('window.__router.state.location.search'),
    filteredUrl,
  )
  checks.push(
    'Teacher: full-result counters, pagination, SIS/CI/name/ID search, applied filters, Bolivia date boundaries, invalid range focus, detail/back state, actual CSV/PDF downloads with filtered scope',
  )
  exportFailure = 'json'
  await click('Exportar CSV')
  await wait(
    "document.body.innerText.includes('No se descargó ningún archivo')",
  )
  assert.equal((await readdir(downloadDir)).length, 2)
  exportFailure = 'forbidden'
  await click('Exportar CSV')
  await wait("document.body.innerText.includes('No tienes permiso vigente')")
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].find(b=>b.textContent==='Exportar CSV').disabled",
    ),
    true,
  )
  exportFailure = ''
  canExport = false
  await click('Limpiar filtros')
  await ready()
  assert.equal(
    await evaluate("document.body.innerText.includes('Exportar CSV')"),
    false,
  )
  await fill('input[name=search]', 'No existe')
  await click('Buscar')
  await ready()
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('No hay incidencias que coincidan')",
    ),
    true,
  )
  listFailure = true
  await click('Limpiar filtros')
  await wait("document.body.innerText.includes('Reintentar')")
  assert.equal(
    await evaluate(
      'document.querySelector(\'[aria-label="Resumen de la consulta"]\')===null',
    ),
    true,
  )
  listFailure = false
  await click('Reintentar')
  await ready()
  await navigate('/exams/5/incidents?from=teacher')
  await wait(
    "document.body.innerText.includes('No tienes autorización vigente')",
  )
  assert.equal(await evaluate("document.querySelector('table')===null"), true)
  checks.push(
    'Invalid file and denied export never download; missing permission hides export; empty results differ from failure; another teacher exam is not shown',
  )
  role = 'admin'
  canExport = true
  await evaluate("window.__setRole('admin')")
  await navigate('/admin/incidents')
  await wait(
    'document.querySelector(\'[aria-label="Seleccionar examen para consultar incidencias"] ul\')',
  )
  await fill(
    '[aria-label="Seleccionar examen para consultar incidencias"] input',
    'Bases',
  )
  await wait(
    'document.querySelectorAll(\'[aria-label="Seleccionar examen para consultar incidencias"] li\').length===1',
  )
  await evaluate(
    'document.querySelector(\'[aria-label="Seleccionar examen para consultar incidencias"] li button\').click()',
  )
  await ready()
  assert.equal(
    await evaluate(
      "window.__router.state.location.search.includes('exam_id=5')",
    ),
    true,
  )
  assert.equal(
    await evaluate("document.body.innerText.includes('Registrar incidencia')"),
    false,
  )
  await wait(
    'document.querySelector(\'[aria-label="Seleccionar examen para consultar incidencias"] ul\')',
  )
  for (const width of [1440, 1024, 768, 390, 320]) {
    await resize(width)
    await assertViewport()
    await shot('administrador-' + width)
  }
  await resize(1440)
  await fill('input[name=search]', '00123')
  await click('Buscar')
  await ready()
  await click('Ver detalle')
  await wait("document.querySelector('article')")
  assert.equal(
    await evaluate(
      "window.__router.state.location.pathname.startsWith('/admin/incidents/5/')",
    ),
    true,
  )
  await evaluate(
    "[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a incidencias').click()",
  )
  await ready()
  assert.equal(
    await evaluate("document.querySelector('input[name=search]').value"),
    '00123',
  )
  await fill(
    '[aria-label="Seleccionar examen para consultar incidencias"] input',
    'Redes',
  )
  await wait(
    'document.querySelectorAll(\'[aria-label="Seleccionar examen para consultar incidencias"] li\').length===1',
  )
  await evaluate(
    'document.querySelector(\'[aria-label="Seleccionar examen para consultar incidencias"] li button\').click()',
  )
  await ready()
  assert.equal(
    await evaluate("document.querySelector('input[name=search]').value"),
    '',
  )
  assert.equal(
    await evaluate(
      "window.__router.state.location.search.includes('exam_id=4')",
    ),
    true,
  )
  checks.push(
    'Admin: authorized exam search/selection, no teacher mutation controls, own detail route, retained query on return and filters reset on exam change; both roles at 1440/1024/768/390/320px',
  )
  assert.equal(
    requests.every((request) => request.method === 'GET'),
    true,
  )
  assert.deepEqual(browser.errors, [])
  await browser.report({ checks, requests, downloadDir })
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
