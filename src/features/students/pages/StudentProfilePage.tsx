import { StudentProfileField } from '@/features/students/components/StudentProfileField'
import { StudentProfilePhoto } from '@/features/students/components/StudentProfilePhoto'
import { useStudentProfile } from '@/features/students/hooks/useStudentProfile'
import styles from './StudentProfilePage.module.css'

export function StudentProfilePage() {
  const {
    data,
    loading,
    error,
    retry,
    updatePhoto,
    updatingPhoto,
    photoError,
  } = useStudentProfile()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Mi perfil</h1>
        <p>
          Consulta tu información personal y académica registrada en el sistema.
        </p>
      </header>

      {loading ? (
        <p className={styles.state} role="status">
          Cargando datos del perfil…
        </p>
      ) : error || !data ? (
        <div className={styles.state}>
          <p role="alert">
            {error?.message || 'No se encontraron datos del perfil.'}
          </p>
          <button type="button" className={styles.retry} onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          <StudentProfilePhoto
            photoUrl={data.profile_photo_url}
            updating={updatingPhoto}
            error={photoError}
            onUpdate={updatePhoto}
          />
          <div className={styles.information}>
            <section
              className={styles.panel}
              aria-labelledby="personal-data-title"
            >
              <div className={styles.panelHeading}>
                <h2 id="personal-data-title">Información personal</h2>
                <span className={styles.badge}>Solo lectura</span>
              </div>
              <dl className={styles.fields}>
                <StudentProfileField
                  label="Nombres"
                  value={data.personal_data?.first_names}
                />
                <StudentProfileField
                  label="Apellidos"
                  value={data.personal_data?.last_names}
                />
                <StudentProfileField
                  label="CI"
                  value={data.personal_data?.identity_number}
                />
              </dl>
            </section>
            <section
              className={styles.panel}
              aria-labelledby="academic-data-title"
            >
              <div className={styles.panelHeading}>
                <h2 id="academic-data-title">Información académica</h2>
                <span className={styles.badge}>Solo lectura</span>
              </div>
              <dl className={styles.fields}>
                <StudentProfileField
                  label="Código SIS"
                  value={data.academic_data?.sis_code}
                />
                <StudentProfileField
                  label="Correo institucional"
                  value={data.academic_data?.email}
                />
                <StudentProfileField
                  label="Carrera"
                  value={data.academic_data?.career_name}
                  fallback="Sin carrera registrada"
                />
                {data.academic_data?.career_code && (
                  <StudentProfileField
                    label="Código de carrera"
                    value={data.academic_data.career_code}
                  />
                )}
              </dl>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
