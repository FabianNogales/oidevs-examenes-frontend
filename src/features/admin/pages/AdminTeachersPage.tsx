import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import {
  createAdminTeacher,
  getAdminTeacher,
  getAdminTeachers,
  TeacherApiError,
  updateAdminTeacher,
  updateAdminTeacherStatus,
} from '@/features/admin/api/adminTeachersApi'
import type {
  Teacher,
  TeacherFieldErrors,
  TeacherFormValues,
  TeachersPaginationMeta,
} from '@/features/admin/types/teacher.types'
import { Snackbar } from '@/shared/components/Snackbar'

import styles from './AdminTeachersPage.module.css'

const EMPTY_FORM: TeacherFormValues = {
  institutional_code: '',
  identity_number: '',
  first_names: '',
  last_names: '',
  email: '',
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
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

function validateTeacherForm(
  values: TeacherFormValues,
): TeacherFieldErrors {
  const errors: TeacherFieldErrors = {}

  if (!values.institutional_code.trim()) {
    errors.institutional_code = [
      'El código institucional es obligatorio.',
    ]
  } else if (values.institutional_code.trim().length > 50) {
    errors.institutional_code = [
      'El código institucional no puede superar 50 caracteres.',
    ]
  }

  if (!values.identity_number.trim()) {
    errors.identity_number = [
      'El carnet de identidad es obligatorio.',
    ]
  } else if (values.identity_number.trim().length > 50) {
    errors.identity_number = [
      'El carnet de identidad no puede superar 50 caracteres.',
    ]
  }

  if (!values.first_names.trim()) {
    errors.first_names = [
      'Los nombres son obligatorios.',
    ]
  } else if (values.first_names.trim().length > 100) {
    errors.first_names = [
      'Los nombres no pueden superar 100 caracteres.',
    ]
  }

  if (!values.last_names.trim()) {
    errors.last_names = [
      'Los apellidos son obligatorios.',
    ]
  } else if (values.last_names.trim().length > 100) {
    errors.last_names = [
      'Los apellidos no pueden superar 100 caracteres.',
    ]
  }

  const email = values.email.trim()

  if (!email) {
    errors.email = [
      'El correo institucional es obligatorio.',
    ]
  } else if (email.length > 255) {
    errors.email = [
      'El correo no puede superar 255 caracteres.',
    ]
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = [
      'Ingresa un correo electrónico válido.',
    ]
  }

  return errors
}

export function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [pagination, setPagination] =
    useState<TeachersPaginationMeta | null>(null)

  const [page, setPage] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] =
    useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  const [selectedTeacher, setSelectedTeacher] =
    useState<Teacher | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] =
    useState(false)
  const [detailError, setDetailError] =
    useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] =
    useState<Teacher | null>(null)

  const [formValues, setFormValues] =
    useState<TeacherFormValues>(EMPTY_FORM)

  const [fieldErrors, setFieldErrors] =
    useState<TeacherFieldErrors>({})

  const [formError, setFormError] =
    useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const [statusTeacher, setStatusTeacher] =
    useState<Teacher | null>(null)

  const [changingStatus, setChangingStatus] =
    useState(false)

  const [notice, setNotice] =
    useState<Parameters<typeof Snackbar>[0]['notice']>(
      null,
    )

  useEffect(() => {
    let isMounted = true

    getAdminTeachers({
      page,
      perPage: 10,
      search,
    }).then(
      (result) => {
        if (!isMounted) {
          return
        }

        setTeachers(result.teachers)
        setPagination(result.meta)
        setLoadError(null)
        setLoading(false)
      },
      (error: unknown) => {
        if (!isMounted) {
          return
        }

        setTeachers([])
        setPagination(null)

        setLoadError(
          getErrorMessage(
            error,
            'No se pudieron cargar los docentes.',
          ),
        )

        setLoading(false)
      },
    )

    return () => {
      isMounted = false
    }
  }, [page, reloadKey, search])

  function showNotice(
    type: 'success' | 'error',
    message: string,
  ) {
    setNotice({
      id: Date.now(),
      type,
      message,
    })
  }

  function reloadTeachers() {
    setLoading(true)
    setReloadKey((current) => current + 1)
  }

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const normalizedSearch = searchInput.trim()

    setLoading(true)
    setPage(1)

    if (
      normalizedSearch === search &&
      page === 1
    ) {
      setReloadKey((current) => current + 1)
      return
    }

    setSearch(normalizedSearch)
  }

  function handleClearSearch() {
    setSearchInput('')
    setLoading(true)
    setPage(1)

    if (search === '') {
      setReloadKey((current) => current + 1)
      return
    }

    setSearch('')
  }

  function handleRetry() {
    reloadTeachers()
  }

  function handlePreviousPage() {
    if (
      loading ||
      !pagination ||
      pagination.current_page <= 1
    ) {
      return
    }

    setLoading(true)
    setPage((current) => current - 1)
  }

  function handleNextPage() {
    if (
      loading ||
      !pagination ||
      pagination.current_page >=
        pagination.last_page
    ) {
      return
    }

    setLoading(true)
    setPage((current) => current + 1)
  }

  async function handleOpenDetail(
    teacherId: number,
  ) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setSelectedTeacher(null)

    try {
      const teacher =
        await getAdminTeacher(teacherId)

      setSelectedTeacher(teacher)
    } catch (error) {
      setDetailError(
        getErrorMessage(
          error,
          'No se pudo cargar el detalle del docente.',
        ),
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function handleCloseDetail() {
    if (detailLoading) {
      return
    }

    setDetailOpen(false)
    setSelectedTeacher(null)
    setDetailError(null)
  }

  function handleOpenCreate() {
    setEditingTeacher(null)
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  function handleOpenEdit(
    teacher: Teacher,
  ) {
    setEditingTeacher(teacher)

    setFormValues({
      institutional_code:
        teacher.institutional_code,
      identity_number:
        teacher.identity_number,
      first_names:
        teacher.first_names,
      last_names:
        teacher.last_names,
      email:
        teacher.email,
    })

    setFieldErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  function handleCloseForm() {
    if (saving) {
      return
    }

    setFormOpen(false)
    setEditingTeacher(null)
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
  }

  function handleFieldChange(
    field: keyof TeacherFormValues,
    value: string,
  ) {
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

  async function handleSubmitTeacher(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const localErrors =
      validateTeacherForm(formValues)

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)

      setFormError(
        'Revisa los campos marcados antes de continuar.',
      )

      return
    }

    const normalizedValues: TeacherFormValues = {
      institutional_code:
        formValues.institutional_code.trim(),
      identity_number:
        formValues.identity_number.trim(),
      first_names:
        formValues.first_names.trim(),
      last_names:
        formValues.last_names.trim(),
      email:
        formValues.email
          .trim()
          .toLowerCase(),
    }

    setSaving(true)
    setFieldErrors({})
    setFormError(null)

    try {
      if (editingTeacher) {
        await updateAdminTeacher(
          editingTeacher.id,
          normalizedValues,
        )

        showNotice(
          'success',
          'Los datos del docente fueron actualizados correctamente.',
        )
      } else {
        await createAdminTeacher(
          normalizedValues,
        )

        showNotice(
          'success',
          'El docente fue registrado correctamente.',
        )
      }

      setFormOpen(false)
      setEditingTeacher(null)
      setFormValues(EMPTY_FORM)

      reloadTeachers()
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

  function handleRequestStatusChange(
    teacher: Teacher,
  ) {
    setStatusTeacher(teacher)
  }

  function handleCancelStatusChange() {
    if (changingStatus) {
      return
    }

    setStatusTeacher(null)
  }

  async function handleConfirmStatusChange() {
    if (!statusTeacher) {
      return
    }

    const newStatus =
      statusTeacher.status === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE'

    setChangingStatus(true)

    try {
      const updatedTeacher =
        await updateAdminTeacherStatus(
          statusTeacher.id,
          newStatus,
        )

      setTeachers((current) =>
        current.map((teacher) =>
          teacher.id === updatedTeacher.id
            ? updatedTeacher
            : teacher,
        ),
      )

      if (
        selectedTeacher?.id ===
        updatedTeacher.id
      ) {
        setSelectedTeacher(updatedTeacher)
      }

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
        getErrorMessage(
          error,
          'No se pudo cambiar el estado del docente.',
        ),
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
            <p className={styles.eyebrow}>
              Administración
            </p>

            <h1>Gestión de docentes</h1>

            <p className={styles.description}>
              Consulta y administra los docentes
              registrados en el sistema EIDA.
            </p>
          </div>

          <button
            type="button"
            className={styles.registerButton}
            onClick={handleOpenCreate}
          >
            <span aria-hidden="true">+</span>
            Registrar docente
          </button>
        </header>

        <div className={styles.card}>
          <form
            className={styles.searchBar}
            onSubmit={handleSearch}
          >
            <label
              className={styles.searchField}
              htmlFor="teacher-search"
            >
              <span
                className={styles.visuallyHidden}
              >
                Buscar docentes
              </span>

              <span
                className={styles.searchIcon}
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                id="teacher-search"
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Buscar por nombre, apellido, correo o código institucional"
              />
            </label>

            <button
              type="submit"
              className={styles.searchButton}
              disabled={loading}
            >
              Buscar
            </button>

            {(search || searchInput) && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearSearch}
                disabled={loading}
              >
                Limpiar
              </button>
            )}
          </form>

          {search && (
            <div
              className={
                styles.searchResultLabel
              }
            >
              Resultados para:{' '}
              <strong>{search}</strong>
            </div>
          )}

          {loading && (
            <div
              className={styles.loadingState}
              role="status"
            >
              <span
                className={styles.spinner}
                aria-hidden="true"
              />

              <p>Cargando docentes...</p>
            </div>
          )}

          {!loading && loadError && (
            <div
              className={styles.errorState}
              role="alert"
            >
              <div>
                <strong>
                  No se pudo cargar la información
                </strong>

                <p>{loadError}</p>
              </div>

              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading &&
            !loadError &&
            teachers.length === 0 && (
              <div
                className={styles.emptyState}
              >
                <div
                  className={styles.emptyIcon}
                  aria-hidden="true"
                >
                  👤
                </div>

                <strong>
                  No se encontraron docentes
                </strong>

                <p>
                  {search
                    ? 'Prueba con otro nombre, correo o código institucional.'
                    : 'Todavía no existen docentes registrados en el sistema.'}
                </p>
              </div>
            )}

          {!loading &&
            !loadError &&
            teachers.length > 0 && (
              <>
                <div
                  className={
                    styles.tableWrapper
                  }
                >
                  <table
                    className={styles.table}
                  >
                    <thead>
                      <tr>
                        <th>Código</th>

                        <th>Docente</th>

                        <th>
                          Correo institucional
                        </th>

                        <th>Estado</th>

                        <th
                          className={
                            styles.actionsHeader
                          }
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {teachers.map(
                        (teacher) => (
                          <tr key={teacher.id}>
                            <td
                              data-label="Código"
                              className={
                                styles.codeCell
                              }
                            >
                              {
                                teacher.institutional_code
                              }
                            </td>

                            <td data-label="Docente">
                              <div
                                className={
                                  styles.teacherData
                                }
                              >
                                <strong>
                                  {
                                    teacher.first_names
                                  }{' '}
                                  {
                                    teacher.last_names
                                  }
                                </strong>

                                <span>
                                  CI:{' '}
                                  {
                                    teacher.identity_number
                                  }
                                </span>
                              </div>
                            </td>

                            <td data-label="Correo">
                              {teacher.email}
                            </td>

                            <td data-label="Estado">
                              <span
                                className={
                                  teacher.status ===
                                  'ACTIVE'
                                    ? styles.activeBadge
                                    : styles.inactiveBadge
                                }
                              >
                                {teacher.status ===
                                'ACTIVE'
                                  ? 'Activo'
                                  : 'Inactivo'}
                              </span>
                            </td>

                            <td
                              data-label="Acciones"
                              className={
                                styles.actionsCell
                              }
                            >
                              <button
                                type="button"
                                className={
                                  styles.detailButton
                                }
                                onClick={() =>
                                  handleOpenDetail(
                                    teacher.id,
                                  )
                                }
                              >
                                Ver detalle
                              </button>

                              <button
                                type="button"
                                className={
                                  styles.editButton
                                }
                                onClick={() =>
                                  handleOpenEdit(
                                    teacher,
                                  )
                                }
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                className={
                                  teacher.status ===
                                  'ACTIVE'
                                    ? styles.deactivateButton
                                    : styles.activateButton
                                }
                                onClick={() =>
                                  handleRequestStatusChange(
                                    teacher,
                                  )
                                }
                              >
                                {teacher.status ===
                                'ACTIVE'
                                  ? 'Desactivar'
                                  : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                {pagination && (
                  <footer
                    className={
                      styles.pagination
                    }
                  >
                    <p>
                      Mostrando{' '}
                      <strong>
                        {pagination.from ?? 0}
                      </strong>{' '}
                      a{' '}
                      <strong>
                        {pagination.to ?? 0}
                      </strong>{' '}
                      de{' '}
                      <strong>
                        {pagination.total}
                      </strong>{' '}
                      docentes
                    </p>

                    <div
                      className={
                        styles.paginationControls
                      }
                    >
                      <button
                        type="button"
                        onClick={
                          handlePreviousPage
                        }
                        disabled={
                          loading ||
                          pagination.current_page <=
                            1
                        }
                      >
                        Anterior
                      </button>

                      <span>
                        Página{' '}
                        <strong>
                          {
                            pagination.current_page
                          }
                        </strong>{' '}
                        de{' '}
                        <strong>
                          {
                            pagination.last_page
                          }
                        </strong>
                      </span>

                      <button
                        type="button"
                        onClick={handleNextPage}
                        disabled={
                          loading ||
                          pagination.current_page >=
                            pagination.last_page
                        }
                      >
                        Siguiente
                      </button>
                    </div>
                  </footer>
                )}
              </>
            )}
        </div>
      </div>

      {detailOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
        >
          <div
            className={styles.detailModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-detail-title"
          >
            <header
              className={styles.modalHeader}
            >
              <div>
                <p
                  className={
                    styles.modalEyebrow
                  }
                >
                  Información registrada
                </p>

                <h2 id="teacher-detail-title">
                  Detalle del docente
                </h2>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseDetail}
                disabled={detailLoading}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </header>

            {detailLoading && (
              <div
                className={styles.modalLoading}
                role="status"
              >
                <span
                  className={styles.spinner}
                  aria-hidden="true"
                />

                <p>
                  Cargando información...
                </p>
              </div>
            )}

            {!detailLoading &&
              detailError && (
                <div
                  className={styles.modalError}
                >
                  <strong>
                    No se pudo cargar el docente
                  </strong>

                  <p>{detailError}</p>

                  <button
                    type="button"
                    className={
                      styles.closeDetailButton
                    }
                    onClick={
                      handleCloseDetail
                    }
                  >
                    Cerrar
                  </button>
                </div>
              )}

            {!detailLoading &&
              !detailError &&
              selectedTeacher && (
                <div
                  className={
                    styles.detailContent
                  }
                >
                  <div
                    className={
                      styles.teacherIdentity
                    }
                  >
                    <div
                      className={styles.avatar}
                      aria-hidden="true"
                    >
                      {selectedTeacher.first_names
                        .charAt(0)
                        .toUpperCase()}
                      {selectedTeacher.last_names
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3>
                        {
                          selectedTeacher.first_names
                        }{' '}
                        {
                          selectedTeacher.last_names
                        }
                      </h3>

                      <span
                        className={
                          selectedTeacher.status ===
                          'ACTIVE'
                            ? styles.activeBadge
                            : styles.inactiveBadge
                        }
                      >
                        {selectedTeacher.status ===
                        'ACTIVE'
                          ? 'Activo'
                          : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <dl
                    className={
                      styles.detailGrid
                    }
                  >
                    <div>
                      <dt>
                        Código institucional
                      </dt>

                      <dd>
                        {
                          selectedTeacher.institutional_code
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Carnet de identidad
                      </dt>

                      <dd>
                        {
                          selectedTeacher.identity_number
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>Nombres</dt>

                      <dd>
                        {
                          selectedTeacher.first_names
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>Apellidos</dt>

                      <dd>
                        {
                          selectedTeacher.last_names
                        }
                      </dd>
                    </div>

                    <div
                      className={
                        styles.detailFullWidth
                      }
                    >
                      <dt>
                        Correo institucional
                      </dt>

                      <dd>
                        {selectedTeacher.email}
                      </dd>
                    </div>
                  </dl>

                  <footer
                    className={
                      styles.modalFooter
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.editFromDetailButton
                      }
                      onClick={() => {
                        handleCloseDetail()
                        handleOpenEdit(
                          selectedTeacher,
                        )
                      }}
                    >
                      Editar docente
                    </button>

                    <button
                      type="button"
                      className={
                        styles.closeDetailButton
                      }
                      onClick={
                        handleCloseDetail
                      }
                    >
                      Cerrar
                    </button>
                  </footer>
                </div>
              )}
          </div>
        </div>
      )}

      {formOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
        >
          <div
            className={styles.formModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-form-title"
          >
            <header
              className={styles.modalHeader}
            >
              <div>
                <p
                  className={
                    styles.modalEyebrow
                  }
                >
                  {editingTeacher
                    ? 'Actualizar información'
                    : 'Nuevo registro'}
                </p>

                <h2 id="teacher-form-title">
                  {editingTeacher
                    ? 'Editar docente'
                    : 'Registrar docente'}
                </h2>
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
                <div
                  className={styles.formError}
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div
                className={styles.formGrid}
              >
                <label
                  className={styles.formField}
                >
                  <span>
                    Código institucional
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    maxLength={50}
                    value={
                      formValues.institutional_code
                    }
                    onChange={(event) =>
                      handleFieldChange(
                        'institutional_code',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(
                        fieldErrors,
                        'institutional_code',
                      ),
                    )}
                  />

                  {getFirstFieldError(
                    fieldErrors,
                    'institutional_code',
                  ) && (
                    <small
                      className={
                        styles.fieldError
                      }
                    >
                      {getFirstFieldError(
                        fieldErrors,
                        'institutional_code',
                      )}
                    </small>
                  )}
                </label>

                <label
                  className={styles.formField}
                >
                  <span>
                    Carnet de identidad
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    maxLength={50}
                    value={
                      formValues.identity_number
                    }
                    onChange={(event) =>
                      handleFieldChange(
                        'identity_number',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(
                        fieldErrors,
                        'identity_number',
                      ),
                    )}
                  />

                  {getFirstFieldError(
                    fieldErrors,
                    'identity_number',
                  ) && (
                    <small
                      className={
                        styles.fieldError
                      }
                    >
                      {getFirstFieldError(
                        fieldErrors,
                        'identity_number',
                      )}
                    </small>
                  )}
                </label>

                <label
                  className={styles.formField}
                >
                  <span>
                    Nombres
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    maxLength={100}
                    value={
                      formValues.first_names
                    }
                    onChange={(event) =>
                      handleFieldChange(
                        'first_names',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(
                        fieldErrors,
                        'first_names',
                      ),
                    )}
                  />

                  {getFirstFieldError(
                    fieldErrors,
                    'first_names',
                  ) && (
                    <small
                      className={
                        styles.fieldError
                      }
                    >
                      {getFirstFieldError(
                        fieldErrors,
                        'first_names',
                      )}
                    </small>
                  )}
                </label>

                <label
                  className={styles.formField}
                >
                  <span>
                    Apellidos
                    <b>*</b>
                  </span>

                  <input
                    type="text"
                    maxLength={100}
                    value={
                      formValues.last_names
                    }
                    onChange={(event) =>
                      handleFieldChange(
                        'last_names',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(
                        fieldErrors,
                        'last_names',
                      ),
                    )}
                  />

                  {getFirstFieldError(
                    fieldErrors,
                    'last_names',
                  ) && (
                    <small
                      className={
                        styles.fieldError
                      }
                    >
                      {getFirstFieldError(
                        fieldErrors,
                        'last_names',
                      )}
                    </small>
                  )}
                </label>

                <label
                  className={`${styles.formField} ${styles.fullWidth}`}
                >
                  <span>
                    Correo institucional
                    <b>*</b>
                  </span>

                  <input
                    type="email"
                    maxLength={255}
                    value={formValues.email}
                    onChange={(event) =>
                      handleFieldChange(
                        'email',
                        event.target.value,
                      )
                    }
                    placeholder="docente@umss.edu.bo"
                    disabled={saving}
                    aria-invalid={Boolean(
                      getFirstFieldError(
                        fieldErrors,
                        'email',
                      ),
                    )}
                  />

                  {getFirstFieldError(
                    fieldErrors,
                    'email',
                  ) && (
                    <small
                      className={
                        styles.fieldError
                      }
                    >
                      {getFirstFieldError(
                        fieldErrors,
                        'email',
                      )}
                    </small>
                  )}
                </label>
              </div>

              {!editingTeacher && (
                <div
                  className={
                    styles.initialPasswordInfo
                  }
                >
                  La contraseña inicial del
                  docente será su carnet de
                  identidad. Al ingresar por
                  primera vez deberá cambiarla.
                </div>
              )}

              <footer
                className={styles.formActions}
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
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
                  {saving
                    ? 'Guardando...'
                    : editingTeacher
                      ? 'Guardar cambios'
                      : 'Registrar docente'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {statusTeacher && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
        >
          <div
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title"
          >
            <div
              className={
                statusTeacher.status ===
                'ACTIVE'
                  ? styles.warningIcon
                  : styles.activateIcon
              }
              aria-hidden="true"
            >
              {statusTeacher.status ===
              'ACTIVE'
                ? '!'
                : '✓'}
            </div>

            <h2 id="status-confirm-title">
              {statusTeacher.status ===
              'ACTIVE'
                ? 'Desactivar docente'
                : 'Activar docente'}
            </h2>

            <p>
              {statusTeacher.status ===
              'ACTIVE'
                ? 'El docente dejará de tener acceso al sistema hasta que vuelva a ser activado.'
                : 'El docente volverá a tener acceso al sistema.'}
            </p>

            <strong
              className={
                styles.confirmTeacherName
              }
            >
              {statusTeacher.first_names}{' '}
              {statusTeacher.last_names}
            </strong>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                disabled={changingStatus}
                onClick={
                  handleCancelStatusChange
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  statusTeacher.status ===
                  'ACTIVE'
                    ? styles.confirmDeactivateButton
                    : styles.confirmActivateButton
                }
                disabled={changingStatus}
                onClick={
                  handleConfirmStatusChange
                }
              >
                {changingStatus
                  ? 'Procesando...'
                  : statusTeacher.status ===
                      'ACTIVE'
                    ? 'Sí, desactivar'
                    : 'Sí, activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar
        notice={notice}
        onDismiss={() => setNotice(null)}
      />
    </section>
  )
}