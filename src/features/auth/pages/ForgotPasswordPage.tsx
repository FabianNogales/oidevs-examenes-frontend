import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'

export function ForgotPasswordPage() {
  return (
    <PublicAuthLayout>
      <ForgotPasswordForm />
    </PublicAuthLayout>
  )
}
