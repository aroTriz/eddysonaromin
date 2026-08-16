/**
 * Private chat conversations.
 *   POST /api/v1/private/conversations → find-or-create the visitor's
 *        conversation with the admin → { conversation }
 * Mirrors the Laravel PrivateChatController.
 */

import { jsonNoStore, adminPrivateUser, isBannedUser, privateUserFromRequest } from '../../../_lib'

interface Env {
  blog_db: D1Database
}

interface SessionRow {
  id: number
  user_a_id: number
  user_b_id: number
  updated_at: string
}

async function conversationJson(
  env: Env,
  session: SessionRow,
  userId: number,
): Promise<Record<string, unknown> | null> {
  const otherId = session.user_a_id === userId ? session.user_b_id : session.user_a_id
  const other = await env.blog_db
    .prepare('SELECT id, name FROM users WHERE id = ?')
    .bind(otherId)
    .first<{ id: number; name: string }>()
  if (!other) return null

  const last = await env.blog_db
    .prepare(
      'SELECT id, sender_id, message, created_at FROM private_chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1',
    )
    .bind(session.id)
    .first<{ id: number; sender_id: number; message: string; created_at: string }>()

  const unreadRow = await env.blog_db
    .prepare(
      'SELECT COUNT(*) AS n FROM private_chat_messages WHERE session_id = ? AND sender_id != ? AND read_at IS NULL',
    )
    .bind(session.id, userId)
    .first<{ n: number }>()

  return {
    id: session.id,
    user: { id: other.id, name: other.name },
    last_message: last ?? null,
    unread: unreadRow?.n ?? 0,
    updated_at: session.updated_at,
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }
  if (isBannedUser(user)) {
    return jsonNoStore({ reason: 'banned' }, 403)
  }

  const admin = await adminPrivateUser(env)
  if (!admin) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }
  if (admin.id === user.id) {
    return jsonNoStore({ error: 'Invalid user' }, 422)
  }

  const a = Math.min(user.id, admin.id)
  const b = Math.max(user.id, admin.id)

  let session = await env.blog_db
    .prepare(
      'SELECT id, user_a_id, user_b_id, updated_at FROM private_chat_sessions WHERE user_a_id = ? AND user_b_id = ?',
    )
    .bind(a, b)
    .first<SessionRow>()

  if (!session) {
    const now = new Date().toISOString()
    const res = await env.blog_db
      .prepare(
        'INSERT INTO private_chat_sessions (user_a_id, user_b_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
      )
      .bind(a, b, now, now)
      .run()
    session = {
      id: Number(res.meta.last_row_id),
      user_a_id: a,
      user_b_id: b,
      updated_at: now,
    }
  }

  const conv = await conversationJson(env, session, user.id)
  return jsonNoStore({ conversation: conv }, conv ? 200 : 500)
}
