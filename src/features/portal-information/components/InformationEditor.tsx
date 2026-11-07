import { useEffect, useId, useState } from 'react'
import { useRevisionEditor } from '@/features/portal-shared/hooks/useRevisionEditor'
import { EditorFeedback, PortalField } from '@/features/portal-shared/components/PortalUi'
import {
  createFaq,
  getInformationContent,
  publishInformation,
  saveInformation,
} from '../api/informationApi'
import { InformationContent } from '../pages/InformationPage'
import type {
  AdminInformation,
  InformationKind,
  SectionDraft,
  FaqDraft,
} from '../types/information.types'
import styles from '@/features/portal-shared/components/portalShared.module.css'

function formOf(item: AdminInformation | null) {
  const draft = item?.draft
  return {
    title: draft && 'title' in draft ? draft.title : '',
    description: draft && 'description' in draft ? draft.description : '',
    links:
      draft && 'links' in draft ? draft.links.map((link) => ({ ...link })) : [],
    question: draft && 'question' in draft ? draft.question : '',
    answer: draft && 'answer' in draft ? draft.answer : '',
    sort_order: draft?.sort_order ?? 0,
  }
}

export function InformationEditor({
  kind,
  initial,
  onSaved,
  onBusy,
}: {
  kind: InformationKind
  initial: AdminInformation | null
  onSaved: () => void
  onBusy: (busy: boolean) => void
}) {
  const editor = useRevisionEditor(initial)
  const [form, setForm] = useState(() => formOf(initial))
  const [pending, setPending] = useState<'publish' | 'unpublish' | null>(null)
  const item = editor.snapshot
  const formId = useId()
  useEffect(() => {
    onBusy(editor.busy)
  }, [editor.busy, onBusy])
  const fields = editor.error?.fields ?? {}
  async function save() {
    const input: SectionDraft | FaqDraft =
      kind === 'sections'
        ? {
            title: form.title,
            description: form.description,
            links: form.links,
            sort_order: form.sort_order,
          }
        : {
            question: form.question,
            answer: form.answer,
            sort_order: form.sort_order,
          }
    if (!item && kind !== 'faqs') return
    const result = await editor.mutate(() =>
      item
        ? saveInformation(kind, item.id, input, item.revision)
        : createFaq(input as FaqDraft),
    )
    if (result) {
      setForm(formOf(result))
      onSaved()
    }
  }
  async function publish() {
    if (!item || !pending) return
    const result = await editor.mutate(() =>
      publishInformation(kind, item.id, pending === 'publish', item.revision),
    )
    if (result) {
      setPending(null)
      onSaved()
    }
  }
  async function refresh() {
    if (!item) return
    const result = await editor.refresh((signal) =>
      getInformationContent(kind, item.id, signal),
    )
    if (result) {
      setForm(formOf(result))
      setPending(null)
    }
  }
  return (
    <div className={styles.page}>
      {item ? (
        <>
          <p className={styles.informationMetadata}>
            Visibilidad: {item.is_published ? 'Publicado' : 'Despublicado'} ·
            Revisión: {item.revision}
          </p>
          <p className={styles.informationChanges} role="status">
            {item.has_unpublished_changes
              ? 'Hay cambios guardados pendientes de publicar.'
              : 'Sin cambios pendientes.'}
          </p>
          <section
            className={`${styles.preview} ${styles.publishedVersion}`}
            aria-label="Versión publicada"
          >
            <h3>
              {item.is_published
                ? 'Versión publicada'
                : 'Última versión publicada (fuera del portal)'}
            </h3>
            {item.published ? (
              <InformationContent content={item.published} />
            ) : (
              <p>Este contenido todavía no tiene una versión publicada.</p>
            )}
          </section>
        </>
      ) : (
        <p>La FAQ se creará como borrador, sin publicar.</p>
      )}
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <fieldset
          className={styles.editorFields}
          disabled={editor.locked || pending !== null}
        >
          <legend>Borrador</legend>
          {(kind === 'sections'
            ? (['title', 'description'] as const)
            : (['question', 'answer'] as const)
          ).map((field) => (
            <PortalField
              key={field}
              label={
                {
                  title: 'Título',
                  description: 'Descripción',
                  question: 'Pregunta',
                  answer: 'Respuesta',
                }[field]
              }
              error={fields[field]}
            >
              <textarea
                name={field}
                value={form[field]}
                required
                maxLength={
                  field === 'title' ? 200 : field === 'question' ? 500 : 10000
                }
                rows={field === 'title' || field === 'question' ? 2 : 6}
                aria-invalid={!!fields[field]}
                onChange={(event) => {
                  setForm({ ...form, [field]: event.target.value })
                  editor.clearError()
                }}
              />
            </PortalField>
          ))}
          <PortalField label="Orden" error={fields.sort_order}>
            <input
              type="number"
              name="sort_order"
              min={0}
              max={100000}
              step={1}
              value={form.sort_order}
              required
              onChange={(event) =>
                setForm({ ...form, sort_order: Number(event.target.value) })
              }
            />
          </PortalField>
          {kind === 'sections' ? (
            <section>
              <h3>Enlaces</h3>
              {form.links.map((link, index) => (
                <div key={index} className={styles.linkRow}>
                  <PortalField
                    label="Texto del enlace"
                    error={fields[`links.${index}.label`]}
                  >
                    <input
                      name={`links.${index}.label`}
                      value={link.label}
                      maxLength={100}
                      required
                      onChange={(event) =>
                        setForm({
                          ...form,
                          links: form.links.map((value, i) =>
                            i === index
                              ? { ...value, label: event.target.value }
                              : value,
                          ),
                        })
                      }
                    />
                  </PortalField>
                  <PortalField
                    label="Destino del enlace"
                    error={fields[`links.${index}.url`]}
                  >
                    <input
                      name={`links.${index}.url`}
                      value={link.url}
                      maxLength={2048}
                      required
                      onChange={(event) =>
                        setForm({
                          ...form,
                          links: form.links.map((value, i) =>
                            i === index
                              ? { ...value, url: event.target.value }
                              : value,
                          ),
                        })
                      }
                    />
                  </PortalField>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        links: form.links.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Quitar enlace
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={form.links.length >= 20}
                onClick={() =>
                  setForm({
                    ...form,
                    links: [...form.links, { label: '', url: '' }],
                  })
                }
              >
                Agregar enlace
              </button>
              <p className={styles.muted}>
                Destinos HTTPS, rutas internas o correo autorizado. El servidor
                valida cada enlace.
              </p>
            </section>
          ) : null}
        </fieldset>
      </form>
      {pending ? (
        <section className={styles.notice}>
          <p>
            {pending === 'publish'
              ? 'Se publicará el borrador guardado completo. Los cambios del formulario deben guardarse primero.'
              : 'El contenido dejará de aparecer en público. Se conservarán el borrador y la última versión publicada.'}
          </p>
          <button
            type="button"
            disabled={editor.locked}
            onClick={() => setPending(null)}
          >
            Volver
          </button>
          <button
            type="button"
            disabled={editor.locked}
            onClick={() => void publish()}
          >
            Confirmar operación
          </button>
        </section>
      ) : null}
      <div className={styles.editorActions}>
        <button
          type="submit"
          form={formId}
          className={`${styles.primary} ${styles.saveDraft}`}
          disabled={editor.locked || pending !== null}
        >
          {item ? 'Guardar borrador' : 'Crear FAQ'}
        </button>
        {item ? (
          <>
            <button
              type="button"
              className={styles.publishAction}
              disabled={editor.locked || pending !== null}
              onClick={() => setPending('publish')}
            >
              {item.is_published ? 'Publicar cambios' : 'Publicar'}
            </button>
            {item.is_published ? (
              <button
                type="button"
                className={styles.unpublishAction}
                disabled={editor.locked || pending !== null}
                onClick={() => setPending('unpublish')}
              >
                Despublicar
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      <EditorFeedback {...editor} onRefresh={() => void refresh()} />
    </div>
  )
}
