export type AuthRole =
  | 'student'
  | 'teacher'
  | 'admin'

export interface CurrentUserDto {
  id: number
  display_name: string
  email: string
  status: string
  must_change_password: boolean
  roles: string[]
}

export interface CurrentUserResponse {
  success: boolean
  data: CurrentUserDto
}

export interface AuthUser {
  id: number
  email: string
  name: string
  role: AuthRole
  mustChangePassword: boolean
}