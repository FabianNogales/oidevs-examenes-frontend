import { useEffect, useId, useRef, useState } from 'react'
import {
  changeEventStatus,
  createEvent,
  editEvent,
  getAdminEvent,
  getCalendarError,
} from '../api/portalCalendarApi'
import type {
  AdminPortalEvent,
  EventCategory,
  EventInput,
  EventStatus,
} from '../types'
import { STATUS_LABELS, VISIBILITY_LABELS } from '../types'
import { boliviaInput, inputToIso } from '../utils/calendarDates'
import { EventDetails } from './EventDetails'
import styles from '../portalCalendar.module.css'

const STATUS_ACTIONS: Record<EventStatus, string> = {
  DRAFT: 'Despublicar',
  PUBLISHED: 'Publicar',
  CANCELLED: 'Cancelar evento',
}

function draftOf(event: AdminPortalEvent | null) {
  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    starts_at: event ? boliviaInput(event.starts_at, event.all_day) : '',
    ends_at: event ? boliviaInput(event.ends_at, event.all_day) : '',
    all_day: event?.all_day ?? false,
    location: event?.location ?? '',
    category_id: event ? String(event.category.id) : '',
    visibility: event ? event.visibility : ('PUBLIC' as const),
  }
}

export function EventForm({
  initial,
  categories,
  onSaved,
  onBusy,
}: {
  initial: AdminPortalEvent | null
  categories: EventCategory[]
  onSaved: (event: AdminPortalEvent) => void
  onBusy: (busy: boolean) => void
}) {
  const id = useId()
  const [snapshot, setSnapshot] = useState(initial)
  const [draft, setDraft] = useState(() => draftOf(initial))
  const [error, setError] = useState<ReturnType<
    typeof getCalendarError
  > | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<EventStatus | 'visibility' | null>(
    null,
  )
  const [refreshed, setRefreshed] = useState(false)
  const submitting = useRef(false)
  const mounted = useRef(false)
  const refreshRequest = useRef<AbortController | null>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      refreshRequest.current?.abort()
    }
  }, [])
  const emptyCategories = !snapshot && categories.length === 0
  const locked = busy || conflict
  const fields = error?.fields ?? {}

  function update(field: keyof typeof draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  function setWorking(value: boolean) {
    submitting.current = value
    setBusy(value)
    onBusy(value)
  }

  async function mutate(status?: EventStatus, visibilityConfirmed = false) {
    if (submitting.current || conflict || (!status && emptyCategories)) return
    if (
      !status &&
      !visibilityConfirmed &&
      snapshot?.status === 'PUBLISHED' &&
      draft.visibility !== snapshot.visibility
    ) {
      setPending('visibility')
      return
    }
    const categoryId = Number(draft.category_id)
    if (
      !status &&
      (!snapshot || categoryId !== snapshot.category.id) &&
      !categories.some((item) => item.id === categoryId)
    ) {
      setError({
        status: 422,
        fields: { category_id: 'Selecciona una categoría disponible.' },
        message: 'Selecciona una categoría disponible.',
      })
      return
    }
    setWorking(true)
    setError(null)
    try {
      let result: AdminPortalEvent
      if (status && snapshot) {
        result = await changeEventStatus(snapshot.id, status, snapshot.revision)
      } else {
        const input: EventInput = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          starts_at: inputToIso(draft.starts_at, draft.all_day),
          ends_at: inputToIso(draft.ends_at, draft.all_day),
          all_day: draft.all_day,
          location: draft.location.trim() || null,
          category_id: categoryId,
          visibility: draft.visibility,
        }
        // Omit an unchanged category when editing: its active catalog entry may have been retired.
        const { category_id, ...content } = input
        result = snapshot
          ? await editEvent(
              snapshot.id,
              category_id === snapshot.category.id ? content : input,
              snapshot.revision,
            )
          : await createEvent(input)
      }
      if (mounted.current) onSaved(result)
    } catch (cause) {
      if (!mounted.current) return
      const failure = getCalendarError(cause)
      setError(failure)
      if (failure.status === 409) setConflict(true)
    } finally {
      if (mounted.current) setWorking(false)
      else submitting.current = false
    }
  }

  async function refresh() {
    if (!snapshot || submitting.current) return
    const controller = new AbortController()
    refreshRequest.current = controller
    setWorking(true)
    try {
      const current = await getAdminEvent(snapshot.id, controller.signal)
      if (!mounted.current || controller.signal.aborted) return
      setSnapshot(current)
      setDraft(draftOf(current))
      setConflict(false)
      setPending(null)
      setError(null)
      setRefreshed(true)
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted)
        setError(getCalendarError(cause))
    } finally {
      if (mounted.current) setWorking(false)
    }
  }

  const fieldError = (field: string) =>
    fields[field] ? (
      <p id={`${id}-${field}-error`} className={styles.error}>
        {fields[field]}
      </p>
    ) : null
  const accessibility = (field: string) => ({
    'aria-invalid': !!fields[field],
    'aria-describedby': fields[field] ? `${id}-${field}-error` : undefined,
  })

  return (
    <div>
      {snapshot ? (
        <>
          <EventDetails event={snapshot} />
          <p>
            Estado: <strong>{STATUS_LABELS[snapshot.status]}</strong> ·
            Revisión: {snapshot.revision}
          </p>
          <p>
            Visibilidad:{' '}
            <strong>{VISIBILITY_LABELS[snapshot.visibility]}</strong>
          </p>
          {snapshot.status === 'PUBLISHED' &&
          snapshot.visibility === 'PUBLIC' ? (
            <p className={styles.notice}>
              Los cambios serán públicos al guardar. Despublica primero si
              necesitas preparar cambios fuera del público.
            </p>
          ) : null}
        </>
      ) : null}
      {refreshed ? (
        <p role="status">
          Información actualizada. Revisa el evento antes de guardar.
        </p>
      ) : null}
      {emptyCategories ? (
        <p role="status">No hay categorías de eventos disponibles.</p>
      ) : null}
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void mutate()
        }}
      >
        <fieldset disabled={locked || emptyCategories || pending !== null}>
          <legend>
            {snapshot ? 'Editar evento' : 'Nuevo evento · Borrador'}
          </legend>
          <label className={styles.field}>
            Título
            <input
              name="title"
              value={draft.title}
              required
              maxLength={200}
              {...accessibility('title')}
              onChange={(event) => update('title', event.target.value)}
            />
          </label>
          {fieldError('title')}
          <label className={styles.field}>
            Descripción
            <textarea
              name="description"
              value={draft.description}
              required
              maxLength={10000}
              rows={4}
              {...accessibility('description')}
              onChange={(event) => update('description', event.target.value)}
            />
          </label>
          {fieldError('description')}
          <label className={styles.field}>
            Visibilidad
            <select
              name="visibility"
              value={draft.visibility}
              required
              {...accessibility('visibility')}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'PUBLIC' || value === 'PRIVATE')
                  update('visibility', value)
              }}
            >
              <option value="PUBLIC">Público</option>
              <option value="PRIVATE">Privado — solo administradores</option>
            </select>
          </label>
          {fieldError('visibility')}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="all_day"
              checked={draft.all_day}
              {...accessibility('all_day')}
              onChange={(event) => {
                const allDay = event.target.checked
                setDraft((current) => ({
                  ...current,
                  all_day: allDay,
                  starts_at: current.starts_at
                    ? allDay
                      ? current.starts_at.slice(0, 10)
                      : `${current.starts_at.slice(0, 10)}T00:00:00`
                    : '',
                  ends_at: current.ends_at
                    ? allDay
                      ? current.ends_at.slice(0, 10)
                      : `${current.ends_at.slice(0, 10)}T00:00:00`
                    : '',
                }))
                setError(null)
              }}
            />{' '}
            Día completo
          </label>
          {fieldError('all_day')}
          <div className={styles.formRow}>
            <label className={styles.field}>
              Inicio (hora de Bolivia)
              <input
                name="starts_at"
                type={draft.all_day ? 'date' : 'datetime-local'}
                step={draft.all_day ? undefined : 1}
                value={draft.starts_at}
                required
                {...accessibility('starts_at')}
                onChange={(event) => update('starts_at', event.target.value)}
              />
              {fieldError('starts_at')}
            </label>
            <label className={styles.field}>
              {draft.all_day
                ? 'Fin exclusivo (día siguiente al último)'
                : 'Fin (hora de Bolivia)'}
              <input
                name="ends_at"
                type={draft.all_day ? 'date' : 'datetime-local'}
                step={draft.all_day ? undefined : 1}
                value={draft.ends_at}
                required
                {...accessibility('ends_at')}
                onChange={(event) => update('ends_at', event.target.value)}
              />
              {fieldError('ends_at')}
            </label>
          </div>
          <label className={styles.field}>
            Ubicación
            <input
              name="location"
              value={draft.location}
              maxLength={255}
              {...accessibility('location')}
              onChange={(event) => update('location', event.target.value)}
            />
          </label>
          {fieldError('location')}
          <label className={styles.field}>
            Categoría
            <select
              name="category_id"
              value={draft.category_id}
              required
              {...accessibility('category_id')}
              onChange={(event) => update('category_id', event.target.value)}
            >
              <option value="">Selecciona una categoría</option>
              {snapshot &&
              !categories.some(
                (category) => category.id === snapshot.category.id,
              ) ? (
                <option value={snapshot.category.id} disabled>
                  {snapshot.category.name} (categoría actual)
                </option>
              ) : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          {fieldError('category_id')}
        </fieldset>
        {error ? (
          <div role="alert" className={styles.error}>
            <p>{error.message}</p>
            {Object.entries(fields)
              .filter(
                ([name]) =>
                  ![
                    'title',
                    'description',
                    'starts_at',
                    'ends_at',
                    'all_day',
                    'location',
                    'category_id',
                    'visibility',
                  ].includes(name),
              )
              .map(([name, message]) => (
                <p key={name}>{message}</p>
              ))}
          </div>
        ) : null}
        {conflict ? (
          <div className={styles.notice}>
            <p>
              El borrador se conserva. Recargar reemplazará tus cambios con la
              información actual del servidor.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Recargar evento y descartar cambios
            </button>
          </div>
        ) : null}
        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.primary}
            disabled={locked || emptyCategories || pending !== null}
          >
            {busy
              ? 'Procesando…'
              : snapshot
                ? 'Guardar cambios'
                : 'Crear borrador'}
          </button>
        </div>
      </form>
      {snapshot ? (
        <div className={styles.actions} aria-label="Cambiar estado del evento">
          {(['DRAFT', 'PUBLISHED', 'CANCELLED'] as const)
            .filter((status) => status !== snapshot.status)
            .map((status) => (
              <button
                key={status}
                type="button"
                disabled={locked || pending !== null}
                onClick={() => {
                  setPending(status)
                  setError(null)
                }}
              >
                {status === 'DRAFT' && snapshot.status === 'CANCELLED'
                  ? 'Volver a borrador'
                  : STATUS_ACTIONS[status]}
              </button>
            ))}
        </div>
      ) : null}
      {pending === 'visibility' ? (
        <section
          className={styles.notice}
          aria-label="Confirmar cambio de visibilidad"
        >
          <p>
            Este evento está publicado. Al cambiar su visibilidad a{' '}
            {draft.visibility === 'PUBLIC'
              ? 'Público aparecerá inmediatamente en el calendario institucional.'
              : 'Privado dejará de aparecer inmediatamente en el calendario institucional.'}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={locked}
              onClick={() => setPending(null)}
            >
              Volver
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={locked}
              onClick={() => void mutate(undefined, true)}
            >
              Confirmar cambio de visibilidad
            </button>
          </div>
        </section>
      ) : pending ? (
        <section
          className={styles.notice}
          aria-label="Confirmar cambio de estado"
        >
          <p>
            ¿Cambiar «{snapshot?.title}» a{' '}
            {STATUS_LABELS[pending].toLowerCase()}?
          </p>
          {pending === 'PUBLISHED' ? (
            <p>
              {snapshot?.visibility === 'PRIVATE'
                ? 'El evento seguirá siendo privado y solo podrá consultarse en administración.'
                : 'El evento estará visible en el calendario público.'}
            </p>
          ) : (
            <p>
              El evento quedará fuera del calendario público y conservará su
              registro.
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={busy || conflict}
              onClick={() => setPending(null)}
            >
              Volver
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={locked}
              onClick={() => void mutate(pending)}
            >
              Confirmar cambio
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
