import type { EntryQrResponse } from '../types/entryQr.types'
import { EntryResultPanel } from './EntryResultPanel'

export function EntryQrResultPanel({
  response,
  processing,
}: {
  response: EntryQrResponse | null
  processing: boolean
}) {
  return (
    <EntryResultPanel response={response} processing={processing} method="QR" />
  )
}
