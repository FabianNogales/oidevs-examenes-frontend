import { useEffect, useRef, useState } from 'react'
import {
  BrowserQRCodeReader,
  type IScannerControls,
} from '@zxing/browser'

type BarcodeDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
}
type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): BarcodeDetector
  getSupportedFormats: () => Promise<string[]>
}

type EntryCameraStage =
  | 'GET_USER_MEDIA'
  | 'SET_SRC_OBJECT'
  | 'VIDEO_PLAY'
  | 'STREAM_SETUP'
  | 'STREAM_ENDED'
  | 'BARCODE_DETECTOR_INIT'
  | 'BARCODE_DETECTOR_DECODE'
  | 'ZXING_INIT'
  | 'ZXING_DECODE'
  | 'QR_PROCESSING'

function zxingErrorKind(cause: unknown): string | undefined {
  if (
    cause instanceof Error &&
    'getKind' in cause &&
    typeof cause.getKind === 'function'
  ) {
    const kind: unknown = cause.getKind()
    if (typeof kind === 'string') return kind
  }
  return undefined
}

function isZXingNotFound(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false
  // ZXing's error.name comes from constructor.name, which can be minified.
  return ['NotFoundException', 'ChecksumException', 'FormatException'].includes(
    zxingErrorKind(cause) ?? cause.name,
  )
}

function cameraErrorDetails(cause: unknown): { name: string; message: string } {
  if (cause instanceof Error || cause instanceof DOMException) {
    return { name: cause.name, message: cause.message || '' }
  }
  return { name: 'UnknownError', message: String(cause) }
}

function logCameraFailure(stage: EntryCameraStage, cause: unknown) {
  // Temporary HU14 diagnostics: do not log QR contents, devices or streams.
  console.error('[HU14 camera]', {
    stage,
    ...cameraErrorDetails(cause),
    kind: zxingErrorKind(cause),
  })
}

function playCameraVideo(video: HTMLVideoElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const events = ['loadeddata', 'canplay', 'playing', 'resize'] as const
    const timeout = window.setTimeout(
      () => finish(new DOMException(
        'La cámara no entregó fotogramas a tiempo.',
        'TimeoutError',
      )),
      10000,
    )

    function finish(error?: unknown) {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      events.forEach((event) => video.removeEventListener(event, checkReady))
      video.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
      if (error !== undefined) reject(error)
      else resolve()
    }

    function checkReady() {
      if (
        !video.paused &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        finish()
      }
    }

    function onError() {
      finish(new Error(
        video.error?.message || 'No se pudo reproducir el video de la cámara.',
      ))
    }

    function onAbort() {
      finish(new DOMException('Inicialización de cámara cancelada.', 'AbortError'))
    }

    if (signal.aborted) {
      onAbort()
      return
    }
    events.forEach((event) => video.addEventListener(event, checkReady))
    video.addEventListener('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
    try {
      void video.play().then(checkReady, finish)
    } catch (cause) {
      finish(cause)
    }
  })
}

export type EntryCameraState =
  | 'loading'
  | 'active'
  | 'denied'
  | 'missing'
  | 'error'
  | 'unsupported'
  | 'paused'

function cameraFailure(stage: EntryCameraStage, cause: unknown): {
  state: EntryCameraState
  message: string
} {
  const { name } = cameraErrorDetails(cause)
  if (name === 'NotAllowedError') {
    return {
      state: 'denied',
      message:
        stage === 'VIDEO_PLAY'
          ? 'El navegador bloqueó la reproducción de la cámara. Reintenta la cámara para continuar.'
          : 'Permiso de cámara denegado. Habilítalo en el navegador y vuelve a intentarlo.',
    }
  }
  if (name === 'SecurityError') {
    return {
      state: 'denied',
      message:
        'El navegador bloqueó la cámara por seguridad. Revisa la conexión HTTPS y los permisos del sitio.',
    }
  }
  if (name === 'NotFoundError') {
    return {
      state: 'missing',
      message:
        'No se encontró una cámara disponible. Conecta una cámara o selecciona otra.',
    }
  }
  if (name === 'NotReadableError') {
    return {
      state: 'error',
      message:
        'No se puede leer la cámara. Puede estar ocupada por otra aplicación o bloqueada por el sistema.',
    }
  }
  if (name === 'OverconstrainedError') {
    return {
      state: 'error',
      message:
        'La cámara seleccionada no admite la configuración solicitada. Selecciona otra cámara y vuelve a intentarlo.',
    }
  }
  if (name === 'AbortError') {
    return {
      state: 'error',
      message: 'El inicio de la cámara se interrumpió. Vuelve a intentarlo.',
    }
  }
  const messages: Record<EntryCameraStage, string> = {
    GET_USER_MEDIA: 'No se pudo abrir la cámara. Vuelve a intentarlo.',
    SET_SRC_OBJECT:
      'No se pudo conectar la cámara con el visor. Vuelve a intentarlo.',
    VIDEO_PLAY: 'No se pudo reproducir el video de la cámara. Vuelve a intentarlo.',
    STREAM_SETUP:
      'No se pudo preparar la cámara seleccionada. Vuelve a intentarlo.',
    STREAM_ENDED: 'La cámara se desconectó. Conéctala y vuelve a intentarlo.',
    BARCODE_DETECTOR_INIT: 'No se pudo iniciar el lector QR nativo.',
    BARCODE_DETECTOR_DECODE: 'El lector QR nativo no pudo leer el video.',
    ZXING_INIT:
      'No se pudo iniciar el lector QR alternativo. Vuelve a intentarlo.',
    ZXING_DECODE:
      'El lector QR no pudo leer el video de la cámara. Vuelve a intentarlo.',
    QR_PROCESSING:
      'No se pudo procesar la lectura del QR. Consulta el historial antes de reintentar.',
  }
  return {
    state: 'error',
    message: messages[stage],
  }
}

type Props = {
  active: boolean
  scope: string
  onToken: (text: string) => Promise<boolean>
}

export function useEntryQrCamera({ active, scope, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const tokenHandler = useRef(onToken)
  const lastFingerprint = useRef<string | null>(null)
  const scanScope = useRef(scope)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const pendingStart = useRef<Promise<void>>(Promise.resolve())
  const [state, setState] = useState<EntryCameraState>('paused')
  const [message, setMessage] = useState('Cámara pausada.')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [currentDeviceId, setCurrentDeviceId] = useState('')
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(!document.hidden)
  const [version, setVersion] = useState(0)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchBusy, setTorchBusy] = useState(false)
  const [controlError, setControlError] = useState<string | null>(null)

  useEffect(() => {
    tokenHandler.current = onToken
  }, [onToken])
  useEffect(() => {
    scanScope.current = scope
    lastFingerprint.current = null
  }, [scope])
  useEffect(() => {
    const changed = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])

  useEffect(() => {
    if (!active || paused || !visible) {
      setState('paused')
      setMessage('Cámara pausada.')
      return
    }
    let live = true
    let stream: MediaStream | null = null
    let timer: number | undefined
    let missingSince = 0
    let scanInProgress = false
    let scannerControls: IScannerControls | null = null
    let stage: EntryCameraStage = 'GET_USER_MEDIA'
    const startup = new AbortController()
    const video = videoRef.current
    setState('loading')
    setMessage('Cargando cámara…')
    setTorchSupported(false)
    setTorchOn(false)
    setTorchBusy(false)
    setControlError(null)

    function stop() {
      startup.abort()
      if (timer !== undefined) window.clearTimeout(timer)
      scannerControls?.stop()
      scannerControls = null
      stream?.getTracks().forEach((track) => track.stop())
      if (trackRef.current === stream?.getVideoTracks()[0])
        trackRef.current = null
      if (video && video.srcObject === stream) video.srcObject = null
    }

    function fail(failedStage: EntryCameraStage, cause: unknown) {
      if (!live) return
      logCameraFailure(failedStage, cause)
      live = false
      stop()
      const failure = cameraFailure(failedStage, cause)
      setState(failure.state)
      setMessage(failure.message)
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported')
        setMessage(
          'Este navegador no permite acceder a la cámara. Comprueba los permisos del navegador.',
        )
        return
      }
      try {
        stage = 'GET_USER_MEDIA'
        // This hook alone acquires, attaches and releases the MediaStream.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId
              ? { deviceId: { exact: deviceId } }
              : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (!live) {
          stop()
          return
        }
        stage = 'SET_SRC_OBJECT'
        if (!video) {
          throw new Error('No se encontró el visor de la cámara.')
        }
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.srcObject = stream
        stage = 'VIDEO_PLAY'
        await playCameraVideo(video, startup.signal)
        if (!live) return
        stage = 'STREAM_SETUP'
        const track = stream.getVideoTracks()[0]
        if (!track || track.readyState !== 'live') {
          throw new DOMException(
            'El stream no contiene una cámara activa.',
            'NotReadableError',
          )
        }
        trackRef.current = track
        setCurrentDeviceId(track?.getSettings().deviceId ?? '')
        try {
          const capabilities = track?.getCapabilities?.() as
            (MediaTrackCapabilities & { torch?: boolean }) | undefined
          setTorchSupported(capabilities?.torch === true)
        } catch {
          setTorchSupported(false)
        }
        track?.addEventListener(
          'ended',
          () => {
            fail('STREAM_ENDED', new Error('La pista de video terminó.'))
          },
          { once: true },
        )
        void navigator.mediaDevices
          .enumerateDevices()
          .then((available) => {
            if (live)
              setDevices(available.filter((item) => item.kind === 'videoinput'))
          })
          .catch(() => {
            /* Camera remains usable if device enumeration is unavailable. */
          })

        function markCodeMissing() {
          if (!missingSince) missingSince = performance.now()
          if (performance.now() - missingSince >= 1500)
            lastFingerprint.current = null
        }

        async function processText(text: string) {
          if (!live || scanInProgress) return
          scanInProgress = true
          try {
            missingSince = 0
            // Only a transient SHA-256 fingerprint is retained, never the QR text.
            const digest = await crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(text),
            )
            if (!live) return
            const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join('')
            if (lastFingerprint.current === fingerprint) return
            const capturedScope = scanScope.current
            if (
              (await tokenHandler.current(text)) &&
              scanScope.current === capturedScope
            )
              lastFingerprint.current = fingerprint
          } finally {
            scanInProgress = false
          }
        }

        function startZXing() {
          if (!live || !video) return
          stage = 'ZXING_INIT'
          const zxingReader = new BrowserQRCodeReader()
          stage = 'ZXING_DECODE'
          // scan() only reads frames. It never acquires, plays or owns the stream.
          scannerControls = zxingReader.scan(video, (result, cause) => {
            if (!live) return
            if (result) {
              void processText(result.getText()).catch((error: unknown) => {
                fail('QR_PROCESSING', error)
              })
            } else if (cause && !isZXingNotFound(cause)) {
              fail('ZXING_DECODE', cause)
            } else {
              markCodeMissing()
            }
          })
          // scan() can invoke its first callback before returning its controls.
          if (!live) {
            scannerControls.stop()
            scannerControls = null
          }
        }

        stage = 'BARCODE_DETECTOR_INIT'
        const NativeDetector = (
          window as unknown as {
            BarcodeDetector?: BarcodeDetectorConstructor
          }
        ).BarcodeDetector
        let nativeReader: BarcodeDetector | null = null
        if (NativeDetector) {
          try {
            const formats = await NativeDetector.getSupportedFormats()
            if (!live) return
            if (formats.includes('qr_code'))
              nativeReader = new NativeDetector({ formats: ['qr_code'] })
          } catch (cause) {
            if (!live) return
            logCameraFailure('BARCODE_DETECTOR_INIT', cause)
          }
        }

        if (nativeReader) {
          const selectedReader = nativeReader
          async function readFrame() {
            if (!live || !video) return
            let frameStage: EntryCameraStage = 'BARCODE_DETECTOR_DECODE'
            try {
              if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const codes = await selectedReader.detect(video)
                if (!live) return
                const texts = [
                  ...new Set(
                    codes
                      .map((code) => code.rawValue)
                      .filter(
                        (text) => typeof text === 'string' && text.length > 0,
                      ),
                  ),
                ]
                // An ambiguous frame cannot identify one student reliably.
                if (texts.length > 1) {
                  missingSince = 0
                } else if (texts[0] !== undefined) {
                  frameStage = 'QR_PROCESSING'
                  await processText(texts[0])
                } else {
                  markCodeMissing()
                }
              }
              if (live) timer = window.setTimeout(() => void readFrame(), 250)
            } catch (cause) {
              if (!live) return
              if (frameStage === 'QR_PROCESSING') {
                fail(frameStage, cause)
                return
              }
              logCameraFailure(frameStage, cause)
              try {
                // Fall back on the same playing video without reopening the camera.
                startZXing()
              } catch (error) {
                fail(stage, error)
              }
            }
          }
          timer = window.setTimeout(() => void readFrame(), 250)
        } else {
          startZXing()
        }
        if (live) {
          setState('active')
          setMessage('Cámara activa')
        }
      } catch (cause) {
        fail(stage, cause)
      }
    }
    // A cancelled getUserMedia cannot be aborted. Release its late stream before
    // starting another session (camera changes, resume or StrictMode remount).
    pendingStart.current = pendingStart.current.then(async () => {
      if (live) await start()
    })
    return () => {
      live = false
      stop()
    }
  }, [active, deviceId, paused, visible, version, scope])

  async function toggleTorch() {
    const track = trackRef.current
    if (!track || !torchSupported || torchBusy || state !== 'active') return
    const next = !torchOn
    setTorchBusy(true)
    setControlError(null)
    try {
      const constraints: MediaTrackConstraints & {
        advanced: Array<MediaTrackConstraintSet & { torch: boolean }>
      } = { advanced: [{ torch: next }] }
      await track.applyConstraints(constraints)
      if (trackRef.current === track) setTorchOn(next)
    } catch {
      if (trackRef.current === track)
        setControlError('No se pudo cambiar la linterna de esta cámara.')
    } finally {
      if (trackRef.current === track) setTorchBusy(false)
    }
  }

  return {
    videoRef,
    state,
    message,
    devices,
    deviceId: deviceId || currentDeviceId,
    setDeviceId,
    torchSupported,
    torchOn,
    torchBusy,
    toggleTorch,
    controlError,
    pause: () => setPaused(true),
    resume: () => {
      setPaused(false)
      setVersion((current) => current + 1)
    },
  }
}
