export interface StudentExam {
  exam_id: number
  subject: string
  exam_title: string
  scheduled_at: string
  is_qr_available: boolean
  qr_code_base64: string | null
  token: string | null
}

export interface StudentExamsResponse {
  message: string
  data: StudentExam[]
}

export interface StudentExamQr {
  exam_id: number
  subject: string
  exam_title: string
  scheduled_at: string
  qr_code_base64: string
  token: string
}

export interface StudentExamQrResponse {
  message: string
  data: StudentExamQr
}

export interface ApiErrorResponse {
  message: string
}

export interface StudentQrError {
  message: string
  status?: number
}
