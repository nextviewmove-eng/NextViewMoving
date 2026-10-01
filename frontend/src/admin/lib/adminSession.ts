export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  isActive?: boolean
}

export type AdminSession = {
  token: string
  admin: AdminUser
  expiresAt: number
}

export type AdminLoginResponse = {
  success: boolean
  message: string
  data: {
    admin: AdminUser
    token: string
  }
}

export const ADMIN_SESSION_STORAGE_KEY = "nextviewmove.admin.session"

type TokenPayload = {
  exp?: number
  adminId?: string
  role?: string
}

function decodeSegment(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  )
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function decodeTokenPayload(token: string): TokenPayload | null {
  if (typeof token !== "string") return null
  const segments = token.split(".")
  if (segments.length !== 3) return null
  try {
    const payload: unknown = JSON.parse(decodeSegment(segments[1]))
    if (typeof payload !== "object" || payload === null) return null
    return payload as TokenPayload
  } catch {
    return null
  }
}

export function getTokenExpiresAt(token: string): number | null {
  const payload = decodeTokenPayload(token)
  if (typeof payload?.exp !== "number") return null
  return payload.exp * 1000
}

export function isAdminUser(value: unknown): value is AdminUser {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.role === "string"
  )
}

export function createAdminSession(
  token: string,
  admin: AdminUser,
): AdminSession | null {
  if (typeof token !== "string" || token.length === 0) return null
  if (!isAdminUser(admin)) return null
  const expiresAt = getTokenExpiresAt(token)
  if (expiresAt === null) return null
  if (expiresAt <= Date.now()) return null
  return { token, admin, expiresAt }
}

export function isAdminSessionUsable(
  session: AdminSession | null,
  now: number,
): boolean {
  if (!session) return false
  if (!session.token) return false
  if (!Number.isFinite(session.expiresAt)) return false
  return session.expiresAt > now
}

export function readAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearAdminSession()
    return null
  }

  if (typeof parsed !== "object" || parsed === null) {
    clearAdminSession()
    return null
  }

  const candidate = parsed as Partial<AdminSession>
  const session =
    typeof candidate.token === "string" && isAdminUser(candidate.admin)
      ? {
          token: candidate.token,
          admin: candidate.admin,
          expiresAt:
            typeof candidate.expiresAt === "number" ? candidate.expiresAt : 0,
        }
      : null

  if (!isAdminSessionUsable(session, Date.now())) {
    clearAdminSession()
    return null
  }

  return session
}

export function writeAdminSession(session: AdminSession): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      JSON.stringify(session),
    )
  } catch {
    return
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
  } catch {
    return
  }
}
