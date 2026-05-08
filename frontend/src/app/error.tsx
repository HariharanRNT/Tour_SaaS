'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our reporting API
    const reportError = async () => {
      try {
        const errorData = {
          type: 'FrontendRuntimeError',
          message: error.message,
          stack_trace: error.stack,
          digest: error.digest,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin-simple/report-frontend-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData),
        })
      } catch (e) {
        console.error('Failed to report error:', e)
      }
    }

    reportError()
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="bg-red-50 p-8 rounded-2xl border border-red-100 max-w-md w-full shadow-sm">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-8">
          We've encountered an unexpected error. Our team has been notified and we're working to fix it.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full py-3 px-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
}
