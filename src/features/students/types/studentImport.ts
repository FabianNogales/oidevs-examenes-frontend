export type StudentImportColumn =
  | 'SIS'
  | 'CI'
  | 'Nombres'
  | 'Apellidos'
  | 'Correo'
  | 'Carrera'

export type CsvValidationResult = {
  isValid: boolean
  message?: string
}
