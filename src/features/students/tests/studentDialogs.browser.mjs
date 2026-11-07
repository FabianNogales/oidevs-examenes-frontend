// DS4.2b browser QA: student dialogs and the Snackbar, with the real pages, Header and Snackbar and a
// simulated transport (no backend). S1: teacher manual enrollment (native <dialog>) reopened while the
// success Snackbar is still visible. S2: admin "Registrar estudiante" modal over the sticky Header.
// Expected (HTML modal semantics, verified in Chrome): while a modal dialog is open nothing outside it can
// be operated, not even a top-layer popover, so the Snackbar stays below the dialog's backdrop. Nothing may
// paint over the dialog (sticky Header, Snackbar) and the notice must still be usable once it closes.
// Never sends anything to a backend. Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const diagnose = process.env.EIDA_DIALOGS_DIAGNOSE === '1'
const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_DIALOGS_OUTPUT ?? 'ds42b-dialogs')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {TeacherSubjectStudentsPage} from '/src/features/students/pages/TeacherSubjectStudentsPage.tsx';
import {AdminManageStudentsPage} from '/src/features/students/pages/AdminManageStudentsPage.tsx';
import {Header} from '/src/shared/components/Header/Header.tsx';
import {Snackbar} from '/src/shared/components/Snackbar.tsx';
const e=React.createElement;
const qa=window.dialogsQa={calls:[],notice:null,listeners:new Set()};
// Same contract as AuthProvider: notify(type, message) renders the shared Snackbar.
qa.notify=(type,message)=>{qa.notice={id:Date.now(),type,message};qa.listeners.forEach(f=>f())};
function SnackbarHost(){const [,force]=React.useReducer(x=>x+1,0);React.useEffect(()=>{qa.listeners.add(force);return()=>qa.listeners.delete(force)},[]);
  return e(Snackbar,{notice:qa.notice,onDismiss:()=>{qa.notice=null;force()}})}
const career={id:1,code:'QA-SIS',name:'Carrera QA Sistemas',status:'ACTIVE'};
const page=(data)=>({data,meta:{current_page:1,last_page:1,total:data.length,per_page:15,from:data.length?1:null,to:data.length||null}});
const fixtures={
  '/teacher/dashboard/subjects':{data:[{course_offering_id:7,subject:{code:'QA-111',name:'Materia QA de programación',status:'ACTIVE'},academic_term:{name:'Periodo QA 2026',status:'ACTIVE'},status:'ACTIVE',can_manage:true}]},
  '/course-offerings/7/enrollments':{data:[{id:3,sis_code:'QA-301',first_names:'Estudiante',last_names:'QA'}]},
  '/admin/students':page([{id:8,sis_code:'QA-008',first_names:'Estudiante',last_names:'QA',email:'estudiante.qa@example.edu',status:'ACTIVE'}]),
  '/admin/subjects/careers':{data:[career]},
};
// Simulated, in-page responses only: nothing leaves the browser.
const simulatedPost={'/course-offerings/7/enrollments/manual':{data:{id:4,sisCode:'QA-302',firstNames:'Otra',lastNames:'Persona QA',status:'ENROLLED'}}};
const respond=(method)=>async(url,body)=>{
  qa.calls.push({method,url});
  if(method==='get'&&fixtures[url])return {data:structuredClone(fixtures[url])};
  if(method==='post'&&simulatedPost[url])return {data:structuredClone(simulatedPost[url])};
  throw Object.assign(new Error('QA: unexpected '+method+' '+url),{isAxiosError:true,response:{status:501,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
const shell=(path,user,el)=>({path,element:e(React.Fragment,null,e(Header,{user}),el,e(SnackbarHost))});
const routes=[
  shell('/teacher/students/:courseOfferingId',{name:'Docente QA',role:'teacher'},e(TeacherSubjectStudentsPage)),
  shell('/admin/students/manage',{name:'Administradora QA',role:'admin'},e('main',null,e(AdminManageStudentsPage))),
];
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.calls=[];qa.notice=null;root.render(e(RouterProvider,{key:path+Math.random(),router:createMemoryRouter(routes,{initialEntries:[path]})}));};
`

// Topmost element at the centre of a box, and whether it belongs to the expected element.
const probe = `(()=>{
  const vw=document.documentElement.clientWidth, vh=innerHeight;
  const center=(el)=>{const r=el.getBoundingClientRect();return {x:Math.min(Math.max(r.left+r.width/2,1),vw-1),y:Math.min(Math.max(r.top+r.height/2,1),vh-1),r}};
  const snackbar=document.querySelector('.snackbar'), header=document.querySelector('header');
  const dialog=document.querySelector('dialog[open]')||document.querySelector('[role=dialog][aria-modal=true]');
  const hit=(el)=>{if(!el)return null;const c=center(el);const top=document.elementFromPoint(c.x,c.y);return {self:!!top&&el.contains(top),inDialog:!!top&&!!dialog&&dialog.contains(top)}};
  const headerHit=header&&dialog?(()=>{const h=header.getBoundingClientRect(),d=dialog.getBoundingClientRect();
    // Points of the header band that the dialog box overlaps vertically, if any; else the header centre.
    const y=Math.max(h.top+2,Math.min(h.bottom-2,d.top+2)), top=document.elementFromPoint(vw/2,y);return {headerOnTop:!!top&&header.contains(top),y,dialogTop:Math.round(d.top),headerBottom:Math.round(h.bottom)}})():null;
  const dr=dialog?.getBoundingClientRect();
  const covered=dialog?[...dialog.querySelectorAll('h2, button, input, select')].filter(el=>{const r=el.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>vh)return false;
    const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !top||!(el===top||el.contains(top)||top.contains(el)&&dialog.contains(top))}).map(el=>el.tagName+':'+(el.getAttribute('aria-label')||el.textContent.trim()).slice(0,24)):null;
  return {covered,snackbar:!!snackbar,snackbarHit:hit(snackbar),dialog:!!dialog,dialogInside:dr?dr.left>=-1&&dr.right<=vw+1&&dr.top>=-1:null,
    headerHit,overflow:document.documentElement.scrollWidth>vw+1,
    legacyButtons:dialog?[...dialog.querySelectorAll('button')].filter(b=>/(primary|secondary)Button/.test(b.className)).length:null,
    dsButtons:dialog?[...dialog.querySelectorAll('button')].filter(b=>/(^|_)button(_|$)/.test(b.className)).length:null,
    active:document.activeElement?.textContent?.trim().slice(0,40)??null};
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const results = []
try {
  browserProfile = await createBrowserProfile('ds42b-dialogs')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds42b-dialogs-qa', enforce: 'pre',
      resolveId(id) { if (id === '/__ds42b.js') return '\0ds42b-qa' },
      load(id) {
        if (id === '\0ds42b-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.dialogsQa.client.get(...a),post:(...a)=>window.dialogsQa.client.post(...a),put:(...a)=>window.dialogsQa.client.put(...a),patch:(...a)=>window.dialogsQa.client.patch(...a),delete:(...a)=>window.dialogsQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({notify:(...a)=>window.dialogsQa.notify(...a)});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds42b') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds42b', '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds42b.js"></script></html>'))
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
  const wait = async (expression, label) => { for (let index = 0; index < 80; index++) { if (await evaluate(expression)) return; await pause(100) } throw new Error(`Tiempo agotado: ${label}`) }
  const key = async (name, code, keyCode, shift = false) => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: name, code, windowsVirtualKeyCode: keyCode, modifiers: shift ? 8 : 0 })
  }
  // Real pointer click: unlike element.click(), it is blocked by whatever paints on top.
  const realClick = async (selector) => {
    const box = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`)
    if (!box) return false
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
    return true
  }
  const clickText = (text, scope = 'main') => evaluate(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(scope + ' button')})].find(b=>b.textContent.trim()===${JSON.stringify(text)});b.focus();b.click();return true})()`)
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds42b' })
  await wait('!!window.dialogsQa?.show', 'arranque')

  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 640 : 800, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(120)
    // S1: teacher adds a student; the success Snackbar is visible when the dialog is reopened.
    {
      const failures = [], check = (ok, message) => { if (!ok) failures.push(message) }
      const before = exceptions.length
      await evaluate(`dialogsQa.show('/teacher/students/7')`)
      await wait(`document.body.innerText.includes('QA-301')`, 'S1 lista')
      await clickText('+ Agregar estudiante manualmente')
      await wait(`!!document.querySelector('dialog[open] input')`, 'S1 diálogo')
      await evaluate(`(()=>{const i=document.querySelector('dialog[open] input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'QA-302');i.dispatchEvent(new Event('input',{bubbles:true}))})()`)
      await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>/Agregar/.test(b.textContent)&&b.type==='submit').click()`)
      await wait(`!document.querySelector('dialog') && !!document.querySelector('.snackbar')`, 'S1 aviso de éxito')
      await clickText('+ Agregar estudiante manualmente')
      await wait(`!!document.querySelector('dialog[open]')`, 'S1 reabrir')
      await pause(150)
      const open = await evaluate(probe)
      check(open.snackbar, 'el aviso de éxito desapareció al reabrir el diálogo')
      check(open.covered?.length === 0, 'controles del diálogo tapados: ' + JSON.stringify(open.covered))
      check(open.dialogInside && !open.overflow, 'diálogo fuera del viewport o desbordamiento')
      if (!diagnose) check(open.legacyButtons === 0 && open.dsButtons >= 2, `botones del diálogo ${open.legacyButtons}/${open.dsButtons}`)
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `s1-teacher-${width}.png`), Buffer.from(shot.data, 'base64'))
      // Keyboard: Tab stays in the dialog, Escape closes only the dialog and focus returns to the opener.
      await evaluate(`document.querySelector('dialog[open] input').focus()`)
      for (let index = 0; index < 6; index++) await key('Tab', 'Tab', 9)
      check(await evaluate(`document.querySelector('dialog[open]').contains(document.activeElement)`), 'Tab sale del diálogo')
      await key('Escape', 'Escape', 27)
      await wait(`!document.querySelector('dialog')`, 'S1 Escape')
      check(await evaluate(`document.activeElement?.textContent.trim()==='+ Agregar estudiante manualmente'`), 'foco no devuelto al abrir')
      // Once the dialog is closed the notice is usable again: its × answers a real click.
      check(await realClick('.snackbar button') && await evaluate(`new Promise(r=>setTimeout(()=>r(!document.querySelector('.snackbar')),150))`), 'el × del aviso no responde tras cerrar el diálogo')
      check(await evaluate(`dialogsQa.calls.filter(c=>c.method!=='get').length===1`), 'peticiones de escritura simuladas inesperadas')
      check(exceptions.length === before, 'excepciones JS')
      results.push({ width, scenario: 'S1', pass: !failures.length, failures, open })
      console.log(`${failures.length ? 'FAIL' : 'PASS'} ${width}px S1 docente${failures.length ? ': ' + failures.join(' · ') : ''}`)
    }
    // S2: admin opens "Registrar estudiante" while a global notice is visible.
    {
      const failures = [], check = (ok, message) => { if (!ok) failures.push(message) }
      const before = exceptions.length
      await evaluate(`dialogsQa.show('/admin/students/manage')`)
      await wait(`document.body.innerText.includes('QA-008')`, 'S2 lista')
      await evaluate(`window.scrollTo(0, 0)`)
      await evaluate(`dialogsQa.notify('success','Aviso QA visible durante el registro.')`)
      await wait(`!!document.querySelector('.snackbar')`, 'S2 aviso')
      await clickText('+ Registrar estudiante')
      await wait(`!!document.querySelector('[role=dialog] form, dialog[open] form')`, 'S2 modal')
      await pause(150)
      const open = await evaluate(probe)
      check(open.snackbar, 'el aviso desapareció al abrir el modal')
      check(open.covered?.length === 0, 'controles del modal tapados: ' + JSON.stringify(open.covered))
      check(open.headerHit && !open.headerHit.headerOnTop, 'la cabecera se pinta sobre el modal: ' + JSON.stringify(open.headerHit))
      check(open.dialogInside && !open.overflow, 'modal fuera del viewport o desbordamiento')
      if (!diagnose) check(open.legacyButtons === 0 && open.dsButtons >= 2, `botones del modal ${open.legacyButtons}/${open.dsButtons}`)
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `s2-admin-${width}.png`), Buffer.from(shot.data, 'base64'))
      // A real click on the Header must not reach it while the modal is open.
      await realClick('header button')
      await pause(150)
      check(await evaluate(`!document.querySelector('header [aria-expanded=true]')`), 'la cabecera respondió con el modal abierto')
      // That click lands on the backdrop, which closes this modal as before (closeOnBackdrop): reopen it.
      if (!await evaluate(`!!document.querySelector('[role=dialog] form, dialog[open] form')`)) {
        await evaluate(`document.querySelector('header [aria-expanded=true]')?.click()`)
        await clickText('+ Registrar estudiante')
        await wait(`!!document.querySelector('dialog[open] form')`, 'S2 reabrir')
      }
      await evaluate(`document.querySelector('[role=dialog] input, dialog[open] input')?.focus()`)
      for (let index = 0; index < 12; index++) await key('Tab', 'Tab', 9)
      check(await evaluate(`!!document.activeElement?.closest('[role=dialog], dialog[open]')`), 'Tab sale del modal')
      await key('Escape', 'Escape', 27)
      await wait(`!document.querySelector('[role=dialog][aria-modal=true], dialog[open]')`, 'S2 Escape')
      check(await evaluate(`document.activeElement?.textContent.trim()==='+ Registrar estudiante'`), 'foco no devuelto al abrir')
      check(await realClick('.snackbar button') && await evaluate(`new Promise(r=>setTimeout(()=>r(!document.querySelector('.snackbar')),150))`), 'el × del aviso no responde tras cerrar el modal')
      check(await evaluate(`dialogsQa.calls.every(c=>c.method==='get')`), 'escritura inesperada')
      check(exceptions.length === before, 'excepciones JS')
      results.push({ width, scenario: 'S2', pass: !failures.length, failures, open })
      console.log(`${failures.length ? 'FAIL' : 'PASS'} ${width}px S2 administración${failures.length ? ': ' + failures.join(' · ') : ''}`)
    }
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.pass).length
  if (diagnose) console.log('DIAGNÓSTICO', JSON.stringify(results.map(r => ({ w: r.width, s: r.scenario, covered: r.open.covered, header: r.open.headerHit, legacy: r.open.legacyButtons }))))
  assert.equal(failed, 0, `${failed} combinaciones con fallos`)
  console.log(`QA diálogos de estudiantes PASS ${results.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
