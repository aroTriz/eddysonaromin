import { getToken } from '@/composables/useAuth'
import type { BlogPost, Project, ProjectShowcase, Recommendation } from '@/types'
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
  analytics: Analytics
}

/** One day in the 14-day trend. */
export interface SeriesPoint {
  date: string
  visitors: number
  views: number
}

/** Country row for the map-heat ranking. */
export interface CountryStat {
  country: string
  country_name: string
  visits: number
  visitors: number
  lat: number | null
  lon: number | null
}

/** City/town row for the top-cities ranking. */
export interface CityStat {
  city: string
  /** ISO country code (e.g. "PH") — drives the country filter. */
  country: string
  country_name: string
  visits: number
  visitors: number
}

/** Aggregated geo point for the map dots. */
export interface GeoPoint {
  lat: number
  lon: number
  /** ISO country code (e.g. "PH") — drives the country/world map filter. */
  country: string
  visits: number
}

export interface LabelCount {
  label: string
  count: number
}

export interface RecentVisit {
  /** Latest visit id for this IP — used to jump into the detail modal. */
  id: number
  /** Masked for display (e.g. 192.168.1.x). */
  ip: string
  /** Raw IP — only used to fetch the per-IP visit history in the modal. */
  raw_ip: string
  country: string
  city: string
  path: string
  device: string
  browser: string
  os: string
  /** How many times this IP visited in the retention window. */
  visits: number
  created_at: string
}

/** One recorded page view inside a per-IP history. */
export interface VisitHistoryEntry {
  id: number
  path: string
  device: string
  browser: string
  os: string
  country: string
  city: string
  created_at: string
}

/** Everything the /aromin dashboard charts, computed from the visits table. */
export interface Analytics {
  totals: {
    visitors: number
    views: number
    visitors_today: number
    views_today: number
  }
  series: SeriesPoint[]
  hourly: number[]
  top_pages: { path: string; views: number; visitors: number }[]
  countries: CountryStat[]
  cities: CityStat[]
  geo: GeoPoint[]
  os: LabelCount[]
  recent: RecentVisit[]
}

export interface BlogPostInput {
  title: string
  excerpt: string
  content: string
  images: string[]
  tags: string[]
  published_at?: string | null
}

/** Dashboard stats + analytics. Pass force=true to bypass the 30s cache. */
export function fetchAdminStats(force = false): Promise<AdminStats> {
  if (force) adminCache.delete('admin:stats')
  return cachedAdmin('admin:stats', async () => {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() })
    return handle<AdminStats>(res)
  })
}

/** Full visit history for one raw IP — newest first, for the detail modal. */
export async function fetchVisitHistory(rawIp: string): Promise<VisitHistoryEntry[]> {
  const res = await fetch(`${API_BASE}/admin/visits/${encodeURIComponent(rawIp)}`, {
    headers: authHeaders(),
  })
  return handle<VisitHistoryEntry[]>(res)
}

/**
 * Reset all analytics — wipes the visits table and zeroes the visitor
 * counter. Recording restarts from the moment this is called.
 */
export async function clearAdminStats(): Promise<void> {
  adminCache.delete('admin:stats')
  const res = await fetch(`${API_BASE}/admin/stats/clear`, {
    method: 'POST',
    headers: authHeaders(),
  })
  await handle<void>(res)
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

// ── Projects CMS ─────────────────────────────────────────────────────

/** Fields the admin can edit on a project (mirrors the backend rules). */
export interface ProjectInput {
  title: string
  category: 'personal' | 'academic'
  type: Project['type']
  summary: string
  tagline?: string | null
  description?: string | null
  role?: string | null
  year?: string | null
  featured?: boolean
  technologies?: string[]
  url?: string | null
  source_url?: string | null
  image_url?: string | null
  favicon_url?: string | null
  showcase?: ProjectShowcase | null
  sort_order?: number
}

/** All projects (active by default). Pass archived=true for archived ones. */
export function fetchAdminProjects(archived = false): Promise<Project[]> {
  const key = `admin:projects:${archived ? 'archived' : 'active'}`
  return cachedAdmin(key, async () => {
    const res = await fetch(`${API_BASE}/admin/projects${archived ? '?archived=1' : ''}`, {
      headers: authHeaders(),
    })
    return handle<Project[]>(res)
  })
}

/**
 * Upload a device-showcase image/video (multipart). Returns the served
 * relative URL plus the detected media kind ("image" | "video").
 */
export async function uploadProjectMedia(
  file: File,
  device: 'laptop' | 'phone',
): Promise<{ url: string; kind: 'image' | 'video' }> {
  const token = getToken()
  const body = new FormData()
  body.append('file', file)
  body.append('device', device)
  const res = await fetch(`${API_BASE}/admin/projects/media`, {
    method: 'POST',
    // NO Content-Type header — the browser sets the multipart boundary itself.
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  return handle<{ url: string; kind: 'image' | 'video' }>(res)
}

/**
 * Upload a project cover image or favicon (multipart). Returns the served
 * relative URL to store in image_url / favicon_url — no URL typing needed.
 */
export async function uploadProjectImage(
  file: File,
  kind: 'cover' | 'favicon',
): Promise<{ url: string }> {
  const token = getToken()
  const body = new FormData()
  body.append('file', file)
  body.append('kind', kind)
  const res = await fetch(`${API_BASE}/admin/projects/image`, {
    method: 'POST',
    // NO Content-Type header — the browser sets the multipart boundary itself.
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  return handle<{ url: string }>(res)
}

/** Create a project. */
export async function createAdminProject(input: ProjectInput): Promise<Project> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<Project>(res)
}

/** Update a project by id. */
export async function updateAdminProject(id: number, input: Partial<ProjectInput>): Promise<Project> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<Project>(res)
}

/** Delete a project permanently. */
export async function deleteAdminProject(id: number): Promise<void> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Bulk delete projects by ids. */
export async function deleteAdminProjects(ids: number[]): Promise<{ deleted: number }> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  })
  return handle<{ deleted: number }>(res)
}

/** Archive a project (hides it from the site + active list; restorable). */
export async function archiveAdminProject(id: number): Promise<Project> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects/${id}/archive`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<Project>(res)
}

/** Restore an archived project. */
export async function restoreAdminProject(id: number): Promise<Project> {
  invalidateAdmin('admin:projects:active', 'admin:projects:archived', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/projects/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<Project>(res)
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

// ── Account management (registered site accounts) ────────────────────

export interface AdminUser {
  id: number
  name: string
  email: string
  /** SHA-256 hash — one-way; original plaintext is never stored. */
  password: string
  /** True when this users row is linked to an admin (cannot be deleted). */
  is_admin: boolean
  /** Blacklist: null = active, a date = banned from private chat. */
  banned_at: string | null
  conversations: number
  created_at: string
}

export interface AdminUserInput {
  name: string
  email: string
  /** Required on create; blank/omitted on update keeps the current password. */
  password?: string
}

export interface BulkDeleteResult {
  deleted: number
  protected: number
}

/** All registered accounts. */
export function fetchAdminUsers(): Promise<AdminUser[]> {
  return cachedAdmin('admin:users', async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() })
    return handle<AdminUser[]>(res)
  })
}

/** Create an account. */
export async function createAdminUser(input: AdminUserInput): Promise<AdminUser> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<AdminUser>(res)
}

/** Edit an account (password blank keeps the current one). */
export async function updateAdminUser(id: number, input: Partial<AdminUserInput>): Promise<AdminUser> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<AdminUser>(res)
}

/** Delete an account (admin-linked accounts are rejected server-side). */
export async function deleteAdminUser(id: number): Promise<void> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}

/** Bulk delete accounts; admin-linked ids are excluded server-side. */
export async function deleteAdminUsers(ids: number[]): Promise<BulkDeleteResult> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  })
  return handle<BulkDeleteResult>(res)
}

/** Blacklist an account — locks it out of private chat. */
export async function banAdminUser(id: number): Promise<AdminUser> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users/${id}/ban`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<AdminUser>(res)
}

/** Remove an account from the blacklist. */
export async function unbanAdminUser(id: number): Promise<AdminUser> {
  invalidateAdmin('admin:users', 'admin:stats')
  const res = await fetch(`${API_BASE}/admin/users/${id}/unban`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handle<AdminUser>(res)
}

// ── Private chat (visitor DMs) ──────────────────────────────────────
// Raw (no cache, no data-unwrap) — the threads must always be fresh.

/** Attachment carried by a message (image renders inline, file as a card). */
export interface ChatAttachment {
  kind: 'image' | 'file'
  name: string
  size: number
  mime: string
  /** Base64 data-URL. */
  data: string
}

export interface AdminPrivateMessage {
  id: number
  sender_id: number
  message: string
  attachment: ChatAttachment | null
  read_at: string | null
  created_at: string
}

export interface AdminPrivateConversation {
  id: number
  visitor: { id: number; name: string; email: string }
  last_message: {
    id: number
    sender_id: number
    message: string
    attachment: ChatAttachment | null
    read_at: string | null
    created_at: string
  } | null
  unread: number
  archived_at: string | null
  updated_at: string
}

async function rawAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { ...init, headers: authHeaders() })
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string })?.error ??
        (payload as { message?: string })?.message ??
        'Request failed.',
    )
  }
  return payload
}

/** All visitor ↔ admin threads, newest first. Pass archived=true for archived ones. */
export function fetchAdminPrivateConversations(archived = false): Promise<AdminPrivateConversation[]> {
  return rawAdmin<{ conversations: AdminPrivateConversation[] }>(
    `/admin/private/conversations${archived ? '?archived=1' : ''}`,
  ).then((d) => d.conversations)
}

/** Archive a conversation (hides it from the active list; restorable). */
export function archiveAdminPrivateConversation(convId: number): Promise<void> {
  return rawAdmin<{ success: boolean }>(`/admin/private/conversations/${convId}/archive`, {
    method: 'POST',
  }).then(() => undefined)
}

/** Restore an archived conversation. */
export function restoreAdminPrivateConversation(convId: number): Promise<void> {
  return rawAdmin<{ success: boolean }>(`/admin/private/conversations/${convId}/restore`, {
    method: 'POST',
  }).then(() => undefined)
}

/** Delete a conversation permanently (all of its messages go with it). */
export function deleteAdminPrivateConversation(convId: number): Promise<void> {
  return rawAdmin<{ success: boolean }>(`/admin/private/conversations/${convId}`, {
    method: 'DELETE',
  }).then(() => undefined)
}

/** Delete a single message from a conversation permanently. */
export function deleteAdminPrivateMessage(convId: number, messageId: number): Promise<void> {
  return rawAdmin<{ success: boolean }>(
    `/admin/private/conversations/${convId}/messages/${messageId}`,
    { method: 'DELETE' },
  ).then(() => undefined)
}

/** Total unread visitor messages across all threads (navbar badge). */
export async function fetchAdminPrivateUnread(): Promise<number> {
  try {
    const d = await rawAdmin<{ unread: number }>('/admin/private/unread')
    return d.unread ?? 0
  } catch {
    return 0
  }
}

export function fetchAdminPrivateMessages(
  convId: number,
  after = 0,
): Promise<AdminPrivateMessage[]> {
  return rawAdmin<{ messages: AdminPrivateMessage[] }>(
    `/admin/private/conversations/${convId}/messages${after ? `?after=${after}` : ''}`,
  ).then((d) => d.messages)
}

/** Reply as the admin (optionally with an attachment). */
export function sendAdminPrivateMessage(
  convId: number,
  message: string,
  attachment?: ChatAttachment | null,
): Promise<AdminPrivateMessage> {
  const body: Record<string, unknown> = { message }
  if (attachment) body.attachment = attachment
  return rawAdmin<{ message: AdminPrivateMessage }>(
    `/admin/private/conversations/${convId}/messages`,
    { method: 'POST', body: JSON.stringify(body) },
  ).then((d) => d.message)
}

/** Typing heartbeat — typing:false clears the indicator immediately. */
export function sendAdminTyping(convId: number, typing: boolean): Promise<void> {
  return rawAdmin<{ success: boolean }>(
    `/admin/private/conversations/${convId}/typing`,
    { method: 'POST', body: JSON.stringify({ typing }) },
  ).then(() => undefined)
}

/** Who is typing right now in a thread (visitor names included). */
export function fetchAdminTyping(convId: number): Promise<{ id: number; name: string }[]> {
  return rawAdmin<{ typing: { id: number; name: string }[] }>(
    `/admin/private/conversations/${convId}/typing`,
  ).then((d) => d.typing)
}

/** Mark all of the visitor's messages as read. */
export function markAdminPrivateRead(convId: number): Promise<void> {
  return rawAdmin<{ success: boolean }>(`/admin/private/conversations/${convId}/read`, {
    method: 'POST',
  }).then(() => undefined)
}

/** Live stream endpoint for a thread (SSE, Bearer-auth via fetch). */
export function adminPrivateStreamUrl(convId: number, after: number): string {
  return `${API_BASE}/admin/private/conversations/${convId}/stream?after=${after}`
}

// ── Site settings (community chat on/off) ────────────────────────────

/** Turn the community chat on/off site-wide (admin only). */
export async function setCommunityChatEnabled(enabled: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/settings/community-chat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  })
  await handle<void>(res)
}
