import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session')

    if (sessionId) {
        // Only run fetch if sessionId looks like a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)

        if (isUUID) {
            try {
                const res = await fetch(`${API_URL}/api/v1/trip-planner/session/${sessionId}`, {
                    cache: 'no-store'
                })

                if (res.ok) {
                    const data = await res.json()
                    const dest = (data.destination || 'destination').toLowerCase().replace(/\s+/g, '-')
                    const source = (data.preferences?.departure_location || 'origin').toLowerCase().replace(/\s+/g, '-')
                    const days = data.duration_days || 1

                    const slug = `${source}-to-${dest}-${days}-days`

                    // Extract exact host to maintain custom domains (like rnt.local)
                    const host = request.headers.get('host') || 'localhost:3000'
                    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
                    const baseUrl = `${protocol}://${host}`

                    // Create response and set cookie
                    const response = NextResponse.redirect(new URL(`/plan-trip/${slug}`, baseUrl))

                    response.cookies.set('tripSessionId', sessionId, {
                        httpOnly: false, // False so client JS can read it for session loading
                        path: '/',
                        maxAge: 60 * 60 * 24 // 1 day
                    })

                    return response
                }
            } catch (e) {
                console.error('Failed to resolve legacy session:', e)
            }
        }
    }

    // Fallback if no session or error
    const fallbackHost = request.headers.get('host') || 'localhost:3000'
    const fallbackProtocol = request.headers.get('x-forwarded-proto') || (fallbackHost.includes('localhost') ? 'http' : 'https')
    return NextResponse.redirect(new URL('/plan-trip', `${fallbackProtocol}://${fallbackHost}`))
}
