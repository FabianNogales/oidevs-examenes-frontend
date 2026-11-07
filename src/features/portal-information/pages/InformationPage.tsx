import { useCallback } from 'react'
import { usePortalResource } from '@/features/portal-shared/hooks/usePortalResource'
import {
  ContentLink,
  PortalFeedback,
  PortalPageLayout,
} from '@/features/portal-shared/components/PortalUi'
import { getInformation } from '../api/informationApi'
import type { InformationDraft } from '../types/information.types'
import styles from '@/features/portal-shared/components/portalShared.module.css'
import informationStyles from './InformationPage.module.css'

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
      <p className={informationStyles.intro}>
        Conoce el propósito de EIDA, sus orientaciones de uso y las respuestas a
        consultas frecuentes.
      </p>
      <PortalFeedback {...result} retry={result.reload} />
      {result.data ? (
        result.data.sections.length > 0 || result.data.faqs.length > 0 ? (
          <div className={informationStyles.content}>
            {result.data.sections.map((section) => (
              <section key={section.id} className={informationStyles.section}>
                <h2>{section.title}</h2>
                <p className={styles.description}>{section.description}</p>
                {section.links.length ? (
                  <ul className={informationStyles.links}>
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <ContentLink url={link.url}>{link.label}</ContentLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            {result.data.faqs.length > 0 ? (
              <section className={informationStyles.faqSection}>
                <h2>Preguntas frecuentes</h2>
                <div className={informationStyles.faqList}>
                  {result.data.faqs.map((faq) => (
                    <details key={faq.id} className={informationStyles.faq}>
                      <summary>{faq.question}</summary>
                      <p className={styles.description}>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className={informationStyles.empty} role="status">
            No hay información institucional publicada en este momento.
          </div>
        )
      ) : null}
    </PortalPageLayout>
  )
}
