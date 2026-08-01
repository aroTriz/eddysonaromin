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
  const payload = (await response.json().catch(() => ({}))) as
    | { data: T }
    | ApiError

  if (!response.ok) {
    throw new Error(toError(payload as ApiError))
  }

  return (payload as { data: T }).data
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
