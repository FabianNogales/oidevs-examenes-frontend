import { NavLink } from 'react-router'
import { CalendarCheck } from 'lucide-react'
import styles from './HeaderAcademicTermsLink.module.css'

export function HeaderAcademicTermsLink({
  onNavigate,
}: {
  onNavigate: () => void
}) {
  return (
    <NavLink
      to="/admin/academic-terms"
      className={({ isActive }) =>
        `${styles.link} ${isActive ? styles.active : ''}`
      }
      onClick={onNavigate}
    >
      <CalendarCheck aria-hidden="true" />
      <span>Periodos académicos</span>
    </NavLink>
  )
}
