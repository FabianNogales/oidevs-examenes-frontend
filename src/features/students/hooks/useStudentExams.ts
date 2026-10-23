import { useEffect, useState } from 'react'
import { getStudentExams } from '@/features/students/api/studentQrApi'
import { getStudentQrError } from '@/features/students/api/studentQrError'
import { EXAMS_REFRESH_MS, nextExamsRefresh } from '@/features/students/utils/studentQrFreshness'
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
    let controller: AbortController | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    let pending = false
    let lastRequest = -Infinity
    const isVisible = () => document.visibilityState !== 'hidden'

    async function refresh() {
      if (disposed || pending || !isVisible()) return
      clearTimeout(timer)
      controller = new AbortController()
      const current = controller
      pending = true
      lastRequest = Date.now()
      let nextDelay = EXAMS_REFRESH_MS
      try {
        const response = await getStudentExams(current.signal)
        if (!disposed && !current.signal.aborted) {
          setData(response.data)
          setError(null)
          nextDelay = nextExamsRefresh(response.data, Date.now())
        }
      } catch (cause: unknown) {
        if (!disposed && !current.signal.aborted) {
          // Do not keep a previously displayed QR after a failed revalidation.
          setData([])
          setError(getStudentQrError(cause, 'exams'))
        }
      } finally {
        pending = false
        if (!disposed && !current.signal.aborted) {
          setLoading(false)
          if (isVisible()) timer = setTimeout(() => void refresh(), nextDelay)
        }
      }
    }

    function resume() {
      if (!isVisible()) {
        clearTimeout(timer)
      } else if (!pending) {
        // Focus and visibility events often arrive together. Coalesce them.
        clearTimeout(timer)
        const delay = Math.max(0, 5_000 - (Date.now() - lastRequest))
        if (delay === 0) void refresh()
        else timer = setTimeout(() => void refresh(), delay)
      }
    }

    void refresh()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', resume)
    return () => {
      disposed = true
      controller?.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('focus', resume)
    }
  }, [request])

  function retry() {
    setData([])
    setError(null)
    setLoading(true)
    setRequest((value) => value + 1)
  }

  return { data, loading, error, retry }
}
