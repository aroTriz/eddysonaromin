import { ref } from 'vue'

/**
 * Admin auth for the /aromin area. Mirrors the previous projects'
 * useAuth composable: login → OTP → verify → session token in localStorage.
 */

const STORAGE_KEY = 'aromin_admin_token'
const API_BASE = '/api/v1'

export interface AdminSession {
  id: number
  username: string
}

export interface LoginResult {
  success: boolean
  email_sent?: boolean
  email?: string
  otp?: string
  dev_mode?: boolean
  error?: string
}

const isLoggedIn = ref(false)
const admin = ref<AdminSession | null>(null)

function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Request a login: validates credentials and issues an OTP. */
export async function requestOtp(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = (await res.json()) as LoginResult
    if (!res.ok) return { success: false, error: data.error || 'Login failed' }
    return data
  } catch {
    return { success: false, error: 'Connection error' }
  }
}

/** Verify the 6-digit OTP and store the returned session token. */
export async function verifyOtp(username: string, otp: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp }),
    })
    const data = (await res.json()) as {
      token?: string
      admin?: AdminSession
      error?: string
    }
    if (res.ok && data.token) {
      try {
        localStorage.setItem(STORAGE_KEY, data.token)
      } catch {
        /* storage unavailable */
      }
      isLoggedIn.value = true
      admin.value = data.admin ?? { id: 0, username }
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Validate the stored token against the server. */
export async function checkSession(): Promise<boolean> {
  const token = readToken()
  if (!token) {
    isLoggedIn.value = false
    admin.value = null
    return false
  }
  try {
    const res = await fetch(`${API_BASE}/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = (await res.json()) as {
      authenticated?: boolean
      admin?: AdminSession
    }
    if (res.ok && data.authenticated && data.admin) {
      isLoggedIn.value = true
      admin.value = data.admin
      return true
    }
  } catch {
    /* fall through to logout */
  }
  isLoggedIn.value = false
  admin.value = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return false
}

/** Invalidate the token server-side and clear local state. */
export async function logout(): Promise<void> {
  const token = readToken()
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      /* ignore network errors — local state still clears */
    }
  }
  isLoggedIn.value = false
  admin.value = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Expose the current auth token for authenticated API calls. */
export function getToken(): string | null {
  return readToken()
}

export function useAuth() {
  return { isLoggedIn, admin, requestOtp, verifyOtp, checkSession, logout, getToken }
}
