// Browser QA with simulated HTTP transport. No backend data is read or changed.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const profile = await mkdtemp(join(tmpdir(), 'eida-public-calendar-'))
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {InstitutionalCalendar} from '/src/features/portal-calendar/components/InstitutionalCalendar.tsx';
import {boliviaDate} from '/src/features/portal-calendar/utils/calendarDates.ts';
const e=React.createElement,root=createRoot(document.getElementById('root'));
const month=boliviaDate().slice(0,7),date=month+'-05';
const category={id:73,name:'Categoría de prueba del transporte simulado'};
const event={id:47,title:'Actividad pública de prueba',description:'Primera línea de descripción.\\nSegunda línea.',
starts_at:date+'T09:00:00-04:00',ends_at:date+'T11:00:00-04:00',all_day:false,
location:'Ubicación de prueba',category,status:'PUBLISHED',published_at:month+'-01T10:00:00-04:00'};
window.calendarQa={month,date,calls:[],client:{async get(url,options={}){
  calendarQa.calls.push({url,params:options.params});
  if(url.endsWith('event-categories'))return {data:{data:[category]}};
  if(url.endsWith('/47'))return {data:{data:event}};
  return {data:{data:options.params?.from===month+'-01'?[event]:[],meta:{current_page:1,last_page:1,per_page:100,total:1}}};
}}};
root.render(e(MemoryRouter,null,e('main',{style:{maxWidth:960,margin:'16px auto',padding:16}},e(InstitutionalCalendar))));
`
let vite, chrome, ws
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'public-calendar-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__calendar-qa.js') return '\0calendar-qa'
        },
        load(id) {
          if (id === '\0calendar-qa') return demo
          if (
            id.replaceAll('\\', '/').endsWith('/src/shared/api/httpClient.ts')
          )
            return 'export const httpClient={get:(...args)=>window.calendarQa.client.get(...args)};'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/__calendar-qa') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__calendar-qa',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__calendar-qa.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
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
  let launchError, port
  chrome.on('error', (error) => {
    launchError = error
  })
  for (let i = 0; i < 80; i++) {
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
    targets.find((t) => t.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
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
      message.error
        ? request.reject(new Error(message.error.message))
        : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.text)
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      message.params.type === 'error'
    )
      errors.push(
        message.params.args.map((a) => a.value ?? a.description).join(' '),
      )
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      )
    return r.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(
      `Timeout: ${expression}; ${await evaluate('document.body.innerText')}; ${errors.join('; ')}`,
    )
  }
  const click = async (selector) => {
    assert.ok(
      await evaluate(
        `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return false;el.focus();el.click();return true})()`,
      ),
      selector,
    )
    await pause(50)
  }
  const screenshot = async (name) => {
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(join(profile, name + '.png'), Buffer.from(r.data, 'base64'))
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', {
    url: `http://127.0.0.1:${vite.httpServer.address().port}/__calendar-qa`,
  })
  await wait(
    `document.querySelector('ul[aria-label="Eventos institucionales"]')`,
  )
  const date = await evaluate('window.calendarQa.date')
  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
      `${width}: page overflow`,
    )
    await click(`button[aria-label="${date}: 1 eventos"]`)
    await wait(`document.body.innerText.includes('Eventos del')`)
    assert.ok(
      await evaluate(
        `document.querySelector('ul').innerText.includes('Primera línea de descripción.')`,
      ),
    )
    assert.ok(
      await evaluate(
        `document.querySelector('ul').innerText.includes('Ubicación de prueba')`,
      ),
    )
    await screenshot(`${width}-selected-day`)
    await click('ul button')
    await wait('document.querySelector("dialog[open] article")')
    const bounds = await evaluate(
      `(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&d.scrollWidth<=d.clientWidth+1})()`,
    )
    assert.ok(bounds, `${width}: dialog overflow`)
    for (const text of [
      'Actividad pública de prueba',
      '9:00',
      '11:00',
      'Ubicación de prueba',
      'Segunda línea.',
    ])
      assert.ok(
        await evaluate(
          `document.querySelector('dialog').innerText.includes(${JSON.stringify(text)})`,
        ),
        text,
      )
    await screenshot(`${width}-event-detail`)
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
    })
    await wait('!document.querySelector("dialog")')
    assert.ok(
      await evaluate(
        'document.activeElement===document.querySelector("ul button")',
      ),
      'focus restored to event',
    )
    await click('button[aria-label="Año siguiente"]')
    await wait(
      `document.body.innerText.includes('No hay eventos institucionales programados')`,
    )
    await click('button[aria-label="Año anterior"]')
    await wait(
      `document.querySelector('ul[aria-label="Eventos institucionales"]')`,
    )
    console.log(
      `PASS ${width}px: fecha marcada, selección, agenda, detalle, categoría, horario, Escape/foco y navegación anual; sin desborde`,
    )
  }
  assert.deepEqual(errors, [])
  console.log(`Capturas: ${profile}`)
} finally {
  ws?.close()
  chrome?.kill()
  await vite?.close()
}
