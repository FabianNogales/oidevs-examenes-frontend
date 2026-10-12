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

function isZXingNotFound(cause: unknown): boolean {
  return (
    cause instanceof Error &&
    ['NotFoundException', 'ChecksumException', 'FormatException'].includes(
      cause.name,
    )
  )
}

export type EntryCameraState =
  | 'loading'
  | 'active'
  | 'denied'
  | 'missing'
  | 'error'
  | 'unsupported'
  | 'paused'

function cameraFailure(cause: unknown): {
  state: EntryCameraState
  message: string
} {
  const name = cause instanceof DOMException ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      state: 'denied',
      message:
        'Permiso de cámara denegado. Habilítalo en el navegador y vuelve a intentarlo.',
    }
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return {
      state: 'missing',
      message:
        'No se encontró una cámara disponible. Conecta una cámara o selecciona otra.',
    }
  }
  return {
    state: 'error',
    message:
      'No se pudo utilizar la cámara. Puede estar ocupada por otra aplicación. Vuelve a intentarlo.',
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
    const video = videoRef.current
    setState('loading')
    setMessage('Cargando cámara…')
    setTorchSupported(false)
    setTorchOn(false)
    setTorchBusy(false)
    setControlError(null)

    function stop() {
      if (timer !== undefined) window.clearTimeout(timer)
      scannerControls?.stop()
      scannerControls = null
      stream?.getTracks().forEach((track) => track.stop())
      if (trackRef.current === stream?.getVideoTracks()[0])
        trackRef.current = null
      if (video && video.srcObject === stream) video.srcObject = null
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
          } catch {
            nativeReader = null
          }
        }
        const zxingReader = nativeReader ? null : new BrowserQRCodeReader()
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
        if (!video) {
          stop()
          return
        }
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.srcObject = stream
        await video.play()
        if (!live) return
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        setCurrentDeviceId(track?.getSettings().deviceId ?? '')
        try {
          const capabilities = track?.getCapabilities?.() as
            (MediaTrackCapabilities & { torch?: boolean }) | undefined
          setTorchSupported(capabilities?.torch === true)
        } catch {
          setTorchSupported(false)
        }
        setState('active')
        setMessage('Cámara activa')
        track?.addEventListener(
          'ended',
          () => {
            if (!live) return
            live = false
            stop()
            setState('error')
            setMessage(
              'La cámara se desconectó. Conéctala y vuelve a intentarlo.',
            )
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

        if (nativeReader) {
          const selectedReader = nativeReader
          async function readFrame() {
            if (!live || !video) return
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
                  await processText(texts[0])
                } else {
                  markCodeMissing()
                }
              }
              if (live) timer = window.setTimeout(() => void readFrame(), 250)
            } catch (cause) {
              if (!live) return
              live = false
              stop()
              const failure = cameraFailure(cause)
              setState(failure.state)
              setMessage(failure.message)
            }
          }
          setState('active')
          setMessage('Cámara activa')
          timer = window.setTimeout(() => void readFrame(), 250)
        } else if (zxingReader) {
          scannerControls = await zxingReader.decodeFromVideoElement(
            video,
            (result, cause) => {
              if (!live) return
              if (result) {
                void processText(result.getText()).catch((error: unknown) => {
                  if (!live) return
                  live = false
                  stop()
                  const failure = cameraFailure(error)
                  setState(failure.state)
                  setMessage(failure.message)
                })
              } else if (cause && !isZXingNotFound(cause)) {
                live = false
                stop()
                const failure = cameraFailure(cause)
                setState(failure.state)
                setMessage(failure.message)
              } else {
                markCodeMissing()
              }
            },
          )
          if (!live) {
            scannerControls.stop()
            return
          }
          setState('active')
          setMessage('Cámara activa')
        }
      } catch (cause) {
        if (!live) return
        stop()
        const failure = cameraFailure(cause)
        setState(failure.state)
        setMessage(failure.message)
      }
    }
    void start()
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
