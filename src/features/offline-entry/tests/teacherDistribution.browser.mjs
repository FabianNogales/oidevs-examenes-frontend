// U3.5 browser QA for the teacher offline distribution page (/teacher/exams/:id/offline/assignments):
// shared page contract (PageContainer + PageHeader) for the main, selected-list, invalid-id and error views
// at 320/390/768/1024/1440px, header actions (back button and connection status, legible on phones) and the
// "Distribución de listas" breadcrumb destination. Simulated GET-only HTTP; nothing is prepared or written.
// Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'
import { pageContractProblems, pageContractScript } from '../../../shared/tests/pageContract.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_DISTRIBUTION_OUTPUT ?? 'u35-distribution')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider, Outlet} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {Header} from '/src/shared/components/Header/Header.tsx';
import {TeacherDistributionPage} from '/src/features/offline-entry/pages/TeacherDistributionPage.tsx';
const e=React.createElement;
const student=(id,list,last)=>({student_id:id,list_id:list,first_names:'Estudiante',last_names:last,sis_code:'QA-'+id});
const fixtures={
  '/teacher/exams/5':{data:{id:5,name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',subject_code:'QA-111',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,status:'SCHEDULED',course_offering_id:7,rules:null,updated_at:'2026-11-08T10:00:00-04:00',can_edit:true,can_cancel:true,academic_term_name:'Periodo QA 2026',evaluation_type:'partial',room:{id:1,code:'QA-101',name:'Aula QA 101'}}},
  '/exams/5/offline/assignments':{data:{exam_id:5,version:1,prepared_at:'2026-11-08T10:00:00-04:00',lists:[
    {list_id:10,responsible_id:1,responsible_name:'Docente QA responsable',student_count:2,surname_range:{from:'Aguilar',to:'Mamani'},students:[student(101,10,'Aguilar'),student(102,10,'Mamani')]},
    {list_id:11,responsible_id:21,responsible_name:'Colaborador QA con nombre extenso',student_count:1,surname_range:{from:'Quispe',to:'Zurita'},students:[student(103,11,'Zurita')]}]}},
  '/exams/5/collaborators':{data:[{id:1,user_id:21,display_name:'Colaborador QA con nombre extenso',email:'colaborador.qa@example.edu',identity_number:'QA-21',profile_photo_url:null,assigned_at:'2026-11-08T10:00:00-04:00',assigned_by:1,assigned_by_name:'Docente QA'}]},
  '/exams/5/entry-control/students':{exam:{id:5},summary:{total_students:3,registered:0,pending:3,not_applicable:0},data:[],meta:{current_page:1,last_page:1,total:3,per_page:1}},
  '/teacher/exams/99':{__status:500},
};
const qa=window.distributionQa={calls:[],unexpected:[]};
const respond=(method)=>async(url)=>{
  qa.calls.push(method+' '+url);
  const f=method==='get'?fixtures[url]:undefined;
  if(f?.__status)throw Object.assign(new Error('QA: simulated '+f.__status),{isAxiosError:true,response:{status:f.__status,data:{}}});
  if(f)return {data:structuredClone(f)};
  qa.unexpected.push(method+' '+url);
  throw Object.assign(new Error('QA: unexpected request '+method+' '+url),{isAxiosError:true,response:{status:501,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
function Layout(){return e(React.Fragment,null,e(Header,{user:{name:'Docente QA',role:'teacher'}}),e(Outlet))}
const router=createMemoryRouter([{Component:Layout,children:[
  {path:'/teacher/exams/:examId/offline/assignments',element:e(TeacherDistributionPage)},
  {path:'*',element:e('p',null,'Otra ruta')}]}],{initialEntries:['/teacher/exams/5/offline/assignments']});
window.__router=router;
createRoot(document.getElementById('root')).render(e(RouterProvider,{router}));
window.distributionReady=true;
`

const states = [
  { name: 'principal', path: '/teacher/exams/5/offline/assignments', title: 'Distribución de estudiantes',
    crumbs: ['Mis exámenes', 'Examen', 'Distribución de listas'], actions: ['Volver a mis exámenes'], status: true,
    ready: "document.body.innerText.includes('Colaborador QA con nombre extenso')" },
  { name: 'lista seleccionada', path: '/teacher/exams/5/offline/assignments?listId=11', containerOnly: true,
    crumbs: ['Mis exámenes', 'Examen', 'Distribución de listas', 'Lista 2'], listLink: '/teacher/exams/5/offline/assignments',
    ready: "!!document.getElementById('assigned-list-page-title')" },
  { name: 'id no válido', path: '/teacher/exams/abc/offline/assignments', title: 'Distribución de estudiantes', crumbs: [],
    ready: "document.body.innerText.includes('El examen no es válido.')" },
  { name: 'error', path: '/teacher/exams/99/offline/assignments', title: 'Distribución de estudiantes',
    crumbs: ['Mis exámenes', 'Examen', 'Distribución de listas'], actions: ['Volver a mis exámenes'], status: true,
    ready: "!!document.querySelector('main [role=alert]')" },
]

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const failures = []
try {
  browserProfile = await createBrowserProfile('u35-distribution')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'u35-distribution-qa', enforce: 'pre',
      resolveId(id) { if (id === '/__u35.js') return '\0u35-qa' },
      load(id) {
        if (id === '\0u35-qa') return demo
        const normalized = id.split('?')[0].replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.distributionQa.client.get(...a),post:(...a)=>window.distributionQa.client.post(...a),put:(...a)=>window.distributionQa.client.put(...a),patch:(...a)=>window.distributionQa.client.patch(...a),delete:(...a)=>window.distributionQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
          return 'export const useAuth=()=>({notify(){},user:{id:1,must_change_password:false}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__u35') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__u35', '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__u35.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${browserProfile.dir}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' })
  let port
  for (let index = 0; index < 80 && !port; index++) {
    try { port = Number((await readFile(join(browserProfile.dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { await pause(250) }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map(), exceptions = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); ws.send(JSON.stringify({ id: next, method, params })) })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression, label) => { for (let index = 0; index < 100; index++) { if (await evaluate(expression).catch(() => false)) return; await pause(100) } throw new Error(`Tiempo agotado: ${label}`) }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__u35' })
  await wait('window.distributionReady===true && !!window.__router', 'arranque')

  for (const state of states) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await evaluate(`window.__router.navigate(${JSON.stringify(state.path)})`)
    await wait(state.ready, `${state.name}: carga`)
    await pause(250)
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await pause(150)
      const problems = pageContractProblems(await evaluate(pageContractScript), { width, ...state })
      if (state.status) {
        // Connection status lives in the header actions and stays fully visible and legible on phones.
        const status = await evaluate(`(()=>{const h=document.querySelector('h1').closest('header'),s=[...(h?.querySelectorAll('[role=status]')??[])].find(el=>/Red disponible|Sin conexión/.test(el.textContent));
          if(!s)return null;const r=s.getBoundingClientRect(),c=getComputedStyle(s);return {text:s.textContent.trim(),inView:r.left>=0&&r.right<=document.documentElement.clientWidth+1&&r.width>0,clipped:s.scrollWidth>s.clientWidth+1,size:parseFloat(c.fontSize)}})()`)
        if (!status || !status.inView || status.clipped || status.size < 11) problems.push('estado de conexión: ' + JSON.stringify(status))
      }
      if (state.listLink) {
        const href = await evaluate(`[...document.querySelectorAll('nav[aria-label="Ruta de navegación"] a')].find(a=>a.textContent.trim()==='Distribución de listas')?.getAttribute('href')`)
        if (href !== state.listLink) problems.push('destino de «Distribución de listas»: ' + href)
      }
      if (problems.length) failures.push(`${state.name} ${width}px: ${problems.join(' · ')}`)
      console.log(`${problems.length ? 'FAIL' : 'PASS'} contrato ${state.name} ${width}px${problems.length ? ': ' + problems.join(' · ') : ''}`)
      if (width === 390 || width === 1440) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
        await writeFile(join(evidence, `${state.name.replaceAll(' ', '-')}-${width}.png`), Buffer.from(shot.data, 'base64'))
      }
    }
  }
  const calls = await evaluate('window.distributionQa.calls')
  const unexpected = await evaluate('window.distributionQa.unexpected')
  if (calls.some((call) => !call.startsWith('get '))) failures.push('escrituras: ' + calls.filter((call) => !call.startsWith('get ')).join(', '))
  if (unexpected.length) failures.push('peticiones inesperadas: ' + unexpected.join(', '))
  if (exceptions.length) failures.push('excepciones JS: ' + exceptions.join(' | '))
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ fixtureOnly: true, failures, calls }, null, 2))
  assert.deepEqual(failures, [], 'contrato de la distribución offline')
  console.log(`QA distribución offline PASS ${states.length * 5}/${states.length * 5} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
