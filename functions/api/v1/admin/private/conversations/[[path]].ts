/**
 * Private chat — admin conversation + message management.
 *   POST   /api/v1/admin/private/conversations/{id}/archive     archive (hide from active)
 *   POST   /api/v1/admin/private/conversations/{id}/restore     un-archive
 *   DELETE /api/v1/admin/private/conversations/{id}             delete the whole chat
 *   DELETE /api/v1/admin/private/conversations/{id}/messages/{messageId}  delete one message
 * Mirrors the Laravel AdminPrivateChatController.
 *
 * This catch-all only handles the paths above — the more specific
 * [id]/messages.ts, [id]/read.ts, [id]/stream.ts and [id]/typing.ts
 * routes always win for their own URLs.
 */

import {
  jsonNoStore,
  adminPrivateUserFromRequest,
  sessionForUser,
} from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '')
  const [rawId, action] = path.split('/')
  const id = Number(rawId)
  if (!Number.isInteger(id)) return json({ error: 'Invalid id.' }, 400)
  if (!(await sessionForUser(env, id, admin.id))) {
    return json({ error: 'Not found' }, 404)
  }

  const now = new Date().toISOString()

  if (action === 'archive') {
    await env.blog_db
      .prepare('UPDATE private_chat_sessions SET archived_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, id)
      .run()
    return json({ success: true })
  }

  if (action === 'restore') {
    await env.blog_db
      .prepare('UPDATE private_chat_sessions SET archived_at = NULL, updated_at = ? WHERE id = ?')
      .bind(now, id)
      .run()
    return json({ success: true })
  }

  return json({ error: 'Unknown action.' }, 400)
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path ?? '')
  const segments = path.split('/')
  const id = Number(segments[0])
  if (!Number.isInteger(id)) return json({ error: 'Invalid id.' }, 400)
  if (!(await sessionForUser(env, id, admin.id))) {
    return json({ error: 'Not found' }, 404)
  }

  // DELETE /conversations/{id}/messages/{messageId} — one message.
  if (segments.length === 3 && segments[1] === 'messages') {
    const messageId = Number(segments[2])
    if (!Number.isInteger(messageId)) return json({ error: 'Invalid message id.' }, 400)
    await env.blog_db
      .prepare('DELETE FROM private_chat_messages WHERE session_id = ? AND id = ?')
      .bind(id, messageId)
      .run()
    return json({ success: true })
  }

  // DELETE /conversations/{id} — the whole chat (messages cascade).
  if (segments.length === 1) {
    await env.blog_db
      .prepare('DELETE FROM private_chat_typing WHERE conversation_id = ?')
      .bind(id)
      .run()
    await env.blog_db.prepare('DELETE FROM private_chat_sessions WHERE id = ?').bind(id).run()
    return json({ success: true })
  }

  return json({ error: 'Unknown action.' }, 400)
}
