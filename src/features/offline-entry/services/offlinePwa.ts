export type ShellReadiness = { ready: boolean; message: string }

let registration: Promise<ServiceWorkerRegistration> | null = null
export function registerOfflineWorker(): Promise<ServiceWorkerRegistration> {
  if (!import.meta.env.PROD)
    return Promise.reject(
      new Error(
        'La apertura offline tras recargar requiere la versión de producción; Vite de desarrollo no instala el Service Worker.',
      ),
    )
  if (!window.isSecureContext || !('serviceWorker' in navigator))
    return Promise.reject(
      new Error(
        'Este dispositivo necesita HTTPS y un navegador compatible con Service Worker.',
      ),
    )
  registration ??= navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}offline-sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
    .catch((error: unknown) => {
      registration = null
      throw error
    })
  return registration
}

export async function verifyOfflineShell(): Promise<ShellReadiness> {
  return new Promise<ShellReadiness>((resolve) => {
    let settled = false
    let channel: MessageChannel | null = null
    const finish = (result: ShellReadiness) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      channel?.port1.close()
      resolve(result)
    }
    const timeout = window.setTimeout(
      () =>
        finish({
          ready: false,
          message:
            'El almacenamiento de la aplicación no se confirmó. Mantén esta pantalla abierta y reintenta con conexión.',
        }),
      15000,
    )
    void (async () => {
      await registerOfflineWorker()
      const registered = await navigator.serviceWorker.ready
      if (settled) return
      const worker = navigator.serviceWorker.controller ?? registered.active
      if (!worker) {
        finish({
          ready: false,
          message: 'El Service Worker todavía no está activo.',
        })
        return
      }
      channel = new MessageChannel()
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data
        const ready = Boolean(
          data &&
          typeof data === 'object' &&
          'type' in data &&
          data.type === 'EIDA_SHELL_STATUS' &&
          'ready' in data &&
          data.ready === true,
        )
        finish({
          ready,
          message: ready
            ? 'Aplicación almacenada para abrir este control sin conexión.'
            : 'La caché de la aplicación está incompleta. Reconéctate y vuelve a preparar el dispositivo.',
        })
      }
      worker.postMessage({ type: 'EIDA_VERIFY_SHELL' }, [channel.port2])
    })().catch((error: unknown) =>
      finish({
        ready: false,
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo preparar la aplicación para abrirla sin conexión.',
      }),
    )
  })
}
