import { useCallback } from 'react'
import { usePortalResource } from '@/features/portal-shared/usePortalResource'
import {
  ContentLink,
  PortalFeedback,
  PortalPageLayout,
} from '@/features/portal-shared/PortalUi'
import { getInformation } from './informationApi'
import type { InformationDraft } from './types'
import styles from '@/features/portal-shared/portalShared.module.css'

export function InformationContent({ content }: { content: InformationDraft }) {
  return 'title' in content ? (
    <article>
      <h3>{content.title}</h3>
      <p className={styles.description}>{content.description}</p>
      {content.links.length ? (
        <ul>
          {content.links.map((link, index) => (
            <li key={index}>
              <ContentLink url={link.url}>{link.label}</ContentLink>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  ) : (
    <article>
      <h3>{content.question}</h3>
      <p className={styles.description}>{content.answer}</p>
    </article>
  )
}

export function InformationPage() {
  const load = useCallback((signal: AbortSignal) => getInformation(signal), [])
  const result = usePortalResource(load)
  return (
    <PortalPageLayout title="Información institucional">
      <PortalFeedback {...result} retry={result.reload} />
      {result.data ? (
        <>
          {result.data.sections.map((section) => (
            <section key={section.id} className={styles.section}>
              <h2>{section.title}</h2>
              <p className={styles.description}>{section.description}</p>
              {section.links.length ? (
                <ul>
                  {section.links.map((link, index) => (
                    <li key={index}>
                      <ContentLink url={link.url}>{link.label}</ContentLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {result.data.sections.length === 0 ? (
            <p role="status">No hay información institucional publicada.</p>
          ) : null}
          <h2>Preguntas frecuentes</h2>
          {result.data.faqs.length === 0 ? (
            <p role="status">No hay preguntas frecuentes publicadas.</p>
          ) : (
            result.data.faqs.map((faq) => (
              <details key={faq.id} className={styles.faq}>
                <summary>{faq.question}</summary>
                <p className={styles.description}>{faq.answer}</p>
              </details>
            ))
          )}
        </>
      ) : null}
    </PortalPageLayout>
  )
}
