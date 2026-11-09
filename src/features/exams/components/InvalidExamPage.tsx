import { useId } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'

/**
 * Invalid exam route parameter (R2). Teacher exam pages render under AppLayout, which has no main landmark:
 * this keeps the page's single main landmark and h1 with the shared header, without breadcrumbs or exam
 * navigation (there is no valid exam to link to), and the exact role="alert" message of each page.
 */
export function InvalidExamPage({
  title,
  message,
}: {
  title: string
  message: string
}) {
  const titleId = useId()
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader title={title} titleId={titleId} />
        <p role="alert">{message}</p>
      </PageContainer>
    </main>
  )
}
