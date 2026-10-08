import { useEffect, useRef, useState } from 'react'
import {
  confirmRoomImport,
  previewRoomImport,
  RoomImportError,
} from '../api/roomImportApi'
import type {
  RoomImportConfirmation,
  RoomImportPreview,
} from '../types/roomImport.types'
import { getRoomFileError, validateRoomCsv } from '../utils/roomCsv'

type Flow =
  | { kind: 'select'; file: File | null }
  | { kind: 'validating'; file: File }
  | { kind: 'preview' | 'confirming'; file: File; preview: RoomImportPreview }
  | { kind: 'success'; file: File; result: RoomImportConfirmation }

export function useRoomImport(
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
    const message = getRoomFileError(file)
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
      const message = await validateRoomCsv(file)
      if (request.signal.aborted) return
      if (message) throw new RoomImportError(message)
      const preview = await previewRoomImport(file, request.signal)
      if (request.signal.aborted) return
      setFlow({ kind: 'preview', file, preview })
      notify(
        preview.valid_rows > 0 && !preview.errors.length ? 'success' : 'info',
        preview.errors.length
          ? 'Revisa las observaciones generales del archivo.'
          : preview.valid_rows > 0
            ? 'Vista previa generada correctamente.'
            : 'No hay aulas listas para importar.',
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
      !flow.preview.valid_rows ||
      flow.preview.errors.length
    )
      return
    pending.current = true
    const { file, preview } = flow
    const request = new AbortController()
    controller.current = request
    setFlow({ kind: 'confirming', file, preview })
    setError(null)
    try {
      const result = await confirmRoomImport(
        file,
        preview.preview_id,
        request.signal,
      )
      if (request.signal.aborted) return
      setFlow({ kind: 'success', file, result })
      notify(
        result.imported_rows > 0 ? 'success' : 'info',
        `Importación completada: ${result.imported_rows} aulas importadas y ${result.failed_rows} no importadas.`,
      )
    } catch (cause) {
      if (request.signal.aborted) return
      const failure =
        cause instanceof RoomImportError
          ? cause
          : new RoomImportError(
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
