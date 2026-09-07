import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BackendHealthStatus } from '@/features/health/components/BackendHealthStatus'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function HomePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
    } catch {
      // The auth context still clears the local user if the server session expired.
    } finally {
      setIsLoggingOut(false)
    }

    navigate('/login', { replace: true })
  }

  return (
    <main className="home-page">
      <section className="home-panel" aria-labelledby="home-title">
        <div>
          <p className="home-panel__eyebrow">OiPass</p>
          <h1 id="home-title">Sesion iniciada correctamente</h1>
        </div>

        <dl className="session-details">
          <div>
            <dt>Correo</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className="status-pill">{user?.status}</span>
            </dd>
          </div>
        </dl>

        <BackendHealthStatus />

        <button
          className="secondary-button"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
        </button>
      </section>
    </main>
  )
}
