// Browser QA for D4.3 with simulated transport. No backend data is read or changed.
// Reproduces: edit -> Escape (confirm) -> Escape (cancel confirm) -> Escape on the
// Drawer, plus unexpected native closes, and checks focus and scroll restoration.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'd4.3-portal-dialog')
await mkdir(evidence, { recursive: true })
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminServicesPage} from '/src/features/portal-services/AdminServicesPage.tsx';
const e=React.createElement, root=createRoot(document.getElementById('root'));
const rows=[
  {id:42,name:'WebSISS',description:'Acceso al sistema de información estudiantil.',icon:'link',url:'https://websiss.umss.edu.bo/',display_order:1,status:'ACTIVE',revision:7,needs_review:false},
  {id:43,name:'Biblioteca digital',description:'Catálogo de la biblioteca.',icon:'link',url:'https://biblioteca.umss.edu.bo/',display_order:2,status:'INACTIVE',revision:3,needs_review:false},
];
window.servicesEscapeQa={rows,calls:[],listDelay:0,client:{
  async get(url,options={}){
    window.servicesEscapeQa.calls.push({method:'get',url});
    if(url==='/admin/portal/services'){
      await new Promise(done=>setTimeout(done,window.servicesEscapeQa.listDelay));
      return {data:{data:rows.map(row=>({...row})),links:{first:null,last:null,prev:null,next:null},meta:{current_page:1,last_page:1,per_page:15,total:rows.length}}};
    }
    const id=Number(url.split('/').pop());
    if(url.startsWith('/admin/portal/services/'))return {data:{data:rows.find(row=>row.id===id)}};
    throw new Error('Unexpected GET '+url);
  },
  async post(url){window.servicesEscapeQa.calls.push({method:'post',url});throw new Error('Unexpected POST')},
  async patch(url,body){window.servicesEscapeQa.calls.push({method:'patch',url,body});
    const match=url.match(/^\\/admin\\/portal\\/services\\/(\\d+)\\/status$/);
    if(!match)throw new Error('Unexpected PATCH '+url);
    const row=rows.find(item=>item.id===Number(match[1]));
    Object.assign(row,{status:body.status,revision:row.revision+1});
    return {data:{data:{...row}}};
  },
  async delete(url){window.servicesEscapeQa.calls.push({method:'delete',url});throw new Error('Unexpected DELETE')},
}};
root.render(e(MemoryRouter,{initialEntries:['/admin/portal/services']},e(AdminServicesPage)));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('services-escape')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'services-escape-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__services-escape.js') return '\0services-escape-qa'
        },
        load(id) {
          if (id === '\0services-escape-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.servicesEscapeQa.client.get(...args),post:(...args)=>window.servicesEscapeQa.client.post(...args),patch:(...args)=>window.servicesEscapeQa.client.patch(...args),delete:(...args)=>window.servicesEscapeQa.client.delete(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__services-escape') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__services-escape',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__services-escape.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__services-escape')).status, 200)
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
  const wait = async (expression, label = expression) => {
    for (let index = 0; index < 80; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(`Timeout ${label}: ${JSON.stringify(await state())}`)
  }
  // Real keyboard input through CDP. Escape does not grant user activation,
  // so consecutive Escapes reproduce Chrome's close-request anti-abuse rule.
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
    await pause(150)
  }
  const escape = () => press('Escape', 'Escape', 27)
  const type = async (value) => {
    for (const char of value) await press(char, '', 0, char)
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  const state = () =>
    evaluate(`(()=>{
      const dialogs=[...document.querySelectorAll('dialog')];
      const drawer=dialogs.find(d=>d.querySelector('h2')?.textContent==='Gestionar servicio');
      const confirm=dialogs.find(d=>d.innerText.includes('¿Descartar los cambios?'));
      const rect=drawer?.getBoundingClientRect();
      const top=drawer?.open?document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2):null;
      const confirmRect=confirm?.open?confirm.firstElementChild.getBoundingClientRect():null;
      const topAtConfirm=confirmRect?document.elementFromPoint(confirmRect.left+confirmRect.width/2,confirmRect.top+confirmRect.height/2):null;
      const active=document.activeElement;
      return {
        drawerMounted:Boolean(drawer),
        drawerOpen:Boolean(drawer?.open),
        drawerVisible:Boolean(drawer?.open&&rect.width>0&&rect.height>0&&drawer.contains(top)||confirm?.open),
        confirmOpen:Boolean(confirm?.open),
        confirmOnTop:Boolean(confirm?.open&&confirm.contains(topAtConfirm)),
        name:drawer?.querySelector('input[name=name]')?.value??null,
        bodyOverflow:getComputedStyle(document.body).overflow,
        focusInDrawer:Boolean(drawer?.contains(active)),
        focusInConfirm:Boolean(confirm?.contains(active)),
        focus:active?.tagName+':'+(active?.textContent||active?.name||'').trim().slice(0,30),
        focusIsTrigger:active?.getAttribute('data-qa-trigger')==='1',
      };
    })()`)
  const click = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const scope=[...document.querySelectorAll('dialog[open]')].at(-1)??document;const el=[...scope.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&!node.disabled);if(!el)return false;el.focus();el.click();return true})()`,
      ),
      label,
    )
    await pause(150)
  }
  const assertEditing = (current, message) => {
    assert.equal(current.drawerMounted, true, message + ': Drawer montado')
    assert.equal(current.drawerOpen, true, message + ': Drawer abierto nativamente')
    assert.equal(current.drawerVisible, true, message + ': Drawer visible')
    assert.match(current.name ?? '', /WebSISS editado/, message + ': borrador conservado')
    assert.equal(current.bodyOverflow, 'hidden', message + ': scroll de página bloqueado')
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: origin + '/__services-escape' })
  await wait(
    `document.querySelector('h1')?.textContent==='Gestión de servicios' && document.querySelectorAll('tbody tr').length===2`,
    'tabla de servicios',
  )
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow`), 'visible')

  await evaluate(
    `(()=>{const button=[...document.querySelectorAll('tbody button')].find(node=>node.textContent.trim()==='Gestionar');button.setAttribute('data-qa-trigger','1');button.focus()})()`,
  )
  await press('Enter', 'Enter', 13, '\r')
  await wait(`document.querySelector('dialog[open] input[name=name]')`, 'Drawer de edición')
  let current = await state()
  assert.equal(current.focusInDrawer, true, 'foco inicial dentro del Drawer')
  await evaluate(
    `(()=>{const input=document.querySelector('dialog[open] input[name=name]');input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`,
  )
  await type(' editado')
  console.log('PASS edición real con teclado')

  for (let cycle = 1; cycle <= 3; cycle++) {
    await escape()
    current = await state()
    assertEditing(current, `ciclo ${cycle} Escape 1`)
    assert.equal(current.confirmOpen, true, `ciclo ${cycle}: confirmación abierta`)
    assert.equal(current.confirmOnTop, true, `ciclo ${cycle}: confirmación encima del Drawer`)
    assert.equal(current.focusInConfirm, true, `ciclo ${cycle}: foco en la confirmación`)
    if (cycle === 1) await shot('01-confirmacion-descarte')
    await escape()
    current = await state()
    assertEditing(current, `ciclo ${cycle} Escape 2`)
    assert.equal(current.confirmOpen, false, `ciclo ${cycle}: confirmación cancelada`)
    assert.equal(current.focusInDrawer, true, `ciclo ${cycle}: foco vuelve al Drawer`)
  }
  await escape()
  current = await state()
  assertEditing(current, 'Escape tras tres ciclos')
  assert.equal(current.confirmOpen, true)
  await shot('02-escape-repetido-sin-cierre-forzado')
  console.log('PASS Escape → Escape → Escape (x3 ciclos) mantiene Drawer, borrador y confirmación')

  await click('Seguir editando')
  current = await state()
  assertEditing(current, 'Seguir editando')
  assert.equal(current.confirmOpen, false)
  assert.equal(current.focusInDrawer, true, 'Seguir editando devuelve el foco al Drawer')
  console.log('PASS Seguir editando conserva Drawer visible, borrador y foco')

  // Unexpected native close (e.g. a close request the component did not receive).
  await evaluate(`document.querySelector('dialog[open]').close()`)
  await pause(200)
  current = await state()
  assertEditing(current, 'cierre nativo inesperado')
  assert.equal(current.confirmOpen, false)
  assert.equal(current.focusInDrawer, true, 'foco recuperado en el Drawer reabierto')
  console.log('PASS cierre nativo inesperado: el Drawer se reabre sincronizado con React')

  await escape()
  await wait(`[...document.querySelectorAll('dialog[open]')].some(d=>d.innerText.includes('¿Descartar los cambios?'))`, 'confirmación')
  await evaluate(
    `[...document.querySelectorAll('dialog')].find(d=>d.querySelector('h2')?.textContent==='Gestionar servicio').close()`,
  )
  await pause(200)
  current = await state()
  assertEditing(current, 'cierre nativo con confirmación abierta')
  assert.equal(current.confirmOpen, true)
  assert.equal(current.confirmOnTop, true, 'la confirmación sigue encima tras reabrir el Drawer')
  await shot('03-cierre-nativo-con-confirmacion')
  console.log('PASS cierre nativo con confirmación abierta mantiene el orden del top layer')

  await click('Descartar cambios')
  await wait(`!document.querySelector('dialog')`, 'cierre del Drawer')
  current = await state()
  assert.equal(current.drawerMounted, false)
  assert.equal(current.bodyOverflow, 'visible', 'scroll de página restaurado')
  assert.equal(current.focusIsTrigger, true, `foco restaurado en Gestionar (${current.focus})`)
  assert.equal(
    await evaluate(`servicesEscapeQa.calls.filter(call=>call.method!=='get').length`),
    0,
    'sin escrituras',
  )
  await shot('04-descartado-foco-restaurado')
  console.log('PASS descartar cierra Drawer, restaura scroll y foco en Gestionar')

  // Clean Drawer: a single Escape still closes it.
  await evaluate(
    `document.querySelector('[data-qa-trigger]').click()`,
  )
  await wait(`document.querySelector('dialog[open] input[name=name]')`, 'Drawer limpio')
  await escape()
  await wait(`!document.querySelector('dialog')`, 'cierre con Escape sin cambios')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow`), 'visible')
  console.log('PASS Escape sin cambios cierra el Drawer')

  // D4.5.1: status change refreshes the table; closing restores focus to the
  // same row's "Gestionar" because the rows stay mounted during the refresh.
  await evaluate('servicesEscapeQa.listDelay=600')
  for (const [rowName, close] of [
    ['Biblioteca digital', 'button'],
    ['WebSISS', 'escape'],
  ]) {
    await evaluate(
      `(()=>{document.querySelectorAll('[data-qa-focus]').forEach(node=>node.removeAttribute('data-qa-focus'));const row=[...document.querySelectorAll('tbody tr')].find(tr=>tr.innerText.includes(${JSON.stringify(rowName)}));const button=[...row.querySelectorAll('button')].find(node=>node.textContent.trim()==='Gestionar');button.setAttribute('data-qa-focus',${JSON.stringify(rowName)});button.focus()})()`,
    )
    await press('Enter', 'Enter', 13, '\r')
    await wait(`document.querySelector('dialog[open] [data-status]')`, `Drawer ${rowName}`)
    const before = await evaluate(`document.querySelector('dialog[open] [data-status]').dataset.status`)
    const action = before === 'ACTIVE' ? 'Desactivar' : 'Activar'
    const listCalls = await evaluate(`servicesEscapeQa.calls.filter(call=>call.url==='/admin/portal/services').length`)
    await click(action)
    await wait(`document.querySelectorAll('dialog[open]').length===2`, `confirmación ${action}`)
    const confirmLabel = await evaluate(
      `[...[...document.querySelectorAll('dialog[open]')].at(-1).querySelectorAll('button')].map(button=>button.textContent.trim()).find(text=>text.startsWith('Confirmar'))`,
    )
    await click(confirmLabel)
    await wait(
      `servicesEscapeQa.calls.filter(call=>call.url==='/admin/portal/services').length>${listCalls}`,
      'recarga de la tabla',
    )
    const during = await evaluate(`(()=>{const list=document.querySelector('[aria-busy]:not(dialog)');return {busy:list?.getAttribute('aria-busy'),rows:document.querySelectorAll('tbody tr').length,triggerConnected:Boolean(document.querySelector('[data-qa-focus]')),loader:document.body.innerText.includes('Cargando registros')}})()`)
    assert.equal(during.busy, 'true', `${rowName}: aria-busy durante la recarga`)
    assert.equal(during.rows, 2, `${rowName}: filas conservadas durante la recarga`)
    assert.equal(during.triggerConnected, true, `${rowName}: el botón Gestionar sigue montado`)
    assert.equal(during.loader, false, `${rowName}: sin loader destructivo`)
    await wait(
      `document.querySelector('[aria-busy]:not(dialog)')?.getAttribute('aria-busy')==='false'`,
      'fin de la recarga',
    )
    const after = await evaluate(`(()=>{const row=[...document.querySelectorAll('tbody tr')].find(tr=>tr.innerText.includes(${JSON.stringify(rowName)}));return row.querySelector('[data-status]').dataset.status})()`)
    assert.notEqual(after, before, `${rowName}: la tabla muestra el estado actualizado`)
    if (close === 'button') {
      await evaluate(`document.querySelector('dialog[open] button[aria-label="Cerrar ventana"]').click()`)
    } else {
      await evaluate(`document.querySelector('dialog[open] input[name=name]').focus()`)
      await escape()
    }
    await wait(`!document.querySelector('dialog')`, `cierre ${rowName}`)
    const focus = await evaluate(`(()=>{const active=document.activeElement;return {qa:active?.getAttribute('data-qa-focus'),text:active?.textContent.trim(),overflow:getComputedStyle(document.body).overflow}})()`)
    assert.equal(focus.qa, rowName, `${rowName}: foco restaurado en su Gestionar (${focus.text})`)
    assert.equal(focus.overflow, 'visible')
    await shot(`05-foco-restaurado-${close}`)
    console.log(`PASS ${action} + recarga + cierre (${close === 'button' ? '×' : 'Escape'}): filas conservadas con aria-busy y foco en Gestionar de ${rowName}`)
  }

  assert.deepEqual(errors, [])
  console.log(`QA D4.3/D4.5.1: PASS · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
