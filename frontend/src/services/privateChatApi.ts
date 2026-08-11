/**
 * Private chat (visitor ↔ admin DMs) API client.
 * Mirrors the Laravel PrivateChatController + Cloudflare Pages Functions.
 *
 * Auth: register/login return a bearer token kept in localStorage
 * (`aromin_private_token`); every chat call sends it as `Authorization`.
 * Visitors always chat with the site admin — no user search, no arbitrary
 * contacts. The admin replies from the /aromin area (adminApi.ts).
 */

export interface PrivateUser {
  id: number
  name: string
  email: string
}

export interface PrivateMessage {
  id: number
  sender_id: number
  message: string
  created_at: string
}

export interface PrivateConversation {
  id: number
  user: { id: number; name: string }
  last_message: {
    id: number
    sender_id: number
    message: string
    created_at: string
  } | null
  unread: number
  updated_at: string
}

const API_BASE = '/api/v1'
const TOKEN_KEY = 'aromin_private_token'

export function privateToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setPrivateToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = privateToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extra ?? {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string
    reason?: string
    message?: string
    errors?: Record<string, string[]>
  }
  if (!res.ok) {
    // Laravel validation errors surface as { message, errors } — unwrap the
    // first field error so the UI can show something useful.
    let msg = data.error ?? data.reason ?? data.message ?? 'Request failed'
    if (data.errors) {
      const first = Object.values(data.errors)[0]?.[0]
      if (first) msg = first
    }
    const err = new Error(msg) as Error & { reason?: string; status: number }
    err.reason = data.reason
    err.status = res.status
    throw err
  }
  return data
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      message?: string
      errors?: Record<string, string[]>
    }
    let msg = data.error ?? data.message ?? 'Request failed'
    if (data.errors) {
      const first = Object.values(data.errors)[0]?.[0]
      if (first) msg = first
    }
    const err = new Error(msg) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return (await res.json()) as T
}

// ── Auth ────────────────────────────────────────────────────────────

export interface PrivateAuthResult {
  success: boolean
  token: string
  user: PrivateUser
}

export async function privateRegister(input: {
  name: string
  email: string
  password: string
  password_confirmation: string
}): Promise<PrivateAuthResult> {
  return post<PrivateAuthResult>('/private/auth/register', input)
}

export async function privateLogin(input: {
  email: string
  password: string
}): Promise<PrivateAuthResult> {
  return post<PrivateAuthResult>('/private/auth/login', input)
}

export async function privateLogout(): Promise<void> {
  try {
    await post<{ success: boolean }>('/private/auth/logout', {})
  } catch {
    /* local state clears regardless */
  }
}

/** Validate the stored token against the server; null when logged out. */
export async function privateSession(): Promise<PrivateUser | null> {
  if (!privateToken()) return null
  try {
    const data = await get<{ authenticated: boolean; user: PrivateUser }>('/private/auth/session')
    return data.authenticated ? data.user : null
  } catch {
    return null
  }
}

// ── Chat (visitor ↔ admin) ──────────────────────────────────────────

/** The admin the visitor chats with. */
export async function fetchPrivateAdmin(): Promise<{ id: number; name: string }> {
  const data = await get<{ admin: { id: number; name: string } }>('/private/admin')
  return data.admin
}

/** Find (or create) the visitor's conversation with the admin. */
export async function startAdminConversation(): Promise<PrivateConversation> {
  const data = await post<{ conversation: PrivateConversation }>('/private/conversations', {})
  return data.conversation
}

export async function fetchPrivateMessages(
  convId: number,
  after = 0,
): Promise<PrivateMessage[]> {
  const data = await get<{ messages: PrivateMessage[] }>(
    `/private/conversations/${convId}/messages${after ? `?after=${after}` : ''}`,
  )
  return data.messages
}

export async function sendPrivateMessage(
  convId: number,
  message: string,
): Promise<PrivateMessage> {
  const data = await post<{ message: PrivateMessage }>(
    `/private/conversations/${convId}/messages`,
    { message },
  )
  return data.message
}

export async function markPrivateRead(convId: number): Promise<void> {
  await post<{ success: boolean }>(`/private/conversations/${convId}/read`, {})
}

/** Live stream endpoint for a conversation (SSE, Bearer-auth via fetch). */
export function privateStreamUrl(convId: number, after: number): string {
  return `${API_BASE}/private/conversations/${convId}/stream?after=${after}`
}
