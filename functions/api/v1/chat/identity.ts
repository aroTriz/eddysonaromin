/**
 * Community chat — remembered identity (production, D1-backed).
 *   GET  /api/v1/chat/identity?client_id= → { name }
 *   POST /api/v1/chat/identity            → { name }
 */

interface Env {
  blog_db: D1Database
}

const NAME_MAX = 40

const BAD_LOOSE = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'putangina', 'tangina',
  'gago', 'gaga', 'ulol', 'kupal', 'pakyu', 'tarantado', 'bobo', 'tanga',
]
const BAD_STRICT = ['ass', 'dick', 'cock', 'slut', 'whore', 'pussy', 'puta', 'tite', 'titi', 'puki', 'jakol']
const LINK_TLDS = ['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'ai', 'xyz', 'info', 'me', 'ph', 'gg', 'gl', 'to', 'tv']

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function isOffensive(text: string): boolean {
  const t = text.toLowerCase()
  for (const w of BAD_LOOSE) if (t.includes(w)) return true
  for (const w of BAD_STRICT) {
    try {
      if (new RegExp(`\\b${w}\\b`, 'u').test(t)) return true
    } catch { /* skip */ }
  }
  return false
}

function containsLink(text: string): boolean {
  const t = text.toLowerCase()
  if (t.includes('http://') || t.includes('https://')) return true
  const tlds = LINK_TLDS.join('|')
  return new RegExp(`[a-z0-9][a-z0-9-]*\\.(?:${tlds})\\b`).test(t)
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url)
    const clientId = (url.searchParams.get('client_id') ?? '').slice(0, 64)
    if (!clientId) return json({ name: null })

    const row = await env.blog_db
      .prepare('SELECT name FROM chat_identities WHERE client_id = ?')
      .bind(clientId)
      .first<{ name: string }>()

    return json({ name: row?.name ?? null })
  } catch {
    return json({ name: null })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const clientId = String(body.client_id ?? '').slice(0, 64)
    const name = String(body.name ?? '').trim()

    if (!clientId || !name || name.length > NAME_MAX) return json({ error: 'Invalid identity.' }, 422)
    if (containsLink(name) || isOffensive(name)) return json({ reason: 'blocked' }, 422)

    const now = new Date().toISOString()
    await env.blog_db
      .prepare(
        'INSERT INTO chat_identities (client_id, name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(client_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at',
      )
      .bind(clientId, name, now, now)
      .run()

    return json({ name })
  } catch {
    return json({ error: 'Failed to save identity.' }, 500)
  }
}
