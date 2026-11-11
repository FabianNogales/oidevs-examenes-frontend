import { useRef, useState } from 'react'
import { CsvDropzone } from '@/features/students/components/CsvDropzone'
import studentDesignStyles from '@/features/students/components/StudentImportDesign.module.css'
import studentPageStyles from '@/features/students/pages/ImportStudentsPage.module.css'
import {
  confirmAcademicImport,
  previewAcademicImport,
} from '../api/eligibilityAutomationApi'
import type {
  CsvImportPreview,
  CsvImportResult,
  ImportSchema,
} from '../types/eligibilityAutomation.types'
import type { AcademicCsvRow } from '../utils/academicCsv'
import {
  AcademicCsvValidationError,
  ACADEMIC_CSV_COLUMNS,
  downloadAcademicCsvTemplate,
  prepareAcademicCsv,
} from '../utils/academicCsv'
import styles from '../pages/EligibilityAutomation.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

type Props = {
  offeringId: number
  schema: ImportSchema
  onConfirmed: () => Promise<void>
}

const EXISTING_DATA_MESSAGE =
  'El estudiante ya tiene datos académicos registrados. Utiliza la opción “Corregir” para modificarlos.'
const INVALID_STUDENT_MESSAGE =
  'El SIS indicado no corresponde a un estudiante inscrito actualmente en esta materia/oferta.'

function humanizeAcademicImportMessage(message: string): string {
  const normalized = message.toLocaleLowerCase('es')
  if (
    normalized.includes('ya existen datos') ||
    normalized.includes('corrección explícita')
  ) {
    return EXISTING_DATA_MESSAGE
  }
  if (
    normalized.includes('estudiante inexistente') ||
    normalized.includes('sin inscripción activa')
  ) {
    return INVALID_STUDENT_MESSAGE
  }
  return message
}

export function AcademicCsvImportPanel({
  offeringId,
  schema,
  onConfirmed,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prepared, setPrepared] = useState<{
    csv: string
    rows: AcademicCsvRow[]
  } | null>(null)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [working, setWorking] = useState(false)
  const operation = useRef(0)
  const errorId = 'academic-csv-error'

  async function selectFile(file: File) {
    const request = ++operation.current
    setSelectedFile(file)
    setPrepared(null)
    setPreview(null)
    setResult(null)
    setError('')
    setValidating(true)
    try {
      const next = await prepareAcademicCsv(file, schema)
      if (request === operation.current) setPrepared(next)
    } catch (validationError) {
      if (request === operation.current) {
        setError(
          validationError instanceof AcademicCsvValidationError
            ? validationError.message
            : 'No se pudo leer el archivo CSV.',
        )
      }
    } finally {
      if (request === operation.current) setValidating(false)
    }
  }

  function removeFile() {
    operation.current += 1
    setSelectedFile(null)
    setPrepared(null)
    setPreview(null)
    setResult(null)
    setError('')
    setValidating(false)
    setWorking(false)
  }

  async function generatePreview() {
    if (!selectedFile || !prepared || working) return
    const request = operation.current
    setWorking(true)
    setError('')
    setResult(null)
    try {
      const file = new File([prepared.csv], selectedFile.name, {
        type: 'text/csv;charset=utf-8',
      })
      const next = await previewAcademicImport(offeringId, file)
      if (request === operation.current) setPreview(next)
    } catch (previewError) {
      if (request === operation.current) {
        setError(
          previewError instanceof Error
            ? humanizeAcademicImportMessage(previewError.message)
            : 'No se pudo generar la vista previa del archivo.',
        )
      }
    } finally {
      if (request === operation.current) setWorking(false)
    }
  }

  async function confirmImport() {
    if (!preview?.can_confirm || working) return
    const request = operation.current
    setWorking(true)
    setError('')
    try {
      const confirmed = await confirmAcademicImport(
        offeringId,
        preview.preview_id,
      )
      if (request === operation.current) {
        setResult(confirmed)
        await onConfirmed()
      }
    } catch (confirmationError) {
      if (request === operation.current) {
        setError(
          confirmationError instanceof Error
            ? humanizeAcademicImportMessage(confirmationError.message)
            : 'No se pudo confirmar la importación.',
        )
      }
    } finally {
      if (request === operation.current) setWorking(false)
    }
  }

  const maxStudentRows = schema.assessment_keys.length
    ? Math.floor(schema.max_rows / schema.assessment_keys.length)
    : 0

  return (
    <section
      className={`${studentPageStyles.panel} ${styles.academicImportPanel}`}
      aria-labelledby="academic-import-title"
    >
      <header className={studentPageStyles.panelHeader}>
        <div className={studentPageStyles.panelHeading}>
          <h3
            id="academic-import-title"
            className={studentPageStyles.panelTitle}
          >
            Importar datos académicos
          </h3>
          <p className={styles.academicImportDescription}>
            Carga las calificaciones y asistencia de los estudiantes mediante un
            archivo CSV.
          </p>
          <p className={styles.academicImportDescription}>
            Estos datos serán utilizados para evaluar automáticamente los
            criterios de habilitación.
          </p>
        </div>
        <Button
          variant="secondary"
          className={`${studentPageStyles.templateButton} ${styles.academicTemplateButton}`}
          onClick={downloadAcademicCsvTemplate}
        >
          <DownloadIcon />
          Descargar plantilla CSV
        </Button>
      </header>

      <div>
        <p className={studentPageStyles.columnsIntro}>
          El archivo debe incluir las siguientes columnas:
        </p>
        <div
          className={`${studentDesignStyles.columnsGuide} ${styles.academicColumnsGuide}`}
          aria-label="Columnas de la plantilla CSV"
        >
          {ACADEMIC_CSV_COLUMNS.map((column) => (
            <span key={column.key}>{column.label}</span>
          ))}
        </div>
      </div>

      <CsvDropzone
        className={styles.academicDropzone}
        fileStateClassName={styles.academicFileState}
        errorId={error ? errorId : undefined}
        selectedFile={selectedFile}
        validationMessage={null}
        onFileSelected={(file) => void selectFile(file)}
        onRemoveFile={removeFile}
        labels={{
          dropzoneLabel: 'Zona para cargar datos académicos en formato CSV',
          title: 'Arrastra tu archivo CSV aquí',
          inputLabel: 'Seleccionar archivo CSV de datos académicos',
          selectButtonLabel: 'Seleccionar archivo',
          changeButtonLabel: 'Reemplazar archivo',
          removeButtonLabel: 'Quitar archivo',
          formatLabel: 'Formato admitido: .csv',
          fileTypeLabel: 'CSV',
        }}
      />
      {validating ? <p role="status">Validando archivo CSV…</p> : null}
      {error ? (
        <div id={errorId} className={styles.academicCsvError} role="alert">
          {error}
        </div>
      ) : null}
      <p className={styles.academicCsvLimits}>
        UTF-8 · Separado por comas · Máximo {formatFileSize(schema.max_file_kb)}{' '}
        y {schema.max_rows} filas CSV ({maxStudentRows} estudiantes con el
        esquema actual).
      </p>

      <div className={studentPageStyles.infoBanner}>
        <InfoIcon />
        <div>
          Podrás revisar los datos académicos antes de confirmar la carga y
          aplicar la habilitación automática.
          <br />
          Si un estudiante ya tiene datos registrados, deberás modificarlos
          mediante la opción “Corregir”.
        </div>
      </div>

      <div className={studentPageStyles.panelActions}>
        <Button
          className={`${studentPageStyles.continueButton} ${styles.academicPreviewButton}`}
          disabled={!prepared || validating || working}
          onClick={() => void generatePreview()}
        >
          {working ? 'Procesando…' : 'Validar y generar vista previa'}
        </Button>
      </div>

      {preview ? (
        <AcademicCsvPreview
          preview={preview}
          inputRows={prepared?.rows ?? []}
          assessmentCount={schema.assessment_keys.length}
          working={working}
          onConfirm={() => void confirmImport()}
        />
      ) : null}
      {result ? (
        <p className={styles.success} role="status">
          Importación confirmada: {result.created_records} registros creados. Se
          actualizaron los registros académicos.
        </p>
      ) : null}
    </section>
  )
}

function AcademicCsvPreview({
  preview,
  inputRows,
  assessmentCount,
  working,
  onConfirm,
}: {
  preview: CsvImportPreview
  inputRows: AcademicCsvRow[]
  assessmentCount: number
  working: boolean
  onConfirm: () => void
}) {
  const errorsByInputRow = new Map<
    number,
    { sis: string | null; messages: Set<string> }
  >()
  preview.errors.forEach((item) => {
    const inputRow =
      assessmentCount > 0
        ? Math.floor((item.row - 2) / assessmentCount) + 2
        : item.row
    const grouped = errorsByInputRow.get(inputRow) ?? {
      sis: item.sis,
      messages: new Set<string>(),
    }
    Object.values(item.messages)
      .flat()
      .forEach((message) =>
        grouped.messages.add(humanizeAcademicImportMessage(message)),
      )
    errorsByInputRow.set(inputRow, grouped)
  })

  return (
    <section
      className={styles.academicPreview}
      aria-labelledby="academic-preview-title"
      aria-live="polite"
    >
      <h4 id="academic-preview-title">Vista previa de datos académicos</h4>
      <p>
        Estudiantes cargados: {inputRows.length} · Estudiantes válidos:{' '}
        {preview.valid_records.length} · Estudiantes con errores:{' '}
        {errorsByInputRow.size}
      </p>
      <p>
        {preview.can_confirm
          ? 'La vista previa está lista para confirmar.'
          : 'No se puede confirmar: revisa los errores del archivo.'}
      </p>
      {preview.errors.length > 0 ? (
        <ul className={styles.errorList}>
          {[...errorsByInputRow.entries()].map(([row, item]) => (
            <li key={`${row}-${item.sis ?? 'unknown'}`}>
              Fila {row} · SIS {item.sis ?? '—'}: {[...item.messages].join(' ')}
            </li>
          ))}
        </ul>
      ) : null}
      {inputRows.length > 0 ? (
        <div className={styles.academicPreviewTableWrap}>
          <table className={styles.academicPreviewTable}>
            <thead>
              <tr>
                <th scope="col">SIS</th>
                <th scope="col">Nombre completo</th>
                <th scope="col">Nota PP</th>
                <th scope="col">Nota SP</th>
                <th scope="col">Asistencia</th>
                <th scope="col">% asistencia</th>
                <th scope="col">Promedio</th>
                <th scope="col">Estado de validación</th>
              </tr>
            </thead>
            <tbody>
              {inputRows.map((source, index) => {
                const record = preview.valid_records.find(
                  (item) => item.sis === source.sis,
                )
                const error = errorsByInputRow.get(index + 2)
                const pp = record?.assessments.FIRST_PARTIAL?.score
                const sp = record?.assessments.SECOND_PARTIAL?.score
                const attended = Number(source.asistencias)
                const total = Number(source.total_clases)
                return (
                  <tr key={`${source.sis}-${index}`}>
                    <td>{source.sis}</td>
                    <td>{source.nombre_completo}</td>
                    <td>{formatAssessment(pp, source.nota_pp)}</td>
                    <td>{formatAssessment(sp, source.nota_sp)}</td>
                    <td>
                      {source.asistencias} / {source.total_clases}
                    </td>
                    <td>{formatAttendancePercentage(attended, total)}</td>
                    <td>{formatAverage(source.nota_pp, source.nota_sp)}</td>
                    <td>
                      <span className={styles.academicValidationStatus}>
                        {academicValidationStatus(error?.messages)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className={studentPageStyles.panelActions}>
        <Button
          className={`${studentPageStyles.continueButton} ${styles.academicPreviewButton}`}
          disabled={!preview.can_confirm || working}
          onClick={onConfirm}
        >
          {working ? 'Confirmando…' : 'Confirmar importación'}
        </Button>
      </div>
    </section>
  )
}

function academicValidationStatus(messages?: Set<string>): string {
  if (!messages || messages.size === 0) return 'Válido'
  const normalized = [...messages].join(' ').toLocaleLowerCase('es')
  if (
    normalized.includes('ya tiene datos') ||
    normalized.includes('ya existen datos') ||
    normalized.includes('corrección explícita')
  ) {
    return 'Ya tiene datos'
  }
  if (
    normalized.includes('no corresponde a un estudiante inscrito') ||
    normalized.includes('estudiante inexistente') ||
    normalized.includes('sin inscripción activa')
  ) {
    return 'No inscrito'
  }
  return 'Error'
}

function formatAssessment(
  backendScore: number | null | undefined,
  sourceScore: string,
): string {
  if (backendScore !== null && backendScore !== undefined) {
    return String(backendScore)
  }
  return sourceScore || 'No rendido'
}

function formatAttendancePercentage(attended: number, total: number): string {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0) {
    return '—'
  }
  return `${Number(((attended / total) * 100).toFixed(2))} %`
}

function formatAverage(pp: string, sp: string): string {
  if (pp === '' || sp === '') return 'Pendiente'
  const first = Number(pp)
  const second = Number(sp)
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 'Pendiente'
  return String(Number(((first + second) / 2).toFixed(2)))
}

function formatFileSize(sizeKb: number): string {
  const bytes = sizeKb * 1024
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    : `${sizeKb} KB`
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v4h14v-4" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </svg>
  )
}
