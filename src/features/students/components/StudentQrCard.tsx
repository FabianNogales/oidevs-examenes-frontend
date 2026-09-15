import { useState } from 'react'
import { ExamSchedule } from '@/features/students/components/ExamSchedule'
import { StudentQrIcon } from '@/features/students/components/StudentQrIcon'
import type { StudentExamQr } from '@/features/students/types/studentQr'
import styles from '@/features/students/pages/StudentQrPage.module.css'

function filenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '')
}

interface StudentQrCardProps {
  qr: StudentExamQr
  onRetry: () => void
}

export function StudentQrCard({ qr, onRetry }: StudentQrCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const validImage = qr.qr_code_base64.startsWith('data:image/svg+xml;base64,')

  const filename = `qr-${filenamePart(qr.subject) || 'materia'}-${
    filenamePart(qr.exam_title) || 'examen'
  }-${qr.exam_id}.svg`

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

          <a
            className={styles.primaryButton}
            href={qr.qr_code_base64}
            download={filename}
          >
            <StudentQrIcon name="download" />
            Descargar QR (SVG)
          </a>
        </>
      )}
    </article>
  )
}
