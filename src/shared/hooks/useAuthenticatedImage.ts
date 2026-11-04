import { useEffect, useState } from 'react'
import { httpClient } from '@/shared/api/httpClient'

export function useAuthenticatedImage(
  url: string | null | undefined,
  revision?: number,
) {
  const source = url?.trim() || null
  const key = JSON.stringify([source, revision])
  const [image, setImage] = useState<{
    key: string
    src: string | null
    failed: boolean
  } | null>(null)

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    let objectUrl: string | null = null
    void httpClient
      .get<Blob>(source, {
        responseType: 'blob',
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(data)
        setImage({ key, src: objectUrl, failed: false })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setImage({ key, src: null, failed: true })
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source, revision, key])

  const current = image?.key === key
  return {
    src: source && current ? image.src : null,
    loading: Boolean(source && !current),
    failed: Boolean(source && current && image.failed),
  }
}
