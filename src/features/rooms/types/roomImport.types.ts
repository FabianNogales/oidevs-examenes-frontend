import type { RoomFormValues } from './room.types'

export type RoomCsvData = Omit<RoomFormValues, 'location'>
export interface RoomImportRow {
  row: number
  data: RoomCsvData
  valid: boolean
  errors: string[]
}
export interface RoomImportReport {
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: string[]
  rows: RoomImportRow[]
}
export interface RoomImportPreview extends RoomImportReport {
  preview_id: string
  expires_at: string
}
export interface RoomImportConfirmation extends RoomImportReport {
  imported_rows: number
  failed_rows: number
}
