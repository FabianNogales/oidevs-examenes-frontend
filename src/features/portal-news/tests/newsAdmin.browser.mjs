// Visual QA for Etapa B1 with simulated transport. No backend data is read or changed.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const profile = await mkdtemp(join(tmpdir(), 'eida-news-admin-'))
const demo = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import {AdminNewsPage} from '/src/features/portal-news/AdminNewsPage.tsx';
const e=React.createElement, root=createRoot(document.getElementById('root'));
const rows=[
  {id:41,title:'Jornada institucional de bienvenida',summary:'Actividad para estudiantes de nuevo ingreso.',image_url:null,published_at:'2026-11-04T10:00:00-04:00',status:'PUBLISHED',revision:4,created_by:1,updated_by:1,published_by:1},
  {id:42,title:'Convocatoria de becas 2026',summary:'Requisitos y fechas para postular.',image_url:null,published_at:null,status:'DRAFT',revision:2,created_by:1,updated_by:1,published_by:null},
  {id:43,title:'Resultados del congreso de investigación',summary:'Memoria del encuentro académico.',image_url:null,published_at:'2026-10-20T09:00:00-04:00',status:'ARCHIVED',revision:7,created_by:1,updated_by:1,published_by:1},
];
window.newsAdminQa={rows,calls:[],client:{
  async get(url,options={}){
    window.newsAdminQa.calls.push({method:'get',url,params:options.params});
    if(url==='/admin/portal/news'){
      const p=options.params??{};
      const data=window.newsAdminQa.rows.filter(row=>(!p.status||row.status===p.status)&&(!p.search||row.title.toLowerCase().includes(String(p.search).toLowerCase())));
      return {data:{data,meta:{current_page:1,last_page:1,per_page:15,total:data.length}}};
    }
    if(url.startsWith('/admin/portal/news/'))return {data:{data:window.newsAdminQa.rows.find(row=>String(row.id)===url.split('/').pop())}};
    throw new Error('Unexpected GET '+url);
  },
  async post(){throw new Error('Unexpected POST')},
  async patch(){throw new Error('Unexpected PATCH')},
  async delete(){throw new Error('Unexpected DELETE')},
}};
root.render(e(MemoryRouter,{initialEntries:['/admin/portal/news']},e(AdminNewsPage)));
`

let vite, chrome, ws
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  process.env.EIDA_DEV_HTTPS_KEY = ''
  process.env.EIDA_DEV_HTTPS_CERT = ''
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'news-admin-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__news-admin.js') return '\0news-admin-qa'
        },
        load(id) {
          if (id === '\0news-admin-qa') return demo
          const normalized = id.replaceAll('\\', '/')
          if (normalized.endsWith('/src/shared/api/httpClient.ts'))
            return `export const httpClient={get:(...args)=>window.newsAdminQa.client.get(...args),post:(...args)=>window.newsAdminQa.client.post(...args),patch:(...args)=>window.newsAdminQa.client.patch(...args),delete:(...args)=>window.newsAdminQa.client.delete(...args)};`
          if (normalized.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/__news-admin') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__news-admin',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__news-admin.js"></script></html>',
              ),
            )
          })
        },
      },
    ],
  })
  await vite.listen()
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  assert.equal((await fetch(origin + '/__news-admin')).status, 200)
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
    await pause(80)
  }
  const shot = async (name) => {
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(
      join(profile, name + '.png'),
      Buffer.from(result.data, 'base64'),
    )
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: origin + '/__news-admin' })
  await wait(
    `document.querySelector('h1')?.textContent==='Gestión de noticias' && document.querySelectorAll('tbody tr').length===3`,
  )

  for (const width of [1440, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(120)
    const layout = await evaluate(`(()=>{
      const h1=document.querySelector('h1');
      const description=h1?.parentElement?.querySelector('p')?.textContent.trim();
      const create=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Crear noticia');
      const search=document.querySelector('input[type=search]');
      const select=document.querySelector('select[name=news_status]');
      const form=search?.closest('form');
      const group=select?.closest('[role=group]');
      const wrapper=search?.closest('label');
      const badges=[...document.querySelectorAll('[data-status]')].map(node=>({status:node.dataset.status,text:node.textContent.trim()}));
      const row=document.querySelector('tbody tr');
      return {
        title:h1?.textContent.trim(),
        description,
        create:Boolean(create&&!create.disabled),
        sameBar:Boolean(form&&group&&form.parentElement===group.parentElement),
        formWidth:form?.getBoundingClientRect().width??0,
        groupWidth:group?.getBoundingClientRect().width??0,
        wrapperHeight:wrapper?.getBoundingClientRect().height??0,
        selectHeight:select?.getBoundingClientRect().height??0,
        aligned:Math.abs((wrapper?.getBoundingClientRect().top??0)-(select?.getBoundingClientRect().top??0))<=4,
        badges,
        rows:document.querySelectorAll('tbody tr').length,
        headers:[...document.querySelectorAll('thead th')].map(node=>node.textContent.trim()),
        pagination:document.querySelector('footer')?.textContent.replace(/\\s+/g,' ').trim(),
        rowDisplay:row?getComputedStyle(row).display:null,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
      };
    })()`)
    assert.equal(layout.title, 'Gestión de noticias', `title at ${width}px`)
    assert.match(
      layout.description,
      /noticias del portal/i,
      `description at ${width}px`,
    )
    assert.equal(layout.create, true, `create button at ${width}px`)
    assert.equal(
      layout.sameBar,
      true,
      `search and filter share a bar at ${width}px`,
    )
    assert.equal(layout.overflow, false, `no page overflow at ${width}px`)
    assert.equal(layout.wrapperHeight, 44, `search height at ${width}px`)
    assert.ok(
      Math.abs(layout.wrapperHeight - layout.selectHeight) <= 4,
      `select height at ${width}px`,
    )
    if (width > 768)
      assert.equal(
        layout.aligned,
        true,
        `search/select alignment at ${width}px`,
      )
    assert.deepEqual(
      layout.badges.map((badge) => badge.text).sort(),
      ['Archivado', 'Borrador', 'Publicado'],
      `badges at ${width}px`,
    )
    assert.deepEqual(
      layout.badges.map((badge) => badge.status).sort(),
      ['ARCHIVED', 'DRAFT', 'PUBLISHED'],
      `badge status values at ${width}px`,
    )
    assert.equal(layout.rows, 3, `rows at ${width}px`)
    assert.deepEqual(
      layout.headers,
      ['Título', 'Estado', 'Publicación', 'Acciones'],
      `headers at ${width}px`,
    )
    assert.match(
      layout.pagination,
      /Mostrando 1 a 3 de 3/,
      `pagination at ${width}px`,
    )
    if (width === 1440) {
      assert.ok(
        layout.formWidth > layout.groupWidth,
        'search has more width than the state filter',
      )
      assert.equal(layout.rowDisplay, 'table-row')
    } else {
      assert.equal(layout.rowDisplay, 'block', `card rows at ${width}px`)
    }
    await shot(`news-admin-${width}`)
    console.log(
      `PASS ${width}px: encabezado, barra compacta, badges, tabla, paginación y sin desborde`,
    )
  }

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await pause(120)

  await evaluate(
    `(()=>{const select=document.querySelector('select[name=news_status]');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(select,'DRAFT');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await wait(
    `window.newsAdminQa.calls.some(call=>call.params?.status==='DRAFT') && document.querySelectorAll('tbody tr').length===1 && document.querySelector('td[data-label="Estado"]')?.textContent.trim()==='Borrador'`,
  )
  await click('Limpiar filtros')
  await wait(
    `document.querySelectorAll('tbody tr').length===3 && !document.querySelector('select[name=news_status]').value && window.newsAdminQa.calls.at(-1).params.status===undefined`,
  )
  console.log(
    'PASS filtro Estado: consulta server-side, badge Borrador y limpieza',
  )

  await evaluate(
    `(()=>{const input=document.querySelector('input[type=search]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(input,'becas');input.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
  await click('Buscar')
  await wait(
    `window.newsAdminQa.calls.at(-1).params.search==='becas' && document.querySelectorAll('tbody tr').length===1 && document.querySelector('td[data-label="Título"]')?.textContent.includes('Convocatoria')`,
  )
  assert.match(
    await evaluate('document.body.innerText'),
    /Resultados para:\s*becas/,
  )
  console.log('PASS búsqueda: parámetro server-side y resultado filtrado')

  assert.deepEqual(errors, [])
  await shot('news-admin-final')
  console.log(`Capturas: ${profile}`)
} finally {
  ws?.close()
  chrome?.kill()
  await vite?.close()
}
