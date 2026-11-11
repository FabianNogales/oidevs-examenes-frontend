// Browser QA for the admin detail dialogs (G2): «Detalle de cuenta» (Gestionar usuarios) and
// «Detalle del registro» (Carreras, Auditoría) on PortalDialog. Real pages with a data router and a
// read-only simulated httpClient (no backend; any write is reported as unexpected).
// Covers opening, Escape, ×, backdrop press (closes, as before), focus return, keyboard navigation
// (Tab stays in the dialog, Enter follows a link) and layout at 320/390/768/1024/1440px.
// Selectors use roles, text and accessible names only (no classes).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.ADMIN_DETAIL_QA_OUTPUT ?? 'admin-detail-dialogs')
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
import {ManageAccounts} from '/src/features/users/pages/AdminManageUsersPage.tsx';
import {AdminReadPage} from '/src/features/users/pages/AdminReadPage.tsx';
const e=React.createElement;
const qa=window.detailQa={calls:[],unexpected:[],hold:null};
const account={id:15,full_name:'Persona QA de prueba',first_names:'Persona',last_names:'QA de prueba',email:'persona.qa.con.correo.institucional.largo@example.edu',institutional_code:'QA-15',identity_number:'123',status:'ACTIVE',roles:[{id:2,name:'DOCENTE'}],student_id:70,teacher_id:30,student_status:'INACTIVE',teacher_status:'ACTIVE'};
const career={id:1,code:'QA-SIS',name:'Carrera QA Sistemas',status:'ACTIVE'};
const audit={id:5,actor_id:1,action:'UPDATE',entity_type:'Room',entity_id:1,created_at:'2026-01-01T10:00:00Z',old_context:{name:'Aula QA con un nombre anterior deliberadamente largo para comprobar el ajuste de línea'},new_context:{name:'Aula QA 101'}};
const page=(data)=>({data,meta:{current_page:1,last_page:1,total:data.length,per_page:10,from:1,to:data.length}});
const fixtures={'/admin/users':page([account]),'/admin/users/15':{data:account},'/admin/careers':page([career]),'/admin/careers/1':{data:career},'/admin/audit-logs':page([audit]),'/admin/audit-logs/5':{data:audit}};
qa.holdNext=()=>{let release;const gate=new Promise(done=>{release=done});qa.hold={gate,release}};
qa.release=()=>{qa.hold?.release();qa.hold=null};
const fail=(status)=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data:{}}});
const respond=(method)=>async(url)=>{
  qa.calls.push({method,url});
  if(method!=='get'||!fixtures[url]){qa.unexpected.push(method+' '+url);throw fail(501)}
  if(qa.hold&&/\\/\\d+$/.test(url))await qa.hold.gate;
  return {data:structuredClone(fixtures[url])};
};
qa.client={get:respond('get'),post:respond('post'),put:respond('put'),patch:respond('patch'),delete:respond('delete')};
const routes=[
  {path:'/admin/users/manage',element:e('main',null,e(ManageAccounts))},
  {path:'/admin/careers',element:e('main',null,e(AdminReadPage,{kind:'careers'}))},
  {path:'/admin/audit-logs',element:e('main',null,e(AdminReadPage,{kind:'audit-logs'}))},
  {path:'*',element:e('main',null,e('h1',null,'Destino QA'))},
];
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>{qa.calls=[];qa.unexpected=[];qa.hold=null;qa.router=createMemoryRouter(routes,{initialEntries:[path]});root.render(e(RouterProvider,{key:Math.random(),router:qa.router}))};
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('admin-detail-dialogs')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'admin-detail-dialogs-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__admin-detail-qa.js') return '\0admin-detail-dialogs-qa' },
      load(id) {
        if (id === '\0admin-detail-dialogs-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.detailQa.client.get(...a),post:(...a)=>window.detailQa.client.post(...a),put:(...a)=>window.detailQa.client.put(...a),patch:(...a)=>window.detailQa.client.patch(...a),delete:(...a)=>window.detailQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({user:{id:1},notify(){}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__admin-detail-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__admin-detail-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__admin-detail-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__admin-detail-qa')).status, 200)
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
  await send('Page.navigate', { url: origin + '/__admin-detail-qa' })
  await wait('!!window.detailQa?.show', 'arranque')
  await evaluate(`window.qaText=(el)=>(el.getAttribute('aria-label')||el.textContent).replace(/\\s+/g,' ').trim();
    window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>qaText(b)===text);
    window.qaDialog=()=>document.querySelector('dialog[open]');
    window.qaFocus=()=>document.activeElement?qaText(document.activeElement):null;true`)
  const key = async (name, code, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, modifiers, ...(name === 'Enter' ? { text: '\r' } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, modifiers })
    await pause(120)
  }
  const pressBackdrop = async () => {
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, x: 3, y: 3, button: 'left', clickCount: 1 })
    await pause(120)
  }
  const pressInside = async () => {
    // A press on the dialog's own padding must not close it.
    const point = await evaluate(`(()=>{const b=qaDialog().getBoundingClientRect();return {x:b.left+4,y:b.top+4}})()`)
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 })
    await pause(120)
  }
  const screens = [
    { path: '/admin/users/manage', h1: 'Gestión de usuarios', row: 'QA-15', title: 'Detalle de cuenta', slug: 'cuenta',
      content: ['Persona QA de prueba', 'Roles permanentes', 'Docente'], links: ['Gestionar roles y permisos (HU22)', 'Ver perfil docente', 'Ver perfil estudiantil'] },
    { path: '/admin/careers', h1: 'Carreras', row: 'QA-SIS', title: 'Detalle del registro', slug: 'carrera',
      content: ['QA-SIS', 'Carrera QA Sistemas', 'Activa'], links: [] },
    { path: '/admin/audit-logs', h1: 'Auditoría', row: 'UPDATE', title: 'Detalle del registro', slug: 'auditoria',
      content: ['Contexto anterior permitido', 'Contexto nuevo permitido', 'Aula QA 101'], links: [] },
  ]
  const show = async (screen) => {
    await evaluate(`detailQa.show(${JSON.stringify(screen.path)})`)
    await wait(`document.body.innerText.includes(${JSON.stringify(screen.row)})&&!!qaBtn('Ver detalle')`, `${screen.h1}: listado`)
  }
  const open = async (screen) => {
    await evaluate(`(()=>{const b=qaBtn('Ver detalle');b.focus();b.click()})()`)
    await wait(`!!qaDialog()&&${JSON.stringify(screen.content)}.every(t=>qaDialog().innerText.includes(t))`, `${screen.title}: abierto y cargado`)
  }
  const closed = (label) => wait('!qaDialog()', label)

  for (const screen of screens) {
    // 1. Layout at five widths (also the visual evidence).
    for (const width of [320, 390, 768, 1024, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
      await show(screen)
      await open(screen)
      const layout = await evaluate(`(()=>{const d=qaDialog(),b=d.getBoundingClientRect(),c=qaBtn('Cerrar ventana',d).getBoundingClientRect(),hit=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
        return {inside:b.left>=-1&&b.top>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,noScrollX:d.scrollWidth<=d.clientWidth+1,closeOnTop:!!hit&&d.contains(hit),page:document.documentElement.scrollWidth<=innerWidth+1,width:Math.round(b.width)}})()`)
      assert.deepEqual({ ...layout, width: undefined }, { inside: true, noScrollX: true, closeOnTop: true, page: true, width: undefined }, `${screen.slug} ${width}px ${JSON.stringify(layout)}`)
      assert.equal(layout.width, Math.min(560, width - 32), `${screen.slug} ${width}px ancho del diálogo`)
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `${screen.slug}-${width}.png`), Buffer.from(shot.data, 'base64'))
      await key('Escape', 27)
      await closed(`${screen.slug} ${width}px Escape`)
    }
    pass(`${screen.h1}: diálogo dentro de la ventana y sin desbordamiento a 320/390/768/1024/1440`)

    // 2. Opening semantics, Escape, ×, backdrop and focus return.
    await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })
    await show(screen)
    await evaluate('detailQa.holdNext();true')
    await evaluate(`(()=>{const b=qaBtn('Ver detalle');b.focus();b.click()})()`)
    await wait(`!!qaDialog()?.querySelector('[role=status]')`, `${screen.slug}: estado de carga`)
    const opening = await evaluate(`(()=>{const d=qaDialog(),t=document.getElementById(d.getAttribute('aria-labelledby'));return {modal:d.matches(':modal'),title:t?.textContent.trim(),tag:t?.tagName,focus:qaFocus(),lock:getComputedStyle(document.body).overflow}})()`)
    assert.deepEqual(opening, { modal: true, title: screen.title, tag: 'H2', focus: 'Cerrar ventana', lock: 'hidden' })
    await key('Escape', 27)
    await closed(`${screen.slug}: Escape cierra durante la carga`)
    assert.equal(await evaluate('qaFocus()'), 'Ver detalle', 'Escape devuelve el foco a «Ver detalle»')
    await evaluate('detailQa.release();true')
    await pause(150)
    assert.ok(await evaluate('!qaDialog()'), 'una respuesta tardía no reabre el detalle')
    await open(screen)
    await evaluate(`qaBtn('Cerrar ventana',qaDialog()).click()`)
    await closed(`${screen.slug}: × cierra`)
    assert.equal(await evaluate('qaFocus()'), 'Ver detalle', '× devuelve el foco')
    await open(screen)
    await pressInside()
    assert.ok(await evaluate('!!qaDialog()'), 'pulsar dentro del diálogo no lo cierra')
    await pressBackdrop()
    await closed(`${screen.slug}: pulsar el fondo cierra (comportamiento previo)`)
    assert.equal(await evaluate('qaFocus()'), 'Ver detalle', 'el fondo devuelve el foco')
    assert.notEqual(await evaluate(`getComputedStyle(document.body).overflow`), 'hidden', 'scroll de la página restaurado')
    pass(`${screen.h1}: apertura modal, Escape, ×, fondo y retorno del foco`)

    // 3. Keyboard: Tab and Shift+Tab never reach the page behind; every control is reachable.
    await open(screen)
    const expected = ['Cerrar ventana', ...screen.links]
    const seen = new Set([await evaluate('qaFocus()')])
    for (const modifiers of [0, 8]) {
      for (let index = 0; index < expected.length + 2; index++) {
        await key('Tab', 9, modifiers)
        const focus = await evaluate(`(()=>{const a=document.activeElement,d=qaDialog();const inside=d.contains(a);const s=inside?getComputedStyle(a):null;return {inside,page:!inside&&a!==document.body&&a!==document.documentElement,name:inside?qaText(a):null,ring:!s||(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2)}})()`)
        assert.equal(focus.page, false, `${screen.slug}: el foco salió a la página`)
        if (focus.inside) { seen.add(focus.name); assert.ok(focus.ring, `${screen.slug}: foco visible en ${focus.name}`) }
      }
    }
    assert.deepEqual([...seen].sort(), [...expected].sort(), `${screen.slug}: controles alcanzables con Tab`)
    if (screen.links.length) {
      // Enter on a link follows it and closes the dialog.
      await evaluate(`qaBtn(${JSON.stringify(screen.links[1])},qaDialog()).focus()`)
      await key('Enter', 13)
      await wait(`!qaDialog()&&detailQa.router.state.location.pathname==='/admin/teachers/30'`, 'Enter sigue el enlace del perfil docente')
      assert.notEqual(await evaluate(`getComputedStyle(document.body).overflow`), 'hidden')
    } else {
      await key('Escape', 27)
      await closed(`${screen.slug}: Escape tras navegar con teclado`)
    }
    pass(`${screen.h1}: teclado (${[...seen].join(' → ')})${screen.links.length ? ' y Enter en enlace' : ''}`)
    assert.deepEqual(await evaluate('detailQa.unexpected'), [], `${screen.slug}: sin peticiones inesperadas`)
  }

  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ passed }, null, 2))
  console.log(`QA detalles admin: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
