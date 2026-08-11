/**
 * POST /api/v1/private/auth/login — { email, password } → { success, token, user }.
 * Mirrors the Laravel PrivateChatController (SHA-256 hash, 7-day token).
 */

import { jsonNoStore, sha256Hex, randomTokenHex } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return jsonNoStore({ error: 'The email and password fields are required.' }, 422)
    }

    const user = await env.blog_db
      .prepare('SELECT id, name, email, password FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: number; name: string; email: string; password: string }>()

    if (!user || (await sha256Hex(password)) !== user.password) {
      return jsonNoStore({ error: 'Invalid credentials' }, 401)
    }

    const token = randomTokenHex()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    await env.blog_db
      .prepare(
        'INSERT INTO private_chat_tokens (user_id, token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(user.id, token, expiresAt, now, now)
      .run()

    return jsonNoStore({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch {
    return jsonNoStore({ error: 'Login failed.' }, 500)
  }
}
