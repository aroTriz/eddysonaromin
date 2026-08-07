import type {
  ApiError,
  BlogPost,
  ContactPayload,
  Project,
} from '@/types'

const API_BASE = '/api/v1'

/** Normalize Laravel validation errors into a readable message. */
function toError(payload: ApiError | string): string {
  if (typeof payload === 'string') return payload
  const first = payload.errors ? Object.values(payload.errors)[0]?.[0] : undefined
  return first ?? payload.message ?? 'Something went wrong.'
}

async function parse<T>(response: Response): Promise<T> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    // Non-JSON body (e.g. an HTML fallback page) — never pass it through.
    throw new Error('The API returned an invalid response.')
  }

  const body = payload as { data?: T; message?: string } | ApiError

  if (!response.ok) {
    throw new Error(toError(body as ApiError))
  }

  // Guard against a 200 with a missing `data` payload (SPA fallback pages,
  // misconfigured proxies, etc.) so callers never crash on `.map` / `.data`.
  const data = (body as { data?: T } | null)?.data
  if (body === null || typeof body !== 'object' || data === undefined) {
    throw new Error('The API returned an unexpected response.')
  }

  return data
}

/** Fetch projects — optionally filtered by category / type / featured. */
export async function fetchProjects(params: {
  category?: string
  type?: string
  featured?: boolean
} = {}): Promise<Project[]> {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  if (params.type) search.set('type', params.type)
  if (params.featured) search.set('featured', '1')

  const query = search.toString()
  const response = await fetch(`${API_BASE}/projects${query ? `?${query}` : ''}`)
  return parse<Project[]>(response)
}

/** Fetch a single project by slug. */
export async function fetchProject(slug: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(slug)}`)
  return parse<Project>(response)
}

/** Fetch published blog posts. */
export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const response = await fetch(`${API_BASE}/blog/posts`)
  return parse<BlogPost[]>(response)
}

/** Fetch a single blog post by slug. */
export async function fetchBlogPost(slug: string): Promise<BlogPost> {
  const response = await fetch(`${API_BASE}/blog/posts/${encodeURIComponent(slug)}`)
  return parse<BlogPost>(response)
}

/** Submit a contact message. Returns the created message id. */
export async function submitContact(payload: ContactPayload): Promise<void> {
  const response = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(toError(data))
  }
}

/** Fetch a user's real GitHub contribution grid (7×53 intensity levels). */
export async function fetchGitHubContributions(
  username: string,
): Promise<number[][]> {
  const response = await fetch(
    `${API_BASE}/github/${encodeURIComponent(username)}/contributions`,
  )

  let payload: { data?: { grid?: unknown } } | ApiError | null = null
  try {
    payload = (await response.json()) as { data?: { grid?: unknown } } | ApiError
  } catch {
    throw new Error('GitHub contribution data is unavailable.')
  }

  if (!response.ok) {
    throw new Error(toError(payload as ApiError))
  }

  const grid = (payload as { data?: { grid?: unknown } } | null)?.data?.grid
  if (!Array.isArray(grid) || grid.length !== 7) {
    throw new Error('GitHub contribution data is unavailable.')
  }
  return grid as number[][]
}
