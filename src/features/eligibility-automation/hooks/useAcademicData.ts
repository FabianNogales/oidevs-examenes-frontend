import { useCallback, useEffect, useRef, useState } from 'react'
import { getAcademicRecords, getImportSchema } from '../api/eligibilityAutomationApi'
import type { AcademicRecord, ApiPage, ImportSchema } from '../types/eligibilityAutomation.types'
import { academicDiagnostic, academicLoadError } from '../utils/automationPresentation'

export function useAcademicData(offeringId: number | undefined, enabled: boolean) {
  const [schemaState, setSchema] = useState<{ offeringId: number; data: ImportSchema } | null>(null)
  const [recordsState, setRecords] = useState<{ offeringId: number; data: ApiPage<AcademicRecord> } | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [schemaError, setSchemaError] = useState('')
  const [recordsError, setRecordsError] = useState('')
  const [schemaDiagnostic, setSchemaDiagnostic] = useState('')
  const [recordsDiagnostic, setRecordsDiagnostic] = useState('')
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordQuery, setRecordQuery] = useState('')
  const schemaRequest = useRef<AbortController | null>(null)
  const recordsRequest = useRef<AbortController | null>(null)

  const loadSchema = useCallback(async () => {
    if (!offeringId) return
    schemaRequest.current?.abort()
    const controller = new AbortController()
    schemaRequest.current = controller
    setSchemaLoading(true)
    setSchemaError('')
    setSchemaDiagnostic('')
    try {
      const data = await getImportSchema(offeringId, controller.signal)
      if (!controller.signal.aborted) setSchema({ offeringId, data })
    } catch (error) {
      if (!controller.signal.aborted) {
        setSchemaError(academicLoadError(error, 'No se pudo cargar el esquema CSV.'))
        setSchemaDiagnostic(academicDiagnostic(error))
      }
    } finally {
      if (!controller.signal.aborted) setSchemaLoading(false)
    }
  }, [offeringId])

  const fetchRecords = useCallback(async (page: number, query: string) => {
    if (!offeringId) return
    recordsRequest.current?.abort()
    const controller = new AbortController()
    recordsRequest.current = controller
    setRecordsLoading(true)
    setRecordsError('')
    setRecordsDiagnostic('')
    setRecordsPage(page)
    setRecordQuery(query)
    try {
      const data = await getAcademicRecords(offeringId, page, query, controller.signal)
      if (!controller.signal.aborted) setRecords({ offeringId, data })
    } catch (error) {
      if (!controller.signal.aborted) {
        setRecordsError(academicLoadError(error, 'No se pudieron consultar los registros académicos.'))
        setRecordsDiagnostic(academicDiagnostic(error))
      }
    } finally {
      if (!controller.signal.aborted) setRecordsLoading(false)
    }
  }, [offeringId])

  useEffect(() => {
    if (!enabled || !offeringId) return
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setSchema(null)
      setRecords(null)
      void loadSchema()
      void fetchRecords(1, '')
    })
    return () => {
      active = false
      schemaRequest.current?.abort()
      recordsRequest.current?.abort()
    }
  }, [enabled, offeringId, loadSchema, fetchRecords])

  return {
    schema: schemaState && schemaState.offeringId === offeringId ? schemaState.data : null,
    records: recordsState && recordsState.offeringId === offeringId ? recordsState.data : null,
    schemaLoading, recordsLoading, schemaError, recordsError, schemaDiagnostic, recordsDiagnostic,
    loadSchema,
    loadRecords: (page = recordsPage, query = recordQuery) => fetchRecords(page, query),
  }
}
