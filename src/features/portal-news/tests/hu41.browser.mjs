// Live HU41 QA. Creates one uniquely identified QA news item and leaves it ARCHIVED.
// Only that item is edited; its optional image is removed at the end. No seeding.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const output = '.validation.local/hu41'
await mkdir(output, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'eida-hu41-'))
const tag = `QA HU41 ${Date.now()} ${randomUUID().slice(0, 6)}`
const results = { tag, checks: [], responses: [], errors: [], gaps: [] }
const pause = (ms) => new Promise((done) => setTimeout(done, ms))
let chrome,
  main,
  second,
  secondTarget,
  recordId = null,
  loggedIn = false

async function connect(url) {
  const ws = new WebSocket(url)
  await new Promise((done, reject) => {
    ws.addEventListener('open', done, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data)
    if (m.id) {
      const p = pending.get(m.id)
      pending.delete(m.id)
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
    }
    if (m.method === 'Runtime.exceptionThrown')
      results.errors.push(
        m.params.exceptionDetails.exception?.description ??
          m.params.exceptionDetails.text,
      )
    if (
      m.method === 'Network.responseReceived' &&
      m.params.type !== 'Preflight' &&
      /\/api\/v1\/(admin\/portal\/news|portal\/news)/.test(
        m.params.response.url,
      )
    )
      results.responses.push({
        url: m.params.response.url,
        status: m.params.response.status,
      })
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
    for (let i = 0; i < 160; i++) {
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
    await pause(70)
  }
  const button = async (label) => {
    await wait(
      `[...document.querySelectorAll('button')].some(el=>el.textContent.trim()===${JSON.stringify(label)}&&!el.disabled)`,
    )
    assert.ok(
      await evaluate(
        `(()=>{const el=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===${JSON.stringify(label)});if(!el||el.disabled)return false;el.focus();el.click();return true})()`,
      ),
      label,
    )
    await pause(70)
  }
  const field = async (selector, value) => {
    await evaluate(
      `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing field');const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`,
    )
    await pause(70)
  }
  const navigate = async (path) => {
    await send('Page.navigate', { url: 'http://localhost:5173' + path })
  }
  const api = async (method, path, body) =>
    evaluate(
      `(async()=>{const {httpClient}=await import('/src/shared/api/httpClient.ts');try{const r=await httpClient[${JSON.stringify(method)}](${JSON.stringify(path)},${JSON.stringify(body)});return {status:r.status,body:r.data}}catch(e){return {status:e.response?.status,body:e.response?.data}}})()`,
    )
  const publicGet = async (pathOrUrl) =>
    evaluate(
      `(async()=>{const url=${JSON.stringify(pathOrUrl)};const r=await fetch(url.startsWith('http')?url:'http://localhost:8000/api/v1'+url,{credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});const type=r.headers.get('Content-Type')??'';return {status:r.status,body:type.includes('json')?await r.json():null}})()`,
    )
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    await writeFile(join(output, name + '.png'), Buffer.from(r.data, 'base64'))
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  return {
    send,
    evaluate,
    wait,
    click,
    button,
    field,
    navigate,
    api,
    publicGet,
    shot,
    close: () => ws.close(),
  }
}

const check = (name, details = {}) => {
  results.checks.push({ name, ...details })
  console.log('PASS', name)
}
async function searchTag(page) {
  await page.wait(
    `document.querySelector('h1')?.textContent==='Gestión de noticias' && document.querySelector('input[type=search]')`,
  )
  await page.field('input[type=search]', tag)
  await page.button('Buscar')
  await page.wait(
    `document.querySelector('td[data-label="Título"]')?.textContent.startsWith(${JSON.stringify(tag)})`,
  )
}
async function openEditor(page) {
  await page.button('Gestionar')
  await page.wait(`document.querySelector('dialog[open] input[name=title]')`)
}
async function closeEditor(page) {
  await page.click('button[aria-label="Cerrar ventana"]')
  await page.wait(`!document.querySelector('dialog')`)
}
async function state(page, action, expected) {
  await page.button(action)
  await page.button('Confirmar operación')
  await page.wait(
    `document.querySelector('dialog')?.innerText.includes(${JSON.stringify('Estado: ' + expected)}) && document.querySelector('dialog')?.getAttribute('aria-busy')==='false'`,
  )
}

try {
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
  main = await connect(
    targets.find((t) => t.type === 'page').webSocketDebuggerUrl,
  )
  await main.navigate('/login')
  await main.wait(`document.querySelector('input[name=identifier]')`)
  await main.field(
    'input[name=identifier]',
    process.env.EIDA_QA_ADMIN_EMAIL ?? 'demo.admin@umss.edu.bo',
  )
  await main.field(
    'input[name=password]',
    process.env.EIDA_QA_ADMIN_PASSWORD ?? 'DemoAdmin1',
  )
  await main.click('button[type=submit]')
  await main.wait(
    `location.pathname!=='/login' || document.querySelector('[role=alert]')`,
  )
  if (await main.evaluate(`location.pathname==='/login'`)) {
    results.gaps.push({
      login: await main.evaluate(
        `document.querySelector('[role=alert]')?.textContent`,
      ),
    })
    throw new Error(
      'The authorized demo admin account was rejected; no other credentials attempted.',
    )
  }
  loggedIn = true
  check('Login ADMINISTRADOR real')
  await main.navigate('/admin/portal/news')
  await main.wait(
    `document.querySelector('h1')?.textContent==='Gestión de noticias' && document.querySelector('input[type=search]')`,
  )
  await main.field('input[type=search]', tag)
  await main.button('Buscar')
  await main.wait(
    `document.body.innerText.includes('No hay registros disponibles')`,
  )
  check('Listado y búsqueda vacíos controlados')
  await main.button('Crear')
  await main.wait(`document.querySelector('dialog input[name=title]')`)
  await main.field('dialog input[name=title]', tag)
  await main.field(
    'dialog textarea[name=summary]',
    'Prueba local HU41; no es una noticia institucional de producción.',
  )
  await main.field(
    'dialog textarea[name=content]',
    'Contenido de prueba de integración HU41.\nSe archivará al finalizar la validación.',
  )
  await main.button('Crear borrador')
  await main.wait(
    `document.querySelector('dialog')?.innerText.includes('Estado: Borrador') && [...document.querySelectorAll('button')].some(el=>el.textContent==='Ver historial')`,
  )
  const own = await main.api(
    'get',
    '/admin/portal/news?search=' + encodeURIComponent(tag),
  )
  assert.equal(own.status, 200)
  assert.equal(own.body.data.length, 1)
  recordId = own.body.data[0].id
  results.recordId = recordId
  assert.equal(own.body.data[0].status, 'DRAFT')
  assert.equal(own.body.data[0].image_url, null)
  assert.equal((await main.publicGet(`/portal/news/${recordId}`)).status, 404)
  check('Crear DRAFT sin imagen y habilitar historial inmediatamente', {
    recordId,
  })

  for (const width of [390, 768, 1440]) {
    await main.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await pause(100)
    const fits = await main.evaluate(
      `(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth+1&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1&&d.scrollWidth<=d.clientWidth+1})()`,
    )
    assert.ok(fits, `${width}px editor overflow`)
    await main.shot(`real-editor-${width}`)
    await closeEditor(main)
    assert.ok(
      await main.evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),
      `${width}px table overflow`,
    )
    await main.shot(`real-list-${width}`)
    await openEditor(main)
    check(`Responsive real ${width}px: listado y editor sin desborde`)
  }

  const beforeEdit = await main.api('get', `/admin/portal/news/${recordId}`)
  await main.field(
    'dialog textarea[name=summary]',
    'Resumen corregido en prueba HU41.',
  )
  await main.button('Guardar noticia')
  await main.wait(
    `document.querySelector('dialog')?.getAttribute('aria-busy')==='false'`,
  )
  const edited = await main.api('get', `/admin/portal/news/${recordId}`)
  assert.equal(edited.body.data.summary, 'Resumen corregido en prueba HU41.')
  assert.equal(edited.body.data.revision, beforeEdit.body.data.revision + 1)
  assert.equal(edited.body.data.status, 'DRAFT')
  check('Editar con revision sin publicar automáticamente')

  // A small, generated QA banner avoids dependence on the local PHP upload limit.
  const png = await main.evaluate(
    `(()=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');ctx.fillStyle='#eaf2ff';ctx.fillRect(0,0,640,360);ctx.fillStyle='#004aad';ctx.fillRect(0,0,640,80);ctx.font='32px sans-serif';ctx.fillText('QA HU41 - PRUEBA LOCAL',48,190);return c.toDataURL('image/png').split(',')[1]})()`,
  )
  const imagePath = resolve(output, 'qa-image.png')
  await writeFile(imagePath, Buffer.from(png, 'base64'))
  const documentNode = await main.send('DOM.getDocument')
  const inputNode = await main.send('DOM.querySelector', {
    nodeId: documentNode.root.nodeId,
    selector: 'dialog input[name=image]',
  })
  await main.send('DOM.setFileInputFiles', {
    nodeId: inputNode.nodeId,
    files: [imagePath],
  })
  await main.wait(
    `[...document.querySelectorAll('button')].some(el=>el.textContent==='Subir imagen'&&!el.disabled)`,
  )
  await main.button('Subir imagen')
  await main.wait(`document.querySelector('dialog img')?.naturalWidth>0`)
  assert.ok(
    await main.evaluate(
      `document.querySelector('dialog img').src.startsWith('blob:')`,
    ),
  )
  const imageRecord = await main.api('get', `/admin/portal/news/${recordId}`)
  assert.ok(imageRecord.body.data.image_url)
  assert.equal(
    (await main.publicGet(imageRecord.body.data.image_url)).status,
    401,
  )
  check(
    'Carga multipart y lectura autenticada mediante blob; imagen administrativa protegida',
  )
  for (const width of [390, 768, 1440]) {
    await closeEditor(main)
    await main.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await openEditor(main)
    await main.wait(`document.querySelector('dialog img')?.naturalWidth>0`)
    assert.ok(
      await main.evaluate(
        `(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();d.scrollTop=d.scrollHeight;return r.top>=0&&r.bottom<=innerHeight+1&&d.scrollWidth<=d.clientWidth+1})()`,
      ),
      `${width}px image dialog bounds`,
    )
    assert.ok(
      await main.evaluate(
        `(()=>{const r=[...document.querySelectorAll('dialog button')].find(el=>el.textContent==='Archivar').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1})()`,
      ),
      `${width}px actions reachable`,
    )
    await main.shot(`real-image-${width}`)
    check(
      `Responsive real ${width}px: imagen y acciones accesibles dentro del modal`,
    )
  }

  const target = await main.send('Target.createTarget', {
    url: 'http://localhost:5173/admin/portal/news',
  })
  secondTarget = target.targetId
  const targetList = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json()
  second = await connect(
    targetList.find((t) => t.id === secondTarget).webSocketDebuggerUrl,
  )
  await searchTag(second)
  await openEditor(second)
  await second.field(
    'dialog textarea[name=summary]',
    'Versión de la segunda pestaña HU41.',
  )
  await second.button('Guardar noticia')
  await second.wait(
    `document.querySelector('dialog')?.getAttribute('aria-busy')==='false'`,
  )
  const concurrent = await second.api('get', `/admin/portal/news/${recordId}`)
  await main.field(
    'dialog textarea[name=summary]',
    'Borrador local conservado tras conflicto.',
  )
  await main.button('Guardar noticia')
  await main.wait(
    `document.querySelector('dialog')?.innerText.includes('modificado por otro usuario')`,
  )
  assert.equal(
    await main.evaluate(
      `document.querySelector('dialog textarea[name=summary]').value`,
    ),
    'Borrador local conservado tras conflicto.',
  )
  assert.ok(
    await main.evaluate(
      `[...document.querySelectorAll('dialog button')].find(el=>el.textContent==='Guardar noticia').disabled`,
    ),
  )
  assert.ok(
    await main.evaluate(
      `(()=>{const r=document.querySelector('dialog [role=alert]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1})()`,
    ),
    'conflict message visible in the viewport',
  )
  const conflicted = await main.api('get', `/admin/portal/news/${recordId}`)
  assert.equal(conflicted.body.data.revision, concurrent.body.data.revision)
  assert.equal(
    conflicted.body.data.summary,
    'Versión de la segunda pestaña HU41.',
  )
  await main.shot('real-conflict-409')
  await main.button('Recargar y descartar cambios')
  await main.wait(
    `document.querySelector('dialog textarea[name=summary]')?.value==='Versión de la segunda pestaña HU41.'`,
  )
  check(
    '409 real entre dos pestañas: borrador conservado, bloqueo y recarga explícita',
  )
  second.close()
  second = null
  await main.send('Target.closeTarget', { targetId: secondTarget })
  secondTarget = null

  await state(main, 'Publicar', 'Publicado')
  const published = await main.publicGet(`/portal/news/${recordId}`)
  assert.equal(published.status, 200)
  assert.ok(published.body.data.published_at)
  const publicImage = published.body.data.image_url
  assert.equal((await main.publicGet(publicImage)).status, 200)
  await main.wait(
    `document.querySelector('dialog [aria-label="Datos de la noticia"]')?.innerText.includes('Publicada por')`,
  )
  check(
    'Publicar: estado, fecha/responsable y noticia/imagen accesibles sin autenticación',
  )
  await closeEditor(main)
  await main.navigate('/news')
  await main.wait(`document.querySelector('input[type=search]')`)
  await main.field('input[type=search]', tag)
  await main.button('Buscar')
  await main.wait(
    `document.querySelector('article a[href="/news/${recordId}"]')`,
  )
  await main.click(`article a[href="/news/${recordId}"]`)
  await main.wait(`document.querySelector('main article img')?.naturalWidth>0`)
  assert.ok(
    await main.evaluate(
      `document.querySelector('main article').innerText.includes('Contenido de prueba de integración HU41.')`,
    ),
  )
  await main.shot('real-hu40-published')
  check('HU40 real tras publicar: búsqueda, listado, detalle completo e imagen')

  await main.navigate('/admin/portal/news')
  await searchTag(main)
  await openEditor(main)
  await state(main, 'Despublicar', 'Borrador')
  assert.equal((await main.publicGet(`/portal/news/${recordId}`)).status, 404)
  assert.equal((await main.publicGet(publicImage)).status, 404)
  await closeEditor(main)
  await main.navigate('/news')
  await main.wait(`document.querySelector('input[type=search]')`)
  await main.field('input[type=search]', tag)
  await main.button('Buscar')
  await main.wait(
    `document.body.innerText.includes('No hay noticias publicadas para esta consulta.')`,
  )
  assert.equal(
    await main.evaluate(`document.querySelector('main article')!==null`),
    false,
  )
  check(
    'Despublicar conserva administración y retira noticia/imagen de HU40 tras refrescar',
  )

  await main.navigate('/admin/portal/news')
  await searchTag(main)
  await main.field('select[name=news_status]', 'DRAFT')
  await main.wait(
    `document.querySelector('td[data-label="Estado"]')?.textContent==='Borrador'`,
  )
  assert.equal(
    await main.evaluate(`document.querySelector('input[type=search]').value`),
    tag,
  )
  await openEditor(main)
  await state(main, 'Publicar', 'Publicado')
  const republished = await main.api('get', `/admin/portal/news/${recordId}`)
  assert.equal(
    republished.body.data.published_at,
    published.body.data.published_at,
  )
  await state(main, 'Archivar', 'Archivado')
  assert.equal((await main.publicGet(`/portal/news/${recordId}`)).status, 404)
  assert.equal((await main.publicGet(publicImage)).status, 404)
  check(
    'Volver a publicar conserva fecha inicial; archivar retira el acceso público sin eliminar noticia',
  )

  await main.button('Ver historial')
  await main.wait(
    `document.querySelector('[aria-label="Historial administrativo"]')?.innerText.includes('PORTAL_NEWS_STATUS_CHANGED')`,
  )
  const history = await main.api(
    'get',
    `/admin/portal/news/${recordId}/history`,
  )
  assert.equal(history.status, 200)
  assert.ok(history.body.data.some((e) => e.action === 'PORTAL_NEWS_CREATED'))
  assert.ok(history.body.data.some((e) => e.action === 'PORTAL_NEWS_UPDATED'))
  assert.ok(
    history.body.data.some((e) => e.action === 'PORTAL_NEWS_STATUS_CHANGED'),
  )
  const historyText = await main.evaluate(
    `document.querySelector('[aria-label="Historial administrativo"]').innerText`,
  )
  for (const text of ['Responsable:', 'Fecha:', 'Anterior', 'Nuevo'])
    assert.ok(historyText.includes(text), text)
  await main.shot('real-history')
  check(
    'Historial real: acciones, responsables, fechas y snapshots anteriores/nuevos',
  )

  await main.button('Eliminar imagen')
  await main.button('Confirmar operación')
  await main.wait(
    `document.querySelector('dialog')?.innerText.includes('La noticia no tiene imagen.')`,
  )
  await closeEditor(main)
  await main.field('select[name=news_status]', 'ARCHIVED')
  await main.wait(
    `document.querySelector('td[data-label="Estado"]')?.textContent==='Archivado'`,
  )
  assert.equal(
    await main.evaluate(`document.querySelector('input[type=search]').value`),
    tag,
  )
  const archived = await main.api('get', `/admin/portal/news/${recordId}`)
  assert.equal(archived.body.data.status, 'ARCHIVED')
  assert.equal(archived.body.data.image_url, null)
  results.finalRecord = {
    id: recordId,
    status: archived.body.data.status,
    revision: archived.body.data.revision,
    image_url: archived.body.data.image_url,
  }
  check(
    'Búsqueda + filtros combinados conservados; registro QA archivado y archivo de prueba retirado',
  )
  assert.deepEqual(results.errors, [])
} catch (error) {
  results.failure = error.stack
  throw error
} finally {
  // Cleanup is restricted to this uniquely tagged QA resource, never existing news.
  if (loggedIn && main) {
    try {
      if (recordId === null) {
        const found = await main.api(
          'get',
          '/admin/portal/news?search=' + encodeURIComponent(tag),
        )
        recordId = found.body?.data?.find((n) => n.title === tag)?.id ?? null
      }
      if (recordId !== null) {
        const current = await main.api('get', `/admin/portal/news/${recordId}`)
        let own = current.body?.data
        if (own?.title === tag) {
          if (own.status !== 'ARCHIVED') {
            const archived = await main.api(
              'patch',
              `/admin/portal/news/${recordId}/status`,
              { status: 'ARCHIVED', revision: own.revision },
            )
            assert.equal(archived.status, 200)
            own = archived.body.data
          }
          if (own.image_url)
            assert.equal(
              (
                await main.api(
                  'delete',
                  `/admin/portal/news/${recordId}/image`,
                  { data: { revision: own.revision } },
                )
              ).status,
              200,
            )
          results.cleanup = { recordId, archived: true, imageRemoved: true }
        }
      }
      assert.ok(
        [200, 204].includes((await main.api('post', '/auth/logout')).status),
      )
      results.sessionClosed = true
    } catch (error) {
      results.cleanupError = error.message
    }
  }
  second?.close()
  main?.close()
  chrome?.kill()
  await writeFile(
    join(output, 'browser-results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  console.log('Evidence:', output)
}
