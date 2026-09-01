import 'server-only'
import { redirect } from 'next/navigation'
import { refreshAccessToken } from './auth'
import { cookies } from 'next/headers'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`request failed with status ${status}: ${body}`)
  }
}

export async function refreshSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value
  if (!refreshToken) return null
  return refreshAccessToken(refreshToken)
}

export async function clearSessionAndRedirectToLogin(): Promise<never> {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('role_access')
  redirect('/login')
}

async function request<T>(
  url: string,
  init?: RequestInit,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const cookieStore = await cookies()
  const hasExplicitAuth = 'Authorization' in headers
  let usedSessionToken = false
  if (!hasExplicitAuth) {
    const accessToken = cookieStore.get('access_token')?.value
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
      usedSessionToken = true
    }
  }

  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers,
  })

  if (res.status === 401 && usedSessionToken) {
    if (isRetry) {
      await clearSessionAndRedirectToLogin()
    }
    const refreshed = await refreshSession()
    if (!refreshed) {
      await clearSessionAndRedirectToLogin()
    }
    return request<T>(url, init, true)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function apiGet<T>(url: string, headers?: HeadersInit): Promise<T> {
  return request<T>(url, { method: 'GET', headers })
}

export function apiPost<T>(url: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined, headers })
}

export function apiPut<T>(url: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(url, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined, headers })
}

export function apiPatch<T>(url: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined, headers })
}

export function apiDelete<T>(url: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(url, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined, headers })
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export const SERVICE_URLS = {
  vehicle: () => requiredEnv('VEHICLE_SERVICE_URL'),
  participant: () => requiredEnv('PARTICIPANT_SERVICE_URL'),
  driver: () => requiredEnv('DRIVER_SERVICE_URL'),
  event: () => requiredEnv('EVENT_SERVICE_URL'),
  trip: () => requiredEnv('TRIP_SERVICE_URL'),
  language: () => requiredEnv('LANGUAGE_SERVICE_URL'),
  catalog: () => requiredEnv('CATALOG_SERVICE_URL'),
  auth: () => requiredEnv('AUTH_SERVICE_URL'),
}
