// Design guard for "Programar Evaluación" (/teacher/subjects/:id/exams/create), whose current design is
// approved (decision of 2026-11-08). It renders the real page twice in headless Chrome — once with every
// /src file taken from a base commit (git show) and once with the working tree — and requires an identical
// signature (DOM structure, own text, rounded geometry and key computed styles) at 320/390/768/1024/1440px,
// plus the approved landmarks: workspace columns, calendar, room selector, schedule fields and bottom bar.
// Simulated GET-only HTTP and a stub auth hook; no backend, nothing is submitted.
// Usage: EIDA_EXAM_CREATE_BASE=<commit> node src/features/exams/tests/examCreateDesignGuard.browser.mjs
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const baseRef = process.env.EIDA_EXAM_CREATE_BASE ?? 'HEAD'
const widths = [320, 390, 768, 1024, 1440]
const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_EXAM_CREATE_OUTPUT ?? 'exam-create-guard')
await mkdir(evidence, { recursive: true })

// Fixed clock so both renders show the same calendar month and day states.
const demo = `
const RealDate=Date, fixed=new RealDate('2026-11-09T09:00:00-04:00').getTime();
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}};
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {TeacherExamCreatePage} from '/src/features/exams/pages/TeacherExamCreatePage.tsx';
const e=React.createElement;
const fixtures={
  '/teacher/dashboard/subjects':{data:[{course_offering_id:7,subject:{code:'QA-111',name:'Materia QA de programación con un nombre largo',status:'ACTIVE'},academic_term:{name:'Periodo QA 2026',status:'ACTIVE'},status:'ACTIVE',can_manage:true}]},
  '/rooms':{data:[
    {id:1,code:'QA-101',name:'Aula QA 101',location:'Bloque QA',floor:'1',capacity:40,status:'ACTIVE',busy_slots:[]},
    {id:2,code:'QA-202',name:'Laboratorio QA 202',location:'Bloque QA',floor:'2',capacity:25,status:'ACTIVE',busy_slots:[{exam_date:'2026-11-12',start_time:'10:00:00',end_time:'11:30:00'}]}],
    meta:{next_partial_number:1,last_partial_number:0,enrolled_students_count:30,eligible_students_count:28,safety_margin:2,recommended_capacity:30}},
  '/teacher/dashboard/upcoming-exams':{data:[]},
};
const qa=window.examCreateQa={calls:[],unexpected:[]};
const respond=(method)=>async(url)=>{
  qa.calls.push(method+' '+url);
  if(method==='get'&&fixtures[url])return {data:structuredClone(fixtures[url])};
  qa.unexpected.push(method+' '+url);
  throw Object.assign(new Error('QA: unexpected request '+method+' '+url),{isAxiosError:true,response:{status:501,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
const router=createMemoryRouter([
  {path:'/teacher/subjects/:courseOfferingId/exams/create',element:e(TeacherExamCreatePage)},
  {path:'*',element:e('p',null,'Fuera de la pantalla')}],{initialEntries:['/teacher/subjects/7/exams/create?period=Periodo%20QA%202026']});
createRoot(document.getElementById('root')).render(e(RouterProvider,{router}));
`

// Structure + geometry + computed style of every rendered element under #root.
const signature = `(()=>{
  const keys=['display','position','grid-template-columns','flex-direction','flex-wrap','justify-content','align-items','gap','font-size','font-weight','line-height','color','background-color','border-top-width','border-top-color','border-radius','box-shadow','padding','margin','width','max-width','opacity'];
  const out=[];
  const walk=(el,path)=>{const b=el.getBoundingClientRect(), s=getComputedStyle(el);
    if(s.display==='none')return;
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,60);
    out.push([path,el.tagName,el.getAttribute('role')||'',el.getAttribute('aria-label')||'',el.type||'',el.disabled?1:0,own,Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height),...keys.map(k=>s.getPropertyValue(k))].join('|'));
    [...el.children].forEach((c,i)=>walk(c,path+'/'+i));};
  walk(document.getElementById('root'),'r');
  const text=(t)=>[...document.querySelectorAll('button,h1,h2,h3,label,legend')].some(el=>el.textContent.includes(t));
  const footer=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Confirmar Programación');
  const grid=[...document.querySelectorAll('#root *')].find(el=>/workspaceGrid/.test(el.className));
  const fb=footer?.getBoundingClientRect();
  return {rows:out,landmarks:{
    h1:document.querySelector('h1')?.textContent.trim(),
    columns:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').length:0,
    calendar:!!document.querySelector('[role=grid], table, [aria-label*="alendario"], [class*="calendar" i]'),
    rooms:text('Aula QA 101')||text('QA-101'),
    time:!!document.querySelector('input[type=time], select'),
    footer:!!footer&&fb.width>0&&fb.bottom<=innerHeight+1,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}};
})()`

const pause = (ms) => new Promise((done) => setTimeout(done, ms))

async function render(phase) {
  let vite, chrome, ws, profile
  try {
    profile = await createBrowserProfile(`exam-create-guard-${phase}`)
    process.env.EIDA_DEV_HTTPS_KEY = ''
    process.env.EIDA_DEV_HTTPS_CERT = ''
    vite = await createServer({
      root: process.cwd(), logLevel: 'error',
      server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
      plugins: [{
        name: 'exam-create-guard', enforce: 'pre',
        resolveId(id) { if (id === '/__exam-create.js') return '\0exam-create-qa' },
        load(id) {
          if (id === '\0exam-create-qa') return demo
          const normalized = id.split('?')[0].replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return 'export const httpClient={get:(...a)=>window.examCreateQa.client.get(...a),post:(...a)=>window.examCreateQa.client.post(...a),put:(...a)=>window.examCreateQa.client.put(...a),patch:(...a)=>window.examCreateQa.client.patch(...a),delete:(...a)=>window.examCreateQa.client.delete(...a)};'
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export function useAuth(){return {notify(){},user:{id:1,roles:["DOCENTE"]}}}'
          if (phase === 'base' && normalized.includes('/src/')) {
            const path = normalized.slice(normalized.indexOf('/src/') + 1)
            try { return execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' }) } catch { /* file new in the working tree */ }
          }
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__exam-create') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__exam-create', '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__exam-create.js"></script></html>'))
          })
        },
      }],
    })
    await vite.listen()
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
    chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile.dir}`, 'about:blank'],
      { windowsHide: true, stdio: 'ignore' })
    let port
    for (let index = 0; index < 80 && !port; index++) {
      try { port = Number((await readFile(join(profile.dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { await pause(250) }
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
    await send('Runtime.enable'); await send('Page.enable')
    const results = {}
    for (const width of widths) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await send('Page.navigate', { url: origin + '/__exam-create' })
      let ready = false
      for (let index = 0; index < 100 && !ready; index++) {
        ready = await evaluate(`!!document.querySelector('h1') && document.body.innerText.includes('Aula QA 101') && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Confirmar Programación')`).catch(() => false)
        if (!ready) await pause(150)
      }
      assert.ok(ready, `${phase} ${width}px: la pantalla no terminó de cargar`)
      await evaluate('document.fonts.ready.then(()=>true)')
      await pause(300)
      results[width] = await evaluate(signature)
      results[width].unexpected = await evaluate('window.examCreateQa.unexpected')
      results[width].writes = (await evaluate('window.examCreateQa.calls')).filter((call) => !call.startsWith('get '))
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      await writeFile(join(evidence, `${phase}-${width}.png`), Buffer.from(shot.data, 'base64'))
    }
    results.exceptions = exceptions
    return results
  } finally {
    ws?.close()
    await cleanupBrowserProfile(profile, chrome)
    await vite?.close()
  }
}

const base = await render('base')
const current = await render('current')
const failures = []
for (const width of widths) {
  const a = base[width], b = current[width]
  const diff = []
  for (let index = 0; index < Math.max(a.rows.length, b.rows.length); index++)
    if (a.rows[index] !== b.rows[index]) diff.push({ index, base: a.rows[index], current: b.rows[index] })
  const marks = b.landmarks
  // Approved layout: two workspace columns above the 1080px breakpoint, one below.
  const expectedColumns = width > 1080 ? 2 : 1
  const problems = []
  if (diff.length) problems.push(`${diff.length} elementos distintos de ${baseRef}`)
  if (JSON.stringify(a.landmarks) !== JSON.stringify(marks)) problems.push('referencias distintas: ' + JSON.stringify({ base: a.landmarks, current: marks }))
  if (marks.h1 !== 'Programar Evaluación' && !marks.h1) problems.push('sin h1')
  if (marks.columns !== expectedColumns) problems.push(`columnas del área de trabajo ${marks.columns} (se esperaban ${expectedColumns})`)
  if (!marks.calendar || !marks.rooms || !marks.time || !marks.footer) problems.push('falta calendario, aulas, horario o barra inferior: ' + JSON.stringify(marks))
  // Known pre-existing overflow at 320px in the approved design (base): it must not change, it is not fixed here.
  if (marks.overflow && !a.landmarks.overflow) problems.push('desbordamiento horizontal nuevo')
  if (b.unexpected.length || b.writes.length) problems.push('peticiones inesperadas o de escritura: ' + [...b.unexpected, ...b.writes].join(', '))
  await writeFile(join(evidence, `diff-${width}.json`), JSON.stringify(diff.slice(0, 40), null, 2))
  if (problems.length) failures.push(`${width}px: ${problems.join(' · ')}`)
  console.log(`${problems.length ? 'FAIL' : 'PASS'} ${width}px Programar Evaluación (${b.rows.length} elementos, h1 «${marks.h1}», ${marks.columns} columnas${marks.overflow ? ', desbordamiento previo' : ''})${problems.length ? ': ' + problems.join(' · ') : ''}`)
}
if (current.exceptions.length || base.exceptions.length) failures.push('excepciones JS: ' + [...base.exceptions, ...current.exceptions].join(' | '))
await writeFile(join(evidence, 'result.json'), JSON.stringify({ baseRef, fixtureOnly: true, failures, landmarks: Object.fromEntries(widths.map((w) => [w, current[w].landmarks])) }, null, 2))
assert.deepEqual(failures, [], 'Programar Evaluación cambió')
console.log(`Guarda Programar Evaluación PASS ${widths.length}/${widths.length} frente a ${baseRef} · evidencia en ${evidence}`)
