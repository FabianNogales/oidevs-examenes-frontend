import { useParams } from 'react-router'
import { positiveId } from '@/features/infractions/utils/infractionValidation'
import { useExpulsions } from '../hooks/useExpulsionQuery'
import { ExpulsionLayout } from '../components/ExpulsionLayout'
import { ExpulsionForm } from '../components/ExpulsionForm'
function Create({ examId }: { examId: number }) {
  const query = useExpulsions(examId)
  return (
    <ExpulsionLayout
      examId={examId}
      exam={query.data?.exam}
      title="Registrar expulsión"
      detail
    >
      {query.loading ? (
        <p role="status">Comprobando autorización vigente…</p>
      ) : query.error ? (
        <div role="alert">
          <p>{query.error}</p>
          <button type="button" onClick={query.retry}>
            Reintentar
          </button>
        </div>
      ) : query.data?.permissions.can_create ? (
        <ExpulsionForm examId={examId} />
      ) : (
        <p role="alert">
          Solo el docente responsable autorizado puede registrar expulsiones. La
          colaboración temporal no otorga este permiso.
        </p>
      )}
    </ExpulsionLayout>
  )
}
export function CreateExpulsionPage() {
  const { examId } = useParams()
  const id = Number(examId)
  return positiveId(id) ? (
    <Create key={id} examId={id} />
  ) : (
    <p role="alert">El identificador del examen no es válido.</p>
  )
}
