import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import axios from 'axios'
import { registerHistoricalPhoto } from '@/features/auth/api/authApi'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { HISTORICAL_PHOTO_ACCEPT } from '@/features/students/utils/historicalPhotoValidation'
import { Button, Heading, Text } from '@/shared/components/ui'
import styles from '@/features/auth/pages/InitialSetup.module.css'

export function InitialHistoricalPhotoForm() {
  const { refreshUser, notify } = useAuth()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function selectPhoto(file: File | null) {
    setError(null)
    setPreview(null)
    setPhoto(null)
    if (!file) return
    if (!HISTORICAL_PHOTO_ACCEPT.split(',').includes(file.type)) {
      setError('Selecciona una imagen JPEG, PNG o WebP.')
    } else if (file.size > 2 * 1024 * 1024) {
      setError('La fotografía no debe superar 2 MB.')
    } else {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current) return
    if (!photo) {
      setError('Selecciona una fotografía para continuar.')
      return
    }
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      await registerHistoricalPhoto(photo)
      const user = await refreshUser()
      if (user) {
        notify('success', 'Fotografía histórica registrada correctamente.')
        navigate(getHomeRouteForUser(user), { replace: true })
      }
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        setError(
          cause.response?.data?.errors?.photo?.[0] ??
            cause.response?.data?.message ??
            'No se pudo guardar la fotografía. Inténtalo nuevamente.',
        )
        // Resolve an already committed upload after a lost response or another tab.
        if (cause.response?.status === 403 || cause.response?.status === 409) {
          const user = await refreshUser().catch(() => null)
          if (user && !user.must_upload_historical_photo)
            navigate(getHomeRouteForUser(user), { replace: true })
        }
      } else {
        setError(
          'No se pudo guardar la fotografía. Comprueba tu conexión e inténtalo nuevamente.',
        )
      }
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return (
    <form className="login-form" onSubmit={submit} aria-busy={busy} noValidate>
      <header className="auth-card__header">
        <Heading level={2}>Registra tu fotografía histórica</Heading>
        <Text>
          Se utilizará como referencia durante el control de ingreso a exámenes.
          Selecciona una fotografía reciente y clara de tu rostro.
        </Text>
      </header>
      <Text variant="small">
        Una vez confirmada, no podrás modificarla desde tu perfil. Esta carga no
        equivale a una identidad verificada por la institución. Si aún no tienes
        foto de perfil, usaremos inicialmente esta misma imagen.
      </Text>
      <div className={styles.file}>
        <label htmlFor="initial-historical-photo">
          Fotografía histórica obligatoria
        </label>
        <input
          id="initial-historical-photo"
          type="file"
          accept={HISTORICAL_PHOTO_ACCEPT}
          disabled={busy}
          required
          aria-invalid={Boolean(error)}
          aria-describedby="initial-photo-help initial-photo-error"
          onChange={(event) => selectPhoto(event.target.files?.[0] ?? null)}
        />
        <Text id="initial-photo-help" variant="small">
          JPEG, PNG o WebP. Máximo 2 MB. Puedes seleccionar otro archivo antes
          de confirmar.
        </Text>
      </div>
      {preview && (
        <img
          className={styles.preview}
          src={preview}
          alt="Vista previa de tu fotografía histórica"
        />
      )}
      <div id="initial-photo-error">
        {error && (
          <p className="auth-field__error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button
        className="primary-button"
        type="submit"
        loading={busy}
        disabled={!photo || busy}
      >
        {busy ? 'Guardando…' : 'Confirmar fotografía y continuar'}
      </Button>
    </form>
  )
}
