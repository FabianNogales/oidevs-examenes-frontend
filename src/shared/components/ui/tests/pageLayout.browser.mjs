// Browser QA for DS2.1 and D5: real pages and Header, a data router and simulated HTTP (no backend).
// Checks computed layout at 320/390/768/1024/1440px, menus and local CSV selection with long names.
// It never confirms imports, saves or status changes. Run from the frontend root;
// requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../tests/browserProfile.mjs'

const baseline = process.env.EIDA_D5_PHASE === 'before'
const structuralBaseline = baseline && process.env.EIDA_LAYOUT_BASE_REF === 'e53225a'
const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_LAYOUT_OUTPUT ?? 'visual-d5', process.env.EIDA_D5_PHASE ?? 'after')
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
import {AdminReadPage} from '/src/features/users/pages/AdminReadPage.tsx';
import {AdminNewsPage} from '/src/features/portal-news/pages/AdminNewsPage.tsx';
import {NewsPage} from '/src/features/portal-news/pages/NewsPage.tsx';
import {AdminServicesPage} from '/src/features/portal-services/pages/AdminServicesPage.tsx';
import {ServicesPage} from '/src/features/portal-services/pages/ServicesPage.tsx';
import {AdminInformationPage} from '/src/features/portal-information/pages/AdminInformationPage.tsx';
import {InformationPage} from '/src/features/portal-information/pages/InformationPage.tsx';
import {AdminCalendarPage} from '/src/features/portal-calendar/pages/AdminCalendarPage.tsx';
import {AdminTeachersPage} from '/src/features/teachers/pages/AdminTeachersPage.tsx';
import {AdminCourseOfferingsPage} from '/src/features/course-offerings/pages/AdminCourseOfferingsPage.tsx';
import {AdminUserHistoryPage} from '/src/features/users/pages/AdminUserHistoryPage.tsx';
import {ManageAccounts} from '/src/features/users/pages/AdminManageUsersPage.tsx';
import {AdminUserRolesPage} from '/src/features/users/pages/AdminUserRolesPage.tsx';
import {ImportStudentsPage} from '/src/features/students/pages/ImportStudentsPage.tsx';
import {ImportCourseOfferingsPage} from '/src/features/course-offerings/pages/ImportCourseOfferingsPage.tsx';
import {Header} from '/src/shared/components/Header/Header.tsx';
import {setStudentImportIdentity} from '/src/features/students/utils/studentImportDraft.ts';
setStudentImportIdentity({id:1,status:'ACTIVE',must_change_password:false,roles:['ADMINISTRADOR']});
const e=React.createElement;
const career={id:1,code:'QA-SIS',name:'Carrera QA Sistemas',status:'ACTIVE'};
const account={id:15,full_name:'Persona QA de prueba',first_names:'Persona',last_names:'QA de prueba',email:'persona.qa.con.correo.institucional.largo@example.edu',institutional_code:'QA-15',identity_number:'123',status:'ACTIVE',roles:[],student_id:null,teacher_id:null,student_status:null,teacher_status:null};
const page=(data,extra={})=>({data,meta:{current_page:1,last_page:1,total:data.length,per_page:15,from:data.length?1:null,to:data.length||null,...extra}});
const fixtures={
  '/admin/academic-terms/active':{data:{id:1,name:'Periodo QA 2026',start_date:'2026-01-01',end_date:'2026-12-31',status:'ACTIVE'}},
  '/admin/users':page([account]),
  '/admin/users/15':{data:account},
  '/admin/users/15/roles':{data:[{id:2,name:'DOCENTE',status:'ACTIVE',assigned:false}]},
  '/admin/teachers':page([]),
  '/admin/users/history':page([{id:1,user_id:15,actor_id:1,actor_name:'Responsable QA con nombre y apellidos extensos',action:'ROLE_ASSIGNED',created_at:'2026-11-07T10:00:00-04:00',old_context:{},new_context:{role:'DOCENTE'}}]),
  '/admin/academic-terms':page([]),
  '/admin/course-offerings':page([]),
  '/admin/portal/event-categories':{data:[]},
  '/admin/portal/events':page([]),
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
  {path:'/admin/users/manage',element:e(ManageAccounts)},
  {path:'/admin/users/roles',element:e(ManageAccounts,{rolesView:true})},
  {path:'/admin/users/:userId/roles',element:e(AdminUserRolesPage)},
  {path:'/admin/students/import',element:e(ImportStudentsPage)},
  {path:'/admin/teachers/assignments/import',element:e(ImportCourseOfferingsPage)},
  {path:'/admin/teachers',element:e(AdminTeachersPage)},
  {path:'/admin/teachers/assignments',element:e(AdminCourseOfferingsPage)},
  {path:'/admin/users/history',element:e(AdminUserHistoryPage)},
  {path:'/admin/portal/events',element:e(AdminCalendarPage)},
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
]).map(route=>({...route,element:e(React.Fragment,null,e(Header,{user:route.path.startsWith('/admin')?{name:'Administradora QA con nombre y apellidos extraordinariamente largos',role:'admin'}:null}),route.element)}));
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.calls=[];qa.unexpected=[];root.render(e(RouterProvider,{key:path+Math.random(),router:createMemoryRouter(routes,{initialEntries:[path]})}));};
`

const screens = [
  {path:'/admin/users/manage',title:'Gestión de usuarios',crumbs:['Inicio','Usuarios','Gestionar usuarios'],structural:true,rows:['QA de prueba Persona']},
  {path:'/admin/users/roles',title:'Roles y permisos',crumbs:['Inicio','Usuarios','Roles y permisos'],structural:true,rows:['QA de prueba Persona']},
  {path:'/admin/users/15/roles',title:'Gestionar roles y permisos',crumbs:['Inicio','Roles y permisos','Gestionar roles y permisos'],structural:true,rows:['Asignar rol']},
  {path:'/admin/students/import',title:'Importar estudiantes',crumbs:['Inicio','Estudiantes','Importar estudiantes'],structural:true,csv:true},
  {path:'/admin/teachers/assignments/import',title:'Importar asignaciones de materias',crumbs:['Inicio','Docentes','Asignación de materias','Importar asignaciones'],structural:true,csv:true},
  {path:'/admin/teachers',title:'Gestión de docentes',crumbs:['Inicio','Docentes','Gestionar docentes'],legacy:baseline},
  {path:'/admin/teachers/assignments',title:'Materias asignadas a docentes',crumbs:['Inicio','Docentes','Asignación de materias'],legacy:baseline},
  {path:'/admin/users/history',title:'Historial de usuarios y roles',crumbs:baseline&&!structuralBaseline?[]:['Inicio','Historial de usuarios y roles'],legacy:baseline,rows:['Responsable QA con nombre y apellidos extensos']},
  {path:'/admin/portal/events',title:'Gestión del calendario',crumbs:['Inicio','Gestión del calendario'],legacy:baseline},
  { path: '/admin/rooms/import', title: 'Importar aulas', crumbs: ['Inicio', 'Aulas', 'Importar aulas'], kind: 'import' },
  { path: '/admin/subjects/import', title: 'Importar materias', crumbs: ['Inicio', 'Materias', 'Importar materias'], kind: 'import' },
  { path: '/admin/rooms', title: 'Gestión de aulas', crumbs: ['Inicio', 'Aulas', 'Gestionar aulas'], kind: 'catalog',
    actions: ['+ Importar aulas (CSV)', '+ Registrar aula'], rows: ['Aula QA 101', 'Laboratorio QA 202'] },
  { path: '/admin/subjects', title: 'Gestión de materias', crumbs: ['Inicio', 'Materias', 'Gestionar materias'], kind: 'catalog',
    actions: ['+ Importar materias (CSV)', '+ Registrar materia'], rows: ['Materia QA de programación'] },
  { path: '/admin/careers', title: 'Carreras', crumbs: baseline && !structuralBaseline ? [] : ['Inicio', 'Carreras'], kind: 'read', description: 'Consulta del catálogo. Incluye carreras activas e inactivas.',
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
  { path: '/admin/audit-logs', title: 'Auditoría', crumbs: baseline && !structuralBaseline ? [] : ['Inicio', 'Auditoría'], kind: 'read', legacy: baseline, description: 'El total cuenta eventos.', rows: ['UPDATE'] },
].filter(screen => process.env.EIDA_LAYOUT_SCOPE !== 'd52' || screen.structural || ['/admin/users/history','/information','/news','/services'].includes(screen.path))

// Collected in the page: structure, visibility and overflow of the key elements.
const inspect = `(()=>{
  const vw=innerWidth, r=(el)=>el.getBoundingClientRect();
  const visible=(el)=>{if(!el)return false;const b=r(el);const s=getComputedStyle(el);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&b.left>=-1&&b.right<=vw+1};
  const h1s=[...document.querySelectorAll('h1')];
  const nav=document.querySelector('nav[aria-label="Ruta de navegación"]');
  const buttons=[...document.querySelectorAll('a,button')];
  const action=(label)=>{const el=buttons.find((b)=>b.textContent.trim()===label);return {label,found:!!el,visible:visible(el),name:el?(el.getAttribute('aria-label')||el.textContent.trim()):''}};
  const header=h1s[0]?.closest('header'), container=header?.parentElement, description=header?.querySelector('p:last-child');
  const panelControls=[...document.querySelectorAll('main section[aria-label] button,main section[aria-label] select,main section[aria-label] input:not([type=file])')].filter(el=>r(el).width>0);
  const escapedControls=panelControls.filter(el=>{const panel=el.closest('section[aria-label]'),b=r(el),p=r(panel);return b.left<p.left-1||b.right>p.right+1||el.scrollWidth>el.clientWidth+1}).map(el=>el.textContent.trim().slice(0,60));
  const overflowing=[...document.querySelectorAll('#root *')].filter((el)=>{const b=r(el);return b.width>0&&b.right>vw+1&&getComputedStyle(el).position!=='fixed'}).slice(0,8).map((el)=>el.tagName+'.'+String(el.className).slice(0,40));
  return {
    scroll:document.documentElement.scrollWidth, vw,
    client:document.documentElement.clientWidth,
    layout:header&&container?{x:r(h1s[0]).left,width:r(container).width,maxWidth:getComputedStyle(container).maxWidth,padding:getComputedStyle(container).padding,breadcrumbGap:nav?getComputedStyle(nav).marginBottom:null,headerGap:getComputedStyle(header).marginBottom,descriptionGap:description?getComputedStyle(description).marginTop:null}:null,
    descriptionX:description?r(description).left:null,
    escapedControls,
    headingSurface:(()=>{for(let el=h1s[0];el;el=el.parentElement){const bg=getComputedStyle(el).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')return bg}return getComputedStyle(document.body).backgroundColor})(),
    bodySurface:getComputedStyle(document.body).backgroundColor,
    current:nav?.querySelector('[aria-current=page]')?.textContent.trim(),
    links:nav?[...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')):[],
    mains:document.querySelectorAll('main').length,
    h1:h1s.map((h)=>({text:h.textContent.trim(),id:h.id,tab:h.getAttribute('tabindex'),visible:visible(h),clipped:h.scrollWidth>h.clientWidth+1,weight:getComputedStyle(h).fontWeight,size:getComputedStyle(h).fontSize,lineHeight:getComputedStyle(h).lineHeight})),
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
const widths = process.env.EIDA_LAYOUT_WIDTHS?.split(',').map(Number) ?? [320,390,768,1024,1440]
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
        if (baseline && /\/src\/.*\.(tsx|css)$/.test(normalized)) {
          const path = normalized.slice(normalized.indexOf('/src/') + 1)
          try { return execFileSync('git', ['show', (process.env.EIDA_LAYOUT_BASE_REF ?? 'f56e082') + ':' + path], { encoding: 'utf8' }) } catch { /* virtual modules use the current source */ }
        }

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

  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(150)
    for (const screen of screens) {
      const label = `${width}px ${screen.title}`
      const before = { exceptions: exceptions.length, console: consoleErrors.length }
      await evaluate(`window.__qaActions=${JSON.stringify(screen.actions ?? [])};pageLayoutQa.show(${JSON.stringify(screen.path)})`)
      await wait(`document.querySelector('h1')?.textContent.trim()===${JSON.stringify(screen.title)}`, `${label}: título`)
      if (screen.rows) await wait(`${JSON.stringify(screen.rows)}.every((t)=>document.body.innerText.includes(t))`, `${label}: filas`)
      if (screen.csv) await wait(`!!document.querySelector('input[type=file]')`, `${label}: formulario CSV`)
      await pause(150)
      const page = await evaluate(inspect)
      const unexpected = await evaluate('pageLayoutQa.unexpected')
      const failures = []
      const check = (ok, message) => { if (!ok) failures.push(message) }
      check(page.scroll <= page.client + 1, `desbordamiento horizontal ${page.scroll}>${page.client} ${page.overflowing.join(', ')}`)
      check(page.mains === 1, `${page.mains} <main> (se esperaba solo el del layout)`)
      check(page.h1.length === 1, `${page.h1.length} h1`)
      if (!baseline) check(page.h1[0]?.size === (width <= 640 ? '24px' : '32px'), 'escala H1: '+page.h1[0]?.size)
      if (!screen.legacy) check(page.h1[0]?.weight === '700', `peso del h1 ${page.h1[0]?.weight}`)
      check(page.h1[0]?.text === screen.title && page.h1[0].visible && !page.h1[0].clipped, `h1 incorrecto/oculto/recortado ${JSON.stringify(page.h1[0])}`)
      check(JSON.stringify(page.crumbs) === JSON.stringify(screen.crumbs), `migas ${JSON.stringify(page.crumbs)}`)
      if (screen.crumbs.length) {
        check(page.crumbsVisible, 'migas no visibles')
        check(page.current === screen.crumbs.at(-1), 'aria-current de breadcrumb')
        check(page.links.every(href => ['/', '/admin', '/admin/rooms', '/admin/subjects', '/admin/teachers', '/admin/users/manage', '/admin/users/roles', '/admin/students/manage', '/admin/teachers/assignments'].includes(href)), 'ruta breadcrumb desconocida')
      }
      if (!baseline) check(page.headingSurface === page.bodySurface, 'superficie de página: '+page.headingSurface+' / '+page.bodySurface)
      if (!baseline && (screen.structural || screen.path === '/admin/users/history')) {
        check(page.layout?.maxWidth === '1280px', 'ancho administrativo: '+JSON.stringify(page.layout))
        const expectedWidth=Math.min(page.client,1280), padding=page.layout.padding.split(' '), gutter=parseFloat(padding[1] ?? padding[0])
        check(Math.abs(page.layout.width-expectedWidth)<=1, 'contenedor fuera del ancho disponible')
        check(Math.abs(page.layout.x-((page.client-expectedWidth)/2+gutter))<=1, 'alineación H1 y contenedor')
        check(page.h1[0]?.lineHeight === (width <= 640 ? '30px' : '40px'), 'altura de línea H1')
        check(page.layout?.breadcrumbGap === '24px' && page.layout?.headerGap === '24px' && page.layout?.descriptionGap === '8px', 'espaciado de encabezado: '+JSON.stringify(page.layout))
        check(page.escapedControls.length === 0, 'controles CSV recortados/fuera del panel: '+page.escapedControls.join(', '))
      }
      if (!baseline && ['/information', '/news', '/services'].includes(screen.path)) {
        check(page.layout?.maxWidth === '960px', 'contrato público narrow: '+JSON.stringify(page.layout))
        check(page.layout?.headerGap === '24px', 'separación pública')
      }
      if (!baseline && screen.path === '/information') {
        check(page.layout?.descriptionGap === '8px', 'subtítulo fuera de PageHeader')
        check(Math.abs(page.descriptionX-page.layout.x)<=1, 'subtítulo desalineado del H1')
      }
      if (screen.csv) check(page.fileInputs >= 1 && page.templateButton, 'archivo o plantilla CSV ausente')
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
      if (screen.path === '/admin/users/manage') {
        const menuSelector='button[aria-controls][aria-label*="principal"]'
        if (await evaluate(`(()=>{const b=document.querySelector('${menuSelector}');return !!b&&b.getBoundingClientRect().width>0})()`)) {
          await evaluate(`(()=>{const button=document.querySelector('${menuSelector}');button.focus();button.click()})()`)
          await wait(`document.querySelector('${menuSelector}')?.getAttribute('aria-expanded')==='true'`, 'abrir menú global')
          check(await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`), 'overflow al abrir menú global')
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
          await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
          await wait(`document.querySelector('${menuSelector}')?.getAttribute('aria-expanded')==='false'`, 'cerrar menú global')
        }
        await evaluate(`(()=>{const button=document.querySelector('button[aria-haspopup="menu"]');button.focus();button.click()})()`)
        await wait(`document.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')==='true'`, 'abrir cuenta')
        check(await evaluate(`(()=>{const menu=document.querySelector('[role=menu]');if(!menu)return false;const r=menu.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})()`), 'menú de cuenta recortado')
        check(await evaluate(`document.querySelector('button[aria-haspopup="menu"]').textContent.includes('extraordinariamente largos')`), 'nombre completo inaccesible')
        const menuShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
        await writeFile(join(evidence,shotName.replace('.png','-account.png')),Buffer.from(menuShot.data,'base64'))
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
        await wait(`document.querySelector('button[aria-haspopup="menu"]')?.getAttribute('aria-expanded')==='false'`, 'cerrar cuenta')
      }
      if (screen.csv) {
        await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File(['sis_code,identity_number,first_names,last_names,email,career,profile_photo\\n'], 'padron_con_nombre_extremadamente_largo_para_verificar_que_el_archivo_y_los_botones_siguen_accesibles_en_pantallas_pequenas.csv',{type:'text/csv'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`)
        await pause(150)
        const selected=await evaluate(inspect)
        check(selected.scroll<=selected.client+1,'overflow con nombre CSV largo: '+selected.scroll+'/'+selected.client)
        check(selected.escapedControls.length===0,'controles CSV inaccesibles tras seleccionar archivo: '+selected.escapedControls.join(', '))
        check(selected.text.includes('padron_con_nombre_extremadamente_largo'), 'selección CSV no visible')
        const selectedShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
        await writeFile(join(evidence,shotName.replace('.png','-selected.png')),Buffer.from(selectedShot.data,'base64'))
      }
      results.push({ width, path:screen.path, screen: screen.title, pass: failures.length === 0, failures, layout:page.layout, heading:page.h1[0], surface:page.headingSurface, breadcrumbs:page.crumbs, visibleButtons: page.panelButtons.slice(0, 12) })
      console.log(`${failures.length ? 'FAIL' : 'PASS'} ${label}${failures.length ? ': ' + failures.join(' · ') : ''}`)
    }
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  if (!baseline) for (const width of widths) {
    const admin=results.filter(result=>result.width===width && ['/admin/users/manage','/admin/users/roles','/admin/users/15/roles','/admin/users/history','/admin/students/import','/admin/teachers/assignments/import'].includes(result.path))
    // Tall CSV pages reserve the browser's vertical scrollbar: compare the shared contract,
    // while each page's width and alignment are checked against its own clientWidth above.
    assert.equal(new Set(admin.map(result=>JSON.stringify((({x,width,...contract})=>contract)(result.layout)))).size,1,`${width}: contrato administrativo computado desigual`)
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.pass)
  if (!structuralBaseline) assert.equal(failed.length, 0, `${failed.length} combinaciones con fallos`)
  console.log(`${structuralBaseline ? 'BASELINE registrada' : 'QA pageLayout PASS'} ${results.length - failed.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
