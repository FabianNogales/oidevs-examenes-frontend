function filenamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '')
}

export function getQrFilename(subject: string, examTitle: string): string {
  return `EIDA-${filenamePart(subject) || 'Materia'}-${filenamePart(examTitle) || 'Examen'}`
}

export async function svgToPng(svgDataUrl: string): Promise<Blob> {
  if (!svgDataUrl.startsWith('data:image/svg+xml;base64,')) {
    throw new Error('Invalid SVG image')
  }

  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not load SVG image'))
    // Use the exact SVG displayed by the card; no network request or new QR.
    image.src = svgDataUrl
  })

  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Invalid SVG dimensions')
  }

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  // Print background must remain white regardless of the application's theme.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.imageSmoothingEnabled = false
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not export PNG'))
    }, 'image/png')
  })
}

export function downloadQrBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    // Allow the browser to start the download before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
