// Browser QA for E1.1 with simulated transport. No backend data is read or changed.
// Saving from the Drawer reloads the same query; the rows stay mounted with
// aria-busy so focus returns to "Gestionar". If the saved row leaves
// the current result set, focus moves to the page heading instead of <body>.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'
import { createServer } from 'vite'

const evidence = join(process.cwd(), '.validation.local', 'e1.1-calendar-focus')
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
const records=[event(1,'Jornada de bienvenida','PRIVATE'),event(2,'Jornada académica','PRIVATE'),event(3,'Feria institucional','PRIVATE')];
const qa=window.calendarFocusQa={records,calls:[],listDelay:0,client:{
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
    const match=url.match(/\\/admin\\/portal\\/events\\/(\\d+)$/);
    if(!match)throw new Error('Unexpected PATCH '+url);
    const record=records.find(item=>item.id===Number(match[1]));
    Object.assign(record,input,{revision:record.revision+1});
    return {data:{data:{...record}}};
  },
  async post(){throw new Error('Unexpected POST')},
}};
createRoot(document.getElementById('root')).render(e(MemoryRouter,null,e('main',{style:{maxWidth:1200,margin:'16px auto'}},e(AdminCalendarPage))));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('calendar-focus')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'calendar-focus-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__calendar-focus.js') return '\0calendar-focus-qa'
        },
        load(id) {
          if (id === '\0calendar-focus-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.calendarFocusQa.client.get(...args),patch:(...args)=>window.calendarFocusQa.client.patch(...args),post:(...args)=>window.calendarFocusQa.client.post(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__calendar-focus') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__calendar-focus',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__calendar-focus.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__calendar-focus')).status, 200)
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
    const patches = await evaluate(`calendarFocusQa.calls.filter(call=>call.method==='patch').length`)
    await evaluate(`(()=>{const button=[...document.querySelectorAll('dialog[open] button[type=submit]')].find(node=>!node.disabled);button.focus()})()`)
    await press('Enter', 'Enter', 13, '\r')
    await wait(
      `calendarFocusQa.calls.filter(call=>call.method==='patch').length>${patches}`,
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
  await send('Page.navigate', { url: origin + '/__calendar-focus' })
  await wait(
    `document.querySelector('h1')?.textContent==='Gestión del calendario' && document.querySelectorAll('tbody tr').length===3`,
    'tabla de eventos',
  )
  await evaluate('calendarFocusQa.listDelay=700')

  // A. The saved row stays on the page: focus returns to its action.
  await openRow('Jornada académica')
  await evaluate(
    `(()=>{const input=document.querySelector('dialog[open] input[name=title]');input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`,
  )
  for (const char of ' 2026') await press(char, '', 0, char)
  await save()
  await wait(`!document.querySelector('dialog')`, 'cierre del Drawer tras guardar')
  let current = await snapshot()
  console.log('DURANTE', JSON.stringify(current))
  await shot('01-recarga-tras-guardar')
  assert.equal(current.loader, false, 'sin loader destructivo durante la recarga del guardado')
  assert.equal(current.busy, 'true', 'aria-busy durante la recarga')
  assert.equal(current.rows.length, 3, 'filas conservadas durante la recarga')
  assert.equal(current.triggerConnected, true, 'el botón original sigue montado')
  assert.equal(current.focusQa, 'Jornada académica', `foco en Gestionar (${current.focusTag}:${current.focusText})`)
  await wait(
    `document.querySelector('tbody')?.innerText.includes('Jornada académica 2026')`,
    'datos actualizados',
  )
  current = await snapshot()
  console.log('DESPUÉS', JSON.stringify(current))
  assert.equal(current.busy, 'false')
  assert.equal(current.focusQa, 'Jornada académica', 'el foco sigue en el botón tras la recarga')
  assert.equal(current.bodyOverflow, 'visible')
  await shot('02-foco-restaurado')
  console.log('PASS guardar → recarga con filas conservadas y aria-busy → foco en Gestionar')

  // B. Edge case: the saved row leaves the filtered result set.
  await evaluate('calendarFocusQa.listDelay=0')
  await evaluate(
    `(()=>{const select=document.querySelector('select[name=visibility]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'PRIVATE');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await wait(
    `calendarFocusQa.calls.filter(call=>call.url==='/admin/portal/events').at(-1).params.visibility==='PRIVATE' && document.querySelectorAll('tbody tr').length===3`,
    'filtro Privadas',
  )
  await evaluate('calendarFocusQa.listDelay=700')
  await openRow('Feria institucional')
  await evaluate(
    `(()=>{const select=document.querySelector('dialog[open] select[name=visibility]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'PUBLIC');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await pause(150)
  await save()
  await wait(`!document.querySelector('dialog')`, 'cierre del Drawer tras guardar')
  current = await snapshot()
  assert.equal(current.busy, 'true')
  assert.equal(current.rows.length, 3, 'filas conservadas durante la recarga')
  assert.equal(current.focusQa, 'Feria institucional')
  await wait(`document.querySelectorAll('tbody tr').length===2`, 'fila filtrada fuera')
  await pause(150)
  current = await snapshot()
  console.log('CASO LÍMITE', JSON.stringify(current))
  assert.notEqual(current.focusTag, 'BODY', 'el foco no queda en <body>')
  assert.equal(current.focusTag, 'H1', `foco en el encabezado de la página (${current.focusTag})`)
  assert.equal(current.focusText, 'Gestión del calendario')
  await shot('03-fila-filtrada-foco-encabezado')
  console.log('PASS caso límite: la fila sale del filtro y el foco pasa al encabezado de la página')

  // C. A query change still shows the normal loader (no stale rows).
  await evaluate(
    `(()=>{const select=document.querySelector('select[name=visibility]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await pause(150)
  current = await snapshot()
  assert.equal(current.loader, true, 'un cambio de filtro muestra el loader')
  assert.equal(current.rows.length, 0, 'sin filas de otra consulta')
  await wait(`document.querySelectorAll('tbody tr').length===3`, 'consulta sin filtro')
  console.log('PASS cambio de consulta: loader normal sin filas de la consulta anterior')

  assert.deepEqual(errors, [])
  console.log(`QA E1.1: PASS · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
