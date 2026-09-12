import { Outlet } from 'react-router'

import { Header } from '@/shared/components/Header/Header'
import type { HeaderUser } from '@/shared/components/Header/header.types'

const temporaryStudentUser: HeaderUser = {
  name: 'Cuenta de estudiante',
  role: 'student',
  roleLabel: 'Estudiante',
}

export function StudentLayout() {
  return (
    <>
      <Header user={temporaryStudentUser} />

      <Outlet />
    </>
  )
}
