import { LoginForm } from '@/features/auth/components/LoginForm'
import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'

export function LoginPage() {
  return (
    <PublicAuthLayout>
      <LoginForm />
    </PublicAuthLayout>
  )
}
