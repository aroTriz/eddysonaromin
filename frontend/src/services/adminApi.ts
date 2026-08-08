import { getToken } from '@/composables/useAuth'
import type { BlogPost, StackGroup } from '@/types'

/**
 * Authenticated API client for the /aromin admin area.
 * Every call attaches the admin Bearer token.
 */

const API_BASE = '/api/v1'

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
export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() })
  return handle<AdminStats>(res)
}

/** All posts (including drafts) — newest first. */
export async function fetchAdminPosts(): Promise<BlogPost[]> {
  const res = await fetch(`${API_BASE}/admin/blog/posts`, { headers: authHeaders() })
  return handle<BlogPost[]>(res)
}

/** Create a post. */
export async function createAdminPost(input: BlogPostInput): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/admin/blog/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<BlogPost>(res)
}

/** Update a post by id. */
export async function updateAdminPost(id: number, input: Partial<BlogPostInput>): Promise<BlogPost> {
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<BlogPost>(res)
}

/** Delete a post by id. */
export async function deleteAdminPost(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/blog/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
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

export interface StackGroupInput {
  label: string
  items: string[]
  sort_order?: number
}

/** All stack categories. */
export async function fetchAdminStackGroups(): Promise<StackGroup[]> {
  const res = await fetch(`${API_BASE}/admin/stack/groups`, { headers: authHeaders() })
  return handle<StackGroup[]>(res)
}

/** Create a stack category. */
export async function createAdminStackGroup(input: StackGroupInput): Promise<StackGroup> {
  const res = await fetch(`${API_BASE}/admin/stack/groups`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<StackGroup>(res)
}

/** Update a stack category. */
export async function updateAdminStackGroup(
  id: number,
  input: Partial<StackGroupInput>,
): Promise<StackGroup> {
  const res = await fetch(`${API_BASE}/admin/stack/groups/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(input),
  })
  return handle<StackGroup>(res)
}

/** Delete a stack category. */
export async function deleteAdminStackGroup(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/stack/groups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<void>(res)
}
