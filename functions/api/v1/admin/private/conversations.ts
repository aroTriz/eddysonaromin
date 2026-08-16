/**
 * Private chat — admin side (visitor DMs).
 *   GET /api/v1/admin/private/conversations?archived=1 → { conversations }
 * Each conversation: visitor { id, name, email } + last message + unread.
 * Mirrors the Laravel AdminPrivateChatController.
 */

import { jsonNoStore, adminPrivateUserFromRequest } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

interface SessionRow {
  id: number
  user_a_id: number
  user_b_id: number
  archived_at: string | null
  updated_at: string
}

async function conversationJson(
  env: Env,
  session: SessionRow,
  adminUserId: number,
): Promise<Record<string, unknown> | null> {
  const visitorId = session.user_a_id === adminUserId ? session.user_b_id : session.user_a_id
  const visitor = await env.blog_db
    .prepare('SELECT id, name, email FROM users WHERE id = ?')
    .bind(visitorId)
    .first<{ id: number; name: string; email: string }>()
  if (!visitor) return null

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
    .bind(session.id, adminUserId)
    .first<{ n: number }>()

  return {
    id: session.id,
    visitor: { id: visitor.id, name: visitor.name, email: visitor.email },
    last_message: last ?? null,
    unread: unreadRow?.n ?? 0,
    archived_at: session.archived_at ?? null,
    updated_at: session.updated_at,
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await adminPrivateUserFromRequest(env, request)
  if (!admin) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const archived = url.searchParams.get('archived') === '1'

  const rows = await env.blog_db
    .prepare(
      `SELECT id, user_a_id, user_b_id, archived_at, updated_at FROM private_chat_sessions
       WHERE (user_a_id = ? OR user_b_id = ?)
         AND archived_at ${archived ? 'IS NOT NULL' : 'IS NULL'}
       ORDER BY updated_at DESC`,
    )
    .bind(admin.id, admin.id)
    .all<SessionRow>()

  const conversations: Record<string, unknown>[] = []
  for (const row of rows.results) {
    const conv = await conversationJson(env, row, admin.id)
    if (conv) conversations.push(conv)
  }

  return jsonNoStore({ conversations })
}
