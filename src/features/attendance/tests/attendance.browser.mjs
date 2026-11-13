// Browser UI and controlled HTTP only. No backend or database changes.
import assert from 'node:assert/strict'
import { browserFixture } from '../../../shared/tests/browserHarness.mjs'
import { pageContractProblems, pageContractScript } from '../../../shared/tests/pageContract.mjs'
import {
  base,
  activity,
  student,
  pending,
  list,
} from './attendanceFixtures.mjs'
let registered = 1,
  fail = 0,
  lists = false,
  offline = false
const requests = [],
  checks = []
const moduleSource = `import React from'react';import{createRoot}from'react-dom/client';import{createMemoryRouter,RouterProvider,Outlet}from'react-router';import'/src/assets/styles/global.css';import'@fontsource/poppins/400.css';import'@fontsource/poppins/500.css';import'@fontsource/poppins/600.css';import'@fontsource/poppins/700.css';import{Header}from'/src/shared/components/Header/Header.tsx';import{Footer}from'/src/shared/components/Footer/Footer.tsx';import{httpClient}from'/src/shared/api/httpClient.ts';import{AttendancePage}from'/src/features/attendance/pages/AttendancePage.tsx';httpClient.defaults.baseURL='/__browser-api';function Layout(){return React.createElement(React.Fragment,null,React.createElement(Header,{user:{name:'Docente de prueba',role:'teacher'}}),React.createElement(Outlet),React.createElement(Footer))}const router=createMemoryRouter([{Component:Layout,children:[{path:'/teacher/exams/:examId/attendance',Component:AttendancePage},{path:'/other',element:React.createElement('p',null,'Otra página')}]}],{initialEntries:['/teacher/exams/4/attendance']});window.__router=router;createRoot(document.getElementById('root')).render(React.createElement(RouterProvider,{router}));`
const b = await browserFixture({
  name: 'hu32-browser',
  moduleSource,
  handleRequest: async (req, url, json) => {
    requests.push({ method: req.method, path: url.pathname, query: url.search })
    if (fail) return json(fail, { message: 'No disponible', is_current: false })
    if (!url.pathname.startsWith('/exams/4/attendance/')) return json(403, {})
    const summary = {
      total_students: 3,
      registered,
      pending: 3 - registered,
      attendance_percentage: Math.round((registered * 10000) / 3) / 100,
    }
    const snapshot = {
      ...base,
      summary,
      last_updated_at: new Date().toISOString(),
      offline: offline
        ? {
            available_on_server: true,
            pending_count: 4,
            included_in_official_attendance: false,
          }
        : base.offline,
      exclusive_lists: lists
        ? { available: true, data: [{ ...list, ...summary }] }
        : base.exclusive_lists,
    }
    if (url.pathname.endsWith('/collaborators'))
      return json(200, {
        ...snapshot,
        collaborators: {
          ...activity.collaborators,
          data: [
            { ...activity.collaborators.data[0], valid_registered: registered },
          ],
        },
      })
    let rows = [
      student,
      pending,
      { ...pending, student_id: 9, first_names: 'Carla', sis_code: '00125' },
    ].map((s, index) =>
      index < registered
        ? {
            ...s,
            attendance_status: 'SERVER_CONFIRMED',
            entry: { ...student.entry, id: index + 10 },
          }
        : { ...s, attendance_status: 'PENDING', entry: null },
    )
    const view = url.searchParams.get('view'),
      search = (url.searchParams.get('search') ?? '').toLowerCase(),
      current = Number(url.searchParams.get('page') ?? 1),
      listId = Number(url.searchParams.get('list_id'))
    rows = rows.filter(
      (s) =>
        (view !== 'registered' || s.entry) &&
        (view !== 'pending' || !s.entry) &&
        `${s.first_names} ${s.last_names} ${s.sis_code}`
          .toLowerCase()
          .includes(search),
    )
    return json(200, {
      ...snapshot,
      ...(listId ? { selected_list: { ...list, ...summary } } : {}),
      data: rows.slice((current - 1) * 10, current * 10),
      meta: {
        current_page: current,
        last_page: Math.max(1, Math.ceil(rows.length / 10)),
        per_page: 10,
        total: rows.length,
      },
    })
  },
})
const { wait, evaluate, fill, resize, shot } = b
async function click(label) {
  await wait(
    `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`,
  )
  await b.click(label)
}
async function views(name) {
  for (const w of [1440, 1024, 768, 390, 320]) {
    await resize(w)
    await evaluate('window.scrollTo(0,0)')
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
    )
    await shot(`${name}-${w}`)
  }
}
const summarySelector = '[aria-label="Asistencia oficial del examen"]'
try {
  await wait(`document.querySelector('${summarySelector}')`)
  assert.equal(
    await evaluate(
      `document.querySelector('${summarySelector}').innerText.includes('33,33%')`,
    ),
    true,
  )
  assert.equal(
    await evaluate(
      `document.querySelector('${summarySelector}').innerText.includes('información no disponible')`,
    ),
    true,
  )
  await views('asistencia')
  await evaluate("window.__router.navigate('/teacher/exams/4/attendance?page=2')")
  await wait("!window.__router.state.location.search.includes('page=2') && document.querySelector('table')?.innerText.includes('Ana')")
  registered = 2
  await wait(
    `document.querySelector('${summarySelector}')?.innerText.includes('66,67%')`,
  )
  registered = 0
  await wait(
    `document.querySelector('${summarySelector}')?.innerText.includes('0%')`,
  )
  checks.push(
    'Automatic refresh reflects new valid entries and annulments; correct counts/percentage and server timestamp, offline unknown is not zero',
  )
  registered = 1
  await click('Actualizar ahora')
  await wait(
    `document.querySelector('${summarySelector}')?.innerText.includes('33,33%')`,
  )
  await fill('select', 'registered', 'HTMLSelectElement')
  await wait(
    "document.querySelector('table')?.innerText.includes('Confirmada por servidor')",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('table').innerText.includes('Bruno')",
    ),
    false,
  )
  await fill('select', 'pending', 'HTMLSelectElement')
  await wait("document.querySelector('table')?.innerText.includes('Bruno')")
  assert.equal(
    await evaluate(
      "document.querySelector('table').innerText.includes('Confirmada por servidor')",
    ),
    false,
  )
  await fill('input[type=search]', 'Carla')
  await click('Buscar')
  await wait(
    "document.querySelector('table')?.innerText.includes('Carla')&&!document.querySelector('table')?.innerText.includes('Bruno')",
  )
  assert.equal(
    await evaluate(
      `document.querySelector('${summarySelector}').innerText.includes('33,33%')`,
    ),
    true,
  )
  await click('Colaboradores y listas')
  await wait(
    "document.querySelector('table')?.innerText.includes('Docente responsable')",
  )
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('no dispone de listas exclusivas')",
    ),
    true,
  )
  await views('colaboradores')
  lists = true
  await wait("document.body.innerText.includes('Ver lista')")
  await click('Lista A–M · Docente responsable · Ver lista')
  await wait(
    "document.body.innerText.includes('Lista A–M · 1 de 3 ingresados')",
  )
  assert.equal(
    await evaluate(
      "window.__router.state.location.search.includes('list_id=12')",
    ),
    true,
  )
  await click('Ver todas las listas')
  await wait("!window.__router.state.location.search.includes('list_id')")
  checks.push(
    'Registered/pending filters, search preserves global totals; collaborator activity does not invent assigned totals; available list selection scopes the student query',
  )
  offline = true
  await click('Actualizar ahora')
  await wait(
    `document.querySelector('${summarySelector}')?.innerText.includes('Pendientes de sincronización: 4')`,
  )
  assert.equal(
    await evaluate(
      `document.querySelector('${summarySelector}').innerText.includes('33,33%')`,
    ),
    true,
  )
  fail = 503
  await click('Actualizar ahora')
  await wait(
    "document.body.innerText.includes('No se pudo confirmar la asistencia vigente')",
  )
  assert.equal(
    await evaluate(`document.querySelector('${summarySelector}')===null`),
    true,
  )
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('Última consulta confirmada:')",
    ),
    false,
  )
  await views('error')
  fail = 0
  await click('Reintentar consulta')
  await wait(`document.querySelector('${summarySelector}')`)
  await b.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  })
  await wait("document.body.innerText.includes('Consulta pausada.')")
  assert.equal(
    await evaluate(`document.querySelector('${summarySelector}')===null`),
    true,
  )
  await b.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await wait(`document.querySelector('${summarySelector}')`)
  checks.push(
    'Offline count remains separate, failed refresh removes old counters/time, offline pause clears current data and reconnect fetches anew',
  )
  await evaluate("window.__router.navigate('/teacher/exams/5/attendance')")
  await wait(
    "document.body.innerText.includes('Solo el docente responsable autorizado')",
  )
  assert.equal(
    await evaluate(`document.querySelector('${summarySelector}')===null`),
    true,
  )
  checks.push(
    'Other exam is denied without previous data; desktop/tablet/mobile320-1440 have no horizontal overflow',
  )
  const contractStates = [
    { name: 'asistencia', path: '/teacher/exams/4/attendance', title: 'Asistencia del examen', crumbs: ['Mis exámenes', 'Asistencia'], ready: "!!document.querySelector('table')" },
    { name: 'asistencia error', path: '/teacher/exams/5/attendance', title: 'Asistencia del examen', crumbs: ['Mis exámenes', 'Asistencia'], ready: "!!document.querySelector('main [role=alert]')" },
    // R2: invalid id keeps its exact message, one main and one h1, no breadcrumbs.
    { name: 'asistencia id no válido', path: '/teacher/exams/abc/attendance', title: 'Asistencia del examen', crumbs: [], alertText: 'El identificador del examen no es válido.', ready: "!!document.querySelector('[role=alert]')" },
  ]
  // U3.4c: shared page contract (PageContainer + PageHeader) for every state at 320-1440px.
  const contractFailures = []
  for (const state of contractStates) {
    await evaluate(`window.__router.navigate(${JSON.stringify(state.path)})`)
    await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(state.title)} && (${state.ready ?? 'true'})`)
    await new Promise((done) => setTimeout(done, 250))
    for (const width of [1440, 1024, 768, 390, 320]) {
      await b.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await new Promise((done) => setTimeout(done, 120))
      const problems = pageContractProblems(await evaluate(pageContractScript), { width, ...state })
      if (problems.length) contractFailures.push(`${state.name} ${width}px: ${problems.join(' · ')}`)
      console.log(`${problems.length ? 'FAIL' : 'PASS'} contrato ${state.name} ${width}px${problems.length ? ': ' + problems.join(' · ') : ''}`)
    }
    await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  }
  assert.deepEqual(contractFailures, [], 'contrato de página')
  assert.deepEqual(b.errors, [])
  assert.ok(requests.every((r) => r.method === 'GET'))
  await b.report({ checks, requests })
  console.log(JSON.stringify({ checks, errors: b.errors, output: b.output }))
} finally {
  await b.close()
}
