// Visual and behavioral QA for Etapa B2 with simulated transport.
// No backend data is read or changed.
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
import {AdminNewsPage} from '/src/features/portal-news/AdminNewsPage.tsx';
const e=React.createElement, root=createRoot(document.getElementById('root'));
const now='2026-11-05T10:00:00-04:00';
const rows=[
  {id:41,title:'Jornada institucional de bienvenida',summary:'Actividad para estudiantes de nuevo ingreso.',content:'Contenido de bienvenida.',image_url:null,published_at:'2026-11-04T10:00:00-04:00',status:'PUBLISHED',revision:4,created_by:1,updated_by:1,published_by:1,created_at:now,updated_at:now},
  {id:42,title:'Convocatoria de becas 2026',summary:'Requisitos y fechas para postular.',content:'Contenido de la convocatoria.',image_url:'/admin/portal/news/42/image',published_at:null,status:'DRAFT',revision:2,created_by:1,updated_by:1,published_by:null,created_at:now,updated_at:now},
  {id:43,title:'Resultados del congreso de investigación',summary:'Memoria del encuentro académico.',content:'Contenido de resultados.',image_url:null,published_at:'2026-10-20T09:00:00-04:00',status:'ARCHIVED',revision:7,created_by:1,updated_by:1,published_by:1,created_at:now,updated_at:now},
];
const qa={rows,calls:[],client:{}};
const imageBytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),char=>char.charCodeAt(0));
const rowOf=(url)=>{const match=String(url).match(/\\/admin\\/portal\\/news\\/(\\d+)/);return match?qa.rows.find(row=>row.id===Number(match[1])):null};
const list=()=>({data:{data:qa.rows,meta:{current_page:1,last_page:1,per_page:15,total:qa.rows.length}}});
qa.client={
  async get(url,options={}){
    qa.calls.push({method:'get',url,params:options.params,responseType:options.responseType});
    if(url==='/admin/portal/news')return list();
    if(/\\/admin\\/portal\\/news\\/\\d+\\/history$/.test(url))return {data:{data:[],meta:{current_page:1,last_page:1,per_page:15,total:0},links:{first:null,last:null,prev:null,next:null}}};
    if(String(url).includes('/image'))return {data:new Blob([imageBytes],{type:'image/png'})};
    const row=rowOf(url);
    if(row)return {data:{data:row}};
    throw new Error('Unexpected GET '+url);
  },
  async post(url,body){
    qa.calls.push({method:'post',url,body});
    if(url==='/admin/portal/news'){
      const row={id:44,title:body.title,summary:body.summary,content:body.content,image_url:null,published_at:null,status:'DRAFT',revision:1,created_by:1,updated_by:1,published_by:null,created_at:now,updated_at:now};
      qa.rows.unshift(row);
      return {data:{data:row}};
    }
    const row=rowOf(url);
    if(row&&String(url).endsWith('/image')){
      row.revision+=1;
      row.image_url='/admin/portal/news/'+row.id+'/image?v='+row.revision;
      return {data:{data:row}};
    }
    throw new Error('Unexpected POST '+url);
  },
  async patch(url,body){
    qa.calls.push({method:'patch',url,body});
    const row=rowOf(url);
    if(!row)throw new Error('Unexpected PATCH '+url);
    if(String(url).endsWith('/status')){
      row.status=body.status;
      row.revision+=1;
      if(body.status==='PUBLISHED')row.published_at=now;
      return {data:{data:row}};
    }
    Object.assign(row,{title:body.title??row.title,summary:body.summary??row.summary,content:body.content??row.content,revision:row.revision+1});
    return {data:{data:row}};
  },
  async delete(url){
    qa.calls.push({method:'delete',url});
    const row=rowOf(url);
    if(row&&String(url).endsWith('/image')){
      row.image_url=null;
      row.revision+=1;
      return {data:{data:row}};
    }
    throw new Error('Unexpected DELETE '+url);
  },
};
window.newsEditorQa=qa;
root.render(e(MemoryRouter,{initialEntries:['/admin/portal/news']},e(AdminNewsPage)));
`

let vite, chrome, ws, browserProfile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('news-editor')
  const profile = browserProfile.dir
  const evidence = join(process.cwd(), '.validation.local', 'newsEditor')
  await mkdir(evidence, { recursive: true })
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'news-editor-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__news-editor.js') return '\0news-editor-qa'
        },
        load(id) {
          if (id === '\0news-editor-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.newsEditorQa.client.get(...args),post:(...args)=>window.newsEditorQa.client.post(...args),patch:(...args)=>window.newsEditorQa.client.patch(...args),delete:(...args)=>window.newsEditorQa.client.delete(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__news-editor') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__news-editor',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__news-editor.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__news-editor')).status, 200)
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
  const wait = async (expression) => {
    for (let index = 0; index < 160; index++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(
      `Timeout ${expression}: ${await evaluate('document.body.innerText')}`,
    )
  }
  const click = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const el=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)}&&!node.disabled);if(!el)return false;el.focus();el.click();return true})()`,
      ),
      label,
    )
    await pause(90)
  }
  const clickSelector = async (selector) => {
    assert.ok(
      await evaluate(
        `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return false;el.focus();el.click();return true})()`,
      ),
      selector,
    )
    await pause(90)
  }
  const field = async (selector, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing field');const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`,
    )
    await pause(70)
  }
  const pressEscape = async (keyUp = true) => {
    const params = {
      key: 'Escape',
      code: 'Escape',
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params })
    if (keyUp)
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params })
    await pause(120)
  }
  const openRow = async (title) => {
    assert.ok(
      await evaluate(
        `(()=>{const row=[...document.querySelectorAll('tbody tr')].find(node=>node.textContent.includes(${JSON.stringify(title)}));const button=row?.querySelector('button');if(!button||button.disabled)return false;button.focus();button.click();return true})()`,
      ),
      title,
    )
    await wait(`document.querySelector('dialog[open] input[name=title]')`)
    await pause(250)
  }
  const closeX = async () => {
    await clickSelector('button[aria-label="Cerrar ventana"]')
    await wait(`document.querySelectorAll('dialog[open]').length===0`)
    await pause(100)
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(
      join(evidence, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }
  const setWidth = async (width) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(120)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: origin + '/__news-editor' })
  await wait(
    `document.querySelector('h1')?.textContent==='Gestión de noticias' && document.querySelectorAll('tbody tr').length===3`,
  )

  for (const width of [1440, 768, 390, 320]) {
    await setWidth(width)
    await openRow('Convocatoria de becas 2026')
    const layout = await evaluate(`(()=>{
      const dialog=document.querySelector('dialog[open]');
      const header=dialog?.querySelector(':scope > header');
      const body=[...dialog.children].find(node=>node.tagName==='DIV');
      const footer=dialog?.querySelector(':scope > footer');
      const rect=dialog.getBoundingClientRect();
      const headerRect=header?.getBoundingClientRect();
      const footerRect=footer?.getBoundingClientRect();
      return {
        hasHeader:Boolean(header),
        hasBody:Boolean(body),
        hasFooter:Boolean(footer),
        footerText:footer?.textContent.replace(/\\s+/g,' ').trim(),
        footerFixed:footerRect.bottom<=innerHeight+1&&footerRect.top>=0,
        headerFixed:headerRect.top>=0&&headerRect.bottom<=innerHeight+1,
        bodyScrolls:getComputedStyle(body).overflowY==='auto'&&body.scrollHeight>=body.clientHeight,
        fits:document.documentElement.scrollWidth<=innerWidth+1&&rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1,
        bodyHeight:body.clientHeight,
        bodyScrollHeight:body.scrollHeight,
        closeFocused:document.activeElement?.getAttribute('aria-label')==='Cerrar ventana',
        scrollLocked:document.body.style.overflow==='hidden',
        imageLoaded:Boolean(dialog.querySelector('img')?.naturalWidth>0),
        imageState:dialog.querySelector('img')?.src??dialog.querySelector('[role=status]')?.textContent??dialog.querySelector('[role=alert]')?.textContent??null,
        pageWidth:document.documentElement.scrollWidth,
        viewport:innerWidth,
        rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},
        sections:[...dialog.querySelectorAll('section h3')].map(node=>node.textContent.trim()),
      };
    })()`)
    console.log(`LAYOUT ${width}`, JSON.stringify(layout))
    assert.equal(layout.hasHeader, true, `header at ${width}px`)
    assert.equal(layout.hasBody, true, `scroll body at ${width}px`)
    assert.equal(layout.hasFooter, true, `footer at ${width}px`)
    assert.match(layout.footerText, /Cancelar.*Guardar noticia/, `footer at ${width}px`)
    assert.equal(layout.footerFixed, true, `fixed footer at ${width}px`)
    assert.equal(layout.headerFixed, true, `fixed header at ${width}px`)
    assert.equal(layout.bodyScrolls, true, `internal scroll at ${width}px`)
    assert.equal(layout.fits, true, `drawer fits at ${width}px`)
    assert.equal(layout.closeFocused, true, `initial focus at ${width}px`)
    assert.equal(layout.scrollLocked, true, `scroll lock at ${width}px`)
    assert.equal(layout.imageLoaded, true, `image preview at ${width}px`)
    assert.ok(layout.sections.includes('Contenido'))
    assert.ok(layout.sections.includes('Imagen'))
    assert.ok(layout.sections.includes('Publicación y archivo'))
    await shot(`news-editor-${width}`)
    await closeX()
    assert.equal(
      await evaluate(`document.body.style.overflow`),
      '',
      `scroll restored at ${width}px`,
    )
    console.log(
      `PASS ${width}px: drawer, header/footer fijos, scroll interno, foco, imagen y sin desborde`,
    )
  }

  await setWidth(1440)
  await openRow('Convocatoria de becas 2026')
  await pressEscape()
  await wait(`document.querySelectorAll('dialog[open]').length===0`)
  console.log('PASS Escape sin cambios: cierra directamente sin confirmación')

  await openRow('Convocatoria de becas 2026')
  await field('dialog input[name=title]', 'Cambio local sin guardar')
  await clickSelector('button[aria-label="Cerrar ventana"]')
  await wait(`document.querySelector('[role=alertdialog]')`)
  let confirmation = await evaluate(
    `(()=>{const d=document.querySelector('[role=alertdialog]');return {text:d.innerText,buttons:[...d.querySelectorAll('button')].map(b=>b.textContent.trim())}})()`,
  )
  assert.match(confirmation.text, /¿Descartar los cambios\?/)
  assert.match(confirmation.text, /se perderá/)
  assert.deepEqual(confirmation.buttons, ['Seguir editando', 'Descartar cambios'])
  await click('Seguir editando')
  await wait(`!document.querySelector('[role=alertdialog]')`)
  assert.equal(
    await evaluate(`document.querySelector('dialog[open] input[name=title]').value`),
    'Cambio local sin guardar',
  )
  await pressEscape()
  await wait(`document.querySelector('[role=alertdialog]')`)
  await pressEscape(false)
  await wait(`!document.querySelector('[role=alertdialog]')`)
  assert.ok(
    await evaluate(`Boolean(document.querySelector('dialog[open] input[name=title]'))`),
  )
  assert.equal(
    await evaluate(`document.querySelector('dialog[open] input[name=title]').value`),
    'Cambio local sin guardar',
  )
  await clickSelector('button[aria-label="Cerrar ventana"]')
  await wait(`document.querySelector('[role=alertdialog]')`)
  await click('Descartar cambios')
  await wait(`document.querySelectorAll('dialog[open]').length===0`)
  console.log(
    'PASS cambios sin guardar: confirmación, seguir editando, Escape y descarte',
  )

  await openRow('Convocatoria de becas 2026')
  const png = await evaluate(
    `(()=>{const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.fillStyle='#004aad';ctx.fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1]})()`,
  )
  const imagePath = join(profile, 'qa-replacement.png')
  await writeFile(imagePath, Buffer.from(png, 'base64'))
  const documentNode = await send('DOM.getDocument')
  const inputNode = await send('DOM.querySelector', {
    nodeId: documentNode.root.nodeId,
    selector: 'dialog input[name=image]',
  })
  await send('DOM.setFileInputFiles', {
    nodeId: inputNode.nodeId,
    files: [imagePath],
  })
  await pause(100)
  await pressEscape()
  await wait(`document.querySelector('[role=alertdialog]')`)
  await click('Seguir editando')
  await wait(`!document.querySelector('[role=alertdialog]')`)
  assert.ok(
    await evaluate(
      `Boolean(document.querySelector('dialog[open] input[name=image]').files.length)`,
    ),
  )
  await clickSelector('button[aria-label="Cerrar ventana"]')
  await wait(`document.querySelector('[role=alertdialog]')`)
  await click('Descartar cambios')
  await wait(`document.querySelectorAll('dialog[open]').length===0`)
  console.log('PASS imagen seleccionada: dirty state y confirmación de descarte')

  await openRow('Convocatoria de becas 2026')
  await click('Publicar')
  await wait(`document.querySelector('dialog[open] section[aria-labelledby="news-action-confirmation-title"]')`)
  await pressEscape()
  await wait(`document.querySelector('[role=alertdialog]')`)
  await click('Seguir editando')
  await wait(`!document.querySelector('[role=alertdialog]')`)
  assert.ok(
    await evaluate(
      `Boolean(document.querySelector('dialog[open] section[aria-labelledby="news-action-confirmation-title"]'))`,
    ),
  )
  await click('Cancelar')
  await wait(`!document.querySelector('dialog[open] section[aria-labelledby="news-action-confirmation-title"]')`)
  await closeX()
  console.log(
    'PASS acción pendiente: dirty state, confirmación y Cancelar conserva formulario',
  )

  await openRow('Convocatoria de becas 2026')
  const beforeSave = await evaluate(
    `window.newsEditorQa.rows.find(row=>row.id===42).revision`,
  )
  await field('dialog textarea[name=summary]', 'Resumen guardado desde B2.')
  await click('Guardar noticia')
  await wait(
    `window.newsEditorQa.calls.some(call=>call.method==='patch'&&call.url==='/admin/portal/news/42') && document.querySelector('dialog')?.getAttribute('aria-busy')==='false'`,
  )
  const saved = await evaluate(
    `(()=>{const row=window.newsEditorQa.rows.find(row=>row.id===42);return {summary:row.summary,revision:row.revision}})()`,
  )
  assert.equal(saved.summary, 'Resumen guardado desde B2.')
  assert.equal(saved.revision, beforeSave + 1)
  await closeX()
  console.log('PASS edición: guarda con revisión, actualiza y cierra sin confirmación')

  await openRow('Convocatoria de becas 2026')
  await wait(`document.querySelector('dialog img')?.naturalWidth>0`)
  // "Subir imagen" is disabled until a file is selected.
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('dialog[open] button')].find(button=>button.textContent.trim()==='Subir imagen')?.disabled`,
    ),
    true,
    'Subir imagen must be disabled without a selected file',
  )
  {
    const documentNode = await send('DOM.getDocument')
    const inputNode = await send('DOM.querySelector', {
      nodeId: documentNode.root.nodeId,
      selector: 'dialog[open] input[name=image]',
    })
    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [imagePath],
    })
  }
  await wait(
    `[...document.querySelectorAll('dialog[open] button')].find(button=>button.textContent.trim()==='Subir imagen')?.disabled===false`,
  )
  await click('Subir imagen')
  await wait(
    `window.newsEditorQa.calls.some(call=>call.method==='post'&&call.url==='/admin/portal/news/42/image') && document.querySelector('dialog[open] img')?.naturalWidth>0`,
  )
  const uploaded = await evaluate(
    `(()=>{const row=window.newsEditorQa.rows.find(row=>row.id===42);return {image:row.image_url,revision:row.revision}})()`,
  )
  assert.match(uploaded.image, /\/admin\/portal\/news\/42\/image/)
  await click('Eliminar imagen')
  await wait(`document.querySelector('dialog[open] section[aria-labelledby="news-action-confirmation-title"]')`)
  await click('Confirmar operación')
  await wait(
    `window.newsEditorQa.calls.some(call=>call.method==='delete'&&call.url==='/admin/portal/news/42/image') && document.querySelector('dialog[open]')?.innerText.includes('La noticia no tiene imagen.')`,
  )
  await closeX()
  console.log('PASS imagen: vista previa, reemplazo y eliminación con confirmación')

  await openRow('Convocatoria de becas 2026')
  await click('Publicar')
  await click('Confirmar operación')
  await wait(
    `window.newsEditorQa.rows.find(row=>row.id===42).status==='PUBLISHED' && document.querySelector('dialog[open]')?.innerText.replace(/\\s+/g,' ').includes('Estado: Publicado')`,
  )
  await click('Archivar')
  await click('Confirmar operación')
  await wait(
    `window.newsEditorQa.rows.find(row=>row.id===42).status==='ARCHIVED' && document.querySelector('dialog[open]')?.innerText.replace(/\\s+/g,' ').includes('Estado: Archivado')`,
  )
  await closeX()
  console.log('PASS publicación y archivo: confirmaciones, estados y cierre limpio')

  await click('Crear noticia')
  await wait(`document.querySelector('dialog[open] input[name=title]')`)
  const createState = await evaluate(
    `(()=>{const d=document.querySelector('dialog[open]');return {title:d.querySelector('h2')?.textContent.trim(),footer:d.querySelector('footer')?.textContent.replace(/\\s+/g,' ').trim()}})()`,
  )
  assert.equal(createState.title, 'Nueva noticia')
  assert.match(createState.footer, /Cancelar.*Crear borrador/)
  await field('dialog input[name=title]', 'Nota creada en B2')
  await field('dialog textarea[name=summary]', 'Resumen de creación.')
  await field('dialog textarea[name=content]', 'Contenido de creación.')
  await click('Crear borrador')
  await wait(
    `window.newsEditorQa.calls.some(call=>call.method==='post'&&call.url==='/admin/portal/news') && document.querySelector('dialog[open] input[name=title]')?.value==='Nota creada en B2'`,
  )
  const created = await evaluate(
    `(()=>{const row=window.newsEditorQa.rows.find(row=>row.id===44);return row&&{status:row.status,revision:row.revision}})()`,
  )
  assert.deepEqual(created, { status: 'DRAFT', revision: 1 })
  await closeX()
  console.log('PASS creación: Drawer, borrador y transición a edición')

  const callsBefore = await evaluate('window.newsEditorQa.calls.length')
  await click('Crear noticia')
  await wait(`document.querySelector('dialog[open] input[name=title]')`)
  await field('dialog input[name=title]', 'Borrador cancelado')
  await pressEscape()
  await wait(`document.querySelector('[role=alertdialog]')`)
  await click('Descartar cambios')
  await wait(`document.querySelectorAll('dialog[open]').length===0`)
  assert.equal(await evaluate('window.newsEditorQa.calls.length'), callsBefore)
  console.log('PASS cancelar creación con cambios: no envía datos')

  await setWidth(320)
  await openRow('Convocatoria de becas 2026')
  const scrollState = await evaluate(`(()=>{
    const dialog=document.querySelector('dialog[open]');
    const body=[...dialog.children].find(node=>node.tagName==='DIV');
    const footer=dialog.querySelector(':scope > footer');
    const header=dialog.querySelector(':scope > header');
    const before={footer:footer.getBoundingClientRect().top,header:header.getBoundingClientRect().top};
    body.scrollTop=body.scrollHeight;
    return new Promise(done=>requestAnimationFrame(()=>{const after={footer:footer.getBoundingClientRect().top,header:header.getBoundingClientRect().top};done({before,after,footerVisible:footer.getBoundingClientRect().bottom<=innerHeight+1,bodyScrollTop:body.scrollTop,fitsViewport:document.documentElement.scrollWidth<=innerWidth+1})}));
  })()`)
  assert.equal(scrollState.footerVisible, true)
  assert.ok(scrollState.bodyScrollTop > 0)
  assert.ok(Math.abs(scrollState.before.footer - scrollState.after.footer) <= 1)
  assert.ok(Math.abs(scrollState.before.header - scrollState.after.header) <= 1)
  // `scrollWidth <= innerWidth + 1` is true when there is no horizontal overflow.
  assert.equal(scrollState.fitsViewport, true, 'no horizontal overflow')
  await shot('news-editor-mobile-scroll')
  await closeX()
  console.log('PASS 320px: scroll interno no mueve header ni footer')

  assert.deepEqual(errors, [])
  await setWidth(1440)
  await shot('news-editor-final')
  console.log(`Capturas: ${evidence}`)
} finally {
  ws?.close()
  await cleanupBrowserProfile(browserProfile, chrome)
  await vite?.close()
}
