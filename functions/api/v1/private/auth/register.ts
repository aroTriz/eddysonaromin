/**
 * POST /api/v1/private/auth/register — create a private-chat account
 * { name, email, password, password_confirmation } → { success, token, user }.
 * Mirrors the Laravel PrivateChatController (SHA-256 hash, 7-day token).
 */

import { jsonNoStore, sha256Hex, randomTokenHex } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

const NAME_MAX = 40
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const confirmation = String(body.password_confirmation ?? '')

    if (!name || name.length > NAME_MAX) {
      return jsonNoStore({ error: 'The name field is required.' }, 422)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonNoStore({ error: 'The email must be a valid email address.' }, 422)
    }
    if (password.length < 8) {
      return jsonNoStore({ error: 'The password must be at least 8 characters.' }, 422)
    }
    if (password !== confirmation) {
      return jsonNoStore({ error: 'The password confirmation does not match.' }, 422)
    }

    const existing = await env.blog_db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
    if (existing) {
      return jsonNoStore({ error: 'The email has already been taken.' }, 422)
    }

    const now = new Date().toISOString()
    const res = await env.blog_db
      .prepare('INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(name, email, await sha256Hex(password), now, now)
      .run()
    const id = res.meta.last_row_id

    const token = randomTokenHex()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    await env.blog_db
      .prepare(
        'INSERT INTO private_chat_tokens (user_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(id, token, expiresAt, now, now)
      .run()

    return jsonNoStore({ success: true, token, user: { id, name, email } }, 201)
  } catch {
    return jsonNoStore({ error: 'Failed to create account.' }, 500)
  }
}
