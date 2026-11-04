import { ArrowRight, Check } from 'lucide-react'
import type { OfflineDistribution } from '../types/offline.types'
import { GetResponsibleInitials } from './AssignedListStudentsView'
import distStyles from './styles/OfflineDistribution.module.css'

export interface OfflineAssignmentCardsProps {
  distribution: OfflineDistribution
  onSelectList: (listId: number) => void
}

export function OfflineAssignmentCards({
  distribution,
  onSelectList,
}: OfflineAssignmentCardsProps) {
  return (
    <div className={distStyles.cardsGrid}>
      {distribution.lists.map((list, index) => {
        const rangeText =
          list.surname_range.from === null
            ? 'Sin estudiantes asignados'
            : `${list.surname_range.from} — ${list.surname_range.to}`

        return (
          <article className={distStyles.assignmentCard} key={list.list_id}>
            <div>
              <div className={distStyles.cardTopBar}>
                <span className={distStyles.listEyebrow}>
                  LISTA {index + 1}
                </span>
                <span className={distStyles.preparedBadge}>
                  <Check size={14} strokeWidth={2.25} aria-hidden="true" />
                  <span>Preparada · v{distribution.version}</span>
                </span>
              </div>

              <div className={distStyles.collaboratorBlock}>
                <div className={distStyles.avatarNavy} aria-hidden="true">
                  {GetResponsibleInitials(
                    list.responsible_name,
                    list.responsible_id,
                  )}
                </div>
                <div className={distStyles.collaboratorInfo}>
                  <h3>
                    {list.responsible_name ??
                      `Responsable ${list.responsible_id}`}
                  </h3>
                  <p>{rangeText}</p>
                </div>
              </div>
            </div>

            <div>
              <hr className={distStyles.cardDivider} />

              <div className={distStyles.cardFooterRow}>
                <div className={distStyles.studentCountGroup}>
                  <strong>
                    {list.student_count}{' '}
                    {list.student_count === 1 ? 'estudiante' : 'estudiantes'}
                  </strong>
                  <span>Membresía exclusiva</span>
                </div>

                <button
                  type="button"
                  className={distStyles.consultStudentsButton}
                  onClick={() => onSelectList(list.list_id)}
                >
                  <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                  <span>Consultar estudiantes</span>
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}