import 'server-only'
import { createHmac } from 'node:crypto'

// driver-service (be/driver-service) requires every request to carry a
// Bearer JWT signed with its JWT_SECRET (see its internal/middleware/auth.go).
// This mints a short-lived HS256 token server-side — the same approach
// be/trip-service uses to call driver-service internally — using Node's
// built-in crypto so no extra JWT library is needed for one call site.

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

let cached: { token: string; expiresAt: number } | null = null

export function driverServiceAuthHeader(): { Authorization: string } {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.expiresAt - 60 > now) {
    return { Authorization: `Bearer ${cached.token}` }
  }

  const secret = process.env.DRIVER_SERVICE_JWT_SECRET
  if (!secret) throw new Error('DRIVER_SERVICE_JWT_SECRET is not configured')

  const expiresAt = now + 3600
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ sub: 'cd-nemtpro-ui', iat: now, exp: expiresAt }))
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')

  cached = { token: `${header}.${payload}.${signature}`, expiresAt }
  return { Authorization: `Bearer ${cached.token}` }
}
