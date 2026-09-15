import { useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { StudentProfileError } from '@/features/students/types/studentProfile'
import styles from './StudentProfilePhoto.module.css'

interface StudentProfilePhotoProps {
  photoUrl: string | null
  updating: boolean
  error: StudentProfileError | null
  onUpdate: (photo: File) => Promise<boolean>
}

export function StudentProfilePhoto({
  photoUrl,
  updating,
  error,
  onUpdate,
}: StudentProfilePhotoProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!photo || updating) return
    setSuccess(false)
    if (await onUpdate(photo)) {
      setFailedUrl(null)
      setSuccess(true)
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Fotografía</h2>
      {photoUrl && photoUrl !== failedUrl ? (
        <img
          className={styles.photo}
          src={photoUrl}
          alt="Tu foto de perfil"
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        <div
          className={styles.placeholder}
          role="img"
          aria-label="Sin foto de perfil"
        >
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="24" cy="16" r="8" />
            <path d="M8 42v-4a16 16 0 0 1 32 0v4" />
          </svg>
        </div>
      )}
      <input
        ref={input}
        id={`${id}-file`}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        aria-label="Seleccionar nueva foto de perfil"
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        aria-invalid={Boolean(error)}
        disabled={updating}
        onChange={(event) => void handleChange(event)}
      />
      <button
        type="button"
        className={styles.button}
        disabled={updating}
        aria-controls={`${id}-file`}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        onClick={() => input.current?.click()}
      >
        {updating ? 'Actualizando foto…' : 'Cambiar foto'}
      </button>
      <p id={`${id}-help`} className={styles.help}>
        <span>JPG, PNG o WEBP</span>
        <span>Máximo 2 MB</span>
      </p>
      <p className={styles.status} role="status">
        {updating
          ? 'Actualizando foto…'
          : success
            ? 'Foto de perfil actualizada.'
            : ''}
      </p>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error.message}
        </p>
      )}
    </section>
  )
}
