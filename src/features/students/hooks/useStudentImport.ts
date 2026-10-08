import { useState, useEffect } from 'react'
import type { StudentImportPreview } from '@/features/students/types/studentImport'
import { previewStudentImport, confirmStudentImport, getStudentImportErrorMessage } from '@/features/students/api/studentImportApi'
import { validateStudentImportCsv } from '@/features/students/utils/csvValidation'
import type { AuthNotice } from '@/features/auth/types/auth'

const IMPORT_STORAGE_KEY = 'eida_last_student_import_preview'

export function useStudentImport() {
  // 1. Inicializar el estado recuperando datos del Local Storage si existen
  const [previewData, setPreviewData] = useState<StudentImportPreview | null>(() => {
    const saved = localStorage.getItem(IMPORT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  })
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [notice, setNotice] = useState<AuthNotice | null>(null)

  // 2. Efecto para sincronizar el estado con Local Storage automáticamente
  useEffect(() => {
    if (previewData) {
      localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(previewData))
    } else {
      localStorage.removeItem(IMPORT_STORAGE_KEY)
    }
  }, [previewData])

  // 3. Procesar y previsualizar el archivo
  const processFile = async (file: File) => {
    setIsProcessing(true)
    setNotice(null)

    try {
      // Validación inicial en frontend
      const validation = await validateStudentImportCsv(file) //[cite: 17]
      if (!validation.isValid) {
        setNotice({ type: 'error', message: validation.message || 'El archivo no es válido.' })
        return
      }

      // Petición al backend
      const data = await previewStudentImport(file) //[cite: 15]
      setPreviewData(data)
      setNotice({ type: 'success', message: 'Archivo leído con éxito. Revisa la vista previa.' })
      
    } catch (error) {
      // Mapeo de errores usando la función existente en tu API
      const errorMessage = getStudentImportErrorMessage(error) //[cite: 15]
      setNotice({ type: 'error', message: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  // 4. Confirmar la importación definitivamente
  const confirmImport = async (file: File) => {
    setIsProcessing(true)
    try {
      await confirmStudentImport(file) //[cite: 15]
      setNotice({ type: 'success', message: 'Importación confirmada y registrada exitosamente.' })
      clearImport() // Limpiamos el Local Storage tras el éxito
    } catch (error) {
      const errorMessage = getStudentImportErrorMessage(error) //[cite: 15]
      setNotice({ type: 'error', message: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  // 5. Cancelar / Limpiar progreso
  const clearImport = () => {
    setPreviewData(null)
    localStorage.removeItem(IMPORT_STORAGE_KEY)
  }

  const dismissNotice = () => setNotice(null)

  return {
    previewData,
    isProcessing,
    notice,
    processFile,
    confirmImport,
    clearImport,
    dismissNotice
  }
}