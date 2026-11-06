// Browser regression for F2.3–F2.4 filters with simulated transport (run from the
// frontend root; requires local Chrome). No backend data is read or changed.
// Services and Information/FAQ: an active search survives filter changes and
// "Limpiar filtros" (which clears only the module filter and returns focus to its
// select); DataTable's own "Limpiar" clears the search; filter changes go back to
// page 1 without remounting the collection; the Secciones/FAQ view is kept; the
// Services Estado filter sits inline with the search row; no overflow at 320/390.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'admin-filters')
await mkdir(evidence, { recursive: true })
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminInformationPage} from '/src/features/portal-information/AdminInformationPage.tsx';
import {AdminServicesPage} from '/src/features/portal-services/AdminServicesPage.tsx';
const e=React.createElement, root=createRoot(document.getElementById('root'));
const paginate=(rows,p={})=>{const per=15,cur=p.page??1,last=Math.max(1,Math.ceil(rows.length/per));return {data:{data:rows.slice((cur-1)*per,cur*per),links:{first:'?page=1',last:'?page='+last,prev:cur>1?'?page='+(cur-1):null,next:cur<last?'?page='+(cur+1):null},meta:{current_page:cur,last_page:last,per_page:per,total:rows.length}}}};
const services=Array.from({length:20},(_,i)=>({id:i+1,name:'Servicio '+(i+1),description:'Descripción '+(i+1),icon:'link',url:'https://s'+(i+1)+'.umss.edu.bo/',display_order:i+1,status:i%2?'INACTIVE':'ACTIVE',revision:1,needs_review:false}));
const content={title:'Sección',description:'Texto institucional',links:[],sort_order:1};
const sections=Array.from({length:20},(_,i)=>({id:i+1,key:'k'+i,revision:1,is_published:i%2===0,has_unpublished_changes:false,draft:{...content,title:'Sección '+(i+1)},published:{...content,title:'Sección '+(i+1)},published_at:null,created_by:1,updated_by:1}));
const faqs=Array.from({length:5},(_,i)=>({id:100+i,key:null,revision:1,is_published:i%2===0,has_unpublished_changes:false,draft:{question:'¿Sección pregunta '+(i+1)+'?',answer:'Respuesta',sort_order:i},published:null,published_at:null,created_by:1,updated_by:1}));
const qa=window.adminFiltersQa={calls:[],client:{
  async get(url,options={}){
    const p=options.params??{};
    qa.calls.push({url,params:{...p}});
    const text=(value)=>!p.search||value.toLowerCase().includes(String(p.search).toLowerCase());
    if(url==='/admin/portal/services')return paginate(services.filter(r=>text(r.name)&&(!p.status||r.status===p.status)),p);
    if(url==='/admin/portal/information/sections')return paginate(sections.filter(r=>text(r.draft.title)&&(p.is_published===undefined||Number(r.is_published)===p.is_published)),p);
    if(url==='/admin/portal/information/faqs')return paginate(faqs.filter(r=>text(r.draft.question)&&(p.is_published===undefined||Number(r.is_published)===p.is_published)),p);
    throw new Error('Unexpected GET '+url);
  },
  async post(){throw new Error('Unexpected POST')},
  async patch(){throw new Error('Unexpected PATCH')},
  async delete(){throw new Error('Unexpected DELETE')},
}};
const pages={information:AdminInformationPage,services:AdminServicesPage};
qa.show=(name)=>{qa.calls=[];root.render(e(MemoryRouter,{key:name},e(pages[name])))};
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('admin-filters')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'admin-filters-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__admin-filters.js') return '\0admin-filters-qa'
        },
        load(id) {
          if (id === '\0admin-filters-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.adminFiltersQa.client.get(...args),post:(...args)=>window.adminFiltersQa.client.post(...args),patch:(...args)=>window.adminFiltersQa.client.patch(...args),delete:(...args)=>window.adminFiltersQa.client.delete(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__admin-filters') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__admin-filters',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__admin-filters.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__admin-filters')).status, 200)
  console.log('QA: servidor local listo; iniciando Chrome sin ventana')
  chrome = spawn(
    process.env.EIDA_QA_CHROME ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  let launchError
  chrome.on('error', (error) => {
    launchError = error
  })
  let port
  for (let index = 0; index < 80; index++) {
    if (launchError) throw launchError
    try {
      port = Number(
        (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
          '\n',
        )[0],
      )
      break
    } catch {
      await pause(250)
    }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  ws = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((done, reject) => {
    ws.addEventListener('open', done, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let id = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error
        ? request.reject(new Error(message.error.message))
        : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      )
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      )
    return result.result.value
  }
  const state = () =>
    evaluate(`(()=>{
      const active=document.activeElement;
      return {
        input:document.querySelector('input[type=search]')?.value??null,
        selects:[...document.querySelectorAll('[role=group] select')].map(select=>select.value),
        clearFilters:[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Limpiar filtros'),
        rows:document.querySelectorAll('tbody tr').length,
        page:(document.body.innerText.match(/Página (\\d+) de/)||[])[1]??null,
        focusLabel:active?.tagName==='SELECT'?active.closest('label')?.firstChild?.textContent.trim():active?.tagName,
        mounted:Boolean(document.querySelector('[data-qa-mounted]')),
      };
    })()`)
  const wait = async (expression, label = expression) => {
    for (let index = 0; index < 80; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(`Timeout ${label}: ${JSON.stringify(await state())}`)
  }
  const press = async (key, code, keyCode, text) => {
    await send('Input.dispatchKeyEvent', {
      type: text ? 'keyDown' : 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      ...(text ? { text } : {}),
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode: keyCode,
    })
    await pause(60)
  }
  const viewport = async (width) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    })
    await pause(200)
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  const lastQuery = (path) =>
    evaluate(
      `adminFiltersQa.calls.filter(call=>call.url===${JSON.stringify(path)}).at(-1)?.params`,
    )
  const settled = (path) =>
    wait(
      `adminFiltersQa.calls.some(call=>call.url===${JSON.stringify(path)}) && !document.body.innerText.includes('Cargando registros')`,
      `${path} cargado`,
    )
  const clickButton = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&!node.disabled);if(!button)return false;button.focus();button.click();return true})()`,
      ),
      label,
    )
    await pause(200)
  }
  const chooseFilter = async (index, value) => {
    await evaluate(
      `(()=>{const select=document.querySelectorAll('[role=group] select')[${index}];select.focus();Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(value)});select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await pause(200)
  }
  const search = async (value) => {
    await evaluate(
      `(()=>{const input=document.querySelector('input[type=search]');input.focus();input.select()})()`,
    )
    for (const char of value) await press(char, '', 0, char)
    await press('Enter', 'Enter', 13, '\r')
    await pause(200)
  }
  const markMounted = () =>
    evaluate(
      `document.querySelector('table').closest('[class*=tableCard]').setAttribute('data-qa-mounted','1')`,
    )
  // Relative layout checks (no fixed coordinates).
  const filterLayout = () =>
    evaluate(`(()=>{
      const center=(node)=>{const r=node.getBoundingClientRect();return r.top+r.height/2};
      const group=document.querySelector('[role=group][aria-label=Filtros]');
      const card=group.closest('[class*=tableCard]').getBoundingClientRect();
      const select=group.querySelector('select');
      const label=select.closest('label');
      const buscar=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Buscar');
      const clear=[...group.querySelectorAll('button')].find(button=>button.textContent.trim()==='Limpiar filtros');
      const controls=[...group.querySelectorAll('select,button'),buscar,document.querySelector('input[type=search]')].filter(Boolean);
      return {
        selectVsBuscar:Math.abs(center(select)-center(buscar)),
        labelInline:label.getBoundingClientRect().height<select.getBoundingClientRect().height+8,
        clearVsSelect:clear?Math.abs(center(clear)-center(select)):null,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        inside:controls.every(node=>{const r=node.getBoundingClientRect();return r.left>=card.left-1&&r.right<=card.right+1}),
        clipped:controls.filter(node=>node.scrollWidth>node.clientWidth+1).length,
      };
    })()`)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: origin + '/__admin-filters' })
  await wait('window.adminFiltersQa?.show', 'demo')
  await viewport(1440)

  // ---------- Services ----------
  await evaluate(`adminFiltersQa.show('services')`)
  await wait(`document.querySelectorAll('tbody tr').length===15`, 'Servicios')
  await markMounted()
  let layout = await filterLayout()
  assert.ok(layout.labelInline, 'Servicios: la etiqueta Estado está en línea con su select')
  assert.ok(layout.selectVsBuscar <= 2, `Servicios: Estado alineado con Buscar (${JSON.stringify(layout)})`)
  assert.equal((await state()).clearFilters, false, 'Servicios: sin filtro no hay "Limpiar filtros"')
  await search('Servicio')
  await settled('/admin/portal/services')
  await clickButton('Siguiente')
  await settled('/admin/portal/services')
  assert.deepEqual(
    (({ search: s, page }) => ({ search: s, page }))(await lastQuery('/admin/portal/services')),
    { search: 'Servicio', page: 2 },
  )
  await chooseFilter(0, 'INACTIVE')
  let query = await lastQuery('/admin/portal/services')
  let current = await state()
  assert.equal(query.search, 'Servicio', 'Servicios: el filtro conserva la búsqueda')
  assert.equal(query.status, 'INACTIVE')
  assert.equal(query.page, 1, 'Servicios: cambiar el filtro vuelve a la página 1')
  assert.equal(current.input, 'Servicio')
  assert.equal(current.clearFilters, true)
  // F2.6: with Estado active, "Limpiar filtros" stays on the select's row and the
  // whole filter row stays aligned with "Buscar" (centres within 2 px).
  for (const width of [1440, 1024]) {
    await viewport(width)
    layout = await filterLayout()
    assert.ok(
      layout.clearVsSelect !== null && layout.clearVsSelect <= 2,
      `Servicios ${width}px con Estado activo: "Limpiar filtros" en la fila del select (${JSON.stringify(layout)})`,
    )
    assert.ok(
      layout.selectVsBuscar <= 2,
      `Servicios ${width}px con Estado activo: Estado alineado con Buscar (${JSON.stringify(layout)})`,
    )
    assert.ok(layout.overflow <= 0 && layout.inside && layout.clipped === 0)
  }
  await viewport(1440)
  await chooseFilter(0, 'ACTIVE')
  query = await lastQuery('/admin/portal/services')
  assert.equal(query.search, 'Servicio', 'Servicios: alternar Estado conserva la búsqueda')
  assert.equal(query.status, 'ACTIVE')
  await shot('servicios-filtro-activo-1440')
  await clickButton('Limpiar filtros')
  query = await lastQuery('/admin/portal/services')
  current = await state()
  assert.equal(query.status, '', 'Servicios: "Limpiar filtros" restablece Estado')
  assert.equal(query.search, 'Servicio', 'Servicios: "Limpiar filtros" conserva la búsqueda')
  assert.equal(query.page, 1)
  assert.deepEqual(current.selects, [''])
  assert.equal(current.input, 'Servicio')
  assert.equal(current.clearFilters, false)
  assert.equal(current.focusLabel, 'Estado', 'Servicios: el foco vuelve al select Estado')
  assert.equal(current.mounted, true, 'Servicios: la colección no se remonta')
  await clickButton('Limpiar')
  query = await lastQuery('/admin/portal/services')
  current = await state()
  assert.equal(query.search, '', 'Servicios: "Limpiar" del buscador borra la búsqueda')
  assert.equal(query.page, 1)
  assert.equal(current.input, '')
  for (const width of [320, 390]) {
    await viewport(width)
    await chooseFilter(0, 'INACTIVE')
    layout = await filterLayout()
    assert.ok(layout.overflow <= 0, `Servicios ${width}px: sin desborde horizontal`)
    assert.ok(layout.inside, `Servicios ${width}px: controles dentro de la tarjeta`)
    assert.equal(layout.clipped, 0, `Servicios ${width}px: sin controles recortados`)
    await shot(`servicios-${width}`)
    await clickButton('Limpiar filtros')
  }
  console.log('PASS Servicios: búsqueda + Estado, Limpiar filtros, Limpiar búsqueda, página 1, foco, sin remontar, 320/390')

  // ---------- Information / FAQ ----------
  await viewport(1440)
  await evaluate(`adminFiltersQa.show('information')`)
  await wait(`document.querySelectorAll('tbody tr').length===15`, 'Información')
  await markMounted()
  assert.equal((await state()).clearFilters, false, 'Información: sin filtro no hay "Limpiar filtros"')
  await search('Sección')
  await settled('/admin/portal/information/sections')
  await clickButton('Siguiente')
  await settled('/admin/portal/information/sections')
  assert.equal((await lastQuery('/admin/portal/information/sections')).page, 2)
  await chooseFilter(1, '0')
  query = await lastQuery('/admin/portal/information/sections')
  current = await state()
  assert.equal(query.search, 'Sección', 'Información: el filtro conserva la búsqueda')
  assert.equal(query.is_published, 0)
  assert.equal(query.page, 1, 'Información: cambiar el filtro vuelve a la página 1')
  assert.equal(current.clearFilters, true)
  await shot('informacion-filtro-activo-1440')
  await clickButton('Limpiar filtros')
  query = await lastQuery('/admin/portal/information/sections')
  current = await state()
  assert.equal(query.is_published, undefined, 'Información: "Limpiar filtros" restablece Visibilidad')
  assert.equal(query.search, 'Sección', 'Información: "Limpiar filtros" conserva la búsqueda')
  assert.deepEqual(current.selects, ['sections', ''], 'Información: la vista Secciones se conserva')
  assert.equal(current.focusLabel, 'Visibilidad', 'Información: el foco vuelve al select Visibilidad')
  await chooseFilter(0, 'faqs')
  await settled('/admin/portal/information/faqs')
  await chooseFilter(1, '1')
  query = await lastQuery('/admin/portal/information/faqs')
  assert.equal(query.search, 'Sección', 'FAQ: la búsqueda se conserva al cambiar de vista')
  assert.equal(query.is_published, 1)
  await clickButton('Limpiar filtros')
  current = await state()
  assert.deepEqual(current.selects, ['faqs', ''], 'FAQ: limpiar no cambia la vista')
  assert.equal(current.input, 'Sección')
  assert.equal(current.mounted, true, 'Información: la colección no se remonta')
  await clickButton('Limpiar')
  assert.equal((await lastQuery('/admin/portal/information/faqs')).search, '', 'FAQ: "Limpiar" del buscador borra la búsqueda')
  for (const width of [320, 390]) {
    await viewport(width)
    await chooseFilter(1, '0')
    layout = await filterLayout()
    assert.ok(layout.overflow <= 0, `Información ${width}px: sin desborde horizontal`)
    assert.ok(layout.inside, `Información ${width}px: controles dentro de la tarjeta`)
    assert.equal(layout.clipped, 0, `Información ${width}px: sin controles recortados`)
    await shot(`informacion-${width}`)
    await clickButton('Limpiar filtros')
  }
  console.log('PASS Información/FAQ: búsqueda + Visibilidad, Limpiar filtros, vista conservada, foco, sin remontar, 320/390')

  assert.deepEqual(errors, [])
  console.log(`QA filtros administrativos: PASS · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
