/**
 * Analytics capture for the portfolio — YouTube-style view counting.
 *
 * A visit is counted only when ALL of these hold:
 *  - the visitor actually stays ~30s on the page (visible seconds only —
 *    background tabs and quick bounces never count, like YouTube watch time),
 *  - this tab session hasn't counted yet (refresh / in-site navigation in
 *    the same tab is NOT a new view; a new tab is).
 *
 * The report goes to POST /api/v1/visitors with the real public IP + geo
 * (resolved once per session from ipwho.is), device / browser / OS sniffed
 * from the user agent, and the visited path + referrer. The server stores
 * every counted view in the `visits` table for the /aromin dashboard.
 */

export interface IpGeo {
  ip: string
  country: string
  country_name: string
  region: string
  city: string
  lat: number
  lon: number
}

const GEO_TIMEOUT_MS = 3500

let geoPromise: Promise<IpGeo | null> | null = null

/** Resolve the public IP + location once per session (in-flight calls coalesce). */
function resolveGeo(): Promise<IpGeo | null> {
  if (!geoPromise) {
    geoPromise = (async () => {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), GEO_TIMEOUT_MS)
        const res = await fetch('https://ipwho.is/', { signal: ctrl.signal })
        clearTimeout(timer)
        if (!res.ok) return null
        const d = (await res.json()) as {
          success?: boolean
          ip?: string
          country_code?: string
          country?: string
          region?: string
          city?: string
          latitude?: number
          longitude?: number
        }
        if (!d || d.success === false) return null
        return {
          ip: String(d.ip ?? ''),
          country: String(d.country_code ?? ''),
          country_name: String(d.country ?? ''),
          region: String(d.region ?? ''),
          city: String(d.city ?? ''),
          lat: Number(d.latitude ?? 0),
          lon: Number(d.longitude ?? 0),
        }
      } catch {
        return null
      }
    })()
  }
  return geoPromise
}

function detectDevice(): string {
  const ua = navigator.userAgent || ''
  const touch = navigator.maxTouchPoints || 0
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'iPad'
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS'
  if (/CrOS/.test(ua)) return 'Chromebook'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

function detectBrowser(): string {
  const ua = navigator.userAgent || ''
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  if (/MSIE|Trident/.test(ua)) return 'IE'
  return 'Unknown'
}

function detectOs(): string {
  const ua = navigator.userAgent || ''
  const touch = navigator.maxTouchPoints || 0
  if (/Windows/.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua) || (/Mac/.test(ua) && touch > 0)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

/** Watch time required before a visit counts — YouTube's ~30s rule. */
const DWELL_MS = 30_000

/** One view per tab session (survives refresh, dies with the tab). */
const COUNTED_KEY = 'aromin-view-counted-v1'

let inflight = false

function alreadyCounted(): boolean {
  try {
    return sessionStorage.getItem(COUNTED_KEY) === '1'
  } catch {
    return inflight
  }
}

function markCounted(): void {
  try {
    sessionStorage.setItem(COUNTED_KEY, '1')
  } catch {
    /* private mode — the module flag still guards this page load */
  }
}

/** Resolve after `ms` of VISIBLE time (1s slices; hidden time doesn't count). */
function dwell(ms: number): Promise<void> {
  return new Promise((done) => {
    let waited = 0
    const slice = (): void => {
      if (document.hidden) {
        const onVis = (): void => {
          if (document.hidden) return
          document.removeEventListener('visibilitychange', onVis)
          slice()
        }
        document.addEventListener('visibilitychange', onVis)
        return
      }
      setTimeout(() => {
        if (!document.hidden) waited += 1000
        if (waited >= ms) done()
        else slice()
      }, 1000)
    }
    slice()
  })
}

/**
 * Report a public page view. Never throws — analytics must not break the site.
 * Resolves to the server's lifetime total visits (null when unknown / not
 * counted) and broadcasts it as `aromin:visit-tracked` so the sidebar
 * counter updates immediately — no waiting for the next 30s presence poll.
 */
export async function trackVisit(path: string, referrer: string): Promise<number | null> {
  try {
    // One view per tab session — a refresh or SPA navigation in the same tab
    // is the same viewing, not a new one. A new tab gets a fresh session.
    if (inflight || alreadyCounted()) return null
    inflight = true
    try {
      // YouTube rule: no 30s of real (visible) watch time, no view.
      // Closing the tab early kills the timer — nothing is recorded.
      await dwell(DWELL_MS)
      if (alreadyCounted()) return null
      const geo = await resolveGeo()
      const payload: Record<string, string | number> = {
        path,
        referrer: referrer.slice(0, 500),
        device: detectDevice(),
        browser: detectBrowser(),
        os: detectOs(),
        screen: `${screen.width}×${screen.height}`,
        cores: String(navigator.hardwareConcurrency || ''),
        ram: (navigator as unknown as { deviceMemory?: number }).deviceMemory
          ? `${(navigator as unknown as { deviceMemory: number }).deviceMemory}GB`
          : '',
        lang: navigator.language || '',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        conn: (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType || '',
      }
      if (geo) {
        if (geo.ip) payload.ip = geo.ip
        if (geo.country) payload.country = geo.country
        if (geo.country_name) payload.country_name = geo.country_name
        if (geo.region) payload.region = geo.region
        if (geo.city) payload.city = geo.city
        if (geo.lat) payload.lat = geo.lat
        if (geo.lon) payload.lon = geo.lon
      }
      // ISP from ipwho.is (included in geo response)
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 2000)
        const res = await fetch('https://ipwho.is/', { signal: ctrl.signal })
        clearTimeout(timer)
        if (res.ok) {
          const d = await res.json() as { connection?: { isp?: string }; org?: string }
          const isp = d?.connection?.isp || d?.org || ''
          if (isp) payload.isp = isp
        }
      } catch { /* best effort */ }
      const res = await fetch('/api/v1/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => null)) as { total?: number } | null
      const total = typeof data?.total === 'number' ? data.total : null
      if (total !== null) {
        window.dispatchEvent(new CustomEvent('aromin:visit-tracked', { detail: { total } }))
      }
      markCounted()
      return total
    } finally {
      inflight = false
    }
  } catch {
    /* analytics is best-effort */
    return null
  }
}
