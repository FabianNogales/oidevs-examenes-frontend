import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { ExamsSkeleton } from '../ExamsSkeleton'
import layoutStyles from './ExamSchedulerLayout.module.css'
import pageStyles from '../../pages/TeacherExamsPage.module.css'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface ExamSchedulerPageShellProps {
  breadcrumbs: BreadcrumbItem[]
  title: string
  subtitle: string
  children: React.ReactNode
}

export function ExamSchedulerPageShell({
  breadcrumbs,
  title,
  subtitle,
  children,
}: ExamSchedulerPageShellProps) {
  return (
    <main className={layoutStyles.schedulerPage}>
      <Breadcrumbs items={breadcrumbs} />
      <header className={layoutStyles.pageHeader}>
        <div className={layoutStyles.titleGroup}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </main>
  )
}

export interface ExamPageStateNoticeProps {
  isLoading?: boolean
  role?: 'alert' | 'status'
  title?: string
  message: string
  onRetry?: () => void
}

export function ExamPageStateNotice({
  isLoading = false,
  role = 'alert',
  title,
  message,
  onRetry,
}: ExamPageStateNoticeProps) {
  if (isLoading) return <ExamsSkeleton />

  return (
    <section className={pageStyles.state} role={role}>
      {title ? <h2>{title}</h2> : null}
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          className={layoutStyles.inlineSecondaryBtn}
          onClick={onRetry}
        >
          Reintentar
        </button>
      ) : null}
    </section>
  )
}