/**
 * Private chat messages for one conversation (participant-only).
 *   GET  /api/v1/private/conversations/{id}/messages?after= → { messages }
 *   POST /api/v1/private/conversations/{id}/messages { message, attachment? } → { message }
 * Mirrors the Laravel PrivateChatController (attachments + typing clear).
 */

import {
  jsonNoStore,
  isOffensive,
  isBannedUser,
  privateUserFromRequest,
  rowToPrivateMessage,
  sessionForUser,
} from '../../../../../_lib'

interface Env {
  blog_db: D1Database
}

const MESSAGE_MAX = 2000
const MAX_AFTER = 100
const ATTACHMENT_MAX_BYTES = 2_500_000

function sessionIdFrom(url: URL): number {
  return Number(url.pathname.split('/').filter(Boolean).at(-2))
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

  const after = Math.max(0, Number(url.searchParams.get('after')) || 0)
  const rows = after > 0
    ? await env.blog_db
        .prepare(
          'SELECT id, sender_id, message, attachment, created_at FROM private_chat_messages WHERE session_id = ? AND id > ? ORDER BY id LIMIT ?',
        )
        .bind(id, after, MAX_AFTER)
        .all<Record<string, unknown>>()
    : await env.blog_db
        .prepare(
          'SELECT id, sender_id, message, attachment, created_at FROM private_chat_messages WHERE session_id = ? ORDER BY id LIMIT 200',
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
  const id = sessionIdFrom(url)
  if (!(await sessionForUser(env, id, user.id))) {
    return jsonNoStore({ error: 'Not found' }, 404)
  }
  if (isBannedUser(user)) {
    return jsonNoStore({ reason: 'banned' }, 403)
  }

  const body = (await request.json().catch(() => ({}))) as {
    message?: string
    attachment?: unknown
  }
  const message = String(body.message ?? '').trim()
  if (message.length > MESSAGE_MAX) {
    return jsonNoStore({ error: 'Invalid message.' }, 422)
  }
  if (message !== '' && isOffensive(message)) {
    // Auto-blacklist: vulgar language earns the account a ban — the message
    // is rejected AND the account is locked out of chat until an admin
    // removes it from the blacklist (accounts page).
    const now = new Date().toISOString()
    await env.blog_db
      .prepare('UPDATE users SET banned_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, user.id)
      .run()
    return jsonNoStore({ reason: 'blocked' }, 422)
  }

  const attachment = normalizeAttachment(body.attachment)
  if (typeof attachment === 'string') {
    return jsonNoStore({ error: attachment }, 422)
  }
  if (!message && !attachment) {
    return jsonNoStore({ error: 'Invalid message.' }, 422)
  }

  const now = new Date().toISOString()
  const res = await env.blog_db
    .prepare(
      'INSERT INTO private_chat_messages (session_id, sender_id, message, attachment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(id, user.id, message, attachment, now, now)
    .run()
  // Bump the session so it floats to the top, clear the sender's typing row,
  // and un-archive the thread if the admin had archived it: fresh activity
  // re-opens it so the admin never misses a reply.
  await env.blog_db
    .prepare('UPDATE private_chat_sessions SET updated_at = ?, archived_at = NULL WHERE id = ?')
    .bind(now, id)
    .run()
  await env.blog_db
    .prepare('DELETE FROM private_chat_typing WHERE conversation_id = ? AND user_id = ?')
    .bind(id, user.id)
    .run()

  const row = await env.blog_db
    .prepare('SELECT id, sender_id, message, attachment, created_at FROM private_chat_messages WHERE id = ?')
    .bind(Number(res.meta.last_row_id))
    .first<Record<string, unknown>>()

  return jsonNoStore({ message: rowToPrivateMessage(row ?? {}) }, 201)
}

/** Validate + normalize an attachment payload; error string or JSON string. */
function normalizeAttachment(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'object') return 'invalid attachment'
  const a = value as Record<string, unknown>
  const kind = a.kind === 'file' ? 'file' : 'image'
  const name = String(a.name ?? '').slice(0, 255)
  const size = Number(a.size) || 0
  const mime = String(a.mime ?? '').toLowerCase()
  const data = String(a.data ?? '')

  if (!name || size < 1 || size > ATTACHMENT_MAX_BYTES) {
    return 'attachments are limited to 2.5MB'
  }
  if (kind === 'image' && !/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(mime)) {
    return 'unsupported image type'
  }
  if (!/^data:[a-zA-Z0-9+./-]+;base64,/.test(data)) {
    return 'invalid attachment data'
  }
  const comma = data.indexOf(',')
  const base64 = data.slice(comma + 1)
  if (!base64 || Math.floor(base64.length * 0.75) > size + 64) {
    return 'attachment data is corrupted'
  }

  return JSON.stringify({ kind, name, size, mime, data })
}
