export interface OfferingCsvData {
  correo_docente: string
  codigo_materia: string
}
export interface OfferingImportRow {
  row_number: number
  data: OfferingCsvData
  status: 'VALID' | 'ERROR' | 'OMITTED' | 'IMPORTED'
  errors: string[]
  course_offering_id?: number
}
export interface OfferingImportPreview {
  preview_id: string
  academic_term_id: number
  expires_at: string
  summary: { total: number; valid: number; invalid: number; omitted: number }
  rows: OfferingImportRow[]
}
export interface OfferingImportConfirmation {
  preview_id: string
  academic_term_id: number
  summary: { total: number; imported: number; failed: number; omitted: number }
  rows: OfferingImportRow[]
}
