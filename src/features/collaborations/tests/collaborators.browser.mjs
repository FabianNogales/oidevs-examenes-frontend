// Browser QA for the collaborator dialogs (G5.1): the real ExamCollaboratorsPage with a data router
// and a stateful simulated httpClient (no backend). Covers «Detalle del colaborador», «Revocar
// autorización» and «Asignar colaborador» on PortalDialog: opening, initial focus, Escape, backdrop
// press, Tab containment, focus return, busy protection, search, pagination, selection, assignment,
// the inline revoke error and layout at 320/375/640/768/1440px.
// Selectors use roles, text and accessible names only (no classes).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.COLLABORATORS_QA_OUTPUT ?? 'collaborator-dialogs')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter, RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {ExamCollaboratorsPage} from '/src/features/collaborations/pages/ExamCollaboratorsPage.tsx';
import {CollaborationsProvider} from '/src/features/collaborations/components/CollaborationsProvider.tsx';
const e=React.createElement;
const qa=window.collabQa={calls:[],unexpected:[],notices:[],collaborators:[],hold:null,failNext:null};
const exam={id:5,name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',subject_code:'QA-111',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,status:'SCHEDULED',course_offering_id:7,rules:'Sin material de consulta.',updated_at:'2026-11-08T10:00:00-04:00',can_edit:true,can_cancel:true,academic_term_name:'Periodo QA 2026',evaluation_type:'partial',room:{id:1,code:'QA-101',name:'Aula QA 101'}};
const seed=()=>[{id:1,user_id:21,display_name:'Colaborador QA con nombre extenso',email:'colaborador.qa.con.un.correo.muy.largo@example.edu',identity_number:'QA-21',profile_photo_url:null,assigned_at:'2026-11-08T10:00:00-04:00',assigned_by:1,assigned_by_name:'Docente QA'}];
// 12 candidates: two pages of 10. User 21 is already assigned (its radio must stay disabled).
const users=Array.from({length:12},(_,i)=>({id:21+i,display_name:'Persona QA '+(21+i),identity_number:'CI-'+(21+i),email:'persona.qa.'+(21+i)+'@example.edu',roles:['DOCENTE']}));
qa.reset=()=>{qa.collaborators=seed();qa.calls=[];qa.unexpected=[];qa.notices=[];qa.hold=null;qa.failNext=null};
qa.reset();
// qa.holdNext() keeps the next write pending until qa.release() (busy state).
qa.holdNext=()=>{let release;const gate=new Promise(done=>{release=done});qa.hold={gate,release}};
qa.release=()=>{qa.hold?.release();qa.hold=null};
const fail=(status,data={})=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data}});
const write=async()=>{if(qa.hold)await qa.hold.gate;if(qa.failNext){const f=qa.failNext;qa.failNext=null;throw fail(f.status,f.data)}};
qa.client={
  get:async(url,config={})=>{qa.calls.push({method:'get',url,params:config.params});
    if(url==='/teacher/exams/5')return {data:{data:exam}};
    if(url==='/exams/5/collaborators')return {data:{data:qa.collaborators.map(c=>({...c}))}};
    if(url==='/me/collaborations')return {data:{data:[]}};
    if(url==='/users'){const p=config.params??{};const page=p.page??1,per=p.per_page??10;const found=users.filter(u=>u.display_name.toLowerCase().includes(String(p.search).toLowerCase()));return {data:{data:found.slice((page-1)*per,page*per),meta:{current_page:page,last_page:Math.max(1,Math.ceil(found.length/per)),per_page:per,total:found.length}}}}
    qa.unexpected.push('get '+url);throw fail(404)},
  post:async(url,payload)=>{qa.calls.push({method:'post',url,payload});if(url!=='/exams/5/collaborators'){qa.unexpected.push('post '+url);throw fail(501)}await write();const u=users.find(u=>u.id===payload.user_id);qa.collaborators.push({id:qa.collaborators.length+1,user_id:u.id,display_name:u.display_name,email:u.email,identity_number:u.identity_number,profile_photo_url:null,assigned_at:'2026-11-10T10:00:00-04:00',assigned_by:1,assigned_by_name:'Docente QA'});return {data:{}}},
  delete:async(url)=>{qa.calls.push({method:'delete',url});const c=qa.collaborators.find(c=>url==='/exams/5/collaborators/'+c.user_id);if(!c){qa.unexpected.push('delete '+url);throw fail(404)}await write();qa.collaborators=qa.collaborators.filter(x=>x!==c);return {data:{}}},
  patch:async(url)=>{qa.unexpected.push('patch '+url);throw fail(501)},
  put:async(url)=>{qa.unexpected.push('put '+url);throw fail(501)},
};
const routes=[{path:'/teacher/exams/:examId/collaborators',element:e(CollaborationsProvider,null,e(ExamCollaboratorsPage))},{path:'*',element:e('main',null,e('h1',null,'Otra ruta QA'))}];
const root=createRoot(document.getElementById('root'));
qa.show=()=>root.render(e(RouterProvider,{key:Math.random(),router:createMemoryRouter(routes,{initialEntries:['/teacher/exams/5/collaborators']})}));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('collaborator-dialogs')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'collaborator-dialogs-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__collaborators-qa.js') return '\0collaborator-dialogs-qa' },
      load(id) {
        if (id === '\0collaborator-dialogs-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.collabQa.client.get(...a),post:(...a)=>window.collabQa.client.post(...a),put:(...a)=>window.collabQa.client.put(...a),patch:(...a)=>window.collabQa.client.patch(...a),delete:(...a)=>window.collabQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
          return 'const notify=(type,message)=>{window.collabQa.notices.push(message)};export const useAuth=()=>({notify,user:undefined});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__collaborators-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__collaborators-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__collaborators-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__collaborators-qa')).status, 200)
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
  await send('Page.navigate', { url: origin + '/__collaborators-qa' })
  // Start-up only: a cold Vite compiles the whole page graph on the first navigation.
  for (let index = 0; index < 600 && !(await evaluate('!!window.collabQa?.show')); index++) await pause(100)
  assert.ok(await evaluate('!!window.collabQa?.show'), 'arranque')
  await evaluate(`window.qaText=(el)=>(el.getAttribute('aria-label')||el.textContent).replace(/\\s+/g,' ').trim();
    window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>qaText(b)===text);
    window.qaFill=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))};
    window.qaDialog=()=>document.querySelector('dialog[open]');
    window.qaTitle=()=>{const d=qaDialog();return d?document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim():null};
    window.qaFocus=()=>document.activeElement?qaText(document.activeElement):null;
    window.qaRadios=()=>[...qaDialog().querySelectorAll('input[type=radio]')];
    window.qaCalls=(method)=>collabQa.calls.filter(c=>c.method===method);true`)
  const click = (text, scope = 'document') => evaluate(`(()=>{const b=qaBtn(${JSON.stringify(text)},${scope});if(!b)throw new Error('no existe: '+${JSON.stringify(text)});b.focus();b.click();return true})()`)
  const key = async (name, code, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, modifiers })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, modifiers })
    await pause(120)
  }
  const escape = () => key('Escape', 27)
  const pressBackdrop = async () => {
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, x: 3, y: 3, button: 'left', clickCount: 1 })
    await pause(120)
  }
  const NAME = 'Colaborador QA con nombre extenso'
  const VIEW = `Ver a ${NAME}`
  const REVOKE = `Revocar autorización de ${NAME}`
  const ASSIGN = '+ Asignar colaborador'
  const show = async () => {
    await evaluate(`collabQa.reset();collabQa.show()`)
    await wait(`!!qaBtn(${JSON.stringify(VIEW)})&&!!qaBtn(${JSON.stringify(ASSIGN)})`, 'listado de colaboradores')
  }
  const open = async (trigger, title) => {
    await click(trigger)
    await wait(`qaTitle()===${JSON.stringify(title)}`, `${title} abierto`)
  }
  const closed = (label) => wait('!qaDialog()', label)
  const search = async (query) => {
    await evaluate(`qaFill(qaDialog().querySelector('input[type=search]'),${JSON.stringify(query)});true`)
    await click('Buscar', 'qaDialog()')
    await wait(`qaRadios().length>0`, 'candidatos cargados')
  }
  const box = `(()=>{const d=qaDialog(),r=d.getBoundingClientRect();return {inside:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,width:Math.round(r.width),scroll:d.scrollWidth<=d.clientWidth+1,modal:d.matches(':modal')}})()`
  const visible = (labels) => `(()=>{const d=qaDialog(),b=d.getBoundingClientRect();return ${JSON.stringify(labels)}.map(t=>{const el=qaBtn(t,d);const r=el?.getBoundingClientRect();return !!el&&r.width>0&&r.left>=b.left-1&&r.right<=b.right+1})})()`
  const shot = async (name) => {
    const image = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, name), Buffer.from(image.data, 'base64'))
  }
  // Tab and Shift+Tab never reach the page behind; returns the accessible names reached.
  const tabAround = async (label, steps) => {
    const seen = new Set([await evaluate('qaFocus()')])
    for (const modifiers of [0, 8]) {
      for (let index = 0; index < steps; index++) {
        await key('Tab', 9, modifiers)
        const focus = await evaluate(`(()=>{const a=document.activeElement,d=qaDialog();const inside=d.contains(a);return {inside,page:!inside&&a!==document.body&&a!==document.documentElement,name:inside?qaText(a):null}})()`)
        assert.equal(focus.page, false, `${label}: el foco salió a la página`)
        if (focus.inside) seen.add(focus.name)
      }
    }
    return seen
  }

  // 1. Layout of the page and the three dialogs at five widths (also the visual evidence).
  for (const width of [320, 375, 640, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await show()
    const page = await evaluate(`({scroll:document.documentElement.scrollWidth,vw:innerWidth})`)
    assert.ok(page.scroll <= page.vw + 1, `${width}px desbordamiento de la página ${page.scroll}`)
    const small = Math.min(560, width - 32)
    await open(VIEW, 'Detalle del colaborador')
    assert.deepEqual(await evaluate(box), { inside: true, width: small, scroll: true, modal: true }, `${width}px detalle`)
    assert.deepEqual(await evaluate(visible(['Cerrar', 'Cerrar ventana'])), [true, true], `${width}px acciones del detalle`)
    await shot(`detalle-${width}.png`)
    await escape()
    await closed('detalle cerrado')
    await open(REVOKE, 'Revocar autorización')
    assert.deepEqual(await evaluate(box), { inside: true, width: small, scroll: true, modal: true }, `${width}px revocar`)
    assert.deepEqual(await evaluate(visible(['Cancelar', 'Revocar', 'Cerrar ventana'])), [true, true, true], `${width}px acciones de revocar`)
    await shot(`revocar-${width}.png`)
    await escape()
    await closed('revocar cerrado')
    await open(ASSIGN, 'Asignar colaborador')
    await search('Persona')
    assert.deepEqual(await evaluate(box), { inside: true, width: width <= 640 ? width - 24 : Math.min(760, width - 32), scroll: true, modal: true }, `${width}px asignar`)
    assert.deepEqual(await evaluate(visible(['Buscar', 'Anterior', 'Siguiente', 'Cancelar', 'Confirmar asignación', 'Cerrar ventana'])), [true, true, true, true, true, true], `${width}px acciones de asignar`)
    const list = await evaluate(`(()=>{const d=qaDialog(),r=d.querySelector('[aria-label="Usuarios elegibles"]').parentElement;return {scrolls:r.scrollHeight>r.clientHeight+1,height:r.clientHeight,horizontal:r.scrollWidth<=r.clientWidth+1}})()`)
    assert.ok(list.scrolls && list.height <= 400 && list.height >= 64, `${width}px la lista de resultados tiene scroll interno: ${JSON.stringify(list)}`)
    assert.ok(list.horizontal, `${width}px resultados sin desbordamiento horizontal`)
    await shot(`asignar-${width}.png`)
    await escape()
    await closed('asignar cerrado')
    pass(`${width}px: página sin desbordamiento; los tres diálogos dentro de la ventana con su ancho previo`)
  }
  // Short viewport: the results list gives up height and the dialog still fits.
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 560, deviceScaleFactor: 1, mobile: false })
  await show()
  await open(ASSIGN, 'Asignar colaborador')
  await search('Persona')
  const short = await evaluate(`(()=>{const d=qaDialog(),r=d.getBoundingClientRect();return {inside:r.top>=-1&&r.bottom<=innerHeight+1,max:r.height<=innerHeight*0.88+1}})()`)
  assert.deepEqual(short, { inside: true, max: true }, 'asignar en 560px de alto')
  await evaluate(`qaBtn('Confirmar asignación',qaDialog()).scrollIntoView();true`)
  assert.ok(await evaluate(`(()=>{const r=qaBtn('Confirmar asignación',qaDialog()).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`), 'las acciones siguen alcanzables con poca altura')
  await escape()
  await closed('asignar cerrado (alto reducido)')
  pass('asignar: en 768×560 el diálogo respeta el 88% de alto y sus acciones son alcanzables')

  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })

  // 2. Detalle del colaborador: semantics, focus, Escape, ×, Cerrar, backdrop and Tab containment.
  await show()
  await open(VIEW, 'Detalle del colaborador')
  const detail = await evaluate(`(()=>{const d=qaDialog();const t=document.getElementById(d.getAttribute('aria-labelledby'));return {modal:d.matches(':modal'),tag:t.tagName,focus:qaFocus(),name:d.querySelector('dd').textContent.trim(),locked:getComputedStyle(document.body).overflow}})()`)
  assert.deepEqual(detail, { modal: true, tag: 'H2', focus: 'Cerrar ventana', name: NAME, locked: 'hidden' })
  assert.deepEqual([...await tabAround('detalle', 4)].sort(), ['Cerrar', 'Cerrar ventana'])
  await escape()
  await closed('Escape cierra el detalle')
  assert.equal(await evaluate('qaFocus()'), VIEW, 'Escape devuelve el foco a «Ver»')
  for (const [label, action] of [['×', () => click('Cerrar ventana', 'qaDialog()')], ['Cerrar', () => click('Cerrar', 'qaDialog()')], ['fondo', pressBackdrop]]) {
    await open(VIEW, 'Detalle del colaborador')
    await action()
    await closed(`${label} cierra el detalle`)
    assert.equal(await evaluate('qaFocus()'), VIEW, `${label} devuelve el foco`)
  }
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow==='hidden'`), false, 'scroll de la página restaurado')
  pass('detalle: <dialog> modal con h2, foco en ×, Tab contenido, Escape/×/Cerrar/fondo y retorno del foco')

  // 3. Revocar: highlighted name, cancel paths, busy protection, inline error and a valid revoke.
  await open(REVOKE, 'Revocar autorización')
  assert.equal(await evaluate(`qaDialog().querySelector('p strong')?.textContent.trim()`), NAME, 'nombre destacado en la confirmación')
  assert.ok(await evaluate('qaDialog().contains(document.activeElement)'), 'foco inicial dentro del diálogo')
  assert.deepEqual([...await tabAround('revocar', 5)].sort(), ['Cancelar', 'Cerrar ventana', 'Revocar'])
  for (const [label, action] of [['Escape', escape], ['Cancelar', () => click('Cancelar', 'qaDialog()')], ['fondo', pressBackdrop]]) {
    if (!(await evaluate('!!qaDialog()'))) await open(REVOKE, 'Revocar autorización')
    await action()
    await closed(`${label} cierra revocar`)
    assert.equal(await evaluate('qaFocus()'), REVOKE, `${label} devuelve el foco`)
  }
  assert.equal(await evaluate(`qaCalls('delete').length`), 0, 'cancelar no escribe')
  await open(REVOKE, 'Revocar autorización')
  await evaluate(`collabQa.holdNext();collabQa.failNext={status:500,data:{}};true`)
  await click('Revocar', 'qaDialog()')
  await wait(`!!qaBtn('Revocando…',qaDialog())`, 'revocación en curso')
  assert.deepEqual(await evaluate(`({busy:qaDialog().getAttribute('aria-busy'),close:qaBtn('Cerrar ventana',qaDialog()).disabled,cancel:qaBtn('Cancelar',qaDialog()).disabled})`), { busy: 'true', close: true, cancel: true })
  await escape()
  await pressBackdrop()
  assert.equal(await evaluate('qaTitle()'), 'Revocar autorización', 'Escape y el fondo no cierran mientras se revoca')
  await evaluate('collabQa.release();true')
  await wait(`!!qaDialog()?.querySelector('[role=alert]')`, 'error en línea de la revocación')
  assert.equal(await evaluate(`qaDialog().querySelector('[role=alert]').textContent.trim()`), 'No se pudo revocar la autorización.')
  assert.deepEqual(await evaluate(`({busy:qaDialog().getAttribute('aria-busy'),revoke:qaBtn('Revocar',qaDialog()).disabled,rows:!!qaBtn(${JSON.stringify(VIEW)})})`), { busy: 'false', revoke: false, rows: true })
  await click('Revocar', 'qaDialog()')
  await closed('revocación confirmada')
  await wait(`!qaBtn(${JSON.stringify(VIEW)})`, 'fila retirada tras revocar')
  assert.deepEqual(await evaluate(`qaCalls('delete').map(c=>c.url)`), ['/exams/5/collaborators/21', '/exams/5/collaborators/21'])
  assert.deepEqual(await evaluate('collabQa.notices'), ['La autorización temporal fue revocada.'])
  pass('revocar: nombre destacado, Tab contenido, Escape/Cancelar/fondo, bloqueo al procesar, error en línea y revocación')

  // 4. Asignar: focus, close paths, search, pagination, selection, busy protection and assignment.
  await show()
  await open(ASSIGN, 'Asignar colaborador')
  assert.ok(await evaluate(`document.activeElement===qaDialog().querySelector('input[type=search]')`), 'foco inicial en el campo de búsqueda')
  assert.deepEqual(await evaluate(`({search:qaBtn('Buscar',qaDialog()).disabled,confirm:qaBtn('Confirmar asignación',qaDialog()).disabled})`), { search: true, confirm: true })
  const reached = await tabAround('asignar', 5)
  assert.ok(reached.has('Cancelar') && reached.has('Cerrar ventana'), `asignar: controles alcanzables con Tab: ${[...reached]}`)
  for (const [label, action] of [['Escape', escape], ['×', () => click('Cerrar ventana', 'qaDialog()')], ['Cancelar', () => click('Cancelar', 'qaDialog()')], ['fondo', pressBackdrop]]) {
    if (!(await evaluate('!!qaDialog()'))) await open(ASSIGN, 'Asignar colaborador')
    await action()
    await closed(`${label} cierra asignar`)
    assert.equal(await evaluate('qaFocus()'), ASSIGN, `${label} devuelve el foco`)
  }
  assert.equal(await evaluate(`qaCalls('get').filter(c=>c.url==='/users').length`), 0, 'abrir el diálogo no consulta usuarios')
  pass('asignar: foco en la búsqueda, Tab contenido, Escape/×/Cancelar/fondo y retorno del foco')

  await open(ASSIGN, 'Asignar colaborador')
  await search('  Persona ')
  assert.deepEqual(await evaluate(`qaCalls('get').filter(c=>c.url==='/users').map(c=>c.params)`), [{ search: 'Persona', exam_id: 5, page: 1, per_page: 10 }])
  const first = await evaluate(`({radios:qaRadios().length,disabled:qaRadios().filter(r=>r.disabled).map(r=>r.getAttribute('aria-label')),status:qaDialog().querySelector('nav [role=status]').textContent.trim(),prev:qaBtn('Anterior',qaDialog()).disabled,next:qaBtn('Siguiente',qaDialog()).disabled})`)
  assert.deepEqual(first, { radios: 10, disabled: ['Seleccionar a Persona QA 21'], status: '12 usuarios · Página 1 de 2', prev: true, next: false })
  await click('Siguiente', 'qaDialog()')
  await wait(`qaDialog().querySelector('nav [role=status]')?.textContent.includes('Página 2 de 2')`, 'segunda página')
  assert.deepEqual(await evaluate(`({radios:qaRadios().map(r=>r.getAttribute('aria-label')),next:qaBtn('Siguiente',qaDialog()).disabled,page:qaCalls('get').filter(c=>c.url==='/users').at(-1).params.page})`),
    { radios: ['Seleccionar a Persona QA 31', 'Seleccionar a Persona QA 32'], next: true, page: 2 })
  await evaluate(`qaRadios()[1].click();true`)
  await wait(`qaDialog().textContent.includes('Seleccionado: Persona QA 32')&&!qaBtn('Confirmar asignación',qaDialog()).disabled`, 'candidato seleccionado')
  // A rejected assignment stays in the dialog with its inline message.
  await evaluate(`collabQa.failNext={status:422,data:{message:'El usuario seleccionado no es elegible.'}};true`)
  await click('Confirmar asignación', 'qaDialog()')
  await wait(`!!qaDialog()?.querySelector('p[role=alert]')`, 'error en línea de la asignación')
  assert.equal(await evaluate(`qaDialog().querySelector('p[role=alert]').textContent.trim()`), 'El usuario seleccionado no es elegible.')
  assert.equal(await evaluate(`qaRadios().length`), 2, 'los resultados se conservan tras el error')
  await evaluate(`qaRadios()[1].click();true`)
  await wait(`!qaBtn('Confirmar asignación',qaDialog()).disabled`, 'candidato seleccionado de nuevo')
  await evaluate('collabQa.holdNext();true')
  await click('Confirmar asignación', 'qaDialog()')
  await wait(`!!qaBtn('Asignando…',qaDialog())`, 'asignación en curso')
  assert.deepEqual(await evaluate(`({busy:qaDialog().getAttribute('aria-busy'),close:qaBtn('Cerrar ventana',qaDialog()).disabled,input:qaDialog().querySelector('input[type=search]').disabled})`), { busy: 'true', close: true, input: true })
  await escape()
  await pressBackdrop()
  assert.equal(await evaluate('qaTitle()'), 'Asignar colaborador', 'Escape y el fondo no cierran mientras se asigna')
  await evaluate('collabQa.release();true')
  await closed('asignación confirmada')
  await wait(`!!qaBtn('Ver a Persona QA 32')`, 'listado recargado con el nuevo colaborador')
  assert.deepEqual(await evaluate(`qaCalls('post').map(c=>[c.url,c.payload])`), [['/exams/5/collaborators', { user_id: 32 }], ['/exams/5/collaborators', { user_id: 32 }]])
  assert.deepEqual(await evaluate('collabQa.notices'), ['La autorización temporal fue asignada.'])
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow==='hidden'`), false, 'scroll de la página restaurado')
  pass('asignar: búsqueda normalizada, paginación, ya asignado deshabilitado, selección, error en línea, bloqueo al procesar y asignación')

  assert.deepEqual(await evaluate('collabQa.unexpected'), [])
  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ passed }, null, 2))
  console.log(`QA Colaboradores: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
