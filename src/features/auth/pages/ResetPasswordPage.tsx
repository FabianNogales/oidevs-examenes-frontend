import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

export function ResetPasswordPage() {
  return (
    <PublicAuthLayout>
      <ResetPasswordForm />
    </PublicAuthLayout>
  )
}
