import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ApiError, apiClient } from "../../lib/apiClient"
import { adminGet, setUnauthorizedHandler } from "./adminApi"
import {
  clearAdminSession,
  createAdminSession,
  isAdminUser,
  readAdminSession,
  writeAdminSession,
  type AdminLoginResponse,
  type AdminSession,
  type AdminUser,
} from "./adminSession"
import { navigate } from "./adminRouter"

export const ADMIN_LOGIN_PATH = "/admin/login"
export const ADMIN_DASHBOARD_PATH = "/admin/dashboard"

export type AdminAuthStatus = "checking" | "authenticated" | "unauthenticated"

export type AdminSignInResult = { ok: true } | { ok: false; message: string }

type AdminAuthContextValue = {
  status: AdminAuthStatus
  isAuthenticated: boolean
  isChecking: boolean
  admin: AdminUser | null
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<AdminSignInResult>
  signOut: () => Promise<void>
  clearSessionExpiredNotice: () => void
}

type MeResponse = {
  success: boolean
  data?: { admin?: unknown }
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

const GENERIC_SIGN_IN_ERROR =
  "Something went wrong while signing in. Please try again."
const NETWORK_SIGN_IN_ERROR =
  "We couldn't reach the server. Please check your connection and try again."
const INVALID_CREDENTIALS_ERROR = "Invalid email or password. Please try again."
const INVALID_INPUT_ERROR =
  "Please check your email and password and try again."

export function mapAdminSignInError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return NETWORK_SIGN_IN_ERROR
    if (error.status === 401) return INVALID_CREDENTIALS_ERROR
    if (error.status === 400) return INVALID_INPUT_ERROR
    return GENERIC_SIGN_IN_ERROR
  }
  return GENERIC_SIGN_IN_ERROR
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [status, setStatus] = useState<AdminAuthStatus>("checking")
  const [sessionExpired, setSessionExpired] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const endSession = useCallback((expired: boolean) => {
    clearAdminSession()
    setSession(null)
    setStatus("unauthenticated")
    if (expired) setSessionExpired(true)
  }, [])

  const redirectToLogin = useCallback(() => {
    navigate(ADMIN_LOGIN_PATH, { replace: true })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!mounted.current) return
      endSession(true)
      redirectToLogin()
    })
    return () => setUnauthorizedHandler(null)
  }, [endSession, redirectToLogin])

  useEffect(() => {
    const restored = readAdminSession()
    if (!mounted.current) return

    if (!restored) {
      setSession(null)
      setStatus("unauthenticated")
      return
    }

    setSession(restored)
    setStatus("authenticated")

    adminGet<MeResponse>("/api/auth/me", restored.token)
      .then((response) => {
        if (!mounted.current) return
        const admin = response?.data?.admin
        if (!isAdminUser(admin)) return
        setSession((current) => (current ? { ...current, admin } : current))
      })
      .catch(() => {
        return
      })
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AdminSignInResult> => {
      try {
        const response = await apiClient.post<AdminLoginResponse>(
          "/api/auth/login",
          {
            email,
            password,
          },
        )
        const admin = response?.data?.admin
        const token = response?.data?.token

        if (!isAdminUser(admin) || typeof token !== "string") {
          return { ok: false, message: GENERIC_SIGN_IN_ERROR }
        }

        const nextSession = createAdminSession(token, admin)
        if (!nextSession) {
          return { ok: false, message: GENERIC_SIGN_IN_ERROR }
        }

        writeAdminSession(nextSession)
        if (mounted.current) {
          setSession(nextSession)
          setStatus("authenticated")
          setSessionExpired(false)
        }

        navigate(ADMIN_DASHBOARD_PATH)
        return { ok: true }
      } catch (error) {
        return { ok: false, message: mapAdminSignInError(error) }
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    try {
      const token = readAdminSession()?.token
      await apiClient.post(
        "/api/auth/logout",
        {},
        token ? { token } : undefined,
      )
    } catch {
      return
    } finally {
      endSession(false)
      redirectToLogin()
    }
  }, [endSession, redirectToLogin])

  const clearSessionExpiredNotice = useCallback(() => {
    setSessionExpired(false)
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === "authenticated" && session !== null,
      isChecking: status === "checking",
      admin: session?.admin ?? null,
      sessionExpired,
      signIn,
      signOut,
      clearSessionExpiredNotice,
    }),
    [
      status,
      session,
      sessionExpired,
      signIn,
      signOut,
      clearSessionExpiredNotice,
    ],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider")
  }
  return context
}
