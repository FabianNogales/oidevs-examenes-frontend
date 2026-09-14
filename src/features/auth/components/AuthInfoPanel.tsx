import {
  BoltIcon,
  ShieldIcon,
  UsersIcon,
} from '@/features/auth/components/AuthIcons'

const BENEFITS = [
  {
    title: 'Seguro',
    description: 'Protegemos tu información.',
    icon: <ShieldIcon />,
    tone: 'secure',
  },
  {
    title: 'Confiable',
    description: 'Respaldado por la UMSS.',
    icon: <UsersIcon />,
    tone: 'trusted',
  },
  {
    title: 'Ágil',
    description: 'Accede rápidamente a tus herramientas.',
    icon: <BoltIcon />,
    tone: 'fast',
  },
]

export function AuthInfoPanel() {
  return (
    <section className="auth-info" aria-labelledby="auth-info-title">
      <div className="auth-info__content">
        <p className="auth-info__eyebrow">EIDA - UMSS</p>
        <h1 id="auth-info-title">
          Sistema de Control
          <span>de Exámenes Masivos</span>
        </h1>
        <p className="auth-info__summary">
          Acceso seguro para estudiantes, docentes y personal autorizado.
        </p>

        <ul className="auth-info__benefits" aria-label="Beneficios">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <span
                className={`auth-info__benefit-icon auth-info__benefit-icon--${benefit.tone}`}
              >
                {benefit.icon}
              </span>
              <span>
                <strong>{benefit.title}</strong>
                <small>{benefit.description}</small>
              </span>
            </li>
          ))}
        </ul>

        <div className="auth-info__academic">
          <span aria-hidden="true" />
          <p>
            <strong>Gestión académica</strong>
            para un futuro con más oportunidades.
          </p>
        </div>
      </div>

      <div className="auth-info__campus" aria-hidden="true" />
    </section>
  )
}
