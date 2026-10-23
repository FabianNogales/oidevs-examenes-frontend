import { useId, useState } from 'react'
import type { RecentEntryRecord } from '../types/entryRegistration.types'
import { entryAvailabilityMessage } from '../utils/entryAvailabilityDisplay'
import {
  entryStudentName,
  formatEntryTimestamp,
} from '../utils/entryControlDisplay'
import {
  ENTRY_RESULT_LABELS,
  entryResultTone,
} from '../utils/entryRegistrationDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import entryStyles from '../pages/EntryControlPage.module.css'
import styles from './EntryQr.module.css'

export function EntryRecentScans({ scans }: { scans: RecentEntryRecord[] }) {
  const [expanded, setExpanded] = useState(false)
  const mobileListId = useId()
  const rows = scans.map((scan) => ({
    id: scan.id,
    studentName: scan.student
      ? entryStudentName(scan.student)
      : 'No identificado',
    sisCode: scan.student?.sis_code ?? '—',
    resultLabel: ENTRY_RESULT_LABELS[scan.result],
    resultTone: entryResultTone(scan.result),
    method: scan.verification_method || 'No informado',
    message: entryAvailabilityMessage(scan.message),
    processedAt: formatEntryTimestamp(scan.processed_at),
  }))
  const mobileRows = expanded ? rows : rows.slice(0, 3)

  return (
    <section className={styles.recent} aria-labelledby="entry-recent-title">
      <h2 id="entry-recent-title">Registros recientes</h2>
      <p className={sharedStyles.note}>
        Últimos 20 resultados de esta sesión. Se conservan únicamente mientras
        esta página permanece abierta.
      </p>
      <div className={`${sharedStyles.tableWrap} ${styles.recentTableWrap}`}>
        <table
          className={`${sharedStyles.table} ${styles.recentTable}`}
          aria-label="Resultados de registros recientes"
        >
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">SIS</th>
              <th scope="col">Método</th>
              <th scope="col">Resultado</th>
              <th scope="col">Motivo / mensaje</th>
              <th scope="col">Procesado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.studentName}</td>
                <td>{row.sisCode}</td>
                <td>{row.method}</td>
                <td>
                  <span
                    className={`${entryStyles.badge} ${entryStyles[row.resultTone]}`}
                  >
                    {row.resultLabel}
                  </span>
                </td>
                <td>{row.message}</td>
                <td>{row.processedAt}</td>
              </tr>
            ))}
            {!scans.length ? (
              <tr>
                <td colSpan={6} className={sharedStyles.empty}>
                  Aún no hay registros en esta sesión.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className={styles.recentCards}>
        {rows.length ? (
          <ul
            id={mobileListId}
            className={styles.recentCardList}
            role="list"
            aria-label="Resultados de registros recientes"
          >
            {mobileRows.map((row) => (
              <li key={row.id} className={styles.recentCard}>
                <dl>
                  <div>
                    <dt>Estudiante</dt>
                    <dd className={styles.recentStudentName}>
                      {row.studentName}
                    </dd>
                  </div>
                  <div>
                    <dt>SIS</dt>
                    <dd>{row.sisCode}</dd>
                  </div>
                  <div>
                    <dt>Método</dt>
                    <dd>{row.method}</dd>
                  </div>
                  <div>
                    <dt>Resultado</dt>
                    <dd>
                      <span
                        className={`${entryStyles.badge} ${entryStyles[row.resultTone]} ${styles.recentResultBadge}`}
                      >
                        {row.resultLabel}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Motivo / mensaje</dt>
                    <dd>{row.message}</dd>
                  </div>
                  <div>
                    <dt>Procesado</dt>
                    <dd>{row.processedAt}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className={sharedStyles.empty}>
            Aún no hay registros en esta sesión.
          </p>
        )}
        {rows.length > 3 ? (
          <button
            type="button"
            className={`${sharedStyles.secondaryButton} ${styles.recentToggle}`}
            aria-expanded={expanded}
            aria-controls={mobileListId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Mostrar menos' : 'Ver todos los registros recientes'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
