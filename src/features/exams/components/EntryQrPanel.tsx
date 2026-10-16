import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { processEntryQr } from '../api/entryQrApi'
import { useEntryQrCamera } from '../hooks/useEntryQrCamera'
import type { EntryQrResponse } from '../types/entryQr.types'
import { EntryQrResultPanel } from './EntryQrResultPanel'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './EntryQr.module.css'

type Props = {
  examId: number
  active: boolean
  roomId: number | undefined
  onProcessed: (response: EntryQrResponse) => void
  onProcessingChange: (processing: boolean) => void
}

function cameraDisplayLabels(devices: MediaDeviceInfo[]): string[] {
  const directions = devices.map(({ label }) => {
    const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (
      /\b(back|rear|environment|posterior|trasera|traseira)\b/i.test(normalized)
    )
      return 'posterior'
    if (/\b(front|user|frontal|delantera|dianteira)\b/i.test(normalized))
      return 'frontal'
    return null
  })
  const counts = { posterior: 0, frontal: 0 }

  return devices.map((device, index) => {
    const direction = directions[index]
    if (direction) {
      const number = ++counts[direction]
      return `Cámara ${direction}${devices.length > 1 ? ` ${number}` : ''}`
    }
    const label = device.label.trim()
    if (
      !label ||
      /^(camera|cámara|camara|videoinput)\s*[-:#]?\s*\d*$/i.test(label)
    )
      return `Cámara ${index + 1}`
    return label
  })
}

export function EntryQrPanel({
  examId,
  active,
  roomId,
  onProcessed,
  onProcessingChange,
}: Props) {
  const [response, setResponse] = useState<EntryQrResponse | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const cameraId = useId()
  const currentRoomId = useRef(roomId)
  const resultRef = useRef<HTMLDivElement>(null)
  const lastScrolledResult = useRef<EntryQrResponse | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
      onProcessingChange(false)
    }
  }, [onProcessingChange])
  useEffect(() => {
    currentRoomId.current = roomId
    setResponse(null)
  }, [roomId])

  useEffect(() => {
    if (!response || lastScrolledResult.current === response) return
    // Consume each processed response once, including while this tab is hidden.
    lastScrolledResult.current = response
    if (!active || !window.matchMedia('(max-width: 900px)').matches) return
    resultRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
    })
  }, [response, active])

  const onToken = useCallback(
    async (text: string): Promise<boolean> => {
      if (
        !active ||
        !mounted.current ||
        request.current ||
        roomId == null ||
        blocked
      )
        return false
      const controller = new AbortController()
      request.current = controller
      setProcessing(true)
      onProcessingChange(true)
      setResponse(null)
      setError(null)
      try {
        const result = await processEntryQr(
          examId,
          { qr_token: text, room_id: roomId },
          controller.signal,
        )
        if (!controller.signal.aborted && mounted.current) {
          if (currentRoomId.current === roomId) setResponse(result)
          onProcessed(result)
        }
      } catch (cause) {
        if (!controller.signal.aborted && mounted.current) {
          const status = getRequestStatus(cause)
          setError(
            status === 422
              ? 'Los parámetros del escaneo no son válidos. Revisa el ambiente seleccionado y vuelve a intentarlo.'
              : getEntryControlErrorMessage(
                  cause,
                  'No se pudo confirmar el resultado del escaneo. Consulta el historial antes de volver a presentar este QR.',
                ),
          )
          setBlocked(true)
          setAccessDenied(status === 401 || status === 403 || status === 404)
        }
      } finally {
        if (request.current === controller) request.current = null
        if (!controller.signal.aborted && mounted.current) {
          setProcessing(false)
          onProcessingChange(false)
        }
      }
      return true
    },
    [active, blocked, examId, onProcessed, onProcessingChange, roomId],
  )

  const camera = useEntryQrCamera({
    active: active && roomId != null && !blocked,
    scope: `${examId}:${roomId}`,
    onToken,
  })
  const cameraError = ['denied', 'missing', 'error', 'unsupported'].includes(
    camera.state,
  )
  const cameraLabels = cameraDisplayLabels(camera.devices)

  return (
    <section
      className={styles.panel}
      aria-label="Registro de ingreso mediante QR"
    >
      {roomId == null ? (
        <p className={sharedStyles.note} role="status">
          Selecciona el ambiente controlado para comenzar a escanear.
        </p>
      ) : null}
      {error ? (
        <div className={styles.requestError} role="alert">
          <p>{error}</p>
          <p>El escaneo está pausado.</p>
          {!accessDenied ? (
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={() => {
                setError(null)
                setBlocked(false)
              }}
            >
              Retomar escaneo
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={styles.scannerGrid}>
        <section
          className={styles.cameraPanel}
          aria-label="Lector QR por cámara"
        >
          <div className={styles.cameraHeading}>
            <h2>Escanear QR</h2>
            <span
              className={`${styles.cameraStatus} ${camera.state === 'active' ? styles.cameraActive : ''}`}
              role="status"
            >
              {camera.state === 'active'
                ? 'Cámara activa'
                : camera.state === 'loading'
                  ? 'Cargando cámara…'
                  : 'Cámara inactiva'}
            </span>
          </div>
          <div className={styles.viewport}>
            <video
              ref={camera.videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Vista previa de la cámara para escanear QR"
            />
            {camera.state === 'active' ? (
              <div className={styles.guide} aria-hidden="true" />
            ) : (
              <div
                className={styles.cameraMessage}
                role={cameraError ? 'alert' : 'status'}
              >
                <p>{camera.message}</p>
              </div>
            )}
            {processing ? (
              <div className={styles.processing}>Procesando ingreso…</div>
            ) : null}
          </div>
        </section>
        <div ref={resultRef} className={styles.resultArea}>
          <EntryQrResultPanel response={response} processing={processing} />
        </div>
        <section
          className={styles.cameraTools}
          aria-label="Controles de cámara"
        >
          <p className={styles.cameraHelp}>
            Coloca un solo QR dentro del marco. Retíralo del visor después del
            resultado para permitir otra lectura.
          </p>
          <div className={styles.cameraControls}>
            {camera.devices.length > 1 ? (
              <div className={styles.cameraChoice}>
                <label htmlFor={cameraId}>Cambiar cámara</label>
                <select
                  id={cameraId}
                  value={camera.deviceId}
                  disabled={processing || camera.state === 'loading'}
                  onChange={(event) => camera.setDeviceId(event.target.value)}
                >
                  {camera.devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {cameraLabels[index]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {camera.state === 'active' ? (
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={processing}
                onClick={camera.pause}
              >
                Pausar cámara
              </button>
            ) : camera.state !== 'loading' && camera.state !== 'unsupported' ? (
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={processing || blocked || roomId == null}
                onClick={camera.resume}
              >
                {camera.state === 'paused'
                  ? 'Reanudar cámara'
                  : 'Reintentar cámara'}
              </button>
            ) : null}
            {camera.torchSupported && camera.state === 'active' ? (
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={processing || camera.torchBusy}
                aria-pressed={camera.torchOn}
                onClick={() => void camera.toggleTorch()}
              >
                {camera.torchOn ? 'Apagar linterna' : 'Encender linterna'}
              </button>
            ) : null}
          </div>
          {camera.controlError ? (
            <p className={sharedStyles.error} role="alert">
              {camera.controlError}
            </p>
          ) : null}
        </section>
      </div>
    </section>
  )
}
