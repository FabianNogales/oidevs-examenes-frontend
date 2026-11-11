// Browser QA for D4.4: native ConfirmDialog Escape handling with real components.
// No backend is used. Covers a confirmation rendered as a sibling of a Drawer
// (Calendar layout), a standalone confirmation, a busy confirmation and
// unexpected native closes. Run from the frontend root; requires local Chrome.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer } from 'vite'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from './browserProfile.mjs'

const evidence = join(process.cwd(), '.validation.local', 'd4.4-confirm-dialog')
await mkdir(evidence, { recursive: true })
const demo = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {PortalDialog} from '/src/shared/components/PortalDialog/PortalDialog.tsx';
import {ConfirmDialog} from '/src/shared/components/ConfirmDialog/ConfirmDialog.tsx';
const e=React.createElement;
const qa=window.confirmQa={cancels:0,confirms:0,discards:0,setLoading:null};
function SiblingDrawer({onClose}){
  const [value,setValue]=useState('Valor inicial');
  const [confirm,setConfirm]=useState(false);
  const dirty=value!=='Valor inicial';
  const requestClose=()=>dirty?setConfirm(true):onClose();
  return e(React.Fragment,null,
    e(PortalDialog,{drawer:true,title:'Editor de prueba',closeBlocked:confirm,onClose:requestClose,
      footer:e('button',{type:'button',onClick:requestClose},'Cancelar')},
      e('label',null,'Nombre',e('input',{name:'name',value,onChange:(event)=>setValue(event.target.value)}))),
    e(ConfirmDialog,{native:true,isOpen:confirm,title:'¿Descartar los cambios?',message:'La información que no hayas guardado se perderá.',
      cancelLabel:'Seguir editando',confirmLabel:'Descartar cambios',variant:'danger',
      onCancel:()=>{qa.cancels++;setConfirm(false)},onConfirm:()=>{qa.discards++;onClose()}}));
}
function App(){
  const [drawer,setDrawer]=useState(false);
  const [standalone,setStandalone]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  qa.setLoading=setLoading;
  return e('main',{style:{padding:24}},
    e('h1',null,'QA ConfirmDialog'),
    e('button',{type:'button','data-qa':'drawer',onClick:()=>setDrawer(true)},'Abrir editor'),
    e('button',{type:'button','data-qa':'standalone',onClick:()=>setStandalone(true)},'Eliminar registro'),
    e('button',{type:'button','data-qa':'busy',onClick:()=>{setLoading(true);setBusy(true)}},'Operación en curso'),
    drawer?e(SiblingDrawer,{onClose:()=>setDrawer(false)}):null,
    e(ConfirmDialog,{native:true,isOpen:standalone,title:'¿Eliminar registro?',message:'Esta acción no se puede deshacer.',
      onCancel:()=>{qa.cancels++;setStandalone(false)},onConfirm:()=>{qa.confirms++;setStandalone(false)}}),
    e(ConfirmDialog,{native:true,isOpen:busy,loading,title:'¿Procesar solicitud?',message:'La solicitud se está procesando.',
      onCancel:()=>{qa.cancels++;setBusy(false)},onConfirm:()=>{}}));
}
createRoot(document.getElementById('root')).render(e(App));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('confirm-escape')
  const profile = browserProfile.dir
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    plugins: [
      {
        name: 'confirm-escape-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__confirm-escape.js') return '\0confirm-escape-qa'
        },
        load(id) {
          if (id === '\0confirm-escape-qa') return demo
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__confirm-escape') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__confirm-escape',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__confirm-escape.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__confirm-escape')).status, 200)
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
      const dialogs=[...document.querySelectorAll('dialog')];
      const find=(text)=>dialogs.find(d=>d.innerText.includes(text)||d.querySelector('h2,h3')?.textContent===text);
      const drawer=dialogs.find(d=>d.querySelector('h2')?.textContent==='Editor de prueba');
      const rect=drawer?.getBoundingClientRect();
      const active=document.activeElement;
      return {
        mounted:dialogs.length,
        open:dialogs.filter(d=>d.open).length,
        invisibleMounted:dialogs.filter(d=>!d.open).length,
        drawerOpen:Boolean(drawer?.open&&rect.width>0&&rect.height>0),
        discardOpen:Boolean(find('¿Descartar los cambios?')?.open),
        value:drawer?.querySelector('input[name=name]')?.value??null,
        bodyOverflow:getComputedStyle(document.body).overflow,
        focusInDrawer:Boolean(drawer?.contains(active)),
        focusQa:active?.getAttribute('data-qa')??null,
        focus:active?.tagName+':'+(active?.textContent||active?.name||'').trim().slice(0,30),
        cancels:confirmQa.cancels,discards:confirmQa.discards,confirms:confirmQa.confirms,
      };
    })()`)
  const wait = async (expression, label = expression) => {
    for (let index = 0; index < 80; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(`Timeout ${label}: ${JSON.stringify(await state())}`)
  }
  // Real keyboard input. Escape does not grant user activation, which is what
  // triggers Chrome's grouped close requests between sibling dialogs.
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
  const enterOn = async (qa) => {
    await evaluate(`document.querySelector('[data-qa=${qa}]').focus()`)
    await press('Enter', 'Enter', 13, '\r')
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  const clickIn = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const scope=[...document.querySelectorAll('dialog[open]')].at(-1);const el=[...scope.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&!node.disabled);if(!el)return false;el.click();return true})()`,
      ),
      label,
    )
    await pause(150)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send('Page.navigate', { url: origin + '/__confirm-escape' })
  await wait(`document.querySelector('h1')?.textContent==='QA ConfirmDialog'`, 'demo')
  const initialOverflow = (await state()).bodyOverflow

  // A. Sibling confirmation above a Drawer (Calendar layout).
  await enterOn('drawer')
  await wait(`document.querySelector('dialog[open] input[name=name]')`, 'Drawer')
  await evaluate(
    `(()=>{const input=document.querySelector('dialog[open] input[name=name]');input.focus();input.setSelectionRange(input.value.length,input.value.length)})()`,
  )
  for (const char of ' editado') await press(char, '', 0, char)
  let current
  for (let cycle = 1; cycle <= 3; cycle++) {
    await escape()
    current = await state()
    assert.equal(current.discardOpen, true, `ciclo ${cycle}: Escape en el Drawer abre la confirmación`)
    assert.equal(current.drawerOpen, true, `ciclo ${cycle}: Drawer visible bajo la confirmación`)
    if (cycle === 1) await shot('01-confirmacion-hermana')
    await escape()
    current = await state()
    assert.equal(current.discardOpen, false, `ciclo ${cycle}: Escape cancela la confirmación`)
    assert.equal(current.drawerOpen, true, `ciclo ${cycle}: el Drawer sigue visible`)
    assert.equal(current.value, 'Valor inicial editado', `ciclo ${cycle}: cambios conservados`)
    assert.equal(current.focusInDrawer, true, `ciclo ${cycle}: foco devuelto al Drawer (${current.focus})`)
    assert.equal(current.invisibleMounted, 0, `ciclo ${cycle}: sin diálogos invisibles montados`)
    assert.equal(current.bodyOverflow, 'hidden')
  }
  assert.equal(current.cancels, 3)
  assert.equal(current.discards, 0, 'ningún descarte sin confirmación')
  await shot('02-drawer-tras-escape')
  console.log('PASS confirmación hermana: Escape cancela (x3 ciclos), Drawer visible y cambios conservados')

  await escape()
  await wait(`[...document.querySelectorAll('dialog[open]')].some(d=>d.innerText.includes('¿Descartar los cambios?'))`, 'confirmación')
  await clickIn('Descartar cambios')
  await wait(`!document.querySelector('dialog')`, 'cierre tras descartar')
  current = await state()
  assert.equal(current.discards, 1)
  assert.equal(current.bodyOverflow, initialOverflow, 'scroll restaurado')
  assert.equal(current.focusQa, 'drawer', `foco restaurado en el lanzador (${current.focus})`)
  console.log('PASS descartar: cierra todo, restaura scroll y foco')

  // B. Standalone confirmation without a Drawer.
  for (let round = 1; round <= 3; round++) {
    await enterOn('standalone')
    await wait(`document.querySelector('dialog[open]')?.innerText.includes('¿Eliminar registro?')`, 'confirmación independiente')
    if (round === 1) {
      current = await state()
      assert.equal(current.bodyOverflow, 'hidden')
      await shot('03-confirmacion-independiente')
    }
    await escape()
    current = await state()
    assert.equal(current.mounted, 0, `ronda ${round}: Escape cierra la confirmación independiente`)
    assert.equal(current.focusQa, 'standalone', `ronda ${round}: foco restaurado (${current.focus})`)
    assert.equal(current.bodyOverflow, initialOverflow)
  }
  assert.equal(current.cancels, 6)
  assert.equal(current.confirms, 0)
  await enterOn('standalone')
  await wait(`document.querySelector('dialog[open]')`, 'confirmación independiente')
  await clickIn('Confirmar')
  current = await state()
  assert.equal(current.confirms, 1, 'Confirmar sigue funcionando')
  assert.equal(current.mounted, 0)
  console.log('PASS confirmación sin Drawer: Escape cancela, Confirmar confirma, foco y scroll restaurados')

  // C. Busy confirmation: Escape and native closes cannot hide it.
  await enterOn('busy')
  await wait(`document.querySelector('dialog[open]')?.innerText.includes('¿Procesar solicitud?')`, 'confirmación ocupada')
  await escape()
  await escape()
  current = await state()
  assert.equal(current.open, 1, 'Escape no cierra una confirmación en curso')
  assert.equal(current.invisibleMounted, 0)
  assert.equal(current.cancels, 6)
  await evaluate(`document.querySelector('dialog[open]').close()`)
  await pause(150)
  current = await state()
  assert.equal(current.open, 1, 'un cierre nativo durante la operación la vuelve a mostrar')
  assert.equal(current.invisibleMounted, 0)
  await shot('04-confirmacion-ocupada')
  await evaluate(`confirmQa.setLoading(false)`)
  await pause(150)
  await escape()
  current = await state()
  assert.equal(current.mounted, 0, 'al terminar la operación Escape cancela')
  assert.equal(current.cancels, 7)
  console.log('PASS confirmación ocupada: Escape y cierre nativo no la ocultan; libre, Escape cancela')

  // D. Unexpected native close of an idle confirmation is a cancel, not a ghost.
  await enterOn('standalone')
  await wait(`document.querySelector('dialog[open]')`, 'confirmación independiente')
  await evaluate(`document.querySelector('dialog[open]').close()`)
  await wait(`!document.querySelector('dialog')`, 'cancelación tras cierre nativo')
  current = await state()
  assert.equal(current.cancels, 8)
  assert.equal(current.confirms, 1)
  assert.equal(current.bodyOverflow, initialOverflow)
  assert.equal(current.focusQa, 'standalone', `foco restaurado (${current.focus})`)
  console.log('PASS cierre nativo inesperado: se trata como cancelación sin diálogos invisibles')

  assert.deepEqual(errors, [])
  console.log(`QA D4.4: PASS · evidencia en ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
