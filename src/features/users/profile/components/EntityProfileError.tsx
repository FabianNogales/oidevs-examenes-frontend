import { useId } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import layoutStyles from '@/features/users/profile/components/EntityProfileLayout.module.css'

/**
 * Load-error state of the admin entity profiles (DS5-F2). AdminLayout provides the main landmark: this adds
 * the page's h1 through the shared header and keeps the existing alert card with its message and back button.
 */
export function EntityProfileError({
  title,
  message,
  backLabel,
  onBack,
}: {
  title: string
  message: string
  backLabel: string
  onBack: () => void
}) {
  const titleId = useId()
  return (
    <PageContainer labelledBy={titleId}>
      <PageHeader title={title} titleId={titleId} />
      <div className={layoutStyles.sectionCard} role="alert">
        <p>{message}</p>
        <button
          type="button"
          className={layoutStyles.cancelBtn}
          onClick={onBack}
        >
          {backLabel}
        </button>
      </div>
    </PageContainer>
  )
}
