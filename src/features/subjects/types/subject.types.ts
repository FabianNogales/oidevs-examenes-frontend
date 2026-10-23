export interface Subject {
  courseOfferingId: string | number
  code: string | null
  name: string
  academicManagement: string
  offeringStatus?: 'ACTIVE' | 'INACTIVE'
  canManage?: boolean
}

export interface LegacySubjectDto {
  id: string | number
  code: string
  name: string
  academic_management: string
}

export interface TeacherDashboardSubjectDto {
  course_offering_id: string | number
  status?: 'ACTIVE' | 'INACTIVE'
  can_manage?: boolean
  subject: {
    code: string
    name: string
    status?: 'ACTIVE' | 'INACTIVE'
  }
  academic_term: {
    name: string
    status?: 'ACTIVE' | 'INACTIVE'
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
    offeringStatus: dto.status,
    canManage:
      dto.status === 'INACTIVE' ||
      dto.subject.status === 'INACTIVE' ||
      dto.academic_term.status === 'INACTIVE'
        ? false
        : dto.can_manage,
  }
}
