import { ChangeInitialPasswordForm } from '@/features/auth/components/ChangeInitialPasswordForm'
import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'
import { InitialHistoricalPhotoForm } from '@/features/auth/components/InitialHistoricalPhotoForm'
import { useAuth } from '@/features/auth/hooks/useAuth'
import styles from './InitialSetup.module.css'

export function ChangeInitialPasswordPage() {
  const { user } = useAuth()
  return (
    <PublicAuthLayout>
      {user?.roles.includes('ESTUDIANTE') && (
        <ol
          className={styles.steps}
          aria-label="Progreso de configuración inicial"
        >
          <li aria-current={user.must_change_password ? 'step' : undefined}>
            1. Contraseña{!user.must_change_password ? ' ✓' : ''}
          </li>
          <li aria-current={!user.must_change_password ? 'step' : undefined}>
            2. Fotografía histórica
            {!user.must_upload_historical_photo ? ' ✓' : ''}
          </li>
        </ol>
      )}
      {user?.must_change_password ? (
        <ChangeInitialPasswordForm />
      ) : (
        <InitialHistoricalPhotoForm />
      )}
    </PublicAuthLayout>
  )
}
