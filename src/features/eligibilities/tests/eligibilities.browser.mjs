// Browser QA for the eligibility dialogs (G5.2): the real ExamEligibilitiesPage with a data router and
// a stateful simulated httpClient (no backend). Covers «Gestionar habilitación» and «Cargar
// habilitaciones» on PortalDialog: opening, initial focus, Escape, backdrop press, Tab containment,
// focus return, busy protection, validation, saving, the 422 and 409 flows, CSV selection, the 5 MB
// limit, row errors, the unknown outcome and layout at 320/375/640/768/1440px.
// Selectors use roles, text and accessible names only (no classes).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.ELIGIBILITIES_QA_OUTPUT ?? 'eligibility-dialogs')
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
import {ExamEligibilitiesPage} from '/src/features/eligibilities/pages/ExamEligibilitiesPage.tsx';
const e=React.createElement;
const qa=window.eligQa={calls:[],unexpected:[],notices:[],rows:[],hold:null,failNext:null,bulk:null};
const exam={id:5,name:'Parcial QA de programación',subject_name:'Materia QA de programación con un nombre largo',subject_code:'QA-111',exam_date:'2026-11-20',start_time:'10:00:00',duration_minutes:90,status:'SCHEDULED',course_offering_id:7,rules:'Sin material de consulta.',updated_at:'2026-11-08T10:00:00-04:00',can_edit:true,can_cancel:true,academic_term_name:'Periodo QA 2026',evaluation_type:'partial',room:{id:1,code:'QA-101',name:'Aula QA 101'}};
const row=(n,status,reason)=>({id:n,student_id:100+n,sis_code:'00010'+n,identity_number:'CI-10'+n,first_names:'Estudiante',last_names:'QA '+n+' con apellidos extensos',email:'estudiante.qa.'+n+'@example.edu',profile_photo_url:null,status,revision:1,reason_code:null,reason,observations:null,evaluated_by:null,evaluated_at:null});
qa.reset=()=>{qa.rows=[row(1,'ELIGIBLE',null),row(2,'INELIGIBLE','Motivo previo QA')];qa.calls=[];qa.unexpected=[];qa.notices=[];qa.hold=null;qa.failNext=null;qa.bulk=null};
qa.reset();
// qa.holdNext() keeps the next write pending until qa.release() (busy state).
qa.holdNext=()=>{let release;const gate=new Promise(done=>{release=done});qa.hold={gate,release}};
qa.release=()=>{qa.hold?.release();qa.hold=null};
const fail=(status,data={})=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data}});
const write=async()=>{if(qa.hold)await qa.hold.gate;if(qa.failNext){const f=qa.failNext;qa.failNext=null;throw fail(f.status,f.data)}};
qa.client={
  get:async(url)=>{qa.calls.push({method:'get',url});
    if(url==='/teacher/exams/5')return {status:200,data:{data:exam}};
    if(url==='/exams/5/eligibilities')return {status:200,data:{exam:{id:5,manual_review_conditions:null},data:qa.rows.map(r=>({...r}))}};
    if(url==='/exams/5/eligibilities/reasons')return {status:200,data:{data:[]}};
    qa.unexpected.push('get '+url);throw fail(404)},
  patch:async(url,payload)=>{qa.calls.push({method:'patch',url,payload});const r=qa.rows.find(r=>url==='/exams/5/eligibilities/'+r.student_id);if(!r){qa.unexpected.push('patch '+url);throw fail(404)}await write();Object.assign(r,{status:payload.status,reason:payload.reason??null,observations:payload.observations??null,revision:r.revision+1});return {status:200,data:{}}},
  post:async(url,payload)=>{const file=payload instanceof FormData?payload.get('file'):null;qa.calls.push({method:'post',url,file:file?{name:file.name,size:file.size}:null});if(url!=='/exams/5/eligibilities/bulk'){qa.unexpected.push('post '+url);throw fail(501)}await write();return {status:200,data:{message:'Carga procesada.',data:qa.bulk}}},
  delete:async(url)=>{qa.unexpected.push('delete '+url);throw fail(501)},
  put:async(url)=>{qa.unexpected.push('put '+url);throw fail(501)},
};
const routes=[{path:'/teacher/exams/:examId/eligibilities',element:e(ExamEligibilitiesPage)},{path:'*',element:e('main',null,e('h1',null,'Otra ruta QA'))}];
const root=createRoot(document.getElementById('root'));
qa.show=()=>root.render(e(RouterProvider,{key:Math.random(),router:createMemoryRouter(routes,{initialEntries:['/teacher/exams/5/eligibilities']})}));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('eligibility-dialogs')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'eligibility-dialogs-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__eligibilities-qa.js') return '\0eligibility-dialogs-qa' },
      load(id) {
        if (id === '\0eligibility-dialogs-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.eligQa.client.get(...a),post:(...a)=>window.eligQa.client.post(...a),put:(...a)=>window.eligQa.client.put(...a),patch:(...a)=>window.eligQa.client.patch(...a),delete:(...a)=>window.eligQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
          return 'const notify=(type,message)=>{window.eligQa.notices.push([type,message])};export const useAuth=()=>({notify,user:undefined});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__eligibilities-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__eligibilities-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__eligibilities-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__eligibilities-qa')).status, 200)
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
  await send('Page.navigate', { url: origin + '/__eligibilities-qa' })
  // Start-up only: a cold Vite compiles the whole page graph on the first navigation.
  for (let index = 0; index < 600 && !(await evaluate('!!window.eligQa?.show')); index++) await pause(100)
  assert.ok(await evaluate('!!window.eligQa?.show'), 'arranque')
  await evaluate(`window.qaText=(el)=>(el.getAttribute('aria-label')||el.textContent).replace(/\\s+/g,' ').trim();
    window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>qaText(b)===text);
    window.qaFill=(el,value)=>{Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))};
    window.qaDialog=()=>document.querySelector('dialog[open]');
    window.qaTitle=()=>{const d=qaDialog();return d?document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim():null};
    window.qaFocus=()=>document.activeElement?qaText(document.activeElement):null;
    window.qaManage=(n)=>[...document.querySelectorAll('main button')].filter(b=>(b.getAttribute('aria-label')||'').startsWith('Gestionar habilitación de '))[n];
    window.qaRadios=()=>[...qaDialog().querySelectorAll('input[type=radio]')];
    window.qaAlerts=()=>[...qaDialog().querySelectorAll('[role=alert]')].map(a=>a.textContent.replace(/\\s+/g,' ').trim());
    window.qaPick=(name,size)=>{const input=qaDialog().querySelector('input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(size)],name,{type:'text/csv'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true};
    window.qaCalls=(method)=>eligQa.calls.filter(c=>c.method===method);true`)
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
  const MANAGE = 'Gestionar habilitación', BULK = 'Cargar habilitaciones'
  const show = async () => {
    await evaluate(`eligQa.reset();eligQa.show()`)
    await wait(`!!qaManage(1)&&!!qaBtn(${JSON.stringify(BULK)})`, 'listado de habilitaciones')
  }
  const openManage = async (n = 0) => {
    await evaluate(`(()=>{const b=qaManage(${n});b.focus();b.click();return true})()`)
    await wait(`qaTitle()===${JSON.stringify(MANAGE)}`, 'gestionar abierto')
  }
  const openBulk = async () => {
    await click(BULK)
    await wait(`qaTitle()===${JSON.stringify(BULK)}`, 'carga abierta')
  }
  const closed = (label) => wait('!qaDialog()', label)
  const box = `(()=>{const d=qaDialog(),r=d.getBoundingClientRect();return {inside:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,width:Math.round(r.width),scroll:d.scrollWidth<=d.clientWidth+1,modal:d.matches(':modal')}})()`
  const visible = (labels) => `(()=>{const d=qaDialog(),b=d.getBoundingClientRect();return ${JSON.stringify(labels)}.map(t=>{const el=qaBtn(t,d);const r=el?.getBoundingClientRect();return !!el&&r.width>0&&r.left>=b.left-1&&r.right<=b.right+1})})()`
  const shot = async (name) => {
    const image = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, name), Buffer.from(image.data, 'base64'))
  }
  // Tab and Shift+Tab never reach the page behind; returns how many stops stayed inside the dialog.
  const tabAround = async (label, steps) => {
    let inside = 0
    for (const modifiers of [0, 8]) {
      for (let index = 0; index < steps; index++) {
        await key('Tab', 9, modifiers)
        const focus = await evaluate(`(()=>{const a=document.activeElement,d=qaDialog();const inside=d.contains(a);return {inside,page:!inside&&a!==document.body&&a!==document.documentElement}})()`)
        assert.equal(focus.page, false, `${label}: el foco salió a la página`)
        if (focus.inside) inside++
      }
    }
    return inside
  }
  const partial = { total_rows: 3, updated_rows: 2, failed_rows: 1, errors: [{ row: 3, sis_code: '000123', messages: { status: ['El estado indicado no es válido para esta fila del archivo.'] } }] }

  // 1. Layout of the page and both dialogs at five widths (also the visual evidence).
  for (const width of [320, 375, 640, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await show()
    const page = await evaluate(`({scroll:document.documentElement.scrollWidth,vw:innerWidth})`)
    assert.ok(page.scroll <= page.vw + 1, `${width}px desbordamiento de la página ${page.scroll}`)
    // The INELIGIBLE row shows the tallest form (reason and observations).
    await openManage(1)
    assert.deepEqual(await evaluate(box), { inside: true, width: Math.min(640, width - 32), scroll: true, modal: true }, `${width}px gestionar`)
    assert.deepEqual(await evaluate(visible(['Cancelar', 'Guardar', 'Cerrar ventana'])), [true, true, true], `${width}px acciones de gestionar`)
    assert.ok(await evaluate(`[...qaDialog().querySelectorAll('textarea')].every(t=>{const r=t.getBoundingClientRect(),b=qaDialog().getBoundingClientRect();return r.left>=b.left&&r.right<=b.right})`), `${width}px campos de texto dentro del diálogo`)
    await shot(`gestionar-${width}.png`)
    await escape()
    await closed('gestionar cerrado')
    await openBulk()
    assert.deepEqual(await evaluate(box), { inside: true, width: Math.min(720, width - 32), scroll: true, modal: true }, `${width}px carga`)
    assert.deepEqual(await evaluate(visible(['Cancelar', 'Procesar', 'Cerrar ventana'])), [true, true, true], `${width}px acciones de la carga`)
    // Result with row errors: the errors table scrolls inside its own region, never the dialog.
    await evaluate(`eligQa.bulk=${JSON.stringify(partial)};qaPick('habilitaciones.csv',64)`)
    await click('Procesar', 'qaDialog()')
    await wait(`!!qaDialog().querySelector('[aria-label="Errores por fila"]')`, 'resultado con errores')
    const result = await evaluate(box)
    assert.ok(result.inside && result.scroll, `${width}px resultado de la carga sin desbordamiento: ${JSON.stringify(result)}`)
    // The evidence shows the actions row, at the end of the scrolled dialog.
    await evaluate(`qaBtn('Volver al listado de habilitaciones',qaDialog()).scrollIntoView({block:'end'});true`)
    await shot(`carga-resultado-${width}.png`)
    assert.deepEqual(await evaluate(visible(['Cerrar', 'Procesar'])), [true, true], `${width}px acciones del resultado`)
    // «Volver al listado de habilitaciones» is wider than the dialog content on narrow screens: it
    // must stay inside the content box (padding excluded) with its text complete, wrapping only
    // when it does not fit; from 640px it keeps a single line, like «Cerrar».
    const back = await evaluate(`(()=>{const d=qaDialog(),s=getComputedStyle(d),r=d.getBoundingClientRect(),left=r.left+parseFloat(s.paddingLeft),right=r.right-parseFloat(s.paddingRight);
      const b=qaBtn('Volver al listado de habilitaciones',d),c=b.getBoundingClientRect(),other=qaBtn('Cerrar',d).getBoundingClientRect();
      return {inside:c.left>=left-0.5&&c.right<=right+0.5,complete:b.scrollWidth<=b.clientWidth&&b.scrollHeight<=b.clientHeight,singleLine:Math.abs(c.height-other.height)<=1,rect:[Math.round(c.left),Math.round(c.right),Math.round(c.height)],content:[Math.round(left),Math.round(right)]}})()`)
    assert.ok(back.inside, `${width}px «Volver al listado de habilitaciones» fuera del contenido del diálogo: ${JSON.stringify(back)}`)
    assert.ok(back.complete, `${width}px texto del botón recortado: ${JSON.stringify(back)}`)
    if (width >= 640) assert.ok(back.singleLine, `${width}px el botón debe mantener una sola línea: ${JSON.stringify(back)}`)
    await escape()
    await closed('carga cerrada')
    pass(`${width}px: página sin desbordamiento; ambos diálogos dentro de la ventana con su ancho previo`)
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })

  // 2. Gestionar: semantics, initial focus, Tab containment, close paths and focus return.
  await show()
  await openManage(0)
  const manage = await evaluate(`(()=>{const d=qaDialog();const t=document.getElementById(d.getAttribute('aria-labelledby'));const a=document.activeElement;return {modal:d.matches(':modal'),tag:t.tagName,focus:a.type==='radio'&&a.checked&&d.contains(a),checked:qaRadios().map(r=>r.checked),save:qaBtn('Guardar',d).disabled,revision:d.textContent.includes('Revisión del formulario: 1'),locked:getComputedStyle(document.body).overflow}})()`)
  assert.deepEqual(manage, { modal: true, tag: 'H2', focus: true, checked: [true, false], save: true, revision: true, locked: 'hidden' })
  assert.ok(await tabAround('gestionar', 5) >= 4, 'gestionar: Tab recorre los controles del diálogo')
  const manageTrigger = await evaluate(`qaText(qaManage(0))`)
  for (const [label, action] of [['Escape', escape], ['×', () => click('Cerrar ventana', 'qaDialog()')], ['Cancelar', () => click('Cancelar', 'qaDialog()')], ['fondo', pressBackdrop]]) {
    if (!(await evaluate('!!qaDialog()'))) await openManage(0)
    await action()
    await closed(`${label} cierra gestionar`)
    assert.equal(await evaluate('qaFocus()'), manageTrigger, `${label} devuelve el foco`)
  }
  assert.equal(await evaluate(`qaCalls('patch').length`), 0, 'cerrar no escribe')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow==='hidden'`), false, 'scroll de la página restaurado')
  pass('gestionar: <dialog> modal con h2, foco en el estado marcado, Tab contenido, Escape/×/Cancelar/fondo y retorno del foco')

  // 3. Gestionar: validation, 422, 409 with server data, busy protection and a valid save.
  await openManage(0)
  await evaluate(`qaRadios()[1].click();true`)
  await wait(`qaDialog().querySelectorAll('textarea').length===2`, 'campos de inhabilitación')
  assert.equal(await evaluate(`qaBtn('Guardar',qaDialog()).disabled`), true, 'sin motivo no se puede guardar')
  await evaluate(`qaFill(qaDialog().querySelector('textarea'),'  Motivo QA  ');true`)
  await wait(`!qaBtn('Guardar',qaDialog()).disabled&&qaDialog().textContent.includes('13 / 500')`, 'motivo escrito y contador')
  await evaluate(`eligQa.failNext={status:422,data:{message:'Los datos enviados no son válidos.',errors:{reason:['El motivo indicado no es válido.']}}};true`)
  await click('Guardar', 'qaDialog()')
  await wait(`qaAlerts().length>0`, 'error 422 en línea')
  // The field with the server error receives the real focus once the request ends.
  await wait(`document.activeElement===qaDialog().querySelector('textarea')`, 'foco en el motivo tras el 422')
  const invalid = await evaluate(`(()=>{const t=qaDialog().querySelector('textarea');return {title:qaTitle(),invalid:t.getAttribute('aria-invalid'),focus:document.activeElement===t,enabled:!t.disabled,value:t.value,alerts:qaAlerts().length,busy:qaDialog().getAttribute('aria-busy')}})()`)
  assert.deepEqual(invalid, { title: MANAGE, invalid: 'true', focus: true, enabled: true, value: '  Motivo QA  ', alerts: 2, busy: 'false' })
  assert.deepEqual(await evaluate(`qaCalls('patch')[0]`), { method: 'patch', url: '/exams/5/eligibilities/101', payload: { status: 'INELIGIBLE', reason: 'Motivo QA', observations: '', revision: 1 } })
  await evaluate(`qaFill(qaDialog().querySelector('textarea'),'Motivo QA final');true`)
  await wait(`qaAlerts().length===0`, 'errores limpiados al escribir')
  // Same for a 422 that only rejects the observations.
  await evaluate(`eligQa.failNext={status:422,data:{message:'Los datos enviados no son válidos.',errors:{observations:['Las observaciones indicadas no son válidas.']}}};true`)
  await click('Guardar', 'qaDialog()')
  await wait(`qaAlerts().length>0&&qaDialog().getAttribute('aria-busy')==='false'`, 'error 422 de observaciones')
  await wait(`document.activeElement===qaDialog().querySelectorAll('textarea')[1]`, 'foco en las observaciones tras el 422')
  const invalidObservations = await evaluate(`(()=>{const [reason,observations]=qaDialog().querySelectorAll('textarea');return {title:qaTitle(),reason:reason.getAttribute('aria-invalid'),observations:observations.getAttribute('aria-invalid'),focus:document.activeElement===observations,alerts:qaAlerts().length}})()`)
  assert.deepEqual(invalidObservations, { title: MANAGE, reason: null, observations: 'true', focus: true, alerts: 2 })
  await evaluate(`qaFill(qaDialog().querySelectorAll('textarea')[1],'Obs QA');true`)
  await wait(`qaAlerts().length===0`, 'errores de observaciones limpiados al escribir')
  // Someone else changed the record: the server now holds revision 2.
  await evaluate(`Object.assign(eligQa.rows[0],{status:'INELIGIBLE',reason:'Motivo del servidor',revision:2});eligQa.failNext={status:409,data:{}};true`)
  await click('Guardar', 'qaDialog()')
  await wait(`!!qaDialog().querySelector('[aria-label="Conflicto de habilitación"]')`, 'conflicto 409')
  assert.deepEqual(await evaluate(`({alerts:qaAlerts(),save:qaBtn('Guardar',qaDialog()).disabled})`),
    { alerts: ['Esta habilitación fue modificada mientras la estabas editando. Actualiza los datos antes de guardar nuevamente.'], save: true })
  await click('Consultar datos actuales', 'qaDialog()')
  await wait(`qaDialog().textContent.includes('Datos actuales del servidor — Revisión 2')`, 'datos actuales del servidor')
  assert.deepEqual(await evaluate(`({server:qaDialog().textContent.includes('Motivo del servidor'),draft:qaDialog().querySelector('textarea').value,form:qaDialog().textContent.includes('Revisión del formulario: 1')})`),
    { server: true, draft: 'Motivo QA final', form: true }, 'el borrador se conserva hasta descartarlo')
  await click('Descartar borrador y cargar estos datos', 'qaDialog()')
  await wait(`!qaDialog().querySelector('[aria-label="Conflicto de habilitación"]')`, 'conflicto resuelto')
  assert.deepEqual(await evaluate(`({value:qaDialog().querySelector('textarea').value,form:qaDialog().textContent.includes('Revisión del formulario: 2'),save:qaBtn('Guardar',qaDialog()).disabled})`),
    { value: 'Motivo del servidor', form: true, save: true })
  await evaluate(`qaRadios()[0].click();true`)
  await wait(`!qaBtn('Guardar',qaDialog()).disabled`, 'cambio a habilitado')
  await evaluate('eligQa.holdNext();true')
  await click('Guardar', 'qaDialog()')
  await wait(`!!qaBtn('Guardando…',qaDialog())`, 'guardado en curso')
  assert.deepEqual(await evaluate(`({busy:qaDialog().getAttribute('aria-busy'),close:qaBtn('Cerrar ventana',qaDialog()).disabled,cancel:qaBtn('Cancelar',qaDialog()).disabled,radios:qaRadios().every(r=>r.matches(':disabled'))})`), { busy: 'true', close: true, cancel: true, radios: true })
  await escape()
  await pressBackdrop()
  assert.equal(await evaluate('qaTitle()'), MANAGE, 'Escape y el fondo no cierran mientras se guarda')
  await evaluate('eligQa.release();true')
  await closed('habilitación guardada')
  assert.deepEqual(await evaluate(`qaCalls('patch').map(c=>c.payload)`), [
    { status: 'INELIGIBLE', reason: 'Motivo QA', observations: '', revision: 1 },
    { status: 'INELIGIBLE', reason: 'Motivo QA final', observations: '', revision: 1 },
    { status: 'INELIGIBLE', reason: 'Motivo QA final', observations: 'Obs QA', revision: 1 },
    { status: 'ELIGIBLE', revision: 2 },
  ])
  assert.deepEqual(await evaluate('eligQa.notices'), [['success', 'La habilitación del estudiante fue actualizada.']])
  pass('gestionar: validación, 422 con foco real en motivo y en observaciones, 409 con datos del servidor y descarte, bloqueo al guardar y payloads')

  // 4. Carga masiva: focus, Tab containment, close paths, file validation and the 5 MB limit.
  await show()
  await openBulk()
  const bulk = await evaluate(`(()=>{const d=qaDialog();const a=document.activeElement;return {modal:d.matches(':modal'),focus:a.type==='file'&&d.contains(a),process:qaBtn('Procesar',d).disabled}})()`)
  assert.deepEqual(bulk, { modal: true, focus: true, process: true })
  assert.ok(await tabAround('carga', 4) >= 3, 'carga: Tab recorre los controles del diálogo')
  for (const [label, action] of [['Escape', escape], ['×', () => click('Cerrar ventana', 'qaDialog()')], ['Cancelar', () => click('Cancelar', 'qaDialog()')], ['fondo', pressBackdrop]]) {
    if (!(await evaluate('!!qaDialog()'))) await openBulk()
    await action()
    await closed(`${label} cierra la carga`)
    assert.equal(await evaluate('qaFocus()'), BULK, `${label} devuelve el foco`)
  }
  await openBulk()
  await evaluate(`qaPick('habilitaciones.txt',64)`)
  await wait(`qaAlerts().length===1`, 'extensión no válida')
  assert.deepEqual(await evaluate(`({alerts:qaAlerts(),process:qaBtn('Procesar',qaDialog()).disabled,invalid:qaDialog().querySelector('input[type=file]').getAttribute('aria-invalid')})`),
    { alerts: ['Selecciona un archivo con extensión .csv.'], process: true, invalid: 'true' })
  await evaluate(`qaPick('grande.csv',5*1024*1024+1)`)
  await wait(`qaAlerts()[0]==='El archivo no puede superar los 5 MB.'`, 'límite de 5 MB')
  assert.equal(await evaluate(`qaBtn('Procesar',qaDialog()).disabled`), true)
  await evaluate(`qaPick('limite.csv',5*1024*1024)`)
  await wait(`qaAlerts().length===0&&!qaBtn('Procesar',qaDialog()).disabled`, 'archivo de 5 MB exactos aceptado')
  assert.equal(await evaluate(`qaCalls('post').length`), 0, 'validar no envía el archivo')
  pass('carga: foco en el archivo, Tab contenido, Escape/×/Cancelar/fondo, extensión .csv y límite de 5 MB')

  // 5. Carga masiva: busy protection, partial result with row errors and return to the list.
  await evaluate(`eligQa.bulk=${JSON.stringify(partial)};qaPick('habilitaciones.csv',64);eligQa.holdNext();true`)
  await click('Procesar', 'qaDialog()')
  await wait(`!!qaBtn('Procesando…',qaDialog())`, 'carga en curso')
  assert.deepEqual(await evaluate(`({busy:qaDialog().getAttribute('aria-busy'),close:qaBtn('Cerrar ventana',qaDialog()).disabled,file:qaDialog().querySelector('input[type=file]').disabled,status:[...qaDialog().querySelectorAll('[role=status]')].map(s=>s.textContent.trim())})`),
    { busy: 'true', close: true, file: true, status: ['Procesando habilitaciones…'] })
  await escape()
  await pressBackdrop()
  assert.equal(await evaluate('qaTitle()'), BULK, 'Escape y el fondo no cierran mientras se procesa')
  const listReads = await evaluate(`qaCalls('get').filter(c=>c.url==='/exams/5/eligibilities').length`)
  await evaluate('eligQa.release();true')
  await wait(`qaDialog().querySelector('h3')?.textContent.trim()==='Carga parcial'`, 'resultado parcial')
  const outcome = await evaluate(`(()=>{const d=qaDialog();return {summary:[...d.querySelectorAll('dl[role=status] dd')].map(x=>x.textContent.trim()),row:[...d.querySelectorAll('[aria-label="Errores por fila"] tbody td')].map(x=>x.textContent.trim()),process:qaBtn('Procesar',d).disabled,close:!!qaBtn('Cerrar',d)}})()`)
  assert.deepEqual(outcome, { summary: ['3', '2', '1'], row: ['3', '000123', 'El estado indicado no es válido para esta fila del archivo.'], process: true, close: true })
  assert.deepEqual(await evaluate(`qaCalls('post')`), [{ method: 'post', url: '/exams/5/eligibilities/bulk', file: { name: 'habilitaciones.csv', size: 64 } }])
  await wait(`qaCalls('get').filter(c=>c.url==='/exams/5/eligibilities').length>${listReads}`, 'listado recargado tras la carga')
  await click('Volver al listado de habilitaciones', 'qaDialog()')
  await closed('volver al listado cierra la carga')
  assert.deepEqual(await evaluate('eligQa.notices'), [['info', 'Carga parcial: 2 filas actualizadas y 1 rechazada.']])
  pass('carga: bloqueo al procesar, resultado parcial con errores por fila, envío del archivo y vuelta al listado')

  // 6. Carga masiva: a server failure leaves the outcome unknown and only allows reviewing.
  await openBulk()
  await evaluate(`qaPick('habilitaciones.csv',64);eligQa.failNext={status:500,data:{}};true`)
  await click('Procesar', 'qaDialog()')
  await wait(`!!qaBtn('Revisar habilitaciones',qaDialog())`, 'resultado desconocido')
  const unknown = await evaluate(`(()=>{const d=qaDialog();return {alerts:qaAlerts().length,file:d.querySelector('input[type=file]').disabled,process:qaBtn('Procesar',d).disabled,close:!!qaBtn('Cerrar',d)&&!qaBtn('Cancelar',d),busy:d.getAttribute('aria-busy')}})()`)
  assert.deepEqual(unknown, { alerts: 1, file: true, process: true, close: true, busy: 'false' })
  assert.equal(await evaluate(`eligQa.notices.at(-1)[0]`), 'info', 'el aviso de resultado desconocido es informativo')
  await click('Revisar habilitaciones', 'qaDialog()')
  await closed('revisar habilitaciones cierra la carga')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow==='hidden'`), false, 'scroll de la página restaurado')
  pass('carga: resultado desconocido bloquea un nuevo envío y permite revisar las habilitaciones')

  assert.deepEqual(await evaluate('eligQa.unexpected'), [])
  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ passed }, null, 2))
  console.log(`QA Habilitaciones: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
