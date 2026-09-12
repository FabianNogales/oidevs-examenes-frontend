import eidaLogo from '@/assets/images/eida-logo.svg'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.identity}>
          <div className={styles.logoSurface}>
            <img
              src={eidaLogo}
              alt="EIDA"
              width={760}
              height={760}
              className={styles.logo}
            />
          </div>
          <div className={styles.description}>
            <p className={styles.name}>EIDA</p>
            <p className={styles.meaning}>Escáner de Identidad Digital Ágil</p>
          </div>
        </div>
        <div className={styles.institution}>
          <p>Universidad Mayor de San Simón</p>
          <p className={styles.motto}>Confianza · Tecnología · Educación</p>
        </div>
      </div>
    </footer>
  )
}
