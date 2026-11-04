import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthenticatedImage } from '@/shared/hooks/useAuthenticatedImage'

export function AuthenticatedImage({
  url,
  revision,
  alt,
  placeholder,
  className,
}: {
  url: string | null | undefined
  revision?: number
  alt: string
  placeholder: ReactNode
  className?: string
}) {
  const image = useAuthenticatedImage(url, revision)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return image.src && failedSrc !== image.src ? (
    <img
      src={image.src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(image.src)}
    />
  ) : (
    <span className={className} aria-busy={image.loading}>
      {placeholder}
      {image.loading ? <span role="status">Cargando fotografía…</span> : null}
      {image.failed || (image.src && failedSrc === image.src) ? (
        <span role="status">No se pudo cargar la fotografía.</span>
      ) : null}
    </span>
  )
}
