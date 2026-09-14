import axios from 'axios'

import { env } from '@/app/config/env'
import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import { httpClient } from '@/shared/api/httpClient'
import {
  getMockStudentBySis,
  getMockSubjectStudents,
  mockStudentsBySubject,
} from '@/features/students/mocks/teacherStudents.mock'
import type {
  CsvImportSummary,
  ManualEnrollmentDto,
  StudentEnrollmentDto,
  StudentEnrollment,
} from '@/features/students/types/student.types'

interface BulkEnrollmentResponse {
  data: {
    totalProcessed: number
    successfulRecords: number
    duplicateRecords: number
    failedCount: number
    failedRecords: Array<{
      row: number
      sisCode: string | null
      status: string
      reason: string
    }>
  }
}

interface StudentEnrollmentsResponse {
  data: StudentEnrollmentDto[]
}

interface ManualEnrollmentResponse {
  message: string
  data: ManualEnrollmentDto
}

function mapStudentEnrollment(
  student: StudentEnrollmentDto | ManualEnrollmentDto,
): StudentEnrollment {
  if ('sis_code' in student) {
    return {
      id: student.id,
      sis: student.sis_code,
      fullName: `${student.first_names} ${student.last_names}`.trim(),
      status: 'Inscrito',
    }
  }

  return {
    id: student.id,
    sis: student.sisCode,
    fullName: `${student.firstNames} ${student.lastNames}`.trim(),
    status: 'Inscrito',
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') {
      return message
    }

    if (error.response?.status === 401) {
      return 'Tu sesión no está autorizada para esta operación.'
    }

    if (error.response?.status === 403) {
      return 'No tienes autorización para operar sobre esta materia.'
    }

    if (error.response?.status === 422) {
      return 'Los datos enviados no son válidos.'
    }
  }

  return fallback
}

export { getTeacherSubjects }

export async function getSubjectStudents(
  courseOfferingId: string,
): Promise<StudentEnrollment[]> {
  if (env.useStudentsMock) {
    return getMockSubjectStudents(courseOfferingId)
  }

  try {
    const response = await httpClient.get<StudentEnrollmentsResponse>(
      `/course-offerings/${courseOfferingId}/enrollments`,
    )

    return response.data.data.map(mapStudentEnrollment)
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'No se pudieron cargar los estudiantes.'),
      { cause: error },
    )
  }
}

export async function addStudentToSubject(
  courseOfferingId: string,
  sis: string,
): Promise<StudentEnrollment | null> {
  if (env.useStudentsMock) {
    const normalizedSis = sis.trim()
    const subjectStudents = mockStudentsBySubject[courseOfferingId] ?? []
    const duplicate = subjectStudents.some((student) => student.sis === normalizedSis)

    if (duplicate) {
      throw new Error('El estudiante ya está inscrito en esta materia.')
    }

    const candidate = getMockStudentBySis(normalizedSis)
    if (!candidate) {
      throw new Error('El SIS ingresado no existe en el sistema.')
    }

    const student: StudentEnrollment = {
      id: `student-${normalizedSis}`,
      sis: candidate.sis,
      fullName: candidate.fullName,
      status: 'Inscrito',
    }

    mockStudentsBySubject[courseOfferingId] = [...subjectStudents, student]

    return student
  }

  try {
    const response = await httpClient.post<ManualEnrollmentResponse>(
      `/course-offerings/${courseOfferingId}/enrollments/manual`,
      { sisCode: sis },
    )
    return mapStudentEnrollment(response.data.data)
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'No se pudo inscribir al estudiante.'),
      { cause: error },
    )
  }
}

export async function importStudentsCsv(
  courseOfferingId: string,
  file: File,
): Promise<CsvImportSummary> {
  if (env.useStudentsMock) {
    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0)

    if (rows.length === 0) {
      throw new Error('El archivo CSV está vacío.')
    }

    const subjectStudents = mockStudentsBySubject[courseOfferingId] ?? []
    const summary: CsvImportSummary = {
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      importedStudents: [],
      issues: [],
    }

    for (const [index, rawRow] of rows.entries()) {
      const candidateSis = rawRow.replace(/^['"]|['"]$/g, '').trim()

      if (index === 0 && candidateSis.toLowerCase() === 'siscode') {
        continue
      }

      if (!candidateSis) {
        summary.errorCount += 1
        summary.issues.push({ row: index + 1, sis: '', reason: 'Fila vacía.' })
        continue
      }

      if (subjectStudents.some((student) => student.sis === candidateSis)) {
        summary.duplicateCount = (summary.duplicateCount ?? 0) + 1
        summary.issues.push({ row: index + 1, sis: candidateSis, reason: 'Duplicado en la materia.' })
        continue
      }

      const candidate = getMockStudentBySis(candidateSis)
      if (!candidate) {
        summary.errorCount += 1
        summary.issues.push({ row: index + 1, sis: candidateSis, reason: 'SIS inexistente.' })
        continue
      }

      const student: StudentEnrollment = {
        id: `student-${candidateSis}`,
        sis: candidate.sis,
        fullName: candidate.fullName,
        status: 'Inscrito',
      }
      subjectStudents.push(student)
      summary.importedStudents.push(student)
      summary.validCount += 1
    }

    mockStudentsBySubject[courseOfferingId] = subjectStudents
    summary.issues = summary.issues.slice(0, 25)
    return summary
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await httpClient.post<BulkEnrollmentResponse>(
      `/course-offerings/${courseOfferingId}/enrollments/bulk`,
      formData,
    )

    const {
      successfulRecords,
      duplicateRecords,
      failedCount,
      failedRecords,
    } = response.data.data
    return {
      validCount: successfulRecords,
      duplicateCount: duplicateRecords,
      errorCount: failedCount,
      importedStudents: [],
      issues: failedRecords.map((record) => ({
        row: record.row,
        sis: record.sisCode ?? '',
        status: record.status,
        reason: record.reason,
      })),
    }
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'No se pudo importar el archivo CSV.'),
      { cause: error },
    )
  }
}
