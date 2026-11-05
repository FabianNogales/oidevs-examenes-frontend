import { useState } from 'react'
import { useRelatedInfractions } from '../hooks/useExpulsionQuery'
import {
  INFRACTION_TYPE_LABELS,
  INFRACTION_STATUS_LABELS,
} from '@/features/infractions/utils/infractionValidation'
import type { RelatedInfraction } from '../types/expulsion.types'
import styles from '@/features/incidents/components/IncidentForm.module.css'
export function RelatedInfractionPicker({
  examId,
  studentId,
  value,
  onChange,
  disabled,
}: {
  examId: number
  studentId: number
  value: RelatedInfraction | null
  onChange: (v: RelatedInfraction | null) => void
  disabled: boolean
}) {
  const [page, setPage] = useState(1)
  const query = useRelatedInfractions(examId, studentId, page)
  return (
    <fieldset className={styles.student} disabled={disabled}>
      <legend>Infracción relacionada (opcional)</legend>
      <p>
        Solo se ofrecen registros del mismo estudiante y examen autorizados por
        el servidor. Vincular no confirma una falta automáticamente.
      </p>
      {value ? (
        <div className={styles.selected}>
          <span>
            #{value.id} · {INFRACTION_TYPE_LABELS[value.type]} ·{' '}
            {INFRACTION_STATUS_LABELS[value.status]}
          </span>
          <button type="button" onClick={() => onChange(null)}>
            Quitar asociación
          </button>
        </div>
      ) : (
        <>
          <p>Sin infracción vinculada.</p>
          {query.loading ? (
            <p role="status">Consultando infracciones…</p>
          ) : query.error ? (
            <div role="alert">
              <p>{query.error}</p>
              <button type="button" onClick={query.retry}>
                Reintentar consulta
              </button>
            </div>
          ) : query.data?.data.length ? (
            <ul className={styles.results}>
              {query.data.data.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => onChange(v)}>
                    Vincular #{v.id} · {INFRACTION_TYPE_LABELS[v.type]} ·{' '}
                    {INFRACTION_STATUS_LABELS[v.status]}
                    <small>{v.description}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay infracciones disponibles para este estudiante.</p>
          )}
          {query.data && query.data.meta.last_page > 1 && (
            <div className={styles.actions}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} de {query.data.meta.last_page}
              </span>
              <button
                type="button"
                disabled={page === query.data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </fieldset>
  )
}
