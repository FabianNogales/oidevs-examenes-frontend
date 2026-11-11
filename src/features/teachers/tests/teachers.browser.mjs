// Browser QA for the Teachers admin dialogs (G1): the real page with a data router and a stateful
// simulated httpClient (no backend). Covers «Registrar docente» (PortalDialog) and the status
// confirmation (native ConfirmDialog): opening, initial focus, Escape (also while busy), backdrop
// press, focus return, validation, actions and layout at 320/390/768/1024/1440px.
// Selectors use roles, text and accessible names only (no classes).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.TEACHERS_QA_OUTPUT ?? 'teachers-dialogs')
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
import {AdminTeachersPage} from '/src/features/teachers/pages/AdminTeachersPage.tsx';
const e=React.createElement;
const qa=window.teachersQa={calls:[],unexpected:[],teachers:[],hold:null};
const seed=()=>[
  {id:1,institutional_code:'QA-DOC-1',identity_number:'1001',first_names:'Docente',last_names:'QA Activo',email:'docente.activo@example.edu',status:'ACTIVE'},
  {id:2,institutional_code:'QA-DOC-2',identity_number:'1002',first_names:'Docente',last_names:'QA Inactivo',email:'docente.inactivo@example.edu',status:'INACTIVE'}];
qa.reset=()=>{qa.teachers=seed();qa.calls=[];qa.unexpected=[];qa.hold=null};
qa.reset();
// qa.holdNext() keeps the next write pending until qa.release() (busy state).
qa.holdNext=()=>{let release;const gate=new Promise(done=>{release=done});qa.hold={gate,release}};
qa.release=()=>{qa.hold?.release();qa.hold=null};
const fail=(status,data={})=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data}});
const gate=async()=>{if(qa.hold)await qa.hold.gate};
qa.client={
  get:async(url,config={})=>{qa.calls.push({method:'get',url,params:config.params});if(url==='/admin/teachers')return {data:{data:qa.teachers.map(t=>({...t})),meta:{current_page:1,last_page:1,per_page:10,total:qa.teachers.length}}};qa.unexpected.push('get '+url);throw fail(404)},
  post:async(url,payload)=>{qa.calls.push({method:'post',url,payload});if(url!=='/admin/teachers'){qa.unexpected.push('post '+url);throw fail(501)}await gate();const teacher={id:qa.teachers.length+1,status:'ACTIVE',...payload};qa.teachers.push(teacher);return {data:{data:teacher}}},
  patch:async(url,payload)=>{qa.calls.push({method:'patch',url,payload});const t=qa.teachers.find(t=>url==='/admin/teachers/'+t.id+'/status');if(!t){qa.unexpected.push('patch '+url);throw fail(404)}await gate();t.status=payload.status;return {data:{data:{...t}}}},
  put:async(url)=>{qa.unexpected.push('put '+url);throw fail(501)},
  delete:async(url)=>{qa.unexpected.push('delete '+url);throw fail(501)},
};
const routes=[{path:'/admin/teachers',element:e('main',null,e(AdminTeachersPage))},{path:'*',element:e('main',null,e('h1',null,'Otra ruta QA'))}];
const root=createRoot(document.getElementById('root'));
qa.show=()=>root.render(e(RouterProvider,{key:Math.random(),router:createMemoryRouter(routes,{initialEntries:['/admin/teachers']})}));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('teachers-dialogs')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'teachers-dialogs-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__teachers-qa.js') return '\0teachers-dialogs-qa' },
      load(id) {
        if (id === '\0teachers-dialogs-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.teachersQa.client.get(...a),post:(...a)=>window.teachersQa.client.post(...a),put:(...a)=>window.teachersQa.client.put(...a),patch:(...a)=>window.teachersQa.client.patch(...a),delete:(...a)=>window.teachersQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({notify(){}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__teachers-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__teachers-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__teachers-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__teachers-qa')).status, 200)
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
  await send('Page.navigate', { url: origin + '/__teachers-qa' })
  await wait('!!window.teachersQa?.show', 'arranque')
  await evaluate(`window.qaText=(el)=>(el.getAttribute('aria-label')||el.textContent).replace(/\\s+/g,' ').trim();
    window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>qaText(b)===text);
    window.qaFill=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))};
    window.qaDialog=()=>document.querySelector('dialog[open]');
    window.qaFocus=()=>document.activeElement?qaText(document.activeElement):null;
    window.qaCalls=(method)=>teachersQa.calls.filter(c=>c.method===method);true`)
  const click = (text, scope = 'document') => evaluate(`(()=>{const b=qaBtn(${JSON.stringify(text)},${scope});if(!b)throw new Error('no existe: '+${JSON.stringify(text)});b.focus();b.click();return true})()`)
  const key = async (name, code) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code })
    await pause(120)
  }
  const escape = () => key('Escape', 27)
  const pressBackdrop = async () => {
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, x: 3, y: 3, button: 'left', clickCount: 1 })
    await pause(120)
  }
  const show = async () => {
    await evaluate(`teachersQa.reset();teachersQa.show()`)
    await wait(`document.body.innerText.includes('QA-DOC-1')&&document.body.innerText.includes('QA-DOC-2')`, 'listado')
  }
  const OPEN = '+Registrar docente'
  const openForm = async () => {
    await click(OPEN)
    await wait(`qaDialog()&&document.activeElement?.tagName==='INPUT'`, 'formulario abierto con foco en el primer campo')
  }
  const inDialog = `(()=>{const d=qaDialog().getBoundingClientRect();return d.left>=-1&&d.top>=-1&&d.right<=innerWidth+1&&d.bottom<=innerHeight+1})()`

  // 1. Layout of the page and both dialogs at five widths (also the visual evidence).
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await show()
    const page = await evaluate(`({scroll:document.documentElement.scrollWidth,vw:innerWidth,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim())})`)
    assert.ok(page.scroll <= page.vw + 1, `${width}px desbordamiento de la página ${page.scroll}`)
    assert.deepEqual(page.h1, ['Gestión de docentes'])
    await openForm()
    assert.ok(await evaluate(inDialog), `${width}px el formulario cabe en la ventana`)
    const form = await evaluate(`(()=>{const d=qaDialog();return {scroll:d.scrollWidth<=d.clientWidth+1,buttons:['Cancelar','Registrar docente','Cerrar ventana'].map(t=>{const b=qaBtn(t,d);const r=b?.getBoundingClientRect();const box=d.getBoundingClientRect();return !!b&&r.width>0&&r.left>=box.left-1&&r.right<=box.right+1})}})()`)
    assert.ok(form.scroll, `${width}px formulario sin desbordamiento horizontal`)
    assert.deepEqual(form.buttons, [true, true, true], `${width}px acciones del formulario visibles`)
    let shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `registrar-${width}.png`), Buffer.from(shot.data, 'base64'))
    await escape()
    await wait('!qaDialog()', 'formulario cerrado')
    await click('Desactivar')
    await wait(`qaDialog()&&!!qaBtn('Sí, desactivar',qaDialog())`, 'confirmación abierta')
    assert.ok(await evaluate(inDialog), `${width}px la confirmación cabe en la ventana`)
    assert.ok(await evaluate(`(()=>{const d=qaDialog();const box=d.getBoundingClientRect();return ['Cancelar','Sí, desactivar'].every(t=>{const r=qaBtn(t,d).getBoundingClientRect();return r.width>0&&r.left>=box.left-1&&r.right<=box.right+1})})()`), `${width}px acciones de la confirmación visibles`)
    shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `estado-${width}.png`), Buffer.from(shot.data, 'base64'))
    await escape()
    await wait('!qaDialog()', 'confirmación cerrada')
    pass(`${width}px: página sin desbordamiento; formulario y confirmación dentro de la ventana`)
  }

  // 2. Registrar docente: semantics, initial focus, Escape, close button, cancel and focus return.
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })
  await show()
  await openForm()
  const semantics = await evaluate(`(()=>{const d=qaDialog();const title=document.getElementById(d.getAttribute('aria-labelledby'));return {modal:d.matches(':modal'),title:title?.textContent.trim(),tag:title?.tagName,subtitle:d.querySelector('header p')?.textContent.trim(),first:document.activeElement===d.querySelector('input'),labels:[...d.querySelectorAll('label')].map(l=>l.querySelector('span').textContent.trim())}})()`)
  assert.deepEqual(semantics, { modal: true, title: 'Registrar docente', tag: 'H2', subtitle: 'Nuevo registro', first: true,
    labels: ['Código institucional*', 'Carnet de identidad*', 'Nombres*', 'Apellidos*', 'Correo institucional*'] })
  pass('registrar: <dialog> modal etiquetado por su h2, subtítulo y foco inicial en el primer campo')
  await escape()
  await wait('!qaDialog()', 'Escape cierra el formulario')
  assert.equal(await evaluate('qaFocus()'), OPEN, 'Escape devuelve el foco a «Registrar docente»')
  await openForm()
  await click('Cerrar ventana', 'qaDialog()')
  await wait('!qaDialog()', 'el botón × cierra')
  assert.equal(await evaluate('qaFocus()'), OPEN, '× devuelve el foco')
  await openForm()
  await click('Cancelar', 'qaDialog()')
  await wait('!qaDialog()', 'Cancelar cierra')
  assert.equal(await evaluate('qaFocus()'), OPEN, 'Cancelar devuelve el foco')
  await openForm()
  await pressBackdrop()
  assert.ok(await evaluate('!!qaDialog()'), 'pulsar el fondo no cierra el formulario (comportamiento previo)')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow`), 'hidden', 'scroll de la página bloqueado')
  pass('registrar: Escape, ×, Cancelar y retorno del foco; el fondo no cierra')

  // 3. Registrar docente: validation, busy state and a valid save.
  await click('Registrar docente', 'qaDialog()')
  await wait(`qaDialog().querySelectorAll('[aria-invalid=true]').length===5`, 'errores de validación')
  assert.ok(await evaluate(`qaDialog().querySelector('[role=alert]').textContent.includes('Revisa los campos marcados')`))
  assert.equal(await evaluate(`qaCalls('post').length`), 0)
  await evaluate(`(()=>{const i=[...qaDialog().querySelectorAll('input')];['QA-DOC-3','1003','Docente','QA Nuevo','Docente.Nuevo@Example.edu'].forEach((v,n)=>qaFill(i[n],v));return true})()`)
  await wait(`!qaDialog().querySelector('[aria-invalid=true]')`, 'errores limpiados al escribir')
  await evaluate('teachersQa.holdNext();true')
  await click('Registrar docente', 'qaDialog()')
  await wait(`!!qaBtn('Guardando...',qaDialog())`, 'guardado en curso')
  assert.equal(await evaluate(`qaDialog().getAttribute('aria-busy')`), 'true')
  assert.equal(await evaluate(`qaBtn('Cerrar ventana',qaDialog()).disabled`), true)
  await escape()
  assert.ok(await evaluate('!!qaDialog()'), 'Escape no cierra mientras se guarda')
  await evaluate('teachersQa.release();true')
  await wait(`!qaDialog()&&document.body.innerText.includes('El docente fue registrado correctamente.')`, 'docente registrado')
  assert.deepEqual(await evaluate(`qaCalls('post')[0].payload`), { institutional_code: 'QA-DOC-3', identity_number: '1003', first_names: 'Docente', last_names: 'QA Nuevo', email: 'docente.nuevo@example.edu' })
  await wait(`document.body.innerText.includes('QA-DOC-3')`, 'listado recargado')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow`) === 'hidden', false, 'scroll de la página restaurado')
  pass('registrar: validación, Escape bloqueado al guardar, envío normalizado y recarga')

  // 4. Status confirmation: semantics, Escape, cancel, backdrop, focus return and both actions.
  await show()
  await click('Desactivar')
  await wait(`qaDialog()&&!!qaBtn('Sí, desactivar',qaDialog())`, 'confirmación de desactivar')
  const confirm = await evaluate(`(()=>{const d=qaDialog();return {modal:d.matches(':modal'),role:d.getAttribute('role'),title:document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim(),message:document.getElementById(d.getAttribute('aria-describedby'))?.textContent.trim(),inside:d.contains(document.activeElement)}})()`)
  assert.deepEqual(confirm, { modal: true, role: 'alertdialog', title: 'Desactivar docente', inside: true,
    message: 'El docente dejará de tener acceso al sistema hasta que vuelva a ser activado. Docente: Docente QA Activo.' })
  await pressBackdrop()
  assert.ok(await evaluate('!!qaDialog()'), 'pulsar el fondo no cierra la confirmación (comportamiento previo)')
  await escape()
  await wait('!qaDialog()', 'Escape cancela la confirmación')
  assert.equal(await evaluate('qaFocus()'), 'Desactivar', 'Escape devuelve el foco al botón de la fila')
  await click('Desactivar')
  await wait(`qaDialog()&&!!qaBtn('Cancelar',qaDialog())`, 'confirmación reabierta')
  await click('Cancelar', 'qaDialog()')
  await wait('!qaDialog()', 'Cancelar cierra la confirmación')
  assert.equal(await evaluate('qaFocus()'), 'Desactivar', 'Cancelar devuelve el foco')
  assert.equal(await evaluate(`qaCalls('patch').length`), 0, 'cancelar no escribe')
  await click('Desactivar')
  await wait(`qaDialog()&&!!qaBtn('Sí, desactivar',qaDialog())`, 'confirmación para desactivar')
  await evaluate('teachersQa.holdNext();true')
  await click('Sí, desactivar', 'qaDialog()')
  await wait(`!!qaBtn('Procesando...',qaDialog())`, 'cambio de estado en curso')
  await escape()
  assert.ok(await evaluate('!!qaDialog()'), 'Escape no cierra mientras se procesa')
  await evaluate('teachersQa.release();true')
  await wait(`!qaDialog()&&document.body.innerText.includes('El docente fue desactivado correctamente.')`, 'docente desactivado')
  await wait(`[...document.querySelectorAll('button')].filter(b=>qaText(b)==='Activar').length===2`, 'fila actualizada')
  assert.ok(await evaluate(`document.activeElement!==document.body&&document.body.contains(document.activeElement)`), 'el foco vuelve a la página tras confirmar')
  await click('Activar')
  await wait(`qaDialog()&&!!qaBtn('Sí, activar',qaDialog())`, 'confirmación de activar')
  assert.ok(await evaluate(`document.getElementById(qaDialog().getAttribute('aria-describedby')).textContent.startsWith('El docente volverá a tener acceso al sistema.')`))
  await click('Sí, activar', 'qaDialog()')
  await wait(`!qaDialog()&&document.body.innerText.includes('El docente fue activado correctamente.')`, 'docente activado')
  assert.deepEqual(await evaluate(`qaCalls('patch').map(c=>[c.url,c.payload.status])`), [['/admin/teachers/1/status', 'INACTIVE'], ['/admin/teachers/1/status', 'ACTIVE']])
  pass('estado: alertdialog modal, Escape, Cancelar, fondo, retorno del foco, bloqueo al procesar y ambas acciones')

  assert.deepEqual(await evaluate('teachersQa.unexpected'), [])
  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ passed }, null, 2))
  console.log(`QA Docentes: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
