export interface Subject {
  courseOfferingId: string | number
  code: string | null
  name: string
  academicManagement: string
}

export interface LegacySubjectDto {
  id: string | number
  code: string
  name: string
  academic_management: string
}

export interface TeacherDashboardSubjectDto {
  course_offering_id: string | number
  subject: {
    code: string
    name: string
  }
  academic_term: {
    name: string
  }
}

export interface TeacherDashboardSubjectsResponse {
  data: TeacherDashboardSubjectDto[]
}

export function mapTeacherDashboardSubject(
  dto: TeacherDashboardSubjectDto,
): Subject {
  return {
    courseOfferingId: dto.course_offering_id,
    code: dto.subject.code,
    name: dto.subject.name,
    academicManagement: dto.academic_term.name,
  }
}