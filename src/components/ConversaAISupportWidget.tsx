"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

export function ConversaAISupportWidget() {
  const pathname = usePathname()

  const hiddenRoutes = [
    "/dashboard",
    "/login",
    "/register",
    "/auth",
    "/flow",
  ]

  const shouldHide = hiddenRoutes.some((route) => pathname.startsWith(route))

  if (shouldHide) return null

  return (
    <Script
      id="conversaai-support-widget"
      src="https://conversaai.store/widget.js"
      data-assistant-id="dd3e3bab-6f82-46b8-b5d5-f8ed294f0e34"
      strategy="afterInteractive"
    />
  )
}