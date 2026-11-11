// Browser QA for DS2.2b: isolated catalogue of Field/TextInput/Select/Textarea (no real page, no backend).
// Checks label/control association, aria-describedby targets, invalid and disabled states, keyboard
// order, visible focus, label click, native select keyboard, ref, WCAG AA contrast and overflow at
// 320/390/768/1440px. Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../tests/browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'ds2.2b-field')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {Field} from '/src/shared/components/ui/Field/Field.tsx';
import {TextInput} from '/src/shared/components/ui/Field/TextInput.tsx';
import {Select} from '/src/shared/components/ui/Field/Select.tsx';
import {Textarea} from '/src/shared/components/ui/Field/Textarea.tsx';
const e=React.createElement;
window.qaRef=null;
createRoot(document.getElementById('root')).render(e('main',{style:{padding:16,display:'grid',gap:16,maxWidth:640}},
  e('h1',null,'Catálogo QA de campos'),
  e(Field,{label:'Código del aula',htmlFor:'code',required:true,hint:'Ejemplo: A-101'},(c)=>e(TextInput,{...c,'data-qa':'code',placeholder:'A-101',ref:(el)=>{if(el)window.qaRef=el.tagName}})),
  e(Field,{label:'Correo institucional',htmlFor:'email',error:'Ingresa un correo válido.'},(c)=>e(TextInput,{...c,'data-qa':'email',type:'email',defaultValue:'correo-invalido'})),
  e(Field,{label:'Carrera',htmlFor:'career'},(c)=>e(Select,{...c,'data-qa':'career',defaultValue:'a'},
    e('optgroup',{label:'Activas'},e('option',{value:'a'},'Ingeniería de Sistemas'),e('option',{value:'b'},'Ingeniería Industrial')),
    e('optgroup',{label:'Inactivas'},e('option',{value:'c'},'Carrera archivada')))),
  e(Field,{label:'Descripción',htmlFor:'desc',hint:'Máximo 1000 caracteres.'},(c)=>e(Textarea,{...c,'data-qa':'desc',maxLength:1000})),
  e(Field,{label:'Campo bloqueado',htmlFor:'locked'},(c)=>e(TextInput,{...c,'data-qa':'locked',disabled:true,defaultValue:'No editable'})),
  e(Field,{label:'Estado bloqueado',htmlFor:'status-locked'},(c)=>e(Select,{...c,'data-qa':'status-locked',disabled:true},e('option',null,'Activo')))));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }
try {
  browserProfile = await createBrowserProfile('ds22b-field')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds22b-field-qa',
      enforce: 'pre',
      resolveId(id) { if (id === '/__ds22b-field.js') return '\0ds22b-field-qa' },
      load(id) { if (id === '\0ds22b-field-qa') return demo },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds22b-field') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds22b-field',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds22b-field.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__ds22b-field')).status, 200)
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
  const key = async (keyName, code, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode })
    await pause(80)
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds22b-field' })
  for (let index = 0; index < 80 && !(await evaluate(`!!document.querySelector('[data-qa=status-locked]')`)); index++) await pause(100)

  // Colour helpers: parse rgb()/color(srgb …), blend opacity over the page, WCAG ratio.
  await evaluate(`window.qaColor=(v)=>{let m=v.match(/^rgba?\\(([^)]+)\\)/);if(m){const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);return {r:p[0]/255,g:p[1]/255,b:p[2]/255,a:p[3]??1}}
    m=v.match(/^color\\(srgb ([^)]+)\\)/);if(m){const p=m[1].split(/[ \\/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p[3]??1}}throw new Error('color '+v)};
    window.qaLum=(c)=>{const f=(v)=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
    window.qaContrast=(el,bgEl)=>{const page=qaColor(getComputedStyle(document.body).backgroundColor);const s=getComputedStyle(el);let bg=qaColor(getComputedStyle(bgEl??el).backgroundColor);if(bg.a===0)bg=page;let fg=qaColor(s.color);const o=Number(s.opacity);if(o<1){const mix=(c)=>({r:c.r*o+page.r*(1-o),g:c.g*o+page.g*(1-o),b:c.b*o+page.b*(1-o)});fg=mix(fg);bg=mix(bg)}const [a,b]=[qaLum(fg),qaLum(bg)].sort((x,y)=>y-x);return Math.round(((a+0.05)/(b+0.05))*100)/100};true`)

  const report = []
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(200)
    const state = await evaluate(`(()=>{const controls=[...document.querySelectorAll('[data-qa]')];return {scroll:document.documentElement.scrollWidth,vw:innerWidth,
      controls:controls.map((el)=>{const b=el.getBoundingClientRect();const label=document.querySelector('label[for="'+el.id+'"]');const described=(el.getAttribute('aria-describedby')||'').split(' ').filter(Boolean);
        return {qa:el.dataset.qa,tag:el.tagName,height:Math.round(b.height),right:b.right,labelControl:label?.control===el,labelText:label?.textContent,
          described:described.map((id)=>({id,text:document.getElementById(id)?.textContent?.trim()??null})),invalid:el.getAttribute('aria-invalid'),
          border:getComputedStyle(el).borderTopColor,contrast:qaContrast(el),labelContrast:label?qaContrast(label):0}}),
      texts:[...document.querySelectorAll('main p')].map((p)=>({id:p.id,contrast:qaContrast(p)})),
      error:getComputedStyle(document.getElementById('email-error')).color}})()`)
    check(state.scroll <= state.vw + 1, `${width}px: desbordamiento ${state.scroll}>${state.vw}`)
    for (const control of state.controls) {
      check(control.right <= state.vw + 1, `${width}px ${control.qa}: se sale`)
      check(control.labelControl, `${width}px ${control.qa}: label no asociado`)
      check(control.height >= (control.tag === 'TEXTAREA' ? 88 : 44), `${width}px ${control.qa}: altura ${control.height}`)
      check(control.contrast >= 4.5, `${width}px ${control.qa}: contraste del control ${control.contrast}`)
      check(control.labelContrast >= 4.5, `${width}px ${control.qa}: contraste del label ${control.labelContrast}`)
      for (const target of control.described) check(target.text, `${width}px ${control.qa}: aria-describedby → ${target.id} inexistente o vacío`)
    }
    const byQa = Object.fromEntries(state.controls.map((control) => [control.qa, control]))
    check(byQa.code.described.map((d) => d.id).join() === 'code-hint', 'describedby de code')
    check(byQa.email.described.map((d) => d.id).join() === 'email-error' && byQa.email.invalid === 'true', 'email inválido y descrito por su error')
    check(byQa.email.border === state.error, `borde inválido ${byQa.email.border} ≠ color de error ${state.error}`)
    check(Object.values(byQa).filter((control) => control.invalid === 'true').length === 1, 'solo email es inválido')
    for (const control of Object.values(byQa)) {
      if (control.qa !== 'email') check(control.border !== state.error, `${width}px ${control.qa}: borde de error sin estar inválido (${control.border})`)
    }
    if (width === 390) report.push({ borders: Object.fromEntries(Object.values(byQa).map((control) => [control.qa, control.border])), error: state.error })
    for (const text of state.texts) check(text.contrast >= 4.5, `${width}px texto ${text.id}: contraste ${text.contrast}`)
    report.push({ width, minControl: Math.min(...state.controls.map((c) => c.contrast)), minLabel: Math.min(...state.controls.map((c) => c.labelContrast)), minText: Math.min(...state.texts.map((t) => t.contrast)) })
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `campos-${width}.png`), Buffer.from(shot.data, 'base64'))
  }

  // Keyboard: Tab visits the enabled controls in order with a visible 3px focus ring; disabled are skipped.
  await evaluate(`document.activeElement?.blur();true`)
  const expected = ['code', 'email', 'career', 'desc']
  const visited = []
  for (let index = 0; index < expected.length; index++) {
    await key('Tab', 'Tab', 9)
    const focus = await evaluate(`(()=>{const el=document.activeElement;const s=getComputedStyle(el);return {qa:el.dataset?.qa??el.tagName,outline:s.outlineStyle+' '+s.outlineWidth,visible:el.matches(':focus-visible')}})()`)
    visited.push(focus.qa)
    check(focus.visible && focus.outline === 'solid 3px', `foco no visible en ${focus.qa}: ${focus.outline}`)
  }
  check(JSON.stringify(visited) === JSON.stringify(expected), `orden de foco ${visited.join(',')}`)
  // Native select keyboard: ArrowDown on the focused, closed select moves to the next option.
  await evaluate(`document.querySelector('[data-qa=career]').focus();true`)
  await key('ArrowDown', 'ArrowDown', 40)
  const selectValue = await evaluate(`document.querySelector('[data-qa=career]').value`)
  check(selectValue === 'b', `select con teclado: valor ${selectValue}`)
  // Label click focuses its control; typing reaches the input; ref received the element.
  const labelBox = await evaluate(`(()=>{const b=document.querySelector('label[for=code]').getBoundingClientRect();return {x:b.x+8,y:b.y+b.height/2}})()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: labelBox.x, y: labelBox.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: labelBox.x, y: labelBox.y, button: 'left', clickCount: 1 })
  await pause(100)
  check(await evaluate(`document.activeElement?.dataset.qa`) === 'code', 'el clic en el label no enfoca el control')
  await send('Input.insertText', { text: 'B-202' })
  check(await evaluate(`document.querySelector('[data-qa=code]').value`) === 'B-202', 'no se puede escribir en el control')
  check(await evaluate('window.qaRef') === 'INPUT', 'ref no recibió el <input>')
  check(await evaluate(`document.querySelector('[data-qa=locked]').disabled && document.querySelector('[data-qa=status-locked]').disabled`), 'controles deshabilitados')
  check(errors.length === 0, `errores JS: ${errors.join(' | ')}`)

  await writeFile(join(evidence, 'result.json'), JSON.stringify({ report, visited, selectValue, failures }, null, 2))
  console.log(JSON.stringify(report))
  if (failures.length) { failures.forEach((failure) => console.log('FAIL ' + failure)); assert.fail(`${failures.length} fallos`) }
  console.log(`QA DS2.2b: PASS · 4 anchos, label/hint/error, teclado, foco, select nativo, ref y contraste AA · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
