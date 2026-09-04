import axios from 'axios'
import { env } from '@/app/config/env'

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
  },
})
