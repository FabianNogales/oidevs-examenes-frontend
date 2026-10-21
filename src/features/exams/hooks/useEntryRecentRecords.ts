import { useCallback, useRef, useState } from 'react'
import type {
  EntryMethod,
  EntryProcessingResponse,
  EntryStudentIdentity,
  RecentEntryRecord,
} from '../types/entryRegistration.types'

export function useEntryRecentRecords() {
  const [records, setRecords] = useState<RecentEntryRecord[]>([])
  const sequence = useRef(0)

  const addResult = useCallback(
    (
      response: EntryProcessingResponse,
      method: EntryMethod,
      fallbackStudent?: EntryStudentIdentity,
    ) => {
      const student = response.data?.student ?? fallbackStudent
      const recent: RecentEntryRecord = {
        id: ++sequence.current,
        student: student
          ? {
              student_id: student.student_id,
              first_names: student.first_names,
              last_names: student.last_names,
              sis_code: student.sis_code,
              identity_number: student.identity_number,
              profile_photo_url: student.profile_photo_url,
            }
          : null,
        result: response.result,
        message: response.message,
        processed_at: response.processed_at,
        // An existing entry keeps its original method, never the current action's.
        verification_method:
          response.data?.entry?.verification_method ??
          (response.result === 'ALREADY_REGISTERED' ? null : method),
      }
      setRecords((current) => {
        const studentId = recent.student?.student_id
        const remaining =
          studentId == null
            ? current
            : current.filter(
                (record) => record.student?.student_id !== studentId,
              )
        return [recent, ...remaining].slice(0, 20)
      })
    },
    [],
  )

  return { records, addResult }
}
