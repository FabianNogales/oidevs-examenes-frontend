// R1 browser QA for the admin entity profiles (/admin/students/:id and /admin/teachers/:id): inside a <main>
// that models AdminLayout, the profile renders one main landmark, one h1 (the entity name) labelling the
// profile region, working sidebar tabs and "Regresar", with no horizontal overflow at
// 320/390/768/1024/1440px. DS5-F2: the load-error state has one h1 (shared PageHeader) and keeps its exact
// alert message and back button. Simulated GET-only HTTP; nothing is edited or saved.
// Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile, trackBrowser } from '../../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_ENTITY_PROFILE_OUTPUT ?? 'r1-entity-profile')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider, Outlet} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {AdminStudentDetailPage} from '/src/features/students/pages/AdminStudentDetailPage.tsx';
import {AdminTeacherDetailPage} from '/src/features/teachers/pages/AdminTeacherDetailPage.tsx';
const e=React.createElement;
const fixtures={
  '/admin/students/8':{data:{id:8,sis_code:'QA-008',identity_number:'QA-123',first_names:'Estudiante',last_names:'QA con apellidos extensos',email:'estudiante.qa.con.correo.largo@example.edu',status:'ACTIVE',career_id:1,historical_photo_url:null,historical_photo_revision:0,profile_photo_url:null}},
  '/admin/teachers/3':{data:{id:3,institutional_code:'QA-DOC-3',identity_number:'QA-456',first_names:'Docente',last_names:'QA con nombre extenso',email:'docente.qa@example.edu',status:'ACTIVE'}},
  // DS5-F2: load failures (simulated server error).
  '/admin/students/99':{__status:500},
  '/admin/teachers/99':{__status:500},
};
const qa=window.profileQa={calls:[],unexpected:[]};
const respond=(method)=>async(url)=>{
  qa.calls.push(method+' '+url);
  if(method==='get'&&fixtures[url]?.__status)throw Object.assign(new Error('QA: simulated '+fixtures[url].__status),{isAxiosError:true,response:{status:fixtures[url].__status,data:{}}});
  if(method==='get'&&fixtures[url])return {data:structuredClone(fixtures[url])};
  qa.unexpected.push(method+' '+url);
  throw Object.assign(new Error('QA: unexpected request '+method+' '+url),{isAxiosError:true,response:{status:404,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
// AdminLayout renders the page's <main>; the profile must not add another one.
function AdminShell(){return e('main',{'data-qa':'admin-main'},e(Outlet))}
const router=createMemoryRouter([{Component:AdminShell,children:[
  // Destinations of "Regresar" (static routes rank above the profile routes, as in the application).
  {path:'/admin/students/manage',element:e('p',{'data-qa':'students-list'},'Gestión de estudiantes')},
  {path:'/admin/teachers',element:e('p',{'data-qa':'teachers-list'},'Gestión de docentes')},
  {path:'/admin/students/:studentId',element:e(AdminStudentDetailPage)},
  {path:'/admin/teachers/:teacherId',element:e(AdminTeacherDetailPage)},
  {path:'*',element:e('p',{'data-qa':'other'},'Otra ruta')}]}],{initialEntries:['/admin/students/8']});
window.__router=router;
createRoot(document.getElementById('root')).render(e(RouterProvider,{router}));
window.profileReady=true;
`

const profiles = [
  { name: 'estudiante', path: '/admin/students/8', fullName: 'Estudiante QA con apellidos extensos', back: '/admin/students/manage' },
  { name: 'docente', path: '/admin/teachers/3', fullName: 'Docente QA con nombre extenso', back: '/admin/teachers' },
]

// DS5-F2: error states (title, back button label and destination as rendered by each page).
const errorStates = [
  { name: 'estudiante error', path: '/admin/students/99', title: 'Error al cargar estudiante', backLabel: 'Regresar', back: '/admin/students/manage' },
  { name: 'docente error', path: '/admin/teachers/99', title: 'Error al cargar docente', backLabel: 'Regresar a gestión de docentes', back: '/admin/teachers' },
]
const inspectError = `(()=>{
  const vw=document.documentElement.clientWidth,h1s=[...document.querySelectorAll('h1,h2')],alert=document.querySelector('main [role=alert]');
  const button=alert?.querySelector('button'),b=button?.getBoundingClientRect();
  return {mains:document.querySelectorAll('main').length,h1s:h1s.length,title:h1s[0]?.textContent.trim(),
    labelled:!!(h1s[0]?.id&&document.querySelector('section[aria-labelledby="'+h1s[0].id+'"]')?.contains(alert)),
    message:alert?.querySelector('p')?.textContent.trim()??null,alertHeadings:alert?alert.querySelectorAll('h1,h2,h3').length:-1,
    button:button?.textContent.trim()??null,buttonVisible:!!b&&b.width>0&&b.left>=-1&&b.right<=vw+1&&button.scrollWidth<=button.clientWidth+1,
    overflow:document.documentElement.scrollWidth>vw+1}
})()`

const inspect = `(()=>{
  const h1s=[...document.querySelectorAll('h1')], h1=h1s[0];
  const region=h1&&h1.id?document.querySelector('section[aria-labelledby="'+h1.id+'"]'):null;
  const active=[...document.querySelectorAll('nav[aria-label="Opciones del perfil"] button')].find(b=>/Active/.test(b.className));
  return {mains:document.querySelectorAll('main').length,h1s:h1s.length,title:h1?.textContent.trim(),regionContainsH1:!!region&&region.contains(h1),
    activeTab:active?.textContent.trim(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    overflowing:[...document.querySelectorAll('#root *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.right>document.documentElement.clientWidth+1}).slice(0,6).map(el=>el.tagName+'.'+String(el.className).slice(0,40)+' '+Math.round(el.getBoundingClientRect().left)+'-'+Math.round(el.getBoundingClientRect().right)),
    // Sidebar options and "Regresar": fully visible, not clipped, not overlapping each other.
    sidebar:(()=>{const items=[...document.querySelectorAll('aside button')],vw=document.documentElement.clientWidth,out=[];
      items.forEach((b,i)=>{const r=b.getBoundingClientRect();const label=b.textContent.trim().replace(/^‹\\s*/,'');
        if(r.left<-1||r.right>vw+1)out.push(label+' fuera del viewport');
        if(b.scrollWidth>b.clientWidth+1)out.push(label+' recortado');
        const next=items[i+1]?.getBoundingClientRect();if(next&&Math.min(r.bottom,next.bottom)-Math.max(r.top,next.top)>1&&Math.min(r.right,next.right)-Math.max(r.left,next.left)>1)out.push(label+' se solapa')});
      return {count:items.length,problems:out}})(),
    // Profile header: avatar, name and badges present, inside the viewport and not clipped; avatar above the
    // name below 480px (R1 responsive), beside it from 480px up.
    banner:(()=>{const h=document.querySelector('section[aria-labelledby] header');if(!h)return {problems:['sin cabecera']};
      const vw=document.documentElement.clientWidth,avatar=h.firstElementChild,name=h.querySelector('h1'),badges=[...h.querySelectorAll('span')].filter(el=>/Badge/.test(el.className));
      const out=[];for(const el of [avatar,name,...badges]){if(!el){out.push('falta elemento');continue}const r=el.getBoundingClientRect();
        if(r.width===0||r.left<-1||r.right>vw+1)out.push((el.textContent||el.tagName).trim().slice(0,20)+' fuera');if(el.scrollWidth>el.clientWidth+1)out.push((el.textContent||'').trim().slice(0,20)+' recortado')}
      const a=avatar.getBoundingClientRect(),n=name.getBoundingClientRect();
      return {problems:out,badges:badges.length,stacked:a.bottom<=n.top+1}})()}
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const failures = []
try {
  browserProfile = await createBrowserProfile('r1-entity-profile')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'r1-entity-profile-qa', enforce: 'pre',
      resolveId(id) { if (id === '/__r1.js') return '\0r1-qa' },
      load(id) {
        if (id === '\0r1-qa') return demo
        const normalized = id.split('?')[0].replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.profileQa.client.get(...a),post:(...a)=>window.profileQa.client.post(...a),put:(...a)=>window.profileQa.client.put(...a),patch:(...a)=>window.profileQa.client.patch(...a),delete:(...a)=>window.profileQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
          return 'export const useAuth=()=>({notify(){},user:{id:1,must_change_password:false,roles:["ADMINISTRADOR"]}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__r1') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__r1', '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__r1.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${browserProfile.dir}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' })
  trackBrowser(browserProfile, chrome)
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
  const clickText = (text) => evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().replace(/^‹\\s*/,'')===${JSON.stringify(text)});if(!b)throw new Error('sin botón '+${JSON.stringify(text)});b.click()})()`)
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__r1' })
  await wait('window.profileReady===true && !!window.__router', 'arranque')

  for (const profile of profiles) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await evaluate(`window.__router.navigate(${JSON.stringify(profile.path)})`)
      await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(profile.fullName)}`, `${profile.name}: carga`)
      await pause(150)
      const problems = []
      const page = await evaluate(inspect)
      if (page.mains !== 1) problems.push(`${page.mains} main`)
      if (page.h1s !== 1 || page.title !== profile.fullName) problems.push(`h1 ${page.h1s} «${page.title}»`)
      if (!page.regionContainsH1) problems.push('región del perfil sin etiquetar por el h1')
      if (page.activeTab !== 'Perfil') problems.push('pestaña inicial ' + page.activeTab)
      if (page.overflow) problems.push('desbordamiento horizontal: ' + page.overflowing.join(', '))
      if (page.sidebar.count < 3 || page.sidebar.problems.length) problems.push('barra lateral: ' + JSON.stringify(page.sidebar))
      if (page.banner.problems.length || page.banner.badges < 2 || page.banner.stacked !== (width < 480)) problems.push('cabecera del perfil: ' + JSON.stringify(page.banner))
      if (width === 390 || width === 1440) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
        await writeFile(join(evidence, `${profile.name}-${width}.png`), Buffer.from(shot.data, 'base64'))
      }
      // Sidebar tab: "Editar datos" becomes active and shows its form (nothing is submitted).
      await clickText('Editar datos')
      await wait(`[...document.querySelectorAll('nav[aria-label="Opciones del perfil"] button')].find(b=>/Active/.test(b.className))?.textContent.trim()==='Editar datos'`, `${profile.name}: pestaña Editar datos`)
      const edited = await evaluate(inspect)
      const editedForm = await evaluate(`!!document.querySelector('main form')`)
      if (edited.mains !== 1 || !editedForm || edited.overflow || edited.sidebar.problems.length)
        problems.push('pestaña Editar datos: ' + JSON.stringify({ mains: edited.mains, form: editedForm, overflow: edited.overflowing.slice(0, 4), sidebar: edited.sidebar.problems }))
      // "Regresar" goes back to the module list.
      await clickText('Regresar')
      await wait(`window.__router.state.location.pathname===${JSON.stringify(profile.back)}`, `${profile.name}: Regresar`)
      if (problems.length) failures.push(`${profile.name} ${width}px: ${problems.join(' · ')}`)
      console.log(`${problems.length ? 'FAIL' : 'PASS'} perfil ${profile.name} ${width}px${problems.length ? ': ' + problems.join(' · ') : ''}`)
    }
  }
  const errorMessages = {}
  for (const state of errorStates) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await evaluate(`window.__router.navigate(${JSON.stringify(state.path)})`)
      await wait(`!!document.querySelector('main [role=alert] button')`, `${state.name}: estado de error`)
      await pause(150)
      const page = await evaluate(inspectError)
      const problems = []
      if (page.mains !== 1) problems.push(`${page.mains} main`)
      if (page.h1s !== 1 || page.title !== state.title) problems.push(`h1 ${page.h1s} «${page.title}»`)
      if (!page.labelled) problems.push('región sin etiquetar por el h1 o alerta fuera de ella')
      if (!page.message || page.alertHeadings !== 0) problems.push('alerta: ' + JSON.stringify({ message: page.message, headings: page.alertHeadings }))
      if (page.button !== state.backLabel || !page.buttonVisible) problems.push(`botón «${page.button}» visible=${page.buttonVisible}`)
      if (page.overflow) problems.push('desbordamiento horizontal')
      errorMessages[state.name] = page.message
      if (width === 320 || width === 1440) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
        await writeFile(join(evidence, `${state.name.replace(' ', '-')}-${width}.png`), Buffer.from(shot.data, 'base64'))
      }
      await clickText(state.backLabel)
      await wait(`window.__router.state.location.pathname===${JSON.stringify(state.back)}`, `${state.name}: volver`)
      if (problems.length) failures.push(`${state.name} ${width}px: ${problems.join(' · ')}`)
      console.log(`${problems.length ? 'FAIL' : 'PASS'} ${state.name} ${width}px${problems.length ? ': ' + problems.join(' · ') : ''}`)
    }
  }
  const calls = await evaluate('window.profileQa.calls')
  const unexpected = await evaluate('window.profileQa.unexpected')
  if (calls.some((call) => !call.startsWith('get '))) failures.push('escrituras: ' + calls.filter((call) => !call.startsWith('get ')).join(', '))
  if (unexpected.length) console.log('Peticiones GET sin fixture (respondidas 404, no bloquean el contrato): ' + [...new Set(unexpected)].join(', '))
  if (exceptions.length) failures.push('excepciones JS: ' + exceptions.join(' | '))
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ fixtureOnly: true, failures, errorMessages, calls, unexpected }, null, 2))
  assert.deepEqual(failures, [], 'perfiles administrativos')
  console.log(`QA perfiles administrativos PASS ${(profiles.length + errorStates.length) * 5}/${(profiles.length + errorStates.length) * 5} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
