import { Outlet } from 'react-router'
import { Header } from '@/shared/components/Header/Header'
import { navigationByRole } from '@/shared/components/Header/headerNavigation'
import type { HeaderUser } from '@/shared/components/Header/header.types'
import styles from './StudentLayout.module.css'

// Temporary display data until the existing auth feature supplies the session.
// This placeholder does not authenticate or authorize the user.
const temporaryStudentUser: HeaderUser = {
  name: 'Cuenta de estudiante',
  roleLabel: 'Estudiante',
}

export function StudentLayout() {
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#student-content">
        Saltar al contenido
      </a>
      <Header
        navigation={navigationByRole.student}
        user={temporaryStudentUser}
      />
      <main id="student-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
