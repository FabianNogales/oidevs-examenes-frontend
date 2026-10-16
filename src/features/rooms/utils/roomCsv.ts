import type { RoomCsvData } from '../types/roomImport.types'

export const ROOM_CSV_COLUMNS: {
  header: string
  key: keyof RoomCsvData
  label: string
}[] = [
  { header: 'codigo', key: 'code', label: 'Código' },
  { header: 'nombre', key: 'name', label: 'Nombre' },
  { header: 'descripcion', key: 'description', label: 'Descripción' },
  { header: 'capacidad', key: 'capacity', label: 'Capacidad' },
  { header: 'piso', key: 'floor', label: 'Piso' },
]
const CSV_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
])

export function getRoomFileError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv'))
    return 'Selecciona un archivo con extensión .csv.'
  if (file.type && !CSV_TYPES.has(file.type))
    return 'El archivo seleccionado no parece ser un CSV válido.'
  if (!file.size) return 'El archivo CSV está vacío.'
  if (file.size > 10 * 1024 * 1024)
    return 'El archivo supera el tamaño máximo permitido de 10 MB.'
  return null
}

export async function validateRoomCsv(file: File): Promise<string | null> {
  const fileError = getRoomFileError(file)
  if (fileError) return fileError
  const content = (await file.text()).replace(/^\uFEFF/u, '').trim()
  if (!content) return 'El archivo CSV está vacío.'
  if (content.includes('\uFFFD'))
    return 'Guarda el archivo CSV con codificación UTF-8 e inténtalo nuevamente.'
  const [header, ...lines] = content.split(/\r?\n/u)
  const headers = header.split(',').map((value) =>
    value
      .trim()
      .replace(/^"(.*)"$/u, '$1')
      .trim()
      .toLowerCase(),
  )
  if (
    headers.length !== ROOM_CSV_COLUMNS.length ||
    ROOM_CSV_COLUMNS.some((column, index) => headers[index] !== column.header)
  ) {
    return `Los encabezados deben ser: ${ROOM_CSV_COLUMNS.map((column) => column.header).join(',')}. Usa la plantilla CSV.`
  }
  if (!lines.some((line) => line.trim()))
    return 'El archivo debe contener al menos una fila de aulas además de los encabezados.'
  return null
}

export function downloadRoomCsvTemplate() {
  const blob = new Blob(
    [
      '\uFEFF' +
        ROOM_CSV_COLUMNS.map((column) => column.header).join(',') +
        '\r\n',
    ],
    { type: 'text/csv;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla_aulas.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatRoomFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
