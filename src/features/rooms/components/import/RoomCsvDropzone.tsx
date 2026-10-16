import { useId, useRef, useState, type DragEvent } from 'react'
import { formatRoomFileSize } from '../../utils/roomCsv'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function RoomCsvDropzone({
  file,
  disabled,
  onSelect,
  onRemove,
  onError,
}: {
  file: File | null
  disabled: boolean
  onSelect: (file: File) => void
  onRemove: () => void
  onError: (message: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const descriptionId = useId()
  function openPicker() {
    if (!disabled) input.current?.click()
  }
  function select(files: FileList | null) {
    if (disabled || !files?.length) return
    if (files.length > 1) {
      onError('Selecciona un solo archivo CSV por importación.')
      return
    }
    onSelect(files[0])
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    select(event.dataTransfer.files)
  }
  return (
    <div
      className={styles.dropzone}
      data-dragging={dragging}
      data-has-file={Boolean(file)}
      role="group"
      aria-label="Archivo CSV de aulas"
      aria-describedby={descriptionId}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragging(false)
      }}
      onDrop={drop}
    >
      <input
        ref={input}
        className={styles.fileInput}
        type="file"
        accept=".csv,text/csv"
        aria-label="Seleccionar archivo CSV de aulas"
        disabled={disabled}
        onChange={(event) => {
          select(event.target.files)
          event.target.value = ''
        }}
      />
      <svg
        className={styles.dropzoneIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h5M12 17v-7m-3.5 3.5 3.5-3.5 3.5 3.5" />
      </svg>
      {file ? (
        <div className={styles.fileState}>
          <div>
            <strong>{file.name}</strong>
            <span>{formatRoomFileSize(file.size)}</span>
          </div>
          <button
            type="button"
            className={styles.removeFileButton}
            disabled={disabled}
            onClick={onRemove}
          >
            Quitar archivo
          </button>
        </div>
      ) : (
        <>
          <p id={descriptionId} className={styles.dropzoneTitle}>
            Arrastra tu archivo CSV aquí
          </p>
          <span>o selecciónalo desde tu equipo</span>
        </>
      )}
      {file && (
        <span id={descriptionId}>Archivo seleccionado para validar.</span>
      )}
      <button
        type="button"
        className={styles.selectFileButton}
        onClick={openPicker}
        disabled={disabled}
      >
        {file ? 'Cambiar archivo' : 'Seleccionar archivo'}
      </button>
      <small>Formato admitido: .csv · Máximo 10 MB</small>
    </div>
  )
}
