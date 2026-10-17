import { useEffect, useRef, useState } from 'react'
import {
  previewOfferingImport,
  confirmOfferingImport,
} from '../api/offeringImportApi'
import { mapOfferingMutationError } from '../api/offeringMutationsApi'
import { getOfferingFileError, validateOfferingCsv } from '../utils/offeringCsv'
import type {
  OfferingImportPreview,
  OfferingImportConfirmation,
} from '../types/offeringImport.types'

type Flow =
  | { kind: 'select'; file: File | null }
  | { kind: 'validating'; file: File }
  | {
      kind: 'preview' | 'confirming'
      file: File
      preview: OfferingImportPreview
    }
  | { kind: 'success'; file: File; result: OfferingImportConfirmation }

export function useOfferingImport(
  termId: number,
  onBusy: (busy: boolean) => void,
  onSaved: () => void,
) {
  const [flow, setFlow] = useState<Flow>({ kind: 'select', file: null })
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  function reset() {
    if (!pending.current) {
      setFlow({ kind: 'select', file: null })
      setError(null)
    }
  }
  function select(file: File) {
    if (pending.current) return
    const message = getOfferingFileError(file)
    setError(message)
    setFlow({ kind: 'select', file: message ? null : file })
  }
  async function validate() {
    if (pending.current || flow.kind !== 'select' || !flow.file) return
    pending.current = true
    onBusy(true)
    const file = flow.file
    const request = new AbortController()
    controller.current = request
    setFlow({ kind: 'validating', file })
    setError(null)
    try {
      const message = await validateOfferingCsv(file)
      if (request.signal.aborted) return
      if (message) {
        setError(message)
        setFlow({ kind: 'select', file })
        return
      }
      const preview = await previewOfferingImport(file, termId, request.signal)
      if (!request.signal.aborted) setFlow({ kind: 'preview', file, preview })
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(mapOfferingMutationError(cause).message)
        setFlow({ kind: 'select', file })
      }
    } finally {
      pending.current = false
      onBusy(false)
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
    onBusy(true)
    const { file, preview } = flow
    const request = new AbortController()
    controller.current = request
    setFlow({ kind: 'confirming', file, preview })
    setError(null)
    try {
      const result = await confirmOfferingImport(
        file,
        termId,
        preview.preview_id,
        request.signal,
      )
      if (!request.signal.aborted) {
        setFlow({ kind: 'success', file, result })
        onSaved()
      }
    } catch (cause) {
      if (request.signal.aborted) return
      const failure = mapOfferingMutationError(cause)
      setError([failure.message, ...Object.values(failure.fields)].join(' '))
      setFlow(
        failure.status === 409 ||
          failure.status === 410 ||
          failure.status === 422
          ? { kind: 'select', file }
          : { kind: 'preview', file, preview },
      )
    } finally {
      pending.current = false
      onBusy(false)
    }
  }
  return {
    flow,
    error,
    reset,
    select,
    validate,
    confirm,
    reportError: setError,
    processing: flow.kind === 'validating' || flow.kind === 'confirming',
  }
}
