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
        alt="Universidad Mayor de San Simón"
        width={864}
        height={1328}
        className={styles.logo}
      />
    </NavLink>
  )
}