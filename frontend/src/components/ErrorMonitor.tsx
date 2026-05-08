'use client'

import { useEffect } from 'react'

export default function ErrorMonitor() {
  useEffect(() => {
    const reportError = async (data: any) => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin-simple/report-frontend-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            user_id: localStorage.getItem('user_id') || 'guest'
          }),
        })
      } catch (e) {
        // Silently fail to avoid infinite loops
      }
    }

    const handleError = (event: ErrorEvent) => {
      reportError({
        type: 'WindowError',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack_trace: event.error?.stack,
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportError({
        type: 'UnhandledPromiseRejection',
        message: event.reason?.message || String(event.reason),
        stack_trace: event.reason?.stack,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
