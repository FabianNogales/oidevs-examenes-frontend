import axios from 'axios'

import { httpClient } from '@/shared/api/httpClient'
import type {
  StudentImportConfirmation,
  StudentImportConfirmationResponse,
  StudentImportPreview,
  StudentImportPreviewResponse,
} from '@/features/students/types/studentImport'

const STUDENT_IMPORT_PREVIEW_ENDPOINT = '/admin/students/import/preview'
const STUDENT_IMPORT_CONFIRM_ENDPOINT = '/admin/students/import/confirm'
const STUDENT_IMPORT_FILE_FIELD = 'file'

function buildStudentImportFormData(file: File): FormData {
  const formData = new FormData()
  formData.append(STUDENT_IMPORT_FILE_FIELD, file)

  return formData
}

export async function previewStudentImport(file: File): Promise<StudentImportPreview> {
  const response = await httpClient.post<StudentImportPreviewResponse>(
    STUDENT_IMPORT_PREVIEW_ENDPOINT,
    buildStudentImportFormData(file),
  )

  return response.data.data
}

export async function confirmStudentImport(
  file: File,
): Promise<StudentImportConfirmation> {
  const response = await httpClient.post<StudentImportConfirmationResponse>(
    STUDENT_IMPORT_CONFIRM_ENDPOINT,
    buildStudentImportFormData(file),
  )

  return response.data.data
}

export function getStudentImportErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e intentalo nuevamente.'
  }

  switch (error.response?.status) {
    case 403:
      return 'No tienes autorizacion para importar estudiantes.'
    case 422:
      return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e intentalo nuevamente.'
    default:
      return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e intentalo nuevamente.'
  }
}
