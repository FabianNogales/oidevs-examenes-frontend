import {
  rememberOfflineIdentity,
  readOfflineIdentity,
  invalidateOfflineIdentity,
} from '../services/offlineIdentity'
import {
  captureOfflineEntry,
  deleteOfflineExam,
  readOfflineData,
  saveOfflinePackage,
  saveSyncResults,
} from '../storage/offlineStore'
import type { OfflinePackage, SyncStatus } from '../types/offline.types'

const OWNER = 2147483001
const EXAM = 2147483002
const MARKER = 'eida.offline.browser-test.v1'
const output = document.getElementById('output')
function report(message: string) {
  if (output) output.textContent += message + '\n'
}
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
  report('OK: ' + message)
}
async function reject(action: () => Promise<unknown>, message: string) {
  let rejected = false
  try {
    await action()
  } catch {
    rejected = true
  }
  check(rejected, message)
}
function fixture(): OfflinePackage {
  const now = Date.now()
  const opens = new Date(now - 5 * 60000).toISOString()
  const expires = new Date(now + 60 * 60000).toISOString()
  return {
    package_id: crypto.randomUUID(),
    exam_id: EXAM,
    responsible_id: OWNER,
    list_id: 1,
    version: 1,
    room_id: 1,
    timezone: 'America/La_Paz',
    qr_validation: 'SERVER_ON_SYNC',
    prepared_at: opens,
    expires_at: expires,
    surname_range: { from: 'Prueba', to: 'Prueba' },
    exam: {
      id: EXAM,
      name: 'PRUEBA LOCAL AISLADA',
      subject_name: 'Prueba',
      exam_date: opens.slice(0, 10),
      start_time: '10:00:00',
      duration_minutes: 60,
      status: 'SCHEDULED',
      entry_opens_at: opens,
      entry_closes_at: expires,
      server_time: opens,
      room: { id: 1, code: 'TEST', name: 'Prueba', location: null },
    },
    students: Array.from({ length: 4 }, (_, index) => ({
      student_id: index + 1,
      first_names: `Alumno ${index + 1}`,
      last_names: 'Prueba',
      sis_code: `TEST-${index}`,
      identity_number: `TEST-CI-${index}`,
      student_status: 'ACTIVE',
      enrollment_status: 'ACTIVE',
      eligibility_status: 'ELIGIBLE',
      eligibility_revision: 1,
      entry_status: 'PENDING',
    })),
  }
}
async function create() {
  if (readOfflineIdentity() || sessionStorage.getItem(MARKER))
    throw new Error(
      'Ya hay un contexto local. Usa un perfil/origen aislado; no se sobrescribirá.',
    )
  rememberOfflineIdentity({
    id: OWNER,
    display_name: 'Cuenta ficticia de prueba',
    email: '',
    roles: [],
    status: 'ACTIVE',
    must_change_password: false,
  })
  const initial = await readOfflineData(OWNER, EXAM)
  if (initial.packages.length || initial.entries.length)
    throw new Error(
      'Ya existen datos en el espacio de prueba. No se sobrescribirán.',
    )
  const packet = fixture()
  await saveOfflinePackage(OWNER, packet)
  check(
    (await readOfflineData(OWNER, EXAM)).packages.length === 1,
    'El paquete fue persistido antes de informar éxito',
  )
  const concurrent = await Promise.allSettled([
    captureOfflineEntry(OWNER, packet, 1, 'MANUAL'),
    captureOfflineEntry(OWNER, packet, 1, 'MANUAL'),
  ])
  check(
    concurrent.filter((result) => result.status === 'fulfilled').length === 1,
    'Dos capturas concurrentes generan un solo evento por estudiante',
  )
  for (let student = 2; student <= 4; student++)
    await captureOfflineEntry(OWNER, packet, student, 'MANUAL')
  const { entries } = await readOfflineData(OWNER, EXAM)
  check(entries.length === 4, 'Todos los eventos se leen desde IndexedDB')
  const statuses: SyncStatus[] = [
    'ACCEPTED',
    'DUPLICATE',
    'CONFLICT',
    'REJECTED',
  ]
  await saveSyncResults(
    OWNER,
    EXAM,
    entries.map((entry, index) => ({
      event_id: entry.payload.event_id,
      status: statuses[index],
      code: 'BROWSER_TEST',
      message: 'Resultado ficticio solo de prueba.',
      entry_id: index < 2 ? 500 + index : null,
    })),
  )
  await reject(
    () => readOfflineData(OWNER + 1, EXAM),
    'Otra identidad no puede leer los datos de prueba',
  )
  await reject(
    () => deleteOfflineExam(OWNER, EXAM, false),
    'La eliminación de eventos sin resolver exige reconocimiento',
  )
  sessionStorage.setItem(MARKER, packet.package_id)
  report(
    'Ahora recarga esta página con el botón 2 y después usa el botón 3. No cierres la pestaña.',
  )
}
async function verify() {
  const expected = sessionStorage.getItem(MARKER)
  if (!expected || readOfflineIdentity()?.ownerId !== OWNER)
    throw new Error('Primero crea los datos de prueba en esta misma pestaña.')
  const result = await readOfflineData(OWNER, EXAM)
  check(
    result.packages[0]?.packet.package_id === expected,
    'El paquete sobrevive a la recarga de la aplicación',
  )
  check(result.entries.length === 4, 'Los eventos sobreviven a la recarga')
  check(
    result.entries.some((entry) => entry.status === 'CONFLICT') &&
      result.entries.some((entry) => entry.status === 'REJECTED'),
    'Conflictos y rechazos siguen disponibles',
  )
  await deleteOfflineExam(OWNER, EXAM, true)
  const after = await readOfflineData(OWNER, EXAM)
  check(
    after.packages.length === 0 && after.entries.length === 0,
    'Se eliminaron únicamente los datos reconocidos de esta cuenta y examen',
  )
  sessionStorage.removeItem(MARKER)
  invalidateOfflineIdentity(false)
}
function bind(id: string, action: () => Promise<void>) {
  document.getElementById(id)?.addEventListener('click', () => {
    const buttons = document.querySelectorAll('button')
    buttons.forEach((button) => {
      button.disabled = true
    })
    void action()
      .catch((error: unknown) =>
        report(
          'ERROR: ' +
            (error instanceof Error ? error.message : 'Prueba fallida'),
        ),
      )
      .finally(() =>
        buttons.forEach((button) => {
          button.disabled = false
        }),
      )
  })
}
bind('create', create)
bind('verify', verify)
document
  .getElementById('reload')
  ?.addEventListener('click', () => location.reload())
