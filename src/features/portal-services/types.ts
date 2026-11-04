export type ServiceStatus = 'ACTIVE' | 'INACTIVE'
export type DestinationType = 'INTERNAL' | 'EXTERNAL'
export type ServiceCategory = { id: number; name: string }
export type ServiceOptions = {
  icon_keys: string[]
  destination_types: DestinationType[]
  internal_destinations: {
    path: string
    label: string
    requires_auth: boolean
  }[]
}
export type PortalService = {
  id: number
  name: string
  description: string
  icon_key: string
  category: ServiceCategory
  destination_type: DestinationType
  destination: string
  requires_auth: boolean
  sort_order: number
}
export type AdminService = PortalService & {
  status: ServiceStatus
  revision: number
  created_by: number
  updated_by: number
}
export type ServiceInput = Omit<PortalService, 'id' | 'category'> & {
  category_id: number
}
