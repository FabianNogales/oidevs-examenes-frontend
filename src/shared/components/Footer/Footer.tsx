import eidaLogo from '@/assets/images/eida-logo.svg'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.identity}>
          <img
            src={eidaLogo}
            alt="EIDA"
            width={32}
            height={32}
            className={styles.logo}
          />
          <div className={styles.identityText}>
            <span>Universidad Mayor de San Simón</span>
            <span className={styles.separator} aria-hidden="true">
              |
            </span>
            <span>EIDA - Sistema de Control de Exámenes Masivos</span>
          </div>
        </div>
        <div className={styles.motto}>
          <span>Confianza</span>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <span>Tecnología</span>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <span>Educación</span>
        </div>
      </div>
    </footer>
  )
}
