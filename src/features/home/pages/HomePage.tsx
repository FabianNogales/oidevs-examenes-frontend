import { BackendHealthStatus } from '@/features/health/components/BackendHealthStatus'
import { Link } from 'react-router'

export function HomePage() {
  return (
    <main className="app-shell">
      <h1>OiDevs - Sistema de Examenes</h1>
      <BackendHealthStatus />
      <Link to="/students/qr">Mis exámenes y códigos QR</Link>
    </main>
  )
}
