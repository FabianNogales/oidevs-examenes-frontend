// Browser QA for DS2.2a: isolated catalogue of Button/ButtonLink (no real page, no backend).
// Checks sizes, WCAG AA text contrast (default and hover), keyboard focus order and visible focus,
// horizontal overflow and JS errors at 320/390/768/1440px. Requires local Chrome (EIDA_QA_CHROME).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'ds2.2a-button')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {Button} from '/src/shared/components/ui/Button/Button.tsx';
import {ButtonLink} from '/src/shared/components/ui/Button/ButtonLink.tsx';
const e=React.createElement;
const variants=['primary','secondary','danger','ghost'];
const row=(label,children)=>e('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}},e('h2',{style:{width:'100%',fontSize:'1rem',margin:0}},label),...children);
createRoot(document.getElementById('root')).render(e(MemoryRouter,null,e('main',{style:{padding:16}},
  e('h1',null,'Catálogo QA de botones'),
  row('md',variants.map((v)=>e(Button,{key:v,variant:v,'data-qa':'md-'+v},'Guardar '+v))),
  row('sm',variants.map((v)=>e(Button,{key:v,variant:v,size:'sm','data-qa':'sm-'+v},'Ver '+v))),
  row('estados',[e(Button,{key:'d','data-qa':'disabled',disabled:true},'Deshabilitado'),e(Button,{key:'l','data-qa':'loading',loading:true},'Guardando…'),e(Button,{key:'i','data-qa':'icon',variant:'ghost','aria-label':'Cerrar diálogo'},e('span',{'aria-hidden':'true'},'×'))]),
  row('enlaces',variants.map((v)=>e(ButtonLink,{key:v,to:'/destino-'+v,variant:v,'data-qa':'link-'+v},'Ir a '+v))),
  row('largo',[e(Button,{key:'w','data-qa':'long'},'Confirmar la importación de todas las aulas validadas del archivo CSV')]))));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
try {
  browserProfile = await createBrowserProfile('ds22a-button')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds22a-button-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__ds22a-button.js') return '\0ds22a-button-qa' },
      load(id) { if (id === '\0ds22a-button-qa') return demo },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds22a-button') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds22a-button',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds22a-button.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__ds22a-button')).status, 200)
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
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds22a-button' })
  for (let index = 0; index < 80 && !(await evaluate(`!!document.querySelector('[data-qa=long]')`)); index++) await pause(100)

  // Contrast helpers run in the page: parse rgb()/color(srgb …) and compute WCAG ratios.
  await evaluate(`window.qaColor=(value)=>{let m=value.match(/^rgba?\\(([^)]+)\\)/);if(m){const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);return {r:p[0]/255,g:p[1]/255,b:p[2]/255,a:p[3]??1}}
    m=value.match(/^color\\(srgb ([^)]+)\\)/);if(m){const p=m[1].split(/[ \\/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p[3]??1}}throw new Error('color '+value)};
    window.qaLum=(c)=>{const f=(v)=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
    window.qaContrast=(el)=>{const s=getComputedStyle(el);let bg=qaColor(s.backgroundColor);if(bg.a===0)bg=qaColor(getComputedStyle(document.body).backgroundColor);let fg=qaColor(s.color);const page=qaColor(getComputedStyle(document.body).backgroundColor);const o=Number(s.opacity);if(o<1){const mix=(c)=>({r:c.r*o+page.r*(1-o),g:c.g*o+page.g*(1-o),b:c.b*o+page.b*(1-o)});fg=mix(fg);bg=mix(bg)}const [a,b]=[qaLum(fg),qaLum(bg)].sort((x,y)=>y-x);return Math.round(((a+0.05)/(b+0.05))*100)/100};true`)

  const report = []
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(200)
    const state = await evaluate(`(()=>{const items=[...document.querySelectorAll('[data-qa]')].map((el)=>{const b=el.getBoundingClientRect();return {qa:el.dataset.qa,tag:el.tagName,height:Math.round(b.height),right:b.right,contrast:qaContrast(el)}});return {scroll:document.documentElement.scrollWidth,vw:innerWidth,items}})()`)
    check(state.scroll <= state.vw + 1, `${width}px: desbordamiento ${state.scroll}>${state.vw}`)
    for (const item of state.items) {
      check(item.right <= state.vw + 1, `${width}px ${item.qa}: se sale del viewport`)
      check(item.contrast >= 4.5, `${width}px ${item.qa}: contraste ${item.contrast}`)
      if (item.qa.startsWith('sm-')) check(item.height >= 36 && item.height < 44, `${width}px ${item.qa}: altura ${item.height}`)
      else check(item.height >= 44, `${width}px ${item.qa}: altura ${item.height}`)
      if (item.qa.startsWith('link-')) check(item.tag === 'A', `${item.qa} no es <a>`)
      else check(item.tag === 'BUTTON', `${item.qa} no es <button>`)
    }
    report.push({ width, minContrast: Math.min(...state.items.map((item) => item.contrast)) })
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `catalogo-${width}.png`), Buffer.from(shot.data, 'base64'))
  }

  // Hover contrast (1440px): move the pointer onto each enabled button and measure again.
  for (const qa of ['md-primary', 'md-secondary', 'md-danger', 'md-ghost', 'link-danger']) {
    const box = await evaluate(`(()=>{const b=document.querySelector('[data-qa=${qa}]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y })
    await pause(250)
    const contrast = await evaluate(`qaContrast(document.querySelector('[data-qa=${qa}]'))`)
    check(contrast >= 4.5, `hover ${qa}: contraste ${contrast}`)
    report.push({ hover: qa, contrast })
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 })

  // Keyboard: Tab visits enabled controls in order, skips disabled/loading, focus is visible (3px outline).
  await evaluate(`document.activeElement?.blur();document.body.focus();true`)
  const expected = ['md-primary', 'md-secondary', 'md-danger', 'md-ghost', 'sm-primary', 'sm-secondary', 'sm-danger', 'sm-ghost', 'icon', 'link-primary', 'link-secondary', 'link-danger', 'link-ghost', 'long']
  const visited = []
  for (let index = 0; index < expected.length; index++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await pause(60)
    const focus = await evaluate(`(()=>{const el=document.activeElement;const s=getComputedStyle(el);return {qa:el.dataset?.qa??el.tagName,outline:s.outlineStyle+' '+s.outlineWidth,visible:el.matches(':focus-visible')}})()`)
    visited.push(focus.qa)
    check(focus.visible && focus.outline === 'solid 3px', `foco no visible en ${focus.qa}: ${focus.outline}`)
  }
  check(JSON.stringify(visited.slice(0, expected.length)) === JSON.stringify(expected), `orden de foco ${visited.join(',')}`)
  check(!visited.includes('disabled') && !visited.includes('loading'), 'el foco entra en un botón deshabilitado')
  check(errors.length === 0, `errores JS: ${errors.join(' | ')}`)

  await writeFile(join(evidence, 'result.json'), JSON.stringify({ report, visited, failures }, null, 2))
  console.log(JSON.stringify(report))
  if (failures.length) { failures.forEach((failure) => console.log('FAIL ' + failure)); assert.fail(`${failures.length} fallos`) }
  console.log(`QA DS2.2a: PASS · 4 anchos, ${expected.length} controles enfocables, contraste y hover AA · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
