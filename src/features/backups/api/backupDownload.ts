import type { DownloadTicket } from './backupsApi'

const messages: Record<string, string> = {
  INVALID_TICKET:
    'La autorización de descarga no es válida. Solicita una nueva.',
  TICKET_EXPIRED: 'La autorización de descarga caducó. Solicita una nueva.',
  TICKET_CONSUMED:
    'Esta autorización ya se utilizó. Pulsa Descargar para solicitar otra.',
  SERVICE_UNAVAILABLE:
    'El servicio de descargas no está disponible. Intenta más tarde.',
  OAUTH_REVOKED:
    'El acceso al almacenamiento requiere revisión del administrador del sistema.',
  FILE_MISSING: 'El archivo ya no está disponible. Actualiza el historial.',
  INTEGRITY_MISMATCH:
    'No se pudo verificar la integridad del archivo. La descarga se ha detenido.',
  DRIVE_PERMISSION_DENIED:
    'El almacenamiento no permite descargar este archivo.',
  DRIVE_QUOTA_EXCEEDED:
    'Se alcanzó una cuota de Google Drive. Intenta más tarde.',
  DRIVE_RATE_LIMITED:
    'Google Drive está limitando las solicitudes. Intenta más tarde.',
}

export function prepareBackupDownload() {
  const name = `eida-backup-${crypto.randomUUID()}`
  const frame = document.createElement('iframe')
  frame.name = name
  frame.title = 'Descarga de respaldo'
  frame.hidden = true
  document.body.append(frame)
  return { name, frame, submitted: false }
}

export function submitBackupDownload(
  ticket: DownloadTicket,
  target: ReturnType<typeof prepareBackupDownload>,
  onError: (message: string) => void,
): () => void {
  const frameWindow = target.frame.contentWindow
  if (target.submitted || !target.frame.isConnected || !frameWindow)
    throw new Error('DOWNLOAD_TARGET_UNAVAILABLE')
  if (Date.parse(ticket.expires_at) <= Date.now())
    throw new Error('DOWNLOAD_TICKET_EXPIRED')
  target.submitted = true
  const origin = new URL(ticket.url).origin
  const listener = (event: MessageEvent) => {
    if (
      event.source !== frameWindow ||
      event.origin !== origin ||
      event.data?.type !== 'eida-backup-download-error'
    )
      return
    const code: unknown = event.data.code
    if (typeof code === 'string' && Object.hasOwn(messages, code)) {
      dispose()
      target.frame.remove()
      onError(messages[code])
    }
  }
  window.addEventListener('message', listener)
  const timer = window.setTimeout(
    () => window.removeEventListener('message', listener),
    120_000,
  )
  const dispose = () => {
    window.clearTimeout(timer)
    window.removeEventListener('message', listener)
    // Keep the frame attached: removing it could cancel a large active download.
  }
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = ticket.url
  form.target = target.name
  form.hidden = true
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'ticket'
  input.value = ticket.ticket
  form.append(input)
  document.body.append(form)
  try {
    form.submit()
  } catch (error) {
    dispose()
    target.frame.remove()
    throw error
  } finally {
    form.remove()
  }
  return dispose
}
