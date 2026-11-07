import { useEffect, useState } from 'react'
import { getNewsImage } from '../api/newsApi'
import styles from '@/features/portal-shared/components/portalShared.module.css'

export function AuthenticatedNewsImage({
  url,
  title,
  revision,
}: {
  url: string
  title: string
  revision: number
}) {
  const [version, setVersion] = useState(0)
  const key = JSON.stringify([url, revision, version])
  const [state, setState] = useState<{
    key: string
    src: string | null
    error: boolean
  }>({ key: '', src: null, error: false })
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    void getNewsImage(url, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setState({ key, src: objectUrl, error: false })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, src: null, error: true })
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, key])
  if (state.key !== key) return <p role="status">Cargando imagen…</p>
  return state.error ? (
    <div role="alert">
      <p>No se pudo cargar la imagen.</p>
      <button type="button" onClick={() => setVersion((value) => value + 1)}>
        Reintentar imagen
      </button>
    </div>
  ) : state.src ? (
    <img className={styles.image} src={state.src} alt={title} />
  ) : null
}

export function NewsImage({
  url,
  title,
}: {
  url: string | null
  title: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (!url) return null
  return failedUrl === url ? (
    <p className={styles.muted}>Imagen no disponible.</p>
  ) : (
    <img
      className={styles.image}
      src={url}
      alt={title}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  )
}
