// DS4.2c.2 browser QA for CollaborationModal: a sticky header (z-index 50, like Header.module.css) must not
// paint over the modal or receive clicks through it; initial focus, Tab containment, Escape, backdrop click,
// busy protection, focus return, nested ConfirmDialog (div and native) and nested CollaborationModal keep
// working; real EntryControlPage flows (student detail, manual confirmation while busy, "Ingreso registrado")
// at 320/390/768/1024/1440px. No backend: an in-process HTTP fixture answers /__qa-api only.
// Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_COLLABORATION_MODAL_OUTPUT ?? 'ds42c2-collaboration-modal')
await mkdir(evidence, { recursive: true })

const header = `e('header',{id:'qa-header',onClick:()=>{window.qa.headerClicks++},style:{position:'sticky',top:0,zIndex:50,height:96,display:'flex',alignItems:'center',gap:12,padding:'0 16px',background:'#EAF3FF'}},
  e('strong',null,'Encabezado QA'),e('button',{type:'button',id:'header-action'},'Acción del encabezado'))`

const genericDemo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import {CollaborationModal} from '/src/features/collaborations/components/CollaborationModal.tsx';
import {ConfirmDialog} from '/src/shared/components/ConfirmDialog/ConfirmDialog.tsx';
import {Snackbar} from '/src/shared/components/Snackbar.tsx';
const e=React.createElement;
window.qa={headerClicks:0,backgroundClicks:0};
function Demo(){
  const [open,setOpen]=React.useState(false);
  const [busy,setBusy]=React.useState(false);
  const [confirm,setConfirm]=React.useState(null);
  const [nested,setNested]=React.useState(false);
  const [notice,setNotice]=React.useState(null);
  window.qa.setBusy=setBusy;
  const close=()=>{setOpen(false);setNotice({id:Date.now(),type:'success',message:'Modal QA cerrado.'})};
  return e(React.Fragment,null,
    ${header},
    e('main',{style:{padding:16}},
      e('h1',null,'CollaborationModal QA'),
      e('button',{type:'button',id:'open-modal',onClick:()=>setOpen(true)},'Abrir modal'),
      e('button',{type:'button',id:'open-both',onClick:()=>{setOpen(true);setNested(true)}},'Abrir modal y anidado'),
      e('button',{type:'button',id:'background-action',onClick:()=>{window.qa.backgroundClicks++}},'Acción de fondo'),
      ...Array.from({length:30},(_,i)=>e('p',{key:i},'Contenido de la página '+(i+1)))),
    open&&e(CollaborationModal,{title:'Modal QA con un título largo para comprobar el ajuste',busy,onClose:close},
      e('label',{htmlFor:'qa-field'},'Campo QA'),
      e('input',{id:'qa-field'}),
      e('select',{id:'qa-select','aria-label':'Selección QA'},e('option',null,'Uno'),e('option',null,'Dos')),
      e('button',{type:'button',id:'open-confirm',onClick:()=>setConfirm('div')},'Abrir confirmación'),
      e('button',{type:'button',id:'open-native-confirm',onClick:()=>setConfirm('native')},'Abrir confirmación nativa'),
      e('button',{type:'button',id:'open-nested',onClick:()=>setNested(true)},'Abrir modal anidado'),
      ...Array.from({length:14},(_,i)=>e('p',{key:i},'Detalle del modal '+(i+1))),
      e(ConfirmDialog,{isOpen:confirm!==null,native:confirm==='native',title:'Confirmación QA',message:'¿Continuar?',onConfirm:()=>setConfirm(null),onCancel:()=>setConfirm(null)}),
      nested&&e(CollaborationModal,{title:'Modal anidado',onClose:()=>setNested(false)},e('p',null,'Contenido anidado'),e('button',{type:'button',id:'nested-action'},'Acción anidada'))),
    e(Snackbar,{notice,onDismiss:()=>setNotice(null)}));
}
createRoot(document.getElementById('root')).render(e(Demo));
window.qaReady=true;
`

const entryDemo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {EntryControlPage} from '/src/features/exams/pages/EntryControlPage.tsx';
const e=React.createElement;
window.qa={headerClicks:0};
httpClient.defaults.baseURL='/__qa-api';httpClient.defaults.headers.common.Authorization='Bearer ds42c2-fixture';
const router=createMemoryRouter([{path:'/control/:examId',Component:EntryControlPage}],{initialEntries:['/control/4?from=teacher']});
createRoot(document.getElementById('root')).render(e(React.Fragment,null,${header},e(RouterProvider,{router})));
window.qaReady=true;
`

const exam = {
  id: 4, name: 'Parcial DS4.2c.2', subject_name: 'Taller de Software', exam_date: '2026-11-03', start_time: '10:00:00',
  duration_minutes: 90, evaluation_type: 'partial', status: 'SCHEDULED', entry_available: true, entry_unavailable_reason: null,
  entry_opens_at: null, entry_closes_at: null, server_time: '2026-11-03T14:10:00Z', room: { id: 2, code: 'A-1', name: 'Aula de prueba' },
}
const student = {
  student_id: 7, first_names: 'Ana', last_names: 'Prueba', sis_code: '00123', identity_number: '12345',
  historical_photo_url: null, profile_photo_url: null, student_status: 'ACTIVE', enrollment_status: 'ACTIVE',
  eligibility_status: 'ELIGIBLE', reason_code: null, reason: null, observations: null, assigned_room_id: 2,
  controlled_room_id: 2, room_status: 'MATCH', entry_status: 'PENDING', entry: null, meets_entry_conditions: true, blockers: [],
}
const requests = []
async function api(req, res) {
  const url = new URL(req.url, 'http://fixture.test')
  requests.push(`${req.method} ${url.pathname}`)
  const json = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
  if (req.headers.authorization !== 'Bearer ds42c2-fixture') return json(401, {})
  if (req.method === 'GET' && url.pathname === '/exams/4/entry-control/students')
    return json(200, {
      exam, permissions: { can_annul_entries: false },
      summary: { total_students: 1, registered: 0, pending: 1, not_applicable: 0 },
      filter_counts: { all: 1, registered: 0, pending: 1, incidents: 0 },
      data: [student], meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
    })
  if (req.method === 'GET' && url.pathname === '/exams/4/entry-control/students/7') return json(200, { exam, data: student })
  if (req.method === 'POST' && url.pathname === '/exams/4/entry-control/students/7/entries') {
    // Slow fixture answer so the busy state can be exercised; the fixture keeps no state.
    await new Promise((done) => setTimeout(done, 900))
    return json(201, { result: 'AUTHORIZED', message: 'Ingreso registrado', processed_at: '2026-11-03T14:11:00Z', data: null })
  }
  return json(404, {})
}

// Topmost visible modal plus every control of it that something outside that modal paints over.
const inspect = `(()=>{
  const dialogs=[...document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open]')].filter(d=>d.getClientRects().length);
  const top=dialogs.at(-1), vh=innerHeight, vw=document.documentElement.clientWidth;
  const label=(el)=>el?.id||el?.getAttribute?.('aria-label')||el?.textContent?.trim().slice(0,30)||el?.tagName;
  const covered=top?[...top.querySelectorAll('h2,h3,button,input,select')].filter(el=>{const r=el.getBoundingClientRect();if(!r.width||r.top<0||r.bottom>vh)return false;
    // Only an element outside the topmost modal counts (inner scroll clipping is the modal's own layout).
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !hit||!top.contains(hit)}).map(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return label(el)+' ← '+(hit?(hit.className||hit.tagName)+'/'+label(hit):'nada')+' @'+Math.round(r.top)+'-'+Math.round(r.bottom)}):null;
  const h=document.getElementById('header-action')?.getBoundingClientRect();
  const headerHit=h?document.elementFromPoint(h.left+h.width/2,h.top+h.height/2):null;
  const r=top?.getBoundingClientRect();
  return {count:dialogs.length,title:top?.querySelector('h2,h3')?.textContent,covered,
    headerReachable:!!headerHit&&!!headerHit.closest('#qa-header'),
    active:label(document.activeElement),activeInside:!!top&&top.contains(document.activeElement),activeIsDialog:document.activeElement===top,
    busy:top?.getAttribute('aria-busy'),closeDisabled:top?.querySelector('[aria-label="Cerrar modal"]')?.disabled??null,
    bodyLocked:getComputedStyle(document.body).overflow==='hidden',inside:r?r.left>=-1&&r.right<=vw+1:null,overflow:document.documentElement.scrollWidth>vw+1};
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const results = []
try {
  browserProfile = await createBrowserProfile('ds42c2-collaboration-modal')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  const page = (src) => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="${src}"></script></html>`
  vite = await createServer({
    root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds42c2-collaboration-modal-qa', enforce: 'pre',
      resolveId(id) { if (id === '/__ds42c2-generic.js') return '\0ds42c2-generic'; if (id === '/__ds42c2-entry.js') return '\0ds42c2-entry' },
      load(id) { if (id === '\0ds42c2-generic') return genericDemo; if (id === '\0ds42c2-entry') return entryDemo },
      configureServer(server) {
        server.middlewares.use('/__qa-api', (req, res) => { api(req, res).catch((error) => { res.statusCode = 500; res.end(String(error)) }) })
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split('?')[0]
          if (path !== '/__ds42c2-generic' && path !== '/__ds42c2-entry') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(path, page(path + '.js')))
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
  const key = async (name, code, keyCode, modifiers = 0) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: name, code, windowsVirtualKeyCode: keyCode, modifiers }) }
  const mouse = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }) }
  const centre = (selector) => evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
  const clickText = (text) => evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&(b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text)}));if(!b||b.disabled)throw new Error('Botón no disponible: '+${JSON.stringify(text)});b.focus();b.click()})()`)
  const dialogCount = `[...document.querySelectorAll('[role=dialog]')].filter(d=>d.getClientRects().length).length`
  await send('Runtime.enable'); await send('Page.enable')

  for (const width of [320, 390, 768, 1024, 1440]) {
    const height = width < 768 ? 640 : 800
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 })
    const failures = [], check = (ok, message) => { if (!ok) failures.push(message) }
    const before = exceptions.length
    try {
    // A. Generic CollaborationModal.
    await send('Page.navigate', { url: origin + '/__ds42c2-generic' })
    await wait('window.qaReady===true && !!document.getElementById("open-modal")', 'arranque genérico')
    const open = async () => {
      await evaluate(`(()=>{const b=document.getElementById('open-modal');b.focus();b.click()})()`)
      await wait(`${dialogCount}===1`, 'abrir modal'); await pause(100)
    }
    await open()
    let state = await evaluate(inspect)
    check(state.covered.length === 0, 'el encabezado tapa el modal: ' + state.covered.join(', '))
    check(!state.headerReachable, 'el encabezado sigue alcanzable sobre el overlay')
    check(state.activeIsDialog, 'foco inicial fuera del contenedor: ' + state.active)
    check(state.bodyLocked && state.inside && !state.overflow, 'bloqueo de scroll o desbordamiento: ' + JSON.stringify(state))
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `generic-${width}.png`), Buffer.from(shot.data, 'base64'))
    // Tab and Shift+Tab never leave the modal.
    let escaped = 0
    for (let index = 0; index < 12; index++) { await key('Tab', 'Tab', 9); if (!(await evaluate(inspect)).activeInside) escaped++ }
    for (let index = 0; index < 4; index++) { await key('Tab', 'Tab', 9, 8); if (!(await evaluate(inspect)).activeInside) escaped++ }
    check(escaped === 0, `el foco salió del modal ${escaped} veces`)
    // A click on the header area outside the modal box hits the backdrop: header untouched, modal closed.
    await mouse(4, 4); await pause(150)
    check(await evaluate('window.qa.headerClicks') === 0, 'el clic atravesó el overlay hasta el encabezado')
    check(await evaluate(`${dialogCount}===0`), 'el clic en el fondo no cerró el modal')
    check(await evaluate(`document.activeElement?.id==='open-modal'`), 'foco no devuelto tras clic fuera')
    // Background page button behind the overlay is unreachable too.
    await open()
    const backgroundPoint = await centre('#background-action')
    const box = await evaluate(`(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom}})()`)
    const outsideBox = backgroundPoint && (backgroundPoint.x < box.l || backgroundPoint.x > box.r || backgroundPoint.y < box.t || backgroundPoint.y > box.b)
    if (outsideBox && backgroundPoint.y > 0 && backgroundPoint.y < height) {
      await mouse(backgroundPoint.x, backgroundPoint.y); await pause(150)
      check(await evaluate('window.qa.backgroundClicks') === 0, 'el clic atravesó el overlay hasta la página')
      if (await evaluate(`${dialogCount}===0`)) await open()
    }
    // Escape closes and returns focus; the Snackbar is then usable.
    await evaluate(`document.getElementById('qa-field').focus()`)
    await key('Escape', 'Escape', 27)
    await wait(`${dialogCount}===0`, 'Escape')
    check(await evaluate(`document.activeElement?.id==='open-modal'`), 'foco no devuelto tras Escape')
    const snack = await centre('.snackbar button')
    check(snack, 'sin aviso tras cerrar')
    if (snack) { await mouse(snack.x, snack.y); await pause(150); check(await evaluate(`!document.querySelector('.snackbar')`), 'el × del aviso no responde') }
    // Busy: Escape, backdrop and × are blocked; focus stays inside.
    await open()
    await evaluate('window.qa.setBusy(true)'); await pause(100)
    await key('Escape', 'Escape', 27); await pause(100)
    await mouse(4, height - 4); await pause(150)
    // Focus must stay inside: Tab after a backdrop click cannot reach the page behind.
    await key('Tab', 'Tab', 9)
    state = await evaluate(inspect)
    check(state.count === 1 && state.busy === 'true' && state.closeDisabled === true && state.activeInside, 'busy no protege: ' + JSON.stringify(state))
    await evaluate('window.qa.setBusy(false)'); await pause(100)
    // Nested ConfirmDialog (non-native, z-index 200) rendered inside the modal.
    await clickText('Abrir confirmación'); await wait(`!!document.querySelector('[role=alertdialog]')`, 'confirmación'); await pause(100)
    state = await evaluate(inspect)
    check(state.title === 'Confirmación QA' && state.covered.length === 0 && state.activeInside, 'ConfirmDialog tapado: ' + JSON.stringify(state))
    await key('Escape', 'Escape', 27); await pause(150)
    check(await evaluate(`!document.querySelector('[role=alertdialog]') && ${dialogCount}===1 && document.activeElement?.id==='open-confirm'`), 'Escape de ConfirmDialog afectó al modal o no devolvió el foco')
    // Nested native ConfirmDialog.
    await clickText('Abrir confirmación nativa'); await wait(`!!document.querySelector('dialog[open]')`, 'confirmación nativa'); await pause(100)
    state = await evaluate(inspect)
    check(state.title === 'Confirmación QA' && state.covered.length === 0 && state.activeInside, 'ConfirmDialog nativo tapado: ' + JSON.stringify(state))
    await key('Escape', 'Escape', 27); await pause(150)
    check(await evaluate(`!document.querySelector('dialog[open]') && ${dialogCount}===1`), 'Escape del ConfirmDialog nativo afectó al modal')
    // Nested CollaborationModal.
    await clickText('Abrir modal anidado'); await wait(`${dialogCount}===2`, 'modal anidado'); await pause(100)
    state = await evaluate(inspect)
    check(state.title === 'Modal anidado' && state.covered.length === 0 && state.activeIsDialog, 'modal anidado tapado: ' + JSON.stringify(state))
    await key('Escape', 'Escape', 27); await pause(150)
    check(await evaluate(`${dialogCount}===1 && document.activeElement?.id==='open-nested'`), 'Escape del anidado cerró ambos o no devolvió el foco')
    await clickText('Cerrar modal'); await wait(`${dialogCount}===0`, 'cerrar con ×')
    check(await evaluate(`document.activeElement?.id==='open-modal'`), 'foco no devuelto tras ×')
    // Outer and nested modal mounted in the same render: the nested one must still paint on top.
    await clickText('Abrir modal y anidado'); await wait(`${dialogCount}===2`, 'montaje simultáneo'); await pause(100)
    state = await evaluate(inspect)
    check(state.title === 'Modal anidado' && state.covered.length === 0, 'anidado montado a la vez queda debajo: ' + JSON.stringify(state))
    // Known pre-existing limitation (not popover related): with a simultaneous mount the outer focus
    // effect runs last and keeps focus, so Escape would close the outer modal. No consumer mounts this way.
    const closeTop = `[...document.querySelectorAll('[aria-label="Cerrar modal"]')].filter(b=>b.getClientRects().length).at(-1).click()`
    await evaluate(closeTop); await wait(`${dialogCount}===1`, 'cerrar anidado simultáneo')
    await evaluate(closeTop); await wait(`${dialogCount}===0`, 'cerrar exterior simultáneo')

    // B. Real EntryControlPage flows (fixture only).
    await send('Page.navigate', { url: origin + '/__ds42c2-entry' })
    await wait(`window.qaReady===true && [...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Ver a Ana Prueba')`, 'control de ingreso')
    await clickText('Ver a Ana Prueba')
    await wait(`[...document.querySelectorAll('[role=dialog] h2')].some(h=>h.textContent==='Información del Estudiante')`, 'detalle del estudiante'); await pause(150)
    state = await evaluate(inspect)
    check(state.covered.length === 0 && !state.headerReachable, 'detalle de estudiante tapado: ' + JSON.stringify(state))
    await writeFile(join(evidence, `entry-detail-${width}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    await key('Escape', 'Escape', 27)
    await wait(`${dialogCount}===0`, 'cerrar detalle')
    check(await evaluate(`document.activeElement?.getAttribute('aria-label')==='Ver a Ana Prueba'`), 'foco no devuelto al botón Ver')
    await clickText('Registro de asistencia')
    await wait(`[...document.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='Registrar a Ana Prueba')`, 'lista manual')
    await clickText('Registrar a Ana Prueba')
    await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Registrar ingreso manual'&&!b.disabled)`, 'detalle manual')
    await clickText('Registrar ingreso manual')
    await wait(`[...document.querySelectorAll('[role=dialog] h2')].some(h=>h.textContent==='Confirmar registro de ingreso')`, 'confirmación manual'); await pause(150)
    state = await evaluate(inspect)
    check(state.covered.length === 0 && !state.headerReachable, 'confirmación manual tapada: ' + JSON.stringify(state))
    await writeFile(join(evidence, `entry-confirm-${width}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    await clickText('Confirmar ingreso')
    await wait(`document.querySelector('[role=dialog]')?.getAttribute('aria-busy')==='true'`, 'registro en curso')
    await key('Escape', 'Escape', 27); await mouse(4, height - 4); await pause(150)
    state = await evaluate(inspect)
    check(state.count === 1 && state.busy === 'true' && state.title === 'Confirmar registro de ingreso', 'busy del registro manual no protege: ' + JSON.stringify(state))
    await wait(`[...document.querySelectorAll('[role=dialog] h2')].some(h=>h.textContent==='Ingreso registrado')`, 'ingreso registrado'); await pause(150)
    state = await evaluate(inspect)
    check(state.count === 1 && state.covered.length === 0 && !state.headerReachable, 'éxito tapado: ' + JSON.stringify(state))
    await clickText('Cerrar'); await wait(`${dialogCount}===0`, 'cerrar éxito')
    } catch (error) {
      failures.push('flujo interrumpido: ' + error.message + ' · estado ' + JSON.stringify(await evaluate(inspect).catch(() => null)))
    }

    check(exceptions.length === before, 'excepciones JS: ' + exceptions.slice(before).join(' | '))
    results.push({ width, pass: !failures.length, failures })
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${width}px CollaborationModal${failures.length ? ': ' + failures.join(' · ') : ''}`)
  }
  const foreign = requests.filter((request) => !/^(GET \/exams\/4\/entry-control\/students(\/7)?|POST \/exams\/4\/entry-control\/students\/7\/entries)$/.test(request))
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ fixtureOnly: true, results, requests }, null, 2))
  assert.deepEqual(foreign, [], 'peticiones fuera del fixture')
  const failed = results.filter((result) => !result.pass).length
  assert.equal(failed, 0, `${failed} anchos con fallos`)
  console.log(`QA CollaborationModal PASS ${results.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
