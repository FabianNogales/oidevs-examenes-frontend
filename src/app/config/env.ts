const backendUrl = import.meta.env.VITE_BACKEND_URL
const apiUrl = import.meta.env.VITE_API_URL

if (!backendUrl) {
  throw new Error('VITE_BACKEND_URL is required')
}

if (!apiUrl) {
  throw new Error('VITE_API_URL is required')
}

export const env = Object.freeze({
  backendUrl,
  apiUrl,
})
