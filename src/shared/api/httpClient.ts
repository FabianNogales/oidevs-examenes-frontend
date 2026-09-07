import axios from 'axios'
import { env } from '@/app/config/env'

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

export const backendHttpClient = axios.create({
  baseURL: env.backendUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})
