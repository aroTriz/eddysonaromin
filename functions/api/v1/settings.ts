/**
 * Public site settings (production, D1-backed).
 * Mirrors the Laravel SiteSettingsController::show.
 *
 *   GET /api/v1/settings → { community_chat_enabled, backdrop_enabled }
 *
 * Fail-open: a missing row or a DB hiccup reports the flags as enabled, so
 * a settings failure never silently locks the chat or blanks the backdrop.
 */

interface Env {
  blog_db: D1Database
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function flag(env: Env, key: string): Promise<boolean> {
  const row = await env.blog_db
    .prepare('SELECT value FROM site_settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>()
  return (row?.value ?? '0') !== '0'
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const [community_chat_enabled, backdrop_enabled, click_me_enabled, ask_triz_enabled] = await Promise.all([
      flag(env, 'community_chat_enabled'),
      flag(env, 'backdrop_enabled'),
      flag(env, 'click_me_enabled'),
      flag(env, 'ask_triz_enabled'),
    ])

    // Pet config — JSON blob in site_settings
    const petRow = await env.blog_db
      .prepare('SELECT value FROM site_settings WHERE key = ?')
      .bind('pet_settings')
      .first<{ value: string }>()
    const DEFAULT_PET = { enabled: false, globalEnabled: false, scale: 0.5, speed: 1, animate: false }
    let pet = DEFAULT_PET
    if (petRow?.value) {
      try { pet = { ...DEFAULT_PET, ...JSON.parse(petRow.value) } } catch { /* use defaults */ }
    }

    return json({ community_chat_enabled, backdrop_enabled, click_me_enabled, ask_triz_enabled, pet })
  } catch {
    return json({ community_chat_enabled: false, backdrop_enabled: false, click_me_enabled: false, ask_triz_enabled: false, pet: { enabled: false, globalEnabled: false, scale: 0.5, speed: 1, animate: false } }, 500)
  }
}
