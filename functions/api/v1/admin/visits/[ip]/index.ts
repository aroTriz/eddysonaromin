/**
 * GET /api/v1/admin/visits/:ip — visit history for one IP (detail modal).
 * Requires a valid admin Bearer token.
 * Mirrors the Laravel AdminController::visitHistory.
 */

interface Env {
  blog_db: D1Database
}

function maskIp(ip: string): string {
  return ip
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = request.headers.get('Authorization')?.slice(7)
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const session = await env.blog_db
      .prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > ? ORDER BY id DESC LIMIT 1')
      .bind(token, new Date().toISOString())
      .first<{ admin_id: number }>()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const ip = String((params as Record<string, string>).ip ?? '')
    if (!ip) {
      return new Response(JSON.stringify({ error: 'IP required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1-year retention
    const retentionStart = new Date(Date.now() - 365 * 86400_000).toISOString()

    const rows = await env.blog_db
      .prepare(
        `SELECT id, path, device, browser, os, screen, cores, ram, lang, tz, conn, isp,
           country, country_name, region, city, referrer, lat, lon, created_at
         FROM visits
         WHERE site = 'portfolio' AND ip = ? AND created_at >= ?
         ORDER BY created_at DESC LIMIT 200`,
      )
      .bind(ip, retentionStart)
      .all<{ id: number; path: string; device: string; browser: string; os: string;
        screen: string; cores: string; ram: string; lang: string; tz: string;
        conn: string; isp: string; country: string; country_name: string;
        region: string; city: string; referrer: string; lat: number | null; lon: number | null; created_at: string }>()

    const data = rows.results.map((r) => ({
      id: r.id,
      ip: maskIp(ip),
      path: r.path ?? '',
      device: r.device ?? '',
      browser: r.browser ?? '',
      os: r.os ?? '',
      screen: r.screen ?? '',
      cores: r.cores ?? '',
      ram: r.ram ?? '',
      lang: r.lang ?? '',
      tz: r.tz ?? '',
      conn: r.conn ?? '',
      isp: r.isp ?? '',
      country: r.country ?? '',
      country_name: r.country_name ?? '',
      region: r.region ?? '',
      city: r.city ?? '',
      referrer: r.referrer ?? '',
      lat: r.lat ?? null,
      lon: r.lon ?? null,
      created_at: r.created_at ?? '',
    }))

    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
