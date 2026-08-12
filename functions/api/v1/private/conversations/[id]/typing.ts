/**
 * Private chat — "is typing" heartbeats (visitor side).
 *   POST /api/v1/private/conversations/{id}/typing  { typing: bool }
 *   GET  /api/v1/private/conversations/{id}/typing  → { typing: [{ id, name }] }
 * Rows expire after a few seconds unless refreshed (TTL matches the
 * Laravel controller), so a dropped connection stops the indicator.
 * Mirrors the Laravel PrivateChatController.
 */

import { jsonNoStore, privateUserFromRequest, sessionForUser } from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

const TYPING_TTL_MS = 4000

function sessionIdFrom(url: URL): number {
  return Number(url.pathname.split('/').filter(Boolean).at(-2))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = sessionIdFrom(url)
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  const body = (await request.json().catch(() => ({}))) as { typing?: boolean }
  const typing = body.typing !== false

  if (typing) {
    const now = new Date()
    await env.blog_db
      .prepare(
        `INSERT INTO private_chat_typing (conversation_id, user_id, typing_until, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(conversation_id, user_id)
         DO UPDATE SET typing_until = ?, updated_at = ?`,
      )
      .bind(
        id,
        user.id,
        new Date(now.getTime() + TYPING_TTL_MS).toISOString(),
        now.toISOString(),
        now.toISOString(),
        new Date(now.getTime() + TYPING_TTL_MS).toISOString(),
        now.toISOString(),
      )
      .run()
  } else {
    await env.blog_db
      .prepare('DELETE FROM private_chat_typing WHERE conversation_id = ? AND user_id = ?')
      .bind(id, user.id)
      .run()
  }

  return jsonNoStore({ success: true })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = sessionIdFrom(url)
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  const { results } = await env.blog_db
    .prepare(
      `SELECT t.user_id AS id, u.name FROM private_chat_typing t
       JOIN users u ON u.id = t.user_id
       WHERE t.conversation_id = ? AND t.typing_until > ?
       ORDER BY t.user_id`,
    )
    .bind(id, new Date().toISOString())
    .all<{ id: number; name: string }>()

  return jsonNoStore({ typing: results.map((r) => ({ id: Number(r.id), name: String(r.name) })) })
}
