import { NavLink } from 'react-router'
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 5 2 2 4-4" />
      </svg>
      <span>Periodos académicos</span>
    </NavLink>
  )
}
