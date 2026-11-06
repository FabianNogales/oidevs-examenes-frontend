// Browser QA for E1.3/E1.6 with simulated transport. No backend data is read or changed.
// Escape while an inline status/visibility confirmation is pending cancels only
// that confirmation: the Drawer stays open, data is kept, no status request is
// sent and focus returns to the control that opened it. With unsaved changes the
// status actions are disabled so a status-only PATCH cannot discard them.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const profile = await mkdtemp(join(tmpdir(), 'eida-calendar-pending-'))
const evidence = join(process.cwd(), '.validation.local', 'e1.3-calendar-pending')
await mkdir(evidence, { recursive: true })
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminCalendarPage} from '/src/features/portal-calendar/pages/AdminCalendarPage.tsx';
const e=React.createElement;
const category={id:73,name:'Institucional'};
const event=(id,title,visibility)=>({id,title,description:'Actividad '+id,
  starts_at:'2026-11-0'+id+'T09:00:00-04:00',ends_at:'2026-11-0'+id+'T11:00:00-04:00',
  all_day:false,location:'Auditorio',category,status:'DRAFT',visibility,
  revision:3,created_by:10,updated_by:10,published_at:null});
const records=[event(1,'Jornada de bienvenida','PRIVATE'),Object.assign(event(2,'Jornada académica','PRIVATE'),{status:'PUBLISHED',published_at:'2026-11-01T10:00:00-04:00'})];
const qa=window.calendarPendingQa={records,calls:[],listDelay:0,patchDelay:0,client:{
  async get(url,options={}){
    qa.calls.push({method:'get',url,params:options.params});
    if(url.endsWith('event-categories'))return {data:{data:[category]}};
    if(url.endsWith('/history'))return {data:{data:[],links:{prev:null,next:null},meta:{current_page:1,last_page:1,per_page:15,total:0}}};
    const detail=url.match(/\\/admin\\/portal\\/events\\/(\\d+)$/);
    if(detail)return {data:{data:{...records.find(item=>item.id===Number(detail[1]))}}};
    if(url==='/admin/portal/events'){
      await new Promise(done=>setTimeout(done,qa.listDelay));
      const visibility=options.params?.visibility;
      const data=records.filter(item=>!visibility||item.visibility===visibility).map(item=>({...item}));
      return {data:{data,meta:{current_page:1,last_page:1,per_page:15,total:data.length}}};
    }
    throw new Error('Unexpected GET '+url);
  },
  async patch(url,input){
    qa.calls.push({method:'patch',url,input});
    await new Promise(done=>setTimeout(done,qa.patchDelay));
    const match=url.match(/\\/admin\\/portal\\/events\\/(\\d+)(?:\\/status)?$/);
    if(!match)throw new Error('Unexpected PATCH '+url);
    const record=records.find(item=>item.id===Number(match[1]));
    Object.assign(record,input,{revision:record.revision+1});
    return {data:{data:{...record}}};
  },
  async post(){throw new Error('Unexpected POST')},
}};
createRoot(document.getElementById('root')).render(e(MemoryRouter,null,e('main',{style:{maxWidth:1200,margin:'16px auto'}},e(AdminCalendarPage))));
`

let vite, chrome, ws
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'calendar-pending-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__calendar-pending.js') return '\0calendar-pending-qa'
        },
        load(id) {
          if (id === '\0calendar-pending-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.calendarPendingQa.client.get(...args),patch:(...args)=>window.calendarPendingQa.client.patch(...args),post:(...args)=>window.calendarPendingQa.client.post(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__calendar-pending') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__calendar-pending',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__calendar-pending.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__calendar-pending')).status, 200)
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
  const snapshot = () =>
    evaluate(`(()=>{
      const table=document.querySelector('table');
      const busy=table?.closest('[aria-busy]')??document.querySelector('[class*=adminTable]');
      const active=document.activeElement;
      return {
        rows:[...document.querySelectorAll('tbody tr')].map(tr=>tr.querySelector('td')?.innerText.trim()),
        busy:busy?.getAttribute('aria-busy')??null,
        loader:document.body.innerText.includes('Cargando eventos'),
        dialog:Boolean(document.querySelector('dialog')),
        triggerConnected:Boolean(document.querySelector('[data-qa-focus]')),
        focusQa:active?.getAttribute('data-qa-focus')??null,
        focusTag:active?.tagName,
        focusText:(active?.textContent??'').trim().slice(0,40),
        bodyOverflow:getComputedStyle(document.body).overflow,
      };
    })()`)
  const wait = async (expression, label = expression) => {
    for (let index = 0; index < 80; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(`Timeout ${label}: ${JSON.stringify(await snapshot())}`)
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
    await pause(120)
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  const openRow = async (title) => {
    await evaluate(
      `(()=>{document.querySelectorAll('[data-qa-focus]').forEach(node=>node.removeAttribute('data-qa-focus'));const row=[...document.querySelectorAll('tbody tr')].find(tr=>tr.innerText.includes(${JSON.stringify(title)}));const button=[...row.querySelectorAll('button')].find(node=>node.textContent.trim()==='Gestionar');button.setAttribute('data-qa-focus',${JSON.stringify(title)});button.focus()})()`,
    )
    await press('Enter', 'Enter', 13, '\r')
    await wait(`document.querySelector('dialog[open] input[name=title]')`, `Drawer ${title}`)
  }
  const save = async () => {
    const patches = await evaluate(`calendarPendingQa.calls.filter(call=>call.method==='patch').length`)
    await evaluate(`(()=>{const button=[...document.querySelectorAll('dialog[open] button[type=submit]')].find(node=>!node.disabled);button.focus()})()`)
    await press('Enter', 'Enter', 13, '\r')
    await wait(
      `calendarPendingQa.calls.filter(call=>call.method==='patch').length>${patches}`,
      'PATCH',
    )
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: origin + '/__calendar-pending' })
  await wait(
    `document.querySelector('h1')?.textContent==='Gestión del calendario' && document.querySelectorAll('tbody tr').length===2`,
    'tabla de eventos',
  )
  const state = () =>
    evaluate(`(()=>{
      const dialogs=[...document.querySelectorAll('dialog')];
      const drawer=dialogs.find(d=>d.querySelector('input[name=title]'));
      const active=document.activeElement;
      return {
        drawerOpen:Boolean(drawer?.open),
        discardOpen:dialogs.some(d=>d.open&&d.innerText.includes('¿Descartar los cambios?')),
        statusConfirm:Boolean(drawer?.querySelector('[aria-label="Confirmar cambio de estado"]')),
        visibilityConfirm:Boolean(drawer?.querySelector('[aria-label="Confirmar cambio de visibilidad"]')),
        title:drawer?.querySelector('input[name=title]')?.value??null,
        visibility:drawer?.querySelector('select[name=visibility]')?.value??null,
        statusPatches:calendarPendingQa.calls.filter(c=>c.method==='patch'&&c.url.endsWith('/status')).length,
        patches:calendarPendingQa.calls.filter(c=>c.method==='patch').length,
        focus:active?.tagName+':'+(active?.textContent||active?.name||'').trim().slice(0,30),
        focusInDrawer:Boolean(drawer?.contains(active)),
      };
    })()`)
  const escape = async () => {
    await press('Escape', 'Escape', 27)
    await pause(150)
  }
  const clickInDrawer = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const drawer=[...document.querySelectorAll('dialog[open]')].find(d=>d.querySelector('input[name=title]'));const button=[...drawer.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&!node.disabled);if(!button)return false;button.focus();button.click();return true})()`,
      ),
      label,
    )
    await pause(150)
  }
  let current

  // A. Pending status confirmation, clean form: Escape cancels only the confirmation.
  await openRow('Jornada de bienvenida')
  await clickInDrawer('Publicar')
  current = await state()
  assert.equal(current.statusConfirm, true, 'status confirmation shown')
  console.log('A.abierta', JSON.stringify(current))
  await shot('01-confirmacion-estado')
  await escape()
  current = await state()
  console.log('A.escape', JSON.stringify(current))
  assert.equal(current.drawerOpen, true, 'A: the Drawer stays open')
  assert.equal(current.statusConfirm, false, 'A: Escape cancels the pending confirmation')
  assert.equal(current.discardOpen, false, 'A: no discard confirmation for a clean form')
  assert.equal(current.statusPatches, 0, 'A: no status request')
  assert.equal(current.focus, 'BUTTON:Publicar', 'A: focus returns to the action that opened it')
  await escape()
  current = await state()
  assert.equal(current.drawerOpen, false, 'A: a later Escape closes a clean Drawer normally')
  console.log('PASS A: Escape cancela la confirmación de estado, conserva el Drawer y devuelve el foco a Publicar')

  // B (E1.6). Unsaved changes block status actions, so they can never be lost
  // by a status-only PATCH; saving and discarding keep working.
  const statusActions = () =>
    evaluate(`(()=>{const drawer=document.querySelector('dialog[open]');return [...drawer.querySelectorAll('[aria-label="Cambiar estado del evento"] button')].map(b=>{const hint=b.getAttribute('aria-describedby');return {text:b.textContent.trim(),disabled:b.disabled,hint:hint?document.getElementById(hint)?.textContent.trim()??'missing':null}})})()`)
  await openRow('Jornada de bienvenida')
  await evaluate(
    `(()=>{const input=document.querySelector('dialog[open] input[name=title]');input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`,
  )
  for (const char of ' editada') await press(char, '', 0, char)
  let actions = await statusActions()
  assert.deepEqual(
    actions.map((action) => [action.text, action.disabled, action.hint]),
    [
      ['Publicar', true, 'Guarda o descarta los cambios antes de cambiar el estado'],
      ['Cancelar evento', true, 'Guarda o descarta los cambios antes de cambiar el estado'],
    ],
    'B: status actions disabled and described while dirty',
  )
  assert.equal(
    await evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(n=>n.textContent.trim()==='Cancelar evento');b.click();return document.querySelector('[aria-label="Confirmar cambio de estado"]')===null})()`),
    true,
    'B: a click on a disabled status action cannot start a status change',
  )
  current = await state()
  assert.equal(current.statusConfirm, false)
  assert.equal(current.statusPatches, 0, 'B: no status request')
  assert.equal(current.title, 'Jornada de bienvenida editada')
  await shot('02-estado-bloqueado-con-cambios')
  await escape()
  current = await state()
  assert.equal(current.discardOpen, true, 'B: Escape with changes asks to discard')
  await escape()
  current = await state()
  assert.equal(current.drawerOpen, true, 'B: cancelling the discard keeps the Drawer')
  assert.equal(current.title, 'Jornada de bienvenida editada', 'B: form data kept')
  // Reverting the edit restores the status actions.
  await evaluate(`document.querySelector('dialog[open] input[name=title]').focus()`)
  for (let index = 0; index < ' editada'.length; index++)
    await press('Backspace', 'Backspace', 8)
  actions = await statusActions()
  assert.ok(actions.every((action) => !action.disabled && action.hint === null), 'B: clean form re-enables status actions')
  // Discard flow still works.
  for (const char of ' temporal') await press(char, '', 0, char)
  await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Cancelar'&&b.closest('form')).click()`)
  await pause(150)
  await evaluate(`[...[...document.querySelectorAll('dialog[open]')].at(-1).querySelectorAll('button')].find(b=>b.textContent.trim()==='Descartar cambios').click()`)
  await wait(`!document.querySelector('dialog[open]')`, 'descartar')
  assert.equal(
    await evaluate(`calendarPendingQa.records.find(r=>r.id===1).title`),
    'Jornada de bienvenida',
    'B: discarding sends nothing',
  )
  // Saving still works and keeps the edited content.
  await openRow('Jornada de bienvenida')
  await evaluate(
    `(()=>{const input=document.querySelector('dialog[open] input[name=title]');input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`,
  )
  for (const char of ' guardada') await press(char, '', 0, char)
  await clickInDrawer('Guardar cambios')
  await wait(`!document.querySelector('dialog[open]')`, 'guardar')
  const saved = await evaluate(`({record:calendarPendingQa.records.find(r=>r.id===1),last:calendarPendingQa.calls.filter(c=>c.method==='patch').at(-1)})`)
  assert.equal(saved.last.url, '/admin/portal/events/1', 'B: content save, not /status')
  assert.equal(saved.record.title, 'Jornada de bienvenida guardada', 'B: edited content persisted')
  assert.equal(saved.record.status, 'DRAFT', 'B: status unchanged by saving')
  assert.equal((await state()).statusPatches, 0)
  console.log('PASS B: con cambios sin guardar las acciones de estado están bloqueadas y descritas; guardar y descartar funcionan; sin pérdida de datos')

  // C. Pending visibility confirmation on a published event.
  const patchesBeforeC = (await state()).patches
  await openRow('Jornada académica')
  await evaluate(
    `(()=>{const select=document.querySelector('dialog[open] select[name=visibility]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'PUBLIC');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await pause(100)
  await clickInDrawer('Guardar cambios')
  current = await state()
  assert.equal(current.visibilityConfirm, true, 'C: visibility confirmation shown')
  assert.equal(current.patches, patchesBeforeC)
  await escape()
  current = await state()
  assert.equal(current.drawerOpen, true, 'C: the Drawer stays open')
  assert.equal(current.visibilityConfirm, false, 'C: the visibility confirmation is cancelled')
  assert.equal(current.discardOpen, false)
  assert.equal(current.visibility, 'PUBLIC', 'C: the selection is kept')
  assert.equal(current.patches, patchesBeforeC, 'C: nothing is saved')
  assert.equal(current.focus, 'BUTTON:Guardar cambios', 'C: focus returns to Guardar cambios')
  console.log('PASS C: Escape cancela la confirmación de visibilidad y conserva la selección')

  // D. Busy confirmation: Escape cannot cancel while the request runs; then it succeeds.
  await evaluate(
    `(()=>{const select=document.querySelector('dialog[open] select[name=visibility]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'PRIVATE');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await pause(100)
  await clickInDrawer('Despublicar')
  await evaluate('calendarPendingQa.patchDelay=800')
  await clickInDrawer('Confirmar cambio')
  await escape()
  current = await state()
  assert.equal(current.drawerOpen, true, 'D: Escape while busy does not close the Drawer')
  assert.equal(current.statusConfirm, true, 'D: Escape while busy does not cancel the request')
  await wait(`!document.querySelector('dialog[open]')`, 'cierre tras confirmar')
  current = await state()
  assert.equal(current.statusPatches, 1, 'D: exactly one status request')
  assert.equal(
    await evaluate(`calendarPendingQa.calls.filter(c=>c.method==='patch').at(-1).input.status`),
    'DRAFT',
  )
  await wait(`document.querySelector('tbody')?.innerText.includes('Borrador')`, 'tabla actualizada')
  assert.equal(
    await evaluate(`document.activeElement?.getAttribute('data-qa-focus')`),
    'Jornada académica',
    'D: focus returns to Gestionar after saving',
  )
  console.log('PASS D: durante la petición Escape no cancela; confirmar envía un único PATCH /status y devuelve el foco')

  assert.deepEqual(errors, [])
  console.log(`QA E1.3: PASS · evidencia en ${evidence}`)
} finally {
  ws?.close()
  chrome?.kill()
  await vite?.close()
}
