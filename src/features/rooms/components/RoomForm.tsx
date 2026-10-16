import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RoomApiError, saveAdminRoom } from '../api/adminRoomsApi'
import type { Room, RoomField, RoomFieldErrors } from '../types/room.types'
import {
  getRoomFormValues,
  getRoomPayload,
  ROOM_FIELDS,
  validateRoomForm,
} from '../utils/roomValidation'
import { RoomFormField } from './RoomFormField'
import styles from './RoomDialog.module.css'

interface Props {
  room?: Room
  onCancel: () => void
  onSaved: (room: Room) => void
  onBusyChange: (busy: boolean) => void
}

export function RoomForm({ room, onCancel, onSaved, onBusyChange }: Props) {
  const [values, setValues] = useState(() => getRoomFormValues(room))
  const [errors, setErrors] = useState<RoomFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const requestInFlight = useRef(false)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('[name="code"]')?.focus()
  }, [])

  function changeField(name: RoomField, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setError(null)
  }

  function focusFirstError(fields: RoomFieldErrors) {
    const first = ROOM_FIELDS.find((field) => fields[field.name])
    if (first)
      form.current
        ?.querySelector<HTMLElement>(`[name="${first.name}"]`)
        ?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (requestInFlight.current || unavailable) return
    const validation = validateRoomForm(values)
    setErrors(validation)
    setError(null)
    if (Object.keys(validation).length) {
      focusFirstError(validation)
      return
    }
    requestInFlight.current = true
    setSaving(true)
    onBusyChange(true)
    try {
      const saved = await saveAdminRoom(getRoomPayload(values), room?.id)
      onSaved(saved)
    } catch (cause) {
      const apiError =
        cause instanceof RoomApiError
          ? cause
          : new RoomApiError(
              'No se pudo guardar el aula. Inténtalo nuevamente.',
            )
      setError(apiError.message)
      setErrors(apiError.fieldErrors)
      if (apiError.status === 404 && room) setUnavailable(true)
      // Restore enabled inputs before focusing the field rejected by the server.
      requestAnimationFrame(() => focusFirstError(apiError.fieldErrors))
    } finally {
      requestInFlight.current = false
      setSaving(false)
      onBusyChange(false)
    }
  }

  return (
    <form ref={form} onSubmit={handleSubmit} noValidate aria-busy={saving}>
      <p className={styles.help}>Los campos con * son obligatorios.</p>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.formGrid}>
        {ROOM_FIELDS.map((field) => (
          <RoomFormField
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            disabled={saving || unavailable}
            onChange={changeField}
          />
        ))}
      </div>
      <footer className={styles.actions}>
        {saving && <span role="status">Guardando aula…</span>}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving || unavailable}
        >
          {saving ? 'Guardando…' : room ? 'Guardar cambios' : 'Registrar aula'}
        </button>
      </footer>
    </form>
  )
}
