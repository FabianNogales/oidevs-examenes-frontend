import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from '@/features/exams/pages/TeacherExamsPage.module.css'
import {
  activateEligibilityPolicy,
  createEligibilityPolicy,
  createEligibilityPolicyVersion,
  EligibilityAutomationApiError,
  getEligibilityPolicies,
  getEligibilityPolicy,
  updateEligibilityPolicy,
} from '../api/eligibilityAutomationApi'
import type { ApiPage, EligibilityPolicy } from '../types/eligibilityAutomation.types'
import styles from './EligibilityAutomation.module.css'
import { activationLabel, combinationLabel, conditionLabel, criterionLabel, evaluationTypeLabel, policyStatusLabel } from '../utils/automationPresentation'

const AVAILABLE_CRITERIA = [
  'PREVIOUS_ASSESSMENTS_TAKEN',
  'MIN_ATTENDANCE_PERCENTAGE',
  'MIN_ASSESSMENT_SCORE',
  'MIN_ACCUMULATED_SCORE',
  'MIN_ASSESSMENT_AVERAGE',
  'SECOND_INSTANCE_PARTIAL_AVERAGE',
]

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

export function AdminEligibilityPoliciesPage() {
  const [policies, setPolicies] = useState<ApiPage<EligibilityPolicy> | null>(null)
  const [selected, setSelected] = useState<EligibilityPolicy | null>(null)
  const [policyName, setPolicyName] = useState('')
  const [allowedCriteria, setAllowedCriteria] = useState<string[]>([])
  const [threshold, setThreshold] = useState('')
  const [newPolicyName, setNewPolicyName] = useState('')
  const [newVersionName, setNewVersionName] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [success, setSuccess] = useState('')

  const loadPolicies = useCallback(async (nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      setPolicies(await getEligibilityPolicies(nextPage))
      setPage(nextPage)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => loadPolicies(1))
  }, [loadPolicies])

  function showPolicy(policy: EligibilityPolicy) {
    setSelected(policy)
    setPolicyName(policy.name)
    setAllowedCriteria(policy.definition.allowed_criteria)
    setThreshold(String(policy.definition.second_instance.threshold))
    setConflict(false)
    setError('')
    setSuccess('')
  }

  async function refreshSelected() {
    if (!selected) return
    try {
      showPolicy(await getEligibilityPolicy(selected.id))
    } catch (cause) {
      setError(messageOf(cause))
    }
  }

  function definition() {
    if (!selected) return undefined
    return {
      ...selected.definition,
      allowed_criteria: allowedCriteria,
      second_instance: {
        ...selected.definition.second_instance,
        threshold: Number(threshold),
      },
    }
  }

  async function createPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const policy = await createEligibilityPolicy({ name: newPolicyName.trim() })
      setNewPolicyName('')
      setSuccess(`Política ${policy.name} creada como versión ${policy.version} en borrador.`)
      await loadPolicies(1)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSaving(false)
    }
  }

  async function createVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const version = await createEligibilityPolicyVersion(selected.id, {
        name: newVersionName.trim(),
        definition: selected.definition,
      })
      setNewVersionName('')
      showPolicy(version)
      setSuccess(`Nueva versión ${version.version} creada como borrador.`)
      await loadPolicies(1)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || selected.status !== 'DRAFT') return
    setSaving(true)
    setError('')
    setSuccess('')
    setConflict(false)
    try {
      const updated = await updateEligibilityPolicy(selected, {
        name: policyName.trim(),
        definition: definition(),
      })
      showPolicy(updated)
      setSuccess('Borrador actualizado.')
      await loadPolicies(page)
    } catch (cause) {
      const apiError = cause instanceof EligibilityAutomationApiError ? cause : null
      setError(messageOf(cause))
      setConflict(apiError?.status === 409)
    } finally {
      setSaving(false)
    }
  }

  async function activateDraft() {
    if (!selected || selected.status !== 'DRAFT') return
    setSaving(true)
    setError('')
    setSuccess('')
    setConflict(false)
    try {
      const activated = await activateEligibilityPolicy(selected)
      showPolicy(activated)
      setSuccess(`La versión ${activated.version} está activa y ahora es inmutable.`)
      await loadPolicies(page)
    } catch (cause) {
      const apiError = cause instanceof EligibilityAutomationApiError ? cause : null
      setError(messageOf(cause))
      setConflict(apiError?.status === 409)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={pageStyles.page}>
      <section className={pageStyles.content}>
        <Breadcrumbs items={[{ label: 'Administración', to: '/admin' }, { label: 'Políticas de habilitación' }]} />
        <header className={pageStyles.pageHeader}>
          <h1>Políticas de habilitación</h1>
          <p>Administra versiones de política desde el contrato de evaluación automática. Las versiones activas son inmutables.</p>
        </header>
        <form className={`${styles.panel} ${styles.policyCreate}`} onSubmit={(event) => void createPolicy(event)}>
          <h2>Crear política</h2>
          <label>
            Nombre
            <input required maxLength={200} value={newPolicyName} onChange={(event) => setNewPolicyName(event.currentTarget.value)} />
          </label>
          <div className={styles.actions}>
            <button type="submit" className={sharedStyles.primaryButton} disabled={saving}>Crear borrador</button>
          </div>
        </form>
        {error ? (
          <div role="alert" className={styles.error}>
            <p>{error}</p>
            {conflict ? <button type="button" className={sharedStyles.secondaryButton} onClick={() => void refreshSelected()}>Recargar versión del servidor</button> : null}
          </div>
        ) : null}
        {success ? <p role="status" className={styles.success}>{success}</p> : null}
        {loading ? <p role="status">Cargando políticas…</p> : null}
        <div className={styles.policiesLayout}>
          <section className={styles.panel} aria-labelledby="policy-list-title">
            <h2 id="policy-list-title">Versiones disponibles</h2>
            {policies?.data.map((policy) => (
              <article className={`${styles.historyItem} ${selected?.id === policy.id ? styles.selectedPolicy : ''}`} aria-current={selected?.id === policy.id ? 'true' : undefined} key={policy.id}>
                <h3>{policy.name}</h3>
                <p>Versión {policy.version} · <span className={styles.badge}>{policyStatusLabel(policy.status)}</span></p>
                <p className={styles.policyRevision}>Revisión {policy.revision}</p>
                <button type="button" className={sharedStyles.secondaryButton} onClick={() => showPolicy(policy)}>Ver detalle</button>
              </article>
            ))}
            {policies?.data.length === 0 ? <p>No hay políticas disponibles.</p> : null}
            {policies?.meta.last_page && policies.meta.last_page > 1 ? (
              <nav className={styles.pagination} aria-label="Paginación de políticas">
                <button type="button" className={sharedStyles.secondaryButton} disabled={page <= 1} onClick={() => void loadPolicies(page - 1)}>Anterior</button>
                <span>Página {page} de {policies.meta.last_page}</span>
                <button type="button" className={sharedStyles.secondaryButton} disabled={page >= policies.meta.last_page} onClick={() => void loadPolicies(page + 1)}>Siguiente</button>
              </nav>
            ) : null}
          </section>
          {selected ? (
            <section className={styles.panel} aria-labelledby="policy-detail-title">
              <header className={styles.policyDetailHeader}>
                <h2 id="policy-detail-title">{selected.name}</h2>
                <p>Versión {selected.version} · <span className={styles.badge}>{policyStatusLabel(selected.status)}</span></p>
              </header>
              <dl className={styles.policyMetadata}>
                <div><dt>Revisión</dt><dd>{selected.revision}</dd></div>
                <div><dt>Fecha de activación</dt><dd>{activationLabel(selected.activated_at)}</dd></div>
              </dl>
              {selected.status === 'DRAFT' ? (
                <form className={styles.policyForm} onSubmit={(event) => void saveDraft(event)}>
                  <label>
                    Nombre
                    <input required maxLength={200} value={policyName} onChange={(event) => setPolicyName(event.currentTarget.value)} />
                  </label>
                  <fieldset className={styles.policyCriteria}>
                    <legend>Criterios permitidos</legend>
                    {AVAILABLE_CRITERIA.map((code) => (
                      <label className={styles.criterionHeading} key={code}>
                        <input
                          type="checkbox"
                          checked={allowedCriteria.includes(code)}
                          disabled={code === 'SECOND_INSTANCE_PARTIAL_AVERAGE' && allowedCriteria.length === 1}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked
                            setAllowedCriteria((current) =>
                              checked ? [...current, code] : current.filter((value) => value !== code),
                            )
                          }}
                        />
                        <span>{criterionLabel(code)}</span>
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Umbral obligatorio de segunda instancia
                    <input type="number" min="0" max="100" step="0.01" value={threshold} onChange={(event) => setThreshold(event.currentTarget.value)} />
                  </label>
                  <div className={styles.policySaveActions}>
                    <button type="submit" className={sharedStyles.primaryButton} disabled={saving || !allowedCriteria.includes('SECOND_INSTANCE_PARTIAL_AVERAGE')}>Guardar borrador</button>
                    <button type="button" className={`${sharedStyles.secondaryButton} ${styles.activatePolicy}`} disabled={saving} onClick={() => void activateDraft()}>Activar versión</button>
                  </div>
                </form>
              ) : (
                <div>
                  <h3>Definición activa</h3>
                  <p className={styles.note}>Esta versión activa es de solo lectura.</p>
                  <dl className={styles.policyMetadata}>
                    <div><dt>Combinación</dt><dd>{combinationLabel(selected.definition.combination)}</dd></div>
                    <div><dt>Tipo de evaluación</dt><dd>{evaluationTypeLabel(selected.definition.second_instance.evaluation_type)}</dd></div>
                    <div><dt>Condición de segunda instancia</dt><dd>{conditionLabel(selected.definition.second_instance.operator, selected.definition.second_instance.threshold)}</dd></div>
                  </dl>
                  <h4>Criterios permitidos</h4>
                  <ul className={styles.policyAllowedList}>
                    {selected.definition.allowed_criteria.map((code) => <li key={code}>{criterionLabel(code)}</li>)}
                  </ul>
                  <details className={styles.technicalDetail}>
                    <summary>Detalle técnico</summary>
                    <pre>{JSON.stringify(selected.definition, null, 2)}</pre>
                  </details>
                </div>
              )}
              <form className={`${styles.panel} ${styles.clonePolicy}`} onSubmit={(event) => void createVersion(event)}>
                <h3>Crear nueva versión</h3>
                <label>
                  Nombre de la versión
                  <input required maxLength={200} value={newVersionName} onChange={(event) => setNewVersionName(event.currentTarget.value)} />
                </label>
                <div className={styles.actions}>
                  <button type="submit" className={sharedStyles.secondaryButton} disabled={saving}>Clonar como borrador</button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
