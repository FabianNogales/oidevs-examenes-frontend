import { EntryConditionBadge } from './EntryConditionBadge'
import { EntryQrStudentIdentity } from './EntryQrStudentIdentity'
import { entryStudentName } from '../utils/entryControlDisplay'
import type { AnnulmentHistoryRecord } from '@/features/entry-annulments/types/entryAnnulment.types'
import { canAnnulEntry } from '@/features/entry-annulments/utils/entryAnnulmentValidation'
import { EntryAnnulmentEvidence } from '@/features/entry-annulments/components/EntryAnnulmentEvidence'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './EntryQr.module.css'

type Props = {
  records: AnnulmentHistoryRecord[]
  onAnnul: (record: AnnulmentHistoryRecord) => void
}

export function EntryHistoryRecords({ records, onAnnul }: Props) {
  const projected = records.map((record) => ({
    record,
    fields: [
      { label: 'Estudiante', value: entryStudentName(record.student) },
      { label: 'SIS', value: record.student.sis_code },
      {
        label: 'Fecha y hora · Bolivia',
        value: new Date(record.entry.entered_at).toLocaleString('es-BO', {
          timeZone: 'America/La_Paz',
          hour12: false,
        }),
      },
      { label: 'Método', value: record.entry.verification_method },
      {
        label: 'Verificador',
        value: record.entry.verified_by_name || 'No informado',
      },
      {
        label: 'Estado',
        value:
          record.entry.status === 'VALID'
            ? 'Válido'
            : record.entry.status === 'ANNULLED'
              ? 'Anulado'
              : record.entry.status,
      },
    ],
  }))
  function actions(record: AnnulmentHistoryRecord) {
    return (
      <>
        {canAnnulEntry(record) && (
          <button
            type="button"
            className={sharedStyles.dangerButton}
            onClick={() => onAnnul(record)}
            aria-label={`Anular ingreso de ${entryStudentName(record.student)}`}
          >
            Anular ingreso
          </button>
        )}
        <EntryAnnulmentEvidence record={record} />
      </>
    )
  }
  return (
    <>
      <div className={`${sharedStyles.tableWrap} ${styles.historyTableWrap}`}>
        <table
          className={`${sharedStyles.table} ${styles.historyTable}`}
          aria-label="Historial completo de ingresos registrados"
        >
          <thead>
            <tr>
              {projected[0]?.fields.map((field) => (
                <th key={field.label} scope="col">
                  {field.label}
                </th>
              ))}
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projected.map(({ record, fields }) => (
              <tr key={record.entry.id}>
                {fields.map((field) => (
                  <td key={field.label}>
                    {field.label === 'Estudiante' ? (
                      <EntryQrStudentIdentity student={record.student} />
                    ) : (
                      field.value
                    )}
                  </td>
                ))}
                <td>{actions(record)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className={styles.historyCards}
        aria-label="Historial completo de ingresos registrados"
      >
        {projected.map(({ record, fields }) => (
          <li key={record.entry.id} className={styles.historyCard}>
            <dl>
              {fields.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd
                    className={
                      field.label === 'Estudiante'
                        ? styles.historyStudentName
                        : undefined
                    }
                  >
                    {field.label === 'Estudiante' ? (
                      <EntryQrStudentIdentity student={record.student} />
                    ) : field.label === 'Estado' ? (
                      <EntryConditionBadge
                        label={field.value}
                        tone={
                          record.entry.status === 'VALID'
                            ? 'positive'
                            : 'neutral'
                        }
                      />
                    ) : (
                      field.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {actions(record)}
          </li>
        ))}
      </ul>
    </>
  )
}
