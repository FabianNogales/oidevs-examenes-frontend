import axios from 'axios'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo iniciar sesion. Intentalo nuevamente.'
  }

  if (error.response?.status === 422) {
    return 'El correo o la contrasena son incorrectos.'
  }

  if (error.response?.status === 419) {
    return 'La sesion expiro. Intentalo nuevamente.'
  }

  return 'No se pudo iniciar sesion. Verifica que el backend este disponible.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Ingresa tu correo electronico y contrasena.')
      return
    }

    setIsSubmitting(true)
    let shouldNavigate = false

    try {
      await login({
        email: email.trim(),
        password,
      })
      setPassword('')
      shouldNavigate = true
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }

    if (shouldNavigate) {
      navigate('/', { replace: true })
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__brand">
          <span className="login-card__mark" aria-hidden="true">
            OP
          </span>
          <div>
            <p className="login-card__eyebrow">OiDevs</p>
            <h1>OiPass</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div>
            <h2 id="login-title">Iniciar sesion</h2>
            <p>Acceso privado para la gestion de examenes masivos.</p>
          </div>

          <div className="form-field">
            <label htmlFor="email">Correo electronico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>
      </section>
    </main>
  )
}
