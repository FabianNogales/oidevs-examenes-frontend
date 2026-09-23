const backendUrl = import.meta.env.VITE_BACKEND_URL
const apiUrl = import.meta.env.VITE_API_URL
const useStudentsMock =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_STUDENTS_MOCK === 'true'
const useAuthMock =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_AUTH_MOCK === 'true'
const defaultInstitutionalEmailDomains = 'umss.edu.bo'
const institutionalEmailDomains: string =
  import.meta.env.VITE_EIDA_INSTITUTIONAL_EMAIL_DOMAINS ??
  defaultInstitutionalEmailDomains

if (!backendUrl) {
  throw new Error('VITE_BACKEND_URL is required')
}

if (!apiUrl) {
  throw new Error('VITE_API_URL is required')
}

export const env = Object.freeze({
  backendUrl,
  apiUrl,
  useStudentsMock,
  useAuthMock,
  institutionalEmailDomains:
    normalizeInstitutionalEmailDomains(institutionalEmailDomains),
})

function normalizeInstitutionalEmailDomains(domains: string): string[] {
  const normalizedDomains = domains
    .split(',')
    .map((domain) =>
      domain
        .trim()
        .toLowerCase()
        .replace(/^@+/, '')
        .replace(/^['"]|['"]$/g, ''),
    )
    .filter(Boolean)

  return normalizedDomains.length > 0
    ? normalizedDomains
    : [defaultInstitutionalEmailDomains]
}
