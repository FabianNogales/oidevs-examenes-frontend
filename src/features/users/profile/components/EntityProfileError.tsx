import { useId } from 'react'
import { ChevronLeft } from 'lucide-react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { Button, Card, Icon, Text } from '@/shared/components/ui/index'
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
      <Card as="div" className={layoutStyles.sectionCard} role="alert">
        <Text>{message}</Text>
        <Button
          type="button"
          variant="secondary"
          className={layoutStyles.cancelBtn}
          onClick={onBack}
        >
          <Icon icon={ChevronLeft} size="sm" />
          <span>{backLabel}</span>
        </Button>
      </Card>
    </PageContainer>
  )
}
