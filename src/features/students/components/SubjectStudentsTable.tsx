import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import type { StudentEnrollment } from '../types/student.types'
import styles from '../pages/TeacherSubjectStudentsPage.module.css'

type StudentRow = Omit<StudentEnrollment, 'status'> & {
  enrollmentStatus: StudentEnrollment['status']
}

const columns: TableColumnDef<StudentRow>[] = [
  { id: 'sis', header: 'SIS', accessorKey: 'sis', width: '25%' },
  { id: 'name', header: 'Nombre', accessorKey: 'fullName', width: '50%' },
  {
    id: 'enrollment',
    header: 'Estado',
    cell: (student) => (
      <span className={styles.status}>{student.enrollmentStatus}</span>
    ),
  },
]

export function SubjectStudentsTable({
  students,
}: {
  students: StudentEnrollment[]
}) {
  return (
    <DataTable
      columns={columns}
      data={students.map(({ status, ...student }) => ({
        ...student,
        enrollmentStatus: status,
      }))}
      loading={false}
      entityLabel="estudiantes"
    />
  )
}
