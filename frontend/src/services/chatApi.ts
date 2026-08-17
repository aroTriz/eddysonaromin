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

/** Whether the community chat currently accepts new messages. Fail-open. */
export async function fetchCommunityChatEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return true
    const data = (await res.json()) as { community_chat_enabled?: boolean }
    return data.community_chat_enabled !== false
  } catch {
    return true
  }
}

/** Whether the animated backdrops are on. Fail-open (default: on). */
export async function fetchBackdropEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return true
    const data = (await res.json()) as { backdrop_enabled?: boolean }
    return data.backdrop_enabled !== false
  } catch {
    return true
  }
}

/** Whether the "click me..." sidebar button is shown. Fail-open (default: on). */
export async function fetchClickMeEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return true
    const data = (await res.json()) as { click_me_enabled?: boolean }
    return data.click_me_enabled !== false
  } catch {
    return true
  }
}

/** Whether the "Ask Triz.ai" sidebar button is enabled. Fail-open (default: on). */
export async function fetchAskTrizEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return true
    const data = (await res.json()) as { ask_triz_enabled?: boolean }
    return data.ask_triz_enabled !== false
  } catch {
    return true
  }
}
