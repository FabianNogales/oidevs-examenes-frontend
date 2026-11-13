// Browser QA for SharedRoomConsentModal (G7): keyboard and focus behaviour of the consent dialog of
// «Programar Evaluación», whose approved look must not change.
// The real component is mounted alone, opened by a QA trigger button (real Chrome, real key events):
// initial focus, Tab and Shift+Tab containment, Escape, focus return, scroll lock and both actions.
// Its look is compared with the component taken from a base commit (git show, default HEAD): same DOM
// structure, classes, text, geometry and computed styles at 320 and 1024px.
// NOT covered here: opening it from the real room selector of Programar Evaluación (the element that
// opens it there and its focus return are not exercised).
// Usage: [EIDA_CONSENT_BASE=<commit>] node src/features/exams/tests/sharedRoomConsent.browser.mjs
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from '../../../shared/tests/browserProfile.mjs'

const baseRef = process.env.EIDA_CONSENT_BASE ?? 'HEAD'
const componentPath = 'src/features/exams/components/ExamScheduler/SharedRoomConsentModal.tsx'
const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_CONSENT_OUTPUT ?? 'shared-room-consent')
await mkdir(evidence, { recursive: true })
// The base component keeps its own code; only its relative imports are made absolute.
const baseSource = execFileSync('git', ['show', `${baseRef}:${componentPath}`], { encoding: 'utf8' })
  .replace(`'./SharedRoomConsentModal.module.css'`, `'/src/features/exams/components/ExamScheduler/SharedRoomConsentModal.module.css'`)
  .replace(`'../../types/exam.types'`, `'/src/features/exams/types/exam.types'`)

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {SharedRoomConsentModal as Current} from '/src/features/exams/components/ExamScheduler/SharedRoomConsentModal.tsx';
import {SharedRoomConsentModal as Base} from '/__consent-base/SharedRoomConsentModal.tsx';
const e=React.createElement;
const qa=window.consentQa={cancels:0,confirms:[],pageClicks:0};
const room={id:4,code:'QA-204',name:'Aula QA 204 con un nombre extenso',capacity:40};
const slots=[{start:'10:00',end:'11:30',exam_name:'Parcial QA de otra materia'},{start:'11:00',end:'12:00'}];
function App({version}){
  const [open,setOpen]=React.useState(false);
  qa.open=()=>setOpen(true);
  const Modal=version==='base'?Base:Current;
  // qa.tall makes the page scroll (scroll-lock checks); the look is compared on a page without a
  // scrollbar, because locking the scroll removes the scrollbar and that alone shifts the layout.
  return e('main',{style:{minHeight:qa.tall?'200vh':'auto',padding:'24px'}},
    e('h1',null,'Consentimiento de aula compartida QA'),
    e('button',{type:'button',id:'trigger',onClick:()=>setOpen(true)},'Seleccionar aula QA'),
    e('button',{type:'button',id:'behind',onClick:()=>{qa.pageClicks++}},'Control de la página'),
    e(Modal,{room:open?room:null,conflictingSlots:slots,onCancel:()=>{qa.cancels++;setOpen(false)},onConfirmConsent:(r)=>{qa.confirms.push(r.id);setOpen(false)}}));
}
const root=createRoot(document.getElementById('root'));
qa.show=(version,tall=false)=>{qa.cancels=0;qa.confirms=[];qa.pageClicks=0;qa.tall=tall;root.render(e(App,{key:Math.random(),version}))};
qa.ready=true;
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const passed = []
try {
  browserProfile = await createBrowserProfile('shared-room-consent')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'shared-room-consent-qa',
      enforce: 'pre',
      resolveId(id) {
        if (id === '/__consent-qa.js') return '\0shared-room-consent-qa'
        if (id === '/__consent-base/SharedRoomConsentModal.tsx') return id
      },
      load(id) {
        if (id === '\0shared-room-consent-qa') return demo
        if (id === '/__consent-base/SharedRoomConsentModal.tsx') return baseSource
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__consent-qa') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__consent-qa',
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__consent-qa.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__consent-qa')).status, 200)
  console.log(`QA: servidor local listo; iniciando Chrome sin ventana (base ${baseRef})`)
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
  await send('Page.navigate', { url: origin + '/__consent-qa' })
  for (let index = 0; index < 600 && !(await evaluate('window.consentQa?.ready===true')); index++) await pause(100)
  assert.ok(await evaluate('window.consentQa?.ready===true'), 'arranque')
  await evaluate(`window.qaDialog=()=>document.querySelector('[role=dialog][aria-modal=true]');
    window.qaFocus=()=>{const a=document.activeElement;return a===document.body?'body':(a.id||a.textContent.trim())};
    // Look of the open dialog: structure, classes, own text, rounded geometry and key computed styles.
    window.qaSignature=()=>[qaDialog(),...qaDialog().querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      return [el.tagName,el.className,[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('|'),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),
        s.color,s.backgroundColor,s.borderTopWidth+' '+s.borderTopStyle+' '+s.borderTopColor,s.borderRadius,s.fontSize,s.fontWeight,s.padding,s.boxShadow,s.zIndex,s.position,s.display].join('~')});true`)
  const key = async (name, code, modifiers = 0) => {
    // Enter only activates a button when the key event carries its text.
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, modifiers, ...(name === 'Enter' ? { text: '\r' } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code, modifiers })
    await pause(120)
  }
  const CANCEL = 'Cancelar', CONFIRM = 'Dar consentimiento y seleccionar aula'
  // Opens the dialog the way a user does: focus on the trigger, then Enter.
  const open = async () => {
    await evaluate(`document.getElementById('trigger').focus();true`)
    await key('Enter', 13)
    await wait('!!qaDialog()', 'diálogo abierto')
  }

  // 1. The approved look is identical to the base commit at 320 and 1024px.
  for (const width of [320, 1024]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    const signatures = {}
    for (const version of ['base', 'current']) {
      await evaluate(`consentQa.show(${JSON.stringify(version)});true`)
      await wait(`!!document.getElementById('trigger')`, `${version}: página`)
      // Opened without moving focus, so both versions are compared in the same focus state.
      await evaluate(`document.activeElement?.blur?.();consentQa.open();true`)
      await wait('!!qaDialog()', `${version}: diálogo`)
      await evaluate(`document.activeElement?.blur?.();true`)
      await pause(150)
      signatures[version] = await evaluate('qaSignature()')
      const image = await send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `${version}-${width}.png`), Buffer.from(image.data, 'base64'))
    }
    assert.ok(signatures.current.length > 10, 'firma con contenido')
    assert.deepEqual(signatures.current, signatures.base, `${width}px el aspecto del diálogo cambió respecto a ${baseRef}`)
    const box = await evaluate(`(()=>{const r=qaDialog().firstElementChild.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1})()`)
    assert.ok(box, `${width}px el diálogo cabe en la ventana`)
    pass(`${width}px: aspecto idéntico a ${baseRef} (${signatures.current.length} nodos: estructura, clases, texto, geometría y estilos)`)
  }
  // Expected and measured: on a page that scrolls, the scroll lock removes the desktop scrollbar, so
  // the centred dialog moves by half its width. Nothing else may differ.
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })
  const scrolled = {}
  for (const version of ['base', 'current']) {
    await evaluate(`consentQa.show(${JSON.stringify(version)},true);true`)
    await wait(`!!document.getElementById('trigger')`, `${version}: página alta`)
    await evaluate(`document.activeElement?.blur?.();consentQa.open();true`)
    await wait('!!qaDialog()', `${version}: diálogo en página alta`)
    await evaluate(`document.activeElement?.blur?.();true`)
    await pause(150)
    scrolled[version] = await evaluate(`({viewport:document.documentElement.clientWidth,left:Math.round(qaDialog().firstElementChild.getBoundingClientRect().left),width:Math.round(qaDialog().firstElementChild.getBoundingClientRect().width),locked:getComputedStyle(document.body).overflow==='hidden'})`)
  }
  const scrollbar = scrolled.current.viewport - scrolled.base.viewport
  assert.deepEqual({ baseLocked: scrolled.base.locked, currentLocked: scrolled.current.locked, sameWidth: scrolled.base.width === scrolled.current.width }, { baseLocked: false, currentLocked: true, sameWidth: true })
  assert.ok(scrollbar >= 0 && Math.abs((scrolled.current.left - scrolled.base.left) - scrollbar / 2) <= 1, `desplazamiento no explicado por la barra de scroll: ${JSON.stringify(scrolled)}`)
  pass(`página con scroll a 1024px: el bloqueo retira la barra (${scrollbar}px) y el diálogo se desplaza ${scrolled.current.left - scrolled.base.left}px; mismo tamaño`)

  // 2. Keyboard and focus behaviour of the current component.
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate(`consentQa.show('current',true);true`)
  await wait(`!!document.getElementById('trigger')`, 'página')
  assert.equal(await evaluate(`getComputedStyle(document.body).overflow==='hidden'`), false, 'sin bloqueo de scroll con el diálogo cerrado')
  await open()
  const opened = await evaluate(`({focus:qaFocus(),inside:qaDialog().contains(document.activeElement),labelled:document.getElementById(qaDialog().getAttribute('aria-labelledby'))?.textContent.trim(),locked:getComputedStyle(document.body).overflow})`)
  assert.deepEqual(opened, { focus: CANCEL, inside: true, labelled: 'Este ambiente no está configurado como compartido', locked: 'hidden' })
  pass('apertura con teclado: foco inicial en «Cancelar», diálogo etiquetado y scroll de la página bloqueado')

  const order = []
  for (let index = 0; index < 4; index++) { await key('Tab', 9); order.push(await evaluate('qaFocus()')) }
  assert.deepEqual(order, [CONFIRM, CANCEL, CONFIRM, CANCEL], 'Tab recorre solo los controles del diálogo')
  const back = []
  for (let index = 0; index < 4; index++) { await key('Tab', 9, 8); back.push(await evaluate('qaFocus()')) }
  assert.deepEqual(back, [CONFIRM, CANCEL, CONFIRM, CANCEL], 'Shift+Tab recorre solo los controles del diálogo')
  assert.equal(await evaluate('consentQa.pageClicks'), 0)
  pass('Tab y Shift+Tab: el foco no sale del diálogo')

  // A press on the backdrop keeps the dialog open (as before) and the focus inside it.
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 4, y: 4, button: 'left', clickCount: 1 })
  await pause(120)
  assert.deepEqual(await evaluate(`({open:!!qaDialog(),inside:qaDialog().contains(document.activeElement),cancels:consentQa.cancels})`), { open: true, inside: true, cancels: 0 })
  await key('Tab', 9)
  assert.ok(await evaluate('qaDialog().contains(document.activeElement)'), 'Tab sigue dentro tras pulsar el fondo')
  pass('fondo: no cierra el diálogo (comportamiento previo) y no saca el foco')

  await key('Escape', 27)
  await wait('!qaDialog()', 'Escape cierra el diálogo')
  assert.deepEqual(await evaluate(`({focus:qaFocus(),cancels:consentQa.cancels,confirms:consentQa.confirms,locked:getComputedStyle(document.body).overflow==='hidden'})`),
    { focus: 'trigger', cancels: 1, confirms: [], locked: false })
  pass('Escape: cancela, devuelve el foco al control que abrió el diálogo y libera el scroll')

  await open()
  await key('Enter', 13)
  await wait('!qaDialog()', 'Cancelar con Enter')
  assert.deepEqual(await evaluate(`({focus:qaFocus(),cancels:consentQa.cancels,confirms:consentQa.confirms})`), { focus: 'trigger', cancels: 2, confirms: [] })
  await open()
  await key('Tab', 9)
  await key('Enter', 13)
  await wait('!qaDialog()', 'consentimiento con teclado')
  assert.deepEqual(await evaluate(`({focus:qaFocus(),cancels:consentQa.cancels,confirms:consentQa.confirms,locked:getComputedStyle(document.body).overflow==='hidden'})`),
    { focus: 'trigger', cancels: 2, confirms: [4], locked: false })
  pass('acciones con teclado: «Cancelar» y «Dar consentimiento» conservan su contrato y devuelven el foco')

  assert.deepEqual(errors, [], 'sin errores JS')
  await writeFile(join(evidence, 'result.json'), JSON.stringify({ baseRef, passed }, null, 2))
  console.log(`QA consentimiento de aula compartida: PASS ${passed.length} comprobaciones · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
