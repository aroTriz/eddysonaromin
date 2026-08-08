/**
 * Visitor counter.
 *   GET  /api/v1/visitors → current count
 *   POST /api/v1/visitors → increment and return the new count
 * Mirrors the previous projects' Cloudflare `counter.ts`.
 */

interface Env {
  blog_db: D1Database
}

const SITE = 'portfolio'

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

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  try {
    await env.blog_db
      .prepare('INSERT INTO visitors (site, count, created_at, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(site) DO UPDATE SET count = count + 1')
      .bind(SITE, new Date().toISOString(), new Date().toISOString())
      .run()

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
