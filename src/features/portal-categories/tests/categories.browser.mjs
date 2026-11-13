// D2 visual + functional QA for HU39/HU41 categories with SIMULATED transport.
// httpClient is replaced by an in-memory store: no backend is read or written,
// and any unexpected request throws. Evidence: .validation.local/d2-categories/.
// Run: node src/features/portal-categories/tests/categories.browser.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'

const evidence = resolve(process.env.D2_QA_OUTPUT ?? '.validation.local/d2-categories')
const WIDTHS = [320, 390, 600, 768, 900, 1024, 1440]
const ROUTES = [
  '/admin/portal/events/categories',
  '/admin/portal/news/categories',
  '/admin/portal/events',
  '/admin/portal/news',
  '/news',
]

const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Routes, Route} from 'react-router';
import {AxiosError} from 'axios';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminEventCategoriesPage, AdminNewsCategoriesPage} from '/src/features/portal-categories/AdminCategoriesPage.tsx';
import {AdminNewsPage} from '/src/features/portal-news/pages/AdminNewsPage.tsx';
import {NewsPage} from '/src/features/portal-news/pages/NewsPage.tsx';
import {AdminCalendarPage} from '/src/features/portal-calendar/pages/AdminCalendarPage.tsx';
const e=React.createElement;
const fail=(status,data={})=>new AxiosError('QA','ERR_BAD_RESPONSE',undefined,undefined,{status,data});
const eventNames=['Actividades académicas','Admisiones','Becas','Ceremonias','Congresos','Cultura','Deportes','Egresados','Exámenes','Ferias','Graduaciones','Investigación','Jornadas','Talleres','Tutorías','Voluntariado'];
const cats={
  event:[...eventNames.map((name,i)=>({id:i+1,name,is_active:true,revision:1})),{id:17,name:'Ferias antiguas',is_active:false,revision:4}],
  news:[{id:1,name:'Académico',is_active:true,revision:1},{id:2,name:'Institucional',is_active:true,revision:1},{id:3,name:'Tecnología',is_active:true,revision:1},{id:4,name:'Convocatorias',is_active:true,revision:1},{id:5,name:'Boletín histórico',is_active:false,revision:3}],
};
const history={};
const snap=c=>({id:c.id,name:c.name,is_active:c.is_active,revision:c.revision});
const log=(catalog,before,after,action)=>{const k=catalog+':'+after.id;(history[k]??=[]).unshift({id:Math.floor(Math.random()*1e9),entity_type:catalog==='news'?'PortalNewsCategory':'PortalEventCategory',entity_id:after.id,action,actor_id:3,actor_name:'QA Admin',created_at:new Date().toISOString(),old_values:before,new_values:after});};
for(let i=0;i<12;i++)(history['event:1']??=[]).push({id:1000-i,entity_type:'PortalEventCategory',entity_id:1,action:i===11?'PORTAL_CATEGORY_CREATED':'PORTAL_CATEGORY_UPDATED',actor_id:3,actor_name:'Ana Pérez',created_at:new Date(Date.UTC(2026,10,1,12+i)).toISOString(),old_values:i===11?null:{id:1,name:'Nombre '+(i+1),is_active:true,revision:12-i},new_values:{id:1,name:i===0?'Actividades académicas':'Nombre '+i,is_active:true,revision:13-i}});
const ref=(catalog,id)=>{const c=cats[catalog].find(x=>x.id===id);return c?{id:c.id,name:c.name}:null};
const news=[
  {id:41,title:'Jornada institucional de bienvenida',summary:'Actividad para estudiantes nuevos.',content:'Contenido 41',image_url:null,published_at:'2026-11-04T10:00:00-04:00',status:'PUBLISHED',revision:4,created_by:1,updated_by:1,published_by:1,category:ref('news',1)},
  {id:42,title:'Noticia histórica sin categoría',summary:'Publicada antes de las categorías.',content:'Contenido 42',image_url:null,published_at:'2026-10-01T10:00:00-04:00',status:'PUBLISHED',revision:2,created_by:1,updated_by:1,published_by:1,category:null},
  {id:43,title:'Boletín de octubre',summary:'Categoría ya desactivada.',content:'Contenido 43',image_url:null,published_at:null,status:'DRAFT',revision:6,created_by:1,updated_by:1,published_by:null,category:ref('news',5)},
];
const events=[
  {id:47,title:'Feria de proyectos 2025',description:'Evento histórico.',starts_at:'2026-11-20T09:00:00-04:00',ends_at:'2026-11-20T11:00:00-04:00',all_day:false,location:'Auditorio',category:ref('event',17),status:'DRAFT',visibility:'PUBLIC',published_at:null,revision:3,created_by:1,updated_by:1},
  {id:48,title:'Inicio de inscripciones',description:'Gestión 2027.',starts_at:'2026-12-01T08:00:00-04:00',ends_at:'2026-12-01T12:00:00-04:00',all_day:false,location:'Campus',category:ref('event',2),status:'PUBLISHED',visibility:'PUBLIC',published_at:'2026-11-01T10:00:00-04:00',revision:2,created_by:1,updated_by:1},
];
const pageOf=(rows,p={},size=15)=>{const per=Number(p.per_page??size),cur=Number(p.page??1),last=Math.max(1,Math.ceil(rows.length/per));return {data:rows.slice((cur-1)*per,cur*per),meta:{current_page:cur,last_page:last,per_page:per,total:rows.length},links:{first:null,last:null,prev:cur>1?'p':null,next:cur<last?'n':null}}};
const byName=(a,b)=>a.name.localeCompare(b.name,'es')||a.id-b.id;
const qa=window.qa={cats,news,events,history,calls:[],failures:{},gate:null,
  failNext(pattern,status){qa.failures[pattern]=status},
  hold(){let release;qa.gate=new Promise(done=>release=done);qa.release=()=>{qa.gate=null;release()}},
  bump(catalog,id,name){const c=cats[catalog].find(x=>x.id===id);c.revision++;if(name)c.name=name},
};
async function answer(method,url,options={},body){
  const p=options.params??{};
  qa.calls.push({method,url,params:p,body});
  if(qa.gate)await qa.gate;
  for(const [pattern,status] of Object.entries(qa.failures)){if(url.includes(pattern)&&method==='get'){delete qa.failures[pattern];throw fail(status,{message:'raw backend detail'})}}
  let m=url.match(/^\\/admin\\/portal\\/(event|news)-categories\\/manage(?:\\/(\\d+))?(\\/status|\\/history)?$/);
  if(m){
    const [,catalog,idText,suffix]=m, list=cats[catalog], id=Number(idText);
    if(method==='delete')throw fail(405);
    if(!idText&&method==='get'){
      const rows=list.filter(c=>(!p.search||c.name.toLowerCase().includes(String(p.search).toLowerCase()))&&(p.is_active===undefined||c.is_active===p.is_active)).sort(byName);
      const r=pageOf(rows,p);delete r.links;return {data:r};
    }
    const cat=list.find(c=>c.id===id);
    if(idText&&!cat)throw fail(404,{message:'No encontrado'});
    if(suffix==='/history'){const r=pageOf(history[catalog+':'+id]??[],p,10);delete r.links;return {data:r}}
    if(method==='post'){
      const name=String(body.name??'').trim();
      if(list.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw fail(422,{message:'Ya existe una categoría con ese nombre.',errors:{name:['Ya existe una categoría con ese nombre.']}});
      const c={id:Math.max(...list.map(x=>x.id))+1,name,is_active:true,revision:1};list.push(c);log(catalog,null,snap(c),'PORTAL_CATEGORY_CREATED');return {data:{data:snap(c)}};
    }
    if(method==='patch'){
      if(body.revision!==cat.revision)throw fail(409,{code:'REVISION_CONFLICT',message:'La categoría fue modificada.',current_revision:cat.revision});
      const before=snap(cat);
      if(suffix==='/status'){if(cat.is_active===body.is_active)return {data:{data:before}};cat.is_active=body.is_active;cat.revision++;log(catalog,before,snap(cat),'PORTAL_CATEGORY_STATUS_CHANGED');return {data:{data:snap(cat)}}}
      const name=String(body.name).trim();
      if(list.some(c=>c.id!==id&&c.name.toLowerCase()===name.toLowerCase()))throw fail(422,{message:'Ya existe una categoría con ese nombre.',errors:{name:['Ya existe una categoría con ese nombre.']}});
      if(cat.name===name)return {data:{data:before}};
      cat.name=name;cat.revision++;log(catalog,before,snap(cat),'PORTAL_CATEGORY_UPDATED');return {data:{data:snap(cat)}};
    }
  }
  m=url.match(/^(\\/admin)?\\/portal\\/(event|news)-categories$/);
  if(m&&method==='get')return {data:{data:cats[m[2]].filter(c=>c.is_active).sort(byName).map(c=>({id:c.id,name:c.name}))}};
  if(url==='/admin/portal/news'&&method==='get'){const rows=news.filter(n=>(!p.status||n.status===p.status)&&(!p.category_id||n.category?.id===p.category_id)&&(!p.search||n.title.toLowerCase().includes(String(p.search).toLowerCase())));const r=pageOf(rows,p);delete r.links;return {data:r}}
  if(url==='/portal/news'&&method==='get'){const rows=news.filter(n=>n.status==='PUBLISHED'&&(!p.category_id||n.category?.id===p.category_id)).map(({status,revision,created_by,updated_by,published_by,content,...n})=>n);const r=pageOf(rows,p);delete r.links;return {data:r}}
  if(url==='/admin/portal/news'&&method==='post'){
    const cat=cats.news.find(c=>c.id===body.category_id&&c.is_active);
    if(!cat)throw fail(422,{message:'La categoría es obligatoria.',errors:{category_id:['Selecciona una categoría activa.']}});
    const n={id:90+news.length,title:body.title,summary:body.summary,content:body.content,image_url:null,published_at:null,status:'DRAFT',revision:1,created_by:1,updated_by:1,published_by:null,category:ref('news',cat.id)};news.push(n);return {data:{data:n}};
  }
  m=url.match(/^\\/admin\\/portal\\/news\\/(\\d+)(\\/status|\\/history)?$/);
  if(m){
    const n=news.find(x=>x.id===Number(m[1]));
    if(m[2]==='/history')return {data:pageOf([],p)};
    if(method==='get')return {data:{data:n}};
    if(method==='patch'){
      if(body.revision!==n.revision)throw fail(409,{code:'REVISION_CONFLICT',current_revision:n.revision});
      if(m[2]==='/status'){n.status=body.status;n.revision++;return {data:{data:n}}}
      if('category_id' in body){const cat=cats.news.find(c=>c.id===body.category_id&&c.is_active);if(!cat)throw fail(422,{errors:{category_id:['Selecciona una categoría activa.']}});n.category=ref('news',cat.id)}
      for(const k of ['title','summary','content'])if(k in body)n[k]=body[k];
      n.revision++;return {data:{data:n}};
    }
  }
  if(url==='/admin/portal/events'&&method==='get'){const rows=events.filter(ev=>!p.category_id||ev.category.id===p.category_id);const r=pageOf(rows,p);delete r.links;return {data:r}}
  m=url.match(/^\\/admin\\/portal\\/events\\/(\\d+)(\\/history)?$/);
  if(m&&method==='get')return m[2]?{data:pageOf([],p)}:{data:{data:events.find(ev=>ev.id===Number(m[1]))}};
  throw new Error('Unexpected '+method.toUpperCase()+' '+url);
}
window.qaClient={
  get:(url,o)=>answer('get',url,o),
  post:(url,body,o)=>answer('post',url,o,body),
  patch:(url,body,o)=>answer('patch',url,o,body),
  delete:(url,o)=>answer('delete',url,o,o?.data),
};
const path=new URLSearchParams(location.search).get('path');
createRoot(document.getElementById('root')).render(e(MemoryRouter,{initialEntries:[path]},e(Routes,null,
  e(Route,{path:'/admin/portal/events/categories',element:e(AdminEventCategoriesPage)}),
  e(Route,{path:'/admin/portal/news/categories',element:e(AdminNewsCategoriesPage)}),
  e(Route,{path:'/admin/portal/events',element:e(AdminCalendarPage)}),
  e(Route,{path:'/admin/portal/news',element:e(AdminNewsPage)}),
  e(Route,{path:'/news',element:e(NewsPage)}),
)));
`

let vite, chrome, ws, profile
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
const findings = []
const check = (ok, message) => {
  if (!ok) findings.push(message)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`)
}
try {
  profile = await mkdtemp(join(tmpdir(), 'eida-d2-categories-'))
  await mkdir(evidence, { recursive: true })
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'd2-categories-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__d2.js') return '\0d2-categories-qa'
        },
        load(id) {
          if (id === '\0d2-categories-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return 'export const httpClient={get:(...a)=>window.qaClient.get(...a),post:(...a)=>window.qaClient.post(...a),patch:(...a)=>window.qaClient.patch(...a),delete:(...a)=>window.qaClient.delete(...a)};'
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__d2') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__d2',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__d2.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  chrome = spawn(
    process.env.EIDA_QA_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' },
  )
  let launchError
  chrome.on('error', (error) => (launchError = error))
  let port
  for (let index = 0; index < 80 && !port; index++) {
    if (launchError) throw launchError
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0])
    } catch {
      await pause(250)
    }
  }
  assert.ok(port, 'Chrome debugging port')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
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
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const wait = async (expression, label = expression) => {
    for (let index = 0; index < 100; index++) {
      if (await evaluate(`Boolean(${expression})`)) return true
      await pause(80)
    }
    throw new Error(`Timeout ${label}: ${(await evaluate('document.body.innerText')).slice(0, 600)}`)
  }
  const J = JSON.stringify
  const scope = (selector) => `(document.querySelector(${J(selector)})??document)`
  const click = async (label, within = 'body') => {
    const ok = await evaluate(`(()=>{const el=[...${scope(within)}.querySelectorAll('button')].reverse().find(n=>n.textContent.trim()===${J(label)}&&!n.disabled&&n.getClientRects().length);if(!el)return false;el.focus();el.click();return true})()`)
    assert.ok(ok, `button ${label} in ${within}`)
    await pause(120)
  }
  const rowAction = async (text) => {
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(${J(text)}));const b=row&&[...row.querySelectorAll('button')].find(n=>n.textContent.trim()==='Gestionar');if(!b)return false;b.focus();b.click();return true})()`)
    assert.ok(ok, `Gestionar ${text}`)
    await pause(150)
  }
  const setValue = async (selector, value) => {
    const ok = await evaluate(`(()=>{const el=document.querySelector(${J(selector)});if(!el)return false;const proto=el.tagName==='SELECT'?HTMLSelectElement:el.tagName==='TEXTAREA'?HTMLTextAreaElement:HTMLInputElement;Object.getOwnPropertyDescriptor(proto.prototype,'value').set.call(el,${J(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`)
    assert.ok(ok, `field ${selector}`)
    await pause(100)
  }
  const press = async (key, code, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: keyCode })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode })
    await pause(180)
  }
  const escape = () => press('Escape', 'Escape', 27)
  const text = () => evaluate('document.body.innerText')
  const calls = (filter = 'true') => evaluate(`window.qa.calls.filter(c=>${filter})`)
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(evidence, `${name}.png`), Buffer.from(result.data, 'base64'))
  }
  const resize = async (width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 })
    await pause(160)
  }
  const open = async (path, ready) => {
    await send('Page.navigate', { url: `${origin}/__d2?path=${encodeURIComponent(path)}` })
    await wait(ready, `ready ${path}`)
  }
  const drawer = `[...document.querySelectorAll('dialog[open]')].find(d=>d.getAttribute('role')!=='alertdialog')`
  const alert = `document.querySelector('dialog[open][role=alertdialog]')`
  // Layout probe: page overflow, controls outside the viewport and small targets.
  const layout = () =>
    evaluate(`(()=>{const vw=innerWidth,vh=innerHeight;
      const vis=[...document.querySelectorAll('button,a,input,select,textarea')].filter(el=>{const r=el.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('dialog:not([open])')});
      const name=el=>el.tagName+':'+((el.textContent||el.name||el.placeholder||'').trim().slice(0,28));
      const dialogs=[...document.querySelectorAll('dialog[open]')].map(d=>{const r=(d.firstElementChild&&d.getAttribute('role')!=='alertdialog'?d:d).getBoundingClientRect();return {role:d.getAttribute('role')||'dialog',left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom),inside:r.left>=-1&&r.right<=vw+1&&r.top>=-1&&r.bottom<=vh+1}});
      return {overflow:document.documentElement.scrollWidth>vw+1,
        offscreen:vis.filter(el=>{const r=el.getBoundingClientRect();return r.left<-1||r.right>vw+1}).map(name),
        // Effective target: an input wrapped by its label uses the label box.
        ...(()=>{const target=el=>{const r=el.getBoundingClientRect(),l=el.tagName==='INPUT'&&el.closest('label');return l?Math.max(r.height,l.getBoundingClientRect().height):r.height};
          const small=vw<=600?vis.filter(el=>['BUTTON','SELECT','INPUT'].includes(el.tagName)&&!['checkbox','file','radio'].includes(el.type)&&target(el)<40):[];
          // Row actions and pager of the shared DataTable predate D1 (DS scope).
          const shared=el=>Boolean(el.closest('tbody')||el.closest('footer'))&&Boolean(el.closest('table,footer'));
          return {small:small.filter(el=>!shared(el)).map(el=>name(el)+'='+Math.round(target(el))),sharedSmall:[...new Set(small.filter(shared).map(el=>name(el)+'='+Math.round(target(el))))]}})(),
        dialogs}})()`)

  await send('Page.enable')
  await send('Runtime.enable')

  // ---------------- D2.1 responsive: every route × every width ----------------
  const readyFor = {
    '/admin/portal/events/categories': `document.querySelector('h1')?.textContent==='Categorías del calendario'&&document.querySelectorAll('tbody tr').length===15`,
    '/admin/portal/news/categories': `document.querySelector('h1')?.textContent==='Categorías de noticias'&&document.querySelectorAll('tbody tr').length===5`,
    '/admin/portal/events': `document.querySelector('h1')?.textContent==='Gestión del calendario'&&document.querySelectorAll('tbody tr').length===2`,
    '/admin/portal/news': `document.querySelector('h1')?.textContent==='Gestión de noticias'&&document.querySelectorAll('tbody tr').length===3&&document.querySelector('select[name=news_category]')`,
    '/news': `document.querySelectorAll('article').length===2&&document.querySelector('select[name=category_id]')`,
  }
  for (const path of ROUTES) {
    await resize(1440)
    await open(path, readyFor[path])
    if (path === '/admin/portal/news') {
      // Show the third control ("Limpiar filtros") to audit the 600–900 px bar.
      await setValue('select[name=news_category]', '1')
      await wait(`document.querySelectorAll('tbody tr').length===1`)
    }
    for (const width of WIDTHS) {
      await resize(width)
      const result = await layout()
      const slug = path.replaceAll('/', '_').replace(/^_/, '')
      check(!result.overflow, `${path} @${width}: sin overflow horizontal`)
      check(result.offscreen.length === 0, `${path} @${width}: controles dentro del viewport ${result.offscreen.join(', ')}`)
      check(result.small.length === 0, `${path} @${width}: objetivos táctiles >=40px ${result.small.join(', ')}`)
      if (result.sharedSmall.length)
        console.log(`INFO ${path} @${width}: DataTable compartido (previo a D1) ${result.sharedSmall.join(', ')}`)
      if (path === '/admin/portal/news' && width >= 600 && width <= 900) {
        const bar = await evaluate(`(()=>{const q=s=>document.querySelector(s);const els=[q('input[type=search]'),q('select[name=news_status]'),q('select[name=news_category]'),[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Limpiar filtros')].map(el=>el?.getBoundingClientRect());
          const overlap=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
          let pairs=0;for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++)if(els[i]&&els[j]&&overlap(els[i],els[j]))pairs++;
          return {missing:els.filter(r=>!r).length,overlaps:pairs,inside:els.every(r=>r&&r.left>=-1&&r.right<=innerWidth+1),widths:els.map(r=>Math.round(r?.width??0))}})()`)
        check(bar.missing === 0 && bar.overlaps === 0 && bar.inside, `${path} @${width}: barra de filtros (búsqueda, Estado, Categoría, Limpiar) sin solapes ${J(bar)}`)
      }
      await shot(`${slug}-${width}`)
    }
  }

  // Drawer + confirmation inside the screen, Escape and focus, at every width.
  await resize(1440)
  await open('/admin/portal/events/categories', readyFor['/admin/portal/events/categories'])
  for (const width of WIDTHS) {
    await resize(width)
    await rowAction('Admisiones')
    await wait(`${drawer}?.textContent.includes('Gestionar categoría')&&document.querySelector('input[name=name]')?.value==='Admisiones'`)
    check(await evaluate(`${drawer}.contains(document.activeElement)`), `drawer @${width}: el foco entra en el Drawer`)
    await click('Desactivar', 'dialog[open]')
    await wait(alert)
    const probe = await layout()
    check(probe.dialogs.length === 2 && probe.dialogs.every((d) => d.inside), `drawer+confirmación @${width}: dentro de la pantalla ${J(probe.dialogs)}`)
    check(!probe.overflow && probe.offscreen.length === 0, `drawer @${width}: sin overflow ni controles fuera ${probe.offscreen.join(', ')}`)
    if (width === 320 || width === 1440) await shot(`drawer-confirm-${width}`)
    await escape()
    check(await evaluate(`!${alert}&&Boolean(${drawer})`), `Escape @${width}: cierra solo la confirmación`)
    await escape()
    await wait(`!document.querySelector('dialog[open]')`, 'drawer closed by Escape')
    check(await evaluate(`document.activeElement?.textContent.trim()==='Gestionar'`), `Escape @${width}: el foco vuelve a «Gestionar»`)
  }
  check((await calls(`c.method!=='get'`)).length === 0, 'cancelar la confirmación no envía cambios')

  // ---------------- D2.2 functional, both catalogs ----------------
  await resize(1440)
  for (const catalog of ['event', 'news']) {
    const path = `/admin/portal/${catalog === 'event' ? 'events' : 'news'}/categories`
    const api = `/admin/portal/${catalog}-categories/manage`
    const other = catalog === 'event' ? 'news-categories' : 'event-categories'
    await open(path, readyFor[path])
    const firstName = catalog === 'event' ? 'Actividades académicas' : 'Académico'
    check((await text()).includes(firstName), `${catalog}: listado con datos de su propio catálogo`)
    if (catalog === 'event') {
      check(/Mostrando 1 a 15 de 17/.test(await text()), 'event: paginación 1–15 de 17')
      await click('Siguiente')
      await wait(`document.querySelectorAll('tbody tr').length===2`)
      check((await calls(`c.url===${J(api)}`)).at(-1).params.page === 2, 'event: página 2 pedida al backend')
      await click('Anterior')
      await wait(`document.querySelectorAll('tbody tr').length===15`)
    }
    // Search + state filter (server side) and empty state.
    await setValue('input[type=search]', catalog === 'event' ? 'feri' : 'bol')
    await click('Buscar')
    await wait(`document.querySelectorAll('tbody tr').length>=1&&[...document.querySelectorAll('tbody tr')].every(r=>/feri|bol/i.test(r.textContent))`)
    check((await calls(`c.url===${J(api)}`)).at(-1).params.search === (catalog === 'event' ? 'feri' : 'bol'), `${catalog}: búsqueda enviada al backend`)
    await setValue('select[name=category_state]', 'inactive')
    await wait(`document.querySelectorAll('tbody tr').length===1&&document.querySelector('tbody tr').textContent.includes('Inactiva')`)
    check((await calls(`c.url===${J(api)}`)).at(-1).params.is_active === false, `${catalog}: filtro Inactivas -> is_active=false`)
    await setValue('select[name=category_state]', 'active')
    await setValue('input[type=search]', 'zzz')
    await click('Buscar')
    await wait(`/No hay registros disponibles/.test(document.body.innerText)`)
    check(true, `${catalog}: estado vacío informativo`)
    await setValue('input[type=search]', '')
    await click('Buscar')
    await setValue('select[name=category_state]', '')
    await wait(`document.querySelectorAll('tbody tr').length===${catalog === 'event' ? 15 : 5}`)
    // Error + retry, loading.
    await evaluate(`window.qa.failNext(${J(api)},500)`)
    await setValue('select[name=category_state]', 'active')
    await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Reintentar')`)
    check(!(await text()).includes('raw backend detail'), `${catalog}: error controlado sin detalle técnico`)
    await click('Reintentar')
    await wait(`document.querySelectorAll('tbody tr').length>0`)
    check(true, `${catalog}: reintento recupera el listado`)
    await evaluate('window.qa.hold()')
    await setValue('select[name=category_state]', '')
    await wait(`document.querySelector('[aria-busy=true]')||/Cargando/.test(document.body.innerText)`)
    check(true, `${catalog}: estado de carga visible`)
    await evaluate('window.qa.release()')
    await wait(`document.querySelectorAll('tbody tr').length===${catalog === 'event' ? 15 : 5}`)

    // Create (trim) + 422 duplicate.
    await click('Crear categoría')
    await wait(`${drawer}?.textContent.includes('Nueva categoría')`)
    await setValue('dialog[open] input[name=name]', `  ${firstName.toUpperCase()}  `)
    await click('Crear categoría', 'dialog[open]')
    await wait(`${drawer}.textContent.includes('Ya existe una categoría con ese nombre.')`)
    check(await evaluate(`document.querySelector('dialog[open] input[name=name]').getAttribute('aria-invalid')==='true'`), `${catalog}: 422 marcado en el campo Nombre`)
    await setValue('dialog[open] input[name=name]', '  Ciencia  ')
    await click('Crear categoría', 'dialog[open]')
    await wait(`${drawer}?.textContent.includes('Gestionar categoría')`)
    check(J((await calls(`c.method==='post'`)).at(-1).body) === J({ name: 'Ciencia' }), `${catalog}: POST con nombre recortado y sin estado`)
    // Rename with the real revision.
    await setValue('dialog[open] input[name=name]', 'Ciencias')
    await click('Guardar nombre', 'dialog[open]')
    await wait(`window.qa.calls.some(c=>c.method==='patch'&&c.body?.name==='Ciencias')`)
    check(J((await calls(`c.method==='patch'`)).at(-1).body) === J({ name: 'Ciencias', revision: 1 }), `${catalog}: PATCH nombre con revision 1`)
    // Deactivate (confirmed) + activate.
    await wait(`[...document.querySelectorAll('dialog[open] button')].some(b=>b.textContent.trim()==='Desactivar'&&!b.disabled)`)
    await click('Desactivar', 'dialog[open]')
    await wait(alert)
    await click('Desactivar', 'dialog[open][role=alertdialog]')
    await wait(`[...document.querySelectorAll('dialog[open] button')].some(b=>b.textContent.trim()==='Activar')`)
    check(J((await calls(`c.url.endsWith('/status')`)).at(-1).body) === J({ is_active: false, revision: 2 }), `${catalog}: desactivar confirmado con revision 2`)
    await click('Activar', 'dialog[open]')
    await wait(`[...document.querySelectorAll('dialog[open] button')].some(b=>b.textContent.trim()==='Desactivar')`)
    check(J((await calls(`c.url.endsWith('/status')`)).at(-1).body) === J({ is_active: true, revision: 3 }), `${catalog}: activar directo con revision 3`)
    // History of this category, readable.
    await click('Ver historial', 'dialog[open]')
    await wait(`/Categoría activada/.test(${drawer}.innerText)`)
    const history = await evaluate(`${drawer}.innerText`)
    for (const expected of ['Categoría activada', 'Estado: Inactiva → Activa', 'Categoría desactivada', 'Nombre actualizado', 'Nombre: Ciencia → Ciencias', 'Categoría creada', 'Valores iniciales', 'Responsable: QA Admin'])
      check(history.includes(expected), `${catalog}: historial muestra «${expected}»`)
    check(!/PORTAL_CATEGORY|revision|true|false|\{/.test(history), `${catalog}: historial sin códigos, revisiones ni JSON`)
    await shot(`${catalog}-history`)
    // 409 conflict: keep draft, block, reload on request.
    const created = (await evaluate(`window.qa.cats.${catalog}.find(c=>c.name==='Ciencias').id`))
    await evaluate(`window.qa.bump('${catalog}',${created},'Ciencias servidor')`)
    await setValue('dialog[open] input[name=name]', 'Ciencias locales')
    await click('Guardar nombre', 'dialog[open]')
    await wait(`/modificado por otro usuario/.test(${drawer}.innerText)`)
    check(await evaluate(`document.querySelector('dialog[open] input[name=name]').value==='Ciencias locales'`), `${catalog}: 409 conserva el borrador`)
    check(await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Guardar nombre').disabled`), `${catalog}: 409 bloquea el guardado`)
    const patches = (await calls(`c.method==='patch'`)).length
    await click('Recargar y descartar cambios', 'dialog[open]')
    await wait(`document.querySelector('dialog[open] input[name=name]').value==='Ciencias servidor'`)
    check((await calls(`c.method==='patch'`)).length === patches, `${catalog}: 409 sin reintento ni sobrescritura`)
    // Dirty close asks for confirmation.
    await setValue('dialog[open] input[name=name]', 'Cambio sin guardar')
    await escape()
    await wait(`${alert}?.textContent.includes('¿Descartar los cambios?')`)
    await click('Descartar cambios', 'dialog[open][role=alertdialog]')
    await wait(`!document.querySelector('dialog[open]')`)
    check(true, `${catalog}: cerrar con cambios pide confirmación`)
    // History pagination (seeded 12 entries on event category 1).
    if (catalog === 'event') {
      await rowAction('Actividades académicas')
      await click('Ver historial', 'dialog[open]')
      await wait(`/12 registros · Página 1 de 2/.test(${drawer}.innerText)`)
      await click('Siguiente', 'dialog[open]')
      await wait(`/Página 2 de 2/.test(${drawer}.innerText)&&/Categoría creada/.test(${drawer}.innerText)`)
      check((await calls(`c.url.endsWith('/1/history')`)).at(-1).params.page === 2, 'event: historial paginado (página 2)')
      await escape()
      await wait(`!document.querySelector('dialog[open]')`)
    }
    const wrong = await calls(`c.url.includes(${J(other)})`)
    check(wrong.length === 0, `${catalog}: ninguna petición al otro catálogo`)
    check(!(await evaluate(`[...document.querySelectorAll('button')].some(b=>/Eliminar/.test(b.textContent))`)), `${catalog}: sin botón Eliminar`)
    check((await calls(`c.method==='delete'`)).length === 0, `${catalog}: ningún DELETE`)
  }

  // ---------------- News integration ----------------
  await open('/admin/portal/news', readyFor['/admin/portal/news'])
  check(/Sin categoría/.test(await text()), 'noticias ADMIN: noticia histórica muestra «Sin categoría»')
  check(await evaluate(`document.querySelector('a[href="/admin/portal/news/categories"]')?.textContent==='Gestionar categorías'`), 'noticias ADMIN: enlace «Gestionar categorías»')
  const newsOptions = await evaluate(`[...document.querySelectorAll('select[name=news_category] option')].map(o=>o.textContent)`)
  // Each navigation reloads the simulated store: only the seeded active ones.
  check(J(newsOptions) === J(['Todas las categorías', 'Académico', 'Convocatorias', 'Institucional', 'Tecnología']), `noticias ADMIN: filtro solo con categorías activas ${J(newsOptions)}`)
  await setValue('select[name=news_category]', '1')
  await wait(`document.querySelectorAll('tbody tr').length===1`)
  check((await calls(`c.url==='/admin/portal/news'`)).at(-1).params.category_id === 1, 'noticias ADMIN: filtro category_id en el backend')
  await click('Limpiar filtros')
  await wait(`document.querySelectorAll('tbody tr').length===3`)
  // Create requires an active category.
  await click('Crear noticia')
  await wait(`${drawer}?.querySelector('select[name=category_id]')&&!/Cargando categorías/.test(${drawer}.innerText)`)
  await setValue('dialog[open] input[name=title]', 'Nueva convocatoria')
  await setValue('dialog[open] textarea[name=summary]', 'Resumen')
  await setValue('dialog[open] textarea[name=content]', 'Contenido')
  await click('Crear borrador', 'dialog[open]')
  await pause(200)
  // The required <select> blocks the external submit natively before onSubmit.
  check(await evaluate(`document.querySelector('dialog[open] select[name=category_id]').validity.valueMissing`), 'noticias: categoría obligatoria (validación nativa del selector)')
  check((await calls(`c.method==='post'`)).length === 0, 'noticias: crear sin categoría no envía nada')
  await setValue('dialog[open] select[name=category_id]', '4')
  await click('Crear borrador', 'dialog[open]')
  await wait(`window.qa.calls.some(c=>c.method==='post')`)
  check(J((await calls(`c.method==='post'`)).at(-1).body) === J({ title: 'Nueva convocatoria', summary: 'Resumen', content: 'Contenido', category_id: 4 }), 'noticias: POST con category_id obligatorio')
  await wait(`${drawer}?.textContent.includes('Gestionar noticia')`)
  await escape()
  await wait(`!document.querySelector('dialog[open]')`)
  // Legacy null category: PATCH omits category_id.
  await rowAction('Noticia histórica sin categoría')
  await wait(`document.querySelector('dialog[open] select[name=category_id]')?.selectedOptions[0]?.textContent==='Sin categoría'`)
  await setValue('dialog[open] textarea[name=summary]', 'Resumen corregido')
  await click('Guardar noticia', 'dialog[open]')
  await wait(`window.qa.calls.some(c=>c.method==='patch'&&c.url==='/admin/portal/news/42')`)
  const legacyPatch = (await calls(`c.url==='/admin/portal/news/42'&&c.method==='patch'`)).at(-1).body
  check(!('category_id' in legacyPatch) && legacyPatch.revision === 2, `noticias: PATCH de noticia sin categoría omite category_id ${J(legacyPatch)}`)
  await escape()
  await wait(`!document.querySelector('dialog[open]')`)
  // Inactive historical category kept; publication flow unchanged.
  await rowAction('Boletín de octubre')
  await wait(`document.querySelector('dialog[open] select[name=category_id]')?.selectedOptions[0]?.textContent==='Boletín histórico (categoría actual)'`)
  check(await evaluate(`document.querySelector('dialog[open] select[name=category_id]').selectedOptions[0].disabled`), 'noticias: categoría inactiva histórica no seleccionable')
  await setValue('dialog[open] input[name=title]', 'Boletín de octubre (editado)')
  await click('Guardar noticia', 'dialog[open]')
  await wait(`window.qa.calls.some(c=>c.method==='patch'&&c.url==='/admin/portal/news/43')`)
  const keepPatch = (await calls(`c.url==='/admin/portal/news/43'&&c.method==='patch'`)).at(-1).body
  check(!('category_id' in keepPatch) && keepPatch.revision === 6, `noticias: PATCH sin cambio de categoría la conserva ${J(keepPatch)}`)
  await wait(`!${drawer}.querySelector('[aria-busy=true]')`)
  await setValue('dialog[open] select[name=category_id]', '2')
  await click('Guardar noticia', 'dialog[open]')
  await wait(`window.qa.calls.filter(c=>c.method==='patch'&&c.url==='/admin/portal/news/43').length===2`)
  const changePatch = (await calls(`c.url==='/admin/portal/news/43'&&c.method==='patch'`)).at(-1).body
  check(changePatch.category_id === 2 && changePatch.revision === 7, `noticias: cambio a otra categoría activa envía su ID ${J(changePatch)}`)
  await click('Publicar', 'dialog[open]')
  await click('Confirmar operación', 'dialog[open]')
  await wait(`window.qa.calls.some(c=>c.url==='/admin/portal/news/43/status')`)
  check(J((await calls(`c.url==='/admin/portal/news/43/status'`)).at(-1).body) === J({ status: 'PUBLISHED', revision: 8 }), 'noticias: publicación conserva su contrato {status, revision}')
  await escape()
  await wait(`!document.querySelector('dialog[open]')`)

  // Public list filter.
  await open('/news', readyFor['/news'])
  const publicOptions = await evaluate(`[...document.querySelectorAll('select[name=category_id] option')].map(o=>o.textContent)`)
  check(!publicOptions.includes('Boletín histórico'), 'noticias públicas: selector solo con activas')
  check(/Noticia histórica sin categoría/.test(await text()), 'noticias públicas: la noticia sin categoría sigue visible')
  await setValue('select[name=category_id]', '1')
  await wait(`document.querySelectorAll('article').length===1`)
  const publicCall = (await calls(`c.url==='/portal/news'`)).at(-1).params
  check(publicCall.category_id === 1 && publicCall.page === 1, `noticias públicas: filtro category_id en el backend ${J(publicCall)}`)

  // ---------------- Calendar integration ----------------
  await open('/admin/portal/events', readyFor['/admin/portal/events'])
  check(await evaluate(`document.querySelector('a[href="/admin/portal/events/categories"]')?.textContent==='Gestionar categorías'`), 'calendario: enlace «Gestionar categorías»')
  const eventOptions = await evaluate(`[...document.querySelectorAll('select[name=category_id] option')].map(o=>o.textContent)`)
  check(!eventOptions.includes('Ferias antiguas') && eventOptions.includes('Admisiones'), 'calendario: filtro solo con categorías activas')
  await rowAction('Feria de proyectos 2025')
  await wait(`document.querySelector('dialog[open] select[name=category_id]')?.selectedOptions[0]?.textContent.includes('Ferias antiguas')`)
  check(await evaluate(`document.querySelector('dialog[open] select[name=category_id]').selectedOptions[0].disabled`), 'calendario: categoría inactiva conservada como valor histórico')
  check(!(await evaluate(`[...document.querySelectorAll('dialog[open] select[name=category_id] option')].some(o=>!o.disabled&&o.textContent.includes('Ferias antiguas'))`)), 'calendario: la inactiva no es seleccionable')
  check((await calls(`c.method!=='get'`)).length === 0, 'calendario: abrir el evento no modifica publicación ni visibilidad')

  check(errors.length === 0, `sin excepciones de página ${errors.join(' | ')}`)
  console.log(`Evidencia: ${evidence}`)
} finally {
  ws?.close()
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise((done) => chrome.once('exit', done))
    chrome.kill()
    await Promise.race([exited, pause(3000)])
  }
  await vite?.close()
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
console.log(`\nResumen: ${findings.length} fallo(s)`)
for (const finding of findings) console.log(` - ${finding}`)
process.exitCode = findings.length ? 1 : 0
