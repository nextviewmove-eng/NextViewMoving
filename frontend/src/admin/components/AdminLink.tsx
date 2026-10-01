import type { AnchorHTMLAttributes, ReactNode } from "react"
import { isModifiedClick, navigate } from "../lib/adminRouter"

type AdminLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string
  children: ReactNode
  onNavigate?: () => void
}

export default function AdminLink({
  to,
  children,
  onNavigate,
  onClick,
  ...rest
}: AdminLinkProps) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event)
        if (isModifiedClick(event)) return
        event.preventDefault()
        navigate(to)
        onNavigate?.()
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
