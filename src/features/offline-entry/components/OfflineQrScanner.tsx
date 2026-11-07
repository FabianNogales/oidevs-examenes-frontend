import { useId, useState } from 'react'
import { Camera, Flashlight } from 'lucide-react'
import { useEntryQrCamera } from '@/features/exams/hooks/useEntryQrCamera'
import { provisionalQr } from '../utils/offlineRules'
import shared from './OfflineShared.module.css'
import captureStyles from './OfflineCapturePanel.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflineQrScanner({
  scope,
  disabled,
  onToken,
}: {
  scope: string
  disabled: boolean
  onToken: (token: string) => void
}) {
  const [opened, setOpened] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraId = useId()
  const camera = useEntryQrCamera({
    active: opened && !disabled,
    scope,
    onToken: async (text) => {
      try {
        onToken(provisionalQr(text))
        setError(null)
        setOpened(false)
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'No se pudo leer este QR.',
        )
      }
      return true
    },
  })

  return (
    <section className={shared.panel} aria-label="Captura QR provisional">
      <h2>Escanear QR</h2>
      <p className={shared.panelSubtitle}>
        La lectura es provisional. El QR no permite identificar al estudiante
        sin conexión: busca y confirma su identidad en tu lista.
      </p>

      <div className={captureStyles.viewport}>
        <video
          ref={camera.videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Visor de cámara para captura QR provisional"
        />
        {camera.state === 'active' ? (
          <div className={captureStyles.guide} aria-hidden="true" />
        ) : (
          <div className={captureStyles.cameraMessage} role="status">
            {camera.message}
          </div>
        )}
      </div>

      {error ? (
        <p className={shared.error} role="alert">
          {error}
        </p>
      ) : null}

      {['denied', 'missing', 'error', 'unsupported'].includes(camera.state) ? (
        <p className={shared.error} role="alert">
          {camera.message}
        </p>
      ) : null}

      <div className={shared.actions}>
        {opened && camera.state === 'active' ? (
          <button
            className={buttons.secondaryButton}
            onClick={() => {
              camera.pause()
              setOpened(false)
            }}
          >
            Pausar cámara
          </button>
        ) : (
          <button
            className={buttons.primaryButton}
            disabled={disabled || camera.state === 'loading'}
            onClick={() => {
              setError(null)
              setOpened(true)
              camera.resume()
            }}
          >
            <Camera size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              {camera.state === 'paused'
                ? 'Activar cámara'
                : 'Reintentar cámara'}
            </span>
          </button>
        )}

        {camera.torchSupported && camera.state === 'active' ? (
          <button
            className={buttons.secondaryButton}
            disabled={camera.torchBusy}
            onClick={() => void camera.toggleTorch()}
          >
            <Flashlight size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>
              {camera.torchOn ? 'Apagar linterna' : 'Encender linterna'}
            </span>
          </button>
        ) : null}
      </div>

      {camera.devices.length > 1 ? (
        <label className={captureStyles.searchField} htmlFor={cameraId}>
          Cámara
          <select
            id={cameraId}
            value={camera.deviceId}
            onChange={(event) => camera.setDeviceId(event.target.value)}
          >
            {camera.devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Cámara ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {camera.controlError ? <p role="alert">{camera.controlError}</p> : null}
    </section>
  )
}