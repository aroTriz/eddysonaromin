/**
 * GET /api/v1/visitors/active — public endpoint showing currently active viewers.
 * A visitor is "active" if their last page view was within the last 5 minutes.
 * Returns count + lightweight viewer info (device, city, country) for the sidebar.
 */

interface Env {
  blog_db: D1Database
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const since = new Date(Date.now() - ACTIVE_THRESHOLD_MS).toISOString()

    // Count distinct active IPs + get one row per IP for display
    const rows = await env.blog_db
      .prepare(
        `SELECT ip, device, browser, os, country_name, city,
           MAX(created_at) as last_seen
         FROM visits
         WHERE site = 'portfolio'
           AND ip IS NOT NULL AND ip != ''
           AND created_at >= ?
         GROUP BY ip
         ORDER BY last_seen DESC`,
      )
      .bind(since)
      .all<{ ip: string; device: string; browser: string; os: string; country_name: string; city: string; last_seen: string }>()

    const viewers = rows.results.map((r) => ({
      device: r.device || 'Unknown',
      browser: r.browser || 'Unknown',
      os: r.os || 'Unknown',
      city: r.city || '',
      country: r.country_name || '',
    }))

    return new Response(
      JSON.stringify({ count: viewers.length, viewers }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    )
  } catch {
    return new Response(JSON.stringify({ count: 0, viewers: [] }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
