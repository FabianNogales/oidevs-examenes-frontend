// Browser QA for the Rooms module (DS2.2c): real components with a data router and a stateful
// simulated httpClient (no backend). Covers listing, search, status filter, clear filters, pagination,
// create (with validation errors), edit, detail, activate/deactivate, header link navigation,
// keyboard focus and layout at 320/390/768/1440px. Selectors use roles, text and ids only (no classes),
// so the same script validates the module before and after a visual migration.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.ROOMS_QA_OUTPUT ?? 'rooms-module')
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
import {AdminRoomsPage} from '/src/features/rooms/pages/AdminRoomsPage.tsx';
import {ImportRoomsPage} from '/src/features/rooms/pages/ImportRoomsPage.tsx';
const e=React.createElement;
const qa=window.roomsQa={calls:[],unexpected:[],rooms:[]};
const seed=()=>Array.from({length:18},(_,i)=>({id:i+1,code:'QA-'+String(101+i),name:'Aula QA '+(101+i),location:'Bloque QA',floor:'1',capacity:30+i,description:null,status:i%5===4?'INACTIVE':'ACTIVE',availability:'AVAILABLE',current_exam:null}));
qa.reset=()=>{qa.rooms=seed();qa.calls=[];qa.unexpected=[]};
qa.reset();
const fail=(status,data={})=>Object.assign(new Error('QA HTTP '+status),{isAxiosError:true,response:{status,data}});
const list=(params={})=>{const term=(params.search||'').toLowerCase();let rows=qa.rooms.filter(r=>(!term||r.code.toLowerCase().includes(term)||r.name.toLowerCase().includes(term))&&(!params.status||r.status===params.status));
  const per=params.per_page||15,page=params.page||1,last=Math.max(1,Math.ceil(rows.length/per));const data=rows.slice((page-1)*per,page*per);
  return {data,meta:{current_page:page,last_page:last,per_page:per,total:rows.length,from:data.length?(page-1)*per+1:null,to:data.length?(page-1)*per+data.length:null}}};
const byId=(url)=>qa.rooms.find(r=>r.id===Number(url.split('/')[3]));
qa.client={
  get:async(url,config={})=>{qa.calls.push({method:'get',url,params:config.params});if(url==='/admin/rooms')return {data:list(config.params)};const r=byId(url);if(r)return {data:{data:{...r}}};qa.unexpected.push('get '+url);throw fail(404)},
  post:async(url,payload)=>{qa.calls.push({method:'post',url,payload});if(url!=='/admin/rooms'){qa.unexpected.push('post '+url);throw fail(501)}const room={id:qa.rooms.length+1,status:'ACTIVE',availability:'AVAILABLE',current_exam:null,...payload};qa.rooms.unshift(room);return {data:{data:room}}},
  put:async(url,payload)=>{qa.calls.push({method:'put',url,payload});const r=byId(url);if(!r){qa.unexpected.push('put '+url);throw fail(404)}Object.assign(r,payload);return {data:{data:{...r}}}},
  patch:async(url,payload)=>{qa.calls.push({method:'patch',url,payload});const r=byId(url);if(!r||!url.endsWith('/status')){qa.unexpected.push('patch '+url);throw fail(404)}r.status=payload.status;return {data:{data:{...r}}}},
  delete:async(url)=>{qa.unexpected.push('delete '+url);throw fail(501)},
};
const routes=[{path:'/admin/rooms',element:e('main',null,e(AdminRoomsPage))},{path:'/admin/rooms/import',element:e('main',null,e(ImportRoomsPage))}];
const root=createRoot(document.getElementById('root'));
qa.show=(path)=>root.render(e(RouterProvider,{key:Math.random(),router:createMemoryRouter(routes,{initialEntries:[path]})}));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('rooms-module')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'rooms-module-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__rooms-qa.js') return '\0rooms-module-qa' },
      load(id) {
        if (id === '\0rooms-module-qa') return demo
        const normalized = id.replaceAll('\\', '/')
        if (normalized.endsWith('/src/shared/api/httpClient.ts'))
          return 'export const httpClient={get:(...a)=>window.roomsQa.client.get(...a),post:(...a)=>window.roomsQa.client.post(...a),put:(...a)=>window.roomsQa.client.put(...a),patch:(...a)=>window.roomsQa.client.patch(...a),delete:(...a)=>window.roomsQa.client.delete(...a)};'
        if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts')) return 'export const useAuth=()=>({notify(){}});'
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__rooms-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__rooms-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__rooms-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__rooms-qa')).status, 200)
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
  // Page helpers: find controls by accessible text, fill React inputs, change selects.
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__rooms-qa' })
  await wait('!!window.roomsQa?.show', 'arranque')
  await evaluate(`window.qaBtn=(text,root=document)=>[...root.querySelectorAll('button,a')].find(b=>(b.getAttribute('aria-label')||b.textContent).trim()===text);
    window.qaFill=(el,value)=>{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))};
    window.qaSelect=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('change',{bubbles:true}))};
    window.qaLastList=()=>roomsQa.calls.filter(c=>c.method==='get'&&c.url==='/admin/rooms').at(-1)?.params;
    window.qaDialog=()=>document.querySelector('dialog[open]');true`)
  const click = (text, scope = 'document') => evaluate(`(()=>{const b=qaBtn(${JSON.stringify(text)},${scope});if(!b)throw new Error('no existe: '+${JSON.stringify(text)});b.click();return true})()`)
  const show = async () => {
    await evaluate(`roomsQa.reset();roomsQa.show('/admin/rooms')`)
    await wait(`document.body.innerText.includes('QA-101')`, 'listado')
  }

  // 1. Layout at four widths (also the visual evidence).
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await show()
    const layout = await evaluate(`(()=>{const vw=innerWidth;const off=[...document.querySelectorAll('#root *')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.right>vw+1&&getComputedStyle(el).position!=='fixed'}).slice(0,5).map(el=>el.tagName);
      const h1=[...document.querySelectorAll('h1')];return {scroll:document.documentElement.scrollWidth,vw,off,h1:h1.map(h=>h.textContent.trim()),actions:['+ Importar aulas (CSV)','+ Registrar aula','Buscar'].map(t=>{const b=qaBtn(t);const r=b?.getBoundingClientRect();return !!b&&r.width>0&&r.right<=vw+1})}})()`)
    assert.ok(layout.scroll <= layout.vw + 1, `${width}px desbordamiento ${layout.scroll} ${layout.off}`)
    assert.deepEqual(layout.h1, ['Gestión de aulas'])
    assert.deepEqual(layout.actions, [true, true, true], `${width}px acciones visibles`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `aulas-${width}.png`), Buffer.from(shot.data, 'base64'))
    pass(`${width}px: listado, h1, acciones visibles, sin desbordamiento`)
  }

  // 2. Search, status filter, clear filters and pagination.
  await show()
  assert.deepEqual(await evaluate('qaLastList()'), { page: 1, per_page: 15 })
  await evaluate(`qaFill(document.getElementById('rooms-search'),'QA-110');true`)
  await click('Buscar')
  await wait(`qaLastList()?.search==='QA-110'`, 'búsqueda enviada')
  await wait(`!document.body.innerText.includes('QA-101')&&document.body.innerText.includes('QA-110')`, 'resultado de búsqueda')
  assert.ok(await evaluate(`!!qaBtn('Limpiar filtros')`), 'aparece Limpiar filtros')
  await click('Limpiar filtros')
  await wait(`qaLastList()?.search===undefined&&!qaBtn('Limpiar filtros')&&document.getElementById('rooms-search').value===''`, 'filtros limpios')
  await evaluate(`qaSelect([...document.querySelectorAll('select')].find(s=>s.closest('form[role=search]')),'INACTIVE');true`)
  await wait(`qaLastList()?.status==='INACTIVE'&&document.body.innerText.includes('QA-105')&&!document.body.innerText.includes('QA-101')`, 'filtro de estado')
  await click('Limpiar filtros')
  await wait(`qaLastList()?.status===undefined&&document.body.innerText.includes('QA-101')`, 'filtro limpio')
  assert.equal(await evaluate(`qaBtn('Anterior').disabled`), true)
  await click('Siguiente')
  await wait(`qaLastList()?.page===2&&document.body.innerText.includes('QA-118')`, 'página 2')
  assert.equal(await evaluate(`qaBtn('Anterior').disabled`), false)
  pass('búsqueda, filtro de estado, limpiar filtros y paginación')

  // 3. Create: required errors linked to the fields, focus on the first error, then a valid save.
  await show()
  await click('+ Registrar aula')
  await wait(`qaDialog()&&document.activeElement?.name==='code'`, 'diálogo de creación con foco en Código')
  const fields = await evaluate(`[...qaDialog().querySelectorAll('input,textarea')].map(el=>({name:el.name,label:document.querySelector('label[for="'+el.id+'"]')?.textContent.replace(/\\s+/g,' ').trim(),labelOk:document.querySelector('label[for="'+el.id+'"]')?.control===el,required:el.required,hint:(el.getAttribute('aria-describedby')||'').split(' ').filter(Boolean).map(i=>document.getElementById(i)?.textContent.trim())}))`)
  assert.deepEqual(fields.map((f) => f.name), ['code', 'name', 'location', 'floor', 'capacity', 'description'])
  assert.ok(fields.every((f) => f.labelOk), 'cada campo tiene su label asociado')
  assert.deepEqual(fields.filter((f) => f.required).map((f) => f.name), ['code', 'name'])
  assert.deepEqual(fields.find((f) => f.name === 'capacity').hint, ['Opcional. Indica un número entero de personas.'])
  await click(`Registrar aula`, 'qaDialog()')
  await wait(`qaDialog().querySelector('[name=code]').getAttribute('aria-invalid')==='true'`, 'errores de validación')
  const invalid = await evaluate(`[...qaDialog().querySelectorAll('[aria-invalid=true]')].map(el=>({name:el.name,described:(el.getAttribute('aria-describedby')||'').split(' ').map(i=>document.getElementById(i)?.textContent.trim())}))`)
  assert.deepEqual(invalid, [
    { name: 'code', described: ['El campo código es obligatorio.'] },
    { name: 'name', described: ['El campo nombre es obligatorio.'] },
  ])
  assert.equal(await evaluate(`document.activeElement?.name`), 'code', 'foco en el primer error')
  assert.equal(await evaluate(`roomsQa.calls.filter(c=>c.method==='post').length`), 0)
  await evaluate(`const d=qaDialog();qaFill(d.querySelector('[name=code]'),'QA-303');qaFill(d.querySelector('[name=name]'),'Aula QA 303');qaFill(d.querySelector('[name=capacity]'),'25');true`)
  await wait(`!qaDialog().querySelector('[aria-invalid=true]')`, 'errores limpiados al escribir')
  await click('Registrar aula', 'qaDialog()')
  await wait(`!qaDialog()&&document.body.innerText.includes('Aula QA-303 registrada correctamente.')`, 'aula registrada')
  const post = await evaluate(`roomsQa.calls.find(c=>c.method==='post').payload`)
  assert.equal(post.code, 'QA-303')
  assert.equal(post.name, 'Aula QA 303')
  pass('crear: label, required, ayuda, errores con aria-describedby, foco y guardado')

  // 4. Edit and detail.
  await click('Editar QA-101')
  await wait(`qaDialog()?.querySelector('[name=name]')?.value==='Aula QA 101'`, 'edición cargada')
  await evaluate(`qaFill(qaDialog().querySelector('[name=name]'),'Aula QA 101 editada');true`)
  await click('Guardar cambios', 'qaDialog()')
  await wait(`!qaDialog()&&document.body.innerText.includes('Aula QA-101 actualizada correctamente.')`, 'aula actualizada')
  assert.equal(await evaluate(`roomsQa.calls.find(c=>c.method==='put').payload.name`), 'Aula QA 101 editada')
  await click('Ver detalle de QA-102')
  await wait(`qaDialog()&&qaDialog().innerText.includes('QA-102')&&!!qaBtn('Editar aula',qaDialog())`, 'detalle')
  await click('Cerrar', 'qaDialog()')
  await wait('!qaDialog()', 'detalle cerrado')
  pass('editar y ver detalle')

  // 5. Deactivate and activate with confirmation.
  await click('Desactivar QA-102')
  await wait(`qaDialog()&&!!qaBtn('Sí, desactivar',qaDialog())`, 'confirmación de desactivar')
  await click('Sí, desactivar', 'qaDialog()')
  await wait(`!qaDialog()&&document.body.innerText.includes('Aula QA-102 desactivada correctamente.')`, 'desactivada')
  await wait(`!!qaBtn('Activar QA-102')`, 'listado recargado con QA-102 inactiva')
  await click('Activar QA-102')
  await wait(`qaDialog()&&!!qaBtn('Sí, activar',qaDialog())`, 'confirmación de activar')
  await click('Cancelar', 'qaDialog()')
  await wait('!qaDialog()', 'cancelar sin cambios')
  assert.deepEqual(await evaluate(`roomsQa.calls.filter(c=>c.method==='patch').map(c=>c.payload.status)`), ['INACTIVE'])
  pass('desactivar con confirmación y cancelar activación')

  // 6. Keyboard: focus order through the header and search controls, visible focus, disabled skipped.
  await show()
  await evaluate(`document.activeElement?.blur();true`)
  const order = []
  for (let index = 0; index < 7; index++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await pause(60)
    const focus = await evaluate(`(()=>{const el=document.activeElement;const s=getComputedStyle(el);return {name:(el.getAttribute('aria-label')||el.id||el.textContent||el.tagName).trim().slice(0,30),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)}})()`)
    order.push(focus.name)
    assert.ok(focus.outline !== 'none' && focus.width >= 2, `foco visible en ${focus.name}: ${focus.outline} ${focus.width}`)
  }
  assert.deepEqual(order.slice(0, 5), ['Inicio', '+ Importar aulas (CSV)', '+ Registrar aula', 'rooms-search', 'Buscar'])
  assert.ok(!order.includes('Anterior'), 'Anterior deshabilitado queda fuera del orden de foco')
  pass(`teclado: ${order.join(' → ')}`)

  // 7. Header link keeps its navigation.
  await click('+ Importar aulas (CSV)')
  await wait(`[...document.querySelectorAll('h1')].some(h=>h.textContent.trim()==='Importar aulas')`, 'navegación a Importar aulas')
  pass('enlace de cabecera navega a Importar aulas')

  assert.deepEqual(await evaluate('roomsQa.unexpected'), [])
  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ passed }, null, 2))
  console.log(`QA Aulas: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
