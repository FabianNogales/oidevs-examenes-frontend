import eidaLogo from '@/assets/images/eida-logo.svg'
import homeHeroImage from '@/assets/images/logo-home.png'

import styles from './HomePage.module.css'

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const calendarDays = [
  { day: 31, outsideMonth: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  { day: 10 },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14 },
  { day: 15 },
  { day: 16, highlighted: true },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22 },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28 },
  { day: 29 },
  { day: 30 },
  { day: 1, outsideMonth: true },
  { day: 2, outsideMonth: true },
  { day: 3, outsideMonth: true },
  { day: 4, outsideMonth: true },
]

const news = [
  {
    id: 1,
    day: '15',
    month: 'SEP',
    title: 'Cronograma de exámenes del Segundo Semestre 2026',
    date: '15 de septiembre de 2026',
    description:
      'Consulta las fechas programadas para la realización de exámenes en la Universidad Mayor de San Simón.',
  },
  {
    id: 2,
    day: '10',
    month: 'SEP',
    title: 'Nuevas funcionalidades en el sistema',
    date: '10 de septiembre de 2026',
    description:
      'EIDA incorpora nuevas herramientas para facilitar la gestión y el control de los exámenes.',
  },
  {
    id: 3,
    day: '05',
    month: 'SEP',
    title: 'Recomendaciones para la rendición de exámenes',
    date: '5 de septiembre de 2026',
    description:
      'Revisa las principales recomendaciones antes de presentarte a una evaluación.',
  },
]

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
<<<<<<< HEAD
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
=======
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

            <div
              className={styles.heroDivider}
              aria-hidden="true"
            />

            <p className={styles.heroSlogan}>
              EDUCACIÓN QUE TRANSFORMA REALIDADES
            </p>
          </div>

          <div
            className={styles.heroVisual}
            aria-hidden="true"
          >
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
          <section
            className={styles.calendarCard}
            aria-labelledby="calendar-title"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span
                  className={styles.sectionIcon}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="16"
                      rx="2"
                    />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                </span>

                <h2 id="calendar-title">
                  Calendario de Exámenes
                </h2>
              </div>

              <span className={styles.viewAll}>
                Ver todos
                <span aria-hidden="true"> ›</span>
              </span>
            </div>

            <div className={styles.calendarMonth}>
              <span
                className={styles.monthArrow}
                aria-hidden="true"
              >
                ‹
              </span>

              <strong>Septiembre 2026</strong>

              <span
                className={styles.monthArrow}
                aria-hidden="true"
              >
                ›
              </span>
            </div>

            <div
              className={styles.calendarGrid}
              aria-label="Calendario de septiembre de 2026"
            >
              {weekDays.map((day) => (
                <span
                  key={day}
                  className={styles.weekDay}
                >
                  {day}
                </span>
              ))}

              {calendarDays.map((item, index) => (
                <span
                  key={`${item.day}-${index}`}
                  className={[
                    styles.calendarDay,
                    item.outsideMonth
                      ? styles.outsideMonth
                      : '',
                    item.highlighted
                      ? styles.highlightedDay
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item.day}
                </span>
              ))}
            </div>
          </section>

          <section
            className={styles.newsCard}
            aria-labelledby="news-title"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span
                  className={styles.sectionIcon}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8M8 13h8M8 17h5" />
                  </svg>
                </span>

                <h2 id="news-title">
                  Noticias
                </h2>
              </div>

              <span className={styles.viewAll}>
                Ver todas
                <span aria-hidden="true"> ›</span>
              </span>
            </div>

            <div className={styles.newsList}>
              {news.map((item) => (
                <article
                  key={item.id}
                  className={styles.newsItem}
                >
                  <div
                    className={styles.newsImage}
                    aria-hidden="true"
                  >
                    <span className={styles.newsDay}>
                      {item.day}
                    </span>

                    <span className={styles.newsMonth}>
                      {item.month}
                    </span>

                    <div
                      className={styles.newsImageDecoration}
                    />
                  </div>

                  <div className={styles.newsContent}>
                    <h3>{item.title}</h3>

                    <time>{item.date}</time>

                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerInstitution}>
            <span>Universidad Mayor de San Simón</span>

            <span
              className={styles.footerSeparator}
              aria-hidden="true"
            >
              |
            </span>

            <span>
              EIDA - Sistema de Control de Exámenes Masivos
            </span>
          </div>

          <div className={styles.footerValues}>
            <span>Confianza</span>

            <span
              className={styles.footerSeparator}
              aria-hidden="true"
            >
              |
            </span>

            <span>Tecnología</span>

            <span
              className={styles.footerSeparator}
              aria-hidden="true"
            >
              |
            </span>

            <span>Educación</span>
          </div>
        </div>
      </footer>
    </div>
>>>>>>> origin/Dev_Daniel
  )
}