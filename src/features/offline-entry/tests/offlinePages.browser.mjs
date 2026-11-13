// Browser QA for the offline pages (G6): /offline (OfflineHomePage) and /exams/:examId/offline
// (OfflineEntryPage) inside the real OfflineAccessGate shell, at 320/375/640/768/1440px.
//
// Controlled doubles (no backend, no IndexedDB, no service worker):
//   - storage/offlineStore.ts  -> in-memory packages with controllable delay and failure
//   - services/offlinePwa.ts   -> verifyOfflineShell() always reports the shell as ready
//   - shared/api/httpClient.ts -> the package download can be held and then fails
//   - auth/hooks/useAuth.ts    -> a fixed user; app/config/env.ts -> fixed values (no .env read)
// The gate itself and services/offlineIdentity.ts are real: the identity is seeded in sessionStorage.
// NOT covered here: real IndexedDB reads/writes, the service worker and its cache, a successful
// download, entry capture, QR scanning and synchronisation with the server.
//
// OFFLINE_QA_BASELINE=1 records the layout before the G6 migration (behaviour is asserted in both
// modes; the PageContainer/PageHeader contract only without it). Evidence: .validation.local/offline-pages/.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const baseline = process.env.OFFLINE_QA_BASELINE === '1'
const root = join(process.cwd(), '.validation.local', process.env.OFFLINE_QA_OUTPUT ?? 'offline-pages')
const evidence = join(root, baseline ? 'before' : 'after')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider, useLocation} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {OfflineHomePage} from '/src/features/offline-entry/pages/OfflineHomePage.tsx';
import {OfflineEntryPage} from '/src/features/offline-entry/pages/OfflineEntryPage.tsx';
const e=React.createElement;
const qa=window.offQa;
const Other=()=>e('main',null,e('h1',null,'Otra ruta QA'),e('p',{id:'qa-path'},useLocation().pathname));
const routes=[{path:'/offline',element:e(OfflineHomePage)},{path:'/exams/:examId/offline',element:e(OfflineEntryPage)},{path:'*',element:e(Other)}];
const rootNode=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.router=createMemoryRouter(routes,{initialEntries:[path]});rootNode.render(e(RouterProvider,{key:Math.random(),router:qa.router}))};
qa.ready=true;
`
// State shared by the doubles; created before any module runs.
const bootstrap = `
const packet=(examId)=>({package_id:'pkg-qa-'+examId,exam_id:examId,exam:{id:examId,name:'Parcial QA de programación con un nombre extenso',subject_name:'Materia QA de programación',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,status:'SCHEDULED',entry_opens_at:'2026-11-20T09:30:00-04:00',entry_closes_at:'2026-11-20T10:30:00-04:00',server_time:'2026-11-10T10:00:00-04:00',room:{id:1,code:'QA-101',name:'Aula QA 101'}},list_id:2,version:1,responsible_id:7,prepared_at:'2026-11-10T10:00:00-04:00',expires_at:'2099-01-01T00:00:00-04:00',timezone:'America/La_Paz',room_id:1,surname_range:{from:'A',to:'M'},qr_validation:'SERVER_ON_SYNC',students:[{student_id:1,first_names:'Ana',last_names:'Prueba QA',sis_code:'000101',identity_number:'CI-1',student_status:'ACTIVE',enrollment_status:'ACTIVE',eligibility_status:'ELIGIBLE',eligibility_revision:1,entry_status:'PENDING'},{student_id:2,first_names:'Luis',last_names:'Prueba QA',sis_code:'000102',identity_number:'CI-2',student_status:'ACTIVE',enrollment_status:'ACTIVE',eligibility_status:'ELIGIBLE',eligibility_revision:1,entry_status:'PENDING'}]});
const stored=(examId)=>({key:'7:'+examId+':pkg',ownerId:7,examId,savedAt:'2026-11-10T10:05:00-04:00',staleReason:null,packet:packet(examId)});
const owner={id:7,status:'ACTIVE',must_change_password:false,display_name:'Responsable QA'};
const qa=window.offQa={ready:false,packages:[],user:owner,owner,stored,reads:[],calls:[],unexpected:[],notices:[],refreshes:0,hold:{},fail:{}};
qa.reset=()=>{qa.packages=[];qa.user=owner;qa.reads=[];qa.calls=[];qa.unexpected=[];qa.notices=[];qa.refreshes=0;qa.hold={};qa.fail={}};
qa.holdOn=(kind)=>{let release;const gate=new Promise(done=>{release=done});qa.hold[kind]={gate,release}};
qa.release=(kind)=>{qa.hold[kind]?.release();delete qa.hold[kind]};
qa.identity=(on)=>{if(on)sessionStorage.setItem('eida.offline.identity.v1',JSON.stringify({ownerId:7,displayName:'Responsable QA',verifiedAt:Date.now()-1000,contextId:'qa-context'}));else sessionStorage.removeItem('eida.offline.identity.v1')};
`
const doubles = {
  '/src/features/offline-entry/storage/offlineStore.ts': `
const qa=()=>window.offQa;
const read=async(kind,value)=>{const q=qa();q.reads.push(kind);if(q.hold[kind])await q.hold[kind].gate;if(q.fail[kind])throw new Error(q.fail[kind]);return value()};
export const readOwnedOfflinePackages=(ownerId)=>read('home',()=>qa().packages.filter(p=>p.ownerId===ownerId));
export const readOfflineData=(ownerId,examId)=>read('entry',()=>({packages:qa().packages.filter(p=>p.ownerId===ownerId&&p.examId===examId),entries:[]}));
const write=(name)=>async()=>{qa().unexpected.push('store '+name);throw new Error('QA: escritura no simulada: '+name)};
export const saveOfflinePackage=write('saveOfflinePackage');
export const captureOfflineEntry=write('captureOfflineEntry');
export const saveSyncResults=write('saveSyncResults');
export const markOfflinePackagesStale=async()=>{};
export const deleteOfflineExam=write('deleteOfflineExam');
export const acquireSyncLease=write('acquireSyncLease');
export const releaseSyncLease=async()=>{};`,
  '/src/features/offline-entry/services/offlinePwa.ts':
    `export const registerOfflineWorker=async()=>{throw new Error('QA: sin service worker')};export const verifyOfflineShell=async()=>({ready:true,message:'Aplicación disponible sin conexión (doble QA).'});`,
  '/src/shared/api/httpClient.ts': `
const qa=()=>window.offQa;
const fail=(status,data={})=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data}});
const refuse=(method)=>async(url)=>{qa().unexpected.push(method+' '+url);throw fail(501)};
export const httpClient={get:async(url)=>{const q=qa();q.calls.push({method:'get',url});if(!/^\\/exams\\/\\d+\\/offline\\/package$/.test(url)){q.unexpected.push('get '+url);throw fail(404)}if(q.hold.download)await q.hold.download.gate;throw fail(500)},post:refuse('post'),put:refuse('put'),patch:refuse('patch'),delete:refuse('delete')};`,
  '/src/features/auth/hooks/useAuth.ts':
    `const notify=(type,message)=>{window.offQa.notices.push([type,message])};const clearSession=()=>{};const refreshUser=async()=>{window.offQa.refreshes++};export const useAuth=()=>({user:window.offQa.user,isLoading:false,notify,clearSession,refreshUser});`,
  '/src/app/config/env.ts':
    `export const env=Object.freeze({backendUrl:'http://qa.invalid',apiUrl:'http://qa.invalid/api/v1',useStudentsMock:false,useAuthMock:false,institutionalEmailDomains:['example.edu']});`,
}

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('offline-pages')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'offline-pages-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__offline-pages-qa.js') return '\0offline-pages-qa' },
      load(id) {
        if (id === '\0offline-pages-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        for (const [suffix, code] of Object.entries(doubles)) if (normalized.endsWith(suffix)) return code
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__offline-pages-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__offline-pages-qa',
            `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script>${bootstrap}</script><script type="module" src="/__offline-pages-qa.js"></script></html>`))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__offline-pages-qa')).status, 200)
  console.log(`QA: servidor local listo; iniciando Chrome sin ventana (${baseline ? 'línea base' : 'contrato G6'})`)
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
  const errors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '))
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
  const pass = (label) => { passed.push(label); console.log('PASS ' + label) }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__offline-pages-qa' })
  // Start-up only: a cold Vite compiles the whole page graph on the first navigation.
  for (let index = 0; index < 600 && !(await evaluate('window.offQa?.ready===true')); index++) await pause(100)
  assert.ok(await evaluate('window.offQa?.ready===true'), 'arranque')
  await evaluate(`window.qaText=(el)=>(el.getAttribute('aria-label')||el.textContent).replace(/\\s+/g,' ').trim();
    window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>qaText(b)===text);
    window.qaTab=(label)=>[...document.querySelectorAll('nav[aria-label="Herramientas del control sin conexión"] a')].find(a=>a.textContent.includes(label));
    window.qaH1=()=>[...document.querySelectorAll('h1')].map(h=>h.textContent.replace(/\\s+/g,' ').trim());
    window.qaAlerts=()=>[...document.querySelectorAll('main [role=alert]')].map(a=>a.textContent.replace(/\\s+/g,' ').trim());
    window.qaStatus=()=>[...document.querySelectorAll('main [role=status]')].map(a=>a.textContent.replace(/\\s+/g,' ').trim());
    window.qaCrumbs=()=>[...document.querySelectorAll('main nav[aria-label] li, main nav[aria-label] a')].length?[...document.querySelectorAll('main nav')].filter(n=>n.getAttribute('aria-label')!=='Herramientas del control sin conexión').flatMap(n=>[...n.querySelectorAll('li')].map(li=>li.textContent.replace(/[\\/›>]/g,'').replace(/\\s+/g,' ').trim())):[];
    // Layout facts used for the before/after comparison.
    window.qaLayout=()=>{const main=document.querySelector('main'),h=document.querySelector('main h1'),s=h?getComputedStyle(h):null,section=h?.id?document.querySelector('main > [aria-labelledby="'+h.id+'"]'):null,box=(section??main).getBoundingClientRect(),cs=getComputedStyle(section??main),footer=document.querySelector('footer')?.getBoundingClientRect();
      return {mains:document.querySelectorAll('main').length,h1:qaH1(),h1Size:s?.fontSize??null,h1Weight:s?.fontWeight??null,h1Color:s?.color??null,contentWidth:Math.round(box.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)),contentLeft:Math.round(box.left+parseFloat(cs.paddingLeft)),paddingTop:cs.paddingTop,container:!!section,overflow:document.documentElement.scrollWidth>innerWidth+1,footerAtBottom:!!footer&&footer.bottom>=innerHeight-1,mainFills:Math.round(main.getBoundingClientRect().width)===document.documentElement.clientWidth||Math.round(main.getBoundingClientRect().width)<=1300}};true`)
  const click = (text, scope = 'document') => evaluate(`(()=>{const b=qaBtn(${JSON.stringify(text)},${scope});if(!b)throw new Error('no existe: '+${JSON.stringify(text)});b.focus();b.click();return true})()`)
  const tab = (label) => evaluate(`(()=>{const a=qaTab(${JSON.stringify(label)});if(!a)throw new Error('sin pestaña '+${JSON.stringify(label)});a.click();return true})()`)
  const shot = async (name) => {
    const image = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, name), Buffer.from(image.data, 'base64'))
  }
  // setup: a JS statement run after qa.reset() and before the page is shown.
  const show = async (path, setup = '', identity = true) => {
    await evaluate(`offQa.reset();offQa.identity(${identity});${setup};offQa.show(${JSON.stringify(path)});true`)
    await wait(`document.querySelectorAll('main').length===1`, `página ${path}`)
  }
  const withList = 'offQa.packages=[offQa.stored(5)]'
  const HOME = 'Mis listas locales', PREPARE = 'Preparación del control sin conexión', CONTROL = 'Control de ingreso sin conexión', SYNC = 'Sincronización de ingresos'
  const INVALID = 'El identificador del examen no es válido.'
  const metrics = {}

  // 1. Layout of every screen at five widths (evidence and before/after facts).
  const screens = [
    { name: 'inicio-lista', path: '/offline', setup: withList, h1: [HOME], ready: `!!qaBtn('Abrir control local')`, shot: true },
    { name: 'inicio-vacio', path: '/offline', setup: '', h1: [HOME], ready: `document.body.innerText.includes('Aún no descargaste una lista')` },
    { name: 'control-preparacion', path: '/exams/5/offline', setup: withList, h1: [PREPARE], ready: `document.body.innerText.includes('Descargar una copia actualizada')`, shot: true },
    { name: 'control-sin-lista', path: '/exams/5/offline?view=control', setup: '', h1: [CONTROL], ready: `document.body.innerText.includes('Primero descarga tu lista')` },
    { name: 'control-id-no-valido', path: '/exams/abc/offline', setup: '', h1: baseline ? [] : [CONTROL], ready: `qaAlerts().includes(${JSON.stringify(INVALID)})`, shot: true },
    { name: 'bloqueo', path: '/offline', setup: '', identity: false, h1: ['Verifica tu cuenta para acceder'], ready: `!!qaBtn('Iniciar sesión')`, gate: true },
  ]
  for (const width of [320, 375, 640, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    for (const screen of screens) {
      await show(screen.path, screen.setup, screen.identity !== false)
      await wait(screen.ready, `${width}px ${screen.name}`)
      const layout = await evaluate('qaLayout()')
      metrics[`${screen.name}@${width}`] = layout
      const label = `${width}px ${screen.name}`
      assert.equal(layout.mains, 1, `${label}: un único main`)
      assert.deepEqual(layout.h1, screen.h1, `${label}: h1`)
      assert.equal(layout.overflow, false, `${label}: desbordamiento horizontal`)
      assert.equal(layout.footerAtBottom, true, `${label}: el pie queda al final de la ventana o por debajo`)
      if (!baseline && !screen.gate) {
        // G6 contract: PageContainer (labelled section, 1280px) and PageHeader (h1 32/24px, 700).
        assert.equal(layout.container, true, `${label}: sección etiquetada por el h1`)
        assert.equal(layout.h1Size, width <= 640 ? '24px' : '32px', `${label}: tamaño del h1`)
        assert.equal(layout.h1Weight, '700', `${label}: peso del h1`)
        assert.ok(layout.contentWidth <= 1280 && (width < 1440 || layout.contentWidth >= 1200), `${label}: ancho de contenido ${layout.contentWidth}`)
      }
      if (screen.shot) await shot(`${screen.name}-${width}.png`)
    }
    pass(`${width}px: seis pantallas con un main, su h1, sin desbordamiento y con el pie al final`)
  }
  await writeFile(join(evidence, 'metrics.json'), JSON.stringify(metrics, null, 2))

  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })

  // 2. Mis listas locales: loading, error and retry, empty state and the list.
  await show('/offline', `offQa.holdOn('home')`)
  await wait(`qaStatus().includes('Abriendo listas locales…')`, 'inicio: carga')
  assert.deepEqual(await evaluate('qaH1()'), [HOME], 'el título no depende de la carga')
  await evaluate(`offQa.fail.home='Fallo QA de almacenamiento';offQa.release('home');true`)
  await wait(`qaAlerts().length===1`, 'inicio: error')
  assert.deepEqual(await evaluate(`({alerts:qaAlerts(),retry:!!qaBtn('Reintentar'),empty:document.body.innerText.includes('Aún no descargaste una lista')})`),
    { alerts: ['Fallo QA de almacenamientoReintentar'], retry: true, empty: false })
  await evaluate(`delete offQa.fail.home;true`)
  await click('Reintentar')
  await wait(`document.body.innerText.includes('Aún no descargaste una lista')&&qaAlerts().length===0`, 'inicio: vacío tras reintentar')
  assert.deepEqual(await evaluate(`({h2:[...document.querySelectorAll('main h2')].map(h=>h.textContent.trim()),link:qaBtn('Ver mis colaboraciones').getAttribute('href'),reads:offQa.reads})`),
    { h2: ['Aún no descargaste una lista'], link: '/collaborator', reads: ['home', 'home'] })
  await show('/offline', withList)
  await wait(`!!qaBtn('Abrir control local')`, 'inicio: lista')
  const card = await evaluate(`(()=>{const a=document.querySelector('main article');return {title:a.querySelector('h2').textContent.trim(),text:a.textContent.replace(/\\s+/g,' ').includes('Lista 2 · v1 · 2 estudiantes'),href:qaBtn('Abrir control local',a).getAttribute('href'),intro:document.querySelector('main').textContent.includes('Paquetes descargados por Responsable QA.'),notice:document.querySelector('main').textContent.includes('Prepara y usa este espacio en la misma pestaña.')}})()`)
  assert.deepEqual(card, { title: 'Parcial QA de programación con un nombre extenso', text: true, href: '/exams/5/offline', intro: true, notice: true })
  await click('Abrir control local')
  await wait(`qaH1()[0]===${JSON.stringify(PREPARE)}`, 'navegación de la tarjeta al control local')
  pass('inicio: carga, error con reintento, vacío con enlace, tarjeta de lista y navegación al control')

  // 3. Control sin conexión: breadcrumbs, header, online link, tabs and the empty control state.
  const head = await evaluate(`(()=>{const main=document.querySelector('main');const crumbs=[...main.querySelectorAll('nav')].find(n=>n.getAttribute('aria-label')!=='Herramientas del control sin conexión');
    const link=qaBtn('Abrir control online',main);return {crumbs:[...crumbs.querySelectorAll('a')].map(a=>[a.textContent.trim(),a.getAttribute('href')]),current:crumbs.textContent.includes('Control sin conexión'),online:link?.getAttribute('href'),subtitle:main.textContent.includes('Parcial QA de programación con un nombre extenso · Responsable QA'),eyebrow:main.textContent.includes('EIDA · Lista exclusiva'),tabs:[...document.querySelectorAll('nav[aria-label="Herramientas del control sin conexión"] a')].map(a=>[a.textContent.replace(/\\s+/g,' ').trim(),a.getAttribute('aria-current')])}})()`)
  assert.deepEqual(head, { crumbs: [['Mis listas locales', '/offline']], current: true, online: '/exams/5/entry-control', subtitle: true, eyebrow: true,
    tabs: [['01Preparación', 'page'], ['02Control local', null], ['03Sincronización', null]] })
  await tab('Sincronización')
  await wait(`qaH1()[0]===${JSON.stringify(SYNC)}`, 'pestaña de sincronización')
  assert.deepEqual(await evaluate(`[qaTab('Sincronización').getAttribute('aria-current'),qaTab('Preparación').getAttribute('aria-current'),document.querySelectorAll('h1').length]`), ['page', null, 1])
  await tab('Preparación')
  await wait(`qaH1()[0]===${JSON.stringify(PREPARE)}`, 'vuelta a preparación')
  await show('/exams/5/offline?view=control')
  await wait(`document.body.innerText.includes('Primero descarga tu lista')`, 'control sin lista')
  assert.deepEqual(await evaluate(`({h1:qaH1(),current:qaTab('Control local').getAttribute('aria-current'),link:qaBtn('Ir a preparación').getAttribute('href')})`), { h1: [CONTROL], current: 'page', link: '/exams/5/offline?view=prepare' })
  await click('Ir a preparación')
  await wait(`qaH1()[0]===${JSON.stringify(PREPARE)}`, 'enlace a preparación')
  await evaluate(`qaBtn('Mis listas locales',document.querySelector('main')).click();true`)
  await wait(`qaH1()[0]===${JSON.stringify(HOME)}`, 'la miga vuelve a Mis listas locales')
  pass('control: migas, antetítulo, subtítulo, enlace online, tres pestañas con aria-current y estado sin lista')

  // 4. Control sin conexión: storage loading and error, unverified session and invalid id.
  await show('/exams/5/offline', `offQa.holdOn('entry')`)
  await wait(`qaStatus().includes('Abriendo almacenamiento de esta cuenta…')`, 'control: carga')
  await evaluate(`offQa.fail.entry='Fallo QA de almacenamiento';offQa.release('entry');true`)
  await wait(`qaAlerts().some(a=>a.startsWith('Fallo QA de almacenamiento'))`, 'control: error de almacenamiento')
  assert.equal(await evaluate(`!!qaBtn('Reintentar almacenamiento')`), true)
  await evaluate(`delete offQa.fail.entry;true`)
  await click('Reintentar almacenamiento')
  await wait(`!qaAlerts().some(a=>a.startsWith('Fallo QA de almacenamiento'))&&document.body.innerText.includes('Descargar lista para uso sin conexión')`, 'control: recuperado tras reintentar')
  await show('/exams/5/offline', `${withList};offQa.user=null`)
  await wait(`!!qaBtn('Verificar sesión con el servidor')`, 'control: sesión sin verificar')
  assert.deepEqual(await evaluate(`({online:!!qaBtn('Abrir control online'),notice:document.querySelector('main').textContent.includes('Los datos locales están disponibles.')})`), { online: false, notice: true })
  await click('Verificar sesión con el servidor')
  await wait(`offQa.refreshes===1`, 'verificación de sesión solicitada')
  await show('/exams/abc/offline')
  await wait(`qaAlerts().includes(${JSON.stringify(INVALID)})`, 'control: id no válido')
  assert.deepEqual(await evaluate(`({mains:document.querySelectorAll('main').length,h1:qaH1(),tabs:document.querySelectorAll('nav[aria-label="Herramientas del control sin conexión"]').length,reads:offQa.reads})`),
    { mains: 1, h1: baseline ? [] : [CONTROL], tabs: 0, reads: [] })
  pass('control: carga y error de almacenamiento con reintento, sesión sin verificar e identificador no válido')

  // 5. Tabs stay locked while the preparation is busy and work again afterwards.
  await show('/exams/5/offline', `offQa.holdOn('download')`)
  await wait(`!!qaBtn('Descargar lista para uso sin conexión')&&!qaBtn('Descargar lista para uso sin conexión').disabled`, 'descarga disponible')
  await click('Descargar lista para uso sin conexión')
  await wait(`!!qaBtn('Descargando…')`, 'preparación en curso')
  await tab('Control local')
  await tab('Sincronización')
  await pause(200)
  assert.deepEqual(await evaluate(`({h1:qaH1(),current:qaTab('Preparación').getAttribute('aria-current'),search:offQa.router.state.location.search})`), { h1: [PREPARE], current: 'page', search: '' }, 'las pestañas no cambian durante la preparación')
  await evaluate(`offQa.release('download');true`)
  await wait(`qaAlerts().length>0&&!!qaBtn('Descargar lista para uso sin conexión')`, 'la descarga simulada falla y libera el bloqueo')
  await tab('Control local')
  await wait(`qaH1()[0]===${JSON.stringify(CONTROL)}`, 'las pestañas vuelven a funcionar')
  assert.deepEqual(await evaluate(`offQa.calls`), [{ method: 'get', url: '/exams/5/offline/package' }])
  pass('control: pestañas bloqueadas durante la preparación y operativas al terminar')

  assert.deepEqual(await evaluate('offQa.unexpected'), [])
  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ mode: baseline ? 'baseline' : 'g6', passed }, null, 2))
  // Before/after facts (only when both runs exist).
  if (!baseline) {
    try {
      const before = JSON.parse(await readFile(join(root, 'before', 'metrics.json'), 'utf8'))
      const changes = []
      for (const [key, after] of Object.entries(metrics)) for (const field of Object.keys(after)) {
        const a = JSON.stringify(before[key]?.[field]), b = JSON.stringify(after[field])
        if (a !== b) changes.push(`${key} ${field}: ${a} -> ${b}`)
      }
      await writeFile(join(root, 'comparison.txt'), changes.join('\n'))
      console.log(`Comparación con la línea base: ${changes.length} diferencias · ${join(root, 'comparison.txt')}`)
    } catch { console.log('Comparación con la línea base: sin línea base registrada') }
  }
  console.log(`QA páginas offline (${baseline ? 'línea base' : 'G6'}): PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
