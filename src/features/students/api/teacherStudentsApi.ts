import { env } from '@/app/config/env'
import { getTeacherSubjects } from '@/features/subjects/api/teacherSubjectsApi'
import {
  getMockStudentBySis,
  getMockSubjectStudents,
  mockStudentsBySubject,
} from '@/features/students/mocks/teacherStudents.mock'
import type {
  CsvImportSummary,
  StudentEnrollment,
} from '@/features/students/types/student.types'

const MOCK_DISABLED_MESSAGE =
  'No existe endpoint real para HU07 en el backend. Activa VITE_USE_STUDENTS_MOCK=true para revisar la experiencia de desarrollo.'

export { getTeacherSubjects }

export async function getSubjectStudents(subjectId: string): Promise<StudentEnrollment[]> {
  if (!env.useStudentsMock) {
    throw new Error(MOCK_DISABLED_MESSAGE)
  }

  return getMockSubjectStudents(subjectId)
}

export async function addStudentToSubject(
  subjectId: string,
  sis: string,
): Promise<StudentEnrollment> {
  if (!env.useStudentsMock) {
    throw new Error(MOCK_DISABLED_MESSAGE)
  }

  const normalizedSis = sis.trim()
  const subjectStudents = mockStudentsBySubject[subjectId] ?? []
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

  mockStudentsBySubject[subjectId] = [...subjectStudents, student]

  return student
}

export async function importStudentsCsv(
  subjectId: string,
  rows: string[],
): Promise<CsvImportSummary> {
  if (!env.useStudentsMock) {
    throw new Error(MOCK_DISABLED_MESSAGE)
  }

  const summary: CsvImportSummary = {
    validCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    importedStudents: [],
    issues: [],
  }

  const subjectStudents = mockStudentsBySubject[subjectId] ?? []

  for (const [index, rawRow] of rows.entries()) {
    const normalizedRow = rawRow.trim()

    if (!normalizedRow) {
      summary.errorCount += 1
      summary.issues.push({
        row: index + 1,
        sis: '',
        reason: 'Fila vacía.',
      })
      continue
    }

    const candidateSis = normalizedRow.replace(/^['"]|['"]$/g, '').trim()
    if (!/^\d{9,}$/.test(candidateSis)) {
      summary.errorCount += 1
      summary.issues.push({
        row: index + 1,
        sis: candidateSis,
        reason: 'SIS inválido.',
      })
      continue
    }

    const existing = subjectStudents.some((student) => student.sis === candidateSis)
    if (existing) {
      summary.duplicateCount += 1
      summary.issues.push({
        row: index + 1,
        sis: candidateSis,
        reason: 'Duplicado en la materia.',
      })
      continue
    }

    const found = getMockStudentBySis(candidateSis)
    if (!found) {
      summary.errorCount += 1
      summary.issues.push({
        row: index + 1,
        sis: candidateSis,
        reason: 'SIS inexistente.',
      })
      continue
    }

    const student: StudentEnrollment = {
      id: `student-${candidateSis}`,
      sis: candidateSis,
      fullName: found.fullName,
      status: 'Inscrito',
    }

    subjectStudents.push(student)
    summary.importedStudents.push(student)
    summary.validCount += 1
  }

  mockStudentsBySubject[subjectId] = subjectStudents
  summary.issues = summary.issues.slice(0, 25)

  return summary
}
