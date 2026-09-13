export interface Subject {
  id: string | number
  code: string
  name: string
  academicManagement: string
}

export interface SubjectDto {
  id: string | number
  code: string
  name: string
  academic_management: string
}

export interface SubjectsResponseDto {
  data: SubjectDto[]
}

export function mapSubject(dto: SubjectDto): Subject {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    academicManagement: dto.academic_management,
  }
}