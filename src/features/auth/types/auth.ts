export type LoginCredentials = {
  identifier: string
  password: string
}

export type AuthRole = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE'

export type AuthenticatedUser = {
  id: number
  display_name: string
  email: string
  roles: AuthRole[]
  status: string
  must_change_password: boolean
}

export type CurrentUserResponse = {
  success: true
  data: AuthenticatedUser
}

export type ChangePasswordPayload = {
  current_password: string
  password: string
  password_confirmation: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export type AuthNoticeType = 'success' | 'error' | 'info'

export type AuthNotice = {
  id: number
  type: AuthNoticeType
  message: string
}
