import { useState } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { PublicAuthLayout } from '@/features/auth/components/PublicAuthLayout'

export function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  return (
    <PublicAuthLayout isPasswordVisible={isPasswordVisible}>
      <LoginForm onPasswordVisibilityChange={setIsPasswordVisible} />
    </PublicAuthLayout>
  )
}
