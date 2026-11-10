import type { ReactNode } from 'react'
import {
  BookOpen,
  Building2,
  Check,
  ChevronLeft,
  FileText,
  History,
  IdCard,
  Info,
  Landmark,
  Mail,
  Share2,
  SquarePen,
  User,
  UserCog,
  X,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Grid,
  Heading,
  Icon,
  Stack,
  Text,
  type BadgeTone,
  type IconComponentType,
} from '@/shared/components/ui/index'
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
  { label: string; tone: BadgeTone; avatarClass: string; badgeClass: string }
> = {
  STUDENT: {
    label: 'Estudiante',
    tone: 'info',
    avatarClass: styles.avatarStudent,
    badgeClass: styles.roleBadgeStudent,
  },
  TEACHER: {
    label: 'Docente',
    tone: 'accent',
    avatarClass: styles.avatarCrimson,
    badgeClass: styles.roleBadgeCrimson,
  },
  ADMIN: {
    label: 'Admin',
    tone: 'accent',
    avatarClass: styles.avatarCrimson,
    badgeClass: styles.roleBadgeCrimson,
  },
}

const PROFILE_ICON_MAP: Record<ProfileIconName, IconComponentType> = {
  user: User,
  edit: SquarePen,
  book: BookOpen,
  history: History,
  'exam-history': History,
  collaborator: Share2,
  'role-history': UserCog,
  exam: FileText,
  institution: Landmark,
  career: Building2,
  mail: Mail,
  info: Info,
  'id-card': IdCard,
}

export function ProfileIcon({
  name,
  size = 'md',
}: {
  name: ProfileIconName
  size?: 'sm' | 'md' | 'lg'
}) {
  const LucideIcon = PROFILE_ICON_MAP[name] ?? User
  return <Icon icon={LucideIcon} size={size} />
}

export function EntityInfoGrid({
  cards,
}: {
  cards: readonly EntityInfoCard[]
}) {
  return (
    <Grid columns={2} gap="5" className={styles.infoGrid}>
      {cards.map((card) => (
        <Card
          key={card.id}
          as="article"
          padding="md"
          className={styles.infoCard}
        >
          <div className={styles.infoCardIcon}>
            <ProfileIcon name={card.icon} size="lg" />
          </div>
          <div className={styles.infoCardBody}>
            <Text
              as="span"
              variant="small"
              tone="secondary"
              className={styles.infoCardLabel}
            >
              {card.label}
            </Text>
            <Text
              as="div"
              variant="body"
              weight="semibold"
              tone="primary"
              className={styles.infoCardValue}
            >
              {card.value}
            </Text>
          </div>
        </Card>
      ))}
    </Grid>
  )
}

// R1: the admin profile pages render inside AdminLayout, which already provides the page's main landmark;
// the profile area is a section labelled by the entity name (one profile per page, so the id is stable).
const ENTITY_NAME_ID = 'entity-profile-name'

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
          <Heading level={2} size="h3" className={styles.sidebarTitle}>
            Opciones
          </Heading>
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
                    <ProfileIcon name={option.icon} size="md" />
                  </span>
                  <span>{option.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <Button
          type="button"
          variant="secondary"
          className={styles.backBtn}
          onClick={onBack}
        >
          <Icon icon={ChevronLeft} size="sm" />
          <span>Regresar</span>
        </Button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <section className={styles.mainArea} aria-labelledby={ENTITY_NAME_ID}>
        {/* BANNER SUPERIOR CON COLOR DE ROL DINÁMICO */}
        <header
          className={`${styles.banner} ${
            isActive ? styles.bannerActive : styles.bannerInactive
          }`}
        >
          <Avatar
            initials={initials}
            size="lg"
            className={`${styles.avatarCircle} ${roleTheme.avatarClass}`}
          />

          <div className={styles.bannerIdentity}>
            <Heading
              level={1}
              id={ENTITY_NAME_ID}
              className={styles.entityName}
            >
              {fullName}
            </Heading>
            <Stack
              direction="horizontal"
              gap="2"
              align="center"
              wrap
              className={styles.bannerBadges}
            >
              <Badge
                tone={roleTheme.tone}
                className={`${styles.roleBadge} ${roleTheme.badgeClass}`}
              >
                {roleTheme.label}
              </Badge>
              <Badge
                tone={isActive ? 'success' : 'danger'}
                className={`${styles.statusBannerBadge} ${
                  isActive
                    ? styles.statusBannerActive
                    : styles.statusBannerInactive
                }`}
                icon={
                  <span className={styles.statusCheckIcon}>
                    <Icon icon={isActive ? Check : X} size="sm" />
                  </span>
                }
              >
                {isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </Stack>
          </div>
        </header>

        {/* CONTENIDO DE LA SUBPÁGINA ACTIVA */}
        <Stack
          direction="vertical"
          gap="6"
          className={styles.tabContentStack}
        >
          {children}
        </Stack>
      </section>
    </div>
  )
}
