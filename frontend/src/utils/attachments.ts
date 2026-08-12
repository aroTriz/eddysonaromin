/**
 * Chat attachment helpers — turn a picked file into the attachment payload
 * the private-chat API stores (base64 data-URL, matching the blog images
 * convention so the Cloudflare D1 mirror needs no file storage).
 */
import type { ChatAttachment } from '@/services/privateChatApi'

export const MAX_ATTACHMENT_BYTES = 2_500_000 // 2.5MB

/** Read a File as a base64 data-URL. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error("couldn't read the file"))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a picked file to a ChatAttachment. Throws on oversized files.
 * Images keep their mime; everything else is a generic "file".
 */
export async function fileToAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`that file is too big — max 2.5MB (${formatBytes(MAX_ATTACHMENT_BYTES)})`)
  }
  const data = await readAsDataURL(file)
  const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
  return {
    kind: mime.startsWith('image/') ? 'image' : 'file',
    name: file.name,
    size: file.size,
    mime,
    data,
  }
}

/** 1234567 → "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** Short file-type label for file cards. */
export function fileTypeLabel(mime: string): string {
  const ext = mime.split('/').pop()?.toUpperCase()
  if (!ext || ext === 'OCTET-STREAM' || ext === 'UNKNOWN') return 'FILE'
  return ext.length > 6 ? 'FILE' : ext
}
