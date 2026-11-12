import { useEffect, useRef, useState } from 'react'
import { CsvDropzone } from '@/features/students/components/CsvDropzone'
import studentDesignStyles from '@/features/students/components/StudentImportDesign.module.css'
import studentPageStyles from '@/features/students/pages/ImportStudentsPage.module.css'
import {
  confirmAcademicImport,
  getAutomationError,
  previewAcademicImport,
} from '../api/eligibilityAutomationApi'
import type {
  AcademicImportMode,
  AcademicValues,
  CsvImportPreview,
  CsvImportResult,
  ImportSchema,
} from '../types/eligibilityAutomation.types'
import type { AcademicCsvRow } from '../utils/academicCsv'
import {
  AcademicCsvValidationError,
  downloadAcademicCsvTemplate,
  getAcademicCsvLayout,
  prepareAcademicCsv,
  prepareAcademicMergeCsv,
  getAcademicMergeTemplates,
  downloadAcademicMergeTemplate,
} from '../utils/academicCsv'
import { assessmentLabel } from '../utils/automationPresentation'
import styles from '../pages/EligibilityAutomation.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

type Props = {
  offeringId: number
  schema: ImportSchema
  layout: ReturnType<typeof getAcademicCsvLayout>
  onConfirmed: () => Promise<void>
}

const EXISTING_DATA_MESSAGE =
  'El estudiante ya tiene datos académicos registrados. Utiliza la opción “Corregir” para modificarlos.'
const INVALID_STUDENT_MESSAGE =
  'El SIS indicado no corresponde a un estudiante inscrito actualmente en esta materia/oferta.'

function humanizeAcademicImportMessage(message: string): string {
  const normalized = message.toLocaleLowerCase('es')
  if (normalized.includes('ya existen datos')) {
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
  layout,
  onConfirmed,
}: Props) {
  const [mode, setMode] = useState<AcademicImportMode>('CREATE_ONLY')
  const [reason, setReason] = useState('')
  const [template, setTemplate] = useState('attendance')
  const [now, setNow] = useState(() => Date.now())
  const templates = getAcademicMergeTemplates(schema)
  const selectedTemplate =
    templates.find(({ id }) => id === template) ?? templates[0]
  const reasonLimit = Math.min(500, schema.merge?.reason_max_length ?? 500)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [prepared, setPrepared] = useState<{
    csv: string
    rows: AcademicCsvRow[]
    sourceRows: number[]
  } | null>(null)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [working, setWorking] = useState(false)
  const operation = useRef(0)
  const errorId = 'academic-csv-error'
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => {
      window.clearInterval(timer)
      operation.current += 1
    }
  }, [])

  function invalidatePreview() {
    setPreview(null)
    setResult(null)
    setError('')
  }

  const expired = preview ? Date.parse(preview.expires_at) <= now : false
  const missingReason =
    mode === 'MERGE' &&
    schema.merge?.reason_required_for_updates &&
    (preview?.summary?.updated_records ?? 0) > 0 &&
    !preview?.reason?.trim()
  const blocked =
    working || expired || Boolean(missingReason) || Boolean(result)

  async function selectFile(file: File) {
    if (working) return
    const request = ++operation.current
    setSelectedFile(file)
    setPrepared(null)
    setPreview(null)
    setResult(null)
    setError('')
    setValidating(true)
    try {
      const next =
        mode === 'MERGE'
          ? { ...(await prepareAcademicMergeCsv(file, schema)), rows: [] }
          : await prepareAcademicCsv(file, schema, layout)
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
    if (working) return
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
    setPreview(null)
    try {
      const file = new File([prepared.csv], selectedFile.name, {
        type: 'text/csv;charset=utf-8',
      })
      const next = await previewAcademicImport(
        offeringId,
        file,
        mode === 'MERGE' ? { mode, reason } : undefined,
      )
      if (mode === 'MERGE' && next.mode !== 'MERGE')
        throw new Error(
          'La respuesta no corresponde a la modalidad MERGE. Genera una nueva vista previa.',
        )
      if (request === operation.current) setPreview(next)
    } catch (previewError) {
      if (request === operation.current) {
        const apiError = getAutomationError(previewError)
        setError(
          [
            humanizeAcademicImportMessage(apiError.message),
            ...Object.values(apiError.fieldErrors),
          ].join(' '),
        )
      }
    } finally {
      if (request === operation.current) setWorking(false)
    }
  }

  async function confirmImport() {
    if (!preview?.can_confirm || blocked) return
    if (Date.parse(preview.expires_at) <= Date.now()) {
      setNow(Date.now())
      return
    }
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
        setPreview(null)
        try {
          await onConfirmed()
        } catch {
          setError(
            'La importación fue confirmada. Recarga los registros para consultar los datos actualizados.',
          )
        }
      }
    } catch (confirmationError) {
      if (request === operation.current) {
        const apiError = getAutomationError(confirmationError)
        if (apiError.status === 409) {
          setPreview(null)
          setError(
            'Los datos cambiaron o la vista previa caducó. Genera una nueva vista previa antes de confirmar.',
          )
        } else {
          setError(
            [
              humanizeAcademicImportMessage(apiError.message),
              ...Object.values(apiError.fieldErrors),
            ].join(' '),
          )
        }
      }
    } finally {
      if (request === operation.current) setWorking(false)
    }
  }

  const maxStudentRows = layout.assessmentKeys.length
    ? Math.floor(schema.max_rows / layout.assessmentKeys.length)
    : 0
  const asksIfTaken = layout.columns.some(({ key }) =>
    key.startsWith('rindio_'),
  )

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
            Carga los datos académicos de los estudiantes mediante un archivo
            CSV.
          </p>
          <p className={styles.academicImportDescription}>
            Estos datos serán utilizados para evaluar automáticamente los
            criterios de habilitación.
          </p>
        </div>
        <Button
          variant="secondary"
          className={`${studentPageStyles.templateButton} ${styles.academicTemplateButton}`}
          disabled={
            mode === 'MERGE'
              ? !selectedTemplate
              : layout.assessmentKeys.length === 0
          }
          onClick={() =>
            mode === 'MERGE'
              ? downloadAcademicMergeTemplate(selectedTemplate.columns)
              : downloadAcademicCsvTemplate(layout.columns)
          }
        >
          <DownloadIcon />
          Descargar plantilla CSV
        </Button>
      </header>

      {templates.length > 0 ? (
        <div className={styles.mergeControls}>
          <label>
            Modalidad de importación
            <select
              id="academic-import-mode"
              value={mode}
              disabled={working}
              onChange={(event) => {
                removeFile()
                setMode(event.currentTarget.value as AcademicImportMode)
                setReason('')
              }}
            >
              <option value="CREATE_ONLY">Crear registros nuevos</option>
              <option value="MERGE">Actualizar parcialmente (MERGE)</option>
            </select>
          </label>
          {mode === 'MERGE' ? (
            <>
              <label>
                Plantilla MERGE
                <select
                  id="academic-merge-template"
                  value={template}
                  onChange={(event) => setTemplate(event.currentTarget.value)}
                >
                  {templates.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Justificación de actualización
                <textarea
                  id="academic-merge-reason"
                  value={reason}
                  maxLength={reasonLimit}
                  disabled={working}
                  onChange={(event) => {
                    invalidatePreview()
                    setReason(event.currentTarget.value)
                  }}
                />
                <span>
                  Obligatoria cuando se actualicen datos existentes. Máximo{' '}
                  {reasonLimit} caracteres.
                </span>
              </label>
            </>
          ) : null}
        </div>
      ) : null}
      <div>
        <p className={studentPageStyles.columnsIntro}>
          El archivo debe incluir las siguientes columnas:
        </p>
        <div
          className={`${studentDesignStyles.columnsGuide} ${styles.academicColumnsGuide}`}
          aria-label="Columnas de la plantilla CSV"
        >
          {(mode === 'MERGE'
            ? (selectedTemplate?.columns ?? []).map((key) => ({
                key,
                label: key,
              }))
            : layout.columns
          ).map((column) => (
            <span key={column.key}>{column.label}</span>
          ))}
        </div>
        {mode === 'CREATE_ONLY' && layout.requiresAssessmentForAttendance ? (
          <p>
            Para registrar la asistencia, el importador requiere indicar si el
            estudiante rindió un parcial.
          </p>
        ) : null}
        {mode === 'CREATE_ONLY' && asksIfTaken ? (
          <p>En las columnas «Rindió», escribe «Sí» o «No».</p>
        ) : null}
      </div>

      {mode === 'MERGE' ? (
        <p>
          Las columnas omitidas y las celdas vacías conservan los datos
          existentes. El cero es un valor explícito. Usa true o false para
          was_taken. Cada evaluación y la asistencia pueden aparecer una sola
          vez por SIS. Puedes combinar las columnas permitidas por el esquema,
          con sis obligatorio.
        </p>
      ) : null}
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
        y {schema.max_rows} filas CSV
        {mode === 'CREATE_ONLY'
          ? ` (${maxStudentRows} estudiantes con el esquema actual)`
          : ''}
        .
      </p>

      <div className={studentPageStyles.infoBanner}>
        <InfoIcon />
        <div>
          Podrás revisar los datos académicos antes de confirmar la carga y
          aplicar la habilitación automática.
          <br />
          {mode === 'MERGE'
            ? 'Las celdas vacías conservan los valores existentes. Importar no recalcula habilitaciones.'
            : 'Si un estudiante ya tiene datos registrados, deberás modificarlos mediante la opción “Corregir”.'}
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

      {expired ? (
        <p role="alert">
          La vista previa caducó. Genera una nueva vista previa.
        </p>
      ) : null}
      {preview && mode === 'MERGE' ? (
        <AcademicMergePreview
          preview={preview}
          sourceRows={prepared?.sourceRows ?? []}
          blocked={blocked}
          onConfirm={() => void confirmImport()}
        />
      ) : null}
      {preview && mode === 'CREATE_ONLY' ? (
        <AcademicCsvPreview
          preview={preview}
          inputRows={prepared?.rows ?? []}
          layout={layout}
          working={blocked}
          sourceRows={prepared?.sourceRows ?? []}
          onConfirm={() => void confirmImport()}
        />
      ) : null}
      {result ? (
        <p className={styles.success} role="status">
          Importación confirmada: {result.created_records} registros creados. Se
          actualizaron los registros académicos.
          {mode === 'MERGE'
            ? ` Actualizados: ${result.updated_records ?? 0} · Sin cambios: ${result.unchanged_records ?? 0}.`
            : ''}
        </p>
      ) : null}
    </section>
  )
}

function AcademicCsvPreview({
  preview,
  inputRows,
  sourceRows,
  layout,
  working,
  onConfirm,
}: {
  preview: CsvImportPreview
  inputRows: AcademicCsvRow[]
  sourceRows: number[]
  layout: Props['layout']
  working: boolean
  onConfirm: () => void
}) {
  const includesPP = layout.columns.some(({ key }) => key === 'nota_pp')
  const includesSP = layout.columns.some(({ key }) => key === 'nota_sp')
  const includesTakenPP = layout.columns.some(({ key }) => key === 'rindio_pp')
  const includesTakenSP = layout.columns.some(({ key }) => key === 'rindio_sp')
  const includesAttendance = layout.columns.some(
    ({ key }) => key === 'asistencias',
  )
  const errorsByInputRow = new Map<
    number,
    { sis: string | null; messages: Set<string> }
  >()
  preview.errors.forEach((item) => {
    const inputRow = sourceRows[item.row - 2] ?? item.row
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
                {includesPP ? (
                  <th scope="col">
                    {
                      layout.columns.find((column) => column.key === 'nota_pp')
                        ?.label
                    }
                  </th>
                ) : null}
                {includesSP ? (
                  <th scope="col">
                    {
                      layout.columns.find((column) => column.key === 'nota_sp')
                        ?.label
                    }
                  </th>
                ) : null}
                {includesTakenPP ? (
                  <th scope="col">
                    {
                      layout.columns.find(
                        (column) => column.key === 'rindio_pp',
                      )?.label
                    }
                  </th>
                ) : null}
                {includesTakenSP ? (
                  <th scope="col">
                    {
                      layout.columns.find(
                        (column) => column.key === 'rindio_sp',
                      )?.label
                    }
                  </th>
                ) : null}
                {includesAttendance ? (
                  <>
                    <th scope="col">Asistencia</th>
                    <th scope="col">% asistencia</th>
                  </>
                ) : null}
                {includesPP && includesSP ? (
                  <th scope="col">Promedio</th>
                ) : null}
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
                    {includesPP ? (
                      <td>{formatAssessment(pp, source.nota_pp)}</td>
                    ) : null}
                    {includesSP ? (
                      <td>{formatAssessment(sp, source.nota_sp)}</td>
                    ) : null}
                    {includesTakenPP ? <td>{source.rindio_pp}</td> : null}
                    {includesTakenSP ? <td>{source.rindio_sp}</td> : null}
                    {includesAttendance ? (
                      <>
                        <td>
                          {source.asistencias} / {source.total_clases}
                        </td>
                        <td>{formatAttendancePercentage(attended, total)}</td>
                      </>
                    ) : null}
                    {includesPP && includesSP ? (
                      <td>{formatAverage(source.nota_pp, source.nota_sp)}</td>
                    ) : null}
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

function AcademicMergePreview({
  preview,
  sourceRows,
  blocked,
  onConfirm,
}: {
  preview: CsvImportPreview
  sourceRows: number[]
  blocked: boolean
  onConfirm: () => void
}) {
  const actions = {
    CREATE: 'Crear',
    UPDATE: 'Actualizar',
    UNCHANGED: 'Sin cambios',
  }
  const complete =
    Boolean(preview.summary) &&
    preview.valid_records.every(
      (record) => record.action && record.before && record.proposed,
    )
  return (
    <section
      className={styles.academicPreview}
      aria-labelledby="academic-merge-preview-title"
    >
      <h4 id="academic-merge-preview-title">
        Vista previa de importación parcial
      </h4>
      {preview.summary ? (
        <p role="status">
          Crear: {preview.summary.created_records} · Actualizar:{' '}
          {preview.summary.updated_records} · Sin cambios:{' '}
          {preview.summary.unchanged_records}
        </p>
      ) : (
        <p role="alert">
          No se recibió el resumen de la importación. Genera una nueva vista
          previa.
        </p>
      )}
      <p>
        Justificación revisada:{' '}
        {preview.reason ||
          'Sin justificación; no se actualizarán registros existentes.'}
      </p>
      {preview.errors.length > 0 ? (
        <ul className={styles.errorList}>
          {preview.errors.map((error, index) => (
            <li key={`${error.row}-${index}`}>
              Fila {sourceRows[error.row - 2] ?? error.row} · SIS{' '}
              {error.sis ?? '—'}:{' '}
              {Object.values(error.messages).flat().join(' ')}
            </li>
          ))}
        </ul>
      ) : null}
      {preview.valid_records.map((record) => (
        <article key={record.student_id} className={styles.mergeRecord}>
          <h5>
            SIS {record.sis} ·{' '}
            {record.action ? actions[record.action] : 'Sin acción confirmada'}
          </h5>
          <p>
            Registro {record.record_id ?? 'nuevo'} · Revisión{' '}
            {record.revision ?? '—'}
          </p>
          <div className={styles.mergeDifference}>
            <section aria-label={`Valores anteriores de ${record.sis}`}>
              <h6>Anterior</h6>
              {record.before ? (
                <AcademicValuesDetail values={record.before} />
              ) : (
                <p>Sin datos disponibles</p>
              )}
            </section>
            <section aria-label={`Valores propuestos de ${record.sis}`}>
              <h6>Propuesto</h6>
              {record.proposed ? (
                <AcademicValuesDetail values={record.proposed} />
              ) : (
                <p>Sin datos disponibles</p>
              )}
            </section>
          </div>
        </article>
      ))}
      <Button
        disabled={blocked || !complete || !preview.can_confirm}
        onClick={onConfirm}
      >
        Confirmar importación
      </Button>
    </section>
  )
}

function AcademicValuesDetail({ values }: { values: AcademicValues }) {
  return (
    <dl>
      <div>
        <dt>Asistencia</dt>
        <dd>
          {values.attended_classes ?? 'Sin dato'} /{' '}
          {values.total_classes ?? 'Sin dato'}
        </dd>
      </div>
      {Object.entries(values.assessments).map(([key, assessment]) => (
        <div key={key}>
          <dt>{assessmentLabel(key)}</dt>
          <dd>
            Rindió: {assessment.was_taken ? 'Sí' : 'No'} · Nota:{' '}
            {assessment.score ?? 'Sin dato'}
          </dd>
        </div>
      ))}
    </dl>
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
