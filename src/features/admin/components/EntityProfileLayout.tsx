import { useState, type ReactNode } from 'react'
import styles from './EntityProfileLayout.module.css'

export type EntityOptionIcon =
  | 'user'
  | 'edit'
  | 'book'
  | 'history'
  | 'role'
  | 'role-history'

export type EntityCardIcon =
  | 'user'
  | 'institution'
  | 'career'
  | 'mail'
  | 'info'
  | 'id-card'

export interface EntitySidebarOption {
  id: string
  label: string
  icon: EntityOptionIcon
}

export interface EntityInfoCard {
  id: string
  label: string
  value: ReactNode
  icon: EntityCardIcon
}

interface EntityProfileLayoutProps {
  /** Iniciales para el avatar circular (ej. "RZ") */
  initials: string
  /** Nombre completo que se muestra fijo en el banner */
  fullName: string
  /** Etiqueta de rol en el banner (ej. "Estudiante", "Docente", "Usuario") */
  roleLabel: string
  /** Estado activo o inactivo para cambiar el gradiente (verde/rojo) */
  isActive: boolean
  /** Opciones dinámicas del menú lateral según el módulo */
  options: readonly EntitySidebarOption[]
  /** ID de la opción actualmente seleccionada */
  activeOptionId: string
  /** Callback al cambiar de opción en el menú lateral */
  onOptionChange: (optionId: string) => void
  /** Acción del botón "< Regresar" */
  onBack: () => void
  /** Contenido dinámico de la pestaña activa (el banner nunca se desmonta) */
  children: ReactNode
}

export function EntityProfileLayout({
  initials,
  fullName,
  roleLabel,
  isActive,
  options,
  activeOptionId,
  onOptionChange,
  onBack,
  children,
}: EntityProfileLayoutProps) {
  // En desktop el menú es fijo por CSS; este estado controla la compactación en móvil/tablet
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeOptionLabel =
    options.find((opt) => opt.id === activeOptionId)?.label ?? 'Opciones'

  const handleSelectOption = (id: string) => {
    onOptionChange(id)
    setMobileMenuOpen(false)
  }

  return (
    <div className={styles.layoutWrapper}>
      {/* PANEL LATERAL: Fijo en Desktop, Compactable en Responsive */}
      <aside className={styles.sidebar} aria-label="Menú de opciones del perfil">
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Opciones</h2>
          <button
            type="button"
            className={styles.mobileToggleBtn}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
          >
            <span>{activeOptionLabel}</span>
            <svg viewBox="0 0 24 24" className={mobileMenuOpen ? styles.chevronOpen : ''}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className={`${styles.sidebarContent} ${mobileMenuOpen ? styles.sidebarContentOpen : ''}`}>
          <nav className={styles.optionsNav}>
            {options.map((option) => {
              const isSelected = option.id === activeOptionId
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.optionBtn} ${isSelected ? styles.optionBtnActive : ''}`}
                  onClick={() => handleSelectOption(option.id)}
                >
                  <SidebarIcon name={option.icon} />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <button type="button" className={styles.backBtn} onClick={onBack}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Regresar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL: Banner Estático + Contenido Dinámico */}
      <main className={styles.mainArea}>
        <section
          className={`${styles.banner} ${isActive ? styles.bannerActive : styles.bannerInactive}`}
          aria-label="Información principal del usuario"
        >
          <div className={styles.avatarCircle} aria-hidden="true">
            {initials}
          </div>

          <div className={styles.bannerDetails}>
            <h1 className={styles.bannerName}>{fullName}</h1>
            <div className={styles.bannerBadges}>
              <span className={styles.roleBadge}>{roleLabel}</span>
              <span
                className={`${styles.statusBannerBadge} ${
                  isActive ? styles.statusBannerActive : styles.statusBannerInactive
                }`}
              >
                {isActive ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                    <path d="m8 12 3 3 5-6" stroke="#15803d" strokeWidth="2.4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                    <path d="M12 8v4m0 4h.01" stroke="#c62828" strokeWidth="2.4" />
                  </svg>
                )}
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </section>

        {/* Contenedor dinámico según la opción elegida */}
        <div className={styles.dynamicSection}>{children}</div>
      </main>
    </div>
  )
}

/** Subcomponente reutilizable para mostrar las tarjetas de datos del tab "Perfil" */
export function EntityInfoGrid({ cards }: { cards: readonly EntityInfoCard[] }) {
  return (
    <div className={styles.infoGrid}>
      {cards.map((card) => (
        <article key={card.id} className={styles.infoCard}>
          <div
            className={`${styles.cardIconBox} ${
              card.icon === 'info' ? styles.cardIconSolid : ''
            }`}
          >
            <CardIcon name={card.icon} />
          </div>
          <div className={styles.cardTextGroup}>
            <span className={styles.cardLabel}>{card.label}</span>
            <div className={styles.cardValue}>{card.value}</div>
          </div>
        </article>
      ))}
    </div>
  )
}

function SidebarIcon({ name }: { name: EntityOptionIcon }) {
  switch (name) {
    case 'user':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
        </svg>
      )
    case 'edit':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'history':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 3" />
        </svg>
      )
    case 'role':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="20" r="2" />
          <path d="M14.5 9.5 17.5 6.5M9.5 9.5 6.5 6.5M12 15v3" />
        </svg>
      )
    case 'role-history':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="10" cy="8" r="4" />
          <path d="M3 20v-1a7 7 0 0 1 10-6.3" />
          <circle cx="17" cy="17" r="4" />
          <path d="M17 15v2l1.5 1" />
        </svg>
      )
  }
}

function CardIcon({ name }: { name: EntityCardIcon }) {
  switch (name) {
    case 'user':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
        </svg>
      )
    case 'institution':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 21h18M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M12 3 2 8h20L12 3z" />
        </svg>
      )
    case 'career':
      return (
        <svg viewBox="0 0 24 24">
          <rect x="4" y="3" width="10" height="18" rx="1" />
          <path d="M14 8h6v13h-6M8 7h2M8 11h2M8 15h2M17 12h1M17 16h1" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    case 'info':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 11v6M12 7h.01" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
      )
    case 'id-card':
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="12" r="2" />
          <path d="M14 10h4M14 14h4" />
        </svg>
      )
  }
}