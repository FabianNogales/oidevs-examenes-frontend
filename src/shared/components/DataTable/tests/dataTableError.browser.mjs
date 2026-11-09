// DS5-F3 browser QA for the DataTable error banner: «Reintentar» stays fully visible (inside the banner, the
// viewport and any clipping ancestor) at 320/390/768/1024/1440px, with a short and a long message; it keeps
// calling onRetry and getting focus back. From 480px up the banner geometry must equal a snapshot taken
// before the change (EIDA_DATATABLE_ERROR_BASELINE=<result.json>). Isolated component, no HTTP at all.
import assert from 'node:assert/strict'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browserFixture, pause } from '../../../tests/browserHarness.mjs'

const moduleSource = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import '/src/assets/styles/global.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import {DataTable} from '/src/shared/components/DataTable/DataTable.tsx';
import {PageContainer} from '/src/shared/components/ui/PageContainer/PageContainer.tsx';
const e=React.createElement;
const columns=[{key:'name',header:'Nombre',render:(row)=>row.name}];
window.qa={retries:0};
function Demo(){
  const [message,setMessage]=React.useState('No se pudo cargar.');
  const [loading,setLoading]=React.useState(false);
  window.qa.setMessage=setMessage;
  const retry=()=>{window.qa.retries++;setLoading(true);setTimeout(()=>setLoading(false),50)};
  return e(MemoryRouter,null,e('main',null,e(PageContainer,null,
    e(DataTable,{columns,data:[],loading,error:message,onRetry:retry,entityLabel:'estudiantes'}))));
}
createRoot(document.getElementById('root')).render(e(Demo));
window.qaReady=true;
`

const messages = {
  short: 'No se pudo cargar.',
  long: 'El servidor no pudo completar la operación. Inténtalo nuevamente en unos minutos o consulta al administrador.',
}
const inspect = `(()=>{
  const vw=document.documentElement.clientWidth,banner=document.querySelector('[role=alert]'),button=banner?.querySelector('button');
  const rect=(el)=>{const r=el.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};
  const b=button.getBoundingClientRect(),n=banner.getBoundingClientRect();
  let clipped=false;for(let p=button.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(s.overflowX!=='visible'||s.overflow!=='visible'){const r=p.getBoundingClientRect();if(b.left<r.left-1||b.right>r.right+1)clipped=true}}
  return {vw,overflow:document.documentElement.scrollWidth>vw+1,
    inside:b.left>=n.left-1&&b.right<=n.right+1&&b.left>=-1&&b.right<=vw+1&&!clipped&&button.scrollWidth<=button.clientWidth+1,
    geometry:{banner:rect(banner),text:rect(banner.firstElementChild),button:rect(button)}}
})()`

const fixture = await browserFixture({
  name: 'ds5-datatable-error',
  moduleSource,
  handleRequest: (_req, _url, json) => json(404, {}),
})
try {
  const { evaluate, wait, resize, shot, output } = fixture
  await wait(
    'window.qaReady===true && !!document.querySelector("[role=alert] button")',
  )
  const results = {}
  const failures = []
  for (const [kind, text] of Object.entries(messages)) {
    await evaluate(`window.qa.setMessage(${JSON.stringify(text)})`)
    for (const width of [320, 390, 768, 1024, 1440]) {
      await resize(width, 900)
      await pause(120)
      const page = await evaluate(inspect)
      results[`${kind}@${width}`] = page.geometry
      if (!page.inside)
        failures.push(
          `${kind} ${width}px: «Reintentar» recortado o fuera del banner ${JSON.stringify(page.geometry)}`,
        )
      if (page.overflow)
        failures.push(`${kind} ${width}px: desbordamiento horizontal`)
      if (width === 320 || width === 1440) await shot(`${kind}-${width}`)
      console.log(
        `${page.inside && !page.overflow ? 'PASS' : 'FAIL'} ${kind} ${width}px`,
      )
    }
  }
  // Retry still calls onRetry and the button gets focus back after the reload.
  await resize(320, 900)
  await evaluate(`document.querySelector('[role=alert] button').click()`)
  await wait(
    'window.qa.retries===1 && document.activeElement?.textContent.trim()==="Reintentar"',
  )
  await writeFile(join(output, 'result.json'), JSON.stringify(results, null, 2))
  if (process.env.EIDA_DATATABLE_ERROR_BASELINE) {
    const before = JSON.parse(
      await readFile(process.env.EIDA_DATATABLE_ERROR_BASELINE, 'utf8'),
    )
    const changed = Object.keys(results).filter(
      (key) =>
        Number(key.split('@')[1]) >= 480 &&
        JSON.stringify(before[key]) !== JSON.stringify(results[key]),
    )
    assert.deepEqual(
      changed,
      [],
      'la geometría del banner desde 480px debe ser idéntica a la instantánea previa',
    )
    console.log('Geometría ≥480px idéntica a la instantánea previa')
  }
  assert.deepEqual(failures, [], 'banner de error de DataTable')
  assert.deepEqual(fixture.errors, [], 'excepciones JS')
  console.log(`QA DataTable error PASS 10/10 · evidencia en ${output}`)
} finally {
  await fixture.close()
}
