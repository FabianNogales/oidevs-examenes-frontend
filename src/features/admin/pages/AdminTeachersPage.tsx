import { useEffect, useState, useRef, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'

import {
  createAdminTeacher,
  getAdminTeachers,
  TeacherApiError,
  updateAdminTeacherStatus,
} from '@/features/admin/api/adminTeachersApi'
import type {
  Teacher,
  TeacherFieldErrors,
  TeacherFormValues,
} from '@/features/admin/types/teacher.types'
import { Snackbar } from '@/shared/components/Snackbar'

import { DataTable } from '@/shared/components/DataTable/DataTable'
import type {
  TableColumnDef,
  TablePaginationMeta,
} from '@/shared/components/DataTable/dataTable.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'

import styles from './AdminTeachersPage.module.css'

const PER_PAGE = 10

const EMPTY_FORM: TeacherFormValues = {
  institutional_code: '',
  identity_number: '',
  first_names: '',
  last_names: '',
  email: '',
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}

function getFirstFieldError(
  errors: TeacherFieldErrors,
  field: keyof TeacherFormValues,
): string | null {
  const fieldErrors = errors[field]
  if (!fieldErrors || fieldErrors.length === 0) {
    return null
  }
  return fieldErrors[0]
}

function validateTeacherForm(values: TeacherFormValues): TeacherFieldErrors {
  const errors: TeacherFieldErrors = {}

  if (!values.institutional_code.trim()) {
    errors.institutional_code = ['El código institucional es obligatorio.']
  } else if (values.institutional_code.trim().length > 50) {
    errors.institutional_code = [
      'El código institucional no puede superar 50 caracteres.',
    ]
  }

  if (!values.identity_number.trim()) {
    errors.identity_number = ['El carnet de identidad es obligatorio.']
  } else if (values.identity_number.trim().length > 50) {
    errors.identity_number = [
      'El carnet de identidad no puede superar 50 caracteres.',
    ]
  }

  if (!values.first_names.trim()) {
    errors.first_names = ['Los nombres son obligatorios.']
  } else if (values.first_names.trim().length > 100) {
    errors.first_names = ['Los nombres no pueden superar 100 caracteres.']
  }

  if (!values.last_names.trim()) {
    errors.last_names = ['Los apellidos son obligatorios.']
  } else if (values.last_names.trim().length > 100) {
    errors.last_names = ['Los apellidos no pueden superar 100 caracteres.']
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = ['El correo institucional es obligatorio.']
  } else if (email.length > 255) {
    errors.email = ['El correo no puede superar 255 caracteres.']
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['Ingresa un correo electrónico válido.']
  }

  return errors
}

const TEACHER_COLUMNS: readonly TableColumnDef<Teacher>[] = [
  {
    id: 'code',
    header: 'Código',
    width: '16%',
    accessorKey: 'institutional_code',
  },
  {
    id: 'teacher',
    header: 'Docente',
    width: '28%',
    cell: (teacher) => (
      <div>
        <span className={tableStyles.primaryText}>
          {teacher.first_names} {teacher.last_names}
        </span>
        <span className={tableStyles.secondaryText}>
          CI: {teacher.identity_number}
        </span>
      </div>
    ),
  },
  {
    id: 'email',
    header: 'Correo Institucional',
    width: '30%',
    accessorKey: 'email',
  },
  {
    id: 'status',
    header: 'Estado',
    width: '12%',
    accessorKey: 'status',
  },
]

export function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [pagination, setPagination] = useState<TablePaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Estados exclusivos para el registro de un nuevo docente
  const [formOpen, setFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<TeacherFormValues>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<TeacherFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados para activación / desactivación
  const [statusTeacher, setStatusTeacher] = useState<Teacher | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  useBodyScrollLock(formOpen || statusTeacher !== null)

  const [notice, setNotice] = useState<Parameters<typeof Snackbar>[0]['notice']>(
    null,
  )

  const requestIdRef = useRef(0)

  const loadTeachers = useCallback(async (currentPage: number, search: string) => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setLoadError(null)

      const result = await getAdminTeachers({
        page: currentPage,
        perPage: PER_PAGE,
        search,
      })

      if (requestId !== requestIdRef.current) return

      setTeachers(result.teachers)
      setPagination({
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total,
      })

      if (result.meta.last_page > 0 && currentPage > result.meta.last_page) {
        setPage(result.meta.last_page)
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return

      setTeachers([])
      setPagination(null)
      setLoadError(getErrorMessage(error, 'No se pudieron cargar los docentes.'))
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadTeachers(page, searchTerm)
  }, [page, searchTerm, loadTeachers])

  function showNotice(type: 'success' | 'error', message: string) {
    setNotice({
      id: Date.now(),
      type,
      message,
    })
  }

  function handleSearch(query: string) {
    setPage(1)
    if (query === searchTerm && page === 1) {
      void loadTeachers(1, query)
      return
    }
    setSearchTerm(query)
  }

  function handleOpenCreate() {
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  function handleCloseForm() {
    if (saving) return
    setFormOpen(false)
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
  }

  function handleFieldChange(field: keyof TeacherFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
    setFormError(null)
  }

  async function handleSubmitTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const localErrors = validateTeacherForm(formValues)
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setFormError('Revisa los campos marcados antes de continuar.')
      return
    }

    const normalizedValues: TeacherFormValues = {
      institutional_code: formValues.institutional_code.trim(),
      identity_number: formValues.identity_number.trim(),
      first_names: formValues.first_names.trim(),
      last_names: formValues.last_names.trim(),
      email: formValues.email.trim().toLowerCase(),
    }

    setSaving(true)
    setFieldErrors({})
    setFormError(null)

    try {
      await createAdminTeacher(normalizedValues)
      showNotice('success', 'El docente fue registrado correctamente.')

      setFormOpen(false)
      setFormValues(EMPTY_FORM)
      void loadTeachers(page, searchTerm)
    } catch (error) {
      if (error instanceof TeacherApiError) {
        setFieldErrors(error.fieldErrors)
        setFormError(error.message)
      } else {
        setFormError(
          getErrorMessage(
            error,
            'No se pudo guardar la información del docente.',
          ),
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmStatusChange() {
    if (!statusTeacher) return

    const newStatus = statusTeacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setChangingStatus(true)

    try {
      const updatedTeacher = await updateAdminTeacherStatus(
        statusTeacher.id,
        newStatus,
      )

      setTeachers((current) =>
        current.map((teacher) =>
          teacher.id === updatedTeacher.id ? updatedTeacher : teacher,
        ),
      )

      setStatusTeacher(null)
      showNotice(
        'success',
        newStatus === 'ACTIVE'
          ? 'El docente fue activado correctamente.'
          : 'El docente fue desactivado correctamente.',
      )
    } catch (error) {
      showNotice(
        'error',
        getErrorMessage(error, 'No se pudo cambiar el estado del docente.'),
      )
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Administración</p>
            <h1>Gestión de docentes</h1>
            <p className={styles.description}>
              Consulta y administra los docentes registrados en el sistema EIDA.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link className={styles.assignButton} to="/admin/teachers/assignments">
              Asignación de materias
            </Link>
            <button
              type="button"
              className={styles.registerButton}
              onClick={handleOpenCreate}
            >
              <span aria-hidden="true">+</span>
              Registrar docente
            </button>
          </div>
        </header>

        {/* Redirige automáticamente a /admin/teachers/:id al pulsar "Ver perfil" */}
        <DataTable<Teacher>
          columns={TEACHER_COLUMNS}
          data={teachers}
          loading={loading}
          error={loadError}
          pagination={pagination}
          entityLabel="docentes"
          searchPlaceholder="Buscar por nombre, apellido, correo o código institucional"
          onSearch={handleSearch}
          onPageChange={setPage}
          onRetry={() => void loadTeachers(page, searchTerm)}
          getProfilePath={(teacher) => `/admin/teachers/${teacher.id}`}
          onToggleStatus={(teacher) => setStatusTeacher(teacher)}
          emptyTitle="No se encontraron docentes"
          emptyDescription={
            searchTerm
              ? 'Prueba con otro nombre, correo o código institucional.'
              : 'Todavía no existen docentes registrados en el sistema.'
          }
        />
      </div>

      {/* Modal de Registro de Nuevo Docente */}
      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <div
            className={styles.formModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-form-title"
          >
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Nuevo registro</p>
                <h2 id="teacher-form-title">Registrar docente</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseForm}
                disabled={saving}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form
              className={styles.teacherForm}
              onSubmit={handleSubmitTeacher}
              noValidate
            >
              {formError && (
                <div className={styles.formError} role="alert">
                  {formError}
                </div>
              )}

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>
                    Código institucional<b>*</b>
                  </span>
                  <input
                    type="text"
                    maxLength={50}
                    value={formValues.institutional_code}
                    onChange={(event) =>
                      handleFieldChange('institutional_code', event.target.value)
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(fieldErrors, 'institutional_code'),
                    )}
                  />
                  {getFirstFieldError(fieldErrors, 'institutional_code') && (
                    <small className={styles.fieldError}>
                      {getFirstFieldError(fieldErrors, 'institutional_code')}
                    </small>
                  )}
                </label>

                <label className={styles.formField}>
                  <span>
                    Carnet de identidad<b>*</b>
                  </span>
                  <input
                    type="text"
                    maxLength={50}
                    value={formValues.identity_number}
                    onChange={(event) =>
                      handleFieldChange('identity_number', event.target.value)
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(fieldErrors, 'identity_number'),
                    )}
                  />
                  {getFirstFieldError(fieldErrors, 'identity_number') && (
                    <small className={styles.fieldError}>
                      {getFirstFieldError(fieldErrors, 'identity_number')}
                    </small>
                  )}
                </label>

                <label className={styles.formField}>
                  <span>
                    Nombres<b>*</b>
                  </span>
                  <input
                    type="text"
                    maxLength={100}
                    value={formValues.first_names}
                    onChange={(event) =>
                      handleFieldChange('first_names', event.target.value)
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(fieldErrors, 'first_names'),
                    )}
                  />
                  {getFirstFieldError(fieldErrors, 'first_names') && (
                    <small className={styles.fieldError}>
                      {getFirstFieldError(fieldErrors, 'first_names')}
                    </small>
                  )}
                </label>

                <label className={styles.formField}>
                  <span>
                    Apellidos<b>*</b>
                  </span>
                  <input
                    type="text"
                    maxLength={100}
                    value={formValues.last_names}
                    onChange={(event) =>
                      handleFieldChange('last_names', event.target.value)
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(fieldErrors, 'last_names'),
                    )}
                  />
                  {getFirstFieldError(fieldErrors, 'last_names') && (
                    <small className={styles.fieldError}>
                      {getFirstFieldError(fieldErrors, 'last_names')}
                    </small>
                  )}
                </label>

                <label className={`${styles.formField} ${styles.fullWidth}`}>
                  <span>
                    Correo institucional<b>*</b>
                  </span>
                  <input
                    type="email"
                    maxLength={255}
                    value={formValues.email}
                    onChange={(event) =>
                      handleFieldChange('email', event.target.value)
                    }
                    placeholder="docente@umss.edu.bo"
                    disabled={saving}
                    aria-invalid={Boolean(getFirstFieldError(fieldErrors, 'email'))}
                  />
                  {getFirstFieldError(fieldErrors, 'email') && (
                    <small className={styles.fieldError}>
                      {getFirstFieldError(fieldErrors, 'email')}
                    </small>
                  )}
                </label>
              </div>

              <div className={styles.initialPasswordInfo}>
                La contraseña inicial del docente será su carnet de identidad. Al
                ingresar por primera vez deberá cambiarla.
              </div>

              <footer className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Registrar docente'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Estado */}
      {statusTeacher && (
        <div className={styles.modalBackdrop} role="presentation">
          <div
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title"
          >
            <div
              className={
                statusTeacher.status === 'ACTIVE'
                  ? styles.warningIcon
                  : styles.activateIcon
              }
              aria-hidden="true"
            >
              {statusTeacher.status === 'ACTIVE' ? '!' : '✓'}
            </div>

            <h2 id="status-confirm-title">
              {statusTeacher.status === 'ACTIVE'
                ? 'Desactivar docente'
                : 'Activar docente'}
            </h2>

            <p>
              {statusTeacher.status === 'ACTIVE'
                ? 'El docente dejará de tener acceso al sistema hasta que vuelva a ser activado.'
                : 'El docente volverá a tener acceso al sistema.'}
            </p>

            <strong className={styles.confirmTeacherName}>
              {statusTeacher.first_names} {statusTeacher.last_names}
            </strong>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={changingStatus}
                onClick={() => !changingStatus && setStatusTeacher(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  statusTeacher.status === 'ACTIVE'
                    ? styles.confirmDeactivateButton
                    : styles.confirmActivateButton
                }
                disabled={changingStatus}
                onClick={handleConfirmStatusChange}
              >
                {changingStatus
                  ? 'Procesando...'
                  : statusTeacher.status === 'ACTIVE'
                    ? 'Sí, desactivar'
                    : 'Sí, activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar notice={notice} onDismiss={() => setNotice(null)} />
    </section>
  )
}