// Real EntryControlPage, camera hook and media stream; local HTTP fixture only.
// EIDA_ENTRY_LAYOUT_PHASE=before records the pre-migration geometry.
// EIDA_ENTRY_LAYOUT_BASELINE=<resultados.json> compares scanner geometry after migration.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { browserFixture, pause } from '../../../shared/tests/browserHarness.mjs'

const before = process.env.EIDA_ENTRY_LAYOUT_PHASE === 'before'
const baseline = process.env.EIDA_ENTRY_LAYOUT_BASELINE
  ? JSON.parse(await readFile(process.env.EIDA_ENTRY_LAYOUT_BASELINE, 'utf8')) : null
const exam = { id: 4, name: 'Parcial de prueba', subject_name: 'Taller de Software',
  exam_date: '2026-11-08', start_time: '10:00:00', duration_minutes: 90,
  evaluation_type: 'partial', status: 'IN_PROGRESS', entry_available: true,
  entry_unavailable_reason: null, entry_opens_at: null, entry_closes_at: null,
  server_time: '2026-11-08T14:10:00Z', room: { id: 2, code: 'A-1', name: 'Aula de prueba' } }
const student = { student_id: 7, first_names: 'Ana', last_names: 'Prueba', sis_code: '00123',
  identity_number: '12345', historical_photo_url: null, profile_photo_url: null,
  student_status: 'ACTIVE', enrollment_status: 'ACTIVE', eligibility_status: 'ELIGIBLE',
  reason_code: null, reason: null, observations: null, assigned_room_id: 2,
  controlled_room_id: 2, room_status: 'MATCH', entry_status: 'PENDING', entry: null,
  meets_entry_conditions: true, blockers: [] }
let failure = false, collaborator = false
const requests = [], results = [], scanners = []
const moduleSource = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';import '@fontsource/poppins/600.css';import '@fontsource/poppins/700.css';
import {httpClient} from '/src/shared/api/httpClient.ts';
import {EntryControlPage} from '/src/features/exams/pages/EntryControlPage.tsx';
httpClient.defaults.baseURL='/__browser-api';
window.qa={starts:0,stops:0,token:null};
// A canvas stream exercises real video playback without asking for physical camera access.
const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
const ctx=canvas.getContext('2d');ctx.fillStyle='navy';ctx.fillRect(0,0,640,480);
setInterval(()=>{ctx.fillStyle='navy';ctx.fillRect(0,0,640,480);ctx.fillStyle='white';ctx.fillText(String(Date.now()),20,20)},50);
Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
  window.qa.starts++;const stream=canvas.captureStream(10);
  for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{window.qa.stops++;stop()};}
  return stream;
}});
Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{value:async()=>[{kind:'videoinput',deviceId:'fixture',label:'Cámara de prueba',groupId:'fixture'}]});
window.BarcodeDetector=class{static async getSupportedFormats(){return ['qr_code']}
 async detect(){const token=window.qa.token;window.qa.token=null;return token?[{rawValue:token}]:[]}};
const router=createMemoryRouter([{path:'/exams/:examId/entry-control',Component:EntryControlPage},
 {path:'/blank',element:React.createElement('p',null,'Transición de prueba')}],
 {initialEntries:['/exams/4/entry-control?from=teacher']});window.__router=router;
createRoot(document.getElementById('root')).render(React.createElement('div',null,
 React.createElement('header',{style:{height:80}},'Encabezado de prueba'),React.createElement(RouterProvider,{router})));
`
const browser = await browserFixture({ name: `entry-control-layout-${before ? 'before' : 'after'}`, moduleSource,
  handleRequest: async (req, url, json) => {
    requests.push({ method: req.method, path: url.pathname })
    if (req.method === 'GET' && url.pathname === '/exams/4/entry-control/students') {
      if (failure) return json(500, { message: 'Error de prueba' })
      return json(200, { exam, permissions: { can_annul_entries: !collaborator },
        summary: { total_students: 1, registered: 0, pending: 1, not_applicable: 0 },
        filter_counts: { all: 1, registered: 0, pending: 1, incidents: 0 },
        data: [student], meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 } })
    }
    if (req.method === 'POST' && url.pathname === '/exams/4/entry-control/qr') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { qr_token: 'fixture-token', room_id: 2 })
      return json(200, { result: 'AUTHORIZED', message: 'Ingreso registrado', processed_at: exam.server_time,
        data: { student, entry: { id: 9, entered_at: exam.server_time, verification_method: 'QR', status: 'VALID' } } })
    }
    if (req.method === 'GET' && url.pathname === '/exams/4/entry-control/entries')
      return json(200, { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 } })
    if (req.method === 'GET' && url.pathname === '/exams/4/entry-control/students/7')
      return json(200, { exam, data: student })
    throw Error(`Unexpected fixture request: ${req.method} ${url.pathname}`)
  } })
const { evaluate, wait, resize, shot } = browser
async function click(label) {
  const point = await evaluate(`(()=>{
    const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(label)});
    if(!b||b.disabled)throw Error('Unavailable button');b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    if(!b.contains(document.elementFromPoint(x,y)))throw Error('Covered button: '+b.textContent);
    return {x,y};
  })()`)
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  await pause(80)
}
async function navigate(role, id = '4') {
  await wait('window.__router')
  await evaluate(`window.__router.navigate('/blank')`)
  await pause(50)
  await evaluate(`window.__router.navigate('/exams/${id}/entry-control?from=${role}')`)
  await wait(`document.querySelector('h1')?.textContent==='Control de ingreso'`)
  if (id === '4') await wait(failure ? `document.querySelector('[role=alert]')` : `document.body.innerText.includes('Parcial de prueba') && !document.body.innerText.includes('Cargando')`)
}
async function inspect(role, state, width) {
  const value = await evaluate(`(()=>{
    const h=document.querySelector('h1'),r=h.getBoundingClientRect(),style=getComputedStyle(h);
    const nav=[...document.querySelectorAll('nav[aria-label="Ruta de navegación"] a')].map(a=>[a.textContent,a.getAttribute('href')]);
    const link=[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Control sin conexión');
    const desc=[...document.querySelectorAll('p')].find(p=>p.textContent.includes('Colaborador temporal'));
    const rect=desc?.getBoundingClientRect();
    return {main:document.querySelectorAll('main').length,h1:document.querySelectorAll('h1').length,
      font:parseFloat(style.fontSize),weight:style.fontWeight,nav,offline:link?.getAttribute('href'),
      action:!!link?.closest('header'),description:desc?.textContent.replace(/\\s+/g,' ').trim(),
      descriptionVisible:!!rect&&rect.width>0&&rect.height>0&&rect.left>=0&&rect.right<=innerWidth,
      overflow:document.documentElement.scrollWidth>innerWidth,
      headingInside:r.left>=0&&r.right<=innerWidth,
      containerWidth:h.closest('main')?.firstElementChild?.getBoundingClientRect().width,
      manage:[...document.querySelectorAll('button')].some(b=>b.textContent==='Gestionar ingresos'),
      clipped:[...document.querySelectorAll('main button,main input,main select,main a')].filter(el=>{
        const r=el.getBoundingClientRect();if(!r.width||!r.height||(r.left>=-1&&r.right<=innerWidth+1))return false;
        // Existing verification table deliberately scrolls horizontally. A control must be revealable
        // inside its scroll container, rather than excluded merely because it belongs to a table.
        let parent=el.parentElement;
        while(parent&&parent!==document.body){
          if(/auto|scroll/.test(getComputedStyle(parent).overflowX)&&parent.scrollWidth>parent.clientWidth){
            const left=parent.scrollLeft,top=scrollY;el.scrollIntoView({inline:'nearest',block:'nearest'});
            const revealed=el.getBoundingClientRect(),reachable=revealed.left>=-1&&revealed.right<=innerWidth+1;
            parent.scrollLeft=left;scrollTo(0,top);return !reachable;
          }
          parent=parent.parentElement;
        }
        return true;
      }).map(el=>el.textContent||el.getAttribute('aria-label'))};
  })()`)
  assert.equal(value.main, 1); assert.equal(value.h1, 1)
  assert.equal(value.overflow, false, JSON.stringify({ role, state, width, value }))
  assert.equal(value.headingInside, true)
  assert.deepEqual(value.clipped, [], `${role}/${state}/${width}: controls outside viewport`)
  if (state !== 'invalid') {
    assert.deepEqual(value.nav, [[role === 'teacher' ? 'Mis exámenes' : 'Colaborador', role === 'teacher' ? '/teacher/exams' : '/collaborator']])
    assert.equal(value.offline, '/exams/4/offline'); assert.equal(value.action, true)
    assert.equal(value.descriptionVisible, role === 'collaborator')
    if (role === 'collaborator') assert.equal(value.description, 'Colaborador temporal · Apoyo en examen · Autorización temporal para este examen.')
    if (state === 'loaded') assert.equal(value.manage, role === 'teacher')
  } else {
    assert.equal(await evaluate(`document.querySelector('[role=alert] a')?.getAttribute('href')`), '/')
  }
  if (!before) {
    assert.equal(value.font, width <= 640 ? 24 : 32)
    assert.equal(value.weight, '700')
    if (width === 1440) assert.equal(value.containerWidth, 1280)
  }
  results.push({ role, state, width, ...value })
  await shot(`${role}-${state}-${width}`)
}
try {
  for (const role of ['teacher', 'collaborator']) {
    collaborator = role === 'collaborator'; failure = false
    await navigate(role)
    for (const width of [320, 390, 768, 1024, 1440]) { await resize(width); await inspect(role, 'loaded', width) }
    await resize(320)
    await click('Ver')
    await wait(`document.querySelector('[role=dialog]')?.textContent.includes('Ana Prueba')`)
    assert.equal(await evaluate(`document.querySelector('[role=dialog]').contains(document.activeElement)`), true)
    await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
    await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
    await wait(`!document.querySelector('[role=dialog]')`)
    assert.equal(await evaluate(`document.activeElement.textContent.trim()`), 'Ver', 'detail restores focus to table action')
    await click('Registro de asistencia'); await click('Escanear QR')
    await wait(`document.querySelector('video')?.videoWidth>0 && [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pausar')`)
    await evaluate('void(window.__scannerVideo=document.querySelector("video"))')
    for (const width of [320, 390, 768, 1024, 1440]) {
      await resize(width)
      const geometry = await evaluate(`(()=>{const v=document.querySelector('video'),r=v.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,area:r.width*r.height,starts:window.qa.starts,overflow:document.documentElement.scrollWidth>innerWidth}})()`)
      assert.equal(geometry.overflow, false); assert.ok(geometry.width > 100 && geometry.height >= 180)
      const old = baseline?.scanners.find(x => x.role === role && x.viewport === width)
      if (baseline) {
        assert.ok(old, 'missing baseline')
        assert.ok(geometry.width >= old.width - 1 && geometry.height >= old.height - 1 && geometry.area >= old.area - 1,
          `STOP: scanner reduced ${JSON.stringify({ role, width, old, geometry })}`)
      }
      scanners.push({ role, viewport: width, ...geometry }); await shot(`${role}-scanner-${width}`)
    }
    await resize(390)
    await click('Pausar'); await wait(`document.body.innerText.includes('Reanudar')`)
    await click('Reanudar'); await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pausar')`)
    const count = requests.filter(x => x.method === 'POST').length
    await evaluate(`window.qa.token='fixture-token'`)
    await wait(`document.body.innerText.includes('Ingreso registrado')`)
    assert.equal(requests.filter(x => x.method === 'POST').length, count + 1)
    await click('Manual'); await wait(`document.querySelector('[role=tabpanel]:not([hidden])')`)
    await wait(`document.querySelector('video').srcObject===null`)
    await click('Escanear QR'); await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pausar')`)
    assert.equal(await evaluate('document.querySelector("video")===window.__scannerVideo'), true, 'camera node must remain mounted')
    await click('Verificación'); await wait(`document.querySelector('video').srcObject===null`)
    failure = true; await navigate(role)
    for (const width of [320, 390, 768, 1024, 1440]) { await resize(width); await inspect(role, 'error', width) }
    failure = false; await click('Reintentar'); await wait(`document.body.innerText.includes('Parcial de prueba')`)
    const calls = requests.length
    await navigate(role, 'invalid')
    for (const width of [320, 390, 768, 1024, 1440]) { await resize(width); await inspect(role, 'invalid', width) }
    assert.equal(requests.length, calls, 'invalid identifier never calls API')
  }
  assert.deepEqual(browser.errors, [])
  await browser.report({ phase: before ? 'before' : 'after', results, scanners, requests,
    camera: 'canvas MediaStream + controlled BarcodeDetector; physical camera and optical decoding not covered' })
  console.log(JSON.stringify({ pass: results.length, scannerCases: scanners.length, scanners, output: browser.output }, null, 2))
} finally { await browser.close() }
