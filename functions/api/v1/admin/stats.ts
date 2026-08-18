/**
 * GET /api/v1/admin/stats — full dashboard analytics.
 * Ported from Laravel AdminController::stats + analytics().
 * Requires a valid admin Bearer token.
 */

interface Env {
  blog_db: D1Database
}

function maskIp(ip: string): string {
  if (!ip) return ''
  if (ip.includes(':')) {
    const parts = ip.split(':')
    return parts.length > 1 ? parts.slice(0, 3).join(':') + ':…' : ip
  }
  const parts = ip.split('.')
  return parts.length === 4 ? parts.slice(0, 3).join('.') + '.x' : ip
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const token = request.headers.get('Authorization')?.slice(7)
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const session = await env.blog_db
      .prepare(
        'SELECT s.admin_id FROM admin_sessions s WHERE s.token = ? AND s.expires_at > ? ORDER BY s.id DESC LIMIT 1',
      )
      .bind(token, new Date().toISOString())
      .first<{ admin_id: number }>()

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const site = 'portfolio'
    const now = new Date()
    const today = now.toISOString().slice(0, 10) // YYYY-MM-DD

    // 1-year rolling window
    const retentionStart = new Date(now.getTime() - 365 * 86400_000).toISOString()

    // ── Basic counts ──────────────────────────────────────────
    const visitorRow = await env.blog_db
      .prepare('SELECT count FROM visitors WHERE site = ?')
      .bind(site)
      .first<{ count: number }>()
    const posts = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM blog_posts').first<{ n: number }>()
    const projects = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM projects').first<{ n: number }>()
    const messages = await env.blog_db.prepare('SELECT COUNT(*) AS n FROM contact_messages').first<{ n: number }>()

    // ── Analytics ─────────────────────────────────────────────
    const analytics = await computeAnalytics(env, site, retentionStart, today)

    return new Response(
      JSON.stringify({
        data: {
          visitors: visitorRow?.count ?? 0,
          posts: posts?.n ?? 0,
          projects: projects?.n ?? 0,
          messages: messages?.n ?? 0,
          analytics,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function computeAnalytics(
  env: Env,
  site: string,
  retentionStart: string,
  today: string,
) {
  // ── Totals ─────────────────────────────────────────────
  const totalsRow = await env.blog_db
    .prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors,
         COUNT(*) as views
       FROM visits WHERE site = ? AND created_at >= ?`,
    )
    .bind(site, retentionStart)
    .first<{ visitors: number; views: number }>()

  const todayRow = await env.blog_db
    .prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors,
         COUNT(*) as views
       FROM visits WHERE site = ? AND created_at >= ? AND date(created_at) = ?`,
    )
    .bind(site, retentionStart, today)
    .first<{ visitors: number; views: number }>()

  const totals = {
    visitors: totalsRow?.visitors ?? 0,
    views: totalsRow?.views ?? 0,
    visitors_today: todayRow?.visitors ?? 0,
    views_today: todayRow?.views ?? 0,
  }

  // ── 14-day trend (zero-filled) ─────────────────────────
  const since14 = new Date(new Date(today).getTime() - 13 * 86400_000).toISOString().slice(0, 10) + ' 00:00:00'
  const trendRows = await env.blog_db
    .prepare(
      `SELECT date(created_at) as day, COUNT(*) as views,
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors
       FROM visits WHERE site = ? AND created_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .bind(site, since14)
    .all<{ day: string; views: number; visitors: number }>()

  const trendMap = new Map<string, { views: number; visitors: number }>()
  for (const r of trendRows.results) trendMap.set(r.day, { views: r.views, visitors: r.visitors })

  const series = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(new Date(today).getTime() - i * 86400_000).toISOString().slice(0, 10)
    const row = trendMap.get(d)
    series.push({ date: d, visitors: row?.visitors ?? 0, views: row?.views ?? 0 })
  }

  // ── Hourly activity (last 12 months) ──────────────────
  const hourlyRow = await env.blog_db
    .prepare(
      `SELECT cast(strftime('%H', created_at) as integer) as h, COUNT(*) as c
       FROM visits WHERE site = ? AND created_at >= ?
       GROUP BY h`,
    )
    .bind(site, retentionStart)
    .all<{ h: number; c: number }>()

  const hourly = Array(24).fill(0)
  for (const r of hourlyRow.results) {
    if (r.h >= 0 && r.h < 24) hourly[r.h] = r.c
  }

  // ── Top pages ──────────────────────────────────────────
  const topPagesRows = await env.blog_db
    .prepare(
      `SELECT coalesce(nullif(path, ''), '/') as path, COUNT(*) as views,
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors
       FROM visits WHERE site = ? AND created_at >= ?
       GROUP BY path ORDER BY views DESC LIMIT 5`,
    )
    .bind(site, retentionStart)
    .all<{ path: string; views: number; visitors: number }>()

  const top_pages = topPagesRows.results.map((r) => ({ path: r.path, views: r.views, visitors: r.visitors }))

  // ── Countries ──────────────────────────────────────────
  const countriesRows = await env.blog_db
    .prepare(
      `SELECT country, MAX(nullif(country_name, '')) as country_name,
         COUNT(*) as visits,
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors,
         MIN(lat) as lat, MIN(lon) as lon
       FROM visits WHERE site = ? AND created_at >= ?
         AND country IS NOT NULL AND country != ''
       GROUP BY country ORDER BY visits DESC`,
    )
    .bind(site, retentionStart)
    .all<{ country: string; country_name: string; visits: number; visitors: number; lat: number | null; lon: number | null }>()

  const countries = countriesRows.results.map((r) => ({
    country: r.country,
    country_name: r.country_name ?? '',
    visits: r.visits,
    visitors: r.visitors,
    lat: r.lat,
    lon: r.lon,
  }))

  // ── Cities ─────────────────────────────────────────────
  const citiesRows = await env.blog_db
    .prepare(
      `SELECT city, country, MAX(nullif(country_name, '')) as country_name,
         COUNT(*) as visits,
         COUNT(DISTINCT CASE WHEN ip IS NOT NULL AND ip != '' THEN ip END) as visitors,
         MIN(lat) as lat, MIN(lon) as lon
       FROM visits WHERE site = ? AND created_at >= ?
         AND city IS NOT NULL AND city != ''
       GROUP BY city, country ORDER BY visits DESC`,
    )
    .bind(site, retentionStart)
    .all<{ city: string; country: string; country_name: string; visits: number; visitors: number; lat: number | null; lon: number | null }>()

  const cities = citiesRows.results.map((r) => ({
    city: r.city,
    country: r.country ?? '',
    country_name: r.country_name ?? '',
    visits: r.visits,
    visitors: r.visitors,
    lat: r.lat,
    lon: r.lon,
  }))

  // ── Geo points (map heat) ─────────────────────────────
  const geoRows = await env.blog_db
    .prepare(
      `SELECT lat, lon, country, COUNT(*) as visits
       FROM visits WHERE site = ? AND created_at >= ?
         AND lat IS NOT NULL AND lon IS NOT NULL
       GROUP BY lat, lon, country ORDER BY visits DESC LIMIT 300`,
    )
    .bind(site, retentionStart)
    .all<{ lat: number; lon: number; country: string; visits: number }>()

  const geo = geoRows.results.map((r) => ({
    lat: r.lat,
    lon: r.lon,
    country: r.country ?? '',
    visits: r.visits,
  }))

  // ── OS breakdown ───────────────────────────────────────
  const osRows = await env.blog_db
    .prepare(
      `SELECT coalesce(nullif(os, ''), 'Unknown') as label, COUNT(*) as count
       FROM visits WHERE site = ? AND created_at >= ?
       GROUP BY label ORDER BY count DESC`,
    )
    .bind(site, retentionStart)
    .all<{ label: string; count: number }>()

  const os = osRows.results.map((r) => ({ label: r.label, count: r.count }))

  // ── Recent visits (per IP) ─────────────────────────────
  const recentRows = await env.blog_db
    .prepare(
      `SELECT ip, COUNT(*) as visits, MAX(created_at) as created_at
       FROM visits WHERE site = ? AND created_at >= ?
         AND ip IS NOT NULL AND ip != ''
       GROUP BY ip ORDER BY created_at DESC LIMIT 10`,
    )
    .bind(site, retentionStart)
    .all<{ ip: string; visits: number; created_at: string }>()

  const recent = []
  for (const r of recentRows.results) {
    // Get latest detail fields for this IP
    const detail = await env.blog_db
      .prepare(
        `SELECT path, country, country_name, region, city, device, browser, os,
           screen, cores, ram, lang, tz, conn, isp, referrer
         FROM visits WHERE site = ? AND ip = ? AND created_at >= ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(site, r.ip, retentionStart)
      .first<{ path: string; country: string; country_name: string; region: string; city: string; device: string; browser: string; os: string; screen: string; cores: string; ram: string; lang: string; tz: string; conn: string; isp: string; referrer: string }>()

    recent.push({
      id: 0,
      ip: maskIp(r.ip),
      raw_ip: r.ip,
      country: detail?.country ?? '',
      country_name: detail?.country_name ?? '',
      region: detail?.region ?? '',
      city: detail?.city ?? '',
      path: detail?.path ?? '',
      device: detail?.device ?? '',
      browser: detail?.browser ?? '',
      os: detail?.os ?? '',
      screen: detail?.screen ?? '',
      cores: detail?.cores ?? '',
      ram: detail?.ram ?? '',
      lang: detail?.lang ?? '',
      tz: detail?.tz ?? '',
      conn: detail?.conn ?? '',
      isp: detail?.isp ?? '',
      referrer: detail?.referrer ?? '',
      visits: r.visits,
      created_at: r.created_at,
    })
  }

  return {
    totals,
    series,
    hourly,
    top_pages,
    countries,
    cities,
    geo,
    os,
    recent,
  }
}
