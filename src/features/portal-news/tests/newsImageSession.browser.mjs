// News upload regression using the real HTTP client, a cookie and the Vite proxy.
// All upstream endpoints are local fixtures; no production data or credentials are used.
import assert from 'node:assert/strict'
import { createServer as httpServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import {
  createBrowserProfile,
  cleanupBrowserProfile,
  trackBrowser,
} from '../../../shared/tests/browserProfile.mjs'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const requests = []
let vite, browser, ws, profile
let news = {
  id: 42,
  title: 'Noticia de prueba',
  summary: 'Resumen de prueba',
  content: 'Contenido de prueba',
  category: { id: 1, name: 'Académico' },
  image_url: null,
  status: 'DRAFT',
  revision: 1,
  published_at: null,
  created_by: 1,
  updated_by: 1,
  published_by: null,
}
const upstream = httpServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.test')
  const authenticated =
    req.headers.cookie?.includes('eida_news_fixture=1') ?? false
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-XSRF-TOKEN',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
  const json = (status, data) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }
  requests.push({ path: url.pathname, method: req.method, authenticated })
  if (!authenticated) return json(401, { message: 'Fixture session required' })
  if (url.pathname === '/api/v1/me')
    return json(200, { data: { id: 1, roles: ['ADMINISTRADOR'] } })
  if (req.method === 'POST' && url.pathname === '/api/v1/admin/portal/news') {
    let body = ''
    for await (const chunk of req) body += chunk
    news = { ...news, ...JSON.parse(body) }
    return json(201, { data: news })
  }
  if (
    req.method === 'POST' &&
    url.pathname === '/api/v1/admin/portal/news/42/image'
  ) {
    let multipart = ''
    for await (const chunk of req) multipart += chunk.toString('latin1')
    assert.match(
      req.headers['content-type'],
      /^multipart\/form-data; boundary=/,
    )
    assert.match(multipart, /name="revision"\r\n\r\n1/)
    assert.match(multipart, /name="image"; filename="fixture.png"/)
    // Laravel may return its own absolute domain. The browser's session belongs to the frontend host.
    news = {
      ...news,
      revision: 2,
      image_url: `http://localhost:${upstream.address().port}/api/v1/admin/portal/news/42/image?v=2`,
    }
    return json(200, { data: news })
  }
  if (url.pathname === '/api/v1/admin/portal/news/42/image') {
    res.writeHead(200, {
      ...cors,
      'Content-Type': 'image/png',
      'Content-Length': png.length,
    })
    res.end(png)
    return
  }
  return json(404, { message: 'Unexpected fixture request' })
})
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  profile = await createBrowserProfile('news-image-session')
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  const evidence = join(
    process.cwd(),
    '.validation.local',
    process.env.NEWS_SESSION_QA_OUTPUT ?? 'news-image-session',
  )
  await mkdir(evidence, { recursive: true })
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  process.env.VITE_API_URL = '/backend/api/v1'
  process.env.VITE_BACKEND_URL = '/backend'
  const moduleSource = `
import React from 'react';import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';
import {NewsEditor} from '/src/features/portal-news/components/NewsEditor.tsx';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {subscribeToAuthSessionEvents} from '/src/features/auth/utils/authEvents.ts';
document.cookie='eida_news_fixture=1; Path=/; SameSite=Lax';
const qa=window.qa={saved:0,sessionEvents:[],client:httpClient};
subscribeToAuthSessionEvents(event=>qa.sessionEvents.push(event));
const root=createRoot(document.getElementById('root'));
root.render(React.createElement(NewsEditor,{initial:null,categories:{data:[{id:1,name:'Académico'}],loading:false,error:null,reload(){}},onSaved(){qa.saved++},onBusy(){}}));
window.setField=(name,value)=>{const el=document.querySelector('[name='+name+']');
const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
window.clickText=(text)=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click();
`
  vite = await createServer({
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      proxy: {
        '^/backend(?:/|\\?|$)': {
          target: `http://127.0.0.1:${upstream.address().port}`,
        },
      },
    },
    plugins: [
      {
        name: 'news-session-fixture',
        resolveId: (id) =>
          id === '/__image-proxy-module.js' ? '\0image-proxy' : undefined,
        load: (id) => (id === '\0image-proxy' ? moduleSource : undefined),
        configureServer(server) {
          server.middlewares.use('/__image-proxy', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__image-proxy',
                '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__image-proxy-module.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  browser = spawn(
    process.env.EIDA_TEST_BROWSER ||
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile.dir}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  )
  trackBrowser(profile, browser)
  let port
  for (let i = 0; i < 100 && !port; i++) {
    try {
      port = Number(
        (await readFile(join(profile.dir, 'DevToolsActivePort'), 'utf8')).split(
          '\n',
        )[0],
      )
    } catch {
      await pause(100)
    }
  }
  assert.ok(port, 'Browser started')
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  ws = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
  )
  await new Promise((resolve) =>
    ws.addEventListener('open', resolve, { once: true }),
  )
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data),
      call = pending.get(message.id)
    if (call) {
      pending.delete(message.id)
      message.error
        ? call.reject(Error(message.error.message))
        : call.resolve(message.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return
      await pause(100)
    }
    throw Error(
      'Timed out: ' +
        expression +
        '\n' +
        JSON.stringify({
          requests,
          page: await evaluate('document.body.innerText'),
          images: await evaluate(
            '[...document.images].map(img=>({src:img.src,width:img.naturalWidth}))',
          ),
        }),
    )
  }

  await send('Page.enable')
  await send('Page.navigate', { url: origin + '/__image-proxy' })
  await wait('!!document.querySelector("select[name=category_id]")')
  await evaluate(
    "setField('title','Noticia creada en prueba');setField('summary','Resumen');setField('content','Contenido');true",
  )
  await pause(80)
  await evaluate("document.querySelector('form').requestSubmit();true")
  await pause(100)
  const validation = await evaluate(
    `({message:document.querySelector('select').validationMessage,text:document.body.innerText})`,
  )
  assert.match(validation.message, /Selecciona una categoría/)
  assert.match(validation.text, /Selecciona una categoría/)
  assert.equal(
    requests.some((req) => req.method === 'POST'),
    false,
    'sin categoría no hay petición de creación',
  )
  await evaluate("setField('category_id','1');true")
  await pause(60)
  assert.equal(
    await evaluate("document.querySelector('select').validationMessage"),
    '',
  )
  await evaluate("document.querySelector('form').requestSubmit();true")
  await wait('qa.saved===1 && !!document.querySelector("input[type=file]")')
  await evaluate(
    `(()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(png.toString('base64'))}),c=>c.charCodeAt(0));const input=document.querySelector('input[type=file]');const files=new DataTransfer();files.items.add(new File([bytes],'fixture.png',{type:'image/png'}));input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true})()`,
  )
  await pause(80)
  await evaluate("clickText('Subir imagen');true")
  await wait('qa.saved===2')
  await pause(500)
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  })
  await writeFile(
    join(evidence, 'imagen-tras-subir.png'),
    Buffer.from(shot.data, 'base64'),
  )
  assert.deepEqual(
    await evaluate('qa.sessionEvents'),
    [],
    'la vista previa no debe cerrar la sesión',
  )
  await wait(
    "[...document.images].some(img=>img.src.startsWith('blob:')&&img.complete&&img.naturalWidth>0)",
  )
  assert.ok(
    requests
      .filter((req) => req.path.endsWith('/image'))
      .every((req) => req.authenticated),
    'carga y vista previa conservan la cookie de sesión',
  )
  assert.equal(await evaluate("qa.client.get('/me').then(r=>r.status)"), 200)
  // Una sesión realmente inválida mantiene la protección global de autenticación.
  await evaluate(
    "document.cookie='eida_news_fixture=; Max-Age=0; Path=/';qa.client.get('/me').catch(()=>true)",
  )
  await wait('qa.sessionEvents.length===1')
  assert.equal(await evaluate('qa.sessionEvents[0].reason'), 'SESSION_EXPIRED')
  console.log(
    'PASS: crear noticia, categoría obligatoria en español, multipart, vista previa con cookies y URL absoluta, sesión preservada y 401 real sin silenciar.',
  )
} finally {
  ws?.close()
  await cleanupBrowserProfile(profile, browser)
  await vite?.close()
  await new Promise((resolve) => upstream.close(resolve))
}
