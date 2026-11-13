export type InformationKind = 'sections' | 'faqs'
export type InformationLink = { label: string; url: string }
export type SectionDraft = {
  title: string
  description: string
  links: InformationLink[]
  sort_order: number
}
export type FaqDraft = { question: string; answer: string; sort_order: number }
export type InformationDraft = SectionDraft | FaqDraft
export type AdminInformation = {
  id: number
  key?: string
  revision: number
  is_published: boolean
  has_unpublished_changes: boolean
  draft: InformationDraft
  published: InformationDraft | null
  published_at: string | null
  created_by: number | null
  updated_by: number | null
}
export type PublicInformation = {
  sections: (SectionDraft & { id: number; key: string })[]
  faqs: (FaqDraft & { id: number })[]
}
