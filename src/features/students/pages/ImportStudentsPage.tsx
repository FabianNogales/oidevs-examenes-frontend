import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import styles from './ImportStudentsPage.module.css'
import {
  StudentImportPanel,
  type ImportStep,
} from '@/features/students/components/StudentImportPanel'

const BREADCRUMB_BY_STEP: Record<ImportStep, string> = {
  select: 'Importar estudiantes',
  preview: 'Vista previa',
  success: 'Importación completada',
}

const TITLE_BY_STEP: Record<ImportStep, string> = {
  select: 'Importar estudiantes',
  preview: 'Vista previa de la última importación',
  success: 'Importación completada',
}

export function ImportStudentsPage() {
  const location = useLocation()
  const [step, setStep] = useState<ImportStep>('select')

  return (
    <div className={styles.pageContainer}>
      <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
        <NavLink to="/admin" className={styles.breadcrumbLink}>Inicio</NavLink>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbLink}>Estudiantes</span>
        <span className={styles.breadcrumbSeparatorActive}>/</span>
        <span className={styles.breadcrumbCurrent}>{BREADCRUMB_BY_STEP[step]}</span>
      </nav>

      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1>{TITLE_BY_STEP[step]}</h1>
          <p>Carga el padrón de estudiantes mediante un archivo CSV.</p>
        </div>
      </header>

      <main className={styles.mainContent}>
        <StudentImportPanel key={location.key} onStepChange={setStep} />
      </main>
    </div>
  )
}
