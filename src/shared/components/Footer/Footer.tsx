import { EidaLogo } from '@/assets/icons/EidaLogo'
import { Text } from '@/shared/components/ui/Typography'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.identity}>
          <EidaLogo className={styles.logo} aria-hidden="true" />
          <div className={styles.identityText}>
            <Text
              as="span"
              variant="small"
              weight="semibold"
              className={styles.primaryText}
            >
              Universidad Mayor de San Simón
            </Text>
            <span className={styles.separator} aria-hidden="true">
              |
            </span>
            <Text as="span" variant="small" className={styles.secondaryText}>
              EIDA - Sistema de Control de Exámenes Masivos
            </Text>
          </div>
        </div>
        <div className={styles.motto}>
          <Text as="span" variant="small" className={styles.secondaryText}>
            Confianza
          </Text>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Text as="span" variant="small" className={styles.secondaryText}>
            Tecnología
          </Text>
          <span className={styles.separator} aria-hidden="true">
            |
          </span>
          <Text as="span" variant="small" className={styles.secondaryText}>
            Educación
          </Text>
        </div>
      </div>
    </footer>
  )
}
