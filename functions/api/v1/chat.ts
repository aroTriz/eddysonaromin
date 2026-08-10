/**
 * Community chat (production) â€” mirrors the Laravel ChatController.
 *   GET  /api/v1/chat          â†’ { messages, total } (supports ?after=)
 *   POST /api/v1/chat          â†’ { message }
 *   GET  /api/v1/chat/identity?client_id= â†’ { name }
 *   POST /api/v1/chat/identity â†’ { name }
 * Persistence: D1 (`blog_db`).
 */

interface Env {
  blog_db: D1Database
}

const NAME_MAX = 40
const MESSAGE_MAX = 500
const COOLDOWN_MS = 8000
const MAX_AFTER = 60

const BAD_LOOSE = [
  'fuck', 'motherfuck', 'shit', 'bullshit', 'bitch', 'asshole', 'cunt',
  'faggot', 'nigger', 'nigga', 'dickhead', 'jackass', 'dumbass',
  'cocksuck', 'dipshit', 'putangina', 'putanginamo', 'tangina', 'taena',
  'tarantado', 'gago', 'gaga', 'ulol', 'kingina', 'kupal', 'pakshet',
  'pakyu', 'hinayupak', 'hindot', 'hindut', 'buwiset', 'bwisit',
  'putang ina', 'tang ina', 'walang hiya', 'hayop ka', 'gunggong',
]

const BAD_STRICT = [
  'ass', 'dick', 'cock', 'prick', 'slut', 'whore', 'twat', 'wank',
  'piss', 'bastard', 'pussy', 'puta', 'tanga', 'bobo', 'tite', 'titi',
  'puki', 'pekpek', 'jakol', 'leche', 'peste', 'lintik', 'ungas', 'inutil',
]

const LINK_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'info',
  'biz', 'link', 'site', 'online', 'store', 'shop', 'page', 'live',
  'tech', 'cloud', 'click', 'me', 'ly', 'gg', 'gl', 'be', 'to', 'tv',
  'fm', 'sh', 'cc', 'ws', 'ph', 'uk', 'ca', 'au', 'de', 'jp', 'eu',
  'edu', 'gov', 'top', 'vip', 'pro', 'fun', 'icu',
]

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function containsLink(text: string): boolean {
  const t = text.toLowerCase()
  if (t.includes('http://') || t.includes('https://')) return true
  if (/(?:^|[^a-z0-9])www\.[a-z0-9]/.test(t)) return true
  const tlds = LINK_TLDS.join('|')
  return new RegExp(`[a-z0-9][a-z0-9-]*\\.(?:${tlds})\\b`).test(t)
}

function isOffensive(text: string): boolean {
  const t = text.toLowerCase()
  for (const w of BAD_LOOSE) if (t.includes(w)) return true
  for (const w of BAD_STRICT) {
    try {
      if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'u').test(t)) return true
    } catch { /* skip */ }
  }
  return false
}

function rowToMessage(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    device: row.device ?? null,
    created_at: row.created_at,
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    // Lazy purge â€” scheduled deletions that have passed are removed now.
    await env.blog_db
      .prepare('DELETE FROM chat_messages WHERE delete_at IS NOT NULL AND delete_at <= ?')
      .bind(new Date().toISOString())
      .run()

    const url = new URL(request.url)
    const after = Math.max(0, Number(url.searchParams.get('after')) || 0)

    const rows = after > 0
      ? await env.blog_db
          .prepare(
            'SELECT id, name, message, device, created_at FROM chat_messages WHERE archived_at IS NULL AND id > ? ORDER BY id LIMIT ?',
          )
          .bind(after, MAX_AFTER)
          .all<Record<string, unknown>>()
      : await env.blog_db
          .prepare(
            'SELECT id, name, message, device, created_at FROM chat_messages WHERE archived_at IS NULL ORDER BY id LIMIT 100',
          )
          .all<Record<string, unknown>>()

    const totalRow = await env.blog_db
      .prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE archived_at IS NULL')
      .first<{ n: number }>()

    return json({
      messages: rows.results.map(rowToMessage),
      total: totalRow?.n ?? 0,
    })
  } catch {
    return json({ messages: [], total: 0 }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name ?? '').trim()
    const message = String(body.message ?? '').trim()
    const clientId = String(body.client_id ?? '').slice(0, 64)
    const location = String(body.location ?? '').slice(0, 120)
    const device = String(body.device ?? '').slice(0, 40)
    // Real public IP — client-provided (from ipwho.is) or the edge header.
    const bodyIp = String(body.ip ?? '').trim().slice(0, 45)
    const clientIp =
      bodyIp ||
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      null

    if (!name || name.length > NAME_MAX) return json({ error: 'Invalid name.' }, 422)
    if (!message || message.length > MESSAGE_MAX) return json({ error: 'Invalid message.' }, 422)
    if (containsLink(name) || containsLink(message)) return json({ reason: 'link' }, 422)
    if (isOffensive(name) || isOffensive(message)) return json({ reason: 'blocked' }, 422)

    if (clientId) {
      const last = await env.blog_db
        .prepare('SELECT created_at FROM chat_messages WHERE client_id = ? ORDER BY id DESC LIMIT 1')
        .bind(clientId)
        .first<{ created_at: string }>()
      if (last && Date.now() - new Date(last.created_at).getTime() < COOLDOWN_MS) {
        return json({ reason: 'cooldown' }, 429)
      }
    }

    const now = new Date().toISOString()
    const res = await env.blog_db
      .prepare(
        'INSERT INTO chat_messages (name, message, client_id, location, device, ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(name, message, clientId || null, location || null, device || null, clientIp, now, now)
      .run()

    const id = res.meta.last_row_id
    const row = await env.blog_db
      .prepare('SELECT id, name, message, device, created_at FROM chat_messages WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>()

    return json({ message: rowToMessage(row ?? {}) }, 201)
  } catch {
    return json({ error: 'Failed to send message.' }, 500)
  }
}
