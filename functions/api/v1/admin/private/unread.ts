/**
 * Private chat — admin unread count (navbar badge).
 *   GET /api/v1/admin/private/unread → { unread }
 * Counts visitor messages that are unread, excluding archived conversations
 * (they're hidden from the active inbox). Mirrors the Laravel
 * AdminPrivateChatController::unread.
 */

import { jsonNoStore, adminPrivateUserFromRequest } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const row = await env.blog_db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM private_chat_messages m
       JOIN private_chat_sessions s ON s.id = m.session_id
       WHERE (s.user_a_id = ? OR s.user_b_id = ?)
         AND m.sender_id != ?
         AND m.read_at IS NULL
         AND s.archived_at IS NULL`,
    )
    .bind(admin.id, admin.id, admin.id)
    .first<{ n: number }>()

  return jsonNoStore({ unread: row?.n ?? 0 })
}
