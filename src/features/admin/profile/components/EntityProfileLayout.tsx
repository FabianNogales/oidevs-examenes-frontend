import type { ReactNode } from 'react'
import type {
  EntityInfoCard,
  EntityRole,
  ProfileIconName,
} from '../types/entityProfile.types'
import styles from './EntityProfileLayout.module.css'

export interface EntitySidebarOption {
  id: string
  label: string
  icon: ProfileIconName
}

interface EntityProfileLayoutProps {
  initials: string
  fullName: string
  role: EntityRole
  isActive: boolean
  options: readonly EntitySidebarOption[]
  activeOptionId: string
  onOptionChange: (optionId: string) => void
  onBack: () => void
  children: ReactNode
}

const ROLE_DISPLAY_CONFIG: Record<
  EntityRole,
  { label: string; avatarClass: string; badgeClass: string }
> = {
  STUDENT: {
    label: 'Estudiante',
    avatarClass: styles.avatarStudent,
    badgeClass: styles.roleBadgeStudent,
  },
  TEACHER: {
    label: 'Docente',
    avatarClass: styles.avatarCrimson,
    badgeClass: styles.roleBadgeCrimson,
  },
  ADMIN: {
    label: 'Admin',
    avatarClass: styles.avatarCrimson,
    badgeClass: styles.roleBadgeCrimson,
  },
}

export function ProfileIcon({ name }: { name: ProfileIconName }) {
  switch (name) {
    case 'user':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7" />
        </svg>
      )
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'history':
    case 'exam-history':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l4 2" />
        </svg>
      )
    case 'collaborator':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="19" cy="19" r="2" />
          <path d="m14.2 9.8 3.3-3.3M9.8 9.8 6.5 6.5m7.7 7.7 3.3 3.3" />
        </svg>
      )
    case 'role-history':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
          <circle cx="17" cy="17" r="4" />
          <path d="M17 15v2l1.5 1.5" />
        </svg>
      )
    case 'exam':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 6h8M8 10h8M8 14h5" />
        </svg>
      )
    case 'institution':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 9 9-6 9 6-9 6-9-6Z" />
          <path d="M5 11v7M9 13v5M15 13v5M19 11v7M3 20h18" />
        </svg>
      )
    case 'career':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )
    case 'info':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      )
    case 'id-card':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <circle cx="8" cy="12" r="2" />
          <path d="M14 10h4M14 14h4" />
        </svg>
      )
  }
}

export function EntityInfoGrid({ cards }: { cards: readonly EntityInfoCard[] }) {
  return (
    <div className={styles.infoGrid}>
      {cards.map((card) => (
        <article key={card.id} className={styles.infoCard}>
          <div className={styles.infoCardIcon}>
            <ProfileIcon name={card.icon} />
          </div>
          <div className={styles.infoCardBody}>
            <span className={styles.infoCardLabel}>{card.label}</span>
            <div className={styles.infoCardValue}>{card.value}</div>
          </div>
        </article>
      ))}
    </div>
  )
}

export function EntityProfileLayout({
  initials,
  fullName,
  role,
  isActive,
  options,
  activeOptionId,
  onOptionChange,
  onBack,
  children,
}: EntityProfileLayoutProps) {
  const roleTheme = ROLE_DISPLAY_CONFIG[role]

  return (
    <div className={styles.layoutWrapper}>
      {/* SIDEBAR DE OPCIONES */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <h2 className={styles.sidebarTitle}>Opciones</h2>
          <nav aria-label="Opciones del perfil" className={styles.optionsNav}>
            {options.map((option) => {
              const isSelected = option.id === activeOptionId
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onOptionChange(option.id)}
                  className={`${styles.optionBtn} ${
                    isSelected ? styles.optionBtnActive : ''
                  }`}
                >
                  <span className={styles.optionIcon}>
                    <ProfileIcon name={option.icon} />
                  </span>
                  <span>{option.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <button type="button" className={styles.backBtn} onClick={onBack}>
          <span aria-hidden="true">‹</span> Regresar
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className={styles.mainArea}>
        {/* BANNER SUPERIOR CON COLOR DE ROL DINÁMICO */}
        <header
          className={`${styles.banner} ${
            isActive ? styles.bannerActive : styles.bannerInactive
          }`}
        >
          <div className={`${styles.avatarCircle} ${roleTheme.avatarClass}`}>
            {initials}
          </div>

          <div className={styles.bannerIdentity}>
            <h1 className={styles.entityName}>{fullName}</h1>
            <div className={styles.bannerBadges}>
              <span className={`${styles.roleBadge} ${roleTheme.badgeClass}`}>
                {roleTheme.label}
              </span>
              <span
                className={`${styles.statusBannerBadge} ${
                  isActive
                    ? styles.statusBannerActive
                    : styles.statusBannerInactive
                }`}
              >
                <span className={styles.statusCheckIcon} aria-hidden="true">
                  {isActive ? '✓' : '✕'}
                </span>
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </header>

        {/* CONTENIDO DE LA SUBPÁGINA ACTIVA */}
        <div>{children}</div>
      </main>
    </div>
  )
}