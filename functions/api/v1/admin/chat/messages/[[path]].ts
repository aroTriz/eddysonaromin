/**
 * Community chat moderation — single message actions (production, D1-backed).
 *
 *   POST   /api/v1/admin/chat/messages/{id}/archive     archive
 *   POST   /api/v1/admin/chat/messages/{id}/restore     restore
 *   POST   /api/v1/admin/chat/messages/{id}/delete-after toggle 72h ({enabled})
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

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '')
  const id = Number(path.split('/')[0])
  if (!Number.isInteger(id)) return json({ error: 'Invalid id.' }, 400)

  try {
    const now = new Date().toISOString()

    if (path.includes('/archive')) {
      await env.blog_db
        .prepare('UPDATE chat_messages SET archived_at = ?, updated_at = ? WHERE id = ?')
        .bind(now, now, id)
        .run()
      return json({ success: true })
    }

    if (path.includes('/restore')) {
      await env.blog_db
        .prepare('UPDATE chat_messages SET archived_at = NULL, updated_at = ? WHERE id = ?')
        .bind(now, id)
        .run()
      return json({ success: true })
    }

    if (path.includes('/delete-after')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      const enabled = Boolean(body.enabled)
      const deleteAt = enabled ? new Date(Date.now() + DELETE_AFTER_MS).toISOString() : null
      await env.blog_db
        .prepare('UPDATE chat_messages SET delete_at = ?, updated_at = ? WHERE id = ?')
        .bind(deleteAt, now, id)
        .run()
      return json({ success: true })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch {
    return json({ error: 'Failed to update message.' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)

  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '')
  const id = Number(path.split('/')[0])
  if (!Number.isInteger(id)) return json({ error: 'Invalid id.' }, 400)

  try {
    await env.blog_db.prepare('DELETE FROM chat_messages WHERE id = ?').bind(id).run()
    return json({ success: true })
  } catch {
    return json({ error: 'Failed to delete message.' }, 500)
  }
}
