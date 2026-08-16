/**
 * Account management (production, D1-backed).
 * Mirrors the Laravel AdminUserController.
 *
 *   GET  /api/v1/admin/users → all accounts (banned_at included)
 *   POST /api/v1/admin/users → create an account
 *
 * Banned accounts (users.banned_at) are locked out of private chat — set
 * automatically when they send vulgar language, or manually from this page.
 * The users row linked to an admin (admins.user_id) is never listed here.
 */

import { json, sha256Hex } from '../../../_lib'

interface Env {
  blog_db: D1Database
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

async function adminUserIds(env: Env): Promise<number[]> {
  const { results } = await env.blog_db
    .prepare('SELECT user_id FROM admins WHERE user_id IS NOT NULL')
    .all<{ user_id: number }>()
  return results.map((r) => Number(r.user_id))
}

/** Conversations per user (both sides of every session, summed). */
async function conversationCounts(env: Env): Promise<Map<number, number>> {
  const { results } = await env.blog_db
    .prepare(
      `SELECT user_a_id AS user_id, COUNT(*) AS c FROM private_chat_sessions GROUP BY user_a_id
       UNION ALL
       SELECT user_b_id AS user_id, COUNT(*) AS c FROM private_chat_sessions GROUP BY user_b_id`,
    )
    .all<{ user_id: number; c: number }>()
  const counts = new Map<number, number>()
  for (const r of results) counts.set(Number(r.user_id), (counts.get(Number(r.user_id)) ?? 0) + Number(r.c))
  return counts
}

function rowToUser(
  row: Record<string, unknown>,
  counts: Map<number, number>,
): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    is_admin: false, // admin accounts are never listed here
    banned_at: row.banned_at ?? null,
    conversations: counts.get(Number(row.id)) ?? 0,
    created_at: row.created_at ?? '',
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const ids = await adminUserIds(env)
    const counts = await conversationCounts(env)

    const rows =
      ids.length > 0
        ? (
            await env.blog_db
              .prepare(`SELECT * FROM users WHERE id NOT IN (${ids.map(() => '?').join(',')}) ORDER BY id`)
              .bind(...ids)
              .all<Record<string, unknown>>()
          ).results
        : (await env.blog_db.prepare('SELECT * FROM users ORDER BY id').all<Record<string, unknown>>()).results

    return json({ data: rows.map((r) => rowToUser(r, counts)) })
  } catch {
    return json({ data: [] }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAuthorized(request, env))) return json({ error: 'Unauthorized' }, 401)
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!name || name.length > 40) return json({ message: 'The given data was invalid.', errors: { name: ['required'] } }, 422)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ message: 'The given data was invalid.', errors: { email: ['must be a valid email address'] } }, 422)
    if (!password || password.length < 8) return json({ message: 'The given data was invalid.', errors: { password: ['must be at least 8 characters'] } }, 422)

    const exists = await env.blog_db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (exists) return json({ message: 'The given data was invalid.', errors: { email: ['already in use'] } }, 422)

    const now = new Date().toISOString()
    const res = await env.blog_db
      .prepare('INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(name, email, await sha256Hex(password), now, now)
      .run()

    const row = await env.blog_db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(Number(res.meta.last_row_id))
      .first<Record<string, unknown>>()
    return json({ data: rowToUser(row ?? {}, await conversationCounts(env)) }, 201)
  } catch {
    return json({ error: 'Failed to create account.' }, 500)
  }
}
