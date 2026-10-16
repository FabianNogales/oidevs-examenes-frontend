import { useContext } from 'react'
import { CollaborationsContext } from './CollaborationsContext'

export function useMyCollaborations() {
  const context = useContext(CollaborationsContext)
  if (!context)
    throw new Error('useMyCollaborations requiere CollaborationsProvider.')
  return context
}
