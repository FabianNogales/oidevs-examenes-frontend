import type { EntityStatus } from '@/shared/components/DataTable/dataTable.types'

export type UserRoleType = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'COLLABORATOR'

export interface AdminUserItem {
  id: number
  institutional_code: string
  first_names: string
  last_names: string
  identity_number: string
  email: string
  role: UserRoleType
  role_label: string
  status: EntityStatus
  /** ID de referencia hacia la tabla student o teacher para navegar a su perfil */
  entity_id?: number
}

const INITIAL_MOCK_USERS: AdminUserItem[] = [
  {
    id: 1,
    institutional_code: '548458465',
    last_names: 'Nogales Goitia',
    first_names: 'Fabian Marcel',
    identity_number: '8745123',
    email: 'nogaisfabianmarcel@umss.edu.bo',
    role: 'ADMIN',
    role_label: 'Administrador',
    status: 'ACTIVE',
  },
  {
    id: 2,
    institutional_code: '202300949',
    last_names: 'Chalco Soliz',
    first_names: 'Rodrigo',
    identity_number: '9451236',
    email: 'chalcosolizrodrigo@umss.edu.bo',
    role: 'STUDENT',
    role_label: 'Estudiante',
    status: 'ACTIVE',
    entity_id: 2,
  },
  {
    id: 3,
    institutional_code: '202300661',
    last_names: 'Arnez Torrico',
    first_names: 'Erick Eduardo',
    identity_number: '9385493',
    email: 'arneztorricoeduardo@umss.edu.bo',
    role: 'STUDENT',
    role_label: 'Estudiante',
    status: 'ACTIVE',
    entity_id: 3,
  },
  {
    id: 4,
    institutional_code: '213456879',
    last_names: 'Garcia Guzman',
    first_names: 'Oliver Saul',
    identity_number: '6940596',
    email: 'garciaoliversaul@umss.edu.bo',
    role: 'COLLABORATOR',
    role_label: 'Estudiante\nColaborador',
    status: 'ACTIVE',
    entity_id: 4,
  },
  {
    id: 5,
    institutional_code: '202300660',
    last_names: 'Condarco Flores',
    first_names: 'Jose Daniel',
    identity_number: '8829983',
    email: '8829983@umss.edu.bo',
    role: 'STUDENT',
    role_label: 'Estudiante',
    status: 'INACTIVE',
    entity_id: 5,
  },
  {
    id: 6,
    institutional_code: '332423424',
    last_names: 'Gonzales Castro',
    first_names: 'Hector Gabriel',
    identity_number: '7654321',
    email: 'hgg@umss.edu.bo',
    role: 'STUDENT',
    role_label: 'Estudiante',
    status: 'ACTIVE',
    entity_id: 6,
  },
  {
    id: 7,
    institutional_code: '164568656',
    last_names: 'Zarate Villarroel',
    first_names: 'Rodrigo Saul',
    identity_number: '8523697',
    email: 'rsaul00@umss.edu.bo',
    role: 'STUDENT',
    role_label: 'Estudiante',
    status: 'INACTIVE',
    entity_id: 7,
  },
  {
    id: 8,
    institutional_code: 'DEMO-DOC-001',
    last_names: 'Flores Condarco',
    first_names: 'Daniel',
    identity_number: '88234783',
    email: 'demo1@umss.edu.bo',
    role: 'TEACHER',
    role_label: 'Docente',
    status: 'ACTIVE',
    entity_id: 1,
  },
  {
    id: 9,
    institutional_code: 'DEMO-DOC-002',
    last_names: 'Fernandez Cordoba',
    first_names: 'Joel',
    identity_number: '88344352',
    email: 'demo2@umss.edu.bo',
    role: 'TEACHER',
    role_label: 'Docente',
    status: 'ACTIVE',
    entity_id: 2,
  },
  {
    id: 10,
    institutional_code: 'DEMO-DOC-003',
    last_names: 'Arnez',
    first_names: 'Juan Jose',
    identity_number: '93854934',
    email: 'demo3@umss.edu.bo',
    role: 'TEACHER',
    role_label: 'Docente',
    status: 'ACTIVE',
    entity_id: 3,
  },
]

let mockUsersStore = [...INITIAL_MOCK_USERS]

export async function getAdminUsersMock(params: {
  page: number
  perPage: number
  search?: string
}) {
  // Simula latencia de red ligera
  await new Promise((resolve) => setTimeout(resolve, 250))

  const query = (params.search ?? '').trim().toLowerCase()

  const filtered = mockUsersStore.filter((user) => {
    if (!query) return true
    const fullName = `${user.last_names} ${user.first_names}`.toLowerCase()
    const reverseName = `${user.first_names} ${user.last_names}`.toLowerCase()
    return (
      fullName.includes(query) ||
      reverseName.includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.institutional_code.toLowerCase().includes(query) ||
      user.identity_number.toLowerCase().includes(query) ||
      user.role_label.toLowerCase().includes(query)
    )
  })

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / params.perPage))
  const currentPage = Math.min(Math.max(1, params.page), lastPage)
  const start = (currentPage - 1) * params.perPage
  const paginated = filtered.slice(start, start + params.perPage)

  return {
    users: paginated,
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      total,
    },
  }
}

export async function updateAdminUserStatusMock(
  id: number,
  status: EntityStatus,
): Promise<AdminUserItem> {
  await new Promise((resolve) => setTimeout(resolve, 250))

  const index = mockUsersStore.findIndex((u) => u.id === id)
  if (index === -1) {
    throw new Error('Usuario no encontrado.')
  }

  const updated: AdminUserItem = {
    ...mockUsersStore[index],
    status,
  }
  mockUsersStore[index] = updated
  return updated
}