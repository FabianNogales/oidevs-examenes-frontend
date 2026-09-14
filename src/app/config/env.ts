const apiUrl = import.meta.env.VITE_API_URL
const useStudentsMock =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_STUDENTS_MOCK === 'true'
const useAuthMock =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_AUTH_MOCK === 'true'

if (!apiUrl) {
  throw new Error('VITE_API_URL is required')
}

export const env = Object.freeze({
  apiUrl,
  useStudentsMock,
  useAuthMock,
})
