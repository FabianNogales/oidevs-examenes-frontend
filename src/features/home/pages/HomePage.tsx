import { BackendHealthStatus } from '@/features/health/components/BackendHealthStatus'

export function HomePage() {
  return (
    <main className="app-shell">
      <h1>OiDevs - Sistema de Examenes</h1>
      <BackendHealthStatus />
    </main>
  )
}
