import type { EntryQrResponse } from '../types/entryQr.types'
import {
  eligibilityDisplay,
  enrollmentDisplay,
  entryDisplay,
  formatEntryTimestamp,
  roomDisplay,
} from '../utils/entryControlDisplay'
import { ENTRY_QR_LABELS, entryQrTone } from '../utils/entryQrDisplay'
import { EntryConditionBadge } from './EntryConditionBadge'
import { EntryQrStudentIdentity } from './EntryQrStudentIdentity'
import entryStyles from '../pages/EntryControlPage.module.css'
import styles from './EntryQr.module.css'

export function EntryQrResultPanel({
  response,
  processing,
}: {
  response: EntryQrResponse | null
  processing: boolean
}) {
  const data = response?.data
  const ineligible =
    data?.eligibility_status === 'INELIGIBLE' ||
    data?.blockers?.some((blocker) => blocker.code === 'INELIGIBLE')
  return (
    <section
      className={`${styles.resultPanel} ${response ? entryStyles[entryQrTone(response.result)] : ''}`}
      aria-label="Resultado del escaneo"
      aria-live="polite"
      aria-busy={processing}
    >
      {processing ? (
        <p role="status">Verificando QR y procesando ingreso…</p>
      ) : null}
      {!response ? (
        <>
          <h2>Resultado del escaneo</h2>
          <p>
            Presenta un código QR frente a la cámara. El ingreso se procesa
            automáticamente.
          </p>
        </>
      ) : (
        <>
          <h2>{ENTRY_QR_LABELS[response.result]}</h2>
          <p>{response.message}</p>
          {data?.student ? (
            <EntryQrStudentIdentity
              key={data.student.student_id}
              student={data.student}
            />
          ) : null}
          {data ? (
            <div className={styles.resultConditions}>
              {data.enrollment_status !== undefined ? (
                <div>
                  <span>Inscripción</span>
                  <EntryConditionBadge
                    {...enrollmentDisplay(data.enrollment_status)}
                    label={
                      response.result === 'AUTHORIZED'
                        ? 'INSCRITO'
                        : enrollmentDisplay(data.enrollment_status).label
                    }
                  />
                </div>
              ) : null}
              {data.eligibility_status !== undefined ? (
                <div>
                  <span>Habilitación</span>
                  <EntryConditionBadge
                    {...eligibilityDisplay(data.eligibility_status)}
                    label={
                      response.result === 'AUTHORIZED'
                        ? 'HABILITADO'
                        : eligibilityDisplay(data.eligibility_status).label
                    }
                  />
                </div>
              ) : null}
              {data.room_status !== undefined ? (
                <div>
                  <span>Ambiente</span>
                  <EntryConditionBadge
                    {...roomDisplay(data.room_status)}
                    label={
                      response.result === 'AUTHORIZED'
                        ? 'AMBIENTE CORRECTO'
                        : roomDisplay(data.room_status).label
                    }
                  />
                </div>
              ) : null}
              {data.entry_status !== undefined ? (
                <div>
                  <span>Ingreso</span>
                  <EntryConditionBadge {...entryDisplay(data.entry_status)} />
                </div>
              ) : null}
            </div>
          ) : null}
          {data?.blockers?.length ? (
            <ul className={styles.blockers}>
              {data.blockers.map((blocker, index) => (
                <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
              ))}
            </ul>
          ) : null}
          {ineligible && (data?.reason || data?.observations) ? (
            <dl className={styles.details}>
              {data.reason ? (
                <div>
                  <dt>Motivo</dt>
                  <dd>{data.reason}</dd>
                </div>
              ) : null}
              {data.observations ? (
                <div>
                  <dt>Observaciones</dt>
                  <dd>{data.observations}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {data?.entry ? (
            <dl className={styles.details}>
              <div>
                <dt>
                  {response.result === 'ALREADY_REGISTERED'
                    ? 'Ingreso anterior'
                    : 'Fecha y hora del registro'}
                </dt>
                <dd>{formatEntryTimestamp(data.entry.entered_at)}</dd>
              </div>
              <div>
                <dt>Método</dt>
                <dd>{data.entry.verification_method}</dd>
              </div>
              <div>
                <dt>Verificado por</dt>
                <dd>{data.entry.verified_by_name || 'No informado'}</dd>
              </div>
            </dl>
          ) : null}
          <p className={styles.timestamp}>
            Procesado: {formatEntryTimestamp(response.processed_at)}
          </p>
        </>
      )}
    </section>
  )
}
