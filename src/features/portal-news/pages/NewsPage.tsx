import { useCallback } from 'react'
import { Link, useParams } from 'react-router'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import {
  PortalFeedback,
  PortalPageLayout,
} from '@/features/portal-shared/components/PortalUi'
import { publicationDate } from '@/features/portal-shared/api/portalApi'
import { getNews } from '../api/newsApi'
import { NewsImage } from '../components/NewsImage'
import { NewsList } from '../components/NewsList'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import newsStyles from './news.module.css'

export { NewsList } from '../components/NewsList'

export function NewsPage() {
  return (
    <div className={newsStyles.page}>
      <PortalPageLayout title="Noticias institucionales">
        <NewsList />
      </PortalPageLayout>
    </div>
  )
}

export function NewsDetailPage() {
  const { newsId } = useParams()
  const load = useCallback(
    (signal: AbortSignal) => getNews(Number(newsId), signal),
    [newsId],
  )
  const result = usePortalResource(load)
  return (
    <PortalPageLayout title="Detalle de noticia">
      <Link to="/news">Volver a noticias</Link>
      <PortalFeedback {...result} retry={result.reload} />
      {result.data ? (
        <article className={styles.section}>
          <h2>{result.data.title}</h2>
          <time dateTime={result.data.published_at ?? undefined}>
            {publicationDate(result.data.published_at)}
          </time>
          <NewsImage url={result.data.image_url} title={result.data.title} />
          <p>{result.data.summary}</p>
          <p className={styles.description}>{result.data.content}</p>
        </article>
      ) : null}
    </PortalPageLayout>
  )
}
