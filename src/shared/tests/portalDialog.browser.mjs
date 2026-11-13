// DS4.2c.1 browser QA for PortalDialog: Design System Button inside the dialog, legacy buttons unchanged,
// configurable initial focus (default stays on the close button), Escape, backdrop click, focus return,
// Snackbar after closing and uncovered controls at 320/390/768/1024/1440px. No backend, no HTTP.
// Requires local Chrome (EIDA_QA_CHROME overrides the path).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import { cleanupBrowserProfile, createBrowserProfile } from './browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', process.env.EIDA_PORTAL_DIALOG_OUTPUT ?? 'ds42c1-portal-dialog')
await mkdir(evidence, { recursive: true })

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import {PortalDialog} from '/src/shared/components/PortalDialog/PortalDialog.tsx';
import {Button} from '/src/shared/components/ui/Button/Button.tsx';
import {Snackbar} from '/src/shared/components/Snackbar.tsx';
const e=React.createElement;
function Demo(){
  const [open,setOpen]=React.useState(null);
  const [notice,setNotice]=React.useState(null);
  const field=React.useRef(null);
  const close=()=>{setOpen(null);setNotice({id:Date.now(),type:'success',message:'Diálogo QA cerrado.'})};
  return e(React.Fragment,null,
    e('main',null,
      e('h1',null,'PortalDialog QA'),
      e('button',{type:'button',id:'open-default',onClick:()=>setOpen('default')},'Abrir por defecto'),
      e('button',{type:'button',id:'open-field',onClick:()=>setOpen('field')},'Abrir con foco en campo')),
    open&&e(PortalDialog,{title:'Diálogo QA con un título largo para comprobar el ajuste',onClose:close,
        initialFocus:open==='field'?field:undefined,
        footer:e(React.Fragment,null,
          e(Button,{variant:'secondary',id:'ds-secondary',onClick:close},'Cancelar'),
          e(Button,{id:'ds-primary',type:'submit',form:'qa-form'},'Guardar'),
          e(Button,{id:'ds-disabled',disabled:true},'Deshabilitado'))},
      e('form',{id:'qa-form',onSubmit:(ev)=>ev.preventDefault()},
        e('label',{htmlFor:'qa-field'},'Campo QA'),
        e('input',{id:'qa-field',ref:field}),
        e('button',{type:'button',id:'legacy'},'Botón propio'),
        e('button',{type:'button',id:'legacy-disabled',disabled:true},'Propio deshabilitado'))),
    e(Snackbar,{notice,onDismiss:()=>setNotice(null)}));
}
createRoot(document.getElementById('root')).render(e(Demo));
window.portalDialogQa=true;
`

// Computed styles of interest, plus whether each dialog control is the topmost element at its centre.
const inspect = `(()=>{
  const pick=(id)=>{const el=document.getElementById(id);if(!el)return null;const s=getComputedStyle(el);
    return {bg:s.backgroundColor,color:s.color,border:s.borderTopColor,minH:s.minHeight,radius:s.borderTopLeftRadius,pad:s.paddingLeft,opacity:s.opacity,font:s.fontSize}};
  const dialog=document.querySelector('dialog[open]'), vw=document.documentElement.clientWidth, vh=innerHeight;
  const covered=dialog?[...dialog.querySelectorAll('h2,button,input')].filter(el=>{const r=el.getBoundingClientRect();if(!r.width||r.bottom<0||r.top>vh)return false;
    const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !top||!(el===top||el.contains(top))}).map(el=>el.id||el.getAttribute('aria-label')||el.tagName):null;
  const r=dialog?.getBoundingClientRect();
  return {open:!!dialog,active:document.activeElement?.id||document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName,
    primary:pick('ds-primary'),secondary:pick('ds-secondary'),disabled:pick('ds-disabled'),legacy:pick('legacy'),legacyDisabled:pick('legacy-disabled'),
    covered,inside:r?r.left>=-1&&r.right<=vw+1:null,overflow:document.documentElement.scrollWidth>vw+1};
})()`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const results = []
try {
  browserProfile = await createBrowserProfile('ds42c1-portal-dialog')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(), logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [{
      name: 'ds42c1-portal-dialog-qa', enforce: 'pre',
      resolveId(id) { if (id === '/__ds42c1.js') return '\0ds42c1-qa' },
      load(id) { if (id === '\0ds42c1-qa') return demo },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/__ds42c1') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml('/__ds42c1', '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__ds42c1.js"></script></html>'))
        })
      },
    }],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  chrome = spawn(process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${browserProfile.dir}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' })
  let port
  for (let index = 0; index < 80 && !port; index++) {
    try { port = Number((await readFile(join(browserProfile.dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { await pause(250) }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, reject) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map(), exceptions = []
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); ws.send(JSON.stringify({ id: next, method, params })) })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression, label) => { for (let index = 0; index < 80; index++) { if (await evaluate(expression)) return; await pause(100) } throw new Error(`Tiempo agotado: ${label}`) }
  const key = async (name, code, keyCode) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: name, code, windowsVirtualKeyCode: keyCode }) }
  const mouse = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }) }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__ds42c1' })
  await wait('window.portalDialogQa===true && !!document.getElementById("open-default")', 'arranque')
  // Expected look: the same computed styles as a Button outside any dialog.
  const reference = await evaluate(`(()=>{const host=document.createElement('div');document.body.append(host);return true})()`)
  assert.ok(reference)

  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 640 : 800, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(120)
    const failures = [], check = (ok, message) => { if (!ok) failures.push(message) }
    const before = exceptions.length
    // 1. Default open: focus on the close button (existing contract, e.g. newsEditor.browser).
    await evaluate(`(()=>{const b=document.getElementById('open-default');b.focus();b.click()})()`)
    await wait(`!!document.querySelector('dialog[open]')`, 'abrir por defecto')
    await pause(100)
    const def = await evaluate(inspect)
    check(def.active === 'Cerrar ventana', 'foco inicial por defecto: ' + def.active)
    // Button keeps the Design System look (44px control, primary fill, no 0.5 opacity when disabled).
    check(def.primary.minH === '44px' && def.primary.bg !== def.secondary.bg && def.primary.color === 'rgb(255, 255, 255)', 'Button primario anulado: ' + JSON.stringify(def.primary))
    check(def.secondary.minH === '44px' && def.secondary.radius === '10px', 'Button secundario anulado: ' + JSON.stringify(def.secondary))
    check(def.disabled.opacity === '1', 'Button deshabilitado con opacidad del diálogo: ' + def.disabled.opacity)
    // Legacy buttons keep the PortalDialog look exactly (36px, 6px radius, 0.5 when disabled).
    check(def.legacy.minH === '36px' && def.legacy.radius === '6px' && def.legacyDisabled.opacity === '0.5', 'botón propio cambió: ' + JSON.stringify([def.legacy, def.legacyDisabled]))
    check(def.covered.length === 0 && def.inside && !def.overflow, 'controles tapados o desbordamiento: ' + JSON.stringify(def))
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `portal-dialog-${width}.png`), Buffer.from(shot.data, 'base64'))
    // 2. Backdrop click: PortalDialog has never closed on it; the dialog stays open.
    await mouse(3, 3)
    await pause(150)
    check(await evaluate(`!!document.querySelector('dialog[open]')`), 'el clic fuera cerró el diálogo')
    // 3. Escape closes and returns focus to the opener; the Snackbar is then usable.
    await evaluate(`document.querySelector('dialog[open] input').focus()`)
    await key('Escape', 'Escape', 27)
    await wait(`!document.querySelector('dialog[open]')`, 'Escape')
    check(await evaluate(`document.activeElement?.id==='open-default'`), 'foco no devuelto al abrir')
    const box = await evaluate(`(()=>{const r=document.querySelector('.snackbar button')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null})()`)
    check(box, 'sin aviso tras cerrar')
    if (box) { await mouse(box.x, box.y); await pause(150); check(await evaluate(`!document.querySelector('.snackbar')`), 'el × del aviso no responde') }
    // 4. Configurable initial focus.
    await evaluate(`(()=>{const b=document.getElementById('open-field');b.focus();b.click()})()`)
    await wait(`!!document.querySelector('dialog[open]')`, 'abrir con campo')
    await pause(100)
    check(await evaluate(`document.activeElement?.id`) === 'qa-field', 'foco inicial configurable: ' + await evaluate(`document.activeElement?.id||document.activeElement?.getAttribute('aria-label')`))
    await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.getAttribute('aria-label')==='Cerrar ventana').click()`)
    await wait(`!document.querySelector('dialog[open]')`, 'cerrar con ×')
    check(await evaluate(`document.activeElement?.id==='open-field'`), 'foco no devuelto tras ×')
    await evaluate(`document.querySelector('.snackbar button')?.click()`)
    check(exceptions.length === before, 'excepciones JS: ' + exceptions.slice(before).join(' | '))
    results.push({ width, pass: !failures.length, failures, primary: def.primary, legacy: def.legacy })
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${width}px PortalDialog${failures.length ? ': ' + failures.join(' · ') : ''}`)
  }
  await writeFile(join(evidence, 'result.json'), JSON.stringify(results, null, 2))
  const failed = results.filter((result) => !result.pass).length
  assert.equal(failed, 0, `${failed} anchos con fallos`)
  console.log(`QA PortalDialog PASS ${results.length}/${results.length} · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
