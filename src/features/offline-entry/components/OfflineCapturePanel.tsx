import { useState } from 'react'
import { CheckCircle2, Clock, QrCode, RefreshCw, UserCheck, Users,} from 'lucide-react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { EntryQrStudentIdentity } from '@/features/exams/components/EntryQrStudentIdentity'
import { useOfflineCapture } from '../hooks/useOfflineCapture'
import type {
  LocalEntry,
  OfflineStudent,
  StoredPackage,
} from '../types/offline.types'
import { packageBlocker, studentBlocker } from '../utils/offlineRules'
import { OfflineStudentList } from './OfflineStudentList'
import { OfflineQrScanner } from './OfflineQrScanner'
import shared from './OfflineShared.module.css'
import captureStyles from './OfflineCapturePanel.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflineCapturePanel({
  stored,
  entries,
  now,
  onSaved,
}: {
  stored: StoredPackage
  entries: LocalEntry[]
  now: number
  onSaved: () => void
}) {
  const [method, setMethod] = useState<'MANUAL' | 'QR'>('MANUAL')
  const [token, setToken] = useState<string | null>(null)
  const [selected, setSelected] = useState<OfflineStudent | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const capture = useOfflineCapture(stored.ownerId, stored.packet, onSaved)
  const blocker = packageBlocker(stored, now)
  const studentDenied = selected ? studentBlocker(selected, entries) : null

  const localCount = entries.filter((entry) =>
    ['PENDING', 'ACCEPTED', 'DUPLICATE'].includes(entry.status),
  ).length

  const known = new Set(
    stored.packet.students
      .filter((student) => student.entry_status === 'REGISTERED')
      .map((student) => student.student_id),
  )

  entries
    .filter((entry) =>
      ['PENDING', 'ACCEPTED', 'DUPLICATE'].includes(entry.status),
    )
    .forEach((entry) => known.add(entry.payload.student_id))

  const metrics = [
    {
      value: stored.packet.students.length,
      label: 'Asignados en mi lista',
      Icon: Users,
    },
    {
      value: localCount,
      label: 'Ingresos capturados en este dispositivo',
      Icon: CheckCircle2,
    },
    {
      value: stored.packet.students.filter(
        (student) => !known.has(student.student_id),
      ).length,
      label: 'Pendientes de ingreso',
      Icon: Clock,
    },
    {
      value: entries.filter((entry) => entry.status === 'PENDING').length,
      label: 'Pendientes de sincronizar',
      Icon: RefreshCw,
    },
  ] as const

  return (
    <>
      <div className={captureStyles.metricsGrid}>
        {metrics.map(({ value, label, Icon }) => (
          <div className={captureStyles.metricCard} key={label}>
            <div className={captureStyles.metricCardTop}>
              <strong>{value}</strong>
              <Icon
                size={20}
                strokeWidth={1.75}
                className={captureStyles.metricCardIcon}
                aria-hidden="true"
              />
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className={shared.notice} data-warning="true">
        <strong>Registro provisional</strong>
        <p>
          La habilitación y los ingresos de otros dispositivos pueden haber
          cambiado. La hora del teléfono solo sirve como referencia local.
        </p>
      </div>

      {blocker ? (
        <p className={shared.error} role="alert">
          {blocker}
        </p>
      ) : null}

      <div className={captureStyles.methodToolbar}>
        <div
          className={captureStyles.methodSwitch}
          role="group"
          aria-label="Método de identificación"
        >
          <button
            type="button"
            className={captureStyles.methodButton}
            aria-pressed={method === 'MANUAL'}
            onClick={() => {
              setMethod('MANUAL')
              setToken(null)
            }}
          >
            <UserCheck size={16} strokeWidth={1.85} aria-hidden="true" />
            <span>Verificación manual</span>
          </button>

          <button
            type="button"
            className={captureStyles.methodButton}
            aria-pressed={method === 'QR'}
            onClick={() => setMethod('QR')}
          >
            <QrCode size={16} strokeWidth={1.85} aria-hidden="true" />
            <span>Captura QR</span>
          </button>
        </div>
      </div>

      {method === 'QR' && token ? (
        <div className={shared.notice} role="status">
          <strong>QR capturado, sin autenticar</strong>
          <p>
            Selecciona al estudiante y confirma su identidad. El servidor
            verificará que este QR le pertenece.
          </p>
          <button
            className={buttons.secondaryButton}
            onClick={() => setToken(null)}
          >
            Descartar lectura y escanear otra vez
          </button>
        </div>
      ) : null}

      <div
        className={
          method === 'QR' && !token ? captureStyles.controlGrid : undefined
        }
      >
        {method === 'QR' && !token ? (
          <OfflineQrScanner
            scope={stored.packet.package_id}
            disabled={Boolean(blocker) || selected !== null}
            onToken={setToken}
          />
        ) : null}

        <OfflineStudentList
          students={stored.packet.students}
          entries={entries}
          onSelect={(student) => {
            capture.clearError()
            setSelected(student)
            setConfirmed(false)
          }}
        />
      </div>

      {selected ? (
        <CollaborationModal
          title="Confirmar identidad y captura local"
          busy={capture.busy}
          onClose={() => setSelected(null)}
        >
          <EntryQrStudentIdentity
            student={{ ...selected, profile_photo_url: null }}
          />
          <dl className={shared.details}>
            <div>
              <dt>Examen</dt>
              <dd>{stored.packet.exam.name}</dd>
            </div>
            <div>
              <dt>Ambiente</dt>
              <dd>{stored.packet.exam.room?.code}</dd>
            </div>
            <div>
              <dt>Habilitación conocida</dt>
              <dd>
                {selected.eligibility_status === 'ELIGIBLE'
                  ? 'Habilitado al descargar'
                  : 'No habilitado en el paquete'}
              </dd>
            </div>
            <div>
              <dt>Mecanismo</dt>
              <dd>
                {method === 'QR'
                  ? 'QR provisional + confirmación de identidad'
                  : 'Manual'}
              </dd>
            </div>
          </dl>
          <p>El guardado local no confirma un ingreso oficial.</p>
          {blocker || studentDenied ? (
            <p className={shared.error} role="alert">
              {blocker ?? studentDenied}
            </p>
          ) : null}
          {method === 'QR' && !token ? (
            <p className={shared.notice}>
              Primero captura un QR y luego confirma al estudiante de esta
              lista.
            </p>
          ) : null}
          {capture.error ? (
            <p className={shared.error} role="alert">
              {capture.error}
            </p>
          ) : null}
          <label className={shared.checkbox}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={capture.busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Verifiqué presencialmente la identidad y el ambiente.
          </label>
          <div className={shared.actions}>
            <button
              className={buttons.secondaryButton}
              disabled={capture.busy}
              onClick={() => setSelected(null)}
            >
              Cancelar
            </button>
            <button
              className={buttons.primaryButton}
              disabled={
                capture.busy ||
                !confirmed ||
                Boolean(blocker || studentDenied) ||
                (method === 'QR' && !token)
              }
              onClick={() => {
                void capture
                  .capture(selected.student_id, method, token ?? undefined)
                  .then((saved) => {
                    if (saved) {
                      setSelected(null)
                      setToken(null)
                    }
                  })
              }}
            >
              {capture.busy ? 'Guardando…' : 'Guardar ingreso provisional'}
            </button>
          </div>
        </CollaborationModal>
      ) : null}
    </>
  )
}