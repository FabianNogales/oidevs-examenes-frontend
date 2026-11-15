import { ShieldCheck, Users, Zap } from 'lucide-react'
import { EidaLogo } from '@/assets/icons/EidaLogo'
import { Heading, Text } from '@/shared/components/ui'

const BENEFITS = [
  {
    title: 'Seguro',
    description: 'Protegemos tu información.',
    icon: <ShieldCheck aria-hidden="true" />,
    tone: 'secure',
  },
  {
    title: 'Confiable',
    description: 'Respaldado por la UMSS.',
    icon: <Users aria-hidden="true" />,
    tone: 'trusted',
  },
  {
    title: 'Ágil',
    description: 'Accede rápidamente a tus herramientas.',
    icon: <Zap aria-hidden="true" />,
    tone: 'fast',
  },
]

type AuthInfoPanelProps = {
  isPasswordVisible?: boolean
}

export function AuthInfoPanel({ isPasswordVisible = false }: AuthInfoPanelProps) {
  return (
    <section className="auth-info" aria-labelledby="auth-info-title">
      <div className="auth-info__content">
        <div className="auth-info__brand">
          <EidaLogo
            className="auth-info__brand-logo"
            lookRight={isPasswordVisible}
            aria-hidden="true"
          />
          <div className="auth-info__brand-text">
            <Heading level={2}>EIDA</Heading>
            <Text as="span" variant="body" tone="secondary">
              Escáner de Identidad Digital Ágil
            </Text>
          </div>
        </div>
        <Heading level={1} id="auth-info-title">
          Sistema de Control
          <span>de Exámenes Masivos</span>
        </Heading>

        <ul className="auth-info__benefits" aria-label="Beneficios">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <span
                className={`auth-info__benefit-icon auth-info__benefit-icon--${benefit.tone}`}
              >
                {benefit.icon}
              </span>
              <span className="auth-info__benefit-text">
                <Text as="strong" variant="body" weight="semibold">
                  {benefit.title}
                </Text>
                <Text as="span" variant="small" tone="secondary">
                  {benefit.description}
                </Text>
              </span>
            </li>
          ))}
        </ul>

        <div className="auth-info__academic">
          <span aria-hidden="true" />
          <div className="auth-info__academic-text">
            <Text as="strong" variant="body" weight="semibold">
              Gestión académica
            </Text>
            <Text as="span" variant="small" tone="secondary">
              para un futuro con más oportunidades.
            </Text>
          </div>
        </div>
      </div>

      <div className="auth-info__campus" aria-hidden="true" />
    </section>
  )
}
