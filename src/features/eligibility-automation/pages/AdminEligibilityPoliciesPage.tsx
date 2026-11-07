import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import {
  EligibilityAutomationApiError,
  getEligibilityCriteria,
  getEligibilityCriterion,
  getEligibilityCriterionHistory,
  updateEligibilityCriterion,
  updateEligibilityCriterionStatus,
} from '../api/eligibilityAutomationApi'
import type { EligibilityCriteriaPage } from '../api/eligibilityAutomationApi'
import type {
  CatalogCriterion,
  CriterionAuditEntry,
  PageMeta,
} from '../types/eligibilityAutomation.types'
import styles from './EligibilityAutomation.module.css'
import {
  assessmentLabel,
  evaluationDateLabel,
  parameterLabel,
} from '../utils/automationPresentation'

type CriterionDraft = { name: string; description: string }

const EMPTY_META: PageMeta = {
  current_page: 1,
  per_page: 100,
  total: 0,
  last_page: 1,
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.'
}

function parameterSummary(criterion: CatalogCriterion): string[] {
  const rows = criterion.parameters.map((parameter) => {
    const restrictions = [
      parameter.minimum_exclusive !== undefined
        ? `mayor que ${parameter.minimum_exclusive}`
        : parameter.minimum !== undefined
          ? `desde ${parameter.minimum}`
          : null,
      parameter.maximum !== undefined ? `hasta ${parameter.maximum}` : null,
      parameter.min_items !== undefined
        ? `mínimo ${parameter.min_items} seleccionadas`
        : null,
    ].filter((value): value is string => value !== null)
    const options = parameter.options
      ?.map((key) => assessmentLabel(key))
      .join(', ')
    return `${parameterLabel(parameter.key)}${options ? `: ${options}` : ''}${restrictions.length ? ` (${restrictions.join('; ')})` : ''}`
  })

  if (criterion.fixed_parameters) {
    const fixed = criterion.fixed_parameters
    const assessments = Array.isArray(fixed.assessment_keys)
      ? fixed.assessment_keys
          .map((key) => assessmentLabel(String(key)))
          .join(' + ')
      : ''
    const operator =
      fixed.operator === 'GT'
        ? 'mayor que'
        : typeof fixed.operator === 'string'
          ? fixed.operator
          : ''
    const threshold =
      typeof fixed.threshold === 'number' ? String(fixed.threshold) : ''
    rows.push(
      [
        assessments,
        operator && threshold ? `Umbral ${operator} ${threshold}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    )
  }
  return rows
}

function historyAction(entry: CriterionAuditEntry): string {
  if (entry.action === 'ELIGIBILITY_CRITERION_STATUS_CHANGED') {
    return entry.new_values?.status === 'ACTIVE'
      ? 'Criterio activado'
      : 'Criterio desactivado'
  }
  if (entry.action === 'ELIGIBILITY_CRITERION_UPDATED') {
    const changes: string[] = []
    if (entry.old_values?.name !== entry.new_values?.name)
      changes.push('Nombre modificado')
    if (entry.old_values?.description !== entry.new_values?.description)
      changes.push('Descripción modificada')
    return changes.length ? changes.join(' · ') : 'Criterio actualizado'
  }
  return 'Actividad del criterio'
}

function historyChanges(entry: CriterionAuditEntry): string[] {
  const changes: string[] = []
  for (const [field, label] of [
    ['name', 'Nombre'],
    ['description', 'Descripción'],
  ] as const) {
    const before = entry.old_values?.[field]
    const after = entry.new_values?.[field]
    if (before !== after) {
      changes.push(
        `${label}: ${before == null || before === '' ? 'Sin valor' : String(before)} → ${after == null || after === '' ? 'Sin valor' : String(after)}`,
      )
    }
  }
  return changes
}

export function AdminEligibilityPoliciesPage() {
  const [criteria, setCriteria] = useState<CatalogCriterion[]>([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [catalogRevision, setCatalogRevision] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editingRevision, setEditingRevision] = useState(0)
  const [draft, setDraft] = useState<CriterionDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<CatalogCriterion | null>(
    null,
  )
  const [statusWorking, setStatusWorking] = useState(false)
  const [historyCode, setHistoryCode] = useState<string | null>(null)
  const [history, setHistory] = useState<CriterionAuditEntry[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const applyCriteria = useCallback((response: EligibilityCriteriaPage) => {
    setError('')
    setCriteria(response.data)
    setMeta(response.meta)
    setCatalogRevision(response.catalog_revision)
  }, [])

  const loadCriteria = useCallback(async () => {
    try {
      const response = await getEligibilityCriteria()
      applyCriteria(response)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoading(false)
    }
  }, [applyCriteria])

  useEffect(() => {
    let active = true
    void getEligibilityCriteria()
      .then((response) => {
        if (active) applyCriteria(response)
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyCriteria])

  function startEditing(criterion: CatalogCriterion) {
    setEditingCode(criterion.code)
    setEditingRevision(criterion.revision)
    setDraft({
      name: criterion.name,
      description: criterion.description ?? '',
    })
    setConflict(false)
    setError('')
    setNotice('')
  }

  function cancelEditing() {
    setEditingCode(null)
    setDraft(null)
    setConflict(false)
    setError('')
  }

  async function saveCriterion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingCode || !draft) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateEligibilityCriterion(editingCode, {
        revision: editingRevision,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
      })
      setCriteria((current) =>
        current.map((item) => (item.code === updated.code ? updated : item)),
      )
      setEditingCode(null)
      setDraft(null)
      setConflict(false)
      setNotice('Los datos del criterio fueron actualizados.')
      await loadCriteria()
    } catch (cause) {
      setError(messageOf(cause))
      setConflict(
        cause instanceof EligibilityAutomationApiError && cause.status === 409,
      )
    } finally {
      setSaving(false)
    }
  }

  async function refreshRevisionPreservingDraft() {
    if (!editingCode) return
    try {
      const current = await getEligibilityCriterion(editingCode)
      setCriteria((items) =>
        items.map((item) => (item.code === current.code ? current : item)),
      )
      setEditingRevision(current.revision)
      setConflict(false)
      setNotice(
        'Se actualizó la revisión del servidor. Tus cambios siguen en el formulario.',
      )
      setError('')
    } catch (cause) {
      setError(messageOf(cause))
    }
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return
    const criterion = pendingStatus
    const nextStatus = criterion.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setStatusWorking(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateEligibilityCriterionStatus(
        criterion.code,
        criterion.revision,
        nextStatus,
      )
      setCriteria((current) =>
        current.map((item) => (item.code === updated.code ? updated : item)),
      )
      setPendingStatus(null)
      setNotice(
        nextStatus === 'ACTIVE'
          ? 'El criterio fue activado para nuevas evaluaciones.'
          : 'El criterio fue desactivado para nuevas evaluaciones. Los resultados históricos no fueron modificados.',
      )
      await loadCriteria()
    } catch (cause) {
      setError(messageOf(cause))
      setPendingStatus(null)
    } finally {
      setStatusWorking(false)
    }
  }

  async function toggleHistory(criterion: CatalogCriterion) {
    if (historyCode === criterion.code) {
      setHistoryCode(null)
      setHistory(null)
      return
    }
    setHistoryCode(criterion.code)
    setHistory(null)
    setHistoryLoading(true)
    setError('')
    try {
      const response = await getEligibilityCriterionHistory(criterion.code)
      setHistory(response.data)
    } catch (cause) {
      setError(messageOf(cause))
      setHistoryCode(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <PageContainer labelledBy="eligibility-criteria-title">
      <PageHeader
        title="Criterios de habilitación"
        titleId="eligibility-criteria-title"
        description="Administra los criterios disponibles para la evaluación automática de habilitaciones."
        breadcrumbs={[
          { label: 'Administración', to: '/admin' },
          { label: 'Criterios de habilitación' },
        ]}
      />
      {error ? (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {conflict ? (
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={() => void refreshRevisionPreservingDraft()}
            >
              Cargar revisión actual conservando mis cambios
            </button>
          ) : null}
        </div>
      ) : null}
      {notice ? (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      ) : null}
      {loading ? <p role="status">Cargando criterios…</p> : null}
      {catalogRevision ? (
        <p className={styles.note}>Criterios disponibles: {meta.total}</p>
      ) : null}
      <section
        className={styles.criterionCatalog}
        aria-label="Catálogo de criterios"
      >
        {criteria.map((criterion) => (
          <article
            className={styles.criterionCatalogCard}
            key={criterion.code}
          >
            <header className={styles.criterionCatalogHeader}>
              <div>
                <h2>{criterion.name}</h2>
                <span
                  className={`${styles.status} ${criterion.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}`}
                >
                  {criterion.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className={styles.criterionCatalogActions}>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={() => startEditing(criterion)}
                  disabled={saving || statusWorking}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={() => setPendingStatus(criterion)}
                  disabled={saving || statusWorking}
                >
                  {criterion.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={() => void toggleHistory(criterion)}
                  disabled={historyLoading}
                >
                  {historyCode === criterion.code
                    ? 'Ocultar historial'
                    : 'Historial'}
                </button>
              </div>
            </header>
            <p>{criterion.description || 'Sin descripción disponible.'}</p>
            <dl className={styles.criterionCatalogSummary}>
              <div>
                <dt>Parámetros por examen</dt>
                <dd>
                  {parameterSummary(criterion).length ? (
                    <ul>
                      {parameterSummary(criterion).map((summary) => (
                        <li key={summary}>{summary}</li>
                      ))}
                    </ul>
                  ) : (
                    'Sin parámetros editables'
                  )}
                </dd>
              </div>
            </dl>
            {editingCode === criterion.code && draft ? (
              <form
                className={styles.criterionEditForm}
                onSubmit={(event) => void saveCriterion(event)}
              >
                <h3>Editar criterio</h3>
                <label>
                  Nombre
                  <input
                    required
                    maxLength={200}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.currentTarget.value })
                    }
                  />
                </label>
                <label>
                  Descripción
                  <textarea
                    maxLength={1000}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        description: event.currentTarget.value,
                      })
                    }
                  />
                </label>
                <div className={styles.policySaveActions}>
                  <button
                    type="submit"
                    className={sharedStyles.primaryButton}
                    disabled={saving || !draft.name.trim()}
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    disabled={saving}
                    onClick={cancelEditing}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}
            {historyCode === criterion.code ? (
              <section
                className={styles.criterionHistory}
                aria-label={`Historial de ${criterion.name}`}
              >
                <h3>Historial</h3>
                {historyLoading ? (
                  <p role="status">Cargando historial…</p>
                ) : history?.length ? (
                  history.map((entry) => (
                    <article key={entry.id}>
                      <h4>{historyAction(entry)}</h4>
                      <p>
                        {entry.user_id
                          ? `Usuario #${entry.user_id}`
                          : 'Responsable no disponible'}
                        {' · '}
                        <time dateTime={entry.created_at}>
                          {evaluationDateLabel(entry.created_at)}
                        </time>
                      </p>
                      {historyChanges(entry).map((change) => (
                        <p key={change}>{change}</p>
                      ))}
                    </article>
                  ))
                ) : (
                  <p>No hay cambios registrados para este criterio.</p>
                )}
              </section>
            ) : null}
          </article>
        ))}
        {!loading && criteria.length === 0 && !error ? (
          <p role="status">No hay criterios disponibles.</p>
        ) : null}
      </section>
      {pendingStatus ? (
        <div
          className={styles.criterionStatusDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="criterion-status-title"
        >
          <div className={styles.panel}>
            <h2 id="criterion-status-title">
              {pendingStatus.status === 'ACTIVE'
                ? '¿Desactivar este criterio?'
                : '¿Activar este criterio?'}
            </h2>
            <p>
              {pendingStatus.status === 'ACTIVE'
                ? 'Los nuevos cálculos dejarán de utilizar este criterio. Los resultados históricos no serán modificados.'
                : 'Este criterio estará disponible para configuraciones y nuevos cálculos.'}
            </p>
            <p>
              <strong>{pendingStatus.name}</strong>
            </p>
            <div className={styles.policySaveActions}>
              <button
                type="button"
                className={sharedStyles.primaryButton}
                disabled={statusWorking}
                onClick={() => void confirmStatusChange()}
              >
                {statusWorking ? 'Actualizando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={statusWorking}
                onClick={() => setPendingStatus(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}
