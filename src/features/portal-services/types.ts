export type ServiceStatus = 'ACTIVE' | 'INACTIVE'
export type ServiceIconName =
  | 'academic'
  | 'calendar'
  | 'book'
  | 'info'
  | 'link'
  | 'users'

export type PortalService = {
  id: number
  name: string
  description: string
  icon?: ServiceIconName | null
  url: string
  display_order: number
}

export type AdminService = PortalService & {
  status: ServiceStatus
  revision: number
  created_by?: number | null
  updated_by?: number | null
  created_at?: string | null
  updated_at?: string | null
  needs_review?: boolean
  validation_issues?: string[] | Record<string, string | string[]> | null
}

export type ServiceInput = Omit<PortalService, 'id' | 'icon'> & {
  icon: ServiceIconName
}
