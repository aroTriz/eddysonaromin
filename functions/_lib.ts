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
