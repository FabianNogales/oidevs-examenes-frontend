import { useEffect, useId, useRef, useState } from 'react'
import { CollaborationModal as Modal } from '@/features/collaborations/components/CollaborationModal'
import type { BulkEligibilityResult } from '../types/eligibility.types'
import { getSafeEligibilityMessage } from '../utils/eligibilityErrors'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/Eligibilities.module.css'

const MAX_FILE_BYTES = 5 * 1024 * 1024

type Props = {
  onClose: () => void
  onProcess: (file: File, signal: AbortSignal) => Promise<BulkEligibilityResult>
}

function validateFile(file: File): string | null {
  if (!/\.csv$/i.test(file.name)) return 'Selecciona un archivo con extensión .csv.'
  if (file.size > MAX_FILE_BYTES) return 'El archivo no puede superar los 5 MB.'
  return null
}

export function BulkEligibilitiesModal({ onClose, onProcess }: Props) {
  const fieldId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkEligibilityResult | null>(null)
  const request = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const fileError = file ? validateFile(file) : null

  useEffect(() => () => request.current?.abort(), [])

  function close() {
    if (!request.current) onClose()
  }

  async function process() {
    if (request.current || result) return
    if (!file || fileError) {
      setError(fileError ?? 'Selecciona un archivo CSV para procesar.')
      fileInput.current?.focus()
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      const processed = await onProcess(file, controller.signal)
      if (!controller.signal.aborted) setResult(processed)
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'No se pudo procesar el archivo.')
      }
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <div className={styles.bulkModal}>
      <Modal title="Cargar habilitaciones" onClose={close} busy={busy}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void process()
          }}
        >
          <p className={styles.modalSubtitle}>
            Actualiza las habilitaciones de este examen desde un archivo CSV.
          </p>
          <div className={styles.csvFormat} id={`${fieldId}-format`}>
            <strong>Formato requerido</strong>
            <p>CSV en UTF-8, separado por comas. Máximo 5 MB y 1.000 registros.</p>
            <p>Encabezados obligatorios:</p>
            <code>sis_code,status,reason_code,observations</code>
            <p>
              Conserva el SIS como texto, incluidos sus ceros iniciales. Usa
              ELIGIBLE o INELIGIBLE como estado y un código del catálogo para
              inhabilitar. Para habilitar, deja motivo y observaciones vacíos.
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={fieldId}>Archivo CSV</label>
            <input
              id={fieldId}
              ref={fileInput}
              type="file"
              accept=".csv"
              disabled={busy}
              aria-describedby={`${fieldId}-format${error ? ` ${fieldId}-error` : ''}`}
              aria-invalid={fileError ? true : undefined}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                setFile(selected)
                setResult(null)
                setError(selected ? validateFile(selected) : null)
              }}
            />
          </div>
          {busy ? <p role="status">Procesando habilitaciones…</p> : null}
          {error ? (
            <p id={`${fieldId}-error`} className={sharedStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          {result ? (
            <section
              className={styles.bulkResult}
              aria-labelledby={`${fieldId}-result`}
            >
              <h3 id={`${fieldId}-result`}>Resultado de la carga</h3>
              <dl className={styles.bulkSummary} role="status" aria-live="polite">
                <div>
                  <dt>Total de registros</dt>
                  <dd>{result.total_rows}</dd>
                </div>
                <div>
                  <dt>Actualizados</dt>
                  <dd>{result.updated_rows}</dd>
                </div>
                <div>
                  <dt>Con errores</dt>
                  <dd>{result.failed_rows}</dd>
                </div>
              </dl>
              {result.failed_rows > 0 ? (
                <p className={sharedStyles.note}>
                  Las filas con errores no se actualizaron. Las actualizaciones
                  correctas se conservaron.
                </p>
              ) : null}
              {result.errors.length > 0 ? (
                <>
                  <p className={sharedStyles.note}>El encabezado cuenta como línea 1.</p>
                  <div
                    className={styles.bulkErrorsWrap}
                    tabIndex={0}
                    role="region"
                    aria-label="Errores por fila"
                  >
                    <table className={`${sharedStyles.table} ${styles.bulkErrors}`}>
                      <thead>
                        <tr>
                          <th scope="col">Línea</th>
                          <th scope="col">SIS</th>
                          <th scope="col">Mensaje(s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((issue, index) => (
                          <tr key={`${issue.row}-${index}`}>
                            <td>{issue.row}</td>
                            <td className={styles.sisCode}>{issue.sis_code}</td>
                            <td>
                              <ul>
                                {Object.values(issue.messages).flat().map((message, messageIndex) => (
                                  <li key={messageIndex}>
                                    {getSafeEligibilityMessage(message, 'No se pudo actualizar esta fila. Revisa sus datos.')}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={close}
              disabled={busy}
            >
              {result ? 'Cerrar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              className={sharedStyles.primaryButton}
              disabled={busy || !file || !!fileError || !!result}
            >
              {busy ? 'Procesando…' : 'Procesar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
