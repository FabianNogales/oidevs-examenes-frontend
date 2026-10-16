import type { EntryControlStudent } from '../types/entryControl.types'

export function canRegisterEntryManually(
  student: EntryControlStudent,
  roomId: number | undefined,
): boolean {
  return (
    roomId !== undefined &&
    Number.isSafeInteger(roomId) &&
    roomId > 0 &&
    student.controlled_room_id === roomId &&
    student.student_status.toUpperCase() === 'ACTIVE' &&
    student.enrollment_status === 'ACTIVE' &&
    student.eligibility_status === 'ELIGIBLE' &&
    student.room_status === 'MATCH' &&
    student.entry_status === 'PENDING' &&
    student.meets_entry_conditions === true &&
    student.blockers.length === 0
  )
}
