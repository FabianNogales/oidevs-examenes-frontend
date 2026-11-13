import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cleanupBrowserProfile,
  createBrowserProfile,
} from '../../../shared/tests/browserProfile.mjs'
import { createServer } from 'vite'

const output = process.env.HU42_QA_OUTPUT ?? '.validation.local/hu42-hu43-ui'
await mkdir(output, { recursive: true })
const result = { widths: [], checks: [], errors: [] }
const published = {
  title: 'Objetivos y beneficios',
  description: 'Texto institucional publicado.',
  links: [],
  sort_order: 2,
}
const record = {
  id: 144,
  key: 'about',
  revision: 7,
  is_published: true,
  has_unpublished_changes: false,
  draft: published,
  published,
  published_at: '2026-11-05T10:00:00-04:00',
  created_by: 20,
  updated_by: 20,
}
const longText = 'Texto de auditoría con descripciones extensas. '.repeat(30)
const history = {
  data: [
    {
      id: 35,
      entity_type: 'PortalInformationSection',
      entity_id: 144,
      action: 'SECTION_UPDATED',
      actor_id: 20,
      actor_name: null,
      created_at: '2026-11-03T22:45:00Z',
      old_values: {
        revision: 1,
        draft: {
          title: 'Objetivos y beneficios',
          description: 'Anterior',
          sort_order: 3,
        },
      },
      new_values: {
        revision: 2,
        draft: {
          title: 'Objetivos y beneficios',
          description: longText,
          sort_order: 2,
        },
      },
    },
  ],
  links: { first: '?page=1', last: '?page=1', prev: null, next: null },
  meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
}
const demo = `
import React from 'react';
import{createRoot}from'react-dom/client';
import{MemoryRouter}from'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import{CalendarModal}from'/src/features/portal-calendar/components/CalendarModal.tsx';
import{AdminInformationPage}from'/src/features/portal-information/pages/AdminInformationPage.tsx';
import{InformationPage}from'/src/features/portal-information/pages/InformationPage.tsx';
import{InformationEditor}from'/src/features/portal-information/components/InformationEditor.tsx';
import{PortalHistoryPanel}from'/src/features/portal-shared/components/PortalHistory.tsx';
const e=React.createElement,root=createRoot(document.getElementById('root'));
const record=${JSON.stringify(record)},history=${JSON.stringify(history)},faq={id:88,key:null,revision:3,is_published:false,has_unpublished_changes:true,draft:{question:'¿Qué es EIDA?',answer:'Respuesta de prueba',sort_order:0},published:null,published_at:null,created_by:20,updated_by:20},publicInformation={sections:[{id:1,key:'about',title:'Acerca de EIDA',description:'EIDA es un proyecto académico orientado a apoyar la identificación y el ingreso a exámenes masivos.',links:[],sort_order:1},{id:2,key:'objectives',title:'Objetivos y beneficios',description:'Centraliza información y apoya el trabajo de docentes, estudiantes y colaboradores autorizados.',links:[],sort_order:2},{id:3,key:'teacher-guidance',title:'Orientaciones para docentes',description:'Revisa estudiantes, habilitaciones y datos académicos antes de confirmar.',links:[],sort_order:3}],faqs:[{id:1,question:'¿Qué es EIDA?',answer:'Una plataforma académica de apoyo.',sort_order:1},{id:2,question:'¿Presentar mi QR garantiza el ingreso?',answer:'No. El ingreso depende de las verificaciones vigentes.',sort_order:2}]};
window.hu42={calls:[],client:{
async get(url){if(url==='/portal/information')return{data:{data:publicInformation}};if(url.endsWith('/history'))return {data:history};if(url==='/admin/portal/information/sections')return{data:{data:[record],meta:{current_page:1,last_page:1,per_page:15,total:1}}};if(url==='/admin/portal/information/faqs')return{data:{data:[faq],meta:{current_page:1,last_page:1,per_page:15,total:1}}};throw Error('GET inesperado: '+url)},
async patch(url,payload){hu42.calls.push({method:'patch',url,payload});return {data:{data:{...record,draft:payload,revision:payload.revision+1,has_unpublished_changes:true}}}},
async post(url,payload){hu42.calls.push({method:'post',url,payload});return {data:{data:{...record,revision:record.revision+1,is_published:url.endsWith('/publish')}}}}
}};
window.hu42.renderAdmin=()=>root.render(e(MemoryRouter,null,e(AdminInformationPage)));
window.hu42.renderPublic=()=>root.render(e(MemoryRouter,null,e(InformationPage)));
root.render(e('main',null,
e(CalendarModal,{title:'Editar información',onClose(){},children:e(InformationEditor,{kind:'sections',initial:record,onSaved(){},onBusy(){}})}),
e(PortalHistoryPanel,{resource:'information/sections',id:144})));
`

const pause = (ms) => new Promise((done) => setTimeout(done, ms))
let vite, chrome, ws, browserProfile
try {
  // Own temporary Chrome profile, removed in `finally` (success or failure).
  browserProfile = await createBrowserProfile('hu42-hu43-ui')
  const profile = browserProfile.dir
  vite = await createServer({
    root: process.cwd(),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'hu42-hu43-visual-qa',
        enforce: 'pre',
        resolveId(id) {
          if (id === '/__hu42-hu43-ui.js') return '\0hu42-hu43-ui.tsx'
        },
        load(id) {
          if (id === '\0hu42-hu43-ui.tsx') return demo
          const path = id.replaceAll('\\', '/')
          if (path.endsWith('/src/shared/api/httpClient.ts'))
            return 'export const httpClient={get:(...args)=>hu42.client.get(...args),patch:(...args)=>hu42.client.patch(...args),post:(...args)=>hu42.client.post(...args)};'
          if (path.endsWith('/src/features/auth/hooks/useAuth.ts'))
            return 'export const useAuth=()=>({notify(){}});'
        },
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/__hu42-hu43-ui') return next()
            res.setHeader('Content-Type', 'text/html')
            res.end(
              await server.transformIndexHtml(
                '/__hu42-hu43-ui',
                '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__hu42-hu43-ui.js"></script></html>',
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
  assert.ok(port, 'Chrome debe abrir el puerto de depuración')
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  ws = new WebSocket(
    targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
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
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error
        ? request.reject(new Error(message.error.message))
        : request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown')
      result.errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      )
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id
      pending.set(next, { resolve, reject })
      ws.send(JSON.stringify({ id: next, method, params }))
    })
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (response.exceptionDetails)
      throw new Error(
        response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text,
      )
    return response.result.value
  }
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return
      await pause(100)
    }
    throw new Error(`Timeout: ${expression}`)
  }
  const click = async (label) => {
    assert.ok(
      await evaluate(
        `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true})()`,
      ),
      `Botón disponible: ${label}`,
    )
    await pause(100)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', {
    url: `http://127.0.0.1:${vite.httpServer.address().port}/__hu42-hu43-ui`,
  })
  await wait(
    `document.querySelector('dialog') && document.querySelector('details summary')`,
  )
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 680,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(100)
    const layout = await evaluate(
      `(()=>{const d=document.querySelector('dialog'),b=document.querySelector('button[form]'),a=b.parentElement;return{width:innerWidth,documentWidth:document.documentElement.scrollWidth,dialogWidth:d.clientWidth,dialogScrollWidth:d.scrollWidth,dialogBottom:d.getBoundingClientRect().bottom,actionsBottom:a.getBoundingClientRect().bottom,buttonBottom:b.getBoundingClientRect().bottom,summary:document.querySelector('main li h3').textContent,disclosure:document.querySelector('details summary').textContent}})()`,
    )
    assert.ok(
      layout.documentWidth <= width + 1,
      `${width}px document overflow: ${JSON.stringify(layout)}`,
    )
    assert.ok(
      layout.dialogScrollWidth <= layout.dialogWidth + 1,
      `${width}px modal overflow: ${JSON.stringify(layout)}`,
    )
    assert.ok(
      layout.buttonBottom <= layout.dialogBottom + 1,
      `${width}px footer action out of view: ${JSON.stringify(layout)}`,
    )
    assert.equal(layout.summary, 'Sección actualizada')
    assert.equal(layout.disclosure, 'Detalle técnico')
    result.widths.push({
      width,
      noHorizontalOverflow: true,
      actionsVisible: true,
    })
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await evaluate(`document.querySelector('details summary').click()`)
  assert.ok(
    (await evaluate('document.documentElement.scrollWidth')) <= 321,
    'el detalle técnico abierto no debe generar scroll horizontal en 320 px',
  )
  assert.equal(
    await evaluate(
      `document.querySelector('details pre').textContent.includes('"entity_type": "PortalInformationSection"')`,
    ),
    true,
  )
  assert.equal(await evaluate(`document.querySelector('details').open`), true)
  result.checks.push('human summary and read-only technical detail')
  await evaluate(
    `(()=>{const f=document.querySelector('textarea[name="description"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(f,'Descripción de prueba');f.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
  await click('Guardar borrador')
  await wait(`hu42.calls.some(call=>call.method==='patch')`)
  const payload = await evaluate(
    `hu42.calls.find(call=>call.method==='patch').payload`,
  )
  assert.equal(payload.description, 'Descripción de prueba')
  assert.equal(payload.revision, 7)
  result.checks.push(
    'save draft uses mocked transport and preserves revision payload',
  )
  await evaluate('hu42.renderAdmin()')
  await wait(`document.querySelector('select')`)
  await evaluate(
    `(()=>{const select=document.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'faqs');select.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  )
  await wait(
    `document.querySelector('[class*="tableCard"]') && [...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Crear pregunta frecuente')`,
  )
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(100)
    const layout = await evaluate(
      `(()=>{const header=document.querySelector('header'),button=[...header.querySelectorAll('button')].find(item=>item.textContent.trim()==='Crear pregunta frecuente'),filters=[...document.querySelectorAll('select')].map(item=>item.closest('label').getBoundingClientRect()),search=document.querySelector('form[class*="searchBar"]'),input=search.querySelector('input[type="search"]').getBoundingClientRect(),submit=[...search.querySelectorAll('button')].find(item=>item.textContent.trim()==='Buscar').getBoundingClientRect();return{width:innerWidth,documentWidth:document.documentElement.scrollWidth,headerButton:!!button,buttonInHeader:header.contains(button),filterPositions:filters.map(rect=>({x:rect.x,y:rect.y,width:rect.width,height:rect.height})),searchInput:{x:input.x,y:input.y,width:input.width,height:input.height},searchButton:{x:submit.x,y:submit.y,width:submit.width,height:submit.height}}})()`,
    )
    assert.ok(
      layout.documentWidth <= width + 1,
      `${width}px information list overflow: ${JSON.stringify(layout)}`,
    )
    assert.equal(layout.headerButton, true)
    assert.equal(layout.buttonInHeader, true)
    if (width <= 600) {
      assert.ok(
        layout.filterPositions[1].y >=
          layout.filterPositions[0].y + layout.filterPositions[0].height - 1,
        `${width}px filters are not stacked: ${JSON.stringify(layout)}`,
      )
      assert.ok(
        layout.searchButton.y >=
          layout.searchInput.y + layout.searchInput.height - 1,
        `${width}px search is not stacked: ${JSON.stringify(layout)}`,
      )
      assert.ok(
        layout.filterPositions.every(
          (filter) =>
            Math.abs(filter.width - layout.filterPositions[0].width) < 1,
        ),
        `${width}px filters have different widths: ${JSON.stringify(layout)}`,
      )
    } else {
      assert.ok(
        Math.abs(layout.filterPositions[1].y - layout.filterPositions[0].y) < 1,
      )
      assert.ok(
        layout.filterPositions[0].width >= 280 &&
          layout.filterPositions[0].width <= 360,
      )
      assert.ok(
        layout.filterPositions[1].width >= 220 &&
          layout.filterPositions[1].width <= 300,
      )
    }
    if (width <= 600) {
      assert.ok(
        layout.searchButton.y >=
          layout.searchInput.y + layout.searchInput.height - 1,
        `${width}px search is not stacked: ${JSON.stringify(layout)}`,
      )
    } else {
      assert.ok(
        Math.abs(
          layout.searchInput.y +
            layout.searchInput.height / 2 -
            (layout.searchButton.y + layout.searchButton.height / 2),
        ) < 1,
        `${width}px search is not horizontal: ${JSON.stringify(layout)}`,
      )
    }
    result.widths.push({
      width,
      noHorizontalOverflow: true,
      filters: width <= 600 ? 'stacked' : 'row',
      createInHeader: true,
      search: width <= 600 ? 'stacked' : 'horizontal',
    })
  }
  result.checks.push('information admin header, filters and list search layout')
  await evaluate('hu42.renderPublic()')
  await wait(`document.querySelector('main section h2')`)
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(100)
    const layout = await evaluate(
      `(()=>{const index=document.querySelector('nav[aria-label="Índice de información institucional"]'),main=document.querySelector('main'),mainRect=main.getBoundingClientRect(),sections=[...document.querySelectorAll('main section')],content=sections[0]?.parentElement,rects=sections.map(section=>{const rect=section.getBoundingClientRect();return{x:rect.x,width:rect.width,y:rect.y}}),intro=[...document.querySelectorAll('main p')].find(p=>p.textContent.trim().startsWith('Conoce el propósito de EIDA'));return{documentWidth:document.documentElement.scrollWidth,hasIndex:Boolean(index),hashLinks:[...document.querySelectorAll('main a[href^="#"]')].length,headings:sections.map(section=>section.querySelector('h2')?.textContent),rects,contentWidth:content?.getBoundingClientRect().width,contentCenter:content?.getBoundingClientRect().left+content?.getBoundingClientRect().width/2,introCenter:intro?.getBoundingClientRect().left+intro?.getBoundingClientRect().width/2,mainCenter:mainRect.left+mainRect.width/2}})()`,
    )
    assert.ok(layout.documentWidth <= width + 1)
    assert.equal(layout.hasIndex, false)
    assert.equal(layout.hashLinks, 0)
    assert.deepEqual(layout.headings, [
      'Acerca de EIDA',
      'Objetivos y beneficios',
      'Orientaciones para docentes',
      'Preguntas frecuentes',
    ])
    assert.equal(layout.rects.length, 4)
    assert.ok(layout.contentWidth <= 960 + 1)
    assert.ok(
      Math.abs(layout.contentCenter - layout.mainCenter) < 1,
      `${width}px content is not centered: ${JSON.stringify(layout)}`,
    )
    assert.ok(
      Math.abs(layout.introCenter - layout.mainCenter) < 1,
      `${width}px intro is not centered: ${JSON.stringify(layout)}`,
    )
    for (let index = 1; index < layout.rects.length; index += 1) {
      assert.ok(layout.rects[index].y > layout.rects[index - 1].y)
      assert.ok(Math.abs(layout.rects[index].x - layout.rects[0].x) < 1)
      assert.ok(Math.abs(layout.rects[index].width - layout.rects[0].width) < 1)
    }
    if (width === 390 || width === 1440) {
      const screenshot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      })
      await writeFile(
        join(output, `information-public-${width}.png`),
        Buffer.from(screenshot.data, 'base64'),
      )
    }
  }
  await evaluate(`document.querySelector('details summary').focus()`)
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    text: '\r',
    unmodifiedText: '\r',
  })
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  })
  await wait(`document.querySelector('details').open`)
  result.checks.push(
    'public information without side index, ordered sections, FAQ and centered responsive layout',
  )
  assert.deepEqual(result.errors, [])
  console.log(
    'PASS responsive 320/390/768/1024/1440, historial y guardado con transporte simulado; sin escrituras backend.',
  )
} catch (error) {
  result.failure = error.stack
  throw error
} finally {
  try {
    await writeFile(
      join(output, 'browser-results.json'),
      JSON.stringify(result, null, 2) + '\n',
    )
  } finally {
    // Runs even if writing the results fails.
    ws?.close()
    await cleanupBrowserProfile(browserProfile, chrome)
    await vite?.close()
  }
}
