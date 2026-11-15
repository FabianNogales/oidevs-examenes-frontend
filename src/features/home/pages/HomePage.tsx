import { EidaLogo } from '@/assets/icons/EidaLogo'
import homeHeroImage from '@/assets/images/logo-home.png'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { TeacherUpcomingExamsSection } from '@/features/home/components/TeacherUpcomingExamsSection'
import { InstitutionalCalendar } from '@/features/portal-calendar/components/InstitutionalCalendar'
import { NewsList } from '@/features/portal-news/components/NewsList'
import { Heading, Text } from '@/shared/components/ui/Typography'
import styles from './HomePage.module.css'

// `embedded`: rendered inside a layout that already provides the <main> landmark (AdminLayout).
export function HomePage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const isTeacher = user?.roles.includes('DOCENTE') ?? false
  const Content = embedded ? 'div' : 'main'

  return (
    <div className={styles.page}>
      <Content className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.eidaBrand}>
              <EidaLogo className={styles.eidaLogo} aria-hidden="true" />

              <div>
                <Heading level={2} className={styles.eidaTitle}>
                  EIDA
                </Heading>
                <Text
                  as="span"
                  variant="body"
                  tone="secondary"
                  className={styles.eidaSubtitle}
                >
                  Escáner de Identidad Digital Ágil
                </Text>
              </div>
            </div>

            <Heading level={1} className={styles.heroTitle}>
              <span>SISTEMA DE CONTROL</span>
              <strong>DE EXÁMENES MASIVOS</strong>
            </Heading>

            <Text
              variant="body"
              tone="secondary"
              className={styles.heroDescription}
            >
              Una plataforma confiable, segura y eficiente para la gestión de
              exámenes en la UMSS.
            </Text>

            <div className={styles.heroDivider} aria-hidden="true" />

            <Text
              variant="small"
              tone="secondary"
              weight="semibold"
              className={styles.heroSlogan}
            >
              EDUCACIÓN QUE TRANSFORMA REALIDADES
            </Text>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <img
              src={homeHeroImage}
              alt=""
              className={styles.heroHomeImage}
            />
          </div>
        </section>

        <section
          className={styles.informationGrid}
          aria-label="Información pública"
        >
          <InstitutionalCalendar compact />

          <NewsList compact />
        </section>

        {isTeacher ? <TeacherUpcomingExamsSection key={user?.id} /> : null}
      </Content>
    </div>
  )
}
