import { useEffect } from 'react'

let locks = 0
let previousOverflow = ''
let previousPriority = ''

export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    if (locks === 0) {
      previousOverflow = document.body.style.getPropertyValue('overflow')
      previousPriority = document.body.style.getPropertyPriority('overflow')
      document.body.style.setProperty('overflow', 'hidden')
    }
    locks += 1
    return () => {
      locks -= 1
      if (locks === 0) {
        if (previousOverflow) {
          document.body.style.setProperty('overflow', previousOverflow, previousPriority)
        } else {
          document.body.style.removeProperty('overflow')
        }
      }
    }
  }, [isOpen])
}
