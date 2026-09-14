import { NavLink } from 'react-router'

import umssLogo from '@/assets/images/umss-logo.svg'

import styles from './Header.module.css'

interface HeaderLogoProps {
  onNavigate?: () => void
}

export function HeaderLogo({
  onNavigate,
}: HeaderLogoProps) {
  return (
    <NavLink
      to="/"
      className={styles.logoLink}
      aria-label="Ir al inicio"
      onClick={onNavigate}
    >
      <img
        src={umssLogo}
        alt=""
        width={864}
        height={1328}
        className={styles.logo}
      />

      <span className={styles.institutionName}>
        <span>Universidad Mayor</span>
        <span>de San Simón</span>
      </span>
    </NavLink>
  )
}