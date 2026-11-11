import { useEffect, useRef } from 'react'
import layoutStyles from './ExamSchedulerLayout.module.css'

export interface ExamNavigationGuardBannerProps {
  blocked: boolean
  isBusy: boolean
  stayLabel?: string
  onStay: () => void
  onDiscard: () => void
}

export function ExamNavigationGuardBanner({
  blocked,
  isBusy,
  stayLabel = 'Continuar',
  onStay,
  onDiscard,
}: ExamNavigationGuardBannerProps) {
  const noticeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (blocked) noticeRef.current?.focus()
  }, [blocked])

  if (!blocked) return null

  return (
    <section
      ref={noticeRef}
      tabIndex={-1}
      className={layoutStyles.navigationGuardBanner}
      role="alert"
    >
      <p>
        {isBusy
          ? 'Se está guardando el examen. Espera a que termine la operación.'
          : 'Tienes cambios sin guardar. ¿Deseas descartarlos y salir?'}
      </p>
      <div className={layoutStyles.inlineActionRow}>
        <button
          type="button"
          className={layoutStyles.inlineSecondaryBtn}
          onClick={onStay}
        >
          {stayLabel}
        </button>
        <button
          type="button"
          className={layoutStyles.inlinePrimaryBtn}
          disabled={isBusy}
          onClick={onDiscard}
        >
          Descartar cambios
        </button>
      </div>
    </section>
  )
}