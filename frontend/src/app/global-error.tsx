'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
          type: 'GlobalLayoutError',
          message: error.message,
          stack_trace: error.stack,
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          timestamp: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin-simple/report-frontend-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData),
        })
      } catch (e) {
        console.error('Failed to report global error:', e)
      }
    }

    reportError()
  }, [error])

  return (
    <html>
      <body className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Critical System Error</h1>
          <p className="text-gray-600 mb-10 leading-relaxed">
            The application encountered a critical error during initialization. Our engineering team has been alerted.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-4 px-8 bg-black hover:bg-gray-800 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            Refresh Application
          </button>
        </div>
      </body>
    </html>
  )
}
