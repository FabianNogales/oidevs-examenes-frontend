import { Button, Modal } from '@/shared/components/ui'

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
  return (
    <Modal
      isOpen={blocked}
      size="sm"
      title={isBusy ? 'Guardando evaluación' : 'Cambios sin guardar'}
      description={
        isBusy
          ? 'Se está guardando el examen. Espera a que termine la operación.'
          : 'Tienes cambios sin guardar. ¿Deseas descartarlos y salir?'
      }
      onClose={onStay}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onStay}>
            {stayLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isBusy}
            onClick={onDiscard}
          >
            Descartar cambios
          </Button>
        </>
      }
    />
  )
}
