import type {
  ApiError,
  BlogPost,
  ContactPayload,
  Project,
  Recommendation,
  StackGroup,
} from '@/types'
import { profile } from '@/data/profile'

const API_BASE = '/api/v1'

/**
 * Promise cache — the same in-flight request is shared by every caller, so
 * the loading screen can prefetch the home page's data and the components
 * resolve instantly from the same promise (everything appears at once).
 * Entries expire after CACHE_TTL_MS so CMS edits (made in /aromin) show up
 * on the public site within a few minutes without a hard refresh.
 */
const requestCache = new Map<string, { promise: Promise<unknown>; at: number }>()

const CACHE_TTL_MS = 5 * 60 * 1000

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = requestCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.promise as Promise<T>
  }
  if (hit) requestCache.delete(key)
  const promise = fetcher().catch((err: unknown) => {
    requestCache.delete(key)
    throw err
  })
  requestCache.set(key, { promise, at: Date.now() })
  return promise
}

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
export function fetchProjects(params: {
  category?: string
  type?: string
  featured?: boolean
} = {}): Promise<Project[]> {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  if (params.type) search.set('type', params.type)
  if (params.featured) search.set('featured', '1')

  const query = search.toString()
  const key = `projects:${query}`
  return cached(key, async () => {
    const response = await fetch(`${API_BASE}/projects${query ? `?${query}` : ''}`)
    return parse<Project[]>(response)
  })
}

/** Fetch a single project by slug. */
export async function fetchProject(slug: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(slug)}`)
  return parse<Project>(response)
}

/** Fetch published blog posts. */
export function fetchBlogPosts(): Promise<BlogPost[]> {
  return cached('blog-posts:', async () => {
    const response = await fetch(`${API_BASE}/blog/posts`)
    return parse<BlogPost[]>(response)
  })
}

/** Fetch the tech stack categories (public). */
export function fetchStackGroups(): Promise<StackGroup[]> {
  return cached('stack:', async () => {
    const response = await fetch(`${API_BASE}/stack`)
    return parse<StackGroup[]>(response)
  })
}

/** Fetch testimonials (public). */
export function fetchRecommendations(): Promise<Recommendation[]> {
  return cached('recommendations:', async () => {
    const response = await fetch(`${API_BASE}/recommendations`)
    return parse<Recommendation[]>(response)
  })
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
export function fetchGitHubContributions(username: string): Promise<number[][]> {
  const key = `github:${username}`
  return cached(key, async () => {
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
  })
}

/**
 * Prefetch everything the home page renders, so the loading screen can wait
 * for it all before fading — the page then appears complete in one go
 * instead of sections popping in at different times.
 */
export function prefetchHomeData(): Promise<PromiseSettledResult<unknown>[]> {
  const username = profile.github.replace(/^https?:\/\/github\.com\//, '').replace(/\/.*$/, '')
  return Promise.allSettled([
    fetchProjects(),
    fetchStackGroups(),
    fetchRecommendations(),
    fetchBlogPosts(),
    fetchGitHubContributions(username),
  ])
}
