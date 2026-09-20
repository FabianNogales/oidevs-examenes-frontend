import { STUDENT_IMPORT_COLUMNS } from '@/features/students/utils/studentImportColumns'

const STUDENT_TEMPLATE_FILENAME = 'plantilla_estudiantes.csv'

export function downloadStudentCsvTemplate(): void {
  const csvContent = `${STUDENT_IMPORT_COLUMNS.join(',')}\r\n`
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = STUDENT_TEMPLATE_FILENAME
  link.click()

  URL.revokeObjectURL(objectUrl)
}
