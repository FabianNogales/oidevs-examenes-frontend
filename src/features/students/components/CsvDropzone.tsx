import { useRef, useState } from 'react'
import type { DragEvent, KeyboardEvent } from 'react'
import styles from './StudentImportDesign.module.css'

type CsvDropzoneProps = {
  selectedFile: File | null
  validationMessage: string | null
  onFileSelected: (file: File) => void
  onRemoveFile: () => void
  className?: string
  fileStateClassName?: string
  errorId?: string
  labels?: {
    dropzoneLabel?: string
    title?: string
    inputLabel?: string
    selectButtonLabel?: string
    changeButtonLabel?: string
    removeButtonLabel?: string
    formatLabel?: string
    fileTypeLabel?: string
  }
}

export function CsvDropzone({
  selectedFile,
  validationMessage,
  onFileSelected,
  onRemoveFile,
  className,
  fileStateClassName,
  errorId,
  labels,
}: CsvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const descriptionId = 'student-csv-dropzone-description'
  const isCustomDropzone = labels !== undefined

  function openFilePicker() {
    inputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    const [file] = Array.from(event.dataTransfer.files)

    if (file) {
      onFileSelected(file)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openFilePicker()
    }
  }

  return (
    <div
      className={`${styles.dropzone} ${className ?? ''}`}
      data-dragging={isDragging}
      data-has-file={selectedFile !== null}
      role={isCustomDropzone ? 'region' : 'button'}
      tabIndex={isCustomDropzone ? undefined : 0}
      aria-label={labels?.dropzoneLabel}
      aria-describedby={isCustomDropzone ? undefined : descriptionId}
      onClick={isCustomDropzone ? undefined : openFilePicker}
      onKeyDown={isCustomDropzone ? undefined : handleKeyDown}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDragging(false)
        }
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept=".csv,text/csv"
        aria-describedby={isCustomDropzone ? errorId : descriptionId}
        aria-invalid={isCustomDropzone && errorId ? true : undefined}
        aria-label={
          labels?.inputLabel ?? 'Seleccionar archivo CSV de estudiantes'
        }
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            onFileSelected(file)
          }

          event.target.value = ''
        }}
      />

      {selectedFile ? (
        <div className={`${styles.fileState} ${fileStateClassName ?? ''}`}>
          <FileCheckIcon />
          <div>
            <strong>{selectedFile.name}</strong>
            <span>
              {formatFileSize(selectedFile.size)}
              {labels?.fileTypeLabel ? ` · ${labels.fileTypeLabel}` : ''}
            </span>
          </div>
          {labels?.changeButtonLabel ? (
            <button
              type="button"
              className={styles.selectFileButton}
              onClick={(event) => {
                event.stopPropagation()
                openFilePicker()
              }}
            >
              {labels.changeButtonLabel}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.removeFileButton}
            onClick={(event) => {
              event.stopPropagation()
              onRemoveFile()
            }}
          >
            {labels?.removeButtonLabel ?? 'Quitar archivo'}
          </button>
        </div>
      ) : (
        <div className={styles.emptyDropzoneState}>
          <UploadFileIcon />
          <p id={descriptionId} className={styles.dropzoneTitle}>
            {labels?.title ?? 'Arrastra tu archivo CSV aquí'}
          </p>
          <span>o selecciónalo desde tu equipo</span>
          <button
            type="button"
            className={styles.selectFileButton}
            onClick={(event) => {
              event.stopPropagation()
              openFilePicker()
            }}
          >
            {labels?.selectButtonLabel ?? 'Seleccionar archivo'}
          </button>
          <small>{labels?.formatLabel ?? 'Formato admitido: .csv'}</small>
        </div>
      )}

      {validationMessage ? <p role="status">{validationMessage}</p> : null}
    </div>
  )
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  const kilobytes = size / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function UploadFileIcon() {
  return (
    <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M12 17V10" />
      <path d="m8.5 13.5 3.5-3.5 3.5 3.5" />
    </svg>
  )
}

function FileCheckIcon() {
  return (
    <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="m9 15 2 2 4-5" />
    </svg>
  )
}
