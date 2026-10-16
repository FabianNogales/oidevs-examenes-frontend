import { useCallback, useState } from 'react'
import { useOfferingPeriods } from '../hooks/useOfferingPeriods'
import { OfferingManualForm } from './OfferingManualForm'
import { OfferingImportPanel } from './OfferingImportPanel'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingWorkspace({
  teacherId,
  onSaved,
  onBusy,
}: {
  teacherId?: number
  onSaved: () => void
  onBusy: (busy: boolean) => void
}) {
  const { state, reload } = useOfferingPeriods()
  const [selection, setSelection] = useState<string | null>(null)
  const [tab, setTab] = useState<'manual' | 'csv'>('manual')
  const [busy, setBusy] = useState(false)
  const changeBusy = useCallback(
    (value: boolean) => {
      setBusy(value)
      onBusy(value)
    },
    [onBusy],
  )
  if (!state) return <p role="status">Cargando periodos para asignar…</p>
  if (state.status === 'error')
    return (
      <div className={styles.error} role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  const active = state.periods.filter((term) => term.status === 'ACTIVE')
  const termId = selection ?? (active.length === 1 ? String(active[0].id) : '')
  const term = active.find((item) => String(item.id) === termId)
  return (
    <section className={styles.workspace} aria-label="Registrar asignaciones">
      <label className={styles.filter}>
        Periodo académico *
        <select
          value={termId}
          disabled={busy || active.length !== 1}
          onChange={(event) => {
            if (
              termId &&
              !window.confirm(
                'Cambiar el periodo descartará la selección y la vista previa actuales. ¿Continuar?',
              )
            )
              return
            setSelection(event.target.value)
          }}
        >
          <option value="">Selecciona un periodo activo</option>
          {active.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </label>
      {active.length !== 1 && (
        <p role="alert" className={styles.error}>
          {active.length
            ? 'Hay más de un periodo activo. Revisa su configuración antes de asignar.'
            : 'No hay un periodo activo. Activa uno en Periodos académicos antes de asignar materias.'}
        </p>
      )}
      {term && (
        <>
          <p className={styles.scopeHint}>
            Las nuevas ofertas se registrarán en <strong>{term.name}</strong>.
            Para consultar otros periodos utiliza el listado inferior.
          </p>
          <div
            className={styles.tabs}
            role="group"
            aria-label="Método de asignación"
          >
            <button
              type="button"
              disabled={busy}
              aria-pressed={tab === 'manual'}
              onClick={() => setTab('manual')}
            >
              Asignación manual
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={tab === 'csv'}
              onClick={() => setTab('csv')}
            >
              Importar CSV
            </button>
          </div>
          <div hidden={tab !== 'manual'}>
            <OfferingManualForm
              key={`manual-${term.id}-${teacherId}`}
              termId={term.id}
              teacherId={teacherId}
              onBusy={changeBusy}
              onSaved={onSaved}
            />
          </div>
          <div hidden={tab !== 'csv'}>
            <OfferingImportPanel
              key={`csv-${term.id}`}
              termId={term.id}
              onBusy={changeBusy}
              onSaved={onSaved}
            />
          </div>
        </>
      )}
    </section>
  )
}
