import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { usePortalResource } from '@/features/portal-shared/usePortalResource'
import { PortalFeedback, PortalPager } from '@/features/portal-shared/PortalUi'
import { publicationDate } from '@/features/portal-shared/portalApi'
import { listNews } from './newsApi'
import { NewsImage } from './NewsImage'
import styles from '@/features/portal-shared/portalShared.module.css'
import newsStyles from './news.module.css'

export function NewsList({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState({ page: 1, search: '' })
  const [search, setSearch] = useState('')
  const load = useCallback(
    (signal: AbortSignal) =>
      listNews({ ...query, per_page: compact ? 6 : 12 }, signal),
    [query, compact],
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
      ) : (
        <form
          className={newsStyles.search}
          role="search"
          aria-label="Buscar noticias institucionales"
          onSubmit={(event) => {
            event.preventDefault()
            setQuery({ page: 1, search: search.trim() })
          }}
        >
          <label className={styles.field}>
            Buscar noticias
            <input
              type="search"
              value={search}
              maxLength={200}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button type="submit">Buscar</button>
          {search || query.search ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setQuery({ page: 1, search: '' })
              }}
            >
              Limpiar búsqueda
            </button>
          ) : null}
        </form>
      )}
      <p className={styles.muted}>Más recientes primero</p>
      {!compact && query.search ? (
        <p className={newsStyles.searchTerm}>
          Resultados para: <strong>{query.search}</strong>
        </p>
      ) : null}
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
            <p className={styles.description}>{news.summary}</p>
          </article>
        ))}
      </div>
      {!compact && result.data && result.data.meta.total > 0 ? (
        <PortalPager
          meta={result.data.meta}
          onPage={(page) => setQuery({ ...query, page })}
        />
      ) : null}
    </section>
  )
}
