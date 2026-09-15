import { useEffect, useRef, useState } from 'react'
import { ExamSchedule } from '@/features/students/components/ExamSchedule'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import type { StudentExamQr } from '@/features/students/types/studentQr'
import {
  downloadQrBlob,
  getQrFilename,
  svgToPng,
} from '@/features/students/utils/studentQrDownload'
import styles from '@/features/students/pages/StudentQrPage.module.css'
import downloadStyles from './StudentQrCard.module.css'

interface StudentQrCardProps {
  qr: StudentExamQr
  onRetry: () => void
}

export function StudentQrCard({ qr, onRetry }: StudentQrCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [generatingPng, setGeneratingPng] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const activeDownload = useRef<AbortController | null>(null)

  useEffect(() => () => activeDownload.current?.abort(), [])

  const validImage = qr.qr_code_base64.startsWith('data:image/svg+xml;base64,')

  const filename = getQrFilename(qr.subject, qr.exam_title)

  async function downloadPng() {
    if (activeDownload.current) return
    const controller = new AbortController()
    activeDownload.current = controller
    setDownloadError(null)
    setGeneratingPng(true)

    try {
      const blob = await svgToPng(qr.qr_code_base64)
      if (!controller.signal.aborted) downloadQrBlob(blob, `${filename}.png`)
    } catch {
      if (!controller.signal.aborted) {
        setDownloadError(
          'No se pudo descargar el PNG. Intenta nuevamente o descarga el SVG.',
        )
      }
    } finally {
      if (activeDownload.current === controller) activeDownload.current = null
      if (!controller.signal.aborted) setGeneratingPng(false)
    }
  }

  return (
    <article className={styles.qrCard}>
      <div className={styles.qrCardHeading}>
        <span className={styles.qrMark}>
          <StudentQrIcon name="qr" />
        </span>
        <p className={styles.cardEyebrow}>QR del examen seleccionado</p>
      </div>
      <p className={styles.subject}>{qr.subject}</p>
      <h3>{qr.exam_title}</h3>

      <p className={`${styles.schedule} ${styles.qrSchedule}`}>
        <StudentQrIcon name="calendar" />
        <ExamSchedule scheduledAt={qr.scheduled_at} />
      </p>

      {!validImage || imageFailed ? (
        <div className={styles.error} role="alert">
          <p>
            No se pudo mostrar la imagen del QR. Intenta cargarla nuevamente.
          </p>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setImageFailed(false)
              onRetry()
            }}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className={styles.qrFrame}>
            <img
              className={styles.qrImage}
              src={qr.qr_code_base64}
              alt={`Código QR del examen ${qr.exam_title}, ${qr.subject}`}
              width={320}
              height={320}
              onError={() => setImageFailed(true)}
            />
          </div>

          <p className={styles.validity}>
            <StudentQrIcon name="check" />
            Válido únicamente para este examen
          </p>
          <p className={styles.qrHelp}>Preséntalo al ingresar a tu examen.</p>

          <div className={downloadStyles.downloads}>
            <a
              className={styles.primaryButton}
              href={qr.qr_code_base64}
              download={`${filename}.svg`}
            >
              <StudentQrIcon name="download" />
              Descargar SVG
            </a>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={generatingPng}
              onClick={() => void downloadPng()}
            >
              <StudentQrIcon name="download" />
              {generatingPng ? 'Generando PNG…' : 'Descargar PNG'}
            </button>
          </div>
          <p className={downloadStyles.status} role="status">
            {generatingPng ? 'Preparando la descarga PNG…' : ''}
          </p>
          {downloadError && (
            <div
              className={`${styles.error} ${downloadStyles.downloadError}`}
              role="alert"
            >
              {downloadError}
            </div>
          )}
        </>
      )}
    </article>
  )
}
