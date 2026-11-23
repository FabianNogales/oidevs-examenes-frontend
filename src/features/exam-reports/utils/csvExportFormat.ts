const UTF8_BOM = '\uFEFF'

/**
 * Parses a raw CSV string into rows/fields supporting quoted values, escaped
 * quotes (`""`), and mixed CRLF/LF line endings (RFC 4180).
 */
export function parseCsvRows(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      if (ch === '\r' && text[i + 1] === '\n') i += 1
    } else {
      field += ch
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function escapeCsvCell(value: string): string {
  const needsQuotes = /[",\r\n;]/.test(value) || /^\s|\s$/.test(value)
  if (!needsQuotes) return value
  return `"${value.replace(/"/g, '""')}"`
}

function isEmptyRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === '')
}

/**
 * Normalizes a server-exported exam report CSV into a clean RFC 4180 document
 * with UTF-8 BOM (`\uFEFF`) so Excel recognizes UTF-8 accents/ñ automatically,
 * enforces consistent quoting/CRLF endings, and inserts a clean blank separator
 * row between leading key-value metadata lines and the tabular data section.
 */
export function formatExamReportCsv(raw: string): string {
  const parsed = parseCsvRows(raw)
  while (parsed.length > 0 && isEmptyRow(parsed[parsed.length - 1])) {
    parsed.pop()
  }
  if (parsed.length === 0) return UTF8_BOM

  // Detect leading 1-or-2-column metadata block followed directly by a wider data table header.
  let metadataEndIndex = -1
  const maxWidth = parsed.reduce((max, r) => Math.max(max, r.length), 0)
  if (maxWidth >= 3) {
    for (let i = 0; i < parsed.length; i += 1) {
      const current = parsed[i]
      if (isEmptyRow(current)) {
        metadataEndIndex = -1 // Already separated by a blank line.
        break
      }
      if (current.length <= 2) {
        metadataEndIndex = i
      } else {
        break
      }
    }
  }

  const normalizedRows: string[][] = []
  parsed.forEach((row, index) => {
    normalizedRows.push(row)
    if (
      metadataEndIndex >= 0 &&
      index === metadataEndIndex &&
      index + 1 < parsed.length &&
      !isEmptyRow(parsed[index + 1])
    ) {
      normalizedRows.push([])
    }
  })

  const csvBody = normalizedRows
    .map((row) =>
      row.length === 0 ? '' : row.map((cell) => escapeCsvCell(cell)).join(','),
    )
    .join('\r\n')

  return `${UTF8_BOM}${csvBody}\r\n`
}

export async function normalizeExamReportCsvBlob(blob: Blob): Promise<Blob> {
  const rawText = await blob.text()
  const formatted = formatExamReportCsv(rawText)
  return new Blob([formatted], { type: 'text/csv;charset=utf-8;' })
}
