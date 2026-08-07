import { json, parseContributions } from '../../../../_lib'

interface Env {
  blog_db: D1Database
}

/**
 * GET /api/v1/github/{username}/contributions
 * Fetches GitHub's contribution calendar HTML and parses it into a
 * 7×53 intensity grid (mirrors the Laravel GithubController).
 */
export const onRequestGet: PagesFunction<Env> = async ({ params }) => {
  const username = (params.username as string | undefined) ?? ''
  if (!username) {
    return json({ error: 'Missing username.' }, 400)
  }

  try {
    const response = await fetch(
      `https://github.com/users/${encodeURIComponent(username)}/contributions`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (portfolio-builder)',
          Accept: 'text/html',
        },
      },
    )
    if (!response.ok) {
      return json({ error: 'Unable to fetch GitHub contributions.' }, 502)
    }
    const html = await response.text()
    return json({ data: { username, grid: parseContributions(html) } })
  } catch {
    return json({ error: 'Unable to fetch GitHub contributions.' }, 502)
  }
}
