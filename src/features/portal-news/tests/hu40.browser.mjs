// HU40 browser QA: simulated publications plus read-only checks of the local app/API.
// No administrative news operations or backend fixtures are created.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'
import { createServer } from 'vite'

const output = '.validation.local/hu40'
await mkdir(output, { recursive: true })
const results = {
  simulated: [],
  live: [],
  api: [],
  responses: [],
  errors: [],
  gaps: [],
}
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router';
import {AxiosError} from 'axios';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {HomePage} from '/src/features/home/pages/HomePage.tsx';
import {NewsPage,NewsDetailPage} from '/src/features/portal-news/pages/NewsPage.tsx';
const e=React.createElement,root=createRoot(document.getElementById('root'));
const image=location.origin+'/__hu40-image.png?backend-contract=1';
const records=Array.from({length:13},(_,i)=>({id:200-i,title:'Publicación de prueba '+String(i+1).padStart(2,'0'),
summary:'Resumen de prueba '+(i===1?'x'.repeat(180):'entregado por el transporte simulado.'),
content:'Contenido completo HU40.\\n<script>window.hu40Injected=true</script>\\n'+(i===5?'contenido %_ exclusivo':'Texto completo de prueba.')+'\\n'+'Contenido legible. '.repeat(80),
image_url:i===0?image:null,published_at:'2026-11-'+String(14-i).padStart(2,'0')+'T10:00:00-04:00'}));
const error=status=>new AxiosError('HTTP QA','ERR_BAD_RESPONSE',undefined,undefined,{status,data:{}});
let key=0;
window.newsQa={image,records,calls:[],mode:'normal',user:null,reset(path='/',mode='normal',user=null){
this.calls=[];this.mode=mode;this.user=user;
root.render(e(MemoryRouter,{key:++key,initialEntries:[path]},e(Routes,null,
e(Route,{path:'/',element:e(HomePage)}),e(Route,{path:'/news',element:e(NewsPage)}),e(Route,{path:'/news/:newsId',element:e(NewsDetailPage)}))));
},client:{async get(url,options={}){
newsQa.calls.push({url,params:options.params});
if(url==='/portal/event-categories')return {data:{data:[]}};
if(url==='/portal/events')return {data:{data:[],meta:{current_page:1,last_page:1,per_page:100,total:0}}};
if(url==='/portal/news'){
 if(newsQa.mode==='error')throw error(500);
 if(newsQa.mode==='nonpublic')return {data:{data:[{...records[0],status:'DRAFT',title:'BORRADOR RESERVADO'}],meta:{current_page:1,last_page:1,per_page:12,total:1}}};
 let visible=newsQa.mode==='empty'?[]:records;
 const term=(options.params?.search??'').toLowerCase();
 if(term)visible=visible.filter(n=>[n.title,n.summary,n.content].some(t=>t.toLowerCase().includes(term)));
 const page=options.params?.page??1,size=options.params?.per_page??12;
 return {data:{data:visible.slice((page-1)*size,page*size).map(({content,...item})=>({...item,image_url:newsQa.mode==='broken-image'&&item.image_url?location.origin+'/__hu40-missing.png':item.image_url})),
 meta:{current_page:page,last_page:Math.max(1,Math.ceil(visible.length/size)),per_page:size,total:visible.length}}};
}
const id=Number(url.split('/').at(-1)),record=records.find(n=>n.id===id);
if(url.startsWith('/portal/news/')&&record)return {data:{data:record}};
throw error(404);
}}};
newsQa.reset();
`
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let vite, chrome, ws, browserProfile
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('hu40')
  const profile = browserProfile.dir
  const fixtureImage = await readFile('src/assets/images/logo-home.png')
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'hu40-public-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__hu40.js') return '\0hu40-qa'
        },
        load(id) {
          if (id === '\0hu40-qa') return demo
          const path = id.replaceAll('\\', '/')
          if (path.endsWith('/src/shared/api/httpClient.ts'))
            return 'export const httpClient={get:(...args)=>window.newsQa.client.get(...args)};'
          if (path.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({user:window.newsQa?.user??null});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const path = req.url?.split('?')[0]
            if (path === '/__hu40-image.png') {
              res.setHeader('Content-Type', 'image/png')
              res.end(fixtureImage)
              return
            }
            if (path === '/__hu40-missing.png') {
              res.statusCode = 404
              res.end()
              return
            }
            if (path !== '/__hu40') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__hu40',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__hu40.js"></script></html>',
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
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const p = pending.get(message.id)
      pending.delete(message.id)
      message.error
        ? p.reject(new Error(message.error.message))
        : p.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      results.errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      )
    if (
      message.method === 'Network.responseReceived' &&
      message.params.type !== 'Preflight' &&
      message.params.response.url.includes('/api/v1/portal/news')
    ) {
      const r = message.params.response
      results.responses.push({ url: r.url, status: r.status })
    }
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
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(
      `Timeout ${expression}: ${await evaluate('document.body.innerText')}`,
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
  const button = async (text) => {
    assert.ok(
      await evaluate(
        `(()=>{const el=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(text)});if(!el||el.disabled)return false;el.focus();el.click();return true})()`,
      ),
      text,
    )
    await pause(50)
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(join(output, name + '.png'), Buffer.from(r.data, 'base64'))
  }
  const noOverflow = async (label) =>
    assert.ok(
      await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
      label,
    )
  const section = `document.querySelector('section[aria-label="Noticias institucionales"]')`
  const reset = async (path = '/', mode = 'normal', user = null) => {
    await evaluate(
      `window.newsQa.reset(${JSON.stringify(path)},${JSON.stringify(mode)},${JSON.stringify(user)})`,
    )
    await pause(50)
    await wait(
      `${section}?.getAttribute('aria-busy')==='false' || document.querySelector('main article') || document.querySelector('main [role=alert]')`,
    )
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.navigate', {
    url: `http://127.0.0.1:${vite.httpServer.address().port}/__hu40`,
  })
  await wait(`${section}?.querySelectorAll('article').length===6`)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await reset()
    await wait(`${section}?.querySelector('img')?.naturalWidth>0`)
    await noOverflow(`${width}px Home`)
    assert.ok(
      await evaluate(
        `${section}.innerText.includes('Publicación de prueba 01') && ${section}.innerText.includes('Resumen de prueba')`,
      ),
    )
    assert.equal(
      await evaluate(`${section}.querySelector('img').src`),
      await evaluate('newsQa.image'),
    )
    await shot(`simulated-home-${width}`)
    await click('a[aria-label="Ver todas las noticias"]')
    await wait(
      `document.querySelector('h1')?.textContent==='Noticias institucionales' && ${section}?.querySelectorAll('article').length===12`,
    )
    assert.deepEqual(
      await evaluate(
        `[...${section}.querySelectorAll('article h3')].map(el=>el.textContent)`,
      ),
      Array.from(
        { length: 12 },
        (_, i) => `Publicación de prueba ${String(i + 1).padStart(2, '0')}`,
      ),
    )
    await noOverflow(`${width}px list`)
    await shot(`simulated-list-${width}`)
    await button('Siguiente')
    await wait(
      `${section}?.querySelectorAll('article').length===1 && ${section}.innerText.includes('Publicación de prueba 13')`,
    )
    assert.equal(
      await evaluate(`!document.querySelector('input[type=search]') && ![...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Buscar')`),
      true,
    )
    await noOverflow(`${width}px without search`)
    await button('Anterior')
    await wait(`${section}.querySelectorAll('article').length===12`)
    await click('article a[href="/news/200"]')
    await wait(`document.querySelector('main article img')?.naturalWidth>0`)
    assert.ok(
      await evaluate(
        `document.querySelector('main article').innerText.includes('<script>window.hu40Injected=true</script>') && !window.hu40Injected`,
      ),
    )
    assert.ok(
      await evaluate(
        `(()=>{const el=document.querySelector('main article img'),r=el.getBoundingClientRect();return Math.abs(r.width/r.height-el.naturalWidth/el.naturalHeight)<0.03})()`,
      ),
      `${width}px detail image proportion`,
    )
    await noOverflow(`${width}px detail`)
    await shot(`simulated-detail-${width}`)
    await click('a[href="/news"]')
    await wait(`${section}?.querySelectorAll('article').length===12`)
    await click('article a[href="/news/199"]')
    await wait(
      `document.querySelector('main article h2')?.textContent==='Publicación de prueba 02'`,
    )
    assert.equal(
      await evaluate(`document.querySelector('main article img')!==null`),
      false,
    )
    await noOverflow(`${width}px detail without image`)
    results.simulated.push({
      width,
      passed: [
        'Home',
        'Ver todas',
        'date order',
        'pagination',
        'search controls omitted',
        'detail',
        'image URL/proportion',
        'no image',
        'escaped content',
        'no horizontal overflow',
      ],
    })
    console.log(
      `PASS simulated ${width}px: Home/list/pagination/detail/images, no overflow`,
    )
  }
  for (const mode of ['empty', 'error', 'nonpublic', 'broken-image']) {
    await reset('/news', mode)
    if (mode === 'empty')
      await wait(
        `document.body.innerText.includes('No hay noticias publicadas')`,
      )
    if (mode === 'nonpublic') {
      await wait(`document.querySelector('[role=alert]')`)
      assert.ok(
        !(await evaluate(
          `document.body.innerText.includes('BORRADOR RESERVADO')`,
        )),
      )
    }
    if (mode === 'broken-image')
      await wait(`document.body.innerText.includes('Imagen no disponible.')`)
    if (mode === 'error') {
      await wait(`document.querySelector('[role=alert]')`)
      await evaluate(`newsQa.mode='normal'`)
      await button('Reintentar')
      await wait(`${section}.querySelectorAll('article').length===12`)
    }
    results.simulated.push({ mode, passed: true })
  }
  for (const hiddenId of [900, 901]) {
    await reset(`/news/${hiddenId}`)
    await wait(`document.querySelector('[role=alert]')`)
    assert.equal(
      await evaluate(`document.querySelector('main article')!==null`),
      false,
    )
    assert.ok(
      await evaluate(
        `document.body.innerText.includes('no existe o ya no está disponible')`,
      ),
    )
    results.simulated.push({
      detail404: hiddenId === 900 ? 'DRAFT' : 'ARCHIVED',
      passed: true,
    })
  }
  await reset('/', 'normal', { id: 99, roles: ['ESTUDIANTE'] })
  await wait(`${section}.querySelectorAll('article').length===6`)
  assert.ok(
    await evaluate(
      `newsQa.calls.filter(c=>c.url.includes('news')).every(c=>c.url==='/portal/news')`,
    ),
  )
  results.simulated.push({ authenticatedHomeUsesPublicEndpoint: true })

  for (const path of [
    '/portal/news',
    '/portal/news?search=HU40_QA_sin_resultados',
    '/portal/news?status=DRAFT',
    '/portal/news?status=ARCHIVED',
    '/portal/news/2147483647',
    '/portal/news/2147483647/image',
  ]) {
    const r = await fetch('http://127.0.0.1:8000/api/v1' + path, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    const body = await r.json()
    results.api.push({
      path,
      status: r.status,
      total: body.meta?.total,
      records: body.data?.length,
    })
  }
  assert.equal(results.api[0].status, 200)
  const empty = results.api[0].total === 0
  if (empty)
    results.gaps.push(
      'No real published news: visibility with published/non-published fixtures, content detail, images and real pagination remain unverified. No backend fixtures were created.',
    )
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await wait(`${section}?.getAttribute('aria-busy')==='false'`)
  assert.ok(
    await evaluate(`${section}.querySelector('a[href="/news"]')!==null`),
  )
  await click('section[aria-label="Noticias institucionales"] a[href="/news"]')
  await wait(
    `location.pathname==='/news' && ${section}?.getAttribute('aria-busy')==='false'`,
  )
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await noOverflow(`live ${width}px list`)
    if (empty)
      assert.ok(
        await evaluate(
          `document.body.innerText.includes('No hay noticias publicadas')`,
        ),
      )
    await shot(`real-list-${width}`)
    assert.equal(
      await evaluate(`!document.querySelector('input[type=search]') && ![...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Buscar')`),
      true,
    )
    await noOverflow(`live ${width}px without search`)
    results.live.push({
      width,
      passed: [
        'Home navigation and Ver todas',
        'list',
        'search controls omitted',
        'empty state',
        'no horizontal overflow',
      ],
    })
    console.log(
      `PASS real ${width}px: Home navigation, list/empty state, no overflow`,
    )
  }
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/news/2147483647' })
  await wait(
    `document.querySelector('[role=alert]') && document.body.innerText.includes('no existe o ya no está disponible')`,
  )
  assert.equal(
    await evaluate(`document.querySelector('main article')!==null`),
    false,
  )
  await shot('real-detail-404')
  results.live.push({ detail404: true, exposedContent: false })
  assert.deepEqual(results.errors, [])
  console.log(
    'PASS controlled 404, simulated empty/error/retry/non-public/image failure and authenticated Home',
  )
  console.log('Evidence:', output)
} catch (error) {
  results.failure = error.stack
  throw error
} finally {
  try {
    await writeFile(
      join(output, 'browser-results.json'),
      JSON.stringify(results, null, 2) + '\n',
    )
  } finally {
    // Runs even if writing the results fails.
    ws?.close()
    await cleanupBrowserProfile(browserProfile, chrome)
    await vite?.close()
  }
}
