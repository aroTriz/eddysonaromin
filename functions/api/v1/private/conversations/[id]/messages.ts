/**
 * Private chat messages for one conversation (participant-only).
 *   GET  /api/v1/private/conversations/{id}/messages?after= → { messages }
 *   POST /api/v1/private/conversations/{id}/messages { message } → { message }
 * Mirrors the Laravel PrivateChatController.
 */

import {
  jsonNoStore,
  isOffensive,
  privateUserFromRequest,
  rowToPrivateMessage,
  sessionForUser,
} from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

const MESSAGE_MAX = 2000
const MAX_AFTER = 100

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
  const rows = after > 0
    ? await env.blog_db
        .prepare(
          'SELECT id, sender_id, message, created_at FROM private_chat_messages WHERE session_id = ? AND id > ? ORDER BY id LIMIT ?',
        )
        .bind(id, after, MAX_AFTER)
        .all<Record<string, unknown>>()
    : await env.blog_db
        .prepare(
          'SELECT id, sender_id, message, created_at FROM private_chat_messages WHERE session_id = ? ORDER BY id LIMIT 200',
        )
        .bind(id)
        .all<Record<string, unknown>>()

  return jsonNoStore({ messages: rows.results.map(rowToPrivateMessage) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(request.url)
  const id = Number(url.pathname.split('/').filter(Boolean).at(-2))
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string }
  const message = String(body.message ?? '').trim()
  if (!message || message.length > MESSAGE_MAX) {
    return jsonNoStore({ error: 'Invalid message.' }, 422)
  }
  if (isOffensive(message)) {
    return jsonNoStore({ reason: 'blocked' }, 422)
  }

  const now = new Date().toISOString()
  const res = await env.blog_db
    .prepare(
      'INSERT INTO private_chat_messages (session_id, sender_id, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, user.id, message, now, now)
    .run()
  await env.blog_db
    .prepare('UPDATE private_chat_sessions SET updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run()

  const row = await env.blog_db
    .prepare('SELECT id, sender_id, message, created_at FROM private_chat_messages WHERE id = ?')
    .bind(Number(res.meta.last_row_id))
    .first<Record<string, unknown>>()

  return jsonNoStore({ message: rowToPrivateMessage(row ?? {}) }, 201)
}
