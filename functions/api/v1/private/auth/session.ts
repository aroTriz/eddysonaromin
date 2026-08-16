/**
 * GET /api/v1/private/auth/session — validate the Bearer token → { authenticated, user }.
 */

import { jsonNoStore, isBannedUser, privateUserFromRequest } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await privateUserFromRequest(env, request)
  if (!user) {
    return jsonNoStore({ authenticated: false }, 401)
  }
  return jsonNoStore({ authenticated: true, banned: isBannedUser(user), user })
}
