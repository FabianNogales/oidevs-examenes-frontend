export interface SubjectCsvData {
  codigo_materia: string
  nombre_materia: string
  codigo_carrera: string
}
export interface SubjectImportRow {
  row_number: number
  data: SubjectCsvData
  status: 'VALID' | 'ERROR' | 'OMITTED' | 'IMPORTED'
  errors: string[]
  subject_id?: number
}
export interface SubjectImportPreview {
  preview_id: string
  expires_at: string
  summary: { total: number; valid: number; invalid: number; omitted: number }
  rows: SubjectImportRow[]
}
export interface SubjectImportConfirmation {
  preview_id: string
  summary: { total: number; imported: number; failed: number; omitted: number }
  rows: SubjectImportRow[]
}
