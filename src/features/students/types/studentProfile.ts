export interface StudentPersonalData {
  first_names: string
  last_names: string
  identity_number: string
}

export interface StudentAcademicData {
  sis_code: string
  email: string
  career_code: string | null
  career_name: string | null
}

export interface StudentProfile {
  profile_photo_url: string | null
  personal_data: StudentPersonalData
  academic_data: StudentAcademicData
}

export interface StudentProfileResponse {
  message: string
  data: StudentProfile
}

export interface StudentProfileError {
  message: string
  status?: number
}
