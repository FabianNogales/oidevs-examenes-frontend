// Browser QA for DS2.1b–d: screens migrated to PageContainer/PageHeader, rendered with the real
// components, a data router and a simulated httpClient (no backend). Checks rendering and layout at
// 320/390/768/1440px; it does not run imports, saves or status changes. Run from the frontend root;
// requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'ds2.1-page-layout')
await mkdir(evidence, { recursive: true })

// Synthetic QA fixtures (not real institutional data).
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {ImportRoomsPage} from '/src/features/rooms/pages/ImportRoomsPage.tsx';
import {ImportSubjectsPage} from '/src/features/subjects/pages/ImportSubjectsPage.tsx';
import {AdminRoomsPage} from '/src/features/rooms/pages/AdminRoomsPage.tsx';
import {AdminSubjectsPage} from '/src/features/subjects/pages/AdminSubjectsPage.tsx';
import {AdminReadPage} from '/src/features/admin/pages/AdminReadPage.tsx';
import {AdminNewsPage} from '/src/features/portal-news/AdminNewsPage.tsx';
import {NewsPage} from '/src/features/portal-news/NewsPage.tsx';
import {AdminServicesPage} from '/src/features/portal-services/AdminServicesPage.tsx';
import {ServicesPage} from '/src/features/portal-services/ServicesPage.tsx';
import {AdminInformationPage} from '/src/features/portal-information/AdminInformationPage.tsx';
import {InformationPage} from '/src/features/portal-information/InformationPage.tsx';
const e=React.createElement;
const career={id:1,code:'QA-SIS',name:'Carrera QA Sistemas',status:'ACTIVE'};
const page=(data,extra={})=>({data,meta:{current_page:1,last_page:1,total:data.length,per_page:15,from:data.length?1:null,to:data.length||null,...extra}});
const fixtures={
  '/admin/rooms':page([{id:1,code:'QA-101',name:'Aula QA 101',location:'Bloque QA',capacity:40,status:'ACTIVE'},{id:2,code:'QA-202',name:'Laboratorio QA 202',location:'Bloque QA',capacity:25,status:'INACTIVE'}]),
  '/admin/subjects':page([{id:1,code:'QA-111',name:'Materia QA de programación',status:'ACTIVE',careers:[career]}]),
  '/admin/subjects/careers':{data:[career]},
  '/admin/careers':page([career,{id:2,code:'QA-IND',name:'Carrera QA Industrial',status:'INACTIVE'}]),
  '/admin/portal/news':{data:[{id:41,title:'Noticia QA publicada',summary:'Resumen QA.',image_url:null,published_at:'2026-11-04T10:00:00-04:00',status:'PUBLISHED',revision:1,created_by:1,updated_by:1,published_by:1},{id:42,title:'Noticia QA en borrador',summary:'Resumen QA.',image_url:null,published_at:null,status:'DRAFT',revision:1,created_by:1,updated_by:1,published_by:null}],meta:{current_page:1,last_page:1,per_page:15,total:2}},
  '/portal/news':{data:[{id:41,title:'Noticia QA publicada',summary:'Resumen QA.',image_url:null,published_at:'2026-11-04T10:00:00-04:00'}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/admin/portal/services':{data:[{id:42,name:'Servicio QA activo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/activo',display_order:1,status:'ACTIVE',revision:1,needs_review:false},{id:43,name:'Servicio QA inactivo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/inactivo',display_order:2,status:'INACTIVE',revision:1,needs_review:false}],meta:{current_page:1,last_page:1,per_page:15,total:2}},
  '/portal/services':{data:[{id:42,name:'Servicio QA activo',description:'Descripción QA.',icon:'link',url:'https://qa.example.edu/activo',display_order:1}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/admin/portal/information/sections':{data:[{id:144,key:'about',revision:2,is_published:true,has_unpublished_changes:false,draft:{title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1},published:{title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1},published_at:'2026-11-05T10:00:00-04:00',created_by:1,updated_by:1}],meta:{current_page:1,last_page:1,per_page:15,total:1}},
  '/portal/information':{data:{sections:[{id:1,key:'about',title:'Sección QA institucional',description:'Descripción QA.',links:[],sort_order:1}],faqs:[{id:1,question:'¿Pregunta QA?',answer:'Respuesta QA.',sort_order:1}]}},
  '/admin/audit-logs':page([{id:1,actor_id:1,action:'UPDATE',entity_type:'Room',entity_id:1,created_at:'2026-01-01T10:00:00Z',old_context:{},new_context:{}}]),
};
const qa=window.pageLayoutQa={calls:[],unexpected:[]};
const respond=(method)=>async(url,body)=>{
  qa.calls.push({method,url});
  if(method==='get'&&fixtures[url])return {data:structuredClone(fixtures[url])};
  qa.unexpected.push(method+' '+url);
  throw Object.assign(new Error('QA: unexpected request '+method+' '+url),{isAxiosError:true,response:{status:501,data:{}}});
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
const routes=[
  {path:'/admin/rooms/import',element:e(ImportRoomsPage)},
  {path:'/admin/subjects/import',element:e(ImportSubjectsPage)},
  {path:'/admin/rooms',element:e(AdminRoomsPage)},
  {path:'/admin/subjects',element:e(AdminSubjectsPage)},
  {path:'/admin/careers',element:e(AdminReadPage,{kind:'careers'})},
  {path:'/admin/audit-logs',element:e(AdminReadPage,{kind:'audit-logs'})},
].map((route)=>({...route,element:e('main',{'data-qa':'layout-main'},route.element)})).concat([
  {path:'/admin/portal/news',element:e('main',{'data-qa':'layout-main'},e(AdminNewsPage))},
  {path:'/news',element:e(NewsPage)},
  {path:'/admin/portal/services',element:e('main',{'data-qa':'layout-main'},e(AdminServicesPage))},
  {path:'/services',element:e(ServicesPage)},
  {path:'/admin/portal/information',element:e('main',{'data-qa':'layout-main'},e(AdminInformationPage))},
  {path:'/information',element:e(InformationPage)},
]);
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.calls=[];qa.unexpected=[];root.render(e(RouterProvider,{key:path+Math.random(),router:createMemoryRouter(routes,{initialEntries:[path]})}));};
`

const screens = [
  { path: '/admin/rooms/import', title: 'Importar aulas', crumbs: ['Inicio', 'Aulas', 'Importar aulas'], kind: 'import' },
  { path: '/admin/subjects/import', title: 'Importar materias', crumbs: ['Inicio', 'Materias', 'Importar materias'], kind: 'import' },
  { path: '/admin/rooms', title: 'Gestión de aulas', crumbs: ['Inicio', 'Aulas', 'Gestionar aulas'], kind: 'catalog',
    actions: ['+ Importar aulas (CSV)', '+ Registrar aula'], rows: ['Aula QA 101', 'Laboratorio QA 202'] },
  { path: '/admin/subjects', title: 'Gestión de materias', crumbs: ['Inicio', 'Materias', 'Gestionar materias'], kind: 'catalog',
    actions: ['+ Importar materias (CSV)', '+ Registrar materia'], rows: ['Materia QA de programación'] },
  { path: '/admin/careers', title: 'Carreras', crumbs: [], kind: 'read', description: 'Consulta del catálogo. Incluye carreras activas e inactivas.',
    rows: ['Carrera QA Sistemas', 'Carrera QA Industrial'] },
  { path: '/admin/portal/news', title: 'Gestión de noticias', crumbs: ['Inicio', 'Gestión de noticias'], kind: 'news-admin',
    description: 'Crea, publica y archiva las noticias del portal institucional.', actions: ['Crear noticia'], rows: ['Noticia QA publicada', 'Noticia QA en borrador'] },
  { path: '/news', title: 'Noticias institucionales', crumbs: ['Inicio', 'Noticias institucionales'], kind: 'news-public', rows: ['Noticia QA publicada'] },
  { path: '/admin/portal/services', title: 'Gestión de servicios', crumbs: ['Inicio', 'Gestión de servicios'], kind: 'portal-admin', selects: 1,
    description: 'Administra los servicios y enlaces institucionales.', actions: ['Crear servicio'], rows: ['Servicio QA activo', 'Servicio QA inactivo'] },
  { path: '/services', title: 'Servicios institucionales', crumbs: ['Inicio', 'Servicios institucionales'], kind: 'portal-public', rows: ['Servicio QA activo'] },
  { path: '/admin/portal/information', title: 'Gestión de información y FAQ', crumbs: ['Inicio', 'Gestión de información y FAQ'], kind: 'portal-admin', selects: 2,
    description: 'Administra las secciones institucionales y las preguntas frecuentes del portal.', rows: ['Sección QA institucional'] },
  { path: '/information', title: 'Información institucional', crumbs: ['Inicio', 'Información institucional'], kind: 'portal-public', rows: ['Sección QA institucional', '¿Pregunta QA?'] },
  { path: '/admin/audit-logs', title: 'Auditoría', crumbs: [], kind: 'read', legacy: true, description: 'El total cuenta eventos.', rows: ['UPDATE'] },
]

// Collected in the page: structure, visibility and overflow of the key elements.
const inspect = `(()=>{
  const vw=innerWidth, r=(el)=>el.getBoundingClientRect();
  const visible=(el)=>{if(!el)return false;const b=r(el);const s=getComputedStyle(el);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&b.left>=-1&&b.right<=vw+1};
  const h1s=[...document.querySelectorAll('h1')];
  const nav=document.querySelector('nav[aria-label="Ruta de navegación"]');
  const buttons=[...document.querySelectorAll('a,button')];
  const action=(label)=>{const el=buttons.find((b)=>b.textContent.trim()===label);return {label,found:!!el,visible:visible(el),name:el?(el.getAttribute('aria-label')||el.textContent.trim()):''}};
  const overflowing=[...document.querySelectorAll('#root *')].filter((el)=>{const b=r(el);return b.width>0&&b.right>vw+1&&getComputedStyle(el).position!=='fixed'}).slice(0,8).map((el)=>el.tagName+'.'+String(el.className).slice(0,40));
  return {
    scroll:document.documentElement.scrollWidth, vw,
    mains:document.querySelectorAll('main').length,
    h1:h1s.map((h)=>({text:h.textContent.trim(),id:h.id,tab:h.getAttribute('tabindex'),visible:visible(h),clipped:h.scrollWidth>h.clientWidth+1,weight:getComputedStyle(h).fontWeight})),
    crumbs:nav?[...nav.querySelectorAll('li')].map((li)=>li.textContent.trim()):[], crumbsVisible:visible(nav),
    labelled:document.querySelector('section[aria-labelledby]')?.getAttribute('aria-labelledby')??null,
    text:document.body.innerText,
    search:!!document.querySelector('form[role="search"], input[type="search"]'),
    table:!!document.querySelector('table, [role="table"], [role="list"], ul, article'),
    fileInputs:document.querySelectorAll('input[type="file"]').length,
    templateButton:visible(buttons.find((b)=>/plantilla/i.test(b.textContent))),
    panelButtons:buttons.filter((b)=>visible(b)).map((b)=>b.textContent.trim()).filter(Boolean),
    overflowing, actions:window.__qaActions?window.__qaActions.map(action):[],
  };
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const results = []
try {
  browserProfile = await createBrowserProfile('ds21-page-layout')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds21-page-layout-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__ds21-layout.js') return '\0ds21-layout-qa' },
      load(id) {
        if (id === '\0ds21-layout-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.pageLayoutQa.client.get(...a),post:(...a)=>window.pageLayoutQa.client.post(...a),put:(...a)=>window.pageLayoutQa.client.put(...a),patch:(...a)=>window.pageLayoutQa.client.patch(...a),delete:(...a)=>window.pageLayoutQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({notify(){}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds21-layout') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds21-layout',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds21-layout.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__ds21-layout')).status, 200)
  console.log('QA: servidor local listo; iniciando Chrome sin ventana')
  chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' })
  let launchError
  chrome.on('error', (error) => { launchError = error })
  let port
  for (let index = 0; index < 80 && !port; index++) {
    if (launchError) throw launchError
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { await pause(250) }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }) })

  let id = 0
  const pending = new Map()
  const exceptions = []
  const consoleErrors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error')
      consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 300))
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id
    pending.set(next, { resolve, reject })
    ws.send(JSON.stringify({ id: next, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression, label) => {
    for (let index = 0; index < 80; index++) { if (await evaluate(expression)) return; await pause(100) }
    throw new Error(`Tiempo agotado: ${label}`)
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds21-layout' })
  await wait(`!!window.pageLayoutQa?.show`, 'arranque de la app QA')

  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(150)
    for (const screen of screens) {
      const label = `${width}px ${screen.title}`
      const before = { exceptions: exceptions.length, console: consoleErrors.length }
      await evaluate(`window.__qaActions=${JSON.stringify(screen.actions ?? [])};pageLayoutQa.show(${JSON.stringify(screen.path)})`)
      await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(screen.title)}`, `${label}: título`)
      if (screen.rows) await wait(`${JSON.stringify(screen.rows)}.every((t)=>document.body.innerText.includes(t))`, `${label}: filas`)
      await pause(150)
      const page = await evaluate(inspect)
      const unexpected = await evaluate('pageLayoutQa.unexpected')
      const failures = []
      const check = (ok, message) => { if (!ok) failures.push(message) }
      check(page.scroll <= page.vw + 1, `desbordamiento horizontal ${page.scroll}>${page.vw} ${page.overflowing.join(', ')}`)
      check(page.mains === 1, `${page.mains} <main> (se esperaba solo el del layout)`)
      check(page.h1.length === 1, `${page.h1.length} h1`)
      if (!screen.legacy) check(page.h1[0]?.weight === '700', `peso del h1 ${page.h1[0]?.weight}`)
      check(page.h1[0]?.text === screen.title && page.h1[0].visible && !page.h1[0].clipped, `h1 incorrecto/oculto/recortado ${JSON.stringify(page.h1[0])}`)
      check(JSON.stringify(page.crumbs) === JSON.stringify(screen.crumbs), `migas ${JSON.stringify(page.crumbs)}`)
      if (screen.crumbs.length) check(page.crumbsVisible, 'migas no visibles')
      if (screen.description) check(page.text.includes(screen.description), 'descripción ausente')
      for (const action of page.actions) check(action.found && action.visible && action.name, `acción ${action.label} ${JSON.stringify(action)}`)
      if (screen.kind === 'import') {
        check(page.fileInputs >= 1, 'sin input de archivo CSV')
        check(page.labelled === `${screen.path.includes('rooms') ? 'import-rooms' : 'import-subjects'}-title`, `aria-labelledby ${page.labelled}`)
      }
      if (screen.kind === 'catalog') {
        check(page.search, 'sin formulario de búsqueda')
        check(page.table, 'sin tabla/lista')
        check(page.h1[0]?.tab === '-1' && page.labelled === page.h1[0]?.id, `id/tabIndex del h1 ${JSON.stringify(page.h1[0])} / ${page.labelled}`)
      }
      if (screen.kind === 'news-admin') {
        check(page.search, 'sin búsqueda de noticias')
        check(await evaluate("!!document.querySelector('select[name=news_status]')"), 'sin filtro de estado')
        check(page.text.includes('Gestionar'), 'acción Gestionar ausente')
      }
      if (screen.kind === 'portal-admin') {
        check(page.search, 'sin búsqueda')
        const selects = await evaluate("document.querySelectorAll('[role=group][aria-label=Filtros] select, select').length")
        check(selects >= screen.selects, `filtros: ${selects} select (se esperaban ${screen.selects})`)
        check(page.text.includes('Gestionar'), 'acción Gestionar ausente')
      }
      if (screen.kind === 'portal-public') check(page.labelled === null, 'la página pública no debe etiquetar una section con aria-labelledby')
      if (screen.kind === 'read') {
        for (const row of screen.rows) check(page.text.includes(row), `fila ${row} ausente`)
        check(page.text.includes('Ver detalle'), 'acción "Ver detalle" ausente')
        if (screen.path === '/admin/careers') check(page.search, 'sin búsqueda en Carreras')
      }
      check(unexpected.length === 0, `peticiones inesperadas ${unexpected.join(', ')}`)
      check(exceptions.length === before.exceptions, `excepciones JS: ${exceptions.slice(before.exceptions).join(' | ')}`)
      const newConsole = consoleErrors.slice(before.console)
      check(newConsole.length === 0, `console.error: ${newConsole.join(' | ')}`)
      const shotName = `${screen.path.replaceAll('/', '_').slice(1)}-${width}.png`
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(join(evidence, shotName), Buffer.from(shot.data, 'base64'))
      results.push({ width, screen: screen.title, pass: failures.length === 0, failures, visibleButtons: page.panelButtons.slice(0, 12) })
      console.log(`${failures.length ? 'FAIL' : 'PASS'} ${label}${failures.length ? ': ' + failures.join(' · ') : ''}`)
    }
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.pass)
  assert.equal(failed.length, 0, `${failed.length} combinaciones con fallos`)
  console.log(`QA DS2.1: PASS ${results.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
