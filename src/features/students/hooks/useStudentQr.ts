import { useEffect, useRef, useState } from 'react'
import { getStudentExamQr } from '@/features/students/api/studentQrApi'
import { getStudentQrError } from '@/features/students/api/studentQrError'
import { qrExpiresAt } from '@/features/students/utils/studentQrFreshness'
import type {
  StudentExam,
  StudentExamQr,
  StudentQrError,
} from '@/features/students/types/studentQr'

interface QrState {
  examId: number | null
  data: StudentExamQr | null
  loading: boolean
  error: StudentQrError | null
}

const emptyState: QrState = {
  examId: null,
  data: null,
  loading: false,
  error: null,
}

export function useStudentQr(exams: readonly StudentExam[]) {
  const [state, setState] = useState<QrState>(emptyState)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => () => activeRequest.current?.abort(), [])

  useEffect(() => {
    if (!state.data) return
    const displayedQr = state.data
    const expiresAt = qrExpiresAt(displayedQr.token)
    let timer: ReturnType<typeof setTimeout> | undefined
    function checkExpiry() {
      clearTimeout(timer)
      const remaining = expiresAt === null ? 0 : expiresAt - Date.now()
      if (remaining <= 0) {
        setState((current) => current.data !== displayedQr ? current : ({ ...current, data: null, loading: false,
          error: { message: 'La información del QR ha caducado. Actualiza los exámenes.', status: 404 } }))
      } else {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647))
      }
    }
    checkExpiry()
    document.addEventListener('visibilitychange', checkExpiry)
    window.addEventListener('focus', checkExpiry)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', checkExpiry)
      window.removeEventListener('focus', checkExpiry)
    }
  }, [state.data])

  async function load(examId: number) {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setState({ examId, data: null, loading: true, error: null })

    try {
      const response = await getStudentExamQr(examId, controller.signal)
      // Never display a response belonging to another exam, even if the API errs.
      if (response.data.exam_id !== examId) throw new Error('Unexpected exam')
      const expiresAt = qrExpiresAt(response.data.token)
      if (expiresAt === null || expiresAt <= Date.now()) throw new Error('Expired QR')
      if (!controller.signal.aborted) {
        setState({ examId, data: response.data, loading: false, error: null })
      }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setState({
          examId,
          data: null,
          loading: false,
          error: getStudentQrError(cause, 'qr'),
        })
      }
    }
  }

  function clear() {
    activeRequest.current?.abort()
    activeRequest.current = null
    setState(emptyState)
  }

  function select(exam: StudentExam) {
    clear()

    if (exam.qr_status !== 'AVAILABLE') return

    // Opening a QR always revalidates availability and eligibility on the backend.
    void load(exam.exam_id)
  }

  function retry() {
    if (state.examId !== null) void load(state.examId)
  }

  const currentExam = exams.find((exam) => exam.exam_id === state.examId)
  const invalidated = state.examId !== null && (currentExam?.qr_status !== 'AVAILABLE' ||
    (state.data !== null && currentExam.token !== state.data.token))
  return { ...(invalidated ? emptyState : state), select, load, clear, retry }
}
