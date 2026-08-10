import { json } from '../../../../../_lib'

/**
 * Tech-stack CMS for the /aromin admin area (authenticated).
 *
 *   GET    /api/v1/admin/stack/groups       → all categories
 *   POST   /api/v1/admin/stack/groups       → create a category
 *   GET    /api/v1/admin/stack/groups/{id}  → single category
 *   PUT    /api/v1/admin/stack/groups/{id}  → update (label/items/sort_order)
 *   DELETE /api/v1/admin/stack/groups/{id}  → delete a category
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

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Single category by id.
  if (segments.length > 0) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Category not found.' }, 404)
    const row = await env.blog_db.prepare('SELECT * FROM stack_groups WHERE id = ?').bind(id).first()
    if (!row) return json({ message: 'Category not found.' }, 404)
    return json({ data: { ...row, items: JSON.parse(String(row.items ?? '[]')) } })
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'
  const { results } = await env.blog_db
    .prepare(`SELECT * FROM stack_groups WHERE archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY sort_order ASC, id ASC`)
    .all<Record<string, unknown>>()

  return json({
    data: results.map((row) => ({ ...row, items: JSON.parse(String(row.items ?? '[]')) })),
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []

  // Archive / restore an existing category: POST /admin/stack/groups/{id}/archive|restore
  if (segments.length === 2) {
    const id = Number(segments[0])
    if (!Number.isInteger(id)) return json({ message: 'Category not found.' }, 404)
    if (segments[1] === 'archive' || segments[1] === 'restore') {
      const existing = await env.blog_db.prepare('SELECT id FROM stack_groups WHERE id = ?').bind(id).first()
      if (!existing) return json({ message: 'Category not found.' }, 404)
      const archivedAt = segments[1] === 'archive' ? new Date().toISOString() : null
      await env.blog_db
        .prepare('UPDATE stack_groups SET archived_at = ?, updated_at = ? WHERE id = ?')
        .bind(archivedAt, new Date().toISOString(), id)
        .run()
      const row = await env.blog_db.prepare('SELECT * FROM stack_groups WHERE id = ?').bind(id).first()
      return json({ data: { ...row!, items: JSON.parse(String(row!.items ?? '[]')) } })
    }
    return json({ message: 'Not found.' }, 404)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : ''
  if (!label) return json({ error: 'The label field is required.' }, 422)

  const existing = await env.blog_db
    .prepare('SELECT id FROM stack_groups WHERE label = ?')
    .bind(label)
    .first()
  if (existing) return json({ error: 'That category already exists.' }, 422)

  const items = JSON.stringify(Array.isArray(body.items) ? body.items.filter((i) => typeof i === 'string') : [])
  const sortOrder = typeof body.sort_order === 'number' ? Math.max(0, Math.floor(body.sort_order)) : 0
  const now = new Date().toISOString()

  const result = await env.blog_db
    .prepare('INSERT INTO stack_groups (label, items, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(label, items, sortOrder, now, now)
    .run()

  const row = await env.blog_db
    .prepare('SELECT * FROM stack_groups WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return json({ data: { ...row!, items: JSON.parse(String(row!.items ?? '[]')) } }, 201)
}

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Category not found.' }, 404)

  const existing = await env.blog_db.prepare('SELECT * FROM stack_groups WHERE id = ?').bind(id).first()
  if (!existing) return json({ message: 'Category not found.' }, 404)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const label =
    typeof body.label === 'string' && body.label.trim() ? body.label.trim() : (existing.label as string)
  const items = JSON.stringify(
    Array.isArray(body.items) ? body.items.filter((i) => typeof i === 'string') : JSON.parse(String(existing.items ?? '[]')),
  )
  const sortOrder =
    typeof body.sort_order === 'number' ? Math.max(0, Math.floor(body.sort_order)) : (existing.sort_order as number)
  const now = new Date().toISOString()

  await env.blog_db
    .prepare('UPDATE stack_groups SET label = ?, items = ?, sort_order = ?, updated_at = ? WHERE id = ?')
    .bind(label, items, sortOrder, now, id)
    .run()

  const row = await env.blog_db.prepare('SELECT * FROM stack_groups WHERE id = ?').bind(id).first()
  return json({ data: { ...row!, items: JSON.parse(String(row!.items ?? '[]')) } })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const segments = (params.path as string[] | undefined) ?? []
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ message: 'Category not found.' }, 404)

  await env.blog_db.prepare('DELETE FROM stack_groups WHERE id = ?').bind(id).run()
  return json({ success: true })
}
