import { useEffect, useState } from 'react'
import { getRooms } from '../api/teacherExamsApi'
import type { Room } from '../types/exam.types'

type Result = {
  key: string
  rooms: Room[]
  error: string | null
  signal: AbortSignal
}

export function useAvailableRooms(
  isOpen: boolean,
  date: string,
  time: string,
  duration: string,
  excludeExamId?: number,
) {
  const [attempt, setAttempt] = useState(0)
  const minutes = Number(duration)
  const hasSchedule =
    /^\d{4}-\d{2}-\d{2}$/u.test(date) &&
    /^\d{2}:\d{2}$/u.test(time) &&
    Number.isSafeInteger(minutes) &&
    minutes > 0 &&
    minutes <= 2147483647
  const key =
    isOpen && hasSchedule
      ? `${date}|${time}|${minutes}|${excludeExamId ?? ''}|${attempt}`
      : ''
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    // Wait briefly while the user edits the schedule; stale requests are aborted.
    const timer = setTimeout(() => {
      void getRooms(
        {
          exam_date: date,
          start_time: time,
          duration_minutes: minutes,
          ...(excludeExamId !== undefined
            ? { exclude_exam_id: excludeExamId }
            : {}),
        },
        controller.signal,
      )
        .then((rooms) => {
          if (!controller.signal.aborted)
            setResult({ key, rooms, error: null, signal: controller.signal })
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({
              key,
              rooms: [],
              signal: controller.signal,
              error:
                'No se pudieron cargar los ambientes para este horario. Vuelve a consultar o cambia el horario.',
            })
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, date, time, minutes, excludeExamId])

  const current =
    key && result?.key === key && !result.signal.aborted ? result : null
  return {
    rooms: current?.rooms ?? [],
    roomError: current?.error ?? null,
    isLoadingRooms: Boolean(key && !current),
    hasSchedule,
    isReady: Boolean(current && !current.error),
    reload: () => setAttempt((value) => value + 1),
  }
}
