/**
 * Visitor counter + page-view analytics.
 *   GET  /api/v1/visitors → unique visitor count
 *   POST /api/v1/visitors → record a page view + return the unique count
 *
 * Unique visitors are counted by IP: the same IP visiting (or refreshing)
 * any number of times is ONE visitor. Every page view is stored in the
 * `visits` table so the /aromin dashboard can chart trends, top pages,
 * countries, devices, browsers and OSes. `visitors.count` is a
 * denormalized cache of COUNT(DISTINCT ip) over `visits`.
 * Mirrors the Laravel VisitorController.
 */

interface Env {
  blog_db: D1Database
}

const SITE = 'portfolio'

const cf = (request: Request): Record<string, unknown> =>
  (request as Request & { cf?: Record<string, unknown> }).cf ?? {}

/** Trim + truncate a string; '' when missing. */
function str(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value.trim() : ''
  return s.length > max ? s.slice(0, max) : s
}

/** Finite number or null. */
function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value)
  return null
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const row = await env.blog_db
      .prepare('SELECT count FROM visitors WHERE site = ?')
      .bind(SITE)
      .first<{ count: number }>()
    return new Response(JSON.stringify({ count: row?.count ?? 0 }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ count: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const now = new Date().toISOString()

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    /* body is optional */
  }

  // Real public IP: client-provided (ipwho.is) → CF-Connecting-IP.
  let ip = str(body.ip, 45)
  if (ip === '') ip = str(request.headers.get('CF-Connecting-IP'), 45)

  // Geo: prefer the request's Cloudflare geolocation (authoritative in
  // production), fall back to what the client resolved via ipwho.is.
  const cfData = cf(request)
  const country = str(cfData.country ?? body.country, 2)
  const countryName = str(body.country_name, 80)
  const region = str(cfData.region ?? body.region, 80)
  const city = str(cfData.city ?? body.city, 80)
  const lat = num(cfData.latitude ?? body.lat)
  const lon = num(cfData.longitude ?? body.lon)

  try {
    await env.blog_db
      .prepare(
        `INSERT INTO visits
           (site, ip, country, country_name, region, city, lat, lon,
            path, referrer, device, browser, os, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        SITE,
        ip !== '' ? ip : null,
        country !== '' ? country : null,
        countryName !== '' ? countryName : null,
        region !== '' ? region : null,
        city !== '' ? city : null,
        lat,
        lon,
        str(body.path, 255) || null,
        str(body.referrer, 500) || null,
        str(body.device, 40) || null,
        str(body.browser, 40) || null,
        str(body.os, 40) || null,
        now,
        now,
      )
      .run()

    const row = await env.blog_db
      .prepare(
        'SELECT COUNT(DISTINCT ip) AS count FROM visits WHERE site = ? AND ip IS NOT NULL AND ip != ?',
      )
      .bind(SITE, '')
      .first<{ count: number }>()
    const unique = row?.count ?? 0

    await env.blog_db
      .prepare(
        `INSERT INTO visitors (site, count, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(site) DO UPDATE SET count = ?, updated_at = ?`,
      )
      .bind(SITE, unique, now, now, unique, now)
      .run()

    return new Response(JSON.stringify({ count: unique }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ count: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
