import { useEffect, useId, useState } from 'react'
import type { ChoicePage, OfferingChoice } from '../api/offeringChoicesApi'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingEntityPicker({
  title,
  multiple = false,
  selected,
  onChange,
  load,
  disabled = false,
}: {
  title: string
  multiple?: boolean
  selected: OfferingChoice[]
  onChange: (values: OfferingChoice[]) => void
  load: (
    page: number,
    search: string,
    signal: AbortSignal,
  ) => Promise<ChoicePage>
  disabled?: boolean
}) {
  const id = useId()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data?: ChoicePage
    error?: string
  } | null>(null)
  const key = JSON.stringify([page, search, revision])
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      load(page, search.trim(), controller.signal).then(
        (data) => {
          if (!controller.signal.aborted) setResult({ key, data })
        },
        () => {
          if (!controller.signal.aborted)
            setResult({
              key,
              error: `No se pudo cargar ${title.toLowerCase()}. Reintenta la consulta.`,
            })
        },
      )
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [page, search, revision, key, load, title])
  const state = result?.key === key ? result : null
  function toggle(item: OfferingChoice) {
    if (!multiple) onChange([item])
    else
      onChange(
        selected.some((value) => value.id === item.id)
          ? selected.filter((value) => value.id !== item.id)
          : [...selected, item],
      )
  }
  return (
    <fieldset disabled={disabled}>
      <legend>{title} *</legend>
      <label className={styles.filter} htmlFor={`${id}-search`}>
        Buscar por nombre o código
        <input
          id={`${id}-search`}
          value={search}
          maxLength={100}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
      </label>
      {selected.length > 0 && (
        <div className={styles.selection} aria-label="Selección actual">
          {selected.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange(selected.filter((value) => value.id !== item.id))
              }
              aria-label={`Quitar ${item.label}`}
            >
              {item.label} ×
            </button>
          ))}
        </div>
      )}
      {!state && <p role="status">Cargando opciones…</p>}
      {state?.error && (
        <div role="alert" className={styles.error}>
          {state.error}{' '}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {state?.data && (
        <>
          <div className={styles.options}>
            {state.data.items.map((item) => (
              <label key={item.id} className={styles.option}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={id}
                  checked={selected.some((value) => value.id === item.id)}
                  onChange={() => toggle(item)}
                />
                <span>
                  {item.label}
                  <small>{item.detail}</small>
                </span>
              </label>
            ))}
            {!state.data.items.length && (
              <p role="status">
                No hay opciones activas en esta página. Prueba otra búsqueda o
                página.
              </p>
            )}
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {state.data.lastPage}
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page >= state.data.lastPage}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </fieldset>
  )
}
