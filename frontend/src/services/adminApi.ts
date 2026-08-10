import { getToken } from '@/composables/useAuth'
import type { BlogPost, Recommendation } from '@/types'
/**
 * Authenticated API client for the /aromin admin area.
 * Every call attaches the admin Bearer token.
 *
 * List fetches are cached in memory (30s TTL) so revisiting admin tabs is
 * instant â€” only the first visit per session waits on the API. Mutations
 * invalidate the affected cache so edits always show fresh data.
 */

const API_BASE = '/api/v1'

const CACHE_TTL = 30_000
const adminCache = new Map<string, { data: unknown; at: number }>()

function cachedAdmin<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = adminCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return Promise.resolve(hit.data as T)
  }
  return fetcher().then((data) => {
    adminCache.set(key, { data, at: Date.now() })
    return data
  })
}

/** Drop a cached admin list (called after create/update/archive/delete). */
function invalidateAdmin(...keys: string[]): void {
  for (const k of keys) adminCache.delete(k)
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handle<T>(res: Response): Promise<T> {
  let payload: unknown
  try {
    payload = await res.json()
  } catch {
    throw new Error('The API returned an invalid response.')
  }

  if (!res.ok) {
    const message = (payload as { error?: string; message?: string })?.error
      ?? (payload as { message?: string })?.message
      ?? 'Request failed.'
    throw new Error(message)
  }

  return (payload as { data?: T })?.data as T
}

export interface AdminStats {
  visitors: number
  posts: number
  projects: number
  messages: number
  recommendations: number
}

export interface BlogPostInput {
  title: string
  excerpt: string
  content: string
  images: string[]
  tags: string[]
  published_at?: string | null
}

/** Dashboard stats. */
export function fetchAdminStats(): Promise<AdminStats> {
  return cachedAdmin('admin:stats', async () => {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() })
    return handle<AdminStats>(res)
  })
}

/** All posts (including drafts) â€” newest first. Pass archived=true for archived ones. */
export function fetchAdminPosts(archived = false): Promise<BlogPost[]> {
  const key = `admin:posts:${archived ? 'archived' : 'active'}`
  return cachedAdmin(key, async () => {
    const res = await fetch(`${API_BASE}/admin/blog/posts${archived ? '?archived=1' : ''}`, {
      headers: authHeaders(),
    })
    return handle<BlogPost[]>(res)
  })
}

/** Archive a post (hides it from the site + active list; restorable). */
export async function archiveAdminPost(id: number): Promise<BlogPost> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}/archive`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<BlogPost>(res)
}

/** Restore an archived post. */
export async function restoreAdminPost(id: number): Promise<BlogPost> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<BlogPost>(res)
}

/** Create a post. */
export async function createAdminPost(input: BlogPostInput): Promise<BlogPost> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<BlogPost>(res)
}

/** Update a post by id. */
export async function updateAdminPost(id: number, input: Partial<BlogPostInput>): Promise<BlogPost> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<BlogPost>(res)
}

/** Delete a post by id. */
export async function deleteAdminPost(id: number): Promise<void> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Bulk delete posts by ids. */
export async function deleteAdminPosts(ids: number[]): Promise<{ deleted: number }> {
  invalidateAdmin('admin:posts:active', 'admin:posts:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/blog/posts/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  })
  return handle<{ deleted: number }>(res)
}

/** Fetch the visitor count (public). */
export async function fetchVisitors(): Promise<number> {
  const res = await fetch(`${API_BASE}/visitors`)
  const payload = (await res.json().catch(() => null)) as { count?: number } | null
  return payload?.count ?? 0
}

/** Increment the visitor count (public) and return the new count. */
export async function incrementVisitors(): Promise<number> {
  const res = await fetch(`${API_BASE}/visitors`, { method: 'POST' })
  const payload = (await res.json().catch(() => null)) as { count?: number } | null
  return payload?.count ?? 0
}

export interface ChatAdminMessage {
  id: number
  name: string
  message: string
  ip: string | null
  location: string | null
  device: string | null
  created_at: string
  archived_at: string | null
  delete_at: string | null
}

/** All chat messages for moderation. Pass archived=true for archived ones. */
export function fetchAdminChatMessages(archived = false): Promise<ChatAdminMessage[]> {
  const key = `admin:chat:${archived ? 'archived' : 'active'}`
  return cachedAdmin(key, async () => {
    const res = await fetch(`${API_BASE}/admin/chat/messages${archived ? '?archived=1' : ''}`, {
      headers: authHeaders(),
    })
    return handle<ChatAdminMessage[]>(res)
  })
}

/** Archive a chat message (hides it from the public chat; restorable). */
export async function archiveAdminChatMessage(id: number): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/${id}/archive`, {
    method: 'POST',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Restore an archived chat message. */
export async function restoreAdminChatMessage(id: number): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Toggle the "delete after 72 hours" schedule for one message. */
export async function setAdminChatMessageDeleteAfter(id: number, enabled: boolean): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/${id}/delete-after`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  })
  await handle<void>(res)
}

/** Bulk toggle the "delete after 72 hours" schedule. */
export async function setAdminChatMessagesDeleteAfter(ids: number[], enabled: boolean): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/bulk/delete-after`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ids, enabled }),
  })
  await handle<void>(res)
}

/** Delete a chat message permanently. */
export async function deleteAdminChatMessage(id: number): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Bulk delete chat messages permanently. */
export async function deleteAdminChatMessages(ids: number[]): Promise<void> {
  invalidateAdmin('admin:chat:active', 'admin:chat:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/chat/messages/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  })
  await handle<void>(res)
}

export interface RecommendationInput {
  initials: string
  quote: string
  author: string
  role: string
  email?: string | null
  sort_order?: number
}

/** All testimonials, ordered by sort_order. Pass archived=true for archived ones. */
export function fetchAdminRecommendations(archived = false): Promise<Recommendation[]> {
  const key = `admin:recs:${archived ? 'archived' : 'active'}`
  return cachedAdmin(key, async () => {
    const res = await fetch(`${API_BASE}/admin/recommendations${archived ? '?archived=1' : ''}`, {
      headers: authHeaders(),
    })
    return handle<Recommendation[]>(res)
  })
}

/** Archive a testimonial (hides it from the site + active list; restorable). */
export async function archiveAdminRecommendation(id: number): Promise<Recommendation> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations/${id}/archive`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<Recommendation>(res)
}

/** Restore an archived testimonial. */
export async function restoreAdminRecommendation(id: number): Promise<Recommendation> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<Recommendation>(res)
}

/** Create a testimonial. */
export async function createAdminRecommendation(input: RecommendationInput): Promise<Recommendation> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<Recommendation>(res)
}

/** Update a testimonial by id. */
export async function updateAdminRecommendation(
  id: number,
  input: Partial<RecommendationInput>,
): Promise<Recommendation> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<Recommendation>(res)
}

/** Delete a testimonial by id. */
export async function deleteAdminRecommendation(id: number): Promise<void> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Bulk delete testimonials by ids. */
export async function deleteAdminRecommendations(ids: number[]): Promise<{ deleted: number }> {
  invalidateAdmin('admin:recs:active', 'admin:recs:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/recommendations/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  })
  return handle<{ deleted: number }>(res)
}
