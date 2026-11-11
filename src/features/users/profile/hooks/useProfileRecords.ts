import { useEffect, useState } from 'react'
import { getProfileRecords } from '../../api/adminProfileRecordsApi'
import type { ProfileRecord, ProfileSection } from '../../api/adminProfileRecordsApi'
import type { UnifiedEntityProfile } from '../types/entityProfile.types'
import type { TablePaginationMeta } from '@/shared/components/DataTable/dataTable.types'

// TODO(HU21-P02/P04/P05; HU22-P06/P08): preserve the original multi-field searches and
// optional term/result filters when the server supports them across ALL pages.
// Do not emulate them by filtering the current page. Original predicates and
// recovery paths: docs/HU21_HU22_FUNCIONALIDADES_FUTURAS.md.
export function useProfileRecords<T extends { id: number }>(entity: UnifiedEntityProfile, section: ProfileSection, search: string, filter = 'ACTIVE') {
  const type = entity.role === 'TEACHER' ? 'teachers' : 'students'
  const key = JSON.stringify([type, entity.id, section, search, filter])
  const [query, setQuery] = useState({ key, page: 1, version: 0 })
  const page = query.key === key ? query.page : 1
  const requestKey = JSON.stringify([key, page, query.version])
  const [state, setState] = useState<{ key: string; items: T[]; pagination: TablePaginationMeta | null; summary: { active: number; completed: number } | null; error: string | null }>({ key: '', items: [], pagination: null, summary: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    getProfileRecords(type, entity.id, section, page, search, filter, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ key: requestKey, ...result, items: result.items as (ProfileRecord & T)[], error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key: requestKey, items: [], pagination: null, summary: null, error: error instanceof Error ? error.message : 'No se pudo consultar la información.' })
    })
    return () => controller.abort()
  }, [type, entity.id, section, page, search, filter, requestKey])
  const current = state.key === requestKey
  return { items: current ? state.items : [], loading: !current, error: current ? state.error : null,
    pagination: current ? state.pagination : null, summary: current ? state.summary : null,
    onPageChange: (next: number) => setQuery({ key, page: next, version: query.version }),
    reload: () => setQuery({ key, page, version: query.version + 1 }) }
}
