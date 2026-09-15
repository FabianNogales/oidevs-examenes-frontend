import { ChangeInitialPasswordForm } from '@/features/auth/components/ChangeInitialPasswordForm'
import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'

export function ChangeInitialPasswordPage() {
  return (
    <PublicAuthLayout>
      <ChangeInitialPasswordForm />
    </PublicAuthLayout>
  )
}
