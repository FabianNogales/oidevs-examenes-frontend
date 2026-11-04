import type { EntryHistoryRecord } from '@/features/exams/types/entryQr.types'

export type EntryAnnulment = {
  reason: string
  annulled_at: string
  annulled_by: { id: number; name: string }
}

// Additive extension: older history responses remain readable, but cannot
// authorize an annulment without an explicit server permission.
export type AnnulmentHistoryRecord = EntryHistoryRecord & {
  permissions?: { can_annul: boolean }
  entry: EntryHistoryRecord['entry'] & {
    annulment?: EntryAnnulment | null
  }
}

export type AnnulEntryPayload = { reason: string; confirmed: boolean }
export type AnnulEntryErrors = Partial<Record<'reason' | 'confirmed', string>>
