// ── Image compression via Canvas ─────────────────────────────────────────────
export async function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}

// ── XHR upload with progress ──────────────────────────────────────────────────
export function uploadFile(
  blob: Blob,
  filename: string,
  mimeType: string,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const tg = (window as any).Telegram?.WebApp
    const initData = tg?.initData || ''

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.setRequestHeader('x-telegram-init-data', initData)
    xhr.setRequestHeader('Content-Type', mimeType)
    xhr.setRequestHeader('X-Filename', encodeURIComponent(filename))

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data.url)
        } catch { reject(new Error('Invalid response')) }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error || `Upload failed (${xhr.status})`))
        } catch { reject(new Error(`Upload failed (${xhr.status})`)) }
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(blob)
  })
}

// ── Prepare and upload any file (with optional image compression) ─────────────
export async function prepareAndUpload(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ url: string; mimeType: string; fileName: string }> {
  const MAX_BYTES = 10 * 1024 * 1024

  let blob: Blob = file
  let mimeType = file.type
  let fileName = file.name

  if (file.type.startsWith('image/') && file.size > 300 * 1024) {
    blob = await compressImage(file)
    mimeType = blob.type
    const ext = mimeType === 'image/png' ? 'png' : 'jpg'
    fileName = fileName.replace(/\.[^.]+$/, `.${ext}`)
  }

  if (blob.size > MAX_BYTES) throw new Error('Файл слишком большой. Максимум 10 МБ')

  const url = await uploadFile(blob, fileName, mimeType, onProgress)
  return { url, mimeType, fileName }
}

// ── Upload a raw Blob (voice/video note) ─────────────────────────────────────
export async function uploadBlob(
  blob: Blob,
  filename: string,
  onProgress: (percent: number) => void
): Promise<string> {
  if (blob.size > 10 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум 10 МБ')
  return uploadFile(blob, filename, blob.type, onProgress)
}
