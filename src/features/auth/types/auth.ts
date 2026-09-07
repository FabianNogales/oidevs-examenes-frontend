export type LoginCredentials = {
  email: string
  password: string
}

export type AuthenticatedUser = {
  id: number
  email: string
  status: string
}

export type CurrentUserResponse = {
  success: true
  data: AuthenticatedUser
}
