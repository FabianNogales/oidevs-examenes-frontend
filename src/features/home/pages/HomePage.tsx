import eidaLogo from '@/assets/images/eida-logo.svg'
import homeHeroImage from '@/assets/images/logo-home.png'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { TeacherUpcomingExamsSection } from '@/features/home/components/TeacherUpcomingExamsSection'
import { InstitutionalCalendar } from '@/features/portal-calendar/components/InstitutionalCalendar'
import { NewsList } from '@/features/portal-news/components/NewsList'
import styles from './HomePage.module.css'

export function HomePage() {
  const { user } = useAuth()
  const isTeacher = user?.roles.includes('DOCENTE') ?? false

  return (
    <div className={styles.page}>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.eidaBrand}>
              <img
                src={eidaLogo}
                alt="Logo EIDA"
                className={styles.eidaLogo}
              />

              <div>
                <strong>EIDA</strong>
                <span>Escáner de Identidad Digital Ágil</span>
              </div>
            </div>

            <h1 className={styles.heroTitle}>
              <span>SISTEMA DE CONTROL</span>
              <strong>DE EXÁMENES MASIVOS</strong>
            </h1>

            <p className={styles.heroDescription}>
              Una plataforma confiable, segura y eficiente para la gestión de
              exámenes en la UMSS.
            </p>

            <div className={styles.heroDivider} aria-hidden="true" />

            <p className={styles.heroSlogan}>
              EDUCACIÓN QUE TRANSFORMA REALIDADES
            </p>
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
      </main>
    </div>
  )
}
