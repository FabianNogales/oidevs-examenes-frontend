import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import { PortalFeedback, PortalPager } from '@/features/portal-shared/components/PortalUi'
import { publicationDate } from '@/features/portal-shared/api/portalApi'
import { getNewsCategories, listNews } from '../api/newsApi'
import { NewsImage } from './NewsImage'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import newsStyles from '../pages/news.module.css'
import type { NewsCategory } from '../types/news.types'

// Home (compact) keeps its previous behaviour: no category request or filter.
const noCategories = (): Promise<NewsCategory[]> => Promise.resolve([])
function loadPublicNewsCategories(signal: AbortSignal) {
  return getNewsCategories(false, signal)
}

export function NewsList({ compact = false }: { compact?: boolean }) {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('')
  const categories = usePortalResource(
    compact ? noCategories : loadPublicNewsCategories,
  )
  const load = useCallback(
    (signal: AbortSignal) =>
      listNews(
        {
          page,
          search: '',
          per_page: compact ? 6 : 12,
          // Applied by the backend before paginating.
          ...(!compact && category ? { category_id: Number(category) } : {}),
        },
        signal,
      ),
    [page, compact, category],
  )
  const result = usePortalResource(load)
  return (
    <section
      className={`${newsStyles.list} ${compact ? styles.homeNews : ''}`}
      aria-label="Noticias institucionales"
      aria-busy={result.loading}
    >
      {compact ? (
        <header className={styles.toolbar}>
          <h2>Noticias recientes</h2>
          <Link to="/news" aria-label="Ver todas las noticias">
            Ver todas
          </Link>
        </header>
      ) : categories.error ? (
        <div role="alert" className={styles.error}>
          <p>{categories.error.message}</p>
          <button type="button" onClick={categories.reload}>
            Reintentar
          </button>
        </div>
      ) : categories.data?.length ? (
        <label className={`${styles.field} ${newsStyles.categoryFilter}`}>
          Categoría
          <select
            name="category_id"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className={`${styles.muted} ${newsStyles.sortOrder}`}>
        Más recientes primero
      </p>
      <PortalFeedback {...result} retry={result.reload} />
      {result.data?.data.length === 0 ? (
        <p role="status">No hay noticias publicadas para esta consulta.</p>
      ) : null}
      <div className={styles.cards}>
        {result.data?.data.map((news) => (
          <article key={news.id} className={styles.card}>
            <NewsImage url={news.image_url} title={news.title} />
            <h3>
              <Link to={`/news/${news.id}`}>{news.title}</Link>
            </h3>
            <time dateTime={news.published_at ?? undefined}>
              {publicationDate(news.published_at)}
            </time>
            {!compact && news.category ? (
              <p className={styles.muted}>{news.category.name}</p>
            ) : null}
            <p className={styles.description}>{news.summary}</p>
          </article>
        ))}
      </div>
      {!compact && result.data && result.data.meta.total > 0 ? (
        <PortalPager meta={result.data.meta} onPage={setPage} />
      ) : null}
    </section>
  )
}
