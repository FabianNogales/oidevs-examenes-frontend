import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

/**
 * ============================================================================
 * CONTRATO DE BACKEND PARA "HISTORIAL DE ROLES"
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/users/{userId}/role-history
 *
 * 2. Parámetros de consulta (Query Params):
 *    - search?: string (Filtra por nombre de rol, motivo, autorizador o fecha)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - AuditLog (bitácora inmutable RNF10/RNF12 que registra cambios de rol)
 *    - Role (STUDENT, COLLABORATOR, TEACHER, ADMIN)
 *    - User (usuario objetivo y usuario actor `performed_by_user_id`)
 *    - ExamCollaborator (para cruzar designaciones temporales hechas por docentes)
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 401,
 *          "role_code": "COLLABORATOR",
 *          "role_label": "Colaborador",
 *          "action_description": "Habilitación de rol colaborador (Primer parcial - Base de Datos I)",
 *          "changed_at": "15/10/2026 09:30:14",
 *          "authorized_by_name": "Ing. Daniel Flores Condarco",
 *          "authorized_by_role": "Docente"
 *        }
 *      ],
 *      "meta": {
 *        "current_page": 1,
 *        "last_page": 1,
 *        "total": 4
 *      }
 *    }
 * ============================================================================
 */

type SystemRoleCode = 'STUDENT' | 'COLLABORATOR' | 'TEACHER' | 'ADMIN'

interface RoleHistoryAuditItem extends BaseTableEntity {
  id: number
  roleCode: SystemRoleCode
  roleLabel: 'Estudiante' | 'Colaborador' | 'Docente' | 'Administrador'
  actionDescription: string
  changedAt: string
  authorizedByName: string
  authorizedByRole: 'Administrador' | 'Docente'
}

const ROLE_BADGE_STYLE_MAP: Record<SystemRoleCode, string> = {
  STUDENT: layoutStyles.rolePillStudent,
  COLLABORATOR: layoutStyles.rolePillCollaborator,
  TEACHER: layoutStyles.rolePillTeacher,
  ADMIN: layoutStyles.rolePillAdmin,
}

const MOCK_ROLE_HISTORY: readonly RoleHistoryAuditItem[] = [
  {
    id: 401,
    roleCode: 'COLLABORATOR',
    roleLabel: 'Colaborador',
    actionDescription:
      'Habilitación de rol colaborador (Segundo parcial - Elementos de Programación)',
    changedAt: '18/10/2026 11:00:05',
    authorizedByName: 'Ing. Joel Fernandez Cordoba',
    authorizedByRole: 'Docente',
  },
  {
    id: 402,
    roleCode: 'COLLABORATOR',
    roleLabel: 'Colaborador',
    actionDescription:
      'Habilitación de rol colaborador (Primer parcial - Base de Datos I)',
    changedAt: '15/10/2026 09:30:14',
    authorizedByName: 'Ing. Daniel Flores Condarco',
    authorizedByRole: 'Docente',
  },
  {
    id: 403,
    roleCode: 'COLLABORATOR',
    roleLabel: 'Colaborador',
    actionDescription:
      'Designación temporal concluida (Examen final - Introducción a la Programación)',
    changedAt: '12/06/2026 14:20:40',
    authorizedByName: 'Ing. Patricia Erika Rodriguez Bilbao',
    authorizedByRole: 'Docente',
  },
  {
    id: 404,
    roleCode: 'STUDENT',
    roleLabel: 'Estudiante',
    actionDescription:
      'Alta inicial de cuenta institucional y asignación de rol base en el sistema EIDA',
    changedAt: '02/03/2026 08:15:22',
    authorizedByName: 'Fabian Marcel Nogales Goitia',
    authorizedByRole: 'Administrador',
  },
]

export function RoleHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRoleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_ROLE_HISTORY

    return MOCK_ROLE_HISTORY.filter(
      (item) =>
        item.roleLabel.toLowerCase().includes(query) ||
        item.actionDescription.toLowerCase().includes(query) ||
        item.authorizedByName.toLowerCase().includes(query) ||
        item.authorizedByRole.toLowerCase().includes(query) ||
        item.changedAt.toLowerCase().includes(query),
    )
  }, [searchQuery])

  const cardFields = useMemo<readonly CardFieldDef<RoleHistoryAuditItem>[]>(
    () => [
      {
        id: 'role',
        label: 'Rol asignado',
        cell: (item) => (
          <span
            className={`${layoutStyles.rolePill} ${
              ROLE_BADGE_STYLE_MAP[item.roleCode]
            }`}
          >
            {item.roleLabel}
          </span>
        ),
      },
      {
        id: 'description',
        label: 'Motivo',
        accessorKey: 'actionDescription',
      },
      {
        id: 'authorizedBy',
        label: 'Autorizado por',
        cell: (item) => (
          <div>
            <span className={tableStyles.primaryText}>
              {item.authorizedByName}
            </span>
            <span className={tableStyles.secondaryText}>
              Rol autorizador: {item.authorizedByRole}
            </span>
          </div>
        ),
      },
      {
        id: 'changedAt',
        label: 'Fecha exacta',
        accessorKey: 'changedAt',
      },
    ],
    [],
  )

  return (
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Historial de roles</h2>
          <p>
            Bitácora de auditoría inmutable con los roles ejercidos por{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>
            , detallando la fecha exacta y el administrador o docente que
            autorizó cada cambio.
          </p>
        </div>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredRoleLogs}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="registros de rol"
        searchPlaceholder="Buscar por rol (Estudiante, Colaborador...), autorizador o fecha..."
        onSearch={setSearchQuery}
        emptyTitle="Sin cambios de rol registrados"
        emptyDescription="No se encontraron eventos de asignación de rol con los criterios ingresados."
      />
    </section>
  )
}