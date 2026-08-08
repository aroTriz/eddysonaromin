import { json, mapPost } from '../../../../_lib'

/**
 * Blog CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/blog/posts       → all posts (including drafts)
 *   POST   /api/v1/admin/blog/posts       → create a post
 *   GET    /api/v1/admin/blog/posts/{id}  → single post (any status)
 *   PUT    /api/v1/admin/blog/posts/{id}  → update a post
 *   DELETE /api/v1/admin/blog/posts/{id}  → delete a post
 */

interface Env {
  blog_db: D1Database
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) return false

  const session = await env.blog_db
    .prepare(
      'SELECT s.id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1',
    )
    .bind(token, new Date().toISOString())
    .first()

  return session !== null
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post'
}

async function uniqueSlug(env: Env, title: string, ignoreId?: number): Promise<string> {
  const base = slugify(title)
  let slug = base
  let i = 2
  for (;;) {
    const existing = await env.blog_db
      .prepare('SELECT id FROM blog_posts WHERE slug = ?' + (ignoreId ? ' AND id != ?' : ''))
      .bind(...(ignoreId ? [slug, ignoreId] : [slug]))
      .first()
    if (!existing) return slug
    slug = `${base}-${i}`
    i++
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Single post by id (any status).
  if (segments.length > 0) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Post not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Post not found.' }, 404)
    return json({ data: mapPost(row) })
  }

  const { results } = await env.blog_db
    .prepare('SELECT * FROM blog_posts ORDER BY published_at DESC')
    .all()
  return json({ data: results.map(mapPost) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : ''
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt : ''
  const content = typeof body.content === 'string' ? body.content : ''

  if (!title || !content) {
    return json({ error: 'Title and content are required.' }, 422)
  }

  const slug = await uniqueSlug(env, title)
  const images = JSON.stringify(Array.isArray(body.images) ? body.images : [])
  const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : [])
  const publishedAt =
    typeof body.published_at === 'string' && body.published_at !== ''
      ? new Date(body.published_at).toISOString()
      : new Date().toISOString()
  const now = new Date().toISOString()

  const result = await env.blog_db
    .prepare(
      'INSERT INTO blog_posts (title, slug, excerpt, content, images, tags, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(title, slug, excerpt, content, images, tags, publishedAt, now, now)
    .run()

  const row = await env.blog_db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return json({ data: mapPost(row!) }, 201)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Post not found.' }, 404)

  const existing = await env.blog_db.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first()
  if (!existing) return json({ message: 'Post not found.' }, 404)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : (existing.title as string)
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt : (existing.excerpt as string)
  const content = typeof body.content === 'string' ? body.content : (existing.content as string)
  const images = JSON.stringify(Array.isArray(body.images) ? body.images : JSON.parse(String(existing.images ?? '[]')))
  const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : JSON.parse(String(existing.tags ?? '[]')))
  const publishedAt =
    typeof body.published_at === 'string' && body.published_at !== ''
      ? new Date(body.published_at).toISOString()
      : (existing.published_at as string)

  const slug =
    title !== existing.title ? await uniqueSlug(env, title, id) : (existing.slug as string)
  const now = new Date().toISOString()

  await env.blog_db
    .prepare('UPDATE blog_posts SET title = ?, slug = ?, excerpt = ?, content = ?, images = ?, tags = ?, published_at = ?, updated_at = ? WHERE id = ?')
    .bind(title, slug, excerpt, content, images, tags, publishedAt, now, id)
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first()
  return json({ data: mapPost(row!) })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Post not found.' }, 404)

  await env.blog_db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run()
  return json({ success: true })
}
