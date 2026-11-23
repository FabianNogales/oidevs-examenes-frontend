// Responsive publication history with real PortalDialog and HTTP fixtures; no backend writes.
import assert from 'node:assert/strict'
import { browserFixture } from '../../../shared/tests/browserHarness.mjs'

const moduleSource = `
import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
import '/src/assets/styles/global.css';import '@fontsource/poppins/400.css';
import {PortalModal} from '/src/features/portal-shared/components/PortalUi.tsx';
import {PortalHistory} from '/src/features/portal-shared/components/PortalHistory.tsx';
import {httpClient} from '/src/shared/api/httpClient.ts';
httpClient.defaults.baseURL='/__browser-api';
const h=React.createElement;
function App(){const [resource,setResource]=useState(null);return h('main',{style:{padding:16}},
h('h1',null,'Gestión de contenidos · prueba local'),
h('button',{id:'news-trigger',onClick:()=>setResource('news')},'Gestionar noticia'),
h('button',{id:'events-trigger',onClick:()=>setResource('events')},'Gestionar evento'),
resource&&h(PortalModal,{title:resource==='news'?'Gestionar noticia':'Gestionar evento institucional',drawer:true,onClose:()=>setResource(null),footer:h('button',{onClick:()=>setResource(null)},'Cancelar')},h(PortalHistory,{resource,id:42})))}
createRoot(document.getElementById('root')).render(h(App));
`
const ui = await browserFixture({
  name: 'publication-history',
  moduleSource,
  handleRequest(_req, url, json) {
    const resource = url.pathname.includes('/news/') ? 'news' : 'events'
    assert.equal(url.pathname, `/admin/portal/${resource}/42/history`)
    const action =
      resource === 'news' ? 'PORTAL_NEWS_UPDATED' : 'PORTAL_EVENT_UPDATED'
    const data = [
      {
        id: 2,
        entity_type: 'Publication',
        entity_id: 42,
        action,
        actor_id: 1,
        actor_name: 'Administradora de prueba',
        created_at: '2026-11-05T02:00:00Z',
        old_values: {
          title: 'Festival universitario',
          status: 'DRAFT',
          ...(resource === 'events'
            ? { visibility: 'PRIVATE', starts_at: '2026-11-05T02:00:00Z' }
            : { has_image: false }),
        },
        new_values: {
          title: 'Festival cultural universitario',
          status: 'PUBLISHED',
          ...(resource === 'events'
            ? { visibility: 'PUBLIC', starts_at: '2026-11-05T03:00:00Z' }
            : { has_image: true }),
        },
      },
      {
        id: 1,
        entity_type: 'Publication',
        entity_id: 42,
        action:
          resource === 'news' ? 'PORTAL_NEWS_CREATED' : 'PORTAL_EVENT_CREATED',
        actor_id: 1,
        actor_name: null,
        created_at: '2026-11-04T21:00:00Z',
        old_values: null,
        new_values: {
          title: 'Festival universitario',
          description:
            'Actividad institucional con participación estudiantil. '.repeat(8),
        },
      },
    ]
    json(200, {
      data,
      links: { first: '?page=1', last: '?page=1', prev: null, next: null },
      meta: { current_page: 1, last_page: 1, total: 2, per_page: 15 },
    })
  },
})
const results = []
try {
  await ui.wait('!!document.querySelector("#news-trigger")')
  for (const width of [320, 390, 768, 1024, 1440]) {
    await ui.resize(width, 900)
    for (const resource of ['news', 'events']) {
      await ui.evaluate(
        `document.getElementById('${resource}-trigger').focus();document.getElementById('${resource}-trigger').click()`,
      )
      await ui.wait('!!document.querySelector("dialog[open]")')
      await ui.evaluate(
        `Promise.all(document.querySelector('dialog').getAnimations().map(animation => animation.finished))`,
      )
      await ui.click('Ver historial')
      await ui.wait(
        `!!document.querySelector('[aria-label="Historial administrativo"] h3')`,
      )
      const metrics = await ui.evaluate(`(()=>{
        const dialog=document.querySelector('dialog[open]'), panel=document.querySelector('[aria-label="Historial administrativo"]');
        const rect=dialog.getBoundingClientRect(),style=getComputedStyle(panel);
        return { text:panel.innerText, horizontal:document.documentElement.scrollWidth>innerWidth||dialog.scrollWidth>dialog.clientWidth+1,
          contained:rect.left>=-1&&rect.right<=innerWidth+1, nestedScroll:['auto','scroll'].includes(style.overflowY)&&panel.scrollHeight>panel.clientHeight+1,
          heading:panel.querySelector('h3').textContent }
      })()`)
      assert.equal(
        metrics.horizontal,
        false,
        `${resource} ${width}: horizontal overflow`,
      )
      assert.equal(metrics.contained, true)
      assert.equal(
        metrics.nestedScroll,
        false,
        'history shares the drawer scroll',
      )
      assert.match(
        metrics.heading,
        resource === 'news' ? /Noticia actualizada/ : /Evento actualizado/,
      )
      assert.doesNotMatch(metrics.text, /PORTAL_NEWS_|PORTAL_EVENT_/)
      assert.match(metrics.text, /Anterior[\s\S]*Nuevo/)
      assert.match(metrics.text, /04\/11\/2026/)
      await ui.shot(`${resource}-${width}`)
      // Real keyboard events: Tab stays inside and Escape restores the opening action.
      await ui.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      await ui.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      assert.equal(
        await ui.evaluate(
          "document.querySelector('dialog').contains(document.activeElement)",
        ),
        true,
      )
      await ui.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      })
      await ui.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
      })
      await ui.wait('!document.querySelector("dialog[open]")')
      assert.equal(
        await ui.evaluate('document.activeElement.id'),
        `${resource}-trigger`,
      )
      results.push({ width, resource, pass: true })
    }
  }
  assert.deepEqual(ui.errors, [])
  await ui.report({ results })
  console.log(
    `PASS: history news/events at five widths, no overflow or nested scroll, Spanish fields, keyboard, Escape and focus. Evidence: ${ui.output}`,
  )
} finally {
  await ui.close()
}
