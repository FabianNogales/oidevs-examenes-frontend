import { Link, useParams } from 'react-router'
import { InfractionLayout } from '../components/InfractionLayout'
import { InfractionForm } from '../components/InfractionForm'
import { useInfractions } from '../hooks/useInfractions'
import { positiveId } from '../utils/infractionValidation'

function Create({ examId }: { examId: number }) {
  const context = useInfractions(examId)
  return (
    <InfractionLayout
      examId={examId}
      exam={context.data?.exam}
      title="Registrar infracción"
      detail
    >
      {context.loading ? (
        <p role="status">Comprobando autorización vigente…</p>
      ) : context.error ? (
        <div role="alert">
          <p>{context.error}</p>
          <button type="button" onClick={context.retry}>
            Reintentar
          </button>
        </div>
      ) : context.data?.permissions.can_create ? (
        <InfractionForm examId={examId} />
      ) : (
        <p role="alert">
          Solo el docente responsable autorizado puede registrar infracciones de
          este examen.
        </p>
      )}
      <p>
        Si eres colaborador, puedes reportar una situación desde{' '}
        <Link to={`/exams/${examId}/incidents`}>Incidencias</Link>; esa
        autorización no permite confirmar faltas.
      </p>
    </InfractionLayout>
  )
}
export function CreateInfractionPage() {
  const { examId } = useParams()
  const id = Number(examId)
  return positiveId(id) ? (
    <Create key={id} examId={id} />
  ) : (
    <p role="alert">El identificador del examen no es válido.</p>
  )
}
