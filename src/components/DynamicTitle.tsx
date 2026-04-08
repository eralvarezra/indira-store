'use client'

import { useEffect } from 'react'

export function DynamicTitle() {
  useEffect(() => {
    // Fetch settings and update title
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.site_title) {
          document.title = `${data.settings.site_title} — Skincare`
        }
      })
      .catch(() => {
        // Keep default title on error
      })
  }, [])

  return null // This component doesn't render anything
}