'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Simple check, real app should improve decoding
function getUserRole(): string | null {
    if (typeof window === 'undefined') return null
    try {
        const token = localStorage.getItem('token')
        if (!token) return null
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        return JSON.parse(jsonPayload).role
    } catch {
        return null
    }
}

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: string[]
    publicRoutes?: string[] // Routes that bypass auth check
}

export function RoleGuard({ children, allowedRoles, publicRoutes = [] }: RoleGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [authorized, setAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAuth = () => {
            // Bypass check for public routes
            if (publicRoutes.includes(pathname)) {
                setAuthorized(true)
                setLoading(false)
                return
            }

            const role = getUserRole()
            console.log('[RoleGuard] Path:', pathname)
            console.log('[RoleGuard] Decoded Role:', role)
            console.log('[RoleGuard] Allowed Roles:', allowedRoles)

            if (!role) {
                console.warn('[RoleGuard] No role found in token. Redirecting to login.')
                // Not logged in -> Redirect to login
                if (pathname.includes('/admin')) {
                    router.push('/admin/login')
                } else {
                    router.push('/login')
                }
                return
            }

            if (!allowedRoles.includes(role)) {
                console.warn(`[RoleGuard] Role mismatch! User has '${role}' but needs one of:`, allowedRoles)
                // Logged in but wrong role -> Unauthorized
                router.push('/unauthorized')
                return
            }

            setAuthorized(true)
            setLoading(false)
        }

        checkAuth()
    }, [allowedRoles, router, pathname, publicRoutes])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!authorized) return null

    return <>{children}</>
}
