import { createContext } from 'react'
import type { MyCollaboration } from '../types/collaboration.types'

export type CollaborationsContextValue = {
  collaborations: MyCollaboration[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

export const CollaborationsContext = createContext<
  CollaborationsContextValue | undefined
>(undefined)
