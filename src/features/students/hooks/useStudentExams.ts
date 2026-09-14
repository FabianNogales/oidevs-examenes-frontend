import { useEffect, useState } from 'react'
import { getStudentExams } from '@/features/students/api/studentQrApi'
import { getStudentQrError } from '@/features/students/api/studentQrError'
import type {
  StudentExam,
  StudentQrError,
} from '@/features/students/types/studentQr'

export function useStudentExams() {
  const [data, setData] = useState<StudentExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<StudentQrError | null>(null)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getStudentExams(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(getStudentQrError(cause, 'exams'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [request])

  function retry() {
    setData([])
    setError(null)
    setLoading(true)
    setRequest((value) => value + 1)
  }

  return { data, loading, error, retry }
}
