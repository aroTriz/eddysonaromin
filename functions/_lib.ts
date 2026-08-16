/**
 * Shared helpers for the portfolio Pages Functions API.
 * Files/dirs prefixed with `_` are never routed as endpoints.
 */

/** JSON response helper with a default 200 status. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/** JSON response that must never be cached (auth / private chat). */
export function jsonNoStore(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

// ── Private chat (DMs) shared helpers ───────────────────────────────

interface Env {
  blog_db: D1Database
}

/** SHA-256 hex digest via WebCrypto (mirrors the Laravel hash('sha256')). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 64-char hex bearer token (32 random bytes). */
export function randomTokenHex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Pull the Bearer token out of an Authorization header, or null. */
export function bearerToken(request: Request): string | null {
  const m = /Bearer\s+(.+)/i.exec(request.headers.get('Authorization') ?? '')
  return m ? m[1] : null
}

/** Resolve the private-chat user behind a Bearer token, or null. */
export async function privateUserFromRequest(
  env: Env,
  request: Request,
): Promise<{ id: number; name: string; email: string; banned_at: string | null } | null> {
  const token = bearerToken(request)
  if (!token) return null
  const row = await env.blog_db
    .prepare(
      `SELECT users.id, users.name, users.email, users.banned_at
       FROM private_chat_tokens
       JOIN users ON users.id = private_chat_tokens.user_id
       WHERE private_chat_tokens.token = ? AND private_chat_tokens.expires_at > ?`,
    )
    .bind(token, new Date().toISOString())
    .first<{ id: number; name: string; email: string; banned_at: string | null }>()
  return row ?? null
}

/** True when the account is on the blacklist (users.banned_at set). */
export function isBannedUser(user: { banned_at?: string | null } | null): boolean {
  return Boolean(user?.banned_at)
}

/** The site admin's private-chat account (admins → admins.user_id → users). */
export async function adminPrivateUser(
  env: Env,
): Promise<{ id: number; name: string; email: string } | null> {
  return (
    (await env.blog_db
      .prepare(
        `SELECT users.id, users.name, users.email
         FROM admins
         JOIN users ON users.id = admins.user_id
         WHERE admins.user_id IS NOT NULL
         LIMIT 1`,
      )
      .first<{ id: number; name: string; email: string }>()) ?? null
  )
}

/** The admin's chat account resolved from an /aromin admin session token. */
export async function adminPrivateUserFromRequest(
  env: Env,
  request: Request,
): Promise<{ id: number; name: string; email: string } | null> {
  const token = bearerToken(request)
  if (!token) return null
  const row = await env.blog_db
    .prepare(
      `SELECT users.id, users.name, users.email
       FROM admin_sessions
       JOIN admins ON admins.id = admin_sessions.admin_id
       JOIN users ON users.id = admins.user_id
       WHERE admin_sessions.token = ? AND admin_sessions.expires_at > ? AND admins.user_id IS NOT NULL`,
    )
    .bind(token, new Date().toISOString())
    .first<{ id: number; name: string; email: string }>()
  return row ?? null
}

/** Shape a private message row the way the frontend expects it. */
export function rowToPrivateMessage(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    sender_id: row.sender_id,
    message: row.message,
    attachment: row.attachment ? parseJson(row.attachment) : null,
    read_at: row.read_at ?? null,
    created_at: row.created_at,
  }
}

/** Parse a stored JSON text column (null on malformed/missing). */
export function parseJson(text: unknown): unknown {
  if (typeof text !== 'string' || text === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

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

/** Profanity filter — same lists as the Laravel PrivateChatController. */
export function isOffensive(text: string): boolean {
  const t = text.toLowerCase()
  for (const w of BAD_LOOSE) if (t.includes(w)) return true
  for (const w of BAD_STRICT) {
    try {
      if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'u').test(t)) return true
    } catch {
      /* skip */
    }
  }
  return false
}

/** A session row only when the user is one of its two participants. */
export async function sessionForUser(
  env: Env,
  id: number,
  userId: number,
): Promise<Record<string, unknown> | null> {
  return (
    (await env.blog_db
      .prepare(
        'SELECT * FROM private_chat_sessions WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)',
      )
      .bind(id, userId, userId)
      .first<Record<string, unknown>>()) ?? null
  )
}

/** Shape a D1 project row to match the Laravel `Project` model JSON. */
export function mapProject(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    featured: Boolean(row.featured),
    technologies: JSON.parse(String(row.technologies ?? '[]')),
  }
}

/** Shape a D1 blog post row to match the Laravel `BlogPost` model JSON. */
export function mapPost(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    images: row.images ? JSON.parse(String(row.images)) : null,
    tags: row.tags ? JSON.parse(String(row.tags)) : null,
  }
}

/** Hand-shaped halftone fallback (mirrors the Laravel GithubController). */
export function fallbackGrid(): number[][] {
  const row = [2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 3.8, 0, 1.1, 0, 2.7, 0, 2.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 2.7, 0, 1.1]
  return [
    row,
    Array(53).fill(0),
    [1.1, 0, 2.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 4.8, 0, 2.7, 0, 2.7, 0, 2.7, 0, 2.7, 0, 4.8, 0, 2.7, 0, 2.7],
    Array(53).fill(0),
    [3.8, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 1.1, 0, 1.1, 0, 2.7, 0, 3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 1.1, 0, 2.7, 0, 1.1, 0, 4.8, 0, 2.7, 0, 4.8],
    Array(53).fill(0),
    [3.8, 0, 1.1, 0, 3.8, 0, 2.7, 0, 4.8, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 1.1, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 4.8, 0, 3.8, 0, 3.8, 0, 5.7, 0, 2.7, 0, 3.8, 0, 2.7, 0, 2.7, 0, 1.1, 0, 2.7, 0, 2.7],
  ]
}

/** Parse GitHub's contribution HTML into a 7×53 intensity grid. */
export function parseContributions(html: string): number[][] {
  const re = /data-date="[\d-]+"[^>]*data-level="(\d)"/g
  const matches: RegExpExecArray[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) matches.push(m)

  if (matches.length < 350) return fallbackGrid()

  const weeks = new Map<number, Map<number, number>>()
  matches.forEach((match, i) => {
    const week = Math.floor(i / 7)
    const day = i % 7
    if (!weeks.has(week)) weeks.set(week, new Map())
    weeks.get(week)!.set(day, Number(match[1]))
  })

  const grid = Array.from({ length: 7 }, () => Array<number>(53).fill(0))
  const cols = weeks.size
  const offset = Math.max(0, 53 - cols)
  for (const [w, days] of weeks) {
    const col = offset + w
    if (col < 0 || col >= 53) continue
    for (const [d, level] of days) {
      if (d >= 0 && d < 7) grid[d][col] = level
    }
  }
  return grid
}
