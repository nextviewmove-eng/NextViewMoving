import { useEffect, useState } from "react"

const NAVIGATE_EVENT = "admin:navigate"

export function navigate(to: string, options?: { replace?: boolean }): void {
  if (options?.replace) {
    window.history.replaceState(null, "", to)
  } else {
    window.history.pushState(null, "", to)
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

export function isModifiedClick(
  event: React.MouseEvent<HTMLAnchorElement>,
): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

export function useAdminPath(): string {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener(NAVIGATE_EVENT, sync)
    window.addEventListener("popstate", sync)
    return () => {
      window.removeEventListener(NAVIGATE_EVENT, sync)
      window.removeEventListener("popstate", sync)
    }
  }, [])

  return path
}
