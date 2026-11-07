// Real Vite proxy, Axios, cookies, React StrictMode and browser image decoding.
// The upstream is an HTTP fixture; no application data or credentials are used.
import assert from 'node:assert/strict'
import { createServer as httpServer } from 'node:http'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const png = await readFile('src/assets/images/logo-home.png')
const profile = await mkdtemp(join(tmpdir(), 'eida-image-proxy-'))
const requests = []
let version = 1,
  vite,
  browser,
  ws
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const upstream = httpServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.test')
  const prefix = req.headers['x-forwarded-prefix'] || ''
  const authenticated =
    req.headers.cookie?.includes('eida_image_fixture=1') || false
  requests.push({
    path: url.pathname,
    prefix,
    authenticated,
    method: req.method,
  })
  const json = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
  if (!url.pathname.startsWith('/api/v1/portal/') && !authenticated)
    return json(401, { message: 'Fixture session required' })
  const photoUrl = () =>
    `http://${req.headers.host}${prefix}/api/v1/students/profile/photo?v=${version}`
  if (req.method === 'POST') {
    let multipart = ''
    for await (const chunk of req) multipart += chunk.toString('latin1')
    assert.match(
      req.headers['content-type'],
      /^multipart\/form-data; boundary=/,
    )
    assert.match(multipart, /name="photo"/)
    version++
    return json(200, { data: { profile_photo_url: photoUrl() } })
  }
  if (url.pathname === '/api/v1/students/profile')
    return json(200, { data: { profile_photo_url: photoUrl() } })
  if (url.searchParams.get('v') === 'missing')
    return json(404, { message: 'Image missing' })
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': png.length,
    'Cache-Control': 'private, no-store',
  })
  res.end(png)
})

try {
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  const moduleSource = `
import React,{StrictMode,useState} from 'react';import {createRoot} from 'react-dom/client';
import {getStudentProfile,updateStudentProfilePhoto} from '/src/features/students/api/studentProfileApi.ts';
import {StudentProfilePhoto} from '/src/features/students/components/StudentProfilePhoto.tsx';
import {AuthenticatedImage} from '/src/shared/components/AuthenticatedImage/AuthenticatedImage.tsx';
import {AuthenticatedNewsImage,NewsImage} from '/src/features/portal-news/components/NewsImage.tsx';
document.cookie='eida_image_fixture=1; Path=/; SameSite=Lax';
window.__urls={created:[],revoked:[]};const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);window.__urls.created.push(url);return url};
URL.revokeObjectURL=url=>{window.__urls.revoked.push(url);return revoke(url)};
const root=createRoot(document.getElementById('root'));window.__unmount=()=>root.unmount();
function Demo({initial}){const [url,setUrl]=useState(initial);
window.__missing=()=>setUrl(initial.replace(/v=\\d+/,'v=missing'));
async function update(file){const result=await updateStudentProfilePhoto(file);setUrl(result.data.profile_photo_url);return true}
window.__replace=()=>update(new File([new Uint8Array([1,2,3])],'fixture.png',{type:'image/png'}));
return React.createElement(React.Fragment,null,
React.createElement(StudentProfilePhoto,{photoUrl:url,updating:false,error:null,onUpdate:update}),
React.createElement(AuthenticatedImage,{url:location.origin+'/backend/api/v1/admin/students/17/historical-photo',alt:'Histórica',placeholder:'Sin histórica'}),
React.createElement(AuthenticatedNewsImage,{url:location.origin+'/backend/api/v1/admin/portal/news/41/image',title:'Noticia administrativa',revision:1}),
React.createElement(NewsImage,{url:location.origin+'/backend/api/v1/portal/news/41/image',title:'Noticia publicada'}))}
getStudentProfile().then(({data})=>root.render(React.createElement(StrictMode,null,React.createElement(Demo,{initial:data.profile_photo_url}))));`
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
        name: 'image-proxy-browser-fixture',
        resolveId: (id) =>
          id === '/__image-proxy-module.js' ? '\0image-proxy' : undefined,
        load: (id) => (id === '\0image-proxy' ? moduleSource : undefined),
        configureServer(server) {
          server.middlewares.use('/__image-proxy', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__image-proxy',
                '<!doctype html><div id="root"></div><script type="module" src="/__image-proxy-module.js"></script>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  const bad = await fetch(origin + '/api/v1/students/profile/photo', {
    headers: { Accept: 'application/json' },
  })
  assert.equal(
    bad.status,
    404,
    'Unprefixed URL reproduces the original Axios failure',
  )
  browser = spawn(
    process.env.EIDA_TEST_BROWSER ||
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
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
  let port
  for (let i = 0; i < 100 && !port; i++) {
    try {
      port = Number(
        (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
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
  await send('Page.navigate', { url: origin + '/__image-proxy' })
  const decoded =
    "document.querySelectorAll('img').length===4 && [...document.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0)"
  await wait(decoded)
  assert.ok(requests.every((req) => req.prefix === '/backend'))
  assert.ok(
    requests
      .filter((req) => !req.path.includes('/portal/news/41/image'))
      .every((req) => req.authenticated),
  )
  const first = await evaluate("document.querySelector('img').src")
  assert.match(first, /^blob:/)
  assert.equal(
    await evaluate(
      'window.__urls.revoked.includes(document.querySelector("img").src)',
    ),
    false,
  )
  await evaluate('window.__missing()')
  await wait(
    "document.body.innerText.includes('No se pudo cargar la fotografía')",
  )
  await evaluate('window.__replace()')
  await wait(decoded)
  assert.notEqual(await evaluate("document.querySelector('img').src"), first)
  assert.equal(
    await evaluate(
      "document.body.innerText.includes('No se pudo cargar la fotografía')",
    ),
    false,
  )
  assert.ok(requests.some((req) => req.method === 'POST' && req.authenticated))
  await evaluate('window.__unmount()')
  assert.equal(
    await evaluate(
      'window.__urls.created.every(url=>window.__urls.revoked.includes(url))',
    ),
    true,
  )
  console.log(
    'PASS: real proxy prefix, cookie session, StrictMode, Blob decoding, 404 recovery, replacement, public/admin news and Object URL cleanup',
  )
} finally {
  ws?.close()
  browser?.kill()
  await vite?.close()
  await new Promise((resolve) => upstream.close(resolve))
}
