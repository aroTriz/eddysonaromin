/**
 * Community chat moderation (production, D1-backed).
 * Mirrors the Laravel AdminChatController.
 *
 *   GET    /api/v1/admin/chat/messages                  list (?archived=1)
 *   DELETE /api/v1/admin/chat/messages/bulk             bulk delete (ids)
 *   POST   /api/v1/admin/chat/messages/bulk/delete-after bulk 72h toggle
 *   POST   /api/v1/admin/chat/messages/{id}/archive     archive
 *   POST   /api/v1/admin/chat/messages/{id}/restore     restore
 *   POST   /api/v1/admin/chat/messages/{id}/delete-after toggle 72h
 *   DELETE /api/v1/admin/chat/messages/{id}             delete
 */

interface Env {
  blog_db: D1Database
}

const DELETE_AFTER_MS = 72 * 60 * 60 * 1000

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('Authorization')?.slice(7)
  if (!token) return false
  const session = await env.blog_db
    .prepare('SELECT s.id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1')
    .bind(token, new Date().toISOString())
    .first()
  return session !== null
}

function parseIds(body: Record<string, unknown>): number[] {
  const raw = body.ids
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is number => typeof v === 'number' && Number.isInteger(v))
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    // Lazy purge — scheduled deletions that have passed are removed now.
    await env.blog_db
      .prepare('DELETE FROM chat_messages WHERE delete_at IS NOT NULL AND delete_at <= ?')
      .bind(new Date().toISOString())
      .run()

    const url = new URL(request.url)
    const archived = url.searchParams.get('archived') === '1'

    const { results } = await env.blog_db
      .prepare(
        archived
          ? 'SELECT id, name, message, ip, location, device, created_at, archived_at, delete_at FROM chat_messages WHERE archived_at IS NOT NULL ORDER BY id DESC'
          : 'SELECT id, name, message, ip, location, device, created_at, archived_at, delete_at FROM chat_messages WHERE archived_at IS NULL ORDER BY id DESC',
      )
      .all<Record<string, unknown>>()

    return json({ data: results })
  } catch {
    return json({ data: [] }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const ids = parseIds(body)
    if (ids.length > 0) {
      await env.blog_db
        .prepare(`DELETE FROM chat_messages WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .run()
    }
    return json({ success: true })
  } catch {
    return json({ error: 'Failed to delete messages.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const ids = parseIds(body)
    const enabled = Boolean(body.enabled)

    const deleteAt = enabled ? new Date(Date.now() + DELETE_AFTER_MS).toISOString() : null
    const now = new Date().toISOString()

    if (ids.length > 0) {
      await env.blog_db
        .prepare(`UPDATE chat_messages SET delete_at = ?, updated_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(deleteAt, now, ...ids)
        .run()
    }
    return json({ success: true })
  } catch {
    return json({ error: 'Failed to update messages.' }, 500)
  }
}
