// Optional real-browser QA with mocked transport; run from the frontend root.
// Requires locally installed Chrome. It never connects to or modifies backend.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'
import { createServer } from 'vite'

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminCalendarPage} from '/src/features/portal-calendar/pages/AdminCalendarPage.tsx';
import {PortalDialog} from '/src/shared/components/PortalDialog/PortalDialog.tsx';
import {ConfirmDialog} from '/src/shared/components/ConfirmDialog/ConfirmDialog.tsx';
import {DataTable} from '/src/shared/components/DataTable/DataTable.tsx';
import {PortalField} from '/src/features/portal-shared/PortalUi.tsx';
import {AdminStatusBadge} from '/src/features/portal-shared/AdminStatusBadge.tsx';
import sharedStyles from '/src/features/portal-shared/portalShared.module.css';
const e=React.createElement, root=createRoot(document.getElementById('root'));
const category={id:73,name:'Institucional'};
const initial={id:47,title:'Jornada institucional',description:'Actividad de prueba de visibilidad.',
  starts_at:'2026-11-05T09:00:00-04:00',ends_at:'2026-11-05T11:00:00-04:00',
  all_day:false,location:'Auditorio',category,status:'PUBLISHED',visibility:'PRIVATE',
  revision:7,created_by:10,updated_by:10,published_at:'2026-11-01T10:00:00-04:00'};
let record={...initial},key=0;
const qa=window.visibilityQa={calls:[],reset(values={}){
  record={...initial,...values};qa.calls=[];
  root.render(e(MemoryRouter,{key:++key},e('main',{style:{maxWidth:1200,margin:'16px auto'}},e(AdminCalendarPage))));
},client:{
  async get(url,options={}){
    qa.calls.push({method:'get',url,params:options.params});
    if(url.endsWith('event-categories'))return {data:{data:[category]}};
    if(url.endsWith('/history'))return {data:{data:[{id:35,action:'PORTAL_EVENT_UPDATED',actor_id:10,actor_name:'Administradora',created_at:'2026-11-01T15:00:00Z',old_values:{visibility:'PRIVATE'},new_values:{visibility:'PUBLIC'}}],links:{prev:null,next:null},meta:{current_page:1,last_page:1,per_page:15,total:1}}};
    if(url.endsWith('/47'))return {data:{data:{...record}}};
    return {data:{data:!options.params?.visibility||options.params.visibility===record.visibility?[{...record}]:[],meta:{current_page:1,last_page:1,per_page:15,total:1}}};
  },
  async patch(url,input){
    qa.calls.push({method:'patch',url,input});record={...record,...input,revision:record.revision+1};return {data:{data:{...record}}};
  }
}};
function SharedUiQa(){
  const [drawer,setDrawer]=React.useState(false),[confirm,setConfirm]=React.useState(false),[legacy,setLegacy]=React.useState(false);
  return e('main',{className:sharedStyles.page},
    e('h1',null,'Infraestructura compartida'),
    e(AdminStatusBadge,{status:'PENDING_CHANGES'}),
    e('button',{onClick:()=>setDrawer(true)},'Abrir Drawer compartido'),
    e('button',{onClick:()=>setLegacy(true)},'Abrir confirmación compatible'),
    e(DataTable,{columns:[{id:'title',header:'Título',accessorKey:'title'}],data:[{id:1,title:'Contenido real de la prueba'}],loading:false,onSearch(){},
      filters:e(PortalField,{label:'Estado'},e('select',{name:'qa-state'},e('option',null,'Todos')))}),
    drawer?e(PortalDialog,{drawer:true,title:'Editor compartido',closeBlocked:confirm,onClose:()=>setDrawer(false),
      footer:e('button',{onClick:()=>setConfirm(true)},'Cerrar editor compartido')},
      e(PortalField,{label:'Título'},e('input',{name:'qa-title',defaultValue:'Datos conservados'})),
      ...Array.from({length:35},(_,index)=>e('p',{key:index},'Contenido desplazable '+index))):null,
    e(ConfirmDialog,{native:true,isOpen:confirm,title:'¿Descartar los cambios?',message:'Se perderán los cambios sin guardar.',cancelLabel:'Seguir editando',confirmLabel:'Descartar cambios',variant:'danger',onCancel:()=>setConfirm(false),onConfirm:()=>{setConfirm(false);setDrawer(false)}}),
    e(ConfirmDialog,{isOpen:legacy,title:'Confirmación compatible',message:'Conserva el modo anterior.',onCancel:()=>setLegacy(false),onConfirm:()=>setLegacy(false)}));
}
qa.showShared=()=>root.render(e(MemoryRouter,{key:++key},e(SharedUiQa)));
qa.reset();
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('event-visibility')
  const profile = browserProfile.dir
  const evidence = join(process.cwd(), '.validation.local', 'eventVisibility')
  await mkdir(evidence, { recursive: true })
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'event-visibility-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__event-visibility.js') return '\0event-visibility-qa'
        },
        load(id) {
          if (id === '\0event-visibility-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.visibilityQa.client.get(...args),patch:(...args)=>window.visibilityQa.client.patch(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__event-visibility') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__event-visibility',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__event-visibility.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__event-visibility')).status, 200)
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
  const pending = new Map(),
    errors = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.text)
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      message.params.type === 'error'
    )
      errors.push(
        message.params.args
          .map((argument) => argument.value ?? argument.description)
          .join(' '),
      )
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
  const wait = async (expression) => {
    for (let index = 0; index < 100; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(
      `Timeout ${expression}: ${await evaluate('document.body.innerText')}; ${errors.join('; ')}`,
    )
  }
  const click = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(label)});if(!button||button.disabled)return false;button.click();return true})()`,
      ),
      label,
    )
    await pause(50)
  }
  const select = async (selector, value) => {
    await evaluate(
      `(()=>{const select=document.querySelector(${JSON.stringify(selector)});select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
    )
    await pause(50)
  }
  const screenshot = async (name) => {
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: origin + '/__event-visibility' })
  await wait('document.querySelector("td[data-label=Visibilidad]")')
  console.log('QA: pantalla administrativa cargada')
  const visibilityConfirmation = `document.querySelector(${JSON.stringify('[aria-label="Confirmar cambio de visibilidad"]')})`
  for (const width of [1440, 768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await evaluate('window.visibilityQa.reset()')
    await wait(
      'document.querySelector("td[data-label=Visibilidad]")?.textContent==="Privado"',
    )
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
      `${width}: page overflow`,
    )
    await screenshot(`${width}-list`)
    await click('Gestionar')
    await wait('document.querySelector("dialog[open] input[name=title]")')
    await click('×')
    await wait('!document.querySelector("dialog[open]")')
    assert.equal(
      await evaluate(
        '[...document.querySelectorAll("dialog")].some(dialog=>dialog.innerText.includes("¿Descartar los cambios?"))',
      ),
      false,
      `${width}: unmodified form closes without confirmation`,
    )

    await click('Gestionar')
    await wait('document.querySelector("dialog[open] input[name=title]")')
    await evaluate(
      `(()=>{const input=document.querySelector('dialog[open] input[name=title]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Cambio sin guardar');input.dispatchEvent(new Event('input',{bubbles:true}))})()`,
    )
    await pause(50)
    await click('×')
    await wait(
      '[...document.querySelectorAll("dialog[open]")].some(dialog=>dialog.innerText.includes("¿Descartar los cambios?"))',
    )
    assert.equal(
      await evaluate(
        'document.querySelector("dialog input[name=title]").value',
      ),
      'Cambio sin guardar',
    )
    assert.ok(
      await evaluate(
        `(()=>{const dialog=[...document.querySelectorAll('dialog[open]')].find(item=>item.innerText.includes('¿Descartar los cambios?'));const rect=dialog.getBoundingClientRect();return Math.abs((rect.left+rect.width/2)-innerWidth/2)<2&&Math.abs((rect.top+rect.height/2)-innerHeight/2)<2&&document.activeElement?.textContent.trim()==='Seguir editando'})()`,
      ),
      `${width}: confirmation is centered and focused`,
    )
    await screenshot(`${width}-unsaved-confirmation`)
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
    })
    await wait('document.querySelectorAll("dialog[open]").length===1')
    assert.equal(
      await evaluate(
        'document.querySelector("dialog input[name=title]").value',
      ),
      'Cambio sin guardar',
    )
    await click('Cancelar')
    await wait(
      '[...document.querySelectorAll("dialog[open]")].some(dialog=>dialog.innerText.includes("¿Descartar los cambios?"))',
    )
    await click('Seguir editando')
    await wait('document.querySelectorAll("dialog[open]").length===1')
    assert.equal(
      await evaluate(
        'document.querySelector("dialog input[name=title]").value',
      ),
      'Cambio sin guardar',
    )
    await click('Cancelar')
    await wait(
      '[...document.querySelectorAll("dialog[open]")].some(dialog=>dialog.innerText.includes("¿Descartar los cambios?"))',
    )
    await click('Descartar cambios')
    await wait('!document.querySelector("dialog[open]")')

    await click('Gestionar')
    await wait('document.querySelector("dialog[open] select[name=visibility]")')
    assert.equal(
      await evaluate(
        'document.querySelector("dialog select[name=visibility]").value',
      ),
      'PRIVATE',
    )
    assert.ok(
      await evaluate(
        'document.querySelector("dialog").innerText.includes("Visibilidad: Privado")',
      ),
    )
    await select('dialog select[name=visibility]', 'PUBLIC')
    await click('Guardar cambios')
    await wait(visibilityConfirmation)
    assert.ok(
      await evaluate(
        'document.querySelector("dialog").innerText.includes("Público aparecerá inmediatamente")',
      ),
    )
    assert.equal(
      await evaluate(
        'window.visibilityQa.calls.filter(call=>call.method==="patch").length',
      ),
      0,
    )
    await evaluate(`${visibilityConfirmation}.scrollIntoView({block:"center"})`)
    await evaluate(
      'Promise.all(document.getAnimations().map(animation => animation.finished))',
    )
    assert.ok(
      await evaluate(
        '(()=>{const d=document.querySelector("dialog"),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&d.scrollWidth<=d.clientWidth+1})()',
      ),
      `${width}: dialog overflow`,
    )
    await screenshot(`${width}-private-to-public`)
    await click('Volver')
    assert.equal(
      await evaluate(
        'window.visibilityQa.calls.filter(call=>call.method==="patch").length',
      ),
      0,
    )
    await click('Guardar cambios')
    await click('Confirmar cambio de visibilidad')
    await wait('!document.querySelector("dialog")')
    assert.equal(
      await evaluate(
        'window.visibilityQa.calls.find(call=>call.method==="patch").input.visibility',
      ),
      'PUBLIC',
    )
    await click('Gestionar')
    await wait('document.querySelector("dialog[open] select[name=visibility]")')
    await select('dialog select[name=visibility]', 'PRIVATE')
    await click('Guardar cambios')
    await wait(visibilityConfirmation)
    assert.ok(
      await evaluate(
        'document.querySelector("dialog").innerText.includes("Privado dejará de aparecer inmediatamente")',
      ),
    )
    await evaluate(`${visibilityConfirmation}.scrollIntoView({block:"center"})`)
    await screenshot(`${width}-public-to-private`)
    await click('Confirmar cambio de visibilidad')
    await wait('!document.querySelector("dialog")')
    assert.equal(
      await evaluate(
        'window.visibilityQa.calls.filter(call=>call.method==="patch").at(-1).input.visibility',
      ),
      'PRIVATE',
    )
    console.log(
      `PASS ${width}px: cambios sin guardar, selector, advertencias y confirmaciones; sin desborde horizontal`,
    )
  }
  for (const width of [1440, 768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await evaluate('window.visibilityQa.showShared()')
    await wait('document.querySelector("select[name=qa-state]")')
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    assert.ok(
      await evaluate(
        'Boolean(document.querySelector("select[name=qa-state]").closest("[role=group]"))',
      ),
    )
    await click('Abrir Drawer compartido')
    await wait('document.querySelector("dialog[open] footer")')
    await evaluate(
      'Promise.all(document.getAnimations().map(animation=>animation.finished))',
    )
    assert.ok(
      await evaluate(
        `(()=>{const d=document.querySelector('dialog[open]'),body=d.querySelector('header').nextElementSibling,footer=d.querySelector('footer'),r=footer.getBoundingClientRect();body.scrollTop=body.scrollHeight;return body.scrollHeight>body.clientHeight&&r.bottom<=innerHeight+1&&r.top>=0&&d.scrollWidth<=d.clientWidth+1&&document.body.style.overflow==='hidden'})()`,
      ),
      `${width}: shared footer and body scroll`,
    )
    await evaluate('document.querySelector("dialog footer button").focus()')
    await click('Cerrar editor compartido')
    await wait('document.querySelector("dialog[open][role=alertdialog]")')
    assert.ok(
      await evaluate(
        `(()=>{const confirmation=document.querySelector('dialog[role=alertdialog]'),input=document.querySelector('input[name=qa-title]');input.focus();return confirmation.contains(document.activeElement)&&document.body.style.overflow==='hidden'})()`,
      ),
      `${width}: background is inert`,
    )
    await screenshot(`${width}-shared-drawer`)
    await click('Seguir editando')
    await wait('!document.querySelector("dialog[role=alertdialog]")')
    assert.ok(
      await evaluate(
        `document.activeElement.textContent==='Cerrar editor compartido'&&document.body.style.overflow==='hidden'&&document.querySelector('input[name=qa-title]').value==='Datos conservados'`,
      ),
      `${width}: focus, values and scroll lock survive nested confirmation`,
    )
    await click('Cerrar editor compartido')
    await wait('document.querySelector("dialog[open][role=alertdialog]")')
    await click('Descartar cambios')
    await wait('!document.querySelector("dialog[open]")')
    assert.equal(await evaluate('document.body.style.overflow'), '')
    await click('Abrir confirmación compatible')
    await wait('document.querySelector("div[role=alertdialog]")')
    await click('Cancelar')
    await wait('!document.querySelector("[role=alertdialog]")')
    assert.equal(await evaluate('document.body.style.overflow'), '')
    console.log(
      `PASS ${width}px: componentes compartidos, filtros, badge, footer fijo, scroll, foco y compatibilidad de confirmaciones`,
    )
  }
  assert.deepEqual(errors, [])
  console.log(`Capturas: ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
