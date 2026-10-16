import { useEffect, useRef, useState } from 'react'
import {
  confirmSubjectImport,
  previewSubjectImport,
  SubjectImportError,
} from '../api/subjectImportApi'
import type {
  SubjectImportConfirmation,
  SubjectImportPreview,
} from '../types/subjectImport.types'
import { getSubjectFileError, validateSubjectCsv } from '../utils/subjectCsv'

type Flow =
  | { kind: 'select'; file: File | null }
  | { kind: 'validating'; file: File }
  | {
      kind: 'preview' | 'confirming'
      file: File
      preview: SubjectImportPreview
    }
  | { kind: 'success'; file: File; result: SubjectImportConfirmation }

export function useSubjectImport(
  notify: (type: 'success' | 'error' | 'info', message: string) => void,
) {
  const [flow, setFlow] = useState<Flow>({ kind: 'select', file: null })
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])

  function reset() {
    if (pending.current) return
    setFlow({ kind: 'select', file: null })
    setError(null)
  }

  function select(file: File) {
    if (pending.current) return
    const message = getSubjectFileError(file)
    setError(message)
    setFlow({ kind: 'select', file: message ? null : file })
    if (message) notify('error', message)
  }

  async function validate() {
    if (pending.current || flow.kind !== 'select' || !flow.file) return
    pending.current = true
    const file = flow.file
    const request = new AbortController()
    controller.current = request
    setFlow({ kind: 'validating', file })
    setError(null)
    try {
      const message = await validateSubjectCsv(file)
      if (request.signal.aborted) return
      if (message) throw new SubjectImportError(message)
      const preview = await previewSubjectImport(file, request.signal)
      if (request.signal.aborted) return
      setFlow({ kind: 'preview', file, preview })
      notify(
        preview.summary.valid > 0 ? 'success' : 'info',
        preview.summary.valid > 0
          ? 'Vista previa generada correctamente.'
          : 'No hay filas listas para importar.',
      )
    } catch (cause) {
      if (request.signal.aborted) return
      const message =
        cause instanceof Error
          ? cause.message
          : 'No se pudo validar el archivo.'
      setError(message)
      setFlow({ kind: 'select', file })
      notify('error', message)
    } finally {
      pending.current = false
    }
  }

  async function confirm() {
    if (
      pending.current ||
      flow.kind !== 'preview' ||
      !flow.preview.summary.valid
    )
      return
    pending.current = true
    const { file, preview } = flow
    const request = new AbortController()
    controller.current = request
    setFlow({ kind: 'confirming', file, preview })
    setError(null)
    try {
      const result = await confirmSubjectImport(
        file,
        preview.preview_id,
        request.signal,
      )
      if (request.signal.aborted) return
      setFlow({ kind: 'success', file, result })
      notify(
        result.summary.imported > 0 ? 'success' : 'info',
        `Importación completada: ${result.summary.imported} filas importadas y ${result.summary.failed} no importadas.`,
      )
    } catch (cause) {
      if (request.signal.aborted) return
      const failure =
        cause instanceof SubjectImportError
          ? cause
          : new SubjectImportError(
              'No se pudo confirmar la importación. Puedes reintentar con la misma vista previa.',
            )
      setError(failure.message)
      setFlow(
        failure.status === 409 || failure.status === 410
          ? { kind: 'select', file }
          : { kind: 'preview', file, preview },
      )
      notify('error', failure.message)
    } finally {
      pending.current = false
    }
  }

  return {
    flow,
    error,
    reset,
    select,
    validate,
    confirm,
    processing: flow.kind === 'validating' || flow.kind === 'confirming',
  }
}
