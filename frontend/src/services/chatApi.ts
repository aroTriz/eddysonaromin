/**
 * Community chat API client.
 * Mirrors the Laravel ChatController + Cloudflare Pages Functions.
 */

export interface ChatMessage {
  id: number
  name: string
  message: string
  location: string | null
  device: string | null
  created_at: string
}

const API_BASE = '/api/v1'

export interface ChatList {
  messages: ChatMessage[]
  total: number
}

/** Recent messages. Pass `after` to only fetch messages newer than that id. */
export async function fetchChatMessages(after = 0): Promise<ChatList> {
  const res = await fetch(`${API_BASE}/chat${after ? `?after=${after}` : ''}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load chat.')
  return (await res.json()) as ChatList
}

export interface ChatPostInput {
  name: string
  message: string
  client_id: string
  location?: string
  device?: string
  /** Real public IP (captured client-side from ipwho.is — admin-only). */
  ip?: string
}

/** Post a message. Throws with a `reason` ('link' | 'blocked' | 'cooldown') on 422/429. */
export async function postChatMessage(input: ChatPostInput): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { reason?: string; error?: string }
    const err = new Error(data.reason ?? data.error ?? 'Failed to send message.') as Error & {
      reason?: string
    }
    err.reason = data.reason
    throw err
  }
  const data = (await res.json()) as { message: ChatMessage }
  return data.message
}

/** Remembered chat name for a returning visitor. */
export async function fetchChatIdentity(clientId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/chat/identity?client_id=${encodeURIComponent(clientId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as { name?: string | null }
  return data.name ?? null
}

/** Save the visitor's chosen chat name. */
export async function saveChatIdentity(clientId: string, name: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, name }),
  })
  if (!res.ok) throw new Error('Failed to save identity.')
  const data = (await res.json()) as { name: string }
  return data.name
}
