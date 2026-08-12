/**
 * Analytics capture for the portfolio.
 *
 * Every public page view is reported to POST /api/v1/visitors with:
 *  - the real public IP + geo (resolved once per session from ipwho.is —
 *    the same source the community chat already uses),
 *  - device / browser / OS sniffed from the user agent,
 *  - the visited path + referrer.
 *
 * The server dedupes visitors by IP (the same IP refreshing any number of
 * times is ONE visitor) and stores every page view in the `visits` table
 * for the /aromin dashboard charts.
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
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android' : 'Android tablet'
  if (/Linux/.test(ua)) return 'Linux'
  if (/Windows/.test(ua)) return 'Desktop'
  if (/Macintosh/.test(ua)) return 'Desktop'
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

/**
 * Report a public page view. Never throws — analytics must not break the site.
 */
export async function trackVisit(path: string, referrer: string): Promise<void> {
  try {
    const geo = await resolveGeo()
    const payload: Record<string, string | number> = {
      path,
      referrer: referrer.slice(0, 500),
      device: detectDevice(),
      browser: detectBrowser(),
      os: detectOs(),
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
    await fetch('/api/v1/visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    /* analytics is best-effort */
  }
}
