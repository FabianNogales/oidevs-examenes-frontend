// Isolated Vite + headless Chrome for actual UI tests with a local HTTP fixture.
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'

export const pause = (ms) => new Promise((done) => setTimeout(done, ms))

export async function browserFixture({ name, moduleSource, handleRequest }) {
  const output = resolve('../tmp', name)
  await mkdir(output, { recursive: true })
  const profile = await mkdtemp(join(tmpdir(), name + '-'))
  let vite, chrome, ws
  const errors = []
  async function close() {
    ws?.close()
    chrome?.kill()
    await vite?.close()
  }
  try {
    process.env.EIDA_DEV_HTTPS_KEY = ''
    process.env.EIDA_DEV_HTTPS_CERT = ''
    vite = await createServer({
      root: process.cwd(),
      logLevel: 'error',
      server: { host: '127.0.0.1', port: 0 },
      plugins: [
        {
          name,
          resolveId: (id) =>
            id === '/__browser-demo.js' ? '\0browser-demo' : undefined,
          load: (id) => (id === '\0browser-demo' ? moduleSource : undefined),
          configureServer(server) {
            server.middlewares.use('/__browser-api', async (req, res) => {
              const url = new URL(req.url, 'http://fixture.test')
              const json = (status, data) => {
                res.statusCode = status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              }
              try {
                await handleRequest(req, url, json, res)
              } catch (error) {
                json(500, { message: String(error) })
              }
            })
            server.middlewares.use('/__browser-test', async (_req, res) => {
              res.setHeader('Content-Type', 'text/html')
              res.end(
                await server.transformIndexHtml(
                  '/__browser-test',
                  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/__browser-demo.js"></script></html>',
                ),
              )
            })
          },
        },
      ],
    })
    await vite.listen()
    chrome = spawn(
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
    let port
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        port = Number(
          (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(
            '\n',
          )[0],
        )
        break
      } catch {
        await pause(100)
      }
    }
    if (!port) throw Error('Chrome no inició')
    const targets = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json()
    ws = new WebSocket(
      targets.find((target) => target.type === 'page').webSocketDebuggerUrl,
    )
    await new Promise((done, fail) => {
      ws.addEventListener('open', done, { once: true })
      ws.addEventListener('error', fail, { once: true })
    })
    let nextId = 0
    const pending = new Map()
    ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (message.id) {
        const call = pending.get(message.id)
        pending.delete(message.id)
        if (call)
          message.error
            ? call.reject(Error(message.error.message))
            : call.resolve(message.result)
      }
      if (message.method === 'Runtime.exceptionThrown')
        errors.push(message.params.exceptionDetails.text)
    })
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++nextId
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails)
        throw Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const wait = async (expression) => {
      for (let i = 0; i < 120; i++) {
        try {
          if (await evaluate(`Boolean(${expression})`)) return
        } catch {}
        await pause(100)
      }
      throw Error(
        `Timeout ${expression}: ${await evaluate('document.body.innerText')}`,
      )
    }
    const resize = async (width, height = 844) => {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 640,
      })
      await pause(50)
    }
    const shot = async (name) => {
      const result = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        join(output, name + '.png'),
        Buffer.from(result.data, 'base64'),
      )
    }
    const click = async (label) => {
      await evaluate(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Unavailable button: '+${JSON.stringify(label)});b.click()})()`,
      )
      await pause(50)
    }
    const fill = async (selector, value, tag = 'HTMLInputElement') => {
      await evaluate(
        `(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${tag}.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))})()`,
      )
      await pause(50)
    }
    await send('Runtime.enable')
    await resize(1440, 1000)
    await send('Page.navigate', {
      url: `http://127.0.0.1:${vite.httpServer.address().port}/__browser-test`,
    })
    return {
      send,
      evaluate,
      wait,
      resize,
      shot,
      click,
      fill,
      close,
      errors,
      output,
      report: async (data) =>
        writeFile(
          join(output, 'resultados.json'),
          JSON.stringify({ fixtureOnly: true, ...data, errors }, null, 2),
        ),
    }
  } catch (error) {
    await close()
    throw error
  }
}
