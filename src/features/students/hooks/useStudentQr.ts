import { useEffect, useRef, useState } from 'react'
import { getStudentExamQr } from '@/features/students/api/studentQrApi'
import { getStudentQrError } from '@/features/students/api/studentQrError'
import type {
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

export function useStudentQr() {
  const [state, setState] = useState<QrState>(emptyState)
  const activeRequest = useRef<AbortController | null>(null)

  useEffect(() => () => activeRequest.current?.abort(), [])

  async function load(examId: number) {
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setState({ examId, data: null, loading: true, error: null })

    try {
      const response = await getStudentExamQr(examId, controller.signal)
      // Never display a response belonging to another exam, even if the API errs.
      if (response.data.exam_id !== examId) throw new Error('Unexpected exam')
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

  function retry() {
    if (state.examId !== null) void load(state.examId)
  }

  return { ...state, load, clear, retry }
}
