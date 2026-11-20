import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AuthInfoPanel } from '@/features/auth/components/AuthInfoPanel'
import { Footer } from '@/shared/components/Footer/Footer'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { AuthRole } from '@/features/auth/types/auth'
import { Header } from '@/shared/components/Header/Header'
import { publicNavigation } from '@/shared/components/Header/headerNavigation.config'
import { getDelegatedNavigation } from '@/features/roles/utils/delegatedNavigation'
import type {
  HeaderRole,
  HeaderUser,
} from '@/shared/components/Header/header.types'
import { Card } from '@/shared/components/ui'

type PublicAuthLayoutProps = {
  children: ReactNode
  isPasswordVisible?: boolean
}

const HEADER_ROLE_BY_AUTH_ROLE: Record<AuthRole, HeaderRole> = {
  ADMINISTRADOR: 'admin',
  DOCENTE: 'teacher',
  ESTUDIANTE: 'student',
}

const ROLE_PRIORITY: AuthRole[] = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE']

export function PublicAuthLayout({
  children,
  isPasswordVisible = false,
}: PublicAuthLayoutProps) {
  const { user, logout, isLoggingOut } = useAuth()
  const navigate = useNavigate()

  const primaryRole = user
    ? ROLE_PRIORITY.find((role) => user.roles.includes(role))
    : null

  const headerUser: HeaderUser | null =
    user && primaryRole
      ? {
          name: user.display_name,
          role: HEADER_ROLE_BY_AUTH_ROLE[primaryRole],
        }
      : user ? { name: user.display_name, role: 'staff', roleLabel: user.roles.join(' · ') || 'Personal' } : null

  return (
    <div className="auth-shell">
      <Header user={headerUser} navigation={headerUser?.role === 'staff'
        ? [...publicNavigation, ...getDelegatedNavigation(user)] : publicNavigation} isLoggingOut={isLoggingOut}
        onLogout={async () => { await logout(); navigate('/login', { replace: true }) }} />
      <main className="auth-shell__body">
        <AuthInfoPanel isPasswordVisible={isPasswordVisible} />
        <Card as="section" padding="lg" className="auth-card" aria-live="polite">
          {children}
        </Card>
      </main>
      <Footer />
    </div>
  )
}
