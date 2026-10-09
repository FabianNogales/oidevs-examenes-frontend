import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  getCollaborationError,
  getMyCollaborations,
} from '../api/collaborationsApi'
import { CollaborationsContext } from '../hooks/CollaborationsContext'
import type { MyCollaboration } from '../types/collaboration.types'

type LoadState = {
  userId: number | null
  collaborations: MyCollaboration[]
  isLoading: boolean
  error: string | null
}

export function CollaborationsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const userId =
    !authLoading && user && !user.must_change_password ? user.id : null
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<LoadState>({
    userId: null,
    collaborations: [],
    isLoading: false,
    error: null,
  })
  const reload = useCallback(() => setVersion((current) => current + 1), [])

  useEffect(() => {
    if (userId === null) {
      setState({
        userId: null,
        collaborations: [],
        isLoading: false,
        error: null,
      })
      return
    }
    const controller = new AbortController()
    setState({
      userId,
      collaborations: [],
      isLoading: true,
      error: null,
    })
    void getMyCollaborations(controller.signal)
      .then((collaborations) => {
        if (!controller.signal.aborted) {
          setState({
            userId,
            collaborations,
            isLoading: false,
            error: null,
          })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            userId,
            collaborations: [],
            isLoading: false,
            error: getCollaborationError(
              error,
              'No se pudieron cargar las colaboraciones.',
            ),
          })
        }
      })
    return () => controller.abort()
  }, [userId, version])

  // Never expose the previous account's authorizations during login/logout.
  const current = userId !== null && state.userId === userId
  return (
    <CollaborationsContext.Provider
      value={{
        collaborations: current ? state.collaborations : [],
        isLoading: userId !== null && (!current || state.isLoading),
        error: current ? state.error : null,
        reload,
      }}
    >
      {children}
    </CollaborationsContext.Provider>
  )
}
