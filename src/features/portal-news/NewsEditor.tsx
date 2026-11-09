import { useEffect, useId, useRef, useState } from 'react'
import { AdminStatusBadge } from '@/features/portal-shared/AdminStatusBadge'
import { useRevisionEditor } from '@/features/portal-shared/useRevisionEditor'
import { EditorFeedback, PortalField } from '@/features/portal-shared/PortalUi'
import {
  createNews,
  editNews,
  getAdminNews,
  removeNewsImage,
  setNewsStatus,
  uploadNewsImage,
} from './newsApi'
import { AuthenticatedNewsImage } from './NewsImage'
import { publicationDate } from '@/features/portal-shared/portalApi'
import {
  NEWS_STATUS_LABELS,
  type AdminNews,
  type NewsCategory,
  type NewsEditInput,
  type NewsStatus,
} from './types'
import styles from '@/features/portal-shared/portalShared.module.css'
import adminStyles from './adminNews.module.css'

const categoryValue = (news: AdminNews | null) =>
  news?.category ? String(news.category.id) : ''

const draftOf = (news: AdminNews | null) => ({
  title: news?.title ?? '',
  summary: news?.summary ?? '',
  content: news?.content ?? '',
  category_id: categoryValue(news),
})

type EditorState = { label: string; disabled: boolean }

// Active categories from GET /admin/portal/news-categories (loaded by the caller).
export type NewsCategoryOptions = {
  data: NewsCategory[] | null
  loading: boolean
  error: { message: string } | null
  reload: () => void
}

export function NewsEditor({
  initial,
  categories,
  onSaved,
  onBusy,
  onDirty,
  onStateChange,
  formId,
}: {
  initial: AdminNews | null
  categories: NewsCategoryOptions
  onSaved: (news: AdminNews) => void
  onBusy: (busy: boolean) => void
  onDirty?: (dirty: boolean) => void
  onStateChange?: (state: EditorState) => void
  formId?: string
}) {
  const generatedId = useId()
  const editorFormId = formId ?? `news-editor-${generatedId}`
  const editor = useRevisionEditor(initial)
  const [draft, setDraft] = useState(() => draftOf(initial))
  const [file, setFile] = useState<File | null>(null)
  const [imageInputVersion, setImageInputVersion] = useState(0)
  const [pending, setPending] = useState<NewsStatus | null>(null)
  const [removing, setRemoving] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const news = editor.snapshot
  const activeCategories = categories.data ?? []
  // The current category is kept as a historical, non-selectable value when it
  // is no longer active (or is null for news created before categories).
  const currentCategory = news?.category ?? null
  const currentInactive =
    !!currentCategory &&
    !activeCategories.some((category) => category.id === currentCategory.id)
  // Creating requires an active category; block it while none can be offered.
  const categoriesUnavailable = !news && activeCategories.length === 0
  const isUnpublishing =
    !!news && !removing && pending === 'DRAFT' && news.status === 'PUBLISHED'
  const dirtyText = JSON.stringify(draft) !== JSON.stringify(draftOf(news))
  const dirty =
    dirtyText || file !== null || pending !== null || removing
  const locked = editor.locked || pending !== null || removing
  const submitLabel = news ? 'Guardar noticia' : 'Crear borrador'
  const submitDisabled = locked || categoriesUnavailable
  useEffect(() => {
    onBusy(editor.busy)
  }, [editor.busy, onBusy])
  useEffect(() => {
    if (editor.error) feedback.current?.focus()
  }, [editor.error])
  useEffect(() => {
    onDirty?.(dirty)
  }, [dirty, onDirty])
  useEffect(() => {
    onStateChange?.({ label: submitLabel, disabled: submitDisabled })
  }, [submitDisabled, submitLabel, onStateChange])
  async function apply(
    action: () => Promise<AdminNews>,
    reset = false,
    resetImage = false,
  ) {
    const result = await editor.mutate(action)
    if (result) {
      if (reset) setDraft(draftOf(result))
      setPending(null)
      setRemoving(false)
      if (resetImage) {
        setFile(null)
        setImageInputVersion((version) => version + 1)
      }
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
      setCategoryError(null)
      setPending(null)
      setRemoving(false)
      setFile(null)
      setImageInputVersion((version) => version + 1)
    }
  }
  function save() {
    if (submitDisabled) return
    const { category_id: selected, ...text } = draft
    const categoryId = Number(selected)
    const changed = selected !== categoryValue(news)
    // Only a newly chosen category must be active; an unchanged one is omitted.
    if (
      (!news || changed) &&
      !activeCategories.some((category) => category.id === categoryId)
    ) {
      setCategoryError('Selecciona una categoría activa.')
      return
    }
    setCategoryError(null)
    const input: NewsEditInput = changed
      ? { ...text, category_id: categoryId }
      : text
    void apply(
      () =>
        news
          ? editNews(news.id, input, news.revision)
          : createNews({ ...text, category_id: categoryId }),
      true,
    )
  }
  const fields = editor.error?.fields ?? {}
  return (
    <div className={adminStyles.editor} aria-busy={editor.busy}>
      <section
        className={adminStyles.editorStatus}
        aria-label="Estado de la noticia"
      >
        <div className={adminStyles.editorStatusRow}>
          <span>Estado: </span>
          <AdminStatusBadge status={news?.status ?? 'DRAFT'} />
          <span className={adminStyles.editorRevision}>
            {news ? `Revisión: ${news.revision}` : 'Nueva noticia'}
          </span>
        </div>
        {news ? (
          <dl className={adminStyles.metadata} aria-label="Datos de la noticia">
            <div>
              <dt>Fecha de publicación</dt>
              <dd>{publicationDate(news.published_at)}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>
                {currentCategory
                  ? `${currentCategory.name}${currentInactive && !categories.loading ? ' (no disponible para nuevas asignaciones)' : ''}`
                  : 'Sin categoría'}
              </dd>
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
        ) : (
          <p className={styles.muted}>
            La noticia se creará como borrador. Puedes añadir una imagen
            opcional después de guardarla.
          </p>
        )}
      </section>
      {editor.busy ? <p role="status">Procesando noticia…</p> : null}
      {news?.status === 'PUBLISHED' ? (
        <p className={styles.notice}>
          Guardar cambia el contenido público inmediatamente. Despublica primero
          para preparar cambios fuera del portal.
        </p>
      ) : null}
      <form
        id={editorFormId}
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <section className={adminStyles.editorSection}>
          <div className={adminStyles.editorSectionHeading}>
            <h3>Contenido</h3>
            <p>Texto que se mostrará en el portal institucional.</p>
          </div>
          <fieldset className={styles.editorFields} disabled={locked}>
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
            <PortalField
              label="Categoría"
              error={fields.category_id ?? categoryError ?? undefined}
            >
              <select
                name="category_id"
                value={draft.category_id}
                // Only creation requires a category. Legacy news keep "Sin
                // categoría" (value ""), which native validation would block.
                required={!news}
                aria-invalid={!!(fields.category_id ?? categoryError)}
                onChange={(event) => {
                  setDraft({ ...draft, category_id: event.target.value })
                  setCategoryError(null)
                  editor.clearError()
                }}
              >
                {currentCategory ? null : (
                  <option value="" disabled>
                    {news ? 'Sin categoría' : 'Selecciona una categoría'}
                  </option>
                )}
                {currentInactive && currentCategory ? (
                  <option value={currentCategory.id} disabled>
                    {currentCategory.name} (categoría actual)
                  </option>
                ) : null}
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </PortalField>
            {categories.loading ? (
              <p role="status" className={styles.muted}>
                Cargando categorías…
              </p>
            ) : categories.error ? (
              <div role="alert" className={styles.error}>
                <p>{categories.error.message}</p>
                <button type="button" onClick={categories.reload}>
                  Reintentar
                </button>
              </div>
            ) : activeCategories.length === 0 ? (
              <p role="status" className={styles.notice}>
                {news
                  ? 'No hay categorías activas. Se conservará la categoría actual.'
                  : 'No hay categorías activas. Activa o crea una categoría antes de crear noticias.'}
              </p>
            ) : null}
          </fieldset>
        </section>
        {news ? (
          <>
            <section className={adminStyles.editorSection}>
              <div className={adminStyles.editorSectionHeading}>
                <h3>Imagen</h3>
                <p>Imagen opcional de la noticia y su vista previa.</p>
              </div>
              <div className={adminStyles.imagePanel}>
                {news.image_url ? (
                  <AuthenticatedNewsImage
                    url={news.image_url}
                    title={news.title}
                    revision={news.revision}
                  />
                ) : (
                  <p className={styles.muted}>La noticia no tiene imagen.</p>
                )}
              </div>
              <PortalField
                label="Imagen JPEG, PNG o WebP (máximo 5 MiB)"
                error={fields.image}
              >
                <input
                  key={imageInputVersion}
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={locked}
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                />
              </PortalField>
              <div className={adminStyles.editorActionsRow}>
                <button
                  type="button"
                  disabled={locked || !file}
                  onClick={() => {
                    if (file)
                      void apply(
                        () => uploadNewsImage(news.id, file, news.revision),
                        false,
                        true,
                      )
                  }}
                >
                  Subir imagen
                </button>
                {news.image_url ? (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setRemoving(true)}
                  >
                    Eliminar imagen
                  </button>
                ) : null}
              </div>
            </section>
            <section className={adminStyles.editorSection}>
              <div className={adminStyles.editorSectionHeading}>
                <h3>Publicación y archivo</h3>
                <p>
                  Cambia el estado de la noticia sin modificar su contenido.
                </p>
              </div>
              <p className={styles.muted}>
                Los cambios de estado e imagen usan el contenido guardado.
              </p>
              <div className={adminStyles.editorActionsRow}>
                {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
                  .filter((status) => status !== news.status)
                  .map((status) => (
                    <button
                      type="button"
                      key={status}
                      disabled={locked}
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
                <section
                  className={adminStyles.confirmation}
                  aria-labelledby="news-action-confirmation-title"
                >
                  <div>
                    <h3 id="news-action-confirmation-title">
                      {removing
                        ? '¿Eliminar únicamente la imagen de esta noticia?'
                        : isUnpublishing
                          ? '¿Cambiar la noticia a borrador?'
                          : `¿Cambiar la noticia a ${NEWS_STATUS_LABELS[pending!].toLowerCase()}?`}
                    </h3>
                    {isUnpublishing ? (
                      <p>La noticia dejará de mostrarse públicamente.</p>
                    ) : null}
                  </div>
                  <div className={adminStyles.confirmationActions}>
                    <button
                      type="button"
                      disabled={editor.locked}
                      onClick={() => {
                        setPending(null)
                        setRemoving(false)
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={adminStyles.confirmationPrimary}
                      disabled={editor.locked}
                      onClick={() =>
                        void apply(
                          () =>
                            removing
                              ? removeNewsImage(news.id, news.revision)
                              : setNewsStatus(news.id, pending!, news.revision),
                          false,
                          removing,
                        )
                      }
                    >
                      {isUnpublishing ? 'Despublicar' : 'Confirmar operación'}
                    </button>
                  </div>
                </section>
              ) : null}
            </section>
          </>
        ) : null}
        {!formId ? (
          <div className={adminStyles.editorInlineFooter}>
            <button
              type="submit"
              className={styles.primary}
              disabled={submitDisabled}
            >
              {submitLabel}
            </button>
          </div>
        ) : null}
      </form>
      <div ref={feedback} tabIndex={-1}>
        <EditorFeedback {...editor} onRefresh={() => void refresh()} />
      </div>
    </div>
  )
}
