import { useEffect, useRef, useState } from 'react'
import { useRevisionEditor } from '@/features/portal-shared/hooks/useRevisionEditor'
import { EditorFeedback, PortalField } from '@/features/portal-shared/components/PortalUi'
import {
  createNews,
  editNews,
  getAdminNews,
  removeNewsImage,
  setNewsStatus,
  uploadNewsImage,
} from '../api/newsApi'
import { AuthenticatedNewsImage } from './NewsImage'
import { publicationDate } from '@/features/portal-shared/api/portalApi'
import { NEWS_STATUS_LABELS, type AdminNews, type NewsStatus } from '../types/news.types'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import adminStyles from '../pages/adminNews.module.css'

const draftOf = (news: AdminNews | null) => ({
  title: news?.title ?? '',
  summary: news?.summary ?? '',
  content: news?.content ?? '',
})

export function NewsEditor({
  initial,
  onSaved,
  onBusy,
}: {
  initial: AdminNews | null
  onSaved: (news: AdminNews) => void
  onBusy: (busy: boolean) => void
}) {
  const editor = useRevisionEditor(initial)
  const [draft, setDraft] = useState(() => draftOf(initial))
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState<NewsStatus | null>(null)
  const [removing, setRemoving] = useState(false)
  const feedback = useRef<HTMLDivElement>(null)
  const news = editor.snapshot
  useEffect(() => {
    onBusy(editor.busy)
  }, [editor.busy, onBusy])
  useEffect(() => {
    if (editor.error) feedback.current?.focus()
  }, [editor.error])
  async function apply(action: () => Promise<AdminNews>, reset = false) {
    const result = await editor.mutate(action)
    if (result) {
      if (reset) setDraft(draftOf(result))
      setPending(null)
      setRemoving(false)
      setFile(null)
      onSaved(result)
    }
  }
  async function refresh() {
    if (!news) return
    const current = await editor.refresh((signal) =>
      getAdminNews(news.id, signal),
    )
    if (current) {
      setDraft(draftOf(current))
      setPending(null)
      setRemoving(false)
      setFile(null)
    }
  }
  const fields = editor.error?.fields ?? {}
  return (
    <div className={adminStyles.editor} aria-busy={editor.busy}>
      {news ? (
        <p>
          Estado: {NEWS_STATUS_LABELS[news.status]} · Revisión: {news.revision}
        </p>
      ) : (
        <p>
          La noticia se creará como borrador. Puedes añadir una imagen opcional
          después de guardarla.
        </p>
      )}
      {news ? (
        <dl className={adminStyles.metadata} aria-label="Datos de la noticia">
          <div>
            <dt>Fecha de publicación</dt>
            <dd>{publicationDate(news.published_at)}</dd>
          </div>
          {news.created_by != null ? (
            <div>
              <dt>Creada por</dt>
              <dd>ID {news.created_by}</dd>
            </div>
          ) : null}
          {news.updated_by != null ? (
            <div>
              <dt>Última modificación por</dt>
              <dd>ID {news.updated_by}</dd>
            </div>
          ) : null}
          {news.published_by != null ? (
            <div>
              <dt>Publicada por</dt>
              <dd>ID {news.published_by}</dd>
            </div>
          ) : null}
          {news.created_at ? (
            <div>
              <dt>Fecha de creación</dt>
              <dd>{publicationDate(news.created_at)}</dd>
            </div>
          ) : null}
          {news.updated_at ? (
            <div>
              <dt>Fecha de actualización</dt>
              <dd>{publicationDate(news.updated_at)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {editor.busy ? <p role="status">Procesando noticia…</p> : null}
      {news?.status === 'PUBLISHED' ? (
        <p className={styles.notice}>
          Guardar cambia el contenido público inmediatamente. Despublica primero
          para preparar cambios fuera del portal.
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void apply(
            () =>
              news
                ? editNews(news.id, draft, news.revision)
                : createNews(draft),
            true,
          )
        }}
      >
        <fieldset
          className={styles.editorFields}
          disabled={editor.locked || pending !== null || removing}
        >
          <legend>Contenido de la noticia</legend>
          {(['title', 'summary', 'content'] as const).map((field) => (
            <PortalField
              key={field}
              label={
                { title: 'Título', summary: 'Resumen', content: 'Contenido' }[
                  field
                ]
              }
              error={fields[field]}
            >
              {field === 'title' ? (
                <input
                  name={field}
                  value={draft[field]}
                  maxLength={200}
                  required
                  aria-invalid={!!fields[field]}
                  onChange={(event) => {
                    setDraft({ ...draft, [field]: event.target.value })
                    editor.clearError()
                  }}
                />
              ) : (
                <textarea
                  name={field}
                  value={draft[field]}
                  rows={field === 'content' ? 7 : 3}
                  maxLength={field === 'content' ? 50000 : 1000}
                  required
                  aria-invalid={!!fields[field]}
                  onChange={(event) => {
                    setDraft({ ...draft, [field]: event.target.value })
                    editor.clearError()
                  }}
                />
              )}
            </PortalField>
          ))}
        </fieldset>
        <button
          type="submit"
          className={styles.primary}
          disabled={editor.locked || pending !== null || removing}
        >
          {news ? 'Guardar noticia' : 'Crear borrador'}
        </button>
      </form>
      {news ? (
        <>
          <section className={styles.preview}>
            <h3>Imagen</h3>
            {news.image_url ? (
              <AuthenticatedNewsImage
                url={news.image_url}
                title={news.title}
                revision={news.revision}
              />
            ) : (
              <p>La noticia no tiene imagen.</p>
            )}
            <PortalField
              label="Imagen JPEG, PNG o WebP (máximo 5 MiB)"
              error={fields.image}
            >
              <input
                key={news.revision}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={editor.locked || pending !== null || removing}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </PortalField>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={
                  editor.locked || !file || pending !== null || removing
                }
                onClick={() => {
                  if (file)
                    void apply(() =>
                      uploadNewsImage(news.id, file, news.revision),
                    )
                }}
              >
                Subir imagen
              </button>
              {news.image_url ? (
                <button
                  type="button"
                  disabled={editor.locked || pending !== null || removing}
                  onClick={() => setRemoving(true)}
                >
                  Eliminar imagen
                </button>
              ) : null}
            </div>
          </section>
          <p className={styles.muted}>
            Los cambios de estado e imagen usan el contenido guardado.
          </p>
          <div className={styles.actions}>
            {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
              .filter((status) => status !== news.status)
              .map((status) => (
                <button
                  type="button"
                  key={status}
                  disabled={editor.locked || pending !== null || removing}
                  onClick={() => setPending(status)}
                >
                  {status === 'DRAFT'
                    ? news.status === 'PUBLISHED'
                      ? 'Despublicar'
                      : 'Volver a borrador'
                    : status === 'PUBLISHED'
                      ? 'Publicar'
                      : 'Archivar'}
                </button>
              ))}
          </div>
          {pending || removing ? (
            <section className={styles.notice}>
              <p>
                {removing
                  ? '¿Eliminar únicamente la imagen de esta noticia?'
                  : `¿Cambiar la noticia a ${NEWS_STATUS_LABELS[pending!].toLowerCase()}?`}
              </p>
              <button
                type="button"
                disabled={editor.locked}
                onClick={() => {
                  setPending(null)
                  setRemoving(false)
                }}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={editor.locked}
                onClick={() =>
                  void apply(() =>
                    removing
                      ? removeNewsImage(news.id, news.revision)
                      : setNewsStatus(news.id, pending!, news.revision),
                  )
                }
              >
                Confirmar operación
              </button>
            </section>
          ) : null}
        </>
      ) : null}
      <div ref={feedback} tabIndex={-1}>
        <EditorFeedback {...editor} onRefresh={() => void refresh()} />
      </div>
    </div>
  )
}
